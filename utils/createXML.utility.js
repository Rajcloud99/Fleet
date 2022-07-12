'use strict';

//const uuidv4 = require('uuid/v4');
const builder = require('xmlbuilder');
//const jsonxml = require('jsontoxml');
const fs = require('fs');
let stateReducer = function(vehRegNo) {
	let dig4;
	let remainingChars = vehRegNo.trim().replace(/\d{4}/, function (replacedStr) {
		dig4 = replacedStr;
		return '';
	});
	if(dig4){
		return dig4 + remainingChars;
	}else{
		return remainingChars;
	}
};
let rootTripAdv = require('../tallyXmlJsonMap/voucher');
class XML {
	static TripAdv(data,company) {
		let stats= [];
		let root = JSON.parse(JSON.stringify(rootTripAdv.root));
		root.ENVELOPE.BODY.IMPORTDATA.REQUESTDESC.STATICVARIABLES.SVCURRENTCOMPANY = company.name;
		for (let i = 0; i < data.length; i++) {
			let d = new Date(data[i].date || data[i].paymentDate || data[i].created_at || data[i].uploaded_at);
			if(!d){
				stats.push({refNo:data[i].reference_no,reason:" date not exist"});
			}
			let dt = d.getFullYear().toString();
			let mt = d.getMonth() + 1;
			if (mt < 10) {
				dt = dt + "0" + mt;
			} else {
				dt = dt + mt;
			}
			if (d.getDate() < 10) {
				dt = dt + "0" + d.getDate();
			} else {
				dt = dt + d.getDate();
			}

			let voucher = JSON.parse(JSON.stringify(rootTripAdv.voucher));
			voucher["@REMOTEID"] = data[i]._id.toString();
			voucher["@VCHTYPE"] = data[i].voucher && data[i].voucher.type || "Journal";
			voucher["@ACTION"] = "Create";
			voucher.VOUCHERTYPENAME = data[i].voucher && data[i].voucher.type || "Journal";
			voucher.DATE = dt;
			voucher.EFFECTIVEDATE = dt;
			if(!data[i].reference_no){
				stats.push({refNo:data[i].reference_no,reason:" ref no not found"});
			}
			voucher.VOUCHERNUMBER = data[i].reference_no;
			voucher.REFERENCE = data[i].reference_no;
			if(!data[i].voucher.narration){
				stats.push({refNo:data[i].reference_no,reason:" narration not found"});
			}
			//  /[^A-Za-z0-9+-,:]/g
			voucher.NARRATION = data[i].voucher && data[i].voucher.narration && data[i].voucher.narration.replace(/[|{}<>&[\]^$&#/\+*?'";\n\r]/g, '')|| "NA";
			voucher.GUID = data[i]._id.toString();
			voucher.ALTERID = data[i].reference_no;
			let ledgerEntry, billAllocation, v1, v2;
			if (data[i].voucher && data[i].voucher.type == 'Receipt') {
				//credit first
				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].voucher && data[i].voucher.to && data[i].voucher.to.ledger_name) ? data[i].voucher.to.ledger_name : (data[i].voucher.to.name) ? data[i].voucher.to.name : 'NA';
				if(ledgerEntry.LEDGERNAME.length == 0 || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].reference_no,reason:" debit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = -1 * (data[i].voucher && data[i].voucher.amount.toFixed(2)) || 0;
				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);

				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].voucher && data[i].voucher.from && data[i].voucher.from.ledger_name) ? data[i].voucher.from.ledger_name : (data[i].voucher.from.name) ? data[i].voucher.from.name : 'NA';
				if(data[i].vehicle_no){
					v1 = stateReducer(data[i].vehicle_no);
					v2 = stateReducer(ledgerEntry.LEDGERNAME);
					if (v1 != v2) {
						ledgerEntry.LEDGERNAME = v1;
					}
				}
				if(ledgerEntry.LEDGERNAME.length == 0 || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].reference_no,reason:" credit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = (data[i].voucher && data[i].voucher && data[i].voucher.amount.toFixed(2)) || 0;
				ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
				ledgerEntry.ISDEEMEDPOSITIVE='No';
				billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
				billAllocation.NAME = data[i].bill_no || data[i].reference_no || ledgerEntry.LEDGERNAME;
				billAllocation.AMOUNT = ledgerEntry.AMOUNT;
				billAllocation.BILLTYPE = "New Ref";
				ledgerEntry["BILLALLOCATIONS.LIST"] = [];
				ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
			} else if (data[i].voucher && data[i].voucher.type == 'Payment') {
				//debit later
				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].voucher && data[i].voucher.to && data[i].voucher.to.ledger_name) ? data[i].voucher.to.ledger_name : (data[i].voucher.to.name) ? data[i].voucher.to.name : 'NA';
				if(data[i].vehicle_no){
					v1 = stateReducer(data[i].vehicle_no);
					v2 = stateReducer(ledgerEntry.LEDGERNAME);
					if (v1 != v2) {
						ledgerEntry.LEDGERNAME = v1;
					}
				}
				if(ledgerEntry.LEDGERNAME.length == 0 || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].reference_no,reason:" credit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = -1 * (data[i].voucher && data[i].voucher && data[i].voucher.amount.toFixed(2)) || 0;
				ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
				billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
				billAllocation.NAME = data[i].bill_no || data[i].reference_no || ledgerEntry.LEDGERNAME;
				billAllocation.AMOUNT = ledgerEntry.AMOUNT;
				billAllocation.BILLTYPE = "New Ref";
				ledgerEntry["BILLALLOCATIONS.LIST"] = [];
				ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);

				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].voucher && data[i].voucher.from && data[i].voucher.from.ledger_name) ? data[i].voucher.from.ledger_name : (data[i].voucher.from.name) ? data[i].voucher.from.name : 'NA';
				if(ledgerEntry.LEDGERNAME.length == 0 || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].reference_no,reason:" credit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = (data[i].voucher && data[i].voucher.amount.toFixed(2)) || 0;
				ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
				ledgerEntry.ISDEEMEDPOSITIVE='No';
				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
			} else {
				//Journal
				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].voucher && data[i].voucher.to && data[i].voucher.to.ledger_name) ? data[i].voucher.to.ledger_name : (data[i].voucher.to.name) ? data[i].voucher.to.name : 'NA';

				if(data[i].vehicle_no){
					v1 = stateReducer(data[i].vehicle_no);
					v2 = stateReducer(ledgerEntry.LEDGERNAME);
					if (v1 != v2) {
						ledgerEntry.LEDGERNAME = v1;
					}
				}
				if(ledgerEntry.LEDGERNAME.length == 0 || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].reference_no,reason:" debit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = -1 * (data[i].voucher && data[i].voucher && data[i].voucher.amount.toFixed(2)) || 0;
				ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
				billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
				billAllocation.NAME = data[i].bill_no || data[i].reference_no || ledgerEntry.LEDGERNAME;
				billAllocation.AMOUNT = ledgerEntry.AMOUNT;
				ledgerEntry["BILLALLOCATIONS.LIST"] = [];
				ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);

				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].voucher && data[i].voucher.from && data[i].voucher.from.ledger_name) ? data[i].voucher.from.ledger_name : (data[i].voucher.from.name) ? data[i].voucher.from.name : 'NA';
				if(ledgerEntry.LEDGERNAME.length == 0 || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].reference_no,reason:" credit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = (data[i].voucher && data[i].voucher.amount.toFixed(2)) || 0;
				ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
				billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
				billAllocation.NAME = data[i].bill_no || ledgerEntry.LEDGERNAME;
				billAllocation.AMOUNT = ledgerEntry.AMOUNT;
				ledgerEntry.ISDEEMEDPOSITIVE='No';
				ledgerEntry["BILLALLOCATIONS.LIST"] = [];
				ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
			}
			if(voucher["ALLLEDGERENTRIES.LIST"].length<2){
				stats.push({refNo:data[i].reference_no,reason:"less than 2 bill list"});
			}
			root.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE.VOUCHER.push(voucher);
		}
		if(stats.length>0){
			root.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE.VOUCHER = stats;
		}
		return root;
	}
	static __Vouchers(data,company) {
		let root = JSON.parse(JSON.stringify(rootTripAdv.root));
		root.ENVELOPE.BODY.IMPORTDATA.REQUESTDESC.STATICVARIABLES.SVCURRENTCOMPANY = company.name;
		let stats=[];
		for(let i=0;i<data.length;i++){
			let tAmt=0,multi='DR';
			if(data[i].svc && data[i].svc.length>1 && data[i].svl && data[i].svl.length>1){
				stats.push({refNo:data[i].refNo,reason:"Multiple credit and debit account not allowed"});
			}else if(data[i].svc && data[i].svc.length>1){
				multi = 'CR';
			}else{
				multi='DR'
			}

			let d = new Date(data[i].billDate || data[i].paymentDate || data[i].created_at || data[i].uploaded_at);
			let dt = d.getFullYear().toString();
			let mt = d.getMonth() + 1;
			if(mt<10){
				dt= dt + "0"+mt;
			}else{
				dt= dt + mt;
			}
			if(d.getDate()<10){
				dt= dt + "0"+d.getDate();
			}else{
				dt= dt + d.getDate();
			}

			let voucher =  JSON.parse(JSON.stringify(rootTripAdv.voucher));
			voucher["@REMOTEID"] = data[i].v_id.toString();
			voucher["@VCHTYPE"] =  data[i].type || "Journal" ;
			voucher["@ACTION"] = "Create";
			voucher.VOUCHERTYPENAME = data[i].type || "Journal" ; ;
			if(data[i].paymentType=="Gr Bill"){
				voucher["@VCHTYPE"] = "Sales";
				voucher.VOUCHERTYPENAME	 = "Sales";
			}
			voucher.DATE = dt;
			voucher.EFFECTIVEDATE = dt;
			voucher.VOUCHERNUMBER = data[i].refNo;
			voucher.REFERENCE = data[i].refNo;
			voucher.NARRATION = (data[i].narration && data[i].narration.replace(/[|{}<>&[\]^$&#/\+*?'";\n\r]/g, '')) || 'NA';
			voucher.GUID = data[i].v_id.toString();
			voucher.ALTERID = data[i].refNo;
			let ledgerEntry,billAllocation,lname;
			if(multi == 'CR'){
				//stats.push({reason:'multi credit entry in voucher'});
				//Debit account ledger list
				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].vch[0].to && data[i].vch[0].to.ledger_name) ? data[i].vch[0].to.ledger_name : (data[i].vch[0].to.name) ? data[i].vch[0].to.name : 'NA';
				ledgerEntry.ISDEEMEDPOSITIVE='No';
				if(ledgerEntry.LEDGERNAME.length <2  || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].refNo,reason:" debit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = data[i].total.toFixed(2) || (data[i].vch && data[i].vch[0].amount.toFixed(2)) || 0;
				ledgerEntry.AMOUNT = -1 * ledgerEntry.AMOUNT;
				ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
				tAmt = parseFloat(tAmt.toFixed(2));
				if((-1*tAmt) != ledgerEntry.AMOUNT){
					//DR == CR
					stats.push({refNo:data[i].refNo,reason:" DR amount not matched with CR",DR:tAmt,CR:ledgerEntry.AMOUNT});
				}
				if (data[i].type == 'Receipt' || data[i].type == 'Journal' || data[i].crRef) {
					billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
					billAllocation.NAME = data[i].crBillNo || data[i].billNo || data[i].refNo || ledgerEntry.LEDGERNAME;
					billAllocation.BILLTYPE = data[i].crRef || data[i].billType;
					billAllocation.AMOUNT = ledgerEntry.AMOUNT;
					if(!ledgerEntry["BILLALLOCATIONS.LIST"] || !ledgerEntry["BILLALLOCATIONS.LIST"].length){
						ledgerEntry["BILLALLOCATIONS.LIST"] = [];
					}
					ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
				}
				//Credit account ledger list
				for(let lc=0;lc<data[i].svc.length;lc++){
					//credit  account ledger list
					ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
					ledgerEntry.AMOUNT = 0;
					for(let v=0;v<data[i].vch.length;v++) {
						if (data[i].vch[v].from._id.toString() == data[i].svc[lc].toString()) {
							ledgerEntry.LEDGERNAME = (data[i].vch[v].from && data[i].vch[v].from.ledger_name) ? data[i].vch[v].from.ledger_name : (data[i].vch[v].from.name) ? data[i].vch[v].from.name : 'NA';
							if(!data[i].vch[v].amount || isNaN(data[i].vch[v].amount)){
								stats.push({refNo: data[i].refNo, reason: " amount is not found"});
							}
							ledgerEntry.AMOUNT = ledgerEntry.AMOUNT + (data[i].vch[v].amount || 0);
							billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
							billAllocation.NAME = data[i].vch[v].billNo || data[i].vch[v].refNo || ledgerEntry.LEDGERNAME;
							billAllocation.BILLTYPE = data[i].vch[v].billType;
							billAllocation.AMOUNT = (data[i].vch[v].amount.toFixed(2) || 0);
							billAllocation.AMOUNT = parseFloat(billAllocation.AMOUNT);
							tAmt = tAmt + billAllocation.AMOUNT;
							if (data[i].type == 'Payment' || data[i].type == 'Journal') {
								if(!ledgerEntry["BILLALLOCATIONS.LIST"] || !ledgerEntry["BILLALLOCATIONS.LIST"].length){
									ledgerEntry["BILLALLOCATIONS.LIST"] = [];
								}
								ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
							}
						}

						if (ledgerEntry.LEDGERNAME.length < 2 || ledgerEntry.LEDGERNAME == 'NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME) {
							stats.push({refNo: data[i].refNo, reason: " credit account ledger name not found."});
						}
					}
					ledgerEntry.AMOUNT = ledgerEntry.AMOUNT.toFixed(2);
					ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
					voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
				}

				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);

			} else{
				//Debit account ledger list
				for(let lc=0;lc<data[i].svd.length;lc++){
					//debit  account ledger list
					ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
					ledgerEntry.AMOUNT = 0;
					for(let v=0;v<data[i].vch.length;v++){
						if(data[i].vch[v].to._id.toString() == data[i].svd[lc].toString()){
							if(!data[i].vch[v].amount || isNaN(data[i].vch[v].amount)){
								stats.push({refNo: data[i].refNo, reason: " amount is not found"});
							}
							ledgerEntry.LEDGERNAME = (data[i].vch[v].to && data[i].vch[v].to.ledger_name) ? data[i].vch[v].to.ledger_name : (data[i].vch[v].to.name) ? data[i].vch[v].to.name : 'NA';
							ledgerEntry.AMOUNT =  ledgerEntry.AMOUNT + (-1 * data[i].vch[v].amount);
							billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
							billAllocation.NAME = data[i].vch[v].billNo || data[i].vch[v].refNo || ledgerEntry.LEDGERNAME;
							billAllocation.BILLTYPE = data[i].vch[v].billType;
							billAllocation.AMOUNT = ( -1 * data[i].vch[v].amount.toFixed(2) || 0);
							billAllocation.AMOUNT = parseFloat(billAllocation.AMOUNT);
							tAmt = tAmt+billAllocation.AMOUNT;
							if (data[i].type == 'Payment' || data[i].type == 'Journal') {
								if(!ledgerEntry["BILLALLOCATIONS.LIST"] || !ledgerEntry["BILLALLOCATIONS.LIST"].length){
									ledgerEntry["BILLALLOCATIONS.LIST"] = [];
								}
								ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
							}
						}
					}
					if(ledgerEntry.LEDGERNAME.length <2 || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
						stats.push({refNo:data[i].refNo,reason:" debit account ledger name not found."});
					}
					ledgerEntry.AMOUNT = ledgerEntry.AMOUNT.toFixed(2);
					ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
					voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
				}
				//credit account ledger list
				ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
				ledgerEntry.LEDGERNAME = (data[i].vch[0].from && data[i].vch[0].from.ledger_name) ? data[i].vch[0].from.ledger_name : (data[i].vch[0].from.name) ? data[i].vch[0].from.name : 'NA';
				ledgerEntry.ISDEEMEDPOSITIVE='No';
				if(ledgerEntry.LEDGERNAME.length <2  || ledgerEntry.LEDGERNAME=='NA' || ledgerEntry.LEDGERNAME == "" || !ledgerEntry.LEDGERNAME){
					stats.push({refNo:data[i].refNo,reason:" debit account ledger name not found."});
				}
				ledgerEntry.AMOUNT = data[i].total.toFixed(2) || (data[i].vch && data[i].vch[0].amount.toFixed(2)) || 0;
				ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
				tAmt = parseFloat(tAmt.toFixed(2));
				if((-1*tAmt) != ledgerEntry.AMOUNT){
					//DR == CR
					stats.push({refNo:data[i].refNo,reason:" DR amount not matched with CR",DR:tAmt,CR:ledgerEntry.AMOUNT});
				}
				if (data[i].type == 'Receipt' || data[i].type == 'Journal' || data[i].crRef) {
					billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
					billAllocation.NAME = data[i].crBillNo || data[i].billNo || data[i].refNo || ledgerEntry.LEDGERNAME;
					billAllocation.BILLTYPE = data[i].crRef || data[i].billType;
					billAllocation.AMOUNT = ledgerEntry.AMOUNT;
					if(!ledgerEntry["BILLALLOCATIONS.LIST"] || !ledgerEntry["BILLALLOCATIONS.LIST"].length){
						ledgerEntry["BILLALLOCATIONS.LIST"] = [];
					}
					ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
				}
				voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
				}
			root.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE.VOUCHER.push(voucher);
		}
		if(stats.length>0){
			root.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE.VOUCHER = stats;
		}
		return root;
	}
	static Vouchers(data,company, costCategory = []) {
		let root = JSON.parse(JSON.stringify(rootTripAdv.root));
		root.ENVELOPE.BODY.IMPORTDATA.REQUESTDESC.STATICVARIABLES.SVCURRENTCOMPANY = company.name;
		let stats=[];
		for(let i=0;i<data.length;i++){
			let tAmt=0,multi='DR';
			let d = new Date(data[i].date || data[i].paymentDate || data[i].created_at || data[i].uploaded_at);
			let dt = d.getFullYear().toString();
			let mt = d.getMonth() + 1;
			if(mt<10){
				dt= dt + "0"+mt;
			}else{
				dt= dt + mt;
			}
			if(d.getDate()<10){
				dt= dt + "0"+d.getDate();
			}else{
				dt= dt + d.getDate();
			}
			let voucher =  JSON.parse(JSON.stringify(rootTripAdv.voucher));
			voucher["@REMOTEID"] = data[i]._id.toString();
			voucher["@VCHTYPE"] =  data[i].type;
			voucher["@ACTION"] = "Create";
			voucher.VOUCHERTYPENAME = data[i].type;
			voucher.DATE = dt;
			voucher.EFFECTIVEDATE = dt;
			voucher.VOUCHERNUMBER = data[i].refNo;
			voucher.REFERENCE = data[i].refNo;
			voucher.NARRATION = (data[i].narration && data[i].narration.replace(/[\n\r]/g, '')) || 'NA';
			voucher.GUID = data[i]._id.toString();
			voucher.ALTERID = data[i].refNo;

			let ledgerEntry,billAllocation;
			for(let l=0;l<data[i].ledgers.length;l++){
				if(data[i].ledgers[l].cRdR == 'CR'){
					let oLedger = data[i].ledgers[l];
					ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
					ledgerEntry.LEDGERNAME = data[i].ledgers[l].laName || data[i].ledgers[l].lName;
					// if(!data[i].ledgers[l].laName && (data[i].vT == 'Driver Cash' || data[i].vT == 'Happay' || data[i].vT == 'Fastag' || data[i].vT == 'Diesel')){
					// 	ledgerEntry.LEDGERNAME = stateReducer(data[i].ledgers[l].lName);
					// }
					ledgerEntry.AMOUNT = data[i].ledgers[l].amount.toFixed(2);
					if(data[i].ledgers[l].cRdR == 'DR'){
						ledgerEntry.AMOUNT = -1 * parseFloat(ledgerEntry.AMOUNT);
					}else{
						ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
						ledgerEntry.ISDEEMEDPOSITIVE='No';
					}

					if(Array.isArray(oLedger.costCategory))
						ledgerEntry.VATEXPAMOUNT = parseFloat(ledgerEntry.AMOUNT);

					if(Array.isArray(oLedger.costCategory) && oLedger.costCategory.length){
						ledgerEntry["CATEGORYALLOCATIONS.LIST"] = [];
						oLedger.costCategory.forEach(obj=>{
							let primary = obj;
							let list = rootTripAdv.categoryAllocationList();
							list['CATEGORY'] = primary.category;
							primary.center = Array.isArray(primary.center) && primary.center || [];
							primary.center.forEach(center => {
								list['COSTCENTREALLOCATIONS.LIST'].push(Object.assign(rootTripAdv.costCenterAllocationList(), {
									"NAME": center.name,
									"AMOUNT": this.prototype.parseAmount(center.amount, oLedger.cRdR)
								}));
							});
							ledgerEntry["CATEGORYALLOCATIONS.LIST"].push(list)
						});

						// let caravan = oLedger.costCategory.find(o => o.category == costCategory[1]);
						// list = rootTripAdv.categoryAllocationList();
						// list['CATEGORY'] = caravan.category;
						// caravan.center = Array.isArray(caravan.center) && caravan.center || [];
						// caravan.center.forEach(center => {
						// 	list['COSTCENTREALLOCATIONS.LIST'].push(Object.assign(rootTripAdv.costCenterAllocationList(), {
						// 		"NAME": center.name,
						// 		"AMOUNT": this.prototype.parseAmount(center.amount, oLedger.cRdR)
						// 	}));
						// });
						// ledgerEntry["CATEGORYALLOCATIONS.LIST"].push(list)

					}

					for(let b=0;b<data[i].ledgers[l].bills.length;b++){
						billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
						billAllocation.NAME = data[i].ledgers[l].bills[b].billNo && data[i].ledgers[l].bills[b].billNo.trim();
						billAllocation.BILLTYPE = data[i].ledgers[l].bills[b].billType;
						billAllocation.AMOUNT = (data[i].ledgers[l].bills[b].amount.toFixed(2) || 0);
						if(data[i].ledgers[l].cRdR == 'DR'){
							if((data[i].type == 'Contra' || data[i].type == 'Payment' || data[i].type == 'Receipt') && !billAllocation.BILLTYPE && (!billAllocation.NAME || billAllocation.NAME=="")){
								billAllocation.BILLTYPE = 'On Account';
								billAllocation.NAME = ledgerEntry.LEDGERNAME;
							}
							billAllocation.AMOUNT = -1 * parseFloat(billAllocation.AMOUNT);
						}else{
							billAllocation.AMOUNT = parseFloat(billAllocation.AMOUNT);
							if((data[i].type == 'Contra' || data[i].type == 'Receipt' || data[i].type == 'Payment') && !billAllocation.BILLTYPE && (!billAllocation.NAME || billAllocation.NAME=="")){
								billAllocation.BILLTYPE = 'On Account';
								billAllocation.NAME = ledgerEntry.LEDGERNAME;
							}
						}
						if(billAllocation.BILLTYPE && !billAllocation.NAME){
							billAllocation.NAME = ledgerEntry.LEDGERNAME;
						}
						if(!ledgerEntry["BILLALLOCATIONS.LIST"]){
							ledgerEntry["BILLALLOCATIONS.LIST"] = [];
						}
						ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
					}
					voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
				}
			}
			for(let l=0;l<data[i].ledgers.length;l++){
				if(data[i].ledgers[l].cRdR == 'DR'){
					let oLedger = data[i].ledgers[l];
					ledgerEntry = JSON.parse(JSON.stringify(rootTripAdv.ledgerEntry));
					ledgerEntry.LEDGERNAME = data[i].ledgers[l].laName || data[i].ledgers[l].lName;
					// if(!data[i].ledgers[l].laName && (data[i].vT == 'Driver Cash' || data[i].vT == 'Happay' || data[i].vT == 'Fastag' || data[i].vT == 'Diesel')){
					// 	ledgerEntry.LEDGERNAME = stateReducer(data[i].ledgers[l].lName);
					// }
					ledgerEntry.AMOUNT = data[i].ledgers[l].amount.toFixed(2);
					if(data[i].ledgers[l].cRdR == 'DR'){
						ledgerEntry.AMOUNT = -1 * parseFloat(ledgerEntry.AMOUNT);
					}else{
						ledgerEntry.AMOUNT = parseFloat(ledgerEntry.AMOUNT);
						ledgerEntry.ISDEEMEDPOSITIVE='No';
					}

					if(Array.isArray(oLedger.costCategory))
						ledgerEntry.VATEXPAMOUNT = parseFloat(ledgerEntry.AMOUNT);

					if(Array.isArray(oLedger.costCategory) && oLedger.costCategory.length){
						ledgerEntry["CATEGORYALLOCATIONS.LIST"] = [];
						oLedger.costCategory.forEach(obj=>{
							let primary = obj;
							let list = rootTripAdv.categoryAllocationList();
							list['CATEGORY'] = primary.category;
							primary.center = Array.isArray(primary.center) && primary.center || [];
							primary.center.forEach(center => {
								list['COSTCENTREALLOCATIONS.LIST'].push(Object.assign(rootTripAdv.costCenterAllocationList(), {
									"NAME": center.name,
									"AMOUNT": this.prototype.parseAmount(center.amount, oLedger.cRdR)
								}));
							});
							ledgerEntry["CATEGORYALLOCATIONS.LIST"].push(list)
						});

						// let caravan = oLedger.costCategory.find(o => o.category == costCategory[1]);
						// list = rootTripAdv.categoryAllocationList();
						// list['CATEGORY'] = caravan.category;
						// caravan.center = Array.isArray(caravan.center) && caravan.center || [];
						// caravan.center.forEach(center => {
						// 	list['COSTCENTREALLOCATIONS.LIST'].push(Object.assign(rootTripAdv.costCenterAllocationList(), {
						// 		"NAME": center.name,
						// 		"AMOUNT": this.prototype.parseAmount(center.amount, oLedger.cRdR)
						// 	}));
						// });
						// ledgerEntry["CATEGORYALLOCATIONS.LIST"].push(list)

					}

					for(let b=0;b<data[i].ledgers[l].bills.length;b++){
						billAllocation = JSON.parse(JSON.stringify(rootTripAdv.billAllocation));
						billAllocation.NAME = data[i].ledgers[l].bills[b].billNo && data[i].ledgers[l].bills[b].billNo.trim();
						billAllocation.BILLTYPE = data[i].ledgers[l].bills[b].billType;
						billAllocation.AMOUNT = (data[i].ledgers[l].bills[b].amount.toFixed(2) || 0);
						if(data[i].ledgers[l].cRdR == 'DR'){
							if((data[i].type == 'Contra' || data[i].type == 'Payment' || data[i].type == 'Receipt') && !billAllocation.BILLTYPE && (!billAllocation.NAME || billAllocation.NAME=="")){
								billAllocation.BILLTYPE = 'On Account';
								billAllocation.NAME = ledgerEntry.LEDGERNAME;
							}
							billAllocation.AMOUNT = -1 * parseFloat(billAllocation.AMOUNT);
						}else{
							billAllocation.AMOUNT = parseFloat(billAllocation.AMOUNT);
							if((data[i].type == 'Contra' || data[i].type == 'Receipt' || data[i].type == 'Payment') && !billAllocation.BILLTYPE && (!billAllocation.NAME || billAllocation.NAME=="")){
								billAllocation.BILLTYPE = 'On Account';
								billAllocation.NAME = ledgerEntry.LEDGERNAME;
							}
						}
						if(billAllocation.BILLTYPE && !billAllocation.NAME){
							billAllocation.NAME = ledgerEntry.LEDGERNAME;
						}
						if(!ledgerEntry["BILLALLOCATIONS.LIST"]){
							ledgerEntry["BILLALLOCATIONS.LIST"] = [];
						}
						ledgerEntry["BILLALLOCATIONS.LIST"].push(billAllocation);
					}
					voucher["ALLLEDGERENTRIES.LIST"].push(ledgerEntry);
				}
			}
			root.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE.VOUCHER.push(voucher);
		}
		if(stats.length>0){
			root.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE.VOUCHER = stats;
		}
		return root;
	}
	constructor(opts = {}) {
		this.template = opts.template;
		this.data = opts.data;
		this.generatedXML = undefined;
		this.generatedJson = undefined;
		this.company = opts.company;
		this.costCategory = opts.costCategory || [];
	}
	for(t) {
		this.template = t;
		return this;
	}
	use(d) {
		this.data = d;
		return this;
	}
	createXML() {
		if (!this.template) throw new Error('Invoke for function with valid template name');
		if (!this.data) throw new Error('Invoke use function with valid data');
		this.generatedXML = XML[this.template](this.data,this.company);
		return this;
	}
	createJSON() {
		if (!this.template) throw new Error('Invoke for function with valid template name');
		if (!this.data) throw new Error('Invoke use function with valid data');
		this.generatedJson = XML[this.template](this.data,this.company, this.costCategory);
		return this;
	}
	getXmlFromJson(){
		let encoding = 'UTF-8';
		//this.generatedXML = jsonxml(this.generatedJson);
		this.generatedXML = builder.create(this.generatedJson,{headless:true});
		this.generatedXML = this.generatedXML.end({ pretty: true});
		return this;
	}
	toXML() {
		return this.generatedXML;
	}
	download() {
		if(!this.generatedXML) throw new Error('XML not generated');
		return new Promise((resolve, reject) => {
			fs.writeFile('./files/tally.xml', this.generatedXML, (err) => {
				if (err) return reject(err);
				resolve('http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/tally.xml');
			});
		});
	}

	parseAmount(amount, type){
		amount = parseFloat(amount);
		return type == "CR" ? amount : -1*amount;
	}
}

module.exports = XML;
