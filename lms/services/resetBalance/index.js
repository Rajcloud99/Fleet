const moment = require('moment');
let Accounts = commonUtil.getModel('accounts');
let Voucher = commonUtil.getModel('voucher');
let AcBal = commonUtil.getModel('accountbalances');
let telegram = require("../../../utils/telegramBotUtil");

module.exports = class ResetBalance {
	constructor(from, to, oClient) {
		this.clientId = oClient.clientId;
		this.account = oClient.account;
		this.start = moment().add('day')
		this.end = moment().endOf('day');
		this.everyHour = oClient.everyHours;
		this.checkBalance = oClient.checkBalance;
		// this.time = moment().add(-(oClient.everyHours), 'hour');
		if (from)
			this.start = moment(from).startOf('day');
		if (to)
			this.end = moment(to).endOf('day');
		this.from = from;
		this.to = to;
		this.arr = [];
	}

	async exec() {
		if (new Date(this.start).getDate() < new Date().getDate()) {
			this.start = this.start;
		} else {
			this.start = moment().add(-(this.everyHour), 'hour');
		}
		if (!this.account) {
			return console.error('account is mandatory');
		}
		// Fetch oldest voucher in cron date range time
		let aVoucher = await this._getOldestVoucherDate();

		// if oldest voucher fetch than group from that date voucher else give error
		if (!aVoucher || !aVoucher.length) {
			let msg = 'Please set opening balance on ' + this.start.format('DD-MM-YYYY') + " TO " + this.end.format('DD-MM-YYYY') + ' as no voucher exist for this date.Reset balance works only for the date for which transaction exists.';
			console.log(msg);
			if(this.checkBalance){
				this.arr.push({
					message:msg
				})
			}
		} else {
			console.log('oldest vocher edited recently '+ aVoucher[0].refNo + ' date '+aVoucher[0].date);
			if(this.checkBalance){
				this.arr.push({
					message:'oldest vocher edited recently '+ aVoucher[0].refNo + ' date '+aVoucher[0].date
				})
			}
			// pass oldest voucher date and group all voucher daywise
			let aVoucherData = await this._getCalculatedDayWiseBal(aVoucher[0]);
			let acBal = await this._getSavedDayWiseBalances(aVoucher[0]);
			let aMisMatchedDayWiseData = await this._matchDayWiseBalances(aVoucherData,acBal);
			let aMisMatchVouchers = await this._getVouchersToCheck(aMisMatchedDayWiseData);
			//write reset logic here
		}
		if(this.checkBalance){
			return this.arr;
		}
	}

	async getLedger() {
		try {
			console.log(this.cronStartDate);
			if (moment(new Date()).diff(this.cronStartDate, 'days', true) > 31) {
				console.log('Reset balance started for multiple months it will take some time')
				this._from = new Date(this.cronStartDate);
				this._to = new Date(this.cronStartDate);
				this._to.setMonth(this._from.getMonth() + 1);
				while (new Date(this.cronStartDate) < new Date()) {
					let clientId = this.clientId;
					let oAcFilter = {clientId: clientId};
					if (this.account) {
						oAcFilter._id = mongoose.Types.ObjectId(this.account)
					} else {
						console.log('account not provided ')
					}
					let Accs = await Accounts.find(oAcFilter, {balance: 1, opening_balance: 1, name: 1}).lean();
					if (Accs) {
						for (let a = 0; a < Accs.length; a++) {
							let onlyDate = dateUtil.getMorning(this.cronStartDate);
							let onlyDateEnd = dateUtil.getMorning(new Date());
							onlyDateEnd = dateUtil.addDays(onlyDateEnd, 1);
							//console.log('reseting for',onlyDate,onlyDateEnd);
							let obApr, cbApr;
							let acBal = await AcBal.findOne({
								account: Accs[a]._id,
								date: {$lte: onlyDate},
								clientId: clientId
							}).sort({date: -1}).lean();
							if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
								obApr = acBal; //consider it
							} else if (acBal) {
								cbApr = acBal;
							}
							let accId = Accs[a]._id;
							let oFil = {
								"date": {$gte: onlyDate, $lte: onlyDateEnd},
								"acImp.st": true,
								"ledgers": {$elemMatch: {"account": accId}},
								deleted: {$not: {$eq: true}},
								clientId: clientId
							};
							let oProj = {
								ledgers: {
									$filter: {
										input: "$ledgers",
										as: "ledger",
										cond: {$eq: ["$$ledger.account", accId]}
									}
								}, date: 1
							};
							let aggrQ = [
								{$match: oFil},
								{"$project": oProj},
								{"$unwind": {path: "$ledgers", preserveNullAndEmptyArrays: true}},
								{
									$group: {
										_id: {
											day: {$dayOfMonth: {date: "$date", timezone: '+05:30'}},
											month: {$month: {date: "$date", timezone: '+05:30'}},
											year: {$year: {date: "$date", timezone: '+05:30'}}
										},

										cr: {
											"$sum": {
												"$cond": [{
													"$and": [
														{"$eq": ["$ledgers.account", accId]},
														{"$eq": ["$ledgers.cRdR", 'CR']}
													]
												}, "$ledgers.amount", 0]
											}
										},
										dr: {
											"$sum": {
												"$cond": [{
													"$and": [
														{"$eq": ["$ledgers.account", accId]},
														{"$eq": ["$ledgers.cRdR", 'DR']}
													]
												}, "$ledgers.amount", 0]
											}
										},

										date: {$last: '$date'}
									}
								},
								{$sort: {date: 1}}
							];
							let aV = await Voucher.aggregate(aggrQ).allowDiskUse(true);
							let ob, cb = 0, lastCb = 0;

							let acBalUpd = aV.map(adv => {
								if (!adv) return null;
								delete adv._id;
								if (ob != undefined) {
									ob = lastCb;
									cb = ob + adv.dr - adv.cr;
									lastCb = cb;
								} else {
									if (obApr && obApr.ob) {
										ob = obApr.ob;
									} else if (cbApr && cbApr.cb) {
										ob = cbApr.cb;
									} else {
										ob = 0;
									}
									//ob = obApr && obApr.ob || 0;
									lastCb = ob + adv.dr - adv.cr;
									cb = lastCb;
								}
								//console.log(dateUtil.getMorning(adv.date), ob, cb, adv.cr, adv.dr);
								return {
									updateOne: {
										filter: {
											clientId: clientId,
											date: dateUtil.getMorning(adv.date),
											account: Accs[a]._id,
											deleted: false,
										},
										update: {
											$setOnInsert: {
												created_at: new Date(),
												deleted: false,
												account: Accs[a]._id,
												date: dateUtil.getMorning(adv.date),
												clientId: clientId
											},
											$set: {
												ob: ob,
												cb: cb,
												cr: adv.cr || 0,
												dr: adv.dr || 0
											},
										},
										upsert: true
									}
								}
							}).filter(x => x !== null);
							/*
							   if (acBalUpd.length > 0) {
								   //clear data first
								   let aRm = await AcBal.remove({
									   account: Accs[a]._id,
									   date: {$gte: onlyDate},
									   clientId: clientId
								   });
								   const AcBalStats = await AcBal.bulkWrite(acBalUpd);
								   //console.log('complete for ', a);
							   }
							   */
							telegram.sendMessage(acBalUpd.length + " Reset Balance is in progress " + this.account);
						}
					}
					this._from = new Date(this._to);
					this._to.setMonth(this._from.getMonth() + 1);
				}
			} else {
				let clientId = this.clientId;
				let oAcFilter = {clientId: clientId};
				if (this.account) {
					oAcFilter._id = mongoose.Types.ObjectId(this.account)
				} else {
					console.log('account not provided ')
				}
				let Accs = await Accounts.find(oAcFilter, {balance: 1, opening_balance: 1, name: 1}).lean();
				if (Accs) {
					for (let a = 0; a < Accs.length; a++) {
						let onlyDate = dateUtil.getMorning(this.cronStartDate);
						let obApr;
						let acBal = await AcBal.findOne({
							account: Accs[a]._id,
							date: {$gte: onlyDate},
							clientId: clientId
						}).sort({date: 1}).lean();
						if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
							obApr = acBal; //consider it
						}
						let accId = Accs[a]._id;
						let oFil = {
							"date": {$gte: onlyDate},
							"acImp.st": true,
							"ledgers": {$elemMatch: {"account": accId}},
							deleted: {$not: {$eq: true}},
							clientId: clientId
						};
						let oProj = {
							ledgers: {
								$filter: {
									input: "$ledgers",
									as: "ledger",
									cond: {$eq: ["$$ledger.account", accId]}
								}
							}, date: 1
						};
						let aggrQ = [
							{$match: oFil},
							{"$project": oProj},
							{"$unwind": {path: "$ledgers", preserveNullAndEmptyArrays: true}},
							{
								$group: {
									_id: {
										day: {$dayOfMonth: {date: "$date", timezone: '+05:30'}},
										month: {$month: {date: "$date", timezone: '+05:30'}},
										year: {$year: {date: "$date", timezone: '+05:30'}}
									},

									cr: {
										"$sum": {
											"$cond": [{
												"$and": [
													{"$eq": ["$ledgers.account", accId]},
													{"$eq": ["$ledgers.cRdR", 'CR']}
												]
											}, "$ledgers.amount", 0]
										}
									},
									dr: {
										"$sum": {
											"$cond": [{
												"$and": [
													{"$eq": ["$ledgers.account", accId]},
													{"$eq": ["$ledgers.cRdR", 'DR']}
												]
											}, "$ledgers.amount", 0]
										}
									},

									date: {$last: '$date'}
								}
							},
							{$sort: {date: 1}}
						];
						let aV = await Voucher.aggregate(aggrQ).allowDiskUse(true);
						let ob, cb = 0, lastCb = 0;

						let acBalUpd = aV.map(adv => {
							if (!adv) return null;
							delete adv._id;
							if (ob != undefined) {
								ob = lastCb;
								cb = ob + adv.dr - adv.cr;
								lastCb = cb;
							} else {
								ob = obApr && obApr.ob || 0;
								lastCb = ob + adv.dr - adv.cr;
								cb = lastCb;
							}
							//console.log(dateUtil.getMorning(adv.date), ob, cb, adv.cr, adv.dr);
							return {
								updateOne: {
									filter: {
										clientId: clientId,
										date: dateUtil.getMorning(adv.date),
										account: Accs[a]._id,
										deleted: false,
									},
									update: {
										$setOnInsert: {
											created_at: new Date(),
											deleted: false,
											account: Accs[a]._id,
											date: dateUtil.getMorning(adv.date),
											clientId: clientId
										},
										$set: {
											ob: ob,
											cb: cb,
											cr: adv.cr || 0,
											dr: adv.dr || 0
										},
									},
									upsert: true
								}
							}
						}).filter(x => x !== null);
						/*
						if (acBalUpd.length > 0) {
							//clear data first
							let aRm = await AcBal.remove({
								account: Accs[a]._id,
								date: {$gte: onlyDate},
								clientId: this.clientId
							});
							const AcBalStats = await AcBal.bulkWrite(acBalUpd);
							//console.log('complete for ', a);
						}
						 */
						console.log(acBalUpd.length + " Reset Balance is in progress " + this.account)
						// telegram.sendMessage(acBalUpd.length + " Reset Balance is in progress "+ this.account);
					}
				}
			}
		} catch (e) {
			console.error(e);
		}

	}

	async _startCache() {
		try {
			await this.getLedger();
		} catch (e) {
			console.log(e);
		}
	}

	async _getCalculatedDayWiseBal(oSettings){
		let aVoucherData = [];
		console.log('oldest date ',oSettings.date);
		try{
			let oVchFilter = {
				"acImp.st": true,
				deleted: {$not: {$eq: true}},
				clientId: this.clientId,
				date: {$gte: new Date(oSettings.date), $lte: new Date()},
				'ledgers.account': mongoose.Types.ObjectId(this.account)
			};
			let aggQuery = [
				{$match: oVchFilter},
				{
					"$project": {
						ledgers: {
							$filter: {
								input: "$ledgers",
								as: "ledger",
								cond: {$eq: ["$$ledger.account", mongoose.Types.ObjectId(this.account)]}
							}
						}, date: 1
					}
				},
				{"$unwind": {path: "$ledgers", preserveNullAndEmptyArrays: true}},
				{
					$group: {
						_id: {
							day: {$dayOfMonth: {date: "$date", timezone: '+05:30'}},
							month: {$month: {date: "$date", timezone: '+05:30'}},
							year: {$year: {date: "$date", timezone: '+05:30'}}
						},
						cr: {
							"$sum": {
								"$cond": [{
									"$and": [
										{"$eq": ["$ledgers.account", mongoose.Types.ObjectId(this.account)]},
										{"$eq": ["$ledgers.cRdR", 'CR']}
									]
								}, "$ledgers.amount", 0]
							}
						},
						dr: {
							"$sum": {
								"$cond": [{
									"$and": [
										{"$eq": ["$ledgers.account", mongoose.Types.ObjectId(this.account)]},
										{"$eq": ["$ledgers.cRdR", 'DR']}
									]
								}, "$ledgers.amount", 0]
							}
						},
						date: {$last: '$date'}
					}
				},
				{$sort: {date: 1}}];
			aVoucherData = await Voucher.aggregate(aggQuery);
		}catch (e){
			if(this.checkBalance){
				this.arr.push({
					message:'_getCalculatedDayWiseBal error' + e.message
				})
			}
			console.error('_getCalculatedDayWiseBal error',e.message);
		}
		return aVoucherData;
	}

	async _getOldestVoucherDate(){
		let aVoucher = [];
		try{
			let oFilter = {
				"$or": [
					{created_at: {$gte: new Date(this.start), $lte: new Date(this.end)}},
					{last_modified_at: {$gte: new Date(this.start), $lte: new Date(this.end)}},
				],
				'ledgers.account': mongoose.Types.ObjectId(this.account)
			};
			let aggrQuery = [
				{$match: oFilter},
				{$sort: {date: 1}},
				{$skip: 0},
				{$limit: 1},
				{$project: {date: 1,refNo:1}}
			];
			aVoucher = await Voucher.aggregate(aggrQuery);
		}catch (e){
			if(this.checkBalance){
				this.arr.push({
					message:'_getOldestVoucherDate error' + e.message
				})
			}
			console.error('_getOldestVoucherDate error',e.message);
		}
		return aVoucher;
	}

	async _getSavedDayWiseBalances(oSettings){
		let acBal = [];
		try{
			acBal = await AcBal.find({
				account: this.account,
				date: {$gte: new Date(oSettings.date), $lte: new Date()},
				clientId: this.clientId
			}).sort({date: 1}).lean();
		}catch (e){
			if(this.checkBalance){
				this.arr.push({
					message:'_getSavedDayWiseBalances error' + e.message
				})
			}
			console.error('_getSavedDayWiseBalances error',e.message);
		}

		return acBal;

	}

	async _matchDayWiseBalances(calcBal,savedBal){
		let mismathcedDates = [];
		//  match balance of every day if match continue else get cron start date
		for(let i=0;i<calcBal.length;i++){
			for(let j=0;j<savedBal.length;j++){
				let diffDays = moment(new Date(calcBal[i].date)).diff(savedBal[j].date, 'days', true);
				if(diffDays == 0){

					let CRDiff = calcBal[i].cr - savedBal[j].cr;
					CRDiff = Math.abs(CRDiff);

					let DRDiff = calcBal[i].dr - savedBal[j].dr;
					DRDiff = Math.abs(DRDiff);

					if(CRDiff > 1 || DRDiff > 1) {
						mismathcedDates.push({
							calc: calcBal[i],
							saved: savedBal[j],
							date: calcBal[i].date,
							cr: CRDiff,
							dr : DRDiff
						});
						console.log('Mismatch date ',calcBal[i].date,CRDiff,DRDiff);
					}

					calcBal.splice(i, 1);
					i--;
					savedBal.splice(j, 1);
					j--;

					break;
				}else{
					//console.log('diffDays > 0');
				}
			}
		}
		return mismathcedDates;
	}

	async _getVouchersToCheck(aMisMatchedDayWiseData){
		for(let i=0;i<aMisMatchedDayWiseData.length;i++){
			let amount = 0;
			if(aMisMatchedDayWiseData[i].cr){
				amount = aMisMatchedDayWiseData[i].cr;
			}else if(aMisMatchedDayWiseData[i].dr){
				amount = aMisMatchedDayWiseData[i].dr;
			}else{
				if(this.checkBalance){
					this.arr.push({
						message:'no amount to check'
					})
				}
				console.log('no amount to check');
			}
			this.start = moment(aMisMatchedDayWiseData[i].date).startOf('day');
			this.end = moment(aMisMatchedDayWiseData[i].date).endOf('day');
			let oVchFil = {
				date: {$gte: new Date(this.start), $lte: new Date(this.end)},
				'ledgers.account': mongoose.Types.ObjectId(this.account),
				'ledgers.amount': amount
			};
			let aggrQuery = [
				{$match: oVchFil},
				{$skip: 0},
				{$limit: 10}];
			let findVoucher = await Voucher.aggregate(aggrQuery);
			if (findVoucher && findVoucher[0]) {
				let msg = "Voucher Issue of " + this.start.format('DD-MM-YYYY') + " of Amount  " + amount + " Voucher Ref Number " + (findVoucher && findVoucher[0] && findVoucher[0].refNo);
				console.log(msg);
				if(this.checkBalance){
					this.arr.push({
						message:msg
					})
				}
				telegram.sendMessage(msg);
			} else {
				let msg2 = "No single voucher fount of this " + amount + " On this date" + aMisMatchedDayWiseData[i].date;
				console.log(msg2);
				if(this.checkBalance){
					this.arr.push({
						message:msg2
					})
				}
				telegram.sendMessage(msg2);
			}
		}
	}
}




