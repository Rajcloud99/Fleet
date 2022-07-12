var router = require('express').Router();
var mongoose = require('mongoose');
var Accounts = commonUtil.getModel('accounts');
var AccountBalance = commonUtil.getModel('accountbalances');
var ReportExelService = commonUtil.getService('reportExel');
var AccountsService = commonUtil.getService('accounts');
var moment = require('moment');
let VoucherService = commonUtil.getService('voucher');
var ClientConf = commonUtil.getModel('clientConfig');
const serverSidePage = require('../../utils/serverSidePagination');
function isObjectId(val) {
	if (Array.isArray(val)) return false;
	if (typeof val !== 'string') return false;
	return val.toString().match(/^[0-9a-fA-F]{24}$/);
}

function isObjectIdArray(arr) {
	if (!Array.isArray(arr)) return false;
	return arr.every((curr) => curr.toString().match(/^[0-9a-fA-F]{24}$/));
}

function constructFilter(oQuery) {
	const oF = {};
	for(let key in oQuery) {
		if(oQuery.hasOwnProperty(key) && (['clientId','account','date', 'branch','from','to','deleted'].indexOf(key) >= 0)) {
			if (key == 'from') {
				let startDate = new Date(oQuery[key]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				oF["date"] = oF["date"] || {};
				oF["date"]["$gte"] = startDate;
			} else if (key == 'to') {
				let endDate = new Date(oQuery[key]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oF["date"] = oF["date"] || {};
				oF["date"]["$lte"] = endDate;
			}else if(isObjectId(oQuery[key])) {
				oF[key] = otherUtil.arrString2ObjectId(oQuery[key]);
			} else if(isObjectIdArray(oQuery[key])) {
				oF[key] = { $in: otherUtil.arrString2ObjectId(oQuery[key]) };
			} else {
				oF[key] = oQuery[key];
			}
		}
	}
	return oF;
}

router.post('/get', async function (req, res, next) {

	try {
		const oF = constructFilter(req.body);
		//TODO no need account populate if single ledger data is viewed
		let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
		let sort = req.body.sort || {_id: 1};
		let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? +req.body.no_of_docs : 20;

		let aggrQuery = [{ $match: oF },
			{
				$sort: sort
			},
			{
				$skip: ((no_of_docs * skip) - no_of_docs)
			},
			{
				$limit: no_of_docs
			}
		];
		aggrQuery.push({$lookup: {from: 'accounts', localField: 'account', foreignField: '_id', as: 'account'}},
			{$unwind: {path: '$account', preserveNullAndEmptyArrays: true}});
		// aggrQuery.push({$sort:{date:1}});
		const bals = await AccountBalance.aggregate(aggrQuery).allowDiskUse(true);
		if (req.body.download) {
			ReportExelService.acntBalRep(bals, req.user.clientId, function (d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Account balance report',
					url: d.url
				});
			});
		} else {
			return res.status(200).json({
				status: 'OK',
				message: 'Account balances found',
				data: bals
			});
		}
	} catch(e) {
		next(e);
	}
});

