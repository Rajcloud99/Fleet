let router = express.Router();
const uuidv4 = require('uuid/v4');
const ExcelReader = require('../../utils/ExcelReader');
let authUtil = commonUtil.getUtil('auth-util');
let plainVoucherService = commonUtil.getService('plainVoucher');
let PlainVoucher = commonUtil.getModel('plainVoucher');
let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
let AccountsNew = commonUtil.getModel('accounts');
let accountVoucherService = promise.promisifyAll(commonUtil.getService('accountsVoucher'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let Vouchers = promise.promisifyAll(commonUtil.getModel('plainVoucher'));
let VouchersNew = commonUtil.getModel('plainVoucher');
let Bills =  promise.promisifyAll(commonUtil.getModel('bills'));
const billStationaryService = commonUtil.getService('billStationary');
const XML = require('../../utils/createXML.utility');
let AccountVoucherService = commonUtil.getService('accountsVoucher');
let VoucherService = commonUtil.getService('voucher');
const path = require('path');
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

router.post('/get', function(req, res, next) {
	plainVoucherService.findVoucherByQueryAsync(req.body)
		.then(function(data) {
			if(req.body.download && req.body.download.toString() === 'true') {
				data.aggregateBy = req.body.aggregateBy || null;
				ReportExelService.accountVoucherReport(data, req.query.clientId, (report) => {
					return res.status(200).json(report);
				});
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found.',
					'data': data
				});
			}
		})
		.catch(next);
});

router.post('/get/report', function(req, res, next) {
	if (req.body.download === 'tally' && !req.body.refNos) {
		if(!req.body.ledger){
			return res.status(500).json({
				status: "ERROR",
				message: "Choose vouchers or  ledger name",
			});
		}

	}
	plainVoucherService.aggr(req.body)
		.then(async function(data) {
			if(req.body.download === 'excel') {
				ReportExelService.plainVoucherReport(data, req.query.clientId, (report) => {
					return res.status(200).json(report);
				});
			} else {
				await PlainVoucher.updateMany({_id:{$in:otherUtil.arrString2ObjectId(req.body._id)}},{$set:{
						'export.toTally.by': req.user.full_name,
						'export.toTally.at': new Date(),
					}});
				/*
				let voucherIds = {};
				let filteredAggr = data.filter(x => {
					if (!x.voucher || !x.voucher._id) {
						return false;
					} else if(voucherIds[x.voucher._id.toString()]) {
						return false;
					} else {
						voucherIds[x.voucher._id.toString()] = true;
						return true;
					}
				});
				*/
				const xml = new XML({
					template: 'Vouchers',
					data: data,
					company:req.clientConfig && req.clientConfig.config && req.clientConfig.config.tally && req.clientConfig.config.tally || {name:"Tally Company Name"}
				})
					.createJSON()
					.getXmlFromJson()
					.download()
					.then(async url => {
						if (data.length > 0) {
							//let z = await TripAdvance.updateMany({ _id:{$in:data.map(y=>y._id)} }, {$set:{exportedAt:new Date()} });
						}
						return res.download('files/tally.xml', 'tally.xml');
					});
			}
		})
		.catch(next);
});

