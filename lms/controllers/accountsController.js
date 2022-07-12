var router = express.Router();
var xl = require('excel4node');
var moment = require('moment');
const ExcelReader = require('../../utils/ExcelReader');
const fs = require('fs');
//var authUtil = commonUtil.getUtil('auth-util');
var acccountsService = promise.promisifyAll(commonUtil.getService('accounts'));
var acccountsServiceV2 = commonUtil.getService('accounts');
let Accounts = commonUtil.getModel('accounts');
let Voucher = commonUtil.getModel('voucher');
var Branch = commonUtil.getModel('branch');
var VendorTransport = promise.promisifyAll(commonUtil.getModel('vendorTransport'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var mongoose = require('mongoose');
let AcBal = commonUtil.getModel('accountbalances');
let VoucherService = commonUtil.getService('voucher');
const costCategoryCenterService = commonUtil.getService('costCategoryCenter');
const logsService = commonUtil.getService('logs');
const resetBalance = require("../services/resetBalance/index");
const CronLogUtil = commonUtil.getUtil('cronLogger-util');
const Joi = require('joi');
const multer = require('multer');
const upload = multer({
	limits: {fileSize: 2 * 1000 * 1000},
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			cb(null, path.join(projectHome, 'files'))
		},
		filename: (req, file, cb) => {
			cb(null, `${Date.now()}-${file.originalname}`)
		}
	}),
	fileFilter: (req, file, cb) => {
		if (path.extname(file.originalname) !== '.xlsx') {
			return cb(new Error('Only excel files of type .xlsx are supported'));
		} else {
			cb(null, true);
		}
	}
});

router.post('/getBalanceSheet', async function(req, res, next){
	try {
		if (req.body.cClientId)
			req.body.clientId = req.body.cClientId;

		req.body.clientAdmin = req.user.clientAdmin;
		req.body.user = req.user;

		let aAccountBal = await acccountsService.findAccountBalAggr(req, res);
		ReportExelService.accountBalanceReport(aAccountBal, req.user.clientId, (report) => {
			return res.status(200).json(report);
		});

	} catch (e) {
		console.error('error in balance sheet request',e.toString());
		next(e);
	}
});

router.post('/get', async function(req, res, next) {
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


	if(req.body.cClientId)
		req.body.clientId = req.body.cClientId;

	req.body.clientAdmin = req.user.clientAdmin;
	req.body.user = req.user;
	if(req.body.download && req.body.download.toString() === 'true') {
		try{
			req.body.no_of_docs = 20000;
			let aAccounts = await acccountsService.findAccountAggr(req);
			let data = {data:aAccounts};
			data.aggregateBy = req.body.aggregateBy || null;
			ReportExelService.accountMasterReport(data, req.query.clientId, async (report) => {
			if (hasTimeoutExecuted && report && report.url) {
				await logsService.addLog('Account', {
					uif: "Account" + moment().format('DD-MM-YYYY hh:mm'),
					docId: req.user._id,
					category: 'Notification',
					delta: [],
					dwnldLnk: `<a href='${report.url}' download='${report.url}' target='_blank'>Click To Download</a>`,
					userId: req.user._id,
					subCategory: 'Account Excel Report'
				}, req);
			} else {
				clearTimeout(timer);
				return res.status(200).json(report);
			}
			});
		}catch(e) {
			console.error('in catch of getV2 accounts',e.toString());
			next(e);
		}
	}
	else if(req.body.downloadCSV) {
		try{
			req.body.no_of_docs = 20000;
			let downloadPath = await acccountsService.findAccountAggr(req);

			if (hasTimeoutExecuted) {
				await logsService.addLog('Account', {
					uif: "Account" + moment().format('DD-MM-YYYY hh:mm'),
					docId: req.user._id,
					category: 'Notification',
					delta: [],
					dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
					userId: req.user._id,
					subCategory: 'Account CSV Report'
				}, req);
			} else {
				clearTimeout(timer);
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Account Report',
					url: downloadPath
				});
			}

		}catch(e) {
			console.error('in catch of getV2 accounts',e.toString());
			next(e);
		}
	}else{
		acccountsServiceV2.findAccountByQueryV2(req.body)
			.then(function (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found.',
					'data': data
				});
			}).catch(next)
	}
});

router.post('/getV2', async function(req, res, next) {
	req.body.user = req.user;
	try{
		let aAccounts = await acccountsService.findAccountAggr(req.body);
		let data = {data:aAccounts};
		if(req.body.download && req.body.download.toString() === 'true') {
			data.aggregateBy = req.body.aggregateBy || null;
			ReportExelService.accountMasterReport(data, req.query.clientId, (report) => {
				return res.status(200).json(report);
			});
		}else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found.',
				'data': data
			});
		}
	}catch(e) {
		console.error('in catch of getV2 accounts',e.toString());
		next(e);
	}
});