router.post('/accBalMonthlyReport', async function (req, res, next) {
    if(!req.body.account){
		return next(new Error('Account selection is mandatory'));
	}

	try {
		const oF = constructFilter(req.body);
		let oProj = {date:1,'account.name':1,ob:1,cb:1,month:'$_id.month',year:'$_id.year',cr:1,dr:1};
		let skip = 0;
		let no_of_docs =  req.body.no_of_docs || 20;
		if(req.body.skip){
			skip = (req.body.skip - 1) * no_of_docs;
		}
		let aggrQuery = [
			{$match:oF},
			{$sort: {date: 1}},
			{
				$group: {
					_id:{
						account:"$account",
					    month: {"$month": {date: "$date", timezone: 'Asia/Kolkata'}},
					    year: {"$year": {date: "$date", timezone: 'Asia/Kolkata'}}
					},
					date: {$last: '$date'},
					account: {$last: '$account'},
					ob: {$first: '$ob'},
					cb: {$last: '$cb'},
					cr:{$sum:'$cr'},
					dr:{$sum:'$dr'}
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'account',
					foreignField: '_id',
					as: 'account'
				}
			},
			{
				$unwind:{
					"path":"$account",
					"preserveNullAndEmptyArrays": true

				}},
			{$sort: {date: 1}},
			{$project: oProj},
			{$skip:skip},
			{$limit:no_of_docs},
		];
		let bals = await AccountBalance.aggregate(aggrQuery).allowDiskUse(true);
		for(let i=0;i<bals.length;i++){
			bals[i].date = new Date(bals[i].date);
			bals[i].date.setDate(1);
			bals[i].date.setMonth((bals[i].month-1));
			bals[i].date.setYear(bals[i].year);
		}
		let data;
		if(req.body.report === 'monthlyR') {
			let massagedData = {};
			bals.forEach(oData => {
				massagedData[oData.account.name] = massagedData[oData.account.name] || {};
				massagedData[oData.account.name].name = oData.account.name;
				let monthYear = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY');
				massagedData[oData.account.name][monthYear] = massagedData[oData.account.name][monthYear] || {};
				massagedData[oData.account.name][monthYear].cb = oData.cb;
			});
			data = Object.values(massagedData);
			// if (req.body.download && req.body.report === 'monthlyR')  {
			if (req.body.download) {
				// ReportExelService.accBalReport(bals,req.body.from, req.body.to, req.user.clientId, function (d) {
				ReportExelService.accBalReportMonthly(bals,req.body.from, req.body.to, req.user.clientId, function (d) {
					return res.status(200).json({
						status: "SUCCESS",
						message: 'Account balance report',
						url: d.url
					});
				});
				/*
				//TODO uncomment after completion of multiple accounts
				ReportExelService.accBalMonthlyReport(data, req.body.from, req.body.to, req.user.clientId, function (d) {
					return res.status(200).json({
						status: "SUCCESS",
						message: 'Account balance report',
						url: d.url
					});
				});
				 */
			}
		}else if (req.body.download && req.body.report !='monthlyR') {
			ReportExelService.accBalReport(bals,req.body.from, req.body.to, req.user.clientId, function (d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Account balance report',
					url: d.url
				});
			});
		}else {
			return res.status(200).json({
				status: 'OK',
				message: 'Account balances found',
				data: bals
			});
		}
	} catch(e) {
		next(e);
	}
});

