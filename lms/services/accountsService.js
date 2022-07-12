let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
let AccountsV2 = commonUtil.getModel('accounts');
let Voucher = commonUtil.getModel('voucher');
let AcBal = commonUtil.getModel('accountbalances');
var VendorTransport = promise.promisifyAll(commonUtil.getModel('vendorTransport'));
let Driver = commonUtil.getModel('driver');
var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
let billingParty = promise.promisifyAll(commonUtil.getModel('billingparty'));
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
const logsService = commonUtil.getService('logs');
const serverSidePage = require('../../utils/serverSidePagination');
const accountCSV = commonUtil.getReports('accountMaster.js');
var AccountBalance = commonUtil.getModel('accountbalances');
const csvDownload = require('../../utils/csv-download');
let moment = require('moment');
const ALLOWED_FILTER = ['_id', 'clientId', "name", "isGroup", "ledger_name", "group", "type", "accountId", "limit",
	"opening_balance", "balance", "from", "to", /*'lvlLessThan',*/ 'branch', 'account'];
const ALLOWED_FILTER_TRIALBAL = ['_id', 'clientId', "name", "isGroup", "ledger_name", "group", "accountId", "limit",
	"opening_balance", "balance", "from", "to", 'account'];
const ALLOWED_FILTER_BRACH_DET = ['branchDetail'];
const ALLOWED_FILTER_GROUP_TYPE = ['groupType'];

module.exports = {
	updateName,
	findAccountByQuery,
	findAccountByQueryV2,
	updateAccountById_,
	updateAccountById,
	addAccount,
	getTrialBalances,
	deleteAccount,
	findById,
	editBalances,
	findAccountAggr,
	recursiveUpdateAccountBalance,
	updateAccountBalanceCron,
	findAccountBalAggr,
	getTrialBalancesGroupWise,
	getParticularTrialBalances,
	getProfitAndLoss,
	createWorkSheet,
	dailyCostCenterReport
};

function costCenterFilter(body) {
	let oFilter = {};

	['from', 'to','costCenter' ].forEach(key => {
		let val;
		if(!(val = body[key]))
			return;

		if(key === 'costCenter')
			oFilter[key] = new RegExp('^' + (val.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')), 'i');
		else if(key === 'from'){
			let startDate = new Date(val);
			startDate.setSeconds(0);
			startDate.setHours(0);
			startDate.setMinutes(0);
			startDate.setMilliseconds(0);
			oFilter["date"] = oFilter["date"] || {};
			oFilter["date"]["$gte"] = startDate;
		}
		else if(key === 'to'){
			let endDate = new Date(val);
			endDate.setSeconds(59);
			endDate.setHours(23);
			endDate.setMinutes(59);
			oFilter["date"] = oFilter["date"] || {};
			oFilter["date"]["$lte"] = endDate;
		}
		else
			oFilter[key] = val;
	})

	return oFilter;
}

async function updateAccountBalanceCron(body) {

	try {
		let clientId;
		let startDate;
		let lvl;
		let endDate;
		let type = "";
		if (body.startDate) {
			startDate = body.startDate;
			endDate = body.endDate;
			lvl = body.level;
			clientId = body.clientId;
		} else {
			startDate = body.from;
			endDate = body.to;
			type = "daily";
			lvl = body.level;
			clientId = body.clientId;
		}

		console.log("startDate:--", startDate);
		console.log("ENDDate:--", endDate);

		let processCompRes = await recursiveUpdateAccountBalance({
			startDate,
			endDate,
			type,
			lvl,
			clientId
		});

		if (processCompRes.status === 'OK')
			return processCompRes;


	} catch (e) {
		console.log(e);
		throw new Error('Error in Account Balance fun..');
	}
}

async function recursiveUpdateAccountBalance(body) {
	try {

		if (body.startDate <= new Date()) {
			await getAccountBalanceProcess(body);
		} else {
			return {
				'status': 'OK',
				'message': 'Done - Account Balance Upsert Successfully...'
			};
		}

		var newEndDate = new Date(body.endDate);
		newEndDate.setHours(23);
		newEndDate.setMinutes(59);
		newEndDate.setSeconds(59);
		newEndDate.setDate(newEndDate.getDate() + 1);

		var startDate = body.endDate;
		startDate.setHours(0);
		startDate.setMinutes(0);
		startDate.setSeconds(0);
		startDate.setDate(startDate.getDate() + 1);
		body.startDate = startDate;
		body.endDate = newEndDate;

		console.log("new Start Date", body.startDate);
		console.log("new End Date", body.endDate);
		return recursiveUpdateAccountBalance(body);
	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Feilds are required.');
	}
}

async function getAccountBalanceProcess(body) {

	let lastModifyAt = {};
	let lastModifyAtUpsert = {};
	let level = body.lvl;
	let clientId = body.clientId;

	for (lvl = level; lvl > 1; lvl--) {
		let accounts = await Accounts.aggregate([{"$match": {lvl: lvl, clientId:clientId}}, {
			"$group": {
				"_id": "$type._id",
				"count": {"$sum": 1},
				"clientId": {"$first": "$clientId"}
			}
		}]);

		if (accounts && accounts.length > 0) {

			for (j = 0; j < accounts.length; j++) {
				let oUpsertRep = [];

				if ((body.lastmodifyDate && body.lastmodifyDate.to && body.lastmodifyDate.from) || body.type == 'daily') {
					lastModifyAt = {
						last_modified_at: {$lte: new Date(body.endDate), $gte: new Date(body.startDate)},
						clientId: accounts[j].clientId
					}
					lastModifyAtUpsert = {
						last_modified_at: {
							$lte: new Date(body.endDate),
							$gte: new Date(body.startDate)
						}, clientId: accounts[j].clientId, account: accounts[j]._id
					}
				} else if (body && body.startDate && body.endDate) {
					lastModifyAt = {
						created_at: {$lte: new Date(body.endDate), $gte: new Date(body.startDate)},
						clientId: accounts[j].clientId
					}
					lastModifyAtUpsert = {
						created_at: {$lte: new Date(body.endDate), $gte: new Date(body.startDate)},
						clientId: accounts[j].clientId,
						account: accounts[j]._id
					}
				}

				let groupAcnt = await Accounts.findById({_id: accounts[j]._id}, {children: 1}).lean();
				groupAcnt.children = groupAcnt.children || [];
				obCb = {'ob': 0, 'cb': 0, 'cr': 0, 'dr': 0};
				for (let i = 0; i < groupAcnt.children.length; i++) {

					if (typeof groupAcnt.children[i] === 'string' && groupAcnt.children[i].match(/^[0-9a-fA-F]{24}$/)) {
						groupAcnt.children[i] = await Accounts.findById(groupAcnt.children[i], 'name').lean();
					} else if (groupAcnt.children[i].name && !groupAcnt.children[i]._id) {
						groupAcnt.children[i] = await Accounts.findOne({name: groupAcnt.children[i].name}, 'name').lean();
					} else if (!groupAcnt.children[i].name && groupAcnt.children[i]._id) {
						groupAcnt.children[i] = await Accounts.findById(groupAcnt.children[i]._id, 'name').lean();
					}
					let aggrQuery = [
						{$match: lastModifyAt},
						{$lookup: {from: 'accounts', localField: 'account', foreignField: '_id', as: 'account'}},
						{$unwind: {path: '$account', preserveNullAndEmptyArrays: true}},
						{
							$match: {
								$or: [
									{'account._id': mongoose.Types.ObjectId(groupAcnt.children[i]._id)},
									{'account.ancestors': mongoose.Types.ObjectId(groupAcnt.children[i]._id)}
								]
							}
						},
						{
							$group: {
								_id: null,
								ob: {$sum: '$ob'},
								cb: {$sum: '$cb'},
								dr: {$sum: '$dr'},
								cr: {$sum: '$cr'}
							}
						},
					];
					let bals = (await AcBal.aggregate(aggrQuery))[0];
					if (bals) {
						obCb['cr'] += bals.cr;
						obCb['dr'] += bals.dr;
						obCb['ob'] += bals.ob;
						obCb['cb'] += bals.cb;
					}
				}

				let setOnInsertDoc = {
					_id: mongoose.Types.ObjectId(),
					last_modified_at: body.startDate,
					created_at: body.startDate,
					account: accounts[j]._id,
					date: body.startDate,
					clientId: accounts[j].clientId,
					deleted: false
				};

				oUpsertRep.push({
					updateOne: {
						filter: lastModifyAtUpsert,
						update: {
							$set: obCb,
							$setOnInsert: setOnInsertDoc
						},
						upsert: true
					}
				});
				oUpsertRep.length && await AcBal.bulkWrite(oUpsertRep);
			}

		}
	}
}

function acountBranchFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER_BRACH_DET)) {
			if (i === 'branchDetail') {
				if (oQuery[i] != undefined)
					oFilter['accountDetail.branchDetail._id'] = otherUtil.arrString2ObjectId(oQuery[i]);

			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}

	return oFilter;
}

