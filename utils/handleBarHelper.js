const moment = require("moment");

let a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
let b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function intToWords(num) {
	if ((num = num.toString()).length > 9) return 'overflow';
	let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
	if (!n) return;
	var str = '';
	str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
	str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
	str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
	str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
	str += (n[5] != 0) ? (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
	return str;
}

function toWords(num) {
	let s = num.toString().split('.');
	return intToWords(s[0]) + 'Rupees And ' + (s[1] && intToWords(s[1]) || 'Zero') + ' Paise Only';
}

global.parseOaddressToString = function (address) {
	let parsedAddress = "";
	if (address && (address.line1 || address.street_address)) {
		parsedAddress += (address.line1 || address.street_address + ", ");
	}
	if (address && address.line2) {
		parsedAddress += (address.line2 + ", ");
	}
	if (address && address.city) {
		if (address.district == address.city) {
			delete address.district;
		}
		parsedAddress += (address.city + ", ");
	}
	if (address && address.district) {
		parsedAddress += (address.district + ", ");
	}
	if (address && address.state) {
		parsedAddress += (address.state + ", ");
	}
	if (address && address.pincode) {
		parsedAddress += (address.pincode + ", ");
	}
	if (address && address.country) {
		parsedAddress += address.country;
	}
	return parsedAddress;
};

let helpers;

helpers = {
	eq,
	arrayOfObjectToArray,
	gstApplied,
	ne,
	lt,
	gt,
	lte,
	gte,
	and,
	assign,
	or,
	inc,
	checkLen,
	add,
	calGST,
	addUnlimited,
	multiple,
	subtract,
	subtractNum,
	calcBalPerKm,
	addMultiple,
	date,
	datemonth,
	dateTime,
	calTime,
	generateVehicleWiseSno,
	parseAddress,
	ProcterandGamble,
	getGrRemarks,
	getConsignee,
	toTitle,
	toSource,
	// toDriverCode,
	joinContainer,
	addInArrayOnKey,
	calDetentionDays:dateUtil.calDetentionDays,
	calDays: dateUtil.calDays,
	calDays2: dateUtil.calDays2,
	monthName: dateUtil.monthName,
	year: dateUtil.year,
	proposedDate: dateUtil.proposedDate,
	selectGreaterDate:dateUtil.selectGreaterDate,//santosh
	ddmmyyyyStringToDate:dateUtil.ddmmyyyyStringToDate,//santosh
	absRound:dateUtil.absRound,//santosh
	getDateDifferece:dateUtil.getDateDifferece,//santosh
	colDecide,
	consignerOrConsignee,
	showProvisional,
	detentionBind,
	financialYear,
	isTaxApplied,
	isTaxAppliedCondition,
	numberToArray,
	addByMultiple,
	sumOfMultiple,
	divide,
	exceldate,
	diffOfMultiple,
	clubRateOfSameTripTogether,
	isContainerised,
	gstRowCount,
	vehicleArrivalDate,
	decimalParse,
	gstTotal,
	inWords,
	itemsAmtSum,
	clubingGrOnTripBasis,
	calcRTDatePeriod,
	toFixed,
	twodecTwopt,
	twodec,
	threedec,
	threedecThreept,
	sumOfBillCharges,
	sumOfCharges,
	sortGrNumber,
	sortBillNumber,
	dateUtilFn,
	arrFetchKey,
	concatAddress,
	isDefine,
	isSubstring,
	isExists,
	filter,
	log,
	getGrDate,
	multiGrItem,
	multiGrHero,
	stateCode,
	castrolFreightConfig,
	putValue,
	renaultArrToSting,
	mndlezCal,
	tripMultiInvoice,
	tripMultiGr,
	tripMultiGrSlNo,
	creditNote,
	grPrintBuilty,
	carvCal,
	carvCalWithCharg,
	tripSettlement,
	stcHero_gr,
	moneyReceipt,
	removeNegative,
	zero,
	commafy,
	supplymentryBillConfig,
	coverNoteAggregator,
	coverNoteMultiGr,
	getUniqueDestination,
	getUniqueConsigneeName,
	getRate,
	lowerToUpperCase,
	lowerToUpperFirstLetterOfWord,
	dotdate,
	wbr,
	numfy,
	noOfDaysInMonth,
	purchaseBillCal,
	sortDate,
	dateF,
	newdDate,
	newLine,
	roundOff,
	hyphenSeperatorF,
	hyphenSeperatorS,
	gstPercCheck
};

module.exports = helpers;

function newLine(str) {

	var newStr = str.split(",").join("\n")
	return newStr;
}

function hyphenSeperatorF(str) {
	let arr = str.split("-");
	return arr[0];
}

function hyphenSeperatorS(str) {
	let arr = str.split("-");
	return arr[1];
}

function assign(obj, key, value) {
	if (obj)
		obj[key] = value;

	return value;
}

function eq(v1, v2) {
	return v1 === v2;
}

function gstApplied(v1) {
	return (v1 === true ? "Yes" : "No");
}

function ne(v1, v2) {
	return v1 !== v2;
}

function lt(v1, v2) {
	return v1 < v2;
}

function gt(v1, v2) {
	return v1 > v2;
}

function lte(v1, v2) {
	return v1 <= v2;
}

function gte(v1, v2) {
	return v1 >= v2;
}

function and(v1, v2) {
	return v1 && v2;
}

function or(v1, v2) {
	return v1 || v2;
}

function generateVehicleWiseSno(billObj) {
	let counter = 1;
	let tempArr = [];
	billObj.items.forEach(oBill => {
		let isExist = !!tempArr.find(o => oBill.gr.trip.vehicle_no === o);

		if (isExist) {
			oBill.newSno = '';
		} else {
			oBill.newSno = counter++;
			tempArr.push(oBill.gr.trip.vehicle_no);
		}
	});
}

function inc(value, options) {
	return parseInt(value) + 1;
}

function checkLen(value) {
	if (value && value.length > 0) {
		return value.join(', ')
	}
	else {
		return " "
	}
}

function add(v1, v2) {
	return (v1 + v2);
}

function addUnlimited(...args) {
	return (args.reduce((acc, curr) => {
		if (typeof curr === 'number') {
			return acc + curr;
		} else {
			return acc + 0;
		}
	})).toFixed(2);
}

function arrayOfObjectToArray(input, ele, returnFalseString) {

		if (Array.isArray(input))
			return input.map(obj => obj ? obj[ele]:[]);
		else
			return typeof returnFalseString !== 'undefined' ? returnFalseString : 'NA';

};

function multiple(v1 = 0, v2 = 0) {
	return (v1 * v2);
}

function subtract(v1 = 0, v2 = 0) {
	if ((Number.isFinite(v1)) && (Number.isFinite(v2))) {
		return (v1 - v2);
	} else {
		return v1;
	}
}

function subtractNum(v1 = 0, v2 = 0) {
		v1 = parseInt(v1);
		v2 = parseInt(v2);
		// if(v1 > v2)
			return (v1 - v2);
	// 	else if(v2 > v1)
	// 		return -(v2 - v1);
	// else {
	// 	return 0;
	// }
}

function calcBalPerKm(a, b, c) {
	let r = ((a - b) / c);
	return isNaN(r) ? '' : r.toFixed(2);
}

function addMultiple(v1, v2, v3) {
	return v1 + v2 + v3
}

function date(value, format) {
	let str = "DD/MM/YYYY";
	if (typeof format == 'string')
		str = format;

	return (value) ? moment(value).format(str) : "";
}

function datemonth(value, format) {
	let str = "DD-MMM-YYYY";
	if (typeof format == 'string')
		str = format;
	return (value) ? moment(value).format(str) : "";
}

function dateTime(value) {
	return (value) ? moment(value).format("DD/MM/YYYY h:mm a") : "";
}

function calTime(value) {
	return (value) ? moment(value).format("hh:mm a") : "";
}

function parseAddress(value) {
	return parseOaddressToString(value)
}

function toTitle(str) {
	if(str) {
		str = str.toLowerCase().split(' ');
		for (let i = 0; i < str.length; i++) {
			str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
		}
	return str.join(' ');
	}
}
function toSource(str){
	let key = str.split(" ");
	let source = key[0];

	return source;
}
// function toDriverCode(str, type){
// 	let key = str.split("(");
// 	// let driver = key[0];
// 	let temp = key[1];
// 	let key2 = temp.split(")");
// 	// let code = key2[0];
//
// 	if(type === 'driver')
// 		return key[0];
// 	else
// 		return key2[0];
// }

function joinContainer(aData, key) {

	if(!(Array.isArray(aData)))
		return 0;

	let toReturn = aData.reduce(function (accumulator, currentValue) {
			return accumulator + ((currentValue[key]) ? currentValue[key] + (key === "length" ? " Feet ," : ", ") : "");
		},
		""
	);
	return toReturn;
}

function addInArrayOnKey(aData, key) {
	let toReturn = aData.reduce(function (accumulator, currentValue) {
			let keys = key.split(".");
			let cv = currentValue;
			for (let key of keys) {
				if (cv)
					cv = cv[key];
				else {
					cv = 0;
					break;
				}
			}
			return accumulator + ((cv) ? cv : 0);
		},
		0
	);
	return toReturn;
}

function colDecide(val, num) {
	if (val) {
		return num + 1;
	} else {
		return num;
	}
}

function consignerOrConsignee(a, b) {
	if (a && b) {
		if (a === b) {
			return a;
		} else {
			return a + "/ " + b;
		}
	} else if (a) {
		return a;
	} else {
		return b;
	}
}

function showProvisional(type) {
	if (type && (type === "Provisioned Bill")) {
		return true;
	} else {
		return false;
	}
}

function detentionBind(a, b, c) {
	return a + "-" + b + " Days :" + c;
}

function financialYear() {
	let year = (new Date()).getFullYear();
	let finYr, finNextYr;
	if ((new Date()).getMonth() >= 3) {
		finYr = year;
		finNextYr = (year + 1).toString().substr(2, 2);
	} else {
		finYr = year - 1;
		finNextYr = year.toString().substr(2, 2);
	}
	return finYr + "-" + finNextYr;
}

function isTaxApplied(billingParty) {
	return billingParty.category && billingParty.category === 'RCM' && 'Yes' || 'No';
}

function isTaxAppliedCondition(billingParty) {
	return !!(billingParty.category && billingParty.category === 'RCM');
}

function numberToArray(num) {
	return (num > 0) ? (new Array(num).fill(null).map(v => {
		'hii'
	})) : [];
}

function addByMultiple(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z) {
	let sum = (
		(Number.isFinite(a) ? a : 0) +
		(Number.isFinite(b) ? b : 0) +
		(Number.isFinite(c) ? c : 0) +
		(Number.isFinite(d) ? d : 0) +
		(Number.isFinite(e) ? e : 0) +
		(Number.isFinite(f) ? f : 0) +
		(Number.isFinite(g) ? g : 0) +
		(Number.isFinite(h) ? h : 0) +
		(Number.isFinite(i) ? i : 0) +
		(Number.isFinite(j) ? j : 0) +
		(Number.isFinite(k) ? k : 0) +
		(Number.isFinite(l) ? l : 0) +
		(Number.isFinite(m) ? m : 0) +
		(Number.isFinite(n) ? n : 0) +
		(Number.isFinite(o) ? o : 0) +
		(Number.isFinite(p) ? p : 0) +
		(Number.isFinite(q) ? q : 0) +
		(Number.isFinite(r) ? r : 0) +
		(Number.isFinite(s) ? s : 0) +
		(Number.isFinite(t) ? t : 0) +
		(Number.isFinite(u) ? u : 0) +
		(Number.isFinite(v) ? v : 0) +
		(Number.isFinite(w) ? w : 0) +
		(Number.isFinite(x) ? x : 0) +
		(Number.isFinite(y) ? y : 0) +
		(Number.isFinite(z) ? z : 0)
	);
	return sum;
}

function sumOfMultiple(...arr) {
	return (arr || []).reduce((a, b) => a + (numberUtils.isNumber(b) || 0), 0);
}

function divide(numerator = 0, denominator = 0) {
	return Math.round((numerator / denominator) * 10000) / 10000;
}

function diffOfMultiple(...arr) {
	return (arr || []).reduce((a, b) => (numberUtils.isNumber(b) || 0) - a, 0);
}

function clubRateOfSameTripTogether(arr) {

// showThisRow
//sumRate
//rowSpanValue

	let i = 0;

	arr[i].showThisRowSpan = true;
	arr[i].sumRate = arr[i].rate;
	arr[i].rowSpanValue = 1;

	for (let j = 1; j < arr.length; j++) {
		if (arr[i].gr.trip.trip_no === arr[j].gr.trip.trip_no) {
			arr[j].showThisRowSpan = false;
			arr[i].sumRate += arr[j].rate;
			arr[i].rowSpanValue++;
		} else {
			i = j;
			arr[i].showThisRowSpan = true;
			arr[i].sumRate = arr[i].rate;
			arr[i].rowSpanValue = 1;
		}
	}

	return '';
}

function isContainerised(type) {
	return ((type === "Import - Containerized") || (type === "Export - Containerized") || (type === "Import - Loose Cargo") || (type === "Export - Loose Cargo")) ? true : false;
}

function gstRowCount(data) {
	let count = 0;
	data.cGST && count++;
	data.sGST && count++;
	data.iGST && count++;
	return count;
}

function vehicleArrivalDate(aData) {
	let found = aData.reverse().find((e) => {
		if (e.status === "Vehicle Arrived for unloading") {
			return true;
		}
	}) || {};
	if (found && found.date) {
		return found.date
	} else {
		return false;
	}
}

function decimalParse(value) {
	return value && typeof value === 'number' ? parseFloat(value).toFixed(2) : value;
}

function gstTotal(igst, cgst, sgst) {
	if (igst) {
		return igst;
	} else {
		return ((cgst || 0) + (sgst || 0));
	}

}

function gstPercCheck(billObj) {
	if (billObj.iGST_percent)
		return billObj.iGST_percent;
	else if(billObj.sGST_percent)
		return billObj.sGST_percent;
	else if(billObj.cGST_percent)
		return billObj.cGST_percent;
	else
		return 0;

}

function inWords(value) {
	if(value > 0)
		return value ? toWords(parseFloat(value).toFixed(2)) : 0;
	else{
		value = -(value);
		return value ? "Minus " + toWords(parseFloat(value).toFixed(2)) : 0 ;

	}
}

function clubingGrOnTripBasis(billObj) {

	billObj.items.forEach((obj, index, array) => {
		if (!obj.gr.isGrBillable) {
			obj.skip = true;
			let newIndex;

			if (array[index - 1] && obj.gr.trip.trip_no === array[index - 1].gr.trip.trip_no)
				newIndex = index - 1;
			else if (array[index + 1] && obj.gr.trip.trip_no === array[index + 1].gr.trip.trip_no)
				newIndex = index + 1;

			array[newIndex].dealer2 = array[index].gr.consignee.name;
			array[newIndex].destination2 = array[index].gr.acknowledge.destination;
			array[newIndex].gr.grNumber += ', ' + array[index].gr.grNumber;
		}
	});

	billObj.items = billObj.items.filter(o => !o.skip);

	return '';
}

function calcRTDatePeriod(aTrip) {
	let tripStarted = aTrip[0].statuses.find(st => st.status === 'Trip started');
	let tripEnded = aTrip.slice(-1)[0].statuses.find(st => st.status === 'Trip ended');
	return `${moment(tripStarted.date).format('DD/MM/YYYY')} To ${moment(tripEnded.date).format('DD/MM/YYYY')}`;
}

function toFixed(number, string) {

	let ret = '';
	if (typeof string != 'object')
		ret = string;

	if (string == 'roundOff')
		number = Math.round(number);

	return (Math.round(number * 100) / 100) || ret;
}

function twodec(x) {
	if (x) {
		return x.toFixed(2);
	} else {
		return x;
	}
}

function twodecTwopt(x) {
	if (x) {
		return x.toFixed(2);
	} else {
		return x.toFixed(2);
	}
}
function threedec(x) {
	if (x) {
		return x.toFixed(3);
	} else {
		return x;
	}
}
function threedecThreept(x) {
	if (x) {
		return x.toFixed(3);
	} else {
		return x.toFixed(3);
	}
}


function sumOfBillCharges(charges, arr = []) {

	let sum = 0;

	if (arr.length) {

		arr.forEach(str => {
			sum += (charges[str] || 0);
		});

	} else {
		for (let c in charges) {
			sum += (charges[c] || 0);
		}
	}

	return sum;
}

function sumOfCharges(charges, arr = []) {

	let sum = 0;

	if (arr.length) {

		arr.forEach(str => {
			sum += (charges[str] || 0);
		});

	} else {
		for (let c in charges) {
			if (charges[c]["amount"]) {
				sum += (charges[c]["amount"] || 0);
			}
		}
	}

	return sum;
}

function dateUtilFn(name, ...arg) {
	return dateUtil[name](...arg);
}

function arrFetchKey(arr, index, key) {
	return arr[index] && arr[index][key] || '';
}

function concatAddress(val, toRetrun = ''){
	val = val || {};
     let address;
    if(val.line1)
	    address = val.line1 + ", ";
	if(val.line2)
		address = address.concat(val.line2) + ", ";
	if(val.city)
		address = address.concat(val.city) + ", ";
	if(val.district)
		address = address.concat(val.district) + ", ";
	if(val.state)
		address = address.concat(val.state) + ", ";
	if(val.pincode)
		address = address.concat(val.pincode) + ", ";
	if(val.country)
		address = address.concat(val.country) + ", ";

	return address || toRetrun;
}

function isDefine(val, toRetrun = '') {
	let ret = '';
	if (typeof toRetrun != 'object')
		ret = toRetrun;
	return val || ret;
}

function isSubstring(val, toRetrun = '') {
	let ret;
	if (typeof toRetrun != 'object')
		ret = toRetrun;

	if(val)
		ret = val.substring(2, 12);

	return  ret || val;
}

function isExists(val, toRetrun = '') {
	let ret = toRetrun;
	if (val)
		return ret;
	else
	    return val;
}

function filter(arr = [], filterKey, filterValue, objKey = false) {
	let findValue = arr.find(o => o[filterKey] === filterValue);
	if (findValue && objKey)
		return findValue[objKey];
	else
		return findValue;
}

function log(...param) {
	console.log(...param);
}

function getGrRemarks(creditNote){
	let remark = '';
 	creditNote.grs.forEach((g, index) => {
		remark += g.remark ? g.remark + (index != creditNote.grs.length-1 ? ' , ' : '') : '';
	});


	// if (remark.charAt(remark.length - 1) == ',') {
	// 	remark = remark.substr(0, remark.length - 1);
	//   }
	return remark;
}

function getConsignee(oCreditNote){
	oCreditNote.consignee = {
		name: '',
		address: ''
	};
	for(let i=0; i<oCreditNote.billRef.items.length; i++){
		if(oCreditNote.billRef.items[i].gr.consignee){
			oCreditNote.consignee.name = oCreditNote.billRef.items[i].gr.consignee.name;
			oCreditNote.consignee.address = oCreditNote.billRef.items[i].gr.consignee.address;
			break;
		}
	}
}

function getGrDate(aGr = []) {
	let aDate = aGr.map(o => new Date(o.gr.grDate).getTime());
	aDate.sort((a, b) => a - b);
	if (aDate.length === 0)
		return '';
	else if (aDate.length === 1)
		return moment(aDate[0]).format("DD/MM/YYYY");
	else
		return moment(aDate[0]).format("DD/MM/YYYY") + ' to ' + moment(aDate.splice(-1)[0]).format("DD/MM/YYYY");

}

function dotdate(date) {
	return moment(date).format("DD.MM.YYYY");

}

function exceldate(date) {
	return moment(date).format("DD/MM/YYYY");

}

function newdDate(date){
	return moment(date).format("DD/MM/YY")
}

function multiGrItem(oBill, applyCharges = true) {

	oBill = supplymentryBillConfig(oBill);

	oBill.newItems = [];
	oBill.aggCharges = 0;
	oBill.totalFreight = 0;
	oBill.totalBasicFreight = 0;
	oBill.totalQty = 0;
	oBill.totGrRate = 0;
	oBill.totalChargesWithoutTax = 0;
	oBill.aggTotFreight = 0;
	oBill.totDetention = 0;
	oBill.totOtherCharges = 0;
	oBill.totWeight = 0;
	oBill.totGrToll = 0;
	oBill.totTwoPoint = 0;
	oBill.aggDetentionOthercharges = 0;
	//oBill.totalExtra_running = 0;
	let counter = {flag: true, val: 1};
	oBill.tripCount=0;
	oBill.count=0;
	oBill.prevTripNo='';

	oBill.items.forEach(oGr => {
		oBill.tripCount=oBill.prevTripNo!==oGr.gr.trip_no?oBill.tripCount+1:oBill.tripCount;
		if(oBill.tripCount>oBill.count)
			oGr.gr.invoices[0].slNo=oBill.tripCount;
		oGr.gr.invoices[oGr.gr.invoices.length-1].slRow=oBill.tripCount;
		oBill.prevTripNo=oGr.gr.trip_no;
		oBill.count=oBill.tripCount||0;

		oGr.gr.charges = oGr.gr.charges || {};
		oGr.aggCharges = oGr.gr.totalCharges || 0; //sumOfBillCharges(oGr.gr.charges) || 0;
		oBill.aggCharges += oGr.aggCharges;
		oGr.totalBasicFreight = 0;
		oBill.totalChargesWithoutTax += oGr.totalChargesWithoutTax || 0;
		oGr.totalNoOfUnits = 0;
		oGr.totRate = 0;
		oGr.totalNoOfWeight = 0;
		//oGr.totalExtra_running = 0;
		oGr.totTollCharge = (oGr.gr.charges.toll_charges || 0);
		oBill.totTwoPoint  += (oGr.gr.charges && oGr.gr.charges.twoPtDelivery || 0);
		oGr.detentionCharges = ((oGr.gr.charges && oGr.gr.charges.detentionLoading || 0) + (oGr.gr.charges && oGr.gr.charges.detentionUnloading || 0));
		oGr.otherCharges = (oGr.gr.totalCharges || 0) - (oGr.detentionCharges || 0);
		oBill.aggDetentionOthercharges = (oGr.otherCharges || 0) + (oGr.detentionCharges || 0);
		oBill.aggTotFreight += oGr.totFreight;
		oBill.totDetention += (oGr.detentionCharges || 0);
		oBill.totOtherCharges += (oGr.otherCharges || 0);

		oBill.totalInvoice = oGr.gr.invoices.length;
		oBill.source = oGr.gr.acknowledge.source;
		oBill.destination = oGr.gr.acknowledge.destination;
		oBill.vehicleNo = oGr.gr.trip.vehicle_no;
		oGr.gr.invoices.forEach((o, i) => {
			// oGr.totalBasicFreight += o.freight;
			oGr.totalNoOfUnits += o.noOfUnits || 0;
			oGr.totRate += o.rate || 0;
			oGr.totalNoOfWeight += o.weightPerUnit || 0;
			let gr = JSON.parse(JSON.stringify(oGr.gr));

			if (i > 0) { // make
				gr.charges = {};
				gr.deduction = {};
				gr.totalFreight = 0;
			}

			oBill.newItems.push({
				...oGr,
				gr,
				__item: o,
				sno: counter.flag ? counter.val : ''
			});

			counter.flag = false;
		});
		oBill.totalFreight += oGr.gr.totalFreight;
		oBill.totalBasicFreight += oGr.gr.basicFreight;
		oBill.totalQty += oGr.totalNoOfUnits;
		oBill.totWeight += oGr.totalNoOfWeight;
		oBill.totGrRate += oGr.totRate;
		oBill.totGrToll += oGr.totTollCharge;
		//oBill.totalExtra_running += oGr.gr.charges.extra_running || 0;

		if (oGr.gr.diesel_index) {
			oBill.diesel_index = oGr.gr.diesel_index;
		}

		counter.val++;
		counter.flag = true;
	});

	if (applyCharges) {
		oBill.totalFreightWithCharges = oBill.totalBasicFreight + oBill.aggCharges;
	} else {
		oBill.totalFreightWithCharges = oBill.totalFreight;
	}

	if (oBill.iGST_percent) {
		oBill.iGST = (oBill.totalFreightWithCharges * oBill.iGST_percent / 100) || 0;
	} else {
		oBill.cGST = (oBill.totalFreightWithCharges * oBill.cGST_percent / 100) || 0;
		oBill.sGST = (oBill.totalFreightWithCharges * oBill.sGST_percent / 100) || 0;
	}

	if (applyCharges) {
		oBill.totalChargesWithoutTax = oBill.totalChargesWithoutTax;
	} else {
		oBill.totalChargesWithoutTax = 0;
	}

	oBill.totalAmount = oBill.totalFreightWithCharges + oBill.iGST + oBill.cGST + oBill.sGST + oBill.totalChargesWithoutTax;

}

function multiGrHero(oBill) {
	oBill.freightTotal=0;
	oBill.freightDphTotal=0;
	oBill.dphTotal=0;
	oBill.gstTotal=0;
	oBill.finalAmount=0;

	oBill && oBill.items && oBill.items.forEach(oGr => {
			oGr.vehicleNo=oGr.gr && oGr.gr.trip && oGr.gr.trip.vehicle_no;
			oGr.rate=oGr.gr && oGr.gr.invoices && oGr.gr.invoices[0] && oGr.gr.invoices[0].rate || 0;
			oGr.maxDate=oGr.gr && oGr.gr.gateoutDate;
			oGr.delDate=oGr.gr && oGr.gr.pod && oGr.gr.pod.billingUnloadingTime;
			oGr.alt=Math.round(Math.abs(dateUtil.getDateDifferece(oGr.gr.pod.billingUnloadingTime, oGr.maxDate, 'day'))) ||0;
			oGr.ltapc=oGr.gr.standardTime;
			oGr.delayedDays=oGr.alt-oGr.ltapc;
			oGr.station=lowerToUpperFirstLetterOfWord(oGr.gr.acknowledge.destination);
			oGr.dph=oGr.rate*((oGr.gr && oGr.gr.invoices && oGr.gr.invoices[0] && oGr.gr.invoices[0].dphRate||1)/100) ||  0;
			oGr.capacity=oGr.gr && oGr.gr.invoices && oGr.gr.invoices[0] && oGr.gr.invoices[0].baseValueLabel;
			oGr.igst=(oGr.rate+oGr.dph)*12/100 ||0;
			oGr.totalAmount=oGr.rate+oGr.dph+oGr.igst ||0;
			oGr.totalDphAmount=oGr.rate+oGr.dph ||0;
			oBill.freightTotal+=oGr.rate;
			oBill.freightDphTotal+=oGr.totalDphAmount;
			oBill.dphTotal+=oGr.dph;
			oBill.gstTotal+=oGr.igst;
			oBill.finalAmount+=oGr.totalAmount;
		}

	);

}

function stateCode(stateCode) {
	if ((stateCode || '').toString().length != 2)
		return '0' + stateCode;
	return stateCode;
}

function castrolFreightConfig(billObj) {

	let foundGr = billObj.items.find(o => o.gr.diesel_index);
	billObj.diesel_index = foundGr && foundGr.gr.diesel_index || 0;

	billObj.totalNotGST = 0;
	billObj.aggFreight = 0;
	billObj.aggDetention = 0;
	billObj.aggUnloadingCharge = 0;
	billObj.aggToll = 0;
	billObj.aggGreen = 0;
	billObj.aggTotFreight = 0;
	billObj.totBasicFreight = 0;
	billObj.totOther_charges = 0;
	billObj.totLoadingCharge = 0;
	billObj.totUnloadingCharge = 0;
	billObj.totTwoPtCharge = 0;
	billObj.dieselCharge = 0;
	billObj.totdieselCharge = 0;
	billObj.totDetentionLoadingCharge = 0;
	billObj.totCartageCharges = 0;
	billObj.totDetentionUnloadingCharge = 0;
	billObj.totalChargesWithoutTax = 0;

	billObj.items.forEach((obj, index, array) => {
		obj.gr.charges = obj.gr.charges || {};
		obj.freight = obj.gr.basicFreight || 0;
		billObj.aggFreight += obj.freight;
		billObj.aggTotFreight += obj.gr.totalFreight;
		obj.total = obj.freight + sumOfBillCharges(obj.gr.charges) - sumOfBillCharges(obj.gr.charges, ['diesel_charges']);
		/*sumOfBillCharges(obj.gr.charges)- sumOfBillCharges(obj.gr.charges, ['diesel_charges']);*/
		billObj.totalChargesWithoutTax += (obj.gr.totalChargesWithoutTax || 0);
		billObj.totalNotGST += obj.total;
		billObj.totLoadingCharge += obj.gr.charges.loading_charges || 0;
		billObj.totUnloadingCharge += obj.gr.charges.unloading_charges || 0;
		billObj.totDetentionLoadingCharge += obj.gr.charges.detentionLoading || 0;
		billObj.totCartageCharges += obj.gr.charges.cartageCharges || 0;
		billObj.totDetentionUnloadingCharge += obj.gr.charges.detentionUnloading || 0;
		billObj.totOther_charges += obj.gr.charges.other_charges || 0;
		billObj.totTwoPtCharge += obj.gr.charges.twoPtDelivery || 0;
		billObj.aggToll += obj.gr.charges.toll_charges || 0;
		billObj.aggGreen += obj.gr.charges.green_tax || 0;
		billObj.totdieselCharge += obj.gr.charges.diesel_charges || 0;

		billObj.dieselCharge += (obj.freight * ((billObj.diesel_index || 0) / 100)) || 0;
	});

	// billObj.dieselCharge = billObj.aggFreight * ((billObj.diesel_index || 0) / 100);
	billObj.totalWithDiesel = billObj.totalNotGST + billObj.totdieselCharge;
	billObj.iGST = (billObj.totalWithDiesel * ((billObj.iGST_percent || 0) / 100)) || 0;
	billObj.sGST = (billObj.totalWithDiesel * ((billObj.sGST_percent || 0) / 100)) || 0;
	billObj.cGST = (billObj.totalWithDiesel * ((billObj.cGST_percent || 0) / 100)) || 0;
	billObj.totalAmount = billObj.iGST + billObj.sGST + billObj.cGST + billObj.totalWithDiesel;

	return '';
}

function putValue(valueIn, key, value) {

	if (valueIn)
		valueIn[key] = value;

	return value;
}

function renaultArrToSting(oGr, key) {
	if (key === 'material')
		return oGr.invoices.map(oInv => oInv.billingNoOfUnits + '-' + oInv.material.groupName).join(', ');
	else if (key === 'rate')
		return oGr.invoices.map(oInv => oInv.rate.toFixed(2) + 'x' + oInv.billingNoOfUnits).join(' + ');
	return '';
}

function ProcterandGamble(billObj) {
	billObj.newItems = [];
	billObj.totBasicFreight = 0;
	billObj.aggTotFreight = 0;
	billObj.totOther_charges = 0;

	billObj.items.forEach(function (obj) {

		billObj.totBasicFreight += obj.gr.basicFreight || 0;

		obj.gr.charges = obj.gr.charges || {};
		billObj.totOther_charges += obj.gr.charges.other_charges || 0;

	});

	billObj.aggTotFreight += (billObj.totBasicFreight + billObj.totOther_charges);

	billObj.iGST = (billObj.aggTotFreight * ((billObj.iGST_percent || 0) / 100)) || 0;
	billObj.sGST = (billObj.aggTotFreight * ((billObj.sGST_percent || 0) / 100)) || 0;
	billObj.cGST = (billObj.aggTotFreight * ((billObj.cGST_percent || 0) / 100)) || 0;
	billObj.totalAmount = billObj.iGST + billObj.sGST + billObj.cGST + billObj.aggTotFreight;


}
function moneyReceipt(billObj) {

	billObj.totBillAmt = 0;
	billObj.totFreight = 0;
	billObj.totSettledAmount = 0;
	billObj.deduction = [];
	billObj.arr = [];

	try {
		billObj.receiving.reduce((arr, oRec) => {
			oRec.settledAmount = 0;
			if (oRec.deduction.length) {
				oRec.deduction.forEach(o => {
					o.grNumber = oRec.grNumber,
						o.billNo = oRec.billNo,
						billObj.deduction.push(o);
				});
			}
			if (oRec.billRef) {
				oRec.billRef.receiving = oRec.billRef.receiving || {};
				oRec.billRef.receiving.deduction = oRec.billRef.receiving.deduction || [];
				oRec.billRef.receiving.moneyReceipt = oRec.billRef.receiving.moneyReceipt || [];
				if (oRec.billRef.items && oRec.billRef.items[0].gr && oRec.billRef.items[0].gr._id)
					oRec.billRef.items.forEach(oItem => {
						oItem.billRecDecRef = oRec.billRef.receiving.deduction.filter(o => (o.grRef && o.grRef.toString()) === (oItem.gr._id && oItem.gr._id.toString()));
						oItem.billRecMrRef = oRec.billRef.receiving.moneyReceipt.reduce((arr, oMr) => {
							arr.push(...oMr.grs.filter(o => (o.grRef && o.grRef.toString()) === (oItem.gr._id && oItem.gr._id.toString())).map(o => {
								o.mrNo = oMr.mrNo;
								return o;
							}));
							return arr;
						}, []);


						oRec.settledAmount =
							oItem.billRecDecRef
								.filter(o => !o.mrNo ? true : o.mrNo != billObj.mrNo)
								.reduce((amt, oBill) => amt + (oBill.amount || 0), 0) +
							oItem.billRecMrRef
								.filter(o => !o.mrNo ? true : o.mrNo != billObj.mrNo)
								.reduce((amt, oBill) => amt + (oBill.amount || 0), 0);
					});
			}
			if (oRec.billRef && oRec.grRef) {
				let itemRef = oRec.billRef.items.find(o => (o.gr._id && o.gr._id.toString()) === (oRec.grRef && oRec.grRef.toString()));
				oRec.freightAmt = 0;
				oRec.billAmt = 0;

				oRec.billAmt = oRec.billRef.billAmount;
				oRec.freightAmt = itemRef.gr.totalFreight;
				billObj.totBillAmt += oRec.billAmt;
				billObj.totFreight += oRec.freightAmt;
				billObj.totSettledAmount += oRec.settledAmount;

			}

			return arr;
		}, []);

		//for Bill wise data
		billObj.billReceiving.forEach(obj => {

			let oBill = {
				totReceived : 0,
				totalDeduction : 0,
				tdsAmt : 0,
				grNumber : [],
				deduction : [],
				totFreight : 0,
				freightAmt: 0,
				totSettledAmount : 0,
				totBillAmt: 0
			};

			billObj.receiving.forEach(o => {

				if(obj.billRef.toString() === o.billRef._id.toString()){
					oBill.billNo = o.billNo;
					oBill.billRef = o.billRef._id.toString() ;
					oBill.bP = o.bP.toString() ;
					oBill.bpNam = o.bpNam ;
					oBill.bpAccNam = o.bpAccNam ;
					oBill.grRef = o.grRef.toString() ;
					oBill.grNumber.push(o.grNumber);
					oBill.deduction.push(o.deduction) ;
					oBill.totalDeduction += (o.totalDeduction ? o.totalDeduction : 0) ;
					oBill.tdsAmt += (o.tdsAmt ? o.tdsAmt : 0) ;


					if (o.billRef.items && o.billRef.items[0].gr && o.billRef.items[0].gr._id) {
						o.billRef.items.forEach(oItem => {

							oBill.settledAmount =
								oItem.billRecDecRef
									.filter(o => !o.mrNo ? true : o.mrNo != billObj.mrNo)
									.reduce((amt, objBill) => amt + (objBill.amount || 0), 0) +
								oItem.billRecMrRef
									.filter(o => !o.mrNo ? true : o.mrNo != billObj.mrNo)
									.reduce((amt, objBill) => amt + (objBill.amount || 0), 0);
						});
					}


					if (o.billRef._id.toString() && o.grRef.toString()) {
						let itemRef = o.billRef.items.find(ob => (ob.gr._id && ob.gr._id.toString()) === (o.grRef && o.grRef.toString()));
						// o.freightAmt = 0;
						oBill.billAmt = 0;

						oBill.billAmt = o.billRef.billAmount;
						oBill.freightAmt = itemRef.gr.totalFreight;
						oBill.totBillAmt += o.billAmt;
						oBill.totFreight += o.freightAmt;
						oBill.freightAmt = o.freightAmt; // top level
						// oBill.totFreight = o.totFreight; // top level
						oBill.totSettledAmount += oBill.settledAmount;

					}
				}


			});

			oBill.grNumber.toString();
			oBill.totReceived = obj.totReceived || 0;
			billObj.arr.push(oBill);
		});

	}catch (e) {
		console.log(e);
	}
}

function tripSettlement(tempData){
	tempData.totGrWeight = 0;
	tempData.totGrRate = 0;
	tempData.totGrAmt = 0;
	tempData.totAdvLtr = 0;
	tempData.totAdvAmt = 0;
	tempData.totAdvExp = 0;
	tempData.totAdvExp = 0;
	tempData.totAdvExp = 0;
	tempData.totExpAmt =0;
	// let length = Math.max(tempData.aExp.length, tempData.aAdv.length );
	// if (length > 7)
	// 	totLength = length;
	// else
	// 	totLength = 7;
	let mergeData = [];
	let mergeExpData = [];
	let Fastag = [];
	tempData.aTrip.sort( (a,b) => new Date(a.tripStartDate) - new Date(b.tripStartDate) );
	tempData.tripEndDate = (tempData.aTrip.slice(-1)[0].tripEndDate);
	// tempData.aAdv.sort( (a,b) => new Date(a.date) - new Date(b.date));
	let newExpArr = ['Route Exp', 'Labour', 'Toll Tax', 'Salary', 'Prize', 'Repair', 'Challan', 'Fastag'];
	// let len = 0;

	for(let i =0; i< 8; i++) {
		mergeExpData[i] = {};
		tempData.aExp.find(obj => {
			if (newExpArr[i] === obj.type) {
				mergeExpData[i].expType = obj.type;
				mergeExpData[i].expAmt = obj.amount || 0;
			}
		})
		if (i < 8 && !mergeExpData[i].expType) {
			mergeExpData[i].expType = newExpArr[i];
			mergeExpData[i].expAmt = 0;
		}
	}

	// let m = 0;
	// for(let i =0; i< newExpArr.length; i++) {
	// 	mergeExpData[m] = {};
	// 	tempData.aExp.find(obj => {
	// 		if (newExpArr[m] === obj.type) {
	// 			mergeExpData[m].expType = obj.type;
	// 			mergeExpData[m].expAmt = obj.amount || 0;
	// 			m++;
	// 		}
	// 	})
	// 	// if (i < 8 && !mergeExpData[i].expType) {
	// 	// 	mergeExpData[i].expType = newExpArr[i];
	// 	// 	mergeExpData[i].expAmt = 0;
	// 	// }
	// }

	// c = m;
	c=8;
	tempData.aExp.forEach(obj => {
		mergeExpData[c] = {};
		if (!newExpArr.includes(obj.type)) {
			mergeExpData[c].expType = obj.type || '';
			mergeExpData[c].expAmt = obj.amount || 0;
			c++;
		}
	})
	let length = Math.max(tempData.aAdv.length, mergeExpData.length );
	for(let i =0; i<length; i++){
		mergeData[i] = {};
		if(tempData.aAdv[i]){
			mergeData[i].advDate = tempData.aAdv[i] && tempData.aAdv[i].date || '';
			mergeData[i].advType = tempData.aAdv[i] && tempData.aAdv[i].advanceType || '';
			mergeData[i].advSlipNo = tempData.aAdv[i] && tempData.aAdv[i].reference_no || '';
			mergeData[i].advDieselLtr = tempData.aAdv[i] && tempData.aAdv[i].dieseInfo && tempData.aAdv[i].dieseInfo.litre || 0;
			mergeData[i].advAmount = tempData.aAdv[i] && tempData.aAdv[i].amount || 0;
			if(mergeData[i].advType === 'Fastag' )
				mergeData[i].advStation = 'Delhi-ho';
			else
				mergeData[i].advStation = tempData.aAdv[i].branch && tempData.aAdv[i].branch.name || '';
			tempData.totAdvLtr += mergeData[i].advDieselLtr || 0;
			tempData.totAdvAmt += mergeData[i].advAmount || 0;
		}

		if(mergeExpData){
			if(!mergeData[i])
				mergeData[i] = {};
			mergeData[i].expType = mergeExpData[i] && mergeExpData[i].expType || '';
			mergeData[i].expAmt = mergeExpData[i] && mergeExpData[i].expAmt || 0;
			tempData.totExpAmt += mergeData[i].expAmt || 0;
		}

		// if(!mergeData[i])
		// 	mergeData[i] = {};
		//
		// tempData.aExp.find(obj => {
		// 	if(newExpArr[i] === obj.type){
		// 		mergeData[i].expType = obj.type;
		// 		mergeData[i].expAmt = obj.amount || 0;
		// 		tempData.totExpAmt += mergeData[i].expAmt || 0;
		// 		len += 1;
		// 	}
		// })
		// if(!mergeData[i].expType){
		// 	mergeData[i].expType = newExpArr[i];
		// 	mergeData[i].expAmt = 0;
		// }
		// if(totLength > 7){
		// 	mergeData[i].expType = tempData.aExp[i] && tempData.aExp[i].type || '';
		// 		mergeData[i].expAmt = tempData.aExp[i] && tempData.aExp[i].amount || 0;
		// 		tempData.totExpAmt += mergeData[i].expAmt || 0;
		// }


		// if(tempData.aExp[i]){
		// 	if(!mergeData[i])
		// 		mergeData[i] = {};
		// 	mergeData[i].expType = tempData.aExp[i] && tempData.aExp[i].type || '';
		// 	mergeData[i].expAmt = tempData.aExp[i] && tempData.aExp[i].amount || 0;
		// 	tempData.totExpAmt += mergeData[i].expAmt || 0;
		// }
	}
	//to show fastag in expenses
	// mergeData.find(o => {
	// 	if(o.advType === "Fastag"){
	// 		mergeData[tempData.aExp.length].expType = o.advType;
	// 		mergeData[tempData.aExp.length].expAmt = o.advAmount;
	// 		tempData.totExpAmt += o.advAmount || 0;
	// 	}
	// });


	mergeData[mergeData.length] = Fastag[0];
	tempData.mergeData = mergeData;
	tempData.aGr.forEach(obj => {
		tempData.totGrWeight += obj.invoices && obj.invoices.length && obj.invoices[0].weightPerUnit || 0;
		tempData.totGrRate += obj.invoices && obj.invoices.length && obj.invoices[0].rate || 0;
		tempData.totGrAmt += obj.basicFreight || 0;
	});

	// tempData.advanceBudget.forEach(obj => {
	// 	tempData.totAdvLtr += obj.diesel_info.litre || 0;
	// 	tempData.totAdvAmt += obj.diesel_info.rate || 0;
	// 	// tempData.totAdvExp = 0;
	//
	// });
}

function stcHero_gr(tempData){

	let mergeData = [];
	let fixedDataArray = ['Freight', 'Labour charges', 'LR charges' , 'Delivery charges'];
	let invoiceArray = [];
	 tempData.sumInvoiceAmt = 0;
	 tempData.gstInvoices='';
	 tempData.totBoxes=0;
	tempData.grData.invoices.forEach((obj, index) => {
		invoiceArray[index] = {};
		invoiceArray[index].noOfUnits = obj.noOfUnits || '';
		tempData.gstInvoices += obj.ref2 + ', ' || '';
		tempData.totBoxes+=obj.billingNoOfUnits || 0;
		invoiceArray[index].invoiceNo = obj.invoiceNo || '';
		invoiceArray[index].baseValueLabel = obj.baseValueLabel || '';
		invoiceArray[index].weightPerUnit = obj.weightPerUnit || '';
		invoiceArray[index].invoiceAmt = obj.invoiceAmt || '';

		tempData.sumInvoiceAmt += (obj.invoiceAmt || 0);

	});

	let invLength = Math.max(tempData.grData.invoices.length, fixedDataArray.length);
	for(let i =0; i < invLength; i++){
		mergeData[i] = {};
			mergeData[i].noOfUnits = invoiceArray[i] && invoiceArray[i].noOfUnits || '';
			mergeData[i].invoiceNo = invoiceArray[i] && invoiceArray[i].invoiceNo || '';
			mergeData[i].baseValueLabel = invoiceArray[i] && invoiceArray[i].baseValueLabel || '';
			mergeData[i].weightPerUnit = invoiceArray[i] && invoiceArray[i].weightPerUnit || '';
			mergeData[i].invoiceAmt = invoiceArray[i] && invoiceArray[i].invoiceAmt || 0;
			mergeData[i].fixedData = fixedDataArray[i];
	}
	tempData.mergeData = mergeData;
}

function grPrintBuilty(billObj){
	billObj.newItems = [];
	billObj._invoiceAmt = 0;
	billObj.sumNoOfUnits = 0;  //sum of total actual unit
	billObj.sumweightPerUnit = 0;  //sum of total actual unit
	billObj.grData.invoices.forEach(function (obj, i) {
			if(i=== 0){
				billObj.grData.invoices[i].rate = obj.rate;
				billObj.grData.invoices[i].basicFr = billObj.grData.basicFreight;
			}else{
				billObj.grData.invoices[i].rate = '';
				billObj.grData.invoices[i].basicFr = '';
			}
			billObj._invoiceAmt += obj.invoiceAmt;
			billObj.sumNoOfUnits += obj.noOfUnits;
			billObj.sumweightPerUnit += obj.weightPerUnit;
			billObj.newItems.push({
				...obj
			});
	});
}

function mndlezCal(billObj) {

	billObj = supplymentryBillConfig(billObj);

	billObj.newItems = [];
	billObj.vehicle_type = false;
	billObj.vehicle_type1 = false;
	billObj.totBasicFreight = 0;
	billObj.totRate = 0;
	//billObj.totBasicFreightP = 0;
	billObj.totLoadingCharge = 0;
	billObj.totUnloadingCharge = 0;
	billObj.totSuppUnloadingCharge = 0;
	billObj.totSuppUnloadingDetention = 0;
	billObj.totSuppOtherCharges = 0;
	billObj.totDetentionLoadingCharge = 0;
	billObj.totDetentionUnloadingCharge = 0;
	billObj.totTwoPtCharge = 0;
	billObj.totPenaltyCharge = 0;
	billObj.totchargeableTime = 0;
	billObj.totTTDelay = 0;
	billObj.totDamage = 0;
	billObj.totShortage = 0;
	billObj.totDiscount = 0;
	billObj.totAdvance_charges = 0;
	billObj.aggDeduction = 0;
	billObj.totDeduction = 0;
	billObj.totExtra_running = 0;
	billObj.totOther_charges = 0;
	billObj.totGreen = 0;
	billObj.totToll_charges = 0;
	billObj.totOther_charges = 0;
	billObj.totFactory_halt = 0;
	billObj.totCompany_halt = 0;
	billObj.totDiesel_charges = 0;
	billObj.totSuppleDiesel_charges = 0;
	billObj.totOverweight_charges = 0;
	billObj.totExtra_running = 0;
	billObj.totalNoOfUnits = 0;
	billObj.totalInvAmt = 0;//santosh
	billObj.totalBillNoOfUnits = 0;
	billObj.totalActualwt = 0;
	billObj.totalBillwt = 0;
	billObj.aggTotFreight = 0;
	billObj.aggTotFreightN = 0;
	billObj.totiGST = 0;
	billObj.totcGST = 0;
	billObj.totsGST = 0;
	billObj.totalSum = 0;
	billObj.totTAX = 0;
	billObj.toDate = 0;
	billObj.totsourcecode = 0;
	billObj.totdestinationcode = 0;
	billObj.aggCharges = 0;
	billObj.noOfTrips = billObj.items.length || 0;
	if (billObj.items.length)
		billObj.toDate = billObj.items[billObj.items.length - 1].gr.grDate;
	billObj.totalChargesWithoutTax = 0;
	billObj.Nigst = 0;
	billObj.Ncgst = 0;
	billObj.Nsgst = 0;
	//igst,cst,sgst
	billObj.iGSTTotalAmt = 0;
	billObj.sGSTTotalAmt = 0;
	billObj.cGSTTotalAmt = 0;
	// todo this key will be removed by Charan Raj
	billObj.x = 0;
	billObj.y = 0;
	billObj.z = 0;
	// todo end
	billObj.jkTyreTotalAmountWithoutGST = 0;
	billObj.jkTyreTotalAmountWithGST = 0;
	// billObj.receivedAmount = 0;

		billObj.items.forEach(function (obj) {
			if(obj.gr.supplementaryBill && !obj.gr.supplementaryBill.deduction){
				obj.gr.supplementaryBill.deduction = {};
				obj.gr.supplementaryBill.deduction.mamul = 0;
				obj.gr.supplementaryBill.deduction.dalaComission = 0;
				obj.gr.supplementaryBill.deduction.tds = 0;
			}




		obj.aggCharges = obj.gr.totalCharges || 0; //sumOfBillCharges(obj.gr.charges) || 0;

		billObj.aggCharges += obj.aggCharges;
		billObj.totalChargesWithoutTax += (obj.gr.totalChargesWithoutTax || 0);

		obj.aggDeduction = sumOfBillCharges(obj.gr.deduction) || 0;
		billObj.totDeduction += obj.aggDeduction;
		billObj.totsourcecode = obj.gr && obj.gr.trip && obj.gr.trip.ld && obj.gr.trip.ld.code;
		billObj.totdestinationcode = obj.gr && obj.gr.trip && obj.gr.trip.uld && obj.gr.trip.uld.code;
		obj.totNoOfUnits = 0;
		obj.totInv = 0;//santosh
		obj.totBillingNoOfUnits = 0;
		obj.totbillingWeight = 0;
		obj.totweightPerUnit = 0;
		obj.totFreightRate = 0;

		if (obj.gr.trip && obj.gr.trip.ownershipType == "Market")
			billObj.vehicle_type = true;
		if (obj.gr.trip && obj.gr.trip.ownershipType == "Own")
			billObj.vehicle_type1 = true;

		obj.gr.deduction = obj.gr.deduction || {};
		billObj.totBasicFreight += obj.gr.basicFreight || 0;


		obj.gr.charges = obj.gr.charges || {};
		billObj.totLoadingCharge += obj.gr.charges.loading_charges || 0;
		billObj.totUnloadingCharge += obj.gr.charges.unloading_charges || 0;
		billObj.totSuppUnloadingCharge += obj.gr.supplementaryBill && obj.gr.supplementaryBill.charges && obj.gr.supplementaryBill.charges.unloading_charges || 0;
		billObj.totSuppOtherCharges += obj.gr.supplementaryBill && obj.gr.supplementaryBill.charges && obj.gr.supplementaryBill.charges.other_charges || 0;
		billObj.totSuppUnloadingDetention += obj.gr.supplementaryBill && obj.gr.supplementaryBill.charges && obj.gr.supplementaryBill.charges.detentionUnloading || 0;
		billObj.totDetentionLoadingCharge += obj.gr.charges.detentionLoading || 0;
		billObj.totDetentionUnloadingCharge += obj.gr.charges.detentionUnloading || 0;
		billObj.totTwoPtCharge += obj.gr.charges.twoPtDelivery || 0;
		billObj.totExtra_running += obj.gr.charges.extra_running || 0;
		billObj.totOther_charges += obj.gr.charges.other_charges || 0;
		billObj.totGreen += obj.gr.charges.green_tax || 0;
		billObj.totToll_charges += obj.gr.charges.toll_charges || 0;
		billObj.totOther_charges += obj.gr.charges.other_charges || 0;
		billObj.totFactory_halt += obj.gr.charges.factory_halt || 0;
		billObj.totCompany_halt += obj.gr.charges.company_halt || 0;
		billObj.totDiesel_charges += obj.gr.charges.diesel_charges || 0;
		billObj.totOverweight_charges += obj.gr.charges.overweight_charges || 0;
		billObj.totchargeableTime += obj.gr.chargeableTime || 0;
		if (obj.gr.supplementaryBill) {
			billObj.totSuppleDiesel_charges += obj.gr.supplementaryBill.charges ? obj.gr.supplementaryBill.charges.diesel_charges : 0;
		}
		billObj.totBasicFreightP += (billObj.totBasicFreight || 0) + (billObj.totOther_charges);
		billObj.totPenaltyCharge += obj.gr.deduction.penalty || 0;
		billObj.totTTDelay += obj.gr.deduction.ttDelay || 0;
		billObj.totDamage += obj.gr.deduction.damage || 0;
		billObj.totShortage += obj.gr.deduction.shortage || 0;
		billObj.totDiscount += obj.gr.deduction.discount || 0;
		billObj.totAdvance_charges += obj.gr.deduction.advance_charges || 0;
		billObj.aggTotFreight += obj.gr.totalFreight || 0;
		billObj.aggTotFreightN += (obj.gr.totalFreight - ((obj.gr.charges.detentionLoading || 0) + (obj.gr.charges.detentionUnloading || 0) + (obj.gr.charges.unloading_charges || 0)));

		billObj.totiGST += obj.gr.iGST;
		billObj.totcGST += obj.gr.cGST;
		billObj.totsGST += obj.gr.sGST;
		billObj.totalSum += obj.gr.totalAmount;
		billObj.totTAX = billObj.totiGST + billObj.totcGST + billObj.totsGST;

		//igst with 12%
		billObj.iGSTTotalAmt += (obj.gr.totalFreight * 0.12);
		billObj.sGSTTotalAmt += (obj.gr.totalFreight * 0.06);
		billObj.cGSTTotalAmt += (obj.gr.totalFreight * 0.06);

		let lastInv=obj && obj.gr && obj.gr.invoices && obj.gr.invoices.length-1;
		if(lastInv){
			obj.gr.invoices[lastInv].grTotal=obj.gr.totalFreight;
		}
		obj.gr.invoices.forEach(o => {
			obj.totNoOfUnits += o.noOfUnits || 0;
			obj.totInv += o.invoiceAmt || 0;//santosh
			obj.totBillingNoOfUnits += o.billingNoOfUnits || 0;
			obj.totbillingWeight += o.billingWeightPerUnit || 0;
			obj.totweightPerUnit += o.weightPerUnit ||0 ;
			obj.totFreightRate += o.rate || 0;
			billObj.newItems.push({
				...obj,
				__item: o
			});
		});

		billObj.totalNoOfUnits += obj.totNoOfUnits;
		billObj.totalInvAmt+=obj.totInv;//santosh
		billObj.totalBillNoOfUnits += obj.totBillingNoOfUnits;
		billObj.totalActualwt += obj.totweightPerUnit;
		billObj.totalBillwt += obj.totbillingWeight;
		billObj.totRate += obj.totFreightRate;
	});

	billObj.jkTyreTotalAmountWithoutGST = (billObj.totBasicFreight + billObj.totDetentionUnloadingCharge + billObj.totUnloadingCharge + billObj.totOther_charges + billObj.totGreen + billObj.totTwoPtCharge) || 0;
	billObj.jkTyreTotalAmountWithGST = (billObj.iGST + billObj.sGST + billObj.cGST + billObj.jkTyreTotalAmountWithoutGST) || 0;

	if (billObj.items.length === 0) {
		billObj.totBasicFreight = billObj.amount;
		billObj.aggTotFreight = billObj.amount;
		billObj.aggTotFreightN = billObj.amount;
	}

	billObj.iGSTAmount = (billObj.totBasicFreight * ((billObj.iGST_percent || 0) / 100)) || 0;
	billObj.sGSTAmount = (billObj.totBasicFreight * ((billObj.sGST_percent || 0) / 100)) || 0;
	billObj.cGSTAmount = (billObj.totBasicFreight * ((billObj.cGST_percent || 0) / 100)) || 0;
	billObj.totalAmountWithoutChrg = billObj.iGSTAmount + billObj.sGSTAmount + billObj.cGSTAmount + billObj.totBasicFreight; // + billObj.totalChargesWithoutTax;

	billObj.iGST = (billObj.aggTotFreight * ((billObj.iGST_percent || 0) / 100)) || 0;
	billObj.sGST = (billObj.aggTotFreight * ((billObj.sGST_percent || 0) / 100)) || 0;
	billObj.cGST = (billObj.aggTotFreight * ((billObj.cGST_percent || 0) / 100)) || 0;
	billObj.totalAmount = billObj.iGST + billObj.sGST + billObj.cGST + billObj.aggTotFreight + billObj.totalChargesWithoutTax;


	// todo this key will be removed by Charan Raj
	billObj.x = (billObj.totSuppUnloadingCharge) * ((billObj.iGST_percent || 0) / 100);
	billObj.y = (billObj.totSuppUnloadingCharge) * ((billObj.cGST_percent || 0) / 100);
	billObj.z = (billObj.totSuppUnloadingCharge) * ((billObj.sGST_percent || 0) / 100);


	billObj.TiGST = (billObj.totTwoPtCharge) * ((billObj.iGST_percent || 0) / 100);
	billObj.TcGST = (billObj.totTwoPtCharge) * ((billObj.cGST_percent || 0) / 100);
	billObj.TsGST = (billObj.totTwoPtCharge) * ((billObj.sGST_percent || 0) / 100);
	// todo end

	billObj.Nigst = (billObj.aggTotFreightN * ((billObj.iGST_percent || 0) / 100)) || 0;
	billObj.Ncgst = (billObj.aggTotFreightN * ((billObj.cGST_percent || 0) / 100)) || 0;
	billObj.Nsgst = (billObj.aggTotFreightN * ((billObj.sGST_percent || 0) / 100)) || 0;
	billObj.totalAmountN = billObj.Nsgst + billObj.Ncgst + billObj.Nigst + billObj.aggTotFreightN;

}

function tripMultiInvoice(billObj){
		billObj.newItems = [];
		billObj.newItemsPlus=[];
		billObj.totalNoOfUnits = 0;
		billObj.totalInvAmt = 0;
		billObj.totalBillNoOfUnits = 0;
		billObj.totalActualwt = 0;
		billObj.totalBillwt = 0;
		billObj.grCount=0;
		billObj.eWaBillCount=0;
		billObj.invoiceCount=0;
		billObj.show=false;
		billObj.truckFeet=billObj.gr[0] && billObj.gr[0].invoices[0].baseValueLabel==='14 TON'?'32FT':'24FT';
		billObj.truckL= billObj.gr[0] && billObj.gr[0].invoices[0].baseValueLabel==='14 TON'?32:24;
		billObj.truckW= billObj.gr[0] && billObj.gr[0].invoices[0].baseValueLabel==='14 TON'?8.5:8;
		billObj.truckH= billObj.gr[0] && billObj.gr[0].invoices[0].baseValueLabel==='14 TON'?8.5:8;

		billObj.consigneePdCode=[]; // for FTL Hero template
		billObj.consigneeName=[]; // for FTL Hero template
		billObj.station=[]; // for FTL Hero template

		Array.isArray(billObj.gr) && billObj.gr && billObj.gr.forEach(function (obj) {
			obj.totNoOfUnits = 0;
			obj.totInv = 0;
			obj.totBillingNoOfUnits = 0;
			obj.totbillingWeight = 0;
			obj.totweightPerUnit = 0;
			obj.totFreightRate = 0;
			billObj.grCount+=1;
			let flag = true;


			// for FTL Hero template
			if (obj.consignee && billObj.consigneeName.indexOf(obj.consignee.name) === -1) {
				billObj.consigneeName.push(obj.consignee.name);
				billObj.consigneePdCode.push(obj.consignee.d_code);
				billObj.station.push(obj.acknowledge.destination);
			}


			if (flag && obj && obj.grNumber) {
				obj.invoices[0].gr = obj.grNumber;
				obj.invoices[0].eWayBill = obj.eWayBills[0] && obj.eWayBills[0].number || '';
				flag = false;
			}
			Array.isArray(obj.eWayBills) && obj.eWayBills && obj.eWayBills.forEach(o=>{
				billObj.eWaBillCount+=o.number?1:0;
			});
			let i=0;
			Array.isArray(obj.invoices) && obj.invoices && obj.invoices.forEach(o => {
				billObj.invoiceCount+=o.invoiceNo?1:0;
				obj.totNoOfUnits += o.noOfUnits || 0;
				obj.totInv += o.invoiceAmt || 0;
				o.ewayBill= obj.eWayBills[i] && obj.eWayBills[i].number || '';
				o.invCount=billObj.invoiceCount;
				obj.totBillingNoOfUnits += o.billingNoOfUnits || 0;
				obj.totbillingWeight += o.billingWeightPerUnit || 0;
				obj.totweightPerUnit += o.weightPerUnit || 0;
				if (billObj.invoiceCount<13){
					billObj.newItems.push({
						...obj,
						__item: o
					});
				}
				if (billObj.invoiceCount>12){
					billObj.show=true;
					billObj.newItemsPlus.push({
						...obj,
						__newItem: o
					});
				}

				i++;
			});
			billObj.totalNoOfUnits += obj.totNoOfUnits;
			billObj.totalInvAmt += obj.totInv;
			billObj.totalBillNoOfUnits += obj.totBillingNoOfUnits;
			billObj.totalActualwt += obj.totweightPerUnit;
			billObj.totalBillwt += obj.totbillingWeight;
			billObj.totRate += obj.totFreightRate;
		});

	}
function tripMultiGrSlNo(billObj){
	billObj.tripCount=0;
	billObj.count=0;
	billObj.prevTripNo='';
	billObj.items && Array.isArray(billObj.items) && billObj.items.forEach(function (oGr) {
		billObj.tripCount=billObj.prevTripNo!==oGr.gr.trip_no?billObj.tripCount+1:billObj.tripCount;
		if(billObj.tripCount>billObj.count)
			oGr.slNo=billObj.tripCount;
		billObj.prevTripNo=oGr.gr.trip_no;
		billObj.count=billObj.tripCount||0;
	});
}

function tripMultiGr(billObj){
	const splitArrays = {};
	billObj.items && Array.isArray(billObj.items) && billObj.items.forEach(v => {
		if (!!splitArrays[v.gr.trip_no]) {
			splitArrays[v.gr.trip_no].push(v);
		} else {
			splitArrays[v.gr.trip_no] = [v];
		}
	})
	billObj.tripArray=Object.values(splitArrays);

	let tripCount=0;
	billObj.tripArray && Array.isArray(billObj.tripArray) && billObj.tripArray.forEach(function (oTrip) {
		tripCount+=1;
		let tripTotal=0;
		oTrip[0].slNo=tripCount;
		oTrip && Array.isArray(oTrip) && oTrip.forEach(function (oGr) {
			tripTotal+=oGr.gr.totalFreight;
		});
		oTrip[oTrip.length-1].tripTotAmt=tripTotal;
	});
}

function creditNote(crObj){
	crObj.total_CR_amount = 0;
	crObj.voucher.ledgers.forEach(obj => {
		if(obj.cRdR === 'CR'){
			crObj.total_CR_amount += obj.amount;
		}
	})
}

function carvCal(billObj) {
	sortGrNumber(billObj);
	billObj.totalAmtSum = 0, billObj.igstAmountSum = 0, billObj.cgstAmountSum = 0, billObj.sgstAmountSum = 0 , billObj.grandTotalAmtSum = 0;
	billObj.totalBags = 0;
	billObj.totalWT = 0;
	billObj.totalActualwtWT = 0;
	billObj.cShortageAmtSum = 0;
	billObj.cbasicFreightAmtSum = 0;
	billObj.ctotalNetAmtSum = 0;
	billObj.items.forEach(function (obj) {
		obj._totFreight = 0;
		obj._igstAmount  =0;
		obj._sgstAmount  =0;
		obj._cgstAmount  =0;
		obj._grandTotAmt  =0;

		//labour charges
		obj._labour_igstAmount = 0;
		obj._labour_sgstAmount = 0;
		obj._labour_cgstAmount = 0;
		obj._laourGrandTotAmt  =0;

		//detention Unloading
		obj._detUnlod_igstAmount = 0;
		obj._detUnlod_sgstAmount = 0;
		obj._detUnlod_cgstAmount = 0;
		obj._detUnlodGrandTotAmt  =0;

		//detention Loading
		obj._detLod_igstAmount = 0;
		obj._detLod_sgstAmount = 0;
		obj._detLod_cgstAmount = 0;
		obj._detLodGrandTotAmt  =0;

		//challan charges
		obj._challan_igstAmount = 0;
		obj._challan_sgstAmount = 0;
		obj._challan_cgstAmount = 0;
		obj._challanGrandTotAmt  =0;
		//kanta charges
		obj._kanta_igstAmount = 0;
		obj._kanta_sgstAmount = 0;
		obj._kanta_cgstAmount = 0;
		obj._kantaGrandTotAmt  =0;
		//advance charges
		obj._advance_igstAmount = 0;
		obj._advance_sgstAmount = 0;
		obj._advance_cgstAmount = 0;
		obj._advanceGrandTotAmt  =0;
		//other charges
		obj._other_igstAmount = 0;
		obj._other_sgstAmount = 0;
		obj._other_cgstAmount = 0;
		obj._otherGrandTotAmt  =0;


		//cargil_cavan
		obj._cNetAmt = 0;
		obj._cIgstAmount = 0;
		obj._cGrandTotAmt = 0;

		obj.gr.charges = obj.gr.charges || {};
		obj.gr.deduction = obj.gr.deduction || {};

		if(!(obj.gr && obj.gr.charges && obj.gr.charges.labourCharges))
			obj.gr.charges.labourCharges = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.detentionUnloading))
			obj.gr.charges.detentionUnloading = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.detentionLoading))
			obj.gr.charges.detentionLoading = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.grCharges))
			obj.gr.charges.grCharges = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.kanta_charges))
			obj.gr.charges.kanta_charges = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.other_charges))
			obj.gr.charges.other_charges = 0;


		if(!(obj.gr && obj.gr.deduction && obj.gr.deduction.shortage))
			obj.gr.deduction.shortage = 0;
		if(!(obj.gr && obj.gr.deduction && obj.gr.deduction.advance_charges))
			obj.gr.deduction.advance_charges = 0;

				if(obj.gr && obj.gr.deduction && (obj.gr.deduction.shortage) ){
					obj._totFreight = obj.gr.basicFreight - obj.gr.deduction.shortage ;
				}else{
					obj._totFreight = ( obj.totFreight - obj.gr.charges.labourCharges - obj.gr.charges.detentionUnloading -
						obj.gr.charges.detentionLoading - obj.gr.charges.grCharges - obj.gr.charges.kanta_charges -
						obj.gr.charges.other_charges + obj.gr.deduction.advance_charges);
				}

		// obj._totFreight = obj.totFreight - obj.gr.charges.labourCharges - obj.gr.charges.detentionUnloading - obj.gr.deduction.shortage;

		if(billObj.iGST_percent){
			//igst without charges
			obj._igstAmount = (obj._totFreight *  (billObj.iGST_percent || 0 )) /100;

			//detention unloading
			obj._detUnlod_igstAmount = (obj.gr.charges.detentionUnloading * (billObj.iGST_percent || 0)) / 100 || 0;
			//detention loading
			obj._detLod_igstAmount = (obj.gr.charges.detentionLoading * (billObj.iGST_percent || 0)) / 100 || 0;

			//labour
			obj._labour_igstAmount = (obj.gr.charges.labourCharges * (billObj.iGST_percent || 0)) / 100 || 0;
			//challan loading
			obj._challan_igstAmount = (obj.gr.charges.grCharges * (billObj.iGST_percent || 0)) / 100 || 0;
			//kanta loading
			obj._kanta_igstAmount = (obj.gr.charges.kanta_charges * (billObj.iGST_percent || 0)) / 100 || 0;
			//advance loading
			// obj._advance_igstAmount = (obj.gr.deduction.advance_charges * (billObj.iGST_percent || 0)) / 100 || 0;
			//other loading
			obj._other_igstAmount = (obj.gr.charges.other_charges * (billObj.iGST_percent || 0)) / 100 || 0;

		}
		if(billObj.sGST_percent || billObj.cGST_percent){
			//igst/cgst/sgst
			obj._cgstAmount = (obj._totFreight *  (billObj.cGST_percent || 0)) /100 || 0;
			obj._sgstAmount = (obj._totFreight *  (billObj.sGST_percent|| 0)) /100 || 0;
			//labour igst/cgst/sgst
			obj._labour_cgstAmount = (obj.gr.charges.labourCharges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._labour_sgstAmount = (obj.gr.charges.labourCharges * (billObj.sGST_percent || 0)) / 100 || 0;

			//detention unloading
			obj._detUnlod_cgstAmount = (obj.gr.charges.detentionUnloading * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._detUnlod_sgstAmount = (obj.gr.charges.detentionUnloading * (billObj.sGST_percent || 0)) / 100 || 0;

			//detention loading
			obj._detLod_cgstAmount = (obj.gr.charges.detentionLoading * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._detLod_sgstAmount = (obj.gr.charges.detentionLoading * (billObj.sGST_percent || 0)) / 100 || 0;

			//challan
			obj._challan_cgstAmount = (obj.gr.charges.grCharges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._challan_sgstAmount = (obj.gr.charges.grCharges * (billObj.sGST_percent || 0)) / 100 || 0;

			//kanta loading
			obj._kanta_cgstAmount = (obj.gr.charges.kanta_charges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._kanta_sgstAmount = (obj.gr.charges.kanta_charges * (billObj.sGST_percent || 0)) / 100 || 0;

			// //advance
			// obj._advance_cgstAmount = (obj.gr.deduction.advance_charges * (billObj.cGST_percent || 0)) / 100 || 0;
			// obj._advance_sgstAmount = (obj.gr.deduction.advance_charges * (billObj.sGST_percent || 0)) / 100 || 0;

			//other
			obj._other_cgstAmount = (obj.gr.charges.other_charges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._other_sgstAmount = (obj.gr.charges.other_charges * (billObj.sGST_percent || 0)) / 100 || 0;

		}


		//col3
		obj._grandTotAmt = obj._igstAmount ? (obj._totFreight + obj._igstAmount) : ( obj._totFreight + obj._cgstAmount + obj._sgstAmount ) ;
		obj._laourGrandTotAmt = obj._labour_igstAmount? (obj.gr.charges.labourCharges + obj._labour_igstAmount) : ( obj.gr.charges.labourCharges + obj._labour_sgstAmount + obj._labour_cgstAmount ) ;
		obj._detUnlodGrandTotAmt = (obj._detUnlod_igstAmount || obj._detLod_igstAmount) ?
			(obj.gr.charges.detentionUnloading + obj.gr.charges.detentionLoading + obj._detUnlod_igstAmount + obj._detLod_igstAmount) :
			( obj.gr.charges.detentionUnloading + obj.gr.charges.detentionLoading + obj._detUnlod_sgstAmount + obj._detUnlod_cgstAmount + obj._detLod_sgstAmount + obj._detLod_cgstAmount ) ;
		obj._challanGrandTotAmt = obj._challan_igstAmount ? ( obj.gr.charges.grCharges + obj._challan_igstAmount) : ( obj.gr.charges.grCharges + obj._challan_cgstAmount+ obj._challan_sgstAmount);
		obj._kantaGrandTotAmt = obj._kanta_igstAmount ? ( obj.gr.charges.kanta_charges + obj._kanta_igstAmount) : ( obj.gr.charges.kanta_charges + obj._kanta_cgstAmount+ obj._kanta_sgstAmount);
		// obj._advanceGrandTotAmt = obj._advance_igstAmount ? ( obj.gr.deduction.advance_charges + obj._advance_igstAmount) : ( obj.gr.deduction.advance_charges + obj._advance_cgstAmount+ obj._advance_sgstAmount);
		obj._advanceGrandTotAmt = obj.gr.advanceAmt || obj.gr.deduction.advance_charges ;
		obj._otherGrandTotAmt = obj._other_igstAmount ? ( obj.gr.charges.other_charges + obj._other_igstAmount) : ( obj.gr.charges.other_charges + obj._other_cgstAmount+ obj._other_sgstAmount);

		//other footer before footer_col1
		billObj.totalBags += obj.gr.invoices[0].noOfUnits || 0;
		billObj.totalWT += obj.gr.invoices[0].billingWeightPerUnit || 0;
		billObj.totalActualwtWT += obj.gr.invoices[0].weightPerUnit || 0;

		//footer_col1
			billObj.totalAmtSum += (obj._totFreight + obj.gr.charges.labourCharges + obj.gr.charges.detentionUnloading + obj.gr.charges.detentionLoading +
				obj.gr.charges.grCharges + obj.gr.charges.kanta_charges  + obj.gr.charges.other_charges - (obj.gr.advanceAmt || obj.gr.deduction.advance_charges));  // + obj.gr.deduction.advance_charges
		//footer_col2
			billObj.igstAmountSum += (obj._igstAmount + obj._labour_igstAmount + obj._detUnlod_igstAmount + obj._detLod_igstAmount +
										obj._challan_igstAmount + obj._kanta_igstAmount + obj._other_igstAmount) || 0; // + obj._advance_igstAmount
			billObj.cgstAmountSum += (obj._cgstAmount + obj._labour_cgstAmount + obj._detUnlod_cgstAmount + obj._detLod_cgstAmount +
										obj._challan_cgstAmount + obj._kanta_cgstAmount+ obj._other_cgstAmount) || 0; // + obj._advance_cgstAmount
			billObj.sgstAmountSum += (obj._sgstAmount + obj._labour_sgstAmount + obj._detUnlod_sgstAmount + obj._detLod_sgstAmount +
										obj._challan_sgstAmount + obj._kanta_sgstAmount + obj._other_sgstAmount)|| 0; // + obj._advance_sgstAmount

		//footer cagrgil Shortage and totalFreight amt
			billObj.cShortageAmtSum += ( obj.gr.deduction.shortage) || 0;
			billObj.cbasicFreightAmtSum += ( obj.gr.basicFreight ) || 0;

		//footer_col3
		billObj.grandTotalAmtSum += (obj._grandTotAmt + obj._laourGrandTotAmt + obj._detUnlodGrandTotAmt + obj._challanGrandTotAmt +
										obj._kantaGrandTotAmt + obj._otherGrandTotAmt - obj._advanceGrandTotAmt );

	});

}

function carvCalWithCharg(billObj) {
	sortGrNumber(billObj);
	billObj.totalAmtSum = 0, billObj.igstAmountSum = 0, billObj.cgstAmountSum = 0, billObj.sgstAmountSum = 0 , billObj.grandTotalAmtSum = 0;
	billObj.totalBags = 0;
	billObj.totalWT = 0;
	billObj.totalActualwtWT = 0;
	billObj.cShortageAmtSum = 0;
	billObj.cbasicFreightAmtSum = 0;
	billObj.ctotalNetAmtSum = 0;
	billObj.totBillAmt = 0;
	billObj.totBillAmt -= billObj.adjAmount || 0;
	billObj.items.forEach(function (obj) {
		obj._basicFreight = 0;
		obj._igstAmount  =0;
		obj._sgstAmount  =0;
		obj._cgstAmount  =0;
		obj._grandTotAmt  =0;

		//labour charges
		obj._labour_igstAmount = 0;
		obj._labour_sgstAmount = 0;
		obj._labour_cgstAmount = 0;
		obj._laourGrandTotAmt  =0;

		//detention Unloading
		obj._detUnlod_igstAmount = 0;
		obj._detUnlod_sgstAmount = 0;
		obj._detUnlod_cgstAmount = 0;
		obj._detUnlodLoadGrandTotAmt  =0;

		//detention Loading
		obj._detLod_igstAmount = 0;
		obj._detLod_sgstAmount = 0;
		obj._detLod_cgstAmount = 0;
		obj._detLodGrandTotAmt  =0;
		//challan charges
		obj._challan_igstAmount = 0;
		obj._challan_sgstAmount = 0;
		obj._challan_cgstAmount = 0;
		obj._challanGrandTotAmt  =0;
		//kanta charges
		obj._kanta_igstAmount = 0;
		obj._kanta_sgstAmount = 0;
		obj._kanta_cgstAmount = 0;
		obj._kantaGrandTotAmt  =0;
		//advance charges
		obj._advance_igstAmount = 0;
		obj._advance_sgstAmount = 0;
		obj._advance_cgstAmount = 0;
		obj._advanceGrandTotAmt  =0;
		//other charges
		obj._other_igstAmount = 0;
		obj._other_sgstAmount = 0;
		obj._other_cgstAmount = 0;
		obj._otherGrandTotAmt  =0;


		//cargil_cavan
		obj._cNetAmt = 0;
		obj._cIgstAmount = 0;
		obj._cGrandTotAmt = 0;

		obj.gr.charges = obj.gr.charges || {};
		obj.gr.deduction = obj.gr.deduction || {};
		obj.gr.basicFreight=Math.round((obj.gr.basicFreight + Number.EPSILON) * 100) / 100;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.labourCharges))
			obj.gr.charges.labourCharges = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.detentionUnloading))
			obj.gr.charges.detentionUnloading = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.detentionLoading))
			obj.gr.charges.detentionLoading = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.grCharges))
			obj.gr.charges.grCharges = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.kanta_charges))
			obj.gr.charges.kanta_charges = 0;
		if(!(obj.gr && obj.gr.charges && obj.gr.charges.other_charges))
			obj.gr.charges.other_charges = 0;


		if(!(obj.gr && obj.gr.deduction && obj.gr.deduction.shortage))
			obj.gr.deduction.shortage = 0;
		if(!(obj.gr && obj.gr.deduction && obj.gr.deduction.advance_charges))
			obj.gr.deduction.advance_charges = 0;

		if(obj.gr && obj.gr.deduction && (obj.gr.deduction.shortage) ){
			obj._basicFreight = obj.gr.basicFreight - obj.gr.deduction.shortage || 0;
		}else{
			obj._basicFreight = obj.gr.basicFreight || 0;
		}

		if(obj.gr && obj.gr.acknowledge && !obj.gr.acknowledge.source && obj.gr.route && obj.gr.route.source)
			obj.gr.acknowledge.source = obj.gr.route.source.c;

		if(obj.gr && obj.gr.acknowledge && !obj.gr.acknowledge.destination && obj.gr.route && obj.gr.route.destination)
			obj.gr.acknowledge.destination = obj.gr.route.destination.c;

		// else{
		// 	obj._basicFreight = ( obj.basicFreight - obj.gr.charges.labourCharges - obj.gr.charges.detentionUnloading -
		// 		obj.gr.charges.detentionLoading - obj.gr.charges.grCharges - obj.gr.charges.kanta_charges -
		// 		obj.gr.charges.other_charges + obj.gr.deduction.advance_charges);
		// }

		if(billObj.iGST_percent){
			//igst without charges for CARGILL TEMPLATE
			if(obj.gr && obj.gr.deduction && (obj.gr.deduction.shortage) ){
				obj._igstAmount = (obj._basicFreight *  (billObj.iGST_percent || 0 )) /100;
			}else{
				//igst without charges for ALL TEMPLATES
				obj._igstAmount = (obj.gr.basicFreight *  (billObj.iGST_percent || 0 )) /100;
			}

			//detention unloading
			obj._detUnlod_igstAmount = (obj.gr.charges.detentionUnloading * (billObj.iGST_percent || 0)) / 100 || 0;
			//detention loading
			obj._detLod_igstAmount = (obj.gr.charges.detentionLoading * (billObj.iGST_percent || 0)) / 100 || 0;

			//labour
			obj._labour_igstAmount = (obj.gr.charges.labourCharges * (billObj.iGST_percent || 0)) / 100 || 0;
			//challan loading
			obj._challan_igstAmount = (obj.gr.charges.grCharges * (billObj.iGST_percent || 0)) / 100 || 0;
			//kanta loading
			obj._kanta_igstAmount = (obj.gr.charges.kanta_charges * (billObj.iGST_percent || 0)) / 100 || 0;
			//advance loading
			// obj._advance_igstAmount = (obj.gr.deduction.advance_charges * (billObj.iGST_percent || 0)) / 100 || 0;
			//other loading
			obj._other_igstAmount = (obj.gr.charges.other_charges * (billObj.iGST_percent || 0)) / 100 || 0;

		}
		if(billObj.sGST_percent || billObj.cGST_percent){
			//igst/cgst/sgst
			obj._cgstAmount = (obj.gr.basicFreight *  (billObj.cGST_percent || 0)) /100 || 0;
			obj._sgstAmount = (obj.gr.basicFreight *  (billObj.sGST_percent|| 0)) /100 || 0;
			//labour igst/cgst/sgst
			obj._labour_cgstAmount = (obj.gr.charges.labourCharges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._labour_sgstAmount = (obj.gr.charges.labourCharges * (billObj.sGST_percent || 0)) / 100 || 0;

			//detention unloading
			obj._detUnlod_cgstAmount = (obj.gr.charges.detentionUnloading * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._detUnlod_sgstAmount = (obj.gr.charges.detentionUnloading * (billObj.sGST_percent || 0)) / 100 || 0;

			//detention loading
			obj._detLod_cgstAmount = (obj.gr.charges.detentionLoading * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._detLod_sgstAmount = (obj.gr.charges.detentionLoading * (billObj.sGST_percent || 0)) / 100 || 0;

			//challan
			obj._challan_cgstAmount = (obj.gr.charges.grCharges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._challan_sgstAmount = (obj.gr.charges.grCharges * (billObj.sGST_percent || 0)) / 100 || 0;

			//kanta loading
			obj._kanta_cgstAmount = (obj.gr.charges.kanta_charges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._kanta_sgstAmount = (obj.gr.charges.kanta_charges * (billObj.sGST_percent || 0)) / 100 || 0;

			// //advance
			// obj._advance_cgstAmount = (obj.gr.deduction.advance_charges * (billObj.cGST_percent || 0)) / 100 || 0;
			// obj._advance_sgstAmount = (obj.gr.deduction.advance_charges * (billObj.sGST_percent || 0)) / 100 || 0;

			//other
			obj._other_cgstAmount = (obj.gr.charges.other_charges * (billObj.cGST_percent || 0)) / 100 || 0;
			obj._other_sgstAmount = (obj.gr.charges.other_charges * (billObj.sGST_percent || 0)) / 100 || 0;

		}


		//col3
		obj._grandTotAmt = obj._igstAmount ? (obj.gr.basicFreight + obj._igstAmount) : ( obj.gr.basicFreight + obj._cgstAmount + obj._sgstAmount ) ;
		obj._laourGrandTotAmt = obj._labour_igstAmount? (obj.gr.charges.labourCharges + obj._labour_igstAmount) : ( obj.gr.charges.labourCharges + obj._labour_sgstAmount + obj._labour_cgstAmount ) ;
		obj._detUnlodLoadGrandTotAmt = (obj._detUnlod_igstAmount || obj._detLod_igstAmount) ?
			(obj.gr.charges.detentionUnloading + obj.gr.charges.detentionLoading + obj._detUnlod_igstAmount + obj._detLod_igstAmount) :
			( obj.gr.charges.detentionUnloading + obj.gr.charges.detentionLoading + obj._detUnlod_sgstAmount + obj._detUnlod_cgstAmount + obj._detLod_sgstAmount + obj._detLod_cgstAmount ) ;
		obj._challanGrandTotAmt = obj._challan_igstAmount ? ( obj.gr.charges.grCharges + obj._challan_igstAmount) : ( obj.gr.charges.grCharges + obj._challan_cgstAmount+ obj._challan_sgstAmount);
		obj._kantaGrandTotAmt = obj._kanta_igstAmount ? ( obj.gr.charges.kanta_charges + obj._kanta_igstAmount) : ( obj.gr.charges.kanta_charges + obj._kanta_cgstAmount+ obj._kanta_sgstAmount);
		// obj._advanceGrandTotAmt = obj._advance_igstAmount ? ( obj.gr.deduction.advance_charges + obj._advance_igstAmount) : ( obj.gr.deduction.advance_charges + obj._advance_cgstAmount+ obj._advance_sgstAmount);
		obj._advanceGrandTotAmt = obj.gr.advanceAmt || obj.gr.deduction.advance_charges ;
		obj._otherGrandTotAmt = obj._other_igstAmount ? ( obj.gr.charges.other_charges + obj._other_igstAmount) : ( obj.gr.charges.other_charges + obj._other_cgstAmount+ obj._other_sgstAmount);

		//other footer before footer_col1
		billObj.totalBags += obj.gr.invoices[0].noOfUnits || 0;
		billObj.totalWT += obj.gr.invoices[0].billingWeightPerUnit || 0;
		billObj.totalActualwtWT += obj.gr.invoices[0].weightPerUnit || 0;

		//footer_col1
		billObj.totalAmtSum += (obj.gr.basicFreight + obj.gr.charges.labourCharges + obj.gr.charges.detentionUnloading + obj.gr.charges.detentionLoading +
			obj.gr.charges.grCharges + obj.gr.charges.kanta_charges  + obj.gr.charges.other_charges - (obj.gr.advanceAmt || obj.gr.deduction.advance_charges));  // + obj.gr.deduction.advance_charges
		//footer_col2
		billObj.igstAmountSum += (obj._igstAmount + obj._labour_igstAmount + obj._detUnlod_igstAmount + obj._detLod_igstAmount +
			obj._challan_igstAmount + obj._kanta_igstAmount + obj._other_igstAmount) || 0; // + obj._advance_igstAmount
		billObj.cgstAmountSum += (obj._cgstAmount + obj._labour_cgstAmount + obj._detUnlod_cgstAmount + obj._detLod_cgstAmount +
			obj._challan_cgstAmount + obj._kanta_cgstAmount+ obj._other_cgstAmount) || 0; // + obj._advance_cgstAmount
		billObj.sgstAmountSum += (obj._sgstAmount + obj._labour_sgstAmount + obj._detUnlod_sgstAmount + obj._detLod_sgstAmount +
			obj._challan_sgstAmount + obj._kanta_sgstAmount + obj._other_sgstAmount)|| 0; // + obj._advance_sgstAmount

		//footer CARGILL Shortage and totalFreight amt
		billObj.cShortageAmtSum += ( obj.gr.deduction.shortage) || 0;
		billObj.cbasicFreightAmtSum += ( obj.gr.basicFreight ) || 0;

		//footer_col3
		billObj.grandTotalAmtSum += (obj._grandTotAmt + obj._laourGrandTotAmt + obj._detUnlodLoadGrandTotAmt + obj._challanGrandTotAmt +
			obj._kantaGrandTotAmt + obj._otherGrandTotAmt - obj._advanceGrandTotAmt );

	});
	billObj.totBillAmt += (billObj.grandTotalAmtSum - billObj.cShortageAmtSum); // cargil temp
	// billObj.adjAmount1= billObj.adjAmount ? toFixed(billObj.grandTotalAmtSum-billObj.billAmount):0;
	// billObj.adjAmount= billObj.adjAmount ? toFixed(billObj.billAmount-billObj.grandTotalAmtSum):0;
	// billObj.totBillAmt -= billObj.adjAmount1 || 0;

}

function supplymentryBillConfig(oBill) {

	if (oBill.type === 'Supplementary Bill') {
		oBill.items.forEach(oItem => {

			oItem.gr.supplementaryBill = oItem.gr.supplementaryBill || {};
			oItem.gr.basicFreight = oItem.gr.supplementaryBill.basicFreight;
			oItem.gr.totalFreight = oItem.gr.supplementaryBill.totalFreight;
			oItem.gr.charges = oItem.gr.supplementaryBill.charges;
			oItem.gr.deduction = oItem.gr.supplementaryBill.deduction;
			oItem.gr.totalCharges = oItem.gr.supplementaryBill.totalCharges;
			oItem.gr.totalDeduction = oItem.gr.supplementaryBill.totalDeduction;
			oItem.gr.invoices.forEach(oInvoice => {
				oInvoice.freight = 0;
			});
		});
	}

	return oBill;

}

function coverNoteMultiGr(oCoverNote) {
	oCoverNote.newItems = [];
	oCoverNote.totBasicFreight = 0;
	oCoverNote.aggTotFreight = 0;
	oCoverNote.totalAmount = 0;
	oCoverNote.iGST = 0;
	oCoverNote.cGST = 0;
	oCoverNote.sGST = 0;
	oCoverNote.iGST_percent = 0;
	oCoverNote.cGST_percent = 0;
	oCoverNote.sGST_percent = 0;

	sortBillNumber(oCoverNote);


	oCoverNote.bills.forEach(oBill => {

		Array.isArray(oBill.items) && oBill.items.length && oBill.items.forEach(item => {

			if (!(item.gr && item.gr._id))
				return;

			item.gr.charges = item.gr.charges || {};

			oCoverNote.totBasicFreight += (oBill.type === 'Supplementary Bill') ? (item.gr.supplementaryBill && item.gr.supplementaryBill.basicFreight || 0) : (item.gr.basicFreight || 0);
			oCoverNote.aggTotFreight += (oBill.type === 'Supplementary Bill') ? (item.gr.supplementaryBill && item.gr.supplementaryBill.totalFreight || 0) : (item.gr.totalFreight || 0);

			oCoverNote.newItems.push({
				...oBill,
				__item: item.gr,
			});

		});

		oCoverNote.iGST = (oCoverNote.aggTotFreight * ((oBill.iGST_percent || 0) / 100)) || 0;
		oCoverNote.cGST = (oCoverNote.aggTotFreight * ((oBill.cGST_percent || 0) / 100)) || 0;
		oCoverNote.sGST = (oCoverNote.aggTotFreight * ((oBill.sGST_percent || 0) / 100)) || 0;
		oCoverNote.iGST_percent = oBill.iGST_percent;
		oCoverNote.cGST_percent = oBill.cGST_percent;
		oCoverNote.sGST_percent = oBill.sGST_percent;

		oCoverNote.totalAmount = (oCoverNote.iGST + oCoverNote.cGST + oCoverNote.sGST + oCoverNote.aggTotFreight);

	});

	return '';


}

function coverNoteAggregator(oCoverNote) {

	oCoverNote.netAmount = 0;
	oCoverNote.netAmountN = 0;
	oCoverNote.billWeightPerUnit = 0;
	oCoverNote.billBillingWeightPerUnit = 0;
	oCoverNote.billNoofUnit = 0;
	oCoverNote.billBillingNoUnit = 0;
	oCoverNote.billTotalFreight = 0;
	oCoverNote.billTotalRate = 0;
	oCoverNote.billIGST = 0;

	sortBillNumber(oCoverNote);

	oCoverNote.bills.forEach(o => {

		o.itemBasicFreight = 0;
		o.itemOtherCharges = 0;
		o.itemExtraCharges = 0;
		o.itemTotalFreight = 0;
		o.itemTotalRate = 0;
		o.itemWeightPerUnit = 0;
		o.itemBillingWeightPerUnit = 0;
		o.itemnoOfUnits = 0;
		o.itemBillingnoofUnits = 0;
		o.aggTotFreightN = 0;
		o.Nigst = 0;
		o.Ncgst = 0;
		o.Nsgst = 0;
		o.NigstS = 0;
		o.NcgstS = 0;
		o.NsgstS = 0;
		o.totalAmountN = 0;
		o.aggTotFreightS = 0;

		o.billWeightPerUnit = 0;
		o.billBillingWeightPerUnit += 0;
		o.billNoofUnit += 0;
		o.billBillingNoUnit += 0;
		o.billTotalFreight += 0;
		o.billTotalRate += 0;
		o.billIGST += 0;

		Array.isArray(o.items) && o.items.length && o.items.forEach(item => {

			if (!(item.gr && item.gr._id))
				return;

			item.gr.charges = item.gr.charges || {};

			o.itemBasicFreight += (o.type === 'Supplementary Bill') ? (item.gr.supplementaryBill.basicFreight || 0) : (item.gr.basicFreight || 0);
			o.itemOtherCharges += (item.gr.charges.other_charges || 0);
			o.itemExtraCharges += (item.gr.charges.extra_running || 0);
			o.itemTotalFreight += (o.type === 'Supplementary Bill') ? (item.gr.supplementaryBill && item.gr.supplementaryBill.totalFreight || 0) : (item.gr.totalFreight || 0);
			o.aggTotFreightN += (item.gr.totalFreight - ((item.gr.charges.detentionLoading || 0) + (item.gr.charges.detentionUnloading || 0) + (item.gr.charges.unloading_charges || 0)));
			o.aggTotFreightS += (item.gr.supplementaryBill && item.gr.supplementaryBill.totalFreight || 0);

			Array.isArray(item.gr.invoices) && item.gr.invoices.length && item.gr.invoices.forEach(invoice => {
				o.itemWeightPerUnit += (invoice.weightPerUnit || 0);
				o.itemBillingWeightPerUnit += (invoice.billingWeightPerUnit || 0);
				o.itemTotalRate += (invoice.rate);
				o.itemnoOfUnits += (invoice.noOfUnits || 0);
				o.itemBillingnoofUnits += (invoice.billingNoOfUnits || 0);
			});
		});

		o.billWeightPerUnit += o.itemWeightPerUnit;
		o.billBillingWeightPerUnit += o.itemBillingWeightPerUnit;
		o.billNoofUnit += o.itemnoOfUnits;
		o.billBillingNoUnit += o.itemBillingnoofUnits;
		o.billTotalFreight += o.itemTotalFreight;
		o.billTotalRate += o.itemTotalRate;
		o.billIGST += o.iGST;

		o.Nigst = (o.aggTotFreightN * ((o.iGST_percent || 0) / 100)) || 0;
		o.Ncgst = (o.aggTotFreightN * ((o.cGST_percent || 0) / 100)) || 0;
		o.Nsgst = (o.aggTotFreightN * ((o.sGST_percent || 0) / 100)) || 0;
		o.NigstS = (o.aggTotFreightS * ((o.iGST_percent || 0) / 100)) || 0;
		o.NcgstS = (o.aggTotFreightS * ((o.cGST_percent || 0) / 100)) || 0;
		o.NsgstS = (o.aggTotFreightS * ((o.sGST_percent || 0) / 100)) || 0;

		o.totalAmountN = (o.type === 'Supplementary Bill') ? (o.NigstS + o.NcgstS + o.NsgstS + o.aggTotFreightS) : (o.Nigst + o.Ncgst + o.Nsgst + o.aggTotFreightN);

		oCoverNote.billWeightPerUnit += o.itemWeightPerUnit;
		oCoverNote.billBillingWeightPerUnit += o.itemBillingWeightPerUnit;
		oCoverNote.billNoofUnit += o.itemnoOfUnits;
		oCoverNote.billBillingNoUnit += o.itemBillingnoofUnits;
		oCoverNote.billTotalFreight += o.itemTotalFreight;
		oCoverNote.billTotalRate += o.itemTotalRate;
		oCoverNote.billIGST += o.iGST;
		oCoverNote.netAmount += o.totalAmount;
		oCoverNote.netAmountN += o.totalAmountN;

	});

	return '';

}

function removeNegative(x) {
	if (x < 0)
		return 0;
	else
		return x;

}

function zero(y) {
	return Math.max(0, y);
}

function commafy(nStr) {
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function sortGrNumber(billObj, iteratorKey = 'items', testType = 'gr') {

	if (typeof iteratorKey != 'string')
		iteratorKey = 'items';

	if (typeof testType != 'string')
		iteratorKey = 'gr';

	billObj[iteratorKey].sort((a, b) => {
		if (testType === 'vehicle')
			return ('' + a.gr.trip.vehicle_no).localeCompare(b.gr.trip.vehicle_no);
		else
			return ('' + a.gr.grNumber).localeCompare(b.gr.grNumber);
	});
}

function sortBillNumber(obj) {
	obj.bills.sort((a, b) => ('' + a.billNo).localeCompare(b.billNo));
}

function itemsAmtSum(arr, key) {
	let sum = 0;

	if (Array.isArray(arr))
		sum = arr.reduce((a, b) => a + (b[key] || 0), 0);

	return sum;
}

function calGST(billObj, amount) {

	billObj.nCGST = (amount * ((billObj.cGST_percent || 0) / 100)) || 0;
	billObj.nSGST = (amount * ((billObj.sGST_percent || 0) / 100)) || 0;
	billObj.nIGST = (amount * ((billObj.iGST_percent || 0) / 100)) || 0;
	billObj.totalAmountGST = billObj.nCGST + billObj.nSGST + billObj.nIGST + amount;

	return amount;
}

function getUniqueDestination(oBill) {
	let aDestination = [];
	Array.isArray(oBill.items) && oBill.items.forEach(oItem => {
		if (!(oItem.gr && oItem.gr._id))
			return;
		let flag = false;

		if (oItem.gr.acknowledge.billedDestination) {
			if (aDestination.length)
				aDestination.find(o => {
					if (o.toLowerCase() == (oItem.gr.acknowledge.billedDestination).toLowerCase()) {
						flag = true;
					}
				});
			if (!flag)
				aDestination.push(lowerToUpperFirstLetterOfWord(oItem.gr.acknowledge.billedDestination));
		} else if (oItem.gr.acknowledge.destination) {
			if (aDestination.length)
				aDestination.find(o => {
					if (o.toLowerCase() == (oItem.gr.acknowledge.destination).toLowerCase()) {
						flag = true;
					}
				});
			if (!flag)
				aDestination.push(lowerToUpperFirstLetterOfWord(oItem.gr.acknowledge.destination));
		}
	});

	return aDestination.join(', ');
}

function getUniqueConsigneeName(oBill) {
	//.[0].gr.consignee.name
	let aDestination = [];
	Array.isArray(oBill.items) && oBill.items.forEach(oItem => {
		if (!(oItem.gr && oItem.gr._id))
			return;
		let flag = false;

		if (oItem.gr.consignee && oItem.gr.consignee.name) {
			if (aDestination.length)
				aDestination.find(o => {
					if (o.toLowerCase() == (oItem.gr.consignee.name).toLowerCase()) {
						flag = true;
					}
				});
			if (!flag)
				aDestination.push(oItem.gr.consignee.name);
		}

	});

	return aDestination.join(', ');
}

function lowerToUpperCase(alphabet) {
	alphabet = (alphabet || '').toString();
	return alphabet.toUpperCase();
}

function lowerToUpperFirstLetterOfWord(word) {
	word = (word || '').toString();

	let newWord = word;

	if (newWord)
		newWord = lowerToUpperCase(newWord[0]) + newWord.slice(1);

	return newWord;
}

function getRate(data) {
	if (data.gr.payment_basis == 'Fixed') {
		return data.gr.invoices[0].rate;
	}
	else if (data.gr.payment_basis == 'PUnit' || data.gr.payment_basis == 'Punit') {
		return ((data.gr.invoices[0].rate * (data.gr.acknowledge.baseValue ? data.gr.acknowledge.baseValue : 40)) || 0) / (data.gr.acknowledge.routeDistance || 1);
	}

}

function wbr(str, num) {
	return str.replace(RegExp("(\\w{" + num + "})(\\w)", "g"), function (all, text, char) {
		return text + "<wbr>" + char;
	});
}

function numfy(num) {
	return Number(num) || 0;
}

function noOfDaysInMonth(date) {
	return Number(moment(date).endOf('month').format('DD')) || 0
}

function purchaseBillCal(oBill){
	oBill.aggrRate = 0;
	oBill.aggrQuantity = 0;
	oBill.aggrTotalWithoutTax = 0;
	oBill.cgstRate = 0;
	oBill.sgstRate = 0;
	oBill.igstRate = 0;
	oBill.cgstAmount = 0;
	oBill.sgstAmount = 0;
	oBill.igstAmount = 0;
	oBill.aggrTotalWithTax = 0;

	oBill.labType = 0;
	oBill.labVehicleNo = 0;
	oBill.labQuantity = 0;
	oBill.labAmount = 0;
	oBill.labTDS = 0;
	oBill.labTotalWithoutTax = 0;
	oBill.labcgstRate = 0;
	oBill.labsgstRate = 0;
	oBill.labigstRate = 0;
	oBill.labcgstAmount = 0;
	oBill.labsgstAmount = 0;
	oBill.labigstAmount = 0;
	oBill.labtotalWithTax = 0;
	oBill.labTDS = 0;
	oBill.labtotalTDS = 0;

	oBill.TotalWithoutTax = 0;
	oBill.totalCGSTamount = 0;
	oBill.totalSGSTamount = 0;
	oBill.totalIGSTamount = 0;
	oBill.TotalWithTax = 0;
	oBill.matDiscount = 0;
	oBill.labDiscount = 0;

	oBill.materialItems.forEach(o =>{
	 	oBill.aggrRate +=  o.rate;
		oBill.aggrQuantity +=  o.quantity;
		oBill.aggrTotalWithoutTax +=  o.totalWithoutTax;
		oBill.matDiscount += o.discount || 0;
		oBill.cgstRate +=  o.cGSTPercent;
		oBill.sgstRate +=  o.sGSTPercent;
		oBill.igstRate +=  o.iGSTPercent;
		oBill.cgstAmount +=  o.cGST;
		oBill.sgstAmount +=  o.sGST;
		oBill.igstAmount +=  o.iGST;
		oBill.aggrTotalWithTax +=  o.total;

	});

	(oBill.labRepItems || []).forEach(obj =>{
		oBill.labType += obj.type;
		oBill.labVehicleNo += obj.vehicle_no;
		oBill.labQuantity += obj.quantity;
		oBill.labAmount += obj.amount;
		oBill.labDiscount += obj.discount || 0;
		if(obj.tds)
			obj.tdsAmt = (obj.totalWithoutTax - (obj.discount ||0)) * oBill.tdsRate / 100;
		else
			obj.tdsAmt = 0;
		oBill.labTotalWithoutTax += obj.totalWithoutTax;
		oBill.labcgstRate += obj.cGSTPercent;
		oBill.labsgstRate += obj.sGSTPercent;
		oBill.labigstRate += obj.iGSTPercent;
		oBill.labcgstAmount += obj.cGST;
		oBill.labsgstAmount += obj.sGST;
		oBill.labigstAmount += obj.iGST;
		oBill.labtotalWithTax += obj.total;
	});

	oBill.totalAmountWithTax = oBill.billAmount - oBill.tdsAmt;
}
function sortDate(oBill) {

	oBill.items.sort((a,b) =>{
		return new Date(a.gr.pod.billingLoadingTime).getTime() - new Date(b.gr.pod.billingLoadingTime).getTime()
	});
	oBill.start = oBill.items[0].gr.pod.billingLoadingTime;
	oBill.end = oBill.items[oBill.items.length-1].gr.pod.billingLoadingTime;
}

function dateF(d) {
	let oDate = new Date(d);
	 if(oDate.getDate() > 0 && oDate.getDate() < 16){
		return moment(oDate).format("01.MM.YYYY to 15.MM.YYYY");
	 }

	if(oDate.getDate() > 15 && oDate.getDate() < 32){
		if(oDate.getMonth()+1 === 1 || oDate.getMonth()+1 === 3 || oDate.getMonth()+1 === 5 || oDate.getMonth()+1 === 7 || oDate.getMonth()+1 === 8 || oDate.getMonth()+1 === 10 || oDate.getMonth()+1 === 12)
			return moment(oDate).format("16.MM.YYYY to 31.MM.YYYY");
		else if(oDate.getMonth()+1 === 4 || oDate.getMonth()+1 === 6 || oDate.getMonth()+1 === 9 || oDate.getMonth()+1 === 11)
			return moment(oDate).format("16.MM.YYYY to 30.MM.YYYY");
		else if(oDate.getMonth()+1 === 2 && (oDate.getFullYear() % 4 === 0))
			return moment(oDate).format("16.MM.YYYY to 29.MM.YYYY");
		else if(oDate.getMonth()+1 === 2 && (oDate.getFullYear() % 4 != 0))
			return moment(oDate).format("16.MM.YYYY to 28.MM.YYYY");
	}
}

function roundOff(number){
	return Math.round(number);
}