router.post('/add', async function(req, res, next){

	try{

		let refNo;
		let stationaryId;
		let stationaryType;


		//maintain Stationary
		if(Array.isArray(req.body)){
			if(!req.body[0] || !req.body[0].refNo){
				throw new Error('please provide reference no');
			}
			refNo = req.body[0].refNo;
			stationaryId = req.body[0].stationaryId;
			stationaryType = req.body[0].paymentType === "Customer Receipts" ? "Cash Receipt" : "Ref No" ;
		}else{
			if(!req.body || !req.body.refNo){
				throw new Error('please provide reference no');
			}
			refNo = req.body.refNo;
			stationaryId = req.body.stationaryId;
			stationaryType = req.body.paymentType === "Customer Receipts" ? "Cash Receipt" : "Ref No" ;
		}

		let oQuery = {
			refNo: refNo,
			clientId: req.user.clientId,
			deleted: {
				$not:{
					$eq:true
				}
			}
		};

		if(stationaryId){
			oQuery.stationaryId = stationaryId;
		}

		let foundVoucher = await VouchersNew.findOne(oQuery,{_id:1});

		if(foundVoucher && foundVoucher._id)
			throw new Error('Voucher Already Exists');

		if(!stationaryId){
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: refNo,
				type: stationaryType,
				clientId: req.user.clientId
			});

			if(foundStationary){
				if(Array.isArray(req.body)){
					req.body.forEach(o => {
						o.stationaryId = foundStationary._id;
					});
				}else{
					req.body.stationaryId = foundStationary._id;
				}
			}
		}

		next();

	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString()
		});
	}

},
	async function(req, res, next) {

	try {

		let data;

		if(Array.isArray(req.body)) {
			data = await plainVoucherService.addMultiTransactionSingleVoucher({
				aVoucher: req.body,
				clientId: req.user.clientId,
				vT:'same',
				created_by_name: req.body.created_by_name
			});

		} else {
			data = await plainVoucherService.addVoucherAsync(req.body);
		}

		let stationaryId;
		if(Array.isArray(req.body)){
			stationaryId = req.body[0].stationaryId;
		}else{
			stationaryId = req.body.stationaryId;
		}

		if(stationaryId){
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

	}catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		})
	}
});

router.post('/edit', async function(req, res, next){

	try{

		let nRefNo;
		let nStationaryId;
		let stationaryType;
		let _id;

		//maintain Stationary
		if(Array.isArray(req.body)){
			nRefNo = req.body[0].refNo;
			nStationaryId = req.body[0].stationaryId;
			stationaryType = req.body[0].paymentType === "Customer Receipts" ? "Cash Receipt" : "Ref No" ;
			_id = req.body.filter(o => !(o.created)).map(o => o._id);
		}else{
			nRefNo = req.body.refNo;
			nStationaryId = req.body.stationaryId;
			stationaryType = req.body.paymentType === "Customer Receipts" ? "Cash Receipt" : "Ref No" ;
			_id: [req.body._id];
		}

		if(!nRefNo)
			throw new Error('Mandatory fields are required');

		let oQuery = {
			_id: {
				$in: _id
			}
		};

		let foundVoucher = await VouchersNew.findOne(oQuery);

		if(!(foundVoucher && foundVoucher._id))
			throw new Error(`Voucher Not Found`);

		let oRefNo = foundVoucher.refNo;
		let oStationaryId = foundVoucher.stationaryId;

		if(!nStationaryId){
			let foundId = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: stationaryType,
				clientId: req.user.clientId
			});

			if(foundId){
				nStationaryId = foundId._id.toString();

				if(Array.isArray(req.body)){
					req.body.forEach(o => {
						o.stationaryId = nStationaryId;
					});
				}else{
					req.body.stationaryId = nStationaryId;
				}
			}
		}

		if(nRefNo != oRefNo){

			oQuery = {
				_id: {
					$nin: _id
				},
				refNo: nRefNo,
				clientId: req.user.clientId,
				deleted: {
					$not:{
						$eq:true
					}
				}
			};

			foundVoucher = await VouchersNew.findOne(oQuery);

			if((foundVoucher && foundVoucher._id) || (nStationaryId && (await billStationaryService.isUsed(nStationaryId))))
				throw new Error(`Voucher With Ref. No. ${nRefNo} Already Exists.`);



			await billStationaryService.setUnset({
				modelName: 'plainVoucher',
				userName: req.user.full_name,
				docId: _id.join(',')
			},{
				refNo: nRefNo,
				stationaryId: nStationaryId
			},{
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

			if(!nStationaryId && oStationaryId){
				await VouchersNew.update({_id: {$in: otherUtil.arrString2ObjectId(_id)}}, {
					$unset: {
						stationaryId: 1,
						refNo: 1
					}
				});
			}
		}else{
			nStationaryId && await billStationaryService.setUsed(nStationaryId);
		}

		next();

	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString()
		});
	}

}, async function(req, res, next) {
		if(Array.isArray(req.body)) {
		const resp = [];
		for(let i=0; i<req.body.length; i++) {
			if(req.body[i].created) {
				const r = await plainVoucherService.addVoucherAsync({
					...req.body[i],
					clientId: req.user.clientId
					// uuid: ((req.body.find(v => v.uuid)||{}).uuid)||uuidv4()
				});
				req.body[i]._id = r[0].voucher._id;
			} else if (req.body[i].deleted) {
				let delV = await plainVoucherService.removeVoucher({
					_id: req.body[i]._id,
					clientId: req.user.clientId,
				});
			} else if(req.body[i].edited) {
				let oldV = await PlainVoucher.findById(req.body[i]._id).lean();
				let oSave = { ...req.body[i] };
				delete oSave._id;
				let editedV = await plainVoucherService.editVoucher({
					_id: req.body[i]._id,
					amount: req.body[i].amount,
					...oSave,
				});
			}
		}
		const bulkQuery = req.body.reduce((acc, curr, i) => ([
			...acc,
			{
				updateOne: {
					filter: { _id: curr._id },
					update: { $set: {
						sv: req.body.reduce((acc2, curr2, i2) => (i !== i2) ? [...acc2, curr2._id] : acc2, [])
					} },
					upsert: false
				}
			}
		]), []);
		const bulkResult = await PlainVoucher.bulkWrite(bulkQuery);
		return res.status(200).json({
			"status":"OK",
			"message":"Vouchers edited successfully"
		});
	} else {
		plainVoucherService.editVoucher({
			_id: req.body._id,
			clientId: req.user.clientId,
			amount: req.body.amount,
		})
			.then(function(data) {
				return res.status(200).json({ ...data });
			})
			.catch(next)
	}
});