router.put('/update/:_id', async function(req, res, next) {
    if (!req.params._id) {
        return res.status(500).json({
            'status': 'ERROR',
            'message': 'Please provide _id'
        })
    }
    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
    }
    /* TODO temporary commented
    if(req.body.opening_balance){
    	delete req.body.opening_balance;
		}
		*/
	req.body.clientId = req.user.clientId || req.body.clientId;
	if (req.body.isGroup == true){
		let voucherData = await VoucherService.findVoucherByQueryAsync({'ledger':req.params._id},{type:1});
		if (voucherData && (voucherData.length > 0)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'firstly delete the vouchers'
			});
		}
	}

    acccountsService.updateAccountByIdAsync(req.params._id, req.body, req)
        .then(async function(data) {
            if (data) {
				let aData = await Accounts.find({_id: data._id}).lean();
				if(aData && aData.length && aData[0].tdsApply){
					let foundVendor = await VendorTransport.find({'account.ref': data._id}).lean();
					if(foundVendor && foundVendor.length){
						await VendorTransport.updateOne({_id: foundVendor[0]._id}, {
							$set: {
								tdsCategory: aData[0].tdsCategory,
								tdsSources: aData[0].tdsSources,
								tdsSection: aData[0].tdsSection,
								pan_no: aData[0].pan_no,
								exeRate: aData[0].exeRate || 0,
								exeFrom: aData[0].exeFrom,
								exeTo: aData[0].exeTo,
							}
						});
					}
				}else if(aData && aData.length && !aData[0].tdsApply){
					let foundVendor = await VendorTransport.find({'account.ref': data._id}).lean();
					if(foundVendor && foundVendor.length){
						await VendorTransport.updateOne({_id: foundVendor[0]._id}, {
							$unset: {
								tdsCategory: 1,
								tdsSources: 1,
								tdsSection: 1,
								tdsVerify: 1,
								exeRate: 1,
								exeFrom: 1,
								exeTo: 1,
							}
						});
					}
				}
                return res.status(200).json({
                    'status': 'OK',
                    'message': 'Data updated.',
                    'data': aData[0]
                })
            } else {
                return res.status(200).json({
                    'status': 'OK',
                    'message': 'Nothing updated.',
                    'data': null
                })
            }
        })
        .catch(next)

});

router.put('/updateName/:_id', async function(req, res, next) {

	try{

		if (!req.params._id || !req.body.name)
			throw new Error('Mandatory Feilds are required');

		let fdAcc = await acccountsService.findById(req.params._id, {_id: 1});

		if(!(fdAcc && fdAcc._id))
			throw new Error('A/c Not Found');

		let data = await acccountsService.updateName(req.params._id, req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Updated Successfully',
			data
		});

	}catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		});
	}

	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide _id'
		})
	}
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
	}
	/* TODO temporary commented
    if(req.body.opening_balance){
        delete req.body.opening_balance;
        }
        */
	req.body.clientId = req.user.clientId || req.body.clientId;
	acccountsService.updateAccountByIdAsync(req.params._id, req.body, req)
		.then(function(data) {
			if (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data updated.',
					'data': data
				})
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Nothing updated.',
					'data': null
				})
			}
		})
		.catch(next)
});

router.post('/add', function(req, res, next) {
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
	}
	acccountsService.addAccountAsync(req.body)
		.then(function(data) {
			if (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data updated.',
					'data': data
				})
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Nothing added.',
					'data': null
				})
			}
		})
		.catch(next)
});

router.delete('/remove/:_id', function(req, res, next) {
    if (!req.params._id) {
        return res.status(500).json({
            'status': 'ERROR',
            'message': 'Please provide _id'
        })
    }

    acccountsService.deleteAccountAsync(req.params._id, req.query.hardDelete)
        .then(function(message) {
            return res.status(200).json({
                'status': 'OK',
                'message': message
            })
        })
        .catch(next)
});

router.post('/delink', async (req, res, next) => {
	try {
		let foundVoucher = await VoucherService.findVoucherByQueryAsync({ledger : req.body.acntId}, {_id: 1});

         if(foundVoucher && foundVoucher.length)
			 throw new Error(`Voucher already created to selected Account`);

         if(req.body.masterSchema === 'VendorTransport') {
			 const masterUpd = await mongoose.model(req.body.masterSchema).findByIdAndUpdate(req.body.masterId, {$pull: {'account': {'ref': req.body.acntId}}}).lean();
		 }else if(req.body.withHoldAccount) {
			const masterUpd = await mongoose.model(req.body.masterSchema).findByIdAndUpdate(req.body.masterId, {$unset: {withHoldAccount: true}}).lean();
		}else {
			const masterUpd = await mongoose.model(req.body.masterSchema).findByIdAndUpdate(req.body.masterId, {$unset: {account: true}}).lean();
		}
		const acntUpd = await mongoose.model('accounts').findOneAndUpdate({_id:req.body.acntId,linkedTo:{$exists:true}}, {
			$push:{commonHistory:{
					user_full_name: req.user.full_name,
					date: new Date(),
					category: 'Account Delink',
					wasLinkedTo: req.body.wasLinkedTo,
				}},
			unset: {linkedTo: true}
		}).lean();
		return res.status(200).json({
			status:'OK',
			message: 'Account delinked successfully'
		});
	} catch(e) {
		return res.status(500).json({
			status:'ERROR',
			message: e.toString()
		});
	}
});

