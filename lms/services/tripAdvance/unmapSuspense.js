const TripAdvance = commonUtil.getModel('TripAdvances');
const TripV2 = commonUtil.getModel("trip");
const Logs = commonUtil.getModel('logs');
const moment = require('moment');
let telegram = require("../../../utils/telegramBotUtil");
module.exports = class unmapSuspense{
	constructor() {
		this.aSuspence = [];
		this.aDeletedAdvance = [];
		this.time = moment().add(-5, 'hour').toDate();
	}

	async exec(){
		// let say,
		// t1 <- - -> a1, t1 and a1 were suspense linked,
		// and say,
		// 1) a1 is linked to t2. (a1 is no more suspense).
		// 2) a1 is deleted.
		// so, for above case,
		// t1 <- / -> a1, (pull a1 from t1) remove a1 suspense linking from t1
		// unset a1 suspence trip key if advance is not deleted.
		// update t1 date so that it could be included in later cache.

		console.log('unmap suspense start');
		await this._getAdvance();
		if(this.aSuspence.length){
			console.log('Found ', this.aSuspence.length, 'Record to unmap');
			telegram.sendMessage('Found ' +  this.aSuspence.length + 'Record to unmap');
			await this._unmapSuspense();
			telegram.sendMessage(this.aSuspence.length + 'Records unmapped');
			console.log(this.aSuspence.length, 'Record were unmapped and trip updated');
		}else
			console.log(this.aSuspence.length, 'Record found');
		await this._getDeletedAdvances();
		console.log('Found ', this.aDeletedAdvance.length, 'Record to unmap that were deleted');
		await this._unmapDeletedAdvance();
		console.log('unmap suspense end');
	}

	async _getAdvance() {
		let aggrQuery = [{
			$match: {
				advanceType: {$in: ["Diesel", "Driver Cash", "Happay", "Fastag"]},
				trip: {$exists: true},
				suspenseTrip: {$exists: true}
			}
		}, {
			$project:{
				_id: 1,
				suspenseTrip: 1
			}
		}];

		this.aSuspence = await TripAdvance.aggregate(aggrQuery).allowDiskUse(true);
	}

	async _getDeletedAdvances(){
		//let startDate = new Date();
		//startDate.setDate(startDate.getDate() -1);
		//from yesterday
		this.aDeletedAdvance = (await Logs.find({
			date: {
				$gte: moment().add('-1', 'day').startOf('day').toDate(),
				$lt: moment().endOf('day').toDate()
			},
			category: 'delete',
			refTo: "tripadvances"
		}, {
			_id: 0,
			docId: 1
		}).lean()).map(o => o.docId);
	}

	async _unmapSuspense(){
		let cnt = 0;
		for(let suspense of this.aSuspence){
			cnt++;
			if(cnt%100 == 0){
				console.log(cnt,this.aSuspence.length);
			}
			try {
				let oUp = await TripV2.updateOne({
					suspenseAdv: suspense._id
				}, {
					$pull:{
						suspenseAdv: suspense._id
					},
					$set: {
						onUpdDate: this.time
					}
				});
				//console.log(oUp);
			}catch (e) {
				console.log(e);
				throw e;
			}
		}

		try {
			await TripAdvance.updateMany({
				_id: this.aSuspence.map(o => o._id)
			}, {
				$unset: {
					suspenseTrip: 1
				}
			});
		}catch (e) {
			console.log(e);
		}
	}

	async _unmapDeletedAdvance() {
		await TripV2.updateMany({
			suspenseAdv: {$in: this.aDeletedAdvance}
		},{
			$pull:{
				suspenseAdv: {$in: this.aDeletedAdvance}
			},
			$set: {
				onUpdDate: this.time
			}
		})
	}
}