router.post('/group_ledger', async function(req, res, next) {
	try {
		if(!req.body.type) {
			return next(new Error('Ledger group is mandatory'));
		}
		const ledgerAcnt = await Accounts.findById(req.body.type, 'name').lean();
		let aggrQuery = [
			{ $match: constructFilter(req.body) },
			{ $lookup: { from: 'accounts', localField: 'account', foreignField: '_id', as: 'account' } },
			{ $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
			{ $match: {
					$or: [
						{ 'account._id': mongoose.Types.ObjectId(req.body.type) },
						{ 'account.ancestors': mongoose.Types.ObjectId(req.body.type) }
					]
			} },
			{ $group: {
					_id : { day: { $dayOfMonth: "$date" }, month: { $month: "$date" }, year: { $year: "$date" } },
					date: { $first: '$date' },
					ob: { $first: '$ob' },
					cb: { $last: '$cb' },
					dr: { $sum: '$dr' },
					cr: { $sum: '$cr' }
			} },
			{$sort:{date:1}},
			{ $group: {
					_id : null,
					'Total Opening Balance': { $sum: '$ob' },
					'Total Closing Balance': { $sum: '$cb' },
					data: { $push: '$$ROOT' }
				} },
		];
		let balsWithSummary = (await AccountBalance.aggregate(aggrQuery))[0];
		balsWithSummary = balsWithSummary || {data: []};
		balsWithSummary.data = balsWithSummary.data.map(b => {
			b.account = ledgerAcnt;
			return b;
		});
		let summary = {...balsWithSummary};
		delete summary._id;
		delete summary.data;
		return res.status(200).json({
			status: 'OK',
			message: 'Account balances found',
			data: balsWithSummary.data,
			summary: summary,
		});
	} catch (e) {
		next(e);
	}
});

router.post('/trial_balances', async function(req, res, next) {
	try {
		if(!req.body.to){
			return res.status(200).json({
				'status': 'ERROR',
				data: bals,
				'message': 'To date is mandatory'
			});
		}
		if(!req.body.from){
			return res.status(200).json({
				'status': 'ERROR',
				data: bals,
				'message': 'From date is mandatory'
			});
		}
	let trialBal = await AccountsService.getTrialBalances(req, res);
	if(trialBal)
	{
		return res.status(200).json({
			status: trialBal.status,
			message: trialBal.message,
	    	data: trialBal.data,
		});
	}
	} catch (e) {
		next(e);
	}
});

router.post('/group_trial_balances', async function(req, res, next) {
	try {
		if(!req.body.to){
			return res.status(200).json({
				'status': 'ERROR',
				data: bals,
				'message': 'To date is mandatory'
			});
		}
		if(!req.body.from){
			return res.status(200).json({
				'status': 'ERROR',
				data: bals,
				'message': 'From date is mandatory'
			});
		}
		let trialBal = await AccountsService.getTrialBalancesGroupWise(req, res);

		if(trialBal)
		{
			return res.status(200).json({
				status: trialBal.status,
				message: trialBal.message,
				data: trialBal.data,
			});
		}
	} catch (e) {
		next(e);
	}
});

router.post('/particular_trial_balances', async function(req, res, next) {
	try {
		// if(!req.body.to){
		// 	return res.status(200).json({
		// 		'status': 'ERROR',
		// 		data: bals,
		// 		'message': 'To date is mandatory'
		// 	});
		// }
		// if(!req.body.from){
		// 	return res.status(200).json({
		// 		'status': 'ERROR',
		// 		data: bals,
		// 		'message': 'From date is mandatory'
		// 	});
		// }
		let trialBal = await AccountsService.getParticularTrialBalances(req, res);

		if(trialBal)
		{
			return res.status(200).json({
				status: trialBal.status,
				message: trialBal.message,
				data: trialBal.data,
			});
		}
	} catch (e) {
		next(e);
	}
});

router.post('/_group_balances', async function(req, res, next) {
	try {
		if(!req.body.type) {
			return next(new Error('Ledger group is mandatory'));
		}
		req.body.no_of_docs = req.body.no_of_docs || 500;
		req.body.skip = req.body.skip || 1;
		let groupAcnt = await Accounts.findById(req.body.type, 'children').lean();
		groupAcnt.children = groupAcnt.children || [];
		let data = [], summary = { 'Total Opening Balance': 0, 'Total Closing Balance': 0 };
		for (let i=0; i<groupAcnt.children.length; i++) {
			if(typeof groupAcnt.children[i] === 'string' && groupAcnt.children[i].match(/^[0-9a-fA-F]{24}$/)) {
				groupAcnt.children[i] = await Accounts.findById(groupAcnt.children[i], 'name').lean();
			} else if (groupAcnt.children[i].name && !groupAcnt.children[i]._id) {
				groupAcnt.children[i] = await Accounts.findOne({name: groupAcnt.children[i].name}, 'name').lean();
			} else if (!groupAcnt.children[i].name && groupAcnt.children[i]._id) {
				groupAcnt.children[i] = await Accounts.findById(groupAcnt.children[i]._id, 'name').lean();
			}
			let aggrQuery = [
				{ $match: constructFilter(req.body) },
				{
					$skip: ((req.body.no_of_docs * req.body.skip) - req.body.no_of_docs)
				},
				{
					$limit: req.body.no_of_docs
				},
				{ $lookup: { from: 'accounts', localField: 'account', foreignField: '_id', as: 'account' } },
				{ $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
				{ $match: {
					$or: [
						{ 'account._id': mongoose.Types.ObjectId(groupAcnt.children[i]._id) },
						{ 'account.ancestors': mongoose.Types.ObjectId(groupAcnt.children[i]._id) }
					]
				} },
				{ $group: {
						_id: null,
						ob: { $sum: '$ob' },
						cb: { $sum: '$cb' },
						dr: { $sum: '$dr' },
						cr: { $sum: '$cr' }
					} },
			];
			let bals = (await AccountBalance.aggregate(aggrQuery))[0];
			if (bals) {
				summary['Total Opening Balance'] += bals.ob;
				summary['Total Closing Balance'] += bals.cb;
				bals.account = { name: groupAcnt.children[i].name };
				data.push(bals);
			}
		}
		return res.status(200).json({
				status: 'OK',
				message: 'Account balances found',
				data,
				summary,
		});


	} catch (e) {
		next(e);
	}
});

router.post('/group_balances', async function(req, res, next) {
	try {
		if(!req.body.type) {
			return next(new Error('Ledger group is mandatory'));
		}
		if(!req.body.to) {
			return next(new Error('To date is missing'));
		}
		if(!req.body.from) {
			return next(new Error('From date is missing'));
		}

		let allowedDays = 92;
		let days = moment(new Date(req.body.to)).diff(req.body.from, 'days', true);
		if(days > allowedDays){
			return next(new Error('Can not check for more than 3 months'));
		}
		let oFilter = constructFilter(req.body);
		let aggQuery = [
			{ $match: oFilter },
			{ $lookup: { from: 'accounts', localField: 'account', foreignField: '_id', as: 'account' } },
			{ $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
			//TODO revisit logic for hierarchical data for better performance
			/*{ $match: {
					$or: [
						{ 'account._id': mongoose.Types.ObjectId(req.body.type) },
						{ 'account.ancestors': mongoose.Types.ObjectId(req.body.type) }
					]
			} },
			*/
			{ $match: {
					'account.type._id': mongoose.Types.ObjectId(req.body.type)
				}
			},
			{$sort:{'date':1}},
			{ $group: {
					_id : "$account._id",
					account: { $first: '$account' },
					ob: { $first: '$ob' },
					cb: { $last: '$cb' },
					dr: { $sum: '$dr' },
					cr: { $sum: '$cr' }
				} },
			{$sort:{'account.name':1}},
			/*
			//TODO mongo has 16 mb 1 doc limit.. it may cross it anyway 1 loop is running after fetch data
			{
				$group: {
					_id : null,
					'Total Opening Balance': { $sum: '$ob' },
					'Total Closing Balance': { $sum: '$cb' },
					data: { $push: '$$ROOT' }
				} }
				*/
		];
		let oQuery = {aggQuery:aggQuery,no_of_docs:100000};
		let aGroupData = await serverSidePage.requestData(AccountBalance,oQuery);

		let summary = {'Total Opening Balance' :0,'Total Closing Balance':0};
		aGroupData = aGroupData.map(b => {
			summary['Total Opening Balance'] = summary['Total Opening Balance'] + b.ob;
			summary['Total Closing Balance'] = summary['Total Closing Balance'] + b.cb;
			return b;
		});
		let data = aGroupData;
		if (req.body.download) {
			ReportExelService.groupBalLedgerWiseRep(aGroupData, req.user.clientId, function (d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Group balance ledger wise report',
					url: d.url
				});
			});
		} else {
			return res.status(200).json({
				status: 'OK',
				message: 'Group balances ledger wise',
				data,
				summary,
			});
		}
	} catch (e) {
		next(e);
	}
});

router.post('/opening_balance', async function(req, res, next) {
	try {
		req.body.clientId = req.body.clId ||  req.user.clientId;
		const oF = constructFilter(req.body);
		let oProj = {date:1,'account.name':1,'account.group':1,ob:1};
		let aggrQuery = [{ $match: oF },
			{
				$sort:  { date : 1 }
			},
			{	$group: {
					_id: '$account',
					date: {$first: '$date'},
					account: {$first: '$account'},
					ob: {$first: '$ob'},
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'account',
					foreignField: '_id',
					as: 'account'
				}
			},
			{
				$unwind:{
					"path":"$account",
					"preserveNullAndEmptyArrays": true

				}},
			{$match:{'account.group': req.body.group ? {$in : req.body.group} : {$in:["Transaction","Cash-in-Hand","Cashbook","banks"]}}},
			{$project: oProj},
		];
		const bals = await AccountBalance.aggregate(aggrQuery).allowDiskUse(true);
		if (req.body.download) {
			ReportExelService.obBalRep(bals, req.user.clientId, function (d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Account balance report',
					url: d.url
				});
			});
		} else {
			return res.status(200).json({
				status: 'OK',
				message: 'Account balances found',
				data: bals
			});
		}
	} catch(e) {
		next(e);
	}
});

