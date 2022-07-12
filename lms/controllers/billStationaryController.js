const router = express.Router();
const BillBook = commonUtil.getModel('billBook');
const BillStationary = commonUtil.getModel('billStationary');
const BillStationaryUsed = commonUtil.getModel('billStationaryUsed');
const billBookService = promise.promisifyAll(commonUtil.getService('billBook'));
const billStationaryService = promise.promisifyAll(commonUtil.getService('billStationary'));
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

function constructFilter(obj) {
	const oFilter = {
		disable: {$not: {$eq: true}}
	};
	for (key in obj) {
		if (obj.hasOwnProperty(key) && ['billBookId', 'bookNo', 'status', 'type', 'useDate', 'centralize', 'ne.bookNo', '_id'].indexOf(key) >= 0) {
			if(key === 'useDate') {
				oFilter['startDate'] = {
					$lte: new Date(obj[key])
				};
				oFilter['endDate'] = {
					$gte: new Date(obj[key])
				}
			} else if (key === '_id') {
				oFilter[key] = {
					$nin:  otherUtil.arrString2ObjectId(Array.isArray(obj[key]) ? obj[key] : [obj[key]])
				}
			}else if (key === 'billBookId') {
				oFilter[key] = {
					$in: otherUtil.arrString2ObjectId(Array.isArray(obj[key]) ? obj[key] : [obj[key]])
				}
			} else if (key === 'bookNo') {
				oFilter[key] = oFilter[key] || {};
				Object.assign(oFilter[key], {$regex: obj[key], $options: 'i'});
			} else if (key === 'type' || key === 'status') {
				oFilter[key] = Array.isArray(obj[key]) ? {$in: obj[key]} : obj[key];
			} else if (key === 'ne.bookNo') {
				oFilter['bookNo'] = oFilter['bookNo'] || {};
				Object.assign(oFilter['bookNo'], {$nin: Array.isArray(obj[key]) ? obj[key] : [obj[key]]});
			} else {
				oFilter[key] = obj[key];
			}
		}
	}
	return oFilter;
}
const ALLOWED_FILTERV2 = ['branch', 'clientId', 'range'];

function constructFilterV2(obj) {
	const oFilter = {
		deleted:{$ne:true}
	};
	for (key in obj) {
		if (obj.hasOwnProperty(key) && ['bookNo', 'billBranchBookId', 'billBookId',  'status', 'type', 'useDate', 'centralize', 'ne.bookNo', 'disable'].indexOf(key) >= 0) {
			if(key === 'useDate') {
				oFilter['startDate'] = {
					$lte: new Date(obj[key])
				};
				oFilter['endDate'] = {
					$gte: new Date(obj[key])
				}
			} else if (key === 'billBranchBookId') {
				 if(obj[key].length>0) {
					oFilter['billBookId'] = {
						$in: Array.isArray(obj[key]) ? obj[key] : [obj[key]]
					}
				}
			}  else if (key === 'billBookId') {
				oFilter[key] = otherUtil.arrString2ObjectId(obj[key]);
			} else if (key === 'bookNo') {
				oFilter[key] = oFilter[key] || {};
				Object.assign(oFilter[key], {$regex: obj[key], $options: 'i'});
			} else if (key === 'type') {
				oFilter[key] = {$in: Array.isArray(obj[key]) ? obj[key] : [obj[key]]};
			} else if (key === 'status') {
				oFilter[key] = {$in: Array.isArray(obj[key]) ? obj[key] : [obj[key]]};
			} else if (key === 'ne.bookNo') {
				oFilter['bookNo'] = oFilter['bookNo'] || {};
				Object.assign(oFilter['bookNo'], {$nin: Array.isArray(obj[key]) ? obj[key] : [obj[key]]});
			} else {
				oFilter[key] = obj[key];
			}
		}
	}
	return oFilter;
}

function constructFiltersV2(oQuery) {
	let oFilter = {
		deleted: {
			$ne: true
		}
	};
	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTERV2)) {
			if (i === 'branch') {
				oFilter[i] = {
					$elemMatch: {
						ref: oQuery[i]
					}
				};
			} else if (i === 'range') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					min: {
						$lte: oQuery[i]
					},
					max: {
						$gte: oQuery[i]
					}
				});
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