function acountGroupFiler(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER_GROUP_TYPE)) {
			if (i === 'groupType') {
				if (oQuery[i] != undefined)
					oFilter['accountDetail.type._id'] = otherUtil.arrString2ObjectId(oQuery[i]);

			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}

	return oFilter;
}

function constructFiltersTrialBal(oQuery, isNameSearch) {
	let oFilter = {
		/*
		$and: [
			{
				$or: [
					{clientId: oQuery.cClientId || oQuery.clientId},
					{clientR: oQuery.clientId}
				]
			}
		],
		*/
		"deleted": (oQuery.deleted === true)
	};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER_TRIALBAL)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["date"] = oFilter["date"] || {};
				oFilter["date"].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter["date"] = oFilter["date"] || {};
				oFilter["date"].$lte = endDate;
			} else if (i === 'name') {
				if (isNameSearch) {
					oFilter[i] = new RegExp(`^${oQuery[i].trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}`, 'im');
				} else {
					// oFilter[i] = new RegExp(`^(?!${oQuery[i].trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')})(.*${oQuery[i].trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}.*)+`, 'im');
					oFilter[i] = new RegExp(oQuery[i].trim().replace(/[|\\{}()[\]^$+*?.]/g, ' ').replace(/[ ]+/g, '__SEPERATOR__').split('__SEPERATOR__').join('[ -({/$@]*'), 'i');
				}
			} else if (i === 'group') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]};
				} else if (typeof oQuery[i] === "string") {
					oFilter[i] = oQuery[i];
				}
			} else if (i === 'type') {
				oFilter['type._id'] = otherUtil.arrString2ObjectId(oQuery[i]);
			} else if (i === 'account') {
				oFilter['account'] = otherUtil.arrString2ObjectId(oQuery[i]);
			} else if (i === 'clientAdmin') {
				/*
				if(oQuery[i] === false){
					oFilter.$or = [
						{"access":{$exists:false}},
						{"access.0":{$exists:false}},
						{"access":oQuery.user._id}
					]
				}*/
			} else if (i === 'lvlLessThan') {
				oFilter['lvl'] = {$lte: oQuery[i]};
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}

	oFilter.clientId = oQuery.cClientId || oQuery.clientId;

	if (oQuery.onlyUnlinked !== undefined) {
		oFilter['linkedTo.linkedId'] = {$exists: !oQuery.onlyUnlinked};
	}
	return oFilter;
}

function constructFilters(oQuery) {
	let oFilter = {
		$and: [
			{
				$or: [
					{clientId: oQuery.cClientId || oQuery.clientId},
					{clientR: oQuery.clientId}
				]
			}
		],
		"deleted": (oQuery.deleted === true)
	};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
			// } else if (i === "name") {
			// 	oFilter[i] = { $regex: oQuery[i].replace(' ','.+'), $options: 'i' };
			} else if (i === 'name') {
				let key = typeof oQuery[i] === 'object' ? oQuery[i].key : oQuery[i];
				if (oQuery[i].indexOf(' ') + 1) {
					oFilter[i] = new RegExp(key.trim().replace(/[|\\{}()[\]^$+*?.]/g, ' ').replace(/[ ]+/g, '__SEPERATOR__').split('__SEPERATOR__').join('.*'), 'i');
				} else {
					oFilter[i] = new RegExp(`${key.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}`, 'im');
				}
			} else if (i === 'group') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]};
				} else if (typeof oQuery[i] === "string") {
					oFilter[i] = oQuery[i];
				}
			} else if (i === 'type') {
				oFilter['type._id'] = otherUtil.arrString2ObjectId(oQuery[i]);
			} else if (i === 'account') {
				oFilter['account'] = otherUtil.arrString2ObjectId(oQuery[i]);
			} else if (i === 'branch') {
				oFilter['branch'] = otherUtil.arrString2ObjectId(oQuery[i]);
			} else if (i === 'clientAdmin') {
				/*
				if(oQuery[i] === false){
					oFilter.$or = [
						{"access":{$exists:false}},
						{"access.0":{$exists:false}},
						{"access":oQuery.user._id}
					]
				}*/
			} else if (i === 'lvlLessThan') {
				oFilter['lvl'] = {$lte: oQuery[i]};
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}

	oFilter.clientId = oQuery.cClientId || oQuery.clientId;

	if (oQuery.onlyUnlinked !== undefined) {
		oFilter['linkedTo.linkedId'] = {$exists: !oQuery.onlyUnlinked};
	}
	return oFilter;
}

function constructFiltersBalSheet(oQuery) {
	let oFilter = {
		$and: [
			{
				$or: [
					{clientId: oQuery.cClientId || oQuery.clientId},
					{clientR: oQuery.clientId}
				]
			}
		]
	};

	oFilter.clientId = oQuery.cClientId || oQuery.clientId;
	oFilter.lvl = {"$in": [2, 3, 4]};
	oFilter.isGroup = true;
	oFilter.deleted = false;
	oFilter.children = {"$ne": []};

	return oFilter;
}

function constructFiltersAccBal(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ['to', 'from'])) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["accountbal.date"] = oFilter["accountbal.date"] || {};
				oFilter["accountbal.date"].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter["accountbal.date"] = oFilter["accountbal.date"] || {};
				oFilter["accountbal.date"].$lte = endDate;
			}
		}
	}
	return oFilter;
}

function findAccountByQuery(query, next) {
	query.queryFilter = constructFilters(query);
	query.no_of_docs = query.no_of_docs || 100;
	query.sort = query.sort || {_id: -1};
	otherUtil.findPagination(Accounts, query, next);
}

async function findAccountByQueryV2(query, next) {
	query.no_of_docs = query.no_of_docs || 10;
	query.sort = query.sort || {_id: -1};
	let oFil1 = constructFilters(query, true);
	let skip = (query.all) ? 1 : query.skip ? query.skip : 1;
	let no_of_docs = query.all ? Number.MAX_SAFE_INTEGER : query.no_of_docs ? +query.no_of_docs : 10;
    if(query.name && query.name.length > 10 && skip == 1){
		no_of_docs = query.name.length * 30;
	}
	let aFoundAccount = await AccountsV2.find(oFil1, {}, {
		sort: query.sort,
		limit: no_of_docs,
		skip: ((no_of_docs * skip) - no_of_docs)
	}).lean();

	return {data: aFoundAccount}; //{ data: acnt1.concat(acnt2) };
}

