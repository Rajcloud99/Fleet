let router = express.Router();
let moment = require('moment');
let VoucherService = commonUtil.getService('voucher');
let Voucher = commonUtil.getModel('voucher');
const billStationaryService = commonUtil.getService('billStationary');
const XML = require('../../utils/createXML.utility');
const AcBal = commonUtil.getModel('accountbalances');
let Accounts = commonUtil.getModel('accounts');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
const logsService = commonUtil.getService('logs');

// const Voucher = commonUtil.getModel('voucher');
const Branch = commonUtil.getModel('branch');
const Account = commonUtil.getModel('accounts');
const BillStationary = commonUtil.getModel('billStationary');

const ExcelReader = require('../../utils/ExcelReader');
const multer = require('multer');
const serverSidePage = require("../../utils/serverSidePagination");
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

router.post('/upload', upload.single('voucherExcel'), async function (req, res, next) {
	try {

		const excelData = new ExcelReader({
			filePath: req.file.path,
			config: {
				'PAYMENT TYPE': {
					keyName: 'vT',
					// enum: ['Customer Receipts', 'Other'],
					ignoreIfValueIs: 'NA'
					// required: true,
				},
				'VOUCHER TYPE': {
					keyName: 'type',
					// enum: ["Journal", "Receipts", "Payment", "Contra"],
					ignoreIfValueIs: 'NA'
					// required: true,
				},
				'DATE': {
					keyName: 'date',
					dateFormat: 'DD/MM/YYYY',
					ignoreHours: true,
					ignoreIfValueIs: 'NA'
					// required: true,
				},
				'BRANCH': {
					keyName: 'branch',
					// required: true
					ignoreIfValueIs: 'NA'
				},
				'REFERENCE NO': {
					keyName: 'refNo',
					required: (req.clientConfig.config && req.clientConfig.config.voucher && req.clientConfig.config.voucher.autoRef) ? false: true,
					ignoreIfValueIs: 'NA'
				},
				'PAYMENT MODE': {
					keyName: 'paymentMode',
					// enum: ['NEFT', 'Cash', 'Cheque'],
					ignoreIfValueIs: 'NA'
				},
				'PAYMENT REFERENCE NO': {
					keyName: 'paymentRef',
					ignoreIfValueIs: 'NA',
				},
				'NARRATION': {
					keyName: 'narration',
					ignoreIfValueIs: 'NA'
				},
				'TYPE': {
					keyName: 'cRdR',
					enum: ['DR', 'CR'],
					required: true,
					ignoreIfValueIs: 'NA'
				},
				'ACCOUNT': {
					keyName: 'lName',
					required: true,
				},
				'AMOUNT': {
					keyName: 'amount',
					required: true,
				},
				'BILL TYPE': {
					keyName: 'billType',
					// enum: ['NewRef', 'OnAccount', 'AgainstRef'],
					ignoreIfValueIs: 'NA',
				},
				'BILL NO': {
					keyName: 'billNo',
					ignoreIfValueIs: 'NA',
				},
			},
		});

		let aPartialAdvances = await excelData.read();

		if(req.clientConfig.config && req.clientConfig.config.voucher && req.clientConfig.config.voucher.autoRef){
			const st3 = new Date().toISOString();
			const st4 = (st3.slice(2,4));   //year
			const st5 = (st3.slice(5,7));    //month
			const st6 = (st3.slice(8,10));    //date
			let ref = await Voucher.findOne({refNo: (new RegExp("V" + st4 + st5 + st6))}, {refNo: 1}).sort({refNo: -1}).limit(1);  ////generate Ref
			let Ref = ref && ref.refNo;
			for(const d of aPartialAdvances){
				if(d.type){
					let str5;
					if (Ref) {
						const str0 = Ref.toString().slice(5,7);
						const st1 = new Date().toISOString();
						const st2 = (st1.slice(8,10));
						const st =  Ref.toString().slice(7,13);
						if (st2 === str0) {
							str5 = st;
						}
						else {
							str5 = "0000";
						}
					}
					else {
						str5 = "0000";
					}
					let str1 = "V";
					let str = new Date().toISOString();
					const str2 = (str.slice(2, 4));
					const str3 = (str.slice(5, 7));
					const str4 = (str.slice(8, 10));
					let a = parseInt(str5);
					a++;
					const str8 = a.toString();
					const len1 = str8.length;
					const str9 = (str5.slice(0, 4 - len1));
					const str10 = str9.concat(str8);
					const RefData = str1.concat(str2, str3, str4, str10);
					d.refNo = RefData;
					Ref = RefData
				}else{
					d.refNo = Ref;
				}
			}
		}

		let aValidVoucher = {};
		let aInvalidVoucher = {};
		let clientId = req.user.clientId;
		let createdBy = req.user.full_name;
		const vTEnum = ['Customer Receipts', 'Other'];
		const typeEnum = ["Journal", "Receipt", "Payment", "Contra"];
		const billTypeEnum = ['New Ref', 'On Account', 'Against Ref'];

		for (let oRow of aPartialAdvances) {
			let {refNo, vT, type, branch, lName, date, amount, cRdR, billType, billNo, paymentMode, paymentRef, narration} = oRow;
			try {
				if (aInvalidVoucher[refNo] && aInvalidVoucher[refNo].invalid)
					throw false;

				let oBills = false;
				let stationaryId = false;
				let oLedger = {
					amount: 0,
					cRdR,
					lName,
					bills: []
				};

				if (!aValidVoucher[refNo]) { // first row validation

					if (!(vT && vTEnum.indexOf(vT) + 1))
						throw new Error("Payment Type not defined");

					if (!(type && vT === vTEnum[0] ? ["Journal", "Receipt"].indexOf(type) + 1 : typeEnum.indexOf(type) + 1))
						throw new Error("Voucher Type Value is not Valid");

					if (branch) {
						branch = await Branch.find({name: branch, clientId}, {name: 1, refNoBook: 1}).lean();
						if (branch.length == 0)
							throw new Error('Account Doesn\'t exists.');

						if (branch.length != 1)
							throw new Error('More than one Account exists/');

						let billBookId = [];
						billBookId = branch[0].refNoBook ? branch[0].refNoBook.map(o => o.ref) : '';

						if(!(req.clientConfig.config && req.clientConfig.config.voucher && req.clientConfig.config.voucher.autoRef)){
							if ((stationaryId = await BillStationary.findOne({
								billBookId: billBookId,
								clientId,
								bookNo: refNo,
								status: 'unused',
							}, {_id: 1})))
								stationaryId = stationaryId._id;
							else
								throw new Error(refNo + ' stationary is not Defined or its mark used');
						}

						branch = branch[0]._id;
					} else
						throw new Error('Branch is not Defined');

					if (date) {
						date = moment(date, 'DD/MM/YYYY').hours(0).minutes(0).seconds(0).milliseconds(0).toDate();
						let minDate = moment('31/3/2019', 'DD/MM/YYYY').hours(0).minutes(0).seconds(0).milliseconds(0).toDate();
						if (date < minDate)
							throw new Error('Date should be greater than  31/3/2019');
					}

					aValidVoucher[refNo] = [{
						vT,
						type,
						refNo,
						branch,
						stationaryId,
						date,
						clientId,
						createdBy,
						paymentMode,
						paymentRef,
						narration,
						ledgers: []
					}];
				}
				let foundAccount;
				if (lName) {  // finding A/c in DB
					foundAccount = await Account.find({clientId, name: lName}, {_id: 1, name:1, opn_bal_date:1}).lean();

					if (foundAccount.length == 0)
						throw new Error('Account Doesn\'t exists.');

					if (foundAccount.length != 1)
						throw new Error('More than one Account exists');

					if(foundAccount && foundAccount.opn_bal_date && new Date(foundAccount.opn_bal_date) > new Date(date)){
						throw new Error( 'The transaction is not allowed before opening balance date in account ' + foundAccount.name);
					}

					oLedger.account = foundAccount[0]._id;
				}

				if (billNo && !billType)
					throw new Error('Bill Type is required');

				if (billType && billTypeEnum.indexOf(billType) + 1) {
					oBills = {
						billType,
						amount
					};

					if (['New Ref', 'Against Ref'].indexOf(billType) + 1)
						if (billNo)
							oBills.billNo = billNo;
						else
							throw new Error('Bill No is required');

					if (billType === 'Against Ref' && billNo && (oBills = await Voucher.findOne({
						deleted: false,
						ledgers: {
							$elemMatch: {
								account: foundAccount,
								bills: {
									$elemMatch: {
										billType: 'New Ref',
										billNo,
										remAmt: {$gt: 0}
									}
								}
							}
						}
					}, {_id: 1}) ? {
						billNo,
						billType,
						amount
					} : false) === false)
						throw new Error('Bill No is Invalid');

				} else
					throw new Error('Invalid Bill Type');

				let oLed = aValidVoucher[refNo][0].ledgers.length && aValidVoucher[refNo][0].ledgers.find(oLed => oLed.lName === lName);

				if (oLed && oLed.lName) {
					if (oBills && oLedger.bills.length === 0) // amount of ledger doesn't match with its sum of bills amount
						throw new Error('Account Occurred more than once');

					if (oBills && oLedger.bills.find(oBill => oBill.billType === billType && oBill.billNo === billNo))
						throw new Error('Duplicate entry of Bill No and Bill Type for same Account');
				} else {
					oLedger.amount += amount;
					aValidVoucher[refNo][aValidVoucher[refNo].length - 1].ledgers.push(oLedger);
				}

				oBills && oLedger.bills.push(oBills);

			} catch (e) {
				if (aValidVoucher[refNo]) {
					aInvalidVoucher[refNo] = aValidVoucher[refNo];
					delete aValidVoucher[refNo];
					aInvalidVoucher[refNo].invalid = true;
				}

				if (e instanceof Error) {
					aInvalidVoucher[refNo] = aInvalidVoucher[refNo] || [];
					aInvalidVoucher[refNo].push(oRow);
					aInvalidVoucher[refNo].invalid = true;
					aInvalidVoucher[refNo][0].error = aInvalidVoucher[refNo][0].error || [];
					aInvalidVoucher[refNo][0].error.push(e.message);
				} else {
					aInvalidVoucher[refNo].push(oRow);
				}


			}
		}

		let allVoucher = Object.values(aValidVoucher);
		let uploadCnt = allVoucher.length;

		allVoucher.forEach(oVoucher => {
			let err;
			let obj = oVoucher[0];

			if ((err = ledgerValidation(obj.ledgers)) && !err.isValid) {
				aInvalidVoucher[obj.refNo] = aValidVoucher[obj.refNo];
				delete aValidVoucher[obj.refNo];
				aInvalidVoucher[obj.refNo].invalid = true;
				aInvalidVoucher[obj.refNo][0].error = aInvalidVoucher[obj.refNo][0].error || [];
				aInvalidVoucher[obj.refNo][0].error.push(err.message + " " + obj.refNo);
			} else {
				let vId = idUtil.generateVId(req.user.clientId, obj.type);
				let VoucherId = idUtil.generateVoucherId(req.user.clientId);
				if(req.clientConfig.config && req.clientConfig.config.voucher && req.clientConfig.config.voucher.autoRef){
					delete obj.stationaryId;
				}
				Voucher.create({...obj, vId, VoucherId});

				if (obj.stationaryId) {
					billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: VoucherId,
						modelName: 'Voucher',
						stationaryId: obj.stationaryId,
					}, 'used');
				}

			}
		});

		console.log(aValidVoucher);
		let rejecVoucher = Object.values(aInvalidVoucher);
		let rejectCnt = rejecVoucher.length;
		let msg = uploadCnt + ' Voucher are uploaded And ' + rejectCnt + ' Voucher are failed to upload ';

		return res.status(200).json({
			status: 'OK',
			message: msg,
			data: {
				aInvalidVoucher,
				aValidVoucher,
				aVoucher: Object.values(aValidVoucher),
				aVoucherFailed: Object.values(aInvalidVoucher)
			}
		});


	} catch (err) {
		console.log('Uploading error', err);
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: err.toString()
		});
	}
});