router.put('/ob_cb_update/:_id', async function (req, res, next) {
	if (!req.params._id || !req.body.date || isNaN(req.body.amount)) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please select account, provice amount and date'
		})
	}
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'message': 'No update body found'});
	}
	req.body.clientId = req.user.clientId || req.body.clientId;
	let onlyDate = dateUtil.getMorning(req.body.date);

	let before_date = new Date(req.body.date);
	req.body.start_date = new Date(req.body.date);
	before_date.setDate(before_date.getDate() - 1);
	let oVchFil = {to_date: before_date, ledger: req.params._id, no_of_docs: 1};
	let aVoucher = await VoucherService.findVoucherByQueryAsync(oVchFil, {_id: 1});
	if (aVoucher && aVoucher.length) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please choose date before which voucher not created.'
		});
	}
	req.body.account = req.params._id;
	let oReset;
	if (moment(new Date()).diff(req.body.start_date, 'days', true) > 31) {
		res.status(200).json({
			message: 'Reset balance started for multiple months it will take some time',
			status: 'OK'
		});
		req.body.start_date = new Date(req.body.start_date);
		req.body.end_date = new Date(req.body.start_date);
		req.body.end_date.setMonth(req.body.start_date.getMonth() + 1);
		while (req.body.start_date < new Date()) {
			console.log('starting between', req.body.start_date, req.body.end_date);
			oReset = await VoucherService.resetDailyBalV2(req, res, next);
			req.body.start_date = new Date(req.body.end_date);
			req.body.end_date.setMonth(req.body.start_date.getMonth() + 1);
		}
	} else {
		let oReset = await VoucherService.resetDailyBal(req, res, next);
		//return res.status(200).json(oReset);
	}
	//let oReset = await VoucherService.resetDailyBal(req, res, next);
	if (oReset && oReset.status == 'ERROR') {
		if (!res.headersSent) {
			return res.status(500).json(oReset);
		}
	} else {
		let updateObCB = await acccountsService.editBalances(req.params._id, req.body);
		if (updateObCB) {
			if (!res.headersSent) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data updated.',
					'data': updateObCB
				})
			}
		} else {
			if (!res.headersSent) {
				return res.status(500).json({
					'status': 'OK',
					'message': 'Nothing updated.',
					'data': null
				})
			}
		}
	}
});

router.post('/modifiedAccountUpload', upload.single('excel'), async (req, res, next) => {
	try {
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				updated_by_name: req.user.full_name,
				uploaded_at: new Date(),
			},
			config: {
				'NAME': {
					keyName: 'name',
					required: true,
				},
				'LEDGER': {
					keyName: 'ledger_name',
					required: true,
				},
				'GROUP': {
					keyName: 'type.name',
					required: true,
				},
				'TYPE': {
					keyName: 'group',
					required: true,
				},
				'Branch': {
					keyName: 'branch',
				},
				'ISGROUP': {
					keyName: 'isGroup',
					required: true,
					enum: ['YES', 'NO']
				},
			},
		});
		let acnts = await excelData.read();

		if(acnts.length > 300){
			return res.status(200).json({
				status: 'ERROR',
				message: 'Please uplaod upto 300 account in 1 file'
			});
		}

		let stats = [], bulkQuery = [];
		let acCnt 	= 0;
		let updAcnts = (await Promise.all(
			acnts.map(async (act) => {
				if(act.group)
					act.group = [act.group];
				if(act.branch){
					const oBranch = await Branch.findOne({name: act.branch, clientId: req.user.clientId},{_id:1,name:1}).lean();
					if(oBranch)
						act.branch = oBranch._id;
				}
				act.reserve = true;
				act.isGroup = (act.isGroup === 'YES');
				const statsObj = { 'STATUS': 'FAIL', 'REJECTION REASON': [] };
				const ledgerGrp = await Accounts.findOne({name: act.type.name, clientId: req.user.clientId},{_id:1,lvl:1,name:1}).lean();
				let oRet;
				if (ledgerGrp) {
					ledgerGrp.lvl = ledgerGrp.lvl || 1;
					let accountId = await idUtil.generateAccountIdAsync();
					accountId = accountId + acCnt;
					oRet = {
						...act,
						lvl: ledgerGrp.lvl + 1,
						created_at: new Date(),
						deleted:false,
						type: {
							_id: ledgerGrp._id,
							name: ledgerGrp.name,
							level: ledgerGrp.lvl,
						},
					};
					bulkQuery.push({
						updateOne: {
							filter: { clientId: act.clientId, name: act.name },
							update: { $set: oRet, $setOnInsert: { accountId } },
							upsert: true
						}
					});
				} else {
					statsObj['REJECTION REASON'].push(`Account of name "${act.type.name}" in group column not found`);
				}
				if(statsObj['REJECTION REASON'].length > 0) {
					statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
					stats.push(statsObj);
				}
				acCnt++;
				return Promise.resolve(oRet);
			})
		)).filter(a => Boolean(a));
		res.status(200).json({
			status: 'OK',
			message: bulkQuery.length
				? 'Your request is being processed. Please wait until all accounts are uploaded. Thank you!'
				: 'Refer log file for issues',
			stats
		});
		if (bulkQuery.length) {
			let actBulkRes = await Accounts.bulkWrite(bulkQuery);
			let allAcnts = await Accounts.find({clientId: req.user.clientId, type: {$type: 'object'}}, {_id: 1, type: 1}).lean();
			let childToParent = {}, parentToChildren = {};
			allAcnts.forEach((acnt, i) => {
				childToParent[acnt._id] = acnt.type._id;
				if (parentToChildren[acnt.type._id]) {
					parentToChildren[acnt.type._id].push(acnt._id);
				} else {
					parentToChildren[acnt.type._id] = [acnt._id];
				}
			});
			let updActQ = allAcnts.reduce((acc, curr, i) => {
				return [
					...acc,
					{ updateOne: {
							filter: { _id: curr._id },
							update: { $set: {
									children: parentToChildren[curr._id] ? parentToChildren[curr._id].map(a => ({_id: a})) : [],
									ancestors: getAncestors(curr._id, childToParent, 7),
								} },
							upsert: false
						} }
				];
			}, []);
			let updActRes = await Accounts.bulkWrite(updActQ);
		}

	} catch (e) {
		if(!res.headersSent){
			return res.status(500).json({
				status: 'ERROR',
				message: 'Something went wrong',
				error: e.toString()
			});
		}
	}
});

