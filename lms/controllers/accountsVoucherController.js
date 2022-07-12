let moment = require('moment');
let router = express.Router()
let voucherService = promise.promisifyAll(commonUtil.getService('accountsVoucher'));
let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let AcBal = commonUtil.getModel('accountbalances');
let AccountVoucher = commonUtil.getModel('accountsVoucher');
let Bills =  promise.promisifyAll(commonUtil.getModel('bills'));
let PlainVoucher = commonUtil.getModel('plainVoucher');
const serverSidePage = require('../../utils/serverSidePagination');
router.post('/get', function(req, res, next) {
	if(req.body.download) req.body.no_of_docs = 30000;
    voucherService.findVoucherByQueryAsync(req.body)
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

router.post('/add', async function(req, res, next) {
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
	}
	if (!req.body.amount || req.body.amount<=0) {
		return res.status(500).json({ 'status': 'ERROR', 'message': 'Amount not provided' })
	}

	voucherService.addVoucherAsync(req.body)
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
router.post('/remove',async function(req, res, next) {
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'message': 'No update body found'})
	}
	if (!req.body._id) {
		return res.status(500).json({'status': 'ERROR', 'message': 'voucher id not provided'})
	}
	voucherService.removeVoucherV2({
		_id: req.body._id,
		clientId: req.user.clientId
	})
		.then(function(resp){
			res.status(500).json(resp);
		}).catch(next);
});

