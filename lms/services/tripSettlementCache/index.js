const moment = require('moment');
const TripSettlementCacheModal = commonUtil.getModel("tripSettlementCache");
const Trips = commonUtil.getModel("trip");
const TripAdvance = commonUtil.getModel('TripAdvances');
const Customer = commonUtil.getModel('customer');
const Accounts = commonUtil.getModel('accounts');
const GR = commonUtil.getModel('tripGr');
let telegram = require("../../../utils/telegramBotUtil");

module.exports = class TripSettlementCache {
	constructor(clientId,from, to) {
		this._aGroupedTrip = [];
		this._groupedTripToSave = [];
		this.start = moment().add(-1, 'day').startOf('day');
		this.end = moment().endOf('day');
		this.time = moment().add(-5, 'hour').toDate();
		if (from)
			this.start = moment(from);

		if (to)
			this.end = moment(to);

		this.clientId = clientId;

		// this.arrOfRTs = require("./rt.json").map(o => Number(o));
	}

	async exec() {
		// return await this._startCache(this._from, this._to);
		while (this.start.isBefore(this.end)) {
			this._from = this.start.clone().startOf('day');
			this._to = this._from.clone().endOf('day');
			console.log('[trip settlement running] from : ' + this._from.format('DD-MM-YYYY') + ' to : ' + this._to.format('DD-MM-YYYY'))
			await this._startCache();
			this.start.add(1, 'day');
		}
	}

	async execAll(clientId,from, to) {
		this.rtWise = true;
		this._fromRt = from || 0;
		this._toRt = from + 100;
		this.toRt = to;
		this.clientId = clientId;
		while (this._fromRt <= this.toRt) {
			telegram.sendMessage('[Trip settlement cache] start for RTs: ', this._fromRt, this._toRt);
			console.log('[trip settlement running] from : ' + this._fromRt + ' to : ' + this._toRt);
			await this._startCache(this._fromRt, this._toRt,this.clientId);
			this._fromRt = this._toRt + 1;
			this._toRt = this._fromRt + 100;
		}
	}

	async _execAll(from, to) {
		this.rtWise = true;
		for(let i = 0; i< this.arrOfRTs.length; i+=100){
			this._fromRt = i;
			console.log('[trip settlement running] from : ' + this._fromRt + ' to : ' + this._toRt);
			await this._startCache();
		}
	}

	async _startCache() {
		try {
			// await this.updateTripByTripAdvance();
			// await this.updateTripByGR();
			console.log('[Trip settlement cache] start time: ', moment().toString());
			this._aGroupedTrip = await this._getGroupedTrip();
			if (!this._aGroupedTrip.length)
				throw new Error('No Trips to Cache');
			console.log('[Trip settlement cache] fetch done: ', moment().toString());
			this._massageTrip();
			console.log('[Trip settlement cache] massage done: ', moment().toString());
			await this._transformGroupedTrip();
			console.log('[Trip settlement cache] transforming done: ', moment().toString());
			await this._save();
			console.log('[Trip settlement cache] end time: ', moment().toString());
		} catch (e) {
			console.log(e);
		}
	}

	async _getGroupedTrip() {
		let oFilter = {"advSettled.tsNo": {$exists: true}, clientId: this.clientId};
		if (this.rtWise) {
			oFilter = {
				clientId: this.clientId,
				"advSettled.tsNo": {$gte: this._fromRt, $lt: this._toRt}
				// "advSettled.tsNo": {$in: this.arrOfRTs.slice(this._fromRt, this._fromRt + 100)}
			}
		} else {
			// oFilter.start_date = {
			// 	$gte: this._from.toDate(),
			// 	$lt: this._to.toDate()
			// };
			oFilter.onUpdDate = {
				$gte: this._from.toDate(),
				$lt: this._to.toDate()
			};
		}

		let aTsNo = await Trips.aggregate([
			{
				$match: oFilter
			},
			{
				$project: {
					"advSettled.tsNo": 1
				}
			}
		]);

		aTsNo = [...aTsNo.reduce((set, obj) => {
			set.add(obj.advSettled.tsNo);
			return set;
		}, new Set())];

		return await this._getTripByRT(aTsNo);
	}

	async _getTripByRT(aTsNo){
		return await Trips.aggregate([
			{
				$match: {
					clientId: this.clientId,
					"advSettled.tsNo": {$in: aTsNo}
				}
			},
			// populate driver

			{
				$lookup: {
					from: 'drivers',
					localField: 'driver',
					foreignField: '_id',
					as: 'driver'
				}
			},
			{
				$unwind: {
					path: '$driver',
					preserveNullAndEmptyArrays: true
				}
			},

			// populate vehicle

			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'vehicle',
					foreignField: '_id',
					as: 'vehicle'
				}
			},
			{
				$unwind: {
					path: '$vehicle',
					preserveNullAndEmptyArrays: true
				}
			},


			// populate advance

			{
				$lookup: {
					from: 'tripadvances',
					localField: 'advanceBudget',
					foreignField: '_id',
					as: 'advanceBudget'
				}
			},

			// populate suspense
			{
				$lookup: {
					from: 'tripadvances',
					localField: 'suspenseAdv',
					foreignField: '_id',
					as: 'suspenseAdv'
				}
			},

			// populate payment/voucher

			{
				"$lookup": {
					"from": "vouchers",
					"localField": "payments",
					"foreignField": "_id",
					"as": "payments"
				}
			},

			// populate route

			{
				$lookup: {
					from: 'transportroutes',
					localField: 'route',
					foreignField: '_id',
					as: 'route'
				}
			},
			{
				$unwind: {
					path: '$route',
					preserveNullAndEmptyArrays: true
				}
			},

			// populate expenses

			{
				$lookup: {
					from: 'tripsexpenses',
					localField: 'trip_expenses',
					foreignField: '_id',
					as: 'trip_expenses'
				}
			},


			// populate gr

			{
				$lookup: {
					from: 'tripgrs',
					localField: 'gr',
					foreignField: '_id',
					as: 'gr'
				}
			},
			{
				$group: {
					_id: "$advSettled.tsNo",
					trip: {$push: "$$ROOT"}
				}
			}
		]);
	}

	async _transformGroupedTrip() {
		for (let oGroupedTrip of this._aGroupedTrip) {
			let aTrip = oGroupedTrip.trip;
			let firstTrip = aTrip[0];
			let lastTrip = aTrip[aTrip.length - 1];

			firstTrip.markSettle = firstTrip.markSettle || {};
			firstTrip.advSettled = firstTrip.advSettled || {};
			firstTrip.driver = firstTrip.driver || {};
			firstTrip.vehicle = firstTrip.vehicle || {};
			firstTrip._tripStarted = firstTrip._tripStarted && moment(firstTrip._tripStarted);
			lastTrip._tripEnded = lastTrip._tripEnded && moment(lastTrip._tripEnded);

			let summary = await this._calculateSummary(aTrip);

			let prepRTObj = {
				clientId: firstTrip.clientId,
				tsNo: firstTrip.advSettled.tsNo,
				startDate: firstTrip._tripStarted,
				endDate: lastTrip._tripEnded,
				cSettle: firstTrip.advSettled.isCompletelySettled, // is completely settled
				mSettle: firstTrip.markSettle.isSettled, // is marked settled
				openingBal: firstTrip.advSettled.openingBal,
				sysDate: firstTrip.advSettled.systemDate,
				date: firstTrip.markSettle.date, // Settle date
				csBy: firstTrip.advSettled.user_full_name, // completely Settle By
				msBy: firstTrip.markSettle.user_full_name, // mark Settle By
				msRemark: firstTrip.markSettle.remark,
				csRemark: firstTrip.advSettled.remark,
				creation: firstTrip.advSettled.creation,
				...summary,
				vehicle: {
					_id: firstTrip.vehicle._id,
					vehicleNo: firstTrip.vehicle_no,
					segment: firstTrip.segment_type,
					fleet: firstTrip.vehicle.owner_group,
					ownershipType: firstTrip.ownershipType,
				},
				driver: {
					_id: firstTrip.driver._id,
					name: firstTrip.driver.name,
					code: firstTrip.driver.employee_code
				},
				trip: await this._transformTrip(aTrip),
				suspense: await this._getSuspense(aTrip),
				gapSuspense: [],
				// gapSuspense: [AdvanceBudget],
			};
			prepRTObj.totalSuspence = prepRTObj.suspense.reduce((acc, oAdv) => acc + (oAdv.amount || 0), 0);
			this._groupedTripToSave.push(prepRTObj);
		}
	}

	_massageTrip() {
		// extracting start and end date from statuses
		this._aGroupedTrip.forEach(oGroupedTrip => {
			oGroupedTrip.trip.forEach(oTrip => {
				oTrip.statuses.forEach(oStatus => {
					if (oStatus.status == "Trip started") {
						oTrip._tripStarted = oStatus.date;
					} else if (oStatus.status == "Trip ended") {
						oTrip._tripEnded = oStatus.date;
					}
				});
			});
			oGroupedTrip.trip.sort((a, b) => new Date(a._tripStarted) - new Date(b._tripStarted));
		})

	}

	async _getSuspense(aTrip) {
		let suspense = [];
		for(let trip of aTrip){
			let _TSuspense = await this._transformAdvance(trip.suspenseAdv);
			suspense.push(..._TSuspense);
		}
		return suspense;
	}

	async _transformAdvance(aAdvance) {
		let aAdv = [];
		for (let oAdvance of aAdvance) {
			// let fromAccount = await Accounts.findOne({_id: oAdvance.from_account}, {name: 1}).lean();
			// fromAccount = fromAccount || {}
			// let toAccount = await Accounts.findOne({_id: oAdvance.to_account}, {name: 1}).lean();
			// toAccount = toAccount || {}

			aAdv.push({
				_id: oAdvance._id,
				refNo: oAdvance.reference_no,
				billNo: oAdvance.bill_no,
				// from: fromAccount.name,
				// fromId: fromAccount._id,
				// to: toAccount.name,
				// toId: toAccount._id,
				advanceType: oAdvance.advanceType,
				category: oAdvance.category,
				date: oAdvance.date,
				amount: oAdvance.amount
			});
		}
		return aAdv;
	}

	_transformExpense(aExpense) {
		return aExpense.map(oExpense => ({
			_id: oExpense._id,
			type: oExpense.type,
			date: oExpense.created_at,
			amount: oExpense.amount
		}));
	}

	_transformPayments(aPayment) {
		return aPayment.map(oPayment => {
			let cr, dr;
			oPayment.ledgers.forEach(oLed => {
				if (oLed.cRdR = 'CR') {
					cr = oLed;
				}

				if (oLed.cRdR = 'DR') {
					dr = oLed;
				}
			});

			return {
				_id: oPayment._id,
				refNo: oPayment.refNo,
				vT: oPayment.vT,
				type: oPayment.type,
				date: oPayment.date,
				amount: oPayment.ledgers[0].amount,
				from: cr.lName,
				fromId: cr.account,
				to: dr.lName,
				toId: dr.account
			};
		});
	}

	async _calculateSummary(aTrip) {
		await Trips.eachTripSummary(aTrip);
		let summary = await Trips.tripSummary(aTrip);
		summary.totalKm = 0;
		summary.revenue = 0;
		summary.profit = 0;
		aTrip.forEach(oTrip => {
			summary.totalKm += oTrip.route && oTrip.route.route_distance || 1;
			let totFright = oTrip.gr.reduce((acc, oGr) => acc + (oGr.totalFreight || oGr.internal_rate || 0), 0)
			summary.revenue += totFright;
			summary.profit += (totFright - oTrip.actual_expense);
		});
		summary.revenueByKm = summary.revenue / summary.totalKm;
		summary.expenseByKm = summary.netExpense / (summary.totalKm + summary.totalExtraKm);
		summary.profitByKm = summary.profit / summary.totalKm;
		summary.ttDays = (aTrip[aTrip.length - 1]._tripEnded - aTrip[0]._tripStarted) / 86400000;
		summary.profitByday = summary.profit / summary.ttDays;
		return summary;
	}

	async _transformGR(aGR) {
		let newAGR = []
		for (let oGR of aGR) {

			let customer = await Customer.findOne({_id: oGR.customer}, {name: 1, category: 1}).lean();

			return ({
				_id: oGR._id,
				grNumber: oGR.grNumber,
				basicFreight: oGR.basicFreight,
				totalFreight: oGR.totalFreight,
				customer: {
					_id: customer._id,
					name: customer.name,
					category: customer.category
				}
			});
		}

		return newAGR;
	}

	async _save() {
		let bulkUpdateQuery = this._groupedTripToSave.map(oGroupedTrip => ({
			updateOne: {
				filter: {
					tsNo: oGroupedTrip.tsNo,
					clientId: oGroupedTrip.clientId
				},
				update: {
					$set: JSON.parse(JSON.stringify(oGroupedTrip)),
				},
				upsert: true
			}
		}));
		await TripSettlementCacheModal.bulkWrite(bulkUpdateQuery);
		this._groupedTripToSave = [];
	}

	async _transformTrip(aTrip) {
		let newATrip = [];
		for (let oTrip of aTrip) {
			newATrip.push({
				_id: oTrip._id,
				trip_no: oTrip.trip_no,
				bill_no: oTrip.bill_no,
				startDate: oTrip._tripStarted,
				endDate: oTrip._tripEnded,
				status: oTrip.status,
				rmk: oTrip.rmk,
				category: oTrip.category,
				extraKm: oTrip.extraKm,
				route_name: oTrip.route_name,
				routeKm: oTrip.route && oTrip.route.route_distance,
				route: oTrip.route && oTrip.route._id,
				allocation_date: oTrip.allocation_date,
				isCancelled: oTrip.isCancelled,
				advanceBudget: await this._transformAdvance(oTrip.advanceBudget),
				suspenseAdv: await this._transformAdvance(oTrip.suspenseAdv),
				trip_expenses: this._transformExpense(oTrip.trip_expenses),
				payments: this._transformPayments(oTrip.payments),
				statuses: Array.isArray(oTrip.statuses) && oTrip.statuses.map(oStatus => ({
					by: oStatus.user_full_name,
					date: oStatus.date,
					status: oStatus.status
				})),
				gr: await this._transformGR(oTrip.gr),
				remarks: oTrip.remark,
			});
		}
		return newATrip;
	}

	async updateTripByTripAdvance() {
		let fdAdv = await TripAdvance.aggregate([
			{
				$match: {
					clientId: this.clientId,
					onUpdDate: {
						$gte: this._from,
						$lt: this._to
					},
					trip: {$exists: true}
				}
			},
			{
				$project: {
					trip: 1
				}
			}
		]);

		if (fdAdv.length) {

			let rtNo = await Trips.aggregate([
				{
					$match: {
						_id: {$in: fdAdv.map(o => o.trip)},
						"advSettled.tsNo": {$exists: true}
					}
				},
				{
					$project: {
						"advSettled.tsNo": 1
					}
				}
			]);

			await Trips.updateMany({
				"advSettled.tsNo": {
					$in: rtNo.map(o => o.advSettled.tsNo)
				},
			}, {
				$set: {
					onUpdDate: this.time
				}
			});
		}
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
					trip: 1
				}
			}
		]);

		if (fdGR.length) {

			let rtNo = await Trips.aggregate([
				{
					$match: {
						_id: {$in: fdGR.map(o => o.trip)},
						"advSettled.tsNo": {$exists: true}
					}
				},
				{
					$project: {
						"advSettled.tsNo": 1
					}
				}
			]);

			await Trips.updateMany({
				"advSettled.tsNo": {
					$in: rtNo.map(o => o.advSettled.tsNo)
				},
			}, {
				$set: {
					onUpdDate: this.time
				}
			});
		}
	}
}