router.post('/upload', upload.single('excel'), async (req, res, next) => {
	try {
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				updated_by_name: req.user.full_name,
				uploaded_at: new Date(),
			},
			config: {
				'NAME': {
					keyName: 'name',
					required: true,
				},
					'LEDGER': {
					keyName: 'ledger_name',
					required: true,
				},
				'TYPE': {
					keyName: 'group',
					required: true,
				},
				'GROUP': {
					keyName: 'type.name',
					required: true,
				},
				'ISGROUP': {
					keyName: 'isGroup',
					required: true,
					enum: ['YES', 'NO']
				},
				'BALANCE': {
					keyName: 'balance',
					required: true,
				},
				'Bill Track': {
					keyName: 'billAc',
					/*required: true,*/
					enum: ['YES', 'NO']
				},
			},
		});
		let acnts = await excelData.read();
		if(acnts.length > 300){
			return res.status(500).json({
				status: 'ERROR',
				message: 'Please uplaod upto 300 account in 1 file',
				statsObj
			});
		}
		let stats = [], bulkQuery = [];
		let minAcId = await idUtil.generateAccountIdAsync();
		let updAcnts = (await Promise.all(
			acnts.map(async (act) => {
				act.billAc = (act.billAc === 'YES');
				const statsObj = { 'STATUS': 'FAIL', 'REJECTION REASON': [] };
				const ledgerGrp = await Accounts.findOne({name: act.type.name},{lvl:1,name:1,_id:1}).lean();
				let oRet;
				accountId = minAcId;
				minAcId++;
				if (ledgerGrp) {
					ledgerGrp.lvl = ledgerGrp.lvl || 1;
					oRet = {
						...act,
						lvl: ledgerGrp.lvl + 1,
						type: {
							_id: ledgerGrp._id,
							name: ledgerGrp.name,
							level: ledgerGrp.lvl,
						},
						deleted:false
					};
					bulkQuery.push({
						updateOne: {
							filter: { clientId: act.clientId, name: act.name },
							update: { $set: oRet, $setOnInsert: { accountId } },
							upsert: true
						}
					});
				} else {
					statsObj['REJECTION REASON'].push(`Account of name "${act.type.name}" in group column not found`);
				}
				if(statsObj['REJECTION REASON'].length > 0) {
					statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
					stats.push(statsObj);
				}
				return Promise.resolve(oRet);
			})
		)).filter(a => Boolean(a));
        var msg = bulkQuery.length ? 'Your request is being processed. Please wait until all accounts are uploaded. Thank you!' : 'Refer log file for issues';
		res.status(200).json({
			status: 'OK',
			message:msg,
			stats
		});
		telegram.sendMessage(config.serverName + ' (LMSV2) :',msg);

		if (bulkQuery.length) {
			try{
				let actBulkRes = await Accounts.bulkWrite(bulkQuery);
			}catch(e){
				telegram.sendMessage(config.serverName + ' (LMSV2) :',e.message);
				console.error(e.message);
				throw e;
			}

			let allAcnts = await Accounts.find({clientId: req.user.clientId, type: {$type: 'object'}}, {_id: 1, type: 1}).lean();
			let childToParent = {}, parentToChildren = {};
			allAcnts.forEach((acnt, i) => {
				childToParent[acnt._id] = acnt.type._id;
				if (parentToChildren[acnt.type._id]) {
					parentToChildren[acnt.type._id].push(acnt._id);
				} else {
					parentToChildren[acnt.type._id] = [acnt._id];
				}
			});
			let updActQ = allAcnts.reduce((acc, curr, i) => {
				return [
					...acc,
					{ updateOne: {
							filter: { _id: curr._id },
							update: { $set: {
								children: parentToChildren[curr._id] ? parentToChildren[curr._id].map(a => ({_id: a})) : [],
								ancestors: getAncestors(curr._id, childToParent, 7),
							} },
							upsert: false
					} }
				];
			}, []);
			let updActRes = await Accounts.bulkWrite(updActQ);
		}

	} catch (e) {
		if(!res.headersSent){
			return res.status(500).json({
				status: 'ERROR',
				message: 'Something went wrong',
				error: e.toString()
			});
		}
	}
});