function constructProjection(obj) {
	let oProject = {};
	if (obj.projection) {
		obj.projection = Array.isArray(obj.projection) ? obj.projection : obj.projection.split(',');
		oProject = obj.projection.reduce((acc, curr) => {
			var isExclamation = curr.slice(0, 1) === '!';
			return {...acc, [isExclamation ? curr.slice(1) : curr]: !isExclamation};
		}, {});
	}
	return oProject;
}

function constructOption(obj) {
	const oOption = {};
	if(!obj.download)
		oOption.limit = obj.no_of_docs || 10;
	if (obj.skip && obj.skip > 0) {
		oOption.skip = (obj.skip - 1) * oOption.limit;
	} else {
		oOption.skip = 0;
	}
	return oOption;
}

router.post('/getV2', async function (req, res, next) {
	try {
		if (!req.body.type || (req.body.type && constant.billBookType.indexOf(req.body.type) === -1)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': ` Stationary type is mandatory, values could be ${constant.billBookType.join(', ')}`,
			});
		}

		if (req.body.auto) {
			if(req.body.billBookId && req.body.billBookId[0]){
				let foundBook = await BillBook.findOne({_id: req.body.billBookId[0]}, {format: 1, current: 1, min: 1,auto: 1});
				if(foundBook && !foundBook.auto)
					return res.status(500).json({
						'status': 'ERROR',
						'message': 'Bill Book is Not Auto Type'
					});
			}
			let data = await billBookService.genNextAutoStationary({...req.body, clientId: req.user.clientId});
			return res.status(200).json({
				'status': 'OK',
				'message': 'BillStationary found',
				data
			});
		}

		let aBillBookId = [];
		if(req.body.branch || req.body.range) {
			let obQuery = constructFiltersV2(req.body);
			aBillBookId = await BillBook.find(obQuery,{_id:1}).lean();
		}
		req.body.billBranchBookId = aBillBookId;
		const oQuery = constructFilterV2(req.body);
		if (req.body.cClientId)
			oQuery.clientId = req.body.cClientId;

		const oProject = constructProjection(req.body);
		const oOptions = constructOption(req.body);
		let foundStationary;

		if(!req.body.status){
			foundStationary = await BillStationary.find(oQuery, oProject, oOptions)
				.populate({path: 'billBookId', select: {name: 1,branch:1}})
				.populate({path: 'branch', select: {name: 1}})
				.lean();
			if((oOptions.limit = oOptions.limit - foundStationary.length))
				foundStationary.push(...(await BillStationaryUsed.find(oQuery, oProject, oOptions)
					.populate({path: 'billBookId', select: {name: 1,branch:1}})
					.populate({path: 'branch', select: {name: 1}})
					.lean()));
		}else if(req.body.status == 'used'){
			foundStationary = await BillStationaryUsed.find(oQuery, oProject, oOptions)
				.populate({path: 'billBookId',model:'billBook' ,select: {name: 1,branch:1}})
				.populate({path: 'branch', select: {name: 1}}).lean();

		}else if((req.body.status == 'unused') || (req.body.status == 'disable')){
			foundStationary = await BillStationary.find(oQuery, oProject, oOptions)
				.populate({path: 'billBookId', select: {name: 1,branch:1}})
				.populate({path: 'branch', select: {name: 1}})
				.lean();
		}

		if (req.body.download) {
			ReportExelService.billStationaryReports(foundStationary, req.body, req.user, function (data) {
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'BillStationary found',
				'data': foundStationary,
			});
		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
});

router.post('/get', async function (req, res, next) {
	try {
		if (!req.body.type || (req.body.type && constant.billBookType.indexOf(req.body.type) === -1)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': ` Stationary type is mandatory, values could be ${constant.billBookType.join(', ')}`,
			});
		}
		if (!req.body.defaultBook && !req.body.centralize && !(req.body.billBookId && req.body.billBookId.length)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Bill Book is mandatory'
			});
		}
		if (req.body.auto) {
			let data = await billBookService.genNextAutoStationary({...req.body, clientId: req.user.clientId});
			return res.status(200).json({
				'status': 'OK',
				'message': 'BillStationary found',
				data
			});
		}
		const oQuery = constructFilter(req.body);
		oQuery.clientId = req.user.clientId;
		if (req.body.cClientId)
			oQuery.clientId = req.body.cClientId;

		let oProject = constructProjection(req.body);
		if(Object.keys(oProject).length == 0){
			oProject = {clientId:1,bookNo:1,unformattedBookNo:1,billBookId:1,type:1,status:1,startDate:1,endDate:1,deleted:1,
				linkedTo:1,createdAt:1};
		}
		const oOptions = constructOption(req.body);
		const foundStationary = await BillStationary.find(oQuery, oProject, oOptions).sort({unformattedBookNo:1});

		if (req.body.download) {
			ReportExelService.billStationaryReports(foundStationary, req.user, function (data) {
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'BillStationary found',
				'data': foundStationary,
			});
		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
});

