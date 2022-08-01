const router = express.Router();
const BillBook = commonUtil.getModel('billBook');
const Stationary = commonUtil.getModel('billStationary');
const StationaryUsed = commonUtil.getModel('billStationaryUsed');
const stationaryService = commonUtil.getService('billStationary');
let billBookService = promise.promisifyAll(commonUtil.getService('billBook'));
const Branch = commonUtil.getModel('branch');
const logsService = commonUtil.getService('logs');
const statinaryCacheModel = commonUtil.getModel("stationaryCache");
const Joi = require('joi');

////////testing code/////
global.JoiTest = require('joi');
///// REMOVE //////////

const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

const ALLOWED_FILTER = ['_id', 'name', 'date', 'type', 'branch', 'auto', 'billingParty', 'clientId', 'range', 'dateType','fromDate', 'toDate', 'isLinked', 'deleted'];

function constructFilter(oQuery) {
	let oFilter = {
		// deleted: {
		// 	$ne: true
		// }
	};

	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'fromDate') {
				let startDate = new Date(oQuery[i]);
				startDate.setHours(0, 0, 0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
			} else if (i === 'toDate') {
				let endDate = new Date(oQuery[i]);
				endDate.setHours(23, 59, 59);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
			} else if (i === 'branch') {
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

function constructCacheFilter(oQuery) {
	let oFilter = {};

	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'fromDate') {
				let startDate = new Date(oQuery[i]);
				startDate.setHours(0, 0, 0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
			} else if (i === 'toDate') {
				let endDate = new Date(oQuery[i]);
				endDate.setHours(23, 59, 59);
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
				oFilter['$or'].push({
					created_at:oFilter["created_at"],
				})
				oFilter['$or'].push({
					usDate:oFilter["created_at"],
				})
				delete oFilter['created_at'];
			}else if (i === 'dateType') {
				let startDate = new Date(oQuery['fromDate']);
				startDate.setHours(0, 0, 0);
				let endDate = new Date(oQuery['toDate']);
				endDate.setHours(23, 59, 59);
				delete oFilter['$or'];
				oFilter[oQuery[i]] = oFilter[oQuery[i]] || {};
				if(oQuery[i] === "startDate"){
					oFilter['$or'] = oFilter['$or'] || [];
					oFilter[oQuery[i]].$gte = startDate;
					oFilter[oQuery[i]].$lte = endDate;
					oFilter['$or'].push({
						startDate:oFilter[oQuery[i]],
					})
					oFilter.startDate = {};
					oFilter[oQuery[i]].$gte = oQuery['fromDate'];
					oFilter[oQuery[i]].$lte = oQuery['toDate'];
					oFilter['$or'].push({
						startDate:oFilter[oQuery[i]],
					})
				}else{
					oFilter[oQuery[i]].$gte =  startDate;
					oFilter[oQuery[i]].$lte =  endDate;
				}
				delete oFilter.startDate;
			}
			else if (i === 'branch') {
				oFilter['branch'] = {
					$elemMatch: {
						ref:  mongoose.Types.ObjectId(oQuery[i])
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

router.post('/get', function (req, res, next) {
	billBookService.findAsync(req.body)
		.then(function (data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found.',
				'data': data
			});
		}).catch(next);
});

router.post('/BillBookReport', async function (req, res, next) {
	try {
		let fromDate = new Date(req.body.fromDate);
		fromDate.setUTCHours(0, 0, 0, 0);
		let toDate = new Date(req.body.toDate);
		toDate.setUTCHours(23, 59, 59, 999);
		let months = toDate.getMonth() - fromDate.getMonth() + (12 * (toDate.getFullYear() - fromDate.getFullYear()));
		if (months > 3) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'More than 3 month diffrence is not valid'
			});
		}
		const oF = constructFilter(req.body);
		let oProj = {
			name: 1,
			format: 1,
			min: 1,
			max: 1,
			type: 1,
			branch: 1,
			user: 1,
			created_at: 1,
			lastModifiedBy: 1,
			last_modified_at: 1
		};
		let skip = 0;
		let no_of_docs = req.body.no_of_docs || 20;
		if (req.body.skip) {
			skip = (req.body.skip - 1) * no_of_docs;
		}

		let aggrQuery = [
			{$match: oF},
			{$project: oProj},
		];
		let bals = await BillBook.aggregate(aggrQuery).allowDiskUse(true);
		ReportExelService.billBookReports(bals, req.user, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "report download available.",
				"url": data.url
			});
		});
	} catch (e) {
		next(e);
	}
})