router.post('/structure', async (req, res, next) => {
	if (!req.body._id) return next(new Error('select account to generate structure'));
	let accounts = await Accounts.find({_id: mongoose.Types.ObjectId(req.body._id)}).lean();
	var wb = new xl.Workbook();
	var headerStyle = wb.createStyle({
		font: {color: '#272727', size: 14, bold: true},
		alignment: {horizontal: 'center', vertical: 'center', wrapText: true},
		fill: {type: 'pattern', patternType: 'solid', fgColor: '#D1E8E2'},
		border: {right: {style: 'thin', color: '#000000'}},
	});
	var ws = wb.addWorksheet('Accounts Structure');
	ws.row(1).freeze();
	ws.row(1).setHeight(20);
	ws.column(1).setWidth(0);
	for(let i=2;i<=13;i++) {
		ws.column(i).setWidth(30);
	}
	ws.cell(1, 2).string('I').style(headerStyle);
	ws.cell(1, 3).string('II').style(headerStyle);
	ws.cell(1, 4).string('III').style(headerStyle);
	ws.cell(1, 5).string('IV').style(headerStyle);
	ws.cell(1, 6).string('V').style(headerStyle);
	ws.cell(1, 7).string('VI').style(headerStyle);
	ws.cell(1, 8).string('VII').style(headerStyle);
	ws.cell(1, 9).string('VIII').style(headerStyle);

	let skeletonStructure = [{
		name: '',
		children: accounts
	}];

	try{
		//await createWorkSheet(skeletonStructure, 3, 1);
		await acccountsService.createWorkSheet(wb,ws,skeletonStructure, 3, 1);
	}catch(e){
		return res.status(500).json({
			status: 'ERROR',
			message: e.message,
			error: e
		});
	}

	//await createWorkSheet(skeletonStructure, 3, 1);

	// await createWorkSheet([
	// 	{
	// 		name: 'Common Account',
	// 		children: [
	// 			{
	// 				name: 'Loan Account',
	// 				children: [
	// 					{
	// 						name: 'Automobile Loan Account',
	// 						children: [
	// 							{name: '2-Wheeler Automobile Loan Account'},
	// 							{name: '4-Wheeler Automobile Loan Account'}
	// 						]
	// 					},
	// 					{
	// 						name: 'Machinery Loan Account',
	// 						children: [
	// 							{name: 'Heavy Machinery Loan Account'},
	// 							{name: 'Light Machinery Loan Account'}
	// 						]
	// 					}
	// 				]
	// 			},
	// 			{
	// 				name: 'Purchase Account',
	// 				children: [
	// 					{
	// 						name: 'Vehicle Purchase Account',
	// 						children: [
	// 							{
	// 								name: '4-Wheeler Vehicle Purchase Account'
	// 							},
	// 							{
	// 								name: 'Truck Vehicle Purchase Account'
	// 							}
	// 						]
	// 					},
	// 					{
	// 						name: 'Spare Purchase Account'
	// 					}
	// 				]
	// 			}
	// 		]
	// 	}
	// ], 3, 1);

	var a=`/reports/${req.user.clientId}/Structure_Report_${moment(new Date()).format("DD-MM-YYYY")}.xlsx`;
	var path = `files${a}`;
	wb.write(path, function(err, stats) {
		if(err) throw err;
		return res.status(200).json({
			url: 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port')+a
		});
	});
});

router.post('/structureAll', async (req, res, next) =>{
	let accounts = await Accounts.find({deleted:false, clientId:req.user.clientId, name: {$in:['Balance Sheet']}}).sort({_id:-1}).lean(); //.limit(3000)
	var wb = new xl.Workbook();
	var headerStyle = wb.createStyle({
		font: {color: '#272727', size: 14, bold: true},
		alignment: {horizontal: 'center', vertical: 'center', wrapText: true},
		fill: {type: 'pattern', patternType: 'solid', fgColor: '#D1E8E2'},
		border: {right: {style: 'thin', color: '#000000'}},
	});
	var ws = wb.addWorksheet('All Accounts Structure');
	ws.row(1).freeze();
	ws.row(1).setHeight(20);
	ws.column(1).setWidth(0);
	for(let i=2;i<=13;i++) {
		ws.column(i).setWidth(30);
	}
	ws.cell(1, 2).string('I').style(headerStyle);
	ws.cell(1, 3).string('II').style(headerStyle);
	ws.cell(1, 4).string('III').style(headerStyle);
	ws.cell(1, 5).string('IV').style(headerStyle);
	ws.cell(1, 6).string('V').style(headerStyle);
	ws.cell(1, 7).string('VI').style(headerStyle);
	ws.cell(1, 8).string('VII').style(headerStyle);
	ws.cell(1, 9).string('VIII').style(headerStyle);

	let skeletonStructure = [{
		name: '',
		children: accounts
	}];
    try{
		await acccountsService.createWorkSheet(wb,ws,skeletonStructure, 3, 1);
	}catch(e){
		return res.status(500).json({
			status: 'ERROR',
			message: e.message,
			error: e
		});
	}

	var a=`/reports/${req.user.clientId}/ALL_Structure_Report_${moment(new Date()).format("DD-MM-YYYY")}.xlsx`;
	var path = `files${a}`;
	wb.write(path, function(err, stats) {
		if(err) throw err;
		return res.status(200).json({
			url: 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port')+a
		});
	});
});

