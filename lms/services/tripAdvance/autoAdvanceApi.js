const moment = require('moment');
const TripAdvance = commonUtil.getModel('TripAdvances');
const RegisteredVehicle = commonUtil.getModel('registeredVehicle');
const VoucherServiceV2 = commonUtil.getService('voucher');
let Trip = commonUtil.getModel('trip');
const telegram = require("../../../utils/telegramBotUtil");
const request = require('request-promise');

module.exports = class {
	constructor(from, to, clientId) {
		this.ref = [];
		this.clientId = clientId.clientId;
		this.start = moment().add(-1, 'day').startOf('day');
		this.end = moment().endOf('day');
		if (from){
			this.start = new Date(from)
			this.start.setHours(0,0,0,0);
			this.start = moment(this.start);
		}

		if (to){
			this.end = new Date(to)
			this.end.setHours(0,0,0,0);
			this.end =  moment(this.end);
		}
	}

	async exec() {
		while (this.start.isBefore(this.end)) {
			let from = this.start.clone().startOf('day');
			let to = this.start.clone().endOf('day');
			console.log('[Trip advance fastag running] from : ' + this.start.format('DD-MM-YYYY') + ' to : ' + to.format('DD-MM-YYYY'))
			await this._startCache(from, to);
			this.start.add(1, 'day');
		}
	}

	async _startCache(from, to) {
		try {
			let aFoundData = await this._fetchDataFromApi(from, to);
			if(aFoundData && aFoundData.length){
				let {aAdvance, aError} = await this._transform(aFoundData);
				if (aError.length) {
					console.log("Trip advance fastag cahce  error: " + JSON.stringify(aError));
					telegram.sendMessage("Trip advance fastag cahce error: " + JSON.stringify(aError));
				}
				await this._save(aAdvance);
			}else{
				console.log("Trip advance fastag No data for ", from,to);
			}

		} catch (e) {
			console.log(e);
		}
	}

	async _fetchDataFromApi(from, to) {
		try {
			let fromDay = new Date(from).getDate();
			let fromMonth = new Date(from).getMonth() + 1;
			let fromYear = new Date(from).getFullYear();
			let toDay = new Date(to).getDate();
			let toMonth = new Date(to).getMonth() + 1;
			let toYear = new Date(to).getFullYear();
			const option = {
				method: 'POST',
				uri: config.fastagApi.url,
				body: {
					"requestTime": "2021107114735",
					"fromDate": fromYear.toString() + (fromMonth.toString().length > 1 ? fromMonth.toString() : ("0" + fromMonth.toString())) + (fromDay.toString().length > 1 ? fromDay.toString() : ("0" + fromDay.toString())),
					"walletId": "W0121063012533380030",
					"merchantID": "HDFCWL",
					"requestID": "001",
					"toDate": toYear.toString() + (toMonth.toString().length > 1 ? toMonth.toString() : ("0" + toMonth.toString())) + (toDay.toString().length > 1 ? toDay.toString() : ("0" + toDay.toString())),
					"contactNumber": "",
					"vehicleNumber": "",
					"requestSource": "BD"
				},
				headers: {
					"Authorization": config.fastagApi.auth,
					"Content-Type": "application/json",
					"salt": config.fastagApi.salt
				},
				json: true
			};
			let data = await request(option);
			if (data && data.resMessage === "SUCCESS" && Array.isArray(data.data)){
				return data.data;
			}else{
				return [];
			}
		} catch (e) {
			console.error('[Fastag Api  error]', e);
			telegram.sendMessage('[Fastag Api error] ' + e.message);
			return [];
		}
	}

	async _transform(aData) {
		let aAdvance = [],
			aError = [],
			oCounter = {};

		for (let oData of aData) {
			let oAdvance = {
				clientId: this.clientId,
				advanceType: "Fastag",
				date: new Date(oData.tollTxnDateTime),
				amount: oData.txnAmt,
				partnerRefId: oData.partnerRefId,
				"from_account": config.fastagApi.fastagFromAccount,
				"branch": config.fastagApi.branch,
			};

			let aVehPipe = [{
				$match:{
					clientId: this.clientId,
					vehicle_reg_no: oData.vehicleNo || new RegExp(oData.vehicleNo, 'i'),
					ownershipType: {$in: ['Own', 'Associate', 'Sold']}
				}
			},
				{
					$lookup: {
						from: "vendortransports",
						localField: "vendor_id",
						foreignField: "_id",
						as: "vendor_id"
					}
				},
				{
					$unwind: {
						path: "$vendor_id",
						preserveNullAndEmptyArrays: true
					}
				},
				{$project:{last_known: 1, status: 1,vehicle_reg_no: 1,ownershipType: 1,driver: 1,account: 1,_id: 1,'vendor_id.account': 1,'vendor_id._id': 1,'vendor_id.name': 1}}
			];
			let vehicleAccount = await RegisteredVehicle.aggregate(aVehPipe);
			if(!vehicleAccount ||  !vehicleAccount[0]){
				aError.push({
					vehicleNo: oData.vehicleNo,
					partnerRefId: oData.partnerRefId,
					message: "Vehicle not found"
				});
				continue;
			}else{
				vehicleAccount = vehicleAccount[0];
			}

			if (!vehicleAccount) {
				aError.push({
					vehicleNo: oData.vehicleNo,
					partnerRefId: oData.partnerRefId,
					message: "Vehicle Account not found"
				});
				continue;
			} else if (!vehicleAccount.account) {
				aError.push({
					vehicleNo: oData.vehicleNo,
					partnerRefId: oData.partnerRefId,
					message: `Account not linked on vehicle ${oData.vehicleNo}`
				});
				continue;
			} else if (
				vehicleAccount.ownershipType !== 'Own'
				&& vehicleAccount.ownershipType !== 'Sold'
				&& !(vehicleAccount.vendor_id && vehicleAccount.vendor_id.account && vehicleAccount.vendor_id.account[0])
			) {
				aError.push({
					vehicleNo: oData.vehicleNo,
					partnerRefId: oData.partnerRefId,
					message: `Account not linked to vehicle's vendor`
				});
				continue;
			}

			if (vehicleAccount.ownershipType === 'Own' || vehicleAccount.ownershipType === 'Sold') {
				oAdvance.to_account = vehicleAccount.account;
				oAdvance.to_account_name = oAdvance.person = vehicleAccount.vehicle_reg_no;
			} else {
				if (vehicleAccount.vendor_id && vehicleAccount.vendor_id.account && vehicleAccount.vendor_id.account[0]) {
					let clientId = this.clientId;
					for (let v = 0; v < vehicleAccount.vendor_id.account.length; v++) {
						if (vehicleAccount.vendor_id.account[v].clientId == clientId) {
							oAdvance.to_account = vehicleAccount.vendor_id.account[v].ref;
							oAdvance.to_account_name = vehicleAccount.vendor_id.name;
						}
					}
				}
				oAdvance.vendor = vehicleAccount.vendor_id && vehicleAccount.vendor_id._id;
			}

			if (vehicleAccount && vehicleAccount.last_known && vehicleAccount.last_known.trip){
				let advanceDate = moment(oAdvance.date, "DD-MM-YYYY").toDate();
				let trip =  await Trip.aggregate([{$match:{
						_id: vehicleAccount.last_known.trip,
						isCancelled: false,
						"$or":[{start_date: {$lte: advanceDate}},{start_date: {$lte: advanceDate},end_date: {$gte: advanceDate}}]
						// start_date: {$lte: advanceDate},
						// end_date: {$gte: advanceDate},
					}},{
					$project:{trip_no: 1,
						_id: 1,
						advSettled: 1,
						markSettle:1}
				}])
				if (trip && trip.length > 0) {
					trip = trip[trip.length - 1];
					if (trip.advSettled && trip.advSettled.isCompletelySettled) {
						aError.push({
							vehicleNo: oData.vehicleNo,
							partnerRefId: oData.partnerRefId,
							message: "Trip is already completely settled"
						});
					}
					else if (trip.markSettle && trip.markSettle.isSettled) {
						aError.push({
							vehicleNo: oData.vehicleNo,
							partnerRefId: oData.partnerRefId,
							message: "Trip is already mark settled"
						});
					}
				    else {
						oAdvance.trip_no = trip && trip.trip_no;
						oAdvance.trip = trip && trip._id;
					}
				}
				else{
					aError.push({
						vehicleNo: oData.vehicleNo,
						partnerRefId: oData.partnerRefId,
						message: "Trip is not linked"
					});
				}
			}else{
				aError.push({
					vehicleNo: oData.vehicleNo,
					partnerRefId: oData.partnerRefId,
					message: "Trip is not linked"
				});
			}
			oAdvance.vehicle_no = vehicleAccount.vehicle_reg_no;
			oAdvance.vehicle = vehicleAccount._id;
			oAdvance.driver = vehicleAccount.driver;
			oAdvance.remark = '; vehicleNo: ' + oAdvance.vehicle_no ;
			this.ref.push(oData.partnerRefId);
			aAdvance.push(oAdvance);
		}

		const st3 = new Date().toISOString();
		const st4 = (st3.slice(2,4));   //year
		const st5 = (st3.slice(5,7));    //month
		const st6 = (st3.slice(8,10));    //date
		let fastTag = await TripAdvance.findOne({reference_no: (new RegExp("F" + st4 + st5 + st6))}, {reference_no: 1}).sort({reference_no: -1}).limit(1);  ////generate Ref
		let fastagRef = fastTag && fastTag.reference_no;
		for(const d of aAdvance){
			let str5;
			if (fastagRef) {
				const str0 = fastagRef.toString().slice(5,7);
				const st1 = new Date().toISOString();
				const st2 = (st1.slice(8,10));
				const st = fastagRef.toString().slice(7,13);
				if (st2 === str0) {
					str5 = st;
				}
				else {
					str5 = "00000";
				}
			}
			else {
				str5 = "00000";
			}
			let str1 = "F";
			let str = new Date().toISOString();
			const str2 = (str.slice(2, 4));
			const str3 = (str.slice(5, 7));
			const str4 = (str.slice(8, 10));
			let a = parseInt(str5);
			a++;
			const str8 = a.toString();
			const len1 = str8.length;
			const str9 = (str5.slice(0, 5 - len1));
			const str10 = str9.concat(str8);
			const RefData = str1.concat(str2, str3, str4, str10);
			d.reference_no = RefData;
			fastagRef = RefData
		}

		// let billBOOK = await  BillBook.findOne({_id:mongoose.Types.ObjectId(config.fastagApi.billBook)},{format:1,current:1});
		// let num = billBOOK.current;
		// for(const d of aAdvance){
		// 	d.reference_no = await billBookService.genBookNoOfAuto(billBOOK.format, num);
		// 	num++;
		// 	let billBOOKUpdate = await  BillBook.update({_id:mongoose.Types.ObjectId(config.fastagApi.billBook)},{$set:{current:num}});
		// }

		let aRefNo = aAdvance.map(o => o.reference_no);
		let refExist = await TripAdvance.aggregate([{
			$match: {reference_no: {$in: aRefNo}, clientId: this.clientId}
		}, {$project: {reference_no: 1, vehicle_no: 1, editable: 1, linkable: 1}}]);
		if (refExist && refExist.length) {
			refExist.forEach(o => {
				let index = aAdvance.findIndex(oAdv => oAdv.reference_no === o.reference_no);
				if(index === -1)
					return;
				let oAdv = aAdvance[index];
				aError.push({
					vehicleNo: oAdv.vehicle_no,
					partnerRefId: oAdv.partnerRefId,
					message: `Advance already exists with RefNo ${oAdv.reference_no}`
				});
				aAdvance.splice(index, 1);
			});
		}
		let aPartnerRefId = aAdvance.map(o => o.partnerRefId);
		let voucherExist = await TripAdvance.aggregate([{
			$match: {partnerRefId: {$in: aPartnerRefId}, clientId: this.clientId, voucher:{$exists:true}}
		}, {$project: {partnerRefId: 1, vehicle_no: 1, editable: 1, linkable: 1}}]);
		if (voucherExist && voucherExist.length) {
			voucherExist.forEach(o => {
				let index = aAdvance.findIndex(oAdv => oAdv.partnerRefId === o.partnerRefId);
				if(index === -1)
					return;
				let oAdv = aAdvance[index];
				aError.push({
					vehicleNo: oAdv.vehicle_no,
					partnerRefId: oAdv.partnerRefId,
					message: `Advance already import to account ${oAdv.partnerRefId}`
				});
				aAdvance.splice(index, 1);
			});
		}
		let q = {refNos: aRefNo, clientId: this.clientId, deleted: false, no_of_docs: 2000};
		let refVExist = await VoucherServiceV2.findVoucherByQueryAsync(q, {refNo: 1});
		if (refVExist && refVExist.length) {
			refVExist.forEach(o => {
				let index = aAdvance.findIndex(oAdv => oAdv.reference_no === o.reference_no);
				if(index === -1)
					return;
				let oAdv = aAdvance[index];
				aError.push({
					vehicleNo: oAdv.vehicle_no,
					partnerRefId: oAdv.partnerRefId,
					message: `Voucher already exists with RefNo ${oAdv.reference_no}`
				});
				aAdvance.splice(index, 1);
			});
		}
		return {
			aAdvance,
			aError
		};
	}

	async _save(aAdvance) {
		let tripAdvUp = aAdvance.map(oAdv => {
			if (!oAdv) return null;
			return {
				updateOne: {
					filter: {
						clientId: this.clientId,
						partnerRefId: oAdv.partnerRefId
					},
					update: {
						$setOnInsert: {created_at: new Date()},
						$set: oAdv,
					},
					upsert: true
				}
			}
		}).filter(x => x !== null);

		let aBatchSize = 30;

		if (tripAdvUp.length > aBatchSize) {
			let nC = parseInt(tripAdvUp.length / aBatchSize);
			console.log("no of itr", nC);
			for (let b = 0; b <= nC; b++) {
				let nArray = tripAdvUp.slice(b * aBatchSize, (b + 1) * aBatchSize);
				if (nArray.length) {
					try{
						await TripAdvance.bulkWrite(nArray, {ordered: false});
						console.log(nArray.length, ' data saved');
					}catch(e){
						console.error('TripAdvance.bulkWrite error ',e);
					}

				}
				console.log("batch", b);
				//telegram.sendMessage(nArray.length + " Adv uploaded in batch " + config.serverName , req.user.full_name);
			}
		} else if (tripAdvUp.length) {
			try{
				let tT = await TripAdvance.bulkWrite(tripAdvUp, {ordered: false});
				console.log(tripAdvUp.length, 'trip advances created');
			}catch(e){
				console.error('TripAdvance.bulkWrite 2 error ',e);
			}

		}

		let advCopy = await TripAdvance.aggregate([{$match:{partnerRefId:{"$in":this.ref}}}]);

		let tripUpdateOp = advCopy.map(adv => {
				if (!adv) return null;
				if (!adv.trip) return null;
				return {
					updateOne: {
						filter: {_id: adv.trip},
						update: {$addToSet: {'advanceBudget': adv._id}},
						upsert: true
					}
				}
			}).filter(a => a !== null);

		if (tripUpdateOp.length > aBatchSize) {
			let nM = parseInt(tripUpdateOp.length / aBatchSize);
			console.log("no of itr T", nM);
			for (let m = 0; m <= nM; m++) {
				let kArray = tripUpdateOp.slice(m * aBatchSize, (m + 1) * aBatchSize);
				if (kArray.length) {
					await Trip.bulkWrite(kArray, {ordered: false});
				}
				console.log("trip batch", m);
				//telegram.sendMessage("Adv mapped trip " + kArray.length + " " + config.serverName , new Date().toLocaleString());
			}
		} else if (tripUpdateOp.length) {
			try{
				let aT = await Trip.bulkWrite(tripUpdateOp, {ordered: false});
				console.log("Adv mapped trip " + tripUpdateOp.length);
			}catch(e){
				console.error('Trip.bulkWrite 2 error ',e);
			}
		}
	}

}