router.post('/modifyBookStationary', async function (req, res, next) {
	try {

		const isFound = await BillBook.findOne({_id: otherUtil.arrString2ObjectId(req.body.billBookId)}).lean();

		if (!isFound) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Bill book with name "${req.body.name}" not found.`
			});
		}

		if (isFound.deleted) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Bill book with name "${req.body.name}" already deleted.`
			});
		}


		// Find


		let minValue = isFound.min;
		let maxValue = isFound.max;
		let formatStr = isFound.format;
		let billBookId = isFound._id;
		let billBookType = isFound.type;
		let savedStationary = {};
		let checkExistStat = '';

		if (billBookId) {

			// --------- By Harikesh - dated: 21-11-2018
			// Start Rang Case.....................
			// ==========================================

			if (req.body.range && req.body.range.length > 0) {
				let stationaryItems = [];

				let aBookNo = [];
				let aUnforma = [];

				let stationaryItemsExist = [];
				// For multiple range add
				for (let rng = 0; rng < req.body.range.length; rng++) {

					for (let i = req.body.range[rng].min; i <= req.body.range[rng].max; i++) {
						if (req.body.range[rng].min >= minValue && req.body.range[rng].min <= maxValue && req.body.range[rng].max <= maxValue) {
							let bn = billBookService.genBookNo(formatStr, i);

							stationaryItems.push({
								clientId: req.user.clientId,
								type: billBookType,
								billBookId: billBookId,
								bookNo: bn,
								created_at: Date.now(),
								unformattedBookNo: i,
								min: isFound.min,
								max: isFound.max,
								startDate: isFound.startDate,
								endDate: isFound.endDate,
							});

							aBookNo.push(bn);
							aUnforma.push(i);

						} else {

							return res.status(500).json({
								'status': 'ERROR',
								'message': `Stationary rang not match with Bill book.`
							});

						}

					}

				}

				var existArr = [];
				var existArrUformattedBNo = [];

				if (aBookNo && aBookNo.length) {
					let existsStationary = [];
					existsStationary = await Stationary.find({
						bookNo: {
							$in: aBookNo
						},
						billBookId: billBookId,
						clientId: req.user.clientId,
					});

					// for existing stationary update...
					if (existsStationary) {
						for (s = 0; s < existsStationary.length; s++) {
							// checkExistStat = stationaryService.checkExistStationary(existsStationary.type, existsStationary._id);
							//
							// if (checkExistStat) {
							// 	data = await Stationary.updateOne({
							// 			bookNo: existsStationary[s].bookNo,
							// 			clientId: req.user.clientId,
							// 			billBookId: billBookId
							// 		},
							// 		{
							// 			$set: {
							// 				status: 'unused',
							// 				deleted: false,
							// 				last_modified_at: new Date()
							// 			},
							// 			$push: {
							// 				commonHistory: {
							// 					user: req.user.clientId,
							// 					date: new Date(),
							// 					status: 'Unused',
							// 					remark: "Stationary " + existsStationary.status + " to Unused"
							// 				}
							// 			}
							// 		}
							// 	);
							// }

							existArr.push(existsStationary[s].bookNo);
							existArrUformattedBNo.push(existsStationary[s].unformattedBookNo);
						}
					}
					// For not found or deleted stationary item add
					let difference = aBookNo.filter(x => !existArr.includes(x));
					let diffUnfor = aUnforma.filter(x => !existArrUformattedBNo.includes(x));

					if (difference && difference.length > 0) {
						for (ab = 0; ab < difference.length; ab++) {
							if (diffUnfor[ab] >= minValue && diffUnfor[ab] <= maxValue) {
								let bnn = billBookService.genBookNo(formatStr, diffUnfor[ab]);

								stationaryItemsExist.push({
									clientId: req.user.clientId,
									type: billBookType,
									status: 'unused',
									billBookId: billBookId,
									bookNo: bnn,
									created_at: Date.now(),
									unformattedBookNo: diffUnfor[ab],
									min: isFound.min,
									max: isFound.max,
									startDate: isFound.startDate,
									endDate: isFound.endDate,
								});
							}
						}
					}
				}
				// end
				if (stationaryItemsExist && stationaryItemsExist.length > 0)
					savedStationary = await Stationary.insertMany(stationaryItemsExist, {ordered: true});
			}

			// END -------------------------------------------------

			//================================
			// Start.........................
			// For Single Stationary Modify...
			// ================================
			let stationaryItemsArr = [];

			let findStaStatus = '';
			if (req.body.missingSta && req.body.missingSta.length > 0) {

				// changes....
				/*
				//var str = missingSta[k];
				//var str1 = formatStr;
				var preFormateArr = formatStr.split("{");
				//var preFormateArr = arr[0];
				//console.log(arr[0]);
				var arr1 = missingSta[k].split(preFormateArr[0]);
				var unforBookNo = arr1[1];
				//console.log(arr1[1]);*/


				for (k = 0; k < req.body.missingSta.length; k++) {
					findStaStatus = await Stationary.findOne({
						billBookId: billBookId,
						clientId: req.user.clientId,
						unformattedBookNo: req.body.missingSta[k]
					});

					if (findStaStatus) {
						// cancelled
						// disable
						if (findStaStatus.status != 'unused') {
							checkExistStat = await stationaryService.checkExistStationary(findStaStatus.type, findStaStatus._id);
							if (!checkExistStat) {
								// Update...
								data = await Stationary.updateOne({_id: findStaStatus._id},
									{
										$set: {
											status: 'unused',
											deleted: false,
											last_modified_at: new Date()
										},
										$push: {
											commonHistory: {
												user: req.user.clientId,
												date: new Date(),
												status: 'unused',
												remark: "Stationary " + findStaStatus.status + " to Unused"
											}
										}
									}
								);

							}
						}

					} else {
						//var preFormateArr = formatStr.split("{");
						//console.log(req.body.missingSta[k]);
						//if (preFormateArr.length > 0) {
						var arrSplit = req.body.missingSta[k];//.split(preFormateArr[0]);
						var unforBookNo = parseInt(arrSplit); //parseInt(arrSplit[1]); // actual number 1,2,....

						if (unforBookNo >= minValue && unforBookNo <= maxValue) {

							//let bnStr = billBookService.genBookNo(formatStr, req.body.missingSta[k]);
							let bnStr = billBookService.genBookNo(formatStr, unforBookNo);

							stationaryItemsArr.push({
								clientId: req.user.clientId,
								type: billBookType,
								status: 'unused',
								billBookId: billBookId,
								bookNo: bnStr,
								created_at: Date.now(),
								//unformattedBookNo: req.body.missingSta[k]
								unformattedBookNo: unforBookNo,
								min: isFound.min,
								max: isFound.max,
								startDate: isFound.startDate,
								endDate: isFound.endDate,
							});
						}
						//}
					}
				}

				if (stationaryItemsArr && stationaryItemsArr.length > 0) {
					// Insert in bulk...
					savedStationary = await Stationary.insertMany(stationaryItemsArr, {ordered: true});
				} else {
					return res.status(500).json({
						'status': 'ERROR',
						'message': `Stationary not match with Bill book.`
					});
				}
			}

			// END-------------------------------------

		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'Bill book stationary modify successfully',
			'data': savedStationary
		});
	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		});
	}
});