router.post('/uploadOpBal', upload.single('excel'), async (req, res, next) => {
	try {
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				updated_by_name: req.user.full_name,
				uploaded_at: new Date(),
			},
			config: {
				'Name': {
					keyName: 'name',
					required: true,
				},
				'Date': {
					keyName: 'date',
					dateFormat: 'DD-MM-YYYY',
					required: true,
				},
				'BAL1': {
					keyName: 'openBal1'
				},
				'BAL2': {
					keyName: 'openBal2'
				},
				'BAL3': {
					keyName: 'openBal3'
				}
			},
		});

		let aUploadedAccounts = await excelData.read();
		let aError = [];
		let clientId = req.user.clientId;

		// fetching all account by name
		let fdAccount = await Accounts.find({
			name: {
				$in: aUploadedAccounts.map(account => new RegExp(`^${account.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`, 'i'))
			},
			clientId,
		}, {_id: 1, name: 1}).lean();

		// transform array to object(key: name, value: _id) for faster search
		let oAccount = {};
		fdAccount.forEach(account => {
			oAccount[account.name] = account;
		});

		// associate all found accounts ids to its uploaded account
		aUploadedAccounts.forEach(row => {
			let id = oAccount[row.name] && oAccount[row.name]._id;
			if(id)
				return row._id = id.toString();

			aError.push({
				...row,
				date: moment(row.date).format('DD/MM/YYYY'),
				message: "Account not found"
			});
		});

		let header1 = ['Name', 'Date', 'Amount', 'Message'];
		let header = ['name', 'date', 'amount', 'message'];

		const filePath = `${projectHome}/files/reports/${req.user.clientId}/Account Balance Error Report/Account Balance Error Report.csv`;
		let fPath = `${req.user.clientId}/Account Balance Error Report/Account Balance Error Report.csv`;
		const csvWriter = fs.createWriteStream(filePath);
		csvWriter.write(header1.join(',') + '\n');
		let downloadPath;

		if(aError.length) {

			// csvWriter.write(header1.join(',') + '\n');

			aError.forEach(row => {
				csvWriter.write(header.map(col => row[col]).join(',') + '\n');
			});

			downloadPath = 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/reports/' + fPath ;

			// return res.status(200).json({
			// 	status: 'Success',
			// 	message: 'Uploaded Files is not valid',
			// 	data: downloadPath
			// });
		}

		let hasTimeoutExecuted = false;
		const timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			if (!res.headersSent) {
				return res.status(200).json({
					status: 'SUCCESS',
					message: 'Upload is taking time. Please wait, you will receive notification.',
				});
			}
		}, 1000 * 60);

		const body = req.body;

		for (let row of aUploadedAccounts){

			let onlyDate = moment(row.date).startOf('day');
			let beforeDate = moment(row.date).add(-1, 'day').toDate();

			// check does any voucher exist form opening balance previous date
			let oVchFil = {to_date: beforeDate, ledger: row._id, no_of_docs: 1};
			let aVoucher = await VoucherService.findVoucherByQueryAsync(oVchFil, {_id: 1});
			if (aVoucher && aVoucher.length) {
				aError.push({
					...row,
					date: moment(row.date).format('DD/MM/YYYY'),
					message: 'Please choose date before which voucher not created.'
				});
				continue;
			}

			body.account = row._id;
			row.openBal1 = row.openBal1 || 0;
			row.openBal2 = row.openBal2 || 0;
			row.openBal3 = row.openBal3 || 0;
			row.amount = row.openBal1 + row.openBal2 + row.openBal3;

			if(row.amount === 0)
				continue;

			let oReset;
			if (moment().diff(onlyDate, 'days', true) > 31) {
				onlyDate.add(1, 'month');
				while (onlyDate.isBefore(moment())) {
					body.start_date = onlyDate.toDate();
					body.end_date = onlyDate.add(1, 'month').toDate();
					console.log('starting between', body.start_date, body.end_date);
					oReset = await VoucherService.resetDailyBalV2(req);
				}
			} else {
				oReset = await VoucherService.resetDailyBal(req, res, next);
			}

			if (oReset && oReset.status === 'ERROR') {
				aError.push({
					...row,
					date: moment(row.date).format('DD/MM/YYYY'),
					message: oReset.message
				});
			} else {
				let updateObCB = await acccountsService.editBalances(body.account, row);
				if (!updateObCB) {
					aError.push({
						...row,
						date: moment(row.date).format('DD/MM/YYYY'),
						message: 'Nothing to updated.'
					});
				}
			}
		}

		if(aError.length) {

			// csvWriter.write(header1.join(',') + '\n');
			aError.forEach(row => {
				csvWriter.write(header.map(col => row[col]).join(',') + '\n');
			});

			downloadPath = 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/reports/' + fPath ;

			// return res.status(200).json({
			// 	status: 'Success',
			// 	message: 'Uploaded Files is not valid',
			// 	data: downloadPath
			// });
		}

		csvWriter.end();
		if (hasTimeoutExecuted) {
			// todo add error.csv file link to download
			await logsService.addLog('Op Bal Upload', {
				uif: "Op_Bal_Upload" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Op Bal Upload'
			}, req);
		} else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Opening Bal. updated successfully '+
					`${aUploadedAccounts.length - aError.length} of ${aUploadedAccounts.length} Accounts`,
				data: downloadPath,  //send link
			});
		}

	} catch (e) {
		if(!res.headersSent){
			return res.status(500).json({
				status: 'ERROR',
				message: 'Something went wrong',
				error: e.toString()
			});
		}
	}
});