router.post('/tdsReport', async function(req, res, next){
	try{
		let data = await VoucherService.tdsServReport(req.body);
		if (req.body.download ) {
			ReportExelService.tdsExcReport(data, req.body.from_date, req.body.to_date, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}
	}
	catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

function ledgerValidation(aLedger) {

	let isValid = true,
		msg = '',
		crSum = 0,
		drSum = 0;

	if (aLedger.length == 0) {
		isValid = false;
		msg = 'Mandatory Fields are required';
	}

	isValid && aLedger.every((oLed, i) => {

		// mandatory fields validation
		if (!(oLed.account && oLed.lName && (typeof oLed.amount === 'number' && !Number.isNaN(oLed.amount)) && oLed.cRdR)) {
			isValid = false;
			msg = 'Mandatory Fields are required';
		}

		// do A/c occur multiple time
		if (aLedger.slice(i + 1).find(o => o.account === oLed.account)) {
			isValid = false;
			msg = `A/c ${oLed.lName} is Occurring Multiple Time`;
		}

		// gen CR and DR Sum
		if (oLed.cRdR === 'CR')
			crSum += oLed.amount;
		else if (oLed.cRdR === 'DR')
			drSum += oLed.amount;

		return isValid;
	});

	// CR & DR sum validation
	if (isValid && crSum.toFixed(2) != drSum.toFixed(2)) {
		isValid = false;
		msg = 'Sum of Cr and Dr should be equal';
	}

	return {
		isValid,
		message: msg
	};
}

router.post('/get', function (req, res, next) {
	VoucherService.findVoucherByQueryAsync(req.body, req.body.project && Array.isArray(req.body.project) && req.body.project.reduce((obj, oP) => {
		obj[oP] = 1;
		return obj;
	}, {}))
		.then(function (data) {
			if (req.body.download && req.body.download.toString() === 'true') {
				//TODO fix report
				data.aggregateBy = req.body.aggregateBy || null;
				ReportExelService.accountVoucherReport(data, req.query.clientId, (report) => {
					return res.status(200).json(report);
				});
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found.',
					'data': {data: data}
				});
			}
		})
		.catch(next);
});

router.post('/getGstPayment', async function (req, res, next) {
	let aAccountId = [];
	let aFoundAccount = await Account.find({name:{$in:["CGST","SGST","IGST"]}},{_id:1}).lean();
	for(ac of aFoundAccount){
		aAccountId.push(ac._id);
	}

	if(req.body.refNoUpdate){
		delete req.body.from_date;
		delete req.body.to_date;
		let searchRefNo = {};
		if (req.body.refNoUpdate instanceof RegExp)
			searchRefNo['refNo'] = req.body.refNoUpdate;
		else
			searchRefNo['refNo']= new RegExp('^' + req.body.refNoUpdate.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
		let oVoucherDate = await Voucher.findOne(searchRefNo,{_id:1, from_date: 1, to_date: 1}).lean();
		if(!(oVoucherDate && oVoucherDate.from_date && oVoucherDate.to_date)){
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Voucher not found from this RefNo ${req.body.refNoUpdate}`,
				'data': {}
			});
		} else {
			req.body.from_date 	= oVoucherDate.from_date;
			req.body.to_date 	= oVoucherDate.to_date;

		}
	}

	req.body.type = ["Sales"];
	req.body.ledger = aAccountId;
	VoucherService.findGSTPaymentVoucherByQueryAsync(req.body, req.body.project && Array.isArray(req.body.project) && req.body.project.reduce((obj, oP) => {
		obj[oP] = 1;
		return obj;
	}, {}))
		.then(async function (data) {

			let aAccountIdPay = [];
			let aFoundAccountPay = await Account.find({name:{$in:["SGST","SGST Fee","SGST Penalty","SGST Interest","CGST","CGST Fee","CGST Penalty","CGST Interest",
						"IGST Fee","IGST Penalty","IGST Interest", "IGST"]}},{_id:1}).lean();
			for(ac of aFoundAccountPay){
				aAccountIdPay.push(ac._id);
			}

			delete(req.body.type);

			req.body.type = ["Payment"];
			req.body.vT = "GST Payment";
			req.body.ledger = aAccountIdPay;

			let oVch = await VoucherService.findGSTVoucherCalByQueryAsync(req.body, req.body.project && Array.isArray(req.body.project) &&
				req.body.project.reduce((obj, oP) => { obj[oP] = 1; return obj;	}, {}));
			if(oVch) {
				Array.prototype.push.apply(data,oVch);
			}

			let searchRes = {};
			let searchRef = {};
			if(req.body.refNoUpdate){
				// if (req.body.refNoUpdate instanceof RegExp)
				// 	searchRef['refNo'] = req.body.refNoUpdate;
				// else
				// 	searchRef['refNo']= new RegExp('^' + req.body.refNoUpdate.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
				// let oVoucherId = await Voucher.findOne(searchRef).lean();

				req.body.refNo = req.body.refNoUpdate;

				delete req.body.refNoUpdate;
				delete req.body.from_date;
				delete req.body.to_date;

				let oVoucherId = await VoucherService.findVoucherByQueryAsync(req.body, '');

				searchRes = oVoucherId;
			}

			if (req.body.download && req.body.download.toString() === 'true') {

				data.aggregateBy = req.body.aggregateBy || null;
				ReportExelService.gstPaymentVoucherReport(data, req.query.clientId, (report) => {
					return res.status(200).json(report);
				});
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found.',
					'searchRes': searchRes,
					'data': {data: data}
				});
			}
		})
		.catch(next);
});

router.post('/getGstComp', async function (req, res, next) {

	let aAccountId = [];
	let aFoundAccount = await Account.find({name:{$in:["CGST","SGST","IGST"]}}).lean();
	for(ac of aFoundAccount){
		aAccountId.push(ac._id);
	}
	req.body.type = ["Sales"];
	req.body.ledger = aAccountId;
	VoucherService.findGSTVoucherByQueryAsync(req.body, req.body.project && Array.isArray(req.body.project) && req.body.project.reduce((obj, oP) => {
		obj[oP] = 1;
		return obj;
	}, {}))
		.then(function (data) {
			if (req.body.download && req.body.download.toString() === 'true') {

				data.aggregateBy = req.body.aggregateBy || null;
				ReportExelService.gstComputationVoucherReport(data, req.query.clientId, (report) => {
					return res.status(200).json(report);
				});
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found.',
					'data': {data: data}
				});
			}
		})
		.catch(next);
});

router.post('/add', async function (req, res, next) {
		try {
			let refNo;
			let stationaryType;
			//maintain Stationary
			if (Array.isArray(req.body)) {
				throw new Error('please add single voucher only');
			}
			if (!req.body || !req.body.refNo) {
				throw new Error('please provide reference no');
			}
			refNo = req.body.refNo;
			let stationaryId = req.body.stationaryId;
			stationaryType = req.body.vT === "Customer Receipts" ? "Cash Receipt" : "Ref No";

			let oQuery = {
				refNo: new RegExp('^' + refNo.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&') + '$'),
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			if (stationaryId) {
				oQuery.stationaryId = stationaryId;
			}

			let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if (foundVoucher && foundVoucher[0])
				throw new Error('Voucher Already Exists');

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: refNo,
					type: stationaryType,
					clientId: req.user.clientId
				});
				if (foundStationary) {
					req.body.stationaryId = foundStationary._id;
				}
			}

			next();

		} catch (e) {
			return res.status(500).json({
				"status": "ERROR",
				"message": e.toString()
			});
		}

	},
	async function (req, res, next) {
		try {
			req.body.createdBy = req.user.full_name;
			req.body.clientId = req.user.clientId;
			let data = await VoucherService.addVoucherAsync(req.body);
			let stationaryId = req.body.stationaryId;

			if (stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					stationaryId,
				}, 'used');
			}

			return res.status(200).json({
				'status': 'OK',
				'message': 'Data updated.',
				'data': data
			});

		} catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString()
			})
		}
	});

router.post('/tdsPayment',async function (req, res, next) {

	let refNo;
	let stationaryType;
	let body, addPayment;
	//maintain Stationary
	try {
		body = req.body;

			if (!body || !body.refNo) {
				throw new Error('please provide reference no');
			}
			refNo = body.refNo;
			let stationaryId = body.stationaryId;
			stationaryType = body.vT === "Customer Receipts" ? "Cash Receipt" : "Ref No";

			let oQuery = {
				refNo: new RegExp('^' + refNo.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&') + '$'),
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			if (stationaryId) {
				oQuery.stationaryId = stationaryId;
			}

			let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if (foundVoucher && foundVoucher[0])
				throw new Error('Voucher Already Exists');

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: refNo,
					type: stationaryType,
					clientId: req.user.clientId
				});
				if (foundStationary) {
					req.body.stationaryId = foundStationary._id;
				}
			}

			body.createdBy = req.user.full_name;
			body.clientId = req.user.clientId;
		   addPayment = await VoucherService.addVoucherAsync(body);

			if (stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					stationaryId,
				}, 'used');
			}

			if(addPayment){
				let aId = body.upDateVoucher;
				for (let i = 0; i < aId.length; i++) {

					let _id = aId[i];

					let foundVch = await VoucherService.findVoucherByIdAsync(_id);

					if (!(foundVch && foundVch._id)) {
						return res.status(500).json({
							'status': 'OK',
							'message': 'Vouchers Not Found',
						});
					}
					let query = {
						paid: true,
						by: req.user.full_name,
						at: new Date(),
						payment: addPayment[0].voucher._id
					};

					await Voucher.updateOne({_id: _id}, {
						$set: {
							tdsVoucher: query
						}
					});
				}
			}

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data updated.',
			'data': addPayment
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		})
	}

});

router.post('/bulkAddPlainVoucher',async function (req, res, next) {

		let refNo;
		let stationaryType;
		let body, parentVoucher, childVoucher;
		//maintain Stationary
	try {
		if(req.body.parentVoucher) {
			body = req.body.parentVoucher;
			body.clientId = req.body.clientId;
			body.createdBy = req.body.createdBy;
			body.created_by_name = req.body.created_by_name;
			body.created_by_employee_code = req.body.created_by_employee_code;
			body.last_modified_by = req.body.last_modified_by;
			body.last_modified_by_name = req.body.last_modified_by_name;

			if (!body || !body.refNo) {
				throw new Error('please provide reference no');
			}
			refNo = body.refNo;
			let stationaryId = body.stationaryId;
			stationaryType = body.vT === "Customer Receipts" ? "Cash Receipt" : "Ref No";

			let oQuery = {
				refNo: new RegExp('^' + refNo.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&') + '$'),
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			if (stationaryId) {
				oQuery.stationaryId = stationaryId;
			}

			let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if (foundVoucher && foundVoucher[0])
				throw new Error('Voucher Already Exists');

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: refNo,
					type: stationaryType,
					clientId: req.user.clientId
				});
				if (foundStationary) {
					req.body.stationaryId = foundStationary._id;
				}
			}

			 body.createdBy = req.user.full_name;
			 body.clientId = req.user.clientId;
			 parentVoucher = await VoucherService.addVoucherAsync(body);

			if (stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					stationaryId,
				}, 'used');
			}
		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		})
	}

	try {
		if(req.body.childVoucher) {
			body = req.body.childVoucher;
			body.clientId = req.body.clientId;
			body.createdBy = req.body.createdBy;
			body.created_by_name = req.body.created_by_name;
			body.created_by_employee_code = req.body.created_by_employee_code;
			body.last_modified_by = req.body.last_modified_by;
			body.last_modified_by_name = req.body.last_modified_by_name;
			if (!body || !body.refNo) {
				throw new Error('please provide reference no');
			}
			refNo = body.refNo;

			let oQuery = {
				refNo: new RegExp('^' + refNo.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&') + '$'),
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if (foundVoucher && foundVoucher[0])
				throw new Error('Voucher Already Exists');

			body.createdBy = req.user.full_name;
			body.clientId = req.user.clientId;
			childVoucher = await VoucherService.addVoucherAsync(body);
		}
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		})
	}

	try{
		if(parentVoucher && parentVoucher.length && childVoucher && childVoucher.length){
			let query = {},query2 = {};
			query[req.body.childVoucher.linkType] = childVoucher[0].voucher._id;
			query2[req.body.parentVoucher.linkType] = parentVoucher[0].voucher._id;
			await Voucher.updateOne({_id: parentVoucher[0].voucher._id}, {
				$set: {
					'link': query,
				}
			});
			await Voucher.updateOne({_id: childVoucher[0].voucher._id}, {
				$set: {
					'link': query2,
				}
			});
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data added.',
			'data': parentVoucher
		});

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

router.post('/bulkUpsertPlainVoucher',async function (req, res, next) {

	try {
		let nRefNo;
		let nStationaryId;
		let stationaryType;

		let body = req.body.parentVoucher;
		let _id = body._id;

		//maintain Stationary
		nRefNo = body.refNo;
		nStationaryId = body.stationaryId;
		stationaryType = body.vT === "Customer Receipts" ? "Cash Receipt" : "Ref No";

		if (!nRefNo)
			throw new Error('Mandatory fields are required');

		let foundVoucher = await VoucherService.findVoucherByIdAsync(_id, {
			_id: 1,
			acImp: 1,
			refNo: 1,
			stationaryId: 1
		});

		if (!(foundVoucher && foundVoucher._id))
			throw new Error(`Voucher Not Found`);

		if (foundVoucher.acImp.st) {
			throw new Error(`Account already imported`);
		}

		let oRefNo = foundVoucher.refNo;
		let oStationaryId = foundVoucher.stationaryId;

		if (!nStationaryId) {
			let foundId = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: stationaryType,
				clientId: req.user.clientId
			});

			if (foundId) {
				nStationaryId = foundId._id.toString();
				req.body.stationaryId = nStationaryId;
			}
		}

		if (nRefNo != oRefNo) {

			let oQuery = {
				refNo: nRefNo,
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if ((foundVoucher && foundVoucher._id) || (nStationaryId && (await billStationaryService.isUsed(nStationaryId))))
				throw new Error(`Voucher With Ref. No. ${nRefNo} Already Exists.`);


			await billStationaryService.setUnset({
				modelName: 'Voucher',
				userName: req.user.full_name,
				docId: _id
			}, {
				refNo: nRefNo,
				stationaryId: nStationaryId
			}, {
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

			if (!nStationaryId && oStationaryId) {
				await VouchersNew.update({_id: {$in: otherUtil.arrString2ObjectId(_id)}}, {
					$unset: {
						stationaryId: 1,
						refNo: 1
					}
				});
			}
		} else {
			nStationaryId && await billStationaryService.setUsed(nStationaryId);
		}

		VoucherService.editVoucher({
			_id: _id,
			...body
		});


	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}

	try {
		let nRefNo;
		let nStationaryId;
		let stationaryType;

		let body = req.body.childVoucher;
		let _id = body._id;

		//maintain Stationary
		nRefNo = body.refNo;
		nStationaryId = body.stationaryId;
		stationaryType = body.vT === "Customer Receipts" ? "Cash Receipt" : "Ref No";

		if (!nRefNo)
			throw new Error('Mandatory fields are required');

		let foundVoucher = await VoucherService.findVoucherByIdAsync(_id, {
			_id: 1,
			acImp: 1,
			refNo: 1,
			stationaryId: 1
		});

		if (!(foundVoucher && foundVoucher._id))
			throw new Error(`Voucher Not Found`);

		if (foundVoucher.acImp.st) {
			throw new Error(`Account already imported`);
		}

		let oRefNo = foundVoucher.refNo;
		let oStationaryId = foundVoucher.stationaryId;

		if (!nStationaryId) {
			let foundId = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: stationaryType,
				clientId: req.user.clientId
			});

			if (foundId) {
				nStationaryId = foundId._id.toString();
				req.body.stationaryId = nStationaryId;
			}
		}

		if (nRefNo != oRefNo) {

			let oQuery = {
				refNo: nRefNo,
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if ((foundVoucher && foundVoucher._id) || (nStationaryId && (await billStationaryService.isUsed(nStationaryId))))
				throw new Error(`Voucher With Ref. No. ${nRefNo} Already Exists.`);


			await billStationaryService.setUnset({
				modelName: 'Voucher',
				userName: req.user.full_name,
				docId: _id
			}, {
				refNo: nRefNo,
				stationaryId: nStationaryId
			}, {
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

			if (!nStationaryId && oStationaryId) {
				await VouchersNew.update({_id: {$in: otherUtil.arrString2ObjectId(_id)}}, {
					$unset: {
						stationaryId: 1,
						refNo: 1
					}
				});
			}
		} else {
			nStationaryId && await billStationaryService.setUsed(nStationaryId);
		}

		let childData = VoucherService.editVoucher({
			_id: _id,
			...body
		});

       // if(childData)
		return res.status(200).json({
			'status': 'OK',
			'message': 'Data Upsert.'
		});


	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

router.post('/gstPaymentVoucherAdd', async function (req, res, next) {
		try {
			let refNo;
			let stationaryType;
			//maintain Stationary
			if (Array.isArray(req.body)) {
				throw new Error('please add single voucher only');
			}
			if (!req.body || !req.body.refNo) {
				throw new Error('please provide reference no');
			}
			refNo = req.body.refNo;
			let stationaryId = req.body.stationaryId;
			stationaryType = req.body.vT === "Customer Receipts" ? "Cash Receipt" : "Ref No";

			let oQuery = {
				refNo: new RegExp('^' + refNo.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&') + '$'),
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			if (stationaryId) {
				oQuery.stationaryId = stationaryId;
			}

			let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if (foundVoucher && foundVoucher[0])
				throw new Error('Voucher Already Exists');

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: refNo,
					type: stationaryType,
					clientId: req.user.clientId
				});
				if (foundStationary) {
					req.body.stationaryId = foundStationary._id;
				}
			}

			next();

		} catch (e) {
			return res.status(500).json({
				"status": "ERROR",
				"message": e.toString()
			});
		}

	},
	async function (req, res, next) {
		try {
			req.body.createdBy = req.user.full_name;
			req.body.clientId = req.user.clientId;
			let data = await VoucherService.addVoucherAsync(req.body);
			let stationaryId = req.body.stationaryId;

			if (stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					stationaryId,
				}, 'used');
			}

			return res.status(200).json({
				'status': 'OK',
				'message': 'Data updated.',
				'data': data
			});

		} catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString()
			})
		}
	});

router.post('/edit/:_id', async function (req, res, next) {
	try {
		let nRefNo;
		let nStationaryId;
		let stationaryType;
		let _id = req.params._id;

		if (Array.isArray(req.body))
			throw new Error('please edit single voucher only');

		//maintain Stationary
		nRefNo = req.body.refNo;
		nStationaryId = req.body.stationaryId;
		stationaryType = req.body.vT === "Customer Receipts" ? "Cash Receipt" : "Ref No";

		if (!nRefNo)
			throw new Error('Mandatory fields are required');

		let foundVoucher = await VoucherService.findVoucherByIdAsync(_id, {
			_id: 1,
			acImp: 1,
			refNo: 1,
			stationaryId: 1
		});

		if (!(foundVoucher && foundVoucher._id))
			throw new Error(`Voucher Not Found`);

		if (foundVoucher.acImp.st) {
			throw new Error(`Account already imported`);
		}

		let oRefNo = foundVoucher.refNo;
		let oStationaryId = foundVoucher.stationaryId;

		if (!nStationaryId) {
			let foundId = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: stationaryType,
				clientId: req.user.clientId
			});

			if (foundId) {
				nStationaryId = foundId._id.toString();
				req.body.stationaryId = nStationaryId;
			}
		}

		if (nRefNo != oRefNo) {

			let oQuery = {
				refNo: nRefNo,
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			foundVoucher = await Voucher.find(oQuery, {_id: 1}).lean();

			if ((foundVoucher && foundVoucher._id) || (nStationaryId && (await billStationaryService.isUsed(nStationaryId))))
				throw new Error(`Voucher With Ref. No. ${nRefNo} Already Exists.`);


			await billStationaryService.setUnset({
				modelName: 'Voucher',
				userName: req.user.full_name,
				docId: _id
			}, {
				refNo: nRefNo,
				stationaryId: nStationaryId
			}, {
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

			if (!nStationaryId && oStationaryId) {
				await VouchersNew.update({_id: {$in: otherUtil.arrString2ObjectId(_id)}}, {
					$unset: {
						stationaryId: 1,
						refNo: 1
					}
				});
			}
		}
		// else {
		// 	nStationaryId && await billStationaryService.setUsed(nStationaryId);
		// }

		next();

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}

}, async function (req, res, next) {
	VoucherService.editVoucher({
		_id: req.params._id,
		...req.body
	})
		.then(function (data) {
			return res.status(200).json({...data});
		}).catch(next)
});

router.post('/delete', async function (req, res, next) {
	try {
		let aId = Array.isArray(req.body._id) && req.body._id.length && req.body._id || false;

		if (!aId)
			throw new Error('No vouchers are selected to delete.');

		for (let i = 0; i < aId.length; i++) {

			let _id = aId[i];

			let foundVch = await VoucherService.findVoucherByIdAsync(_id);

			if (!(foundVch && foundVch._id)) {
				return res.status(500).json({
					'status': 'OK',
					'message': 'Vouchers Not Found',
				});
			}

			if (foundVch.acImp && foundVch.acImp.st)
				throw new Error('Voucher imported to A/c. Revert the Imported Voucher to Delete.');

			if (foundVch.stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					modelName: 'vouchers',
					docId: foundVch._id,
					stationaryId: foundVch.stationaryId,
				}, 'cancelled');
			}

			await VoucherService.removeVoucher({
				_id,
				clientId: req.user.clientId,
			});

			await logsService.add('Voucher', {
				uif: foundVch.refNo,
				category: 'delete',
				nData: {},
				oData: JSON.parse(JSON.stringify(foundVch)),
			}, req);
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'Vouchers deleted',
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'OK',
			'message': e.toString(),
		});
	}
});

router.post('/get/billRefs', async function (req, res, next) {
	if (!req.body.ledgers || !req.body.type) {
		return res.status(500).json({
			status: "ERROR",
			message: "account or voucher type not provided",
		});
	}
	req.body.clientId = req.user.clientId;
	// try {
	// 	let data = await VoucherService.billAgainstRef(req.body);
	// 	return res.status(200).json({
	// 		'status': 'OK',
	// 		'message': 'bill refs found',
	// 		'data': data
	// 	})
	// }catch(e){
	// 	winston.error(e);
	// 	return res.status(200).json({
	// 		'status': 'OK',
	// 		'message': 'bill refs found',
	// 		'data': []
	// 	})
	// }
	//
	// /*
	VoucherService.aggrV2(req.body)
		.then(async function (data) {
			if (data) {
				var aBills = [];
				for (let i = 0; i < data.length; i++) {
					if (data[i].ledgers.bills) {
						aBills.push({
							billNo: data[i].ledgers.bills.billNo,
							date: data[i].date,
							remAmt: data[i].ledgers.bills.remAmt,
							amount: data[i].ledgers.bills.amount,
							_id: data[i]._id,
							refNo: data[i].refNo,
							cRdR: data[i].ledgers.cRdR
						});
						/*
						for(k=0;k<data[i].ledgers.bills.length;k++){
							data[i].ledgers.bills[k].remAmt && aBills.push({
								billNo : data[i].ledgers.bills[k].billNo,
								date : data[i].date,
								remAmt : data[i].ledgers.bills[k].remAmt,
								amount : data[i].ledgers.bills[k].amount,
								_id:data[i]._id,
								refNo:data[i].refNo
							});
						}
						*/
					}
				}
				return res.status(200).json({
					'status': 'OK',
					'message': 'bill refs found',
					'data': aBills
				})
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'No data',
					'data': []
				})
			}
		})
		.catch(next);
	// */
});

router.post('/create-vouchers-common', async (req, res, next) => {
	let aVch = VoucherService.importAccountsV2(req, res, next);
});

router.post('/get/report', function (req, res, next) {
	if (req.body.download === 'tally') {
		if (req.body.refNos && req.body.refNos.length) {
			//Do nothing
		} else if (!req.body.ledger) {
			return res.status(500).json({
				status: "ERROR",
				message: "please provide ledger name",
			});
		}
	}
	req.body.no_of_docs = 10000;
	req.body.sort = {refNoInt: 1};
	VoucherService.findVoucherByQueryAsync(req.body)
		.then(function (data) {
			if (req.body.download === 'excel') {
				ReportExelService.plainVoucherReport(data, req.query.clientId, (report) => {
					return res.status(200).json(report);
				});
			} else {
				const xml = new XML({
					template: 'Vouchers',
					data: data,
					company: req.clientConfig && req.clientConfig.config && req.clientConfig.config.tally && req.clientConfig.config.tally || {name: "Tally Company Name"},
					costCategory: req.clientConfig && req.clientConfig.config && req.clientConfig.config.costCenter && req.clientConfig.config.costCenter.categories
				}).createJSON()
					.getXmlFromJson()
					.download()
					.then(async url => {
						if (data.length > 0) {
							let oFil = {_id: {$in: data.map(y => y._id)}};
							let oUpd = {
								$set: {
									'acExp.at': new Date(),
									'acExp.st': true,
									'acExp.by': req.user.full_name,
								}, $addToSet: {
									his: {
										by: req.user.full_name,
										at: new Date(),
										cat: 'Tally Export'
									}
								}
							};
							let z = await VoucherService.updateExported(oFil, oUpd);
						}
						return res.download('files/tally.xml', 'tally.xml');
					});
			}
		}).catch(next);
});

router.post('/reverse', async function (req, res, next) {
	if (!req.body.ids) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'please select voucher to reverse'
		});
	}
	let aVch = VoucherService.reverseAccounts(req, res, next);
});

router.post('/branchExpense', async function (req, res, next) {
	try {
		let data = await VoucherService.getBranchExpenseAsync(req.body);
		if (req.body.download && req.body.reportType == 'Branch Expense') {
			ReportExelService.branchExpenseReport(data, req.body.account, req.body.to, req.body.from, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}
	} catch (e) {
		return res.status(501).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

router.post('/adminExpense', async function (req, res, next) {
	try {
		let data = await VoucherService.adminExpenseAsync(req.body);
		if (req.body.download && req.body.reportType == 'Branch Expense') {
			ReportExelService.branchExpenseReport(data, req.body.account, req.body.to, req.body.from, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}
	} catch (e) {
		return res.status(501).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

router.post('/ledger', async function (req, res, next) {
	if (!req.body.ledger) {
		return res.status(501).json({
			'status': 'OK',
			'message': 'account name not provided'
		});
	}
	if (!req.body.from_date || !req.body.to_date) {
		return res.status(501).json({
			'status': 'OK',
			'message': 'start date or end date not provided'
		});
	}
	let onlyDate = dateUtil.getMorning(req.body.from_date);//TODO make it dynamic
	let fFil = {clientId: req.user.clientId, account: req.body.ledger, date: {$lte: onlyDate}};
	let oPbal = await AcBal.find(fFil).sort({date: -1}).limit(1).lean();
	let dOp = 0;
	let aVch = await VoucherService.ledgerReport(req.body);
	let data;
	if (aVch) {
		data = {data: aVch};
	}
	let respData, summary;
	if (data.data && data.data[0]) {
		if (oPbal && oPbal[0] && moment(oPbal[0].date).diff(req.body.from_date, 'days', true) == 0) {
			data.data[0].dayOb = oPbal[0].ob || 0;
			dOp = data.data[0].dayOb;
		} else if (oPbal && oPbal[0]) {
			data.data[0].dayOb = oPbal[0].cb || 0;
			dOp = data.data[0].dayOb;
		} else {
			data.data[0].dayOb = 0;
		}
		respData = prepareLedgerData(data.data, req.body.ledger);
		data.data = respData.data;
		summary = {ob: respData.ob, cb: respData.cb, cr: respData.cr, dr: respData.dr};
		data.summary = summary;
		summary.ob = Number(numberUtils.isFloat(summary.ob) ? summary.ob.toFixed(2) : summary.ob);
		summary.cb = Number(numberUtils.isFloat(summary.cb) ? summary.cb.toFixed(2) : summary.cb);
		summary.dr = Number(numberUtils.isFloat(summary.dr) ? summary.dr.toFixed(2) : summary.dr);
		summary.cr = Number(numberUtils.isFloat(summary.cr) ? summary.cr.toFixed(2) : summary.cr);
	} else {
		data.summary = {};
		data.summary.ob = oPbal && oPbal[0] && oPbal[0].cb || 0;
		data.summary.cb = oPbal && oPbal[0] && oPbal[0].cb || 0;
		data.summary.cr = 0;
		data.summary.dr = 0;
		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.',
			'data': data
		});
	}

	if (req.body.download && req.body.download.toString() === 'true') {
		data.aggregateBy = req.body.aggregateBy || null;
		ReportExelService.ledger(data, req, (report) => {
			return res.status(200).json(report);
		});
	} else {
		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.',
			'data': data
		});
	}
});

router.post('/bankReconciliation', async function (req, res, next) {
	if (!req.body.ledger) {
		return res.status(501).json({
			'status': 'OK',
			'message': 'account name not provided'
		});
	}
	if (!req.body.from_date || !req.body.to_date) {
		return res.status(501).json({
			'status': 'OK',
			'message': 'start date or end date not provided'
		});
	}
	let checkDate = req.body.asOnDate ? req.body.asOnDate : req.body.to_date;
	let date = new Date(checkDate);
	date.setHours(23);
	date.setMinutes(59);
	date.setSeconds(59);
	date.setMilliseconds(59);
	let onlyDate = dateUtil.getMorning(req.body.from_date);//TODO make it dynamic
	let fFil = {clientId: req.user.clientId, account: req.body.ledger, date: {$lte: onlyDate}};
	let oPbal = await AcBal.find(fFil).sort({date: -1}).limit(1).lean();
	let foundAccount = await Account.findOne({ _id: mongoose.Types.ObjectId(req.body.ledger)},{_id: 1, name:1}).lean();
	let dOp = 0;
	let aVch = await VoucherService.bankReconciliation(req.body);
	let data;
	if (aVch) {
		data = {data: aVch};
	}
	let respData, summary;
	if (data.data && data.data[0]) {
		if (oPbal && oPbal[0] && moment(oPbal[0].date).diff(req.body.from_date, 'days', true) == 0) {
			data.data[0].dayOb = oPbal[0].ob || 0;
			dOp = data.data[0].dayOb;
		} else if (oPbal && oPbal[0]) {
			data.data[0].dayOb = oPbal[0].cb || 0;
			dOp = data.data[0].dayOb;
		} else {
			data.data[0].dayOb = 0;
		}
		respData = prepareLedgerData(data.data, req.body.ledger , date);
		data.data = respData.data;
		summary = {ob: respData.ob, cb: respData.cb, cr: respData.cr, dr: respData.dr,tAmt :respData.tAmt,tNclAmt:respData.tNclAmt,tNclDr:respData.tNclDr,tNclCr:respData.tNclCr,accountName:foundAccount.name};
		data.summary = summary;
		summary.ob = Number(numberUtils.isFloat(summary.ob) ? summary.ob.toFixed(2) : summary.ob);
		summary.cb = Number(numberUtils.isFloat(summary.cb) ? summary.cb.toFixed(2) : summary.cb);
		summary.dr = Number(numberUtils.isFloat(summary.dr) ? summary.dr.toFixed(2) : summary.dr);
		summary.tAmt = Number(numberUtils.isFloat(summary.tAmt) ? summary.tAmt.toFixed(2) : summary.tAmt);
		summary.tNclAmt = Number(numberUtils.isFloat(summary.tNclAmt) ? summary.tNclAmt.toFixed(2) : summary.tNclAmt);
		summary.tNclDr = Number(numberUtils.isFloat(summary.tNclDr) ? summary.tNclDr.toFixed(2) : summary.tNclDr);
		summary.tNclCr = Number(numberUtils.isFloat(summary.tNclCr) ? summary.tNclCr.toFixed(2) : summary.tNclCr);
	} else {
		data.summary = {};
		data.summary.ob = oPbal && oPbal[0] && oPbal[0].cb || 0;
		data.summary.cb = oPbal && oPbal[0] && oPbal[0].cb || 0;
		data.summary.cr = 0;
		data.summary.dr = 0;
		data.summary.tAmt = 0;
		data.summary.tNclAmt = 0;
		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.',
			'data': data
		});
	}

	if (req.body.download) {
		ReportExelService.bankReconciliationledger(data,req.body.from_date, req.body.to_date, req.user.clientId, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Report Download Available.",
				"url": data.url
			});
		});
	} else {
		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.',
			'data': data
		});
	}
});

prepareLedgerData = function (data, ACname , checkDate) {
	let tCr = 0, tDr = 0, cb = 0, ob = data[0].dayOb;
	let tAmt = 0, tNclAmt = 0 , tNclCr = 0, tNclDr = 0;
	for (let i = 0; i < data.length; i++) {
		for (let l = 0; l < data[i].ledgers.length; l++) {
			if (data[i].ledgers[l].account.toString() == ACname) {
				if (data[i].ledgers[l].cRdR == 'CR') {
					if (i === 0) {
						data[i].balance = ob - data[i].ledgers[l].amount;
						data[i].lAc = data[i].ledgers[l].lName;
					} else {
						data[i].balance = data[i - 1].balance - data[i].ledgers[l].amount;
					}
					data[i].cr = data[i].ledgers[l].amount;
					tCr = tCr + data[i].ledgers[l].amount;
					if(!(data[i].chequeClear && data[i].chequeClear.date)){
						tNclAmt = tNclAmt +  data[i].ledgers[l].amount;
						tNclCr = tNclCr +  data[i].ledgers[l].amount;
					}
					else if(new Date(checkDate) < new Date(data[i].chequeClear && data[i].chequeClear.date)){
						tNclAmt = tNclAmt +  data[i].ledgers[l].amount;
					}else{
						tAmt = tAmt +  data[i].ledgers[l].amount;
					}
				} else {
					if (i === 0) {
						data[i].balance = ob + data[i].ledgers[l].amount;
						data[i].lAc = data[i].ledgers[l].lName;
					} else {
						data[i].balance = data[i - 1].balance + data[i].ledgers[l].amount;
					}
					if(!(data[i].chequeClear && data[i].chequeClear.date)){
						tNclDr = tNclDr +  data[i].ledgers[l].amount;
					}
					data[i].dr = data[i].ledgers[l].amount;
					tDr = tDr + data[i].ledgers[l].amount;
				}
			} else {
				data[i].pAc = data[i].pAc ? (data[i].pAc + ", " + data[i].ledgers[l].lName) : data[i].ledgers[l].lName;
			}
		}

		cb = ob + tDr - tCr;
		data[i].balance = Number(numberUtils.isFloat(data[i].balance) ? data[i].balance.toFixed(2) : data[i].balance);
	}
	return {data: data, cr: tCr, dr: tDr, cb: cb, ob: ob,tAmt:tAmt , tNclAmt:tNclAmt , tNclDr:tNclDr , tNclCr:tNclCr};
};

router.post('/resetDailyBal', async function (req, res, next) {
	if (!req.body.account || !req.body.start_date) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please select date or provice account'
		})
	}
	req.body.clientId = req.user.clientId || req.body.clientId;
	let from_date = dateUtil.getMorning(req.body.start_date);
	let to_date = req.body.start_date;

	let oVchFil = {from_date: from_date, to_date: to_date, ledger: req.body.account, no_of_docs: 1};
	let aVoucher = await VoucherService.findVoucherByQueryAsync(oVchFil, {_id: 1});
	if (!aVoucher || !aVoucher.length) {
		let msg = 'Please set opening balance on ' + req.body.start_date + ' as no voucher exist for this date.Reset balance works only for the date for which transaction exists.';
		return res.status(500).json({'status': 'ERROR', 'message': msg});
	}
	if (moment(new Date()).diff(req.body.start_date, 'days', true) > 31) {
		res.status(200).json({message: 'Reset balance started for multiple months it will take some time', status: 'OK'});
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
		if(!res.headersSent){
			return res.status(200).json(oData);
		}
	}

});

router.post('/resetLegerName', async function (req, res, next) {
	await VoucherService.resetLedgerName(req, res, next);
});

router.post('/bill2bill', async function (req, res, next) {
	try {
		let data = await VoucherService.bill2bill(req.body);
		if (!req.body.download || req.body.download === "false") {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Bill to Bill Report',
				'data': data
			});
		} else {
			let ReportResponse = function (data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Bill to Bill Report download available.",
					"url": data.url
				});
			};
			ReportExelService.generateBill2BillExcel({
				...(req.body),
				data: data.data
			}, req.body.from, req.body.to, req.body.clientId, ReportResponse)
		}
	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

router.post('/updateBillAmount', async function (req, res, next) {
	try {

		let aBillNo = req.body.aBill;

		// validating bill no
		if (!aBillNo)
			throw new Error('Mandatory Field is required');

		if (typeof aBillNo === 'string')
			aBillNo = [aBillNo];
		else if (Array.isArray(aBillNo))
			aBillNo = aBillNo;
		else
			throw new Error('Invalid Bill No');

		let data = await VoucherService.updateBillRemainingAmount(aBillNo, req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Some or Bill No Updated Successfully',
			'data': data
		});

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString(),
			data: e
		});
	}
});

router.post('/clearCheque/:_id', async function (req, res, next) {
	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		if (!req.body.date)
			throw new Error('Clear Date is required');

		let vId = otherUtil.arrString2ObjectId(req.params._id);
		let fdVch = await VoucherService.findVoucherByQueryAsync({_id: vId}, {_id: 1, chequeClear: 1});

		if(!(Array.isArray(fdVch) && fdVch.length))
			throw new Error("Voucher not Found");

		if(fdVch[0].chequeClear && fdVch[0].chequeClear.date)
			throw new Error('Cheque already cleared');

		await VoucherService.setChequeData({_id: vId}, req.body);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Check Cleared Successfully',
		});

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString(),
			data: e
		});
	}
});

router.post('/unclearCheque/:_id', async function (req, res, next) {
	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let vId = otherUtil.arrString2ObjectId(req.params._id);
		let fdVch = await VoucherService.findVoucherByQueryAsync({_id: vId}, {_id: 1, chequeClear: 1});

		if(!(Array.isArray(fdVch) && fdVch.length))
			throw new Error("Voucher not Found");

		if(!(fdVch[0].chequeClear && fdVch[0].chequeClear.date))
			throw new Error('Cheque isn\'t cleared');

		await VoucherService.unSetChequeData({_id: vId});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Check Uncleared Successfully',
		});

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString(),
			data: e
		});
	}
});

router.post('/updateSystemData', async function (req, res, next) {
	try {
		if (!req.body.start_date || !req.body.end_date) {
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'start date and end date not foud'
			});
		}
		await VoucherService.tempUpdateBillRemainingAmountForOldData({}, req.body, res);

		return res.status(200).json({
			'status': 'OK',
			'message': 'All Voucher Updated Successfully'
		});

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString(),
			data: e
		});
	}
});

router.post('/billedLedgerOutstandingRpt', async function (req, res, next) {
	try {

		let data = await VoucherService.billedLedgerOutstandingRpt(req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Some or Bill No Updated Successfully',
			'url': data
		});

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString(),
			data: e
		});
	}
});

router.post('/tdsMonthlyReport', async function (req, res) {
	try {
		let data = await VoucherService.getTDSMonthlyReport(req.body);
		if (req.body.download) {
			ReportExelService.tdsMonthlyReport(data, req.body.to_date, req.body.from_date, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/getDrSecurity', async function (req, res, next) {

	try {

		let foundScurity = await VoucherService.getDrSecurity(req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found',
			foundScurity
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		})
	}

});

module.exports = router;