router.post('/add', async function (req, res, next) {
	try {
		const isFound = await BillBook.findOne({
			clientId: req.user.clientId,
			name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))+ '$', 'i'),
			deleted: {
				$ne: true
			}
		});

		if(isFound && isFound.name && isFound.type === req.body.type){
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Bill Book already created with same name.`
			});
		}

		if (req.body.centralize) {
			let start_Date = req.body.startDate;
			let end_Date = req.body.endDate;
			const isBookDate = await BillBook.findOne({
				$or: [
					{startDate: {$gte: start_Date, $lte: end_Date}},
					{endDate: {$gte: start_Date, $lte: end_Date}}
				],
				centralize: true,
				type: req.body.type,
				clientId: req.user.clientId,
				deleted: false
			}, {
				_id: 0,
				name: 1
			}).lean();

			if (isBookDate) {
				return res.status(500).json({
					'status': 'ERROR',
					'message': `bill book ${isBookDate.name} is overlaping with selected date.`
				});
			}
		}

		if (req.body.auto && !req.body.centralize && req.body.branch && req.body.branch.length) {
			const oBranch = await Branch.findOne({
				_id: req.body.branch[0].ref,
				clientId: req.user.clientId
			}).lean();
			if (oBranch) {
				if (req.body.type == 'FPA' && oBranch.fpaBook && oBranch.fpaBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.fpaBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Gr' && oBranch.grBook && oBranch.grBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.grBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Hire Slip' && oBranch.lsBook && oBranch.lsBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.lsBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Ref No' && oBranch.refNoBook && oBranch.refNoBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.refNoBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Cash Receipt' && oBranch.crBook && oBranch.crBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.crBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Money Receipt' && oBranch.mrBook && oBranch.mrBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.mrBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Credit Note' && oBranch.miscCNBook && oBranch.miscCNBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.miscCNBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Trip Memo' && oBranch.tripMemoBook && oBranch.tripMemoBook.length){
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.tripMemoBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if(aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Broker Memo' && oBranch.brokerMemoBook && oBranch.brokerMemoBook.length){
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.brokerMemoBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if(aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				}
			}

		}

		// if(req.body.auto && !req.body.centralize && req.body.branch && req.body.branch.length){
		// 	for(const d of req.body.branch){
		// 		const autoBook = await BillBook.findOne({
		// 			centralize: false,
		// 			auto:true,
		// 			type: req.body.type,
		// 			clientId: req.user.clientId,
		// 			deleted: false,
		// 			"branch.ref":{$in:[mongoose.Types.ObjectId(d.ref)]}
		// 		}, {
		// 			_id: 0,
		// 			name: 1
		// 		}).lean();
		//
		// 		if (autoBook) {
		// 			return res.status(500).json({
		// 				'status': 'ERROR',
		// 				'message': `Branch  ${d.name} is already link with auto book ${autoBook.name}.`
		// 			});
		// 		}
		// 	}
		// }
		// if (isFound) {
		// 	return res.status(500).json({
		// 		'status': 'ERROR',
		// 		'message': `bill book with name "${req.body.name}" already exists.`
		// 	});
		// }

		// let anyOverlappingBookFound = await billBookService.validateRange({...req.body, clientId: req.user.clientId});

		// if(anyOverlappingBookFound){
		// 	return res.status(500).json({
		// 		'status': 'ERROR',
		// 		'message': `Provided Min or Max of Type(${req.body.type}) is overlapping with Other Book "${anyOverlappingBookFound.name}"`
		// 	});
		// }

		// let checkMax = billBookService.genBookNo(req.body.format, req.body.max);
		// if(!checkMax){
		// 	return res.status(500).json({
		// 		'status': 'ERROR',
		// 		'message': `Provided Max (${req.body.max}) is exceeding format length "${req.body.format}"`
		// 	});
		// }
		//
		// let checkMin = billBookService.genBookNo(req.body.format, req.body.min);
		// if(!checkMin){
		// 	return res.status(500).json({
		// 		'status': 'ERROR',
		// 		'message': `Provided Min (${req.body.min}) is exceeding format length "${req.body.format}"`
		// 	});
		// }

		let billBookId = mongoose.Types.ObjectId();

		// Start check format length - dated: 17/12/2019
		let maxStanDigits = 16;
		let maxStanDigOther = 20;
		let bn = billBookService.genBookNoOfAuto(req.body.format, 1);
		if (bn.length > maxStanDigits && (req.body.type == 'Bill' || req.body.type == 'Credit Note')) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Provided Stationary Format ${req.body.format} should not be greater than ${maxStanDigits} alphanumeric.`,
			});
		} else if (bn.length > maxStanDigOther) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Provided Stationary Format ${req.body.format} should not be greater than ${maxStanDigOther} alphanumeric.`,
			});
		}
		// END

		if (!req.body.auto) {
			let stationaryItems = [];

			let aBookNo = [];
			for (let i = req.body.min; i <= req.body.max; i++) {
				let bn = billBookService.genBookNo(req.body.format, i);
				stationaryItems.push({
					clientId: req.user.clientId,
					type: req.body.type,
					min: req.body.min,
					max: req.body.max,
					startDate: req.body.startDate,
					endDate: req.body.endDate,
					status: 'unused',
					billBookId,
					bookNo: bn,
					created_at: Date.now(),
					unformattedBookNo: i
				});

				aBookNo.push(bn);
			}

			let doesStationaryExists = await Stationary.findOne({
				bookNo: {
					$in: aBookNo
				},
				// type: req.body.type,
				clientId: req.user.clientId,
			});

			if (doesStationaryExists && doesStationaryExists._id) {

				let foundBook = await BillBook.findOne({
					_id: doesStationaryExists.billBookId
				});

				return res.status(500).json({
					'status': 'ERROR',
					'message': `Provided Stationary is overlapping with ${foundBook && foundBook.name && 'Other Book ' + foundBook.name || ''} and Stationay No: ${doesStationaryExists.bookNo}`,
				});
			}

			const savedStationary = await Stationary.insertMany(stationaryItems, {ordered: true});
		}

		if (req.body.branch && req.body.branch.length) {

			let bookKey;
			if (req.body.type == 'FPA')
				bookKey = 'fpaBook';
			else if (req.body.type == 'Gr')
				bookKey = 'grBook';
			else if (req.body.type == 'Hire Slip')
				bookKey = 'lsBook';
			else if (req.body.type == 'Ref No')
				bookKey = 'refNoBook';
			else if (req.body.type == 'Cash Receipt')
				bookKey = 'crBook';
			else if (req.body.type == 'Money Receipt')
				bookKey = 'mrBook';
			else if (req.body.type == 'Trip Memo')
				bookKey = 'tripMemoBook';
			else if (req.body.type == 'Broker Memo')
				bookKey = 'brokerMemoBook';
			else if (req.body.type == 'Debit Note')
				bookKey = 'debitBook';
			else if (req.body.type == 'Credit Note')
				bookKey = 'miscCNBook';

			if (bookKey) {
				req.body.isLinked = true;

				await Branch.bulkWrite(req.body.branch.map(oBranch => ({
					updateOne: {
						filter: {_id: oBranch.ref},
						update: {
							$addToSet: {
								[bookKey]: {
									ref: billBookId,
									name: req.body.name
								}
							}
						},
						upsert: false
					}
				})));
			}
		}

		const savedBillBook = await BillBook.create({
			...req.body,
			clientId: req.user.clientId,
			user: req.user.full_name,
			_id: billBookId
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Bill book created successfully',
			'data': savedBillBook
		});
	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		});
	}
});

router.put('/update/:_id', async function (req, res, next) {
	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide _id'
		});
	}
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'message': 'No update body found'});
	}

	try {
		let billBook = await BillBook.findById(req.params._id).lean();
        let usedBook = await StationaryUsed.findOne({billBookId:mongoose.Types.ObjectId(req.params._id)},{status:1, startDate:1}).lean();
		if(usedBook && (new Date(billBook.startDate).toDateString() !== new Date(req.body.startDate).toDateString())){
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Bill book start date can not be modified!'
			});
		}
		if(usedBook && billBook.branch.length && req.body.branch.length){
			if((billBook.branch[0].ref.toString()) != req.body.branch[0].ref.toString()){
				return res.status(500).json({
					'status': 'ERROR',
					'message': 'Some book used now you can not update branch!'
				});
			}
		}
	    if(usedBook){
			req.body.branch = billBook.branch;
	    }
	    else{
			req.body.branch = req.body.branch || [];
		}
		if (!billBook) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Bill book not found!'
			});
		}
		if(billBook &&  (billBook.name != req.body.name) && (new RegExp('^' + (req.body.name)+ '$', 'i').test(billBook.name) && billBook.type === req.body.type)){
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Bill Book already created with same name.`
			});
		}

		if (billBook.name !== req.body.name) {
			const isFound = await BillBook.findOne({
				clientId: req.user.clientId,
				name: req.body.name,
				deleted: {
					$ne: true
				}
			});

			if (isFound) {
				return res.status(500).json({
					'status': 'ERROR',
					'message': `bill book with name "${req.body.name}" already exists.`
				});
			}
		}

		if (req.body.centralize) {
			if (billBook.startDate !== req.body.startDate || billBook.endDate !== req.body.endDate) {
				let start_Date = req.body.startDate;
				let end_Date = req.body.endDate;
				const isBookDate = await BillBook.findOne({
					name: {
						$nin: [req.body.name]
					},
					type: req.body.type,
					centralize: true,
					deleted: {
						$ne: true
					},
					clientId: req.user.clientId,
					$or: [
						{startDate: {$gte: start_Date, $lte: end_Date}},
						{endDate: {$gte: start_Date, $lte: end_Date}}
					]
				})
				if (isBookDate) {
					return res.status(500).json({
						'status': 'ERROR',
						'message': `bill book date already exists.`
					});
				}
			}
		}

		if (req.body.auto && !req.body.centralize && req.body.branch && req.body.branch.length) {
			const oBranch = await Branch.findOne({
				_id: req.body.branch[0].ref,
				clientId: req.user.clientId
			}).lean();
			if (oBranch) {
				if (req.body.type == 'FPA' && oBranch.fpaBook && oBranch.fpaBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.fpaBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Gr' && oBranch.grBook && oBranch.grBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.grBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Hire Slip' && oBranch.lsBook && oBranch.lsBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.lsBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Ref No' && oBranch.refNoBook && oBranch.refNoBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.refNoBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Cash Receipt' && oBranch.crBook && oBranch.crBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.crBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Money Receipt' && oBranch.mrBook && oBranch.mrBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.mrBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Credit Note' && oBranch.miscCNBook && oBranch.miscCNBook.length) {
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.miscCNBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if (aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				} else if (req.body.type == 'Trip Memo' && oBranch.tripMemoBook && oBranch.tripMemoBook.length){
					let aBook = await BillBook.find({
						clientId: req.user.clientId,
						_id: {$in: oBranch.tripMemoBook.map(o => o.ref)},
						auto: true,
						deleted: {
							$ne: true
						}
					});
					if(aBook && aBook.length)
						throw new Error('Auto Book already exists on branch you cant add more then one auto book on single branch');
				}
			}

		}

		// if(req.body.centralize){
		// 	if(billBook.startDate !==req.body.startDate){
		// 		let start_Date = req.body.startDate;
		// 		// let end_Date = req.body.endDate;
		// 		const isBookDate = await BillBook.findOne({startDate: {$gt: start_Date, $lte: billBook.endDate}});
		// 		// const isBookDate1 = await BillBook.findOne({endDate: {$gte: req.body.startDate, $lt: end_Date}});
		// 		if (isBookDate) {
		// 			return res.status(500).json({
		// 				'status': 'ERROR',
		// 				'message': `bill book  FromDate already exists.`
		// 			});
		// 		}
		// 	}
		// 	if(billBook.endDate !==req.body.endDate){
		// 		let end_Date = req.body.endDate;
		// 		const isBookDate = await BillBook.findOne({endDate: {$gte: req.body.startDate, $lt: end_Date}});
		// 		if (isBookDate) {
		// 			return res.status(500).json({
		// 				'status': 'ERROR',
		// 				'message': `bill book  toDate already exists.`
		// 			});
		// 		}
		// 	}
		//
		// }

		// let anyOverlappingBookFound = await billBookService.validateRange({...{
		// 		...billBook,
		// 		max: req.body.max
		// 	}, clientId: req.user.clientId}, { '_id' : {$ne: billBook._id} });
		//
		// if(anyOverlappingBookFound){
		// 	return res.status(500).json({
		// 		'status': 'ERROR',
		// 		'message': `Provided Min or Max of Type(${req.body.type}) is overlapping with Other Book "${anyOverlappingBookFound.name}"`
		// 	});
		// }

		if ((req.body.branch && req.body.branch.length) || (billBook.branch && billBook.branch.length)) {

			let branchQuery = [];

			let bookKey;
			if (req.body.type == 'FPA')
				bookKey = 'fpaBook';
			else if (req.body.type == 'Gr')
				bookKey = 'grBook';
			else if (req.body.type == 'Hire Slip')
				bookKey = 'lsBook';
			else if (req.body.type == 'Ref No')
				bookKey = 'refNoBook';
			else if (req.body.type == 'Cash Receipt')
				bookKey = 'crBook';
			else if (req.body.type == 'Money Receipt')
				bookKey = 'mrBook';
			else if (req.body.type == 'Credit Note')
				bookKey = 'miscCNBook';
			else if (req.body.type == 'Trip Memo')
				bookKey = 'tripMemoBook';
			else if (req.body.type == 'Broker Memo')
				bookKey = 'brokerMemoBook';
			else if (req.body.type == 'Credit Note')
				bookKey = 'miscCNBook';
			if (!bookKey)
				throw new Error('Book type Undefine');

			(billBook.branch || []).forEach(oSavedBranch => {

				let foundIndex = req.body.branch.findIndex(o => o.ref === oSavedBranch.ref.toString());

				if (!(foundIndex + 1)) {
					// 	req.body.branch.splice(foundIndex, 1);
					// else {
					// unlink bill book from branch
					branchQuery.push({
						updateOne: {
							filter: {_id: oSavedBranch.ref},
							update: {
								$pull: {
									[bookKey]: {
										ref: billBook._id
									}
								}
							},
							upsert: false
						}
					});
				}
			});

			let key = [bookKey] + "." + 'ref'.toString();
			let key1 = [bookKey] + "." + 'name'.toString();

			branchQuery.push(...req.body.branch.map(oBranch => ({
				updateOne: {
					filter: {
						_id: oBranch.ref,
						[key] : {$ne:billBook._id},
						[key1]: {$ne:billBook.name}
					},
					update: {
						$addToSet: {
							[bookKey]: {
								ref: billBook._id,
								name: billBook.name
							}
						}
					},
					upsert: false
				}
			})));
			if (req.body.branch.length)
				req.body.isLinked = true;
			else
				req.body.isLinked = false;

			if (branchQuery.length)
				await Branch.bulkWrite(branchQuery);
		}

		if (req.body.max != billBook.max) {
			if (req.body.max > billBook.max) {
				const stationaryItems = [];
				for (let i = (billBook.max + 1); i <= req.body.max; i++) {
					stationaryItems.push({
						clientId: req.user.clientId,
						status: 'unused',
						type: billBook.type,
						billBookId: billBook._id,
						bookNo: billBookService.genBookNo(billBook.format, i),
						unformattedBookNo: i
					});
				}

				let doesStationaryExists = await Stationary.findOne({
					bookNo: {
						$in: stationaryItems.map(o => o.bookNo),
					},
					type: req.body.type,
					clientId: req.body.clientId
				}).lean();

				if (doesStationaryExists && doesStationaryExists._id) {

					let foundBook = await BillBook.findOne({
						_id: doesStationaryExists.billBookId
					});

					return res.status(500).json({
						'status': 'ERROR',
						'message': `Provided Stationary is overlapping with Other Book "${foundBook.name}"`,
						'data': foundBook
					});
				}
                if(!billBook.auto || !billBook.centralize){
					const savedStationary = await Stationary.insertMany(stationaryItems, {ordered: true});
				}
				let updatedBillBook = await BillBook.findByIdAndUpdate(req.params._id, {
					$set: {
						max: req.body.max
					}
				});
			} else {
				let lastUsedBookNo = await StationaryUsed.find(
					{billBookId: billBook._id, status: 'used'},
					{unformattedBookNo: 1, bookNo: 1}
				).sort({unformattedBookNo: -1}).lean();
				lastUsedBookNo = lastUsedBookNo && lastUsedBookNo[0];
				if (!lastUsedBookNo || (lastUsedBookNo && lastUsedBookNo.unformattedBookNo <= req.body.max)) {
					const deletedStat = await Stationary.deleteMany({
						billBookId: billBook._id,
						unformattedBookNo: {$gt: req.body.max}
					});
					let updatedBillBook = await BillBook.findByIdAndUpdate(req.params._id, {$set: {max: req.body.max}});
				} else {
					return res.status(500).json({
						'status': 'ERROR',
						'message': `Can't alter bill book. Last used bill book no. is ${lastUsedBookNo.bookNo}`
					});
				}
			}
		}

		let updatedBillBook = await BillBook.findByIdAndUpdate(req.params._id, {
			$set: {
				startDate: req.body.startDate || billBook.startDate,
				endDate: req.body.endDate || billBook.endDate,
				branch: req.body.branch || [],
				name: req.body.name || billBook.name,
				isLinked: req.body.isLinked,
				lastModifiedBy: req.user.full_name
			}
		});

		await stationaryService.update({
			billBookId: otherUtil.arrString2ObjectId(req.params._id)
		}, {
			$set: {
				startDate: req.body.startDate || billBook.startDate,
				endDate: req.body.endDate || billBook.endDate,
				min: req.body.min || billBook.min,
				max: req.body.max || billBook.max,
			}
		});
		return res.status(200).json({
			'status': 'OK',
			'message': 'Bill Book updated'
		});

	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		});
	}
});