router.post('/resetDailyBalBulk', async function (req, res, next) {
	req.body.clientId = req.body.clId || req.user.clientId;
	const oF = constructFilter(req.body);
	let oProj = {date: 1, 'account.name': 1,'account._id': 1, ob: 1};
	let aggrQuery = [{$match: oF},
		{
			$sort: {date: 1}
		},
		{
			$group: {
				_id: '$account',
				date: {$first: '$date'},
				account: {$first: '$account'},
				ob: {$first: '$ob'},
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'account',
				foreignField: '_id',
				as: 'account'
			}
		},
		{
			$unwind: {
				"path": "$account",
				"preserveNullAndEmptyArrays": true

			}
		},
		{$match: {'account.group': req.body.group ? {$in: req.body.group} : {$in: ["Transaction", "Cash-in-Hand", "Cashbook", "banks"]}}},
		{$project: oProj},
	];
	const bals = await AccountBalance.aggregate(aggrQuery).allowDiskUse(true);
	res.status(500).json({
		'status': 'OK',
		data: bals,
		'message': 'Setting OB for data'
	});

	for(let ac=0;ac<bals.length;ac++){
		console.log('starting for ' + bals[ac].account.name);
		req.body.start_date = bals[ac].date;
		req.body.account = bals[ac].account._id;
		let from_date = dateUtil.getMorning(req.body.start_date);
		let to_date = req.body.start_date;
		let oVchFil = {from_date: from_date, to_date: to_date, ledger: req.body.account, no_of_docs: 1};
		let aVoucher = await VoucherService.findVoucherByQueryAsync(oVchFil, {_id: 1});
		if (!aVoucher || !aVoucher.length) {
			let msg = bals[ac].account.name+' Please set opening balance on ' + req.body.start_date + ' as no voucher exist for this date.Reset balance works only for the date for which transaction exists.';
			console.error(msg);
			continue;
		}
		if (moment(new Date()).diff(req.body.start_date, 'days', true) > 31) {
			//res.status(200).json({message: 'Reset balance started for multiple months it will take some time', status: 'OK'});
			req.body.start_date =  new Date(req.body.start_date);
			req.body.end_date = new Date(req.body.start_date);
			req.body.end_date.setMonth(req.body.start_date.getMonth() + 1);
			while(req.body.start_date < new Date()){
				console.log('starting between',req.body.start_date,req.body.end_date);
				let oData = await VoucherService.resetDailyBalV2(req, res, next);
				req.body.start_date = new Date(req.body.end_date);
				req.body.end_date.setMonth(req.body.start_date.getMonth() + 1);
			}
		}else{
			let oData = await VoucherService.resetDailyBal(req, res, next);
		}
	}
});

