// below code will link the advances to trip as suspense
const TripAdvance = commonUtil.getModel('TripAdvances');
const TripV2 = commonUtil.getModel("trip");
const moment = require('moment');
let telegram = require("../../../utils/telegramBotUtil");


module.exports = class MapSuspense {
	constructor() {
		this.aSuspence = [];
		this.time = moment().add(-5, 'hour').toDate();
	}

	async exec() {
		console.log('Map suspense start');
		await this._getAdvance();
		if (this.aSuspence.length) {
			console.log('Found ', this.aSuspence.length, 'Record to Map');
			telegram.sendMessage('Found ', this.aSuspence.length, 'trip suspense Record to Map');
			await this._mapSuspense();
			console.log(this.aSuspence.length, 'Record were mapped and trip updated');
			telegram.sendMessage(this.aSuspence.length, 'Record were mapped and trip updated');
		} else
			console.log(this.aSuspence.length, 'Record found to map');
	}

	async _getAdvance() {
		let startDate = new Date();
		startDate.setDate(startDate.getDate() -1);
		//from yesterday
		let aggrQuery = [{
			$match: {
				trip: {$exists: false},
				date: {$gte: moment(startDate).startOf('day').toDate()},
				advanceType: {
					$in: ["Diesel", "Driver Cash", "Happay", "Fastag"]
				},
				suspenseTrip:{$exists: false}
			}
		},
			{
			$project: {
				_id: 1,
				date: 1,
				vehicle: 1,
				suspenseTrip: 1
			}
		}, {
			$group: {
				_id: {
					date:'$date',
					vehicle: "$vehicle"
				},
				date:{$last:'$date'},
				aId: {$push: "$_id"},
				data: {$push: "$$ROOT"}
			}},
			{$sort:{date:1}}
		];
        try{
			this.aSuspence = await TripAdvance.aggregate(aggrQuery).allowDiskUse(true);
			console.log(this.aSuspence.length);
		}catch (e) {
			console.error(e);
		}
	}

	async _mapSuspense() {
		let cnt = 1;
		for (let suspense of this.aSuspence) {
			try {
				await this._mapToTrip(suspense);
				if(cnt%100 == 0){
					telegram.sendMessage(cnt + " done /" +this.aSuspence.length);
				}
				cnt++;
			} catch (e) {
				//telegram.sendMessage('error during adv mapping',e.toString(),e.message);
				console.log(e);
			}
		}
	}

	async _getTrip(advanceDate, vehicleId) {
		advanceDate = moment(advanceDate, "DD-MM-YYYY").toDate();
		let aTrip = await TripV2.aggregate([
			{
				$match: {
					isCancelled: false,
					start_date: {$lte: advanceDate},
					end_date: {$gte: advanceDate},
					vehicle: vehicleId
				}
			},
			{
				$project: {
					_id: 1,
					start_date: 1,
					'advSettled.tsNo':1,
					trip_no:1,
					driver:1
				}
			},
			{
				$sort: {
					start_date: -1
				}
			},
			{
				$limit: 1
			}
		]);
		return aTrip[0];
	}

	async _getNearestTrip(advanceDate, vehicleId) {
		advanceDate = moment(advanceDate, "DD-MM-YYYY").toDate();
		let aTrip = await TripV2.aggregate([
			{
				$match: {
					isCancelled: false,
					start_date: {$lte: advanceDate},
					vehicle: vehicleId
				}
			},
			{
				$project: {
					_id: 1,
					start_date: 1
				}
			},
			{
				$sort: {
					start_date: -1
				}
			},
			{
				$limit: 1
			}
		]);
		return aTrip[0];
	}

	async _mapToTrip(suspense) {
		let foundTrip = await this._getTrip(suspense._id.date, suspense._id.vehicle);
		let mappedWithActualTrip = false;
		if(foundTrip && foundTrip._id && !(foundTrip.advSettled && foundTrip.advSettled.tsNo)) {
			await TripV2.updateOne({_id: foundTrip._id}, {
				$addToSet: {
					advanceBudget: {$each: suspense.aId}
				},
				$set: {
					onUpdDate: this.time
				}
			});
			await TripAdvance.updateMany({
				_id: {$in: suspense.aId}
			}, {
				$set: {
					trip: foundTrip._id,
					trip_no:foundTrip.trip_no,
					driver: foundTrip.driver
				}
			});
			mappedWithActualTrip = true;
		}
		if(!(foundTrip && foundTrip._id)){
			foundTrip = await this._getNearestTrip(suspense._id.date, suspense._id.vehicle);
		}

		if (!(foundTrip && foundTrip._id)) {
			throw new Error("No Trip found " + suspense._id.date + " - "+  suspense._id.vehicle + suspense.aId.join(','));
		}

		// let say,
		// t1 <- - -> a1, t1 and a1 were suspense linked,
		// and say,
		// 1) a1 vehicle modified.
		// 2) a1 date modified.
		// 3) a1 was linked to a2 by finding the nearest trip, & now user generate t2 which a1 should link to.
		// 4) any basic info was updated.
		// so, for above case,
		// t1 <- / -> a1, (pull a1 from t1) remove t1 suspense linking from a1
		// t2 <- - -> a1 (update t2 with a1, update a1 with t2)

		for (let oAdv of suspense.data) {
			if (oAdv.suspenseTrip && oAdv.suspenseTrip.toString() != foundTrip._id.toString()) {
				await TripV2.updateOne({_id: oAdv.suspenseTrip}, {
					$pull: {
						suspenseAdv: oAdv._id
					},
					$set: {
						onUpdDate: this.time
					}
				});
			}
		}
       if(!mappedWithActualTrip){
       	//map to nearest trip
		   await TripV2.updateOne({_id: foundTrip._id}, {
			   $addToSet: {
				   suspenseAdv: {$each: suspense.aId}
			   },
			   $set: {
				   onUpdDate: this.time
			   }
		   });

		   try {
			   await TripAdvance.updateMany({
				   _id: {$in: suspense.aId}
			   }, {
				   $set: {
					   suspenseTrip: foundTrip._id
				   }
			   });
		   } catch (e) {
			   // revert trip update operation in case of any error
			   await TripV2.updateOne({_id: foundTrip._id}, {
				   $pull: {
					   suspenseAdv: {$in: suspense.aId}
				   }
			   });

			   throw e;
		   }
	   }
	}
}