router.post('/use/:_id', async (req, res, next) => {
	try {
		const billSt = await BillStationary.findById(req.params._id).lean();

		if (!billSt) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'bill stationary not found',
			});
		}

		if (billSt.status !== 'unused') {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'bill is either used or cancelled',
			});
		}

		const x = await BillStationary.findByIdAndUpdate(req.params._id,
			{$set: {status: 'used',last_modified_at: new Date(),usDate:new Date()},
				$push: {
					commonHistory: {
						user: req.user.clientId,
						date: new Date(),
						status: 'used',
						remark,
					}
				}});
		return res.status(200).json({
			'status': 'OK',
			'message': 'Bill stationary status changed to "used"',
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
  });

router.post('/free-item/:_id', async function (req, res, next) {
	try {
		const billSt = await BillStationary.findById(req.params._id).lean();

		if (!billSt) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'stationary not found',
			});
		}

		if (billSt.status !== 'used') {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'bill is either unused or cancelled',
			});
		}

		const x = await BillStationary.findByIdAndUpdate(req.params._id,
			{
				$set: {
					status: 'cancelled',
					last_modified_at: new Date()
				},
				$push: {
					commonHistory: {
						user: req.user.clientId,
						date: new Date(),
						remark: 'System remark',
						wasLinkedTo: billSt.linkedTo,
						wasLinkedToSchema: billSt.type
					}
				}
			}
		);
		return res.status(200).json({
			'status': 'OK',
			'message': 'Bill stationary is free',
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
});

router.post('/disable/:_id', async function (req, res, next) {
	try {
		const billStationay = await BillStationary.findById(req.params._id);
		let remark = req.body.remark;

		if (!billStationay)
			throw new Error('Stationary not found');

		if (billStationay.status === 'used')
			throw new Error('Bill is already used.');

		await BillStationary.findByIdAndUpdate(req.params._id,
			{
				$set: {
					disable: true,
					last_modified_at: new Date(),
					status: "disable"
				},
				$push: {
					commonHistory: {
						user: req.user.clientId,
						date: new Date(),
						status: 'disable',
						remark,
					}
				}
			}
		);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Stationary is Disabled',
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
});

router.post('/enable/:_id', async function (req, res, next) {
	try {
		const billStationay = await BillStationary.findById(req.params._id).lean();
		let remark = req.body.remark;

		if (!billStationay)
			throw new Error('Stationary not found');

		if (!billStationay.disable)
			throw new Error('Bill is Not Disable.');

		let foundStatus = billStationay.commonHistory.slice(0).reverse().find(o => o.status !== 'disable');

		await BillStationary.findByIdAndUpdate(req.params._id,
			{
				$set: {
					disable: false,
					last_modified_at: new Date(),
					status: "unused"
				},
				$push: {
					commonHistory: {
						user: req.user.clientId,
						date: new Date(),
						status: (foundStatus && foundStatus.status) || 'cancelled',
						remark,
					}
				}
			}
		);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Stationary is Enabled',
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
});

router.post('/freeStationary/:_id', async function (req, res, next) {

	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide Stationary'
		})
	}

	// To bill stationary collection
	let dataSta;
	if(req.body.currentStatus === 'used') {
		dataSta = await BillStationaryUsed.find({_id: otherUtil.arrString2ObjectId(req.params._id)}).lean();
		if(dataSta && dataSta[0]){
			dataSta[0].cl = 'used';
		}
	}else{
		dataSta = await BillStationary.find({_id: otherUtil.arrString2ObjectId(req.params._id)}).lean();
		if(dataSta && dataSta[0]){
			dataSta[0].cl = 'unused';
		}
	}
	if (dataSta[0] && dataSta[0].status != 'used') {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Stationary is already Free.'
		})
	}

	// To check the stationary type collections....
	let existStat = '';

	existStat = await billStationaryService.checkExistStationary(dataSta[0].type, otherUtil.arrString2ObjectId(req.params._id), dataSta[0]);

	if (existStat) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Stationary already exist in ' + dataSta[0].type
		})
	}

	let currentStatus = req.body.currentStatus;
	var remarkSta = "Stationary Marked " + currentStatus + " to Free(Unused)";

	try {

		data = await BillStationary.updateOne({_id: otherUtil.arrString2ObjectId(req.params._id)},
			{
				$set: {
					deleted: false,
					status: 'unused',
					last_modified_at: new Date()
				},
				$push: {
					commonHistory: {
						user: req.user.clientId,
						date: new Date(),
						status: 'unused',
						remark: remarkSta
					}
				}
			}
		);


		return res.status(200).json({
			'status': 'OK',
			'message': remarkSta
		});

	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		})
	}

});