router.post('/profit_loss',  async function(req, res, next) {
	try {
		if(!req.body.clientId){
			return res.status(200).json({
				'status': 'ERROR',
				data: bals,
				'message': 'client Id is mandatory'
			});
		}
		if(!req.body.to){
			return res.status(200).json({
				'status': 'ERROR',
				data: bals,
				'message': 'To date is mandatory'
			});
		}
		if(!req.body.from){
			return res.status(200).json({
				'status': 'ERROR',
				data: bals,
				'message': 'From date is mandatory'
			});
		}
		let oPLConf = await ClientConf.findOne({clientId:req.body.clientId},{'config.profit_loss':1}).lean();
		if(!oPLConf || !oPLConf.config.profit_loss || !oPLConf.config.profit_loss.income ||  !oPLConf.config.profit_loss.expense){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'Profit & Loss report not configured'
			});
		}


		req.body.oPLConf = oPLConf;
		let trialBal = await AccountsService.getProfitAndLoss(req, res);

} catch (e) {
	console.error('profit_loss error ',e);
		next(e);
	}
});

router.post('/dailyCostCenterReport', async function(req, res) {
	try{
		let costCenterData = await AccountsService.dailyCostCenterReport(req, res);

		ReportExelService.costCenterDailyReport(costCenterData, req.body.from, req.body.to, req.user.clientId, function(data){
				return res.status(200).json({
				"status": "OK",
				"message": "report download available.",
				"url": data.url
			});
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}

})

router.post('/TDSGroupSumarry', async function(req, res, next) {
	try {
		if(!req.body.type) {
			return next(new Error('Ledger group is mandatory'));
		}
		if(!req.body.to) {
			return next(new Error('To date is missing'));
		}
		if(!req.body.from) {
			return next(new Error('From date is missing'));
		}

		let allowedDays = 365;
		let days = moment(new Date(req.body.to)).diff(req.body.from, 'days', true);
		if(days > allowedDays){
			return next(new Error('Can not check for more than 3 months'));
		}
		let oFilter = constructFilter(req.body);
		let aggQuery = [
			{ $match: oFilter },
			{ $lookup: { from: 'accounts', localField: 'account', foreignField: '_id', as: 'account' } },
			{ $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
			//TODO revisit logic for hierarchical data for better performance
			/*{ $match: {
					$or: [
						{ 'account._id': mongoose.Types.ObjectId(req.body.type) },
						{ 'account.ancestors': mongoose.Types.ObjectId(req.body.type) }
					]
			} },
			*/
			{ $match: {
					'account.type._id': mongoose.Types.ObjectId(req.body.type)
				}
			},
			// {$sort:{'date':-1}},
			{ $group: {
					_id : "$account._id",
					account: { $first: '$account' },
					date:{$first:"$date"},
					ob: { $first: '$ob' },
					cb: { $last: '$cb' },
					dr: { $sum: '$dr' },
					cr: { $sum: '$cr' }
				} },
			{$sort:{'date':1}},
			/*
			//TODO mongo has 16 mb 1 doc limit.. it may cross it anyway 1 loop is running after fetch data
			{
				$group: {
					_id : null,
					'Total Opening Balance': { $sum: '$ob' },
					'Total Closing Balance': { $sum: '$cb' },
					data: { $push: '$$ROOT' }
				} }
				*/
		];
		let oQuery = {aggQuery:aggQuery,no_of_docs:100000};
		let aGroupData = await serverSidePage.requestData(AccountBalance,oQuery);

		let summary = {'Total Opening Balance' :0,'Total Closing Balance':0};
		aGroupData = aGroupData.map(b => {
			summary['Total Opening Balance'] = summary['Total Opening Balance'] + b.ob;
			summary['Total Closing Balance'] = summary['Total Closing Balance'] + b.cb;
			return b;
		});
		let data = aGroupData;
		if (req.body.download) {
			ReportExelService.groupBalanceTDSSumarry(aGroupData, req.body.from, req.body.to, req.user.clientId, function (d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'TDS Sumarry report',
					url: d.url
				});
			});
		} else {
			return res.status(200).json({
				status: 'OK',
				message: 'TDS Sumarry data found',
				data,
				summary,
			});
		}
	} catch (e) {
		next(e);
	}
});

router.post('/TDSGroupSumarryMonthly', async function(req, res, next) {
	try {
		if(!req.body.account) {
			return next(new Error('Account is mandatory'));
		}
		if(!req.body.to) {
			return next(new Error('To date is missing'));
		}
		if(!req.body.from) {
			return next(new Error('From date is missing'));
		}
		let allowedDays = 365;
		let days = moment(new Date(req.body.to)).diff(req.body.from, 'days', true);
		if(days > allowedDays){
			return next(new Error('Can not check for more than 3 months'));
		}
		let oFilter = constructFilter(req.body);
		let aggQuery = [
			{ $match: oFilter},
			{ $lookup: { from: 'accounts', localField: 'account', foreignField: '_id', as: 'account' } },
			{ $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
			// {$sort:{'date':-1}},
			{ $group: {
					_id : {
						month: {"$month": {date: "$date", timezone: 'Asia/Kolkata'}},
						year: {"$year": {date: "$date", timezone: 'Asia/Kolkata'}}
					},
					account: { $first: '$account' },
					date:{$first:"$date"},
					ob: { $first: '$ob' },
					cb: { $last: '$cb' },
					dr: { $sum: '$dr' },
					cr: { $sum: '$cr' }
				} },
			{$sort:{'date':1}},
		];
		let oQuery = {aggQuery:aggQuery,no_of_docs:100000};
		let aGroupData = await serverSidePage.requestData(AccountBalance,oQuery);

		let summary = {'Total Opening Balance' :0,'Total Closing Balance':0};
		aGroupData = aGroupData.map(b => {
			summary['Total Opening Balance'] = summary['Total Opening Balance'] + b.ob;
			summary['Total Closing Balance'] = summary['Total Closing Balance'] + b.cb;
			return b;
		});
		let data = aGroupData;
		if (req.body.download) {
			ReportExelService.groupBalanceTDSSumarryMonthly(aGroupData, req.body.from, req.body.to, req.user.clientId, function (d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'TDS Sumarry report',
					url: d.url
				});
			});
		} else {
			return res.status(200).json({
				status: 'OK',
				message: 'TDS Sumarry data found',
				data,
				summary,
			});
		}
	} catch (e) {
		next(e);
	}
});