router.delete('/remove/:_id', async function (req, res, next) {

	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide _id'
		})
	}

	try {
		let checkStatus = await StationaryUsed.findOne({
			status: 'used',
			billBookId: otherUtil.arrString2ObjectId(req.params._id)
		});
		if (checkStatus) {
			return res.status(500).json({
				'status': 'Ok',
				'message': "Stationary used for this BillBook"
			})
		}
		let data = await stationaryService.removeByBillBookId(req.params._id);
		data = await BillBook.updateOne({_id: otherUtil.arrString2ObjectId(req.params._id)}, {
			$set: {
				deleted: true,
				lastModifiedBy: req.user.full_name
			}
		});

		let retRes = await billBookService.unlinkBillBook(otherUtil.arrString2ObjectId(req.params._id));
		if (retRes) {

			let oBillBook = await BillBook.findOne({_id: otherUtil.arrString2ObjectId(req.params._id)}).lean();

			await logsService.add('billBook', {
				uif: oBillBook.name,
				category: 'delete',
				nData: {},
				oData: JSON.parse(JSON.stringify(oBillBook)),
			}, req);

			return res.status(200).json({
				'status': 'OK',
				'message': 'Deleted Successfully'
			});
		} else {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Bill Book not unlink'
			});
		}
	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
});