function updateAccountById_(id, body, next) {
	Accounts.findById(id).lean().then(function (foundAcnt) {
		if (!foundAcnt.type && body.type) {
			body.lvl = (body.type && body.type.level) ? (body.type.level + 1) : 1;
			Promise.all([
				Accounts.findByIdAndUpdate(foundAcnt._id, {$set: body}),
				Accounts.findByIdAndUpdate(body.type._id, {
					$push: {
						children: {
							_id: body._id,
							name: body.name/*, level: body.lvl*/
						}
					}
				}, {new: true})
			]).then(function (data, updatedParent) {
				return next(null, data);
			}).catch(next);
		} else if (foundAcnt.type && !body.type) {
			if (foundAcnt.children && foundAcnt.children.length) {
				return next(new Error('This account has sub accounting heads. First remove those'), null);
			} else {
				delete body.type;
				body.lvl = 1;
				Promise.all([
					Accounts.findByIdAndUpdate(foundAcnt._id, {$set: body, $unset: {type: 1}}, {new: true}),
					Accounts.findByIdAndUpdate(foundAcnt.type._id, {$pull: {children: {_id: foundAcnt._id}}}, {multi: true})
				]).then(function (data, updatedParent) {
					return next(null, data);
				}).catch(next);
			}
		} else if (body.type && foundAcnt.type && ((body.type._id || '').toString() !== (foundAcnt.type._id || '').toString())) {
			body.lvl = (body.type && body.type.level) ? (body.type.level + 1) : 1;
			Promise.all([
				Accounts.findByIdAndUpdate(foundAcnt._id, {$set: body}, {new: true}),
				Accounts.findByIdAndUpdate(foundAcnt.type._id, {$pull: {children: {_id: foundAcnt._id}}}, {multi: true}),
				Accounts.findByIdAndUpdate(body.type._id, {
					$push: {
						children: {
							_id: body._id,
							name: body.name/*, level: body.lvl*/
						}
					}
				}, {new: true})
			]).then(function (data) {
				return next(null, data);
			}).catch(next);
		} else if (body.deleted) {
			if (foundAcnt.children && foundAcnt.children.length) {
				return next(new Error('This account has sub accounting heads. First remove those'), null);
			} else {
				const queries = [Accounts.findByIdAndUpdate(foundAcnt._id, {
					$set: {deleted: true, lvl: -1},
					$unset: {type: 1}
				})];
				if (foundAcnt.type && foundAcnt.type._id) {
					queries.push(
						Accounts.findByIdAndUpdate(foundAcnt.type._id, {$pull: {children: {_id: foundAcnt._id}}}, {multi: true})
					);
				}
				Promise.all(queries).then(function (data) {
					return next(null, {message: "Deleted account", deleted: true});
				}).catch(next);
			}
		} else {
			Accounts.findOneAndUpdateAsync({_id: id}, {$set: body})
				.then(function (data) {
					return next(null, data);
				})
				.catch(next);
		}
	});
}