router.post('/removeStationary/:_id', async function (req, res, next) {

	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide Stationary'
		})
	}

	if (req.body.currentStatus != 'unused') {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'You can only delete UNUSED Stationary.'
		})
	}

	try {

		let dataSta = await BillStationary.findOne({_id: otherUtil.arrString2ObjectId(req.params._id)});
		if (!dataSta) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Stationary not available.'
			})
		}

		let checkExistStat = billStationaryService.checkExistStationary(dataSta.type, otherUtil.arrString2ObjectId(req.params._id));
		if (checkExistStat && checkExistStat._id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Stationary already exist in ' + checkExistStat.type + " and Status is " + checkExistStat.status
			});
		} else {

			await billStationaryService.removeByBillStationryId(req.params._id);
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'Stationary Deleted'
		});

	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
});

router.post('/missing', async function (req, res, next) {
	try {
		if (!req.body.type || (req.body.type && constant.billBookType.indexOf(req.body.type) === -1)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': ` Stationary type is mandatory, values could be ${constant.billBookType.join(', ')}`,
			});
		}
		if (!req.body.from) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': ` From date  is mandatory`,
			});
		}
		if (!req.body.to) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': ` To date  is mandatory`,
			});
		}
		req.body.status = 'unused';

		const oQuery = constructFilter(req.body);
		oQuery.clientId = req.user.clientId;
		oQuery.created_at = {$gte : new Date(req.body.from),$lte:new Date(req.body.to)}
		if (req.body.cClientId)
			oQuery.clientId = req.body.cClientId;

	   let aggrPipe = [
			  {$match:oQuery},
			  {$sort:{unformattedBookNo:1}},
			  {$group:{
				  _id:"$billBookId",
				  ufn:{$push:"$unformattedBookNo"},
				  type:{$first:"$type"},
				  bBId:{$first:"$billBookId"},
				  bookNo:{$first:"$bookNo"},//to check format
			  }},
			  {
					  $lookup: {
						  from: 'billbooks',
						  localField: 'bBId',
						  foreignField: '_id',
						  as: 'bB'
					  }
			  },
			   {
					  $unwind:'$bB'
			   },
			   {$project:{ufn:1,type:1,bBId:1,'bB.name':1,'bB.min':1,'bB.max':1,'bB.branch':1}}
		  ];
		const foundStationary = await BillStationary.aggregate(aggrPipe);
		let oBranchMap = {};
		for(let b=0;b<foundStationary.length;b++){
			if(foundStationary[b].ufn && foundStationary[b].ufn.length){
				foundStationary[b].aRanges = arrangeInRange(foundStationary[b].ufn);
				foundStationary[b].count = foundStationary[b].ufn.length;
				delete foundStationary[b].ufn;
			}
		}

		if (req.body.download) {
			ReportExelService.billStationaryReports(foundStationary, req.user, function (data) {
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'BillStationary found',
				'data': foundStationary,
			});
		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
		});
	}
});
function arrangeInRange(ufn){
	let aRanges = [];
	let st=ufn[0],ed;
	let tempRange = [];
	for(let r=1;r<ufn.length;r++){
		tempRange.push(ufn[r-1]);
		if(!st) st = ufn[r-1];
        if(ufn[r]-ufn[r-1] > 1 || r == ufn.length-1){
			if(ufn.length-1 == r){
				ed = ufn[r];
			}else{
				ed = ufn[r-1];
			}
			if(tempRange.length == 1){
				aRanges.push(tempRange[0]);
			}else{
				aRanges.push(st+" To "+ed);
			}
			tempRange = [];
			st = undefined;
		}
	}
	return aRanges;

};
module.exports = router;