router.post('/reverse', async function(req, res, next) {
	if(!req.body.ids){
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'please select voucher to delete'
		});
	}
	try {
		let oFil = {clientId:req.user.clientId,_id: {$in:otherUtil.arrString2ObjectId(req.body.ids)},voucher:{$exists:true}};
		let aggrPipe = [
			{ $match: oFil },
			{ $lookup: { from: 'plainvouchers', localField: 'sv', foreignField: '_id', as: 'sv' } },
			{$group: {
				_id: '$uuid',
				p_id:{$first:"$_id"},
				uuid: {$first:"$uuid"},
				sv: {$first:"$sv"},
				voucher: {$first:"$voucher"},
				refNo: {$first:"$refNo"},
			 }}
		];

		const plainVouchers = await VouchersNew.aggregate(aggrPipe);

		const updateFilter = plainVouchers.reduce((acc, curr, i) => {
			return [...acc, ...curr.sv.map(s => s._id), curr.p_id];
		}, []).filter(z => Boolean(z));


		const vouchers = plainVouchers.reduce((acc, curr, i) => {
			return [...acc, curr.voucher, ...curr.sv.map(s => s.voucher)];
		}, []).filter(z => Boolean(z));

		for (let i=0; i<vouchers.length; i++) {
			await AccountVoucherService.removeVoucherV2({_id:vouchers[i]});
		}
		const upd = await VouchersNew.updateMany({_id: {$in: otherUtil.arrString2ObjectId(updateFilter)}},
			{
				$set: {reversed: true},
				$unset: {voucher: true},
				$addToSet: {
					reverseHistory: {
						reversed_by: req.user.full_name,
						remark: req.body.remark,
						reversed_at: new Date()
					}
				}
			});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Vouchers reversed',
		});
	} catch(e) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
});