router.post('/TDSGroupSumarryDayWise', async function(req, res, next) {
	try {
		if(!req.body.account) {
			return next(new Error('Account is mandatory'));
		}
		if(!req.body.to) {
			return next(new Error('To date is missing'));
		}
		if(!req.body.from) {
			return next(new Error('From date is missing'));
		}

		// let allowedDays = 365;
		// let days = moment(new Date(req.body.to)).diff(req.body.from, 'days', true);
		// if(days > allowedDays){
		// 	return next(new Error('Can not check for more than 3 months'));
		// }
		let oFilter = constructFilter(req.body);
		let aggQuery = [
			{ $match: oFilter},
			{ $lookup: { from: 'accounts', localField: 'account', foreignField: '_id', as: 'account' } },
			{ $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
			// {$sort:{'date':-1}},
			{ $group: {
					_id :  { day: { $dayOfMonth: "$date" }, month: { $month: "$date" }, year: { $year: "$date" } },
					account: { $first: '$account' },
					date: { $first: '$date' },
					ob: { $first: '$ob' },
					cb: { $last: '$cb' },
					dr: { $sum: '$dr' },
					cr: { $sum: '$cr' }
				} },
			{$sort:{'date':1}},
			// {$sort:{'account.name':1}},
		];
		let oQuery = {aggQuery:aggQuery,no_of_docs:100000};
		let aGroupData = await serverSidePage.requestData(AccountBalance,oQuery);

		let summary = {'Total Opening Balance' :0,'Total Closing Balance':0};
		aGroupData = aGroupData.map(b => {
			summary['Total Opening Balance'] = summary['Total Opening Balance'] + b.ob;
			summary['Total Closing Balance'] = summary['Total Closing Balance'] + b.cb;
			return b;
		});
		let data = aGroupData;
		if (req.body.download) {
			ReportExelService.groupBalanceTDSSumarryDayWise(aGroupData, req.body.from, req.body.to, req.user.clientId, function (d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'TDS Sumarry report',
					url: d.url
				});
			});
		} else {
			return res.status(200).json({
				status: 'OK',
				message: 'TDS Sumarry data found',
				data,
				summary,
			});
		}
	} catch (e) {
		next(e);
	}
});

module.exports = router;
