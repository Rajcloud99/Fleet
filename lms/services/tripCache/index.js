const moment = require('moment');
const TripCacheModal = commonUtil.getModel("tripCache");
const Trips = commonUtil.getModel("trip");
let telegram = require("../../../utils/telegramBotUtil");
const GR = commonUtil.getModel('tripGr');

module.exports = class TripCache {
	constructor(clientId,from, to) {
		this._aTrip = [];
		this._aTripToSave = [];
		this.start = moment().add(-1, 'day').startOf('day');
		this.end = moment().endOf('day');
		this.time = moment().add(-5, 'hour').toDate();
		if (from)
			this.start = moment(from);

		if (to)
			this.end = moment(to);

		this.from = from;
		this.to = to;
		this.clientId = clientId;
	}

	async exec() {
		while (this.start.isBefore(this.end)) {
			this._from = this.start.clone().startOf('day');
			this._to = this._from.clone().endOf('day');
			console.log('[trip running] from : ' + this._from.format('DD-MM-YYYY') + ' to : ' + this._to.format('DD-MM-YYYY'))
			await this._startCache(this.tripAggregateQueryByLastUpdate());
		    this.start.add(1, 'day');
		}
	}

	async execTripNoWise() {
		// await this._startCache(this.tripAggregateQueryByTripNo(this.from, this.to));
		let batchSize = 3000;
		for(let i = this.from; i < this.to; i+=batchSize){
			console.log('[trip running] from : ' + i + ' to : ' + (i+batchSize));
			telegram.sendMessage('[Trip  cache] start time: ',i);
			await this._startCache(this.tripAggregateQueryByTripNo(i, i + batchSize));
		}
	}

	async _startCache(cacheBy) {
		try {
			console.log('[Trip settlement cache] start time: ', moment(this._from).toString());
			// this._updateTripByGR();
			await this.activateStream(this._getTrip(cacheBy));

			 if (!this._aTrip.length)
			 	throw new Error('No Trips to Cache');
			 console.log('[Trip  cache] fetch done: ', moment().toString());
			 telegram.sendMessage(this._aTrip.length + ' [Trip settlement cache] start time: ', moment(this._from).toString());
			 await this._transformTrip();
			 console.log('[Trip  cache] transforming done: ', moment().toString());
			 await this._save();
			 console.log('[Trip  cache] end time: ', moment().toString());
		} catch (e) {
			console.log(e);
		}
	}

	tripAggregateQueryByLastUpdate(){
		return {
			$match: {
				//trip_no: 349301,
				clientId: this.clientId,
				 onUpdDate: {
				 	$gte: this._from.toDate(),
				 	$lt: this._to.toDate()
				 }
			}
		};
	}

	tripAggregateQueryByTripNo(from = 1, to = 200){
		return {
			$match: {
				clientId: this.clientId,
				trip_no: {
					$gte: from,
					$lte: to
				},
			}
		};
	}

	_getTrip(cacheBy) {
		let project = {
			clientId: 1,
			branch: 1,
			trip_no: 1,
			bill_no: 1,
			ctrip: 1,
			corder: 1,
			gps_view: 1,
			suspenseRemark: 1,
			settled: 1,
			ownershipType: 1,
			AccManagerRmk: {
				remark: 1,
				by: "$AccManagerRmk.user_full_name",
				date: 1,
			},
			markSettle: {
				isSettled: 1,
				remark: 1,
				by: "$markSettle.user_full_name",
				date: 1,
			},
			advSettled: {
				isCompletelySettled: 1,
				tsNo: 1,
				creation: 1,
				by: "$advSettled.user_full_name",
				date: 1,
				remark: 1,
				systemDate: 1,
				aVoucher: 1
			},
			advanceBudget: 1,
			suspenseAdv: 1,
			transShipment: 1,
			status: 1,
			rmk: 1,
			category: 1,
			extraKm: 1,
			route: 1,
			vehicle: 1,
			driver: 1,
			allocation_date: 1,
			start_date: 1,
			end_date: 1,
			trip_expenses: 1,
			isCancelled: 1,
			payments: 1,
			statuses: {
				date: 1,
				systemDate: 1,
				status: 1,
				remark: 1
			},
			gr: 1,
			gTrip_id: 1,
			vendor: 1,
			vendorDeal: {
				deal_at: 1,
				entryDate: 1,
				date: 1,
				tdsFromAc: {
					_id: "$vendorDeal.tdsFromAc.id",
					name: "$vendorDeal.tdsFromAc.name",
				},
				lorryAc: {
					_id: "$vendorDeal.lorryAc.id",
					name: "$vendorDeal.lorryAc.name",
				},
				broker: {
					_id: "$vendorDeal.broker.id",
					name: "$vendorDeal.broker.name",
				},
				diesel: 1,
				acknowledge: 1,
				totalUnits: 1,
				tdsPercent: 1,
				tdsAmount: 1,
				tdsVoucher: 1,
				perUnitPrice: 1,
				pmtWeight: 1,
				pmtRate: 1,
				driver_cash: 1,
				toll_tax: 1,
				totalCharges: 1,
				totalDeduction: 1,
				charges: 1,
				deduction: 1,
				total_expense: 1,
				munshiyana: 1,
				otherExp: 1,
				internalFreight: 1,
				totWithMunshiyana: 1,
				advance: 1,
				toPay: 1,
				totalDeal: 1,
				account_payment: 1,
				remark: 1,
				account_payment_remark: 1,
				other_charges_remark: 1,
				loading_slip: 1,
				lsStationaryId: 1,
				advance_due_date: 1,
				topay_due_date: 1,
				weight_type: 1,
				payment_type: 1,
				lsNo: 1,
			},
			remarks: 1,
			createdBy: "$created_by_name",
			modifBy: "$last_modified_by_name",
			created_at: 1,
			last_modified_at: 1
		};
		let aggrQuery = [
			cacheBy,
			{$project: project}
		];

		// populate driver
		project = this._createCopy(project);
		project.driver = {
			_id: 1,
			name: 1,
			code: "$driver.employee_code"
		}
		aggrQuery.push({
			$lookup: {
				from: 'drivers',
				localField: 'driver',
				foreignField: '_id',
				as: 'driver'
			}
		}, {
			$unwind: {
				path: '$driver',
				preserveNullAndEmptyArrays: true
			}
		}, {
			$project: project
		});

		project = this._createCopy(project);
		project.driver = {
			_id: 1,
			name: 1,
			code: 1
		}
		aggrQuery.push({$project: project});

		// populate vehicle
		project = this._createCopy(project);
		project.vehicle = {
			_id: 1,
			vehicle_no: "$vehicle.vehicle_reg_no",
			segment: "$vehicle.segment_type",
			fleet: "$vehicle.owner_group"
		};
		aggrQuery.push({
			$lookup: {
				from: 'registeredvehicles',
				localField: 'vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		}, {
			$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
			}
		}, {
			$project: project
		});

		project = this._createCopy(project);
		project.vehicle = {
			_id: 1,
			vehicle_no: 1,
			segment: 1,
			fleet: 1
		};
		aggrQuery.push({$project: project});

		// populate suspense
		project = this._createCopy(project);
		project.suspenseAdv = {
			_id: 1,
			reference_no: 1,
			billNo: 1,
			from_account: 1,
			to_account: 1,
			advanceType: 1,
			category: 1,
			date: 1,
			amount: 1
		};
		aggrQuery.push({
			$lookup: {
				from: 'tripadvances',
				localField: 'suspenseAdv',
				foreignField: '_id',
				as: 'suspenseAdv'
			}
		}, {
			$project: project
		});

		// populate payment/voucher
		project = this._createCopy(project);
		project.payments = {
			_id: 1,
			refNo: 1,
			vT: 1,
			type: 1,
			date: 1,
			amount: 1,
			ledgers: 1
		};
		aggrQuery.push({
			"$lookup": {
				"from": "vouchers",
				"localField": "payments",
				"foreignField": "_id",
				"as": "voucher"
			}
		}, {
			$project: project
		});

		// populate route
		project = this._createCopy(project);
		project.route = {
			_id: 1,
			name: 1,
			km: "$route.route_distance"
		};
		aggrQuery.push({
			$lookup: {
				from: 'transportroutes',
				localField: 'route',
				foreignField: '_id',
				as: 'route'
			}
		}, {
			$unwind: {
				path: '$route',
				preserveNullAndEmptyArrays: true
			}
		}, {
			$project: project
		});

		project = this._createCopy(project);
		project.route = {
			_id: 1,
			name: 1,
			km: 1
		};
		aggrQuery.push({$project: project});

		// populate branch
		project = this._createCopy(project);
		project.branch = {
			_id: 1,
			name: 1
		};
		aggrQuery.push({
			$lookup: {
				from: 'branches',
				localField: 'branch',
				foreignField: '_id',
				as: 'branch'
			}
		}, {
			$unwind: {
				path: '$branch',
				preserveNullAndEmptyArrays: true
			}
		}, {
			$project: project
		});

		// populate vendor
		project = this._createCopy(project);
		project.vendor = {
			_id: 1,
			name: 1,
			pan: "$vendor.pan_no"
		};
		aggrQuery.push({
			$lookup: {
				from: 'vendortransports',
				localField: 'vendor',
				foreignField: '_id',
				as: 'vendor'
			}
		}, {
			$unwind: {
				path: '$vendor',
				preserveNullAndEmptyArrays: true
			}
		}, {
			$project: project
		});

		project = this._createCopy(project);
		project.vendor = {
			_id: 1,
			name: 1,
			pan: 1
		};
		aggrQuery.push({$project: project});


		// populate expenses
		project = this._createCopy(project);
		project.trip_expenses = {
			_id: 1,
			type: 1,
			date: 1,
			amount: 1
		};
		aggrQuery.push({
			$lookup: {
				from: 'tripsexpenses',
					localField: 'trip_expenses',
					foreignField: '_id',
					as: 'trip_expenses'
			}
		},{
			$project: project
		});

		// populate gr
		project = this._createCopy(project);
		project.gr = {
			_id: 1,
			grNumber: 1,
			invoices: 1,
			basicFreight: 1,
			totalFreight: 1,
			customer: 1,
			billingParty: 1
		};
		aggrQuery.push({
			$lookup: {
				from: 'tripgrs',
					localField: 'gr',
					foreignField: '_id',
					as: 'gr'
			}
		}, {
			$project: project
		});

		// populate advance
		project = this._createCopy(project);
		project.advanceBudget = {
			_id: 1,
			reference_no: 1,
			billNo: 1,
			from_account: 1,
			to_account: 1,
			FromAc: {
				_id: "$advanceBudget.from_account",
				name: "$advanceBudget.from_account.name",
			},
			toAc: {
				_id: "$advanceBudget.to_account",
				name: "$advanceBudget.to_account.name",
			},
			advanceType: 1,
			category: 1,
			date: 1,
			amount: 1,
			narration: 1,
			remainingAmount: 1,
		};
		aggrQuery.push({
			$lookup: {
				from: 'tripadvances',
				localField: 'advanceBudget',
				foreignField: '_id',
				as: 'advanceBudget'
			}
		},
			{
			$unwind: {
				path: '$advanceBudget',
				preserveNullAndEmptyArrays: true
			}
		},
			{
				$lookup: {
					from: 'accounts',
					localField: 'advanceBudget.to_account',
					foreignField: '_id',
					as: 'advanceBudget.to_account'
				}
			},
			{
				$unwind: {
					path: '$advanceBudget.to_account',
					preserveNullAndEmptyArrays: true
				}
			},

			{
				$lookup: {
					from: 'accounts',
					localField: 'advanceBudget.from_account',
					foreignField: '_id',
					as: 'advanceBudget.from_account'
				}
			},
			{
				$unwind: {
					path: '$advanceBudget.from_account',
					preserveNullAndEmptyArrays: true
				}
			},

			{
				$project: project
			},
			{
				"$group": {
					"_id": "$_id",
					"branch": { "$first": "$branch" },
					"clientId": { "$first": "$clientId" },
					"trip_no": { "$first": "$trip_no" },
					"bill_no": { "$first": "$bill_no" },
					"ctrip": { "$first": "$ctrip" },
					"corder": { "$first": "$corder" },
					"gps_view": { "$first": "$gps_view" },
					"suspenseRemark": { "$first": "$suspenseRemark" },
					"settled": { "$first": "$settled" },
					"ownershipType": { "$first": "$ownershipType" },
					"AccManagerRmk": { "$first": "$AccManagerRmk" },
					"markSettle": { "$first": "$markSettle" },
					"advSettled": { "$first": "$advSettled" },
					"suspenseAdv": { "$first": "$suspenseAdv" },
					"transShipment": { "$first": "$transShipment" },
					"status": { "$first": "$status" },
					"rmk": { "$first": "$rmk" },
					"category": { "$first": "$category" },
					"extraKm": { "$first": "$extraKm" },
					"route": { "$first": "$route" },
					"vehicle": { "$first": "$vehicle" },
					"driver": { "$first": "$driver" },
					"allocation_date": { "$first": "$allocation_date" },
					"start_date": { "$first": "$start_date" },
					"end_date": { "$first": "$end_date" },
					"trip_expenses": { "$first": "$trip_expenses" },
					"isCancelled": { "$first": "$isCancelled" },
					"payments": { "$first": "$payments" },
					"statuses": { "$first": "$statuses" },
					"gr": { "$first": "$gr" },
					"gTrip_id": { "$first": "$gTrip_id" },
					"vendor": { "$first": "$vendor" },
					"vendorDeal": { "$first": "$vendorDeal" },
					"id": { "$first": "$id" },
					"remarks": { "$first": "$remarks" },
					"createdBy": { "$first": "$createdBy" },
					"modifBy": { "$first": "$modifBy" },
					"created_at": { "$first": "$created_at" },
					"last_modified_at": { "$first": "$last_modified_at" },
					"advanceBudget": { "$push": "$advanceBudget" }
				}
			}
		);
//return trip cursor
		return Trips.aggregate(aggrQuery);
	}

	_transformTrip(_aTrip) {
		for (let oTrip of _aTrip) {
			delete oTrip._id;
			// any modification before saving
			this._aTripToSave.push(oTrip);
		}
	}

	_createCopy(obj) {
		return Object.assign({}, obj);
	}

	async _save() {
		let bulkUpdateQuery = this._aTripToSave.map(oTrip => ({
			updateOne: {
				filter: {
					trip_no: oTrip.trip_no,
					clientId: oTrip.clientId
				},
				update: {
					$set: JSON.parse(JSON.stringify(oTrip)),
				},
				upsert: true
			}
		}));

		this._aTripToSave = []
		if (bulkUpdateQuery.length) {
			let aBatchSize = 50;
			if (bulkUpdateQuery.length > aBatchSize) {
				let nC = parseInt( bulkUpdateQuery.length / aBatchSize);
				console.log("no of itr", nC);
				for (let b = 0; b <= nC; b++) {
					let nArray = bulkUpdateQuery.slice(b * aBatchSize, (b + 1) * aBatchSize);
					if (nArray.length) {
						await TripCacheModal.bulkWrite(nArray, {ordered: false});
					}
					console.log("batch", b);
				}
			} else if (bulkUpdateQuery.length) {
				await TripCacheModal.bulkWrite(bulkUpdateQuery,{ordered: false});
			}
		}
		telegram.sendMessage(bulkUpdateQuery.length + " trip caching completed for ");


	}

	async _updateTripByGR() {
		let fdGR = await GR.aggregate([
			{
				$match: {
					clientId: this.clientId,
					last_modified_at: {
						$gte: this._from,
						$lt: this._to
					}
				}
			},
			{
				$project: {
					trip:1
				}
			}
		]);

		if(fdGR.length) {
			await Trips.updateMany({
				_id: {
					$in: fdGR.map(o => o.trip)
				},
			}, {
				$set: {
					onUpdDate: this.time
				}
			});
		}
	}

	activateStream(aggregate) {
		return new Promise((resolve, reject) => {
			aggregate.options = {allowDiskUse: true, batchSize: 3000};
			this.cursor = aggregate.cursor({batchSize: 2000}).exec();
			this.stream = this.cursor.stream();

			this.stream.on('data', (data) => {

				this._transformTrip(Array.isArray(data) ? data : [data]);
			});

			this.stream.on("end", async () => {
				try{
					console.log("caching", this._aTripToSave.length, "trips")
					await this._save();
				}catch(e){
					console.log("error => ", e);
				}
				resolve();
			});
		});
	}
}