router.delete('/softDelete/:_id', async function (req, res, next) {

	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide _id'
		})
	}

	try {
		let checkStatus = await Stationary.findOne({
			status: 'used'
		});
		if (checkStatus) {
			return res.status(500).json({
				'status': 'Ok',
				'message': "Stationary used for this BillBook"
			})
		}

		let data = await stationaryService.removeByBillBookId(req.params._id);
		data = await BillBook.updateOne({_id: otherUtil.arrString2ObjectId(req.params._id)}, {
			$set: {
				deleted: true,
				lastModifiedBy: req.user.full_name
			}
		});

		let retRes = await billBookService.unlinkBillBook(otherUtil.arrString2ObjectId(req.params._id));
		if (retRes) {

			let oBillBook = await BillBook.findOne({_id: otherUtil.arrString2ObjectId(req.params._id)}).lean();

			await logsService.add('billBook', {
				uif: oBillBook.name,
				category: 'delete',
				nData: {},
				oData: JSON.parse(JSON.stringify(oBillBook)),
			}, req);

			return res.status(200).json({
				'status': 'OK',
				'message': 'Deleted Successfully'
			});
		} else {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Bill Book not unlink'
			});
		}
	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
});

router.route('/stationaryMissingRpt').post(async function (req, res, next) {

	try {
		const oF = constructCacheFilter(req.body);
		// if(oF.created_at){
		// 	delete oF.created_at;
		// }
		let aggrPipe = [
			{ $match: oF },
			{
				"$unwind": {
					"path": "$branch",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$group" : {
					"_id": {type: "$type",  branchName: "$branch.name"},
					data: {
						"$push" : "$$ROOT"
					}
				}
			},
			{
				$project: {
					type: "$_id.type",
					branchName: "$_id.branchName",
					data: 1,
				}
			},
			{
				"$group": {
					_id: "$branchName",
					branchData: {
						"$push" : "$$ROOT"
					}
				}
			},
			{
				"$sort": {_id: 1}
			}

		];

		let foundStationary = await statinaryCacheModel.aggregate(aggrPipe);
		ReportExelService.stationaryMissingRpt(foundStationary, req.body, req.body.toDate, req.body.fromDate, req.clientData, req.user.clientId, function (d) {
			return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				}
			);
		});

	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString(),
		})
	}
});


router.route('/fullyUnused').post(async function (req, res, next) {

	try {
		const oF = constructCacheFilter(req.body);
		// if(oF.created_at){
		// 	delete oF.created_at;
		// }
		let aggrPipe = [
			{ $match: oF },
			{
				$project: {
					min: 1,
					max: 1,
					name: 1,
					type:1,
					branch:1,
					created_at:1,
					last_modified_at:1,
					user:1
				}
			},
		];
        let foundStationary = [];
		let foundBillBook = await BillBook.aggregate(aggrPipe);
		if(foundBillBook && foundBillBook[0]){
			for(const d of foundBillBook ){
				let foundUsedStationary = await StationaryUsed.findOne({billBookId:d._id});
				if(!foundUsedStationary){
					foundStationary.push(d);
				}
			}
		}
		ReportExelService.stationaryFullyMissing(foundStationary, req.body, req.body.toDate, req.body.fromDate, req.clientData, req.user.clientId, function (d) {
			return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				}
			);
		});

	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString(),
		})
	}
});

module.exports = router;