async function updateAccountById(id, body, req, next) {
	let duplicateAc;
	let dupFilter = {};

	if(req.body.isGroup == true && body.group && body.group.length && body.group.indexOf('Vendor' != -1)){
		let foundVendor = await VendorTransport.find({'account.ref': id},{_id:1,name:1});
		if(foundVendor && foundVendor.length){
			return next(new Error(`Can't modify!! Account already link with vendor:  ${foundVendor[0].name}`), null);
		}
	}
	if(req.body.isGroup == true && body.group && body.group.length && body.group.indexOf('Driver' != -1)){
		let foundDriver = await Driver.find({'account': id},{_id:1,name:1});
		if(foundDriver && foundDriver.length){
			return next(new Error(`Can't modify!! Account already link with driver:  ${foundDriver[0].name}`), null);
		}
	}
	if(req.body.isGroup == true && body.group && body.group.length && body.group.indexOf('Vehicle' != -1)){
		let foundVehicle = await RegisteredVehicle.find({'account': id},{_id:1,vehicle_reg_no:1});
		if(foundVehicle && foundVehicle.length){
			return next(new Error(`Can't modify!! Account already link with vehicle:  ${foundVehicle[0].vehicle_reg_no}`), null);
		}
	}
	if(req.body.isGroup == true && body.group && body.group.length && body.group.indexOf('Customer' != -1)){
		let foundCustomer = await billingParty.find({'account': id},{_id:1,name:1});
		if(foundCustomer && foundCustomer.length){
			return next(new Error(`Can't modify!! Account already link with customer:  ${foundCustomer[0].name}`), null);
		}
	}

	body.lastModifiedBy = req.user.full_name;
	if (body.name && body.ledger_name) {
		dupFilter['$or'] = [
			{name: new RegExp('^' + (body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')},
			{ledger_name: new RegExp('^' + (body.ledger_name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')}];
	} else if (body.name) {
		dupFilter['$or'] = [{name: new RegExp('^' + (body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')}];
	} else if (body.ledger_name) {
		dupFilter['$or'] = [{ledger_name: new RegExp('^' + (body.ledger_name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')}];
	}
	if (Object.keys(dupFilter).length > 0) {//check duplicacy for name
		dupFilter.clientId = body.clientId;
		dupFilter.deleted = false;
		dupFilter._id = {$ne: otherUtil.arrString2ObjectId(id)};
		duplicateAc = await Accounts.find(dupFilter).lean();
		if (duplicateAc) {
			for (let i = 0; i < duplicateAc.length; i++) {
				if (duplicateAc[i]._id.toString() !== id.toString()) {
					return next(new Error('This account name or leger name already exist'), null);
				}
			}
		}
	}
	let foundAcnt;
	if (duplicateAc && duplicateAc[0] && duplicateAc[0]._id.toString() === id.toString()) {
		//Prevent DB call if same account
		foundAcnt = duplicateAc[0];
	} else {
		foundAcnt = await Accounts.findById(id).lean();
	}
	let parentAc, ancestors;

	if (body.deleted) {
		if (foundAcnt.linkedTo && foundAcnt.linkedTo.name) {
			return next(new Error('This account is linked with ' + foundAcnt.linkedTo.name + " please delink it from " + foundAcnt.linkedTo.linkedModel), null);
		}
		let vch = await Voucher.findOne({
			deleted: false,
			'ledgers.account': otherUtil.arrString2ObjectId(id)
		}, {refNo: 1}).lean();
		if (vch && vch.refNo) {
			return next(new Error('Vochers exists by ref No ' + vch.refNo + " Please revert it first"), null);
		}
	}

	if (!foundAcnt.type && body.type && body.type._id) {
		parentAc = await Accounts.findById(body.type._id, {ancestors: 1, type: 1, lvl: 1}).lean();
		if (parentAc && parentAc.ancestors) {
			parentAc.ancestors.push(body.type._id);
			ancestors = parentAc.ancestors;
		} else {
			ancestors = [body.type._id];
		}

		if (parentAc.lvl) {
			body.lvl = parentAc.lvl + 1;

		} else {
			body.lvl = 1;
		}
		delete body.ancestors;

		Promise.all([
			Accounts.findByIdAndUpdate(foundAcnt._id, {$set: body, $addToSet: {ancestors: {$each: ancestors}}}),
			Accounts.findByIdAndUpdate(body.type._id, {
				$push: {
					children: {
						_id: body._id,
						name: body.name
					}
				}
			}, {new: true})
		]).then(function (data, updatedParent) {
			logChange();
			return next(null, data);
		}).catch(next);
	} else if (foundAcnt.type && !body.type) {
		if (foundAcnt.children && foundAcnt.children.length) {
			return next(new Error('This account has sub accounting heads. First remove those'), null);
		} else {
			delete body.type;
			body.lvl = 1;
			body.ancestors = [];
			Promise.all([
				Accounts.findByIdAndUpdate(foundAcnt._id, {$set: body, $unset: {type: 1}}, {new: true}),
				Accounts.findByIdAndUpdate(foundAcnt.type._id, {$pull: {children: {_id: foundAcnt._id}}}, {multi: true})
			]).then(function (data, updatedParent) {
				logChange();
				return next(null, data);
			}).catch(next);
		}
	} else if (body.type && foundAcnt.type && ((body.type._id || '').toString() !== (foundAcnt.type._id || '').toString())) {
		parentAc = await Accounts.findById(body.type._id, {ancestors: 1, type: 1, lvl: 1}).lean();
		if (parentAc && parentAc.ancestors) {
			parentAc.ancestors.push(body.type._id);
			ancestors = parentAc.ancestors;
		} else {
			ancestors = [body.type._id];
		}

		if (parentAc && parentAc.lvl) {
			body.lvl = parentAc.lvl + 1;

		} else {
			body.lvl = 1;
		}
		delete body.ancestors;
		let aParallelJobs = [ Accounts.findByIdAndUpdate(foundAcnt._id, {$pull: {ancestors: foundAcnt.type._id}}),
			Accounts.findByIdAndUpdate(foundAcnt._id, {
				$set: body,
				$addToSet: {ancestors: {$each: ancestors}}
			}, {new: true}),
			Accounts.findByIdAndUpdate(foundAcnt.type._id, {$pull: {children: {_id: foundAcnt._id}}}, {multi: true}),
			Accounts.findByIdAndUpdate(body.type._id, {
				$push: {
					children: {
						_id: body._id,
						name: body.name/*, level: body.lvl*/
					}
				}
			}, {new: true})];

		if(foundAcnt.children && foundAcnt.children.length){
			await updateAncesstorsForAllChilds(foundAcnt.children,foundAcnt.lvl || 1,foundAcnt.type._id,body.type._id);
		}
		Promise.all(aParallelJobs).then(function (data) {
			logChange();
			return next(null, data);
		}).catch(next);
	} else if (body.deleted) {
		if (foundAcnt.linkedTo && foundAcnt.linkedTo.name) {
			return next(new Error('This account is linked with ' + foundAcnt.linkedTo.name + " please delink it from " + foundAcnt.linkedTo.linkedModel), null);
		}
		if (foundAcnt.children && foundAcnt.children.length) {
			return next(new Error('This account has sub accounting heads. First remove those'), null);
		} else {
			const queries = [Accounts.findByIdAndUpdate(foundAcnt._id, {
				$set: {deleted: true, lvl: -1},
				$unset: {type: 1}
			})];
			if (foundAcnt.type && foundAcnt.type._id) {
				queries.push(
					Accounts.findByIdAndUpdate(foundAcnt.type._id, {$pull: {children: {_id: foundAcnt._id}}}, {multi: true})
				);
			}
			Promise.all(queries).then(function (data) {
				logChange();
				return next(null, {message: "Deleted account", deleted: true});
			}).catch(next);
		}
	} else {
		Accounts.findOneAndUpdateAsync({_id: id}, {$set: body})
			.then(function (data) {
				logChange();
				return next(null, data);
			})
			.catch(next);
	}

	async function logChange() {
		await logsService.add('accounts', {
			uif: body.name || foundAcnt.name,
			category: 'update',
			nData: JSON.parse(JSON.stringify(body)),
			oData: foundAcnt,
		}, req);
	}
}

async function addAccount(body, next) {
	let preAcc = await Accounts.findAsync({
		clientId: body.clientId,
		deleted: false,
		name: new RegExp('^' + (body.name.trim().replace(/[ ]+/g, ' ').replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')
	});
	if (preAcc && preAcc[0]) {
		return next("Account with this name exists! Please change the name!");
	} else {
		let parentAc;
		body.balance = body.opening_balance || 0;
		if (body.type && body.type._id) {
			parentAc = await Accounts.findOne({clientId: body.clientId, _id: body.type._id}, {
				ancestors: 1,
				lvl: 1
			}).lean();
			body.lvl = (parentAc.lvl || 0) + 1;
			if (parentAc && parentAc.ancestors) {
				parentAc.ancestors.push(body.type._id);
				body.ancestors = parentAc.ancestors;
			} else {
				body.ancestors = [body.type._id];
			}
		} else {
			body.lvl = 1;
			body.ancestors = [];
		}

		idUtil.generateAccountIdAsync()
			.then(function (id) {
				body.accountId = id;
				let dataToSave = new Accounts(body);
				dataToSave.saveAsync()
					.then(function (data) {
						data = JSON.parse(JSON.stringify(data));
						if (data.type) {
							Accounts.findByIdAndUpdate(
								data.type._id,
								{
									$push: {
										children: {
											_id: data._id,
											name: data.name,
											// level: data.lvl,
										}
									}
								})
								.then(function (d) {
									return next(null, data);
								});
						} else {
							return next(null, data);
						}
					})
					.catch(next)
			})
			.catch(next)
	}
}

function deleteAccount(id, hardDelete, next) {
	Accounts.findOneAndUpdateAsync({_id: mongoose.Types.ObjectId(id)}, {$set: {deleted: true}})
		.then(function (data) {
			return next(null, {message: "Deleted account", deleted: true});
		})
		.catch(next)
}

async function findById(id, proj) {
	try {
		return await AccountsV2.findOne({_id: mongoose.Types.ObjectId(id), deleted: false}, proj).lean();
	} catch (e) {
		throw e;
	}
}

async function editBalances(id, body, next) {
	let onlyDate = dateUtil.getMorning(body.date);

	let acBal = await AcBal.findOne({account: id, date: onlyDate, clientId: body.clientId}, {
		account: 1,
		ob: 1,
		cb: 1,
		cr: 1,
		dr: 1
	}).lean();
	let acUp, diffAmt = body.amount;
	if (acBal) {
		diffAmt = (body.amount || 0) - (acBal.ob || 0);
		acbal = await AcBal.update({_id: acBal._id}, {
			$set: {
				ob: body.amount,
				cb: (body.amount + (acBal.dr || 0) - (acBal.cr || 0))
			}
		});
	} else {
		let oBal = {
			account: id,
			date: onlyDate,
			clientId: body.clientId,
			cb: body.amount,
			ob: body.amount,
			cr: 0,
			dr: 0
		};
		acbal = await AcBal.create(oBal);
	}

	if (diffAmt) {
		let fAcB = await AcBal.updateMany({account: id, clientId: body.clientId, date: {$gt: onlyDate}},
			{$inc: {cb: diffAmt, ob: diffAmt}}
		);
	}
	/*let fAcBFind = await AcBal.find({account: id, clientId: body.clientId, date: {$gt: onlyDate}}).sort({date:1}).limit(1);
	if(fAcBFind && fAcBFind[0]){
		//let tCb = TODO set closing balances also
		let fAcBTemp = await AcBal.update({_id:fAcBFind[0]._id},{$set: {ob:body.amount + diffAmt}});
	}*/
	let acBalLast = await AcBal.find({account: id, clientId: body.clientId}, {
		account: 1,
		ob: 1,
		cb: 1
	}).sort({date: -1}).limit(1).lean();

	if (acBalLast && acBalLast[0]) {
		let oSet = {
			opening_balance: acBalLast[0].ob,
			balance: acBalLast[0].cb,
			opn_bal_date: onlyDate
		};

		if(body.openBal1)
			oSet.openBal1 = body.openBal1;

		if(body.openBal2)
			oSet.openBal2 = body.openBal2;

		acUp = await Accounts.update({_id: id}, {
			$set: oSet
		});
	}
	return acUp;

}

async function getTrialBalances(req, res) {

	let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
	let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? +req.body.no_of_docs : 10;

	let toDate = req.body.to  || new Date() ;

	let fromDate = new Date(toDate);
	fromDate.setDate(1);
	fromDate.setMonth(fromDate.getMonth() - 6);
	fromDate.setHours(0);
	fromDate.setMinutes(0);
	fromDate.setSeconds(0);
	fromDate.setMilliseconds(0);

	req.body.from = fromDate;
	req.body.branchDetail = req.body.branch;
	req.body.groupType = req.body.type;
	let ofill = constructFiltersTrialBal(req.body);

	const aggrQuery = [
		{
			"$match": ofill,
		},
		{
			$sort: {date: 1}
		},

	];
	aggrQuery.push(
		{
			$group: {
				_id: '$account',
				date: { $first: '$date' },
				ob: { $first: '$ob' },
				cb: { $last: '$cb' },
				dr: { $sum: '$dr' },
				cr: { $sum: '$cr' }
			}
		});

	let prjAcountBal = {};
	prjAcountBal['cr'] = 1;
	prjAcountBal['dr'] = 1;
	prjAcountBal['cb'] = 1;
	prjAcountBal['ob'] = 1;
	let ofillAcntGroup = acountGroupFiler(req.body);
	ofillAcntGroup["accountDetail.isGroup"] = false;
	if(!ofillAcntGroup['accountDetail.type._id']){//if group search not coming from frontend filters
        ofillAcntGroup['accountDetail.group']={$nin:['Driver','Vehicle']};
	}

	aggrQuery.push(
		{
			$lookup: {
				from: 'accounts', localField: '_id', foreignField: '_id', as: 'accountDetail'
			}
		},
		{
			$unwind: {
				path: '$accountDetail', preserveNullAndEmptyArrays: true
			}
		},
		{
			"$match": ofillAcntGroup
		},
		{
			$skip: ((no_of_docs * skip) - no_of_docs)
		},
		{
			$limit: no_of_docs
		}
	);

	prjAcountBal['accountDetail.name'] = 1;
	prjAcountBal['accountDetail.ledger_name'] = 1;
	prjAcountBal['accountDetail.type._id'] = 1;
	prjAcountBal['accountDetail.type.name'] = 1;
	prjAcountBal['accountDetail.branch'] = 1;
	prjAcountBal['accountDetail.isGroup'] = 1;

	aggrQuery.push(
		{
			"$project": prjAcountBal
		}
	);

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let data = await serverSidePage.requestData(AcBal, oQuery);
	// let accountData = await Accounts.find({deleted:false,clientId:req.body.clientId,isGroup:false,
	// 	"created_at":{$gte:fromDate,$lte:toDate},group:{$nin:['Driver','Vehicle']}},{ ledger_name:1,opening_balance:1}).lean();
	// if(accountData && accountData[0]) {
	// 	for(const d of accountData){
	// 		let index = data.findIndex(items => items.accountDetail.ledger_name == d.ledger_name);
	// 		if(index < 0){
	// 			data.push({
	// 				ob: d.opening_balance ? parseInt(d.opening_balance):0,
	// 				cr:0,
	// 				dr:0,
	// 				cb:d.opening_balance? parseInt(d.opening_balance):0,
	// 				accountDetail:{
	// 					ledger_name:d.ledger_name
	// 				}
	// 			})
	// 		}
	// 	}
	// }
	if (req.body.download === 'trialBalanceDetail' || req.body.download) {
		let obj = {
			ob:0,
			cr:0,
			dr:0,
			cb:0,
			total:"GRAND TOTAL"
		}
		for(const d of data){
             obj.ob += d.ob;
			 obj.cr += d.cr;
			 obj.dr += d.dr;
			 obj.cb += d.cb;
		}
		ReportExelService.reportTrialBalRep({data,obj}, req.body.clientId, toDate, {}, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Trial balance report download available.",
				"url": data.url
			});
		});
	} else {
		return {
			status: 'SUCCESS',
			message: 'Trial balance report found',
			data: data,
		};
	}
}

async function getTrialBalancesGroupWise(req, res) {

	let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
	let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? +req.body.no_of_docs : 10;

	let toDate = req.body.to  || new Date() ;

	let fromDate = new Date(toDate);
	fromDate.setDate(1);
	fromDate.setMonth(fromDate.getMonth() - 6);
	fromDate.setHours(0);
	fromDate.setMinutes(0);
	fromDate.setSeconds(0);
	fromDate.setMilliseconds(0);
	// if(req.body.download !== 'trialBalanceParticularsDetail')
	// 	req.body.from = fromDate;
	req.body.branchDetail = req.body.branch;
	req.body.groupType = req.body.type;
	let ofill = constructFiltersTrialBal(req.body);

	const aggrQuery = [
		{
			"$match": ofill,
		},
		{
			$sort: {date: 1}
		},

	];
	aggrQuery.push(
		{
			$group: {
				_id: '$account',
				date: { $first: '$date' },
				ob: { $first: '$ob' },
				cb: { $last: '$cb' },
				dr: { $sum: '$dr' },
				cr: { $sum: '$cr' }
			}
		});

	let prjAcountBal = {};
	prjAcountBal['cr'] = 1;
	prjAcountBal['dr'] = 1;
	prjAcountBal['cb'] = 1;
	prjAcountBal['ob'] = 1;
	let ofillAcntGroup = acountGroupFiler(req.body);
	ofillAcntGroup["accountDetail.isGroup"] = false;
	if(!ofillAcntGroup['accountDetail.type._id']){//if group search not coming from frontend filters
        ofillAcntGroup['accountDetail.group']={$nin:['Driver','Vehicle']};
	}

	aggrQuery.push(
		{
			$lookup: {
				from: 'accounts', localField: '_id', foreignField: '_id', as: 'accountDetail'
			}
		},
		{
			$unwind: {
				path: '$accountDetail', preserveNullAndEmptyArrays: true
			}
		},
		{
			"$match": ofillAcntGroup
		},
		{
			$skip: ((no_of_docs * skip) - no_of_docs)
		},
		{
			$limit: no_of_docs
		}
	);

	prjAcountBal['accountDetail.name'] = 1;
	prjAcountBal['accountDetail.ledger_name'] = 1;
	prjAcountBal['accountDetail.type._id'] = 1;
	prjAcountBal['accountDetail.type.name'] = 1;
	prjAcountBal['accountDetail.branch'] = 1;
	prjAcountBal['accountDetail.isGroup'] = 1;

	aggrQuery.push(
		{
			"$project": prjAcountBal
		}
	);
//grouping
	aggrQuery.push(
		{
			$group: {
				_id: '$accountDetail.type._id',
				date: { $first: '$date' },
				ob: { $first: '$ob' },
				cb: { $last: '$cb' },
				dr: { $sum: '$dr' },
				cr: { $sum: '$cr' },
				group:{ $first: '$accountDetail.type' },
				ledgers:{$push:"$$ROOT"}
			}
		}
	);

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let data = await serverSidePage.requestData(AcBal, oQuery);

	if (req.body.download === 'trialBalanceDetail' || req.body.download) {
		ReportExelService.reportTrialBalRepGroupWise(data, req.body.clientId, toDate, {}, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Trial balance group wise report download available.",
				"url": data.url
			});
		});
	}else if (req.body.download === 'trialBalanceParticularsDetail') {
		ReportExelService.trialBalanceOnlyGroupDetailReport(data, req.body.clientId, toDate, req.body.from, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Trial balance group wise report download available.",
				"url": data.url
			});
		});
	}
	else {
		return {
			status: 'SUCCESS',
			message: 'Trial balance report found',
			data: data,
		};
	}
}

async function getParticularTrialBalances(req, res) {

	let ofill = constructFiltersTrialBal(req.body);

	const aggrQuery = [
		{
			$match: ofill
		},
		{$lookup: {from: 'accounts', localField: 'account', foreignField: '_id', as: 'account'}},
		{$unwind: {path: '$account', preserveNullAndEmptyArrays: true}},
		// {
		// $match: {
		// "account.name" : "Test Trial",
		// }
		// },
		{
			$sort: {
				"date": 1
			}
		},
		{
			$project: {
				"Account_date": "$account.created_at",
				"Group_name": "$account.type.name",
				"Ledger_Name" : "$account.name",
				"date": 1,
				"deleted" : 1,
				"cb": 1,
				"cr" : 1,
				"dr": 1,
				"ob": 1,
			}
		},
		{
			"$group": {
				"_id": {
					"Group_name": "$Group_name",
					"Ledger_Name" : "$Ledger_Name"
				},
				"Opening_Balance": {$first: '$ob'},
				"Credit": {$last: '$cr'},
				"Debit": {$last: '$dr'},
				"data": { $push: '$$ROOT' },
			},

		},
		{
			"$group": {
				"_id": {
					"Group_name": "$_id.Group_name",
				},
				"Opening_Balance": {"$sum": "$Opening_Balance"},
				"Credit": {"$sum": "$Credit"},
				"Debit":  {"$sum": "$Debit"},
			},

		},
		// {
		// 	$match: {
		// 		"_id.Group_name" : "Suspense A/c"
		// 	}
		// }

	];

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let data = await serverSidePage.requestData(AcBal, oQuery);

	 if (req.body.download === true) {
		ReportExelService.trialBalanceOnlyGroupDetailReport(data,req.clientData, req.body.clientId, req.body.to, req.body.from, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Trial balance group wise report download available.",
				"url": data.url
			});
		});
	}
	else {
		return {
			status: 'SUCCESS',
			message: 'Trial balance report found',
			data: data,
		};
	}
}

async function findAccountBalAggr(req, res) {


	let constructQuery = constructFiltersBalSheet(req.body);
	let constructQueryAccBal = constructFiltersAccBal(req.body);
	try {


		/*
		let acQuery = await Accounts.find(constructQuery, {_id: 1, name:1, children:1}).lean();
		let aAllData = [];
		let aParentData = [];
		if(acQuery && acQuery.length>0){
			for(i=0; i<acQuery.length; i++) {
				//aAllData.push({name:acQuery[i].name});
				let aChildren = acQuery[i].children;
				for(j=0; j<aChildren.length; j++){
					//let acQueryChild = await Accounts.find({_id:aChildren[j]._id}, {_id: 1, name:1}).lean();
					let aggQuery = [{$match: {_id: aChildren[j]._id}}];
					aggQuery.push({
							$lookup: {
								from: "accountbalances",
								localField: "_id",
								foreignField: "account",
								as: "accountbal"
							}
						},
						{
							$unwind: {
								path: '$accountbal',
								preserveNullAndEmptyArrays: true
							}
						},
						{
							"$match": constructQueryAccBal
						},
						{
							$group: {
								_id: null,
								children: {$first: '$name'},
								ob: {$sum: '$accountbal.ob'},
								cb: {$sum: '$accountbal.cb'},
								dr: {$sum: '$accountbal.dr'},
								cr: {$sum: '$accountbal.cr'}
							}
						}
					);

					let oQuery = {aggQuery: aggQuery, sort: {_id: -1}};
					let aAccounts = await serverSidePage.requestData(Accounts, oQuery);
					//console.log(aAccounts);
					if(aAccounts.length>0) {
						aAccounts["parent"] = acQuery[i].name;
						//if(!aParentData.indexOf(acQuery[i].name))
						aParentData.push(acQuery[i].name);
						aAllData.push(aAccounts);
					}
				}
			}
		}

		aAllData.push(aParentData);

		 */
		let balanceSheetId = await Accounts.findOne({name: /Balance Sheet/i, lvl: 1, clientId:req.user.clientId, deleted: false}, {_id: 1}).lean();
		if (!balanceSheetId)
			throw new Error("No Balance Sheet Account Found");

		let aggQuery = [{
			$match: {
				"clientId": req.user.clientId,
				"lvl": {
					"$in": [
						2,
						3,
						4
					]
				},
				"isGroup": true,
				"deleted": false,
				ancestors: balanceSheetId._id
			}
		}];
		aggQuery.push({
				$lookup: {
					from: "accountbalances",
					localField: "_id",
					foreignField: "account",
					as: "accountbal"
				}
			},
			{
				$unwind: {
					path: '$accountbal',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				"$match": constructQueryAccBal
			},
			{
				"$group": {
					"_id": "$_id",
					"totalAmt": {
						"$sum": "$accountbal.cb"
					},
					"lvl":{"$first":"$lvl"},
					"name":{"$first":"$name"},
					"parent":{"$first":"$type._id"},
					"node":{"$first":"$_id"}
				}
			},
			{
				"$group": {
					"_id": "$lvl",
					"groups": {
						"$push":"$$ROOT"
					}
				}
			}
		);

		let oQuery = {aggQuery: aggQuery, sort: {_id: 1}};
		let aAllData = await serverSidePage.requestData(Accounts, oQuery);
		return aAllData;
	} catch (e) {
		throw e;
	}
}

async function findAccountAggr(req, next) {
	let query = req.body;
	query.aggQuery = constructFilters(query);
	query.sort = query.sort || {_id: -1};
	let bPopulate = query.populate || {branch: 1};
	let aggQuery = [{$match: query.aggQuery}];
	if (bPopulate.branch) {
		aggQuery.push({
				$lookup: {
					from: "branches",
					localField: "branch",
					foreignField: "_id",
					as: "branch"
				}
			},
			{
				$unwind: {
					path: '$branch',
					preserveNullAndEmptyArrays: true
				}
			});
	}

	if(req.body.downloadCSV){
		let downloadPath = await new csvDownload(Accounts, aggQuery, {
			filePath: `${req.user.clientId}/Accounts`,
			fileName: `Accounts${moment().format('DD-MM-YYYY_hh:mm')}`
		}).exec(accountCSV.transform);

		return downloadPath;
	}else{
		let oQuery = {aggQuery: aggQuery, no_of_docs: query.no_of_docs || 20000, sort: query.sort || {_id: -1}};
		let aAccounts = await serverSidePage.requestData(Accounts, oQuery);
		return aAccounts;
	}

}

async function updateName(id, body, req) {
	try {

		let clientId = req.user.clientId;
		let newName = body.name;

		// finding duplicate A/c name
		let fdAcc = await AccountsV2.findOne({
			_id: {$ne: id},
			name: new RegExp('^' + (newName.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'),
			clientId: clientId,
			deleted: false
		}, {_id: 1}).lean();

		if (fdAcc && fdAcc._id)
			throw new Error('A/c with name already Exists');

		fdAcc = await AccountsV2.findOne({
			_id: id
		}, {_id: 1}).lean();

		await Voucher.updateMany({
			'ledgers.account': fdAcc._id,
			clientId
		}, {
			$set: {
				'ledgers.$.lName': newName
			}
		});

		await AccountsV2.updateOne({
			_id: fdAcc._id
		}, {
			$set: {
				name: newName
			}
		});

		return await AccountsV2.findOne({_id: id});

	} catch (e) {
		throw e;
	}
}

async function getBalancesForGroup(oFilters,lvl,oLvl,lMap) {
	if(lvl>7){
		console.error(lvl,' lvl exceeded ',oFilters.name,oFilters.group,lvl);
		return oFilters;
	}
	let oAcc = await Accounts.findOne({_id:oFilters._id},{_id:1,lvl:1,children:1,name:1,isGroup:1,'type':1}).lean();
	console.log(lvl,oFilters.name,oFilters.group,oFilters.lvl,oAcc.isGroup);
	//oLvl[lvl] = oAcc;

	oAcc.l = lvl;
	oAcc.group = oFilters.group;
	let aggrQuery;
	let oFil = {date:oFilters.date,clientId:oFilters.clientId};
	if(oAcc.isGroup && oAcc.children && oAcc.children.length){
		let aChild = [];
		let allChild = [];
		for(let i=0;i<oAcc.children.length;i++){
			if(oAcc.children[i]._id){
				aChild.push(oAcc.children[i]._id);
				//children account if group
				let oChildrenAcc = await Accounts.findOne({_id:oAcc.children[i]._id},{_id:1,lvl:1,children:1,name:1,isGroup:1,'type':1}).lean();
				if( oChildrenAcc && oChildrenAcc.isGroup && oChildrenAcc.children && oChildrenAcc.children.length){
					for(let j=0;j<oChildrenAcc.children.length;j++){
						if(oChildrenAcc.children[j]._id){
							allChild.push(oChildrenAcc.children[j]._id);
							allChild = [...allChild,...aChild];
							//inner children if group
							let oInnerChildrenAcc = await Accounts.findOne({_id:oChildrenAcc.children[j]._id},{_id:1,lvl:1,children:1,name:1,isGroup:1,'type':1}).lean();
							if(oInnerChildrenAcc && oInnerChildrenAcc.isGroup && oInnerChildrenAcc.children && oInnerChildrenAcc.children.length){
								for(let k=0;k<oInnerChildrenAcc.children.length;k++){
									if(oInnerChildrenAcc.children[k]._id){
										allChild.push(oInnerChildrenAcc.children[k]._id);
										//second children group 4th level
										let oSecondChildrenAcc = await Accounts.findOne({_id:oInnerChildrenAcc.children[k]._id},{_id:1,lvl:1,children:1,name:1,isGroup:1,'type':1}).lean();
										if(oSecondChildrenAcc && oSecondChildrenAcc.isGroup && oSecondChildrenAcc.children && oSecondChildrenAcc.children.length){
											for(let h=0;h<oSecondChildrenAcc.children.length;h++){
												if(oSecondChildrenAcc.children[h]._id){
													allChild.push(oSecondChildrenAcc.children[h]._id);
													//third children group 4th level
													let oThirdChildrenAcc = await Accounts.findOne({_id:oSecondChildrenAcc.children[h]._id},{_id:1,lvl:1,children:1,name:1,isGroup:1,'type':1}).lean();
													if(oThirdChildrenAcc && oThirdChildrenAcc.isGroup && oThirdChildrenAcc.children && oThirdChildrenAcc.children.length){
														for(let s=0;s<oThirdChildrenAcc.children.length;s++){
															if(oThirdChildrenAcc.children[s]._id){
																allChild.push(oThirdChildrenAcc.children[s]._id);
															}else{
																console.error('child node id not found for',oThirdChildrenAcc.name);
															}
														}
													}
												}else{
													console.error('child node id not found for',oSecondChildrenAcc.name);
												}
											}
										}
									}else{
										console.error('child node id not found for',oInnerChildrenAcc.name);
									}
								}
							}
						}else{
							console.error('child node id not found for',oChildrenAcc.name);
						}
					}
				}
			}else{
				console.error('child node id not found for',oAcc.name);
			}
		}
		// console.log(aChild);
		let filterData = (allChild && allChild[0] && allChild.length > 0) ? allChild : aChild;
		oFil.account = {$in: filterData};
		aggrQuery = [{$match:oFil},
			{$sort:{date:1}},
			{
				$group: {
					_id: null,
					ob: { $first: '$ob' },
					cb: { $last: '$cb' },
					dr: { $sum: '$dr' },
					cr: { $sum: '$cr' }
				}
			}];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let data = await serverSidePage.requestData(AcBal, oQuery);
	oAcc.bal = data && data[0];

	if(!oLvl[lvl]){
		oLvl[lvl] = [];
	}
	if(!lMap[lvl]){
		lMap[lvl] = {};
	}
	delete oAcc.children;
	lMap[lvl][oAcc._id] = oAcc;
	oLvl[lvl].push(oAcc);
	let oFilCh = {_id:{$in:aChild}};
	if(lvl>0){
		oFilCh.isGroup = true;
	}
	let aChildGroup = await Accounts.find(oFilCh,{_id:1,lvl:1,children:1,name:1}).lean();

	for(let c=0;c<aChildGroup.length;c++){
		let oFilT = aChildGroup[c];
		oFilT.date = oFilters.date;
		oFilT.clientId = oFilters.clientId;
		oFilT.group  = oAcc.name;
		let reccursion = await getBalancesForGroup(oFilT,lvl+1,oLvl,lMap);
	}
	}else if(!oAcc.isGroup){//may be direct ledger
		oFil.account = oFilters._id;
		aggrQuery = [{$match:oFil},
			{$sort:{date:1}},
			{
				$group: {
					_id: null,
					ob: { $first: '$ob' },
					cb: { $last: '$cb' },
					dr: { $sum: '$dr' },
					cr: { $sum: '$cr' }
				}
			}];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let data = await serverSidePage.requestData(AcBal, oQuery);
	oAcc.bal = data && data[0];

	if(!oLvl[lvl]){
		oLvl[lvl] = [];
	}
	if(!lMap[lvl]){
		lMap[lvl] = {};
	}
	lMap[lvl][oAcc._id] = oAcc;
	oLvl[lvl].push(oAcc);
	}else{
		console.error(' group without ledger');
		if(!oLvl[lvl]){
			oLvl[lvl] = [];
		}
		if(!lMap[lvl]){
			lMap[lvl] = {};
		}
		oAcc.info = 'group without ledger';
		lMap[lvl][oAcc._id] = oAcc;
		oLvl[lvl].push(oAcc);
		//oLvl[lvl].push({bal : {ob:0,cb:0,dr:0,cr:0,e:1}});
	}
}

async function getProfitAndLoss(req, res) {
	try{
		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			if (!res.headersSent) {
				return res.status(200).json({
					status: 'SUCCESS',
					message: 'Report is taking time. Please wait, you will receive notification.',
				});
			}
		}, 1000 * 30);

		let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
		let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? +req.body.no_of_docs : 10;

		req.body.branchDetail = req.body.branch;
		req.body.groupType = req.body.type;
		let ofill = constructFiltersTrialBal(req.body)
		let oAccFil,oResProf,oResLoss,oLvlPr=[],oLvlLs=[],oPrLmap = [],oLossLmap = [];
		for(let p=0;p<req.body.oPLConf.config.profit_loss.income.length;p++){
			oAccFil = ofill || JSON.parse(JSON.stringify(ofill));
			oAccFil._id = mongoose.Types.ObjectId(req.body.oPLConf.config.profit_loss.income[p]._id);
			oResProf = await getBalancesForGroup(oAccFil,0,oLvlPr,oPrLmap);
			 //console.log(oResProf);
		}
		for(let l=0;l<req.body.oPLConf.config.profit_loss.expense.length;l++){
			oAccFil = ofill || JSON.parse(JSON.stringify(ofill));
			oAccFil._id = mongoose.Types.ObjectId(req.body.oPLConf.config.profit_loss.expense[l]._id);
			oResLoss = await getBalancesForGroup(oAccFil,0,oLvlLs,oLossLmap);
			//console.log(oResLoss);
		}
		//calculate total of profit and loss profit side
		for(let a=oPrLmap.length-1;a>0;a--){
			let aLed = oPrLmap[a];
			for (let [key, oLed] of Object.entries(aLed)) {
				if(!oPrLmap[oLed.l-1][oLed.type._id].bal){
					oPrLmap[oLed.l-1][oLed.type._id].bal = {ob:0,cb:0,cr:0,dr:0};

				if(!oLed.bal){
					oLed.bal = {ob:0,cb:0,cr:0,dr:0,info:'gen'};
				}
				oPrLmap[oLed.l-1][oLed.type._id].bal.ob = oPrLmap[oLed.l-1][oLed.type._id].bal.ob + oLed.bal.ob;
				oPrLmap[oLed.l-1][oLed.type._id].bal.cb = oPrLmap[oLed.l-1][oLed.type._id].bal.cb + oLed.bal.cb;
				oPrLmap[oLed.l-1][oLed.type._id].bal.cr = oPrLmap[oLed.l-1][oLed.type._id].bal.cr + oLed.bal.cr;
				oPrLmap[oLed.l-1][oLed.type._id].bal.dr = oPrLmap[oLed.l-1][oLed.type._id].bal.dr + oLed.bal.dr;
				}
			}
		}
		//calculate total of profit and loss side
		for(let a=oLossLmap.length-1;a>0;a--){
			let aLed = oLossLmap[a];

			for (let [key, oLed] of Object.entries(aLed)) {


				if (!oLed.bal) {
					oLed.bal = {ob: 0, cb: 0, cr: 0, dr: 0, info: 'gen'};
				}

				if (!oLossLmap[oLed.l - 1][oLed.type._id].bal) {
					oLossLmap[oLed.l - 1][oLed.type._id].bal = {ob: 0, cb: 0, cr: 0, dr: 0};

				oLossLmap[oLed.l - 1][oLed.type._id].bal.ob = oLossLmap[oLed.l - 1][oLed.type._id].bal.ob + oLed.bal.ob;
				oLossLmap[oLed.l - 1][oLed.type._id].bal.cb = oLossLmap[oLed.l - 1][oLed.type._id].bal.cb + oLed.bal.cb;
				oLossLmap[oLed.l - 1][oLed.type._id].bal.cr = oLossLmap[oLed.l - 1][oLed.type._id].bal.cr + oLed.bal.cr;
				oLossLmap[oLed.l - 1][oLed.type._id].bal.dr = oLossLmap[oLed.l - 1][oLed.type._id].bal.dr + oLed.bal.dr;
			}

			}

		}
		//let finalResp  = {oLvlPr:oLvlPr,oPrLmap:oPrLmap,oLossLmap:oLossLmap,oLvlLs:oLvlLs};
		let finalResp  = {};
		if(oLvlPr && oLvlPr[0]){//profit side
			let tPr = 0;
			for(let pr=0;pr<oLvlPr[0].length;pr++){
				oLvlPr[0][pr].bal = oPrLmap[0][oLvlPr[0][pr]._id].bal;
				let diffAmt = (oLvlPr[0][pr].bal &&oLvlPr[0][pr].bal.cr || 0) - (oLvlPr[0][pr].bal && oLvlPr[0][pr].bal.dr || 0);
				oLvlPr[0][pr].amount =  diffAmt;
				if(diffAmt < 0){
					oLvlPr[0][pr].cat = 'DR';
				}else{
					oLvlPr[0][pr].cat = 'CR';
				}
				tPr = tPr + diffAmt;
				for(let s=0;s<(oLvlPr[1] && oLvlPr[1].length);s++){
					if(oLvlPr[1][s].type && oLvlPr[1][s].type._id && oLvlPr[1][s].type._id.toString() == oLvlPr[0][pr]._id.toString()){
						if(!oLvlPr[0][pr].children) oLvlPr[0][pr].children = [];
						if(oLvlPr[1][s].bal){
							let diffAmtChild = oLvlPr[1][s].bal.cr - oLvlPr[1][s].bal.dr;
							oLvlPr[1][s].amount =  diffAmtChild;
							if(diffAmtChild < 0){
								oLvlPr[1][s].cat = 'DR';
							}else{
								oLvlPr[1][s].cat = 'CR';
							}
						}
						oLvlPr[0][pr].children.push(oLvlPr[1][s]);
					}
				}
			}
			finalResp.profit = oLvlPr[0];
			finalResp.totalProfit = tPr;
		}
		if(oLvlLs && oLvlLs[0]){//loss side
			//console.log(oLvlLs[0]);
			let tLo = 0;
			for(let pr=0;pr<oLvlLs[0].length;pr++){
				oLvlLs[0][pr].bal = oLossLmap[0][oLvlLs[0][pr]._id].bal;
				let diffAmt = (oLvlLs[0][pr].bal && oLvlLs[0][pr].bal.dr) - (oLvlLs[0][pr].bal && oLvlLs[0][pr].bal.cr);
				oLvlLs[0][pr].amount =  diffAmt;
				if(diffAmt < 0){
					oLvlLs[0][pr].cat = 'CR';
				}else{
					oLvlLs[0][pr].cat = 'DR'
				}
				tLo = tLo + diffAmt;
				for(let s=0;s<(oLvlLs[1] && oLvlLs[1].length);s++){
					if(oLvlLs[1][s].type && oLvlLs[1][s].type._id && oLvlLs[1][s].type._id.toString() == oLvlLs[0][pr]._id.toString()){
						if(!oLvlLs[0][pr].children) oLvlLs[0][pr].children = [];
						if(oLvlLs[1][s].bal){
							let diffAmtChild = (oLvlLs[1][s].bal && oLvlLs[1][s].bal.dr || 0) - (oLvlLs[1][s].bal && oLvlLs[1][s].bal.cr || 0);
							oLvlLs[1][s].amount =  diffAmtChild;
							if(diffAmtChild < 0){
								oLvlLs[1][s].cat = 'CR';
							}else{
								oLvlLs[1][s].cat = 'DR';
							}
						}
						oLvlLs[0][pr].children.push(oLvlLs[1][s]);
					}
				}
			}
			finalResp.loss = oLvlLs[0];
			finalResp.totalLoss = tLo;

		}
		// if (req.body.download === 'profiLossDetail') {
		if (req.body.download === true && req.body.reportType === 'Profit and Loss Summary') {
			//TODO develop exel and return url only
			ReportExelService.profit_Loss_Summ_Report(finalResp, req.body, req.user,req.clientData,async function (data) {
				if (hasTimeoutExecuted) {
					await logsService.addLog('Profit And Loss Summary', {
						uif: "Profit and Loss Summary" + moment().format('DD-MM-YYYY hh:mm'),
						docId: req.user._id,
						category: 'Notification',
						delta: [],
						dwnldLnk: `<a href='${data.url}' download='${data.url}' target='_blank'>Click To Download</a>`,
						userId: req.user._id,
						subCategory: 'Profit and Loss Summary Report'
					}, req);
				} else {
					clearTimeout(timer);
					return res.status(200).json({
						status: "SUCCESS",
						message: 'Profit and Loss Summary Report',
						url: data.url
					});
				}
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});

			// return res.status(200).json({
			// 	"status": "OK",
			// 	"message": "Profit and Loss",
			// 	"data":finalResp
			// });
			//

			///

		}
		else if (req.body.download === true && req.body.reportType === 'Profit and Loss Detail') {

			let salesAmount = finalResp.profit.find(item => item.name == 'Sales Accounts');
			let purchaseAmount = finalResp.loss.find(item => item.name == 'Purchase Accounts');
			let directExpAmount = finalResp.loss.find(item => item.name == 'Direct Expenses');
			let inDirectExpAmount = finalResp.loss.find(item => item.name == 'Indirect Expenses');
			let inDirectIncomeAmount = finalResp.profit.find(item => item.name == 'Indirect Incomes');

			finalResp.loss.splice(2,0,{
				name:"Gross Profit c/f",
				amount:(salesAmount.amount-(purchaseAmount.amount+directExpAmount.amount))
				//' SALES ACCOUNTS AMT - ( PURCHASE ACCOUNTS AMT + DIRECT EXPENSES AMT )
			})
			finalResp.profit.splice(1,0,{},{})
			finalResp.profit.splice(3,0,{
				name:"Gross Profit b/f",
				amount:(salesAmount.amount-(purchaseAmount.amount+directExpAmount.amount))
				//' SALES ACCOUNTS AMT - ( PURCHASE ACCOUNTS AMT + DIRECT EXPENSES AMT )
			})
			finalResp.profitAndLoss = (((salesAmount.amount-(purchaseAmount.amount + directExpAmount.amount)) + inDirectIncomeAmount.amount) - inDirectExpAmount.amount)
			finalResp.TotalProfit = finalResp.profitAndLoss + inDirectExpAmount.amount;
			finalResp.Totalloss = ((salesAmount.amount-(purchaseAmount.amount+directExpAmount.amount)) + inDirectIncomeAmount.amount);
			ReportExelService.profit_Loss_Detail_Report(finalResp, req.body, req.user, req.clientData , async function (data) {
				if (hasTimeoutExecuted) {
					await logsService.addLog('Profit And Loss Detail', {
						uif: "Profit and Loss Detail" + moment().format('DD-MM-YYYY hh:mm'),
						docId: req.user._id,
						category: 'Notification',
						delta: [],
						dwnldLnk: `<a href='${data.url}' download='${data.url}' target='_blank'>Click To Download</a>`,
						userId: req.user._id,
						subCategory: 'Profit and Loss Detailed Report'
					}, req);
				} else {
					clearTimeout(timer);
					return res.status(200).json({
						status: "SUCCESS",
						message: 'Profit and Loss Detail Report',
						url: data.url
					});
				}
			});
		}else {
			return res.status(200).json({
				"status": "OK",
				"message": "Profit and Loss",
				"data":finalResp
			});
		}

	}
	catch(err){
		console.log(err);
	}


}

async function updateAncesstorsForAllChilds(aChildrensACC,lvl,oldAnc,NewAnc) {
	if(lvl>9){
		console.error(lvl,' lvl exceeded ',aChildrensACC);
		return aChildrensACC;
	}
	let aChildrens = [];
	if(aChildrensACC && aChildrensACC.length){
		for(let c=0;c<aChildrensACC.length;c++){
			if(aChildrensACC[c]._id){
				aChildrens.push(aChildrensACC[c]._id);
			}
		}
	}
	let aGrandChildren = await Accounts.find({_id:{$in:aChildrens}},{_id:1,lvl:1,children:1,name:1,isGroup:1,'type':1}).lean();
	try{
		let ou1 = await Accounts.updateMany({_id:{$in:aChildrens}}, {$pull: {ancestors: oldAnc}});
		let ou2 =await Accounts.updateMany({_id:{$in:aChildrens}},{$addToSet: {ancestors: NewAnc}});
		if(aGrandChildren && aGrandChildren.length){
			for(let i=0;i<aGrandChildren.length;i++){
				if(aGrandChildren[i].children && aGrandChildren[i].children.length){
					let reUpRecc = await updateAncesstorsForAllChilds(aGrandChildren[i].children,lvl+1,oldAnc,NewAnc);
				}
			}
		}
	}catch(e){
		console.error('error in updateAncesstorsForAllChilds ',e);
	}
}

async function createWorkSheet(wb,ws,data, x, y) {
	try {
		let firstAcnt = data.shift();
		firstAcnt = firstAcnt || {};
		if(y > 10){
			console.error('not proper grouping ',firstAcnt.name);
			//throw new Error('not proper grouping' + firstAcnt.name)
			return 1;
		}
		if(x > 4000){
			console.error('not proper grouping ',firstAcnt.name);
			//throw new Error('not proper grouping' + firstAcnt.name)
			return 1;
		}
		var commonStyle = wb.createStyle({font: {color: '#000000', size: 12} });
		let spacing = 0;
		if (typeof firstAcnt === 'string' && firstAcnt.match(/^[0-9a-fA-F]{24}$/)) {
			firstAcnt = await Accounts.findById(firstAcnt, 'name children').lean();
		} else if ((firstAcnt._id && !firstAcnt.name) || firstAcnt._id) {
			firstAcnt = await Accounts.findById(firstAcnt._id, 'name children').lean();
		} else if (!firstAcnt._id && firstAcnt.name) {
			firstAcnt = await Accounts.findOne({name: firstAcnt.name}, 'name children').lean();
		}
		firstAcnt = firstAcnt || {};
		firstAcnt.children = firstAcnt.children || [];
		console.log(`x: ${x}, y: ${y}, name: ${firstAcnt.name}`);
		ws.cell(x, y).string(firstAcnt.name || '').style(commonStyle);
		if(!firstAcnt.children.length) return 1;
		else {
			while(firstAcnt.children.length) spacing += await createWorkSheet(wb,ws,firstAcnt.children, x + spacing, y + 1);
			return spacing;
		}
	} catch (e) {
		console.error('structure report => ', e);
	}
}

async function dailyCostCenterReport(req, res){
	try{
		const oF = costCenterFilter(req.body);
		oF.costCenter =  {$exists: true}
		let oProj = {"costCenter": 1, "dr": 1, "cr": 1, "cb": 1, "ob": 1};
		let aggrQuery = [{$match: oF},
			{
				$sort: {date: 1}
			},
			{$project: oProj},
		];
		const costCenterData = await AccountBalance.aggregate(aggrQuery).allowDiskUse(true);
		return costCenterData;
	}catch(err){
		throw err.message;
	}
}

