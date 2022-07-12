const moment = require('moment');
const LastSettlementCacheModal = commonUtil.getModel("lastSettlementCache");
const Trips = commonUtil.getModel("trip");
const TripAdvance = commonUtil.getModel('TripAdvances');
const RegVeh = commonUtil.getModel('registeredVehicle');
let telegram = require("../../../../utils/telegramBotUtil");

module.exports = class LastSettlementCache {

	constructor() {
	}

	async exec() {
		try {
			console.log('[last settlement cache] start time: ', moment().toString());
			let mark_settle_date = new Date();
			mark_settle_date.setDate(mark_settle_date.getDate() - 365);
			//ideally last settlement should be done withn 180 days ie 6 months
			let aVeh = await this._getVehicles();

			telegram.sendMessage('[Last  settled cache] start for : ',aVeh.length);
			for(let v=0;v<aVeh.length;v++){
				let msg = '[Last  settled cache] start for : ' + aVeh[v].vehicle_reg_no;
				console.log(msg);
				let oFil = {vehicle_id:aVeh[v]._id,
					// mark_settle_date:mark_settle_date
				};
				let aRtVehicleWise = await this._getRtVehicleWise(oFil);
				if(aRtVehicleWise.length){
					aRtVehicleWise = await this._fetchAndUpdateTripAndAdvanceAfterLastRT(aRtVehicleWise);
					await this._save(aRtVehicleWise);
				}
			}
			console.log('[last settlement cache] end time: ', moment().toString());
			telegram.sendMessage('[Last  settled cache] end time : ',moment().toString());
		} catch (e) {
			telegram.sendMessage('[Last  settled error]  : ',e.message);
			console.log(e);
		}
	}

	async _getRtVehicleWise(oFil){
		let date = new Date();
		date.setDate(date.getDate() - 90);
		let project = {
			"clientId": 1,
			"vehicle": 1,
			"driver": 1,
			"start_date": 1,
			"end_date": 1,
			"route": 1,
			"extraKm": 1,
			"transportroutes":1,
			"totalKM":1,
			"rtNo":1
		};
		let oFilter = {
			"advSettled.tsNo": {
				"$exists": true
			},
			"start_date":{
				$gte:date,
				$lte:new Date()
			},
			/*
			"ownershipType": {
				"$in": ["Own", "Associate"]
			},
			 */
			// "markSettle.isSettled" : true,
			// settled : true,
			isCancelled: false,
			driver: {$exists: true}
		}
		if(oFil && oFil.vehicle_id){
			oFilter.vehicle = oFil.vehicle_id;
		}
		if(oFil && oFil.mark_settle_date){
			oFilter["markSettle.date"] = {$gte:oFil.mark_settle_date}
		}

		let aggrPipe = [
			{
				"$match": oFilter
			},
			{
				"$sort": {
					"end_date": -1
				}
			},
			{
				"$group": {
					"_id": {ts:"$advSettled.tsNo",cl:"$clientId"},
					"vehicle": {
						"$first": "$vehicle"
					},
					"driver": {
						"$first": "$driver"
					},
					"rtNo": {
						"$first": "$advSettled.tsNo"
					},
					"mDate": {
						"$first": "$markSettle.date"
					},
					"cDate": {
						"$first": "$advSettled.date"
					},
					"start_date": {
						"$last": "$start_date"
					},
					"end_date": {
						"$first": "$end_date"
					},
					"totalKM": {
						"$sum": "$totalKM"
					},
					"clientId":{
						"$first": "$clientId"
					},
					"transportroutes":{
						"$first": "$transportroutes"
					},
					"route":{
						"$first": "$route"
					},
					"extraKm":{
						"$first": "$extraKm"
					},
				}
			},
			{
				"$sort": {
					"end_date": -1
				}
			},
			{$limit:1},//TODO done only for vehiclewise
			{
				"$lookup": {
					"from": "registeredvehicles",
					"localField": "vehicle",
					"foreignField": "_id",
					"as": "vehicle"
				}
			},
			{
				"$unwind": {
					"path": "$vehicle",
					"preserveNullAndEmptyArrays": true
				}
			},
		];

		project = this._createCopy(project);
		project.tsNo = 1;
		project.vehicle = {
			_id: 1,
			owner_group: 1,
			segment_type: 1,
			vehicle_no: "$vehicle.vehicle_reg_no"
		};

		aggrPipe.push(
			{
				$project: project
			},
			{
				"$lookup": {
					"from": "drivers",
					"localField": "driver",
					"foreignField": "_id",
					"as": "driver"
				}
			},
			{
				"$unwind": {
					"path": "$driver",
					"preserveNullAndEmptyArrays": true
				}
			});

		project = this._createCopy(project);
		project.vehicle.vehicle_no = 1;
		project.driver = {
			_id: 1,
			name: 1,
			code: "$driver.employee_code",
			nameCode: 1
		};
		project.driver.code = 1;
		aggrPipe.push(
			{
				$project: project
			},
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
			});

		project = this._createCopy(project);
		delete project.route;
		delete project.extraKm;
		project.totalKM = { $add: [{$ifNull: ["$route.route_distance", 0]} , {$ifNull: ["$extraKm", 0]}] };

		aggrPipe.push(
			{
				$project: project
			},
			{
				"$group": {
					"_id": "$vehicle._id",
					"data": {
						$first: "$$ROOT"
					}
				}
			}
		);

		return await Trips.aggregate(aggrPipe);
	}

	async _fetchAndUpdateTripAndAdvanceAfterLastRT(aRtVehicleWise){
		try {
			let aData = [];
			for(const obj of aRtVehicleWise){
				let data = obj.data;
				let oFilTr = {
					vehicle : obj._id,
					start_date : {
						$gt : new Date(data.end_date)
					}
				};
				let aggrTrip = [
					{$match:oFilTr},
					{$project:{route:1,category:1,vehicle:1}},
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
					{
						"$group": {
							"_id": "$vehicle",
							loaded: {"$sum": {"$cond": [{"$eq": ['$category', 'Loaded']}, 1, 0]}},
							empty: {"$sum": {"$cond": [{"$eq": ['$category', 'Empty']}, 1, 0]}},
							rKm:{$sum:{$ifNull: ["$route.route_distance", 0]}},
							tTrips: {"$sum": 1}
						}
					}
				];

				data.postRtTrip =  await Trips.aggregate(aggrTrip).allowDiskUse();
				if(data.postRtTrip && data.postRtTrip[0]){
					data.postRtTrip = data.postRtTrip[0];
				}

				let aTrpAdvPipe = [
					{
						$match:{
							vehicle : obj._id,
							//trip : { $exists : false},
							date : {
								$gt: new Date(data.end_date)
							}
						}
					},
					{
						"$group": {
							"_id": "$vehicle",
							driverCash: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Driver Cash']}, "$amount", 0]}},
							diesel: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Diesel']}, "$amount", 0]}},
							dieselLtr: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Diesel']}, "$dieseInfo.litre", 0]}},
							fastag: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Fastag']}, "$amount", 0]}},
							happay: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Happay']}, "$amount", 0]}},
							totalAdv: {"$sum": "$amount"},

						}
					}
				];
				data.postRtAdv  = await TripAdvance.aggregate(aTrpAdvPipe).allowDiskUse();
				if(data.postRtAdv && data.postRtAdv[0]){
					data.postRtAdv = data.postRtAdv[0];
				}
				delete data._id;
				aData.push(data);

			}

			return aData;
		}catch (e) {
			throw(e);
		}
	}

	async _save(aRtVehicleWise) {
		let bulkUpdateQuery = aRtVehicleWise.map(data => ({
			updateOne: {
				filter: {
					"vehicle._id" : data.vehicle._id,
				},
				update: {
					$set: data,
				},
				upsert: true
			}
		}));

		const batchSize = 500;
		for(let i = 0; i<bulkUpdateQuery.length; i+=batchSize){
			await LastSettlementCacheModal.bulkWrite(bulkUpdateQuery.slice(i, i+batchSize));
		}

	}

	async _getVehicles(){
		let aggrPipe = [{
			$match:{
				"ownershipType": {
					"$in": ["Own", "Associate"]
				},
				// _id:mongoose.Types.ObjectId("5ba0077add415d23b49336d9"),
				deleted:{$not:{$eq:true}}
			}
		},
			{$project:{_id:1,vehicle_reg_no:1}}];
		return await RegVeh.aggregate(aggrPipe);
	}

	_createCopy(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
}
