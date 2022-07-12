const moment = require('moment');
const TripAdvance = commonUtil.getModel("TripAdvances");
const Dues = commonUtil.getModel("dues");
const TripGr = commonUtil.getModel("tripGr");
const Voucher = commonUtil.getModel("voucher");
const VehicleProfitModel = commonUtil.getModel("vehicleProfit");
let telegram = require("../../../utils/telegramBotUtil");

module.exports = class VehicleProfit {
	constructor(from, to) {
		this.finalData = [];
		this.start = moment().add(-1, 'day').startOf('day');
		this.end = moment().endOf('day');
		this.time = moment().add(-5, 'hour').toDate();
		if (from)
			this.start = moment(from).startOf('day');
		if (to)
			this.end = moment(to).endOf('day');
		this.from = from;
		this.to = to;
	}

	async exec() {
		while (this.start.isBefore(this.end)) {
			this._from = this.start.clone().startOf('day');
			this._to = this._from.clone().endOf('day');
			console.log('[Vehicle Profit] from : ' + this._from.format('DD-MM-YYYY') + ' to : ' + this._to.format('DD-MM-YYYY'))
			await this._startCache();
			this.start.add(1, 'day');
		}
	}

	async _startCache() {
		try {
			let obj ;
			for (const d of (await this.getGr())){
				obj = {};
				obj.advExp =  [];
				obj.duesExp  = [];
				obj.voucherExp = [];
				obj.vehicle = d._id.vehicle;
				obj.date = d._id.date;
				obj.revenue = d.totalFreight ? d.totalFreight:0 ;
				obj.clientId = d._id.clientId;
				if(obj.revenue > 0){
					this.finalData.push(obj);
				}
			}
			for (const d of (await this.advance())){
				obj = {};
				obj.advExp  =  [];
				obj.vehicle = d._id.vehicle;
				obj.date = d._id.date;
				obj.clientId = d._id.clientId;
				if(d.amount > 0){
					let getItems = this.finalData.find(item => item.vehicle.toString() === obj.vehicle.toString());
					if(getItems){
						getItems.advExp.push({
							amount : d.amount?d.amount:0,
							category:d._id.advanceType
						})
					}
					else{
						obj.advExp.push({
							amount : d.amount?d.amount:0,
							category:d._id.advanceType
						});
						this.finalData.push(obj);
					}

				}
			}
			for (const d of (await this.dues())){
				obj = {};
				obj.duesExp  = [];
				obj.vehicle = d._id.vehicle;
				obj.date = d._id.date;
				obj.clientId = d._id.clientId;
				if(d.amount > 0){
					let getItems = this.finalData.find(item => item.vehicle.toString() === obj.vehicle.toString());
					if(getItems){
						getItems.duesExp.push({
							amount : d.amount?d.amount:0,
							category:d._id.duesType
						})
					}
					else{
						obj.duesExp.push({
							amount : d.amount?d.amount:0,
							category:d._id.duesType
						});
						this.finalData.push(obj);
					}
				}
			}
			for (const d of (await this.voucher())){
				obj = {};
				obj.voucherExp = [];
				obj.vehicle = d._id.vehicle;
				obj.clientId = d._id.clientId;
				obj.date = d._id.date;
				if(d.amount > 0){
					let getItems = this.finalData.find(item => item.vehicle.toString() === obj.vehicle.toString());
					if(getItems){
						getItems.voucherExp.push({
							amount : d.amount?d.amount:0,
							category:"VT Expense"
						})
					}
					else{
						obj.voucherExp.push({
							amount : d.amount?d.amount:0,
							category:"VT Expense"
						});
						this.finalData.push(obj);
					}
				}
			}
			if(this.finalData.length > 0){
				await this._save();
			}
		} catch (e) {
			console.log(e);
		}
	}

	async getGr(){
    return await TripGr.aggregate([{$match:{"grDate":{$gte:new Date(this._from),$lte:new Date(this._to)},"totalFreight":{$exists:true}}},
			{$project:{
					"grDate":1,
					"vehicle":1,
					"clientId":1,
					"totalFreight":1,
			  		"date":{
						$dateToString: {
							format: "%m-%d-%Y",
							date: "$grDate",
							timezone: 'Asia/Kolkata'
						}
					}
				}}

			,{
				$group: {
					_id: {
						clientId:"$clientId",
						vehicle: "$vehicle",
						date:"$date",
					},
					totalFreight:{$sum:"$totalFreight"}
				}
			}
		])
	}

	async advance(){
		return await TripAdvance.aggregate([{$match:{"date":{$gte:new Date(this._from),$lte:new Date(this._to)},"vehicle":{$exists:true},"amount":{$exists:true},
				"advanceType":{"$in":["Happay", "Fastag","Driver Cash","Diesel"]}
			}},
			{$project:{
				    "date":1,
				    "clientId":1,
					"vehicle":1,
					"totalFreight":1,
					"advanceType":1,
					"amount":1,
					"tripAdvDate":{
						$dateToString: {
							format: "%m-%d-%Y",
							date: "$date",
							timezone: 'Asia/Kolkata'
						}
					}
				}}
			,{
				$group: {
					_id: {
						clientId:"$clientId",
						vehicle: "$vehicle",
						date:"$tripAdvDate",
						advanceType:"$advanceType",
					},
					amount:{$sum:"$amount"}
				}
			}
		])
	}

	async dues(){
		return await Dues.aggregate([{$unwind:{path:"$aVehCollection",	preserveNullAndEmptyArrays: true}},
			{$match:{"date":{$gte:new Date(this._from),$lte:new Date(this._to)},"aVehCollection.veh":{$exists:true},"aVehCollection.amount":{$exists:true}
				}},
			{$project:{
				    "clientId":1,
					"duesType":1,
					"date":1,
					"vehicle":"$aVehCollection.veh",
					"amount":"$aVehCollection.amount",
					"duesDate":{
						$dateToString: {
							format: "%m-%d-%Y",
							date: "$date",
							timezone: 'Asia/Kolkata'
						}
					}
				}}
			,{
				$group: {
					_id: {
						clientId:"$clientId",
						vehicle: "$vehicle",
						date:"$duesDate",
						duesType:"$duesType",
					},
					amount:{$sum:"$amount"}
				}
			}
		])
	}

	async voucher(){
		return await Voucher.aggregate([{$unwind:{path:"$vehicleExp.items",	preserveNullAndEmptyArrays: true}},
			{$match:{"date":{$gte:new Date(this._from),$lte:new Date(this._to)},"vehicleExp.items.vehicle":{$exists:true},"vehicleExp.items.amount":{$exists:true}
				}},
			{$project:{
				    "date":1,
				    "clientId":1,
					"vehicle":"$vehicleExp.items.vehicle",
					"amount":"$vehicleExp.items.amount",
					"voucherDate":{
						$dateToString: {
							format: "-%m-%d-%Y",
							date: "$date",
							timezone: 'Asia/Kolkata'
						}
					}
				}}
			,{
				$group: {
					_id: {
						clientId:"$clientId",
						vehicle: "$vehicle",
						date:"$voucherDate"
					},
					amount:{$sum:"$amount"}
				}
			}
		])
	}

	async _save() {
		let bulkUpdateQuery = this.finalData.map(d => ({
			updateOne: {
				filter: {
					vehicle: d.vehicle,
					clientId: d.clientId,
					date:{$gte:new Date(d.date).setHours(0,0,0,0),$lte:new Date(d.date).setHours(23,59,59,999)}
				},
				update: {
					$set: JSON.parse(JSON.stringify(d)),
				},
				upsert: true
			}
		}));

		this.finalData = [];
		if (bulkUpdateQuery.length) {
			let aBatchSize = 50;
			if (bulkUpdateQuery.length > aBatchSize) {
				let nC = parseInt( bulkUpdateQuery.length / aBatchSize);
				console.log("no of itr", nC);
				for (let b = 0; b <= nC; b++) {
					let nArray = bulkUpdateQuery.slice(b * aBatchSize, (b + 1) * aBatchSize);
					if (nArray.length) {
						await VehicleProfitModel.bulkWrite(nArray, {ordered: false});
					}
					console.log("batch", b);
				}
			} else if (bulkUpdateQuery.length) {
				await VehicleProfitModel.bulkWrite(bulkUpdateQuery,{ordered: false});
			}
		}
		// telegram.sendMessage(bulkUpdateQuery.length + " trip caching completed for ");
	}

}