router.post('/getCostCategory', async function (req, res) {
	try {

		let data = await costCategoryCenterService.findCategory(req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Found Cost Category\'s',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/costCategory', async function (req, res) {
	try {

		// validating request body
		await validateCostCategoryRequest(req, 'add');

		let foundCostCategory = (await costCategoryCenterService.findCategory({
			name: req.body.name,
			limit: 1,
			projection: {_id: 1}
		}, req))[0];

		if(foundCostCategory && foundCostCategory._id)
			throw new Error('Cost Category name already used');

		if(req.body.branch || req.body.feature){
			let query = {
				limit: 1,
				projection: {_id: 1, name: 1}
			};

			if(req.body.branch)
				query.branch = req.body.branch._id;

			if(req.body.feature)
				query.feature = req.body.feature._id;

			foundCostCategory = (await costCategoryCenterService.findCategory({
				name: req.body.name,
			}, req))[0];

			if(foundCostCategory && foundCostCategory._id)
				throw new Error(`Cost Category ${foundCostCategory.name} already exists with
				${req.body.branch ? `branch ${req.body.branch.name}` : ''}
				${req.body.feature ? `feature ${req.body.feature.name}` : ''}`);
		}

		await costCategoryCenterService.addCategory(req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Cost Category Successfully Created',
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.put('/costCategory/:_id', async function (req, res) {
	try {

		// validating request body
		await validateCostCategoryRequest(req, 'edit');

		await costCategoryCenterService.updateCategory(req.params._id, req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Cost Category updated Successfully',
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/getCostCenter', async function (req, res) {
	try {

		let data = await costCategoryCenterService.findCenter(req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Found Cost Center\'s',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/deleteCostCenter', async function (req, res) {
	try {

		let data = await costCategoryCenterService.deleteCenter(req.body, res);

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/costCenter', async function (req, res) {
	try {

		// validating request body
			await validateCostCenterRequest(req, 'add');

		let foundCostCenter = (await costCategoryCenterService.findCenter({
			name: req.body.name,
			limit: 1
		}, req))[0];

		if(foundCostCenter && foundCostCenter._id)
			throw new Error('Cost Center name already used');

		let query, error;
		if(req.body.feature && req.body.branch) {
			query = {
				feature: req.body.feature,
				"branch": req.body.branch.map(o => o._id),
			};
			error = `Cost Center with feature "${req.body.feature}" and branch "${req.body.branch.map(o => o.name).join(', ')}" already exists`;
			query.limit = 1

			let fdCostCenter = (await costCategoryCenterService.findCenter(query, req))[0];
			if(fdCostCenter && fdCostCenter._id)
				throw new Error(error);
		}

		await costCategoryCenterService.addCenter(req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Cost Center Successfully Created',
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.put('/costCenter/:_id', async function (req, res) {
	try {

		// validating request body
		await validateCostCenterRequest(req, 'edit');
		let query, error;
		if(req.body.feature && req.body.branch) {
			query = {
				feature: req.body.feature,
				"branch": req.body.branch.map(o => o._id),
			};
			error = `Cost Center with feature "${req.body.feature}" and branch "${req.body.branch.map(o => o.name).join(', ')}" already exists`;
			query.limit = 1

			let fdCostCenter = (await costCategoryCenterService.findCenter(query, req))[0];
			if(fdCostCenter && fdCostCenter._id && fdCostCenter._id.toString() != req.params._id){
				throw new Error(error);
			}
		}
		await costCategoryCenterService.updateCenter(req.params._id, req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Cost Center updated Successfully',
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post("/checkBalance", async function(req, res, next) {
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

		if (!req.body.account) {
			res.status(200).json({
				status: 'OK',
				message: 'Account is mandatory.',
			});
		}

		let yesterday = moment().add(-2, 'day')

		let oStLog = {
			name:'resetBalanceChecker',
			st:yesterday,
			ip:'DGFC-prod',
			filters:{
				start:new Date(),
				end:new Date(),
				User : req.user.full_name,
				ledger:req.body.account
			}
		};
		let resetBalanceLedger = [{
			clientId:req.user.clientId,
			account:req.body.account,
			checkBalance:true
		}];
		let data ;
		for(const oClient of resetBalanceLedger){
			oStLog.clientId = oClient.clientId;
			let today = new Date();
			let stc = await  CronLogUtil.startLog(oStLog);
			let cache = new resetBalance(yesterday, today , oClient);
			data = await cache.exec();
			let oEdLog = {
				date: new Date(),
				completed: true,
				ed:new Date(),
				analytics:{
					total:5
				}
			};
			let etc = await CronLogUtil.endLog(stc._id,oEdLog);
		}

		if(data.length){
			const fPath = `${req.user.clientId}/Account/Check_Balance_Error_Report.csv`;
			const fileAbsolutePath = `${projectHome}/files/reports/${fPath}`;
			const csvWriter = fs.createWriteStream(fileAbsolutePath);
			const header = ['Message'];
			const write = (chunk) => new Promise((resolve) => csvWriter.write(chunk, resolve));
			await write(header.join(',') + '\n');
			for(let row of data)
				await write(header.map(col => row[col.toLowerCase()]).join(',') + '\n');

			csvWriter.end();
			let downloadDataPath =  `http://${commonUtil.getConfig('download_host')}:${commonUtil.getConfig('download_port')}/reports/${fPath}`;
			if (hasTimeoutExecuted) {
				await logsService.addLog('Check_Balance_Report', {
					uif: "Check_Balance_Report" + moment().format('DD-MM-YYYY hh:mm'),
					docId: req.user._id,
					category: 'Notification',
					delta: [],
					dwnldLnk: `<a href='${downloadDataPath}' download='${downloadDataPath}' target='_blank'>Click To Download</a>`,
					userId: req.user._id,
					subCategory: 'Check Balance Report'
				}, req);
			} else {
				clearTimeout(timer);
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Check Balance Report ',
					url: downloadDataPath
				});
			}
		}
	}catch(e) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message || e.toString()
		});
	}
});


// router.post('/costCenterRpt', async function(req, res) {
// 	try{
// 		let costCenterData = await costCategoryCenterService.costCenterReport(req, res);
//
// 		ReportExelService.costCenterReport(costCenterData, req.body.from, req.body.to, req.user.clientId, function(data){
// 			return res.status(200).json({
// 				"status": "OK",
// 				"message": "report download available.",
// 				"url": data.url
// 			});
// 		});
// 	} catch (e) {
// 		return res.status(500).json({
// 			'status': 'ERROR',
// 			'message': e.toString(),
// 			'data': e
// 		})
// }
//
// })

function getAncestors(curr, obj, maxRecur, defRecur) {
	if (!maxRecur) return [curr];
	if (!curr) return [];
	let nodes = getAncestors(obj[curr], obj, maxRecur - 1, maxRecur);
	if (!defRecur) return nodes;
	return [...nodes, curr];
}

async function validateCostCategoryRequest({body, params}, schemaType) {
	try {

		const addSchema = {
			body: Joi.object().keys({
				'name': Joi.string().required(),
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				'name': Joi.string().required(),
			}).pattern(/./, Joi.any())
		};

		let ptr;

		if(schemaType === 'add')
			ptr = addSchema;
		else if(schemaType === 'edit')
			ptr = editSchema;
		else
			throw new Error('Invalid Type');

		const schema = {
			params: Joi.object().pattern(/./, Joi.any()),
			body: Joi.object().pattern(/./, Joi.any()),
			...ptr
		};

		await Joi.validate({body, params}, schema);

		return true;

	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Fields are required.');
	}
}

async function validateCostCenterRequest({body, params}, schemaType) {
	try {

		const addSchema = {
			body: Joi.object().keys({
				'name': Joi.string().required(),
				'feature': Joi.array().items(Joi.string()),
				'category': Joi.object().keys({
					_id: Joi.string().required(),
					name: Joi.string().required(),
				}),
				'branch': Joi.array().items(Joi.object().keys({
					_id: Joi.string(),
					name: Joi.string(),
				})),
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required(),
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				'name': Joi.string().required(),
				'feature': Joi.array().items(Joi.string()),
				'category': Joi.object().keys({
					_id: Joi.string().required(),
					name: Joi.string().required(),
				}),
				'branch': Joi.array().items(Joi.object().keys({
					_id: Joi.string(),
					name: Joi.string(),
				})),
			}).pattern(/./, Joi.any())
		};

		let ptr;

		if(schemaType === 'add')
			ptr = addSchema;
		else if(schemaType === 'edit')
			ptr = editSchema;
		else
			throw new Error('Invalid Type');

		const schema = {
			params: Joi.object().pattern(/./, Joi.any()),
			body: Joi.object().pattern(/./, Joi.any()),
			...ptr
		};

		await Joi.validate({body, params}, schema);

		return true;

	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Fields are required.');
	}
}

module.exports = router;