router.post('/create-vouchers-common', async (req, res, next) => {
	let aPlainVouchers,aggQuery;
	if (req.body.ids && (req.body.ids instanceof Array)) {
		aggQuery = [
			{$match:{clientId: req.user.clientId, _id:{$in: otherUtil.arrString2ObjectId(req.body.ids)}}},
		];
		let oQuery = {aggQuery:aggQuery,no_of_docs:10000};
		aPlainVouchers = await serverSidePage.requestData(PlainVoucher,oQuery);
	}
	else if(req.body.reqQuery){
		if(!req.body.reqQuery.from_date || !req.body.reqQuery.to_date){
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date or  to date not provided !'
			})
		}
		if(moment(req.body.reqQuery.to_date).diff(req.body.reqQuery.from_date, 'days', true) > 31){
			return res.status(500).json({
				status: 'ERROR',
				message: 'more than 31 days voucher creation not allowed !'
			})
		}
		let oFilter = constructFilters(req.body.reqQuery);
		oFilter.clientId = req.user.clientId;
		aggQuery = [
			{$match:oFilter},
			{ $lookup: { from: 'accountvouchers', localField: 'voucher', foreignField: '_id', as: 'voucher' } },
			{ $unwind: { path: '$voucher', preserveNullAndEmptyArrays: true } },
		];
		let oQuery = {aggQuery:aggQuery,no_of_docs:10000};
		aPlainVouchers = await serverSidePage.requestData(PlainVoucher,oQuery);
	}
	else{
		return res.status(500).json({
			status: 'ERROR',
			message: 'filters not provided properly !'
		})
	}

	try {
		let modified=0,created=0,failed=0,failedRefs="",deleted=0,deletedRefs="";
		if (!aPlainVouchers || !aPlainVouchers.length) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Vouchers not found to import`
			});
		}else{
			res.status(200).json({
				status: 'OK',
				message: 'We  are importing '+ aPlainVouchers.length +' vouchers please wait for some time. Thanks'
			});
			telegram.sendMessage(aPlainVouchers.length + " Voucher import Request "+ config.serverName, req.user.full_name);
		}
		for (let doc of aPlainVouchers) {
			if(!doc.voucher || doc.voucher.deleted) {
				let prepareVoucherData = {
					clientId: req.user.clientId,
					created_by: req.user._id,
					from: doc.from_account || doc.from,
					to: doc.to_account || doc.to,
					type: doc.type,
					amount: doc.amount,
					billNo: doc.billNo || doc.bill_no,
					billType:doc.billType,
					crBillNo: doc.crBillNo,
					crRef:doc.crRef,
					refNo: doc.refNo || doc.reference_no,
					narration: doc.narration || doc.remark,
					date: doc.billDate || doc.date || doc.created_at || new Date(),
					branch: doc.branch,
					deleted:false
				};
				let newVoucher = await voucherService.addVoucherAsync(prepareVoucherData);
				if(newVoucher && newVoucher[0] && newVoucher[0].voucher && newVoucher[0].voucher._id){
					let updateOp = await PlainVoucher.updateOne({_id: doc._id},
						{$set: {
							voucher: newVoucher[0] && newVoucher[0].voucher && newVoucher[0].voucher._id,
							reversed: false
						}}
					);
					created++;
				}else{
					failedRefs = failedRefs + (doc.refNo || doc.reference_no) + ",";
					failed ++;
				}


			}else{
				deletedRefs = deletedRefs + (doc.refNo || doc.reference_no) + ",";
				deleted++;
			}
		}
		let msg="";
		if(created){
			msg = created + ' Vouchers imported';
		}
		if(modified){
			msg = msg + " " +modified + ' Vouchers modifed';
		}
		if(failed){
			msg = msg + " " +failed + ' Vouchers failed with Refs' + failedRefs;
		}
		if(deleted){
			msg = msg + " " +deleted + ' Vouchers repaired from deleted with Refs' + deletedRefs;
		}
		console.log(msg,new Date().toLocaleString());
		telegram.sendMessage(msg + " Voucher imported "+ config.serverName , req.user.full_name);
	} catch(e) {
		winston.error("error in create-vouchers-common "+  e.toString());
		telegram.sendMessage(config.serverName +" "+  "error in create-vouchers-common "+  e.toString() , new Date().toLocaleString());
		if(!res.headersSent) {
			return res.status(500).json({
				status: 'ERROR',
				message: e.toString(),
			});
		}
	}
});

router.post("/taxes", function(req, res, next) {
	let taxes = req.clientData.accountDetails;
	let aData ={};
	let paid =[];
	let payable=[];
	let from_date = new Date(req.body.from_date);
	from_date.setSeconds (0);
	from_date.setHours (0);
	from_date.setMinutes (0);

	let to_date = new Date(req.body.to_date)
	to_date.setSeconds (59);
	to_date.setHours (23);
	to_date.setMinutes (59);


	for(i in taxes)
	{
		if(i.includes("Paid"))
		{
			paid.push(mongoose.Types.ObjectId(taxes[i]))
		}
		else {
			payable.push(mongoose.Types.ObjectId(taxes[i]))
		}
	}
	req.body.aggQuery = [
		{
			$facet: {
				"to": [{
					$match: {
						"clientId": req.user.clientId,
						"to": {$in: paid},
						"created_at":{
							"$gte": from_date,
							"$lte": to_date
						}
					},
				},
					{
						$group: {
							_id: '$to',
							sum: {$sum: '$amount'}
						}
					}

					],
				"from": [{
					$match: {
						"clientId": req.user.clientId,
						"from": {$in: payable},
						"created_at":{
							"$gte": from_date,
							"$lte": to_date
						}
					},
				},
					{
						$group: {_id: '$from', sum: {$sum: '$amount'}}
					}]

			}


		},
		{$project: {activity: {$setUnion: ['$to', '$from']}}},
		{$unwind: '$activity'},
		{$replaceRoot: {newRoot: "$activity"}}
	];
	otherUtil.pagination(PlainVoucher,req.body, async function (err,dbData) {
		if(err) return res.status(500).json({
			"status": "ERROR",
			"message": err.toString()
		});
		if (dbData && dbData.data && dbData.data[0]) {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Report download available.",
					"url": data.url
				});
			}
			 data =dbData.data;
			 for(i in taxes) {
				for (j in data) {
					if (taxes[i] === data[j]._id) {
						data[j].type = i;
					}
				}
			}

			for(i in data)
			{
				aData[data[i].type]=data[i].sum;

			}



			if (req.body.download && (req.body.download !== "false")) {




				ReportExelService.taxReport (aData, req.user.clientId, ReportResponse);

			} else {
				return res.status (200).json({
					"status": "OK",
					"message": "Tax data",
					"data": aData
				});
			}
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "No Taxes found.",
				"data":[]
			});
		}
	});

});

router.post('/tds', function(req, res, next) {
	let taxes = req.clientData.accountDetails;

	let paid =[];
	let payable=[];
	let aData ={};
	let from_date = new Date(req.body.from_date);
	from_date.setSeconds (0);
	from_date.setHours (0);
	from_date.setMinutes (0);

	let to_date = new Date(req.body.to_date)
	to_date.setSeconds (59);
	to_date.setHours (23);
	to_date.setMinutes (59);

	for(i in taxes)
	{
		if(i.includes("Paid"))
		{
			paid.push(mongoose.Types.ObjectId(taxes[i]))
		}
		else {
			payable.push(mongoose.Types.ObjectId(taxes[i]))
		}
	}
	req.body.aggQuery = [
		{
			$facet: {
				"to": [{
					$match: {
						"clientId": req.user.clientId,
						"to": {$in: paid},
						"created_at":{
							"$gte": from_date,
							"$lte": to_date
						}
					},
				},
					{
						$group: {
							_id: '$to',
							sum: {$sum: '$amount'}
						}
					}

				],
				"from": [{
					$match: {
						"clientId": req.user.clientId,
						"from": {$in: payable},
						"created_at":{
							"$gte": from_date,
							"$lte": to_date
						}
					},
				},
					{
						$group: {_id: '$from', sum: {$sum: '$amount'}}
					}]

			}


		},
		{$project: {activity: {$setUnion: ['$to', '$from']}}},
		{$unwind: '$activity'},
		{$replaceRoot: {newRoot: "$activity"}}
	];
	otherUtil.pagination(Vouchers,req.body, async function (err,dbData) {
		if(err) return res.status(500).json({
			"status": "ERROR",
			"message": err.toString()
		});
		if (dbData && dbData.data && dbData.data[0]) {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Report download available.",
					"url": data.url
				});
			}
			data =dbData.data;
			for(i in taxes) {
				for (j in data) {
					if (taxes[i] === data[j]._id) {
						data[j].type = i;
					}
				}
			}

			for(i in data)
			{
				aData[data[i].type]=data[i].sum;

			}

			if (req.body.download && (req.body.download !== "false")) {



				ReportExelService.tdsReport (aData, req.user.clientId, ReportResponse);

				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Tax data",
						"data": aData
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Taxes found.",
					"data":[]
				});
			}
		});

});

router.post('/notes' , function(req,res,next) {

	let from_date = new Date(req.body.from_date);
	from_date.setSeconds (0);
	from_date.setHours (0);
	from_date.setMinutes (0);

	let to_date = new Date(req.body.to_date)
	to_date.setSeconds (59);
	to_date.setHours (23);
	to_date.setMinutes (59);

	req.body.aggQuery = [{
		$match: {
			$or: [
				{'cGST': {$gt: 0}},
				{'sGST': {$gt: 0}},
				{'iGST': {$gt: 0}}
			],
			"clientId": req.user.clientId,
			"dcNotes.date": {
				"$gte": from_date,
				"$lte": to_date
			}
		}
	},{
		$lookup: {
			from: 'customers',
			localField: 'billingParty',
			foreignField: '_id',
			as: 'billingParty'
		}
	}, {
		$unwind: "$dcNotes"
	},{
		$match: {
			"dcNotes.date": {
				"$gte": from_date,
				"$lte": to_date
			}
		}
	}];


	otherUtil.pagination(Bills,req.body, async function (err,dbData) {
		if(err) return res.status(500).json({
			"status": "ERROR",
			"message": err.toString()
		});
		if (dbData && dbData.data && dbData.data[0]) {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Report download available.",
					"url": data.url
				});
			}

			if (req.body.download && (req.body.download !== "false")) {


				ReportExelService.generateCreditDebitExcel (dbData, req.user.clientId, ReportResponse);

			} else {
				return res.status (200).json({
					"status": "OK",
					"message": "Bills data",
					"data": dbData
				});
			}
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "No Bills found.",
				"data":[]
			});
		}
	});



});

router.post('/gstr1' , function(req,res,next) {

	let from_date = new Date(req.body.from_date);
	from_date.setSeconds (0);
	from_date.setHours (0);
	from_date.setMinutes (0);

	let to_date = new Date(req.body.to_date)
	to_date.setSeconds (59);
	to_date.setHours (23);
	to_date.setMinutes (59);

	Bills.findAsync({$or:[
			{'cGST': {$gt:0}},
			{'sGST': {$gt:0}},
			{'iGST': {$gt:0}}],
			"clientId" :req.user.clientId,
		    "billDate":{
				"$gte": from_date,
				"$lte": to_date
					},
		"cancelled":false,
		"status" : "Acknowledged"
		    })
		.then(function(dbData)
		{
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Report download available.",
						"url": data.url
					});
				}




				if (req.body.download && (req.body.download !== "false")) {



					ReportExelService.generateGSTR1Excel(dbData,req.user.clientId,ReportResponse);

				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Bills data",
						"data": dbData
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No bills found.",
					"data":[]
				});
			}
		}).catch(next)




});

router.post('/ledger', function(req, res, next) {
	if(!req.body.ledger){
		return res.status(501).json({
			'status': 'OK',
			'message': 'account name not provided'
		});
	}
	req.body.sort = {date:1,refNoInt:-1};//inc sort as for time
	req.body.no_of_docs = 30000;
	req.body.project = {date:1,deleted:1,'from.name':1,'from._id':1,refNo:1,'to.name':1,'to._id':1,amount:1,billNo:1,billType:1,clientId:1,created_at:1,branch:1,narration:1,type:1};
	voucherService.findVoucherByQueryAggrAsync(req.body)
		.then(async function(aVch) {
			let data;
			if(aVch){
				data =  {data:aVch};
			}
			let respData, summary;
			if(data.data && data.data[0]){
				let fFil = {
					clientId: data.data[0].clientId,
					account: data.data[0].from._id,
					date: { $lte: moment(data.data[0].date).startOf('day').toDate() },
				};
				let fromAcBal = await AcBal.find(fFil).sort({date: -1}).limit(1).lean();

				data.data[0].fromClosing = (fromAcBal && fromAcBal[0] && fromAcBal[0].ob) || 0;
                let tFil = {
					clientId: data.data[0].clientId,
					account: data.data[0].to._id,
					date: { $lte: moment(data.data[0].date).startOf('day').toDate() },
				};
				let toAcBal = await AcBal.find(tFil).sort({date: -1}).limit(1).lean();

				data.data[0].toClosing = (toAcBal && toAcBal[0] && toAcBal[0].ob) || 0;

				respData = prepareLedgerData(data.data,req.body.ledger);

				data.data = respData.data;
				summary = {ob:respData.ob,cb:respData.cb,cr:respData.cr,dr:respData.dr};
				data.summary = summary;
				summary.ob = Number(numberUtils.isFloat(summary.ob) ? summary.ob.toFixed(2) : summary.ob);
				summary.cb = Number(numberUtils.isFloat(summary.cb) ? summary.cb.toFixed(2) : summary.cb);
				summary.dr = Number(numberUtils.isFloat(summary.dr) ? summary.dr.toFixed(2) : summary.dr);
				summary.cr = Number(numberUtils.isFloat(summary.cr) ? summary.cr.toFixed(2) : summary.cr);
			}
			else{
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found.',
					'data': data
				});
			}

			if(req.body.download && req.body.download.toString() === 'true') {
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
		})
		.catch(next);
});

router.post('/resetOpeningClosing_', async function(req, res, next) {
	let oAcFilter = {clientId:req.user.clientId};
	if(req.body.account){
		oAcFilter._id = mongoose.Types.ObjectId(req.body.account)
	}
	let Accs = await Accounts.find(oAcFilter,{balance:1});
	if(Accs){
		for(let a=0;a<Accs.length;a++){
			let oVchFilter = {clientId:req.user.clientId};
			oVchFilter.$or = [{from:Accs[a]._id},{to:Accs[a]._id}];
			let aVchs = await AccountVoucher.find(oVchFilter,{fromClosing:1,toClosing:1,from:1,to:1,amount:1});
			let acClosingBal = 0;
			let aBulkWrite = [];
			for(let i=0;i<aVchs.length;i++){
				let oUpdate={};
				if(aVchs[i].from && (aVchs[i].from._id.toString() == Accs[a]._id.toString())){
					oUpdate = {
						updateOne : {
							filter: {_id: aVchs[i]._id},
							update: {$set: {fromClosing:acClosingBal}},
							upsert: false
						}
					};
					aBulkWrite.push(oUpdate);
					acClosingBal = acClosingBal - aVchs[i].amount;
				}else if(aVchs[i].to && (aVchs[i].to._id.toString() == Accs[a]._id.toString())){
					oUpdate = {
						updateOne : {
							filter: {_id: aVchs[i]._id},
							update: {$set: {toClosing:acClosingBal}},
							upsert: false
						}
					};
					aBulkWrite.push(oUpdate);
					acClosingBal = acClosingBal + aVchs[i].amount;
				}
			}
			if(aBulkWrite.length>0){
				let bulkResp = await AccountVoucher.bulkWrite(aBulkWrite);
				console.log(bulkResp.matchedCount,bulkResp.modifiedCount);
				let acupdate = await Accounts.updateOne({_id:Accs[a]._id},{$set:{balance:acClosingBal}});
				console.log(acupdate);
			}
		}
	}
	res.status(200).json({message:'work in progress'});
});

router.post('/ledgerReport', async (req, res, next) => {
	if(
		!req.body.accounts
		|| !Array.isArray(req.body.accounts)
		|| req.body.accounts.length === 0
	) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'accounts array not provided or is empty'
		});
	}
	const aData = await AccountVoucher.aggregate([
		{$match:{
				$or: [
					{from:{$in:otherUtil.arrString2ObjectId(req.body.accounts)}},
					{to:{$in:otherUtil.arrString2ObjectId(req.body.accounts)}},
				],
				created_at:{
					$gte:new Date(moment(req.body.from,["DD/MM/YYYY","YYYY-MM-DD"])),
					$lte:new Date(moment(req.body.to,["DD/MM/YYYY","YYYY-MM-DD"]))
					// $gte:req.body.from ? new Date(moment(req.body.from).startOf('day')): (moment('2000-01-01').startOf('day').toDate()),
					// $lte:req.body.to ? new Date(moment(req.body.to).endOf('day')) : (moment().endOf('day').toDate()),
				},
			}},
		{$addFields:{
				d: {$dayOfMonth:'$created_at'},
				m: {$month:'$created_at'},
				y: {$year:'$created_at'}
			}},
		{$sort:{_id:1}},
		{$group:{
				_id:{account:otherUtil.arrString2ObjectId(req.body.accounts[0]),day:'$d',month:'$m',year:'$y'},
				created_at: {$first:'$created_at'},
				firstVoucher:{$first:'$$ROOT'},
				lastVoucher:{$last:'$$ROOT'}
			}},
		{$lookup:{from:'accounts',localField:'_id.account',foreignField:'_id',as:'_id.account'}},
		{$unwind:{path:'$_id.account',preserveNullAndEmptyArrays:true}},
	]);
	ReportExelService.ledgerReport(aData, req.user.clientId, function (url) {
		return res.status(200).json({ url });
	});
});

router.post('/___resetDailyBal', async function(req, res, next) {
	//hard coding april 2019
	let oAcFilter = {clientId:req.body.clId || req.user.clientId};
	if(req.body.account){
		oAcFilter._id = mongoose.Types.ObjectId(req.body.account)
	}else{
		return res.status(200).json({message:'account id not provided '});
	}
	if(req.body.group){
		oAcFilter.group = {$in:req.body.group};
	}
	let Accs = await Accounts.find(oAcFilter,{balance:1,opening_balance:1,name:1}).lean();
	if(Accs){
		for(let a=0;a<Accs.length;a++){
			console.log(a+"/"+Accs.length+" started");
			let onlyDate = dateUtil.getMorning(req.body.start_date || '2019-04-01');//TODO make it dynamic
			//get first Account balance on or after 01 April 2019
			let obApr;
			let acBal =await AcBal.findOne({account:Accs[a]._id,date:{ $gte: onlyDate },clientId:req.user.clientId}).sort({date:1}).lean();
			if(acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0){
				obApr = acBal; //consider it
			}
			let aggrQ = [
				{
					$match: {
						$or: [{from: mongoose.Types.ObjectId(Accs[a]._id)}, {to: mongoose.Types.ObjectId(Accs[a]._id)}],
						date: {$gte: onlyDate},
						deleted: {$not: {$eq: true}}
					}
				},
				{
					$group: {
						_id: {day: {$dayOfMonth: {date:"$date",timezone:'+05:30'}}, month: {$month: "$date"}, year: {$year: "$date"}},
						cr: {"$sum": {"$cond": [{"$eq": ['$from', Accs[a]._id]}, "$amount", 0]}},
						dr: {"$sum": {"$cond": [{"$eq": ['$to', Accs[a]._id]}, "$amount", 0]}},
						date: {$last: '$date'}
					}
				},
				{$sort: {date: 1}}
			];
			let aV = await AccountVoucher.aggregate(aggrQ).allowDiskUse(true);
            let ob,cb=0,lastCb=0;
			let acBalUpd = aV.map(adv => {
				if(!adv) return null;
				delete adv._id;
				if(ob != undefined){
					ob = lastCb;
					cb = ob + adv.dr - adv.cr;
					lastCb = cb;
				}else{
					ob = obApr && obApr.ob || 0;
					lastCb =  ob + adv.dr - adv.cr;
					cb=lastCb;
				}
				console.log(dateUtil.getMorning(adv.date),ob,cb,adv.cr,adv.dr);
				return {
					updateOne: {
						filter: {
							clientId: req.body.clId || req.user.clientId,
							date:dateUtil.getMorning(adv.date),
							account:Accs[a]._id,
							deleted:false,
						},
						update: {
							$setOnInsert: {
								create_at:new Date(),
								deleted:false,
								account:Accs[a]._id,
								date:dateUtil.getMorning(adv.date),
								clientId: req.body.clId || req.user.clientId
							},
							$set: {
								ob:ob,
								cb:cb,
								cr:adv.cr || 0,
								dr:adv.dr|| 0
							},
						},
						upsert: true
					}
				}
			}).filter(x => x !== null);

			if(acBalUpd.length > 0) {
				const AcBalStats = await AcBal.bulkWrite(acBalUpd);
				console.log('complete for ',a);
			}
		}
	}
	return res.status(200).json({message:'work in progress'});
});

router.post('/deleteDupsVoucher', async function(req, res, next) {
	//hard coding april 2019
	let oAcFilter = {clientId:req.user.clientId,deleted:false};
	/*if(req.body.account){
		oAcFilter._id = mongoose.Types.ObjectId(req.body.account)
	}*/
	if(req.body.refNos && req.body.refNos instanceof Array){
		for(let i=0;i<req.body.refNos.length;i++){
			oAcFilter.refNo = req.body.refNos[i];
			let Accs = await AccountVoucher.find(oAcFilter,{refNo:1,_id:1}).sort({_id:1}).lean();
			if(Accs && Accs.length>1){
				console.log('removing ',i,Accs[0].refNo);
				let rV = await voucherService.removeVoucherV2(Accs[0]);
			}else{
				console.log('single only ',(Accs && Accs[0].refNo))
			}

		}
	}
	return res.status(200).json({message:'work in progress'});
});
prepareLedgerData = function (data,ACname) {
	data = JSON.parse(JSON.stringify(data));
	let tCr=0,tDr=0,cb = 0,ob=0;
	for(let i=0;i<data.length;i++){
		if(data[i].from && (data[i].from._id == ACname)){
			if (i===0) {
				data[i].balance = data[i].fromClosing - data[i].amount;
				data[i].cr = data[i].amount;
				tCr = tCr + data[i].amount;
				ob = data[i].fromClosing;
			} else {
				data[i].balance = data[i-1].balance - data[i].amount;
				data[i].cr = data[i].amount;
				tCr = tCr + data[i].amount;
			}
		} else if(data[i].to && (data[i].to._id == ACname)){
			if (i===0) {
				data[i].balance = data[i].toClosing + data[i].amount;
				data[i].dr = data[i].amount;
				tDr = tDr + data[i].amount;
				ob = data[i].toClosing;
			} else {
				data[i].balance = data[i-1].balance + data[i].amount;
				data[i].dr = data[i].amount;
				tDr = tDr + data[i].amount;
			}
		}
		cb = ob + tDr - tCr ;
		data[i].balance = Number(numberUtils.isFloat(data[i].balance) ? data[i].balance.toFixed(2) : data[i].balance);
	}
    return {data:data,cr:tCr,dr:tDr,cb:cb,ob:ob};
};

const ALLOWED_FILTER_PLAIN_VCH =['_id','type','branch', 'voucher', 'paymentType', 'from_date','to_date','from','to','PlanVoucherId','clientId','ledger','refNo','$and','$or'];

function constructFilters(oQuery) {
	oQuery.dateKey=oQuery.dateKey||oQuery.dateType||'date';
	let oFilter={deleted:{$not:{$eq:true}}};
	if(oQuery.deleted) {
		oFilter={deleted:true};
	}
	for(i in oQuery){
		if(otherUtil.isAllowedFilter(i,ALLOWED_FILTER_PLAIN_VCH)){
			if (i === 'from_date') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$gte = startDate;
			} else if (i === 'to_date') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$lte = endDate;
			} else if(i==='from'|| i==='to'){
				if(oQuery[i] instanceof Array){
					oFilter[i] = {$in: otherUtil.arrString2ObjectId(oQuery[i])}
				}
				else if(typeof oQuery[i] === "string"){
					oFilter[i] = mongoose.Types.ObjectId(oQuery[i]);
				}
			} else if(i==='ledger') {
				oFilter.$or = [
					{from:mongoose.Types.ObjectId(oQuery[i])},
					{to:mongoose.Types.ObjectId(oQuery[i])}
				];
			} else if(i==='_id') {
				oFilter[i] = {$in:otherUtil.arrString2ObjectId(oQuery[i])};
			} else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}
module.exports = router;