router.post('/delete', async function(req, res, next) {
	// Made synchronous to avoid voucher data corruption

	try{

		let aId = Array.isArray(req.body._id) && req.body._id.length && req.body._id || false;

		if(!aId)
			throw new Error('No vouchers are selected to delete.');

		for(let i=0; i<aId.length; i++) {

			let _id = aId[i];

			let foundVch = await PlainVoucher.findOne({_id, deleted: false}).lean();

			if(!(foundVch && foundVch._id)){
				return res.status(500).json({
					'status': 'OK',
					'message': 'Vouchers Not Found',
				});
			}

			if(foundVch.voucher)
				throw new Error('Voucher imported to A/c. Revert the Imported Voucher to Delete.');

			if(foundVch.stationaryId){
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					modelName: 'plainvouchers',
					docId: foundVch._id,
					stationaryId: foundVch.stationaryId,
				}, 'cancelled');
			}

			await plainVoucherService.removeVoucher({
				_id,
				clientId: req.user.clientId,
			});
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'Vouchers deleted',
		});

	}catch(e){
		return res.status(500).json({
			'status': 'OK',
			'message': e.toString(),
		});
	}
});

router.post('/get/billRefs', function(req, res, next) {
	if (!req.body.to || !req.body.billNo) {
		return res.status(500).json({
			status: "ERROR",
			message: "credit account or ref no not provided",
		});
	}
	plainVoucherService.aggrV2(req.body)
		.then(async function(data) {
			if (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'bill refs found',
					'data': data
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
});

router.post('/upload', upload.single('excel'), async (req, res, next) => {
	try {
		if (!(req.file && req.file.path)) {
			return next(new Error('Excel file not found'));
		}
		if (global.PLAIN_VOUCHERS_UPLOADING) {
			return next(new Error('Vouchers upload already in progress.'));
		}
		global.PLAIN_VOUCHERS_UPLOADING = true;
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				uploaded_at: new Date(),
				created_by: req.user._id,
			},
			config: {
				'DATE': {
					keyName: 'billDate',
					required: true,
					ignoreHours: true,
					dateFormat: 'DD/MM/YYYY',
				},
				'CREDIT': {
					keyName: 'from',
					required: true,
					ignoreIfValueIs: ['NA', '-'],
				},
				'DEBIT': {
					keyName: 'to',
					required: true,
					ignoreIfValueIs: ['NA', '-'],
				},
				'AMOUNT': {
					keyName: 'amount',
					required: true,
					ignoreIfValueIs: ['NA', '-', 0, '0'],
				},
				'REFERENCE': {
					keyName: 'refNo',
					required: true,
					ignoreIfValueIs: ['NA', '-'],
				},
				'NARRATION': {
					keyName: 'narration',
					required: true,
					ignoreIfValueIs: ['NA', '-'],
				},
				'TYPE': {
					keyName: 'type',
					required: true,
					ignoreIfValueIs: ['NA', '-'],
					enum: constant.voucherType
				},
				'PAYMENT TYPE': {
					keyName: 'paymentType',
					required: true,
					ignoreIfValueIs: ['NA', '-'],
					enum: ['Other']
				}
			},
		});
		let vouchersFromExcel = await excelData.read();
		const stats = [];
		for (let i=0; i<vouchersFromExcel.length; i++) {
			let v = vouchersFromExcel[i];
			let isVoucherFound;
			let shouldContinue = true, statsObj = { 'STATUS': 'FAIL', 'REFERENCE': v.refNo, 'REJECTION REASON': [] };
			if(!v || !v.refNo){
				shouldContinue = false;
				statsObj['REJECTION REASON'].push('ref no not exists');
			}else{
				isVoucherFound = await VouchersNew.findOne({ refNo: v.refNo.toString().trim() }).lean();

				if (isVoucherFound && isVoucherFound.voucher) {
					shouldContinue = false;
					statsObj['REJECTION REASON'].push('voucher already imported in accounts');
				}
			}
			if (!v.from) {
				shouldContinue = false;
				shouldContinue = false;
				statsObj['REJECTION REASON'].push('Invalid credit account');
			}
			if (v.from) {
				let foundAcnt = await AccountsNew.findOne({
					name: new RegExp(`^${v.from.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`, 'i'),
					clientId: req.user.clientId
				}).lean();
				if (!foundAcnt) {
					shouldContinue = false;
					statsObj['REJECTION REASON'].push('credit account not found in accounts master');
				} else {
					v.from = foundAcnt._id;
				}
			}
			if (!v.to) {
				shouldContinue = false;
				statsObj['REJECTION REASON'].push('Invalid debit account');
			}
			if (v.to) {
				let foundAcnt = await AccountsNew.findOne({
					name: new RegExp(`^${v.to.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`, 'i'),
					clientId: req.user.clientId
				}).lean();
				if (!foundAcnt) {
					shouldContinue = false;
					statsObj['REJECTION REASON'].push('debit account not found in accounts master');
				} else {
					v.to = foundAcnt._id;
				}
			}
			if (!v.amount) {
				shouldContinue = false;
				statsObj['REJECTION REASON'].push('Invalid amount');
			}
			if (shouldContinue) {
				if (isVoucherFound) {
					await VouchersNew.findByIdAndUpdate(isVoucherFound._id, {$set: v}, {new: true}).lean();
				} else {
					let pvId = await idUtil.generatePVIdAsync(req.body.clientId, v.type);
					let PlainVoucherId = await idUtil.generatePlainVoucherIdAsync(req.body.clientId);
					await VouchersNew.create({ ...v, pvId, PlainVoucherId });
				}
			}
			if (statsObj['REJECTION REASON'].length) {
				stats.push(statsObj);
			}
		}
		global.PLAIN_VOUCHERS_UPLOADING = false;
		return res.status(200).json({
			status: 'OK',
			message: 'Your request is being processed. Please wait until all vouchers are uploaded. Thank you!',
			stats
		});
	} catch (e) {
		console.error('plain voucher upload error =>', e.toString());
		global.PLAIN_VOUCHERS_UPLOADING = false;
		if(!res.headersSent){
			return res.status(500).json({
				status: 'ERROR',
				message: 'Something went wrong',
				error: e.toString()
			});
		}
	}
});

