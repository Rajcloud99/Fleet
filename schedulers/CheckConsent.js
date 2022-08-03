const moment = require('moment');
const request = require("request-promise");
const Trips = commonUtil.getModel("trip");
const mongoose = require('mongoose');

module.exports = class checkConsent {
	constructor(clientId) {
		this.clientId = clientId;
	}

	async exec() {
		return await this._startCache(await this.checkConsentData());
	}

	async _startCache(data) {
		try {
			console.log('[Trip consent cache] start time: ', moment().toString());
			if(data.length){
				for(const d of data){
					let checkConsentData = await this._fetchDataFromTraqoApi(d.driver.prim_contact_no);

					if(checkConsentData && checkConsentData.consent){
						let updated = await Trips.update({_id: mongoose.Types.ObjectId(d._id)}, {$set:{
								consent:checkConsentData.consent
							}});
					}
				}
			}
			console.log('[Trip consent cache] end time: ', moment().toString());
		} catch (e) {
			console.log(e);
		}
	}

	async checkConsentData() {
		let aggrQuery = [
			{
				$match: {
					clientId: this.clientId,
					traqoTripId:{$exists:true},
					consent:"PENDING",
					isCancelled:false,
					status: {$in: ["Trip not started", "Trip started"]},
				}},
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
					"path": '$driver',
					"preserveNullAndEmptyArrays": true
				}
			},
			{$match: {"driver.prim_contact_no": {$exists: true}}},
			{$project: {
					clientId: 1,
					"driver.prim_contact_no": 1
				}
			}
		];
		let trip = await Trips.aggregate(aggrQuery).allowDiskUse(true);
		if (trip && trip[0]) {
			return trip;
		} else {
			return [];
		}
	}

	async _fetchDataFromTraqoApi(mobileNo) {
		try {
			const option = {
				strictSSL: false,
				method: config.traqoApi.getConsent.method,
				url: config.traqoApi.getConsent.url,
				body: JSON.stringify({
					"tel":  mobileNo.toString()
				}),
				'headers': {
					'Authorization': 'Basic OTUzNTg4ODczODo5NTM1ODg4NzM4QDEyMw==',
					'Content-Type': 'application/json'
				},
				//json: true
			};
			let data = await request(option);
			if (data) {
				return JSON.parse(data);
			} else {
				return undefined;
			}
		} catch (e) {
			console.error('[Tracqo Api  error]', e);
			return null;
		}
	}

}


