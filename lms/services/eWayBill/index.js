const moment = require('moment');
const request = require('request-promise');
const EWayBillModel = commonUtil.getModel("eWayBill");
let telegram = require("../../../utils/telegramBotUtil");
const token  = require('../../../utils/EasyWayBillToken');

module.exports = class EWayBill {
	constructor(from, to , oClient) {
		this.eWayBill = [];
		this.finalData = [];
		this.clientId = oClient.clientId;
		this.gstin = oClient.gstin;
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
			this.Token = await token.completeLogin();
			if(!this.Token || !this.Token.response || !this.Token.response.token){
				console.error('complete login for org failed');
				return false;
			}
			console.log('[E-Way Bill Fetch] from : ' + this._from.format('DD-MM-YYYY') + ' to : ' + this._to.format('DD-MM-YYYY'))
			await this._startCache();
			this.start.add(1, 'day');
		}
	}

	async getEwayBill() {
		if(!this.Token){
			return false;
		}
		let token = this.Token && this.Token.response && this.Token.response.token.toString()
		let str = 'Bearer ' + token;
		const options = {
			method: 'POST',
			uri: config.easyWayBill.api.getEwayBill + this.gstin,
			headers: {
				"Authorization": str,
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			json: {
				"type": "ASSIGNED_TO_ME",
				"page": 0,
				"size": 100,
				"defaultquery": null,
				"addlquery": {
					"operator": "and",
					"criterias": [{
						"p": "ewbDt",
						"o": "gte",
						"v": this._from.format('YYYY/MM/DD')
					},
						{
							"p": "ewbDt",
							"o": "lte",
							"v":this._to.format('YYYY/MM/DD')
						}]
				}
			}
		};
		try{
			let TransporterData = await request(options);
			if (TransporterData.status === 1 && TransporterData.response && TransporterData.response.length > 0 ) {
				for (const d of TransporterData.response) {
					//JSON.parse(JSON.stringify(d));
					d.clientId = this.clientId;
					const docDate = moment(d.transDocDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
					d.docDate = new Date(docDate);
					const ewbDate = moment(d.ewbDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
					d.ewbDate = new Date(ewbDate);
					const validUpto = moment(d.validUpto, 'DD/MM/YYYY').format('YYYY-MM-DD');
					d.validUpto = new Date(validUpto);
					this.eWayBill.push(d);
				}
			}
		}catch (e) {
			console.error(e);
		}

	}

	async ewayBillDetail() {
		let token = this.Token && this.Token.response && this.Token.response.token.toString()
		let str = 'Bearer ' + token;
		if(this.eWayBill && this.eWayBill.length > 0){
			for (const d of this.eWayBill) {
				const option = {
					method: 'GET',
					uri: config.easyWayBill.api.detailsEwayBill + d.ewbNo + '&gstin='+this.gstin,
					headers: {
						"Content-Type": "application/json",
						"Authorization": str,
					},
					json: true // Automatically stringifies the body to JSON
				};
				let ewayBillDetail = await request(option);
				if (ewayBillDetail.status === 1) {
					//JSON.parse(JSON.stringify(ewayBillDetail));
					const ewayDocDate = ewayBillDetail.response.docDate && moment(ewayBillDetail.response.docDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
					ewayBillDetail.response.docDate = new Date(ewayDocDate);
					const ewayBillDate = ewayBillDetail.response.ewbDate && moment(ewayBillDetail.response.ewbDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
					ewayBillDetail.response.ewbDate = new Date(ewayBillDate);
					const ewayValidUpto = ewayBillDetail.response.validUpto && moment(ewayBillDetail.response.validUpto, 'DD/MM/YYYY').format('YYYY-MM-DD');
					if (ewayValidUpto) {
						ewayBillDetail.response.validUpto = new Date(ewayValidUpto)
					}
					;
					let obj = {...d, ...ewayBillDetail.response};
					this.finalData.push(obj);
				}
			}
		}

	}

	async _startCache() {
		try {
			//TODO loop through all the organisation ids and iys GSTINsx
			await this.getEwayBill();
			if (this.eWayBill.length > 0) {
				await this.ewayBillDetail();
			}
			if (this.finalData.length > 0) {
				await this._save();
			}
		} catch (e) {
			console.log(e);
		}
	}

	async _save() {
		let bulkUpdateQuery = this.finalData.map(d => ({
			updateOne: {
				filter: {
					ewbNo: d.ewbNo
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
				let nC = parseInt(bulkUpdateQuery.length / aBatchSize);
				console.log("no of itr", nC);
				for (let b = 0; b <= nC; b++) {
					let nArray = bulkUpdateQuery.slice(b * aBatchSize, (b + 1) * aBatchSize);
					if (nArray.length) {
						let nAna = await EWayBillModel.bulkWrite(nArray, {ordered: false});
						console.log(nAna);
					}
					console.log("batch", b);
				}
			} else if (bulkUpdateQuery.length) {
				let nAna2 = await EWayBillModel.bulkWrite(bulkUpdateQuery, {ordered: false});
				console.log(nAna2);
			}
		}
		 telegram.sendMessage(bulkUpdateQuery.length + " easyway bill data synced for "+ this.gstin);
	}
}