router.post('/portToVouchers', function(req, res, next) {
	if(!req.body.paymentType){
		return res.status(200).json({data:"please select payment type"});
	}
	if(!req.body.from_date || !req.body.to_date){
		return res.status(200).json({data:"please select dates"});
	}
	plainVoucherService.aggrPort(req.body)
		.then(async function(data) {
			let aVouchers = toNewVouchers(data);
			let cUp=0;
			for(let i=0;i<aVouchers.length;i++){
				try{
					let vData = await VoucherService.addVoucherAsync(aVouchers[i]);
					if(vData && vData[0] && vData[0].voucher){
						await PlainVoucher.updateMany({_id:{$in:otherUtil.arrString2ObjectId(aVouchers[i].a_id)}},{$set:{'dpV': new Date(),nvch:vData[0].voucher._id}});
						cUp = cUp + aVouchers[i].a_id.length;
					}
				}catch(e){
					winston.error("on add voucher "+ e.toString());
				}
			}
			console.log("data ported "+cUp);
			return res.status(200).json({data:cUp,message:"data ported "+cUp});
		})
		.catch(function(e){
			winston.error("on port data "+e.toString());
			return res.status(500).json({status:"ERROR",message:e.toString()});

		});
});

toNewVouchers = function(data) {
	let stats=[],aVouchers=[];
	for(let i=0;i<data.length;i++){
		try{
			let tAmt=0,multi='DR';
			if(data[i].svc && data[i].svc.length>1 && data[i].svl && data[i].svl.length>1){
				stats.push({refNo:data[i].refNo,reason:"Multiple credit and debit account not allowed"});
			}else if(data[i].svc && data[i].svc.length>1){
				multi = 'CR';
			}else {
				multi = 'DR';
			}

			if(data[i].paymentType == 'Gr Bill'){
				data[i].type = 'Sales';
			}

			let voucher = {
				a_id:data[i].a_id,
				type: data[i].type,
				uuid:data[i].uuid,
				refNoInt:data[i].refNoInt,
				refNoWord:data[i].refNoWord,
				clientId: data[i].clientId,
				vT: data[i].paymentType,
				refNo: data[i].refNo,
				stationaryId: data[i].stationaryId,
				isEditable: data[i].isEditable,
				narration: data[i].narration,
				date: data[i].billDate || data[i].date,
				branch: data[i].branch,
				bSer: data[i].bSer || "Transportation",
				createdBy: data[i].createdBy,
				paymentMode: data[i].paymentMode,
				paymentRef: data[i].paymentRef,
				paymentDate: data[i].paymentDate,
				created_at: data[i].created_at,
				ledgers: []
			};
			if(data[i].voucher){
				voucher.acImp = {
					st:true,
					at:data[i].export && data[i].export.toTally && data[i].export.toTally.at ||  new Date(),
					by:data[i].export && data[i].export.toTally && data[i].export.toTally.by
				}
			}
			let ledgerEntry,billAllocation;
			if(multi == 'CR'){
				//Debit account ledger list
				ledgerEntry = {cRdR:'DR'};
				ledgerEntry.account = data[i].vch[0].to._id;
				ledgerEntry.lName = (data[i].vch[0].to && data[i].vch[0].to.ledger_name) ? data[i].vch[0].to.ledger_name : (data[i].vch[0].to.name) ? data[i].vch[0].to.name : 'NA';
				if(!ledgerEntry.lName  || ledgerEntry.lName.length < 2  || ledgerEntry.lName=='NA' || ledgerEntry.lName == ""){
					stats.push({refNo:data[i].refNo,reason:" debit account ledger name not found."});
				}
				ledgerEntry.amount = data[i].total;
				/*if(tAmt != ledgerEntry.amount){
					//DR == CR
					stats.push({refNo:data[i].refNo,reason:" DR amount not matched with CR",DR:tAmt,CR:ledgerEntry.amount});
				}*/
				if (data[i].type == 'Receipt' || data[i].type == 'Journal' || data[i].crRef || data[i].type == 'Sales') {
					billAllocation = {};
					billAllocation.billNo = data[i].crBillNo || data[i].billNo || data[i].refNo || ledgerEntry.lName;
					billAllocation.billType = data[i].crRef || data[i].billType;
					billAllocation.amount = ledgerEntry.amount;
					if(!ledgerEntry["bills"] || !ledgerEntry["bills"].length){
						ledgerEntry["bills"] = [];
					}
					ledgerEntry["bills"].push(billAllocation);
				}
				voucher["ledgers"].push(ledgerEntry);
				for(let lc=0;lc<data[i].svc.length;lc++){
					//credit  account ledger list
					ledgerEntry = {cRdR:'CR'};
					ledgerEntry.amount = 0;
					for(let v=0;v<data[i].vch.length;v++) {
						if (data[i].vch[v].from._id.toString() == data[i].svc[lc].toString()) {
							ledgerEntry.lName = (data[i].vch[v].from && data[i].vch[v].from.ledger_name) ? data[i].vch[v].from.ledger_name : (data[i].vch[v].from.name) ? data[i].vch[v].from.name : 'NA';
							ledgerEntry.account = data[i].vch[v].from._id;
							if(!data[i].vch[v].amount || isNaN(data[i].vch[v].amount)){
								stats.push({refNo: data[i].refNo, reason: " amount is not found"});
							}
							ledgerEntry.amount = ledgerEntry.amount + (data[i].vch[v].amount || 0);
							billAllocation = {};
							billAllocation.billNo = data[i].vch[v].billNo || data[i].vch[v].refNo || ledgerEntry.lName;
							billAllocation.billType = data[i].vch[v].billType;
							billAllocation.amount = data[i].vch[v].amount;
							tAmt = tAmt + billAllocation.amount;
							if ((data[i].type == 'Payment' || data[i].type == 'Journal' || data[i].type == 'Sales') && ledgerEntry.lName != 'Freight Receipts A/C') {
								if(!ledgerEntry["bills"] || !ledgerEntry["bills"].length){
									ledgerEntry["bills"] = [];
								}
								ledgerEntry["bills"].push(billAllocation);
							}
						}
					}
					if (!ledgerEntry.lName || ledgerEntry.lName.length < 2 || ledgerEntry.lName == 'NA' || ledgerEntry.lName == "") {
						stats.push({refNo: data[i].refNo, reason: " credit account ledger name not found."});
					}
					voucher["ledgers"].push(ledgerEntry);
				}
			} else{
				//Debit account ledger list
				for(let lc=0;lc<data[i].svd.length;lc++){
					//debit  account ledger list
					ledgerEntry = {cRdR:'DR'};
					ledgerEntry.amount = 0;
					for(let v=0;v<data[i].vch.length;v++){
						if(data[i].vch[v].to._id.toString() == data[i].svd[lc].toString()){
							if(!data[i].vch[v].amount || isNaN(data[i].vch[v].amount)){
								stats.push({refNo: data[i].refNo, reason: " amount is not found"});
							}
							ledgerEntry.account = data[i].vch[v].to._id;
							ledgerEntry.lName = (data[i].vch[v].to && data[i].vch[v].to.ledger_name) ? data[i].vch[v].to.ledger_name : (data[i].vch[v].to.name) ? data[i].vch[v].to.name : 'NA';
							ledgerEntry.amount =  ledgerEntry.amount +  data[i].vch[v].amount;
							billAllocation = {};
							billAllocation.billNo = data[i].vch[v].billNo || data[i].vch[v].refNo || ledgerEntry.lName;
							billAllocation.billType = data[i].vch[v].billType;
							billAllocation.amount =  data[i].vch[v].amount;
							tAmt = tAmt+billAllocation.amount;
							if (data[i].type == 'Payment' || data[i].type == 'Journal' || data[i].type == 'Sales') {
								if(!ledgerEntry["bills"] || !ledgerEntry["bills"].length){
									ledgerEntry["bills"] = [];
								}
								ledgerEntry["bills"].push(billAllocation);
							}
						}
					}
					if(ledgerEntry.lName.length <2 || ledgerEntry.lName=='NA' || ledgerEntry.lName == "" || !ledgerEntry.lName){
						stats.push({refNo:data[i].refNo,reason:" debit account ledger name not found."});
					}
					ledgerEntry.amount = ledgerEntry.amount;
					voucher["ledgers"].push(ledgerEntry);
				}
				//credit account ledger list
				ledgerEntry = {cRdR:'CR'};
				ledgerEntry.account = data[i].vch[0].from._id;
				ledgerEntry.lName = (data[i].vch[0].from && data[i].vch[0].from.ledger_name) ? data[i].vch[0].from.ledger_name : (data[i].vch[0].from.name) ? data[i].vch[0].from.name : 'NA';
				if(!ledgerEntry.lName || ledgerEntry.lName.length <2  || ledgerEntry.lName=='NA' || ledgerEntry.lName == ""){
					stats.push({refNo:data[i].refNo,reason:" debit account ledger name not found."});
				}
				ledgerEntry.amount = data[i].total;
				if(tAmt != ledgerEntry.amount){
					//DR == CR
					stats.push({refNo:data[i].refNo,reason:" DR amount not matched with CR",DR:tAmt,CR:ledgerEntry.amount});
				}
				if ((data[i].type == 'Receipt' || data[i].type == 'Journal' || data[i].crRef || data[i].type == 'Sales') && ledgerEntry.lName != 'Freight Receipts A/C') {
					billAllocation = {};
					billAllocation.billNo = data[i].crBillNo || data[i].billNo || data[i].refNo || ledgerEntry.lName;
					billAllocation.billType = data[i].crRef || data[i].billType;
					billAllocation.amount = ledgerEntry.amount;
					billAllocation.remAmt = ledgerEntry.amount;
					if(!ledgerEntry["bills"] || !ledgerEntry["bills"].length){
						ledgerEntry["bills"] = [];
					}
					ledgerEntry["bills"].push(billAllocation);
				}
				voucher["ledgers"].push(ledgerEntry);
			}
			aVouchers.push(voucher);
		}catch(e){
			console.error(e.toString());
		}
	}
	if(stats.length){
		winston.error("stats ",stats);
	}
	return aVouchers;
};

module.exports = router;
