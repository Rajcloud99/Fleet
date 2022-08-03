/**
 * @Author: kamal
 * @Date:   2016-11-28T17:34:51+05:30
 */

var xl = require('excel4node');
let Excel = require('exceljs');
let async = require('async');
let fs = require('fs');
const path = require('path');
let mkdirp = require('mkdirp');
let moment = require("moment");
var constants = require('../../constant');
const helperFn = require(projectHome + '/utils/handleBarHelper');
const excelUtils = require(projectHome + '/utils/excelUtils');
const TripAdvances = commonUtil.getModel('TripAdvances');
const monthArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let Trip = commonUtil.getModel('trip');


const Reports = commonUtil.getReports();

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

function timediff(start, end) {
	if (start && end) {
		let duration = moment.duration(moment(end).diff(moment(start)));
		hours = duration.asHours();
		return hours;
	} else {
		return 0;
	}
}

let headerFill = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'b2d8b2'
	}
};

let columnFill = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'ccccff'
	}
};

let summaryFill = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'cce5cc'
	}
};

let subHeaderFill = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'ccccff'
	}
};

let cellColor = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'f2da97'
	}
};

let thinBorder = {
	top: {style: 'thin'},
	left: {style: 'thin'},
	bottom: {style: 'thin'},
	right: {style: 'thin'}
};

const centerAlign = {
	horizontal: 'center',
	vertical: 'middle'
};

function formatTitle(ws, size, title) {
	let s = String.fromCharCode(65);
	let e = (size > 26) ? String.fromCharCode(64 + parseInt(size / 26)) + String.fromCharCode(64 + size % 26) : String.fromCharCode(64 + size);

	ws.mergeCells(s + 1 + ':' + e + 1);
	/*ws.getCell('A1').alignment = {
        vertical: 'middle',
        horizontal: 'center'
    };*/
	ws.getCell('A1').font = {
		bold: true
	};
	ws.getCell('A1').fill = headerFill;
	ws.getCell('A1').value = title;
}

function headerTopMerged(ws, start, end, value, options) {
	ws.mergeCells(start + ':' + end);
	ws.getCell(start).value = value;
	if (options) {
		if (options.font)
			ws.getCell(start).font = options.font;
		if (options.fill)
			ws.getCell(start).fill = options.fill;
		if (options.alignment)
			ws.getCell(start).alignment = options.alignment;
		if (options.border)
			ws.getCell(start).border = options.border;
	}
}

function mergeCells(ws, offset, size, title, startCol, options) {
	let s = String.fromCharCode(65 + (startCol || 0));
	// let e = (size>26) ?
	// 	String.fromCharCode(64 + parseInt(size/26)) +
	// 	;
	let e = String.fromCharCode(64 + (((startCol || 0) + size) % 26));
	if ((size = Math.round(size / 26)))
		e = String.fromCharCode(64 + size) + e;

	let start = s + offset;
	let end = e + offset;
	ws.mergeCells(start + ':' + end);

	if (title === 'empty') {
		ws.getCell(start).font = {
			bold: true
		};
		ws.getCell(start).fill = (options && options.fill) || cellColor;
		(options && options.border) && (ws.getCell(start).border = options.border);
		(options && options.alignment) && (ws.getCell(start).alignment = options.alignment);
	} else if (title) {
		/*ws.getCell(start).alignment = {
            vertical: 'middle',
            horizontal: 'center'
        };*/
		ws.getCell(start).font = {
			bold: true
		};
		ws.getCell(start).fill = (options && options.fill) || cellColor;
		(options && options.border) && (ws.getCell(start).border = options.border);
		(options && options.alignment) && (ws.getCell(start).alignment = options.alignment);
		(options && options.numFmt) && (ws.getCell(start).numFmt = options.numFmt);
		ws.getCell(start).value = title;
	}
}

function mergeCellsHandler(ws, from, to, title, titleCenter, applyBgColor, penColor) {
	let font = penColor ? penColor : {bold: true};
	ws.mergeCells(from + ':' + to);
	if (title) {
		if (titleCenter) {
			ws.getCell(from).alignment = {
				vertical: 'middle',
				horizontal: 'center'
			};
		}
		ws.getCell(from).font = font;
		if (applyBgColor) {
			ws.getCell(from).fill = cellColor;
		}
		ws.getCell(from).value = title;
	}
}

function fillCells(ws, offset, size, fill) {
	for (let i = 0; i < size; i++) {
		let s = String.fromCharCode(65 + i);
		winston.info(s + offset);
		ws.getCell(s + offset).fill = fill;
	}
}

function bold(cell) {
	cell.font = {
		bold: true
	};
}

function formatColumnHeaders(ws, offset, names, sizes) {
	names.forEach((name, i) => {
		let column = numberToAlphabet(i);

		ws.getCell(column + offset).value = name;
		ws.getColumn(column).width = sizes[i];
		ws.getCell(column + offset).fill = columnFill;
		ws.getCell(column + offset).font = {
			bold: true
		};
		ws.getCell(column + offset).border = {
			top: {style: 'thin'},
			left: {style: 'thin'},
			bottom: {style: 'thin'},
			right: {style: 'thin'}
		};
	});
}

function setCellNumFormat(ws, cell, format = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)') {
	ws.getCell(cell).numFmt = format;
}

function setCellNumFormatCount(ws, cell, format = '@') {
	ws.getCell(cell).numFmt = format;
}

/*function formatColumnHeadersHandler(ws, offset, names, sizes){
	for (let i = 0; i < names.length; i++) {
		let column = (i>25)?"A"+(String.fromCharCode(65 + i)):String.fromCharCode(65 + i);
		ws.getCell(column + offset).value = names[i];
		ws.getColumn(column).width = sizes[i];
		ws.getCell(column + offset).fill = columnFill;
		ws.getCell(column + offset).font = {
			bold: true
		};
	}
}*/

function saveFileAndReturnCallback(workbook, clientId, folderType, reportname, callback) {
	let dir = 'reports/' + clientId + '/' + folderType + '/';
	filename = reportname + '_' + moment(new Date()).format("DD-MM-YYYY") + '.xlsx';
	mkdirp.sync('./files/' + dir);
	workbook.xlsx.writeFile('./files/' + dir + filename).then(function () {
		callback({
			url: 'http://' + commonUtil.getConfig('download_host') + ':' +
				commonUtil.getConfig('download_port') + '/' + dir + filename,
			dir: dir,
			filename: filename
		});
	});
}

function saveFileAndReturnCallback1(workbook, clientId, folderType, reportname, callback) {
	let dir = 'reports/' + clientId + '/' + folderType + '/';
	filename = reportname + '_' + moment(new Date()).format("DD-MM-YYYY") + '.xlsx';
	mkdirp.sync('../files/' + dir);
	workbook.xlsx.writeFile('../files/' + dir + filename).then(function () {
		callback({
			url: 'http://' + commonUtil.getConfig('download_host') + ':' +
				commonUtil.getConfig('download_port') + '/' + dir + filename,
			dir: dir,
			filename: filename
		});
	});
}

module.exports.generatePostProfitabilityExcel = function (data, clientData, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Profitability Report');
	formatTitle(ws, 11, 'Profitability Report');
	formatColumnHeaders(ws, 3, ['TRIP No.', 'CUSTOMER', 'VENDOR', 'VEHICLE', 'DATE',
		'BRANCH', 'TRIP MANAGER', 'CUSTOMER PAY', 'COSTING',
		'PROFIT(Rs.)', 'PROFIT(%)'
	], [10, 15, 15, 15, 15, 15, 15, 15, 12, 11, 9]);
	let overallCosting = 0;
	let overallCustomerPay = 0;
	let overallProfit = 0;
	for (let i = 0; i < data.data.length; i++) {
		ws.getCell('A' + (i + 4)).value = data.data[i].trip_no || "NA";
		ws.getCell('B' + (i + 4)).value = data.data[i].customer_name || "NA";
		ws.getCell('C' + (i + 4)).value = data.data[i].vendor_name || "NA";
		ws.getCell('D' + (i + 4)).value = data.data[i].vehicle_no || "NA";
		ws.getCell('E' + (i + 4)).value = data.data[i].datetime ? moment(data.data[i].datetime).format(clientData.dateTimeFormat.momentJS) : "NA";
		ws.getCell('F' + (i + 4)).value = data.data[i].branch || "NA";
		ws.getCell('G' + (i + 4)).value = (data.data[i].trip_manager && data.data[i].trip_manager.name) || "NA";
		ws.getCell('H' + (i + 4)).value = data.data[i].invoiceTotal || "NA";
		ws.getCell('I' + (i + 4)).value = data.data[i].total_expences || "NA";
		ws.getCell('J' + (i + 4)).value = data.data[i].profitability || "NA";
		ws.getCell('K' + (i + 4)).value = data.data[i].profitability_percent || "NA";
		overallCustomerPay += (data.data[i].invoiceTotal || 0);
		overallCosting += (data.data[i].total_expences || 0);
		overallProfit += data.data[i].profitability;
	}
	//add a summary row with total trips ,
	mergeCells(ws, (data.data.length + 4), 7);
	ws.getCell('A' + (data.data.length + 4)).value = ("TOTAL Trips = " + data.data.length);
	ws.getCell('A' + (data.data.length + 4)).fill = summaryFill;
	ws.getCell('H' + (data.data.length + 4)).value = (overallCustomerPay);
	ws.getCell('H' + (data.data.length + 4)).fill = summaryFill;
	ws.getCell('I' + (data.data.length + 4)).value = (overallCosting);
	ws.getCell('I' + (data.data.length + 4)).fill = summaryFill;
	ws.getCell('J' + (data.data.length + 4)).value = (overallProfit);
	ws.getCell('J' + (data.data.length + 4)).fill = summaryFill;
	ws.getCell('K' + (data.data.length + 4)).value = (overallCosting !== 0 ?
		(((overallCustomerPay - overallCosting) / (overallCosting)) * 100).toFixed(2) : "NA");
	ws.getCell('K' + (data.data.length + 4)).fill = summaryFill;

	saveFileAndReturnCallback(workbook, clientData.clientId, data.reportType || 'miscellaneous',
		'profitability' + (data.mis_type ? data.mis_type : ""), callback);
};

module.exports.generatePostProfitabilityAggregationExcel = function (data, aggregateBy, clientData, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Profitability Report');
	formatTitle(ws, 10, 'Profitability Report');

	let titles = ['TRIP No.', 'CUSTOMER', 'VENDOR', 'VEHICLE', 'DATE',
		'BRANCH', 'TRIP MANAGER', 'CUSTOMER PAY', 'COSTING',
		'PROFIT(Rs.)', 'PROFIT(%)'
	];
	let titleKeys = ['trip_no', 'customer_name', 'vendor_name', 'vehicle_no', 'date',
		'branch', 'trip_manager', 'invoiceTotal', 'total_expences',
		'profitability', 'profitability_percent'
	];
	let titleLen = [10, 15, 15, 15, 15, 15, 15, 15, 12, 11, 11];

	let aggr = ['driver', 'date', 'vehicle', 'customer'];
	let aggrField = ['driver', 'date', 'vehicle_no', 'customer_name'];
	let aggrIndex = aggr.indexOf(aggregateBy);
	if (aggrIndex === -1) aggrIndex = 1;
	aggregateBy = aggrField[aggrIndex];

	let titleIndex = titleKeys.indexOf(aggregateBy);
	titles.splice(titleIndex, 1);
	titleKeys.splice(titleIndex, 1);
	titleLen.splice(titleIndex, 1);

	formatColumnHeaders(ws, 3, titles, titleLen);

	let headers = {};

	for (let i = 0; i < data.data.length; i++) {

		data.data[i].date = data.data[i].datetime ? moment(data.data[i].datetime).format(clientData.dateTimeFormat.momentJS) : "NA";

		if (!headers[data.data[i][aggregateBy]]) {
			headers[data.data[i][aggregateBy]] = [];
		}
		headers[data.data[i][aggregateBy]].push(data.data[i]);
	}

	let alphabet = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase().split('');

	let index = 4;
	for (let header in headers) {
		mergeCells(ws, index, 10);
		bold(ws.getCell('A' + index));
		ws.getCell('A' + index).fill = summaryFill;

		ws.getCell('A' + index).value = header;
		index++;

		let invoiceTotal_sum = 0;
		let total_expences_sum = 0;
		let profitability_sum = 0;

		for (let i = 0; i < headers[header].length; i++) {

			invoiceTotal_sum += headers[header][i].invoiceTotal;
			total_expences_sum += headers[header][i].total_expences;
			profitability_sum += headers[header][i].profitability;

			for (let j = 0; j < titleKeys.length; j++) {
				let key = titleKeys[j];
				switch (key) {
					case 'trip_manager':
						ws.getCell(alphabet[j] + index).value = headers[header][i][key].name || "NA";
						break;
					default:
						ws.getCell(alphabet[j] + index).value = headers[header][i][key] || "NA";
				}
			}
			index++;
		}

		fillCells(ws, index, titleKeys.length, subHeaderFill);

		bold(ws.getCell(alphabet[titleKeys.indexOf('trip_no')] + index));
		bold(ws.getCell(alphabet[titleKeys.indexOf('invoiceTotal')] + index));
		bold(ws.getCell(alphabet[titleKeys.indexOf('total_expences')] + index));
		bold(ws.getCell(alphabet[titleKeys.indexOf('profitability')] + index));
		bold(ws.getCell(alphabet[titleKeys.indexOf('profitability_percent')] + index));

		ws.getCell(alphabet[titleKeys.indexOf('trip_no')] + index).value = headers[header].length;
		ws.getCell(alphabet[titleKeys.indexOf('invoiceTotal')] + index).value = invoiceTotal_sum;
		ws.getCell(alphabet[titleKeys.indexOf('total_expences')] + index).value = total_expences_sum;
		ws.getCell(alphabet[titleKeys.indexOf('profitability')] + index).value = profitability_sum;
		ws.getCell(alphabet[titleKeys.indexOf('profitability_percent')] + index).value = Math.round(profitability_sum / total_expences_sum * 10000) / 100;

		index++;
	}

	saveFileAndReturnCallback(workbook, clientData.clientId, data.reportType || 'miscellaneous',
		'profitability_' + aggr[aggrIndex] + (data.mis_type ? data.mis_type : ""), callback);
};

/**Generates pre profitability excel with multiple possible aggregateBy variants **/
module.exports.generatePreProfitabilityExcel = function (data, clientData, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Pre - Profitability Report');
	if (data.aggregateBy === "customer_wise") {
		formatTitle(ws1, 11, 'Pre - Profitability Report (Customer Wise)');
		ws.mergeCells('A2:C2');
		ws.mergeCells('D2:F2');
		ws.getCell('A2').value = 'Start date:' + dateUtil.getDDMMYYYY(data.start_time);
		ws.getCell('D2').value = 'End date:' + dateUtil.getDDMMYYYY(data.end_time);
		formatColumnHeaders(ws1, 3, ['TRIP No.', 'DRIVER', 'VENDOR', 'VEHICLE', 'TRIP ALLOCATION DATE',
			'BRANCH', 'TRIP MANAGER', 'CUSTOMER PAY', 'COSTING', 'PROFIT(Rs.)', 'PROFIT(%)'
		], [10, 15, 15, 15, 15, 15, 15, 15, 12, 11, 9]);
		let mainKeys = Object.keys(data.data);
		for (let i = 0; i < mainKeys.length; i++) {
			ws.mergeCells('A' + (i + 4) + ":" + 'D' + (i + 4));
			ws1.getCell('A' + (i + 4)).value = data.mainKeys[i].results.customer_name || "NA";
			for (let j = 0; j < data.data[mainKeys[i]].results.length; j++) {
				ws1.getCell('A' + (i + j + 1 + 4)).value = data.mainKeys[i].trip_no || "NA";
				ws1.getCell('B' + (i + j + 1 + 4)).value = data.mainKeys[i].driver_name || "NA";
				ws1.getCell('C' + (i + j + 1 + 4)).value = data.mainKeys[i].vendor_name || "NA";
				ws1.getCell('D' + (i + j + 1 + 4)).value = data.mainKeys[i].vehicle_no || "NA";
				ws1.getCell('E' + (i + j + 1 + 4)).value = data.mainKeys[i].allocation_date ? moment(data.mainKeys[i].allocation_date).format(clientData.dateTimeFormat.momentJS) : "NA";
				ws1.getCell('F' + (i + j + 1 + 4)).value = data.mainKeys[i].branch || "NA";
				ws1.getCell('G' + (i + j + 1 + 4)).value = data.mainKeys[i].trip_manager.name || "NA";
				ws1.getCell('H' + (i + j + 1 + 4)).value = data.mainKeys[i].gr.sum_sold || 0;
				ws1.getCell('I' + (i + j + 1 + 4)).value = data.mainKeys[i].gr.sum_cost || 0;
				ws1.getCell('J' + (i + j + 1 + 4)).value = data.mainKeys[i].gr.profit_made || 0;
				ws1.getCell('K' + (i + j + 1 + 4)).value = data.keys[i].gr.profit_percent || 0
			}
		}
	} else if (data.aggregateBy === "customer_wise") {

	} else if (data.aggregateBy === "trip_wise") {

	}
	saveFileAndReturnCallback(workbook, clientData.clientId, data.reportType || 'miscellaneous', 'pre-profitability', callback);
};

module.exports.liveTripGrouped = (newAggrData, group_by, clientId, cb) => {
	var wb = new xl.Workbook();
	var headerStyles = wb.createStyle({
		font: {color: '#272727', size: 10, bold: true},
		alignment: {horizontal: 'center', vertical: 'center', wrapText: true},
		fill: {type: 'pattern', patternType: 'solid', fgColor: '#D1E8E2'},
		border: {
			right: {style: 'thin', color: '#000000'}
		},
	});
	var consignstyle = wb.createStyle({
		font: {color: '#404040', size: 12, bold: true, italics: true, underline: true},
	});
	var redStatusStyle = wb.createStyle({
		font: {color: '#ff5a1e', size: 10, bold: true},
	});
	var greenStatusStyle = wb.createStyle({
		font: {color: '#1aff5d', size: 10, bold: true},
	});
	var yellowStatusStyle = wb.createStyle({
		font: {color: '#ffb400', size: 10, bold: true},
	});
	var style = wb.createStyle({
		font: {color: '#000000', size: 10},
	});
	var ws = wb.addWorksheet(`Live Trip Analyis (${group_by.toUpperCase()})`);
	ws.row(1).freeze();
	ws.row(1).setHeight(30);
	for (var i = 1; i <= 13; i++) {
		ws.column(i).setWidth(15);
	}
	ws.cell(1, 1).string('TL NO.').style(headerStyles);
	ws.cell(1, 2).string('V NO.').style(headerStyles);
	ws.cell(1, 3).string('ROUTE').style(headerStyles);
	ws.cell(1, 4).string('KM. COVERED').style(headerStyles);
	ws.cell(1, 5).string('KM. LEFT').style(headerStyles);
	ws.cell(1, 6).string('LOADING D&T').style(headerStyles);
	ws.cell(1, 7).string('UNLOADING D&T').style(headerStyles);
	ws.cell(1, 8).string('STATUS').style(headerStyles);
	ws.cell(1, 9).string('LOCATION').style(headerStyles);
	ws.cell(1, 10).string('LAST KNOWN D&T').style(headerStyles);
	ws.cell(1, 11).string('ACC. ETA').style(headerStyles);
	ws.cell(1, 12).string('CUR. ETA').style(headerStyles);
	// ws.cell(1, 13).string('VEHICLE ARRIVAL FOR LOADING').style(headerStyles);
	ws.cell(1, 14).string('VEHICLE ARRIVAL FOR UNLOADING').style(headerStyles);
	ws.cell(1, 15).string('TRIP START D&T').style(headerStyles);
	ws.cell(1, 16).string('TRIP END D&T').style(headerStyles);

	var c = 3;
	for (consign in newAggrData) {
		if (newAggrData.hasOwnProperty(consign)) {
			var totalTripsOfConsign = Object.values(newAggrData[consign]).reduce((acc, curr, i) => acc += curr.length, 0);
			ws.cell(c, 1).string(consign).style(consignstyle);
			for (var x in newAggrData[consign]) {
				if (newAggrData[consign].hasOwnProperty(x)) {
					ws.cell(++c, 1)
						.string(`${x} -- ${newAggrData[consign][x].length} Trip${newAggrData[consign][x].length > 1 ? 's' : ''} (${((newAggrData[consign][x].length / totalTripsOfConsign) * 100).toFixed(2)}%)`)
						.style(x === 'Early' ? yellowStatusStyle : x === 'Delayed' ? redStatusStyle : greenStatusStyle);
				}
			}
			for (status in newAggrData[consign]) {
				if (newAggrData[consign].hasOwnProperty(status)) {
					/*ws.cell(c+1, 1)
							  .string(`${status} - ${newAggrData[consign][status].length} Trip${newAggrData[consign][status].length > 1 ? 's' : ''} (${((newAggrData[consign][status].length/totalTripsOfConsign)*100).toFixed(2)}%)`)
							  .style(status==='Early'?yellowStatusStyle:status==='Delayed'?redStatusStyle:greenStatusStyle);*/
					ws.cell(c + 2, 1).string(`${status}`).style(status === 'Early' ? yellowStatusStyle : status === 'Delayed' ? redStatusStyle : greenStatusStyle);
					for (var i = 0; i < newAggrData[consign][status].length; i++) {
						ws.cell(c + 3, 1).string(
							(newAggrData[consign][status][i].vehicle.trip.trip_no && newAggrData[consign][status][i].vehicle.trip.trip_no.toString()) || 'NA'
						).style(style); // trip no.
						ws.cell(c + 3, 2).string(
							newAggrData[consign][status][i].vehicle.vehicle_reg_no || "NA"
						).style(style); // vehicle no.
						ws.cell(c + 3, 3).string(
							(newAggrData[consign][status][i].vehicle.route && newAggrData[consign][status][i].vehicle.route.name) || 'NA'
						).style(style); // route name
						ws.cell(c + 3, 4).string(
							newAggrData[consign][status][i].distance_travelled && newAggrData[consign][status][i].distance_travelled.toString() || "NA"
						).style(style); // route distance
						ws.cell(c + 3, 5).string(
							(newAggrData[consign][status][i].vehicle.route && newAggrData[consign][status][i].vehicle.route.route_distance)
								? (newAggrData[consign][status][i].vehicle.route.route_distance - newAggrData[consign][status][i].distance_travelled).toString()
								: 'NA'
						).style(style);
						ws.cell(c + 3, 6).string(
							newAggrData[consign][status][i].vehicle.gr.loading_ended_status && newAggrData[consign][status][i].vehicle.gr.loading_ended_status.date
								? moment(newAggrData[consign][status][i].vehicle.gr.loading_ended_status.date).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style); // loading ended date
						ws.cell(c + 3, 7).string(
							newAggrData[consign][status][i].vehicle.gr.unloading_ended_status && newAggrData[consign][status][i].vehicle.gr.unloading_ended_status.date
								? moment(newAggrData[consign][status][i].vehicle.gr.unloading_ended_status.date).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style); // unloading ended date
						ws.cell(c + 3, 8).string(newAggrData[consign][status][i].t_status || "NA").style(style); // status
						ws.cell(c + 3, 9).string(
							newAggrData[consign][status][i].vehicle.gpsData && newAggrData[consign][status][i].vehicle.gpsData.address || 'NA'
						).style(style);  //actual arrival
						ws.cell(c + 3, 10).string(
							newAggrData[consign][status][i].vehicle.gpsData && newAggrData[consign][status][i].vehicle.gpsData.datetime
								? moment(newAggrData[consign][status][i].vehicle.gpsData.datetime).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style); // expected arrival
						ws.cell(c + 3, 11).string(
							newAggrData[consign][status][i].expected_eta ? moment(newAggrData[consign][status][i].expected_eta).format("DD-MM-YYYY")
								: "NA"
						).style(style);
						ws.cell(c + 3, 12).string(
							newAggrData[consign][status][i].current_eta ? moment(newAggrData[consign][status][i].current_eta).format("DD-MM-YYYY ")
								: "NA"
						).style(style);
						ws.cell(c + 3, 13).string(
							newAggrData[consign][status][i].vehicle
							&& newAggrData[consign][status][i].vehicle.gr
							&& newAggrData[consign][status][i].vehicle.gr.vehicle_arrived_for_loading_status
								? moment(newAggrData[consign][status][i].vehicle.gr.vehicle_arrived_for_loading_status.date).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style);
						ws.cell(c + 3, 14).string(
							newAggrData[consign][status][i].vehicle
							&& newAggrData[consign][status][i].vehicle.gr
							&& newAggrData[consign][status][i].vehicle.gr.vehicle_arrived_for_unloading_status
								? moment(newAggrData[consign][status][i].vehicle.gr.vehicle_arrived_for_unloading_status.date).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style);
						ws.cell(c + 3, 15).string(
							newAggrData[consign][status][i].vehicle
							&& newAggrData[consign][status][i].vehicle.trip
							&& newAggrData[consign][status][i].vehicle.trip.trip_start_status
								? moment(newAggrData[consign][status][i].vehicle.trip.trip_start_status.date).format("DD-MM-YYYY")
								: "NA"
						).style(style);
						ws.cell(c + 3, 16).string(
							newAggrData[consign][status][i].vehicle
							&& newAggrData[consign][status][i].vehicle.trip
							&& newAggrData[consign][status][i].vehicle.trip.trip_end_status
								? moment(newAggrData[consign][status][i].vehicle.trip.trip_end_status.date).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style);
						c += 1;
					}
					c += 2;
				}
			}
			c += 2;
		}
	}

	var a = `/reports/${clientId}/LiveTripReport/${group_by}_${moment(new Date()).format("DD-MM-YYYY")}.xlsx`;
	var path = `files${a}`;
	wb.write(path, function (err, stats) {
		if (err) {
			throw err;
		}
		return cb('http://' + commonUtil.getConfig('download_host') + ':' +
			commonUtil.getConfig('download_port') + a);
	});

};

module.exports.tripHistoryGrouped = (newAggrData, group_by, clientId, cb) => {
	var wb = new xl.Workbook();
	let folderType = 'TripHistoryReport';
	let dir = 'reports/' + clientId + '/' + folderType + '/';
	mkdirp.sync('./files/' + dir);

	var headerStyles = wb.createStyle({
		font: {color: '#272727', size: 10, bold: true},
		alignment: {horizontal: 'center', vertical: 'center', wrapText: true},
		fill: {type: 'pattern', patternType: 'solid', fgColor: '#D1E8E2'},
		border: {
			right: {style: 'thin', color: '#000000'}
		},
	});
	var consignstyle = wb.createStyle({
		font: {color: '#404040', size: 12, bold: true, italics: true, underline: true},
	});
	var redStatusStyle = wb.createStyle({
		font: {color: '#ff5a1e', size: 10, bold: true},
	});
	var greenStatusStyle = wb.createStyle({
		font: {color: '#1aff5d', size: 10, bold: true},
	});
	var yellowStatusStyle = wb.createStyle({
		font: {color: '#ffb400', size: 10, bold: true},
	});
	var style = wb.createStyle({
		font: {color: '#000000', size: 10},
	});
	var ws = wb.addWorksheet(`Trip History Analyis (${group_by.toUpperCase()})`);
	ws.row(1).freeze();
	ws.row(1).setHeight(30);
	for (var i = 1; i <= 13; i++) {
		ws.column(i).setWidth(15);
	}
	ws.cell(1, 1).string('TRIP NO.').style(headerStyles);
	ws.cell(1, 2).string('VEHICLE NO.').style(headerStyles);
	ws.cell(1, 3).string('ROUTE NAME').style(headerStyles);
	ws.cell(1, 4).string('ROUTE DISTANCE (KM)').style(headerStyles);
	ws.cell(1, 5).string('DISTANCE TRAVELLED (KM)').style(headerStyles);
	ws.cell(1, 6).string('LOADING ENDED DATE').style(headerStyles);
	ws.cell(1, 7).string('STATUS').style(headerStyles);
	ws.cell(1, 8).string('ACTUAL ARRIVAL').style(headerStyles);
	ws.cell(1, 9).string('EXPECTED ARRIVAL').style(headerStyles);
	ws.cell(1, 10).string('TRANSIT TIME').style(headerStyles);
	ws.cell(1, 11).string('TRIP DURATION').style(headerStyles);
	ws.cell(1, 12).string('LOADING TIME').style(headerStyles);
	ws.cell(1, 13).string('UNLOADING TIME').style(headerStyles);

	var c = 3;
	for (consign in newAggrData) {
		if (newAggrData.hasOwnProperty(consign)) {
			var totalTripsOfConsign = Object.values(newAggrData[consign]).reduce((acc, curr, i) => acc += curr.length, 0);
			ws.cell(c, 1).string(consign).style(consignstyle);
			for (var x in newAggrData[consign]) {
				if (newAggrData[consign].hasOwnProperty(x)) {
					ws.cell(++c, 1)
						.string(`${x} -- ${newAggrData[consign][x].length} Trip${newAggrData[consign][x].length > 1 ? 's' : ''} (${((newAggrData[consign][x].length / totalTripsOfConsign) * 100).toFixed(2)}%)`)
						.style(x === 'Early' ? yellowStatusStyle : x === 'Delayed' ? redStatusStyle : greenStatusStyle);
				}
			}
			for (status in newAggrData[consign]) {
				if (newAggrData[consign].hasOwnProperty(status)) {
					/*ws.cell(c+1, 1)
							  .string(`${status} - ${newAggrData[consign][status].length} Trip${newAggrData[consign][status].length > 1 ? 's' : ''} (${((newAggrData[consign][status].length/totalTripsOfConsign)*100).toFixed(2)}%)`)
							  .style(status==='Early'?yellowStatusStyle:status==='Delayed'?redStatusStyle:greenStatusStyle);*/
					ws.cell(c + 2, 1).string(`${status}`).style(status === 'Early' ? yellowStatusStyle : status === 'Delayed' ? redStatusStyle : greenStatusStyle);
					for (var i = 0; i < newAggrData[consign][status].length; i++) {
						ws.cell(c + 3, 1).string(newAggrData[consign][status][i].trip_no.toString()).style(style); // trip no.
						ws.cell(c + 3, 2).string(newAggrData[consign][status][i].vehicle.vehicle_reg_no || "NA").style(style); // vehicle no.
						ws.cell(c + 3, 3).string(newAggrData[consign][status][i].route.name || "NA").style(style); // route name
						ws.cell(c + 3, 4).string(newAggrData[consign][status][i].route.route_distance || "NA").style(style); // route distance
						ws.cell(c + 3, 5).string(newAggrData[consign][status][i].distance_travelled || "NA").style(style); // distance travelled (km)
						ws.cell(c + 3, 6).string(
							newAggrData[consign][status][i].gr.loading_ended_status && newAggrData[consign][status][i].gr.loading_ended_status.date
								? moment(newAggrData[consign][status][i].gr.loading_ended_status.date).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style); // loading ended date
						ws.cell(c + 3, 7).string(newAggrData[consign][status][i].trip.v_status || newAggrData[consign][status][i].t_status || "NA").style(style); // status
						ws.cell(c + 3, 8).string(
							newAggrData[consign][status][i].gr.unloading_started_status
								? moment(newAggrData[consign][status][i].gr.unloading_started_status.date).format("DD-MM-YYYY h:mma")
								: newAggrData[consign][status][i].gr.unloading_ended_status
								? moment(newAggrData[consign][status][i].gr.unloading_ended_status.date).format("DD-MM-YYYY h:mma")
								: 'NA'
						).style(style);  //actual arrival
						ws.cell(c + 3, 9).string(
							newAggrData[consign][status][i].expected_eta
								? moment(newAggrData[consign][status][i].expected_eta).format("DD-MM-YYYY h:mma")
								: "NA"
						).style(style); // expected arrival
						ws.cell(c + 3, 10).string(newAggrData[consign][status][i].transit_time).style(style); // transit time
						ws.cell(c + 3, 11).string(newAggrData[consign][status][i].trip_duration).style(style); // trip duration
						ws.cell(c + 3, 12).string(newAggrData[consign][status][i].loading_time).style(style); // loading time
						ws.cell(c + 3, 13).string(newAggrData[consign][status][i].unloading_time).style(style); // unloading time
						c += 1;
					}
					c += 2;
				}
			}
			c += 2;
		}
	}


	var a = `/reports/${clientId}/TripHistoryReport/${group_by}_${moment(new Date()).format("DD-MM-YYYY")}.xlsx`;
	var path = `files${a}`;
	wb.write(path, function (err, stats) {
		if (err) {
			throw err;
		}
		return cb('http://' + commonUtil.getConfig('download_host') + ':' +
			commonUtil.getConfig('download_port') + a);
	});

};

module.exports.tripHistoryReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip History Report');
	formatTitle(ws1, 9, 'Trip History Report');
	formatColumnHeaders(ws1, 3, [
		'TRIP NO.', 'VEHICLE NO.', 'ROUTE NAME', 'ROUTE DISTANCE', 'DISTANCE TRAVELLED (KM)', 'LOADING ENDED DATE', 'STATUS', 'EXPECTED ARRIVAL', 'ACTUAL ARRIVAL', 'TRANSIT TIME', 'TRANSIT DURATION', 'LOADING TIME', 'UNLOADING TIME'
	], [15, 20, 18, 15, 15, 15, 20, 15, 20, 15, 15, 15, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].trip_no || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].vehicle.vehicle_reg_no || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].route.name || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].route.route_distance || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].distance_travelled || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].gr.loading_ended_status.date ? moment(aData[i].gr.loading_ended_status.date).format("DD-MM-YYYY") : "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].t_status || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].expected_eta ? moment(aData[i].expected_eta).format("DD-MM-YYYY h:mma") : "NA";
		ws1.getCell('I' + (i + 4)).value = (aData[i].transit_time / (1000 * 60 * 60).toFixed(2)) + ' Hr' || 'NA';
		ws1.getCell('J' + (i + 4)).value = (aData[i].trip_duration / (1000 * 60 * 60).toFixed(2)) + ' Hr' || 'NA';
		ws1.getCell('K' + (i + 4)).value = aData[i].gr.unloading_ended_status.date ? moment(aData[i].gr.unloading_ended_status.date).format("DD-MM-YYYY h:mma") : "NA";
		ws1.getCell('L' + (i + 4)).value = (aData[i].loading_time / (1000 * 60 * 60).toFixed(2)) + ' Hr' || 'NA';
		ws1.getCell('M' + (i + 4)).value = (
			(aData[i].unloading_time > 0) && (aData[i].unloading_time / (1000 * 60 * 60)).toFixed(2) + ' Hr'
		) || 'NA';
	}

	saveFileAndReturnCallback(workbook, clientId, 'Trip', 'TripHistoryReport', callback);
};

module.exports.vehicleWiseRepairReportExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Repair Report');
	formatTitle(ws1, 9, 'Vehicle Wise Repair Report');
	formatColumnHeaders(ws1, 3, ['VEHICLE No', 'BREAK-DOWN TIME', 'SERVICE PROVIDER',
		'JOB CARD ID', 'DESCRIPTION', 'JOB DATE', 'WORKSHOP TIME',
		'TOTAL COST', 'KMs BETWEEN 2 REPAIRS'
	], [15, 20, 18, 15, 15, 15, 20, 15, 20]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].vehicle_number || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].vehicle_in_datetime || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].hom_short_name || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].jobId || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].description || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].created_at ? moment(aData[i].created_at).format("DD-MM-YYYY") : "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].created_at ? moment(aData[i].created_at).format("DD-MM-YYYY") : "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].actual_cost || "NA";
		ws1.getCell('I' + (i + 4)).value = aData[i].odometer_reading || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, 'RepairReport', callback);
};

module.exports.generateTripCancelExcel = function (aData, type, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Rollback Report');
	mergeCellsHandler(ws1, "A1", "AP1", 'Trip Rollback Report', true, true);
	let headers = ["Sl No.", "Trip No", "Booking No", "Booking Type", "Costumer Name", "Route Name", "Vehicle No",
		"Vehicle Type", "NoOfContainer", "Container Nos", "ContainerSize", "BOE", "TripStartDate", "AllocationDateTime",
		"DateOfDeleted", "RemarkOrResonOfRollback", "RollbackLogingName"
	];

	formatColumnHeaders(ws1, 3, headers, [4, 7, 7, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	for (let i = 0; i < aData.length; i++) {
		let oTrip = aData[i];
		let row = {};
		row["Sl No."] = i + 1;
		row["Trip No"] = oTrip.trip_no;
		row["Booking No"] = (oTrip.aBookingno && oTrip.aBookingno.length > 0) ? oTrip.aBookingno.join(', ') : "NA";
		row["Booking Type"] = (oTrip.booking_type && oTrip.booking_type.length > 0) ? oTrip.booking_type.join(', ') : "NA";
		row["Costumer Name"] = (oTrip.aCustomer && oTrip.aCustomer.length > 0) ? oTrip.aCustomer.join(', ') : "NA";
		row["Route Name"] = oTrip.route.route_name || "NA";
		row["Vehicle No"] = (oTrip.m_vehicle_no) ? oTrip.m_vehicle_no + "(" + oTrip.vehicle_no + ")" : (oTrip.vehicle_no || "NA");
		row["Vehicle Type"] = oTrip.vehicle.veh_type_name || "NA";
		row["NoOfContainer"] = (oTrip.aContainerNo && oTrip.aContainerNo.length > 0) ? oTrip.aContainerNo.length : 0;
		row["Container Nos"] = (oTrip.aContainerNo && oTrip.aContainerNo.length > 0) ? oTrip.aContainerNo.join(', ') : "NA";
		row["ContainerSize"] = (oTrip.aContainerType && oTrip.aContainerType.length > 0) ? oTrip.aContainerType.join(', ') : "NA";
		row["BOE"] = (oTrip.aBOE && oTrip.aBOE.length > 0) ? oTrip.aBOE.join(', ') : "NA";
		row["TripStartDate"] = oTrip.trip_start.time ? moment(oTrip.trip_start.time).format("DD-MM-YYYY HH:mm") : "NA";
		row["AllocationDateTime"] = oTrip.allocation_date ? moment(oTrip.allocation_date).format("DD-MM-YYYY HH:mm") : "NA";
		row["DateOfDeleted"] = (oTrip.trip_cancel.time) ? moment(oTrip.trip_cancel.time).format("DD-MM-YYYY HH:mm") : "NA";
		row["RemarkOrResonOfRollback"] = (oTrip.trip_cancel.remarks || oTrip.trip_cancel.reason) ? oTrip.trip_cancel.reason + (oTrip.trip_cancel.remark ? " - " + oTrip.trip_cancel.remark + "." : "") : "NA";
		row["RollbackLogingName"] = (oTrip.trip_cancel.user) ? oTrip.trip_cancel.user : "NA";
		addWorkbookRow(row, ws1, headers, (i + 4));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'trip_rollback', callback);
};

module.exports.customerRateChartSample = function (customer, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`${customer.name} Rate Chart Report`);
	let aRC = undefined;
	if (customer.configs && customer.configs.RATE_CHART && customer.configs.RATE_CHART.configs) {
		aRC = [];
		for (let k in customer.configs.RATE_CHART.configs) {
			if (customer.configs.RATE_CHART.configs.hasOwnProperty(k)) {
				if (Array.isArray(customer.configs.RATE_CHART.configs[k])) {
					customer.configs.RATE_CHART.configs[k].forEach(function (t) {
						aRC.push({...t, field: t.label});
					});
				} else {
					aRC.push({...customer.configs.RATE_CHART.configs[k], field: k});
				}
			}
		}
	}
	var rcc = (aRC || constants.defaultRateChartConfig).filter(x => Boolean(x.label && x.visible && x.editable));
	let headers = rcc.map(rcc => rcc.label);
	formatColumnHeaders(ws1, 1, headers, rcc.map(rcc => (rcc.label.length + 5)));
	saveFileAndReturnCallback(workbook, clientId, customer.reportType || 'rate_chart', `${customer.name}_rate_chart_report`, callback);
};

module.exports.commanRateSampleFile = function (data, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Rate Report');

	let headers = ['BILLING PARTY', 'DATE', 'HSN CODE', 'RATE'];
	formatColumnHeaders(ws1, 1, headers, [15, 10, 10, 10]);
	saveFileAndReturnCallback(workbook, clientId, 'rate', `rate_sample_file`, callback);
};

module.exports.customerRateReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Rate Report');
	const headers = ['Date', 'Billing Party', 'HSN Code', 'Rate', 'Created At', 'Created By'];
	formatTitle(ws1, headers.length, 'Rate  Report');
	formatColumnHeaders(ws1, 2, headers, [15, 15, 15, 15, 15, 15]);
	let rowNum = 3;
	aData.forEach(aRate => {
		aRate.rates.forEach(obj => {

			var row = {};
			row['Date'] = obj.effectiveDate && moment(obj.effectiveDate).format("DD-MM-YYYY") || "NA";
			row['Billing Party'] = obj.billingParty && obj.billingParty.name || "NA";
			row['HSN Code'] = obj.hsnCode || "NA";
			row['Rate'] = obj.rate || "NA";
			row['Created At'] = obj.uploaded_at || obj.created_at || "NA";
			row['Created By'] = obj.uploaded_by && obj.uploaded_by.name || obj.uploaded_by || "NA";

			addWorkbookRow(row, ws1, headers, (rowNum++));
		})
	})
	saveFileAndReturnCallback(workbook, clientId, 'RateReport', 'RateReport', callback);
};

module.exports.generateApprovedBudgetReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Approved Payment');
	formatTitle(ws1, 15, 'Approved Payment Report');
	const headers = ['Date', 'Trip No.', 'Vehicle No.', 'Vehicle Ownership', 'Driver name', 'Driver no.', 'Route name', 'Reference No.', 'Person', 'Advance Type', 'Amount', 'Diesel Rate', 'Diesel Litre', 'Remark'];
	formatColumnHeaders(ws1, 3, headers, [15, 10, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	for (var i = 0; i < aData.length; i++) {
		var row = {};
		row['Date'] = aData[i].created_at || "NA";
		row['Trip No.'] = aData[i].trip_no || "NA";
		row['Vehicle No.'] = aData[i].vehicle_no || "NA";
		row['Vehicle Ownership'] = aData[i].vehicle_ownership || "NA";
		row['Driver name'] = aData[i].driver_name || "NA";
		row['Driver no.'] = aData[i].driver_no || "NA";
		row['Route name'] = aData[i].route_name || "NA";
		row['Reference No.'] = aData[i].reference_no || "NA";
		row['Person'] = aData[i].person || "NA";
		row['Advance Type'] = aData[i].advanceType || "NA";
		row['Amount'] = aData[i].amount || "NA";
		row['Diesel Rate'] = (aData[i].dieseInfo && aData[i].dieseInfo.rate) || "NA";
		row['Diesel Litre'] = (aData[i].dieseInfo && aData[i].dieseInfo.litre) || "NA";
		row['Remark'] = aData[i].remark || "NA";
		addWorkbookRow(row, ws1, headers, (i + 4));
	}
	saveFileAndReturnCallback(workbook, clientId, 'PaymentReport', 'ApprovedPaymentReport', callback);
};

function getHourDiff(date1, date2, decimalPlace) {
	let hours = Math.abs(date1 - date2) / 36e5;
	let dp = decimalPlace || 2;
	return Math.round(hours * Math.pow(10, dp)) / Math.pow(10, dp);
}

function fillHeader(worksheet, row, header, column, color) {
	for (let col = 0; col < column.length; col++) {
		let i = header.indexOf(column[col]);
		let c = (i > 25) ? ("A" + (String.fromCharCode(65 + count))) : String.fromCharCode(65 + i);

		worksheet.getCell(c + row).fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: {
				argb: color
			}
		};
	}
}

module.exports.generateCustomerReachExcel = function (aData, clientData, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Customer Reach Report');
	formatTitle(ws1, 15, 'Customer Reach Report');
	let headers = ['Vehicle No', 'Vehicle Type', 'Driver Name', 'Route Name', 'Trip No', 'Trip Start Date', 'Estimated up Time(Hrs)',
		'Actual up time(Hrs)', 'Extra Time Taken', 'Reaching Time', 'Alloted Unloading(Hrs)', 'Total(Hrs) In Cust Loc', 'Detantion (Hrs)',
		'Gps Date', 'Location'
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 15, lastAggValue);
		}
		let row = {};
		let upTime_days = (oTrip.route.rates && oTrip.route.rates.up_time && oTrip.route.rates.up_time.days) ? oTrip.route.rates.up_time.days : 0;
		let upTime_hours = (oTrip.route.rates && oTrip.route.rates.up_time && oTrip.route.rates.up_time.hours) ? oTrip.route.rates.up_time.hours : 0;

		row['Vehicle No'] = aData.data[i].vehicle_no || "NA";
		row['Vehicle Type'] = aData.data[i].vehicle_type || "NA";
		row['Driver Name'] = aData.data[i].driver_name || "NA";
		row['Route Name'] = aData.data[i].route ? aData.data[i].route.route_name || "NA" : "NA";
		row['Trip No'] = aData.data[i].trip_no || "NA";
		row['Trip Start Date'] = oTrip.trip_start.time ? moment(oTrip.trip_start.time).format(clientData.dateTimeFormat.momentJS) : "NA";

		row['Estimated up Time(Hrs)'] = (upTime_days * 24 + upTime_hours);
		row['Actual up time(Hrs)'] = "" || "NA";
		row['Extra Time Taken'] = "" || "NA";
		row['Reaching Time'] = aData.data[i].vehicle_no || "NA";  // todo fetch data from gps and integrate it
		row['Alloted Unloading(Hrs)'] = aData.data[i].vehicle_no || "NA";
		row['Total(Hrs) In Cust Loc'] = aData.data[i].vehicle_no || "NA";
		row['Detantion (Hrs)'] = aData.data[i].vehicle_no || "NA";
		row['Gps Date'] = aData.data[i].vehicle_no || "NA";
		row['Location'] = aData.data[i].vehicle_no || "NA";


		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	saveFileAndReturnCallback(workbook, clientData.clientId, aData.aggregateBy || 'miscellaneous', 'customer_reach', callback);
};

module.exports.generateFuelVendorExcel = function (aData, clientData, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Fuel Vendor Report');
	formatTitle(ws1, 15, 'Fuel Vendor Report');
	let headers = ["Trip No", "Vehicle", "Route", "Allocation Date", "Fuel Vendor", "Fuel Station", "Fuel Type", "Rates", "Quantity(Ltr)", "Amount", "Date",
		"Reference No", "Remarks", "Entry Date", "Person"
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 15, lastAggValue);
		}
		let row = {};

		row["Trip No"] = aData.data[i].trip && aData.data[i].trip.trip_no ? aData.data[i].trip.trip_no : "NA";
		row["Vehicle"] = aData.data[i].trip && aData.data[i].trip.vehicle_no ? aData.data[i].trip.vehicle_no : "NA";
		row["Route"] = aData.data[i].trip && aData.data[i].trip.route_name ? aData.data[i].trip.route_name : "NA";
		row["Allocation Date"] = aData.data[i].trip && aData.data[i].trip.allocation_date ? moment(aData.data[i].trip.allocation_date).format("DD-MM-YYYY") : "NA";
		row["Fuel Vendor"] = aData.data[i].diesel_info && aData.data[i].diesel_info.vendor && aData.data[i].diesel_info.vendor.name ? aData.data[i].diesel_info.vendor.name : "NA";
		row["Fuel Station"] = aData.data[i].diesel_info && aData.data[i].diesel_info.station && aData.data[i].diesel_info.station.fuel_company ? aData.data[i].diesel_info.station.fuel_company : "NA";
		row["Fuel Type"] = aData.data[i].diesel_info && aData.data[i].diesel_info.station && aData.data[i].diesel_info.station.fuel_type ? aData.data[i].diesel_info.station.fuel_type : "NA";
		row["Rates"] = aData.data[i].diesel_info && aData.data[i].diesel_info.rate ? aData.data[i].diesel_info.rate : "NA";
		row["Quantity(Ltr)"] = aData.data[i].diesel_info && aData.data[i].diesel_info.litre ? aData.data[i].diesel_info.litre : "NA";
		row["Amount"] = aData.data[i].amount || "NA";
		row["Date"] = aData.data[i].date ? moment(aData.data[i].date).format("DD-MM-YYYY") : "NA";
		row["Reference No"] = aData.data[i].reference_no || "NA";
		row["Remarks"] = aData.data[i].remark || "NA";
		row["Entry Date"] = aData.data[i].created_at ? moment(aData.data[i].created_at).format("DD-MM-YYYY") : "NA";
		row["Person"] = aData.data[i].person || "NA";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	saveFileAndReturnCallback(workbook, clientData.clientId, aData.aggregateBy || 'miscellaneous', 'customer_reach', callback);
};

module.exports.accountBalanceReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Balance Sheet');
	formatTitle(ws1, 15, 'Balance Sheet');

	let headerFill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'b2d8b2'
		}
	};
	let subHeaderFill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'ccccff'
		}
	};

	let cellColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'f2da97'
		}
	};

	let cellColorTotal = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'ffb400'
		}
	};


	for (i = 2; i >= 1; i--) { // lvl = 4
		for (j = 0; j < aData[i].groups.length; j++) {
			let child = aData[i].groups[j];
			for (k = 0; k < aData[i - 1].groups.length; k++) {
				let parentEle = aData[i - 1].groups[k];
				if (child.parent == parentEle.node) {
					parentEle.children = parentEle.children || [];
					parentEle.children.push(child);
					break;
				}
			}
		}
	}

	let assetsLeft = aData[0].groups;
	let aAssets = [];
	let aOthers = [];
	for (m = 0; m < assetsLeft.length; m++) {
		if (assetsLeft[m].name == 'Assets') {
			aAssets.push(assetsLeft[m]);
			//assetsLeft.pop(assetsLeft[m]);
		} else {
			aOthers.push(assetsLeft[m]);
		}
	}

	// LEFT
	let x = 0;
	let totalLeftAmt = 0;
	let leftCnt = 0;
	for (let i = 0; i < aAssets.length; i++) {
		ws1.getCell('A' + (i + 3)).fill = cellColor;
		ws1.getCell('A' + (i + 3)).value = aAssets[i].name || "NA";
		for (p = 0; p < aAssets[i].children.length; p++) {
			ws1.getCell('A' + (i + x + p + 4)).fill = subHeaderFill;
			ws1.getCell('A' + (i + x + p + 4)).value = aAssets[i].children[p].name || "NA";
			for (q = 0; q < aAssets[i].children[p].children.length; q++) {
				ws1.getCell('B' + (p + x + 5)).value = aAssets[i].children[p].children[q].name || "NA";
				ws1.getCell('C' + (p + x + 5)).value = aAssets[i].children[p].children[q].totalAmt || 0;
				totalLeftAmt += aAssets[i].children[p].children[q].totalAmt;
				leftCnt = (p + x + 5);
				x++;
			}
		}
	}

	ws1.getCell('B' + (leftCnt + 1)).fill = cellColorTotal;
	ws1.getCell('B' + (leftCnt + 1)).value = "Total Amount";
	ws1.getCell('C' + (leftCnt + 1)).fill = cellColorTotal;
	ws1.getCell('C' + (leftCnt + 1)).value = totalLeftAmt;
	// RIGHT

	let y = 0;
	let z = 0;
	let totalRightAmt = 0;
	let rightCnt = 0;
	for (let j = 0; j < aOthers.length; j++) {
		ws1.getCell('E' + (j + z + y + 3)).fill = cellColor;
		ws1.getCell('E' + (j + z + y + 3)).value = aOthers[j].name || "NA";
		for (r = 0; r < (aOthers[j].children && aOthers[j].children.length); r++) {
			ws1.getCell('E' + (j + y + r + 4)).fill = subHeaderFill;
			ws1.getCell('E' + (j + y + r + 4)).value = aOthers[j].children[r].name || "NA";
			for (s = 0; s < (aOthers[j].children[r].children && aOthers[j].children[r].children.length); s++) {
				ws1.getCell('F' + (r + j + y + 5)).value = aOthers[j].children && aOthers[j].children[r].children && aOthers[j].children[r].children[s].name || "NA";
				ws1.getCell('G' + (r + j + y + 5)).value = aOthers[j].children && aOthers[j].children[r].children && aOthers[j].children[r].children[s].totalAmt || 0;
				totalRightAmt += aOthers[j].children[r].children[s].totalAmt;
				rightCnt = (r + j + y + 5);
				y++;
			}
			z++;
		}
	}
	ws1.getCell('F' + (rightCnt + 1)).fill = cellColorTotal;
	ws1.getCell('F' + (rightCnt + 1)).value = "Total Amount";
	ws1.getCell('G' + (rightCnt + 1)).fill = cellColorTotal;
	ws1.getCell('G' + (rightCnt + 1)).value = totalRightAmt;

	saveFileAndReturnCallback(workbook, clientId, 'Balance Sheet', 'balance_sheet', callback);

};

module.exports.accountMasterReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Account Report');
	formatTitle(ws1, 15, 'Account Report');
	let headers = ['NAME', 'LEDGER', 'TYPE', 'GROUP', 'BALANCE', 'BRANCH', 'ACCOUNT ID', 'Bill Track', 'Linking', 'Level', 'Creation'];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 10, 15, 15, 15, 15, 15, 10, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg === 'branch') {
			if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg]['name'])) {
				lastAggValue = aData.data[i][agg]['name'];
				mergeCells(ws1, rowNum++, 15, lastAggValue);
			}
		} else {
			if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
				lastAggValue = aData.data[i][agg];
				mergeCells(ws1, rowNum++, 15, lastAggValue);
			}
		}
		let row = {};
		row['NAME'] = aData.data[i].name || 'NA';
		row['LEDGER'] = aData.data[i].ledger_name || 'NA';
		row['GROUP'] = aData.data[i].type && aData.data[i].type.name || 'NA';
		row['TYPE'] = (aData.data[i].group && aData.data[i].group.join && aData.data[i].group.join(', ')) || 'NA';
		row['BRANCH'] = (aData.data[i].branch && aData.data[i].branch.name) || 'NA';
		row['ACCOUNT ID'] = aData.data[i].accountId || 'NA';
		row['BALANCE'] = aData.data[i].balance || 0;
		row['Bill Track'] = aData.data[i].billAc ? 'YES' : 'NO';
		row['Linking'] = aData.data[i].linkedTo && aData.data[i].linkedTo.name || 'NA';
		row['Level'] = aData.data[i].lvl || 'NA';
		row['Creation'] = aData.data[i].created_at || 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'account_master', callback);
};

module.exports.accountVoucherReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Account Voucher Report');
	formatTitle(ws1, 2, 'Voucher Report');
	let headers = ["SL NO.", "VCH NO.", "VCH TYPE", "DATE", "CREDIT", "DEBIT", "AMOUNT", "NARRATION", "BILL NO", "REF TYPE", "CREATION"];
	formatColumnHeaders(ws1, 2, headers, [5, 10, 10, 15, 15, 10, 15, 15, 10, 10, 10, 10]);
	let rowNum = 3;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row["SL NO."] = i + 1;
		row["DATE"] = aData.data[i].date ? moment(aData.data[i].date).format("DD-MM-YYYY") : 'NA';
		row['CREDIT'] = aData.data[i].from ? aData.data[i].from.name : 'NA';
		row['DEBIT'] = aData.data[i].to ? aData.data[i].to.name : 'NA';
		row['AMOUNT'] = aData.data[i].amount;
		row['NARRATION'] = aData.data[i].narration;
		row['VCH TYPE'] = aData.data[i].type;
		row['VCH NO.'] = aData.data[i].refNo;
		//row['BRANCH'] = aData.data[i].branch;
		row['BILL NO'] = aData.data[i].billNo;
		row['REF TYPE'] = aData.data[i].billType;
		row['CREATION'] = aData.data[i].created_at ? moment(aData.data[i].created_at).format("DD-MM-YYYY") : 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'voucherReport', callback);
};

module.exports.gstComputationVoucherReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GST Computation Report');
	formatTitle(ws1, 2, 'GST Computation Report');
	let headers = ["SL NO.", "BILLING PARTY", "BILL NO", "BILL DATE", "TAXABLE", "CGST", "SGST", "IGST", "BILL AMOUNT"];
	formatColumnHeaders(ws1, 2, headers, [10, 20, 15, 15, 10, 10, 10, 10, 15]);
	let rowNum = 3;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["SL NO."] = i + 1;
		row["BILLING PARTY"] = aData[i]._id.ledgerDr ? aData[i]._id.ledgerDr : 'NA';
		row["BILL NO"] = "";
		row["BILL DATE"] = "";
		row['TAXABLE'] = aData[i].ledgerFR ? aData[i].ledgerFR.toFixed(2) : '0';
		row['CGST'] = aData[i].ledgerCGST ? aData[i].ledgerCGST.toFixed(2) : '0';
		row['SGST'] = aData[i].ledgerSGST ? aData[i].ledgerSGST.toFixed(2) : '0';
		row['IGST'] = aData[i].ledgerIGST ? aData[i].ledgerIGST.toFixed(2) : '0';
		row['BILL AMOUNT'] = aData[i].ledgerDr ? aData[i].ledgerDr.toFixed(2) : '0';
		addWorkbookRow(row, ws1, headers, (rowNum++));

		if (aData[i].ledger && aData[i].ledger.length > 0) {
			for (let j = 0; j < aData[i].ledger.length; j++) {
				let row2 = {};
				row2["SL NO."] = "";
				row2["BILLING PARTY"] = "";
				row2["BILL NO"] = aData[i].ledger[j].refNo ? aData[i].ledger[j].refNo : 'NA';
				row2["BILL DATE"] = aData[i].ledger[j].date ? moment(aData[i].ledger[j].date).format("DD-MM-YYYY") : 'NA';
				row2['TAXABLE'] = (aData[i].ledger[j].ledgerFR && aData[i].ledger[j].ledgerFR.amount) ? aData[i].ledger[j].ledgerFR.amount.toFixed(2) : '0';
				row2['CGST'] = (aData[i].ledger[j].ledgerCGST && aData[i].ledger[j].ledgerCGST.amount) ? aData[i].ledger[j].ledgerCGST.amount.toFixed(2) : '0';
				row2['SGST'] = (aData[i].ledger[j].ledgerSGST && aData[i].ledger[j].ledgerSGST.amount) ? aData[i].ledger[j].ledgerSGST.amount.toFixed(2) : '0';
				row2['IGST'] = (aData[i].ledger[j].ledgerIGST && aData[i].ledger[j].ledgerIGST.amount) ? aData[i].ledger[j].ledgerIGST.amount.toFixed(2) : '0';
				row2['BILL AMOUNT'] = (aData[i].ledger[j].ledgerDr && aData[i].ledger[j].ledgerDr.amount) ? aData[i].ledger[j].ledgerDr.amount.toFixed(2) : '0';

				addWorkbookRow(row2, ws1, headers, (rowNum++));
			}
		}
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'GSTComputationReport', callback);
};

module.exports.gstPaymentVoucherReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GST Payment Report');
	formatTitle(ws1, 2, 'GST Payment Report');
	let headers = ["TAXABLE", "CGST", "SGST", "IGST", "BILL AMOUNT"];
	formatColumnHeaders(ws1, 2, headers, [10, 10, 10, 10, 15]);
	let rowNum = 3;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row['TAXABLE'] = aData[i].ledgerFR ? aData[i].ledgerFR.toFixed(2) : '0';
		row['CGST'] = aData[i].ledgerCGST ? aData[i].ledgerCGST.toFixed(2) : '0';
		row['SGST'] = aData[i].ledgerSGST ? aData[i].ledgerSGST.toFixed(2) : '0';
		row['IGST'] = aData[i].ledgerIGST ? aData[i].ledgerIGST.toFixed(2) : '0';
		row['BILL AMOUNT'] = aData[i].ledgerDr ? aData[i].ledgerDr.toFixed(2) : '0';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'GSTPaymentReport', callback);
};

module.exports.ledger = function (aData, req, callback) {

	let summary = aData.summary;
	let clientId = req.user.clientId;
	let req_body = req.body;
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Ledger Report');
	formatTitle(ws1, 9, 'Ledger Report');

	ws1.getCell('A3').value = 'SUMMARY';
	ws1.getCell('A4').value = 'LEDGER A/C:';
	ws1.getCell('B4').value = aData.data[0].lAc;
	ws1.getCell('A5').value = 'OPENING BALANCE:';
	ws1.getCell('B5').value = summary.ob;
	ws1.getCell('A6').value = 'CLOSING BALANCE:';
	ws1.getCell('B6').value = summary.cb;
	ws1.getCell('A7').value = 'DATE(FROM - TO):';
	ws1.getCell('B7').value = moment(req_body.from_date).utcOffset(0, true).toDate() + ' - ' + moment(req_body.to_date).utcOffset(0, true).toDate();
	ws1.getCell('A8').value = 'CURRENT TOTAL(DR):';
	ws1.getCell('B8').value = summary.dr;
	ws1.getCell('A9').value = 'CURRENT TOTAL(CR):';
	ws1.getCell('B9').value = summary.cr;

	let headers = ["SL NO.", "DATE", "PARTICULAR", "NARRATION", "VCH TYPE", "VCH NO.", "DR", "CR", "BALANCE"];
	formatColumnHeaders(ws1, 11, headers, [5, 16, 30, 25, 10, 10, 10, 10, 10]);
	let rowNum = 12;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg === 'from' || agg === 'to') {
			if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg]['name'])) {
				lastAggValue = aData.data[i][agg]['name'];
				mergeCells(ws1, rowNum++, 15, lastAggValue);
			}
		} else {
			if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
				lastAggValue = aData.data[i][agg];
				mergeCells(ws1, rowNum++, 15, lastAggValue);
			}
		}
		let row = {};

		row["SL NO."] = i + 1;
		row["DATE"] = aData.data[i].date ? moment(aData.data[i].date).format("DD-MM-YYYY") : 'NA';
		row['PARTICULAR'] = aData.data[i].pAc;
		row['NARRATION'] = aData.data[i].narration || '';
		row['VCH TYPE'] = aData.data[i].type || 'NA';
		row['VCH NO.'] = aData.data[i].refNo || 'NA';
		row['DR'] = aData.data[i].dr ? aData.data[i].dr : '';
		row['CR'] = aData.data[i].cr ? aData.data[i].cr : '';
		row['BALANCE'] = aData.data[i].balance || '';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	let rName = aData.data[0].lAc;
	rName = (rName && rName.replace('/', '')) || 'ledger_report';
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'ledger' + rName, callback);
};

module.exports.bankReconciliationledger = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Bank Reconciliation Ledger Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["SL NO.","Date", "Particulars", "Vch Type", "Transaction Type" , "Instrument No." , "Instrument Date" , "Bank Date" , "Debit" , "Credit"];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 8;
	formatColumnHeaders(ws1, 7, headers, [5,22,35, 25, 25, 25, 25,35,15,25]);
	headerTopMerged(ws1, 'A1', 'J1', 'Caravan Project Logistics(Delhi)', option);
	headerTopMerged(ws1, 'A2', 'J2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'J3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'J4',aData && aData.summary && aData.summary.accountName , options);
	headerTopMerged(ws1, 'A5', 'J5', 'Reconciliation Statement', options);
	headerTopMerged(ws1, 'A6', 'J6', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	let cnt = 1;
	aData.data.forEach(obj => {
		let row = {};
		row["SL NO."] = cnt++;
		row["Date"] = obj.date && moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
		row["Particulars"] = obj.pAc || 'NA';
		row["Vch Type"] = obj.type || 'NA';
		row["Transaction Type"] = obj.paymentMode || 'NA';
		row["Instrument No."] = obj.chequeNo || 'NA';
		row["Instrument Date"] = obj.chequeDate && moment(new Date(obj.chequeDate)).format("DD-MM-YYYY") || 'NA';
		row["Bank Date"] = obj.chequeClear && obj.chequeClear.date && moment(new Date(obj.chequeClear.date)).format("DD-MM-YYYY") || 'NA';
		row["Debit"] = parseFloat((obj.dr || 0).toFixed(2));
		row["Credit"] = parseFloat((obj.cr || 0).toFixed(2));
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'H',rowNum,'Balance as per Company Books:',{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'J',rowNum++,(aData && aData.summary && (aData.summary.cb - aData.summary.ob)|| 0),{fill:'ccccff'});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'H',rowNum,'Amounts not reflected in Bank:',{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'J',rowNum++,(aData && aData.summary && (aData.summary.tNclDr - aData.summary.tNclCr ) || 0),{fill:'ccccff'});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'H',rowNum,'Amounts not reflected in Company Books :',{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'J',rowNum++,'',{fill:'ccccff'});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'H',rowNum,'Balance as per Bank:',{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'J',rowNum++,(aData && aData.summary && ((aData.summary.cb - aData.summary.ob) + (aData.summary.tNclDr - aData.summary.tNclCr))  || 0),{fill:'ccccff'});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'H',rowNum,'Balance as per Imported Bank Statement :',{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'J',rowNum++,'',{fill:'ccccff'});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'H',rowNum,'Difference :',{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'J',rowNum,'',{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'BankReconciliation Ledger Report', 'BankReconciliation Ledger Report', callback);
};

module.exports.ledgerReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Ledger Report');
	let headers = ["LEDGER", "DATE", "OPENING", "CLOSING"];
	formatTitle(ws1, headers.length, 'Ledger Report');
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["LEDGER"] = obj._id.account.name;
		row["DATE"] = `${obj._id.day}/${obj._id.month.toString().length === 1 ? ('0' + obj._id.month.toString()) : obj._id.month}/${obj._id.year}`;
		if (obj.firstVoucher.from.toString() === obj._id.account._id.toString()) {
			row["OPENING"] = obj.firstVoucher.fromClosing;
		} else if (obj.firstVoucher.to.toString() === obj._id.account._id.toString()) {
			row["OPENING"] = obj.firstVoucher.toClosing;
		}
		if (obj.lastVoucher.from.toString() === obj._id.account._id.toString()) {
			row["CLOSING"] = obj.lastVoucher.fromClosing;
		} else if (obj.lastVoucher.to.toString() === obj._id.account._id.toString()) {
			row["CLOSING"] = obj.lastVoucher.toClosing;
		}
		let cell1 = toAlphabet(3) + rowNum;
		let cell2 = toAlphabet(4) + rowNum;
		setCellNumFormat(ws1, cell1);
		setCellNumFormat(ws1, cell2);
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'Ledger_Report', callback);
};

module.exports.plainVoucherReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Plain Voucher Report');
	formatTitle(ws1, 1, 'Plain Voucher Report');
	let headers = ["SL NO.", "DATE", "Reference", "Debit Ac", "Credit Ac", "Dr Amt", "Cr Amt", "NARRATION", "Bill No", "Type", "PAYMENT TYPE", "CREATED DATE", "LAST MODIFIED AT"];
	formatColumnHeaders(ws1, 3, headers, [5, 10, 22, 25, 25, 25, 25, 25, 25, 10, 15, 17, 20, 20]);
	let rowNum = 4;

	for (var i = 0; i < aData.length; i++) {
		aData[i].crAc = [];
		aData[i].drAc = [];
		aData[i].drAmt = [];
		aData[i].crAmt = [];
		aData[i].billNo = new Set();
		aData[i].tAmt = 0;
		for (var k = 0; k < aData[i].ledgers.length; k++) {
			if (aData[i].ledgers[k].cRdR == 'CR') {
				aData[i].crAc.push(aData[i].ledgers[k].lName);
				aData[i].crAmt.push((aData[i].ledgers[k].amount).toFixed(2));
				aData[i].tAmt += aData[i].ledgers[k].amount;
			} else {
				aData[i].drAc.push(aData[i].ledgers[k].lName);
				aData[i].drAmt.push((aData[i].ledgers[k].amount).toFixed(2));
			}

			if (aData[i].ledgers[k].bills.length) {
				(aData[i].ledgers[k].bills).forEach(o => aData[i].billNo.add(o.billNo));
			}
		}

		aData[i].crAc = (aData[i].crAc).join(',');
		aData[i].drAc = (aData[i].drAc).join(',');
		aData[i].drAmt = (aData[i].drAmt).join(',');
		aData[i].crAmt = (aData[i].crAmt).join(',');
		aData[i].billNo = [...aData[i].billNo].join(',');

	}


	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["SL NO."] = i + 1;
		row["CREATED DATE"] = aData[i].created_at ? moment(aData[i].created_at).format("DD-MM-YYYY h:mm a") : 'NA';
		row["DATE"] = aData[i].date ? moment(aData[i].date).format("DD-MM-YYYY h:mm a") : 'NA';
		row['Reference'] = aData[i].refNo || '';
		row['NARRATION'] = aData[i].narration || '';
		row['Type'] = aData[i].type || '';
		row['Debit Ac'] = aData[i].drAc || 'NA';
		row['Credit Ac'] = aData[i].crAc || 'NA';
		row['Dr Amt'] = aData[i].drAmt || 'NA';
		row['Cr Amt'] = aData[i].crAmt || 'NA';
		row['Bill No'] = aData[i].billNo || '';
		row['PAYMENT TYPE'] = aData[i].vT || '';
		// let cId = (aData[i].vendor && aData[i].vendor.clientId) || aData[i].clientId;
		// let clientAllowed = user.client_allowed.find(ca => ca.clientId === cId);
		// row['COMPANY NAME'] = clientAllowed && clientAllowed.name || 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'plain_voucher', callback);
};

module.exports.driverPaymentReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Driver Payment Report');
	formatTitle(ws1, 1, 'Driver Payment Report');
	let headers = ["SN", "Office", "ReferenceNo", "CreatedName", "RTP No", "VoucherType", "VehicleNo", "DriverName", "DrAccount", "CrAccount", "Amount", "Remark", "VoucherDate", "CreatedDate"];
	formatColumnHeaders(ws1, 3, headers, [5, 25, 25, 25, 15, 25, 25, 25, 10, 25, 25, 15, 25, 15]);
	let rowNum = 4;

	for (var i = 0; i < aData.length; i++) {
		aData[i].crAc = [];
		aData[i].drAc = [];
		aData[i].drAmt = [];
		aData[i].crAmt = [];
		aData[i].billNo = new Set();

		aData[i].tAmt = 0;
		for (var k = 0; k < aData[i].voucher.ledgers.length; k++) {
			if (aData[i].voucher.ledgers[k].cRdR == 'CR') {
				aData[i].crAc.push(aData[i].voucher.ledgers[k].lName);
				aData[i].crAmt.push((aData[i].voucher.ledgers[k].amount).toFixed(2));
				aData[i].tAmt += aData[i].voucher.ledgers[k].amount;
			} else {
				aData[i].drAc.push(aData[i].voucher.ledgers[k].lName);
				aData[i].drAmt.push((aData[i].voucher.ledgers[k].amount).toFixed(2));
			}

		}

		aData[i].crAc = (aData[i].crAc).join(',');
		aData[i].drAc = (aData[i].drAc).join(',');

	}


	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["SN"] = i + 1;
		row["Office"] = (aData[i].branch && aData[i].branch.name) || 'NA';
		row["VoucherType"] = (aData[i].voucher && aData[i].voucher.type) || 'NA';
		row['ReferenceNo'] = (aData[i].voucher && aData[i].voucher.refNo) || '';
		row['VehicleNo'] = (aData[i].vehicle && aData[i].vehicle.vehicle_reg_no) || '';
		row['DriverName'] = (aData[i].driver && aData[i].driver.name) || '';
		row['DrAccount'] = aData[i].drAc || 'NA';
		row['CrAccount'] = aData[i].crAc || 'NA';
		row['Amount'] = aData[i].tAmt || 'NA';
		row['Remark'] = (aData[i].voucher && aData[i].voucher.narration) || 'NA';
		row['VoucherDate'] = (aData[i].voucher && aData[i].voucher.date) ? moment(aData[i].voucher.date).format("DD-MM-YYYY h:mm a") : 'NA';
		row['CreatedName'] = (aData[i].voucher && aData[i].voucher.createdBy) || "NA";
		row['CreatedDate'] = (aData[i].voucher && aData[i].voucher.created_at) ? moment(aData[i].voucher.created_at).format("DD-MM-YYYY h:mm a") : 'NA';
		row['RTP No'] = (aData[i].advSettled && aData[i].advSettled.tsNo) || "NA";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'driverPayment', callback);
};

module.exports.taxReport = function (data, clientId, callback) {
	let workbook = new Excel.Workbook();
	//let data = {};
	let ws1 = workbook.addWorksheet("Tax Report");
	formatTitle(ws1, 8, "Tax Report");
	let rowNum = 5;
	let headers = ["CGST PAID", "SGST PAID", "IGST PAID", "TOTAL PAID", "", "CGST PAYABLE", "SGST PAYABLE", "IGST PAYABLE", "TOTAL PAYABLE"];
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 20, 20, 20, 20]);
	formatColumnHeaders(ws1, 3, ["", "", "PAID", "", "", "", "", "PAYABLE", ""], [15, 15, 25, 15, 15, 15, 15, 20, 15]);

	/*for(i in aData)
	{
		data[aData[i].type]=aData[i].sum;

	}*/
	let row = {};

	row['CGST PAID'] = data.cgstPaid || 'NA';
	row['SGST PAID'] = data.sgstPaid || 'NA';
	row['IGST PAID'] = data.igstPaid || 'NA';
	row['TOTAL PAID'] = (data.cgstPaid || 0) + (data.sgstPaid || 0) + (data.igstPaid || 0);
	row[""] = " ";
	row['CGST PAYABLE'] = data.cgstPayable || 'NA';
	row['SGST PAYABLE'] = data.sgstPayable || 'NA';
	row['IGST PAYABLE'] = data.igstPayable || 'NA';
	row['TOTAL PAYABLE'] = (data.cgstPayable || 0) + (data.sgstPayable || 0) + (data.igstPayable || 0);
	//row['TDS PAID']=data.tdsPaid ?data.tdsPaid:'NA';
	//row['TDS PAYABLE']=data.tdsPayable ?data.tdsPayable :'NA';
	addWorkbookRow(row, ws1, headers, rowNum++);
	saveFileAndReturnCallback(workbook, clientId, "Tax", "TaxReport", callback);


};

module.exports.tdsReport = function (data, clientId, callback) {
	let workbook = new Excel.Workbook();
	//let data = {};
	let ws1 = workbook.addWorksheet("TDS Report");
	formatTitle(ws1, 8, "TDS Report");
	let rowNum = 5;
	let headers = ["TDS PAID", "TDS PAYABLE"];
	formatColumnHeaders(ws1, 4, headers, [20, 20]);

	/*for(i in aData)
	{
		data[aData[i].type]=aData[i].sum;

	}*/
	let row = {};

	row['TDS PAID'] = data.tdsPaid || 'NA';
	row['TDS PAYABLE'] = data.tdsPayable || 'NA';
	addWorkbookRow(row, ws1, headers, rowNum++);
	saveFileAndReturnCallback(workbook, clientId, "TDS", "TDSReport", callback);
};

module.exports.tdsMonthlyReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('TDS Monthly Report');
	formatTitle(ws, 10, 'TDS Monthly Report');
	let aMonth = [];
	let rowCounter = 5;

	for (let i = moment(from).endOf('month').valueOf(); i <= moment(to).endOf('month').valueOf(); i += 2592000000) { // 1 month = 2592000000 = 1000 * 60 * 60 * 24 * 30
		aMonth.push(moment(i).format('MM-YYYY'));
	}
	//aMonth.push('Total');
	let colIndex = 1;
	let rowIndex = 3;
	aMonth.forEach(month => {
		ws.mergeCells(`${toAlphabet(colIndex)}${rowIndex}:${toAlphabet(colIndex + 1)}${rowIndex}`);
		ws.getCell(`${toAlphabet(colIndex + 1)}${rowIndex}`).value = month;
		ws.getCell(`${toAlphabet(colIndex)}${rowIndex + 1}`).value = 'Bill Amount';
		ws.getCell(`${toAlphabet(colIndex + 1)}${rowIndex + 1}`).value = 'TDS Amount';
		colIndex += 2;
	});

	aData.forEach(obj => {

		mergeCells(ws, (rowCounter), 10, obj.name);

		let a = 0;
		let total = 0, total2 = 0;
		rowCounter++;
		aMonth.forEach(month => {
			let header = month;
			try {
				ws.getCell(getNextAlphabet(a++) + rowCounter).value = helperFn.toFixed((obj[header] && obj[header].amount), 0).toFixed(2);
				ws.getCell(getNextAlphabet(a++) + rowCounter).value = helperFn.toFixed((obj[header] && obj[header].TdsAmount || 0), 0).toFixed(2);
			} catch (err) {
				console.log(err);
			}
		});

		rowCounter++;

	});

	saveFileAndReturnCallback(workbook, clientId, 'TDS Monthly Report', 'TDS Monthly Report', callback);

	function getNextAlphabet(range) {

		return String.fromCharCode('A'.charCodeAt() + range);

	}
};

let addWorkbookRowDefaultBlank = function (data, workbook, headers, rowNum, showNA, options) {
	let count = 0;

	let show = (showNA === false) ? "" : "";

	for (let j = 0; j < headers.length; j++) {

		if (j % 26 == 0) {
			count = 0
		}
		let column;
		if (j > 51) {
			column = "B" + (String.fromCharCode(65 + count));
		} else if (j > 25) {
			column = "A" + (String.fromCharCode(65 + count));
		} else {
			column = String.fromCharCode(65 + j);
		}
		/*
				if (j === 26) {
					count = 0
				}
				let column = (j > 25) ? ("A" + (String.fromCharCode(65 + count))) : String.fromCharCode(65 + j);

		 */
		workbook.getCell(column + rowNum).value = (typeof data[headers[j]] === "number") ? data[headers[j]] : (data[headers[j]] || show);
		(typeof data[headers[j]] === "string" && data[headers[j]].length > 40) && (workbook.getCell(column + rowNum).alignment = {wrapText: true});
		if (data.hasOwnProperty(headers[j]) && options) {
			if (options.fill)
				workbook.getCell(column + rowNum).fill = options.fill;
			if (options.alignment)
				workbook.getCell(column + rowNum).alignment = {
					...options.alignment,
					...((typeof data[headers[j]] === "string" && data[headers[j]].length > 40) ? {wrapText: true} : {})
				};
			if (options.border)
				workbook.getCell(column + rowNum).border = options.border;
			if (options.numFmt && options.numFmt[headers[j]]) {
				workbook.getCell(column + rowNum).numFmt = options.numFmt[headers[j]];
			}
		}
		count++;
	}
};

let addWorkbookRow = function (data, workbook, headers, rowNum, showNA, options) {
	let count = 0;
	let show = (showNA === false) ? "" : "NA";
	for (let j = 0; j < headers.length; j++) {

		if (j % 26 == 0) {
			count = 0
		}
		let column;
		if(j > 77){
			column = "C" + (String.fromCharCode(65 + count));
		}
		else if (j > 51) {
			column = "B" + (String.fromCharCode(65 + count));
		} else if (j > 25) {
			column = "A" + (String.fromCharCode(65 + count));
		} else {
			column = String.fromCharCode(65 + j);
		}
		/*
				if (j === 26) {
					count = 0
				}
				let column = (j > 25) ? ("A" + (String.fromCharCode(65 + count))) : String.fromCharCode(65 + j);

		 */
		workbook.getCell(column + rowNum).value = (typeof data[headers[j]] === "number") ? data[headers[j]] : (data[headers[j]] || show);
		(typeof data[headers[j]] === "string" && data[headers[j]].length > 40) && (workbook.getCell(column + rowNum).alignment = {wrapText: true});
		if (data.hasOwnProperty(headers[j]) && options) {
			if (options.fill)
				workbook.getCell(column + rowNum).fill = options.fill;
			if (options.alignment)
				workbook.getCell(column + rowNum).alignment = {
					...options.alignment,
					...((typeof data[headers[j]] === "string" && data[headers[j]].length > 40) ? {wrapText: true} : {})
				};
			if (options.border)
				workbook.getCell(column + rowNum).border = options.border;
			if (options.numFmt && options.numFmt[headers[j]]) {
				workbook.getCell(column + rowNum).numFmt = options.numFmt[headers[j]];
			}
		}
		count++;
	}
};

function addWorkbookRowV2(data, workbook, headers, rowNum, showNA, options = {}) {

	let count = 0;
	let show = (showNA === false) ? "" : "NA";

	headers.forEach((header, index) => {

		let cell = numberToAlphabet(index) + rowNum;
		let value = data[header];

		workbook.getCell(cell).value = value || show;

		if (typeof value === "string" && value.length > 40)
			workbook.getCell(cell).alignment = {wrapText: true};

		if (options.fill)
			workbook.getCell(cell).fill = options.fill;

		if (options.alignment)
			workbook.getCell(cell).alignment = Object.assign(workbook.getCell(cell).alignment || {}, options.alignment);

		if (options.border)
			workbook.getCell(cell).border = options.border;

		if (options.numFmt && options.numFmt[header])
			workbook.getCell(cell).numFmt = options.numFmt[header];

		// workbook.getRow(index).commit();
	});
};

module.exports.generateIdleTripExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Idle Report');
	//formatTitle(ws1, 10, 'Trip Report');
	mergeCellsHandler(ws1, "A1", "AP1", 'Trip Idle Report', true, true);

	//let headers = ["Sl No.","Branch","Allocation DateTime","Dispatch DateTime","Dispatch Delay(Hrs.)","Trip No.","Booking No.","Booking Type","BOE No.","GR Type","GR No.","Customer","CHA","Billing Party","Vehicle No.","Vehicle Type","Driver","Container No.","Container Type","Container Line","Route Name","Route Distance in Masters","Weight(Tonne)","Rate","Frieght","Diesel(Ltr.)","Diesel Rate(/Ltr.)","Diesel Cost(Rs.)","Diesel Cash(Adv.)","Driver Cash(Adv.)","Trip Cash(Adv.)","Trip Starter","Model/Type","Sub-Group","Group"];
	//let headers = ["Sl No.","Branch","Allocation DateTime","Dispatch DateTime","Dispatch Delay(Hrs.)","Trip No.","Booking No.","Booking Type","BOE No.","GR Type","GR No.","Customer","CHA","Billing Party","Vehicle No.","Vehicle Type","Driver","Container No.","Container Type","Container Line","Route Name","Route Distance in Masters","Weight(Tonne)","Rate","Frieght","Diesel(Ltr.)","Diesel Rate(/Ltr.)","Diesel Cost(Rs.)","Diesel Cash(Adv.)","Driver Cash(Adv.)","Trip Cash(Adv.)","Trip Starter","Model/Type","Sub-Group","Group"];
	let headers = ["Sl No.", "Vehicle No", "Trip No", "Customer Name", "Route Name", "Trip Start Date/Time", "Last Trip End Date/Time", "Idle hours"];

	formatColumnHeaders(ws1, 3, headers, [6, 7, 15, 11, 24, 19, 19, 35]);

	for (let i = 0; i < aData.length; i++) {
		let oTrip = aData[i];
		let row = {};
		row["Sl No."] = i + 1;
		row["Vehicle No"] = (oTrip.m_vehicle_no) ? oTrip.m_vehicle_no + "(" + oTrip.vehicle_no + ")" : (oTrip.vehicle_no || "NA");
		row["Trip No"] = oTrip.trip_no;
		row["Customer Name"] = (oTrip.aCustomer && oTrip.aCustomer.length > 0) ? oTrip.aCustomer.join(', ') : "NA";
		row["Route Name"] = oTrip.route.route_name || "NA";
		row["Trip Start Date/Time"] = oTrip.trip_start.time ? moment(oTrip.trip_start.time).format("DD-MM-YYYY h:mm a") : "NA";
		row["Last Trip End Date/Time"] = oTrip.lastTripD.trip_end.time ? moment(oTrip.lastTripD.trip_end.time).format("DD-MM-YYYY h:mm a") : "NA";
		row["Idle hours"] = oTrip.idle_hour;
		addWorkbookRow(row, ws1, headers, (i + 4));
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'trip idle report', callback);
};

module.exports.generateTripAggregationExcel = function (data, aggregateBy, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Trip Report');
	formatTitle(ws, 10, 'Trip Report');

	let titles = ['TRIP No.', 'CUSTOMER', 'VEHICLE', 'DRIVER', 'DATE', 'GR No.', 'GR Type', 'START LOCATION', 'END LOCATION', 'VEHICLE STATUS', 'TRIP STATUS', 'TRIP LOCATION'];
	let titleKeys = ['trip_no', 'customer_name', 'vehicle_no', 'driver_name', 'date',
		'gr_no', 'gr_type', 'start_loc', 'end_loc', 'vehicle_running_status',
		'trip_status', 'trip_loc'
	];
	let titleLen = [10, 22, 15, 15, 15, 15, 29, 29, 15, 12, 29];

	let aggr = ['driver', 'date', 'vehicle'];
	let aggrField = ['driver_name', 'date', 'vehicle_no'];
	let aggrIndex = aggr.indexOf(aggregateBy);
	if (aggrIndex === -1) aggrIndex = 1;
	aggregateBy = aggrField[aggrIndex];

	let titleIndex = titleKeys.indexOf(aggregateBy);
	titles.splice(titleIndex, 1);
	titleKeys.splice(titleIndex, 1);
	titleLen.splice(titleIndex, 1);

	formatColumnHeaders(ws, 3, titles, titleLen);

	let headers = {};

	for (let i = 0; i < data.length; i++) {
		data[i].date = moment(data[i].allocation_date).format("DD-MM-YYYY") || "NA";
		data[i].vehicle_no = (data[i].m_vehicle_no) ? data[i].m_vehicle_no + "(" + data[i].vehicle_no + ")" : (data[i].vehicle_no || "NA");
		data[i].customer_name = data[i].aCustomer.toString() || "NA";
		data[i].gr_no = data[i].aGRno.toString() || "NA";

		if (!headers[data[i][aggregateBy]]) {
			headers[data[i][aggregateBy]] = [];
		}
		headers[data[i][aggregateBy]].push(data[i]);
	}

	let alphabet = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase().split('');

	let index = 4;
	for (let header in headers) {
		mergeCells(ws, index, 10);
		bold(ws.getCell('A' + index));
		ws.getCell('A' + index).fill = summaryFill;

		ws.getCell('A' + index).value = header;
		index++;

		for (let i = 0; i < headers[header].length; i++) {

			for (let j = 0; j < titleKeys.length; j++) {
				let key = titleKeys[j];
				ws.getCell(alphabet[j] + index).value = headers[header][i][key] || "NA";
			}
			index++;
		}
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'trip_' + aggr[aggrIndex], callback);
};

module.exports.generateRegisteredVehicleExcel = function (aData, clientId, callback, reportType) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Registered Vehicle Report');
	ws1.autoFilter = 'A3:AM3';
	let header1 = ['VEHICLE No.', 'DriverName', 'MANAGER(Contact)',
		'TripStart', 'TripEnd', 'LastPartyName', 'LastTripTime', 'TripEndPerson',
		'IdleHour', 'CurrentLocation', 'GpsDate', 'Status', 'Reasons'
	];
	let header2 = ['VEHICLE No.', 'Segment','Status', 'Driver', 'Driver Code', 'Driver Mobile',
		'TYPE', 'MODEL', 'Owner Name', 'Category', 'Ownership Type', 'Group', 'Structure',
		'Manufacturer', 'Capacity(Ton)', 'Permit Expiry Date', 'Owner', 'Vendor/Associate', 'Width(Ft)', 'Height(Ft)',
		'Mileage', 'Rate/Km', 'Cost Center', 'Chasis No.', 'Engine No.', 'Insurance Company',
		'Insurance No.', 'Insured Amt', 'Insurance Expiry Date', 'RC Book No.', 'Fitness Insurance Date',
		'Fitness Expiry Date', 'Road Tax Doc. No.', 'Road Tax Insurance Date', 'Road Rax Expiry Date', 'GpsVendor', 'vId', 'IMEI', 'NEW COLUMN2'
	];


	if (reportType === "Offtrip") {
		formatTitle(ws1, header1.length, 'Offtrip Vehicle Report');
		formatColumnHeaders(ws1, 3, header1, [5, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	} else {
		formatTitle(ws1, header2.length, 'Registered Vehicle Report');
		formatColumnHeaders(ws1, 3, header2, [13, 16, 36,16, 13, 23, 18, 15, 9, 16, 12, 14, 13, 17, 15, 15, 15, 15, 15, 15, 15, 21, 21, 18, 15, 15, 20, 15, 21, 18, 17, 23, 20, 15, 15, 23]);
	}

	for (let i = 0; i < aData.length; i++) {
		let oVehicle = aData[i];
		let oTrip = (aData[i].trip_doc && aData[i].trip_doc.length > 0) ? aData[i].trip_doc[aData[i].trip_doc.length - 1] : {};
		let tripStartTime = (oTrip.trip_start && oTrip.trip_start.time) ? new Date(oTrip.trip_start.time) : undefined;
		let tripEndTime = (oTrip.trip_end && oTrip.trip_end.time) ? new Date(oTrip.trip_end.time) : undefined;
		let actualIdleTotalHrs = (tripEndTime) ? Math.ceil(Math.abs((new Date()).getTime() - tripEndTime.getTime())) / (1000 * 3600) : undefined;
		let actualTripTotalHrs = (tripEndTime && tripStartTime) ? Math.ceil(Math.abs(tripEndTime.getTime() - tripStartTime.getTime())) / (1000 * 3600) : undefined;
		let aTempCustomer = [];
		if (oTrip && oTrip.gr && (oTrip.gr.length > 0)) {
			for (let c = 0; c < oTrip.gr.length; c++) {
				if (oTrip.gr[c].customer_name) {
					aTempCustomer.push(oTrip.gr[c].customer_name);
				}
			}
		}
		let aLastCustomer = aTempCustomer.filter(onlyUnique);
		let row = {};
		row["Sl No."] = i + 1;
		row["VEHICLE No."] = oVehicle.vehicle_reg_no;
		row["Segment"] = oVehicle.segment_type;
		row["Driver"] = oVehicle.driver_name || (oVehicle.driver && oVehicle.driver.name);
		row["Driver Code"] = oVehicle.driver_employee_code || (oVehicle.driver && oVehicle.driver.employee_code);
		row["Driver Mobile"] = oVehicle.driver_contact_no || (oVehicle.driver && oVehicle.driver.prim_contact_no);
		row["TYPE"] = oVehicle.veh_type_name;
		row["MODEL"] = oVehicle.model;
		row["Owner Name"] = oVehicle.owner_name;
		row["Category"] = oVehicle.category;
		row["Group"] = oVehicle.veh_group_name;
		row["Structure"] = oVehicle.structure_name;
		row["Manufacturer"] = oVehicle.manufacturer;
		row["Capacity(Ton)"] = oVehicle.capacity_tonne;
		row["Permit Expiry Date"] = oVehicle.permit_expiry_date && moment(oVehicle.permit_expiry_date).format("DD-MM-YYYY H:mm");
		row["Ownership Type"] = oVehicle && oVehicle.ownershipType;
		row["Owner"] = oVehicle.owner_name;
		row["Vendor/Associate"] = oVehicle.vendor_name;
		row["Width(Ft)"] = oVehicle.width_ft;
		row["Height(Ft)"] = oVehicle.height_ft;
		row["Mileage"] = oVehicle.budgeting && oVehicle.budgeting.mileage;
		row["Rate/Km"] = oVehicle.budgeting && oVehicle.budgeting.rpk;
		row["Cost Center"] = oVehicle.costCenter && oVehicle.costCenter.name;
		row["Chasis No."] = oVehicle.chassis_no;
		row["Engine No."] = oVehicle.engine_no;
		row["Insurance Company"] = oVehicle.structure_name;
		row["Insurance No."] = oVehicle.insurance_company;
		row["Insured Amt"] = oVehicle.insured_amount;
		row["Insurance Expiry Date"] = oVehicle.insurance_expiry_date && moment(oVehicle.insurance_expiry_date).format("DD-MM-YYYY H:mm");
		row["RC Book No."] = oVehicle.rc_book_no;
		row["Fitness Insurance Date"] = oVehicle.fitness_cert_issuance_date && moment(oVehicle.fitness_cert_issuance_date).format("DD-MM-YYYY H:mm");
		row["Fitness Expiry Date"] = oVehicle.fitness_cert_expiry_date && moment(oVehicle.fitness_cert_expiry_date).format("DD-MM-YYYY H:mm");
		row["Road Tax Doc. No."] = oVehicle.road_tax_doc_no;
		row["Road Tax Insurance Date"] = oVehicle.road_tax_doc_issuance_date && moment(oVehicle.road_tax_doc_issuance_date).format("DD-MM-YYYY H:mm");
		row["Road Rax Expiry Date"] = oVehicle.road_tax_doc_expiry_date && moment(oVehicle.road_tax_doc_expiry_date).format("DD-MM-YYYY H:mm");

		row["TripStart"] = tripStartTime ? moment(tripStartTime).format("DD-MM-YYYY H:mm") : "";
		row["TripEnd"] = tripEndTime ? moment(tripEndTime).format("DD-MM-YYYY H:mm") : "";
		row["LastPartyName"] = aLastCustomer.join(', ');
		row["LastTripTime"] = actualTripTotalHrs ? parseFloat((Math.round(actualTripTotalHrs * 100) / 100).toFixed(2)) : "";
		row["TripEndPerson"] = (oTrip && oTrip.trip_end && oTrip.trip_end.user) ? oTrip.trip_end.user : "";
		row["IdleHour"] = actualIdleTotalHrs ? parseFloat((Math.round(actualIdleTotalHrs * 100) / 100).toFixed(2)) : "";
		row["CurrentLocation"] = (oTrip && oTrip.current_location && oTrip.current_location.address) ? oTrip.current_location.address : "No GPS Device Connected.";
		row["GpsDate"] = (oTrip && oTrip.current_location && oTrip.current_location.location_time) ? moment(oTrip.current_location.location_time).format("DD-MM-YYYY H:mm") : "No GPS Device Connected.";
		row["Status"] = oVehicle.status;
		row["Reasons"] = "Vehicle " + oVehicle.status;
		row["MANAGER(Contact)"] = oVehicle.owner_group;
		//row["BRANCH"] =oTrip.trip_no;
		row["Route"] = oVehicle.last_known ? oVehicle.last_known.trip_name ? (oVehicle.last_known.trip_name || "NA") : "NA" : "NA";
		row["GpsVendor"] = oVehicle.gpsData && oVehicle.gpsData.vendor_name;
		row["vId"] = oVehicle._id.toString();
		row["IMEI"] = oVehicle.device_imei;
		row["NEW COLUMN2"] = oVehicle.owner_group;
		if (reportType === "Offtrip") {
			addWorkbookRow(row, ws1, header1, (i + 4), false);
		} else {
			addWorkbookRow(row, ws1, header2, (i + 4), false);
		}
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'registeredVehicle', callback);
};

module.exports.generateCompositionMatrixExcel = function (aData, clientId, callback, reportType) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Registered Vehicle Report');
	let header1 = ['VEHICLE No.', 'Ownership Type', 'Owner', 'Segment', 'Fleet', 'Group', 'TYPE'];

	formatTitle(ws1, header1.length, 'Composition Matrix');
	formatColumnHeaders(ws1, 3, header1, [13,
		19,
		32,
		16,
		10,
		20,
		31]);


	for (let i = 0; i < aData.length; i++) {
		let oVehicle = aData[i];
		let oTrip = (aData[i].trip_doc && aData[i].trip_doc.length > 0) ? aData[i].trip_doc[aData[i].trip_doc.length - 1] : {};
		let tripStartTime = (oTrip.trip_start && oTrip.trip_start.time) ? new Date(oTrip.trip_start.time) : undefined;
		let tripEndTime = (oTrip.trip_end && oTrip.trip_end.time) ? new Date(oTrip.trip_end.time) : undefined;
		let actualIdleTotalHrs = (tripEndTime) ? Math.ceil(Math.abs((new Date()).getTime() - tripEndTime.getTime())) / (1000 * 3600) : undefined;
		let actualTripTotalHrs = (tripEndTime && tripStartTime) ? Math.ceil(Math.abs(tripEndTime.getTime() - tripStartTime.getTime())) / (1000 * 3600) : undefined;
		let aTempCustomer = [];
		if (oTrip && oTrip.gr && (oTrip.gr.length > 0)) {
			for (let c = 0; c < oTrip.gr.length; c++) {
				if (oTrip.gr[c].customer_name) {
					aTempCustomer.push(oTrip.gr[c].customer_name);
				}
			}
		}
		let aLastCustomer = aTempCustomer.filter(onlyUnique);
		let row = {};
		row["Sl No."] = i + 1;
		row["VEHICLE No."] = oVehicle.vehicle_reg_no;
		row["Ownership Type"] = oVehicle && oVehicle.ownershipType;
		row["Owner"] = oVehicle.owner_name;
		row["Segment"] = oVehicle.segment_type;
		row["Fleet"] = oVehicle && oVehicle.owner_group;
		row["Group"] = oVehicle.veh_group_name;
		row["TYPE"] = oVehicle.veh_type_name;

		addWorkbookRow(row, ws1, header1, (i + 4), false);

	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'registeredVehicle', callback);
};

module.exports.generateCustomerExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Customer Report');
	formatTitle(ws1, 13, 'Customer Report');
	formatColumnHeaders(ws1, 3, ['Name', 'Type', 'Address', 'GSTIN Status', 'GSTIN No', 'State Code', 'Active Contract', 'Created By', 'SAP ID', 'Contact Person', 'Contact No', 'Modified At', 'Modified By', 'Category', 'Id'], [25, 30, 35, 15, 20, 5, 15, 15, 15, 15, 15, 15, 25, 25, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].name || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].type.join(', ') || "NA";
		ws1.getCell('C' + (i + 4)).value = parseOaddressToString(aData[i].address);
		ws1.getCell('D' + (i + 4)).value = aData[i].gstin_registered ? "Registered" : "Not Registered";
		ws1.getCell('E' + (i + 4)).value = aData[i].gstin_no || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].state_code || "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].active_contract || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].created_by_name || "NA";
		ws1.getCell('I' + (i + 4)).value = aData[i].sap_id || "NA";
		ws1.getCell('J' + (i + 4)).value = aData[i].prim_contact_name || "NA";
		ws1.getCell('K' + (i + 4)).value = aData[i].prim_cont_no || "NA";
		ws1.getCell('L' + (i + 4)).value = moment(aData[i].last_modified_at).format("DD-MM-YYYY") || "NA";
		ws1.getCell('M' + (i + 4)).value = aData[i].last_modified_by_name || "NA";
		ws1.getCell('N' + (i + 4)).value = aData[i].category || "NA";
		ws1.getCell('O' + (i + 4)).value = aData[i]._id.toString();
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'customer', callback);
};

module.exports.generateExpenceExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Expence Report');
	formatTitle(ws1, 17, 'Expence Report');
	formatColumnHeaders(ws1, 3, ['TRIP No.', 'VEHICLE NO.', 'ROUTE NAME', 'ALLOCATION DATE', 'TRIP START LOCATION', 'TRIP END LOCATION', 'DRIVER NAME', 'VENDOR NAME', 'VENDOR CONTACT', 'ADVANCE(RS.)', 'TO PAY(RS.)', 'DRIVER CASH(RS.)', 'DIESEL(LTR.)', 'DIESEL COST(RS.)', 'TOLL TAX(RS.)', 'TOTAL COST(RS.)', 'EXTRA COST(RS.)'], [10, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].trip_no || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].vehicle_no || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].route.route_name || "NA";
		ws1.getCell('D' + (i + 4)).value = moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].trip_start.address.formatted_address || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].trip_end.address.formatted_address || "NA";

		ws1.getCell('G' + (i + 4)).value = aData[i].driver_name || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].vendor_name || "NA";
		ws1.getCell('I' + (i + 4)).value = aData[i].vendor_contact || "NA";
		ws1.getCell('J' + (i + 4)).value = aData[i].advance || 0;
		ws1.getCell('K' + (i + 4)).value = aData[i].balance || 0;
		ws1.getCell('L' + (i + 4)).value = aData[i].driver_cash || 0;
		ws1.getCell('M' + (i + 4)).value = aData[i].diesel_expenses_total_litre || 0;
		ws1.getCell('N' + (i + 4)).value = aData[i].diesel_expenses_total_price || 0;
		ws1.getCell('O' + (i + 4)).value = aData[i].toll_tax_total_price || 0;
		ws1.getCell('P' + (i + 4)).value = aData[i].total_expense || 0;
		ws1.getCell('Q' + (i + 4)).value = aData[i].additional_expenses_total_price || 0;
	}
	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'expence', callback);
};
// module.exports.generateGRExcel = function (aData, clientId, callback) {
// 	let workbook = new Excel.Workbook();
// 	let ws1 = workbook.addWorksheet('GR Report');
// 	formatTitle(ws1, 8, 'GR Report');
// 	formatColumnHeaders(ws1, 3, [
// 		'Sl No', 'Trip No', 'Branch', 'Customer', 'Allocation Date', 'Route Name', 'Vehicle',
// 		'Driver', 'GR No', 'GR Date'
// 	], [
// 		7, 7, 25, 22, 25,
// 		25, 25, 15
// 	]);
//
// 	for (let i = 0; i < aData.length; i++) {
// 		ws1.getCell('A' + (i + 4)).value = i + 1;
// 		ws1.getCell('B' + (i + 4)).value = aData[i].trip_no || "NA";
// 		ws1.getCell('C' + (i + 4)).value = aData[i].branch || "NA";
// 		ws1.getCell('D' + (i + 4)).value = aData[i].customer_name || "NA";
// 		ws1.getCell('E' + (i + 4)).value = moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
// 		ws1.getCell('F' + (i + 4)).value = aData[i].route_name || "NA";
// 		ws1.getCell('G' + (i + 4)).value = (aData[i].m_vehicle_no) ? aData[i].m_vehicle_no + "(" + aData[i].vehicle_no + ")" : (aData[i].vehicle_no || "NA");
// 		ws1.getCell('H' + (i + 4)).value = aData[i].driver_name || "NA";
// 		ws1.getCell('I' + (i + 4)).value = aData[i].gr_no || "NA";
// 		ws1.getCell('J' + (i + 4)).value = moment(aData[i].gr_date).format("DD-MM-YYYY") || "NA";
// 	}
//
// 	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'GR', callback);
// };
module.exports.generateGRPendingExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GR Pending Report');
	formatTitle(ws1, 17, 'GR Pending Report');
	formatColumnHeaders(ws1, 3, [
		'Sl No', 'Trip', 'Branch', 'Customer', 'Route Name', 'Allocation Date', 'Pending GR Remark', 'Trip End Date', 'BOE no.', 'Container No.', 'Vehicle',
		'Driver', 'GR No', 'GR Date', 'GR Type', 'freight', 'Group'
	], [
		7, 8, 15, 22, 25, 25, 25, 25, 25, 25,
		25, 25, 15, 25, 25, 25, 25
	]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = i + 1;
		ws1.getCell('B' + (i + 4)).value = aData[i].trip_no;
		ws1.getCell('C' + (i + 4)).value = aData[i].branch || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].customer_name || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].route_name || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].allocation_date ? moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA" : "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].pending_gr_remarks || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].trip_end ? moment(aData[i].trip_end.time).format("DD-MM-YYYY") || "NA" : "NA";
		ws1.getCell('I' + (i + 4)).value = aData[i].boe_no || "NA";
		let c_no = "";
		for (let t = 0; t < aData[i].booking_info.length; t++) {
			c_no += aData[i].booking_info[t].container_no + ',';
		}
		ws1.getCell('J' + (i + 4)).value = c_no || "NA";
		ws1.getCell('K' + (i + 4)).value = (aData[i].m_vehicle_no) ? aData[i].m_vehicle_no + "(" + aData[i].vehicle_no + ")" : (aData[i].vehicle_no || "NA");
		ws1.getCell('L' + (i + 4)).value = aData[i].driver_name || "NA";
		ws1.getCell('M' + (i + 4)).value = aData[i].gr_no || "NA";
		ws1.getCell('N' + (i + 4)).value = moment(aData[i].gr_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('O' + (i + 4)).value = aData[i].gr_type || "NA";
		ws1.getCell('P' + (i + 4)).value = aData[i].freight || 0;
		ws1.getCell('Q' + (i + 4)).value = aData[i].owner_group || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'GRPending', callback);
};

module.exports.generateGRAckExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GR ACK Report');
	formatTitle(ws1, 17, 'GR ACK Report');
	formatColumnHeaders(ws1, 3, [
		'Sl No', 'Trip', 'Vehicle', 'Driver', 'Container No', 'GR No', 'GR Type', 'GR Date', 'Receiving Date', 'Trip End Date', 'Group', 'Customer', 'Branch', 'Route Name', 'Allocation Date', 'freight', 'Remark'
	], [
		5, 7, 15, 22, 15, 15, 15, 15, 12,
		10, 15, 25, 20, 25, 15, 10, 22
	]);

	for (let i = 0; i < aData.length; i++) {
		let aContainerNo = [];
		for (let j = 0; j < aData[i].booking_info.length; j++) {
			if (aData[i].booking_info[j].container_no) {
				aContainerNo.push(aData[i].booking_info[j].container_no)
			}
		}

		ws1.getCell('A' + (i + 4)).value = i + 1;
		ws1.getCell('B' + (i + 4)).value = aData[i].trip_no;
		ws1.getCell('C' + (i + 4)).value = (aData[i].m_vehicle_no) ? aData[i].m_vehicle_no + "(" + aData[i].vehicle_no + ")" : (aData[i].vehicle_no || "NA");
		ws1.getCell('D' + (i + 4)).value = aData[i].driver_name || "NA";
		ws1.getCell('E' + (i + 4)).value = (aContainerNo && aContainerNo.length > 0) ? aContainerNo.join(', ') : "";
		ws1.getCell('F' + (i + 4)).value = aData[i].gr_no || "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].gr_type || "NA";
		ws1.getCell('H' + (i + 4)).value = moment(aData[i].gr_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('I' + (i + 4)).value = aData[i].receiving_date ? moment(aData[i].receiving_date).format("DD-MM-YYYY H:mm") : "";
		ws1.getCell('J' + (i + 4)).value = moment(aData[i].trip_end.time).format("DD-MM-YYYY H:mm") || "NA";
		ws1.getCell('K' + (i + 4)).value = aData[i].owner_group || "NA";
		ws1.getCell('L' + (i + 4)).value = aData[i].customer_name || "NA";
		ws1.getCell('M' + (i + 4)).value = aData[i].branch || "NA";
		ws1.getCell('N' + (i + 4)).value = aData[i].route_name || "NA";
		ws1.getCell('O' + (i + 4)).value = moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('P' + (i + 4)).value = aData[i].freight || 0;
		ws1.getCell('Q' + (i + 4)).value = aData[i].pending_gr_remarks;
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'GRACK', callback);
};

module.exports.generateDriverExcel = function (drivers, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Driver Report');
	formatTitle(ws1, 24, 'Driver Report');
	formatColumnHeaders(ws1, 3, [
		'Sl No', 'NoOfTrips', 'TotalAdvance', 'ExtraExpense', 'TotalBilling',
		'Offence', 'Amount', 'Remarks', 'Accidents', 'RewardAmount(INR)',
	], [
		7, 25, 15, 22, 22,
		25, 22, 22, 22, 22
	]);

	let nextCell = 4;

	for (let key in drivers) {
		ws1.getCell('A' + (nextCell)).value = drivers[key.name] + ' (' + key + ')';
		nextCell++;
		let aData = drivers[key].trips;
		for (let i = 0; i < aData.length; i++) {
			ws1.getCell('A' + (nextCell)).value = i + offset - 4;
			ws1.getCell('B' + (nextCell)).value = aData[i].trip_no || "NA";
			ws1.getCell('C' + (nextCell)).value = aData[i].booking_no || "NA";
			ws1.getCell('D' + (nextCell)).value = aData[i].branch || "NA";
			ws1.getCell('E' + (nextCell)).value = aData[i].customer_name || "NA";
			ws1.getCell('F' + (nextCell)).value = aData[i].route.route_name || "NA";
			ws1.getCell('G' + (nextCell)).value = aData[i].billing_party_name || "NA";
			ws1.getCell('H' + (nextCell)).value = aData[i].material_group || "NA";
			ws1.getCell('I' + (nextCell)).value = aData[i].material_type || "NA";
			ws1.getCell('J' + (nextCell)).value = aData[i].booking_type || "NA";
			nextCell++;
		}
		ws1.getCell('A' + (nextCell)).value = drivers[key.name] + ' (' + key + ')';
		nextCell++;
	}

	saveFileAndReturnCallback(workbook, clientId, 'bookings', callback);
};

exports.generateVendorPayExcel = function (data, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Vendor Report');
	formatTitle(ws, 11, 'Vendor Report');
	formatColumnHeaders(ws, 3, ['TRIP No', 'VENDOR', 'CUSTOMER', 'VEHICLE', 'TOTAL AMOUNT',
		'PAID', 'UNPAID', 'TRIP END DATE', 'OUTSTANDING'
	], [10, 15, 15, 15, 15, 15, 15, 18, 13]);
	for (let i = 0; i < data.length; i++) {
		ws.getCell('A' + (i + 4)).value = data[i].trip_no || "NA";
		ws.getCell('B' + (i + 4)).value = data[i].vendor_name || "NA";
		ws.getCell('C' + (i + 4)).value = data[i].customer_name || "NA";
		ws.getCell('D' + (i + 4)).value = data[i].vehicle_no || "NA";
		ws.getCell('E' + (i + 4)).value = data[i].total_expense || "NA";

		let paid = 0;
		for (let j = 0; i < data[i].payment.length; j++) {
			paid += (data[i].payment[j].amount || 0);
		}

		ws.getCell('F' + (i + 4)).value = paid || "NA";
		ws.getCell('G' + (i + 4)).value = data[i].total_expense - paid || "NA";

		ws.getCell('H' + (i + 4)).value = moment(data[i].trip_end.time).format("DD-MM-YYYY hh:mm a") || "NA";
		ws.getCell('I' + (i + 4)).value = data[i].outstanding || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, data.reportType || 'miscellaneous',
		'profitability' + (data.mis_type ? data.mis_type : ""), callback);
};

module.exports.generateInventoryExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Inventory Report');
	formatTitle(ws1, 10, 'Inventory Report');
	formatColumnHeaders(ws1, 3, ['Entry Id', 'Spare Code', 'Spare Name', 'Vendor Name', 'Vendor Id', 'Quantity', 'Remaining Qty', 'Rate/Piece', 'Billing Amount', 'PO Number', 'Invoice No', 'Inward Date'], [15, 15, 15, 25, 15, 15, 15, 15, 15, 15, 15, 20]);
	let total_amt = 0,
		i;
	for (i = 0; i < aData.length; i++) {
		total_amt += aData[i].billing_amount;
		ws1.getCell('A' + (i + 4)).value = aData[i].entryId || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].spare_code || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].spare_name || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].vendor_name || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].vendorId || "NA"; //moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].quantity || "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].remaining_quantity || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].rate_per_piece || 0;
		ws1.getCell('I' + (i + 4)).value = aData[i].billing_amount || 0;
		ws1.getCell('J' + (i + 4)).value = aData[i].po_number || "NA";
		ws1.getCell('K' + (i + 4)).value = aData[i].invoice_number || "NA";
		ws1.getCell('L' + (i + 4)).value = aData[i].created_at || "NA";
	}
	ws1.getCell('H' + (i + 4)).value = "Toatal Amount";
	ws1.getCell('I' + (i + 4)).value = total_amt;
	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'inventory', callback);
};

module.exports.generateAggrInventoryExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Aggregated Inventory Report');
	formatTitle(ws1, 10, 'Aggregated Inventory Report');
	formatColumnHeaders(ws1, 3, ['Spare Code', 'Spare Name', 'Quantity', 'Rate/Piece', 'Category Name', 'Category Code', 'UOM'], [15, 25, 15, 15, 15, 15, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i]._id || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].spare_name || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].remaining_quantity || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].rate_inc_tax || aData[i].rate_per_piece || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].category_name || "NA"; //moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].category_code || "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].uom || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'inventory', callback);
};

module.exports.generateContractorExpenseExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Contractor Report');
	formatTitle(ws1, 10, 'Contractor Report');
	formatColumnHeaders(ws1, 3, ['Vehicle Number', 'Job Id', 'Task Id', 'Task Name', 'Contractor', 'Supervisor', 'Start Time', 'End Time', 'Bill Number', 'Amount', 'Remark', 'User'], [15, 10, 10, 25, 25, 15, 15, 15, 15, 15, 15, 10]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].vehicle_number || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].jobId || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].taskId || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].task_name || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].contractor_name || "NA"; //moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].supervisor_name || "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].start_time || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].end_time || "NA";
		ws1.getCell('I' + (i + 4)).value = aData[i].bill_number || "NA";
		ws1.getCell('J' + (i + 4)).value = aData[i].amount || "NA";
		ws1.getCell('K' + (i + 4)).value = aData[i].remark || "NA";
		ws1.getCell('L' + (i + 4)).value = aData[i].created_by_employee_name || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'contractor', callback);
};

module.exports.generateJobCardExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Job Card Report');
	formatTitle(ws1, 8, 'Job Card Report');
	formatColumnHeaders(ws1, 3, ['Job No', 'Vehicle No', 'Odometer Reading', 'Last Trip No', 'Status', 'Vehicle IN Date', 'Job Card open Date', 'Type of maintenance'], [15, 15, 15, 25, 15, 25, 25, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].jobId || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].vehicle_number || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].odometer_reading || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].last_trip_number || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].status || "NA"; //moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('F' + (i + 4)).value = moment(aData[i].vehicle_in_datetime).format("DD-MM-YYYY") || "NA"; //aData[i].vehicle_in_datetime || "NA";
		ws1.getCell('G' + (i + 4)).value = moment(aData[i].created_at).format("DD-MM-YYYY") || "NA"; //aData[i].created_at || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].maintenance_type || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'job_card', callback);
};

module.exports.generateJobCardAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Job Card Report');
	formatTitle(ws1, 12, 'Job Card Report');
	let headers = ['Job No', 'Vehicle No', 'Trip No', 'Odometer Reading', 'Last Trip No', 'Status', 'Vehicle IN Date',
		'Job Card open Date', 'Type of maintenance', 'Location', 'Remark', 'Hours in yard', "Est. Release", "Actual Release"
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 25, 15, 25, 25, 25, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 12, lastAggValue);
		}
		let row = {};
		row["Job No"] = aData.data[i].jobId || "NA";
		row["Vehicle No"] = aData.data[i].vehicle_number || "NA";
		row["Odometer Reading"] = aData.data[i].odometer_reading || "NA";
		row["Last Trip No"] = aData.data[i].last_trip_number || "NA";
		row["Status"] = aData.data[i].status || "NA"; //moment(aData.data[i].allocation_date).format("DD-MM-YYYY") || "NA";
		row["Vehicle IN Date"] = moment(aData.data[i].vehicle_in_datetime).format("DD-MM-YYYY h:mm:ss a") || "NA"; //aData.data[i].vehicle_in_datetime || "NA";
		row["Job Card open Date"] = moment(aData.data[i].created_at).format("DD-MM-YYYY h:mm:ss a") || "NA"; //aData.data[i].created_at || "NA";
		row["Type of maintenance"] = aData.data[i].maintenance_type || "NA";
		row["Location"] = aData.data[i].location || "NA";
		row["Remark"] = aData.data[i].remark || "NA";
		row["Hours in yard"] = Math.round(Math.abs((aData.data[i].actual_release_date || new Date()) - aData.data[i].vehicle_in_datetime) / 36e5) || "NA";
		row["Est. Release"] = moment(aData.data[i].estimated_release_date).format("DD-MM-YYYY h:mm:ss a") || "NA";
		row["Actual Release"] = moment(aData.data[i].actual_release_date).format("DD-MM-YYYY h:mm:ss a") || "NA";
		row["Trip No"] = aData.data[i].last_trip_number || "NA";
		addWorkbookRow(row, ws1, headers, rowNum++);
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'job_card', callback);
};

module.exports.generateSpareIssueAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Consumption Report');
	formatTitle(ws1, 22, 'Consumption Report');
	let headers = ['Job No', 'Vehicle No', 'Job Type', "Slip Number", "Issue Type", "Issuer", "Mechanic", "Task Id", "Task Name", "Spare Code",
		"Spare Name", "Category Code", "Category Name", "UOM", "Flag", "Quantity", "Return Qty", "Price", "Cost",
		"EntryId", "Issued By", "Issue Date"
	];
	formatColumnHeaders(ws1, 3, headers, [8, 16, 10, 12, 10, 46, 27, 10, 32, 11, 79, 14, 20, 6, 9, 12, 10, 9, 12, 8, 15, 22]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 22, lastAggValue);
		}
		let row = {};
		row["Job No"] = aData.data[i].jobId || "NA";
		row["Vehicle No"] = aData.data[i].vehicle_number || "NA";
		row["Job Type"] = aData.data[i].job_type || "NA";
		row["Slip Number"] = aData.data[i].slip_number || "NA";
		row["Issue Type"] = aData.data[i].issue_type || "NA";
		row["Issuer"] = aData.data[i].issuer || "NA";
		row["Mechanic"] = aData.data[i].mechanic_name || "NA";
		row["Task Id"] = aData.data[i].issued_spare.taskId || "NA";
		row["Task Name"] = aData.data[i].issued_spare.task_name || "NA";
		row["Spare Code"] = aData.data[i].issued_spare.spare_code || "NA";
		row["Spare Name"] = aData.data[i].issued_spare.spare_name || "NA";
		row["Category Code"] = aData.data[i].issued_spare.category_code || "NA";
		row["Category Name"] = aData.data[i].issued_spare.category_name || "NA";
		row["UOM"] = aData.data[i].issued_spare.uom || "NA";
		row["Flag"] = aData.data[i].issued_spare.flag || "NA";
		row["Quantity"] = aData.data[i].issued_spare.quantity || "NA";
		row["Return Qty"] = aData.data[i].issued_spare.total_returned || "NA";
		//row["Return Slip"] = aData.data[i].issued_spare. || "NA";
		row["Price"] = aData.data[i].issued_spare.cost_per_piece || "NA";
		row["Cost"] = (aData.data[i].issued_spare.cost_per_piece * aData.data[i].issued_spare.quantity) || "NA";
		row["EntryId"] = aData.data[i].issued_spare.inventory_entryid || "NA";
		row["Issued By"] = aData.data[i].created_by_name || "NA";
		row["Issue Date"] = moment(aData.data[i].created_at).format("DD-MM-YYYY h:mm:ss a") || "NA";
		addWorkbookRow(row, ws1, headers, rowNum++);
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'consumption_report', callback);
};

module.exports.generateProfitabilityExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Profitability Report');
	formatTitle(ws1, 18, 'Profitability Report (' + aData[0].owner_group + ')');
	let headers = ["Vehicle No.", "Trip Qty", "Total Working", "Internal Working", "Shortage Weight", "Shortage", "diesel", "HSD/Working", "HSD Milage",
		"Bhatta", "Repairing & Other", "Driver/helper salary", "Parts/Lub Recd from BAM", "New Tyre",
		"Misc Expenses", "Man Power", "R.T.O (+)Insurance (approx)", "Recd Insurance claim amt", "Net Amount",
		"Net Amount%"];
	formatColumnHeaders(ws1, 3, headers, [9, 6.5, 11, 13, 7, 6, 11, 19, 6, 14, 15, 20, 7, 12, 9, 22, 20, 10, 11]);
	let rowNum = 4;
	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["Vehicle No."] = aData[i].vehicle_reg_no || "NA";
		row["Trip Qty"] = aData[i].tripCount || 0;
		row["Total Working"] = aData[i].totalWorking || 0;
		row["Internal Working"] = aData[i].internalWorking || 0;
		row["Shortage Weight"] = aData[i].shortageWeight;
		row["Shortage"] = aData[i].shortage;
		row["diesel"] = aData[i].diesel + aData[i].extraDiesel || 0;
		row["HSD/Working"] = parseInt((((row["diesel"]) / row["Total Working"]) * 100 || 0) * 100) / 100 + "%" || 0;
		row["HSD Milage"] = aData[i].totalrun / row["diesel"] || 0;
		row["Bhatta"] = aData[i].driverCash || 0;
		row["Repairing & Other"] = aData[i].driverCost || 0;
		row["Driver/helper salary"] = "";
		row["Parts/Lub Recd from BAM"] = "";
		row["New Tyre"] = "";
		row["Misc Expenses"] = aData[i].miscExpense || 0;
		row["Man Power"] = "";
		row["R.T.O (+)Insurance (approx)"] = aData[i].insurance || 0;
		row["Recd Insurance claim amt"] = "";
		row["Net Amount"] = row["Total Working"] - (row["Shortage"] + row["diesel"] + row["Bhatta"] + row["Misc Expenses"]);
		row["Net Amount%"] = parseInt((row["Net Amount"] / row["Total Working"] || 0) * 100) / 100 + "%";
		addWorkbookRow(row, ws1, headers, rowNum++);
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'profitability_report', callback);
};

module.exports.generateToolAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tool Report');
	formatTitle(ws1, 14, 'Tool Report');
	formatColumnHeaders(ws1, 3, ['Tool Id', 'Code', 'Spare Name', 'Vendor Name', 'PO Number', 'Invoice Number',
		'Branch Name', 'Rate', 'Rate Inc Tax', 'Manufacturer', 'Category', 'Status', 'Purchase Category', 'Purchase Date'
	], [15, 15, 15, 25, 10, 10, 12, 7, 7, 15, 10, 8, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 14, lastAggValue);
		}
		ws1.getCell('A' + rowNum).value = aData.data[i].toolId || "NA";
		ws1.getCell('B' + rowNum).value = aData.data[i].code || "NA";
		ws1.getCell('C' + rowNum).value = aData.data[i].spare_name || "NA";
		ws1.getCell('D' + rowNum).value = aData.data[i].vendor_name || "NA";
		ws1.getCell('E' + rowNum).value = aData.data[i].po_number || "NA";
		ws1.getCell('F' + rowNum).value = aData.data[i].invoice_number || "NA";
		ws1.getCell('G' + rowNum).value = aData.data[i].branchName || "NA";
		ws1.getCell('H' + rowNum).value = aData.data[i].rate || "NA";
		ws1.getCell('I' + rowNum).value = aData.data[i].rate_inc_tax || "NA";
		ws1.getCell('J' + rowNum).value = aData.data[i].manufacturer || "NA";
		ws1.getCell('K' + rowNum).value = aData.data[i].category || "NA";
		ws1.getCell('L' + rowNum).value = aData.data[i].status || "NA";
		ws1.getCell('M' + rowNum).value = aData.data[i].purchase_category || "NA";
		ws1.getCell('N' + rowNum).value = moment(aData.data[i].created_at).format("DD-MM-YYYY") || "NA";
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'tool', callback);
};

module.exports.generateToolIssueAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tool Issue Report');
	formatTitle(ws1, 13, 'Tool Issue Report');
	let headers = ['Tool Id', 'Tool Code', 'Tool Name', 'Rate', 'issuer_type', 'issue_to_employee_name', 'issue_status',
		'vehicle_number', 'issue_slip_number', 'return_by_type', 'return_by_employee_name', 'return_slip_number',
		'return_status', 'return_date', 'Issue Date'
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 25, 10, 10, 12, 7, 7, 15, 10, 8, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 13, lastAggValue);
		}
		let row = {};
		row['Tool Id'] = aData.data[i].toolId || "NA";
		row['Tool Code'] = aData.data[i].tool_code || "NA";
		row['Tool Name'] = aData.data[i].tool_id.spare_name || "NA";
		row['Rate'] = aData.data[i].rate || 0;
		row['issuer_type'] = aData.data[i].issuer_type || "NA";
		row['issue_to_employee_name'] = aData.data[i].issue_to_employee_name || "NA";
		row['issue_status'] = aData.data[i].issue_status || "NA";
		row['vehicle_number'] = aData.data[i].vehicle_number || "NA";
		row['issue_slip_number'] = aData.data[i].issue_slip_number || "NA";
		row['return_by_type'] = aData.data[i].return_by_type || "NA";
		row['return_by_employee_name'] = aData.data[i].return_by_employee_name || "NA";
		row['return_slip_number'] = aData.data[i].return_slip_number || "NA";
		row['return_status'] = aData.data[i].return_date || "NA";
		row['return_date'] = moment(aData.data[i].return_date).format("DD-MM-YYYY") || "NA";
		row['Issue Date'] = moment(aData.data[i].created_at).format("DD-MM-YYYY") || "NA";
		addWorkbookRow(row, ws1, headers, rowNum++);
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'tool_issue', callback);
};

module.exports.generateTyreIssueAggExcel = function (aData, clientId, callback) {
	var workbook = new Excel.Workbook();
	var ws1 = workbook.addWorksheet('Tool Issue Report');
	formatTitle(ws1, 21, 'Tool Issue Report');
	var header = ["Tyre Number", "Purchased Date", "Vendor Name", "Manufacturer Name", "Model",
		"Category", "Cost", "Expected Mileage", "Vehicle No", "On Date", "Out Date", "Run Days",
		"On Km", "Out Km", "Run Km", "Total Run Km as On Date", "Current Position",
		"Remarks While Removing", "JobId", "Issue By", "Returned By"];
	formatColumnHeaders(ws1, 3, header, [12, 12.5, 28, 16, 10, 8, 9, 14, 13, 9, 9, 12, 7, 7, 7, 20, 13, 20, 7, 11, 11]);
	var rowNum = 4;
	var lastAggValue = "";
	var agg = aData.aggregateBy;
	for (var i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue == "" || lastAggValue != aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 21, lastAggValue);
		}
		var row = {};
		row["Tyre Number"] = aData.data[i].tyre_number || "NA";
		row["Purchased Date"] = aData.data[i].tyre_id.invoice_date || "NA";
		row["Vendor Name"] = aData.data[i].tyre_id.vendor_name || "NA";
		row["Manufacturer Name"] = aData.data[i].tyre_id.manufacturer || "NA";
		row["Model"] = aData.data[i].tyre_id.model || "NA";
		row["Category"] = aData.data[i].issue_category || "NA";
		row["Cost"] = aData.data[i].amount || 0;
		row["Expected Mileage"] = aData.data[i].tyre_id.mileage || 0;
		row["Vehicle No"] = aData.data[i].vehicle_no || "NA";
		row["On Date"] = moment(aData.data[i].created_at).format("DD-MM-YYYY") || "NA";
		row["Out Date"] = aData.data[i].return_date ? moment(aData.data[i].return_date).format("DD-MM-YYYY") : "NA";
		row["Run Days"] = aData.data[i].created_at ? aData.data[i].return_date ? parseInt((aData.data[i].return_date - aData.data[i].created_at) / (1000 * 60 * 60 * 24)) : parseInt((Date.now() - aData.data[i].created_at) / (1000 * 60 * 60 * 24)) : "";
		row["On Km"] = aData.data[i].issued_odometer || "";
		row["Out Km"] = aData.data[i].returned_odometer || "";
		row["Run Km"] = aData.data[i].issued_odometer && aData.data[i].returned_odometer ? row["Out Km"] - row["On Km"] : "";
		row["Total Run Km as On Date"] = aData.data[i].tyre_id.total_run || 0;
		row["Current Position"] = aData.data[i].association_position || "NA";
		row["Remarks While Removing"] = aData.data[i].tyre_return_quality_remark || "NA";
		row["JobId"] = aData.data[i].jobId || "NA";
		row["Issue By"] = aData.data[i].issued_by_employee_name || "NA";
		row["Returned By"] = aData.data[i].returned_by_employee_name || "NA";
		addWorkbookRow(row, ws1, header, rowNum++, false);

	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'tyre_issue', callback);
};

module.exports.generateTyreIssueSummaryExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tool Issue Summary Report');
	formatTitle(ws1, 4, 'Tool Issue Summary Report');
	let header = ['Sl No', 'Aggregator', 'No of Tyre', 'Cost'];
	formatColumnHeaders(ws1, 3, header, [10, 15, 15, 20]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row['Sl No'] = i + 1 || "NA";
		row['Aggregator'] = aData.data[i]._id || "NA";
		row['No of Tyre'] = aData.data[i].no_of_tyre || "NA";
		row['Cost'] = aData.data[i].cost || "NA";

		addWorkbookRow(row, ws1, header, i + 4, false);

	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'tyre_issue', callback);
};

module.exports.generateTyreSummaryExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tool Issue Summary Report');
	formatTitle(ws1, 4, 'Tool Issue Summary Report');
	let header = ['Sl No', 'Aggregator', 'No of Tyre', 'Total Cost', 'Total KM', 'Avg Run Per Km'];
	formatColumnHeaders(ws1, 3, header, [10, 15, 15, 20]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row['Sl No'] = i + 1 || "NA";
		row['Aggregator'] = aData.data[i]._id || "NA";
		row['No of Tyre'] = aData.data[i].no_of_tyre || "NA";
		row['Total Cost'] = aData.data[i].cost || "NA";
		row['Total KM'] = aData.data[i].total_km || "NA";
		row['Avg Run Per Km'] = aData.data[i].avg_run_per_tyre || "NA";
		addWorkbookRow(row, ws1, header, i + 4, false);
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'tyre_issue', callback);
};
///Po excel is incomplete
module.exports.generatePoAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('PO Report');
	formatTitle(ws1, 16, 'PO Report');
	formatColumnHeaders(ws1, 3, ['jobId', 'taskId', 'tyre_number', 'tyre_last_status', 'isReturned',
		'issue_slip_number', 'return_slip_number', 'issued_by_employee_name', 'user_type', 'returned_by_employee_name',
		'tyre_return_quality_remark', 'issued_odometer', 'returned_odometer', 'vehicle_no', 'return_date', 'Issue Date'
	], [15, 15, 15, 25, 10, 10, 12, 7, 7, 15, 10, 8, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 16, lastAggValue);
		}
		ws1.getCell('A' + rowNum).value = aData.data[i].jobId || "NA";
		ws1.getCell('B' + rowNum).value = aData.data[i].taskId || "NA";
		ws1.getCell('C' + rowNum).value = aData.data[i].tyre_number || "NA";
		ws1.getCell('D' + rowNum).value = aData.data[i].tyre_last_status || "NA";
		ws1.getCell('E' + rowNum).value = aData.data[i].isReturned || "NA";
		ws1.getCell('F' + rowNum).value = aData.data[i].issue_slip_number || "NA";
		ws1.getCell('G' + rowNum).value = aData.data[i].return_slip_number || "NA";
		ws1.getCell('H' + rowNum).value = aData.data[i].issued_by_employee_name || "NA";
		ws1.getCell('I' + rowNum).value = aData.data[i].user_type || "NA";
		ws1.getCell('J' + rowNum).value = aData.data[i].returned_by_employee_name || "NA";
		ws1.getCell('K' + rowNum).value = aData.data[i].tyre_return_quality_remark || "NA";
		ws1.getCell('L' + rowNum).value = aData.data[i].tyre_return_quality_remark || "NA";
		ws1.getCell('M' + rowNum).value = aData.data[i].returned_odometer || "NA";
		ws1.getCell('N' + rowNum).value = aData.data[i].vehicle_no || "NA";
		ws1.getCell('O' + rowNum).value = moment(aData.data[i].return_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('P' + rowNum).value = moment(aData.data[i].created_at).format("DD-MM-YYYY") || "NA";
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'PO', callback);
};
module.exports.generatePoExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('PO Report');
	formatTitle(ws1, 7, 'PO Report');
	formatColumnHeaders(ws1, 3, ['PO No', 'Vendor', 'Status', 'Date', 'Created By', 'Approved By', 'Total'], [15, 15, 15, 15, 15, 15, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].ponumder || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].vendor_name || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].status || "NA";
		ws1.getCell('D' + (i + 4)).value = moment(aData[i].created_at).format("DD-MM-YYYY") || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].created_by_name || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].approver ? (aData[i].approver.name || "NA") : "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].total || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'po', callback);
};
/*module.exports.generateTyreExcel = function(aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tyre Report');
	formatTitle(ws1, 13, 'Tyre Report');
	formatColumnHeaders(ws1, 3, ['Tyre Number','Tyre Category','Status','Vendor','Purchase Date','Price','Vehicle No','Association Date','Manufacturer','Total Run','Mileage','Modal','Retreated Count'],
	 [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + rowNum).value = aData[i].tyre_number || "NA";
		ws1.getCell('B' + rowNum).value = aData[i].tyre_category || "NA";
		ws1.getCell('C' + rowNum).value = aData[i].status || "NA";
		ws1.getCell('D' + rowNum).value = aData[i].vendor_name || "NA";
		ws1.getCell('E' + rowNum).value = (aData[i].created_at ? moment(aData[i].created_at).format("DD-MM-YYYY") :"NA");
		ws1.getCell('F' + rowNum).value = aData[i].price || "NA";
		ws1.getCell('G' + rowNum).value = aData[i].vehicle_no || "NA";
		ws1.getCell('H' + rowNum).value = (aData[i].association_date ? moment(aData[i].association_date).format("DD-MM-YYYY") :"NA");
		ws1.getCell('I' + rowNum).value = aData[i].manufacturer || "NA";
		ws1.getCell('J' + rowNum).value = aData[i].total_run || "NA";
		ws1.getCell('K' + rowNum).value = aData[i].mileage || "NA";
		ws1.getCell('L' + rowNum).value = aData[i].model || "NA";
		ws1.getCell('M' + rowNum).value = aData[i].retread_count || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'tyre', callback);
};*/
module.exports.generateBookingExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Booking Report');
	let mergeCl = 15;
	formatTitle(ws1, mergeCl, 'Booking Report');
	let headers = ['Booking No', 'BOOKING DATE', 'BRANCH NAME', 'CUSTOMER NAME', 'ROUTE NAME', 'BILLING PARTY NAME', 'MATERIAL TYPE', 'MATERIAL NAME', 'BOOKING TYPE', 'SHIPPING LINE', 'CONTAINER NO', 'RATE', 'WEIGHT', 'FREIGHT', 'BOOKING PERSON'];
	formatColumnHeaders(ws1, 3, headers, [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (aData.data[i].container.length > 0) {
			aData.data[i].container = JSON.stringify(aData.data[i].container)
		}
		if (agg !== null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			if (agg === "customer" && aData.data[i]["customer"] && aData.data[i]["customer"]["name"]) {
				if ((lastAggValue === "" || lastAggValue !== aData.data[i]["customer"]["name"])) {
					lastAggValue = aData.data[i]["customer"]["name"];
					mergeCells(ws1, rowNum++, mergeCl, lastAggValue);
				}
			} else if (agg === "booking_date") {
				if ((lastAggValue === "" || lastAggValue !== new Date(aData.data[i][agg]).toDateString())) {
					lastAggValue = new Date(aData.data[i][agg]).toDateString();
					mergeCells(ws1, rowNum++, mergeCl, lastAggValue);
				}
			} else if (agg === "branch_id" && aData.data[i]["branch_id"] && aData.data[i]["branch_id"]["name"]) {
				if ((lastAggValue === "" || lastAggValue !== aData.data[i]["branch_id"]["name"])) {
					lastAggValue = aData.data[i]["branch_id"]["name"];
					mergeCells(ws1, rowNum++, mergeCl, lastAggValue);
				}
			} else {
				if ((lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
					lastAggValue = aData.data[i][agg];
				}
			}
		}
		let totalWeight = parseInt(aData.data[i].rate) * parseInt(aData.data[i].total_weight);
		let row = {};
		row['BOOKING DATE'] = aData.data[i].booking_date || "NA";
		row['BRANCH NAME'] = aData.data[i].branch_id && aData.data[i].branch_id.name || "NA";
		row['CUSTOMER NAME'] = aData.data[i].customer && aData.data[i].customer.name ? aData.data[i].customer.name : "NA";
		row['ROUTE NAME'] = aData.data[i].route && aData.data[i].route.name ? aData.data[i].route.name : 'NA';
		row['BILLING PARTY NAME'] = aData.data[i].billing_party && aData.data[i].billing_party.name ? aData.data[i].billing_party.name : 'NA';
		row['MATERIAL TYPE'] = aData.data[i].material_type.name || "NA";
		row['MATERIAL NAME'] = aData.data[i].material_type.name || "NA";
		row['BOOKING TYPE'] = aData.data[i].booking_type || "NA";
		row['SHIPPING LINE'] = aData.data[i].shipping_line && aData.data[i].shipping_line.name ? aData.data[i].shipping_line.name : "NA";
		row['CONTAINER NO'] = aData.data[i].container || "NA";
		row['RATE'] = aData.data[i].rate || "NA";
		row['WEIGHT'] = aData.data[i].total_weight || "NA";
		row['FREIGHT'] = totalWeight || "NA";
		row['BOOKING PERSON'] = "NA";
		row['Booking No'] = aData.data[i].booking_no || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'booking', callback);
};

function aggregateExpenses(aExpenses) {
	let response = {litre: 0, extra_litre: 0};
	for (let e of aExpenses) {
		response[e.type] = response[e.type] || 0;
		response[e.type] += e.amount;
		if (e.paidToVendor === true) {
			response.vNet = response.vNet || 0;
			response.vNet += e.amount;
		}
		if (e.type === "Diesel")
			response.litre += (e.diesel_info && e.diesel_info.litre || 0);
		if (e.type === "Extra Diesel")
			response.extra_litre += (e.diesel_info && e.diesel_info.litre || 0);
	}
	return response;
}

let setRate = function (obj) {
	if (obj.rate)
		return;

	switch (obj.booking.payment_basis) {
		case "PMT":
			obj.rate = obj.rateObj.rate && obj.rateObj.rate.price_per_mt || 0;
			obj.totalWorking = obj.weight * obj.rate;
			break;

		case "PUnit":
			obj.rate = obj.rateObj.rate && obj.rateObj.rate.price_per_unit || 0;
			obj.totalWorking = obj.unit * obj.rate;
			break;

		case "Fixed":
			obj.rate = obj.rateObj.rate && obj.rateObj.rate.vehicle_rate || 0;
			obj.totalWorking = obj.rate;
			break;

		case "Fixed per Trip/Fixed per Booking":
			obj.rate = obj.rateObj.rate && obj.rateObj.rate.price_per_trip || 0;
			obj.totalWorking = obj.rate;
			break;
	}
};
module.exports.generateGrExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GR Report');
	let headers = ["BRANCH NAME", "GR NO.", "GR TYPE", "GR DATE", "TRIP NO.", "VEHICLE", "BOOKING NO", "BOOKING TYPE", "CONTRACT", "BILLING PARTY",
		"CUSTOMER NAME", "CONSIGNOR", "CONSIGNEE", "ROUTE NAME", "MATERIAL GROUP", "MATERIAL NAME", "WEIGHT", "GR RECEIVING DATE", "GR ACKNOWLEDGE DATE",
		"BILL NO", "BILL DATE", "AMOUNT", "ADVANCE", "TAX", "TOLL",/* "LOADING WEIGHT", "UNLOADING WEIGHT" */
		"DRIVER NAME", "DRIVER CASH(FIXED)", "DRIVER CASH(TAKEN)", "DIESEL (FIXED)", "DIESEL (TAKEN)", "DIESEL (EXTRA)", "DIESEL",
		/*"DIESEL RATES", "DIESEL(RS)",*/ "LOADING CHARGES", "UNLOADING CHARGES", "PENALTY CHARGES",
		"OTHER CHARGES", "FREIGHT(RS)", "Internal Rate(RS)", "VENDOR NAME", "VENDOR Payment Type", "VENDOR Advance(Deal)", "VENDOR Balance(Deal)",
		"VENDOR Penalty", "VENDOR Damage", "VENDOR Detention", "VENDOR Challan", "VENDOR TOTAL", "VENDOR PAID", "VENDOR BALANCE(Remaining)", "TOTAL VENDOR BALANCE"
		, "PENDING REMARK"
	];
	formatTitle(ws1, headers.length, 'GR Report');
	formatColumnHeaders(ws1, 3, headers, [12, 12, 12, 12, 7, 11, 11, 18, 9, 30, 30, 30, 30, 30, 15, 14, 7, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	try{
		for (let i = 0; i < aData.data.length; i++) {
			if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
				lastAggValue = aData.data[i][agg];
				mergeCells(ws1, rowNum++, headers.length, lastAggValue);
			}
			let pendingRemark = aData.data[i].pendingRemark.map(function (remark) {
				return (remark.systemDate ? "Remark added on " + moment(remark.systemDate).format("DD-MM-YYYY") + " " : "") + remark.remark + " because " + remark.reason + " at " + remark.place +
					(remark.expected_arrival ? " & expected arrival is " + moment(remark.expected_arrival).format("DD-MM-YYYY") : "");
			});
			if (aData.data[i].booking && aData.data[i].booking.routeData) {
				aData.data[i].rateObj = aData.data[i].booking.routeData.data.find(vObj => ((vObj.vehicle_type_id === aData.data[i].trip.vehicle.veh_type._id.toString()) && (vObj.booking_type === aData.data[i].booking.booking_type))) || {};
				setRate(aData.data[i]);
			}
			let row = {};
			// row['LOADING WEIGHT'] = aData.data[i].l_net_w;
			// row['UNLOADING WEIGHT'] = aData.data[i].ul_net_w;
			row["GR NO."] = aData.data[i].grNumber || "NA";
			row["GR TYPE"] = aData.data[i].gr_type || "NA";
			row["GR DATE"] = (aData.data[i].grDate ? moment(aData.data[i].grDate).format("DD-MM-YYYY") : "NA");
			row["TRIP NO."] = (aData.data[i].tripNo || "NA");
			row["VEHICLE"] = (aData.data[i].vehicleNo || "NA");
			row["BOOKING NO"] = aData.data[i].bookingNo || "NA";
			row["BOOKING TYPE"] = aData.data[i].bookingType || "NA";
			row["CONTRACT"] = aData.data[i].bookingContactIdName || "NA";
			row["BRANCH NAME"] = aData.data[i].branchName || "NA";
			row["BILLING PARTY"] = aData.data[i].billingParty || "NA";
			row["CUSTOMER NAME"] = aData.data[i].customer || "NA";
			row["CONSIGNOR"] = aData.data[i].consignor || "NA";
			row["CONSIGNEE"] = aData.data[i].consignee || "NA";
			row["ROUTE NAME"] = aData.data[i].rName || "NA";
			row["MATERIAL GROUP"] = aData.data[i].invoices && aData.data[i].invoices[0] && aData.data[i].invoices[0].material && aData.data[i].invoices[0].material.groupCode  || "NA";
			row["MATERIAL NAME"] = aData.data[i].invoices && aData.data[i].invoices[0] && aData.data[i].invoices[0].material && aData.data[i].invoices[0].material.groupName || "NA";
			row["WEIGHT"] = aData.data[i].weight || "NA";

			row["GR RECEIVING DATE"] = aData.data[i].pod && moment(aData.data[i].pod.date).format("DD-MM-YYYY") || "NA";
			row["GR ACKNOWLEDGE DATE"] = aData.data[i].acknowledge && moment(aData.data[i].acknowledge.systemDate).format("DD-MM-YYYY") || "NA";

			row["PENDING REMARK"] = pendingRemark.join(' next ');
			row["BILL NO"] = aData.data[i].billNo && aData.data[i].billNo || "NA";
			row["BILL DATE"] = aData.data[i].billDate ? moment(aData.data[i].billDate).format("DD-MM-YYYY") : "NA";
			//row["ADVANCE"] = aData.data[i].bill ? addInArrayOnKey(aData.data[i].bill.items, 'charges.advance') || 0 : 0;
			row["ADVANCE"] = (aData.data[i] && aData.data[i].charges && aData.data[i].charges.advance) || 0;
			row["AMOUNT"] = aData.data[i].totalAmount  + row["ADVANCE"] || 0;
			row["TAX"] = (aData.data[i].cGST || 0) + (aData.data[i].sGST || 0) + (aData.data[i].iGST || 0) || 0;
			row["VENDOR TOTAL"] = aData.data[i].vendorDeal ? (aData.data[i].vendorDeal.total_expense || 0) : 0;
			let expense = aData.data[i].trip_expenses ? aggregateExpenses(aData.data[i].trip_expenses) : {};
			//diesel_fixed =aData.data[i].rateObj.allot.diesel;

			row["DRIVER CASH(FIXED)"] = (aData.data[i].rateObj && aData.data[i].rateObj.allot && aData.data[i].rateObj.allot.cash) ? aData.data[i].rateObj.allot.cash : 0;
			row["DRIVER CASH(TAKEN)"] = expense ? (expense['Driver Cash'] || 0) : 0;


			row["DIESEL (FIXED)"] = (aData.data[i].rateObj && aData.data[i].rateObj.allot && aData.data[i].rateObj.allot.diesel) ? aData.data[i].rateObj.allot.diesel : 0;
			//row["DIESEL (TAKEN)"]= (expense && expense.litre)?expense.litre:0;.
			row["DIESEL (TAKEN)"] = (expense && expense.litre + expense.extra_litre) || 0;
			//row["DIESEL (TAKEN)"]= expense ? (expense['Diesel']||0) :0;
			row["DIESEL (EXTRA)"] = (expense && expense.extra_litre) ? expense.extra_litre : 0;
			row["DIESEL"] = (expense && expense['Diesel'] + expense['Extra Diesel']) || 0;
			row["TOLL"] = expense ? (expense['Toll Tax'] || 0) : 0;

			row["DRIVER NAME"] = aData.data[i].driver ||  "NA";


			//(aData.data[i].booking && aData.data[i].booking.contract_id.)
			row["LOADING CHARGES"] = (aData.data[i].charges && aData.data[i].charges.loading_charges) ? aData.data[i].charges.loading_charges : 0;
			row["UNLOADING CHARGES"] = (aData.data[i].charges && aData.data[i].charges.unloading_charges) ? aData.data[i].charges.unloading_charges : 0;
			row["PENALTY CHARGES"] = (aData.data[i].charges && aData.data[i].charges.penalty) ? aData.data[i].charges.penalty : 0;
			row["OTHER CHARGES"] = (aData.data[i].charges && aData.data[i].charges.other_charges) ? aData.data[i].charges.other_charges : 0;
			row["FREIGHT(RS)"] = parseFloat((aData.data[i].totalWorking || 0)).toFixed(2);
			row["Internal Rate(RS)"] = (aData.data[i].internal_rate) ? ((aData.data[i].internal_rate || 0) * (row["WEIGHT"] || 0)) : 0;
			row["VENDOR NAME"] = aData.data[i].vendor ||  "NA";

			row["VENDOR Payment Type"] = aData.data[i].vendorDeal ? (aData.data[i].vendorDeal.payment_type || "NA") : "NA" ;
			row["VENDOR Balance(Deal)"] = aData.data[i].vendorDeal ? (aData.data[i].vendorDeal.toPay || 0) : 0;
			row["VENDOR Advance(Deal)"] = aData.data[i].vendorDeal ? (aData.data[i].vendorDeal.advance || 0) : 0;

			//row["VENDOR Bal."]= aData.data[i].charges.unloading_charges;
			row["VENDOR PAID"] = expense && expense.vNet ? expense.vNet : 0;
			row["VENDOR BALANCE(Remaining)"] = (row["VENDOR TOTAL"] || 0) - (row["VENDOR PAID"] || 0);
			row["VENDOR Penalty"] = expense && expense.vPenalty ? expense.vPenalty : 0;
			row["VENDOR Damage"] = expense && expense.vDamage ? expense.vDamage : 0;
			row["VENDOR Detention"] = expense ? (expense['vDetention'] || 0) : 0;
			row["VENDOR Challan"] = expense ? (expense['vChalan'] || 0) : 0;

			row["Total Vendor Balance"] = (row["VENDOR TOTAL"] || 0) - (row["VENDOR PAID"] || 0);
			//row["TOLL"]= expense ? (expense['Toll Tax']||0) :0;
			//row["TOLL"]= expense ? (expense['Toll Tax']||0) :0;
			//row["TOLL"]= expense ? (expense['Toll Tax']||0) :0;
			//row["TOLL"]= expense ? (expense['Toll Tax']||0) :0;
			addWorkbookRow(row, ws1, headers, (rowNum++));
		}
	}catch (e) {
		throw e;
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'gr', callback);
};

module.exports.generateAccountVoucherExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Account Voucher Report');
	formatTitle(ws1, 49, 'Account Voucher Report');
	let headers = ["DATE", "VOUCHER ID", "FROM", "TO", "TYPE", "AMOUNT", "REF NO", "NARRATION", "CREATED BY"];
	formatColumnHeaders(ws1, 3, headers, [20, 20, 20, 20, 20, 20, 20, 20, 20]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 28, lastAggValue);
		}
		let row = {};
		row["DATE"] = aData.data[i].created_at || "NA";
		row["VOUCHER ID"] = aData.data[i].voucherId || "NA";
		row["FROM"] = (aData.data[i].from && aData.data[i].from.name) || "NA";
		row["TO"] = (aData.data[i].to && aData.data[i].to.name) || "NA";
		row["TYPE"] = aData.data[i].type || "NA";
		row["AMOUNT"] = aData.data[i].amount || "NA";
		row["REF NO"] = aData.data[i].refNo || "NA";
		row["NARRATION"] = aData.data[i].narration || "NA";
		row["CREATED BY"] = aData.data[i].created_by.full_name || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy, 'accountVoucher', callback);
};


module.exports.profitGrExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GR wise Profit Report');
	formatTitle(ws1, 28, 'GR wise Profit Report');
	let headers = ["S. NO.", "GR DATE", "TRUCK NO.", "LR/GR NO.", "ROUTE NAME", "DISTANCE", "TRANSIT TIME", "EXP. DATE OF DELIVERY", "CONSIGNOR", "CONSIGNOR CST/TIN", "CONSIGNEE", "CONSIGNEE CST/TIN", "CONTAINER NO.", "ACTUAL TOTAL WEIGHT(MT) ON VEHICLE", "WEIGHT CHARGE FOR BILLING", "FIX RATE", "BILLING AMOUNT", "LORRY HIRE", "ANY OTHER CHARGES", "TOTAL HIRE CHARGES", "ADVANCE", "BALANCE", "MARGIN", "MARGIN %", "MATERIAL", "INVOICE NO.", "BILLING PARTY", "BILLING OFFICE", "BROKER NAME", "VEHICLE OWNER NAME", "VEHICLE OWNER PAN NO.", "CONTRACT NAME"];
	formatColumnHeaders(ws1, 3, headers, [12, 6, 7, 9, 7, 11, 11, 18, 9, 30, 30, 30, 30, 15, 14, 7, 20]);
	let rowNum = 4;
	// let lastAggValue = "";
	// let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		/*if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 28, lastAggValue);
		}
		let pendingRemark = aData.data[i].pendingRemark.map(function (remark) {
			return (remark.systemDate? "Remark added on "+moment(remark.systemDate).format("DD-MM-YYYY")+" ":"")+remark.remark+" because "+remark.reason+" at "+remark.place+
				(remark.expected_arrival?" & expected arrival is " +moment(remark.expected_arrival).format("DD-MM-YYYY"):"");
		});*/
		let row = {};
		row['S. NO.'] = i + 1;
		row["GR DATE"] = (aData.data[i].grDate ? moment(aData.data[i].grDate).format("DD-MM-YYYY") : "NA");
		row["TRUCK NO."] = (aData.data[i].trip.vehicle_no ? aData.data[i].trip.vehicle_no : "NA");
		row["LR/GR NO."] = (aData.data[i].grNumber ? aData.data[i].grNumber : "NA");
		row["ROUTE NAME"] = aData.data[i].trip.route_name ? aData.data[i].trip.route_name : "NA";
		row["DISTANCE"] = aData.data[i].trip.route.route_distance ? aData.data[i].trip.route.route_distance : "NA";
		if (aData.data[i].trip.route.route_time) {
			let {
				up_time,
				down_time
			} = aData.data[i].trip.route.route_time.find(curr => curr.vehicle_type_id === aData.data[i].trip.vehicle.veh_type._id);
			row["TRANSIT TIME"] = `${up_time.days + down_time.days} days ${up_time.hours + down_time.hours} hours`;
			row["EXP. DATE OF DELIVERY"] = moment(aData.data[i].grDate).add({
				days: up_time.days + down_time.days,
				hours: up_time.hours + down_time.hours
			}).format("DD-MM-YYYY");
		} else {
			row["TRANSIT TIME"] = 'NA';
			row["EXP. DATE OF DELIVERY"] = 'NA';
		}
		row["CONSIGNOR"] = aData.data[i].booking.consigner.name ? aData.data[i].booking.consigner.name : 'NA';
		row["CONSIGNOR CST/TIN"] = aData.data[i].booking.consigner.tin_no ? aData.data[i].booking.consigner.tin_no : 'NA';
		row["CONSIGNEE"] = aData.data[i].booking.consignee.name ? aData.data[i].booking.consignee.name : 'NA';
		row["CONSIGNEE CST/TIN"] = aData.data[i].booking.consignee.tin_no ? aData.data[i].booking.consignee.tin_no : 'NA';
		row["CONTAINER NO."] = aData.data[i].booking.container ? aData.data[i].booking.container.map(curr => `${curr.number} (Size: ${curr.length})`).join(', ') : 'NA';
		row["ACTUAL TOTAL WEIGHT(MT) ON VEHICLE"] = aData.data[i].weight || 'NA';
		if (aData.data[i].booking && aData.data[i].booking.routeData && aData.data[i].booking.routeData.data) {
			let contractRates = aData.data[i].booking.routeData.data.find(curr => curr.vehicle_type === aData.data[i].trip.vehicle.veh_type.name && curr.booking_type === aData.data[i].booking.booking_type);
			if (contractRates.rate.min_payable_mt > aData.data[i].weight) {
				row["WEIGHT CHARGE FOR BILLING"] = contractRates.rate.min_payable_mt;
			} else {
				row["WEIGHT CHARGE FOR BILLING"] = aData.data[i].weight;
			}
		} else {
			row["WEIGHT CHARGE FOR BILLING"] = aData.data[i].weight;
		}
		row["FIX RATE"] = aData.data[i].internal_rate || 'NA';
		let extra_charges;
		if (aData.data[i].bill && aData.data[i].bill.items) {
			extra_charges = addInArrayOnKey(aData.data[i].bill.items, 'charges.advance');
		} else if (aData.data[i].provisionalBill && aData.data[i].provisionalBill.items) {
			extra_charges = addInArrayOnKey(aData.data[i].provisionalBill.items, 'charges.advance');
		}
		let bill_amt = ((aData.data[i].bill && aData.data[i].bill.totalAmount) || (aData.data[i].provisionalBill && aData.data[i].provisionalBill.totalAmount)) + extra_charges || 0;
		row['BILLING AMOUNT'] = bill_amt;
		row["PER MT RATE"] = (aData.data[i].booking && aData.data[i].booking.routeData && aData.data[i].booking.routeData.data && aData.data[i].booking.routeData.data.find(curr => curr.vehicle_type === aData.data[i].trip.vehicle.veh_type.name).rate.price_per_mt) || 'NA';
		row["ANY OTHER CHARGES"] = (aData.data[i].charges && aData.data[i].charges.other_charges) || 'NA';
		let tot_hire_charg = (aData.data[i].trip && aData.data[i].trip.vendorDeal && aData.data[i].trip.vendorDeal.total_expense) || 0;
		row['TOTAL HIRE CHARGES'] = tot_hire_charg;
		row['ADVANCE'] = (aData.data[i].trip && aData.data[i].trip.vendorDeal && aData.data[i].trip.vendorDeal.advance) || 'NA';
		row['MUNSHIYANA'] = (aData.data[i].trip && aData.data[i].trip.vendorDeal && aData.data[i].trip.vendorDeal.munshiyana) || 'NA';
		row['BALANCE'] = (aData.data[i].trip && aData.data[i].trip.vendorDeal && aData.data[i].trip.vendorDeal.toPay) || 'NA';
		row['MARGIN'] = bill_amt - tot_hire_charg;
		row["MARGIN %"] = (bill_amt - tot_hire_charg) / bill_amt * 100;
		row['MATERIAL'] = (aData.data[i].booking && aData.data[i].booking.material_type && aData.data[i].booking.material_type.name) || 'NA';
		row['INVOICE NO.'] = aData.data[i].invoiceNumber || 'NA';
		row['BILLING PARTY'] = (aData.data[i].booking && aData.data[i].booking.billing_party.name) || 'NA';
		row['BILLING OFFICE'] = (aData.data[i].booking && aData.data[i].booking.billing_party && formAddress(aData.data[i].booking.billing_party.address)) || 'NA';
		row['BROKER NAME'] = (aData.data[i].trip && aData.data[i].trip.vendor && aData.data[i].trip.vendor.contact_person_name) || 'NA';
		row["VEHICLE OWNER NAME"] = (aData.data[i].trip && aData.data[i].trip.vendor && aData.data[i].trip.vendor.name) || 'NA';
		row["VEHICLE OWNER PAN NO."] = (aData.data[i].trip && aData.data[i].trip.vendor && aData.data[i].trip.vendor.pan_no) || 'NA';
		row["CONTRACT NAME"] = aData.data[i].booking.contract_id.name || 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'gr', callback);
};

function formAddress(addr) {
	var str = '';
	if (addr.line1) str += addr.line1 + ', ';
	if (addr.line2) str += addr.line2 + ', ';
	if (addr.city) str += addr.city + ', ';
	if (addr.state) str += addr.state + ' ';
	if (addr.pincode) str += addr.pincode + ', ';
	if (addr.country) str += addr.country;
	return str;
}

let addInArrayOnKey = (aData, key) => {
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
};

module.exports.generateBillExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Bill Report');
	formatTitle(ws1, 13, 'Bill Report');
	let headers = ["Bill No", "Actual Bill No", "Bill Date", "Billing Party", "Total", "Advance", "Balance", "Status", "Dispacth Date", "Due Date",
		"Bill Generated By", "Bill Generation Date", "Remarks"];
	formatColumnHeaders(ws1, 9, headers, [6, 11, 9, 35, 7, 7, 7, 8, 11, 9, 15, 16, 80]);
	let rowNum = 10;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg === "billingParty" && aData.data[i]["billingParty"] && aData.data[i]["billingParty"]["name"]) {
			if ((lastAggValue === "" || lastAggValue !== aData.data[i]["billingParty"]["name"])) {
				lastAggValue = aData.data[i]["billingParty"]["name"];
				mergeCells(ws1, rowNum++, 13, lastAggValue);
			}
		} else if (agg === "billDate" || (agg === "dueDate" && aData.data[i][agg])) {
			if ((lastAggValue === "" || lastAggValue !== new Date(aData.data[i][agg]).toDateString())) {
				lastAggValue = new Date(aData.data[i][agg]).toDateString();
				mergeCells(ws1, rowNum++, 13, lastAggValue);
			}
		} else {
			if ((lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
				lastAggValue = aData.data[i][agg];
				mergeCells(ws1, rowNum++, 13, lastAggValue);
			}

		}
		let row = {};
		row["Bill No"] = aData.data[i].billNo || "NA";
		row["Actual Bill No"] = aData.data[i].actualBillNo || "NA";
		row["Bill Date"] = aData.data[i].billDate ? moment(aData.data[i].billDate).format("DD-MM-YYYY") : "NA";
		row["Billing Party"] = aData.data[i].billingParty ? aData.data[i].billingParty.name : "NA";
		row["Advance"] = addInArrayOnKey(aData.data[i].items, 'charges.advance') || 0;
		row["Total"] = aData.data[i].totalAmount + row["Advance"];
		row["Balance"] = aData.data[i].totalAmount;
		row["Status"] = aData.data[i].status || "NA";
		row["Dispacth Date"] = (aData.data[i].dispatch && aData.data[i].dispatch.dispatch_date) ? moment(aData.data[i].dispatch.dispatch_date).format("DD-MM-YYYY") : "NA";
		row["Due Date"] = aData.data[i].dueDate ? moment(aData.data[i].dueDate).format("DD-MM-YYYY") : "NA";
		row["Bill Generated By"] = (aData.data[i].created_by) ? aData.data[i].created_by.full_name : "NA";
		row["Bill Generation Date"] = aData.data[i].created_at ? moment(aData.data[i].created_at).format("DD-MM-YYYY") : "NA";
		if (aData.data[i].cancelled) {
			row["Remarks"] = (aData.data[i].cancel_reason || " ") + " " + (aData.data[i].cancel_remark || "NA");
		} else if (aData.data[i].approve && aData.data[i].approve.status) {
			row["Remarks"] = (aData.data[i].approve.reason || " ") + " " + (aData.data[i].approve.remark || "NA");
		} else {
			row["Remarks"] = aData.data[i].remarks || "NA";
		}
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	ws1.mergeCells('B2:C2');
	ws1.mergeCells('B3:C3');
	ws1.mergeCells('B4:C4');
	ws1.mergeCells('B5:C5');
	ws1.mergeCells('B6:C6');
	ws1.mergeCells('B7:C7');

	ws1.getCell('B2').value = 'Total CGST Amount';
	ws1.getCell('D2').value = aData.summary.totalCGSTAmount;

	ws1.getCell('B3').value = 'Total SGST Amount';
	ws1.getCell('D3').value = aData.summary.totalSGSTAmount;

	ws1.getCell('B4').value = 'Total IGST Amount:';
	ws1.getCell('D4').value = aData.summary.totalIGSTAmount;

	ws1.getCell('B5').value = "Total Tax";
	ws1.getCell('D5').value = aData.summary.totalTax;

	ws1.getCell('B6').value = 'Total Amount W/O Tax';
	ws1.getCell('D6').value = aData.summary.totalAmount;

	ws1.getCell('B7').value = 'Total Amount With tax';
	ws1.getCell('D7').value = aData.summary.totalTaxedAmount;
	ws1.getCell('D7').font = {
		bold: true
	};

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'bill', callback);
};
module.exports.generateContractExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let date = moment(aData.date).format("DD-MM-YYYY");
	let ws1 = workbook.addWorksheet('CONTRACT REPORT');
	formatTitle(ws1, 14, 'CONTRACT REPORT');

	let options = {
		fill: columnFill,
		font: {bold: true},
		alignment: {vertical: 'middle', horizontal: 'center'},
		border: {
			top: {style: 'thin'},
			left: {style: 'thin'},
			bottom: {style: 'thin'},
			right: {style: 'thin'}
		}
	};
	headerTopMerged(ws1, 'L2', 'N2', "Date: " + date, {font: {bold: true}, alignment: {horizontal: 'right'}});
	headerTopMerged(ws1, 'F3', 'G3', date, options);
	headerTopMerged(ws1, 'H3', 'I3', 'Cumulative', options);
	headerTopMerged(ws1, 'K3', 'M3', 'Asking Rate (In Day)', options);
	let headers = ['Party', 'Mine', 'Name', 'Quantity', 'Lapsing On', 'TRUCKS', 'QTY', 'C.Trucks', 'C.Qty',
		'Balance Qty', 'Days Left', 'Trucks', 'Qty', 'Progress %'];
	formatColumnHeaders(ws1, 4, headers, [30, 10, 8, 7, 9, 7, 7, 8, 8, 10, 8, 15, 7, 9]);
	let rowNum = 5;
	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row['Party'] = aData.data[i].customer_name;
		row['Mine'] = aData.data[i].mine_name;
		row['Name'] = aData.data[i].name;
		row['Quantity'] = aData.data[i].totalWeight;
		row['Lapsing On'] = moment(aData.data[i].contract_end_date).format("DD-MM-YYYY");
		row['TRUCKS'] = aData.data[i].todayTrucks;
		row['QTY'] = aData.data[i].todayQty;
		row['C.Trucks'] = aData.data[i].lastGr ? aData.data[i].totalTrucks : 0;
		row['C.Qty'] = aData.data[i].totalQty;
		row['Balance Qty'] = row['Quantity'] - row['C.Qty'];
		row['Days Left'] = parseInt(timediff(aData.date, aData.data[i].contract_end_date) / 24);
		row['Qty'] = parseFloat(row['Balance Qty'] / row['Days Left']).toFixed(2);
		if (aData.data[i].lastGr) {
			let capacity = aData.data[i].lastGr.trip.vehicle.capacity || aData.data[i].lastGr.trip.vehicle.veh_type.capacity;
			row['Trucks'] = Math.ceil(row['Qty'] / capacity);
		} else {
			row['Trucks'] = "Serving Not Started";
		}
		row['Progress %'] = parseFloat((row['C.Qty'] / row['Quantity']) * 100).toFixed(2);
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'contract_report', callback);
};

module.exports.generateVehicleProfitExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let fromDate = moment(aData.fromDate).format("DD-MM-YYYY");
	let toDate = moment(aData.toDate).format("DD-MM-YYYY");
	let ws1 = workbook.addWorksheet('VEHICLE PROFIT REPORT');
	formatTitle(ws1, 14, 'VEHICLE PROFIT REPORT');

	let options = {
		fill: columnFill,
		font: {bold: true},
		alignment: {vertical: 'middle', horizontal: 'center'},
		border: {
			top: {style: 'thin'},
			left: {style: 'thin'},
			bottom: {style: 'thin'},
			right: {style: 'thin'}
		}
	};
	headerTopMerged(ws1, 'F2', 'G2', fromDate, options);
	headerTopMerged(ws1, 'H2', 'H2', 'To', options);
	headerTopMerged(ws1, 'I2', 'J2', toDate, options);
	let headers = ['Vehicle No', 'Revenue', 'Expense', 'Profit'];
	formatColumnHeaders(ws1, 4, headers, [20, 10, 10,10]);
	let rowNum = 5;
	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row['Vehicle No'] = aData.data[i].vehicleNo;
		row['Revenue'] = aData.data[i].revenue;
		row['Expense'] = (aData.data[i].duesExp + aData.data[i].advExp + aData.data[i].voucherExp);
		row['Profit'] = aData.data[i].revenue - (row['Expense']);
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'vehicleProfit_report', callback);
};

module.exports.generateVehicleExpenseExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let fromDate = moment(aData.fromDate).format("DD-MM-YYYY");
	let toDate = moment(aData.toDate).format("DD-MM-YYYY");
	let ws1 = workbook.addWorksheet('VEHICLE EXPENSE REPORT');
	formatTitle(ws1, 14, 'VEHICLE EXPENSE REPORT');

	let options = {
		fill: columnFill,
		font: {bold: true},
		alignment: {vertical: 'middle', horizontal: 'center'},
		border: {
			top: {style: 'thin'},
			left: {style: 'thin'},
			bottom: {style: 'thin'},
			right: {style: 'thin'}
		}
	};
	headerTopMerged(ws1, 'F2', 'G2', fromDate, options);
	headerTopMerged(ws1, 'H2', 'H2', 'To', options);
	headerTopMerged(ws1, 'I2', 'J2', toDate, options);
	let headers = ['Vehicle No', 'DuesExp', 'AdvExp','VoucherExp','Expense'];
	formatColumnHeaders(ws1, 4, headers, [20, 10, 10,10]);
	let rowNum = 5;
	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row['Vehicle No'] = aData.data[i].vehicleNo;
		row['DuesExp'] = aData.data[i].duesExp;
		row['AdvExp'] = aData.data[i].advExp;
		row['VoucherExp'] = aData.data[i].voucherExp;
		row['Expense'] = (aData.data[i].duesExp + aData.data[i].advExp + aData.data[i].voucherExp);
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'vehicleExpense_report', callback);
};

module.exports.generateTripExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tyre Report');
	formatTitle(ws1, 13, 'Tyre Report');
	let headers = ['BRANCH', 'ALLOCATION DATETIME', 'DISPATCH DATETIME', 'DISPATCH DELAY(HRS.)', 'TRIP NO.', 'BOOKING NO', 'BOOKING TYPE', 'BOE NO.', 'GR NO.', 'CUSTOMER',
		'CHA', 'BILLING PARTY', 'VEHICLE NO.', 'VEHICLE TYPE', 'DRIVER', 'CONTAINER NO', 'CONTAINER TYPE', 'CONTAINER LINE', 'ROUTE NAME', 'ROUTE DISTANCE IN MASTERS',
		'WEIGHT(TONNE)', 'RATE', 'FRIEGHT', 'DIESEL(LTR.)', 'DIESEL RATE(/LTR.)', 'DIESEL COST(RS.)', 'DIESEL CASH(ADV.)', 'DRIVER CASH(ADV.)', 'TRIP CASH(ADV.)',
		'TRIP STARTER', 'MODEL/TYPE', 'SUB-GROUP', 'GROUP'
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 13, lastAggValue);
		}
		let row = {};
		row['BRANCH'] = aData.data[i].branch && aData.data[i].branch.name || "NA";
		row['ALLOCATION DATETIME'] = aData.data[i].allocation_date || "NA";
		row['TRIP NO.'] =  aData.data[i].trip_no || "NA";
		row['BOOKING NO.'] = aData.data[i].gr[0] && aData.data[i].gr[0].booking && aData.data[i].gr[0].booking.booking_no || "NA";
		row['BOOKING TYPE'] =aData.data[i].gr[0] && aData.data[i].gr[0].booking &&  aData.data[i].gr[0].booking.booking_type || "NA";
		row['GR TYPE'] = aData.data[i].gr[0] && aData.data[i].gr[0].gr_type || 0;
		row['GR NO.'] = aData.data[i].gr[0] &&  aData.data[i].gr[0].grNumber || "NA";
		row['CUSTOMER'] = aData.data[i].gr[0] && aData.data[i].gr[0].booking && aData.data[i].gr[0].booking.customer && aData.data[i].gr[0].booking.customer.name || "NA";
		row['CHA'] = aData.data[i].current_price || "NA";
		row['BILLING PARTY '] = aData.data[i].rate_per_piece || "NA";
		row['VEHICLE NO'] = aData.data[i].vehicle_no || "NA";
		row['VEHICLE TYPE'] = aData.data[i].billing_amount || "NA";
		row['DRIVER'] = aData.data[i].driver && aData.data[i].driver.name || "NA";
		// row['DRIVER'] = (aData.data[i].created_at ? moment(aData.data[i].created_at).format("DD-MM-YYYY") : "NA");
		row['CONTAINER NO'] = aData.data[i].gr[0] && aData.data[i].gr[0].container && aData.data[i].gr[0].container.name || "NA";
		row['CONTAINER TYPE'] = aData.data[i].gr[0] && aData.data[i].gr[0].container && aData.data[i].gr[0].container.container_type || "NA";
		row['ROUTE NAME'] = aData.data[i].route_name || "NA";
		row['ROUTE DISTANCE IN MASTERS'] = aData.data[i].route_distance || "NA";
		row['WEIGHT(TONNE)'] = aData.data[i].gr[0] && aData.data[i].gr[0].trip.weight || "NA";
		row['RETE'] = aData.data[i].rate_per_piece || "NA";
		row['FRIEGHT'] = aData.data[i].structure_name || "NA";
		row['DIESEL COST(RS.)'] = aData.data[i].vehicle_type || "NA";
		row['DIESEL CASH(ADV.)'] = aData.data[i].vehicle_type || "NA";
		row['TRIP STARTER'] = aData.data[i].vehicle_type || "NA";
		row['MODEL/TYPE'] = aData.data[i].vehicle_type || "NA";
		row['SUB-GROUP'] = aData.data[i].vehicle_type || "NA";
		row['GROUP'] = aData.data[i].vehicle_type || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'trip_report', callback);
};
module.exports.generateTyreExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tyre Report');
	formatTitle(ws1, 13, 'Tyre Report');
	let headers = ['Tyre Number', 'Tyre Category', 'Name', 'Exp. Mileage', 'Total Run', 'Status', 'Retread Cnt', 'Current Price', 'Price', 'Tax',
		'Billing Amt', 'Purchase Date', 'Invoice Date', 'Invoice Number', 'Vendor', 'PO Number', 'Issue Date', 'Vehicle', 'Veh. Type'
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 13, lastAggValue);
		}
		let row = {};
		row['Tyre Number'] = aData.data[i].tyre_number || "NA";
		row['Tyre Category'] = aData.data[i].tyre_category || "NA";
		row['Name'] = aData.data[i].spare_name || "NA";
		row['Exp. Mileage'] = aData.data[i].mileage || 0;
		row['Total Run'] = aData.data[i].total_run || 0;
		row['Status'] = aData.data[i].status || "NA";
		row['Retread Cnt'] = aData.data[i].retread_count || "NA";
		row['Current Price'] = aData.data[i].current_price || "NA";
		row['Price'] = aData.data[i].rate_per_piece || "NA";
		row['Tax'] = aData.data[i].tax || 0;
		row['Billing Amt'] = aData.data[i].billing_amount || "NA";
		row['Purchase Date'] = (aData.data[i].created_at ? moment(aData.data[i].created_at).format("DD-MM-YYYY") : "NA");
		row['Invoice Date'] = (aData.data[i].invoice_date ? moment(aData.data[i].invoice_date).format("DD-MM-YYYY") : "NA");
		row['Invoice Number'] = aData.data[i].invoice_number || "NA";
		row['Vendor'] = aData.data[i].vendor_name || "NA";
		row['PO Number'] = aData.data[i].po_number || "NA";
		row['Issue Date'] = (aData.data[i].association_date ? moment(aData.data[i].association_date).format("DD-MM-YYYY") : "NA");
		row['Vehicle'] = aData.data[i].vehicle_no || "NA";
		row['Vehicle Structure'] = aData.data[i].structure_name || "NA";
		row['Veh. Type'] = aData.data[i].vehicle_type || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'tyre_issue', callback);
};
module.exports.generateTyreRetreadExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tyre Retread Report');
	formatTitle(ws1, 15, 'Tyre Retread Report');
	let headers = ['Tyre Number', "issued_by_employee_name", "issue_date", "returned_by_employee_name",
		"return_date", "tyre_quality_remark", "bill_no", "bill_date", "issue_slip_no", "vendor_name", "expected_return_date",
		"cost", "tax", "freight", "total_cost", "remark"
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 15, lastAggValue);
		}
		let row = {};
		row['Tyre Number'] = aData.data[i].tyre_number || "NA";
		row['issued_by_employee_name'] = aData.data[i].issued_by_employee_name || "NA";
		row['issue_date'] = (aData.data[i].issue_date ? moment(aData.data[i].issue_date).format("DD-MM-YYYY") : "NA");
		row['returned_by_employee_name'] = aData.data[i].returned_by_employee_name || "NA";
		row['return_date'] = (aData.data[i].return_date ? moment(aData.data[i].return_date).format("DD-MM-YYYY") : "NA");
		row['tyre_quality_remark'] = aData.data[i].tyre_quality_remark || "NA";
		row['bill_no'] = aData.data[i].bill_no || "NA";
		row['bill_date'] = (aData.data[i].bill_date ? moment(aData.data[i].bill_date).format("DD-MM-YYYY") : "NA");
		row['issue_slip_no'] = aData.data[i].issue_slip_no || "NA";
		row['vendor_name'] = aData.data[i].vendor_name || "NA";
		row['expected_return_date'] = (aData.data[i].expected_return_date ? moment(aData.data[i].expected_return_date).format("DD-MM-YYYY") : "NA");
		row['cost'] = aData.data[i].cost || "NA";
		row['tax'] = aData.data[i].tax || "NA";
		row['freight'] = aData.data[i].freight || "NA";
		row['total_cost'] = aData.data[i].total_cost || "NA";
		row['remark'] = aData.data[i].remark || "NA";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'tyre_retread', callback);
};
module.exports.generatePMTAssocExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Prime-Mover Tailor Association Report');
	formatTitle(ws1, 15, 'Prime-Mover Tailor Association Report');
	formatColumnHeaders(ws1, 3, ["vehicle_reg_no", "trailer_no", "odometer_on_association",
		"odometer_on_disassociation", "place_of_association", "association_datetime", "disassociation_datetime", "place_of_disassociation",
		"associated_by_employee_name", "disassociated_by_employee_name"
	], [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 15, lastAggValue);
		}
		ws1.getCell('A' + rowNum).value = aData.data[i].vehicle_reg_no || "NA";
		ws1.getCell('B' + rowNum).value = aData.data[i].trailer_no || "NA";
		ws1.getCell('C' + rowNum).value = aData.data[i].odometer_on_association || "NA";
		ws1.getCell('D' + rowNum).value = aData.data[i].odometer_on_disassociation || "NA";
		ws1.getCell('E' + rowNum).value = aData.data[i].place_of_association || "NA";
		ws1.getCell('F' + rowNum).value = (aData.data[i].association_datetime ? moment(aData.data[i].association_datetime).format("DD-MM-YYYY") : "NA");
		ws1.getCell('G' + rowNum).value = (aData.data[i].disassociation_datetime ? moment(aData.data[i].disassociation_datetime).format("DD-MM-YYYY") : "NA");
		ws1.getCell('H' + rowNum).value = aData.data[i].place_of_disassociation || "NA";
		ws1.getCell('I' + rowNum).value = aData.data[i].associated_by_employee_name || "NA";
		ws1.getCell('J' + rowNum).value = aData.data[i].disassociated_by_employee_name || "NA";
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'pmt_association', callback);
};
module.exports.generateMtaskExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Task Report');
	formatTitle(ws1, 11, 'Task Report');
	formatColumnHeaders(ws1, 3, ["jobId", "taskId", "task_name", "supervisor_name", "mechanics_involved", "status", "priority",
		"start_datetime", "close_datetime", "remarks", "created_by_name"
	], [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 11, lastAggValue);
		}
		ws1.getCell('A' + rowNum).value = aData.data[i].jobId || "NA";
		ws1.getCell('B' + rowNum).value = aData.data[i].taskId || "NA";
		ws1.getCell('C' + rowNum).value = aData.data[i].task_name || "NA";
		ws1.getCell('D' + rowNum).value = aData.data[i].supervisor_name || "NA";
		let mechanics = "";
		for (let mechI = 0; mechI < aData.data[i].mechanics_involved.length; mechI++) {
			mechanics += aData.data[i].mechanics_involved[mechI].name + " ";
		}
		ws1.getCell('E' + rowNum).value = mechanics === "" ? "NA" : mechanics;
		ws1.getCell('F' + rowNum).value = aData.data[i].status || "NA";
		ws1.getCell('G' + rowNum).value = aData.data[i].priority || "NA";
		ws1.getCell('H' + rowNum).value = (aData.data[i].start_datetime ? moment(aData.data[i].start_datetime).format("DD-MM-YYYY") : "NA");
		ws1.getCell('I' + rowNum).value = (aData.data[i].close_datetime ? moment(aData.data[i].close_datetime).format("DD-MM-YYYY") : "NA");
		ws1.getCell('J' + rowNum).value = aData.data[i].remarks || "NA";
		ws1.getCell('K' + rowNum).value = aData.data[i].created_by_name || "NA";
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'maintenance_service', callback);
};
module.exports.generateContractorExpenseAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Task Report');
	formatTitle(ws1, 12, 'Task Report');
	formatColumnHeaders(ws1, 3, ["vehicle_number", "jobId", "taskId", "task_name", "supervisor_name", "contractor_name", "bill_number", "amount",
		"start_time", "end_time", "remarks", "created_by_name", "created_at"
	], [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 12, lastAggValue);
		}
		ws1.getCell('A' + rowNum).value = aData.data[i].vehicle_number || "NA";
		ws1.getCell('B' + rowNum).value = aData.data[i].jobId || "NA";
		ws1.getCell('C' + rowNum).value = aData.data[i].taskId || "NA";
		ws1.getCell('D' + rowNum).value = aData.data[i].task_name || "NA";
		ws1.getCell('E' + rowNum).value = aData.data[i].supervisor_name || "NA";
		ws1.getCell('F' + rowNum).value = aData.data[i].contractor_name || "NA";
		ws1.getCell('G' + rowNum).value = aData.data[i].bill_number || "NA";
		ws1.getCell('H' + rowNum).value = aData.data[i].amount || "NA";
		ws1.getCell('I' + rowNum).value = (aData.data[i].start_time ? moment(aData.data[i].start_time).format("DD-MM-YYYY") : "NA");
		ws1.getCell('J' + rowNum).value = (aData.data[i].end_time ? moment(aData.data[i].end_time).format("DD-MM-YYYY") : "NA");
		ws1.getCell('K' + rowNum).value = aData.data[i].remark || "NA";
		ws1.getCell('L' + rowNum).value = aData.data[i].created_by_employee_name || "NA";
		ws1.getCell('M' + rowNum).value = aData.data[i].created_at || "NA";
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'maintenance_service', callback);
};
module.exports.generateOtherExpenseAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Expense Report');
	formatTitle(ws1, 14, 'Expense Report');
	let headers = ["expense_no", "type", "jobId", "branchName", "branchId", "vehicle_no",
		"created_by_name", "approved_by_name", "remark", "amount", "bill_no", "bill_date", "creation_date", "Party Name"
	];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	let lastAggValue = "";
	let agg = aData.aggregateBy;
	for (let i = 0; i < aData.data.length; i++) {
		if (agg != null && (lastAggValue === "" || lastAggValue !== aData.data[i][agg])) {
			lastAggValue = aData.data[i][agg];
			mergeCells(ws1, rowNum++, 14, lastAggValue);
		}
		let row = {};
		row["expense_no"] = aData.data[i].expense_no || "NA";
		row["type"] = aData.data[i].type || "NA";
		row["jobId"] = aData.data[i].jobId || "NA";
		row["branchName"] = aData.data[i].branchName || "NA";
		row["branchId"] = aData.data[i].branchId || "NA";
		row["vehicle_no"] = aData.data[i].vehicle_no || "NA";
		row["created_by_name"] = aData.data[i].created_by_name || "NA";
		row["approved_by_name"] = aData.data[i].approved_by_name || "NA";
		row["remark"] = aData.data[i].remark || "NA";
		row["amount"] = aData.data[i].amount || "NA";
		row["bill_no"] = aData.data[i].bill_no || "NA";
		row["bill_date"] = (aData.data[i].bill_date ? moment(aData.data[i].bill_date).format("DD-MM-YYYY") : "NA");
		row["creation_date"] = (aData.data[i].created_at ? moment(aData.data[i].created_at).format("DD-MM-YYYY") : "NA");
		row["Party Name"] = aData.data[i].partyName || "NA";
		addWorkbookRow(row, ws1, headers, rowNum++);
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'expense', callback);
};
module.exports.generateCombinedExpenseAggExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Expense Report');
	formatTitle(ws1, 14, 'Expense Report');
	let headers = ["jobId", "vehicle_number", "type", "Amount"];
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15]);
	let rowNum = 4;
	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["type"] = aData[i].type || "NA";
		row["jobId"] = aData[i].jobId || "NA";
		row["vehicle_number"] = aData[i].vehicle_number || "NA";
		row["Amount"] = aData[i].Amount || 0;
		addWorkbookRow(row, ws1, headers, rowNum++);
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'expense', callback);
};
module.exports.generateInvSnapshotExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('SnapShot Report');
	formatTitle(ws1, 8, 'SnapShot Report ' + aData.created_at);
	let headers = ["Spare Name", "Spare Code", "Category Code", "Category Name", "UOM", "Remaining Quantity", "Rate", "Rate with Tax"];
	formatColumnHeaders(ws1, 3, headers, [79, 11, 14, 20, 7, 10, 30, 30]);
	let rowNum = 4;
	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row["Spare Name"] = aData.data[i].spare_name || "NA";
		row["Spare Code"] = aData.data[i].spare_code || "NA";
		row["Category Code"] = aData.data[i].category_code || "NA";
		row["Category Name"] = aData.data[i].category_name || "NA";
		row["UOM"] = aData.data[i].uom || "NA";
		row["Remaining Quantity"] = aData.data[i].remaining_quantity || "NA";
		row["Rate"] = aData.data[i].rate_per_piece || "NA";
		row["Rate with Tax"] = aData.data[i].rate_inc_tax || "NA";
		addWorkbookRow(row, ws1, headers, rowNum++);
	}

	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'SnapShot', callback);
};
module.exports.generateToolExcel = function (aData, clientId, callback)  {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tool Report');
	formatTitle(ws1, 9, 'Tool Report');
	formatColumnHeaders(ws1, 3, ['Tool Id', 'Tool Code', 'Tool Name', 'Vendor', 'Category', 'Rate/Piece', 'Status', 'PO Number', 'Invoice No'], [15, 15, 15, 25, 15, 15, 15, 25, 15, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].toolId || "NA";
		ws1.getCell('B' + (i + 4)).value = aData[i].code || "NA";
		ws1.getCell('C' + (i + 4)).value = aData[i].spare_name || "NA";
		ws1.getCell('D' + (i + 4)).value = aData[i].vendor_name || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].category || "NA"; //moment(aData[i].allocation_date).format("DD-MM-YYYY") || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].price || "NA";
		ws1.getCell('G' + (i + 4)).value = aData[i].status || "NA";
		ws1.getCell('H' + (i + 4)).value = aData[i].po_number || "NA";
		ws1.getCell('I' + (i + 4)).value = aData[i].invoice_number || "NA";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'tool', callback);
};


module.exports.generateTripExpenseAggExcel = function (oData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Expenses');
	// formatTitle(ws1, 20, 'Trip Expenses Report');
	let header = [
		'TRIP NO.',
		'VEHICLE NO.',
		'ROUTE NAME',
		'ALLOCATION DATE',
		'VENDOR',
		'VENDOR ADVANCE',
		'VENDOR TOPAY',
		'TOLL TAX',
		'TOTAL DIESEL(RS.)',
		'CASH',
		'VENDOR CASH PAYMENT',
		'VENDOR AC PAYMENT',
		'VENDOR PAYMENT',
		'VENDOR CHECK PAYMENT',
		'VENDOR PENALTY PAYMENT',
		'VENDOR ADV. REMAINING',
		'VENDOR TOPAY REMAINING',
		'DIESEL (LTR.)',
		'DIESEL PRICE',
		'CREATED ON',
		'CHALLAN',
		'DIESEL',
		'DRIVER CASH',
		'GR CHARGES',
		'LOAD CHARGES',
		'OTHER CHARGES',
		'DAMAGE',
		'DETENTION',
		'NET EXPENSES'
	];
	formatColumnHeaders(ws1, 1, header, [10, 20, 20, 15, 12, 18, 18, 12, 18, 18, 18, 18, 18, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
	let rowNum = 2;
	for (let i = 0; i < oData.aData.length; i++) {
		let row = {};
		row['TRIP NO.'] = oData.aData[i].trip.trip_no || 'NA';
		row['VEHICLE NO.'] = oData.aData[i].trip.vehicle_no || 'NA';
		row['ROUTE NAME'] = oData.aData[i].trip.route_name || 'NA';
		row['ALLOCATION DATE'] = (oData.aData[i].trip && oData.aData[i].trip.statuses && oData.aData[i].trip.statuses.length > 0) ? moment(oData.aData[i].trip.statuses.find(function (element) {
			return element.status === "Trip not started";
		}).date).format("DD-MM-YYYY") : "NA";
		row['VENDOR'] = (oData.aData[i] && oData.aData[i].trip && oData.aData[i].trip.vendorData && oData.aData[i].trip.vendorData.name) || "NA";
		row['VENDOR ADVANCE'] = (oData.aData[i] && oData.aData[i].trip && oData.aData[i].trip.vendorDeal && oData.aData[i].trip.vendorDeal.advance) || 'NA';
		row['VENDOR TOPAY'] = (oData.aData[i] && oData.aData[i].trip && oData.aData[i].trip.vendorDeal && oData.aData[i].trip.vendorDeal.toPay) || 'NA';
		row['TOLL TAX'] = oData.aData[i].tollTax;
		row['TOTAL DIESEL(RS.)'] = oData.aData[i].diesel;
		row['CASH'] = oData.aData[i].driverCash;
		row['VENDOR CASH PAYMENT'] = oData.aData[i].vCash;
		row['VENDOR AC PAYMENT'] = oData.aData[i].vACPay;
		row['VENDOR PAYMENT'] = oData.aData[i].vNet;
		row['VENDOR CHECK PAYMENT'] = oData.aData[i].vCheque;
		row['VENDOR PENALTY PAYMENT'] = oData.aData[i].vPenalty;
		row['VENDOR ADV. REMAINING'] = oData.aData[i].v_adv_remaining;
		row['VENDOR TOPAY REMAINING'] = oData.aData[i].v_topay_remaining;
		row['DIESEL (LTR.)'] = oData.aData[i].dieselLtr;
		row['DIESEL PRICE'] = oData.aData[i].diesel;
		row['CREATED ON'] = (oData.aData[i] && oData.aData[i].trip && moment(oData.aData[i].trip.created_at).format("DD-MM-YYYY")) || 'NA';
		row['CHALLAN'] = oData.aData[i].chalan;
		row['DIESEL'] = oData.aData[i].diesel;
		row['DRIVER CASH'] = oData.aData[i].driverCash;
		row['GR CHARGES'] = oData.aData[i].grCharges;
		row['LOAD CHARGES'] = oData.aData[i].loadCharges;
		row['OTHER CHARGES'] = oData.aData[i].oCharges;
		row['DAMAGE'] = oData.aData[i].vDamage;
		row['DETENTION'] = oData.aData[i].vDetention;
		row['NET EXPENSES'] = oData.aData[i].vNet;
		addWorkbookRow(row, ws1, header, rowNum++, false);
	}
	saveFileAndReturnCallback(workbook, clientId, oData.aggregateBy || 'miscellaneous', 'trip_expense', callback);
};

module.exports.generateTripExpenseAggExcelReport = function (oData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Expenses');
	let header = [
		'TRIP NO.',
		'VEHICLE NO.',
		'ROUTE NAME',
		'ALLOCATION DATE',
		'VENDOR',
		'VENDOR ADVANCE',
		'VENDOR TOPAY',
		'TOLL TAX',
		'TOTAL DIESEL(RS.)',
		'CASH',
		'VENDOR CASH PAYMENT',
		'VENDOR AC PAYMENT',
		'VENDOR PAYMENT',
		'VENDOR CHECK PAYMENT',
		'VENDOR PENALTY PAYMENT',
		'VENDOR ADV. REMAINING',
		'VENDOR TOPAY REMAINING',
		'DIESEL (LTR.)',
		'DIESEL PRICE',
		'CREATED ON',
		'CHALLAN',
		'DIESEL',
		'DRIVER CASH',
		'GR CHARGES',
		'LOAD CHARGES',
		'OTHER CHARGES',
		'DAMAGE',
		'DETENTION',
		'NET EXPENSES'
	];
	formatColumnHeaders(ws1, 1, header, [10, 20, 20, 15, 12, 18, 18, 12, 18, 18, 18, 18, 18, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
	let rowNum = 3;
	let lastAggValue = "";
	let agg = oData.aggregateBy;
	for (let i = 0; i < oData.data.length; i++) {
		if (agg === "allocation_date") {
			if ((lastAggValue === "" || lastAggValue !== new Date(oData.data[i]['trip'][agg]).toDateString())) {
				lastAggValue = new Date(oData.data[i]['trip'][agg]).toDateString();
				mergeCells(ws1, rowNum++, 27, lastAggValue);
			}
		} else if (agg === "vehicle_no" && oData.data[i]["trip"] && oData.data[i]["trip"]["vehicle_no"]) {
			if ((lastAggValue === "" || lastAggValue !== oData.data[i]["trip"]["vehicle_no"])) {
				lastAggValue = oData.data[i]["trip"]["vehicle_no"];
				mergeCells(ws1, rowNum++, 27, lastAggValue);
			}
		} else if (agg === "trip_no" && oData.data[i]["trip"] && oData.data[i]["trip"]["trip_no"]) {
			if ((lastAggValue === "" || lastAggValue !== oData.data[i]["trip"]["trip_no"])) {
				lastAggValue = oData.data[i]["trip"]["trip_no"];
				mergeCells(ws1, rowNum++, 27, lastAggValue.toString());
			}
		} else {
			if ((lastAggValue === "" || lastAggValue !== oData.data[i][agg])) {
				lastAggValue = oData.data[i][agg];
				mergeCells(ws1, rowNum++, 27, lastAggValue);
			}

		}
		let row = {};
		row['TRIP NO.'] = oData.data[i].trip.trip_no || 'NA';
		row['VEHICLE NO.'] = oData.data[i].trip.vehicle_no || 'NA';
		row['ROUTE NAME'] = oData.data[i].trip.route_name || 'NA';
		row['ALLOCATION DATE'] = (oData.data[i].trip && oData.data[i].trip.statuses && oData.data[i].trip.statuses.length > 0
		) ? moment(oData.data[i].trip.statuses.find(function (element) {
			return element.status === "Trip not started";
		}).date).format("DD-MM-YYYY") : "NA";
		row['VENDOR'] = (oData.data[i] && oData.data[i].trip && oData.data[i].trip.vendorData && oData.data[i].trip.vendorData.name) || "NA";
		row['VENDOR ADVANCE'] = (oData.data[i] && oData.data[i].trip && oData.data[i].trip.vendorDeal && oData.data[i].trip.vendorDeal.advance) || 'NA';
		row['VENDOR TOPAY'] = (oData.data[i] && oData.data[i].trip && oData.data[i].trip.vendorDeal && oData.data[i].trip.vendorDeal.toPay) || 'NA';
		row['TOLL TAX'] = oData.data[i].tollTax;
		row['TOTAL DIESEL(RS.)'] = oData.data[i].diesel;
		row['CASH'] = oData.data[i].driverCash;
		row['VENDOR CASH PAYMENT'] = oData.data[i].vCash;
		row['VENDOR AC PAYMENT'] = oData.data[i].vACPay;
		row['VENDOR PAYMENT'] = oData.data[i].vNet;
		row['VENDOR CHECK PAYMENT'] = oData.data[i].vCheque;
		row['VENDOR PENALTY PAYMENT'] = oData.data[i].vPenalty;
		row['VENDOR ADV. REMAINING'] = oData.data[i].v_adv_remaining;
		row['VENDOR TOPAY REMAINING'] = oData.data[i].v_topay_remaining;
		row['DIESEL (LTR.)'] = oData.data[i].dieselLtr;
		row['DIESEL PRICE'] = oData.data[i].diesel;
		row['CREATED ON'] = (oData.data[i] && oData.data[i].trip && moment(oData.data[i].trip.created_at).format("DD-MM-YYYY")) || 'NA';
		row['CHALLAN'] = oData.data[i].chalan;
		row['DIESEL'] = oData.data[i].diesel;
		row['DRIVER CASH'] = oData.data[i].driverCash;
		row['GR CHARGES'] = oData.data[i].grCharges;
		row['LOAD CHARGES'] = oData.data[i].loadCharges;
		row['OTHER CHARGES'] = oData.data[i].oCharges;
		row['DAMAGE'] = oData.data[i].vDamage;
		row['DETENTION'] = oData.data[i].vDetention;
		row['NET EXPENSES'] = oData.data[i].vNet;
		addWorkbookRow(row, ws1, header, rowNum++, false);
	}
	saveFileAndReturnCallback(workbook, clientId, oData.aggregateBy || 'miscellaneous', 'trip_expense', callback);
};

module.exports.generateVendorReconciliationAggExcel = function (oData, clientId, callback) {
	let workbook = new Excel.Workbook();

	let ws1 = workbook.addWorksheet(oData.vendor_name);
	formatTitle(ws1, 11, 'Reconciliation Report');
	let header = ['LR No.', 'Vehicle Number', 'Allocation Date',
		'Hire Amount', 'Advance to be paid', 'Net Bal w/o deduction', 'Munshiyana',
		'Actual adv. paid', 'Actual Bal. paid',
		'Deduction due to damage', 'Detention Charges to add', 'Overload Charges to add', 'POD submission date'
	];
	formatColumnHeaders(ws1, 15, header, [15, 12, 12, 15, 12, 18, 18, 12, 18, 18, 18, 18, 18]);
	let rowNum = 16;
	let net_hire_charges = 0, deductions = 0, munshiyana = 0, overload_charges_to_add = 0, detention_to_add = 0,
		total_to_be_paid = 0, actual_advance_paid = 0, balance_amount_paid = 0, total_paid_till_date = 0, net = 0;
	for (let i = 0; i < oData.aData.length; i++) {
		let row = {};
		row['LR No.'] = oData.aData[i].trip.aGR.reduce(function (accumulator, currentValue) {
				return accumulator + ((currentValue["grNumber"]) ? currentValue["grNumber"] + ", " : "");
			},
			""
		);
		row['Vehicle Number'] = oData.aData[i].vehicle_no || "NA";
		row['Allocation Date'] = (oData.aData[i].trip && oData.aData[i].trip.statuses && oData.aData[i].trip.statuses.length > 0) ? moment(oData.aData[i].trip.statuses.find(function (element) {
			return element.status === "Trip not started";
		}).date).format("DD-MM-YYYY") : "NA";
		if (oData.aData[i].trip && oData.aData[i].trip.vendorDeal && oData.aData[i].trip.vendorDeal.total_expense) {
			net_hire_charges = net_hire_charges + oData.aData[i].trip.vendorDeal.total_expense;
			row['Hire Amount'] = oData.aData[i].trip.vendorDeal.total_expense || 0;
		} else {
			row['Hire Amount'] = 0;
		}
		row['Advance to be paid'] = (oData.aData[i].trip && oData.aData[i].trip.vendorDeal) ? oData.aData[i].trip.vendorDeal.advance : 0;
		row['Net Bal w/o deduction'] = (oData.aData[i].trip && oData.aData[i].trip.vendorDeal) ? oData.aData[i].trip.vendorDeal.toPay : 0;
		if (oData.aData[i].trip && oData.aData[i].trip.vendorDeal && oData.aData[i].trip.vendorDeal.munshiyana) {
			munshiyana = munshiyana + oData.aData[i].trip.vendorDeal.munshiyana;
			row['Munshiyana'] = oData.aData[i].trip.vendorDeal.munshiyana || 0;
		} else {
			row['Munshiyana'] = 0;
		}
		row['Deduction due to damage'] = (deductions = deductions + (oData.aData[i].vDamage || 0), oData.aData[i].vDamage);
		row['Detention Charges to add'] = (detention_to_add = detention_to_add + (oData.aData[i].vDetention || 0), oData.aData[i].vDetention);
		row['Overload Charges to add'] = (overload_charges_to_add = overload_charges_to_add + (oData.aData[i].vOverload || 0), oData.aData[i].vOverload);
		row['Actual adv. paid'] = (actual_advance_paid = actual_advance_paid + oData.aData[i].actualAdvancedPaid || 0, oData.aData[i].actualAdvancedPaid);
		row['POD submission date'] = (oData.aData[i].trip && oData.aData[i].trip.aGR && oData.aData[i].trip.aGR.length > 0 && oData.aData[i].trip.aGR[0].statuses && oData.aData[i].trip.aGR[0].statuses > 0) ? moment(oData.aData[i].trip.aGR[0].statuses.find(function (element) {
			return element.status === "GR Acknowledged";
		}).date).format("DD-MM-YYYY") : "NA";
		row['Actual Bal. paid'] = oData.aData[i].actualBalancedPaid || 0;
		balance_amount_paid = balance_amount_paid + row['Actual Bal. paid'];
		addWorkbookRow(row, ws1, header, rowNum++, false);

	}

	ws1.mergeCells('B2:C2');
	ws1.mergeCells('B3:C3');
	ws1.mergeCells('B4:C4');
	ws1.mergeCells('B5:C5');
	ws1.mergeCells('B6:C6');
	ws1.mergeCells('B7:C7');
	ws1.mergeCells('B8:C8');
	ws1.mergeCells('B9:C9');
	ws1.mergeCells('B10:C10');
	ws1.mergeCells('B11:C11');
	ws1.mergeCells('B12:C12');
	ws1.mergeCells('B13:C13');

	ws1.getCell('B2').value = "Name";
	ws1.getCell('D2').value = oData.vendor_name;
	ws1.getCell('B3').value = "Date";
	ws1.getCell('B3').font = {
		bold: true
	};
	ws1.getCell('D3').value = moment().format("DD-MM-YYYY");
	ws1.getCell('D3').font = {
		bold: true
	};
	ws1.getCell('B4').value = "Net Hire Charges";
	ws1.getCell('D4').value = net_hire_charges;
	ws1.getCell('B5').value = "Deductions";
	ws1.getCell('D5').value = deductions;
	ws1.getCell('B6').value = "Munshiyana Deductions";
	ws1.getCell('D6').value = munshiyana;
	ws1.getCell('B7').value = "Detention to add";
	ws1.getCell('D7').value = detention_to_add;
	ws1.getCell('B8').value = "Overload Charges to add";
	ws1.getCell('D8').value = overload_charges_to_add;
	ws1.getCell('B9').value = "Total to be paid";
	ws1.getCell('D9').value = net_hire_charges + detention_to_add + overload_charges_to_add - (deductions + munshiyana);
	ws1.getCell('B10').value = "Actual advance paid";
	ws1.getCell('D10').value = actual_advance_paid;
	ws1.getCell('B11').value = "Balance amount paid";
	ws1.getCell('D11').value = balance_amount_paid;
	ws1.getCell('B12').value = "Total paid till date";
	ws1.getCell('B12').font = {
		bold: true
	};
	ws1.getCell('D12').value = actual_advance_paid + balance_amount_paid + detention_to_add + overload_charges_to_add;
	ws1.getCell('D12').font = {
		bold: true
	};
	ws1.getCell('B13').value = "Remaining Payable";
	ws1.getCell('B13').font = {
		bold: true
	};
	ws1.getCell('D13').value = ws1.getCell('D9').value - ws1.getCell('D12').value;
	ws1.getCell('D13').font = {
		bold: true
	};
	saveFileAndReturnCallback(workbook, clientId, oData.aggregateBy || 'miscellaneous', 'vendor_reconciliation', callback);
};

module.exports.generateUnbilledInvoiceExcel = function (reportType, aData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Unbilled Report');
	mergeCellsHandler(ws1, "A1", "AF1", clientData.client_full_name, false, true);
	mergeCellsHandler(ws1, "A2", "AF2", 'Unbilled Report', false, true);
	let header = ["Sl No.", "Bill No", "Trip No", "Trip Start Time", "Trip End Time", "Vehicle No.", "Customer Name", "Billing Party", "Route Name", "GR Type", "GR No.", "BOE No.", "Container No", "Container Type", "Payment Basis", "Weight(Tonne)", "Rate", "Frieght", "GR Charges", "Loading Charges", "Unloading Charges", "Weightman Charges", "Fuel Price Hike", "Other Charges", "Over Weight Charges", "Detaintion Charge", "Extra Running", "Total", "Advance", "Balance", "Billed By", "Remark", "GR RECEIVED"];

	formatColumnHeaders(ws1, 3, header, [5, 10, 15, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = i + 1;
		ws1.getCell('B' + (i + 4)).value = aData[i].bill_no;
		ws1.getCell('C' + (i + 4)).value = aData[i].trip_no;
		ws1.getCell('D' + (i + 4)).value = (aData[i].trip_start_time) ? moment(aData[i].trip_start_time).format("DD-MM-YYYY HH:mm") : "NA";
		ws1.getCell('E' + (i + 4)).value = (aData[i].trip_end_time) ? moment(aData[i].trip_end_time).format("DD-MM-YYYY HH:mm") : "NA";
		ws1.getCell('F' + (i + 4)).value = (aData[i].m_vehicle_no) ? aData[i].m_vehicle_no + "(" + aData[i].veh_no + ")" : (aData[i].veh_no || "NA");
		ws1.getCell('G' + (i + 4)).value = aData[i].customer_name;
		ws1.getCell('H' + (i + 4)).value = aData[i].billing_party_name;
		ws1.getCell('I' + (i + 4)).value = aData[i].route;
		ws1.getCell('J' + (i + 4)).value = aData[i].gr_type;
		ws1.getCell('K' + (i + 4)).value = aData[i].gr_no;
		ws1.getCell('L' + (i + 4)).value = aData[i].boe_no.join(', ');
		ws1.getCell('M' + (i + 4)).value = aData[i].container_no.join(', ');
		ws1.getCell('N' + (i + 4)).value = aData[i].container_size.join(', ');
		ws1.getCell('O' + (i + 4)).value = aData[i].payment_basis;
		ws1.getCell('P' + (i + 4)).value = aData[i].weight;
		ws1.getCell('Q' + (i + 4)).value = aData[i].rate;
		ws1.getCell('R' + (i + 4)).value = aData[i].freight;
		ws1.getCell('S' + (i + 4)).value = aData[i].gr_charges;
		ws1.getCell('T' + (i + 4)).value = aData[i].loading_charges;
		ws1.getCell('U' + (i + 4)).value = aData[i].unloading_charges;
		ws1.getCell('V' + (i + 4)).value = aData[i].weightman_charges;
		ws1.getCell('W' + (i + 4)).value = aData[i].fuel_price_hike;
		ws1.getCell('X' + (i + 4)).value = aData[i].other_charges;
		ws1.getCell('Y' + (i + 4)).value = aData[i].ovr_wt_chrgs;
		ws1.getCell('Z' + (i + 4)).value = aData[i].dtn_amt;
		ws1.getCell('AA' + (i + 4)).value = aData[i].othr_exp;
		ws1.getCell('AB' + (i + 4)).value = aData[i].total;
		ws1.getCell('AC' + (i + 4)).value = aData[i].advance || 0;
		ws1.getCell('AD' + (i + 4)).value = aData[i].balance || 0;
		ws1.getCell('AE' + (i + 4)).value = aData[i].billed_by ? aData[i].billed_by.name : "";
		ws1.getCell('AF' + (i + 4)).value = aData[i].remarks;
		ws1.getCell('AG' + (i + 4)).value = aData[i].gr_received;
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'unbilled_report', callback);
};

module.exports.generateBookingsExcel = function (reportType, aData, clientData, clientId, callback) {
	let reportTypeUnique = [];
	let keyName;

	function filterUniqueType() {
		let tempData = [];
		if (aData && aData.length > 0) {
			for (let u = 0; u < aData.length; u++) {
				if (aData[u][keyName]) {
					if (keyName === "booking_date") {
						let modifiedDate = moment(aData[u][keyName]).format("DD-MM-YYYY");
						tempData.push(modifiedDate);
					} else {
						tempData.push(aData[u][keyName]);
					}
				}
			}
		}
		return tempData.filter(onlyUnique);
	}

	if (reportType === "Booking Type Wise") {
		keyName = "booking_type";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Customer Wise") {
		keyName = "customer_name";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Branch Wise") {
		keyName = "branch";
		reportTypeUnique = filterUniqueType()
	}

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Booking Report');
	formatTitle(ws1, 24, clientData.client_full_name);

	mergeCells(ws1, 3, 24, 'Booking Report - ' + (reportType ? reportType : 'All Bookings'));
	formatColumnHeaders(ws1, 6, [
		'Sl No', 'BookingDateTime', 'BookingNo', 'BranchName', 'CustomerName',
		'RouteName', 'BillingPartyName', 'MaterialType', 'Material Name', 'BookingType',
		'BOENo', 'Shipping Line', 'NoOfContr.InThisBOE', 'NoOfContr.InThisBooking', 'NoOfContr.Open',
		'NoOfContr.Closed', 'ContainerNo', 'Contr.Size', 'ContainerStatus', 'CloseDate',
		'Rate', 'Weight', 'Freight', 'BookingPersonName'
	], [
		7, 25, 15, 22, 22,
		25, 22, 22, 22, 22,
		9, 22, 22, 22, 22,
		22, 15, 22, 22, 25,
		10, 10, 10, 22
	]);

	let rowTotal = 0;
	if (reportTypeUnique.length > 0) {
		for (let t = 0; t < reportTypeUnique.length; t++) {
			mergeCells(ws1, rowTotal + 7, 24, reportTypeUnique[t]);
			for (let i = 0; i < aData.length; i++) {
				if (reportTypeUnique[t] === ((keyName === "booking_date") ? moment(aData[i][keyName]).format("DD-MM-YYYY") : aData[i][keyName])) {
					ws1.getCell('A' + (rowTotal + 8)).value = i + 1;
					ws1.getCell('B' + (rowTotal + 8)).value = moment(aData[i].booking_date).format("DD-MM-YYYY") || "NA";
					ws1.getCell('C' + (rowTotal + 8)).value = aData[i].booking_no || "NA";
					ws1.getCell('D' + (rowTotal + 8)).value = aData[i].branch || "NA";
					ws1.getCell('E' + (rowTotal + 8)).value = aData[i].customer_name || "NA";
					ws1.getCell('F' + (rowTotal + 8)).value = aData[i].route.route_name || "NA";
					ws1.getCell('G' + (rowTotal + 8)).value = aData[i].billing_party_name || "NA";
					ws1.getCell('H' + (rowTotal + 8)).value = aData[i].material_group || "NA";
					ws1.getCell('I' + (rowTotal + 8)).value = aData[i].material_type || "NA";
					ws1.getCell('J' + (rowTotal + 8)).value = aData[i].booking_type || "NA";
					ws1.getCell('K' + (rowTotal + 8)).value = aData[i].boe_no || "NA";
					ws1.getCell('L' + (rowTotal + 8)).value = aData[i].shipping_line_name || "NA";
					ws1.getCell('M' + (rowTotal + 8)).value = aData[i].total_containers || "NA";
					ws1.getCell('N' + (rowTotal + 8)).value = aData[i].no_of_container || "NA";
					ws1.getCell('O' + (rowTotal + 8)).value = aData[i].NoOfContrOpen || "NA";
					ws1.getCell('P' + (rowTotal + 8)).value = aData[i].NoOfContrClosed || "NA";
					ws1.getCell('X' + (rowTotal + 8)).value = aData[i].booking_status.person || "NA";
					if (aData[i].info && aData[i].info.length > 0) {
						for (let j = 0; j < aData[i].info.length; j++) {
							ws1.getCell('Q' + (rowTotal + 8)).value = aData[i].info[j] ? aData[i].info[j].container_no : "NA";
							ws1.getCell('R' + (rowTotal + 8)).value = aData[i].info[j] ? aData[i].info[j].container_type : "NA";
							ws1.getCell('S' + (rowTotal + 8)).value = aData[i].info[j] ? (aData[i].info[j].vehicle_alloted ? "Vehicle Alloted" : "Not Alloted") : "NA";
							ws1.getCell('T' + (rowTotal + 8)).value = aData[i].info[j] ? moment(aData[i].info[j].allocation_date).format("DD-MM-YYYY") : "NA";
							ws1.getCell('U' + (rowTotal + 8)).value = aData[i].info[j] ? aData[i].info[j].rate : "NA";
							ws1.getCell('V' + (rowTotal + 8)).value = aData[i].info[j] ? aData[i].info[j].weight.value : "NA";
							ws1.getCell('W' + (rowTotal + 8)).value = aData[i].info[j] ? aData[i].info[j].freight : "NA";
							rowTotal++;
						}
					} else {
						rowTotal++;
					}
				}
			}
		}
	} else {


		for (let i = 0; i < aData.length; i++) {
			ws1.getCell('A' + (rowTotal + 7)).value = i + 1;
			ws1.getCell('B' + (rowTotal + 7)).value = moment(aData[i].booking_date).format("DD-MM-YYYY") || "NA";
			ws1.getCell('C' + (rowTotal + 7)).value = aData[i].booking_no || "NA";
			ws1.getCell('D' + (rowTotal + 7)).value = aData[i].branch || "NA";
			ws1.getCell('E' + (rowTotal + 7)).value = aData[i].customer_name || "NA";
			ws1.getCell('F' + (rowTotal + 7)).value = aData[i].route.route_name || "NA";
			ws1.getCell('G' + (rowTotal + 7)).value = aData[i].billing_party_name || "NA";
			ws1.getCell('H' + (rowTotal + 7)).value = aData[i].material_group || "NA";
			ws1.getCell('I' + (rowTotal + 7)).value = aData[i].material_type || "NA";
			ws1.getCell('J' + (rowTotal + 7)).value = aData[i].booking_type || "NA";
			ws1.getCell('K' + (rowTotal + 7)).value = aData[i].boe_no || "NA";
			ws1.getCell('L' + (rowTotal + 7)).value = aData[i].Shipping_line || "NA";
			ws1.getCell('M' + (rowTotal + 7)).value = aData[i].total_containers || "NA";
			ws1.getCell('N' + (rowTotal + 7)).value = aData[i].no_of_container || "NA";
			ws1.getCell('O' + (rowTotal + 7)).value = aData[i].NoOfContrOpen || "NA";
			ws1.getCell('P' + (rowTotal + 7)).value = aData[i].NoOfContrClosed || "NA";
			ws1.getCell('X' + (rowTotal + 7)).value = aData[i].booking_status.person || "NA";
			if (aData[i].info && aData[i].info.length > 0) {
				for (let j = 0; j < aData[i].info.length; j++) {
					ws1.getCell('Q' + (rowTotal + 7)).value = aData[i].info[j] ? aData[i].info[j].container_no : "NA";
					ws1.getCell('R' + (rowTotal + 7)).value = aData[i].info[j] ? aData[i].info[j].container_type : "NA";
					ws1.getCell('S' + (rowTotal + 7)).value = aData[i].info[j] ? (aData[i].info[j].vehicle_alloted ? "Vehicle Alloted" : "Not Alloted") : "NA";
					ws1.getCell('T' + (rowTotal + 7)).value = aData[i].info[j] ? moment(aData[i].info[j].allocation_date).format("DD-MM-YYYY") : "NA";
					ws1.getCell('U' + (rowTotal + 7)).value = aData[i].info[j] ? aData[i].info[j].rate : "NA";
					ws1.getCell('V' + (rowTotal + 7)).value = aData[i].info[j] ? aData[i].info[j].weight.value : "NA";
					ws1.getCell('W' + (rowTotal + 7)).value = aData[i].info[j] ? aData[i].info[j].freight : "NA";
					rowTotal++;
				}
			} else {
				rowTotal++;
			}
		}
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'bookings', callback);
};
module.exports.generateInvoiceExcel = function (reportType, oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Bill Dispatch Report');
	formatTitle(ws1, 22, clientData.client_full_name);

	mergeCells(ws1, 3, 22, 'Bill Dispatch Report - ' + (reportType ? reportType : ""));
	formatColumnHeaders(ws1, 6, [
		'Sl No', 'Invoice No', 'Invoice Date', 'Bill No', 'Billed Date', 'Dispatch Date', 'Booking No', 'Trip No', 'BOE No', 'Container No',
		'Branch Name', 'Customer Name', 'Billing Party Name', 'Advance Cash', 'Balance', 'GR No', 'GR Type', 'Route',
		'Vehicle No', 'Vehicle Type', 'Weight', 'Weight Unit'
	], [
		7, 15, 15, 22, 22, 22, 22, 22,
		22, 15, 15, 22, 22, 22, 22, 22,
		22, 22, 22, 22, 22, 22
	]);

	let rowTotal = 6;
	let valueData = oData.value;
	if (oData.name && oData.name.length > 0) {
		for (let i = 0; i < oData.name.length; i++) {
			for (let key in valueData) {
				if (key === oData.name[i]) {
					aValue = valueData[key];
					mergeCells(ws1, ++rowTotal, 22, key);
					rowTotal++;
					if (aValue && aValue.length > 0) {
						for (let j = 0; j < aValue.length; j++) {
							ws1.getCell('A' + rowTotal).value = j + 1;
							ws1.getCell('B' + rowTotal).value = aValue[j].invoice_no;
							ws1.getCell('C' + rowTotal).value = moment(aValue[j].invoice_date).format("DD-MM-YYYY");
							ws1.getCell('D' + rowTotal).value = aValue[j].bill_no;
							ws1.getCell('E' + rowTotal).value = aValue[j].billed_date ? moment(aValue[j].billed_date).format("DD-MM-YYYY") : "NA";
							ws1.getCell('F' + rowTotal).value = aValue[j].dispatch_date ? moment(aValue[j].dispatch_date).format("DD-MM-YYYY") : "NA";
							ws1.getCell('G' + rowTotal).value = aValue[j].booking_no ? aValue[j].booking_no.join() : undefined;
							ws1.getCell('H' + rowTotal).value = aValue[j].trip_no || undefined;
							ws1.getCell('I' + rowTotal).value = aValue[j].boe_no ? aValue[j].boe_no.join() : undefined;
							ws1.getCell('J' + rowTotal).value = aValue[j].container_no ? aValue[j].container_no.join() : undefined;
							ws1.getCell('K' + rowTotal).value = aValue[j].branch;
							ws1.getCell('L' + rowTotal).value = aValue[j].customer_name;
							ws1.getCell('M' + rowTotal).value = aValue[j].billing_party_name;
							ws1.getCell('N' + rowTotal).value = aValue[j].advance;
							ws1.getCell('O' + rowTotal).value = aValue[j].balance;
							ws1.getCell('P' + rowTotal).value = aValue[j].gr_no;
							ws1.getCell('Q' + rowTotal).value = aValue[j].gr_type;
							ws1.getCell('R' + rowTotal).value = aValue[j].route;
							ws1.getCell('S' + rowTotal).value = (aValue[j].m_vehicle_no) ? aValue[j].m_vehicle_no + "(" + aValue[j].veh_no + ")" : (aValue[j].veh_no || "NA");
							ws1.getCell('T' + rowTotal).value = aValue[j].veh_type;
							ws1.getCell('U' + rowTotal).value = aValue[j].weight;
							ws1.getCell('V' + rowTotal).value = aValue[j].weight_unit;
							rowTotal++;
						}
					}
				}
			}
		}
	}


	saveFileAndReturnCallback(workbook, clientId, oData.reportType || 'miscellaneous', 'bill_dispatch', callback);
};
module.exports.generateGeneratedBillsExcel = function (reportType, oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Billing Register Report');
	let pencolor = {bold: false};
	let penBcolor = {color: {argb: 'FF0000FF'}, bold: true};
	let penBUcolor = {color: {argb: 'FF0000FF'}, bold: true, underline: true};
	//(ws, from, to,title,titleCenter,applyBgColor,oFont)
	mergeCellsHandler(ws1, "A1", "AK1", clientData.client_full_name, false, true);
	mergeCellsHandler(ws1, "A2", "AK2", 'Billing Register Report', false, true);

	formatColumnHeaders(ws1, 5, [
		'Sl No', 'Billing Party Name', 'Bill No', 'Billed Date',
		'Customer Name', 'Route Name', 'Booking No', 'Trip No',
		'GR No', 'GR Type', 'Vehicle No', 'Vehicle Type', 'BOE No.',
		'Container No.', 'Container Type', 'No Of Container', 'Weight', 'Weight Unit', 'Payment Basis',
		'Rate', 'Freight', 'GR Charges', 'Loading Charges', 'Unloading Charges',
		'Weightman Charges', 'Fuel Price Hike', 'Other Charges', 'Over Weight Charges',
		'Detention Charges', 'Extra Running', 'Total', 'Advance', 'Balance', 'Billed By', 'Trip Start Date',
		'Trip End Date', 'Remark', 'GR RECEIVED'
	], [
		7, 25, 15, 22, 25, 25, 15, 15, 22, 25, 18, 18, 18, 18, 18, 18, 18, 18, 18,
		18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 25, 15
	]);

	let rowTotal = 6;
	let valueData = oData.value;
	if (oData.name && oData.name.length > 0) {
		for (let i = 0; i < oData.name.length; i++) {
			for (let key in valueData) {
				if (key === oData.name[i]) {
					aValue = valueData[key];
					//++rowTotal
					//mergeCellsHandler(ws1, ("A"+rowTotal), ("AK"+rowTotal), key,false,true);
					//rowTotal++;
					if (aValue && aValue.length > 0) {
						for (let j = 0; j < aValue.length; j++) {
							ws1.getCell('A' + rowTotal).value = rowTotal - 5;
							ws1.getCell('B' + rowTotal).value = aValue[j].billing_party_name || "--";
							ws1.getCell('C' + rowTotal).value = aValue[j].bill_no || "--";
							ws1.getCell('D' + rowTotal).value = moment(aValue[j].billed_date).format("DD-MM-YYYY");
							ws1.getCell('E' + rowTotal).value = aValue[j].customer_name || "--";
							ws1.getCell('F' + rowTotal).value = aValue[j].route || "--";
							ws1.getCell('G' + rowTotal).value = aValue[j].booking_no ? aValue[j].booking_no.join(', ') : "--";
							ws1.getCell('H' + rowTotal).value = aValue[j].trip_no || "--";
							ws1.getCell('I' + rowTotal).value = aValue[j].gr_no || "--";
							ws1.getCell('J' + rowTotal).value = aValue[j].gr_type || "--";
							ws1.getCell('K' + rowTotal).value = (aValue[j].m_vehicle_no) ? aValue[j].m_vehicle_no + "(" + aValue[j].veh_no + ")" : (aValue[j].veh_no || "--");
							ws1.getCell('L' + rowTotal).value = aValue[j].veh_type || "--";
							ws1.getCell('M' + rowTotal).value = aValue[j].boe_no ? aValue[j].boe_no.join(', ') : "--";
							ws1.getCell('N' + rowTotal).value = aValue[j].container_no ? aValue[j].container_no.join(', ') : "--";
							ws1.getCell('O' + rowTotal).value = aValue[j].container_size ? aValue[j].container_size.join(', ') : "--";
							ws1.getCell('P' + rowTotal).value = aValue[j].container_no ? aValue[j].container_no.length : "--";
							ws1.getCell('Q' + rowTotal).value = aValue[j].weight || 0;
							ws1.getCell('R' + rowTotal).value = aValue[j].weight_unit || "--";
							ws1.getCell('S' + rowTotal).value = aValue[j].payment_basis || "--";
							ws1.getCell('T' + rowTotal).value = aValue[j].rate || 0;
							ws1.getCell('U' + rowTotal).value = aValue[j].freight || 0;
							ws1.getCell('V' + rowTotal).value = aValue[j].gr_charges || 0;
							ws1.getCell('W' + rowTotal).value = aValue[j].loading_charges || 0;
							ws1.getCell('X' + rowTotal).value = aValue[j].unloading_charges || 0;
							ws1.getCell('Y' + rowTotal).value = aValue[j].weightman_charges || 0;
							ws1.getCell('Z' + rowTotal).value = aValue[j].fuel_price_hike || 0;
							ws1.getCell('AA' + rowTotal).value = aValue[j].other_charges || 0;
							ws1.getCell('AB' + rowTotal).value = aValue[j].ovr_wt_chrgs || 0;
							ws1.getCell('AC' + rowTotal).value = aValue[j].dtn_amt || 0;
							ws1.getCell('AD' + rowTotal).value = aValue[j].othr_exp || 0;
							ws1.getCell('AE' + rowTotal).value = aValue[j].total || 0;
							ws1.getCell('AF' + rowTotal).value = aValue[j].advance || 0;
							ws1.getCell('AG' + rowTotal).value = aValue[j].balance || 0;
							ws1.getCell('AH' + rowTotal).value = aValue[j].billed_by ? aValue[j].billed_by.name : "--";
							ws1.getCell('AI' + rowTotal).value = moment(aValue[j].trip_start_time).format("DD-MM-YYYY HH:mm");
							ws1.getCell('AJ' + rowTotal).value = moment(aValue[j].trip_end_time).format("DD-MM-YYYY HH:mm");
							ws1.getCell('AK' + rowTotal).value = aValue[j].remarks || "--";
							ws1.getCell('AL' + rowTotal).value = aValue[j].gr_received || "--";
							rowTotal++;
						}
					}
				}
			}
		}
	}


	saveFileAndReturnCallback(workbook, clientId, oData.reportType || 'miscellaneous', 'billing_register', callback);
};
module.exports.generateMaintenanceExpensesExcel = function (reportType, oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Maintenance Expense Report');
	formatTitle(ws1, 11, clientData.client_full_name);

	mergeCells(ws1, 3, 11, 'Maintenance Expense Report' + (reportType ? ' - ' + reportType : ""));
	formatColumnHeaders(ws1, 6,
		oData.header, [
			7, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18
		]);

	let rowTotal = 6;
	let valueData = oData.value;
	if (oData.name && oData.name.length > 0) {
		for (let i = 0; i < oData.name.length; i++) {
			for (let key in valueData) {
				if (key === oData.name[i]) {
					aValue = valueData[key];
					mergeCells(ws1, ++rowTotal, 0, key);
					rowTotal++;
					if (aValue && aValue.length > 0) {
						for (let j = 0; j < aValue.length; j++) {
							ws1.getCell('A' + rowTotal).value = j + 1;
							ws1.getCell('B' + rowTotal).value = aValue[j].bill_no;
							ws1.getCell('C' + rowTotal).value = moment(aValue[j].bill_date).format("DD-MM-YYYY");
							ws1.getCell('D' + rowTotal).value = aValue[j].jobId;
							ws1.getCell('E' + rowTotal).value = aValue[j].branchName;
							ws1.getCell('F' + rowTotal).value = aValue[j].type;
							ws1.getCell('G' + rowTotal).value = aValue[j].vehicle_no;
							ws1.getCell('H' + rowTotal).value = aValue[j].amount || 0;
							ws1.getCell('I' + rowTotal).value = aValue[j].created_by_name;
							ws1.getCell('J' + rowTotal).value = aValue[j].approved_by_name;
							ws1.getCell('K' + rowTotal).value = moment(aValue[j].created_at).format("DD-MM-YYYY");
						}
					}
				}
			}
		}
	}


	saveFileAndReturnCallback(workbook, clientId, oData.reportType || 'miscellaneous', 'maintenance_expense', callback);
};
module.exports.generatePrSlipExcel = function (oData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('PR Slip');
	let pencolor = {bold: false};
	let penBcolor = {color: {argb: 'FF0000FF'}, bold: true};
	let penBUcolor = {color: {argb: 'FF0000FF'}, bold: true, underline: true};
	//(ws, from, to,title,titleCenter,applyBgColor,oFont)
	mergeCellsHandler(ws1, "A1", "N1", oData.client_full_name, true, true);
	mergeCellsHandler(ws1, "A2", "N2", "Material Indent Request Form – " + oData.client_full_name, true, true);
	mergeCellsHandler(ws1, "A3", "N3", "To,", false, false, penBcolor);
	mergeCellsHandler(ws1, "A4", "N4", "        Officer in Charge, Purchase Division, For Maple", false, false, penBcolor);

	mergeCellsHandler(ws1, "B6", "C6", "Indent Detail", false, false, penBUcolor);
	mergeCellsHandler(ws1, "E6", "F6", "Purchase Type", false, false, penBUcolor);
	mergeCellsHandler(ws1, "H6", "I6", "Priority", false, false, penBUcolor);
	mergeCellsHandler(ws1, "K6", "N6", "Minimum Time of Delivery", false, false, penBUcolor);


	mergeCellsHandler(ws1, "B7", "C7", "PR No: " + oData.prnumber, false, false, pencolor);
	mergeCellsHandler(ws1, "B8", "C8", "PR Date: " + moment(oData.created_at).format("DD-MM-YYYY"), false, false, pencolor);
	mergeCellsHandler(ws1, "B9", "C9", "Department: " + (oData.department || 'Store'), false, false, pencolor);
	mergeCellsHandler(ws1, "B10", "C10", "Concern Person: " + oData.pr_created_by_name, false, false, pencolor);


	mergeCellsHandler(ws1, "E7", "F7", "Regular: Yes", false, false, pencolor);
	mergeCellsHandler(ws1, "E8", "F8", "Emergency ", false, false, pencolor);
	mergeCellsHandler(ws1, "E9", "F9", "For ", false, false, pencolor);

	mergeCellsHandler(ws1, "H7", "I7", "M/ Urgent", false, ((oData.spare && (oData.spare.length > 0) && (oData.spare[0].priority === "High")) ? true : false), pencolor);
	mergeCellsHandler(ws1, "H8", "I8", "Urgent ", false, ((oData.spare && (oData.spare.length > 0) && (oData.spare[0].priority === "Medium")) ? true : false), pencolor);
	mergeCellsHandler(ws1, "H9", "I9", "Normal ", false, ((oData.spare && (oData.spare.length > 0) && (oData.spare[0].priority === "Low")) ? true : false), pencolor);

	mergeCellsHandler(ws1, "K7", "N7", "36 Hours to 03 days", false, ((oData.spare && (oData.spare.length > 0) && (oData.spare[0].priority === "High")) ? true : false), pencolor);
	mergeCellsHandler(ws1, "K8", "N8", "Within 02 to 10 Working Days", false, ((oData.spare && (oData.spare.length > 0) && (oData.spare[0].priority === "Medium")) ? true : false), pencolor);
	mergeCellsHandler(ws1, "K9", "N9", "Within 03 to 10 Working Days", false, ((oData.spare && (oData.spare.length > 0) && (oData.spare[0].priority === "Low")) ? true : false), pencolor);

	mergeCellsHandler(ws1, "K10", "N10", "Needed Date: " + ((oData.spare && (oData.spare.length > 0) && (oData.spare[0].needed_date)) ? moment(oData.needed_date).format("DD-MM-YYYY") : ""), false, false, pencolor);

	mergeCellsHandler(ws1, "A12", "N12", "Item wise Detail of Required Material", false, false, penBcolor);

	formatColumnHeaders(ws1, 13, ['SL No.', 'Item', 'Reqd. For Veh. Make', 'UOM', 'Priority', 'Physical Stock in Hand', 'Required', 'Brand', 'Last Purchase Price', 'Last Purchase Qty.', 'Last Purchase Date', 'Availability Date', 'Concern Vendor Name', 'Remark'], [15, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	let aData = oData.spare;
	let rowNum = 13;
	for (let i = 0; i < aData.length; i++) {
		++rowNum;
		ws1.getCell('A' + rowNum).value = i + 1;
		ws1.getCell('B' + rowNum).value = aData[i].name + ' / ' + aData[i].code;
		ws1.getCell('C' + rowNum).value = aData[i].vehicle_make || "NA";
		ws1.getCell('D' + rowNum).value = aData[i].uom || "NA";
		ws1.getCell('E' + rowNum).value = aData[i].priority || "NA";
		ws1.getCell('F' + rowNum).value = aData[i].inStockQty || "NA";
		ws1.getCell('G' + rowNum).value = aData[i].quantity || "NA";
		ws1.getCell('H' + rowNum).value = aData[i].brand || "Unknown";
		ws1.getCell('I' + rowNum).value = aData[i].previousRate || 0;
		ws1.getCell('J' + rowNum).value = aData[i].previousDate ? moment(aData[i].previousDate).format("DD-MM-YYYY") : "NA";
		ws1.getCell('K' + rowNum).value = aData[i].previousQty || 0;
		ws1.getCell('L' + rowNum).value = aData[i].needed_date ? moment(aData[i].needed_date).format("DD-MM-YYYY") : "NA";
		ws1.getCell('M' + rowNum).value = aData[i].previousVendorName || "NA";
		ws1.getCell('N' + rowNum).value = aData[i].remark || "NA";
	}

	let lastRow = 16 + aData.length;
	mergeCellsHandler(ws1, "A" + lastRow, "D" + lastRow, "Requested By", true, true);
	mergeCellsHandler(ws1, "A" + (lastRow + 1), "D" + (lastRow + 1), oData.pr_created_by_name, true, false);

	mergeCellsHandler(ws1, "E" + lastRow, "H" + lastRow, "Checked By", true, true);
	mergeCellsHandler(ws1, "E" + (lastRow + 1), "H" + (lastRow + 1), "(Works Manager/AVP Tech )", true, false);

	mergeCellsHandler(ws1, "I" + lastRow, "N" + lastRow, "Approved By", true, true);
	mergeCellsHandler(ws1, "I" + (lastRow + 1), "N" + (lastRow + 1), oData.approver.name, true, false);

	saveFileAndReturnCallback(workbook, clientId, oData.reportType || 'miscellaneous', 'PrSlip', callback);
};
module.exports.generateSAPBillsExcel = function (reportType, oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('SAP Billing Register Report');
	let pencolor = {bold: false};
	let penBcolor = {color: {argb: 'FF0000FF'}, bold: true};
	let penBUcolor = {color: {argb: 'FF0000FF'}, bold: true, underline: true};
	//(ws, from, to,title,titleCenter,applyBgColor,oFont)
	mergeCellsHandler(ws1, "A1", "Y1", 'Maple Logistic Private Limited', false, true);
	mergeCellsHandler(ws1, "A2", "Y2", 'SAP Customer Billing Report', false, true);


	formatColumnHeaders(ws1, 5, [
		'SN', 'Bill Date', 'Document Type', 'Company Code', 'Posting Date', 'Currency Key', 'Reference Document Number', 'Posting Key',
		'Customer Name', 'Customer code', 'Payment Terms', 'Amount', 'Tax Code', 'GR No', 'Route Name', 'Profit Center', 'GL Number', 'Trip No',
		'Vehicle No', 'BOE No.', 'Weight', 'Weight Unit', 'Branch', 'Driver Name', 'Driver Code'
	], [
		15, 22, 25, 25, 15, 15, 22, 25, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18
	]);

	let rowTotal = 6;
	let aValue = oData.name;
	for (let j = 0; j < aValue.length; j++) {
		ws1.getCell('A' + rowTotal).value = rowTotal - 5;
		ws1.getCell('B' + rowTotal).value = moment(aValue[j].billed_date).format("DD-MM-YYYY");
		ws1.getCell('C' + rowTotal).value = 'DR';
		ws1.getCell('D' + rowTotal).value = 3200;
		ws1.getCell('E' + rowTotal).value = moment(new Date()).format("DD-MM-YYYY");
		ws1.getCell('F' + rowTotal).value = 'INR';
		ws1.getCell('G' + rowTotal).value = aValue[j].bill_no;
		ws1.getCell('H' + rowTotal).value = 51;
		ws1.getCell('I' + rowTotal).value = aValue[j].billing_party_name || "--";
		ws1.getCell('J' + rowTotal).value = aValue[j].sap_id;
		ws1.getCell('K' + rowTotal).value = 'Z001';
		ws1.getCell('L' + rowTotal).value = aValue[j].total_expenses || 0;
		if (aValue[j].tax_code === 'no tax') {
			ws1.getCell('M' + rowTotal).value = '';
		} else {
			ws1.getCell('M' + rowTotal).value = aValue[j].tax_code;
		}
		ws1.getCell('N' + rowTotal).value = aValue[j].gr_no || "--";
		ws1.getCell('O' + rowTotal).value = aValue[j].booking_info[0].route || "--";
		ws1.getCell('P' + rowTotal).value = aValue[j].profit_center;
		ws1.getCell('Q' + rowTotal).value = 0030026000; //check it
		ws1.getCell('R' + rowTotal).value = aValue[j].booking_info[0].trip_no;
		ws1.getCell('S' + rowTotal).value = aValue[j].vehicle_no + "/" + aValue[j].vehicle_sap_id;
		ws1.getCell('T' + rowTotal).value = aValue[j].boe_no ? aValue[j].boe_no.join(', ') : '';
		ws1.getCell('U' + rowTotal).value = aValue[j].weight || 0;
		ws1.getCell('V' + rowTotal).value = 'TON';
		ws1.getCell('W' + rowTotal).value = aValue[j].branch;
		ws1.getCell('X' + rowTotal).value = aValue[j].driver_name;
		ws1.getCell('Y' + rowTotal).value = aValue[j].driver_sap_id;
		rowTotal++;
	}


	saveFileAndReturnCallback(workbook, '100003', 'SAP', 'SAP_customer_bills', callback);
};
module.exports.generateSAPExpenseExcel = function (reportType, oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('SAP Expense Report');
	let pencolor = {bold: false};
	let penBcolor = {color: {argb: 'FF0000FF'}, bold: true};
	let penBUcolor = {color: {argb: 'FF0000FF'}, bold: true, underline: true};
	//(ws, from, to,title,titleCenter,applyBgColor,oFont)
	mergeCellsHandler(ws1, "A1", "V1", 'Maple Logistic Private Limited', false, true);
	mergeCellsHandler(ws1, "A2", "V2", 'SAP Expense Report', false, true);
	formatColumnHeaders(ws1, 5, [
		'SN', 'Trip End Date', 'Trip Start Date', 'Posting Date', 'Trip No', 'Total Amount', 'Driver Cash', 'Diesel Amount',
		'Total Code', 'Total GL', 'Diesel Code', 'Disel GL', 'Driver Cash Code', 'Driver GL', 'GR No', 'Diesel Liter', 'Route',
		'Profit Center', 'Vehicle No', 'Branch', 'Driver Name', 'Driver Code'
	], [
		5, 12, 12, 12, 10, 12, 12, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15
	]);

	let rowTotal = 6;
	let aValue = oData.name;
	for (let j = 0; j < aValue.length; j++) {
		ws1.getCell('A' + rowTotal).value = rowTotal - 5;
		ws1.getCell('B' + rowTotal).value = moment(aValue[j].trip_end.time).format("DD-MM-YYYY h:mm a");
		ws1.getCell('C' + rowTotal).value = moment(aValue[j].trip_start.time).format("DD-MM-YYYY h:mm a");
		ws1.getCell('D' + rowTotal).value = moment(new Date()).format("DD-MM-YYYY h:mm a");
		ws1.getCell('E' + rowTotal).value = aValue[j].trip_no;
		ws1.getCell('F' + rowTotal).value = (aValue[j].diesel_expenses_total_price || 0) + (aValue[j].driver_cash || 0);
		ws1.getCell('G' + rowTotal).value = aValue[j].driver_cash || 0;
		ws1.getCell('H' + rowTotal).value = aValue[j].diesel_expenses_total_price || 0;
		let gr_no;
		if (aValue[j].gr_nos && aValue[j].gr_nos[0]) {
			gr_no = aValue[j].gr_nos[0];
		} else if (aValue[j].gr && aValue[j].gr[0]) {
			gr_no = aValue[j].gr[0].gr_no;
		} else {
			gr_no = 0;
		}
		ws1.getCell('I' + rowTotal).value = 31;
		ws1.getCell('J' + rowTotal).value = 0000700514;
		ws1.getCell('K' + rowTotal).value = 40; //for driver cash
		ws1.getCell('L' + rowTotal).value = 0040206005; //GL
		ws1.getCell('M' + rowTotal).value = 40; //for diesel
		ws1.getCell('N' + rowTotal).value = 0040206000; //GL
		ws1.getCell('O' + rowTotal).value = gr_no;
		ws1.getCell('P' + rowTotal).value = aValue[j].diesel_expenses_total_litre || 0;
		ws1.getCell('Q' + rowTotal).value = aValue[j].route_name;
		ws1.getCell('R' + rowTotal).value = aValue[j].profit_center;
		ws1.getCell('S' + rowTotal).value = aValue[j].vehicle_no;
		ws1.getCell('T' + rowTotal).value = aValue[j].branch;
		ws1.getCell('U' + rowTotal).value = aValue[j].driver_name;
		ws1.getCell('V' + rowTotal).value = aValue[j].driver_sap_id || "Market Driver";
		rowTotal++;
	}
	saveFileAndReturnCallback(workbook, '100003', 'SAP', 'SAP_Trip_Epenses', callback);
};
module.exports.generateSAPBillsExcelOld = function (reportType, oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('SAP Billing Register Report');
	let pencolor = {bold: false};
	let penBcolor = {color: {argb: 'FF0000FF'}, bold: true};
	let penBUcolor = {color: {argb: 'FF0000FF'}, bold: true, underline: true};
	//(ws, from, to,title,titleCenter,applyBgColor,oFont)
	mergeCellsHandler(ws1, "A1", "Y1", 'Maple Logistic Private Limited', false, true);
	mergeCellsHandler(ws1, "A2", "Y2", 'SAP Customer Billing Report', false, true);


	formatColumnHeaders(ws1, 5, [
		'SN', 'Bill Date', 'Document Type', 'Company Code', 'Posting Date', 'Currency Key', 'Reference Document Number', 'Posting Key',
		'Customer Name', 'Customer code', 'Payment Terms', 'Amount', 'Tax Code', 'GR No', 'Route Name', 'Profit Center', 'GL Number', 'Trip No',
		'Vehicle No', 'BOE No.', 'Weight', 'Weight Unit', 'Branch', 'Driver Name', 'Driver Code'
	], [
		15, 22, 25, 25, 15, 15, 22, 25, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18
	]);

	let rowTotal = 6;
	let aValue = oData.name;
	for (let j = 0; j < aValue.length; j++) {
		ws1.getCell('A' + rowTotal).value = rowTotal - 5;
		ws1.getCell('B' + rowTotal).value = moment(aValue[j].billed_date).format("DD-MM-YYYY");
		ws1.getCell('C' + rowTotal).value = 'DR';
		ws1.getCell('D' + rowTotal).value = 3200;
		ws1.getCell('E' + rowTotal).value = moment(new Date()).format("DD-MM-YYYY");
		ws1.getCell('F' + rowTotal).value = 'INR';
		ws1.getCell('G' + rowTotal).value = aValue[j].bill_no;
		ws1.getCell('H' + rowTotal).value = 51;
		ws1.getCell('I' + rowTotal).value = aValue[j].billing_party_name || "--";
		ws1.getCell('J' + rowTotal).value = aValue[j].sap_id;
		ws1.getCell('K' + rowTotal).value = 'Z001';
		ws1.getCell('L' + rowTotal).value = aValue[j].total_expense || 0;
		if (aValue[j].tax_code === 'no tax') {
			ws1.getCell('M' + rowTotal).value = '';
		} else {
			ws1.getCell('M' + rowTotal).value = aValue[j].tax_code;
		}
		ws1.getCell('N' + rowTotal).value = aValue[j].gr_no || "--";
		ws1.getCell('O' + rowTotal).value = aValue[j].booking_info[0].route || "--";
		ws1.getCell('P' + rowTotal).value = aValue[j].profit_center;
		ws1.getCell('Q' + rowTotal).value = 0030026000; //check it
		ws1.getCell('R' + rowTotal).value = aValue[j].trip_no;
		ws1.getCell('S' + rowTotal).value = aValue[j].vehicle_no;
		ws1.getCell('T' + rowTotal).value = aValue[j].boe_no ? aValue[j].boe_no.join(', ') : '';
		ws1.getCell('U' + rowTotal).value = aValue[j].weight || 0;
		ws1.getCell('V' + rowTotal).value = 'TON';
		ws1.getCell('W' + rowTotal).value = aValue[j].branch;
		ws1.getCell('X' + rowTotal).value = aValue[j].driver_name;
		ws1.getCell('Y' + rowTotal).value = aValue[j].driver_sap_id;
		rowTotal++;
	}


	saveFileAndReturnCallback(workbook, '100003', 'SAP', 'SAP_customer_bills', callback);
};
module.exports.generateSAPExpenseExcelOld = function (reportType, oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('SAP Billing Register Report');
	let pencolor = {bold: false};
	let penBcolor = {color: {argb: 'FF0000FF'}, bold: true};
	let penBUcolor = {color: {argb: 'FF0000FF'}, bold: true, underline: true};
	//(ws, from, to,title,titleCenter,applyBgColor,oFont)
	mergeCellsHandler(ws1, "A1", "AA1", 'Maple Logistic Private Limited', false, true);
	mergeCellsHandler(ws1, "A2", "AA2", 'SAP Customer Billing Report', false, true);


	formatColumnHeaders(ws1, 5, [
		'SN', 'Bill Date', 'Document Type', 'Company Code', 'Posting Date', 'Currency Key', 'Reference Document Number', 'Posting Key',
		'Account MatchCode', 'Amount', 'Payment Term', 'Assigment/GR No', 'Route Name', 'Vendor Posting Key', 'GL Number', 'Amount',
		'Profit Center', 'Assigment/ GR No', 'Item Text/Route', 'Profit Center', 'Trip No', 'Vehicle No', 'Weight', 'Weight Unit',
		'Branch', 'Driver Name', 'Driver Code'
	], [
		15, 22, 25, 25, 15, 15, 22, 25, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18
	]);

	let rowTotal = 6;
	let aValue = oData.name;
	for (let j = 0; j < aValue.length; j++) {
		ws1.getCell('A' + rowTotal).value = rowTotal - 5;
		ws1.getCell('B' + rowTotal).value = moment(aValue[j].trip_end.time).format("DD-MM-YYYY");
		ws1.getCell('C' + rowTotal).value = 'KR';
		ws1.getCell('D' + rowTotal).value = 3200;
		ws1.getCell('E' + rowTotal).value = moment(new Date()).format("DD-MM-YYYY");
		ws1.getCell('F' + rowTotal).value = 'INR';
		ws1.getCell('G' + rowTotal).value = aValue[j].trip_no;
		ws1.getCell('H' + rowTotal).value = 31;
		ws1.getCell('I' + rowTotal).value = 0000700514;
		ws1.getCell('J' + rowTotal).value = aValue[j].diesel_expenses_total_price || 0;
		ws1.getCell('K' + rowTotal).value = 'Z001'; //ZTERM
		let gr_no;
		if (aValue[j].gr_nos && aValue[j].gr_nos[0]) {
			gr_no = aValue[j].gr_nos[0];
		} else if (aValue[j].gr && aValue[j].gr[0]) {
			gr_no = aValue[j].gr[0].gr_no;
		} else {
			gr_no = 0;
		}
		ws1.getCell('L' + rowTotal).value = gr_no;
		ws1.getCell('M' + rowTotal).value = aValue[j].route_name;
		ws1.getCell('N' + rowTotal).value = 40; //for diesel
		ws1.getCell('O' + rowTotal).value = 0040206000; //GL
		ws1.getCell('P' + rowTotal).value = aValue[j].diesel_expenses_total_price || 0;
		ws1.getCell('Q' + rowTotal).value = aValue[j].profit_center;
		ws1.getCell('R' + rowTotal).value = gr_no;
		ws1.getCell('S' + rowTotal).value = "DISEL EXPENSE";
		ws1.getCell('T' + rowTotal).value = aValue[j].profit_center;
		ws1.getCell('U' + rowTotal).value = aValue[j].trip_no;
		ws1.getCell('V' + rowTotal).value = aValue[j].vehicle_no;
		ws1.getCell('W' + rowTotal).value = aValue[j].diesel_expenses_total_litre || 0;
		ws1.getCell('X' + rowTotal).value = 'TON';
		ws1.getCell('Y' + rowTotal).value = aValue[j].branch;
		ws1.getCell('Z' + rowTotal).value = aValue[j].driver_name;
		ws1.getCell('AA' + rowTotal).value = aValue[j].driver_sap_id || "Market Driver";
		rowTotal++;

		ws1.getCell('A' + rowTotal).value = rowTotal - 5;
		ws1.getCell('B' + rowTotal).value = moment(aValue[j].trip_end.time).format("DD-MM-YYYY");
		ws1.getCell('C' + rowTotal).value = 'KR';
		ws1.getCell('D' + rowTotal).value = 3200;
		ws1.getCell('E' + rowTotal).value = moment(new Date()).format("DD-MM-YYYY");
		ws1.getCell('F' + rowTotal).value = 'INR';
		ws1.getCell('G' + rowTotal).value = aValue[j].trip_no;
		ws1.getCell('H' + rowTotal).value = 31;
		ws1.getCell('I' + rowTotal).value = 0000700514;
		ws1.getCell('J' + rowTotal).value = aValue[j].driver_cash || 0;
		ws1.getCell('K' + rowTotal).value = 'Z001'; //ZTERM
		ws1.getCell('L' + rowTotal).value = gr_no;
		ws1.getCell('M' + rowTotal).value = aValue[j].route_name;
		ws1.getCell('N' + rowTotal).value = 40; //for diesel
		ws1.getCell('O' + rowTotal).value = 0040206005; //GL
		ws1.getCell('P' + rowTotal).value = aValue[j].driver_cash || 0;
		ws1.getCell('Q' + rowTotal).value = aValue[j].profit_center;
		ws1.getCell('R' + rowTotal).value = gr_no;
		ws1.getCell('S' + rowTotal).value = "DRIVER CASH EXPENSE";
		ws1.getCell('T' + rowTotal).value = aValue[j].profit_center;
		ws1.getCell('U' + rowTotal).value = aValue[j].trip_no;
		ws1.getCell('V' + rowTotal).value = aValue[j].vehicle_no;
		ws1.getCell('W' + rowTotal).value = 0;
		ws1.getCell('X' + rowTotal).value = 'TON';
		ws1.getCell('Y' + rowTotal).value = aValue[j].branch;
		ws1.getCell('Z' + rowTotal).value = aValue[j].driver_name;
		ws1.getCell('AA' + rowTotal).value = aValue[j].driver_sap_id || "Market Driver";
		rowTotal++;

	}
	saveFileAndReturnCallback(workbook, '100003', 'SAP', 'SAP_Trip_Epenses', callback);
};

module.exports.generateQuotationExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Quotation Report');
	formatTitle(ws1, 11, 'Quotation Report');
	formatColumnHeaders(ws1, 3, ['Quote No.', 'Quote Date', 'Status', 'Customer name', 'Customer Id', 'Total amount', 'Tax', 'Address', 'Approver', 'Approval date'], [15, 15, 25, 20, 20, 15, 15, 30, 20, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].quot_number || "";
		ws1.getCell('B' + (i + 4)).value = aData[i].quot_date ? (dateUtil.getDDMMYYYY(aData[i].quot_date)) : "";
		ws1.getCell('C' + (i + 4)).value = aData[i].quot_status;
		ws1.getCell('D' + (i + 4)).value = aData[i].customer.name || "NA";
		ws1.getCell('E' + (i + 4)).value = aData[i].customer.customerId || "NA";
		ws1.getCell('F' + (i + 4)).value = aData[i].total || "";
		ws1.getCell('G' + (i + 4)).value = aData[i].total_tax || "";
		ws1.getCell('H' + (i + 4)).value = parseOaddressToString(aData[i].address);
		ws1.getCell('I' + (i + 4)).value = aData[i].quot_approver ? aData[i].quot_approver.full_name : "";
		ws1.getCell('J' + (i + 4)).value = aData[i].quot_approval_date ? dateUtil.getDDMMYYYY(aData[i].quot_approval_date) : "";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'quotation', callback);
};


module.exports.generateSOExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('SO Report');
	formatTitle(ws1, 11, 'SO Report');
	formatColumnHeaders(ws1, 3, ['SO No.', 'SO Date', 'Status', 'Customer name', 'Customer Id', 'Total amount', 'Tax', 'Address', 'Approver', 'Approval date'], [15, 15, 20, 25, 15, 20, 15, 30, 20, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].so_number || "";
		ws1.getCell('B' + (i + 4)).value = aData[i].so_date ? (dateUtil.getDDMMYYYY(aData[i].so_date)) : "";
		ws1.getCell('C' + (i + 4)).value = aData[i].status;
		ws1.getCell('D' + (i + 4)).value = aData[i].customer ? aData[i].customer.name : "";
		ws1.getCell('E' + (i + 4)).value = aData[i].customer ? aData[i].customer.customerId : "";
		ws1.getCell('F' + (i + 4)).value = aData[i].total || "";
		ws1.getCell('G' + (i + 4)).value = aData[i].total_tax || "";
		ws1.getCell('H' + (i + 4)).value = parseOaddressToString(aData[i].billing_address);
		ws1.getCell('I' + (i + 4)).value = aData[i].approver ? aData[i].approver.name : "";
		ws1.getCell('J' + (i + 4)).value = aData[i].approved_by_date ? dateUtil.getDDMMYYYY(aData[i].approved_by_date) : "";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'so', callback);
};

module.exports.generateGPSInventoryExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GPS Inventory Report');
	formatTitle(ws1, 11, 'GPS Inventory Report');
	formatColumnHeaders(ws1, 3, [
		'IMEI Number',
		'GPS Category',
		'Stock Status',
		'Health Status',
		'Allocation Status',
		'Vendor',
		'PO No.',
		'Billing Amount',
		'Purchase Invoice',
		'Purchase Date',
		'Sell Invoice',
		'Sell Date',
		'Activation Date',
		'Expiry Date'
	], [15, 15, 20, 25, 15, 20, 15, 30, 20, 15, 20, 20, 20, 20]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = aData[i].imei || "";
		ws1.getCell('B' + (i + 4)).value = aData[i].part_ref.name;
		ws1.getCell('C' + (i + 4)).value = aData[i].stock_status;
		ws1.getCell('D' + (i + 4)).value = aData[i].health_status;
		ws1.getCell('E' + (i + 4)).value = aData[i].allocation_status;
		ws1.getCell('F' + (i + 4)).value = aData[i].purchased_from_vendor.name;
		ws1.getCell('G' + (i + 4)).value = aData[i].po_number;
		ws1.getCell('H' + (i + 4)).value = aData[i].billing_amount;
		ws1.getCell('I' + (i + 4)).value = aData[i].purchase_invoice_no;
		ws1.getCell('J' + (i + 4)).value = aData[i].purchase_date ? dateUtil.getDDMMYYYY(aData[i].purchase_date) : "";
		ws1.getCell('K' + (i + 4)).value = aData[i].sell_invoice_no;
		ws1.getCell('L' + (i + 4)).value = aData[i].sell_date ? dateUtil.getDDMMYYYY(aData[i].sell_date) : "";
		ws1.getCell('M' + (i + 4)).value = aData[i].activation_date ? dateUtil.getDDMMYYYY(aData[i].activation_date) : "";
		ws1.getCell('N' + (i + 4)).value = aData[i].expiry_date ? dateUtil.getDDMMYYYY(aData[i].expiry_date) : "";
	}
	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'gpsInventory', callback);
};

module.exports.generateSOInvoiceExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Invoice Report (SO)');
	formatTitle(ws1, 11, 'Invoice Report (SO)');
	formatColumnHeaders(ws1, 3, ['S. No.', 'Invoice No.', 'Invoice Date', 'SO No.', 'Status', 'Customer name', 'Customer Id', 'Total amount', 'Tax', 'Address', 'Approver', 'Approval date'], [15, 15, 15, 15, 20, 25, 15, 20, 15, 30, 20, 15]);

	for (let i = 0; i < aData.length; i++) {
		ws1.getCell('A' + (i + 4)).value = i + 1;
		ws1.getCell('B' + (i + 4)).value = aData[i].invoice_no || "";
		ws1.getCell('C' + (i + 4)).value = aData[i].invoice_date ? (dateUtil.getDDMMYYYY(aData[i].invoice_date)) : "";
		ws1.getCell('D' + (i + 4)).value = aData[i].items ? (aData[i].items[0].so_number ? aData[i].items[0].so_number : "") : "";
		ws1.getCell('E' + (i + 4)).value = aData[i].status;
		ws1.getCell('F' + (i + 4)).value = aData[i].customer.name || "";
		ws1.getCell('G' + (i + 4)).value = aData[i].customer.customerId || "";
		ws1.getCell('H' + (i + 4)).value = aData[i].total || "";
		ws1.getCell('I' + (i + 4)).value = aData[i].total_tax || "";
		ws1.getCell('J' + (i + 4)).value = parseOaddressToString(aData[i].billing_address);
		ws1.getCell('K' + (i + 4)).value = aData[i].approver ? aData[i].approver.name : "";
		ws1.getCell('L' + (i + 4)).value = aData[i].approved_by_date ? dateUtil.getDDMMYYYY(aData[i].approved_by_date) : "";
	}

	saveFileAndReturnCallback(workbook, clientId, aData.reportType || 'miscellaneous', 'soInvoice', callback);
};

function calculateDiesel(aTrips) {
	let totalDiesel = 0;
	let totalExtraDiesel = 0;
	if (aTrips && aTrips.length > 0) {
		for (let j = 0; j < aTrips.length; j++) {
			if (aTrips[j].trip_expenses && aTrips[j].trip_expenses.length > 0) {
				let totalExpenseDiesel = 0;
				let totalExpenseExtraDiesel = 0;
				for (let k = 0; k < aTrips[j].trip_expenses.length; k++) {
					let oExpense = aTrips[j].trip_expenses[k];
					if (oExpense.type === "Diesel") {
						totalExpenseDiesel = totalExpenseDiesel + (oExpense.diesel_info && oExpense.diesel_info.litre ? oExpense.diesel_info.litre : 0)
					}
					if (oExpense.type === "Extra Diesel") {
						totalExpenseExtraDiesel = totalExpenseExtraDiesel + (oExpense.diesel_info && oExpense.diesel_info.litre ? oExpense.diesel_info.litre : 0)
					}
				}
				totalDiesel = totalDiesel + totalExpenseDiesel;
				totalExtraDiesel = totalExtraDiesel + totalExpenseExtraDiesel;
				aTrips[j]["totalExpenseDiesel"] = totalExpenseDiesel;
				aTrips[j]["totalExpenseExtraDiesel"] = totalExpenseExtraDiesel;
			}
		}
	}
	return {aTrips: aTrips, totalTripDiesel: totalDiesel, totalTripExtraDiesel: totalExtraDiesel};
}

module.exports.generate_report_fleet_owner = function (oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('SUMMARY REPORT');
	let header1 = ["SL. NO.", "GROUP", "ALLOT VEHICLE", "TRIP(TODAY)", "TRIP(CUMULATIVE)", "HSD(TODAY)", "HSD(CUMULATIVE)", "HSD(EXTRA)", "WORKING PROGRESS",
		"AVERAGE(HSD)", "AVERAGE(TRIP)", "Trip Per Veh", "WORKING DAYS", "REPORT STATUS"];

	let header2 = ["SL. NO.", "VEHICLE NO.", "ROUTE", "TRIP(TODAY)", "TRIP(CUMULATIVE)", "HSD(TODAY)", "HSD(CUMULATIVE)", "HSD(OPENING)",
		"HSD(CLOSING)", "HSD(MISC)", "AVERAGE(TRIP)", "AVERAGE(HSD)", "Extra HSD Taken", "WORKING DAYS"];

	formatTitle(ws1, header1.length, moment(new Date()).format("DD-MM-YYYY") + "                                           " + "SUMMARY REPORT");
	formatColumnHeaders(ws1, 3, header1, [7, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);

	let rowNum = 4;
	let aData = oData.owner_trips;

	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["SL. NO."] = i + 1;
		row["GROUP"] = aData[i]._id.toString();
		row["ALLOT VEHICLE"] = aData[i].count || 0;
		row["TRIP(TODAY)"] = aData[i].aTodaysTrips.length || 0;
		row["TRIP(CUMULATIVE)"] = aData[i].aTrips.length || 0;
		row["HSD(TODAY)"] = ((aData[i].totalTodayTripDiesel || 0) + (aData[i].totalTodayTripExtraDiesel || 0));
		row["HSD(CUMULATIVE)"] = ((aData[i].totalTripDiesel || 0) + (aData[i].totalTripExtraDiesel || 0));
		row["HSD(EXTRA)"] = aData[i].totalTripExtraDiesel || 0;
		row["WORKING PROGRESS"] = (aData[i].count > 0 && oData.workingDays > 0) ? parseFloat(((aData[i].aTrips.length * 100) / (aData[i].count * oData.workingDays)).toFixed(2)) : 0;
		row["AVERAGE(HSD)"] = (aData[i].aTrips.length > 0) ? parseFloat((aData[i].totalTripDiesel / aData[i].aTrips.length).toFixed(2)) : 0;
		row["AVERAGE(TRIP)"] = (oData.workingDays > 0) ? parseFloat((aData[i].aTrips.length / oData.workingDays).toFixed(2)) : 0;
		row["Trip Per Veh"] = (aData[i].count > 0) ? parseFloat((aData[i].aTrips.length / aData[i].count).toFixed(2)) : 0;
		row["WORKING DAYS"] = oData.workingDays || 0;
		row["REPORT STATUS"] = "RECEIVED";

		addWorkbookRow(row, ws1, header1, rowNum++, false);


		let ws2 = workbook.addWorksheet(aData[i]._id);
		mergeCellsHandler(ws2, "A1", "N1", moment(new Date()).format("DD-MM-YYYY") + "                                      " + "DAILY TRIP REPORT WITH HSD");
		mergeCellsHandler(ws2, "A2", "N2", ('GROUP : ' + aData[i]._id), true);
		formatColumnHeaders(ws2, 3, header2, [7, 20, 33, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
		let rowGroupNum = 4;
		if (aData[i].aVehicle && aData[i].aVehicle.length > 0) {
			for (let j = 0; j < aData[i].aVehicle.length; j++) {

				let matchedTrips = aData[i].aTrips.filter(function (element) {
					return element.vehicle_no === aData[i].aVehicle[j];
				});
				let matchedTodaysTrips = aData[i].aTodaysTrips.filter(function (element) {
					return element.vehicle_no === aData[i].aVehicle[j];
				});

				let rowGroup = {};
				rowGroup["SL. NO."] = j + 1;
				rowGroup["VEHICLE NO."] = aData[i].aVehicle[j];
				rowGroup["ROUTE"] = matchedTrips.reduce(function (acc, c) {
					if (c.route_name) {
						return acc = (acc ? acc + ", " : acc) + c.route_name
					} else {
						return acc
					}
				}, "").split(', ').filter(onlyUnique).join(', ');
				rowGroup["TRIP(TODAY)"] = matchedTodaysTrips.length || 0;
				rowGroup["TRIP(CUMULATIVE)"] = matchedTrips.length || 0;
				rowGroup["Extra HSD Taken"] = calculateDiesel(matchedTrips).totalTripExtraDiesel;
				rowGroup["HSD(TODAY)"] = ((calculateDiesel(matchedTodaysTrips).totalTripDiesel || 0) + (calculateDiesel(matchedTodaysTrips).totalTripExtraDiesel || 0));
				rowGroup["HSD(CUMULATIVE)"] = ((calculateDiesel(matchedTrips).totalTripDiesel) + (rowGroup["Extra HSD Taken"] || 0));
				rowGroup["HSD(OPENING)"] = 0;
				rowGroup["HSD(CLOSING)"] = 0;
				rowGroup["HSD(MISC)"] = 0;
				rowGroup["AVERAGE(TRIP)"] = (oData.workingDays > 0) ? parseFloat((matchedTrips.length / oData.workingDays).toFixed(2)) : 0;
				rowGroup["AVERAGE(HSD)"] = (matchedTrips.length > 0) ? parseFloat(((calculateDiesel(matchedTodaysTrips).totalTripDiesel) / matchedTrips.length).toFixed(2)) : 0;

				rowGroup["WORKING DAYS"] = oData.workingDays || 0;

				if (j === (aData[i].aVehicle.length - 1)) {
					addWorkbookRow(rowGroup, ws2, header2, rowGroupNum++, false);
					let lastRow = {};
					//mergeCellsHandler(ws2, "A"+(rowGroupNum+1), "C"+(rowGroupNum+1), (aData[i].aTodaysTrips.length || 0), true);
					//mergeCellsHandler(ws2, "A"+(rowGroupNum+1), "C"+(rowGroupNum+1), (aData[i].aTodaysTrips.length || 0), true);
					lastRow["SL. NO."] = "Total";
					lastRow["TRIP(TODAY)"] = aData[i].aTodaysTrips.length || 0;
					lastRow["TRIP(CUMULATIVE)"] = aData[i].aTrips.length || 0;
					lastRow["Extra HSD Taken"] = aData[i].totalTripExtraDiesel || 0;
					lastRow["HSD(TODAY)"] = ((aData[i].totalTodayTripDiesel || 0) + (aData[i].totalTodayTripExtraDiesel || 0));
					lastRow["HSD(CUMULATIVE)"] = ((aData[i].totalTripDiesel || 0) + lastRow["Extra HSD Taken"]);
					lastRow["HSD(OPENING)"] = 0;
					lastRow["HSD(CLOSING)"] = 0;
					lastRow["HSD(MISC)"] = 0;
					lastRow["AVERAGE(TRIP)"] = (oData.workingDays > 0) ? parseFloat((aData[i].aTrips.length / oData.workingDays).toFixed(2)) : 0;
					lastRow["AVERAGE(HSD)"] = (aData[i].aTrips.length > 0) ? parseFloat((aData[i].totalTodayTripDiesel / aData[i].aTrips.length).toFixed(2)) : 0;

					addWorkbookRow(lastRow, ws2, header2, rowGroupNum++, false);

				} else {
					addWorkbookRow(rowGroup, ws2, header2, rowGroupNum++, false);
				}


			}
		}
		mergeCellsHandler(ws2, "A" + (rowGroupNum + 1), "N" + (rowGroupNum + 1), "NOTE: Here it is pertinent to mention that if the closing stock is 0 of any vehicle then the excess quantity of taken diesel will be shown in \"Extra HSD Taken\" column without \"Opening-Balance\" of the concerned vehicle.");

	}

	let lastTotalRow = {};
	lastTotalRow["GROUP"] = "Total";
	lastTotalRow["ALLOT VEHICLE"] = oData.totalVehicle;
	lastTotalRow["TRIP(TODAY)"] = oData.totalTodayTrips;
	lastTotalRow["TRIP(CUMULATIVE)"] = oData.totalTrips;
	lastTotalRow["HSD(TODAY)"] = (oData.totalTodayHSD + oData.totalTodayExtraDiesel);
	lastTotalRow["HSD(CUMULATIVE)"] = (oData.totalHSD + oData.totalTripExtraDiesel);
	lastTotalRow["WORKING PROGRESS"] = parseFloat(((oData.totalTrips * 100) / (oData.totalVehicle * oData.workingDays)).toFixed(2));
	lastTotalRow["HSD(EXTRA)"] = oData.totalTripExtraDiesel;
	lastTotalRow["AVERAGE(HSD)"] = parseFloat(((oData.totalHSD) / (oData.totalTrips)).toFixed(2));
	lastTotalRow["AVERAGE(TRIP)"] = parseFloat(((oData.totalTrips) / (oData.workingDays)).toFixed(2));
	lastTotalRow["Trip Per Veh"] = parseFloat(((oData.totalTrips) / (oData.totalVehicle)).toFixed(2));

	addWorkbookRow(lastTotalRow, ws1, header1, ++rowNum, false);
	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'generate_report_fleet_owner', callback);
};

function calculateChallan(aTrips, key, comparison) {
	let total = 0;
	for (let oTrip of aTrips) {
		if (oTrip.trip && oTrip.trip.gr && oTrip.trip.gr.length > 0) {
			for (let oGR of oTrip.trip.gr) {
				if (comparison) {
					let l_net_w = Number.isFinite(oGR["l_net_w"]) ? oGR["l_net_w"] : 0;
					let ul_net_w = Number.isFinite(oGR["ul_net_w"]) ? oGR["ul_net_w"] : 0;
					total = total + Math.min(l_net_w, ul_net_w)
				} else if (Number.isFinite(oGR[key])) {
					total = total + oGR[key]
				}
			}
		}
	}
	return total;
}


module.exports.report_diesel_escalation = function (oData, clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Diesel Escalation');
	let header1 = ["SL. NO.", "Date", "No of Trucks", "Route", "Challan Qty(MT)", "Received Qty(MT)", "GRN Qty", "TM", "Normalized Qty",
		"BASE RATE", "Increased Rate", "%Increase in Diesel Price", "Formula= 0.37* %Increase in Diesel Price*Transportation",
		"Escalation Amount"];
	formatTitle(ws1, header1.length, clientData.client_full_name);
	formatColumnHeaders(ws1, 6, header1, [7, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);

	let rowNum = 7;
	let aData = oData.aModifiedData;

	let totalTrucks = 0;
	let totalChallanQty = 0;
	let totalReceivedQty = 0;
	let totalGRNQty = 0;

	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["SL. NO."] = i + 1;
		row["Date"] = aData[i].date;
		row["No of Trucks"] = aData[i].no_of_trucks;
		row["Route"] = oData.contract.mine_name;
		row["Challan Qty(MT)"] = (aData[i].total_chalan_qty || 0);
		totalChallanQty = totalChallanQty + row["Challan Qty(MT)"];

		row["Received Qty(MT)"] = aData[i].total_received_qty || 0;
		totalReceivedQty = totalReceivedQty + row["Received Qty(MT)"];

		row["GRN Qty"] = aData[i].total_grn_qty || 0;
		totalGRNQty = totalGRNQty + row["GRN Qty"];

		row["TM"] = aData[i].main_actual_moisture || 0;

		row["Normalized Qty"] = (row["GRN Qty"] > aData[i].main_estimated_moisture) ? (row["GRN Qty"] * (100 - row["TM"])) / (100 - aData[i].main_estimated_moisture) : row["GRN Qty"];
		row["BASE RATE"] = oData.contract.diesel_base_price || 0;

		row["Increased Rate"] = Number.isFinite(aData[i].total_diesel_value_amt / aData[i].total_diesel_value_ltr) ? aData[i].total_diesel_value_amt / aData[i].total_diesel_value_ltr : 0;


		row["%Increase in Diesel Price"] = Number.isFinite(((row["Increased Rate"] - row["BASE RATE"]) * 100) / row["BASE RATE"]) ? ((row["Increased Rate"] - row["BASE RATE"]) * 100) / row["BASE RATE"] : 0;
		row["Formula= 0.37* %Increase in Diesel Price*Transportation"] = Number.isFinite(0.37 * (row["%Increase in Diesel Price"] / 100) * aData[i].main_pmt_rate) ? 0.37 * (row["%Increase in Diesel Price"] / 100) * aData[i].main_pmt_rate : 0;
		//Escalation Amount : base rate + base rate*Formula %
		row["Escalation Amount"] = Number.isFinite(row["Formula= 0.37* %Increase in Diesel Price*Transportation"] * row["Normalized Qty"]) ? row["Formula= 0.37* %Increase in Diesel Price*Transportation"] * row["Normalized Qty"] : 0;

		addWorkbookRow(row, ws1, header1, rowNum++, false);
	}

	let lastRow = {};
	lastRow["SL. NO."] = "Total";
	lastRow["Challan Qty(MT)"] = totalChallanQty;
	lastRow["Received Qty(MT)"] = totalReceivedQty;
	lastRow["GRN Qty"] = totalGRNQty;
	addWorkbookRow(lastRow, ws1, header1, ++rowNum, false);

	ws1.getCell('A3').value = "CLIENT:";
	ws1.getCell('A3').font = {bold: true};
	ws1.getCell('B3').value = oData.customerName || "";
	ws1.getCell('B3').font = {bold: true};

	ws1.getCell('D3').value = "DO Number:";
	ws1.getCell('D3').font = {bold: true};
	ws1.getCell('E3').value = oData.do_number;
	ws1.getCell('E3').font = {bold: true};
	ws1.getCell('E3').alignment = {horizontal: 'right'};

	ws1.getCell('D4').value = "Alloted Qty:";
	ws1.getCell('D4').font = {bold: true};
	ws1.getCell('E4').value = (oData.contract && oData.contract.totalWeight) ? oData.contract.totalWeight : 0;
	ws1.getCell('E4').font = {bold: true};

	ws1.getCell('G3').value = "PO No. :";
	ws1.getCell('G3').font = {bold: true};
	ws1.getCell('H3').value = (oData.aData && oData.aData[0] && oData.aData[0].aBooking && oData.aData[0].aBooking[0]) ? oData.aData[0].aBooking[0].po_number : "";
	ws1.getCell('H3').font = {bold: true};

	ws1.getCell('G4').value = "Plant:";
	ws1.getCell('G4').font = {bold: true};
	ws1.getCell('H4').value = (oData.aData && oData.aData[0] && oData.aData[0].contract && oData.aData[0].contract[0]) ? oData.aData[0].contract[0].mine_name : "";
	ws1.getCell('H4').font = {bold: true};

	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'report_diesel_escalation', callback);
};

module.exports.generateCreditDebitExcel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Credit/Debit Notes');
	formatTitle(ws1, 2, "Credit/Debit Report");
	let headers = ["GSTIN/UIN", "Type of note", "No.1", "Date1", "No.2", "Date2", "Diff Value", "IRate", "IAmount",
		"CRate", "CAmount", "SRate", "SAmount"];
	let rowNum = 6;
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	mergeCellsHandler(ws1, "C3", "D3", 'Debit/Credit', false, false);
	mergeCellsHandler(ws1, "H3", "M3", 'Differential Tax', false, false);
	mergeCellsHandler(ws1, "E3", "F3", 'Original Invoice', false, false);

	for (let i = 0; i < aData.data.length; i++) {
		let row = {};
		row["GSTIN/UIN"] = aData.data[i].billingParty[0].gstin_no;
		row["Type of note"] = aData.data[i].dcNotes ? aData.data[i].dcNotes.voucherType : "NA";
		row["No.1"] = aData.data[i].dcNotes ? aData.data[i].dcNotes.vouchers[0].vId : "NA";
		row["Date1"] = aData.data[i].dcNotes ? dateUtil.getDDMMYYYY(aData.data[i].dcNotes.date) : "NA";
		row["No.2"] = aData.data[i].actualBillNo || "NA";
		row["Date2"] = aData.data[i].billDate ? dateUtil.getDDMMYYYY(aData.data[i].billDate) : "NA";
		row["Diff Value"] = (aData.data[i].totalAmount || 0 + aData.data[i].dcNotes ? aData.data[i].dcNotes.netAmount : 0) || "NA";
		row["IRate"] = aData.data[i].iGST_percent || "NA";
		row["IAmount"] = aData.data[i].dcNotes ? aData.data[i].dcNotes.iGST : "NA";
		row["CRate"] = aData.data[i].cGST_percent || "NA";
		row["CAmount"] = aData.data[i].dcNotes ? aData.data[i].dcNotes.cGST : "NA";
		row["SRate"] = aData.data[i].sGST_percent || "NA";
		row["SAmount"] = aData.data[i].dcNotes ? aData.data[i].dcNotes.sGST : "NA";


		addWorkbookRow(row, ws1, headers, (rowNum++));
	}


	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'Credit and Debit', callback);
};

module.exports.generateGSTR1Excel = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('GSTR1');
	let headers = ["GSTIN/UIN", "No.", "Date", "Value", "Goods/Services", "HSN/SAC", "Taxable", "IRate", "IAmount", "CRate",
		"CAmount", "SRate", "SAmount", "Place of Supply", "Indicate Reverse Charges", "Provisional Tax Assessment", "GSTIN-Ecommerce"];
	let rowNum = 6;
	formatTitle(ws1, 2, "GSTR1 Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 25, 20, 15, 10, 15, 10, 15, 10, 15, 20, 20, 20, 20]);
	mergeCellsHandler(ws1, "B3", "G3", 'INVOICE', false, false);
	mergeCellsHandler(ws1, "H3", "I3", 'IGST', false, false);
	mergeCellsHandler(ws1, "J3", "K3", 'CGST', false, false);
	mergeCellsHandler(ws1, "L3", "M3", 'SGST', false, false);

	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["GSTIN/UIN"] = aData[i].billingParty.gstin_no || "NA";
		row["No."] = aData[i].actualBillNo || "NA";
		row["Date"] = aData[i].billDate;
		row["Value"] = "As per Invoice";
		row["Goods/Services"] = "Transport";
		row["HSN/SAC"] = "9967";
		row["Taxable"] = aData[i].cGST || 0 + aData[i].sGST || 0 + aData[i].iGST || 0;
		row["IRate"] = aData[i].iGST_percent || "NA";
		row["IAmount"] = aData[i].iGST || "NA";
		row["CRate"] = aData[i].cGST_percent || "NA";
		row["CAmount"] = aData[i].cGST || "NA";
		row["SRate"] = aData[i].sGST_percent || "NA";
		row["SAmount"] = aData[i].sGST || "NA";
		row["Place of Supply"] = aData[i].billingParty.gstin_no ? aData[i].billingParty.gstin_no.substring(0, 2) : "NA";
		row["Indicate Reverse Charges"] = "Yes";
		row["Provisional Tax Assessment"] = " ";
		row["GSTIN-Ecommerce"] = " ";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}


	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'GSTR1', callback);
};

module.exports.trackingVehicleWiseReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Vehicle Wise Report');
	formatTitle(ws1, 9, 'Vehicle Wise Report');
	formatColumnHeaders(ws1, 3, [
		"TRIP NO.",
		"VEHICLE NO.",
		"ROUTE NAME",
		"ROUTE DISTANCE",
		"DISTANCE TRAVELLED (KM)",
		"DISTANCE REMAINING (KM)",
		"LOADING ENDED DATE",
		"STATUS",
		"LAST KNOWN ADDRESS",
		"LAST KNOWN DATE & TIME",
		"ESTIMATED ARRIVAL",
		"CURRENT ETA",
		'VEHICLE ARRIVAL FOR UNLOADING'
	], [15, 20, 18, 15, 15, 15, 20, 15, 20, 15, 15, 15, 15]);

	aData.forEach((obj, i) => {
		const row = i + 4;
		try {
			ws1.getCell('A' + row).value = obj.vehicle.trip.trip_no || "NA";
		} catch (e) {
			ws1.getCell('A' + row).value = 'NA';
		}
		try {
			ws1.getCell('B' + row).value = obj.vehicle.vehicle_reg_no || "NA";
		} catch (e) {
			ws1.getCell('B' + row).value = 'NA';
		}
		try {
			ws1.getCell('C' + row).value = obj.vehicle.route.name || "NA";
		} catch (e) {
			ws1.getCell('C' + row).value = 'NA';
		}
		try {
			ws1.getCell('D' + row).value = obj.vehicle.route.route_distance || "NA";
		} catch (e) {
			ws1.getCell('D' + row).value = 'NA';
		}
		try {
			ws1.getCell('E' + row).value = obj.distance_travelled || "NA";
		} catch (e) {
			ws1.getCell('E' + row).value = 'NA';
		}
		try {
			ws1.getCell('F' + row).value = (obj.vehicle.route.route_distance - obj.distance_travelled);
		} catch (e) {
			ws1.getCell('F' + row).value = 'NA';
		}
		try {
			ws1.getCell('G' + row).value = moment(obj.vehicle.gr.loading_ended_status.date).format("DD-MM-YYYY h:mma") || "NA";
		} catch (e) {
			ws1.getCell('G' + row).value = 'NA';
		}
		try {
			ws1.getCell('H' + row).value = obj.t_status || "NA";
		} catch (e) {
			ws1.getCell('H' + row).value = 'NA';
		}
		try {
			ws1.getCell('I' + row).value = moment(obj.vehicle.gpsData.datetime).format("DD-MM-YYYY h:mma") || 'NA';
		} catch (e) {
			ws1.getCell('I' + row).value = 'NA';
		}
		try {
			ws1.getCell('J' + row).value = obj.vehicle.gpsData.address || 'NA';
		} catch (e) {
			ws1.getCell('J' + row).value = 'NA';
		}
		try {
			ws1.getCell('L' + row).value = obj.expected_eta ? moment(obj.expected_eta).format("DD-MM-YYYY h:mma") : 'NA';
		} catch (e) {
			ws1.getCell('L' + row).value = 'NA';
		}
		try {
			ws1.getCell('M' + row).value = obj.current_eta ? moment(obj.current_eta).format("DD-MM-YYYY h:mma") : 'NA';
		} catch (e) {
			ws1.getCell('M' + row).value = 'NA';
		}

		try {
			ws1.getCell('O' + row).value = obj.vehicle && obj.vehicle.gr && obj.vehicle.gr.vehicle_arrived_for_unloading_status ? moment(obj.vehicle.gr.vehicle_arrived_for_unloading_status.date).format("DD-MM-YYYY h:mma") : 'NA';
		} catch (e) {
			ws1.getCell('O' + row).value = 'NA';
		}
	});

	saveFileAndReturnCallback(workbook, clientId, 'Vehicle', 'vehicleWiseReport', callback);
};

module.exports.generateVehicleExcel = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Registered Vehicles');

	let headers = ["veh_reg_no", "Imei", "Model", "Manufacturer", "status", "group", "type", "category",
		"capacity", "segment", "engine no", "chasis no", "mileage", "rpk", "Id"];
	let rowNum = 6;
	formatTitle(ws1, 2, "Regsitered Vehicles");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["veh_reg_no"] = aData[i].vehicle_reg_no || "NA";
		row["Imei"] = aData[i].device_imei || "NA";
		row["Model"] = aData[i].model || "NA";
		row["Manufacturer"] = aData[i].manufacturer || "NA";
		row["status"] = aData[i].status || "NA";
		row["group"] = aData[i].veh_group_name || "NA";
		row["type"] = aData[i].veh_type_name || "NA";
		row["category"] = aData[i].category || "NA";
		row["capacity"] = aData[i].capacity_tonne || "NA";
		row["segment"] = aData[i].segment_type || "NA";
		row["engine no"] = aData[i].engine_no || "NA";
		row["chasis no"] = aData[i].chassis_no || "NA";
		row["mileage"] = aData[i].current_budget ? aData[i].current_budget.mileage : "NA";
		row["rpk"] = aData[i].current_budget ? aData[i].current_budget.rpk : "NA";
		row["Id"] = aData[i]._id.toString();


		addWorkbookRow(row, ws1, headers, (rowNum++));
	}


	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'Registered Vehicles', callback);

};

module.exports.generateBill2BillExcel = function (aData, from_date, to_date, clientId, callback) {
	var workbook = new Excel.Workbook();
	var ws1 = workbook.addWorksheet('Bill to Bill Report');
	let header = ['Sr No',
		...(!aData.aggregateBy || aData.aggregateBy !== 'account' ? ['Account'] : []),
		'Date', 'Bill No', 'Bill Amount', 'Paid Amount', 'Net Balance', 'Narration', 'Due Date', 'Over Due Days'];
	formatTitle(ws1, header.length, 'Bill to Bill Report');
	formatColumnHeaders(ws1, 5, header, [7, ...(!aData.aggregateBy || aData.aggregateBy !== 'account' ? [50] : []),
		12, 17, 12, 12, 12, 90]);
	var rowNum = 6;
	var lastAggValue = "", lastAggRow;
	var agg = aData.aggregateBy;
	let aggTotalBillAmount = 0, aggTotalPaidAmount = 0, aggTotalBalanceAmount = 0;
	let totalBillAmount = 0, totalPaidAmount = 0, totalBalanceAmount = 0;
	for (var i = 0; i < aData.data.length; i++) {
		if (agg === 'account') {
			if ((lastAggValue == "" || lastAggValue != (aData.data[i].account.ledger_name || aData.data[i].account.name))) {
				if (lastAggValue !== "") {
					mergeCells(ws1, lastAggRow, 1, (aggTotalBillAmount) || '0', header.indexOf('Bill Amount'));
					mergeCells(ws1, lastAggRow, 1, (aggTotalPaidAmount) || '0', header.indexOf('Paid Amount'));
					mergeCells(ws1, lastAggRow, 1, (aggTotalBalanceAmount) || '0', header.indexOf('Net Balance'));
					mergeCells(ws1, lastAggRow, 3, ' ', header.indexOf('Narration'));
				}
				aggTotalBillAmount = 0;
				aggTotalPaidAmount = 0;
				aggTotalBalanceAmount = 0;
				lastAggValue = (aData.data[i].account.ledger_name || aData.data[i].account.name);
				lastAggRow = rowNum;
				mergeCells(ws1, rowNum++, 3, lastAggValue);
			}
		} else if (agg === 'date') {
			if ((lastAggValue == "" || lastAggValue != (moment(new Date(aData.data[i].date)).format("DD-MM-YYYY")))) {
				if (lastAggValue !== "") {
					mergeCells(ws1, lastAggRow, 1, (aggTotalBillAmount) || '0', header.indexOf('Bill Amount'));
					mergeCells(ws1, lastAggRow, 1, (aggTotalPaidAmount) || '0', header.indexOf('Paid Amount'));
					mergeCells(ws1, lastAggRow, 1, (aggTotalBalanceAmount) || '0', header.indexOf('Net Balance'));
					mergeCells(ws1, lastAggRow, 3, ' ', header.indexOf('Narration'));
				}
				aggTotalBillAmount = 0;
				aggTotalPaidAmount = 0;
				aggTotalBalanceAmount = 0;
				lastAggValue = (moment(new Date(aData.data[i].date)).format("DD-MM-YYYY"));
				lastAggRow = rowNum;
				mergeCells(ws1, rowNum++, 4, lastAggValue);
			}
		} else if (agg != null && (lastAggValue == "" || lastAggValue != aData.data[i][agg])) {
			if (lastAggValue !== "") {
				mergeCells(ws1, lastAggRow, 1, (aggTotalBillAmount) || '0', header.indexOf('Bill Amount'));
				mergeCells(ws1, lastAggRow, 1, (aggTotalPaidAmount) || '0', header.indexOf('Paid Amount'));
				mergeCells(ws1, lastAggRow, 1, (aggTotalBalanceAmount) || '0', header.indexOf('Net Balance'));
				mergeCells(ws1, lastAggRow, 3, ' ', header.indexOf('Narration'));
			}
			aggTotalBillAmount = 0;
			aggTotalPaidAmount = 0;
			aggTotalBalanceAmount = 0;
			lastAggValue = aData.data[i][agg];
			lastAggRow = rowNum;
			mergeCells(ws1, rowNum++, 7, lastAggValue);
		}
		var row = {};
		row['Sr No'] = i + 1;
		row['Account'] = aData.data[i].lName || aData.data[i].laName || "NA";
		row['Date'] = moment(new Date(aData.data[i].date)).format("DD-MM-YYYY") || 'NA';
		row['Bill No'] = aData.data[i]._id.billNo || "NA";
		row['Bill Amount'] = (aData.data[i].billAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || 0;
		row['Paid Amount'] = isNaN(aData.data[i].receivedAmount) ? '0' : (aData.data[i].receivedAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		// let netBal = isNaN(row['Bill Amount'] - row['Paid Amount']) ? '0' : (row['Bill Amount'] - row['Paid Amount']) ;
		// row['Net Balance'] = isNaN(row['Bill Amount'] - row['Paid Amount']) ? '0' : (row['Bill Amount'] - row['Paid Amount']).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") ;
		let netBal = ((aData.data[i].billAmount || 0) - (aData.data[i].receivedAmount || 0)) || 0;
		row['Net Balance'] = (aData.data[i].billAmount && aData.data[i].receivedAmount) ? ((aData.data[i].billAmount || 0) - (aData.data[i].receivedAmount || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : (aData.data[i].billAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		row['Narration'] = aData.data[i].narration || "NA";
		row['Due Date'] = moment(new Date(aData.data[i].dueDate || aData.data[i].date)).format("DD-MM-YYYY");
		row['Over Due Days'] = Math.ceil(parseInt(dateUtil.getDateDifferece(new Date(aData.data[i].dueDate || aData.data[i].date), new Date(), 'day') * 100) / 100);
		aggTotalBillAmount += aData.data[i].billAmount || 0;
		aggTotalPaidAmount += aData.data[i].receivedAmount || 0;
		aggTotalBalanceAmount += netBal;
		totalBillAmount += aData.data[i].billAmount || 0;
		totalPaidAmount += aData.data[i].receivedAmount || 0;
		totalBalanceAmount += netBal;
		addWorkbookRow(row, ws1, header, rowNum++, false);

	}
	if (lastAggValue !== "") {
		mergeCells(ws1, lastAggRow, 1, (aggTotalBillAmount) || '0', header.indexOf('Bill Amount'));
		mergeCells(ws1, lastAggRow, 1, (aggTotalPaidAmount) || '0', header.indexOf('Paid Amount'));
		mergeCells(ws1, lastAggRow, 1, (aggTotalBalanceAmount) || '0', header.indexOf('Net Balance'));
		mergeCells(ws1, lastAggRow, 3, ' ', header.indexOf('Narration'));
	}
	mergeCells(ws1, 3, header.length,
		`From: ${moment(new Date(from_date)).format("DD-MM-YYYY") || 'NA'}
		 ,   To: ${moment(new Date(to_date)).format("DD-MM-YYYY") || 'NA'}
		 ,   Net Bill Amount: ${parseFloat(totalBillAmount).toFixed(2)}
		 ,   Net Paid Amount: ${parseFloat(totalPaidAmount).toFixed(2)}
		 ,   Net Balance Amount: ${parseFloat(totalBalanceAmount).toFixed(2)}`
	);
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'bill2bill', callback);
};
module.exports.generateFPAExcel = function (aData, clientId, pdf, callback) {
	var workbook = new Excel.Workbook();
	var ws1 = workbook.addWorksheet('FPA Report', {
		pageSetup: {paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0}
	});
	ws1.pageSetup.showGridLines = true;
	let header1 = ['Date'];//
	formatColumnHeaders(ws1, 2, header1, [50]);//
	mergeCells(ws1, 2, 11, 'Date:' + moment(new Date()).format("DD-MM-YYYY"));
	//mergeCells(ws1, 3, 2, moment(new Date()).format("DD-MM-YYYY"));//
	//
	//formatTitle(ws1, 1, moment(new Date()).format("DD-MM-YYYY"));
	//ws1.getCell(2 + 4).value =new Date();
	//Cells(2, 4).Value = new Date();
	// let dateE=new Date();//
	// let d={};
	// d['Date']=d[0].dateE;
	// console.log(d['Date'])
	// addWorkbookRow(d, ws1, header1, (rowNum++));
	let header = ['FPA No', 'FPA Date', 'CR Account', 'CN No', 'CN Date', 'Bill No', 'Billing Party', 'Vehicle No', 'Route', 'Total', 'FPA Amount'];
	formatTitle(ws1, header.length, 'FPA Report');
	formatColumnHeaders(ws1, 4, header, [10, 10, 30, 10, 10, 12, 25, 15, 20, 20, 20]);
	mergeCells(ws1, 5, 9, 'Net Total');
	var rowNum = 6;
	var lastOwnerValue = "", lastOwnerRow, lastVehicleValue = "", lastVehicleRow;
	let ownerTotal = 0, ownerFPA = 0, vehicleTotal = 0, vehicleFPA = 0;
	let netTotal = 0, netFPA = 0;
	let lNameColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: '00cc66'
		}
	};
	let vehicleColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'CCCCCC'
		}
	};
	for (var i = 0; i < aData.length; i++) {

		if ((lastOwnerValue === "" || lastOwnerValue !== aData[i].ledgers.lName)) {
			if (lastOwnerValue !== "") {
				mergeCells(ws1, lastOwnerRow, 1, parseFloat(ownerTotal.toFixed(2) || 0), header.indexOf('Total'), {
					fill: lNameColor,
					numFmt: '#,##0'
				});
				mergeCells(ws1, lastOwnerRow, 1, parseFloat(ownerFPA.toFixed(2) || 0), header.indexOf('FPA Amount'), {
					fill: lNameColor,
					numFmt: '#,##0'
				});
			}
			ownerTotal = 0;
			ownerFPA = 0;
			lastOwnerValue = aData[i].ledgers.lName;
			lastOwnerRow = rowNum;
			mergeCells(ws1, rowNum++, 9, lastOwnerValue, 0, {fill: lNameColor});
		}
		if ((lastVehicleValue === "" || lastVehicleValue !== aData[i].vehicle_no)) {
			if (lastVehicleValue !== "") {
				mergeCells(ws1, lastVehicleRow, 1, parseFloat(vehicleTotal.toFixed(2) || 0), header.indexOf('Total'), {
					fill: vehicleColor,
					numFmt: '#,##0'
				});
				mergeCells(ws1, lastVehicleRow, 1, parseFloat(vehicleFPA.toFixed(2) || 0), header.indexOf('FPA Amount'), {
					fill: vehicleColor,
					numFmt: '#,##0'
				});
			}
			vehicleTotal = 0;
			vehicleFPA = 0;
			lastVehicleValue = aData[i].vehicle_no;
			lastVehicleRow = rowNum;
			mergeCells(ws1, rowNum++, 9, lastVehicleValue, 0, {fill: vehicleColor});
		}
		var row = {};
		if (i == 0) {
			row['Date'] = moment().format("DD-MM-YYYY") || '';
		}
		row['FPA No'] = aData[i].refNo || '';
		row['FPA Date'] = moment(new Date(aData[i].date)).format("DD-MM-YYYY") || '';
		row['CR Account'] = aData[i].ledgers && aData[i].ledgers.lName || '';
		row['CN No'] = aData[i].grNumber || '';
		row['CN Date'] = moment(new Date(aData[i].grDate)).format("DD-MM-YYYY") || '';
		row['Bill No'] = aData[i].bill || '';
		row['Billing Party'] = aData[i].billingParty || '';
		row['Vehicle No'] = aData[i].vehicle_no || '';
		row['Route'] = aData[i].route || '';
		row['Total'] = parseFloat(aData[i].totalFreight.toFixed(2) || 0);
		row['FPA Amount'] = parseFloat(aData[i].fpaAmount.toFixed(2) || 0);
		ownerTotal += row['Total'];
		ownerFPA += row['FPA Amount'];
		vehicleTotal += row['Total'];
		vehicleFPA += row['FPA Amount'];
		netTotal += row['Total'];
		netFPA += row['FPA Amount'];
		addWorkbookRow(row, ws1, header, rowNum++, false, {
			numFmt: {
				'Total': '#,##0',
				'FPA Amount': '#,##0'
			}
		});

	}
	if (lastOwnerValue !== "") {
		mergeCells(ws1, lastOwnerRow, 1, parseFloat(ownerTotal.toFixed(2) || 0), header.indexOf('Total'), {
			fill: lNameColor,
			numFmt: '#,##0'
		});
		mergeCells(ws1, lastOwnerRow, 1, parseFloat(ownerFPA.toFixed(2) || 0), header.indexOf('FPA Amount'), {
			fill: lNameColor,
			numFmt: '#,##0'
		});
	}

	if (lastVehicleValue !== "") {
		mergeCells(ws1, lastVehicleRow, 1, parseFloat(vehicleTotal.toFixed(2) || 0), header.indexOf('Total'), {
			fill: vehicleColor,
			numFmt: '#,##0'
		});
		mergeCells(ws1, lastVehicleRow, 1, parseFloat(vehicleFPA.toFixed(2) || 0), header.indexOf('FPA Amount'), {
			fill: vehicleColor,
			numFmt: '#,##0'
		});
	}
	mergeCells(ws1, 5, 1, parseFloat(netTotal.toFixed(2) || 0), header.indexOf('Total'), {numFmt: '#,##0'});
	mergeCells(ws1, 5, 1, parseFloat(netFPA.toFixed(2) || 0), header.indexOf('FPA Amount'), {numFmt: '#,##0'});
	saveFileAndReturnCallback(workbook, clientId, aData.aggregateBy || 'miscellaneous', 'fpa', callback);
};


module.exports.generateDriverExcel = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Registered Drivers');

	let headers = ["name", "code", "license_no", "age", "employee_status", "father_name", "religion", "gender",
		"blood_group", "marital_status", "Id"];
	let rowNum = 6;
	formatTitle(ws1, 2, "Regsitered Drivers");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["name"] = aData[i].name || "NA";
		row["code"] = aData[i].employee_code || "NA";
		row["license_no"] = aData[i].license_no || "NA";
		row["age"] = aData[i].age || "NA";
		row["employee_status"] = aData[i].employee_status || "NA";
		row["father_name"] = aData[i].father_name || "NA";
		row["religion"] = aData[i].religion || "NA";
		row["gender"] = aData[i].gender || "NA";
		row["blood_group"] = aData[i].blood_group || "NA";
		row["marital_status"] = aData[i].marital_status || "NA";
		row["Id"] = aData[i]._id.toString();

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}


	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'Registered Drivers', callback);

};

module.exports.generateRoutesExcel = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Transport Routes');

	let headers = ["Name", "Distance", "Id"];
	let rowNum = 6;
	formatTitle(ws1, 2, "Transport Routes");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15]);
	for (let i = 0; i < aData.length; i++) {
		let row = {};
		row["Name"] = aData[i].name || "NA";
		row["Distance"] = aData[i].route_distance || "NA";
		row["Id"] = aData[i]._id.toString();

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}


	saveFileAndReturnCallback(workbook, clientId, 'miscellaneous', 'Transport Routes', callback);
};

module.exports.reportTripAdvance = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Advance');

	let headers = [
		"Allocation Date",
		"Trip No.",
		"Trip Status",
		"Consignor",
		"Vehicle No.",
		"Ownership",
		"Driver Name",
		"Driver No.",
		"Route",
		"Route Km",
		'Budget Amt/Diesel(L)',
		'Advance Amt/Diesel(L)',
		// "Internal Freight",
		"Intial Profit",
		"Initial Profit Margin",
		"Actual Expense",
		"Actual Profit",
		"Vendor Name",
		"Trip Start Date",
		"Loading Date",
		"Unloading Date",
		"Trip End Date",
		"Last Update Time",
		"Id",
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Trip Advance Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 12, 15, 20, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 17, 15]);

	aData.forEach(obj => {

		let row = {};

		row["Allocation Date"] = moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Trip Status"] = obj.status || 'NA';
		row["Consignor"] = obj.gr && obj.gr[0] && obj.gr[0].consignor && obj.gr[0].consignor.name || 'NA';
		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["Ownership"] = obj.ownershipType || 'NA';
		row["Driver Name"] = (obj.driver && obj.driver.name) || (obj.vehicle && obj.vehicle.driver_name) || "NA";
		row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		row["Route"] = obj.route ? obj.route.name : 'NA';
		row["Route Km"] = obj.route ? obj.route.route_distance : 'NA';
		row['Budget Amt/Diesel(L)'] = (obj.netBudget ? obj.netBudget.toFixed(2) : 0) + ' / ' + (obj.dieselBudgetLtr || 0) + '(L)';
		row['Advance Amt/Diesel(L)'] = (obj.tAdv.toFixed(2) || 0) + " / " + (obj.dieselGivenLtr || 0) + "(L)";
		// row["Internal Freight"] = obj.internal_freight;
		row["Intial Profit"] = obj.intial_profit;
		row["Initial Profit Margin"] = obj.initial_profit_margin;
		row["Actual Expense"] = obj.actual_expense;
		row["Actual Profit"] = obj.actual_profit;
		row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";

		for (let j = 0; j < obj.statuses.length; j++) {
			let key = obj.statuses[j].status;
			switch (key) {
				case 'Trip started':
					row["Trip Start Date"] = moment(new Date(obj.statuses[j].date)).format("DD-MM-YYYY") || 'NA';
					break;
				case 'Trip ended':
					row["Trip End Date"] = moment(new Date(obj.statuses[j].date)).format("DD-MM-YYYY") || 'NA';
					break;
			}
		}
		if (obj.gr && obj.gr[0]) {
			for (let j = 0; j < obj.gr[0].statuses.length; j++) {
				let key = obj.gr[0].statuses[j].status;
				switch (key) {
					case 'Loading Ended':
						row["Loading Date"] = moment(new Date(obj.gr[0].statuses[j].date)).format("DD-MM-YYYY") || 'NA';
						break;
					case 'Unloading Ended':
						row["Unloading Date"] = moment(new Date(obj.gr[0].statuses[j].date)).format("DD-MM-YYYY") || 'NA';
						break;
				}
			}
		}
		row["Last Update Time"] = moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") || 'NA';
		row["Id"] = obj._id.toString();

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'tripAdvance', 'Trip Advance', callback);
};

module.exports.reportTrip = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Report');

	let headers = [
		"Allocation Date",
		"Trip No.",
		"Trip Status",
		"Consignor",
		"Vehicle No.",
		"Ownership",
		"Driver Name",
		"No Of Docs",
		"Driver No.",
		"Route",
		"Route Km",
		"Vendor Name",
		"Trip Start Date",
		"Loading Date",
		"Unloading Date",
		"Trip End Date",
		"Last Update Time",
		"Id"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Trip  Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 12, 15, 20, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 17, 15]);

	aData.forEach(obj => {

		let row = {};

		row["Allocation Date"] = moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Trip Status"] = obj.status || 'NA';
		row["Consignor"] = obj.gr && obj.gr[0] && obj.gr[0].consignor && obj.gr[0].consignor.name || 'NA';
		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["Ownership"] = obj.ownershipType || 'NA';
		row["Driver Name"] = (obj.driver && obj.driver.name) || (obj.vehicle && obj.vehicle.driver_name) || "NA";
		row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		row["No Of Docs"] = (obj.noOfDocs) || "0";
		row["Route"] = obj.route ? obj.route.name : 'NA';
		row["Route Km"] = obj.route ? obj.route.route_distance : 'NA';
		row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";

		for (let j = 0; j < obj.statuses.length; j++) {
			let key = obj.statuses[j].status;
			switch (key) {
				case 'Trip started':
					row["Trip Start Date"] = moment(new Date(obj.statuses[j].date)).format("DD-MM-YYYY") || 'NA';
					break;
				case 'Trip ended':
					row["Trip End Date"] = moment(new Date(obj.statuses[j].date)).format("DD-MM-YYYY") || 'NA';
					break;
			}
		}
		if (obj.gr && obj.gr[0]) {
			for (let j = 0; j < obj.gr[0].statuses.length; j++) {
				let key = obj.gr[0].statuses[j].status;
				switch (key) {
					case 'Loading Ended':
						row["Loading Date"] = moment(new Date(obj.gr[0].statuses[j].date)).format("DD-MM-YYYY") || 'NA';
						break;
					case 'Unloading Ended':
						row["Unloading Date"] = moment(new Date(obj.gr[0].statuses[j].date)).format("DD-MM-YYYY") || 'NA';
						break;
				}
			}
		}
		row["Last Update Time"] = moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") || 'NA';
		row["Id"] = obj._id.toString();

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'myTrips', 'Trip Report', callback);
};

module.exports.reportLogsAlert = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Logs Report');

	let headers = [
		"REFTO",
		"EXCEEDEDVAL",
		"MESSAGE",
		"REFNO",
		"RT",
		"UIF",
		"CATEGORY",
		"USER",
		"LOGDATE",
		"ADDEDBY",
		"REMARK",
		"REMARKDATE"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "ALERT Logs Report");
	formatColumnHeaders(ws1, 4, headers, [20, 15, 35, 15, 15, 20, 15, 15, 20, 20, 20]);

	aData.forEach(obj => {

		let row = {};
		let exceededVal = '';
		let messageVal = '';
		let oDelta = JSON.parse(obj.delta);

		if (oDelta && oDelta.Success) {
			exceededVal = oDelta.Success.count;
			messageVal = oDelta.Success.message;
		}

		row["REFTO"] = obj.refTo || 'NA';
		row["EXCEEDEDVAL"] = exceededVal || 'NA';
		row["MESSAGE"] = messageVal || 'NA';
		row["REFNO"] = (obj.action && obj.action.refNo) || 'NA';
		row["RT"] = (obj.action && obj.action.tsNo) || 'NA';
		row["UIF"] = obj.uif || 'NA';
		row["CATEGORY"] = obj.category || "NA";
		row["USER"] = obj.user || "NA";
		row["LOGDATE"] = (obj.time && moment(new Date(obj.time)).format("DD-MM-YYYY h:mma")) || "NA";
		row["ADDEDBY"] = (obj.action && obj.action.remarkByUser) || 'NA';
		row["REMARK"] = (obj.action && obj.action.remark) || 'NA';
		row["REMARKDATE"] = (obj.action && obj.action.remarkDatetime && moment(new Date(obj.action.remarkDatetime)).format("DD-MM-YYYY h:mma")) || "NA";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'alertLogReport', 'Alert Log Reports', callback);
};

module.exports.reportDeleteLogsAlert = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Delete Log Of Trip Advance');
	let headers = ["ADVANCE DATE", "Advance Type", "Trip No.", "VEHICLE NO","BRANCH", "BRANCH ACCOUNT", 'HAPPAY ACCOUNT', 'REFERENCE NO', 'BILL NO', "Person", "AMOUNT", "Debit AC", "Credit AC", 'DIESEL LITRE', 'DIESEL RATE', "Driver Name", "Driver No.", "DIESEL VENDOR", "REMARK", "Id", "Segment", "Ownership", "RT No.", "No of Day", "Delete Remark", "Deleted By", "Deleted Date", "Entry BY", "Entry Date", "Modification By", "Modification Date"];
	formatColumnHeaders(ws1, 1, headers, [13, 16, 13, 18, 18, 22,  15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 20, 15, 10, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
	let rowNum = 2;
	aData.forEach(o => {
		let obj = JSON.parse(o._doc.delta);
		let row = {};
		row["ADVANCE DATE"] = obj.date ? moment(obj.date).format("DD-MM-YYYY") : 'NA';
		row["Advance Type"] = obj.advanceType || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["VEHICLE NO"] = obj.vehicle_no || 'NA';
		row["BRANCH"] = obj.branch.name || 'NA';
		if ((obj.advanceType === 'Driver Cash') || (obj.advanceType === 'Vendor Advance') || (obj.advanceType === 'Vendor Balance')) {
			row["BRANCH ACCOUNT"] = (obj.from_account && obj.from_account.name) || 'NA';
		}
		if (obj.advanceType === 'Happay') {
			row['HAPPAY ACCOUNT'] = (obj.from_account && obj.from_account.name) || 'NA';
		}
		row['REFERENCE NO'] = obj.reference_no || 'NA';
		row['BILL NO'] = obj.bill_no || 'NA';
		row['Person'] = obj.person || 'NA';
		row['AMOUNT'] = obj.amount || 'NA';
		row["Debit AC"] = (obj.to_account && obj.to_account.name) || 'NA';
		row["Credit AC"] = (obj.from_account && obj.from_account.name) || 'NA';
		row['DIESEL LITRE'] = (obj.dieseInfo && obj.dieseInfo.litre) || 'NA';
		row['DIESEL RATE'] = (obj.dieseInfo && obj.dieseInfo.rate) || 'NA';
		row["Driver Name"] = (obj.driver && obj.driver.name) || "NA";
		row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		row["DIESEL VENDOR"] = obj.vendor ? obj.vendor.name : "NA";
		row["REMARK"] = obj.remark || 'NA';
		row["Id"] = obj._id && obj._id.toString();
		row["Segment"] = (obj.vehicle && obj.vehicle.segment_type) || 'NA';
		row["Ownership"] = (obj.vehicle && obj.vehicle.ownershipType) || 'NA';
		row["RT No."] = (obj.trip && obj.trip.advSettled && obj.trip.advSettled.tsNo) || 'NA';
		row["Delete Remark"] = (o._doc.deleteRemark) || 'NA';
		row["Deleted By"] = (o._doc.user) || 'NA';
		row["Deleted Date"] = o._doc.time ? moment(o._doc.time).format("DD-MM-YYYY") : 'NA';
		row["Entry BY"] = (obj.created_by && obj.created_by.full_name) || 'NA';
		let entryDate = (obj.created_at || obj.uploaded_at);
		row["Entry Date"] = entryDate ? moment(entryDate).format("DD-MM-YYYY") : 'NA';
		row["Modification By"] = (obj.last_modified_by_name) || 'NA';
		row["Modification Date"] = obj.last_modified_at ? moment(obj.last_modified_at).format("DD-MM-YYYY") : 'NA';
		row["No of Day"] = (obj.date && entryDate) ? dateUtil.calDays(entryDate, obj.date) : 0;

		let cell = toAlphabet(10) + rowNum;
		let cell2 = toAlphabet(1) + rowNum;
		let cell3 = toAlphabet(25) + rowNum;
		let cell4 = toAlphabet(27) + rowNum;
		setCellNumFormat(ws1, cell);
		setCellNumFormat(ws1, cell2, 'dd-mm-yyyy');
		setCellNumFormat(ws1, cell3, 'dd-mm-yyyy');
		setCellNumFormat(ws1, cell4, 'dd-mm-yyyy');

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'tripAdvance', 'Trip_Advance', callback);
};

// Start... Trip Detail Report - Made by Harikesh dated: 10/10/19

module.exports.reportTripDetail = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Detail Report');

	let headers = [
		"Dispatch Date",
		"Customer Name",
		"Route",
		"Vehicle Number",
		"Vendor Name",
		"Driver Number",
		"Vendor Number",
		"Status",
		"Current Location",
		"Current Datetime"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Trip Detail Reports");
	formatColumnHeaders(ws1, 4, headers, [20, 15, 15, 20, 15, 15, 15, 15, 20, 20, 20]);

	aData.forEach(obj => {

		let row = {};

		let sRouteName = obj.route_name;
		let toName = '';
		let fromName = '';
		if (sRouteName) {
			var arrName = sRouteName.split("to");
			fromName = arrName[0];
			toName = arrName[1];
		}

		row["Dispatch Date"] = (obj.trip_start_status && moment(new Date(obj.trip_start_status.date)).format("DD-MM-YYYY h:mma")) || 'NA';
		row["Customer Name"] = obj.gr && obj.gr[0] && obj.gr[0].customer && obj.gr[0].customer.name || 'NA';
		row["Route"] = obj.route_name || 'NA';
		row["Vehicle Number"] = obj.vehicle_no || 'NA';
		row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";
		row["Driver Number"] = (obj.driver && obj.driver.prim_contact_no) || (obj.vehicle && obj.vehicle.driver_name) || "NA";
		row["Vendor Number"] = (obj.vendor && obj.vendor.prim_contact_no) || "NA";
		row["Status"] = obj.status || 'NA';
		row["Current Location"] = obj.vehicle && obj.vehicle.mTrack && obj.vehicle.mTrack.address || 'NA';
		row["Current Datetime"] = (obj.vehicle && obj.vehicle.mTrack && moment(obj.vehicle.mTrack.datetime).format("DD-MM-YYYY h:mma")) || 'NA';

		/*
		for (let j = 0; j < obj.statuses.length; j++) {
			let key = obj.statuses[j].status;
			switch (key) {
				case 'Trip started':
					row["Trip Start Date"] = moment(new Date(obj.statuses[j].date)).format("DD-MM-YYYY") || 'NA';
					break;
				case 'Trip ended':
					row["Trip End Date"] = moment(new Date(obj.statuses[j].date)).format("DD-MM-YYYY") || 'NA';
					break;
			}
		}
		*/
		/*if (obj.gr && obj.gr[0]) {
			for (let j = 0; j < obj.gr[0].statuses.length; j++) {
				let key = obj.gr[0].statuses[j].status;
				switch (key) {
					case 'Loading Ended':
						row["Loading Date"] = moment(new Date(obj.gr[0].statuses[j].date)).format("DD-MM-YYYY") || 'NA';
						break;
					case 'Unloading Ended':
						row["Unloading Date"] = moment(new Date(obj.gr[0].statuses[j].date)).format("DD-MM-YYYY") || 'NA';
						break;
				}
			}
		}
		row["Last Update Time"] = moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") || 'NA';
		row["Id"] = obj._id.toString();*/

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'myDetailTrips', 'Trip Detail Report', callback);
};

// END...


// Start... Route Data Report - Made by Harikesh dated: 12/10/19

module.exports.routeDataDownload = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Route Detail Report');

	let headers = [
		"Created At",
		"Customer Name",
		"Route Name",
		"Route Distance",
		"Route Type",
		"Vehicle Group Name",
		"Vehicle Type",
		"Diesel",
		"Cash",
		"Vehicle Rate",
		"Price Per Unit",
		"Price Per MT",
		"Price Per Trip",
		"Min Payble MT"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Route Detail Reports");
	formatColumnHeaders(ws1, 4, headers, [20, 15, 15, 20, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20]);

	aData.forEach(obj => {

		let row = {};

		row["Created At"] = (obj && moment(new Date(obj.created_at)).format("DD-MM-YYYY h:mma")) || 'NA';
		row["Customer Name"] = obj.customer_name || 'NA';
		row["Route Name"] = obj.route_name || 'NA';
		row["Route Distance"] = obj.route_distance || 'NA';
		row["Route Type"] = obj.route_type || "NA";
		row["Vehicle Group Name"] = (obj.data && obj.data.vehicle_group_name) || "NA";
		row["Vehicle Type"] = (obj.data && obj.data.vehicle_type) || "NA";
		row["Diesel"] = (obj.data && obj.data.allot && obj.data.allot.diesel) || "NA";
		row["Cash"] = (obj.data && obj.data.allot && obj.data.allot.cash) || "NA";
		row["Vehicle Rate"] = (obj.data && obj.data.rate && obj.data.rate.vehicle_rate) || "NA";
		row["Price Per Unit"] = (obj.data && obj.data.rate && obj.data.rate.price_per_unit) || "NA";
		row["Price Per MT"] = (obj.data && obj.data.rate && obj.data.rate.price_per_mt) || "NA";
		row["Price Per Trip"] = (obj.data && obj.data.rate && obj.data.rate.price_per_trip) || "NA";
		row["Min Payble MT"] = (obj.data && obj.data.rate && obj.data.rate.min_payble_mt) || "NA";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'RouteDataReport', 'RouteDataReport', callback);
};

// END...

module.exports.commonTripReportsV2 = function (aData, req) {

	let clientId = req.user.clientId;
	// let workbook = new Excel.Workbook();
	// let ws1 = workbook.addWorksheet('Trip Report');
	let headers = [
		"S No.",
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStart') + 1 : true)) && "TRIP START"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripNo') + 1 : true)) && "TRIP NO."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlip') + 1 : true)) && "HIRE SLIP"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('category') + 1 : true)) && "CATEGORY"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grNo') + 1 : true)) && "GR NO."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tsNo') + 1 : true)) && "RT NO"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('customer') + 1 : true)) && "CUSTOMER"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignee') + 1 : true)) && "CONSIGNEE"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('material') + 1 : true)) && "MATERIAL"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehNo') + 1 : true)) && "VEHICLE NO."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehType') + 1 : true)) && "VEHICLE TYPE"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeName') + 1 : true)) && "ROUTE NAME"),
		"ROUTE DISTANCE",
		// ((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeDistance') + 1 : true)) && "ROUTE DISTANCE"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('driverName') + 1 : true)) && "DRIVER NAME"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('noOfDocs') + 1 : true)) && "No Of Docs"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripEnd') + 1 : true)) && "TRIP END"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripEntry') + 1 : true)) && "TRIP ENTRY"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStatus') + 1 : true)) && "TRIP STATUS"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendor') + 1 : true)) && "VENDOR"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendorComp') + 1 : true)) && "VENDOR COMPANY"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ownership') + 1 : true)) && "OWNERSHIP"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('dealDate') + 1 : true)) && "DEAL DATE"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('lastUpdateTime') + 1 : true)) && "LAST UPDATE TIME"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('branch') + 1 : true)) && "BRANCH"),

		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignor') + 1 : true)) && "Consignor"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fleet') + 1 : true)) && "Fleet"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('driverNo') + 1 : true)) && "Driver No."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadingEnd') + 1 : true)) && "Loading Ended"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('uploadEnd') + 1 : true)) && "Unloading Ended"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('remark') + 1 : true)) && "Remark"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hirePartyRemark') + 1 : true)) && "Hire Party Remark"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('id') + 1 : true)) && "Id"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('dealEntryDate') + 1 : true)) && "Deal Entry Date"),
		//((((req.tableAcc && req.tableAcc.length>0) ? req.tableAcc.indexOf('tripEntry') + 1 : true)) && "Allocation Date"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStartPerson') + 1 : true)) && "Trip Start Person"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripEndPerson') + 1 : true)) && "Trip End Person"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('segment') + 1 : true)) && 'Segment')
	];

	headers = headers.filter(item => !!item);

	// let rowNum = 5;
	// formatTitle(ws1, 2, "Trip  Reports");
	// formatColumnHeaders(ws1, 4, headers, [5, 15, 12, 15, 15, 12, 15, 15, 15, 20, 15,10, 15, 15, 12, 15, 20, 15, 15, 15, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 15, 15]);
	return aData.map((obj, index) => {
		obj.gr = obj.gr && obj.gr[0];
		let row = {};
		if (headers.indexOf("S No.") + 1)
			row["S No."] = index + 1;
		if (headers.indexOf("TRIP START") + 1)
			row["TRIP START"] = obj.trip_start_status ? moment(new Date(obj.trip_start_status.date)).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf("TRIP NO.") + 1)
			row["TRIP NO."] = obj.trip_no || 'NA';
		if (headers.indexOf("TRIP STATUS") + 1)
			row["TRIP STATUS"] = obj.status || 'NA';
		if (headers.indexOf("LAST UPDATE TIME") + 1)
			row["LAST UPDATE TIME"] = obj.last_modified_at ? moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf("HIRE SLIP") + 1)
			row["HIRE SLIP"] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		if (headers.indexOf("CATEGORY") + 1)
			row["CATEGORY"] = obj.category || 'NA';
		if (headers.indexOf("GR NO.") + 1)
			row["GR NO."] = obj.gr.grNumber && (obj.gr.grNumber).toString().trim() || 'NA';
		if (headers.indexOf("RT NO") + 1)
			row["RT NO"] = obj.advSettled && obj.advSettled.tsNo || 'NA';
		if (headers.indexOf("CUSTOMER") + 1)
			row["CUSTOMER"] = obj.gr && obj.gr.customer && obj.gr.customer.name || 'NA';
		if (headers.indexOf("CONSIGNEE") + 1)
			row["CONSIGNEE"] = obj.gr && obj.gr.consignee && obj.gr.consignee.name || 'NA';
		if (headers.indexOf("MATERIAL") + 1)
			row["MATERIAL"] = row["Material"] = obj.gr && obj.gr.invoices && obj.gr.invoices.length && obj.gr.invoices[0].material && obj.gr.invoices[0].material.groupName || 'NA';
		if (headers.indexOf("VEHICLE NO.") + 1)
			row["VEHICLE NO."] = obj.vehicle_no || 'NA';
		if (headers.indexOf("VEHICLE TYPE") + 1)
			row["VEHICLE TYPE"] = (obj.vehicle && obj.vehicle.veh_type_name) || 'NA';
		if (headers.indexOf("ROUTE NAME") + 1)
			row["ROUTE NAME"] = obj.route_name || 'NA';
		if (headers.indexOf("ROUTE DISTANCE") + 1)
			row["ROUTE DISTANCE"] = (obj.route && obj.route.route_distance) || 'NA';
		if (headers.indexOf("DRIVER NAME") + 1)
			row["DRIVER NAME"] = (obj.driver && obj.driver.name) || "NA";
		if (headers.indexOf("BRANCH") + 1)
			row["BRANCH"] = obj.branch && obj.branch.name || 'NA';
		if (headers.indexOf("TRIP ENTRY") + 1)
			row["TRIP ENTRY"] = obj.allocation_date ? moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf("TRIP END") + 1)
			row["TRIP END"] = obj.trip_end_status ? moment(new Date(obj.trip_end_status.date)).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf("No Of Docs") + 1)
			row["No Of Docs"] = (obj.documents && obj.documents.length) || "NA";
		if (headers.indexOf("VENDOR") + 1)
			row["VENDOR"] = obj.vendor && obj.vendor.name || "NA";
		let cId = (obj.vendor && obj.vendor.clientId) || obj.clientId;
		let clientAllowed = req.user.client_allowed.find(ca => ca.clientId === cId);
		if (headers.indexOf("VENDOR COMPANY") + 1)
			row["VENDOR COMPANY"] = clientAllowed && clientAllowed.name || 'NA';
		if (headers.indexOf("OWNERSHIP") + 1)
			row["OWNERSHIP"] = obj.ownershipType || 'NA';
		if (headers.indexOf("DEAL DATE") + 1)
			row["DEAL DATE"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? moment(obj.vendorDeal.deal_at).format("DD-MM-YYYY") : "NA";
		if (headers.indexOf("Fleet") + 1)
			row["Fleet"] = obj.vehicle && obj.vehicle.owner_group || 'NA';
		if (headers.indexOf("Segment") + 1)
			row['Segment'] = obj.segment_type || 'NA';
		if (headers.indexOf("Consignor") + 1)
			row["Consignor"] = obj.gr && obj.gr.consignor && obj.gr.consignor.name || 'NA';
		if (headers.indexOf("Driver No.") + 1)
			row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		if (headers.indexOf("Trip Start Person") + 1)
			row["Trip Start Person"] = obj.trip_start_status ? obj.trip_start_status.user_full_name : "NA";
		if (headers.indexOf("Trip End Person") + 1)
			row["Trip End Person"] = obj.trip_end_status ? obj.trip_end_status.user_full_name : "NA";
		if (headers.indexOf("Loading Ended") + 1)
			row["Loading Ended"] = obj.gr && obj.gr.loading_ended_status ? moment(new Date(obj.gr.loading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf("Unloading Ended") + 1)
			row["Unloading Ended"] = obj.gr && obj.gr.unloading_ended_status ? moment(new Date(obj.gr.unloading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf("Remark") + 1)
			row["Remark"] = obj.remark || 'NA';
		if (headers.indexOf("Hire Party Remark") + 1)
			row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';
		if (headers.indexOf("Id") + 1)
			row["Id"] = obj._id.toString();
		if (headers.indexOf("Deal Entry Date") + 1)
			row["Deal Entry Date"] = (obj.vendorDeal && obj.vendorDeal.entryDate) ? moment(obj.vendorDeal.entryDate).format("DD-MM-YYYY") : "NA";

		//row["Allocation Date"] = moment(new Date(obj.created_at)).format("DD-MM-YYYY") || 'NA';
		// addWorkbookRow(row, ws1, headers, (rowNum++));
		return row;
	});

	// saveFileAndReturnCallback(workbook, clientId, 'myTrips', 'Trip Report', callback);
};

module.exports.commonTripReports = function (aData, req, callback) {

	let clientId = req.user.clientId;
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Report');
	let headers = [
		"S No.",
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStart') + 1 : true)) && "TRIP START"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripEnd') + 1 : true)) && "TRIP END"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripNo') + 1 : true)) && "TRIP NO."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlip') + 1 : true)) && "HIRE SLIP"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('category') + 1 : true)) && "CATEGORY"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grNo') + 1 : true)) && "GR NO."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tsNo') + 1 : true)) && "RT NO"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('customer') + 1 : true)) && "CUSTOMER"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignor') + 1 : true)) && "Consignor"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignee') + 1 : true)) && "Consignee"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('material') + 1 : true)) && "Material"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehNo') + 1 : true)) && "VEHICLE NO."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehType') + 1 : true)) && "VEHICLE TYPE"),
		// ((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeDistance') + 1 : true)) && "ROUTE DISTANCE"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeName') + 1 : true)) && "ROUTE NAME"), "ROUTE DISTANCE",
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('intermittentPoint') + 1 : true)) && "INTERMITTENT POINT"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('driverName') + 1 : true)) && "DRIVER NAME"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('noOfDocs') + 1 : true)) && "No Of Docs"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripEntry') + 1 : true)) && "TRIP ENTRY"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStatus') + 1 : true)) && "TRIP STATUS"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendor') + 1 : true)) && "VENDOR"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendorComp') + 1 : true)) && "VENDOR COMPANY"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ownership') + 1 : true)) && "OWNERSHIP"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('dealDate') + 1 : true)) && "DEAL DATE"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('lastUpdateTime') + 1 : true)) && "LAST UPDATE TIME"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('branch') + 1 : true)) && "BRANCH"),

		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fleet') + 1 : true)) && "Fleet"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('driverNo') + 1 : true)) && "Driver No."),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadingArrival') + 1 : true)) && "Loading Arrival"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('uploadArrival') + 1 : true)) && "Unloading Arrival"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadingEnd') + 1 : true)) && "Loading Ended"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('uploadEnd') + 1 : true)) && "Unloading Ended"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('remark') + 1 : true)) && "Remark"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hirePartyRemark') + 1 : true)) && "Hire Party Remark"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('id') + 1 : true)) && "Id"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('dealEntryDate') + 1 : true)) && "Deal Entry Date"),
		//((((req.tableAcc && req.tableAcc.length>0) ? req.tableAcc.indexOf('tripEntry') + 1 : true)) && "Allocation Date"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStartPerson') + 1 : true)) && "Trip Start Person"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripEndPerson') + 1 : true)) && "Trip End Person"),
		((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('segment') + 1 : true)) && 'Segment')
	];


	headers = headers.filter(item => item !== 0);

	let rowNum = 5;
	formatTitle(ws1, 2, "Trip  Reports");
	formatColumnHeaders(ws1, 4, headers, [5, 15, 12, 15, 15, 12, 15, 15, 15, 20, 15, 10, 15, 15, 12,15, 15, 20, 15, 15, 15, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 15, 15]);
	let cnt = 1;
	aData.forEach(obj => {
		let row = {};
		row["S No."] = (cnt || 0);
		row["TRIP START"] = obj.trip_start_status ? moment(new Date(obj.trip_start_status.date)).format("DD-MM-YYYY") : 'NA';
		row["TRIP NO."] = obj.trip_no || 'NA';
		row["TRIP STATUS"] = obj.status || 'NA';
		row["LAST UPDATE TIME"] = obj.last_modified_at ? moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") : 'NA';
		row["HIRE SLIP"] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row["CATEGORY"] = obj.category || 'NA';
		row["GR NO."] = obj.gr ? (obj.gr && obj.gr.map(o => o.grNumber).join(' , ')) : 'NA'
		obj.gr = obj.gr && obj.gr[0];
		row["RT NO"] = obj.advSettled && obj.advSettled.tsNo || 'NA';
		row["CUSTOMER"] = obj.gr && obj.gr.customer && obj.gr.customer.name || 'NA';
		row["VEHICLE NO."] = obj.vehicle_no || 'NA';
		row["VEHICLE TYPE"] = (obj.vehicle && obj.vehicle.veh_type_name) || 'NA';
		row["ROUTE NAME"] = obj.route_name || obj.rName || 'NA';
		row["INTERMITTENT POINT"] = obj.imd ? (obj.imd && obj.imd.map(o => o.c).join(' , ')) : 'NA'
		row["ROUTE DISTANCE"] = (obj.route && obj.route.route_distance)|| Number(obj.rKm || 0) || 'NA';
		row["DRIVER NAME"] = (obj.driver && obj.driver.name) || "NA";
		row["BRANCH"] = obj.branch && obj.branch.name || 'NA';
		row["TRIP ENTRY"] = obj.allocation_date ? moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") : 'NA';
		row["TRIP END"] = obj.trip_end_status ? moment(new Date(obj.trip_end_status.date)).format("DD-MM-YYYY") : 'NA';
		row["No Of Docs"] = (obj.documents && obj.documents.length) || "NA";
		row["VENDOR"] = obj.vendor && obj.vendor.name || "NA";
		let cId = (obj.vendor && obj.vendor.clientId) || obj.clientId;
		let clientAllowed = req.user.client_allowed.find(ca => ca.clientId === cId);
		row["VENDOR COMPANY"] = clientAllowed && clientAllowed.name || 'NA';
		row["OWNERSHIP"] = obj.ownershipType || 'NA';
		row["DEAL DATE"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? moment(obj.vendorDeal.deal_at).format("DD-MM-YYYY") : "NA";

		row["Fleet"] = obj.vehicle && obj.vehicle.owner_group || 'NA';
		row['Segment'] = obj.segment_type || 'NA';
		row["Consignor"] = obj.gr && obj.gr.consignor && obj.gr.consignor.name || 'NA';
		row["Consignee"] = obj.gr && obj.gr.consignee && obj.gr.consignee.name || 'NA';
		row["Material"] = obj.gr && obj.gr.invoices && obj.gr.invoices.length && obj.gr.invoices[0].material && obj.gr.invoices[0].material.groupName || 'NA';
		row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		row["Trip Start Person"] = obj.trip_start_status ? obj.trip_start_status.user_full_name : "NA";
		row["Trip End Person"] = obj.trip_end_status ? obj.trip_end_status.user_full_name : "NA";
		row["Loading Arrival"] = obj.gr && obj.gr.loading_started_status ? moment(new Date(obj.gr.loading_started_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Unloading Arrival"] = obj.gr && obj.gr.unloading_started_status ? moment(new Date(obj.gr.unloading_started_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Loading Ended"] = obj.gr && obj.gr.loading_ended_status ? moment(new Date(obj.gr.loading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Unloading Ended"] = obj.gr && obj.gr.unloading_ended_status ? moment(new Date(obj.gr.unloading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Remark"] = obj.remark || 'NA';
		row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';
		row["Id"] = obj._id.toString();
		row["Deal Entry Date"] = (obj.vendorDeal && obj.vendorDeal.entryDate) ? moment(obj.vendorDeal.entryDate).format("DD-MM-YYYY") : "NA";
		//row["Allocation Date"] = moment(new Date(obj.created_at)).format("DD-MM-YYYY") || 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
		cnt++;
	});
	saveFileAndReturnCallback(workbook, clientId, 'myTrips', 'Trip Report', callback);
};

// Start Trip GR Report Download in xlx
module.exports.tripGrReportsxls = function (aData, user, callback) {

	// prepareing data before bcos advance's keys are dynamic and all those key should be part of header(array)
	let aExcelData = [],
		advanceKeys = {};
	aData.forEach(obj => {
		let row = {};

		for (let j = 0; j < obj.gr.length; j++) {
			row["Revenue"] = (row["Revenue"] || 0) + (obj.gr[j].totalFreight || 0);
		}
		row["Revenue"] = row["Revenue"].toFixed(2);
		row["PAY BY BROKER"] = obj.payByBroker;
		row["PAY BY CASH"] = obj.payByCash;
		row["PAY BY CHEQUE"] = obj.payByCheque;
		row["PAY BY DIESEL"] = obj.payByDiesel;
		row["VENDOR ADVANCE PAID"] = obj.vendorAdvancePaid;

		/*
		for(let jj=0;jj<obj.advanceBudget.length;jj++){
			if (obj.advanceBudget[jj].advanceType && (obj.advanceBudget[jj].advanceType == 'Vendor Advance')) {
				row["VENDOR ADVANCE PAID"] = (row["VENDOR ADVANCE PAID"] || 0) + (obj.advanceBudget[jj].amount || 0);
			}

			if (obj.advanceBudget[jj].vendorPayment && obj.advanceBudget[jj].vendorPayment.paymentMode && (obj.advanceBudget[jj].vendorPayment.paymentMode == 'Broker')) {
				row["PAY BY BROKER"] = (row["PAY BY BROKER"] || 0) + (obj.advanceBudget[jj].amount || 0);
			}

			if (obj.advanceBudget[jj].vendorPayment && obj.advanceBudget[jj].vendorPayment.paymentMode && (obj.advanceBudget[jj].vendorPayment.paymentMode == 'Cash')) {
				row["PAY BY CASH"] = (row["PAY BY CASH"] || 0) + (obj.advanceBudget[jj].amount || 0);
			}

			if (obj.advanceBudget[jj].vendorPayment && obj.advanceBudget[jj].vendorPayment.paymentMode && (obj.advanceBudget[jj].vendorPayment.paymentMode == 'Cheque')) {
				row["PAY BY CHEQUE"] = (row["PAY BY CHEQUE"] || 0) + (obj.advanceBudget[jj].amount || 0);
			}

			if (obj.advanceBudget[jj].vendorPayment && obj.advanceBudget[jj].vendorPayment.paymentMode && (obj.advanceBudget[jj].vendorPayment.paymentMode == 'Diesel')) {
				row["PAY BY DIESEL"] = (row["PAY BY DIESEL"] || 0) + (obj.advanceBudget[jj].amount || 0);
			}
		}*/


		obj.gr = obj.gr && obj.gr[0];
		row["Allocation Date"] = moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") || 'NA';
		row["Gr No."] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Segment"] = obj.segment_type || 'NA';
		//row["Type"] = obj.segment_type || 'NA';
		row["LS No."] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row["TDS Amount"] = obj.vendorDeal && obj.vendorDeal.tdsAmount || 'NA';
		row["Trip Status"] = obj.status || 'NA';
		row["Consignor"] = obj.gr && obj.gr.consignor && obj.gr.consignor.name || 'NA';
		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["Driver"] = (obj.driver && obj.driver.name) || "NA";
		//row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		row["Route"] = obj.route_name || 'NA';
		row["Kilometer"] = obj.totalKm || 'NA';

		//row["Source City"] = obj.route && obj.route.source && obj.route.source.c || 'NA';
		//row["Destination City"] = obj.route && obj.route.destination && obj.route.destination.c || 'NA';
		if (obj.netBudget === 'NA') {
			obj.netBudget = 0;
		}
		//row['Total Budget'] = obj.netBudget ? obj.netBudget.toFixed(2) : 0;
		//row['Diesel Budget (L)'] = obj.dieselBudgetLtr || 0;
		row['Vendor Deal'] = (obj.vendorDeal && obj.vendorDeal.totWithMunshiyana && parseFloat(obj.vendorDeal.totWithMunshiyana.toFixed(2) || 0));
		row['Vendor Charges'] = obj.vendorDeal && obj.vendorDeal.totalCharges && parseFloat(obj.vendorDeal.totalCharges.toFixed(2) || 0);
		row['Vendor Deduction'] = obj.vendorDeal && obj.vendorDeal.totalDeduction && parseFloat(obj.vendorDeal.totalDeduction.toFixed(2) || 0);
		row['Deal Total'] = obj.vendorDeal && obj.vendorDeal.totalDeal && parseFloat(obj.vendorDeal.totalDeal.toFixed(2) || 0);
		row['Cash Adv'] = obj.totalCash && parseFloat(obj.totalCash.toFixed(2) || 0);
		row['Total Advance/Paid'] = obj.tAdv && parseFloat(obj.tAdv.toFixed(2) || 0);
		row['Adv/KM'] = obj.advPKM || 0;
		//row['Total Diesel(L)'] =  obj.dieselGivenLtr || 0;
		//for(let i=0;i<obj.length;i++){
		//	obj.row["Revenue"] = 0;
		//row["Revenue"] =  parseFloat(obj.internal_freight || obj.actaul_freight);
		row["Revenue/KM"] = obj.internal_freightPKM || obj.actaul_freightPKM;
		row["Profit"] = (row["Revenue"] || 0) - (row['Deal Total'] || 0);
		// row["Profit"] = parseFloat(obj.intial_profit || obj.freight_profit);
		row["Profit/KM"] = obj.profitPKM || obj.frProfitPKM;
		//row["Profit Margin"] = obj.initial_profit_margin;
		//row["Actual Expense"] = obj.actual_expense;
		//row["Actual Profit"] = obj.actual_profit;
		row["PAN CARD NO"] = obj.vendor ? obj.vendor.pan_no : "NA";
		row["TDS PERCENTAGE"] = obj.vendor ? obj.vendor.tdsRate : "NA";

		row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";
		row["Trip Start"] = obj.trip_start_status ? moment(new Date(obj.trip_start_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Trip End"] = obj.trip_end_status ? moment(new Date(obj.trip_end_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Loading Ended"] = obj.gr && obj.gr.loading_ended_status ? moment(new Date(obj.gr.loading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Unloading Ended"] = obj.gr && obj.gr.unloading_ended_status ? moment(new Date(obj.gr.unloading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Ownership"] = obj.ownershipType || 'NA';
		row["Branch"] = obj.branch && obj.branch.name || 'NA';
		row["Deal Date"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? moment(obj.vendorDeal.deal_at).format("DD-MM-YYYY") : "NA";
		row["Id"] = obj._id.toString();
		row["Remark"] = obj.remark || 'NA';
		row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';
		let cId = (obj.vendor && obj.vendor.clientId) || obj.clientId;
		let clientAllowed = user.client_allowed.find(ca => ca.clientId === cId);
		row["COMPANY"] = clientAllowed && clientAllowed.name || 'NA';

		if (obj.vendorDeal && obj.vendorDeal.charges) {
			allCharges = {
				...obj.vendorDeal.charges,
			};

			if (!allCharges)
				return 0;
			for (let k in allCharges) {
				if (allCharges.hasOwnProperty(k))
					row["TDS Amt(Extra)"] = (row["TDS Amt(Extra)"] || 0) + (allCharges[k]['tdsAmount'] || 0);
			}
		}

		// Start Calculate Remaining Amount...

		// For remaing amount... - by Harikesh 14/10/2019
		/*if(obj.vendorDeal)
		{
			if(!obj.vendorDeal.totWithMunshiyana)
				obj.vendorDeal.totWithMunshiyana = 0;
			if(!obj.vendorDeal.totalCharges)
				obj.vendorDeal.totalCharges = 0;
			if(!obj.vendorDeal.totalDeduction)
				obj.vendorDeal.totalDeduction = 0;
			if(!obj.vendorDeal.tdsAmount)
				obj.vendorDeal.tdsAmount = 0;
			if(!obj.vendorDeal.extChargesTdsAmount)
				obj.vendorDeal.extChargesTdsAmount = 0;
			if(!row["VENDOR ADVANCE PAID"])
				row["VENDOR ADVANCE PAID"] = 0;
			if(!row["TDS Amt(Extra)"])
				row["TDS Amt(Extra)"] = 0;
			if(!row["TDS Amount"])
				row["TDS Amount"] = 0;

				let remainingAmt = ((obj.vendorDeal.totWithMunshiyana + obj.vendorDeal.totalCharges - row["VENDOR ADVANCE PAID"] - obj.vendorDeal.totalDeduction - row["TDS Amt(Extra)"] - row["TDS Amount"] - obj.vendorDeal.extChargesTdsAmount) || 0);
				row["REMAINING AMOUNT"] = parseFloat(remainingAmt.toFixed(2) || 0);
		}
		else
		{
			row["REMAINING AMOUNT"] = 0;
		}	*/

		row["REMAINING AMOUNT"] = obj.remainingAmt;

		// END


		obj.advanceBudget.forEach(oAdv => {
			advanceKeys[oAdv.advanceType] = 1;
			switch (oAdv.advanceType) {
				case 'Diesel':
					advanceKeys["Driver Lit."] = 1;
					row["Diesel"] = (row["Diesel"] || 0) + oAdv.amount;
					row["Driver Lit."] = (row["Driver Lit."] || 0) + oAdv.dieseInfo.litre;
					break;
				default:
					row[oAdv.advanceType] = (row[oAdv.advanceType] || 0) + oAdv.amount;
					break;
			}
		});
		aExcelData.push(row);
	});

	// Genrating excel data
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Advance');
	//"Type","Driver No.","Source City","Destination City","Profit Margin","Actual Expense","Actual Profit"
	let headers = ["Vehicle No.", "Trip Start", "LS No.", "Deal Date", "Segment", "Trip No.", "Consignor", "Route", "Kilometer", "Deal Total", "Cash Adv",
		//"Total Budget",
		"Total Advance/Paid", "Revenue", "Revenue/KM", "Profit", "Profit/KM", "Vendor Deal", "Vendor Charges", "Vendor Deduction", "TDS Amount", "TDS PERCENTAGE", "TDS Amt(Extra)", "Adv/KM", "Driver", "Vendor Name",
		"PAN CARD NO", "Trip Status", "Trip End", "Loading Ended", "Unloading Ended", "Ownership", "Branch", "COMPANY", "Id", "Remark", "Hire Party Remark", "VENDOR ADVANCE PAID", "PAY BY CHEQUE",
		"PAY BY BROKER", "PAY BY DIESEL", "PAY BY CASH", "REMAINING AMOUNT"
		//"Allocation Date"
	];


	//adding Advances's dynamic keys in headers
	for (let key in advanceKeys)
		if (advanceKeys.hasOwnProperty(key))
			headers.push(key);

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Trip Performance Report");
	formatColumnHeaders(ws1, 4, headers, [15, 12, 15, 20, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 17, 15, 10, 12, 25, 25, 25, 30, 25, 25, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	aExcelData.forEach(obj => {
		addWorkbookRow(obj, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, user.clientId, 'tripAdvance', 'Trip Advance', callback);
};


// END


module.exports.commonTripReportsAdvance = function (aData, req, callback) {
	// prepareing data before bcos advance's keys are dynamic and all those key should be part of header(array)
	let aExcelData = [],
		advanceKeys = {},
	     expenseKeys = {};


	// Genrating excel data
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Advance');
	//"Type","Driver No.","Source City","Destination City","Profit Margin","Actual Expense","Actual Profit"
	let headers = ["S.No", "Vehicle No.", "vehicle Type","Foreman Name", "GR No","Trip Start", "HIRE SLIP No","Trip No.", "Customer","Route", "Deal Total",
		"Revenue","Profit",'Fleet',"Bill No", "Bill Date","Source", "Destination", "Segment",  "Customer Category", "Kilometer","GPS KM",
		"Internal Profit","Vendor Deal", "Cash Adv", "Total Advance/Paid", "Vendor Charges", "Vendor Deduction",
		"TDS Amount", "TDS PERCENTAGE", "TDS Amt(Extra)", "Adv/KM", "TMemo Total", "Trip Type","Intermittent Stop", "Driver",
		"Vendor Name","PAN CARD NO", "Trip Status", "Category", "Trip End", "Loading Ended", "Unloading Date", "Rate", "Basic Freight",
		"Total Basic Freight","Ownership", "Branch", "COMPANY", "Id", "Remark", "Hire Party Remark", "VENDOR ADVANCE PAID", "PAY BY CHEQUE",
		"PAY BY BROKER", "PAY BY DIESEL", "PAY BY CASH", "REMAINING AMOUNT", "Deal Date","Billing Party", "Allocation Date","RT NO"
	];
	if (aData.find(st => st.vendorDeal && st.vendorDeal.weight_type === 'PMT')) {
		// if(aData.vendorDeal && obj.vendorDeal.weight_type === 'PMT'){
		headers.push('PMT RATE');
		headers.push('PMT WEIGHT');
		headers.push('OTHER EXP');
	}
	for(const d of aData){
		d.advanceBudget.forEach(oAdv => {
			advanceKeys[oAdv.advanceType] = 1;
			switch (oAdv.advanceType) {
				case 'Diesel':
					advanceKeys["Driver Lit."] = 1;
					break;
				default:
					break;
			}
		});
		d.trip_expenses.forEach(oExp => {
			expenseKeys[oExp.type] = 1;
		});
	}
	for (let key in advanceKeys)
		if (advanceKeys.hasOwnProperty(key))
			headers.push(key);

	for (let key in expenseKeys)
		if (expenseKeys.hasOwnProperty(key))
			headers.push(key);

	headers.push("Total Exp");
	headers.push("Contriubution Margin");
	headers.push("Opening balance");
	headers.push("Advance cash");
	headers.push("Advance diesel");
	headers.push("Total settlement");
	headers.push("Closing balance");
	let rowNum = 5;
	formatTitle(ws1, headers.length, "Trip Hire Report");
	formatColumnHeaders(ws1, 4, headers, [5, 15, 15,15,12, 15, 13, 13, 13, 13, 20, 15, 15, 15, 15, 20,20, 12, 15, 15,15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 17, 15, 15, 10, 12, 20, 15, 20, 25, 25, 25,25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	let cnt = 1;
	aData.forEach(obj => {
		let row = {};
		if (obj.netBudget === 'NA') {
			obj.netBudget = 0;
		}
		row["S.No"] = (cnt || 0);
		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["vehicle Type"] = obj.vehicle && obj.vehicle.veh_type_name || 'NA';
		row["Foreman Name"] = obj.vehicle && obj.vehicle.owner_group || 'NA';
		row["GR No"] = (obj.gr && obj.gr.map(o => o.grNumber).join(' , '))|| 'NA';
		row["Trip Start"] = obj.trip_start_status ? moment(new Date(obj.trip_start_status.date)).format("DD-MM-YYYY") : 'NA';
		row["HIRE SLIP No"] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Customer"] = obj.gr && dateUtil.getUniqueCustomer(obj) || 'NA';
		row["Route"] = obj.route_name || 'NA';
		row['Deal Total'] = obj.vendorDeal && obj.vendorDeal.totalDeal && parseFloat(obj.vendorDeal.totalDeal.toFixed(2) || 0);
		if(obj.gr.length > 0){
			for (let j = 0; j < obj.gr.length; j++) {
				row["Revenue"] = (row["Revenue"] || 0) + parseFloat((obj.gr[j].totalFreight || 0).toFixed(2));
				row["Total Basic Freight"] = (row["Total Basic Freight"] || 0) + parseFloat((obj.gr[j].basicFreight || 0).toFixed(2));
			}
		}else{
			row["Revenue"] = 0;
			row["Total Basic Freight"] = 0;
		}
		row["Profit"] = (row["Revenue"] || 0) - (row['Deal Total'] || 0);
		row["Fleet"] = obj.vehicle && obj.vehicle.owner_group || 'NA';
		row["Bill No"] = (obj.bills && obj.bills.billNo) || 'NA';
		row["Bill Date"] = obj.bills ? moment(new Date(obj.bills.billDate)).format("DD-MM-YYYY") : 'NA';
		let [src, dest] = obj.rName ? obj.rName.split(' to').map(o => o.trim()) : (obj.route_name && obj.route_name.split(' to').map(o => o.trim()));
		row["Source"] = src ||(obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.source).join(' , ')) || 'NA'; // obj.gr.acknowledge && obj.gr.acknowledge.source) || 'NA';
		row["Destination"] = dest || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.destination).join(' , ')) || 'NA';
		row["Segment"] = obj.segment_type || 'NA';
		row["Customer Category"] = (obj.gr && obj.gr.map(o => o.customer && o.customer.category).join(' , ')) || 'NA';
		row["Kilometer"] = obj.totalKm || 'NA';
		row["GPS KM"] = parseFloat(obj && obj.playBack && (obj.playBack.tot_dist/1000).toFixed(2)) || 0;
		row["Internal Profit"] = (row["Deal Total"] || 0) - (obj.vendorDeal && obj.vendorDeal.internalFreight || 0);
		row['Vendor Deal'] = (obj.vendorDeal && obj.vendorDeal.totWithMunshiyana && parseFloat(obj.vendorDeal.totWithMunshiyana.toFixed(2) || 0));
		row['Cash Adv'] = obj.totalCash && parseFloat(obj.totalCash.toFixed(2) || 0);
		row['Total Advance/Paid'] = obj.tAdv && parseFloat(obj.tAdv.toFixed(2) || 0);
		row['Vendor Charges'] = obj.vendorDeal && obj.vendorDeal.totalCharges && parseFloat(obj.vendorDeal.totalCharges.toFixed(2) || 0);
		row['Vendor Deduction'] = obj.vendorDeal && obj.vendorDeal.totalDeduction && parseFloat(obj.vendorDeal.totalDeduction.toFixed(2) || 0);
		row["TDS Amount"] = obj.vendorDeal && obj.vendorDeal.tdsAmount || 0;
		row["TDS PERCENTAGE"] = obj.vendorDeal && obj.vendorDeal.tdsPercent || 0;
		if (obj.vendorDeal && obj.vendorDeal.charges) {
			allCharges = {
				...obj.vendorDeal.charges,
			};
			if (!allCharges)
				return row["TDS Amt(Extra)"] = 0;
			for (let k in allCharges) {
				if (allCharges.hasOwnProperty(k))
					row["TDS Amt(Extra)"] = (row["TDS Amt(Extra)"] || 0) + (allCharges[k]['tdsAmount'] || 0);
			}
		}else{
			row["TDS Amt(Extra)"] = 0;
		}
		row['Adv/KM'] = parseFloat(obj.advPKM || 0);
		row["TMemo Total"] = obj.gr && obj.gr.length && obj.gr[0].tMemo && obj.gr[0].tMemo.total  || 'NA';
		row["Trip Type"] = obj.type  || 'NA';
		row["Intermittent Stop"] = (obj.gr && obj.gr.map(o => o.booking && o.booking.imd && o.booking.imd.map(o2=> o2.c).join(' , ') || 'NA'))
		row["Driver"] = (obj.driver && obj.driver.name) || "NA";
		row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";
		row["PAN CARD NO"] = obj.vendor ? obj.vendor.pan_no : "NA";
		row["Trip Status"] = obj.status || 'NA';
		row["Category"] = obj.category || 'NA';
		row["Trip End"] = obj.trip_end_status ? moment(new Date(obj.trip_end_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Loading Ended"] = (obj.gr && obj.gr.map(o =>
			o.loading_ended_status ? moment(new Date(o.loading_ended_status.date)).format("DD-MM-YYYY") : 'NA'
		).join(' , ')) || 'NA';
		row["Unloading Date"] = (obj.gr && obj.gr.map(o =>
			o.pod && o.pod.billingUnloadingTime ? moment(new Date(o.pod.billingUnloadingTime)).format("DD-MM-YYYY") : 'NA'
		).join(' , ')) || 'NA';
		row["Rate"] = (obj.avgRate && obj.avgRate.join(' , ')) || '0';
		row["Basic Freight"] = (obj.gr && obj.gr.map(o => o.basicFreight).join(' , ')) || '0';
		row["Ownership"] = obj.ownershipType || 'NA';
		row["Branch"] = obj.branch && obj.branch.name || 'NA';
		let cId = (obj.vendor && obj.vendor.clientId) || obj.clientId;
		let clientAllowed = req.user && req.user.client_allowed && req.user.client_allowed.find(ca => ca.clientId === cId);
		row["COMPANY"] = clientAllowed && clientAllowed.name || 'NA';
		row["Id"] = obj._id.toString();
		row["Remark"] = obj.remark || 'NA';
		row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';
		row["VENDOR ADVANCE PAID"] = obj.vendorAdvancePaid || 0;
		row["PAY BY CHEQUE"] = obj.payByCheque || 0;
		row["PAY BY BROKER"] = obj.payByBroker || 0;
		row["PAY BY DIESEL"] = obj.payByDiesel || 0;
		row["PAY BY CASH"] = obj.payByCash || 0;
		row["REMAINING AMOUNT"] = obj.remainingAmt || 0;
		row["Deal Date"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? moment(obj.vendorDeal.deal_at).format("DD-MM-YYYY") : "NA";
		row["Billing Party"] = obj.billingParty && obj.billingParty.name || 'NA';
		row["Allocation Date"] =obj.allocation_date ?  moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") : 'NA';
		row["RT NO"] = obj.advSettled && obj.advSettled.tsNo || 'NA';
		if (obj.vendorDeal && obj.vendorDeal.weight_type === 'PMT') {
			row['PMT RATE'] = obj.vendorDeal.pmtRate;
			row['PMT WEIGHT'] = obj.vendorDeal.pmtWeight;
			row['OTHER EXP'] = obj.vendorDeal.otherExp;
		}
		if(obj.advanceBudget.length>0){
			let diesel = 0;
			let dieselLtr = 0;
			let happay = 0;
			let fastag = 0;
			let driverCash = 0;
			obj.advanceBudget.forEach(oAdv => {
				advanceKeys[oAdv.advanceType] = 1;
				switch (oAdv.advanceType) {
					case 'Happay':
						happay += oAdv.amount;
						break;
					case 'Diesel':
						diesel +=  oAdv.amount || 0;
						dieselLtr +=  oAdv.dieseInfo && oAdv.dieseInfo.litre || 0;
						break;
					case 'Fastag':
						fastag += oAdv.amount;
						break;
					case 'Driver Cash':
						driverCash += oAdv.amount;
						break;
				}
			});
			for (let k in advanceKeys) {
				if(k === "Diesel"){
					row["Diesel"] = diesel;
					row["Driver Lit."] = dieselLtr;
				}
				if(k === "Happay"){
					row["Happay"] = happay;
				}
				if(k === "Fastag"){
					row["Fastag"] = fastag;
				}
				if(k === "Driver Cash"){
					row["Driver Cash"] = driverCash;
				}
			}
		}
		let totalExp = 0;
		for (let k in expenseKeys) {
			if (expenseKeys.hasOwnProperty(k)){
				if(obj.trip_expenses.length>0){
					obj.trip_expenses.forEach(oExp => {
						totalExp += oExp.amount;
						if( oExp.type == k){
							row[k] = (row[k] || 0) + oExp.amount;
						}else{
							row[k] = 0;
						}
					});
				}else{
					row[k] = 0;
				}
			}
		}
		row["Total Exp"] = totalExp ;
		row["Contriubution Margin"] = (row["Revenue"] - totalExp) || 'NA';
		row['Opening balance'] = obj.openCloseBal && obj.openCloseBal.driver  && obj.openCloseBal.driver.opening && parseFloat(obj.openCloseBal.driver.opening.toFixed(2) || 0) || 0;
		row['Advance cash'] = obj.totalCash && parseFloat(obj.totalCash.toFixed(2) || 0);
		row['Advance diesel'] = obj.dieselGivenLtr && parseFloat(obj.dieselGivenLtr.toFixed(2) || 0);
		row['Total settlement'] = obj.actual_expense && parseFloat(obj.actual_expense.toFixed(2) || 0);
		row['Closing balance'] = obj.openCloseBal && obj.openCloseBal.driver && obj.openCloseBal.driver.closing &&  parseFloat(obj.openCloseBal.driver.closing.toFixed(2) || 0) ||0;
		addWorkbookRow(row, ws1, headers, (rowNum++));
		// aExcelData.push(row);
		cnt++;
	});
	// aExcelData.forEach(obj => {
	// 	addWorkbookRow(obj, ws1, headers, (rowNum++));
	// });

	saveFileAndReturnCallback(workbook, req.user.clientId, 'tripAdvance', 'Trip Hire Report', callback);
};

function configName(configs, key, fallBack) {
	if (configs && configs[key]) {
		if (configs[key].visible) {
			return configs[key].label || configs[key].ourLabel;
		} else {
			return;
		}
	} else {
		return fallBack;
	}
}

function ax(value) {
	return value ? [value] : [];
}

module.exports.reportTrialBalRep = function (aData, user, toDate, configs, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trial Balance Report');
	formatTitle(ws1, 6,"Trial Balance As on Date : "+ moment(new Date(toDate)).format("DD-MM-YYYY"));
	let headers = ['SrNo','Account','Opening','Credit','Debit','Closing'];

	let rowNum = 5;

	formatColumnHeaders(ws1, 4, headers, [5, 30, 15, 15, 15, 15]);
	let cnt = 1;
	aData.data.forEach(obj => {
		let row = {};
		row['SrNo'] = (cnt || 0);
		row['Account'] = (obj.accountDetail && (obj.accountDetail.ledger_name)) || 'NA';
		row['Opening'] = parseFloat(obj.ob.toFixed(2) || 0);
		row['Credit'] = parseFloat(obj.cr.toFixed(2) || 0);
		row['Debit'] = parseFloat(obj.dr.toFixed(2) || 0);
		row['Closing'] = parseFloat(obj.cb.toFixed(2) || 0);
		addWorkbookRow(row, ws1, headers, (rowNum++));
		cnt++;
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,parseFloat((aData.obj.ob).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'D',rowNum,parseFloat((aData.obj.cr).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'E',rowNum,parseFloat((aData.obj.dr).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'F',rowNum,parseFloat((aData.obj.cb).toFixed(2)),{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, user, 'trialBal', 'trialBalanceReport', callback);
};

module.exports.reportTrialBalRep1 = function (aData, user, toDate, configs, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trial Balance Report');
	formatTitle(ws1, 6,"Trial Balance As on Date : "+ moment(new Date(toDate)).format("DD-MM-YYYY"));
	let headers = ['SrNo','Account','Credit','Debit'];

	let rowNum = 5;
	let obj = {
		cr:0,
		dr:0
	}
	formatColumnHeaders(ws1, 4, headers, [5, 30, 15,15]);
	let cnt = 1;
	for(let i= 0;i< aData.config.length;i++){
		let data = aData.data[0][aData.config[i]._id.toString()]
		if(!data.bal){
			data.bal = {cr:0, dr:0 };
		}
		let row = {};
		row['SrNo'] = (cnt || 0);
		row['Account'] = (data && data.name) || 'NA';
		row['Credit'] = parseFloat(data && data.bal && data.bal.cr && data.bal.cr.toFixed(2) || 0);
		row['Debit'] = parseFloat(data && data.bal && data.bal.dr && data.bal.dr.toFixed(2) || 0);
		obj.cr += (data.bal.cr || 0);
		obj.dr += (data.bal.dr || 0);
		addWorkbookRow(row, ws1, headers, (rowNum++));
		cnt++;
	}
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,parseFloat((obj.cr).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'D',rowNum,parseFloat((obj.dr).toFixed(2)),{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, user, 'trialBal', 'trialBalanceReport', callback);
};

module.exports.reportTrialBalRepGroupWise = function (aData,clientId, toDate, from, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Trial Bal Group Wise Report');
	formatTitle(ws, 6, 'Group Trial Balances '+ moment(new Date(toDate)).format("DD-MM-YYYY"));
	// mergeCells(ws, 2, 7, to + 'to' + from );
	// ws.getCell('A2').value = helperFn.toFixed(to);
	// ws.getCell('C' + 2).value = helperFn.toFixed(from);

	let headers = ['SrNo','Account','Opening','Credit','Debit','Closing'];
	let rowNum = 5;
	formatColumnHeaders(ws, 4, headers, [5, 30, 15, 15, 15, 15]);
	for (let obj of aData) {
		if(obj.group && obj.group.name){
			mergeCells(ws, (rowNum++), 6, obj.group.name);
		}else{
			mergeCells(ws, (rowNum++), 6, "Unknow Group");
		}
		let count = 1;
		obj.ledgers.forEach(o => {
			let row = {};
			row["SrNo"] = count;
			row['Account'] = (o.accountDetail && (o.accountDetail.ledger_name)) || 'NA';
		    row['Opening'] = o.ob || 0;
		    row['Credit'] = o.cr || 0;
		    row['Debit'] = o.dr || 0;
		    row['Closing'] = o.cb || 0;

			//TotalBilledAmount += o.totalAmount;
			count++;
			addWorkbookRow(row, ws, headers, (rowNum++));
		});
		ws.getCell('C' + rowNum).value = 'TOTAL';
		ws.getCell('D' + rowNum).value = helperFn.toFixed(obj.cr, 0);
		ws.getCell('E' + rowNum).value = helperFn.toFixed(obj.dr, 0);
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, 'trialBal', 'trialBalGroup', callback);
};

module.exports.trialBalanceOnlyGroupDetailReport = function (aData, clientData, clientId, toDate, from, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Trial Balance');

	mergeCellsHandler(ws, "A1", "E1", clientData.client_display_name ,true, true);
	mergeCellsHandler(ws, "A2", "E2", clientData.address ,true, true);
	mergeCellsHandler(ws, "A3", "E3", "Trial Balance", true, true);
	mergeCellsHandler(ws, "A4", "E4", moment(from).format("DD-MMM-YYYY") + ' to ' + moment(toDate).format("DD-MMM-YYYY"), true, true);

	let headers = ['Particulars','Opening Balance','Debit','Credit','Closing Balance'];
	let rowNum = 6;
	formatColumnHeaders(ws, 5, headers, [30, 15, 15, 15, 15]);
	let totalCr = 0, totalDr = 0, totalOp = 0, totalCb = 0;
	for (let obj of aData) {
			let row = {};
			row['Particulars'] = (obj._id && obj._id.Group_name) || 'NA';
			let ob = row['Opening Balance'] = obj.Opening_Balance || 0;
			let dr = row['Debit'] = obj.Debit || 0;
			let cr = row['Credit'] = obj.Credit || 0;
			let cb = row['Closing Balance'] = (ob + dr - cr ) || 0;
			totalCr += cr;
			totalDr += dr;
			totalOp += ob;
			totalCb	+= cb;
			addWorkbookRow(row, ws, headers, (rowNum++));
	}
	setVal(ws, 'A', rowNum, "TOTAL", {border: true, width: 20, fill: true});
	setVal(ws, 'B', rowNum, helperFn.toFixed(totalOp, 0), {border: true, width: 20, fill: true});
	setVal(ws, 'C', rowNum,  helperFn.toFixed(totalDr, 0), {border: true, width: 20, fill: true});
	setVal(ws, 'D', rowNum,  helperFn.toFixed(totalCr, 0), {border: true, width: 20, fill: true});
	setVal(ws, 'E', rowNum,  helperFn.toFixed(totalCb, 0), {border: true, width: 20, fill: true});

	saveFileAndReturnCallback(workbook, clientId, 'trialBal', 'trialBalGroup', callback);
};

module.exports.tripRecoReportDownload = function (aData, user, configs, callback) {
	let workbook = new Excel.Workbook();

	let ws1 = workbook.addWorksheet('Trip Reco Report', {properties: {tabColor: {argb: 'FFC0000'}}});

	//let ws2 = workbook.addWorksheet('Trip Reco Report');
	let headers = ['Trip No',
		'Branch',
		'Vehicle No',
		'Vendor Name',
		'Pan Card',
		'Broker Name',
		'Deal Date',
		'Hire Slip',
		'Vendor Deal',
		'Vendor Charges',
		'Vendor Deduction',
		'TDS Amount',
		'TDS Amount(Extra)',
		'Other Expense',
		'Total Payable',
		'Advance',
		'Remaining Amount',
		'Payment Type',
		'Ref No',
		'Amount Paid',
		'Paid By Broker',
		'Date Of Ref No',
		'GR No',
		'GR Date',
		'Route',
		'Company'
	];
	let rowNum = 2;

	let fillColorRow = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {argb: 'F1FF26'},
		bgColor: {argb: 'F1FF26'}
	};

	formatColumnHeaders(ws1, 1, headers, [0, 5, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 15, 20, 20, 15, 20, 20, 20, 13, 13, 26, 16]);
	aData.forEach(obj => {
		let row = {};
		ws1.getCell('A' + rowNum).fill = fillColorRow;
		ws1.getCell('B' + rowNum).fill = fillColorRow;
		ws1.getCell('C' + rowNum).fill = fillColorRow;
		ws1.getCell('D' + rowNum).fill = fillColorRow;
		ws1.getCell('E' + rowNum).fill = fillColorRow;
		ws1.getCell('F' + rowNum).fill = fillColorRow;
		ws1.getCell('G' + rowNum).fill = fillColorRow;
		ws1.getCell('H' + rowNum).fill = fillColorRow;
		ws1.getCell('I' + rowNum).fill = fillColorRow;
		ws1.getCell('J' + rowNum).fill = fillColorRow;
		ws1.getCell('K' + rowNum).fill = fillColorRow;
		ws1.getCell('L' + rowNum).fill = fillColorRow;
		ws1.getCell('M' + rowNum).fill = fillColorRow;
		ws1.getCell('N' + rowNum).fill = fillColorRow;
		ws1.getCell('O' + rowNum).fill = fillColorRow;
		ws1.getCell('P' + rowNum).fill = fillColorRow;
		ws1.getCell('Q' + rowNum).fill = fillColorRow;
		ws1.getCell('R' + rowNum).fill = fillColorRow;
		ws1.getCell('S' + rowNum).fill = fillColorRow;
		ws1.getCell('T' + rowNum).fill = fillColorRow;
		ws1.getCell('U' + rowNum).fill = fillColorRow;
		ws1.getCell('V' + rowNum).fill = fillColorRow;
		ws1.getCell('W' + rowNum).fill = fillColorRow;
		ws1.getCell('X' + rowNum).fill = fillColorRow;

		row['Trip No'] = ((obj.trips && obj.trips.trip_no) || 0); //(obj._id && obj._id.toString());
		row['Branch'] = (obj.trips && obj.trips.branch && obj.trips.branch.name) || '';
		row["Vehicle No"] = (obj.trips && obj.trips.vehicle_no) || '';
		row['Vendor Name'] = (obj.vendorDetail && obj.vendorDetail.name) || '';
		row['Pan Card'] = (obj.vendorDetail && obj.vendorDetail.pan_no) || '';
		row['Broker Name'] = (obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.broker && obj.trips.vendorDeal.broker.name) || '';
		row['Deal Date'] = (obj.trips && obj.trips.vendorDeal && (obj.trips.vendorDeal.deal_at ? moment(obj.trips.vendorDeal.deal_at).format("DD-MM-YYYY") : '')) || '';
		row['Hire Slip'] = (obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.loading_slip) || '';

		if (obj.trips.vendorDeal && obj.trips.vendorDeal.total_expense) {
			obj.trips.vendorDeal.totalDeal = (obj.trips.vendorDeal.total_expense + helperFn.sumOfCharges(obj.trips.vendorDeal.charges) - helperFn.sumOfCharges(obj.trips.vendorDeal.deduction));
		}

		row['Vendor Deal'] = (obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.totalDeal) || 0;
		row['Vendor Charges'] = (obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.totalCharges) || 0;
		row['Vendor Deduction'] = (obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.totalDeduction) || 0;
		row['TDS Amount'] = (obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.tdsAmount) || 0;
		row['Other Expense'] = (obj.trips.vendorDeal.weight_type === 'PMT') ? (obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.otherExp) : 0;
		// row['GR No'] = ((obj.trips && obj.trips.gr && obj.trips.gr.grNumber) || 'NA');
		row['GR No'] = ((obj.trips && obj.trips.gr) && obj.trips.gr.map(gr => gr.grNumber).join(',')) || 'NA';
		row['GR Date'] = ((obj.trips && obj.trips.gr && moment(obj.trips.gr.grDate).format("DD-MM-YYYY")) || 'NA');
		row['Route'] = ((obj.trips && obj.trips.route_name) || 'NA');
		let cId = user.clientId || (obj.trips && obj.trips && obj.trips.clientId);
		let clientAllowed = user.client_allowed.find(ca => ca.clientId === cId);
		row['Company'] = clientAllowed && clientAllowed.name || 'NA';


		// TDS Extra Amount
		obj.trips.extraTdsAmt = 0;
		if (obj.trips.vendorDeal && obj.trips.vendorDeal.charges) {
			allCharges = {
				...obj.trips.vendorDeal.charges,
			};

			if (!allCharges)
				return 0;
			for (let kk in allCharges) {
				if (allCharges.hasOwnProperty(kk))
					obj.trips.extraTdsAmt = (obj.trips.extraTdsAmt || 0) + (allCharges[kk]['tdsAmount'] || 0);
			}
		}
		// END

		row['TDS Amount(Extra)'] = ((obj.trips.extraTdsAmt) || 0);

		// Get Total Payble
		let totWithMunshiyana = 0;
		let totalCharges = 0;
		let totalDeduction = 0;
		let tdsAmount = 0;
		let extraTdsAmount = 0;
		totWithMunshiyana = ((obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.totWithMunshiyana) || 0);
		totalCharges = ((obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.totalCharges) || 0);
		totalDeduction = ((obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.totalDeduction) || 0);
		tdsAmount = ((obj.trips && obj.trips.vendorDeal && obj.trips.vendorDeal.tdsAmount) || 0);
		extraTdsAmount = ((obj.trips.extraTdsAmt) || 0);

		let totalPaybleAmt = ((totWithMunshiyana + totalCharges - totalDeduction - tdsAmount - extraTdsAmount) || 0);
		// 10000Advance + 700 - 1200 - 2500 - 35
		//(upsertVm.oTrip.vendorDeal.totWithMunshiyana + upsertVm.oTrip.vendorDeal.totalCharges - upsertVm.oTrip.vendorDeal.totalDeduction -
		//(upsertVm.tdsAmount || 0) - (upsertVm.extChargesTdsAmount || 0) )) | roundOff

		//END

		row['Total Payable'] = (totalPaybleAmt) || '';

		// 2nd loop with remaining amount
		let remainingAmount = 0;
		let totAdv = 0;
		if (obj.trips && obj.trips.advanceBudget && obj.trips.advanceBudget.length) {
			let advBudCnt = obj.trips.advanceBudget.length;
			for (var i = 0; i < advBudCnt; i++) {
				totAdv = totAdv + obj.trips.advanceBudget[i].amount;
			}
		}

		// Get Remaining Amount...
		remainingAmount = (totalPaybleAmt - totAdv);
		row['Advance'] = (totAdv || 0);
		row['Remaining Amount'] = ((remainingAmount) || 0);

		/*
		if(obj.trips && obj.trips.advanceBudget.length)
		{
			let advBudCnt  = obj.trips.advanceBudget.length;
			for (var j = 0; j < advBudCnt; j++) {
				if(j<1)
				{
					row['Payment Type'] = ((obj.trips.advanceBudget[j] && obj.trips.advanceBudget[j].vendorPayment && obj.trips.advanceBudget[j].vendorPayment.paymentMode) || 'NA');
					row['Ref No'] = ((obj.trips.advanceBudget[j].reference_no) || 'NA');
					row['Amount Paid'] = ((obj.trips.advanceBudget[j].amount) || 0);
					row['Paid By Broker'] = (obj.trips.advanceBudget[j].paidToBroker === false) ? "No" : "Yes";
					row['Date Of Ref No'] = (obj.trips.advanceBudget[j].date ? moment(obj.trips.advanceBudget[j].date).format("DD-MM-YYYY") : 'NA');
				}
			}
		}*/

		addWorkbookRowDefaultBlank(row, ws1, headers, rowNum++);


		// Write sub cell ...
		if (obj.trips && obj.trips.advanceBudget && obj.trips.advanceBudget.length) {
			let row2 = {};
			let advBudCnt = obj.trips.advanceBudget.length;
			for (var k = 0; k < advBudCnt; k++) {

				row2['Payment Type'] = ((obj.trips.advanceBudget[k] && obj.trips.advanceBudget[k].vendorPayment && obj.trips.advanceBudget[k].vendorPayment.paymentMode) || 'NA');
				row2['Ref No'] = ((obj.trips.advanceBudget[k].reference_no) || 'NA');
				row2['Amount Paid'] = ((obj.trips.advanceBudget[k].amount) || 0);
				row2['Paid By Broker'] = (obj.trips.advanceBudget[k].paidToBroker === false) ? "No" : "Yes";
				row2['Date Of Ref No'] = (obj.trips.advanceBudget[k].date ? moment(obj.trips.advanceBudget[k].date).format("DD-MM-YYYY") : 'NA');
				//rowNum++;


				addWorkbookRowDefaultBlank(row2, ws1, headers, (rowNum++));

			}
		}
		//addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, user.clientId, 'tripRecoReport', 'TripRecoReport', callback);
};
// END

// Start Trip Gr Report Download - By Harikesh - Dated: 23/10/2019

module.exports.tripGrReportDownload = function (aData, req, configs, tableVisible, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip GR Cron Report');
	let table = [];
	table = req.tableAcc;
	req.tableAcc = [];
	let tableF = [];
	table.forEach(obj => {
		tableVisible.forEach(visb => {
			if (obj === visb)
				tableF.push(visb);
		})
	});

	req.tableAcc = tableF;

	let headers = ['GR ID',
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripNo') + 1 : true)) && [...ax(configName(configs, 'trip_no', "TRIP NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('status') + 1 : true)) && [...ax(configName(configs, 'status', "GR STATUS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grNo') + 1 : true)) && [...ax(configName(configs, 'grNumber', "GR NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grDate') + 1 : true)) && [...ax(configName(configs, 'grDate', "GR DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadingDate') + 1 : true)) && [...ax(configName(configs, 'loadingDate', "LOADING DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehNo') + 1 : true)) && [...ax(configName(configs, 'vehicle_no', "VEHICLE NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('model') + 1 : true)) && [...ax(configName(configs, 'model', "VEHICLE MODEL"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialCode') + 1 : true)) && [...ax(configName(configs, 'material', "MATERIAL CODE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialName') + 1 : true)) && [...ax(configName(configs, 'materialName', "MATERIAL NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadingDate') + 1 : true)) && [...ax(configName(configs, 'billingUnloadingTime', "UNLOADING DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('customer') + 1 : true)) && [...ax(configName(configs, 'customer', "CUSTOMER"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignor') + 1 : true)) && [...ax(configName(configs, 'consignor', "CONSIGNOR"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignee') + 1 : true)) && [...ax(configName(configs, 'consignee', "CONSIGNEE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingParty') + 1 : true)) && [...ax(configName(configs, 'billingParty', "BILLINGPARTY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingRoute') + 1 : true)) && [...ax(configName(configs, 'route', "BILLING ROUTE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('source') + 1 : true)) && [...ax(configName(configs, 'source', "SOURCE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('destination') + 1 : true)) && [...ax(configName(configs, 'destination', "DESTINATION"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('km') + 1 : true)) && [...ax(configName(configs, 'routeDistance', "KM"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentBasis') + 1 : true)) && [...ax(configName(configs, 'payment_basis', "PAYMENT BASIS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentType') + 1 : true)) && [...ax(configName(configs, 'payment_type', "PAYMENT TYPE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('baseValueLabel') + 1 : true)) && [...ax(configName(configs, 'baseValueLabel', "CAPACITY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaNo') + 1 : true)) && [...ax(configName(configs, false, "FPA NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipNo') + 1 : true)) && [...ax(configName(configs, 'loading_slip', "HIRESLIP NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invDate') + 1 : true)) && [...ax(configName(configs, 'invDate', "INVOICE DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invNo') + 1 : true)) && [...ax(configName(configs, 'invoiceNo', "INVOICE NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invAmt') + 1 : true)) && [...ax(configName(configs, 'invoiceAmt', "INVOICE AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadRefNo') + 1 : true)) && [...ax(configName(configs, 'loadRefNumber', "LOAD REF. NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref1') + 1 : true)) && [...ax(configName(configs, 'ref1', "REF1"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref2') + 1 : true)) && [...ax(configName(configs, 'ref2', "REF2"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref3') + 1 : true)) && [...ax(configName(configs, 'ref3', "REF3"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref4') + 1 : true)) && [...ax(configName(configs, 'ref4', "REF4"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('incentive') + 1 : true)) && [...ax(configName(configs, 'incentive', "INCENTIVE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('qty') + 1 : true)) && [...ax(configName(configs, 'noOfUnits', "QTY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('weight') + 1 : true)) && [...ax(configName(configs, 'weightPerUnit', "WEIGHT(T)"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingUnit') + 1 : true)) && [...ax(configName(configs, 'billingNoOfUnits', "BILLING UNIT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingWeight') + 1 : true)) && [...ax(configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('rate') + 1 : true)) && [...ax(configName(configs, 'rate', "RATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('freight') + 1 : true)) && [...ax(configName(configs, 'basicFreight', "FREIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totfreight') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOTAL FREIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('cGST') + 1 : true)) && [...ax(configName(configs, 'cGST', "CGST"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('sGST') + 1 : true)) && [...ax(configName(configs, 'sGST', "SGST"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('iGST') + 1 : true)) && [...ax(configName(configs, 'iGST', "IGST"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totAmt') + 1 : true)) && [...ax(configName(configs, 'totalAmount', "TOTAL AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totSuppAmt') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('internal_rate') + 1 : true)) && [...ax(configName(configs, 'internal_rate', "INTERNAL RATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('branch') + 1 : true)) && [...ax(configName(configs, 'branch', "BRANCH"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billNo') + 1 : true)) && [...ax(configName(configs, 'billNo', "BILL NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billDate') + 1 : true)) && [...ax(configName(configs, 'billDate', "BILL DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arNo') + 1 : true)) && [...ax(configName(configs, 'arNo', "AR NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arDate') + 1 : true)) && [...ax(configName(configs, 'arDate', "AR DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ewayBill') + 1 : true)) && [...ax(configName(configs, 'eWayBills', "EWAY BILLS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grRemark') + 1 : true)) && [...ax(configName(configs, 'remarks', "GR REMARK"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('podRem') + 1 : true)) && [...ax(configName(configs, 'arRemark', "POD REMARK"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryBy') + 1 : true)) && [...ax(configName(configs, 'entryBy', "ENTRY BY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryAt') + 1 : true)) && [...ax(configName(configs, 'entryAt', "ENTRY AT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ownership') + 1 : true)) && [...ax(configName(configs, 'ownershipType', "OWNERSHIP"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStartDate') + 1 : true)) && [...ax(configName(configs, 'tripStartDate', "TRIP START DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeName') + 1 : true)) && [...ax(configName(configs, 'routeName', "ROUTE NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrRec') + 1 : true)) && [...ax(configName(configs, 'mrReceived', "MR RECEIVED"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrBalFrei') + 1 : true)) && [...ax(configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrChitStatus') + 1 : true)) && [...ax(configName(configs, 'mrChitStatus', "MR CHIT STATUS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadedBy') + 1 : true)) && [...ax(configName(configs, 'unLoadedBy', "UNLOADED BY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaAmt') + 1 : true)) && [...ax(configName(configs, 'fpaAmt', "FPA AMT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipTotPay') + 1 : true)) && [...ax(configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('nonBillGr') + 1 : true)) && [...ax(configName(configs, 'nonBillableGr', "NONBILLABLE GR"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehOwnerName') + 1 : true)) && [...ax(configName(configs, 'owner_name', "VEHICLE OWNER NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('segment') + 1 : true)) && [...ax(configName(configs, 'segment_type', "SEGMENT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billed') + 1 : true)) && [...ax(configName(configs, 'billed', "BILLED"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('company') + 1 : true)) && [...ax(configName(configs, 'client', 'COMPANY'))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('reportDate') + 1 : true)) && [...ax(configName(configs, 'unloadingArrivalTime', 'REPORTING DATE'))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendorRemark') + 1 : true)) && [...ax(configName(configs, 'vendorRemark', 'HIRE PARTY REMARK'))] || [])
	];


	let rowNum = 2;
	formatColumnHeaders(ws1, 1, headers, [0, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
	aData.forEach(obj => {
		let row = {};
		if (!obj.inv) obj.inv = [];
		row['GR ID'] = obj.gr_id && obj.gr_id.toString();
		row['TRIP NO.'] = (obj.trip && obj.trip.trip_no) || 'NA';
		row[configName(configs, 'status', "GR STATUS")] = obj.status || 'NA';
		row[configName(configs, 'grNumber', "GR NO.")] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
		row[configName(configs, 'grDate', "GR DATE")] = obj.grDate ? moment(obj.grDate).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'vehicle_no', "VEHICLE NO.")] = (obj.trip && obj.trip.vehicle_no) || 'NA';
		row[configName(configs, 'model', "VEHICLE MODEL")] = (obj.vehicle && obj.vehicle.model) || 'NA';
		row[configName(configs, 'loadingDate', "LOADING DATE")] = obj.statuses && obj.statuses.find(st => st.status === 'Loading Ended') ? moment(new Date(obj.statuses.find(st => st.status === 'Loading Ended').date)).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'material', "MATERIAL CODE")] = (obj.inv.length && obj.inv[0].material) ? obj.inv.map(o => o.material && o.material.groupCode).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[configName(configs, 'materialName', "MATERIAL NAME")] = (obj.inv.length && obj.inv[0].material) ? obj.inv.map(o => o.material && o.material.groupName).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[configName(configs, 'customer', "CUSTOMER")] = (obj.customer && obj.customer.c_name) || 'NA';
		row[configName(configs, 'consignor', "CONSIGNOR")] = (obj.consignor && obj.consignor.cogo_name) || 'NA';
		row[configName(configs, 'consignee', "CONSIGNEE")] = (obj.consignee && obj.consignee.coge_name) || 'NA';
		row[configName(configs, 'bilgprty', "BILLINGPARTY")] = (obj.bilgprty && obj.bilgprty.bp_name) || 'NA';
		row["ROUTE"] = (obj.tRoute && obj.tRoute.rout_name) || 'NA';
		row[configName(configs, 'tRoute', "BILLING ROUTE")] = ((obj.ack && obj.ack.ack_source) ? ((obj.ack.ack_source) + ' to ' + (obj.ack.ack_destin)) : 'NA');
		row[configName(configs, 'source', "SOURCE")] = (obj.ack && obj.ack.ack_source) ? (obj.ack.ack_source) : 'NA';
		row[configName(configs, 'destination', "DESTINATION")] = (obj.ack && obj.ack.ack_destin) ? (obj.ack.ack_destin) : 'NA';
		row[configName(configs, 'routeDistance', "KM")] = obj.inv && obj.inv[0] && obj.inv[0].routeDistance || 'NA';
		row[configName(configs, 'payment_basis', "PAYMENT BASIS")] = obj.payment_basis || 'NA';
		row[configName(configs, 'payment_type', "PAYMENT TYPE")] = obj.payment_type || 'NA';
		row[configName(configs, 'baseValueLabel', "CAPACITY")] = obj.inv && obj.inv[0] && obj.inv[0].baseValueLabel || 'NA';
		row[configName(configs, false, "FPA NO")] = (obj.fpa && obj.fpa.refNo) || 'NA';
		row[configName(configs, 'loading_slip', "HIRESLIP NO")] = (obj.trip && obj.trip.venDeal_loadSlip) || 'NA';
		row[configName(configs, 'invoiceNo', "INVOICE DATE")] = obj.inv && obj.inv[0] && obj.inv[0].invoiceDate || 'NA';
		row[configName(configs, 'invoiceNo', "INVOICE NO.")] = obj.inv.map(o => o.invoiceNo).join(' ,') || 'NA';
		row[configName(configs, 'invoiceAmt', "INVOICE AMOUNT")] = obj.inv.map(o => o.invoiceAmt).join(' ,') || 'NA';
		row[configName(configs, 'incentive', "INCENTIVE")] = obj.charges ? obj.charges.incentive : 'NA';
		row[configName(configs, 'noOfUnits', "QTY")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.noOfUnits || 0, 0);
		row[configName(configs, 'weightPerUnit', "WEIGHT(T)")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.weightPerUnit || 0, 0) + ' T';
		row[configName(configs, 'billingNoOfUnits', "BILLING UNIT")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.billingNoOfUnits || 0, 0);
		row[configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.billingWeightPerUnit || 0, 0);
		row[configName(configs, 'rate', "RATE")] = obj.inv.map(o => (o.rate && parseFloat(o.rate.toFixed(2) || 0))).join(',') || 'NA';
		row[configName(configs, 'basicFreight', "FREIGHT")] = parseFloat(obj.basicFreight && obj.basicFreight.toFixed(2) || 0);
		row[configName(configs, 'totalFreight', "TOTAL FREIGHT")] = parseFloat(obj.totalFreight && obj.totalFreight.toFixed(2) || 0);
		row[configName(configs, 'cGST', "CGST")] = obj.cGST && parseFloat(obj.cGST.toFixed(2) || 0);
		row[configName(configs, 'sGST', "SGST")] = obj.sGST && parseFloat(obj.sGST.toFixed(2) || 0);
		row[configName(configs, 'iGST', "IGST")] = obj.iGST && parseFloat(obj.iGST.toFixed(2) || 0);
		row[configName(configs, 'totalAmount', "TOTAL AMOUNT")] = parseFloat(obj.totalAmount && obj.totalAmount.toFixed(2) || 0);
		row[configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT")] = parseFloat(obj.supplementaryBill && obj.supplementaryBill.totalFreight && obj.supplementaryBill.totalFreight.toFixed(2) || 0);
		row[configName(configs, 'internal_rate', "INTERNAL RATE")] = obj.internal_rate && obj.internal_rate.toFixed(2) || 0;
		row[configName(configs, 'branch', "BRANCH")] = obj.branch && obj.branch.brch_name || 'NA';
		row[configName(configs, 'billNo', "BILL NO")] = obj.bill && obj.bill.billNo || 'NA';
		row[configName(configs, 'billDate', "BILL DATE")] = obj.bill && obj.bill.billDate && moment(obj.bill.billDate).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'arNo', "AR NO")] = obj.pod && obj.pod.arNo || 'NA';
		row[configName(configs, 'arDate', "AR DATE")] = obj.pod && obj.pod.date && moment(obj.pod.date).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'loadRefNumber', "LOAD REF. NO")] = obj.inv.map(o => o.loadRefNumber).join(' ,') || 'NA';
		row[configName(configs, 'ref1', "REF1")] = obj.inv.map(o => o.ref1).join(' ,') || 'NA';
		row[configName(configs, 'ref2', "REF2")] = obj.inv.map(o => o.ref2).join(' ,') || 'NA';
		row[configName(configs, 'ref3', "REF3")] = obj.inv.map(o => o.ref3).join(' ,') || 'NA';
		row[configName(configs, 'ref4', "REF4")] = obj.inv.map(o => o.ref4).join(' ,') || 'NA';
		row[configName(configs, 'eWayBills', "EWAY BILLS")] = obj.eWayBills ? obj.eWayBills.map(o => o.number).join(' ,') : 'NA';
		row[configName(configs, 'remarks', "GR REMARK")] = obj.remarks || 'NA';
		row[configName(configs, 'arRemark', "POD REMARK")] = obj.pod && obj.pod.arRemark || 'NA';

		let grAss = obj.statuses.find(st => st.status === 'GR Assigned');

		row[configName(configs, 'entryBy', "ENTRY BY")] = grAss && grAss.user_full_name || 'NA';
		row[configName(configs, 'entryAt', "ENTRY AT")] = grAss && moment(grAss.date).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'ownershipType', "OWNERSHIP")] = (obj.trip && obj.trip.ownershipType) || 'NA';

		row[configName(configs, 'tripStartDate', "TRIP START DATE")] = (obj.trip && obj.trip.statuses && obj.trip.statuses.length > 0) ? moment(obj.trip.statuses.find(function (element) {
			return element.status === "Trip not started";
		}).date).format("DD-MM-YYYY") : "NA";
		row[configName(configs, 'routeName', "ROUTE NAME")] = (obj.trip && obj.trip.route_name) || 'NA';
		let mrRec = (((obj.moneyReceipt && obj.moneyReceipt.totalMrAmount) || 0) + ((obj.moneyReceipt && obj.moneyReceipt.deduction) || 0));
		row[configName(configs, 'mrReceived', "MR RECEIVED")] = mrRec || 'NA';
		let mrBalFr = (((obj.totalFreight || 0) + (obj.supplementaryBill && obj.supplementaryBill.totalFreight || 0)) - mrRec);
		row[configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")] = mrBalFr || 'NA';
		row[configName(configs, 'mrChitStatus', "MR CHIT STATUS")] = (obj.moneyReceipt && obj.moneyReceipt.chitPending) || 'NA';
		let uploadedBy = obj.statuses.find(st => st.status === 'Unloading Ended');
		row[configName(configs, 'unLoadedBy', "UNLOADED BY")] = (uploadedBy && uploadedBy.user_full_name) || 'NA';
		row[configName(configs, 'fpaAmt', "FPA AMT")] = (obj.fpa && obj.fpa.amt) || 'NA';
		row[configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")] = obj.totpayable || 'NA';
		row[configName(configs, 'nonBillableGr', "NONBILLABLE GR")] = (obj.isNonBillable) ? "Yes" : "No";

		row[configName(configs, 'owner_name', "VEHICLE OWNER NAME")] = obj.vehicle && obj.vehicle.owner_name || 'NA';
		row[configName(configs, 'segment_type', "SEGMENT")] = (obj.trip && obj.trip.segment_type) || 'NA';
		row[configName(configs, 'billed', "BILLED")] = (obj.bill || obj.supplementaryBillRef || (obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.billNo)) ? 'Yes' : 'No';
		let cId = (obj.bilgprty && obj.bilgprty.bp_clntid) || obj.bp_clntid;
		let clientAllowed = req.user.client_allowed.find(ca => ca.clientId === cId);
		row[configName(configs, 'client', 'COMPANY')] = clientAllowed && clientAllowed.name || req.clientData.client_full_name;
		row[configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'vendorRemark', 'HIRE PARTY REMARK')] = obj.trip && obj.trip.venDeal_remark || 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, req.user.clientId, 'tripGrReport', 'Trip_GrReport', callback);
};

// END

// module.exports.tripGrReportDownloadMMT = function (aData, req, configs, tableVisible, callback) {
// 	let workbook = new Excel.Workbook();
// 	let ws1 = workbook.addWorksheet('Trip GR Cron Report');
// 	let table = [];
// 	table = req.tableAcc;
// 	req.tableAcc = [];
// 	let tableF = [];
// 	table.forEach(obj => {
// 		tableVisible.forEach(visb => {
// 			if(obj === visb)
// 				tableF.push(visb);
// 		})
// 	});
//
// 	req.tableAcc = tableF;
// 	let headers = ['GR ID',
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripNo') + 1 : true)) && [...ax(configName(configs, 'trip_no', "TRIP NO."))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('status') + 1 : true)) && [...ax(configName(configs, 'status', "GR STATUS"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grNo') + 1 : true)) && [...ax(configName(configs, 'grNumber', "GR NO."))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grDate') + 1 : true)) && [...ax(configName(configs, 'grDate', "GR DATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadingDate') + 1 : true)) && [...ax(configName(configs, 'loadingDate', "LOADING DATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehNo') + 1 : true)) && [...ax(configName(configs, 'vehicle_no', "VEHICLE NO."))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('model') + 1 : true)) && [...ax(configName(configs, 'model', "VEHICLE MODEL"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialCode') + 1 : true)) && [...ax(configName(configs, 'material', "MATERIAL CODE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialName') + 1 : true)) && [...ax(configName(configs, 'materialName', "MATERIAL NAME"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadingDate') + 1 : true)) && [...ax(configName(configs, 'billingUnloadingTime', "UNLOADING DATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('customer') + 1 : true)) && [...ax(configName(configs, 'customer', "CUSTOMER"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignor') + 1 : true)) && [...ax(configName(configs, 'consignor', "CONSIGNOR"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignee') + 1 : true)) && [...ax(configName(configs, 'consignee', "CONSIGNEE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingParty') + 1 : true)) && [...ax(configName(configs, 'billingParty', "BILLINGPARTY"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingRoute') + 1 : true)) && [...ax(configName(configs, 'route', "BILLING ROUTE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('source') + 1 : true)) && [...ax(configName(configs, 'source', "SOURCE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('destination') + 1 : true)) && [...ax(configName(configs, 'destination', "DESTINATION"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('km') + 1 : true)) && [...ax(configName(configs, 'routeDistance', "KM"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentBasis') + 1 : true)) && [...ax(configName(configs, 'payment_basis', "PAYMENT BASIS"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentType') + 1 : true)) && [...ax(configName(configs, 'payment_type', "PAYMENT TYPE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('baseValueLabel') + 1 : true)) && [...ax(configName(configs, 'baseValueLabel', "CAPACITY"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaNo') + 1 : true)) && [...ax(configName(configs, false, "FPA NO"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipNo') + 1 : true)) && [...ax(configName(configs, 'loading_slip', "HIRESLIP NO"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invDate') + 1 : true)) && [...ax(configName(configs, 'invDate', "INVOICE DATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invNo') + 1 : true)) && [...ax(configName(configs, 'invoiceNo', "INVOICE NO."))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invAmt') + 1 : true)) && [...ax(configName(configs, 'invoiceAmt', "INVOICE AMOUNT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadRefNo') + 1 : true)) && [...ax(configName(configs, 'loadRefNumber', "LOAD REF. NO"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref1') + 1 : true)) && [...ax(configName(configs, 'ref1', "REF1"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref2') + 1 : true)) && [...ax(configName(configs, 'ref2', "REF2"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref3') + 1 : true)) && [...ax(configName(configs, 'ref3', "REF3"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref4') + 1 : true)) && [...ax(configName(configs, 'ref4', "REF4"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('incentive') + 1 : true)) && [...ax(configName(configs, 'incentive', "INCENTIVE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('qty') + 1 : true)) && [...ax(configName(configs, 'noOfUnits', "QTY"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('weight') + 1 : true)) && [...ax(configName(configs, 'weightPerUnit', "WEIGHT(T)"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingUnit') + 1 : true)) && [...ax(configName(configs, 'billingNoOfUnits', "BILLING UNIT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingWeight') + 1 : true)) && [...ax(configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('rate') + 1 : true)) && [...ax(configName(configs, 'rate', "RATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('freight') + 1 : true)) && [...ax(configName(configs, 'basicFreight', "FREIGHT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totfreight') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOTAL FREIGHT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('cGST') + 1 : true)) && [...ax(configName(configs, 'cGST', "CGST"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('sGST') + 1 : true)) && [...ax(configName(configs, 'sGST', "SGST"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('iGST') + 1 : true)) && [...ax(configName(configs, 'iGST', "IGST"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totAmt') + 1 : true)) && [...ax(configName(configs, 'totalAmount', "TOTAL AMOUNT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totSuppAmt') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('internal_rate') + 1 : true)) && [...ax(configName(configs, 'internal_rate', "INTERNAL RATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('branch') + 1 : true)) && [...ax(configName(configs, 'branch', "BRANCH"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billNo') + 1 : true)) && [...ax(configName(configs, 'billNo', "BILL NO"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billDate') + 1 : true)) && [...ax(configName(configs, 'billDate', "BILL DATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arNo') + 1 : true)) && [...ax(configName(configs, 'arNo', "AR NO"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arDate') + 1 : true)) && [...ax(configName(configs, 'arDate', "AR DATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ewayBill') + 1 : true)) && [...ax(configName(configs, 'eWayBills', "EWAY BILLS"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grRemark') + 1 : true)) && [...ax(configName(configs, 'remarks', "GR REMARK"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('podRem') + 1 : true)) && [...ax(configName(configs, 'arRemark', "POD REMARK"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryBy') + 1 : true)) && [...ax(configName(configs, 'entryBy', "ENTRY BY"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryAt') + 1 : true)) && [...ax(configName(configs, 'entryAt', "ENTRY AT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ownership') + 1 : true)) && [...ax(configName(configs, 'ownershipType', "OWNERSHIP"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStartDate') + 1 : true)) && [...ax(configName(configs, 'tripStartDate', "TRIP START DATE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeName') + 1 : true)) && [...ax(configName(configs, 'routeName', "ROUTE NAME"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrRec') + 1 : true)) && [...ax(configName(configs, 'mrReceived', "MR RECEIVED"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrBalFrei') + 1 : true)) && [...ax(configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrChitStatus') + 1 : true)) && [...ax(configName(configs, 'mrChitStatus', "MR CHIT STATUS"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadedBy') + 1 : true)) && [...ax(configName(configs, 'unLoadedBy', "UNLOADED BY"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaAmt') + 1 : true)) && [...ax(configName(configs, 'fpaAmt', "FPA AMT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipTotPay') + 1 : true)) && [...ax(configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('nonBillGr') + 1 : true)) && [...ax(configName(configs, 'nonBillableGr', "NONBILLABLE GR"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehOwnerName') + 1 : true)) && [...ax(configName(configs, 'owner_name', "VEHICLE OWNER NAME"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('segment') + 1 : true)) && [...ax(configName(configs, 'segment_type', "SEGMENT"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billed') + 1 : true)) && [...ax(configName(configs, 'billed', "BILLED"))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('company') + 1 : true)) && [...ax(configName(configs, 'client', 'COMPANY'))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('reportDate') + 1 : true)) && [...ax(configName(configs, 'unloadingArrivalTime', 'REPORTING DATE'))] || []),
// 		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendorRemark') + 1 : true)) && [...ax(configName(configs, 'vendorRemark', 'HIRE PARTY REMARK'))] || [])
// 	];
//
// 	let rowNum = 2;
// 	formatColumnHeaders(ws1, 1, headers, [0, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
// 	aData.forEach(obj => {
// 		let row = {};
// 		if (!obj.inv) obj.inv = [];
// 		row['GR ID'] = obj.gr_id.toString();
// 		row['TRIP NO.'] = (obj.trip && obj.trip.trip_no) || 'NA';
// 		row[configName(configs, 'status', "GR STATUS")] = obj.status || 'NA';
// 		row[configName(configs, 'grNumber', "GR NO.")] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
// 		row[configName(configs, 'grDate', "GR DATE")] = obj.grDate ? moment(obj.grDate).format("DD-MM-YYYY") : 'NA';
// 		row[configName(configs, 'vehicle_no', "VEHICLE NO.")] = (obj.trip && obj.trip.vehicle_no) || 'NA';
// 		// row[configName(configs, 'model', "VEHICLE MODEL")] = (obj.vehicle && obj.vehicle.model) || 'NA';
// 		row[configName(configs, 'loadingDate', "LOADING DATE")] = obj.statuses && obj.statuses.find(st => st.status === 'Loading Ended') ? moment(new Date(obj.statuses.find(st => st.status === 'Loading Ended').date)).format("DD-MM-YYYY") : 'NA';
// 		// row[configName(configs, 'material', "MATERIAL CODE")] = (obj.inv.length && obj.inv[0].material) ? obj.inv.map(o => o.material && o.material.groupCode).filter(x => Boolean(x)).join(' ,') : 'NA';
// 		row[configName(configs, 'materialName', "MATERIAL NAME")] = (obj.inv.length && obj.inv[0].material) ? obj.inv.map(o => o.material && o.material.groupName).filter(x => Boolean(x)).join(' ,') : 'NA';
// 		row[configName(configs, 'customer', "CUSTOMER")] = (obj.customer && obj.customer.c_name) || 'NA';
// 		row[configName(configs, 'consignor', "CONSIGNOR")] = (obj.consignor && obj.consignor.cogo_name) || 'NA';
// 		row[configName(configs, 'consignee', "CONSIGNEE")] = (obj.consignee && obj.consignee.coge_name) || 'NA';
// 		row[configName(configs, 'bilgprty', "BILLINGPARTY")] = (obj.bilgprty && obj.bilgprty.bp_name) || 'NA';
// 		row[configName(configs, 'routeName', "ROUTE")] = (obj.tRoute && obj.tRoute.rout_name) || 'NA';
// 		row[configName(configs, 'tRoute', "BILLING ROUTE")] = ((obj.ack && obj.ack.ack_source) ? ((obj.ack.ack_source) + ' to ' + (obj.ack.ack_destin)) : 'NA');
// 		row[configName(configs, 'source', "SOURCE")] = (obj.ack && obj.ack.ack_source) ? (obj.ack.ack_source) : 'NA';
// 		row[configName(configs, 'destination', "DESTINATION")] = (obj.ack && obj.ack.ack_destin) ? (obj.ack.ack_destin) : 'NA';
// 		row[configName(configs, 'routeDistance', "KM")] = obj.inv && obj.inv[0] && obj.inv[0].routeDistance || 'NA';
// 		row[configName(configs, 'payment_basis', "PAYMENT BASIS")] = obj.payment_basis || 'NA';
// 		row[configName(configs, 'payment_type', "PAYMENT TYPE")] = obj.payment_type || 'NA';
// 		// row[configName(configs, 'baseValueLabel', "CAPACITY")] = obj.inv && obj.inv[0] && obj.inv[0].baseValueLabel || 'NA';
// 		// row[configName(configs, false, "FPA NO")] = (obj.fpa && obj.fpa.refNo) || 'NA';
// 		row[configName(configs, 'loading_slip', "HIRESLIP NO")] = (obj.trip && obj.trip.venDeal_loadSlip) || 'NA';
// 		row[configName(configs, 'invoiceNo', "INVOICE DATE")] = obj.inv && obj.inv[0] && obj.inv[0].invoiceDate || 'NA';
// 		row[configName(configs, 'invoiceNo', "INVOICE NO.")] = obj.inv.map(o => o.invoiceNo).join(' ,') || 'NA';
// 		row[configName(configs, 'invoiceAmt', "INVOICE AMOUNT")] = obj.inv.map(o => o.invoiceAmt).join(' ,') || 'NA';
// 		// row[configName(configs, 'incentive', "INCENTIVE")] = obj.charges ? obj.charges.incentive : 'NA';
// 		// row[configName(configs, 'noOfUnits', "QTY")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.noOfUnits || 0, 0);
// 		// row[configName(configs, 'weightPerUnit', "WEIGHT(T)")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.weightPerUnit || 0, 0) + ' T';
// 		row[configName(configs, 'billingNoOfUnits', "BILLING UNIT")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.billingNoOfUnits || 0, 0);
// 		row[configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT")] = obj.inv.reduce((acc, invcObj) => acc + invcObj.billingWeightPerUnit || 0, 0);
// 		row[configName(configs, 'rate', "RATE")] = obj.inv.map(o => (o.rate && parseFloat(o.rate.toFixed(2) || 0))).join(',') || 'NA';
// 		row[configName(configs, 'basicFreight', "FREIGHT")] = parseFloat(obj.basicFreight && obj.basicFreight.toFixed(2) || 0);
// 		row[configName(configs, 'totalFreight', "TOTAL FREIGHT")] = parseFloat(obj.totalFreight && obj.totalFreight.toFixed(2) || 0);
// 		// row[configName(configs, 'cGST', "CGST")] = obj.cGST && parseFloat(obj.cGST.toFixed(2) || 0);
// 		// row[configName(configs, 'sGST', "SGST")] = obj.sGST && parseFloat(obj.sGST.toFixed(2) || 0);
// 		// row[configName(configs, 'iGST', "IGST")] = obj.iGST && parseFloat(obj.iGST.toFixed(2) || 0);
// 		// row[configName(configs, 'totalAmount', "TOTAL AMOUNT")] = parseFloat(obj.totalAmount && obj.totalAmount.toFixed(2) || 0);
// 		row[configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT")] = parseFloat(obj.supplementaryBill && obj.supplementaryBill.totalFreight && obj.supplementaryBill.totalFreight.toFixed(2) || 0);
// 		row[configName(configs, 'internal_rate', "INTERNAL RATE")] = obj.internal_rate && obj.internal_rate.toFixed(2) || 0;
// 		row[configName(configs, 'branch', "BRANCH")] = obj.branch && obj.branch.brch_name || 'NA';
// 		row[configName(configs, 'billNo', "BILL NO")] = obj.bill && obj.bill.billNo || 'NA';
// 		row[configName(configs, 'billDate', "BILL DATE")] = obj.bill && obj.bill.billDate && moment(obj.bill.billDate).format("DD-MM-YYYY") || 'NA';
// 		row[configName(configs, 'arNo', "AR NO")] = obj.pod && obj.pod.arNo || 'NA';
// 		row[configName(configs, 'arDate', "AR DATE")] = obj.pod && obj.pod.date && moment(obj.pod.date).format("DD-MM-YYYY") || 'NA';
// 		row[configName(configs, 'loadRefNumber', "LOAD REF. NO")] = obj.inv.map(o => o.loadRefNumber).join(' ,') || 'NA';
// 		row[configName(configs, 'ref1', "REF1")] = obj.inv.map(o => o.ref1).join(' ,') || 'NA';
// 		row[configName(configs, 'ref2', "REF2")] = obj.inv.map(o => o.ref2).join(' ,') || 'NA';
// 		row[configName(configs, 'ref3', "REF3")] = obj.inv.map(o => o.ref3).join(' ,') || 'NA';
// 		row[configName(configs, 'ref4', "REF4")] = obj.inv.map(o => o.ref4).join(' ,') || 'NA';
// 		row[configName(configs, 'eWayBills', "EWAY BILLS")] = obj.eWayBills ? obj.eWayBills.map(o => o.number).join(' ,') : 'NA';
// 		row[configName(configs, 'remarks', "GR REMARK")] = obj.remarks || 'NA';
// 		row[configName(configs, 'arRemark', "POD REMARK")] = obj.pod && obj.pod.arRemark || 'NA';
//
// 		let grAss = obj.statuses.find(st => st.status === 'GR Assigned');
//
// 		row[configName(configs, 'entryBy', "ENTRY BY")] = grAss && grAss.user_full_name || 'NA';
// 		row[configName(configs, 'entryAt', "ENTRY AT")] = grAss && moment(grAss.date).format("DD-MM-YYYY") || 'NA';
// 		row[configName(configs, 'ownershipType', "OWNERSHIP")] = (obj.trip && obj.trip.ownershipType) || 'NA';
//
// 		row[configName(configs, 'tripStartDate', "TRIP START DATE")] = (obj.trip && obj.trip.statuses && obj.trip.statuses.length > 0) ? moment(obj.trip.statuses.find(function (element) {
// 			return element.status === "Trip not started";
// 		}).date).format("DD-MM-YYYY") : "NA";
// 		// row[configName(configs, 'routeName', "ROUTE NAME")] = (obj.trip && obj.trip.route_name) || 'NA';
// 		let mrRec = (((obj.moneyReceipt && obj.moneyReceipt.totalMrAmount) || 0) + ((obj.moneyReceipt && obj.moneyReceipt.deduction) || 0));
// 		row[configName(configs, 'mrReceived', "MR RECEIVED")] = mrRec || 'NA';
// 		let mrBalFr = (((obj.totalFreight || 0) + (obj.supplementaryBill && obj.supplementaryBill.totalFreight || 0)) - mrRec);
// 		row[configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")] = mrBalFr || 'NA';
// 		// row[configName(configs, 'mrChitStatus', "MR CHIT STATUS")] = (obj.moneyReceipt && obj.moneyReceipt.chitPending) || 'NA';
// 		let uploadedBy = obj.statuses.find(st => st.status === 'Unloading Ended');
// 		row[configName(configs, 'unLoadedBy', "UNLOADED BY")] = (uploadedBy && uploadedBy.user_full_name) || 'NA';
// 		row[configName(configs, 'fpaAmt', "FPA AMT")] = (obj.fpa && obj.fpa.amt) || 'NA';
// 		row[configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")] = obj.totpayable || 'NA';
// 		row[configName(configs, 'nonBillableGr', "NONBILLABLE GR")] = (obj.isNonBillable) ? "Yes" : "No";
//
// 		row[configName(configs, 'owner_name', "VEHICLE OWNER NAME")] = obj.vehicle && obj.vehicle.owner_name || 'NA';
// 		row[configName(configs, 'segment_type', "SEGMENT")] = (obj.trip && obj.trip.segment_type) || 'NA';
// 		row[configName(configs, 'billed', "BILLED")] = (obj.bill || obj.supplementaryBillRef || (obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.billNo)) ? 'Yes' : 'No';
// 		let cId = (obj.bilgprty && obj.bilgprty.bp_clntid) || obj.bp_clntid;
// 		let clientAllowed = req.user.client_allowed.find(ca => ca.clientId === cId);
// 		// row[configName(configs, 'client', 'COMPANY')] = clientAllowed && clientAllowed.name || 'DGFC FCM';
// 		row[configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("DD-MM-YYYY") : 'NA';
// 		row[configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("DD-MM-YYYY") : 'NA';
// 		// row[configName(configs, 'vendorRemark', 'HIRE PARTY REMARK')] = obj.trip && obj.trip.venDeal_remark || 'NA';
// 		addWorkbookRow(row, ws1, headers, (rowNum++));
// 	});
// 	saveFileAndReturnCallback(workbook, req.user.clientId, 'tripGrReport', 'Trip_GrReport', callback);
// };

module.exports.groupBalLedgerWiseRep = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Group Balance Ledger Wise`);
	let headers = ['Ledger', 'Opening Bal.', 'Op. Dr/Cr', 'Debit Amt', 'Credit Amt', 'Closing Bal.', 'Cl. Dr/Cr'];
	formatTitle(ws1, headers.length, `Group Balance Ledger Wise`);
	formatColumnHeaders(ws1, 3, headers, [12, 15, 12, 15, 15, 15, 12]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["Ledger"] = obj.account && obj.account.name || 'NA';
		row['Opening Bal.'] = Math.abs(obj.ob) || 0;
		if (obj.ob < 0)
			row['Op. Dr/Cr'] = 'Cr';
		else
			row['Op. Dr/Cr'] = 'Dr';

		row['Debit Amt'] = obj.dr || 0;
		row['Credit Amt'] = obj.cr || 0;
		row['Closing Bal.'] = Math.abs(obj.cb) || 0;

		if (obj.cb > 0)
			row['Cl. Dr/Cr'] = 'Dr';
		else
			row['Cl. Dr/Cr'] = 'Cr';

		let cell = toAlphabet(3) + rowNum;
		let cell2 = toAlphabet(5) + rowNum;
		let cell3 = toAlphabet(6) + rowNum;
		let cell4 = toAlphabet(7) + rowNum;
		setCellNumFormat(ws1, cell);
		setCellNumFormat(ws1, cell2);
		setCellNumFormat(ws1, cell3);
		setCellNumFormat(ws1, cell4);

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Group Balance Ledger Wise Report', 'Group Balance Ledger Wise', callback);
}

module.exports.groupBalanceTDSSumarry = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('TDS Summary Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["S.No","Particulars","Date", "Opening Balance","Op. Dr/Cr", "Debit", "Credit","Closing Balance","Cl. Dr/Cr"];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 10;
	formatColumnHeaders(ws1, 9, headers, [10,35,20, 20, 20, 20, 22,20,20]);
	headerTopMerged(ws1, 'A1', 'C1', 'Caravan Project Logistics(Delhi)', option);
	headerTopMerged(ws1, 'A2', 'C2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'C3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'C4',aData[0] && aData[0].account && aData[0].account.type && aData[0].account.type.name , options);
	headerTopMerged(ws1, 'A5', 'C5', 'Pan No:-AERPG9858F', options);
	headerTopMerged(ws1, 'A6', 'C6', 'GSTIN NO:-07AERPG9858F1ZW', options);
	headerTopMerged(ws1, 'A7', 'C7', 'Group Summary', option);
	headerTopMerged(ws1, 'A8', 'C8', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	// headerTopMerged(ws1, 'A6', 'C6', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	// headerTopMerged(ws1, 'B7', 'E7', aData[0] && aData[0].account && aData[0].account.type && aData[0].account.type.name, options);
	// headerTopMerged(ws1, 'B8', 'E8','Caravan Project Logistics(Delhi)', options);
	// headerTopMerged(ws1, 'B9', 'E9',fromDate + ' ' + 'TO' + ' ' +  toDate, options);
	// headerTopMerged(ws1, 'C10', 'D10','Transactions', options);
	let totalObj = {
		opening:0,
		debit:0,
		credit:0,
		closing:0,
	}
	let cnt = 1;
	aData.forEach(obj => {
		totalObj.opening += Math.abs(obj.ob) || 0;
		totalObj.debit += obj.dr || 0;
		totalObj.credit += obj.cr || 0;
		totalObj.closing += Math.abs(obj.cb) || 0;
		let row = {};
		row["S.No"] = cnt++;
		row["Date"] = obj.date && moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
		row["Particulars"] = obj.account && obj.account.name || 'NA';
		row["Opening Balance"] = parseFloat((Math.abs(obj.ob) || 0).toFixed(2));
		if (obj.ob < 0)
			row['Op. Dr/Cr'] = 'Cr';
		else
			row['Op. Dr/Cr'] = 'Dr';
		row["Debit"] = parseFloat((obj.dr || 0).toFixed(2));
		row["Credit"] = parseFloat((obj.cr || 0).toFixed(2));
		row["Closing Balance"] = parseFloat((Math.abs(obj.cb) || 0).toFixed(2));
		if (obj.cb > 0)
			row['Cl. Dr/Cr'] = 'Dr';
		else
			row['Cl. Dr/Cr'] = 'Cr';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,parseFloat((totalObj.opening).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,parseFloat((totalObj.debit).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'G',rowNum,parseFloat((totalObj.credit).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'H',rowNum,parseFloat((totalObj.closing).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'TDS Summary Report', 'TDS Summary Report', callback);
};

module.exports.groupBalanceTDSSumarryMonthly = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('TDS Summary Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["S.No","Account","Date","Opening Bal.","Op. Dr/Cr","Debit Amt", "Credit Amt","Closing Bal.","Cl. Dr/Cr"];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 10;
	formatColumnHeaders(ws1, 9, headers, [10,35, 20, 20, 20, 20,20,20, 22]);
	headerTopMerged(ws1, 'A1', 'C1', 'Caravan Project Logistics(Delhi)', option);
	headerTopMerged(ws1, 'A2', 'C2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'C3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'C4',aData[0] && aData[0].account && aData[0].account.name , option);
	headerTopMerged(ws1, 'A5', 'C5', 'Pan No:-AERPG9858F', options);
	headerTopMerged(ws1, 'A6', 'C6', 'GSTIN NO:-07AERPG9858F1ZW', options);
	headerTopMerged(ws1, 'A7', 'C7', 'Monthly Summary', option);
	headerTopMerged(ws1, 'A8', 'C8', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	let totalObj = {
		opening:0,
		debit:0,
		credit:0,
		closing:0,
	};
	let cnt = 1;
	aData.forEach(obj => {
		totalObj.opening += Math.abs(obj.ob) || 0;
		totalObj.debit += obj.dr || 0;
		totalObj.credit += obj.cr || 0;
		totalObj.closing += Math.abs(obj.cb) || 0;
		let row = {};
		row["S.No"] = cnt++;
		row["Account"] = aData[0] && aData[0].account && aData[0].account.name;
		row["Date"] = monthArr[obj._id.month -1] + "-" + obj._id.year;
		row["Opening Bal."] = parseFloat((Math.abs(obj.ob) || 0).toFixed(2));
		if (obj.ob < 0)
			row['Op. Dr/Cr'] = 'Cr';
		else
			row['Op. Dr/Cr'] = 'Dr';
		row["Debit Amt"] = parseFloat((obj.dr || 0).toFixed(2));
		row["Credit Amt"] = parseFloat((obj.cr || 0).toFixed(2));
		row["Closing Bal."] = parseFloat((Math.abs(obj.cb) || 0).toFixed(2));
		if (obj.cb > 0)
			row['Cl. Dr/Cr'] = 'Dr';
		else
			row['Cl. Dr/Cr'] = 'Cr';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,parseFloat((totalObj.opening).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,parseFloat((totalObj.debit).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'G',rowNum,parseFloat((totalObj.credit).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'H',rowNum,parseFloat((totalObj.closing).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'TDS Summary Report', 'TDS Summary Report Monthly', callback);
};

module.exports.groupBalanceTDSSumarryDayWise = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('TDS Summary Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers =  ['S.No','Accounts', 'Date','Opening Bal.', 'Op. Dr/Cr', 'Debit Amt', 'Credit Amt', 'Closing Bal.', 'Cl. Dr/Cr'];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 10;
	formatColumnHeaders(ws1, 9, headers, [10,35, 20, 20,20, 20, 20, 22,20, 20]);
	headerTopMerged(ws1, 'A1', 'C1', 'Caravan Project Logistics(Delhi)', option);
	headerTopMerged(ws1, 'A2', 'C2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'C3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'C4',aData[0] && aData[0].account && aData[0].account.name , option);
	headerTopMerged(ws1, 'A5', 'C5', 'Pan No:-AERPG9858F', options);
	headerTopMerged(ws1, 'A6', 'C6', 'GSTIN NO:-07AERPG9858F1ZW', options);
	headerTopMerged(ws1, 'A7', 'C7', 'TDS Daywise', option);
	headerTopMerged(ws1, 'A8', 'C8', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	let totalObj = {
		opening:0,
		debit:0,
		credit:0,
		closing:0,
	}
	let cnt = 1;
	aData.forEach(obj => {
		totalObj.opening += Math.abs(obj.ob) || 0;
		totalObj.debit += obj.dr || 0;
		totalObj.credit += obj.cr || 0;
		totalObj.closing += Math.abs(obj.cb) || 0;
		let row = {};
		row["S.No"] = cnt++;
		row["Accounts"] = obj.account && obj.account.name || 'NA';
		row["Date"] = obj.date && moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
		row['Opening Bal.'] = Math.abs(obj.ob) || 0;
		if (obj.ob < 0)
			row['Op. Dr/Cr'] = 'Cr';
		else
			row['Op. Dr/Cr'] = 'Dr';

		row['Debit Amt'] = obj.dr || 0;
		row['Credit Amt'] = obj.cr || 0;
		row['Closing Bal.'] = Math.abs(obj.cb) || 0;

		if (obj.cb > 0)
			row['Cl. Dr/Cr'] = 'Dr';
		else
			row['Cl. Dr/Cr'] = 'Cr';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,parseFloat((totalObj.opening).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,parseFloat((totalObj.debit).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'G',rowNum,parseFloat((totalObj.credit).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'H',rowNum,parseFloat((totalObj.closing).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum,'',{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'TDS Summary Report', 'TDS Summary Report DayWise', callback);
};

module.exports.grReport = function (aData, req, configs, callback) { //grReport
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip GR Report');
	//console.log(req.tableAcc);
	let headers = ['GR ID',
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripNo') + 1 : true)) && [...ax(configName(configs, 'trip_no', "TRIP NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('status') + 1 : true)) && [...ax(configName(configs, 'status', "GR STATUS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grNo') + 1 : true)) && [...ax(configName(configs, 'grNumber', "GR NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grDate') + 1 : true)) && [...ax(configName(configs, 'grDate', "GR DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadingDate') + 1 : true)) && [...ax(configName(configs, 'loadingDate', "LOADING DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehNo') + 1 : true)) && [...ax(configName(configs, 'vehicle_no', "VEHICLE NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('model') + 1 : true)) && [...ax(configName(configs, 'model', "VEHICLE MODEL"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialCode') + 1 : true)) && [...ax(configName(configs, 'material', "MATERIAL CODE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialName') + 1 : true)) && [...ax(configName(configs, 'materialName', "MATERIAL NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('reportDate') + 1 : true)) && [...ax(configName(configs, 'unloadingArrivalTime', 'REPORTING DATE'))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('reportDate') + 1 : true)) && [...ax(configName({}, 'unloadingArrivalTime', 'REPORTING TIME'))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadingDate') + 1 : true)) && [...ax(configName(configs, 'billingUnloadingTime', "UNLOADING DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadingDate') + 1 : true)) && [...ax(configName({}, 'billingUnloadingTime', "UNLOADING TIME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('customer') + 1 : true)) && [...ax(configName(configs, 'customer', "CUSTOMER"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('customer') + 1 : true)) && [...ax(configName(configs, '', "CUSTOMER CATEGORY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignor') + 1 : true)) && [...ax(configName(configs, 'consignor', "CONSIGNOR"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignee') + 1 : true)) && [...ax(configName(configs, 'consignee', "CONSIGNEE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingParty') + 1 : true)) && [...ax(configName(configs, 'billingParty', "BILLINGPARTY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingRoute') + 1 : true)) && [...ax(configName(configs, 'route', "BILLING ROUTE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('source') + 1 : true)) && [...ax(configName(configs, 'source', "SOURCE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('destination') + 1 : true)) && [...ax(configName(configs, 'destination', "DESTINATION"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('km') + 1 : true)) && [...ax(configName(configs, 'routeDistance', "KM"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentBasis') + 1 : true)) && [...ax(configName(configs, 'payment_basis', "PAYMENT BASIS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentType') + 1 : true)) && [...ax(configName(configs, 'payment_type', "PAYMENT TYPE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('baseValueLabel') + 1 : true)) && [...ax(configName(configs, 'baseValueLabel', "CAPACITY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaNo') + 1 : true)) && [...ax(configName(configs, false, "FPA NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipNo') + 1 : true)) && [...ax(configName(configs, 'loading_slip', "HIRESLIP NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invDate') + 1 : true)) && [...ax(configName(configs, 'invDate', "INVOICE DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invNo') + 1 : true)) && [...ax(configName(configs, 'invoiceNo', "INVOICE NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invAmt') + 1 : true)) && [...ax(configName(configs, 'invoiceAmt', "INVOICE AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadRefNo') + 1 : true)) && [...ax(configName(configs, 'loadRefNumber', "LOAD REF. NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref1') + 1 : true)) && [...ax(configName(configs, 'ref1', "REF1"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref2') + 1 : true)) && [...ax(configName(configs, 'ref2', "REF2"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref3') + 1 : true)) && [...ax(configName(configs, 'ref3', "REF3"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref4') + 1 : true)) && [...ax(configName(configs, 'ref4', "REF4"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('incentive') + 1 : true)) && [...ax(configName(configs, 'incentive', "INCENTIVE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('qty') + 1 : true)) && [...ax(configName(configs, 'noOfUnits', "QTY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('weight') + 1 : true)) && [...ax(configName(configs, 'weightPerUnit', "WEIGHT(T)"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingUnit') + 1 : true)) && [...ax(configName(configs, 'billingNoOfUnits', "BILLING UNIT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingWeight') + 1 : true)) && [...ax(configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('rate') + 1 : true)) && [...ax(configName(configs, 'rate', "RATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('freight') + 1 : true)) && [...ax(configName(configs, 'basicFreight', "FREIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totfreight') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOTAL FREIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('cGST') + 1 : true)) && [...ax(configName(configs, 'cGST', "CGST"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('sGST') + 1 : true)) && [...ax(configName(configs, 'sGST', "SGST"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('iGST') + 1 : true)) && [...ax(configName(configs, 'iGST', "IGST"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totAmt') + 1 : true)) && [...ax(configName(configs, 'totalAmount', "TOTAL AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totSuppAmt') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('internal_rate') + 1 : true)) && [...ax(configName(configs, 'internal_rate', "INTERNAL RATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('branch') + 1 : true)) && [...ax(configName(configs, 'branch', "BRANCH"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billNo') + 1 : true)) && [...ax(configName(configs, 'billNo', "BILL NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billDate') + 1 : true)) && [...ax(configName(configs, 'billDate', "BILL DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arNo') + 1 : true)) && [...ax(configName(configs, 'arNo', "AR NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arDate') + 1 : true)) && [...ax(configName(configs, 'arDate', "AR DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ewayBill') + 1 : true)) && [...ax(configName(configs, 'eWayBills', "EWAY BILLS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grRemark') + 1 : true)) && [...ax(configName(configs, 'remarks', "GR REMARK"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('podRem') + 1 : true)) && [...ax(configName(configs, 'arRemark', "POD REMARK"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryBy') + 1 : true)) && [...ax(configName(configs, 'entryBy', "ENTRY BY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryAt') + 1 : true)) && [...ax(configName(configs, 'entryAt', "ENTRY AT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ownership') + 1 : true)) && [...ax(configName(configs, 'ownershipType', "OWNERSHIP"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStartDate') + 1 : true)) && [...ax(configName(configs, 'tripStartDate', "TRIP START DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeName') + 1 : true)) && [...ax(configName(configs, 'routeName', "ROUTE NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrRec') + 1 : true)) && [...ax(configName(configs, 'mrReceived', "MR RECEIVED"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrBalFrei') + 1 : true)) && [...ax(configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrChitStatus') + 1 : true)) && [...ax(configName(configs, 'mrChitStatus', "MR CHIT STATUS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadedBy') + 1 : true)) && [...ax(configName(configs, 'unLoadedBy', "UNLOADED BY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaAmt') + 1 : true)) && [...ax(configName(configs, 'fpaAmt', "FPA AMT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipTotPay') + 1 : true)) && [...ax(configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('nonBillGr') + 1 : true)) && [...ax(configName(configs, 'nonBillableGr', "NONBILLABLE GR"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehOwnerName') + 1 : true)) && [...ax(configName(configs, 'owner_name', "VEHICLE OWNER NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehOwnerGroup') + 1 : true)) && [...ax(configName(configs, 'owner_group', "FLEET"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('segment') + 1 : true)) && [...ax(configName(configs, 'segment_type', "SEGMENT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billed') + 1 : true)) && [...ax(configName(configs, 'billed', "BILLED"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('company') + 1 : true)) && [...ax(configName(configs, 'client', 'COMPANY'))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendorRemark') + 1 : true)) && [...ax(configName(configs, 'vendorRemark', 'HIRE PARTY REMARK'))] || [])
	];

	// if (req.body.aDownloadRistrict && req.body.aDownloadRistrict.length > 0) {
	// 	let aHeaders = req.body.aDownloadRistrict;
	// 	headers = aHeaders.map(function (x) {
	// 		return x.toUpperCase()
	// 	});
	// }

	let rowNum = 2;
	formatColumnHeaders(ws1, 1, headers, [0, 8, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 15, 15, 15, 20, 20, 20, 15, 20, 20, 20, 20, 20, 20, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	aData.forEach(obj => {
		let row = {};
		if (!obj.invoices) obj.invoices = [];
		row['GR ID'] = obj._id.toString();
		row['TRIP NO.'] = (obj.trip && obj.trip.trip_no) || 'NA';
		row[configName(configs, 'status', "GR STATUS")] = obj.status || 'NA';
		row[configName(configs, 'grNumber', "GR NO.")] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
		row[configName(configs, 'grDate', "GR DATE")] = obj.grDate ? moment(obj.grDate).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'loadingDate', "LOADING DATE")] = obj.statuses && obj.statuses.find(st => st.status === 'Loading Ended') ? moment(new Date(obj.statuses.find(st => st.status === 'Loading Ended').date)).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'vehicle_no', "VEHICLE NO.")] = (obj.trip && obj.trip.vehicle_no) || 'NA';
		row[configName(configs, 'model', "VEHICLE MODEL")] = (obj.vehicle && obj.vehicle.model) || 'NA';
		row[configName(configs, 'material', "MATERIAL CODE")] = (obj.invoices.length && obj.invoices[0].material) ? obj.invoices.map(o => o.material && o.material.groupCode).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[configName(configs, 'materialName', "MATERIAL NAME")] = (obj.invoices.length && obj.invoices[0].material) ? obj.invoices.map(o => o.material && o.material.groupName).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[configName(configs, 'customer', "CUSTOMER")] = (obj.customer && obj.customer.name) || 'NA';
		row[configName(configs, '', "CUSTOMER CATEGORY")] = (obj.customer && obj.customer.category) || 'NA';
		row[configName(configs, 'consignor', "CONSIGNOR")] = (obj.consignor && obj.consignor.name) || 'NA';
		row[configName(configs, 'consignee', "CONSIGNEE")] = (obj.consignee && obj.consignee.name) || 'NA';
		row[configName(configs, 'billingParty', "BILLINGPARTY")] = (obj.billingParty && obj.billingParty.name) || 'NA';
		row["ROUTE"] = (obj.route && obj.route.name) || 'NA';
		row[configName(configs, 'route', "BILLING ROUTE")] = ((obj.acknowledge && obj.acknowledge.source) ? ((obj.acknowledge.source) + ' to ' + (obj.acknowledge.destination)) : 'NA');
		row[configName(configs, 'source', "SOURCE")] = (obj.acknowledge && obj.acknowledge.source) ? (obj.acknowledge.source) : 'NA';
		row[configName(configs, 'destination', "DESTINATION")] = (obj.acknowledge && obj.acknowledge.destination) ? (obj.acknowledge.destination) : 'NA';
		row[configName(configs, 'routeDistance', "KM")] = obj.invoices && obj.invoices[0] && obj.invoices[0].routeDistance || 'NA';
		row[configName(configs, 'payment_basis', "PAYMENT BASIS")] = obj.payment_basis || 'NA';
		row[configName(configs, 'payment_type', "PAYMENT TYPE")] = obj.payment_type || 'NA';
		row[configName(configs, 'baseValueLabel', "CAPACITY")] = obj.invoices && obj.invoices[0] && obj.invoices[0].baseValueLabel || 'NA';
		row[configName(configs, false, "FPA NO")] = (obj.fpa && obj.fpa.refNo) || 'NA';
		row[configName(configs, 'loading_slip', "HIRESLIP NO")] = (obj.trip && obj.trip.vendorDeal && obj.trip.vendorDeal.loading_slip) || 'NA';
		row[configName(configs, 'invDate', "INVOICE DATE")] = obj.invoices && obj.invoices[0] && moment(obj.invoices[0].invoiceDate).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'invoiceNo', "INVOICE NO.")] = obj.invoices.map(o => o.invoiceNo).join(' ,') || 'NA';
		row[configName(configs, 'invoiceAmt', "INVOICE AMOUNT")] = obj.invoices.map(o => o.invoiceAmt).join(' ,') || 'NA';
		row[configName(configs, 'incentive', "INCENTIVE")] = obj.charges ? obj.charges.incentive : 'NA';
		row[configName(configs, 'noOfUnits', "QTY")] = obj.invoices.reduce((acc, invcObj) => acc + (invcObj.noOfUnits || 0), 0);
		row[configName(configs, 'weightPerUnit', "WEIGHT(T)")] = obj.invoices.reduce((acc, invcObj) => acc + (invcObj.weightPerUnit || 0), 0) + ' T';
		row[configName(configs, 'billingNoOfUnits', "BILLING UNIT")] = obj.invoices.reduce((acc, invcObj) => acc + (invcObj.billingNoOfUnits || 0), 0);
		row[configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT")] = obj.invoices.reduce((acc, invcObj) => acc + (invcObj.billingWeightPerUnit || 0), 0);
		row[configName(configs, 'rate', "RATE")] = obj.invoices.map(o => (o.rate && parseFloat(o.rate.toFixed(2) || 0))).join(',') || 'NA';
		row[configName(configs, 'basicFreight', "FREIGHT")] = parseFloat(obj.basicFreight && obj.basicFreight.toFixed(2) || 0);
		row[configName(configs, 'totalFreight', "TOTAL FREIGHT")] = parseFloat(obj.totalFreight && obj.totalFreight.toFixed(2) || 0);
		row[configName(configs, 'cGST', "CGST")] = obj.cGST && parseFloat(obj.cGST.toFixed(2) || 0);
		row[configName(configs, 'sGST', "SGST")] = obj.sGST && parseFloat(obj.sGST.toFixed(2) || 0);
		row[configName(configs, 'iGST', "IGST")] = obj.iGST && parseFloat(obj.iGST.toFixed(2) || 0);
		row[configName(configs, 'totalAmount', "TOTAL AMOUNT")] = parseFloat(obj.totalAmount && obj.totalAmount.toFixed(2) || 0);
		row[configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT")] = parseFloat(obj.supplementaryBill && obj.supplementaryBill.totalFreight && obj.supplementaryBill.totalFreight.toFixed(2) || 0);
		row[configName(configs, 'internal_rate', "INTERNAL RATE")] = obj.internal_rate && obj.internal_rate.toFixed(2) || 0;
		row[configName(configs, 'branch', "BRANCH")] = obj.branch && obj.branch.name || 'NA';
		row[configName(configs, 'billNo', "BILL NO")] = obj.bill && obj.bill.billNo || obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.map(o => o.billNo).join(' ,') || 'NA';
		row[configName(configs, 'billDate', "BILL DATE")] = (obj.bill && obj.bill.billDate && moment(obj.bill.billDate).format("DD-MM-YYYY")) || (obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.map(o => moment(o.billDate).format("DD-MM-YYYY")).join(' ,')) || 'NA';
		row[configName(configs, 'arNo', "AR NO")] = obj.pod && obj.pod.arNo || 'NA';
		row[configName(configs, 'arDate', "AR DATE")] = obj.pod && obj.pod.date && moment(obj.pod.date).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'loadRefNumber', "LOAD REF. NO")] = obj.invoices.map(o => o.loadRefNumber).join(' ,') || 'NA';
		row[configName(configs, 'ref1', "REF1")] = obj.invoices.map(o => o.ref1).join(' ,') || 'NA';
		row[configName(configs, 'ref2', "REF2")] = obj.invoices.map(o => o.ref2).join(' ,') || 'NA';
		row[configName(configs, 'ref3', "REF3")] = obj.invoices.map(o => o.ref3).join(' ,') || 'NA';
		row[configName(configs, 'ref4', "REF4")] = obj.invoices.map(o => o.ref4).join(' ,') || 'NA';
		row[configName(configs, 'eWayBills', "EWAY BILLS")] = obj.eWayBills ? obj.eWayBills.map(o => o.number+'('+moment(o.expiry).format("DD-MM-YYYY")+')').join(' ,') : 'NA';
		row[configName(configs, 'remarks', "GR REMARK")] = obj.remarks || 'NA';
		row[configName(configs, 'arRemark', "POD REMARK")] = obj.pod && obj.pod.arRemark || 'NA';
		let grAss = obj.statuses.find(st => st.status === 'GR Assigned');
		row[configName(configs, 'entryBy', "ENTRY BY")] = grAss && grAss.user_full_name || 'NA';
		row[configName(configs, 'entryAt', "ENTRY AT")] = grAss && moment(grAss.date).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'ownershipType', "OWNERSHIP")] = (obj.trip && obj.trip.ownershipType) || 'NA';
		row[configName(configs, 'tripStartDate', "TRIP START DATE")] = (obj.trip && obj.trip.statuses && obj.trip.statuses.length > 0) ? moment(obj.trip.statuses.find(function (element) {
			return element.status === "Trip not started";
		}).date).format("DD-MM-YYYY") : "NA";
		row[configName(configs, 'routeName', "ROUTE NAME")] = (obj.trip && obj.trip.route_name) || 'NA';
		let mrRec = (((obj.moneyReceipt && obj.moneyReceipt.totalMrAmount) || 0) + ((obj.moneyReceipt && obj.moneyReceipt.deduction) || 0));
		row[configName(configs, 'mrReceived', "MR RECEIVED")] = mrRec || 'NA';
		let mrBalFr = (((obj.totalFreight || 0) + (obj.supplementaryBill && obj.supplementaryBill.totalFreight || 0)) - mrRec);
		row[configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")] = mrBalFr || 'NA';
		row[configName(configs, 'mrChitStatus', "MR CHIT STATUS")] = (obj.moneyReceipt && obj.moneyReceipt.chitPending) || 'NA';
		let uploadedBy = obj.statuses.find(st => st.status === 'Unloading Ended');
		row[configName(configs, 'unLoadedBy', "UNLOADED BY")] = (uploadedBy && uploadedBy.user_full_name) || 'NA';
		row[configName(configs, 'fpaAmt', "FPA AMT")] = (obj.fpa && obj.fpa.amt) || 'NA';
		//row[configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")] = obj.totpayable || 'NA';
		row[configName(configs, 'nonBillableGr', "NONBILLABLE GR")] = (obj.isNonBillable) ? "Yes" : "No";
		row[configName(configs, 'owner_name', "VEHICLE OWNER NAME")] = obj.vehicle && obj.vehicle.owner_name || 'NA';
		row[configName(configs, 'owner_group', "FLEET")] = obj.vehicle && obj.vehicle.owner_group || 'NA';
		row[configName(configs, 'segment_type', "SEGMENT")] = (obj.trip && obj.trip.segment_type) || 'NA';
		row[configName(configs, 'billed', "BILLED")] = (obj.bill || (obj.supplementaryBillRef && obj.supplementaryBillRef[0]) || (obj.provisionalBill && obj.provisionalBill.ref[0])) ? 'Yes' : 'No';
		let cId = (obj.billingParty && obj.billingParty.clientId) || obj.clientId;
		let clientAllowed = req.user.client_allowed.find(ca => ca.clientId === cId);
		row[configName(configs, 'client', 'COMPANY')] = clientAllowed && clientAllowed.name || req.clientData.client_display_name;
		if (headers.indexOf(configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')) + 1) {
			row[configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("DD-MM-YYYY") : 'NA';
			row['REPORTING TIME'] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("HH:mm") : 'NA';
		}
		if (headers.indexOf(configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')) + 1) {
			row[configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("DD-MM-YYYY") : 'NA';
			row['UNLOADING TIME'] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("HH:mm") : 'NA';
		}

		// row[configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("DD-MM-YYYY") : 'NA';
		// row[configName(configs, 'unloadingArrivalTime', 'REPORTING TIME')] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("HH:mm") : 'NA';
		// row[configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("DD-MM-YYYY") : 'NA';
		// row[configName(configs, 'billingUnloadingTime', 'UNLOADING TIME')] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("HH:mm") : 'NA';
		row[configName(configs, 'vendorRemark', 'HIRE PARTY REMARK')] = obj.trip && obj.trip.vendorDeal && obj.trip.vendorDeal.remark || 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, req.user.clientId, 'tripGr', 'Trip_Gr', callback);
};

module.exports.grMMTReport = function (aData, req, configs, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip GR Report');
	//console.log(req.tableAcc);
	let headers = ['GR ID',
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripNo') + 1 : true)) && [...ax(configName(configs, 'trip_no', "TRIP NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('status') + 1 : true)) && [...ax(configName(configs, 'status', "GR STATUS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grNo') + 1 : true)) && [...ax(configName(configs, 'grNumber', "GR NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grDate') + 1 : true)) && [...ax(configName(configs, 'grDate', "GR DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadingDate') + 1 : true)) && [...ax(configName(configs, 'loadingDate', "LOADING DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehNo') + 1 : true)) && [...ax(configName(configs, 'vehicle_no', "VEHICLE NO."))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('model') + 1 : true)) && [...ax(configName(configs, 'model', "VEHICLE MODEL"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialCode') + 1 : true)) && [...ax(configName(configs, 'material', "MATERIAL CODE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('materialName') + 1 : true)) && [...ax(configName(configs, 'materialName', "MATERIAL NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadingDate') + 1 : true)) && [...ax(configName(configs, 'billingUnloadingTime', "UNLOADING DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('customer') + 1 : true)) && [...ax(configName(configs, 'customer', "CUSTOMER"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignor') + 1 : true)) && [...ax(configName(configs, 'consignor', "CONSIGNOR"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('consignee') + 1 : true)) && [...ax(configName(configs, 'consignee', "CONSIGNEE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingParty') + 1 : true)) && [...ax(configName(configs, 'billingParty', "BILLINGPARTY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingRoute') + 1 : true)) && [...ax(configName(configs, 'route', "BILLING ROUTE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('source') + 1 : true)) && [...ax(configName(configs, 'source', "SOURCE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('destination') + 1 : true)) && [...ax(configName(configs, 'destination', "DESTINATION"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('km') + 1 : true)) && [...ax(configName(configs, 'routeDistance', "KM"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentBasis') + 1 : true)) && [...ax(configName(configs, 'payment_basis', "PAYMENT BASIS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('paymentType') + 1 : true)) && [...ax(configName(configs, 'payment_type', "PAYMENT TYPE"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('baseValueLabel') + 1 : true)) && [...ax(configName(configs, 'baseValueLabel', "CAPACITY"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaNo') + 1 : true)) && [...ax(configName(configs, false, "FPA NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipNo') + 1 : true)) && [...ax(configName(configs, 'loading_slip', "HIRESLIP NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invDate') + 1 : true)) && [...ax(configName(configs, 'invDate', "INVOICE DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invNo') + 1 : true)) && [...ax(configName(configs, 'invoiceNo', "INVOICE NO."))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('invAmt') + 1 : true)) && [...ax(configName(configs, 'invoiceAmt', "INVOICE AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('loadRefNo') + 1 : true)) && [...ax(configName(configs, 'loadRefNumber', "LOAD REF. NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref1') + 1 : true)) && [...ax(configName(configs, 'ref1', "REF1"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref2') + 1 : true)) && [...ax(configName(configs, 'ref2', "REF2"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref3') + 1 : true)) && [...ax(configName(configs, 'ref3', "REF3"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ref4') + 1 : true)) && [...ax(configName(configs, 'ref4', "REF4"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('incentive') + 1 : true)) && [...ax(configName(configs, 'incentive', "INCENTIVE"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('qty') + 1 : true)) && [...ax(configName(configs, 'noOfUnits', "QTY"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('weight') + 1 : true)) && [...ax(configName(configs, 'weightPerUnit', "WEIGHT(T)"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingUnit') + 1 : true)) && [...ax(configName(configs, 'billingNoOfUnits', "BILLING UNIT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billingWeight') + 1 : true)) && [...ax(configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('rate') + 1 : true)) && [...ax(configName(configs, 'rate', "RATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('freight') + 1 : true)) && [...ax(configName(configs, 'basicFreight', "FREIGHT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totfreight') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOTAL FREIGHT"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('cGST') + 1 : true)) && [...ax(configName(configs, 'cGST', "CGST"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('sGST') + 1 : true)) && [...ax(configName(configs, 'sGST', "SGST"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('iGST') + 1 : true)) && [...ax(configName(configs, 'iGST', "IGST"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totAmt') + 1 : true)) && [...ax(configName(configs, 'totalAmount', "TOTAL AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('totSuppAmt') + 1 : true)) && [...ax(configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('internal_rate') + 1 : true)) && [...ax(configName(configs, 'internal_rate', "INTERNAL RATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('branch') + 1 : true)) && [...ax(configName(configs, 'branch', "BRANCH"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billNo') + 1 : true)) && [...ax(configName(configs, 'billNo', "BILL NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billDate') + 1 : true)) && [...ax(configName(configs, 'billDate', "BILL DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arNo') + 1 : true)) && [...ax(configName(configs, 'arNo', "AR NO"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('arDate') + 1 : true)) && [...ax(configName(configs, 'arDate', "AR DATE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ewayBill') + 1 : true)) && [...ax(configName(configs, 'eWayBills', "EWAY BILLS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('grRemark') + 1 : true)) && [...ax(configName(configs, 'remarks', "GR REMARK"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('podRem') + 1 : true)) && [...ax(configName(configs, 'arRemark', "POD REMARK"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryBy') + 1 : true)) && [...ax(configName(configs, 'entryBy', "ENTRY BY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('entryAt') + 1 : true)) && [...ax(configName(configs, 'entryAt', "ENTRY AT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('ownership') + 1 : true)) && [...ax(configName(configs, 'ownershipType', "OWNERSHIP"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('tripStartDate') + 1 : true)) && [...ax(configName(configs, 'tripStartDate', "TRIP START DATE"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('routeName') + 1 : true)) && [...ax(configName(configs, 'routeName', "ROUTE NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrRec') + 1 : true)) && [...ax(configName(configs, 'mrReceived', "MR RECEIVED"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrBalFrei') + 1 : true)) && [...ax(configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('mrChitStatus') + 1 : true)) && [...ax(configName(configs, 'mrChitStatus', "MR CHIT STATUS"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('unloadedBy') + 1 : true)) && [...ax(configName(configs, 'unLoadedBy', "UNLOADED BY"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('fpaAmt') + 1 : true)) && [...ax(configName(configs, 'fpaAmt', "FPA AMT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('hireSlipTotPay') + 1 : true)) && [...ax(configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('nonBillGr') + 1 : true)) && [...ax(configName(configs, 'nonBillableGr', "NONBILLABLE GR"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vehOwnerName') + 1 : true)) && [...ax(configName(configs, 'owner_name', "VEHICLE OWNER NAME"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('segment') + 1 : true)) && [...ax(configName(configs, 'segment_type', "SEGMENT"))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('billed') + 1 : true)) && [...ax(configName(configs, 'billed', "BILLED"))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('company') + 1 : true)) && [...ax(configName(configs, 'client', 'COMPANY'))] || []),
		...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('reportDate') + 1 : true)) && [...ax(configName(configs, 'unloadingArrivalTime', 'REPORTING DATE'))] || []),
		// ...((((req.tableAcc && req.tableAcc.length > 0) ? req.tableAcc.indexOf('vendorRemark') + 1 : true)) && [...ax(configName(configs, 'vendorRemark', 'HIRE PARTY REMARK'))] || [])
	];

	let rowNum = 2;
	formatColumnHeaders(ws1, 1, headers, [0, 8, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 15, 15, 15, 20, 20, 20, 15, 20, 20, 20, 20, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	aData.forEach(obj => {
		let row = {};
		if (!obj.invoices) obj.invoices = [];
		row['GR ID'] = obj._id.toString();
		row['TRIP NO.'] = (obj.trip && obj.trip.trip_no) || 'NA';
		row[configName(configs, 'status', "GR STATUS")] = obj.status || 'NA';
		row[configName(configs, 'grNumber', "GR NO.")] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
		row[configName(configs, 'grDate', "GR DATE")] = obj.grDate ? moment(obj.grDate).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'loadingDate', "LOADING DATE")] = obj.statuses && obj.statuses.find(st => st.status === 'Loading Ended') ? moment(new Date(obj.statuses.find(st => st.status === 'Loading Ended').date)).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'vehicle_no', "VEHICLE NO.")] = (obj.trip && obj.trip.vehicle_no) || 'NA';
		row[configName(configs, 'model', "VEHICLE MODEL")] = (obj.vehicle && obj.vehicle.model) || 'NA';
		row[configName(configs, 'material', "MATERIAL CODE")] = (obj.invoices.length && obj.invoices[0].material) ? obj.invoices.map(o => o.material && o.material.groupCode).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[configName(configs, 'materialName', "MATERIAL NAME")] = (obj.invoices.length && obj.invoices[0].material) ? obj.invoices.map(o => o.material && o.material.groupName).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[configName(configs, 'customer', "CUSTOMER")] = (obj.customer && obj.customer.name) || 'NA';
		row[configName(configs, 'consignor', "CONSIGNOR")] = (obj.consignor && obj.consignor.name) || 'NA';
		row[configName(configs, 'consignee', "CONSIGNEE")] = (obj.consignee && obj.consignee.name) || 'NA';
		row[configName(configs, 'billingParty', "BILLINGPARTY")] = (obj.billingParty && obj.billingParty.name) || 'NA';
		row["ROUTE"] = (obj.route && obj.route.name) || 'NA';
		row[configName(configs, 'route', "BILLING ROUTE")] = ((obj.acknowledge && obj.acknowledge.source) ? ((obj.acknowledge.source) + ' to ' + (obj.acknowledge.destination)) : 'NA');
		row[configName(configs, 'source', "SOURCE")] = (obj.acknowledge && obj.acknowledge.source) ? (obj.acknowledge.source) : 'NA';
		row[configName(configs, 'destination', "DESTINATION")] = (obj.acknowledge && obj.acknowledge.destination) ? (obj.acknowledge.destination) : 'NA';
		row[configName(configs, 'routeDistance', "KM")] = obj.invoices && obj.invoices[0] && obj.invoices[0].routeDistance || 'NA';
		row[configName(configs, 'payment_basis', "PAYMENT BASIS")] = obj.payment_basis || 'NA';
		row[configName(configs, 'payment_type', "PAYMENT TYPE")] = obj.payment_type || 'NA';
		row[configName(configs, 'baseValueLabel', "CAPACITY")] = obj.invoices && obj.invoices[0] && obj.invoices[0].baseValueLabel || 'NA';
		row[configName(configs, false, "FPA NO")] = (obj.fpa && obj.fpa.refNo) || 'NA';
		row[configName(configs, 'loading_slip', "HIRESLIP NO")] = (obj.trip && obj.trip.vendorDeal && obj.trip.vendorDeal.loading_slip) || 'NA';
		row[configName(configs, 'invDate', "INVOICE DATE")] = obj.invoices && obj.invoices[0] && moment(obj.invoices[0].invoiceDate).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'invoiceNo', "INVOICE NO.")] = obj.invoices.map(o => o.invoiceNo).join(' ,') || 'NA';
		row[configName(configs, 'invoiceAmt', "INVOICE AMOUNT")] = obj.invoices.map(o => o.invoiceAmt).join(' ,') || 'NA';
		row[configName(configs, 'incentive', "INCENTIVE")] = obj.charges ? obj.charges.incentive : 'NA';
		row[configName(configs, 'noOfUnits', "QTY")] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.noOfUnits || 0, 0);
		row[configName(configs, 'weightPerUnit', "WEIGHT(T)")] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.weightPerUnit || 0, 0) + ' T';
		row[configName(configs, 'billingNoOfUnits', "BILLING UNIT")] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.billingNoOfUnits || 0, 0);
		row[configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT")] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.billingWeightPerUnit || 0, 0);
		row[configName(configs, 'rate', "RATE")] = obj.invoices.map(o => (o.rate && parseFloat(o.rate.toFixed(2) || 0))).join(',') || 'NA';
		row[configName(configs, 'basicFreight', "FREIGHT")] = parseFloat(obj.basicFreight && obj.basicFreight.toFixed(2) || 0);
		row[configName(configs, 'totalFreight', "TOTAL FREIGHT")] = parseFloat(obj.totalFreight && obj.totalFreight.toFixed(2) || 0);
		row[configName(configs, 'cGST', "CGST")] = obj.cGST && parseFloat(obj.cGST.toFixed(2) || 0);
		row[configName(configs, 'sGST', "SGST")] = obj.sGST && parseFloat(obj.sGST.toFixed(2) || 0);
		row[configName(configs, 'iGST', "IGST")] = obj.iGST && parseFloat(obj.iGST.toFixed(2) || 0);
		row[configName(configs, 'totalAmount', "TOTAL AMOUNT")] = parseFloat(obj.totalAmount && obj.totalAmount.toFixed(2) || 0);
		row[configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT")] = parseFloat(obj.supplementaryBill && obj.supplementaryBill.totalFreight && obj.supplementaryBill.totalFreight.toFixed(2) || 0);
		row[configName(configs, 'internal_rate', "INTERNAL RATE")] = obj.internal_rate && obj.internal_rate.toFixed(2) || 0;
		row[configName(configs, 'branch', "BRANCH")] = obj.branch && obj.branch.name || 'NA';
		row[configName(configs, 'billNo', "BILL NO")] = obj.bill && obj.bill.billNo || obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.map(o => o.billNo).join(' ,') || 'NA';
		row[configName(configs, 'billDate', "BILL DATE")] = (obj.bill && obj.bill.billDate && moment(obj.bill.billDate).format("DD-MM-YYYY")) || (obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.map(o => moment(o.billDate).format("DD-MM-YYYY")).join(' ,')) || 'NA';
		row[configName(configs, 'arNo', "AR NO")] = obj.pod && obj.pod.arNo || 'NA';
		row[configName(configs, 'arDate', "AR DATE")] = obj.pod && obj.pod.date && moment(obj.pod.date).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'loadRefNumber', "LOAD REF. NO")] = obj.invoices.map(o => o.loadRefNumber).join(' ,') || 'NA';
		row[configName(configs, 'ref1', "REF1")] = obj.invoices.map(o => o.ref1).join(' ,') || 'NA';
		row[configName(configs, 'ref2', "REF2")] = obj.invoices.map(o => o.ref2).join(' ,') || 'NA';
		row[configName(configs, 'ref3', "REF3")] = obj.invoices.map(o => o.ref3).join(' ,') || 'NA';
		row[configName(configs, 'ref4', "REF4")] = obj.invoices.map(o => o.ref4).join(' ,') || 'NA';
		row[configName(configs, 'eWayBills', "EWAY BILLS")] = obj.eWayBills ? obj.eWayBills.map(o => o.number).join(' ,') : 'NA';
		row[configName(configs, 'remarks', "GR REMARK")] = obj.remarks || 'NA';
		row[configName(configs, 'arRemark', "POD REMARK")] = obj.pod && obj.pod.arRemark || 'NA';
		let grAss = obj.statuses.find(st => st.status === 'GR Assigned');
		row[configName(configs, 'entryBy', "ENTRY BY")] = grAss && grAss.user_full_name || 'NA';
		row[configName(configs, 'entryAt', "ENTRY AT")] = grAss && moment(grAss.date).format("DD-MM-YYYY") || 'NA';
		row[configName(configs, 'ownershipType', "OWNERSHIP")] = (obj.trip && obj.trip.ownershipType) || 'NA';
		row[configName(configs, 'tripStartDate', "TRIP START DATE")] = (obj.trip && obj.trip.statuses && obj.trip.statuses.length > 0) ? moment(obj.trip.statuses.find(function (element) {
			return element.status === "Trip not started";
		}).date).format("DD-MM-YYYY") : "NA";
		row[configName(configs, 'routeName', "ROUTE NAME")] = (obj.trip && obj.trip.route_name) || 'NA';
		let mrRec = (((obj.moneyReceipt && obj.moneyReceipt.totalMrAmount) || 0) + ((obj.moneyReceipt && obj.moneyReceipt.deduction) || 0));
		row[configName(configs, 'mrReceived', "MR RECEIVED")] = mrRec || 'NA';
		let mrBalFr = (((obj.totalFreight || 0) + (obj.supplementaryBill && obj.supplementaryBill.totalFreight || 0)) - mrRec);
		row[configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")] = mrBalFr || 'NA';
		row[configName(configs, 'mrChitStatus', "MR CHIT STATUS")] = (obj.moneyReceipt && obj.moneyReceipt.chitPending) || 'NA';
		let uploadedBy = obj.statuses.find(st => st.status === 'Unloading Ended');
		row[configName(configs, 'unLoadedBy', "UNLOADED BY")] = (uploadedBy && uploadedBy.user_full_name) || 'NA';
		row[configName(configs, 'fpaAmt', "FPA AMT")] = (obj.fpa && obj.fpa.amt) || 'NA';
		//row[configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")] = obj.totpayable || 'NA';
		row[configName(configs, 'nonBillableGr', "NONBILLABLE GR")] = (obj.isNonBillable) ? "Yes" : "No";
		row[configName(configs, 'owner_name', "VEHICLE OWNER NAME")] = obj.vehicle && obj.vehicle.owner_name || 'NA';
		row[configName(configs, 'segment_type', "SEGMENT")] = (obj.trip && obj.trip.segment_type) || 'NA';
		row[configName(configs, 'billed', "BILLED")] = (obj.bill || obj.supplementaryBillRef || (obj.provisionalBill && obj.provisionalBill.ref[0])) ? 'Yes' : 'No';
		let cId = (obj.billingParty && obj.billingParty.clientId) || obj.clientId;
		let clientAllowed = req.user.client_allowed.find(ca => ca.clientId === cId);
		row[configName(configs, 'client', 'COMPANY')] = clientAllowed && clientAllowed.name || req.clientData.client_display_name
		row[configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("DD-MM-YYYY") : 'NA';
		row[configName(configs, 'vendorRemark', 'HIRE PARTY REMARK')] = obj.trip && obj.trip.vendorDeal && obj.trip.vendorDeal.remark || 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, req.user.clientId, 'tripGr', 'Trip_Gr', callback);
};

module.exports.mrReport = function (aData, req, callback) {
	var workbook = new Excel.Workbook();

	let clientId = req.user.clientId;

	var ws1 = workbook.addWorksheet('MR Report');
	let header = ['CN Office', 'CN No.', 'CN Date', 'Vehicle No.', 'Route', 'ActualWeight', 'Charged Weight', 'Billing Party', 'Bill No', 'Bill Date', 'Reciept No', 'Basic Freight', 'LR Total Freight', 'Balance Freight', 'CN Remark', 'Customer', 'GTA No.',
		'Ref2', 'Letter No', 'MROffice1', 'MRNo1', 'MRDate1', 'Adv/MRAmt1', 'MROffice2', 'MRNo2', 'MRDate2', 'MRAmt2', 'MROffice3', 'MRNo3', 'MRDate3', 'MRAmt3',/* 'Advance' 'Balance',*/ 'MR. Total', 'Loading Amount', 'Unloading Amount',
		'C.Deduction Amount', 'Shortage Amount', 'Damage Amount', 'Late Delivery Amount', 'TDS DED', 'Ded.Total', 'Chit', 'Payment Party Name', 'Payment Responsible Person', 'Payment Responsible Branch', 'Payment Type', 'Mobile No', 'Email',
		'In Traffic Lorry Engage by', 'Remark', 'Veh. Owner Name', 'MR NO.', 'Broker Name', 'Payment Mode', 'Payment Date', 'Party Name', 'Payment Ref', 'Payment RMK', 'MR Date', 'MR Amount', 'DED Account Nature', 'DED Amount', 'Total Ded Amount', 'CN Adjuested Frt Breakup', 'CN Adjusted Frt',
		'Net Due', 'Acct. Reg. Diff', 'AR Date', 'GTALRNo', 'PODRemark'];
	formatTitle(ws1, header.length, 'MR Report');
	formatColumnHeaders(ws1, 4, header, [15, 10, 10, 13, 15, 10, 10, 25, 10, 10, 10, 10, 10, 15, 10, 10, 10, 15, 10, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 10, 10, 10, 10, 10, 10, 10, 10, 10, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let netColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'FFC300'
		}
	};
	mergeCells(ws1, 5, 12, 'Net Total', 0, {fill: netColor});
	mergeCells(ws1, 5, 55, 'empty', 14, {fill: netColor});
	var rowNum = 6;
	var lastOfficeValue = "", lastOfficeRow;
	let officeTotal = 0;
	let netTotal = 0;
	let balFreigTotal = 0;
	let netbalFreigTotal = 0;
	let officeColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: '05D21C'
		}
	};

	let count = 0;
	let max1 = 0;
	let max2 = 0;
	for (let k = 0, j = (aData.length - 1); k <= j; k++ , j--) {
		if (aData[k].moneyReceipt && aData[k].moneyReceipt.collection)
			max1 = aData[k].moneyReceipt.collection.length;

		if (aData[j].moneyReceipt && aData[j].moneyReceipt.collection)
			max2 = aData[j].moneyReceipt.collection.length;

		if (max1 >= max2 && max1 > count)
			count = max1;
		if (max2 >= max1 && max2 > count)
			count = max2;
	}

	for (var i = 0; i < aData.length; i++) {
		try {
			let sBranch = aData[i].branch && aData[i].branch.name || "";
			if ((lastOfficeValue === "" || lastOfficeValue !== sBranch)) {
				if (lastOfficeValue !== "") {
					mergeCells(ws1, lastOfficeRow, 1, parseFloat(officeTotal.toFixed(2) || 0), header.indexOf('LR Total Freight'), {fill: officeColor});
					mergeCells(ws1, lastOfficeRow, 1, parseFloat(balFreigTotal.toFixed(2) || 0), header.indexOf('LR Total Freight') + 1, {fill: officeColor});

				}
				officeTotal = 0;
				balFreigTotal = 0;
				lastOfficeValue = aData[i].branch && aData[i].branch.name || "";
				lastOfficeRow = rowNum;
				mergeCells(ws1, rowNum, 12, lastOfficeValue + ' Total', 0, {fill: officeColor});
				mergeCells(ws1, rowNum++, 55, 'empty', 14, {fill: officeColor});
			}

			var row = {};
			row['CN Office'] = aData[i].branch && aData[i].branch.name || 'NA';
			row['Bill Date'] = aData[i].bill && aData[i].bill.billDate && moment(new Date(aData[i].bill.billDate)).format("DD-MM-YYYY") || 'NA';
			row['CN No.'] = aData[i].grNumber || 'NA';
			row['CN Date'] = moment(new Date(aData[i].grDate)).format("DD-MM-YYYY") || 'NA';
			row['Bill No'] = aData[i].bill && aData[i].bill.billNo || 'NA';
			row['Billing Party'] = aData[i].billingParty && aData[i].billingParty.name || 'NA';
			row['Customer'] = aData[i].customer && aData[i].customer.name || 'NA';
			row['Vehicle No.'] = aData[i].trip && aData[i].trip.vehicle_no || 'NA';
			row['Route'] = ((aData[i].acknowledge && aData[i].acknowledge.source) ? ((aData[i].acknowledge.source) + ' to ' + (aData[i].acknowledge.destination)) : 'NA');
			row['ActualWeight'] = aData[i].invoices && aData[i].invoices.reduce((acc, invcObj) => acc + invcObj.weightPerUnit || 0, 0) || 0;
			row['Charged Weight'] = aData[i].invoices && aData[i].invoices.reduce((acc, invcObj) => acc + invcObj.billingWeightPerUnit || 0, 0);
			row['Reciept No'] = aData[i].pod && aData[i].pod.arNo || 'NA';
			row['Basic Freight'] = aData[i].basicFreight || '0';
			row['LR Total Freight'] = aData[i].totalAmount && parseFloat(aData[i].totalAmount.toFixed(2) || 0);
			row['Payment Type'] = aData[i].payment_type || 'NA';
			row['CN Remark'] = aData[i].remarks || 'NA';
			row['GTA No.'] = aData[i].invoices && aData[i].invoices.map(o => o.ref2).join(' ,') || 'NA';
			row['Ref2'] = aData[i].invoices && aData[i].invoices.map(o => o.ref2).join(' ,') || 'NA';
			let str = 'Adv/';
			if (count) {
				for (index = 1, j = 0; index <= count; index++ , j++) {
					if (index > 1)
						str = '';
					let obj = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection[j] || {};
					row['MROffice' + index] = obj.mrOffice || 'NA';
					row['MRNo' + index] = obj.mrNo || 'NA';
					row['MRDate' + index] = obj.mrDate || 'NA';
					row[str + 'MRAmt' + index] = obj.mrAmount || '0';
				}
			}
			// row['Advance'] = '';
			// row['Balance'] = aData[i].totalAmount + (aData[i].supplementaryBill && aData[i].supplementaryBill.totalFreight || 0) - (aData[i].moneyReceipt && aData[i].moneyReceipt.totalMrAmount || '0')  + (otherUtil.sumObjKey(mrDedcuction) || '0');
			row['MR. Total'] = aData[i].moneyReceipt && aData[i].moneyReceipt.totalMrAmount || '0';
			let mrDedcuction = aData[i].moneyReceipt && aData[i].moneyReceipt.deduction || {};
			row['Loading Amount'] = mrDedcuction.loadingAmount || '0';
			row['Unloading Amount'] = mrDedcuction.unloadingAmount || '0';
			row['C.Deduction Amount'] = mrDedcuction.munshiyanaAmount || '0';
			row['Shortage Amount'] = mrDedcuction.shortageAmount || '0';
			row['Damage Amount'] = mrDedcuction.damageAmount || '0';
			row['Late Delivery Amount'] = mrDedcuction.ltDeliveryAmount || '0';
			row['TDS DED'] = mrDedcuction.tdsAmount || '0';
			row['Ded.Total'] = otherUtil.sumObjKey(mrDedcuction) || '0';
			row['Chit'] = aData[i].moneyReceipt && aData[i].moneyReceipt.chitPending || 'NA';
			row['Balance Freight'] = aData[i].totalAmount + (aData[i].supplementaryBill && aData[i].supplementaryBill.totalFreight || 0) - (aData[i].moneyReceipt && aData[i].moneyReceipt.totalMrAmount || '0') - (otherUtil.sumObjKey(mrDedcuction) || '0');
			row['Payment Party Name'] = aData[i].moneyReceipt && aData[i].moneyReceipt.paymentParty || 'NA';
			row['Payment Responsible Person'] = aData[i].moneyReceipt && aData[i].moneyReceipt.responsiblePerson || 'NA';
			row['Payment Responsible Branch'] = aData[i].moneyReceipt && aData[i].moneyReceipt.branch && aData[i].moneyReceipt.branch.name || 'NA';
			row['Mobile No'] = aData[i].moneyReceipt && aData[i].moneyReceipt.mobileNo || 'NA';
			row['Email'] = aData[i].moneyReceipt && aData[i].moneyReceipt.emailId || 'NA';
			row['In Traffic Lorry Engage by'] = 'NA';
			row['Remark'] = aData[i].moneyReceipt && aData[i].moneyReceipt.remark || 'NA';
			row['Veh. Owner Name'] = aData[i].vehicle && aData[i].vehicle.owner_name || 'NA';
			row['MR NO.'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => o.mrNo).join(' ,') || 'NA';
			row['Broker Name'] = 'NA';
			row['Payment Mode'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => o.paymentMode).join(' ,') || 'NA';
			row['Payment Date'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => o.paymentDate && moment(o.paymentDate).format("DD-MM-YYYY")).join(' ,') || 'NA';
			row['Party Name'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => o.partyName).join(' ,') || 'NA';
			row['Payment Ref'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => o.paymentRef).join(' ,') || 'NA';
			row['Payment RMK'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => o.paymentRmk).join(' ,') || 'NA';
			row['MR Date'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => moment(o.mrDate).format("DD-MM-YYYY")).join(' ,') || 'NA';
			row['MR Amount'] = aData[i].moneyReceipt && aData[i].moneyReceipt.collection && aData[i].moneyReceipt.collection.map(o => o.mrAmount).join(' ,') || 'NA';
			row['DED Account Nature'] = 'NA';
			row['DED Amount'] = otherUtil.sumObjKey(mrDedcuction) || '0';
			row['Total Ded Amount'] = otherUtil.sumObjKey(mrDedcuction) || '0';
			row['CN Adjuested Frt Breakup'] = 'NA';
			row['CN Adjusted Frt'] = 'NA';
			row['Net Due'] = 'NA';
			row['Acct. Reg. Diff'] = 'NA';
			row['AR Date'] = aData[i].pod && aData[i].pod.date && moment(aData[i].pod.date).format("DD-MM-YYYY") || 'NA';
			row['GTALRNo'] = 'NA';
			row['Letter No'] = aData[i].moneyReceipt && aData[i].moneyReceipt.letterNo || 'NA';
			row['PODRemark'] = aData[i].pod && aData[i].pod.arRemark || 'NA';

			officeTotal += (row['LR Total Freight'] || 0);
			netTotal += (row['LR Total Freight'] || 0);
			balFreigTotal += (row['Balance Freight'] || 0);
			netbalFreigTotal += (row['Balance Freight'] || 0);
			addWorkbookRow(row, ws1, header, rowNum++, false);
		} catch (e) {
			winston.error(e.toString());
		}


	}
	if (lastOfficeValue !== "") {
		mergeCells(ws1, lastOfficeRow, 1, parseFloat(officeTotal.toFixed(2) || 0), header.indexOf('LR Total Freight'), {fill: officeColor});
		mergeCells(ws1, lastOfficeRow, 1, parseFloat(balFreigTotal.toFixed(2) || 0), header.indexOf('LR Total Freight') + 1, {fill: officeColor});
	}

	mergeCells(ws1, 5, 1, parseFloat(netTotal.toFixed(2) || 0), header.indexOf('LR Total Freight'), {fill: netColor});
	mergeCells(ws1, 5, 1, parseFloat(netbalFreigTotal.toFixed(2) || 0), header.indexOf('LR Total Freight') + 1, {fill: netColor});

	// excelUtils.excel2html(ws1);
	saveFileAndReturnCallback(workbook, clientId, 'MR Report', 'MR Report', callback);
};

module.exports.acntBalRep = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Account Balance Report`);
	let headers = ['Account', 'Date', 'Opening Bal.', 'Op. Dr/Cr', 'Debit Amt', 'Credit Amt', 'Closing Bal.', 'Cl. Dr/Cr'];
	formatTitle(ws1, headers.length, `Account Balance Report`);
	formatColumnHeaders(ws1, 3, headers, [12, 12, 15, 12, 15, 15, 15, 12]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["Account"] = obj.account && obj.account.name || 'NA';
		row["Date"] = obj.date ? moment(obj.date).utcOffset(0, true).toDate() : 'NA';
		row['Opening Bal.'] = Math.abs(obj.ob) || 0;
		if (obj.ob < 0)
			row['Op. Dr/Cr'] = 'Cr';
		else
			row['Op. Dr/Cr'] = 'Dr';

		row['Debit Amt'] = obj.dr || 0;
		row['Credit Amt'] = obj.cr || 0;
		row['Closing Bal.'] = Math.abs(obj.cb) || 0;

		if (obj.cb > 0)
			row['Cl. Dr/Cr'] = 'Dr';
		else
			row['Cl. Dr/Cr'] = 'Cr';

		let cell = toAlphabet(3) + rowNum;
		let cell2 = toAlphabet(5) + rowNum;
		let cell3 = toAlphabet(6) + rowNum;
		let cell4 = toAlphabet(7) + rowNum;
		setCellNumFormat(ws1, cell);
		setCellNumFormat(ws1, cell2);
		setCellNumFormat(ws1, cell3);
		setCellNumFormat(ws1, cell4);

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Account Balance Report', 'Account Balance Report', callback);
}
module.exports.obBalRep = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Account Opening Balance Report`);
	let headers = ['Account', 'Date', 'Opening Bal.', 'Op. Dr/Cr'];
	formatTitle(ws1, headers.length, `Account Opening Balance Report`);
	formatColumnHeaders(ws1, 3, headers, [12, 12, 15, 12, 15, 15, 15, 12]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["Account"] = obj.account && obj.account.name || 'NA';
		row["Date"] = obj.date ? moment(obj.date).format("DD-MM-YYYY") : 'NA';
		row['Opening Bal.'] = Math.abs(obj.ob) || 0;
		if (obj.ob < 0)
			row['Op. Dr/Cr'] = 'Cr';
		else
			row['Op. Dr/Cr'] = 'Dr';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'OB_Balance_Report', 'Opening_Balance_Report', callback);
}
// RTP Expense Report
module.exports.rtpExpense = function (aData, clientId, body, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Round Trip Expense Report');

	ws1.views = [
		{state: 'frozen', xSplit: 0, ySplit: 3, zoomScale: 80}
	];
	let rowNum = 3;
	if (body.from) {
		ws1.getCell('D' + rowNum).value = 'From';
		ws1.getCell('E' + rowNum).value = moment(body.from).utcOffset(0, true).toDate();
	}
	if (body.to) {
		ws1.getCell('F' + rowNum).value = 'To';
		ws1.getCell('G' + rowNum).value = moment(body.to).utcOffset(0, true).toDate();
		rowNum++;
	}
	if (body.owner_group) {
		ws1.getCell('D' + rowNum).value = 'Fleet';
		ws1.getCell('E' + rowNum).value = body.owner_group;
		rowNum++;
	}
	if (body.segment_type) {
		ws1.getCell('D' + rowNum).value = 'Segment';
		ws1.getCell('E' + rowNum).value = body.segment_type;
		rowNum++;
	}
	if (body.rtNo) {
		ws1.getCell('D' + rowNum).value = 'RT No';
		ws1.getCell('E' + rowNum).value = body.rtNo;
		rowNum++;
	}
	if (body.vehicle_no) {
		ws1.getCell('D' + rowNum).value = 'vehicle';
		ws1.getCell('E' + rowNum).value = body.vehicle_no;
		rowNum++;
	}


	function getNextAlphabet(range) {

		return String.fromCharCode('E'.charCodeAt() + range);
	}

	function getNextAlphabet1(range) {

		return String.fromCharCode('F'.charCodeAt() + range);
	}

	let headers = ['S.No', /*'RT Date',*/"Vehicle No.", 'Driver', 'Trip Start', 'Trip End', 'Fleet', 'RT No.', 'Settlement Date', /*'Segment', 'Vehicle Type',*/ 'KM', 'Advance', 'Diesel', 'TT days', 'Expense', 'Expense/KM', 'Border', 'Challan', 'Dala Commision', 'Total Diesel', 'Fixed', 'OK Time', 'Parking', 'Rajai', 'Repair', 'Roti', 'Service', 'Extra', 'MissPend', 'Fastag Toll Tax', 'Cash Toll Tax', 'Toll Tax', 'Wages', 'Local Trip', 'Consumable store', 'Add Blue', 'Phone Expense', 'Settlement By', 'Settlement Remark', 'Route', 'Audit Date', 'Audit By'];
	let getItem = body.settlementObj.find((item)=> item.name == ' Guide Charges');
	if(getItem){
		let header1 = ['Guide Charges','Bilty Charges','Green tax','Washing' ,'Maintenance','Weighbridge Charges','Crain Charges' ]
		headers = [...headers,...header1];
	}
	formatColumnHeaders(ws1, rowNum++, headers, [5, 12, 30, 15, 15, 15, 12, 15, 12, 15, 12, 12, 15, 15, 15, 15, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 40, 15, 15]);
	formatTitle(ws1, headers.length, "Round Trip Expense Report");
	let count = 1;
	aData.forEach(obj => {
		let lastTrip = obj.trips.slice(-1)[0];
		lastTrip.markSettle = lastTrip.markSettle || {};
		lastTrip.advSettled = lastTrip.advSettled || {};
		let row = {};
		row['S.No'] = (count || 0);
		row['RT No.'] = obj._id || 'NA';
		row['Settlement Date'] = lastTrip.markSettle.date ? moment(lastTrip.markSettle.date).utcOffset(0, true).toDate() : 'NA';
		row['Settlement By'] = lastTrip.markSettle.user_full_name || 'NA';
		row['Settlement Remark'] = lastTrip.markSettle.remark || 'NA';
		row['Audit Date'] = (lastTrip.advSettled.creation && lastTrip.advSettled.creation.date)
			? moment(lastTrip.advSettled.creation.date).utcOffset(0, true).toDate()
			: 'NA';
		row['Audit By'] = lastTrip.advSettled.creation && lastTrip.advSettled.creation.user || 'NA';
		row["Vehicle No."] = lastTrip.vehicle_no || 0;
		row['Driver'] = lastTrip.driver && lastTrip.driver.name || 'NA';
		row['Trip Start'] = (obj.firstTripStart && obj.firstTripStart.date) ? moment(obj.firstTripStart.date).utcOffset(0, true).toDate() : 'NA';
		row['Trip End'] = obj.lastTripEnd && obj.lastTripEnd.date ? moment(obj.lastTripEnd.date).utcOffset(0, true).toDate() : 'NA';
		row['Fleet'] = obj.trips[0] && obj.trips[0].vehicle && obj.trips[0].vehicle.owner_group || 'NA';
		row['KM'] = ((obj.totalKM || 0) + (obj.totalExtKM || 0)) || 0;
		row['Advance'] = parseFloat(obj.total_advance && obj.total_advance.toFixed(2)) || 0;
		row['Diesel'] = obj.total_diesel || 0;
		row['TT days'] = obj.rtElapsed && parseInt(obj.rtElapsed) || 0;
		// row['Revenue'] = parseFloat(obj.total_internal_freight && obj.total_internal_freight.toFixed(2)) || 0;
		// row['Revenue/KM'] = obj['revenue/km'] && obj['revenue/km'].toFixed(2) || 'NA';
		row['Expense'] = parseFloat(obj.netExpense && obj.netExpense.toFixed(2)) || 0;
		row['Expense/KM'] = parseFloat(obj['expense/km'] && obj['expense/km'].toFixed(2)) || 0;
		// row['Profit'] = parseFloat( obj.total_actual_profit && obj.total_actual_profit.toFixed(2)) || 0;
		// row['Profit/KM'] = obj['profit/km'] && obj['profit/km'].toFixed(2) || 'NA';
		// row['Profit/Day'] = parseFloat(obj['profit/day'] && obj['profit/day'].toFixed(2)) || 0;
		// New Column for Expense
		row['Border'] = parseFloat(obj.totBorderExp && obj.totBorderExp.toFixed(2)) || 0;
		row['Challan'] = parseFloat(obj.totChallanExp && obj.totChallanExp.toFixed(2)) || 0;
		row['Dala Commision'] = parseFloat(obj.totDatacommiExp && obj.totDatacommiExp.toFixed(2)) || 0;
		row['Total Diesel'] = parseFloat(obj.totDiesalExp && obj.totDiesalExp.toFixed(2)) || 0;
		row['Fixed'] = parseFloat(obj.totFixedSalExp && obj.totFixedSalExp.toFixed(2)) || 0;
		row['OK Time'] = parseFloat(obj.totOktimeExp && obj.totOktimeExp.toFixed(2)) || 0;
		row['Parking'] = parseFloat(obj.totParkingExp && obj.totParkingExp.toFixed(2)) || 0;
		row['Rajai'] = parseFloat(obj.totRajaiExp && obj.totRajaiExp.toFixed(2)) || 0;
		row['Repair'] = parseFloat(obj.totRepairExp && obj.totRepairExp.toFixed(2)) || 0;
		row['Roti'] = parseFloat(obj.totRotiExp && obj.totRotiExp.toFixed(2)) || 0;
		row['Service'] = parseFloat(obj.totServiceExp && obj.totServiceExp.toFixed(2)) || 0;
		row['Extra'] = parseFloat(obj.totExtraExp && obj.totExtraExp.toFixed(2)) || 0;
		row['MissPend'] = parseFloat(obj.totMissPendExp && obj.totMissPendExp.toFixed(2)) || 0;
		row['Fastag Toll Tax'] = parseFloat(obj.totFastagTollExp && obj.totFastagTollExp.toFixed(2)) || 0;
		row['Cash Toll Tax'] = parseFloat(obj.totCashTollExp && obj.totCashTollExp.toFixed(2)) || 0;
		row['Toll Tax'] = parseFloat(obj.totTolltaxExp && obj.totTolltaxExp.toFixed(2)) || 0;
		row['Wages'] = parseFloat(obj.totWagesExp && obj.totWagesExp.toFixed(2)) || 0;
		row['Local Trip'] = parseFloat(obj.totLocalTripExp && obj.totLocalTripExp.toFixed(2)) || 0;
		row['Consumable store'] = parseFloat(obj.totConsumStoreExp && obj.totConsumStoreExp.toFixed(2)) || 0;
		row['Add Blue'] = parseFloat(obj.totAddBlueExp && obj.totAddBlueExp.toFixed(2)) || 0;
		row['Phone Expense'] = parseFloat(obj.totPhoneExp && obj.totPhoneExp.toFixed(2)) || 0;
		// END
		row['Route'] = obj.trips.map(t => t.route_name).join(', ');
		row['Guide Charges'] = parseFloat(obj.totGuideChargesExp && obj.totGuideChargesExp.toFixed(2)) || 0;
		row['Bilty Charges'] = parseFloat(obj.totBiltyChargesExp && obj.totBiltyChargesExp.toFixed(2)) || 0;
		row['Green tax'] = parseFloat(obj.totGreenTaxExp && obj.totGreenTaxExp.toFixed(2)) || 0;
		row['Washing'] = parseFloat(obj.totWashingExp && obj.totWashingExp.toFixed(2)) || 0;
		row['Maintenance'] = parseFloat(obj.totMaintenanceExp && obj.totMaintenanceExp.toFixed(2)) || 0;
		row['Weighbridge Charges'] = parseFloat(obj.totWeighChargesExp && obj.totWeighChargesExp.toFixed(2)) || 0;
		row['Crain Charges'] = parseFloat(obj.totCrainChargesExp && obj.totCrainChargesExp.toFixed(2)) || 0;
		addWorkbookRow(row, ws1, headers, (rowNum++));
		count++;
	});
	saveFileAndReturnCallback(workbook, clientId, 'Round Trip Expense Report', 'Round Trip Expense Report', callback);
};
// END

module.exports.rtpr = async function (aData, clientId, body, callback) {
	let workbook = new Excel.Workbook();

	const ws1 = workbook.addWorksheet('Round Trip Performance');

	await ws1.protect('myPassword');
	let rowNum = 3;

	// ws1.getCell('C2').value = 'Total Round Trip KM';
	// ws1.getCell('D2').value = aData[0].tTotalKM && aData[0].tTotalKM.toFixed(2);
	//
	// ws1.getCell('C3').value = 'Total Net Expense';
	// ws1.getCell('D3').value = aData[0].tNetExpense && aData[0].tNetExpense.toFixed(2);
	//
	// ws1.getCell('C4').value = 'Total Internal Freight';
	// ws1.getCell('D4').value = aData[0].tInternalFreight && aData[0].tInternalFreight.toFixed(2);
	//
	// ws1.getCell('C5').value = 'Total Actual Profit';
	// ws1.getCell('D5').value = aData[0].tTotal_actual_profit && aData[0].tTotal_actual_profit.toFixed(2);
	//
	// ws1.getCell('C6').value = 'Total Revenue/KM';
	// ws1.getCell('D6').value = aData[0]['tRevenue/km'] && aData[0]['tRevenue/km'].toFixed(2);
	//
	// ws1.getCell('C7').value = 'Total Expense/KM';
	// ws1.getCell('D7').value = aData[0]['tExpense/km'] && aData[0]['tExpense/km'].toFixed(2);
	//
	// ws1.getCell('C8').value = 'Total Profit/KM';
	// ws1.getCell('D8').value = aData[0]['tProfit/km'] && aData[0]['tProfit/km'].toFixed(2);
	//
	// ws1.getCell('C9').value = 'Total Profit/Day';
	// ws1.getCell('D9').value = aData[0]['tProfit/day'] && aData[0]['tProfit/day'].toFixed(2);
	//
	// ws1.getCell('C10').value = 'Total Diesel';
	// ws1.getCell('D10').value = aData[0]['tTotal_diesel'] && aData[0]['tTotal_diesel'].toFixed(2);
	//
	// ws1.getCell('C11').value = 'Total Advance';
	// ws1.getCell('D11').value = aData[0]['tTotal_advance'] && aData[0]['tTotal_advance'].toFixed(2);
	//
	if (body.from) {
		ws1.getCell('D' + rowNum).value = 'From';
		ws1.getCell('E' + rowNum).value = moment(body.from).utcOffset(0, true).toDate();
	}
	if (body.to) {
		ws1.getCell('F' + rowNum).value = 'To';
		ws1.getCell('G' + rowNum).value = moment(body.to).utcOffset(0, true).toDate();
		rowNum++;
	}
	if (body.owner_group) {
		ws1.getCell('D' + rowNum).value = 'Fleet';
		ws1.getCell('E' + rowNum).value = body.owner_group;
		rowNum++;
	}
	if (body.segment_type) {
		ws1.getCell('D' + rowNum).value = 'Segment';
		ws1.getCell('E' + rowNum).value = body.segment_type;
		rowNum++;
	}
	if (body.rtNo) {
		ws1.getCell('D' + rowNum).value = 'RT No';
		ws1.getCell('E' + rowNum).value = body.rtNo;
		rowNum++;
	}
	if (body.vehicle_no) {
		ws1.getCell('D' + rowNum).value = 'vehicle';
		ws1.getCell('E' + rowNum).value = body.vehicle_no;
		rowNum++;
	}


	let headers = ['S.No', /*'RT Date',*/"Vehicle No.", 'Driver', 'Trip Start', 'Trip End', 'Fleet', 'RT No.',/*'Segment', 'Vehicle Type',*/ 'Total KM', 'Ex. KM', 'Advance', 'Diesel', 'TT days', 'Revenue', 'Revenue/KM', 'Expense', 'Expense/KM', 'Profit', 'Profit/KM', 'Profit/Day', 'Suspense Amount', 'Settlement By', 'Settlement Remark', 'Route', 'Settlement Date', 'Audit Date', 'Audit By'];
	formatTitle(ws1, headers.length, "Round Trip Performance");
	formatColumnHeaders(ws1, rowNum++, headers, [5, 12, 30, 14, 14, 18, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 18, 15, 15, 40, 12, 15, 15, 15]);
	let count = 1;
	aData.forEach(obj => {
		obj.trips.sort((a, b) => new Date(a.trip_start_status && a.trip_start_status.date) - new Date(b.trip_start_status && b.trip_start_status.date));

		let lastTrip = obj.trips.slice(-1)[0];
		let firstTrip = obj.trips[0];
		lastTrip.markSettle = lastTrip.markSettle || {};
		lastTrip.advSettled = lastTrip.advSettled || {};
		let row = {};
		row['S.No'] = (count || 0);
		row['RT No.'] = obj._id;
		// row['RT Date'] = lastTrip.advSettled.date ? new Date(last
		// Trip.advSettled.date).format("DD-MM-YYYY") : '';
		row['Settlement Date'] = lastTrip.markSettle.date ? moment(lastTrip.markSettle.date).utcOffset(0, true).toDate() : '';
		row['Settlement By'] = lastTrip.markSettle.user_full_name || '';
		row['Settlement Remark'] = lastTrip.markSettle.remark || '';
		row['Audit Date'] = (lastTrip.advSettled.creation && lastTrip.advSettled.creation.date)
			? moment(lastTrip.advSettled.creation.date).utcOffset(0, true).toDate() : '';
		row['Audit By'] = lastTrip.advSettled.creation && lastTrip.advSettled.creation.user || '';
		row["Vehicle No."] = lastTrip.vehicle_no;
		row['Driver'] = lastTrip.driver && lastTrip.driver.name || '';
		row['Trip Start'] = (firstTrip.trip_start_status && firstTrip.trip_start_status.date) ? moment(firstTrip.trip_start_status.date).utcOffset(0, true).toDate() : '';
		row['Trip End'] = lastTrip.trip_end_status && lastTrip.trip_end_status.date ? moment(lastTrip.trip_end_status.date).utcOffset(0, true).toDate() : '';
		row['Fleet'] = obj.trips[0] && obj.trips[0].vehicle && obj.trips[0].vehicle.owner_group || '';
		// row['Segment'] = lastTrip.segment_type || '';
		// row['Vehicle Type'] = lastTrip.vehicle && lastTrip.vehicle.veh_type_name || '';
		row['Total KM'] = obj.totalKM || 0;
		row['Ex. KM'] = parseFloat(obj.totalExtKM && obj.totalExtKM.toFixed(2)) || 0;
		row['Advance'] = obj.total_advance || '';
		row['Diesel'] = obj.total_diesel || '';
		row['TT days'] = obj.rtElapsed && parseInt(obj.rtElapsed) || 0;
		row['Revenue'] = parseFloat(obj.total_internal_freight && obj.total_internal_freight.toFixed(2)) || 0;

		row['Revenue/KM'] = obj['revenue/km'] && obj['revenue/km'].toFixed(2) || '';
		/*if(row['Total KM'])
			row['Revenue/KM']  = (row['Revenue']/row['Total KM']).toFixed(2) || 0;
		else
			row['Revenue/KM']  = 0;
		*/
		row['Expense'] = obj.netExpense && obj.netExpense.toFixed(2) || 0;

		row['Expense/KM'] = obj['expense/km'] && obj['expense/km'].toFixed(2) || '';
		/*if(row['Total KM'])
			row['Expense/KM'] = (row['Expense']/row['Total KM']).toFixed(2) || 0;
		else
			row['Expense/KM'] = 0;
		*/

		row['Profit'] = parseFloat(obj.total_actual_profit && obj.total_actual_profit.toFixed(2)) || 0;

		row['Profit/KM'] = obj['profit/km'] && obj['profit/km'].toFixed(2) || '';

		/*if(row['Total KM'])
			row['Profit/KM']  = (row['Profit']/row['Total KM']).toFixed(2) || 0;
		else
			row['Profit/KM']  = 0;
		*/

		row['Profit/Day'] = obj['profit/day'] && obj['profit/day'].toFixed(2) || '';
		/*
		if(row['TT days'])
			row['Profit/Day']  = (row['Profit']/row['TT days']).toFixed(2) || 0;
		else
			row['Profit/Day']  = 0;
		*/
		row['Route'] = obj.trips.map(t => t.route_name).join(', ');
		row['Suspense Amount'] = obj.suspense;
		addWorkbookRow(row, ws1, headers, (rowNum++));
		count++;
	});
	let rName = 'RTP';
	if (body.owner_group && body.owner_group[0]) {
		rName = rName + body.owner_group[0];
	}
	if (body.segment_type && body.segment_type[0]) {
		rName = rName + body.segment_type[0];
	}
	if (body.vehicle) {
		rName = rName + (aData[0] && aData[0].trips && aData[0].trips[0] && aData[0].trips[0].vehicle_no);
	}

	saveFileAndReturnCallback(workbook, clientId, 'Round_Trip_Performance', rName, callback);
};

module.exports.rtprDetailed = function (aData, clientId, segment, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Detailed RTP');

	let headers = ['Sr. No', 'Driver & Code', 'Start Date', 'End Date', 'RT No', 'Route', 'Km', 'Ex. KM', 'Total Km', 'Days', 'RUN/DAY', 'Advance', 'Adv/Km', 'Frt.',
		'Frt./Km', 'Expense', 'Expense/Km', 'Dvr Pymt.', 'Balance', 'Profit', 'Profit/Day', 'Profit/Km', 'Remark', 'Suspense Advance'];
	formatColumnHeaders(ws1, 2, headers, [5, 30, 16, 10, 9, 40, 22, 7, 6, 6, 25, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 13]);
	ws1.views = [
		{state: 'frozen', xSplit: 0, ySplit: 2, zoomScale: 80}
	];
	mergeCells(ws1, 1, 2, 'Freight', headers.indexOf('Frt.'), {
		fill: columnFill,
		border: thinBorder,
		alignment: centerAlign
	});
	mergeCells(ws1, 1, 2, 'Expense', headers.indexOf('Expense'), {
		fill: columnFill,
		border: thinBorder,
		alignment: centerAlign
	});
	mergeCells(ws1, 1, 3, 'Profit', headers.indexOf('Profit'), {
		fill: columnFill,
		border: thinBorder,
		alignment: centerAlign
	});
	// formatTitle(ws1, headers.length,"Round Trip Performance");
	let rowNum = 3;
	let lastVehicle = "";
	let totalRow = {};
	aData.forEach((obj, index) => {
		let lastTrip = obj.trips.slice(-1)[0];
		lastTrip.markSettle = lastTrip.markSettle || {};
		lastTrip.advSettled = lastTrip.advSettled || {};
		if ((lastVehicle === "" || lastVehicle !== lastTrip.vehicle_no)) {
			lastVehicle = lastTrip.vehicle_no;
			totalRow = {};
			mergeCells(ws1, rowNum++, headers.length, lastVehicle + (lastTrip.vehicle.owner_group ? ` (${lastTrip.vehicle.owner_group})` : ''));
		}

		(function driverPaymentCalc() {
			let driverPayment;
			obj.driverPayment = 0;
			for (let t of obj.trips) {
				t.driverPayment = 0;
				if (t.payments) {
					for (let payment in t.payments) {
						if (payment === 'ledgers') {
							t.driverPayment += t.payments[payment].reduce((acc, ledger) => {
								if (ledger && ledger.account && ledger.account.toString() === t.driver.account.toString()) {
									if (ledger.cRdR === 'DR') {
										return ledger.amount + acc;
									} else {
										return acc - ledger.amount;
									}
								}
								return acc;
							}, 0)
						}
					}
				}
				obj.driverPayment += t.driverPayment;
			}
		})();
		let row = {};
		row['Sr. No'] = index + 1;
		row['Driver & Code'] = lastTrip.driver && lastTrip.driver.name || 'NA';
		row['Start Date'] = (obj.firstTripStart && obj.firstTripStart.date) ? moment(obj.firstTripStart.date).format("DD-MM-YYYY") : 'NA';
		row['End Date'] = obj.lastTripEnd && obj.lastTripEnd.date ? moment(obj.lastTripEnd.date).format("DD-MM-YYYY") : 'NA';
		row['RT No'] = obj._id;
		row['Route'] = obj.trips.map(t => t.route_name).join(', ');
		row['Remark'] = (obj.trips[0] && obj.trips[0].markSettle && obj.trips[0].markSettle.remark) || 'NA';
		row['Km'] = parseFloat(obj.totalKM.toFixed(2)) || 0;
		row['Ex. KM'] = parseFloat(obj.totalExtKM && obj.totalExtKM.toFixed(2)) || 0;
		row['Total Km'] = (row['Km'] + row['Ex. KM']) || 0;
		row['Days'] = obj.rtElapsed && parseInt(obj.rtElapsed) || 1;
		row['RUN/DAY'] = parseFloat(row['Total Km'] / row['Days'].toFixed(2));
		row['Advance'] = parseFloat(obj.total_advance.toFixed(2)) || 0;
		row['Adv/Km'] = row['Advance'] / row['Total Km'];
		row['Frt.'] = obj.total_internal_freight && parseFloat(obj.total_internal_freight.toFixed(2)) || 0;
		row['Frt./Km'] = parseFloat((row['Frt.'] / row['Total Km']).toFixed(2)) || 0;
		row['Expense'] = obj.netExpense && parseFloat(obj.netExpense.toFixed(2)) || 0;
		row['Expense/Km'] = parseFloat((row['Expense'] / row['Total Km']).toFixed(2)) || 0;
		row['Dvr Pymt.'] = parseFloat(obj.driverPayment.toFixed(2)) || 0;
		row['Balance'] = row['Advance'] + row['Dvr Pymt.'] - row['Expense'];
		row['Profit'] = row['Frt.'] - row['Expense'];
		row['Profit/Day'] = parseFloat((row['Profit'] / row['Days']).toFixed(2));
		row['Profit/Km'] = parseFloat((row['Profit'] / row['Total Km']).toFixed(2));
		row["Vehicle No."] = lastTrip.vehicle_no;
		row["Suspense Advance"] = obj.suspense;
		totalRow['Km'] = totalRow['Km'] ? totalRow['Km'] + row['Km'] : row['Km'];
		totalRow['Ex. KM'] = totalRow['Ex. KM'] ? totalRow['Ex. KM'] + row['Ex. KM'] : row['Ex. KM'];
		totalRow['Total Km'] = totalRow['Total Km'] ? totalRow['Total Km'] + row['Total Km'] : row['Total Km'];
		totalRow['Days'] = totalRow['Days'] ? totalRow['Days'] + row['Days'] : row['Days'];
		totalRow['RUN/DAY'] = totalRow['Total Km'] / totalRow['Days'];
		totalRow['Advance'] = totalRow['Advance'] ? totalRow['Advance'] + row['Advance'] : row['Advance'];
		totalRow['Adv/Km'] = totalRow['Advance'] / totalRow['Total Km'];
		totalRow['Frt.'] = totalRow['Frt.'] ? totalRow['Frt.'] + row['Frt.'] : row['Frt.'];
		totalRow['Frt./Km'] = totalRow['Frt.'] / totalRow['Total Km'];
		totalRow['Expense'] = totalRow['Expense'] ? totalRow['Expense'] + row['Expense'] : row['Expense'];
		totalRow['Expense/Km'] = totalRow['Expense'] / totalRow['Total Km'];
		totalRow['Dvr Pymt.'] = totalRow['Dvr Pymt.'] ? totalRow['Dvr Pymt.'] + row['Dvr Pymt.'] : row['Dvr Pymt.'];
		totalRow['Balance'] = totalRow['Balance'] ? totalRow['Balance'] + row['Balance'] : row['Balance'];
		totalRow['Profit'] = totalRow['Profit'] ? totalRow['Profit'] + row['Profit'] : row['Profit'];
		totalRow['Profit/Day'] = totalRow['Profit'] / totalRow['Days'];
		totalRow['Profit/Km'] = totalRow['Profit'] / totalRow['Total Km'];
		totalRow["Vehicle No."] = totalRow["Vehicle No."] ? totalRow["Vehicle No."] + row["Vehicle No."] : row["Vehicle No."];
		addWorkbookRow(row, ws1, headers, (rowNum++), false, {
			numFmt: {
				'Km': '0',
				'Ex. Km': '0',
				'Total Km': '0',
				'Days': '0',
				'RUN/DAY': '0.00',
				'Advance': '0.00',
				'Adv/Km': '0.00',
				'Frt.': '0.00',
				'Frt./Km': '0.00',
				'Expense': '0.00',
				'Expense/Km': '0.00',
				'Dvr Pymt.': '0.00',
				'Balance': '0.00',
				'Profit': '0.00',
				'Profit/Day': '0.00',
				'Profit/Km': '0.00'
			}, alignment: {
				horizontal: 'left'
			}
		});
		if (aData[0].showTrips) {
			let tripHeaders = ['S.No', 'Customer', 'Start Date', 'End Date', 'Trip No', 'Route', 'KM', 'Ex. KM', 'Total Km', 'Days', 'CN No', 'Qty', 'Freight'];
			formatColumnHeaders(ws1, rowNum++, tripHeaders, [5, 30, 16, 10, 9, 40, 7, 6, 6, 25, 10, 10]);
			obj.trips.forEach((trip, i) => {
				if (aData[0].trip && aData[0].trip !== trip.category) {
					return;
				}
				let f = parseFloat(trip.internal_freight.toFixed(2));

				if (true || !(aData[0].trip === "Loaded") || (aData[0].trip === "Loaded" && f > 0)) {
					let tripRow = {};
					tripRow['S.No'] = i + 1;
					let custr = tripRow['Customer'] = trip.gr[0] && trip.gr[0].customer && trip.gr[0].customer.name || '';
					tripRow['Start Date'] = (trip.trip_start_status && trip.trip_start_status.date) ? moment(trip.trip_start_status.date).format("DD-MM-YYYY") : 'NA';
					tripRow['End Date'] = (trip.trip_end_status && trip.trip_end_status.date) ? moment(trip.trip_end_status.date).format("DD-MM-YYYY") : 'NA';
					tripRow['Trip No'] = trip.trip_no;
					tripRow['Route'] = trip.route_name;
					tripRow['KM'] = (trip.route && trip.route.route_distance) || 0;
					tripRow['Ex. KM'] = trip.extraKm || 0;
					tripRow['Total KM'] = (tripRow['KM'] + tripRow['Ex. KM']) || 0;
					tripRow['Days'] = Math.ceil(dateUtil.getDateDifferece((trip.trip_start_status && trip.trip_start_status.date), (trip.trip_end_status && trip.trip_end_status.date), 'day'));
					tripRow['CN No'] = (trip.gr.map(gr => gr.grNumber)).join(',');
					tripRow['Qty'] = trip.gr.reduce((acc, gr) => gr.weight + acc, 0) || 0;
					tripRow['Freight'] = f;
					rowNum1 = rowNum;
					addWorkbookRow(tripRow, ws1, tripHeaders, (rowNum++), false, {
						fill: {
							type: 'pattern',
							pattern: 'solid',
							fgColor: {
								argb: trip.category === 'Empty' ? '8D8D8D' : 'F0F0F0',
								argb: custr === 'Crossing vehicle' || custr === 'Cancel-Cancel' ? 'FFFF0000' : 'F0F0F0',
							}
						}, numFmt: {
							'Qty': '0.00',
							'Freight': '0.00'
						}, alignment: {
							horizontal: 'left'
						}
					});
					obj.trips.forEach(trip => {
						if (f < 10) {
							ws1.getCell('M' + (rowNum1)).fill = {
								type: 'pattern',
								pattern: 'darkVertical',
								fgColor: {argb: 'ffff00'}
							};
						}
					});
				}
			})
		}
		if (!aData[index + 1] || aData[index + 1].trips[0].vehicle_no !== lastVehicle) {
			addWorkbookRow(totalRow, ws1, headers, (rowNum++), false, {
				fill: {
					type: 'pattern',
					pattern: 'solid',
					fgColor: {
						argb: '00DD48'
					}
				}, border: {
					top: {style: 'thin'},
					left: {style: 'thin'},
					bottom: {style: 'thin'},
					right: {style: 'thin'}
				}, numFmt: {
					'Km': '0',
					'Ex. Km': '0',
					'Days': '0',
					'RUN/DAY': '0.00',
					'Advance': '0.00',
					'Adv/Km': '0.00',
					'Frt.': '0.00',
					'Frt./Km': '0.00',
					'Expense': '0.00',
					'Expense/Km': '0.00',
					'Dvr Pymt.': '0.00',
					'Balance': '0.00',
					'Profit': '0.00',
					'Profit/Day': '0.00',
					'Profit/Km': '0.00'
				}, alignment: {
					horizontal: 'left'
				}
			});
		}
	});
	saveFileAndReturnCallback(workbook, clientId, 'Round_Trip_Performance', 'Detailed Trip Performance', callback);
};

module.exports.lastSettleRtp = function (aData, toDate, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Last Settle RT Report');

	let headers = ['Vehicle No', 'Fleet', 'RT Start', 'RT End', 'RT No', 'Driver', 'Driver Code', 'No of days'];
	formatTitle(ws1, headers.length, "Last Settle RT Report");
	formatColumnHeaders(ws1, 2, headers, [15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 3;

	aData.forEach(obj => {
		let row = {};
		row["Vehicle No"] = obj.vehicle_no || 'NA';
		row["Fleet"] = obj.fleet || 'NA';
		row["RT Start"] = obj.start_date && moment(new Date(obj.start_date)).format("DD-MM-YYYY") || 'NA';
		row["RT End"] = obj.end_date && moment(new Date(obj.end_date)).format("DD-MM-YYYY") || 'NA';
		row["RT No"] = (obj.rtNo || 'NA');
		row["Driver"] = obj.driverName || 'NA';
		row["Driver Code"] = (obj.driverCode || 'NA');
		row["No of days"] = (obj.end_date) ? dateUtil.calDays(toDate, obj.end_date) : 0;
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'RTPR', 'Last Settle RT Report', callback);
};

module.exports.purGetReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Purchase Bill Report`);
	formatTitle(ws1, 1, `Purchase Bill Report`);
	let headers = ['Bill #', 'Bill Dt.', 'Bill Type', 'Bill No', 'Vendor', 'Ltr', 'Bill Amount', 'Paid Amount', 'Remark', 'Approved', 'Created At', 'Party  Type', 'GST NO', 'HSN', 'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Tds Amount'];
	formatColumnHeaders(ws1, 3, headers, [12, 12, 15, 20, 15, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["Bill #"] = obj.billNo || '0';
		row["Bill Dt."] = obj.billDate ? moment(obj.billDate).format("DD-MM-YYYY") : 'NA';
		row["Bill Type"] = obj.billType || 'NA';
		row["Vendor"] = obj.account && obj.account.name || 'NA';
		row["Ltr"] = obj.ltr || 0;
		row["Bill Amount"] = obj.billAmount || 0;
		row["Paid Amount"] = obj.paidAmount || 0;
		row["Remark"] = obj.remark || 'NA';
		row["Approved"] = obj.plainVoucher && obj.plainVoucher[0] && 'Yes' || 'No';
		row["Created At"] = obj.created_at ? moment(obj.created_at).format("DD-MM-YYYY") : 'NA';
		row["Bill No"] = obj.billNo || 'NA';
		row["Party  Type"] = obj.partyType || 'NA';
		row["GST NO"] = obj.gstn || 'NA';
		row["HSN"] = obj.materialItems && obj.materialItems[0] && obj.materialItems[0].hsnCode || 'NA';
		row["Taxable Amt"] = obj.totalAmount || '0';
		row["CGST"] = obj.cGST || '0';
		row["SGST"] = obj.sGST || '0';
		row["IGST"] = obj.iGST || '0';
		row["Tds Amount"] = obj.tdsAmt || '0';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Purchase Bill Report', 'Purchase Bill Report', callback);
};

module.exports.purGetDieselReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('PurchaseDiesel Report');
	formatTitle(ws, 6, 'PurchaseDiesel Report');
	formatColumnHeaders(ws, 3, ['Due Date', 'Bill Ref No', 'Office', 'Ltr', 'Gross Amount', 'Net Amount', 'Narration'],
		[12, 12, 30, 15, 12, 25]);
	let overallGrossAmt = 0;
	let overallNetAmt = 0;

	for (let i = 0; i < aData.length; i++) {
		ws.getCell('A' + (i + 4)).value = aData[i].billDate ? moment(aData[i].billDate).format("DD-MM-YYYY") : 'NA';
		ws.getCell('B' + (i + 4)).value = aData[i].refNo || 'NA';
		ws.getCell('C' + (i + 4)).value = aData[i].account && aData[i].account.name || 'NA';
		ws.getCell('D' + (i + 4)).value = aData[i].ltr || 0;
		ws.getCell('E' + (i + 4)).value = aData[i].billAmount || 0;
		ws.getCell('F' + (i + 4)).value = aData[i].plainVoucher && aData[i].plainVoucher[0] && aData[i].plainVoucher.reduce((a, b) => {
			return a + (b.remAmt || 0);
		}, 0) || 0;
		ws.getCell('G' + (i + 4)).value = aData[i].remark || 0;

		overallGrossAmt += (aData[i].billAmount || 0);
		overallNetAmt += (aData[i].plainVoucher && aData[i].plainVoucher[0] && aData[i].plainVoucher.reduce((a, b) => {
			return a + (b.remAmt || 0);
		}, 0) || 0);
	}
	//add a summary row with total trips ,
	mergeCells(ws, (aData.length + 4), 2);
	ws.getCell('C' + (aData.length + 4)).value = ("Report Total");
	ws.getCell('D' + (aData.length + 4)).value = (overallGrossAmt);
	ws.getCell('E' + (aData.length + 4)).value = (overallNetAmt);

	saveFileAndReturnCallback(workbook, clientId, 'PurchaseDiesel Report', 'PurchaseDiesel Report', callback);

};

module.exports.purchaseBillSpareParts = function (aData, reportType, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Purchase Bill Report`);
	formatTitle(ws1, 1, 'Purchase Bill ' +  reportType + ' Report');
	let headers = ["Sr. No", "Bill No", "Bill Date", "Bill Type", "Vendor Name", "Qty", "Hsn Code", "GST No", "Bill Amount without GST",
		"SGST @ 2.5%","CGST @ 2.5%","IGST @ 5%",
		"SGST @ 6%","CGST @ 6%","IGST @ 12%","SGST @ 9%","CGST @ 9%","IGST @ 18%",
		"SGST @ 14%","CGST @ 14%","IGST @ 28%","Total Bill Amount", "Remarks"];
	formatColumnHeaders(ws1, 3, headers, [7, 12, 15, 16, 22, 13, 15, 15, 15 ,20,20,20,20,20,20,20,20,20,20,20,20,,20, 22]);
	let rowNum = 4;
	let count = 1;
	aData.forEach(obj => {
		let row = {};
		row["Sr. No"] = count++;
		row["Bill No"] = obj.billNo || '0';
		row["Bill Date"] = obj.billDate ? moment(obj.billDate).format("DD-MM-YYYY") : 'NA';
		row["Bill Type"] = obj.billType || 'NA';
		row["Vendor Name"] = obj.account && obj.account.name || 'NA';
		row["Qty"] = obj.ltr || 0;
		const hsnCode = obj.materialItems.map(it => it.hsnCode).join(', ');
		row["Hsn Code"] = hsnCode || 'NA';
		row["GST No"] = obj.gstn || 'NA';
		row["Bill Amount without GST"] = obj.amount || 0;
		row["IGST @ 0%"] = obj["IGST0"] || '0';
		row["IGST @ 5%"] = obj["IGST5"] || 0;
		row["IGST @ 12%"] = obj["IGST12"] || '0';
		row["IGST @ 18%"] = obj["IGST18"] || 0;
		row["IGST @ 28%"] = obj["IGST28"] || '0';
		row["SGST @ 0%"] = obj["SGST0"] || '0';
		row["SGST @ 2.5%"] = obj["SGST25"] || 0;
		row["SGST @ 6%"] = obj["SGST6"] || '0';
		row["SGST @ 9%"] = obj["SGST9"] || 0;
		row["SGST @ 14%"] = obj["SGST14"] || '0';
		row["CGST @ 0%"] = obj["CGST0"] || '0';
		row["CGST @ 2.5%"] = obj["CGST25"] || 0;
		row["CGST @ 6%"] = obj["CGST6"] || '0';
		row["CGST @ 9%"] = obj["CGST9"] || 0;
		row["CGST @ 14%"] = obj["CGST14"] || '0';
		row["Total Bill Amount"] = obj.billAmount || 0;
		row["Remarks"] = obj.remark || 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Purchase Bill Report', 'Purchase Bill Report', callback);
};

module.exports.purGetCombineDieselMonthly = function (aData, clientId, {to, from, aggrOn}, callback) {
	let fileName = `Combine Diesel ${aggrOn === 'ltr' ? '(Ltr)' : '(Amt)'} Monthwise Report`;
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(fileName);

	let aHeader = ['Fuel Pump','Fuel Company','City', 'Vendor State'], aMonth = [];
	let rowCounter = 3;
	prepareHeadersForMonth(aHeader, from, to);
	prepareHeadersForMonth(aMonth, from, to);
	aHeader.push('Total');
	formatTitle(ws, aHeader.length, fileName);
	let netColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'dfcce1'
		}
	};
	let totalColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: '00FF00'
		}
	};
	formatColumnHeaders(ws, 2, aHeader, [...Array(aMonth.length).fill(15), 15]);
	let grandTotal = 0;
	let monthObj = {};
	let totalObj = {};
	for(const d of aMonth){
		monthObj[d] = 0;
		totalObj[d]= 0;
	}
	let temp = aData[0] && aData[0].vendorComp;
	let totAmt = 0;
	let finalTotal = 0;
	aData.forEach((oData, i) => {
		if (temp != oData.vendorComp) {
			mergeCells(ws, rowCounter, 4, (temp + '  Total'), 0, {fill: netColor});
			aMonth.forEach((o, j) => {
				setVal2(ws, ws.getCell(toAlphabet(j+5) + rowCounter), helperFn.toFixed(monthObj[o], 0), {
					setColor: netColor,
				});
			});
			setVal2(ws, ws.getCell(toAlphabet(aHeader.length) + rowCounter++), helperFn.toFixed(totAmt, 0), {
				setColor: netColor,
			});
			//finalTotal += totAmt;
			temp = oData.vendorComp;
			totAmt = 0;
			for(const d of aMonth){
				monthObj[d]= 0;
			}
		}
		if (temp == oData.vendorComp) {
			if(!oData.vendorName){
				ws.getCell(getNextAlphabet(0) + rowCounter).value = oData._vendorName || '';
			}else{
				ws.getCell(getNextAlphabet(0) + rowCounter).value = oData.vendorName || '';
			}
			ws.getCell(getNextAlphabet(1) + rowCounter).value = oData.vendorComp || '';
			ws.getCell(getNextAlphabet(2) + rowCounter).value = oData.city || '';
			ws.getCell(getNextAlphabet(3) + rowCounter).value = oData.state || '';
			let finalTotal = 0;
			aMonth.forEach((o, j) => {
				let amount = 0;
				let total = 0;
				for(const d of oData.monthwise){
					if (d.date === o){
						amount = aggrOn === 'ltr' ? d.qty : d.amt;
						total += amount;
						finalTotal += amount;
					}
				}
				totAmt += total;
				totalObj[o] += total;
				monthObj[o] += total;
				ws.getCell(getNextAlphabet(j + 4) + rowCounter).value = helperFn.toFixed(total, 0);
			});
			ws.getCell(getNextAlphabet(aHeader.length-1) + rowCounter).value = helperFn.toFixed(finalTotal, 0);
			rowCounter++;
			grandTotal += finalTotal;
		}
	})
	mergeCells(ws, rowCounter, 4,(temp + '  Total'), 0, {fill: netColor});
	aMonth.forEach((o, j) => {
		setVal2(ws, ws.getCell(toAlphabet(j+5) + rowCounter), helperFn.toFixed(monthObj[o], 0), {
			setColor: netColor,
		});
	});
	setVal2(ws, ws.getCell(toAlphabet(aHeader.length) + rowCounter++), (helperFn.toFixed(totAmt, 0)), {
		setColor: netColor,
	});
	mergeCells(ws, rowCounter, 4,'GRAND TOTAL', 0, {fill: totalColor});
	aMonth.forEach((o, j) => {
		setVal(ws, getNextAlphabet(j + 4), rowCounter, helperFn.toFixed(totalObj[o], 0), {fill: '00FF00'});
	});
	setVal(ws, getNextAlphabet(aHeader.length-1), rowCounter, helperFn.toFixed(grandTotal, 0), {fill: '00FF00'});
	saveFileAndReturnCallback(workbook, clientId, fileName, fileName, callback);

	function getNextAlphabet(range) {

		return String.fromCharCode('A'.charCodeAt() + range);

		let alphabet = 'A';
		let str = '';

		for (let q = range; q > 1; q = Math.floor(q / 26)) {
			let r = q % 26;
			str += String.fromCharCode((alphabet + '').charCodeAt() + r);
		}

		return str;
	}
};

module.exports.purGetCombineDieselDaywise = function (aData, clientId, {to, from, aggrOn}, callback) {

	let fileName = `Combine_Diesel_${aggrOn === 'ltr' ? '(Ltr)' : '(Amt)'}_Daywise_Rpt`;
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(fileName);
	// formatTitle(ws, 6, fileName);

	let aHeader = ['Fuel Pump', 'Fuel Company', 'City','Vendor State'];
	let rowCounter = 4;
	prepareHeadersForDaywise(aHeader, from, to);
	let aDay = prepareHeadersForDaywise([], from, to);
	let dayObj = {};
	let totalObj = {};
	for(const d of aDay){
		dayObj[d]= 0;       // total each pump
		totalObj[d]= 0;     //grand total
	}
	aHeader.push('Total');
	formatTitle(ws, aHeader.length, fileName);
	formatColumnHeaders(ws, 3, aHeader, [...Array(aHeader.length).fill(15), 15]);
	let temp = aData[0] && aData[0].vendorComp;
	let totAmt = 0;
	let finalTotal = 0;
	let netColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'dfcce1'
		}
	};
	let totalColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: '00FF00'
		}
	};
	aData.forEach((oData, i) => {

		if (temp != oData.vendorComp) {
			mergeCells(ws, rowCounter, 4, (temp + '  Total'), 0, {fill: netColor});
			aDay.forEach((o, j) => {
				setVal2(ws, ws.getCell(toAlphabet(j+5) + rowCounter), helperFn.toFixed(dayObj[o], 0), {
					setColor: netColor,
				});
			});
			setVal2(ws, ws.getCell(toAlphabet(aHeader.length) + rowCounter++), helperFn.toFixed(totAmt, 0), {
				setColor: netColor,
			});
			//finalTotal += totAmt;
			temp = oData.vendorComp;
			totAmt = 0;
			for(const d of aDay){
				dayObj[d]= 0;
			}
		}

		if (temp == oData.vendorComp) {
			ws.getCell(toAlphabet(1) + rowCounter).value = oData.vendorName || '';
			ws.getCell(toAlphabet(2) + rowCounter).value = oData.vendorComp || '';
			ws.getCell(toAlphabet(3) + rowCounter).value = oData.city || '';
			ws.getCell(toAlphabet(4) + rowCounter).value = oData.state || '';

			let total = 0;
			let a = 4;

			while (a < aHeader.length - 1) {
				let header = aHeader[a];
				let amount = 0;
				for(const d of oData.dayWise){
					if(d.date === header){
						amount += aggrOn === 'ltr' ? d.qty : d.amt;
					}
				}
				dayObj[header] += amount;
				totalObj[header] += amount;
				// let foundData = 0;
				// if ((foundData = oData.dayWise.find(oMonth => oMonth.date === header)))
				// 	amount = aggrOn === 'ltr' ? foundData.qty : foundData.amt;
				total += amount;
				totAmt += amount;
				let cell = toAlphabet(a + 1) + rowCounter;
				ws.getCell(cell).value = helperFn.toFixed(amount, 0);
				setCellNumFormat(ws, cell);
				a++;
			}
			finalTotal += total;
			let cell = toAlphabet(aHeader.length) + rowCounter;
			ws.getCell(cell).value = helperFn.toFixed(total, 0);
			setCellNumFormat(ws, cell);
			rowCounter++;
		}

	});
	mergeCells(ws, rowCounter, 4,(temp + '  Total'), 0, {fill: netColor});
	aDay.forEach((o, j) => {
		setVal2(ws, ws.getCell(toAlphabet(j+5) + rowCounter), helperFn.toFixed(dayObj[o], 0), {
			setColor: netColor,
		});
	});
	setVal2(ws, ws.getCell(toAlphabet(aHeader.length) + rowCounter++), (helperFn.toFixed(totAmt, 0)), {
		setColor: netColor,
	});
	//grand total
	mergeCells(ws, rowCounter, 4,'GRAND TOTAL', 0, {fill: totalColor});
	aDay.forEach((o, j) => {
		setVal2(ws, ws.getCell(toAlphabet(j+5) + rowCounter), helperFn.toFixed(totalObj[o], 0), {
			setColor: totalColor,
		});
	});
	setVal2(ws, ws.getCell(toAlphabet(aHeader.length) + rowCounter), helperFn.toFixed(finalTotal, 0), {
		setColor: totalColor,
	});

	// setVal(ws, 'AI', rowCounter, parseFloat(finalTotal).toFixed(0) || 0);
	saveFileAndReturnCallback(workbook, clientId, fileName, fileName, callback);
};


// module.exports.purGetCombineDieselMonthly = function (aData, clientId, {to, from, aggrOn}, callback) {
// 	let fileName = `Combine Diesel ${aggrOn === 'ltr' ? '(Ltr)' : '(Amt)'} Monthwise Report`;
// 	let workbook = new Excel.Workbook();
// 	let ws = workbook.addWorksheet(fileName);
//
// 	let aHeader = ['Fuel Company', 'Fuel Pump', 'City', 'State'], aMonth = [];
// 	let rowCounter = 4;
// 	prepareHeadersForMonth(aHeader, from, to);
// 	prepareHeadersForMonth(aMonth, from, to);
//
// 	aHeader.push('Total');
// 	formatTitle(ws, aHeader.length, fileName);
//
// 	formatColumnHeaders(ws, 3, aHeader, [...Array(aMonth.length).fill(15), 15]);
//
// 	aData.forEach((oData, i) => {
// 		ws.getCell(getNextAlphabet(0) + rowCounter).value = oData.vendorFualName || '';
// 		ws.getCell(getNextAlphabet(1) + rowCounter).value = oData.vendorFualComp || '';
// 		ws.getCell(getNextAlphabet(2) + rowCounter).value = oData.city || '';
// 		ws.getCell(getNextAlphabet(3) + rowCounter).value = oData.state || '';
// 		let total = 0;
//
// 		aMonth.forEach((o, j) => {
// 			let date = o.split('-');
// 			let month = Number(date[0]), year = Number(date[1]);
// 			let amount = 0;
// 			let foundData = 0;
//
// 			if ((foundData = oData.monthwise.find(oMonth => month === oMonth.month && year === oMonth.year)))
// 				amount = aggrOn === 'ltr' ? foundData.totQty : foundData.totAmt;
//
// 			total += amount;
// 			ws.getCell(getNextAlphabet(j + 4) + rowCounter).value = helperFn.toFixed(amount, 0);
// 		});
//
// 		ws.getCell(getNextAlphabet(aMonth.length + 4) + rowCounter).value = helperFn.toFixed(total, 0);
// 		rowCounter++;
// 	});
//
// 	saveFileAndReturnCallback(workbook, clientId, fileName, fileName, callback);
//
// 	function getNextAlphabet(range) {
//
// 		return String.fromCharCode('A'.charCodeAt() + range);
//
// 		let alphabet = 'A';
// 		let str = '';
//
// 		for (let q = range; q > 1; q = Math.floor(q / 26)) {
// 			let r = q % 26;
// 			str += String.fromCharCode((alphabet + '').charCodeAt() + r);
// 		}
//
// 		return str;
// 	}
// };
//
// module.exports.purGetCombineDieselDaywise = function (aData, clientId, {to, from, aggrOn}, callback) {
// 	let fileName = `Combine_Diesel_${aggrOn === 'ltr' ? '(Ltr)' : '(Amt)'}_Daywise_Rpt`;
// 	let workbook = new Excel.Workbook();
// 	let ws = workbook.addWorksheet(fileName);
// 	// formatTitle(ws, 6, fileName);
//
// 	let aHeader = ['Fuel Pump', 'Fuel Company', 'City', 'State'];
// 	let rowCounter = 4;
// 	prepareHeadersForDaywise(aHeader, from, to);
// 	// prepareHeadersForDaywise(aMonth, from, to);
//
// 	aHeader.push('Total');
// 	formatTitle(ws, aHeader.length, fileName);
// 	formatColumnHeaders(ws, 3, aHeader, [...Array(aHeader.length).fill(15), 15]);
// 	let temp = aData[0].vendorFualComp;
// 	let totAmt = 0;
// 	let netColor = {
// 		type: 'pattern',
// 		pattern: 'solid',
// 		fgColor: {
// 			argb: 'dfcce1'
// 		}
// 	};
// 	aData.forEach((oData, i) => {
//
// 		if (temp != oData.vendorFualComp) {
// 			// ws.getCell(toAlphabet(1) + rowCounter).value = (temp + '  Total');
//
//
// 			// setVal2(ws, ws.getCell(toAlphabet(1) + rowCounter), (temp + '  Total'), {
// 			// 	border: true,
// 			// 	width: 25,
// 			// 	setColor: netColor,
// 			// 	align: true
// 			// });
// 			mergeCells(ws, rowCounter, (aHeader.length - 1), (temp + '  Total'), 0, {fill: netColor});
//
// 			setVal2(ws, ws.getCell(toAlphabet(aHeader.length) + rowCounter++), helperFn.toFixed(totAmt, 0), {
//
// 				setColor: netColor,
//
// 			});
//
// 			// ws.getCell(toAlphabet(aHeader.length) + rowCounter++).value = helperFn.toFixed(totAmt, 0);
// 			temp = oData.vendorFualComp;
// 			totAmt = 0;
// 		}
//
// 		if (temp == oData.vendorFualComp) {
// 			ws.getCell(toAlphabet(1) + rowCounter).value = oData.vendorFualName || '';
// 			// ws.getCell(toAlphabet(1) + rowCounter).alignment = { vertical: 'top', horizontal: 'right' };
// 			ws.getCell(toAlphabet(2) + rowCounter).value = oData.vendorFualComp || '';
// 			ws.getCell(toAlphabet(3) + rowCounter).value = oData.city || '';
// 			ws.getCell(toAlphabet(4) + rowCounter).value = oData.state || '';
// 			let total = 0;
// 			let a = 4;
//
// 			while (a < aHeader.length - 1) {
// 				let header = aHeader[a];
// 				let amount = 0;
// 				let foundData = 0;
// 				let date = header.split('-');
// 				let day = Number(date[0]), month = Number(date[1]), year = Number(date[2]);
// 				if ((foundData = oData.monthwise.find(oMonth => day === oMonth.day && month === oMonth.month && year === oMonth.year)))
// 					amount = aggrOn === 'ltr' ? foundData.totQty : foundData.totAmt;
// 				total += amount;
// 				totAmt += amount;
// 				let cell = toAlphabet(a + 1) + rowCounter;
// 				ws.getCell(cell).value = helperFn.toFixed(amount, 0);
// 				setCellNumFormat(ws, cell);
// 				a++;
// 			}
// 			let cell = toAlphabet(aHeader.length) + rowCounter;
// 			ws.getCell(cell).value = helperFn.toFixed(total, 0);
// 			setCellNumFormat(ws, cell);
// 			rowCounter++;
// 		}
//
// 	});
// 	mergeCells(ws, rowCounter, (aHeader.length - 1), (temp + '  Total'), 0, {fill: netColor});
// 	// ws.getCell(toAlphabet(1) + rowCounter).value = (temp + '  Total');
// 	// ws.getCell(toAlphabet(aHeader.length) + rowCounter++).value = helperFn.toFixed(totAmt, 0);
//
// 	setVal2(ws, ws.getCell(toAlphabet(aHeader.length) + rowCounter++), (helperFn.toFixed(totAmt, 0)), {
// 		setColor: netColor,
// 	});
//
// 	saveFileAndReturnCallback(workbook, clientId, fileName, fileName, callback);
// };

module.exports.purGetDieselMonthly = function (aData, clientId, {to, from, aggrOn}, callback) {
	let fileName = `Purchase Diesel ${aggrOn === 'ltr' ? '(Ltr)' : ''} Report`;
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(fileName);
	formatTitle(ws, 6, fileName);

	let aHeader = ['Account', 'Pump'], aMonth = [];
	let rowCounter = 4;

	prepareHeadersForMonth(aHeader, from, to);
	prepareHeadersForMonth(aMonth, from, to);

	aHeader.push('Total');

	formatColumnHeaders(ws, 3, aHeader, [...Array(aMonth.length).fill(15), 15]);

	aData.forEach((oData, i) => {
		ws.getCell(getNextAlphabet(0) + rowCounter).value = oData.billAcc || '';
		ws.getCell(getNextAlphabet(1) + rowCounter).value = oData.group || '';
		let total = 0;

		aMonth.forEach((o, j) => {
			let date = o.split('-');
			let month = Number(date[0]), year = Number(date[1]);
			let amount = 0;
			let foundData = 0;

			if ((foundData = oData.monthwise.find(oMonth => month === oMonth.month && year === oMonth.year)))
				amount = aggrOn === 'ltr' ? foundData.totQty : foundData.totAmt;

			total += amount;
			ws.getCell(getNextAlphabet(j + 2) + rowCounter).value = helperFn.toFixed(amount, 0);
		});

		ws.getCell(getNextAlphabet(aMonth.length + 2) + rowCounter).value = helperFn.toFixed(total, 0);
		rowCounter++;
	});

	saveFileAndReturnCallback(workbook, clientId, fileName, fileName, callback);

	function getNextAlphabet(range) {

		return String.fromCharCode('A'.charCodeAt() + range);

		let alphabet = 'A';
		let str = '';

		for (let q = range; q > 1; q = Math.floor(q / 26)) {
			let r = q % 26;
			str += String.fromCharCode((alphabet + '').charCodeAt() + r);
		}

		return str;
	}
};
module.exports.billReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Bill Report`);
	formatTitle(ws1, 1, `Bill Report`);
	let headers = ['Bill #', 'GR #', 'Bill Type', 'SAC Code', 'Status', 'Billing Party', 'Billing Party A/C', 'GST NO', 'Date', 'Allocated Freight', 'Credit Note No', 'Category','CGST %', 'SGST %','IGST %','CGST', 'SGST', 'IGST', 'Total Tax', 'Bill Amount', 'Amount Received', 'Due Amount', 'Due Date', 'Bill Remark', 'Remark'];
	formatColumnHeaders(ws1, 3, headers, [12, 12, 15, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["Bill #"] = obj.billNo;
		const grNos = obj.items.map(it => it.gr.grNumber).join(', ');
		row["GR #"] = grNos;
		row['Bill Type'] = obj.type;
		row['Status'] = obj.status;
		row['SAC Code'] = obj.sacCode;
		row['Billing Party'] = obj.billingParty && obj.billingParty.name || 'NA';
		row['Billing Party A/C'] = obj.billingParty && obj.billingParty.billName || 'NA';
		row['GST NO'] = obj.billingParty && obj.billingParty.gstin || 'NA';
		row['Date'] = obj.billDate
			? moment(obj.billDate).format('DD-MM-YYYY')
			: obj.created_at
				? moment(obj.created_at).format('DD-MM-YYYY')
				: 'NA';
		row['Due Date'] = obj.dueDate ? moment(obj.dueDate).format('DD-MM-YYYY') : 'NA';
		row['Bill Amount'] = obj.billAmount;
		row['Allocated Freight'] = obj.amount;
		/*
		let receivedAmount = 0;
		obj.items.map(it => {
			let temp = (it.settlement || []).reduce((accumulator, currentValue) => {
				return accumulator + currentValue.amountReceived + (currentValue.otherAmountTotal || 0);
			}, 0);
			try {
				receivedAmount += (temp || 0);
			} catch (e) { }
		});*/
		row['Credit Note No'] = obj.creditNo || 'NA';
		row['Category'] = obj.category || 'NA';
		row['Amount Received'] = obj.recAmt || 'NA';
		row['Due Amount'] = obj.totDueAmt || 'NA';
		row['CGST %'] = obj.cGST_percent;
		row['SGST %'] = obj.sGST_percent;
		row['IGST %'] = obj.iGST_percent;
		row['CGST'] = obj.cGST;
		row['SGST'] = obj.sGST;
		row['IGST'] = obj.iGST;
		row['Total Tax'] = obj.iGST ? obj.iGST : obj.cGST + obj.sGST;
		row['Bill Remark'] = obj.remarks || 'NA';
		row['Remark'] = (obj.status === 'Approved')
			? (obj.approve && obj.approve.remark || 'NA')
			: obj.status === 'Cancelled'
				? obj.cancel_remark || 'NA'
				: obj.status === 'Acknowledged' ? (obj.acknowledge && obj.acknowledge.remark) : 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Bill Report', 'Bill Report', callback);
};
module.exports.plReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`PL Report`);
	formatTitle(ws1, 1, `PL Report`);
	let headers = ['Month', 'Trip Id', 'Customer Name', 'Vehicle No', 'Destination', 'Date', 'LR No', 'Sale Amount', 'Transporter', 'Purchase Amount', 'Advance', 'Balance', 'Margin', 'Margin%'];
	formatColumnHeaders(ws1, 3, headers, [12, 12, 15, 20, 15, 15, 15, 15, 15, 15, 15, 15, 20, 12]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row['Month'] = obj.month || 'NA';
		row['Trip Id'] = obj.trip_no || 'NA';
		row['Customer Name'] = obj.customerName || 'NA';
		row['Vehicle No'] = obj.vehicle_no || 'NA';
		row['Destination'] = obj.destination || 'NA';
		row['Date'] = moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") || 'NA';
		row['LR No'] = obj.grNumber || 'NA';
		row['Sale Amount'] = obj.saleAmount || '0';
		row['Transporter'] = obj.vendorName || 'NA';
		row['Purchase Amount'] = obj.purchaseAmount || '0';
		row['Advance'] = obj.advanceF || '0';
		row['Balance'] = obj.balance || '0';
		let margin = row['Margin'] = ((obj.saleAmount) - (obj.purchaseAmount)) || '0';
		let marg = (margin / obj.purchaseAmount) * 100;
		if (marg > 0)
			row['Margin%'] = (marg + '%') || 'NA';
		else if (marg === 0)
			row['Margin%'] = marg || 'NA';
		else if (marg < 0)
			row['Margin%'] = -marg || 'NA';

		// row['Margin%'] = ((margin/obj.purchaseAmount)*100) + '%' || 'NA' ;
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'PL Report', 'PL Report', callback);
};

module.exports.gstSales = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`GST Sales Report`);
	formatTitle(ws1, 1, `GST Sales Report`);
	let headers = ['Invoice Date', 'Invoice No', 'Customer Billing Name', 'Customer Billing GSTIN', 'State Place of Supply', 'Is the item a GOOD (G) or SERVICE (S)', 'Item Description', 'HSN or SAC code', 'Item Quantity', 'Item Unit of Measurement', 'Item Rate', 'Total Item Discount Amount', 'Item Taxable Value', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'IGST Rate', 'IGST Amount', 'CESS Rate', 'CESS Amount', 'Is this a Bill of Supply?', 'Is this a Nil Rated/Exempt/NonGST item?', 'Is Reverse Charge Applicable?', 'Type of Export', 'Shipping Port Code - Export', 'Shipping Bill Number - Export', 'Shipping Bill Date - Export', 'Has GST/IDT TDS been deducted', 'My GSTIN', 'Customer Billing Address', 'Customer Billing City', 'Customer Billing State', 'Is this document cancelled?', 'Is the customer a Composition dealer or UIN registered?', 'Return Filing Month', 'Return Filing Quarter', 'Original Invoice Date (In case of amendment)', 'Original Invoice Number (In case of amendment)', 'Original Customer Billing GSTIN (In case of amendment)', 'GSTIN of Ecommerce Marketplace', 'Date of Linked Advance Receipt', 'Voucher Number of Linked Advance Receipt', 'Adjustment Amount of the Linked Advance Receipt', 'Total Transaction Value'];
	formatColumnHeaders(ws1, 3, headers, [10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 15, 20, 15, 15, 15, 15, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 15, 15, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row['Invoice Date'] = obj.billDate ? moment(obj.billDate).format('DD-MM-YYYY') : 'NA';
		row['Invoice No'] = obj.billNo || 'NA';
		row['Customer Billing Name'] = (obj.billingParty && obj.billingParty.name) || 'NA';
		row['Customer Billing GSTIN'] = (obj.billingParty && obj.billingParty.gstin) || 'NA';
		row['State Place of Supply'] = (obj.billingParty && obj.billingParty.state_name) || 'NA';
		row['Is the item a GOOD (G) or SERVICE (S)'] = obj.segment_type || 'NA';
		// row['Item Description'] = obj  ;
		// row['HSN or SAC code'] = obj ;
		row['Item Quantity'] = (obj.items && obj.items[0] && obj.items[0].grData && obj.items[0].grData.invoices && obj.items[0].grData.invoices[0] && obj.items[0].grData.invoices[0].noOfUnits) || 0;
		// row['Item Unit of Measurement'] = obj ;
		// row['Item Rate'] =(obj.items && obj.items[0] && obj.items[0].grData && obj.items[0].grData.invoices && obj.items[0].grData.invoices[0] && obj.items[0].grData.invoices[0].rate) || 0;
		// row['Total Item Discount Amount'] = obj  ;
		// row['Item Taxable Value'] = obj  ;
		row['CGST Rate'] = obj.cGST_percent || 0;
		row['CGST Amount'] = (obj.cGST) || 0;
		row['SGST Rate'] = (obj.sGST_percent) || 0;
		row['SGST Amount'] = (obj.sGST) || 0;
		row['IGST Rate'] = (obj.iGST) || 0;
		row['IGST Amount'] = (obj.iGST) || 0;
		// row['CESS Rate'] = obj  ;
		// row['CESS Amount'] = obj  ;
		if (obj.billingParty && obj.billingParty.businessLocation) {
			row['Is this a Bill of Supply?'] = 'Y';
		} else {
			row['Is this a Bill of Supply?'] = 'N';
		}
		// row['Is this a Nil Rated/Exempt/NonGST item?'] = obj  ,
		// row['Is Reverse Charge Applicable?'] = obj  ,
		// row['Type of Export'] = (obj.items[0] && obj.items[0].gr && obj.items[0].gr.booking && obj.items[0].gr.booking.booking_type) || 'NA' ;
		// row['Shipping Port Code - Export'] = obj  ,
		// row['Shipping Bill Number - Export'] = obj  ,
		// row['Shipping Bill Date - Export'] = obj  ,
		// row['Has GST/IDT TDS been deducted'] = obj  ,
		row['My GSTIN'] = (obj.billingParty && obj.billingParty.gstin) || 'NA';
		row['Customer Billing Address'] = (obj.billingParty && obj.billingParty.address) || 'NA';
		// row['Customer Billing City'] = (obj.billingParty && obj.billingParty.state_name) || 'NA';
		row['Customer Billing State'] = (obj.billingParty && obj.billingParty.state_name) || 'NA';
		// row['Is this document cancelled?'] = obj  ;
		// row['Is the customer a Composition dealer or UIN registered?'] = obj  ;
		// row['Return Filing Month'] = obj  ;
		// row['Return Filing Quarter'] = obj  ;
		// row['Original Invoice Date (In case of amendment)'] = obj  ;
		// row['Original Invoice Number (In case of amendment)'] = obj  ;
		// row['Original Customer Billing GSTIN (In case of amendment)'] = obj  ;
		// row['GSTIN of Ecommerce Marketplace'] = obj  ;
		// row['Date of Linked Advance Receipt'] = obj  ;
		// row['Voucher Number of Linked Advance Receipt'] = obj  ;
		// row['Adjustment Amount of the Linked Advance Receipt'] = obj  ;
		// row['Total Transaction Value'] = obj  ;
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'GST Sales Report', 'GST Sales Report', callback);
};

module.exports.billStationaryReports = function (aData, body, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Bill Stationary Report`);
	formatTitle(ws1, 1, `Bill Stationary Report`);
	let headers = ['Stationary No', 'Bill Type', 'Status', 'CREATED AT', 'LAST MODIFIED'];
	// let headers1 = ['Stationary Name','Branch', 'CREATED BY'];
	if (body.stationaryRpt)
		headers = ['Stationary No', 'Stationary Name', 'Bill Type', 'Status', 'Branch', 'CREATED BY', 'CREATED AT', 'LAST MODIFIED'];
	// headers = headers.concat(headers1);
	formatColumnHeaders(ws1, 3, headers, [16, 20, 13, 13, 13, 13, 13, 17]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["Stationary No"] = obj.bookNo;
		row["Stationary Name"] = (obj.billBookId && obj.billBookId.name);
		row['Bill Type'] = obj.type;
		row['Status'] = obj.status;
		row['Branch'] = obj.billBookId && obj.billBookId.branch[0] && obj.billBookId.branch[0].name;
		// row['CREATED BY'] = clientId.full_name;
		row['CREATED AT'] = obj.created_at;
		row['LAST MODIFIED'] = obj.last_modified_at;


		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Bill Report', 'Bill Report', callback);
};

module.exports.dlpDup = function (aData, rpType, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Daily ${rpType === 'dlp' ? 'Loading' : 'Unloading'} Performance Report`);

	ws1.views = [
		{state: 'frozen', xSplit: 0, ySplit: 2, zoomScale: 80}
	];
	if (rpType === 'dlp') {
		ws1.getCell('C2').value = 'Total KM';
		ws1.getCell('D2').value = aData[0].tTotalKM;
		ws1.getCell('C3').value = 'Total Profit';
		ws1.getCell('D3').value = aData[0].tTotal_profit && aData[0].tTotal_profit.toFixed(2);
		ws1.getCell('C5').value = 'Total Internal Freight';
		ws1.getCell('D5').value = aData[0].tInternal_freight && aData[0].tInternal_freight.toFixed(2);
	}
	ws1.getCell('C4').value = 'Total Expense';
	ws1.getCell('D4').value = aData[0].tTotal_expense && aData[0].tTotal_expense.toFixed(2);
	ws1.getCell('C6').value = 'Total Trips';
	ws1.getCell('D6').value = aData[0].tripsCount;
	let headers = ["Vehicle No.", 'Trip Start', 'Segment', 'Trip No.', 'Route', 'KM', 'Revenue', 'Revenue/KM', 'Advance cash', 'Advance diesel', 'Total advance', 'Adv/km', 'Profit', 'Profit/KM'];
	formatColumnHeaders(ws1, 6, headers, [12, 12, 15, 12, 40, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	formatTitle(ws1, headers.length, `Daily ${rpType === 'dlp' ? 'Loading' : 'Unloading'} Performance Report`);
	let rowNum = 7;
	aData[0].trips.forEach(obj => {

		let row = {};
		row["Vehicle No."] = obj.vehicle_no;
		row['Trip Start'] = (obj.trip_start_status && obj.trip_start_status.date) ? moment(obj.trip_start_status.date).format("DD-MM-YYYY") : 'NA';
		row['Segment'] = obj.segment_type || 'NA';
		row['Trip No.'] = obj.trip_no || 'NA';
		row['Route'] = obj.route_name || 'NA';
		row['KM'] = obj.route && obj.route.route_distance || 'NA';
		row['Revenue'] = parseFloat(obj.internal_freight && obj.internal_freight.toFixed(2)) || 0;
		row['Revenue/KM'] = parseFloat(obj['revenue/km'] && obj['revenue/km'].toFixed(2)) || 0;
		row['Advance cash'] = parseFloat(obj.tAdv && obj.tAdv.cashAdvance && obj.tAdv.cashAdvance.toFixed(2)) || 0;
		row['Advance diesel'] = parseFloat(obj.tAdv && obj.tAdv.dieselAdvance && obj.tAdv.dieselAdvance.toFixed(2)) || 0;
		row['Total advance'] = parseFloat(obj.tAdv && obj.tAdv.totalAdvance && obj.tAdv.totalAdvance.toFixed(2)) || 0;
		row['Adv/km'] = parseFloat(obj['adv/km'] && obj['adv/km'].toFixed(2)) || 0;
		row['Profit'] = parseFloat(obj.profit && obj.profit.toFixed(2)) || 0;
		row['Profit/KM'] = parseFloat(obj['profit/km'] && obj['profit/km'].toFixed(2)) || 0;
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Daily Loading-Unloading Performance Report', 'Daily Loading-Unloading Performance Report', callback);
};

module.exports.newTripAdvRep = function (aData,req, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Advance');
	let headers = [];
	if(req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.showAdvanceExtCharg){
		headers = ["ADVANCE DATE", "Advance Type", "Trip No.", "VEHICLE NO", "BRANCH", "BRANCH ACCOUNT", 'HAPPAY ACCOUNT', 'REFERENCE NO', 'BILL NO', "Person", 'Advance', 'Dala', 'Gate Pass', 'Kanta', 'Panni', 'Account Salary', 'Service', 'Unloading', 'Repairing', 'Commission', "AMOUNT", "Debit AC", "Credit AC", 'DIESEL LITRE', 'DIESEL RATE', "Driver Name", "Driver No.", "DIESEL VENDOR", "REMARK", "Id", "Segment", "Ownership", 'Vehicle Owner Name', 'Fleet', "RT No.", "No of Day", "Entry BY", "Entry Date", "Modification By", "Modification Date"];
		formatColumnHeaders(ws1, 1, headers, [13, 16, 13, 18, 18, 22, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 20, 15, 10, 20, 20, 20, 20, 20, 20, 20, 20]);
	}else{
		headers = ["ADVANCE DATE", "Advance Type", "Trip No.", "VEHICLE NO", "BRANCH", "BRANCH ACCOUNT", 'HAPPAY ACCOUNT', 'REFERENCE NO', 'BILL NO', "Person", "AMOUNT", "Debit AC", "Credit AC", 'DIESEL LITRE', 'DIESEL RATE', "Driver Name", "Driver No.", "DIESEL VENDOR", "REMARK", "Id", "Segment", "Ownership", 'Vehicle Owner Name', 'Fleet', "RT No.", "No of Day", "Entry BY", "Entry Date", "Modification By", "Modification Date"];
		formatColumnHeaders(ws1, 1, headers, [13, 16, 13, 18, 18, 22, 15, 15, 15, 15, 15, 15, 15, 15, 15, 20, 12, 15, 15, 15, 15, 15, 20, 15, 10, 20, 20, 20, 20, 20, 20, 20, 20]);
	}

	let rowNum = 2;
	aData.forEach(obj => {
		let row = {};
		row["ADVANCE DATE"] = obj.date ? moment(obj.date).utcOffset(0, true).toDate() : 'NA';
		row["Advance Type"] = obj.advanceType || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["VEHICLE NO"] = obj.vehicle_no || 'NA';
		row["BRANCH"] = obj.branch && obj.branch.name || 'NA';
		if ((obj.advanceType === 'Driver Cash') || (obj.advanceType === 'Vendor Advance') || (obj.advanceType === 'Vendor Balance')) {
			row["BRANCH ACCOUNT"] = (obj.from_account && obj.from_account.name) || 'NA';
		}
		if (obj.advanceType === 'Happay') {
			row['HAPPAY ACCOUNT'] = (obj.from_account && obj.from_account.name) || 'NA';
		}


		row['REFERENCE NO'] = obj.reference_no || 'NA';
		row['BILL NO'] = obj.bill_no || 'NA';
		row['Person'] = obj.person || 'NA';
		row['Advance'] = (obj.ExtraCharges && obj.ExtraCharges.Advance) || 0;
		row['Dala']  = (obj.ExtraCharges && obj.ExtraCharges.Dala) || 0;
		row['Gate Pass'] = (obj.ExtraCharges &&  obj.ExtraCharges.GatePass) || 0;
		row['Kanta'] = (obj.ExtraCharges && obj.ExtraCharges.Kanta) || 0;
		row['Panni'] = (obj.ExtraCharges && obj.ExtraCharges.Panni) || 0;
		row['Account Salary'] = (obj.ExtraCharges && obj.ExtraCharges.AccountSalary) || 0;
		row['Service'] = (obj.ExtraCharges && obj.ExtraCharges.Service) || 0;
		row['Unloading'] = (obj.ExtraCharges && obj.ExtraCharges.Unloading) || 0;
		row['Repairing'] = (obj.ExtraCharges && obj.ExtraCharges.Repairing) || 0;
		row['Commission'] = (obj.ExtraCharges && obj.ExtraCharges.Commission) || 0;
		row['AMOUNT'] = obj.amount || 'NA';
		row["Debit AC"] = (obj.to_account && obj.to_account.name) || 'NA';
		row["Credit AC"] = (obj.from_account && obj.from_account.name) || 'NA';
		row['DIESEL LITRE'] = (obj.dieseInfo && obj.dieseInfo.litre) || 'NA';
		row['DIESEL RATE'] = (obj.dieseInfo && obj.dieseInfo.rate) || 'NA';
		row["Driver Name"] = (obj.driver && obj.driver.name) || "NA";
		row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		row["DIESEL VENDOR"] = (obj.advanceType === 'Diesel') ? obj.dieseInfo._vendorName : "NA";
		row["REMARK"] = (obj.narration || '').concat("  ", (obj.remark || '')) || 'NA';
		row["Id"] = obj._id && obj._id.toString();
		row["Segment"] = (obj.vehicle && obj.vehicle.segment_type) || 'NA';
		row["Ownership"] = (obj.vehicle && obj.vehicle.ownershipType) || 'NA';
		row['Vehicle Owner Name'] = (obj.vehicle && obj.vehicle.owner_name) || 'NA';
		row["Fleet"] = (obj.vehicle && obj.vehicle.owner_group) || 'NA';
		row["RT No."] = (obj.trip && obj.trip.advSettled && obj.trip.advSettled.tsNo) || 'NA';
		row["Entry BY"] = (obj.userName && obj.userName.full_name) || (obj.createdBy) || 'NA';
		let entryDate = (obj.created_at || obj.uploaded_at);
		row["Entry Date"] = entryDate ? moment(entryDate).utcOffset(0, true).toDate() : 'NA';
		row["Modification By"] = (obj.userName && obj.userName.last_modified_by_name) || (obj.last_modified_by_name) || 'NA';
		row["Modification Date"] = obj.last_modified_at ? moment(obj.last_modified_at).utcOffset(0, true).toDate() : 'NA';
		row["No of Day"] = (obj.date && entryDate) ? dateUtil.calDays(entryDate, obj.date) : 0;

		let cell = toAlphabet(10) + rowNum;
		let cell2 = toAlphabet(1) + rowNum;
		let cell3 = toAlphabet(25) + rowNum;
		let cell4 = toAlphabet(27) + rowNum;
		setCellNumFormat(ws1, cell);
		setCellNumFormat(ws1, cell2, 'dd-mm-yyyy');
		setCellNumFormat(ws1, cell3, 'dd-mm-yyyy');
		setCellNumFormat(ws1, cell4, 'dd-mm-yyyy');

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'tripAdvance', 'Trip_Advance', callback);
};

module.exports.grShipmentReport = function (aData, user, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Shipment Tracking');

	let headers = Reports.shipmentTracking.headers;
	let rowNum = 5;
	formatTitle(ws1, headers.length, "Shipment Tracking Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 20, 15, 35, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15], 20);

	aData.forEach((obj) => {
		let row = Reports.shipmentTracking.transform(obj);
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, user.clientId, 'Shipment Tracking', 'Shipment Tracking Report', callback);
};

module.exports.billingPartyReports = function (aData, user, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('BillingParty Report');

	let headers = [
		"Name",
		"Address",
		"Address 2",
		"Customer",
		"Contract Company",
		"Operation Company",
		"Gst Percent",
		"Contact Person",
		"Contact Number",
		"Gstin",
		"account",
		"BillingParty with Hold A/c",
		"Ledger Account",
		"account Id",
		"account Type",
		"opening balance",
		"State Code",
		"Added On",
		"Added By",
		"Id",
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "BillingParty  Reports");
	formatColumnHeaders(ws1, 4, headers, [20, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 25], 20);

	aData.forEach(obj => {
		let row = {};
		let clientName = user.client_allowed.find(ca => ca.clientId === obj.clientId);
		let clientR = user.client_allowed.filter(o => obj.clientR && obj.clientR.indexOf(o.clientId) + 1).map(o => o.name).join(', ');

		row["Name"] = obj.name || 'NA';
		row["Address"] = obj.address || 'NA';
		row["Address 2"] = obj.address2 || 'NA';
		row["Customer"] = obj.customer && obj.customer.name || 'NA';
		row["Contract Company"] = clientName && clientName.name || 'NA';
		row["Operation Company"] = clientR || 'NA';
		row["Gst Percent"] = obj.percent ? obj.percent + '%' : 'NA';
		row["Contact Person"] = obj.contact_person || 'NA';
		row["Contact Number"] = obj.contact_number && obj.contact_number.toString() || 'NA';
		row["Gstin"] = obj.gstin || "NA";
		row["account"] = obj.account && obj.account.name || "NA";
		row["BillingParty with Hold A/c"] = obj.withHoldAccount && obj.withHoldAccount.name || "NA";
		row["Ledger Account"] = obj.account && obj.account.ledger_name || "NA";
		row["account Id"] = obj.account && obj.account.accountId || "NA";
		row["account Type"] = obj.account && obj.account.type && obj.account.type.name || "NA";
		row["opening balance"] = obj.account && obj.account.opening_balance || "NA";
		row["State Code"] = obj.state_code || "NA";
		row["Added On"] = moment(new Date(obj.billing_dates)).format("DD-MM-YYYY") || 'NA';
		row["Added By"] = obj.last_modified_by_name || "NA";
		row["Id"] = obj._id || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, user.clientId, 'myBillingParty', 'billingParty Report', callback);
};

module.exports.cityStateReports = function (aData, user, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('cityState Report');

	let headers = [
		"City",
		"State",
		"PinCode",
		"District",
		"Zone",
		"Added On",
		"Added By",
	];

	let rowNum = 5;
	formatColumnHeaders(ws1, 4, headers, [20, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 25], 20);
	formatTitle(ws1, headers.length, "cityState  Reports");

	aData.forEach(obj => {
		let row = {};

		row["City"] = obj.c || 'NA';
		row["State"] = obj.s || 'NA';
		row["PinCode"] = obj.p || 'NA';
		row["District"] = obj.d|| 'NA';
		row["Zone"] = obj.zone || 'NA';
		row["Added On"] = obj.createdAt ? moment(obj.createdAt).format("DD-MM-YYYY") : 'NA';
		row["Added By"] = obj.createdBy || 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, user.clientId, 'cityState', 'cityState Report', callback);
};

module.exports.directoryReports = function (aData, user, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Directory Report');

	let headers = [
		"first name",
		"last name",
		"Designation",
		"company name",
		"city",
		"state",
		"contact address",
		"address1",
		"address2",
		"city state zip",
		"Pincode",
		"mobile",
		"mobile2",
		"email",
		"email2",
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Directory  Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15], 20);

	aData.forEach(obj => {
		let row = {};

		row["first name"] = obj.first_name || 'NA';
		row["last name"] = obj.last_name || 'NA';
		row["company name"] = obj.company_name || 'NA';
		row["Designation"] = obj.designation || 'NA';
		row["city"] = obj.city || 'NA';
		row["state"] = obj.state || 'NA';
		row["contact address"] = obj.contact_address || 'NA';
		row["address1"] = obj.add1 || 'NA';
		row["address2"] = obj.add2 || 'NA';
		row["city state zip"] = obj.city_state_zip || 'NA';
		row["Pincode"] = obj.zip || 'NA';
		row["mobile"] = obj.mobile1 || 'NA';
		row["mobile2"] = obj.mobile2 || 'NA';
		row["email"] = obj.email1 || 'NA';
		row["email2"] = obj.email2 || 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, user.clientId, 'directory', 'directory Report', callback);
};

module.exports.assetsReports = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Assets Report');

	let headers = [
		"Name",
		"Category",
		"Date",
		"Status",
		"Location",
		"Qty",
		"Rate",
		"Original PurCost",
		"Life",
		"Method",
		"assets Ac",
		"depreciation Ac",
		"unit"
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Assets Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 12, 12, 15, 12, 12, 18, 18, 12, 15, 15, 15, 15]);

	aData.forEach(obj => {
		let row = {};

		row["Name"] = obj.name || 'NA';
		row["Category"] = obj.category && obj.category.category || 'NA';
		row["Date"] = obj.date ? moment(obj.date).format("DD-MM-YYYY") : 'NA';
		row["Status"] = obj.physicalStatus || 'NA';
		row["Location"] = obj.location || 'NA';
		row["Qty"] = obj.qty || 'NA';
		row["Rate"] = obj.rate || 'NA';
		row["Original PurCost"] = ((obj.qty || 0) * (obj.rate || 0)) || 'NA';
		row["Life"] = obj.bookBalanceLife || 'NA';
		row["Method"] = obj.method || 'NA';
		row["assets Ac"] = obj.assetsAc && obj.assetsAc.name || 'NA';
		row["depreciation Ac"] = obj.depreciationAc && obj.depreciationAc.name || 'NA';
		row["unit"] = obj.unit || 'NA';


		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Assets', 'Assets Report', callback);
};

module.exports.calDeprReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Calculate Deprecation Report');

	let headers = [
		"Name",
		// "CostCenter",
		// "Vendor",
		"Category",
		"Date",
		"Status",
		"Location",
		"Qty",
		"Rate",
		"Original PurCost",
		"Life",
		"Method",
		"assets Ac",
		"depreciation Ac",
		"unit",
		"itAct NetVal",
		"cAct NetVal",
		"itAct AccumDep",
		"cAct AccumDep",
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Calculate Deprecation Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 12, 12, 15, 12, 12, 18, 18, 12, 15, 15, 15, 15]);

	aData.forEach(obj => {
		let row = {};

		row["Name"] = obj.name || 'NA';
		// row["CostCenter"] = obj.purBill && obj.purBill.branch && obj.purBill.branch.name || 'NA';
		// row["Vendor"] = obj.purBill && obj.purBill.vendor && obj.purBill.vendor.name || 'NA';
		row["Category"] = obj.category && obj.category.category || 'NA';
		row["Date"] = obj.date ? moment(obj.date).format("DD-MM-YYYY") : 'NA';
		row["Status"] = obj.physicalStatus || 'NA';
		row["Location"] = obj.location || 'NA';
		row["Qty"] = obj.qty || 'NA';
		row["Rate"] = obj.rate || 'NA';
		row["Original PurCost"] = ((obj.qty || 0) * (obj.rate || 0)) || 'NA';
		row["Life"] = obj.bookBalanceLife || 'NA';
		row["Method"] = obj.method || 'NA';
		row["assets Ac"] = obj.assetsAc && obj.assetsAc.name || 'NA';
		row["depreciation Ac"] = obj.depreciationAc && obj.depreciationAc.name || 'NA';
		row["unit"] = obj.unit || 'NA';
		row["itAct NetVal"] = obj.itActNetVal || 'NA';
		row["cAct NetVal"] = obj.cActNetVal || 'NA';
		row["itAct AccumDep"] = obj.itActAccumDep || 'NA';
		row["cAct AccumDep"] = obj.cActAccumDep || 'NA';


		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Calculate Deprecation Report', 'Calculate Deprecation Report', callback);
};

module.exports.billBookReports = function (aData, user, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('BillBook Report');

	let headers = [
		"Name",
		"Format",
		"Min Count",
		"Max Count",
		"Type",
		"Branch",
		"Created By",
		"Created At",
		"Last Modified By",
		"Last Modified At"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "BillBook  Reports");
	formatColumnHeaders(ws1, 4, headers, [20, 25, 15, 15, 15, 15, 16, 16, 16, 16], 20);

	aData.forEach(obj => {
		let row = {};
		row["Name"] = obj.name || " " || 'NA';
		row["Format"] = obj.format || 'NA';
		row["Min Count"] = obj.min || 'NA';
		row["Max Count"] = obj.max || 'NA';
		row["Type"] = obj.type || 'NA';

		row["Branch"] = '';

		for (let i = 0; i < obj.branch.length; i++) {
			row["Branch"] += obj.branch[i].name || 'NA';
			if (i != obj.branch.length - 1)
				row["Branch"] += ', ';
		}

		row["Created By"] = obj.user || "NA";
		row["Created At"] = obj.created_at ? moment(new Date(obj.created_at)).format("DD-MM-YYYY") : 'NA';
		row["Last Modified By"] = obj.lastModifiedBy || "NA";
		row["Last Modified At"] = obj.last_modified_at ? moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") : 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, user.clientId, 'mybillBook', 'BillBook Report', callback);
};

module.exports.consignorConsigneeReports = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Consignor_Consignee Report');

	let headers = [
		"Name",
		"Address",
		"Customer",
		"Type",
		"Contact Person",
		"Contact Number",
		"Gst No",
		"Latitude",
		"Longitude",
		"Added By",
		"Id",
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Consignor_Consignee  Reports");
	formatColumnHeaders(ws1, 4, headers, [20, 25, 15, 15, 15, 20, 15, 15, 15, 25, 15]);

	aData.forEach(obj => {
		let row = {};
		row["Name"] = obj.name || 'NA';
		row["Address"] = obj.address || 'NA';
		row["Customer"] = obj.customer ? obj.customer.name : 'NA';
		row["Type"] = obj.type || 'NA';
		row["Contact Person"] = obj.contact_person || 'NA';
		row["Contact Number"] = obj.contact_number || 'NA';
		row["Gst No"] = obj.gstin || "NA";
		row["Latitude"] = obj.lat || "NA";
		row["Longitude"] = obj.lng || 'NA';
		row["Added By"] = obj.last_modified_by_name || "NA";
		row["Id"] = obj._id || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'myconsignorConsignee', 'consignorConsignee Report', callback);
};

module.exports.transportRouteReports = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('transportRoute Report');

	let headers = [
		"Source",
		"Source City",
		"Destination",
		"Destination City",
		"Route Name",
		"Route Distance",
		"Id",
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "TransportRoute  Reports");
	formatColumnHeaders(ws1, 4, headers, [25, 15, 25, 15, 35, 15, 15]);

	aData.forEach(obj => {
		let row = {};
		row["Source"] = obj.source && obj.source.name || ((obj.source) ? obj.source.placeName + ', ' + "" + obj.source.placeAddress + "" : 'NA');
		row["Source City"] = obj.source && obj.source.placeName || 'NA';
		row["Destination"] = obj.destination && obj.destination.name || ((obj.destination) ? obj.destination.placeName + ', ' + "" + obj.destination.placeAddress + "" : 'NA');
		row["Destination City"] = obj.destination && obj.destination.placeName || 'NA';
		row["Route Name"] = obj.name || 'NA';
		row["Route Distance"] = obj.route_distance || 'NA';
		row["Id"] = obj._id || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'mytransportRoute', 'transportRoute Report', callback);
};

module.exports.driverReports = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Driver Report');

	let headers = [
		"S.No",
		"Name",
		"Code",
		"Father Name",
		"Address",
		"Contact Number",
		"Religion",
		'Gurantor Name',
		'Remark',
		"DOB",
		"DDC From",
		"DDC To",
		"Passport No",
		"License No",
		"License Authority",
		"License Expiry Date",
		"License Issuing Date",
		"Vehicle Assigned",
		"Updated User",
		"Updated Date",
		"Status",
		"Id",
		"SAP Id"
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Driver  Reports");
	formatColumnHeaders(ws1, 4, headers, [5, 20, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let cnt = 1;
	aData.forEach(obj => {
		let row = {};
		row["S.No"] = (cnt || 0);
		row["Name"] = obj.name || 'NA';
		row["Code"] = obj.employee_code || 'NA';
		row["Father Name"] = obj.father_name || 'NA';
		row["Religion"] = obj.religion || 'NA';
		row["Gurantor Name"] = obj.guarantor_name || 'NA';
		row["Remark"] = obj.remarks || 'NA';
		row["Address"] = obj.permanent_address && ((obj.permanent_address.line1 ? obj.permanent_address.line1 : '') +' '+ (obj.permanent_address.line2 ? obj.permanent_address.line2 : '')) || 'NA';
		row["Contact Number"] = obj.prim_contact_no || 'NA';
		row["DOB"] = obj.dob ? moment(new Date(obj.dob)).format("DD-MM-YYYY") : 'NA';
		row["DDC From"] = obj.ddcFrom ? moment(new Date(obj.ddcFrom)).format("DD-MM-YYYY") : 'NA';
		row["DDC To"] = obj.ddcTo ? moment(new Date(obj.ddcTo)).format("DD-MM-YYYY") : 'NA';
		row["Passport No"] = obj.passportNo || 'NA';
		row["License No"] = obj.license_no || 'NA';
		row["License Authority"] = obj.license_authority || 'NA';
		row["License Expiry Date"] = obj.license_expiry_date ? moment(new Date(obj.license_expiry_date)).format("DD-MM-YYYY") : 'NA';
		row["License Issuing Date"] = obj.license_issuing_date ? moment(new Date(obj.license_issuing_date)).format("DD-MM-YYYY") : 'NA';
		row["Updated User"] = obj.last_modified_by_name || 'NA';
		row["Updated Date"] = obj.last_modified_at ? moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") : 'NA';
		row["Vehicle Assigned"] = obj.vehicle_assigned_reg_name || 'NA';
		row["Status"] = obj.status || "NA";
		row["Id"] = obj._id || "NA";
		row["SAP Id"] = obj.sap_id || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
		cnt++;
	});
	saveFileAndReturnCallback(workbook, clientId, 'myDriver', 'Driver Report', callback);
};

module.exports.vendorReports = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Vendor Report');
	//"Created By",
	//"Address",
	let headers = [
		"Name",
		"Ownership Type",

		"Contact Person",
		"Contact Number",
		"GSTN No",
		"PAN No",
		"Address Proof",
		"Address Proof No",
		"Email",
		"Alternate Email",
		"Account",
		"Account Id",
		"Account type",
		"Opening balance",
		"vId",
		"Created at",
		"Category",
		"Deleted",
		"Pan Verify",
		"TDS Verify",
		"Person",
		"Declaration Date",
		"Status",
		"Verification Date",
		"Verification Validity Date",
		"Financial Year",
		"No Of Vehicles",
		"Prime Contact no",
		"Alternate Contact no1",
		"Alternate Contact no2",
		"HO Address",

		"Last Modified By"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Vendor Reports");
	formatColumnHeaders(ws1, 4, headers, [20, 15, 25, 15, 15, 15, 15, 20, 15, 15, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 15, 15, 20, 20, 15]);

	aData.forEach(obj => {
		let row = {};
		row["Name"] = obj.name || 'NA';
		row["Ownership Type"] = obj.ownershipType || 'NA';
		//row["Address"] = obj.ho_address || "NA"; //obj.permanent_address || 'NA';//---
		row["Contact Person"] = obj.contact_person_name || 'NA';
		row["Contact Number"] = obj.prim_contact_no || 'NA';
		row["GSTN No"] = obj.gstn || 'NA';
		row["PAN No"] = obj.pan_no || 'NA';
		row["Address Proof"] = obj.address_proof_type || 'NA';
		row["Address Proof No"] = obj.address_proof_no || 'NA';
		row["Email"] = obj.email || "NA";
		row["Alternate Email"] = obj.alt_email1 || "NA";
		row["Account"] = obj.account && obj.account[0] && obj.account[0].ref && obj.account[0].ref.name || "NA";
		row["Account Id"] = obj.account && obj.account[0] && obj.account[0].ref && obj.account[0].ref.accountId || "NA";
		row["Account type"] = obj.account && obj.account[0] && obj.account[0].ref && obj.account[0].ref.type && obj.account[0].ref.type.name || "NA";
		row["Opening balance"] = obj.account && obj.account[0] && obj.account[0].ref && obj.account[0].ref.opening_balance || "NA";
		row["vId"] = obj._id || "NA";
		row["Created at"] = obj.created_at || "NA";
		row["Category"] = obj.category || "NA";
		row["Deleted"] = obj.deleted || "NA";
		row["Pan Verify"] = obj.panVerify || "NA";
		row["TDS Verify"] = obj.tdsVerify || "NA";
		row["Person"] = obj.person || "NA";
		row["Declaration Date"] = moment(obj.declaratonDate).format('DD/MM/YYYY') || "NA";
		row["Status"] = obj.statusDate || "NA";
		row["Verification Date"] = moment(obj.verificationDate).format('DD/MM/YYYY') || "NA";
		row["Verification Validity Date"] = moment(obj.vVDate).format('DD/MM/YYYY') || "NA";
		row["Financial Year"] = obj.financialYear || "NA";
		row["No Of Vehicles"] = obj.noOfVehilce || "NA";
		row["Prime Contact no"] = obj.prim_contact_no || "NA";
		row["Alternate Contact no1"] = obj.alt_contact_no1 || "NA";
		row["Alternate Contact no2"] = obj.alt_contact_no2 || "NA";
		row["HO Address"] = obj.ho_address || "NA";
		//row["Created By"] = obj.user && obj.created_by  || "NA";
		row["Last Modified By"] = obj.last_modified_by && obj.last_modified_by.full_name || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'vendor', 'vendor_Report', callback);
};

module.exports.reportRateChart = function (confs = {
	'customer': {visible: true, label: 'Customer'},
	'effectiveDate': {visible: true, label: 'Date'},
	'source': {visible: true, label: 'Source'},
	'destination': {visible: true, label: 'Destination'},
	'materialGroupName': {visible: true, label: 'Material Group'},
	'routeDistance': {visible: true, label: 'KM'},
	'unit': {visible: true, label: 'Unit'},
	'rate': {visible: true, label: 'Rate'},
}, aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Rate Chart');
	let headers = [];
	for (let key in confs) {
		if (confs.hasOwnProperty(key) && key === 'baseRate' && Array.isArray(confs[key])) {
			for (let k = 0; k < confs[key].length; k++) {
				headers.push(confs[key][k].label);
				confs[key][k].fieldValue = `obj.${key}[${k}] && obj.${key}[${k}].rate || 'NA'`;
				confs[key][k].reportLabel = `obj.${key}[${k}] && obj.${key}[${k}].label || 'NA'`;
			}
		} else if (confs.hasOwnProperty(key) && confs[key].visible) {
			headers.push(confs[key].label);
			if (key === 'effectiveDate') {
				confs[key].fieldValue = "moment(new Date(obj.effectiveDate)).format('DD-MM-YYYY') || 'NA'";
			} else {
				confs[key].fieldValue = `obj.${key} || 'NA'`;
			}
		}
	}
	let rowNum = 5;
	formatTitle(ws1, 2, "RateChart  Reports");
	formatColumnHeaders(ws1, 4, headers, Array.from(headers, () => 15));
	aData.forEach(obj => {
		let row = {};
		row["Customer"] = obj.customer.name || 'NA';
		for (let key in confs) {
			if (confs.hasOwnProperty(key) && key === 'baseRate' && Array.isArray(confs[key])) {
				for (let k = 0; k < confs[key].length; k++) {
					row[eval(confs[key][k].reportLabel)] = eval(confs[key][k].fieldValue);
				}
			} else if (confs.hasOwnProperty(key) && confs[key].visible && confs[key].fieldValue) {
				row[confs[key].label] = eval(confs[key].fieldValue);
			}
		}
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'customerRateChart', 'RateChart Report', callback);
};

module.exports.fpaBillDetailed = function (vend, aData, clientId, cb) {
	var wb = new xl.Workbook();
	var headerStyles = wb.createStyle({
		font: {color: '#272727', size: 10, bold: true},
		alignment: {horizontal: 'center', vertical: 'center', wrapText: true},
		fill: {type: 'pattern', patternType: 'solid', fgColor: '#D1E8E2'},
		border: {
			right: {style: 'thin', color: '#000000'}
		},
	});
	var consignstyle = wb.createStyle({
		font: {color: '#404040', size: 12, bold: true, italics: true, underline: true},
	});
	var style = wb.createStyle({
		font: {color: '#000000', size: 12},
	});
	var ws = wb.addWorksheet('FPA Detailed Report');
	// ws.row(1).freeze();
	ws.row(1).setHeight(30);
	var totalF = 0, totalFP = 0;
	for (let x = 0; x < aData.length; x++) {
		totalF += aData[x].totalFreight;
		totalFP += aData[x].totalCommission;
	}
	ws.cell(1, 1, 1, 10, true).string('FREIGHT PAYMENT ADVICE').style(headerStyles);
	ws.cell(2, 1, 2, 5, true).string(`ASSOCIATE - ${vend.name}`).style(headerStyles);
	ws.cell(2, 6, 2, 10, true).string(`FPA Date - ${moment(aData[0].fpaDate).format('DD-MM-YYYY')}`).style(headerStyles);
	ws.cell(3, 1, 3, 5, true).string(`Total Freight - ${totalF.toString()}`).style(headerStyles);
	ws.cell(3, 6, 3, 10, true).string(`Total FPA - ${totalFP.toString()}`).style(headerStyles);
	for (var i = 1; i <= 10; i++) {
		ws.column(i).setWidth(15);
	}
	var b = 4;
	ws.cell(b, 1).string('GR NO.').style(headerStyles);
	ws.cell(b, 2).string('GR DATE').style(headerStyles);
	ws.cell(b, 3).string('GR STATUS').style(headerStyles);
	ws.cell(b, 4).string('VEHICLE NO.').style(headerStyles);
	ws.cell(b, 5).string('CUSTOMER').style(headerStyles);
	ws.cell(b, 6).string('CONSIGNOR').style(headerStyles);
	ws.cell(b, 7).string('CONSIGNEE').style(headerStyles);
	ws.cell(b, 8).string('FREIGHT').style(headerStyles);
	ws.cell(b, 9).string('FPA PERCENT').style(headerStyles);
	ws.cell(b, 10).string('FP AMOUNT').style(headerStyles);

	var c = b + 2;
	for (let i = 0; i < aData.length; i++) {
		ws.cell(c, 1).string(aData[i].vehicle_no).style(consignstyle);
		ws.cell(c, 8).number(aData[i].totalFreight).style(consignstyle);
		ws.cell(c, 10).number(aData[i].totalCommission).style(consignstyle);
		for (let j = 0; j < aData[i].docs.length; j++) {
			let jdoc = aData[i].docs[j];
			ws.cell(c + 1, 1).string(jdoc.gr.grNumber ? jdoc.gr.grNumber : 'NA').style(style);
			ws.cell(c + 1, 2).string(jdoc.gr.grDate ? moment(jdoc.gr.grDate).format('DD-MM-YYYY') : 'NA').style(style);
			ws.cell(c + 1, 3).string(jdoc.gr.status || 'NA').style(style);
			ws.cell(c + 1, 4).string(jdoc.gr.vehicle && jdoc.gr.vehicle.vehicle_reg_no || 'NA').style(style);
			ws.cell(c + 1, 5).string(jdoc.gr.customer && jdoc.gr.customer.name || 'NA').style(style);
			ws.cell(c + 1, 6).string(jdoc.gr.consignor ? jdoc.gr.consignor.name : 'NA').style(style);
			ws.cell(c + 1, 7).string(jdoc.gr.consignee ? jdoc.gr.consignee.name : 'NA').style(style);
			ws.cell(c + 1, 8).number(jdoc.gr.totalFreight || 0).style(style);
			ws.cell(c + 1, 9).number(jdoc.comission_percent || 0).style(style);
			ws.cell(c + 1, 10).number(jdoc.total || 0).style(style);
			c += 1;
		}
		c += 2;
	}

	var a = `/reports/${clientId}/FPA_Detailed_${moment(new Date()).format("DD-MM-YYYY")}.xlsx`;
	var path = `files${a}`;
	wb.write(path, function (err, stats) {
		if (err) {
			throw err;
		}
		return cb('http://' + commonUtil.getConfig('download_host') + ':' +
			commonUtil.getConfig('download_port') + a);
	});

};

module.exports.fuelStationReports = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Fuel Station');

	let headers = [
		"Effective Date",
		"Fuel Type",
		"Fuel Price",
		"Id",
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "RateChart  Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15]);

	aData.forEach(obj => {

		let row = {};
		row["Effective Date"] = moment(new Date(obj.effective_date)).format("DD-MM-YYYY") || 'NA';
		row["Fuel Type"] = obj.fuel_type || 'NA';
		row["Fuel Price"] = obj.fuel_price || 'NA';
		row["Id"] = obj._id || "NA";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'fuelStationReports', 'FuelStation Report', callback);
};

module.exports.debitNoteReportDownload = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Debit Note');

	let headers = [
		"Sl. No.",
		"DEBIT NO.",
		"PURCHASE BILL REF NO.",
		"VENDOR NAME",
		"BILL DATE",
		"AMOUNT",
		"CREATED BY",
		"CREATED AT",
		"APPROVED",
	];

	let rowNum = 2;
	formatColumnHeaders(ws1, 1, headers, [7, 12, 22, 15, 12, 13, 13, 13, 13]);
	let index = 0;
	aData.forEach((obj, index) => {

		let row = {};
		row["Sl. No."] = index + 1;
		row["DEBIT NO."] = obj.debitNo || 'NA';
		row["PURCHASE BILL REF NO."] = obj.purBillRefNo || 'NA';
		row["VENDOR NAME"] =  obj.vendorName || 'NA';
		row["BILL DATE"] = moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
		row["AMOUNT"] = obj.totalAmount || 'NA';
		row["CREATED BY"] = obj.createdBy || 'NA';
		row["CREATED AT"] = moment(new Date(obj.created_at)).format("DD-MM-YYYY") || "NA";
		row["APPROVED"] = obj.voucher ? 'Yes' : 'No' || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'DebitNote', 'DebitNoteReport', callback);
};

module.exports.eWayBillReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Eway Bill');
	let headers = [
		"Doc No",
		"Doc Type",
		"Status",
		"Doc Date",
		"Seller Name",
		"Seller Addr",
		"Seller State Code",
		"Seller Gst",
		"Seller Place",
		"Purchaser Name",
		"Purchaser Addr",
		"Purchaser State Code",
		"Purchaser Gst",
		"Purchaser Place",
		"Name",
		"Description",
		"Qty",
		"HSN",
		"Qty Unit",
		"Amount",
		"LR No",
		"LR Date",
		"Vehicle No",
		"EWay Date",
		"EWay Num",
		"EWay Expiry",
	];
	formatColumnHeaders(ws1, 1, headers,
		[15, 12, 12, 22, 35, 35, 12, 22, 25, 25, 25, 15, 22, 25, 20, 20, 10, 10, 10, 15, 20, 15, 22,22,15,22]);
	let row = 2;
	aData.forEach((d, i) => {
		let r = {};
		r['Doc No'] = d.docNo || "NA";
		r["Doc Type"] = d.docType || "NA";
		r["Status"] = d && d.status || "NA";
		r["Doc Date"] =  d && d.docDate ? moment(new Date(d.docDate)).format("DD-MM-YYYY") : 'NA';
		r["Seller Name"] = d.fromTrdName || "NA";
		r['Seller Addr'] = d.fromAddr1 || "NA";
		r["Seller State Code"] = d.fromStateCode || "NA";
		r["Seller Gst"] = d.fromGstin || "NA";
		r["Seller Place"] = d.fromPlace|| "NA";
		r['Purchaser Name'] = d.toTrdName || "NA";
		r["Purchaser Addr"] = d.toAddr1 || "NA";
		r["Purchaser State Code"] = d.toStateCode || "NA";
		r["Purchaser Gst"] = d.toGstin || "NA";
		r["Purchaser Place"] = d.toPlace || "NA";
		r["Name"] = d.itemList.productName || "NA";
		r["Description"] = d.itemList.productDesc || "NA";
		r['Qty'] = d.itemList.quantity || "NA";
		r["HSN"] = d.itemList.hsnCode || "NA";
		r["Qty Unit"] = d.itemList.qtyUnit || "NA";
		r["Amount"] = d.itemList.taxableAmount || "NA";
		r["Vehicle No"] = d && d.vehicleNo || "NA";
		r["LR No"] = d && d.transDocNo || "NA";
		r["LR Date"] = d && d.transDocDate  ? moment(d.transDocDate, "DD/MM/YYYY").format("DD-MM-YYYY") : 'NA';
		r["EWay Date"] = d && d.ewbDate  ? moment(new Date(d.ewbDate)).format("DD-MM-YYYY") : 'NA';
		r["EWay Num"] = d && d.ewbNo || "NA";
		r["EWay Expiry"] = d && d.validUpto ? moment(new Date(d.validUpto)).format("DD-MM-YYYY") : 'NA';
		addWorkbookRow(r, ws1, headers, (row++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'EWayBill', 'EWayBillReport', callback);
};

module.exports.eWayBillReport2 = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Eway Bill');
	let headers = [
		"Eway Bill Date",
		"Ewaybill No",
		"Invoice No",
		"Invoice Value",
		"LR No",
		"Vehicle No",
		"Ewaybill Expiry Date",
		"Ewaybill Generated By",
		"Consignor Name",
		"Consignor Address",
		"Consignor City",
		"Consignor Location PIN Code",
		"Consignor GST No.",
		"Consignee Name",
		"Consignee Address",
		"Consignee City",
		"Consignee City Pin Code",
		"Consignee GST No.",
		"Ship to Name",
		"Ship to Address",
		"Ship to GST No.",
		"Ship to Location (city)",
		"Ship To Location PIN"
	];
	formatColumnHeaders(ws1, 1, headers,
		[17,17,19,17,15,17,20,22,30,40,17,25,22,30,40,17,25,22,30,40,22,22,22]);
	let row = 2;
	aData.forEach((d, i) => {
		let r = {};
		r["Eway Bill Date"] = d && d.ewbDate  ? moment(new Date(d.ewbDate)).format("DD-MM-YYYY") : 'NA';
		r["Ewaybill No"] = d && d.ewbNo || "NA";
		r['Invoice No'] = d.docNo || "NA";
		r["Invoice Value"] = d.totInvValue || 0;
		r["LR No"] = d && d.transDocNo || "NA";
		r["Vehicle No"] = d && d.vehicleNo || "NA";
		r["Ewaybill Expiry Date"] = d && d.validUpto ? moment(new Date(d.validUpto)).format("DD-MM-YYYY") : 'NA';
		r["Ewaybill Generated By"] = d.genGstin || "NA";
		r["Consignor Name"] = d.fromTrdName || "NA";
		r['Consignor Address'] = d.fromAddr1 || "NA";
		r["Consignor City"] = d && d.fromPlace || "NA";
		r["Consignor Location PIN Code"] = d.fromPincode || "NA";
		r["Consignor GST No."] = d.fromGstin || "NA";
		r["Consignee Name"] = d.toTrdName || "NA";
		r['Consignee Address'] = d.toAddr1 || "NA";
		r["Consignee City"] = d && d.toPlace || "NA";
		r["Consignee City Pin Code"] = d.toPincode || "NA";
		r["Consignee GST No."] = d.toGstin || "NA";
		r['Ship to Name'] = d.toTrdName || "NA";
		r["Ship to Address"] = d.toAddr1 || "NA";
		r["Ship to GST No."] = d.toGstin || "NA";
		r["Ship to Location (city)"] = d.toPlace || "NA";
		r["Ship To Location PIN"] = d.toPincode || "NA";
		addWorkbookRow(r, ws1, headers, (row++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'EWayBill', 'EWayBillReport2', callback);
};

module.exports.creditNoteReportDownload = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Credit Note');

	let headers = [
		"Date",
		"Credit Number",
		"Bill Number",
		"Billing Party",
		"Category",
		"Amount",
		"Created By",
		"Created At",
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Credit Note  Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 25, 25]);

	aData.forEach(obj => {

		let row = {};
		row["Credit Number"] = obj.creditNo || 'NA';
		row["Bill Number"] = obj.billNo || 'NA';
		row["Date"] = moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
		row["Amount"] = obj.amount || 'NA';
		row["Category"] = obj.category || 'NA';
		row["Billing Party"] = obj.billingParty && obj.billingParty.name || 'NA';
		row["Created By"] = obj.createdBy || 'NA';
		row["Created At"] = moment(new Date(obj.created_at)).format("DD-MM-YYYY") || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'CreditNote', 'CreditNoteReport', callback);
};

module.exports.crDeductionReport = function (aData, to, from, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Credit Note Deduction');

	let headers = [
		"Credit Number",
		"Bill Number",
		"GR Number",
		"Date",
		"Deduction Type",
		"Deduction Amount",
		"Remark"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "Credit Note Deduction Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 25, 25]);

	aData.forEach(obj => {

		let row = {};
		row["Credit Number"] = obj.creditNo || 'NA';
		row["Bill Number"] = obj.billNo || 'NA';
		row["GR Number"] = obj.grs.grNumber || 'NA';
		row["Date"] = moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
		row["Deduction Type"] = obj.grs.deductionType || 'NA';
		row["Deduction Amount"] = obj.grs.amount || 'NA';
		row["Remark"] = obj.grs.remark || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'CreditNote Deduction', 'CreditNoteDeductionReport', callback);
};

// module.exports.mrDeductionReport = function (aData,to, from, clientId, callback) {
//
// 	let workbook = new Excel.Workbook();
// 	let ws1 = workbook.addWorksheet('Money Receipt Deduction');
// 	let options = {
// 		fill: columnFill,
// 		font: {bold: true},
// 		alignment: {vertical: 'middle', horizontal: 'left'},
// 		border: {
// 			top: {style: 'thin'},
// 			left: {style: 'thin'},
// 			bottom: {style: 'thin'},
// 			right: {style: 'thin'}
// 		}
// 	};
// 	let fromDate = moment(new Date(from)).format("DD-MM-YYYY");
// 	let toDate = moment(new Date(to)).format("DD-MM-YYYY");
// 	headerTopMerged(ws1, 'A2', 'I2', 'From  ' +fromDate + '  to  ' + toDate, options);
//
// 	let headers = [
// 		"Money Receipt Number",
// 		"Bill Number",
// 		"GR Number",
// 		"Date",
// 		"Deduction Type",
// 		"Deduction Amount",
// 		"BillingParty Name",
// 		"Customer Name",
// 		"Remark"
// 	];
//
// 	let rowNum = 5;
// 	formatTitle(ws1, 9, "Money Receipt Deduction Reports");
// 	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 19, 22, 22, 25]);
//
// 	aData.forEach(obj => {
//
// 		let row = {};
// 		row["Money Receipt Number"] = obj.mrNo || 'NA';
// 		row["Bill Number"] = obj.billNo || 'NA';
// 		row["GR Number"] = obj.grNo || 'NA';
// 		row["Date"] = moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
// 		row["Deduction Type"] = obj.deductionType || 'NA';
// 		row["Deduction Amount"] = obj.amount || 'NA';
// 		row["BillingParty Name"] = obj.bpNam || 'NA';
// 		row["Customer Name"] = obj.customerName || 'NA';
// 		row["Remark"] = obj.remark || "NA";
// 		addWorkbookRow(row, ws1, headers, (rowNum++));
// 	});
//
// 	saveFileAndReturnCallback(workbook, clientId, 'Money Receipt Deduction', 'Money Receipt Deduction Report', callback);
// };

module.exports.mrDeductionReport = function (aData, to, from, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Money Receipt and Credit Note Deduction');
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, 'A2', 'G2', 'From   ' + toDate + '   	To  ' + fromDate, false, true);

	let headers = [
		"Customer",
		"Consignee",
		"Consignor",
		"Advice Date",
		"Advice No",
		"CN Date",
		"CN no",
		"LR Total Freight",
		"Bill Date",
		"Bill No",
		"Credit Note No.",
		"Credit Note Date",
		"Credit Note Deduction Type",
		"Credit Note Deduction Amount",
		"Advice Party Name",
		"CN Source Route Name",
		"CN Destination Route Name",
		"Crossing Vehicle No",
		"Charged Weight",
		"Crossing Vehicle Owner",
		"CN VEHICLE NO",
		"Owner name",
		"Invoice No",
		"Party Ref.(1)",
		"Party Ref.(2)",
		"Party Ref.(3)",
		"Party Ref.(4)",
		"Party Ref.(5)",
		"Nature of Deduction",
		"Deduction Amount",
		"Reaching Date",
		"Unloading Date",
		"Detention",
		"CN Remark",
		"Ded DOE",
		"Driver name",
		"LD Cal",
		"DTN Cal",
		"HM NO",
		"HM Amount",
		"HMBasicHireChrg",
		"HM Paid Amount",
		"Net Balance",
		"HM Penalty",
		"HM Claim",
		"HM Other Deduction",
		"Broker Name"
	];

	let rowNum = 5;
	formatTitle(ws1, 7, "Money Receipt Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);

	// aData.forEach(obj => {
	for (let i = 0; i < aData.length; i++) {
		let obj = aData[i];

		let row = {};
		row["Customer"] = obj.customer || 'NA';
		row["Consignee"] = obj.consignee || 'NA';
		row["Consignor"] = obj.consignor || 'NA';
		row["Advice Date"] = moment(obj.adviceDate).format("DD-MM-YYYY") || 'NA';
		row["Advice No"] = obj.adviceNo || 'NA';
		row["CN Date"] = moment(obj.cnDate).format("DD-MM-YYYY") || 'NA';
		row["CN no"] = obj.cnNo || 'NA';
		row["LR Total Freight"] = obj.LR_Total_Freight || '0';
		row["Bill Date"] = moment(obj.billDate).format("DD-MM-YYYY") || 'NA';
		row["Bill No"] = obj.BillNo || 'NA';
		row["Credit Note No."] = obj.CreditNoteNO || 'NA';
		row["Credit Note Date"] = moment(obj.CreditNoteDate).format("DD-MM-YYYY") || 'NA';
		row["Credit Note Deduction Type"] = obj.CreditNoteDedType || 'NA';
		row["Credit Note Deduction Amount"] = obj.CreditNoteDedAmt || '0';
		row["Advice Party Name"] = obj.AdvicePartyName || 'NA';
		row["CN Source Route Name"] = obj.CN_Route_Source_Name || 'NA';
		row["CN Destination Route Name"] = obj.CN_Route_Destination_Name || 'NA';
		row["Crossing Vehicle No"] = obj.CrossingVehicleNo || 'NA';
		row["Charged Weight"] = obj.ChargedWeight || '0';
		row["Crossing Vehicle Owner"] = obj.CrossingVehicleOwner || 'NA';
		row["CN VEHICLE NO"] = obj.CN_VEHICLE_NO || 'NA';
		row["Owner name"] = obj.OwnerName || 'NA';
		row["Invoice No"] = obj.InvoiceNo || 'NA';
		row["Party Ref.(1)"] = obj.PartyRef1 || 'NA';
		row["Party Ref.(2)"] = obj.PartyRef2 || 'NA';
		row["Party Ref.(3)"] = obj.PartyRef3 || 'NA';
		row["Party Ref.(4)"] = obj.PartyRef4 || 'NA';
		row["Party Ref.(5)"] = obj.PartyRef5 || 'NA';
		row["Nature of Deduction"] = obj.NatureOfDeduction || 'NA';
		row["Deduction Amount"] = obj.DeductionAmount || '0';
		row["Reaching Date"] = moment(obj.ReachingDate).format("DD-MM-YYYY") || 'NA';
		row["Unloading Date"] = moment(obj.UnloadingDate).format("DD-MM-YYYY") || 'NA';
		row["Detention"] = (obj.Detention1 + obj.Detention2) || '0';
		row["CN Remark"] = obj.CN_Remark || 'NA';
		row["Ded DOE"] = moment(obj.DedDOE).format("DD-MM-YYYY") || 'NA';
		row["Driver name"] = obj.DriverName || 'NA';
		row["LD Cal"] = dateUtil.calDays(obj.LD_Cal1, obj.LD_Cal2) || '0';
		row["DTN Cal"] = dateUtil.calDays(obj.DTN_Cal1, obj.LD_Cal2) || '0';
		row["HM NO"] = obj.HM_NO || 'NA';
		row["HM Amount"] = obj.HM_Amount || '0';
		row["HMBasicHireChrg"] = obj.HMBasicHireChrg || '0';
		row["HM Paid Amount"] = obj.HM_PaidAmount1 || '0';
		row["Net Balance"] = obj.NetBalance || '0';
		row["HM Penalty"] = obj.HM_Penalty || '0';
		row["HM Claim"] = obj.HM_Claim || '0';
		row["HM Other Deduction"] = obj.HM_OtherDeduction || '0';
		row["Broker Name"] = obj.BrokerName || 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	saveFileAndReturnCallback(workbook, clientId, 'Money Receipt and Credit Note Deduction', 'Money Receipt and Credit Note Deduction Report', callback);
};

module.exports.mrBillingPartyWiseDeductionReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('BillingParty Wise Deductions Report');
	formatTitle(ws, 13, 'BillingParty Wise Deductions Report');
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws, 'A2', 'M2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);

	let headers = ['BillingParty', 'Late Delivery', 'Damages', 'Shortage', 'Claim', 'Non-Placement', 'Parking', 'Loading/Unloading', 'ESI/PF', 'GPS Recovery', 'Insurance', 'Rate Difference', 'Misc Recovery'];
	let rowNum = 5;
	formatColumnHeaders(ws, 4, headers, [30, 13, 10, 10, 8, 15, 9, 18, 9, 14, 10, 16, 15]);


	// aData.forEach(obj => {
	for (let obj of aData) {
		let row = {};
		row["BillingParty"] = obj._id || 'NA';

		obj.data.forEach(o => {

			row[o._id.type] = o.amount;

			addWorkbookRow(row, ws, headers, (rowNum));
		});
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, 'BillingParty Wise Deductions Report', 'BillingParty Wise Deductions Report', callback);
};

module.exports.mrMonthlyDeductionReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Billing Party Monthly Deduction Report');
	formatTitle(ws, 6, 'Billing Party Monthly Deduction Report');
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws, 'A2', 'F2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);
	let aHeader = ['Billing Party'];
	let rowCounter = 4;
	prepareHeadersForMonth(aHeader, from, to);
	aHeader.push('Total');

	formatColumnHeaders(ws, 3, aHeader, [...Array(aHeader.length).fill(15), 15]);
	let arrNetTotal = {};
	aData.forEach((oData) => {
		ws.getCell(getNextAlphabet(0) + rowCounter).value = oData.name || '';
		let total = 0,
			index = 2;

		while (index < aHeader.length - 1) {
			let sMonth = aHeader[index];
			total += (oData[sMonth] && oData[sMonth].amount || 0);
			arrNetTotal[sMonth] = arrNetTotal[sMonth] || 0;
			arrNetTotal[sMonth] += (oData[sMonth] && oData[sMonth].amount || 0);
			ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((oData[sMonth] && oData[sMonth].amount || 0), 0);
			index++;
		}

		rowCounter++;
		ws.getCell(getNextAlphabet(index) + (rowCounter - 1)).value = helperFn.toFixed(total, 0);

	});

	mergeCells(ws, rowCounter, 1, 'Net Total');
	let totalNetTotal = 0, index = 1;
	for (index = 1; index < aHeader.length - 1; index++) {
		ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((arrNetTotal[aHeader[index]]), 0);
		totalNetTotal += (arrNetTotal[aHeader[index]] || 0);
	}
	ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed(totalNetTotal, 0);

	saveFileAndReturnCallback(workbook, clientId, 'Billing Party Monthly Deduction Report', 'Billing Party Monthly Deduction Report', callback);

	function getNextAlphabet(range) {
		return String.fromCharCode('A'.charCodeAt() + range);
	}
};

module.exports.cn_dr_DeductionReport = function (aData, to, from, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Money Receipt and Credit Note Deduction');

	let headers = [
		"Bill Number",
		"GR Number",
		"Money Receipt Number",
		"Credit Note Number",
		"Date",
		"Deduction Type",
		"Deduction Amount",
		"Remark"
	];

	let rowNum = 5;
	formatTitle(ws1, 7, "Money Receipt and Credit Note Deduction Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 20, 25, 25]);

	// aData.forEach(obj => {
	skipData : for (let i = 0; i < aData.length; i++) {
		let obj = aData[i];

		if (obj.cNoteRef && obj.mrRef) {
			continue skipData;
		}
		let row = {};
		row["Bill Number"] = obj.billNo || 'NA';
		row["GR Number"] = obj.grNumber || 'NA';
		row["Money Receipt Number"] = obj.mrNo || 'NA';
		row["Credit Note Number"] = obj.creditNo || 'NA';
		row["Date"] = moment(new Date(obj.billDate)).format("DD-MM-YYYY") || 'NA';
		row["Deduction Type"] = obj.deductionType || 'NA';
		row["Deduction Amount"] = obj.amount || 'NA';
		row["Remark"] = obj.remarks || "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	saveFileAndReturnCallback(workbook, clientId, 'Money Receipt and Credit Note Deduction', 'MR and Credit Note Deduction', callback);
};

module.exports.userReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('User Excel');

	let headers = [
		"Full Name",
		"Father Name",
		"Id Type",
		"UserId",
		"Role",
		"Preferred Language",
		"Created By",
		"Id"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "UserExcel  Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 25]);

	aData.forEach(obj => {

		let row = {};
		row["Full Name"] = obj.full_name || 'NA';
		row["Father Name"] = obj.father_name || 'NA';
		row["Id Type"] = obj.id_type || 'NA';
		row["UserId"] = obj.userId || 'NA';
		row["Role"] = (obj.access && obj.access.name) || 'NA';
		row["Preferred Language"] = obj.preferred_language || 'NA';
		row["Created By"] = obj.created_by_name || "NA";
		row["Id"] = obj._id || "NA";


		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'user', 'User Report', callback);
};

module.exports.branchReports = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Branch Excel');

	let headers = [
		"Branch Name",
		"Branch Head Name",
		"Code",
		"employee code",
		"Date",
		"contact no",
		"address",
		"email",
		"Created By",
		"Id"
	];

	let rowNum = 5;
	formatTitle(ws1, 2, "UserExcel  Reports");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 30, 15]);

	aData.forEach(obj => {

		let row = {};
		row["Branch Name"] = obj.name || 'NA';
		row["Branch Head Name"] = obj.branch_head_name || 'NA';
		row["Code"] = obj.code || 'NA';
		row["employee code"] = obj.branch_head_employee_code || 'NA';
		row["Date"] = moment(new Date(obj.branch_open_date)).format("DD-MM-YYYY") || 'NA';
		row["contact no"] = obj.prim_contact_no || 'NA';
		row["address"] = obj.address && obj.address.line1 || 'NA';
		row["email"] = obj.prim_email || 'NA';
		row["Created By"] = obj.created_by_name || "NA";
		row["Id"] = obj._id || "NA";


		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'branch', 'Branch Report', callback);
};

module.exports.tripDetailsReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Details Report');

	let headers = [
		"Sl. No.",
		"CTrip No.",
		"Trip No.",
		"Vehicle No.",
		"Driver Name",
		"Driver Mob",
		"Passport No.",
		"Route",
		"Trip Start Date",
		"Trip Start Time",
		"Trip End Date",
		"Trip End Time",
		"Count Of Overspeeding",
		"Count Of Rapid Acceleration",
		"Count Of Rapid Deceleration/ Harsh Braking",
		"Count Of Continuous Driving Instances",
		"Count Of Night Driving Instances",
		"Count Of Max Driving Instances",
		"Action Taken To Prevent The Recurrence Of Deviations",
		"Remarks",
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Trip Details Report");
	formatColumnHeaders(ws1, 4, headers, [5, 10, 10, 12, 25, 20, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	aData.forEach((obj, index) => {
		let row = {};
		row["Sl. No."] = index + 1;
		row["CTrip No."] = obj.ctrip || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["Driver Name"] = obj.driver && obj.driver.name || 'NA';
		row["Driver Mob"] = obj.driver && obj.driver.prim_contact_no || 'NA';
		row["Passport No."] = obj.driver && obj.driver.passportNo || 'NA';
		row["Route"] = obj.route && obj.route.name || 'NA';
		row["Trip Start Date"] = obj.startDate ? moment(new Date(obj.startDate)).format("DD-MM-YYYY") : 'NA';
		row["Trip Start Time"] = obj.startDate ? moment(new Date(obj.startDate)).format("h:mma") : 'NA';
		row["Trip End Date"] = obj.endDate ? moment(new Date(obj.endDate)).format("DD-MM-YYYY") : 'NA';
		row["Trip End Time"] = obj.endDate ? moment(new Date(obj.endDate)).format("h:mma") : 'NA';
		row["Action Taken To Prevent The Recurrence Of Deviations"] = obj.actionCount || "NA";
		row["Remarks"] = obj.remarks || "NA";

		for (let j = 0; j < obj.alertData.length; j++) {
			let key = obj.alertData[j].code;
			switch (key) {
				case 'over_speed':
					row["Count Of Overspeeding"] = obj.alertData[j].count || '0';
					break;
				case 'ha':
					row["Count Of Rapid Acceleration"] = obj.alertData[j].count || '0';
					break;
				case 'hb':
					row["Count Of Rapid Deceleration/ Harsh Braking"] = obj.alertData[j].count || '0';
					break;
				case 'fw':
					row["Count of Continuous driving instances"] = obj.alertData[j].count || '0';
					break;
				case 'nd':
					row["Count of  Night driving instances"] = obj.alertData[j].count || '0';
					break;
				case 'Tempering':
					row["Count of  Max driving instances"] = obj.alertData[j].count || '0';
					break;
			}
		}

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'tripDetails', 'Trip Details Report', callback);
};

module.exports.oderDetailsReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Oder Details Report');

	let headers = [
		"Sl. No.",
		"Oder No.",
		"Trip No.",
		"Vehicle No.",
		"Driver Name",
		"Driver Mob",
		"Passport No.",
		"Route",
		"Status",
		"Trip Start Date",
		"Trip Start Time",
		"Trip End Date",
		"Trip End Time",
		"Last Modified",
		"Remarks",
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Oder Details Report");
	formatColumnHeaders(ws1, 4, headers, [5, 10, 10, 12, 25, 20, 20, 12, 12, 12, 15, 15, 15, 15, 15, 15, 15, 15]);

	aData.forEach((obj, index) => {
		let row = {};
		row["Sl. No."] = index + 1;
		row["Oder No."] = obj.corder || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["Driver Name"] = obj.driver && obj.driver.name || 'NA';
		row["Driver Mob"] = obj.driver && obj.driver.prim_contact_no || 'NA';
		row["Passport No."] = obj.driver && obj.driver.passportNo || 'NA';
		row["Route"] = obj.route && obj.route.name || 'NA';
		row["Status"] = obj.status || 'NA';
		row["Trip Start Date"] = obj.startDate ? moment(new Date(obj.startDate)).format("DD-MM-YYYY") : 'NA';
		row["Trip Start Time"] = obj.startDate ? moment(new Date(obj.startDate)).format("h:mma") : 'NA';
		row["Trip End Date"] = obj.endDate ? moment(new Date(obj.endDate)).format("DD-MM-YYYY") : 'NA';
		row["Trip End Time"] = obj.endDate ? moment(new Date(obj.endDate)).format("h:mma") : 'NA';
		row["Last Modified"] = obj.last_modified_at ? moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") : 'NA';
		row["Remarks"] = obj.remarks || "NA";


		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'oderDetails', 'Oder Details Report', callback);
};

module.exports.duesReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Dues Report');

	let headers = [
		"Dues Type",
		"vehicle No",
		"Ref No",
		"Date",
		"From",
		"To",
		"CR Acc",
		"DR Acc",
		"OD Amount",
		"Processing Amount",
		"IGST",
		"CGST",
		"SGST",
		"Total Amount",
		"Certificate No",
		"Place Name",
		"Tax Type",
		"Invoice No",
		"Remark",
		"Created At",
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Dues  Report");
	formatColumnHeaders(ws1, 4, headers, [20, 15, 15, 15, 15, 15, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	aData.forEach(veh => {
		veh.aVehCollection.forEach(obj => {
			let row = {};
			row["Dues Type"] = veh.duesType || 'NA';
			row["vehicle No"] = obj.veh_no || 'NA';
			row["Ref No"] = veh.refNo || 'NA';
			row["Date"] = veh.date && moment(new Date(veh.date)).format("DD-MM-YYYY") || 'NA';
			row["From"] = obj.frmdt && moment(new Date(obj.frmdt)).format("DD-MM-YYYY") || 'NA';
			row["To"] = obj.todt && moment(new Date(obj.todt)).format("DD-MM-YYYY") || 'NA';
			row["CR Acc"] = veh.from_account && veh.from_account.ledger_name || veh.from_account.name || 'NA';
			row["DR Acc"] = veh.to_account && veh.to_account.ledger_name || veh.to_account.name || 'NA';
			row["OD Amount"] = (obj.amount || 0);
			row["Processing Amount"] = obj.proCharge || 0;
			row["IGST"] = (obj.iGST || 0);
			row["CGST"] = (obj.cGST || 0);
			row["SGST"] = (obj.sGST || 0);
			row["Total Amount"] = obj.total || 0;
			row["Certificate No"] = veh.crtficNo || "NA";
			row["Place Name"] = veh.plcnm || "NA";
			row["Tax Type"] = veh.txtyp || "NA";
			row["Invoice No"] = veh.invoiceNo || "NA";
			row["Remark"] = veh.rmk || 'NA';
			row["Created At"] = veh.created_at || "NA";

			addWorkbookRow(row, ws1, headers, (rowNum++));
		});
	});

	saveFileAndReturnCallback(workbook, clientId, 'dues', 'Dues Report', callback);
};

module.exports.accidentVehicleReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Accident vehicle Report');
	let headers = [
		"Vehicle No",
		"Accident Date",
		"Place",
		"Police FIR",
		"Spot Survey Name",
		"Spot Survey No",
		"Policy No",
		"Policy Type",
		"Claim No",
		"Final Survey Date",
		"Surveyed Name",
		"Estimated Cost",
		"Reinspection Date",
		"WorkShop Name",
		"Address",
		"Amount",
		"Cheque No",
		"Date",
		"Driver Name",
		"Driver Licence Number"
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Accident Vehicle  Report");
	formatColumnHeaders(ws1, 4, headers, [18, 15, 15, 15, 20, 15, 25, 25, 15, 18, 15, 15, 20, 20, 15, 15, 15, 15, 15, 24]);

	aData.forEach((d, i) => {
		let row = {};
		row["Vehicle No"] = (d.vehicle && d.vehicle[0] && d.vehicle[0].aVehCollection && d.vehicle[0].aVehCollection[0] && d.vehicle[0].aVehCollection[0].veh_no) || 'NA';
		row["Place"] = d.place || 'NA';
		row["Police FIR"] = d.policeFIR || 'NA';
		row["Accident Date"] = d.date && moment(new Date(d.date)).format("DD-MM-YYYY") || 'NA';
		row["Spot Survey Name"] = d.spotSrvyName || 'NA';
		row["Spot Survey No"] = d.spotSrvyNo || 'NA';
		row["Policy No"] = d.plcyNo || 'NA';
		row["Policy Type"] = d.plcytyp || 'NA';
		row["Claim No"] = d.claimNo || 'NA';
		row["Final Survey Date"] = d.finalSrvyDate && moment(new Date(d.finalSrvyDate)).format("DD-MM-YYYY") || 'NA';
		row["Surveyed Name"] = d.finalSrvyName || 'NA';
		row["Estimated Cost"] = (d.estCost || 0);
		row["Reinspection Date"] = d.reinspectionDate && moment(new Date(d.reinspectionDate)).format("DD-MM-YYYY") || 'NA';
		row["WorkShop Name"] = d.workshopName || "NA";
		row["Address"] = d.address || "NA";
		row["Amount"] = (d.finalPayment.amount || 0);
		row["Cheque No"] = d.finalPayment.chequeNO || "NA";
		row["Date"] = d.finalPayment.date && moment(new Date(d.finalPayment.date)).format("DD-MM-YYYY") || 'NA';
		row["Driver Name"] = d.driverName || "NA";
		row["Driver Licence Number"] = d.driverLicenceNumber || "NA";

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'accidentVehicle', 'Accident_Vehicle', callback);
};

module.exports.driverCounsellingReport = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Driver Counselling Report');
	let headers = [
		"Vehicle No",
		"Date",
		"Driver Code",
		"Total Advance",
		"Advance Km",
		"Total Expense",
		"Expense Km",
		"Total Km",
		"Trip Bal",
		"Avg Run",
		"Driver Bal Copy",
		"Driver Bal System",
		"Fleet",
		"Remark"
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Driver Counselling  Report");
	formatColumnHeaders(ws1, 4, headers, [18, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 25, 25]);

	aData.forEach((d, i) => {
		let row = {};
		row["Vehicle No"] = (d.vehicle && d.vehicle[0] && d.vehicle[0].vehicle_reg_no) || 'NA';
		row["Date"] = d.date && moment(new Date(d.date)).format("DD-MM-YYYY") || 'NA';
		row["Driver Code"] = (d.driverCode && d.driverCode[0] && d.driverCode[0].employee_code) || 'NA';
		row["Avg Run"] = d.avgRun || 'NA';
		row["Total Advance"] = d.totalAdv || 'NA';
		row["Advance Km"] = d.advKm || 'NA';
		row["Total Expense"] = d.totalExpense || 'NA';
		row["Expense Km"] = d.expKm || 'NA';
		row["Total Km"] = d.totalKm || 'NA';
		row["Trip Bal"] = d.tripBal || 'NA';
		row["Driver Bal Copy"] = d.driverBalCopy || 'NA';
		row["Driver Bal System"] = d.driverBalSystem || 'NA';
		row["Fleet"] = d.fleet || 'NA';
		row["Remark"] = d.remark || 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'driverCounselling', 'Driver_Counselling', callback);
};

module.exports.duesInsuranceReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Insurance Report');

	let headers = [
		"Dues Type",
		"vehicle No",
		"Ref No",
		"Date",
		"From",
		"To",
		"CR Acc",
		"DR Acc",
		"OD Amount",
		"3rd Party Amount",
		"Prepaid Amount",
		"IGST",
		"CGST",
		"SGST",
		"Total Amount",
		"Policy No",
		"Cheque No",
		"Insurance Company",
		"Insurance category",
		"Insurance Type",
		"Policy Type",
		"Remark",
		"Created At",

	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Insurance Report");
	formatColumnHeaders(ws1, 4, headers, [10, 15, 15, 15, 15, 15, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	aData.forEach(veh => {
		veh.aVehCollection.forEach(obj => {
			let row = {};
			row["Dues Type"] = veh.duesType || 'NA';
			row["vehicle No"] = obj.veh_no || 'NA';
			row["Ref No"] = veh.refNo || 'NA';
			row["Date"] = veh.date && moment(new Date(veh.date)).format("DD-MM-YYYY") || 'NA';
			row["From"] = obj.frmdt && moment(new Date(obj.frmdt)).format("DD-MM-YYYY") || 'NA';
			row["To"] = obj.todt && moment(new Date(obj.todt)).format("DD-MM-YYYY") || 'NA';
			row["CR Acc"] = veh.from_account && veh.from_account.ledger_name || veh.from_account.name || 'NA';
			row["DR Acc"] = veh.to_account && veh.to_account.ledger_name || veh.to_account.name || 'NA';
			row["OD Amount"] = (obj.amount || 0);
			row["3rd Party Amount"] = (obj.tpAmount || 0);
			row["Prepaid Amount"] = obj.prepaidAmt && parseFloat(obj.prepaidAmt.toFixed(2) || 0);
			row["IGST"] = (obj.iGST || 0) + (obj.tPiGST || 0);
			row["CGST"] = (obj.cGST || 0) + (obj.tPcGST || 0);
			row["SGST"] = (obj.sGST || 0) + (obj.tPsGST || 0);
			row["Total Amount"] = (obj.total || 0);
			row["Policy No"] = obj.plcyNo || 'NA';
			row["Cheque No"] = veh.chqueno || "NA";
			row["Insurance Company"] = veh.insCompany || "NA";
			row["Insurance category"] = veh.insCtgry || "NA";
			row["Insurance Type"] = veh.insType || "NA";
			row["Policy Type"] = obj.plcytyp || 'NA';
			row["Remark"] = veh.rmk || 'NA';
			row["Created At"] = veh.created_at || "NA";

			addWorkbookRow(row, ws1, headers, (rowNum++));
		});
	});

	saveFileAndReturnCallback(workbook, clientId, 'dues', 'Dues Insurance Report', callback);
};

module.exports.duesPermitReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Permit Report');

	let headers = [
		"Dues Type",
		"vehicle No",
		"Ref No",
		"Date",
		"From",
		"To",
		"CR Acc",
		"DR Acc",
		"Permit Fee",
		"Other Expenses",
		"Processing Amount",
		"IGST",
		"CGST",
		"SGST",
		"Total Amount",
		"Prmit Type",
		"Prmit No",
		"Invoice No",
		"Remark",
		"Created At",
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Permit Report");
	formatColumnHeaders(ws1, 4, headers, [10, 15, 15, 15, 15, 15, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	aData.forEach(veh => {
		veh.aVehCollection.forEach(obj => {
			let row = {};
			row["Dues Type"] = veh.duesType || 'NA';
			row["vehicle No"] = obj.veh_no || 'NA';
			row["Ref No"] = veh.refNo || 'NA';
			row["Date"] = veh.date && moment(new Date(veh.date)).format("DD-MM-YYYY") || 'NA';
			row["From"] = obj.frmdt && moment(new Date(obj.frmdt)).format("DD-MM-YYYY") || 'NA';
			row["To"] = obj.todt && moment(new Date(obj.todt)).format("DD-MM-YYYY") || 'NA';
			row["CR Acc"] = veh.from_account && veh.from_account.ledger_name || veh.from_account.name || 'NA';
			row["DR Acc"] = veh.to_account && veh.to_account.ledger_name || veh.to_account.name || 'NA';
			row["Permit Fee"] = (obj.amount || 0);
			row["Other Expenses"] = obj.othrexp || 0;
			row["Processing Amount"] = obj.proCharge || 0;
			row["IGST"] = (obj.iGST || 0);
			row["CGST"] = (obj.cGST || 0);
			row["SGST"] = (obj.sGST || 0);
			row["Total Amount"] = (obj.total || 0);
			row["Prmit Type"] = obj.prmityp || 'NA';
			row["Prmit No"] = obj.permitNo || 'NA';
			row["Invoice No"] = veh.invoiceNo || 'NA';
			row["Remark"] = veh.rmk || 'NA';
			row["Created At"] = veh.created_at || "NA";

			addWorkbookRow(row, ws1, headers, (rowNum++));
		});
	});

	saveFileAndReturnCallback(workbook, clientId, 'Permit Report', 'Permit Report', callback);
};

module.exports.branchExpenseReport = function (aData, legderId, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Branch Expense Monthly Report');
	formatTitle(ws, 6, 'Branch Expense Monthly Report');

	let aHeader = ['Group', 'Ledger'];
	let rowCounter = 3;

	prepareHeadersForMonth(aHeader, from, to);
	aHeader.push('Total');

	aData.forEach(oRpt => {
		mergeCells(ws, rowCounter++, aHeader.length, oRpt.branch || '');
		formatColumnHeaders(ws, rowCounter++, aHeader, [...Array(aHeader.length).fill(15), 15]);
		let arrNetTotal = {};
		oRpt.aExp.forEach((oData) => {
			ws.getCell(getNextAlphabet(0) + rowCounter).value = oData.group || '';
			ws.getCell(getNextAlphabet(1) + rowCounter).value = oData.name || '';
			let total = 0,
				index = 2;

			while (index < aHeader.length - 1) {
				let sMonth = aHeader[index];
				total += (oData.month[sMonth] || 0);
				arrNetTotal[sMonth] = arrNetTotal[sMonth] || 0;
				arrNetTotal[sMonth] += (oData.month[sMonth] || 0);
				ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((oData.month[sMonth] || 0), 0);
				index++;
			}

			rowCounter++;
			ws.getCell(getNextAlphabet(index) + (rowCounter - 1)).value = helperFn.toFixed(total, 0);

		});


		mergeCells(ws, rowCounter, 2, 'Net Total');
		let totalNetTotal = 0, index = 0;
		for (index = 2; index < aHeader.length - 1; index++) {
			ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((arrNetTotal[aHeader[index]]), 0);
			totalNetTotal += arrNetTotal[aHeader[index]];
		}
		ws.getCell(getNextAlphabet(index) + rowCounter++).value = helperFn.toFixed(totalNetTotal, 0);
		rowCounter++;
	})

	saveFileAndReturnCallback(workbook, clientId, 'Branch Expense Report', 'Branch Expense Report', callback);

	function getNextAlphabet(range) {
		return String.fromCharCode('A'.charCodeAt() + range);
	}
};

module.exports.outstandingReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Bills transaction report');
	formatTitle(ws, 10, 'Bills transaction report');
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws, 'A2', 'J2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);

	let headers = ["Customer Name", "BillingParty Name", "Invoice No", "Due Date", "Bill Date", "Submission Date", "Due Days", "Bill Amount", "Pending Amount", "Remark"];
	let rowNum = 5;
	formatColumnHeaders(ws, 4, headers, [27, 27, 16, 14, 14, 14, 10, 10, 10, 22]);

	aData.forEach(obj => {
		let billTotal = 0, pendTotal = 0;
		// mergeCells(ws, (rowNum++), 8, obj._id.customerName);
		obj.aMonthlyData.forEach(o => {
			let row = {};
			var todayDate = new Date();
			row["Customer Name"] = obj._id.customerName || 'NA';
			row["BillingParty Name"] = o.billingPartyName || 'NA';
			row["Invoice No"] = o.billNo || 'NA';
			row["Due Date"] = o.dueDate && moment(new Date(o.dueDate)).format('DD-MM-YYYY') || 'NA';
			if (!o.submitionDate)
				row["Due Days"] = dateUtil.calDays(todayDate, o.billDate);
			if (o.submitionDate)
				row["Due Days"] = dateUtil.calDays(o.billDate, o.submitionDate);
			row["Bill Date"] = o.billDate && moment(new Date(o.billDate)).format('DD-MM-YYYY') || 'NA';
			row["Submission Date"] = o.submitionDate && moment(new Date(o.submitionDate)).format('DD-MM-YYYY') || 'NA';
			row["Bill Amount"] = o.billAmount || '0';
			billTotal += o.billAmount;
			row["Pending Amount"] = o.overDueAmount || '0';
			pendTotal += o.overDueAmount;
			row["Remark"] = o.remarks || 'NA';

			addWorkbookRow(row, ws, headers, (rowNum++));
		});
		setVal(ws, 'H', rowNum, parseFloat(billTotal).toFixed(0) || 0, {fill: 'f2da97'});
		setVal(ws, 'I', rowNum, parseFloat(pendTotal).toFixed(0) || 0, {fill: 'f2da97'});

		// ws.getCell(getNextAlphabet(0) + rowNum).value = helperFn.toFixed(billTotal, 0);
		// ws.getCell(getNextAlphabet(1) + rowNum).value = helperFn.toFixed(pendTotal, 0);
		rowNum++;
	});

	function getNextAlphabet(range) {

		return String.fromCharCode('F'.charCodeAt() + range);

	}

	saveFileAndReturnCallback(workbook, clientId, 'Bills transaction report', 'Bills transaction report', callback);
};

module.exports.ledgerTransactionReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Bills transaction report');
	formatTitle(ws, 9, 'Bills transaction report');
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws, 'A2', 'D2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);
	let headers = ["Invoice No", "Due Date", "Bill Date", "Submission Date", "Due Days", "Bill Amount", "On Account", "Pending Amount", "Remark"];
	let rowNum = 5;
	formatColumnHeaders(ws, 4, headers, [16, 14, 14, 14, 16, 16, 16, 16, 22]);
	let billTotal = 0, pendTotal = 0;
	aData.forEach(obj => {

		// addWorkbookRow({
		// 	'On Account': obj.onAccount[0] && obj.onAccount[0].amount || ' ',
		// 	'Remark': obj.onAccount[0] && obj.onAccount[0].amount || ' '
		// }, ws, headers, (rowNum));
		//setVal(ws, 'H', rowNum, obj.onAccount && obj.onAccount[0].amount || '', {fill: 'f2da97'});
		setVal(ws, 'G', rowNum, obj.onAccount || 0, {fill: 'f2da97'});
		setVal(ws, 'I', rowNum, '', {fill: 'f2da97'});
		mergeCells(ws, (rowNum++), 9, obj.billingParty.name);

		obj.aBills.forEach(o => {
			let row = {};
			var todayDate = new Date();
			// if(o.overDueAmount > 0.10){
			row["Invoice No"] = o.billNo || 'NA';
			row["Due Date"] = o.dueDate && moment(new Date(o.dueDate)).format('DD-MM-YYYY') || 'NA';
			if (!o.submitionDate)
				row["Due Days"] = dateUtil.calDays(todayDate, o.billDate);
			if (o.submitionDate)
				row["Due Days"] = dateUtil.calDays(o.billDate, o.submitionDate);
			row["Bill Date"] = o.billDate && moment(new Date(o.billDate)).format('DD-MM-YYYY') || 'NA';
			row["Submission Date"] = o.submitionDate && moment(new Date(o.submitionDate)).format('DD-MM-YYYY') || 'NA';
			row["Bill Amount"] = parseFloat(o.billAmount).toFixed(0) || '0';
			billTotal += o.billAmount;
			row["Pending Amount"] = parseFloat(o.overDueAmount).toFixed(0) || '0';
			pendTotal += o.overDueAmount;
			row["On Account"] = 0;  //parseInt
			row["Remark"] = o.remarks || 'NA';
			// }

			addWorkbookRow(row, ws, headers, (rowNum++));
		});
		// ws.getCell(getNextAlphabet(0) + rowNum).value = helperFn.twodec(parseFloat(billTotal));
		// ws.getCell(getNextAlphabet(1) + rowNum).value = helperFn.twodec(parseFloat(pendTotal));
		// rowNum++;
	});
	setVal(ws, 'E', rowNum, 'GRAND tOTAL', {fill: '00FF00'});
	setVal(ws, 'F', rowNum, parseFloat(billTotal).toFixed(0) || 0, {fill: '00FF00'});
	setVal(ws, 'G', rowNum, 0, {fill: '00FF00'});
	setVal(ws, 'H', rowNum, parseFloat(pendTotal).toFixed(0) || 0, {fill: '00FF00'});

	function getNextAlphabet(range) {

		return String.fromCharCode('F'.charCodeAt() + range);

	}

	saveFileAndReturnCallback(workbook, clientId, 'Outstanding Report', 'Outstanding Report ', callback);
};

module.exports.outstandingPeriodWiseReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Outstanding Monthly Report');
	formatTitle(ws, 16, 'Outstanding Monthly Report');
	let aMonth = [];
	let rowCounter = 5;
	prepareHeadersForMonth(aMonth, from, to);
	//aMonth.push('Total');
	let colIndex = 1;
	let rowIndex = 3;
	aMonth.forEach(month => {
		ws.mergeCells(`${toAlphabet(colIndex)}${rowIndex}:${toAlphabet(colIndex + 1)}${rowIndex}`);
		ws.getCell(`${toAlphabet(colIndex + 1)}${rowIndex}`).value = month;
		ws.getCell(`${toAlphabet(colIndex)}${rowIndex + 1}`).value = 'Outstanding';
		ws.getCell(`${toAlphabet(colIndex + 1)}${rowIndex + 1}`).value = 'Overdue';
		colIndex += 2;
	});

	aData.forEach(obj => {

		mergeCells(ws, (rowCounter), 10, obj.name);

		let a = 0;
		let total = 0, total2 = 0;
		rowCounter++;
		aMonth.forEach(month => {
			let header = month;
			try {
				ws.getCell(getNextAlphabet(a++) + rowCounter).value = helperFn.toFixed((obj[header] && obj[header].outstandingSum || 0), 0).toFixed(2);
				ws.getCell(getNextAlphabet(a++) + rowCounter).value = helperFn.toFixed((obj[header] && obj[header].overdueSum || 0), 0).toFixed(2);
			} catch (err) {
				console.log(err);
			}
		});

		rowCounter++;

	});

	saveFileAndReturnCallback(workbook, clientId, 'Outstanding Monthly Report', 'Outstanding Monthly Report', callback);

	function getNextAlphabet(range) {

		return String.fromCharCode('A'.charCodeAt() + range);

	}
};

//ritika
module.exports.billingPartyExpenseReport = function (aData, rT, to, from, user, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(rT);
	let aHeader = '';

	if (rT === "Billed Monthly Report" || rT === "Unbilled Monthly Report") {
		aHeader = ['All Customers'];
	} else {
		aHeader = ['All Clients'];
	}

	let rowCounter = 4;
	let headerLength = 1;
	prepareHeadersForMonth(aHeader, from, to);
	aHeader.push('Total');
	if (rT === "Unbilled Monthly Report") {
		aHeader.push('No of CNS');
		headerLength = 2;
	}
	formatTitle(ws, aHeader.length, rT);

	formatColumnHeaders(ws, 3, aHeader, [...Array(aHeader.length).fill(20), 15]);
	let arrNetTotal = {};
	let lastOwnerValue = "";
	let lNameColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'AAF0E2'
		}
	};
	aData.forEach((oData, i) => {
		if ((lastOwnerValue === "" || lastOwnerValue !== oData.custName)) {
			lastOwnerValue = oData.custName;
			let rowNetTotal = {};
			for (const d of aHeader){
				rowNetTotal[d] = 0;
			}
			let index = aData.indexOf(oData);
			for(i = index ; i < aData.length ; i++){
				if(lastOwnerValue == aData[i].custName){
					let a = 1;
					while (a < aHeader.length - headerLength) {
						let header = aHeader[a];
						rowNetTotal[header] += (aData[i][header] || 0);
						rowNetTotal['Total'] += (aData[i][header] || 0);
						a++;
					}
				}else{
					break;
				}
			}

			mergeCells(ws, rowCounter, 1, lastOwnerValue, 0, {fill: lNameColor});
			let c = 1;
			for (c ; c < aHeader.length - headerLength; c++) {
				ws.getCell(getNextAlphabet(c) + rowCounter).value = helperFn.toFixed((rowNetTotal[aHeader[c]]), 0);
				// totalNetTotal += rowNetTotal[aHeader[b]];
			}
			ws.getCell(getNextAlphabet(aHeader.length-1) + rowCounter).value = helperFn.toFixed(rowNetTotal['Total'], 0);
			rowCounter++;
		}

		ws.getCell(getNextAlphabet(0) + rowCounter).value = oData.name || '';
		let total = 0,
			a = 1;

		while (a < aHeader.length - headerLength) {
			let header = aHeader[a];
			total += (oData[header] || 0);
			arrNetTotal[header] = arrNetTotal[header] || 0;
			arrNetTotal[header] += (oData[header] || 0);
			ws.getCell(getNextAlphabet(a) + rowCounter).value = helperFn.toFixed((oData[header] || 0), 0);
			a++;
		}
		rowCounter++;
		ws.getCell(getNextAlphabet(a) + (rowCounter - 1)).value = helperFn.toFixed(total, 0);
		if (rT === "Unbilled Monthly Report")
			ws.getCell(getNextAlphabet(a + 1) + (rowCounter - 1)).value = oData.count || '';
		//netTotal += total;
	});

	mergeCells(ws, rowCounter, 1, 'Net Total');
	let totalNetTotal = 0, b = 0;
	for (b = 1; b < aHeader.length - headerLength; b++) {
		ws.getCell(getNextAlphabet(b) + rowCounter).value = helperFn.toFixed((arrNetTotal[aHeader[b]]), 0);
		totalNetTotal += arrNetTotal[aHeader[b]];
	}
	ws.getCell(getNextAlphabet(b) + rowCounter).value = helperFn.toFixed(totalNetTotal, 0);
	if (rT === "Unbilled Monthly Report")
		ws.getCell(getNextAlphabet(b + 1) + rowCounter).value = helperFn.toFixed(user.totCNS, 0);
	saveFileAndReturnCallback(workbook, user.clientId, rT, rT, callback);

	function getNextAlphabet(range) {

		return String.fromCharCode('A'.charCodeAt() + range);
	}
};

module.exports.loadingMonthlyReport = function (aData, to, from, user, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Loading Monthly Report');
	let aHeader = ['Company', 'All Customers'];

	let rowCounter = 4;
	let headerLength = 1;
	prepareHeadersForMonth(aHeader, from, to);
	aHeader.push('Total');
	formatTitle(ws, aHeader.length, 'Loading Monthly Report');

	formatColumnHeaders(ws, 3, aHeader, [...Array(aHeader.length).fill(20), 15]);
	let arrNetTotal = {};

	let lastOwnerValue = "";
	let lNameColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'AAF0E2'
		}
	};
	aData.forEach((oData, i) => {
		let netTotal = 0;
		let cId = user.clientId;
		let clientAllowed = user.client_allowed.find(ca => ca.clientId === cId);
		let compName = clientAllowed && clientAllowed.name;
		if ((lastOwnerValue === "" || lastOwnerValue !== oData.custName)) {
			lastOwnerValue = oData.custName;
			let rowNetTotal = {
			};
			for (const d of aHeader){
				rowNetTotal[d] = 0;
			}
			let index = aData.indexOf(oData);
			for(i = index ; i < aData.length ; i++){
				if(lastOwnerValue == aData[i].custName){
					let a = 2;
					while (a < aHeader.length - headerLength) {
						let header = aHeader[a];
						rowNetTotal[header] += (aData[i][header] || 0);
						rowNetTotal['Total'] += (aData[i][header] || 0);
						a++;
					}
				}else{
					break;
				}
			}
			mergeCells(ws, rowCounter, 2, lastOwnerValue, 0, {fill: lNameColor});
			let c = 2;
			for (c ; c < aHeader.length - headerLength; c++) {
				ws.getCell(getNextAlphabet(c) + rowCounter).value = helperFn.toFixed((rowNetTotal[aHeader[c]]), 0);
				// totalNetTotal += rowNetTotal[aHeader[b]];
			}
			ws.getCell(getNextAlphabet(aHeader.length-1) + rowCounter).value = helperFn.toFixed(rowNetTotal['Total'], 0);
			rowCounter++;
		}
		ws.getCell(getNextAlphabet(0) + rowCounter).value = compName || '';
		ws.getCell(getNextAlphabet(1) + rowCounter).value = oData.name || '';
		let total = 0,
			a = 2;

		while (a < aHeader.length - headerLength) {
			let header = aHeader[a];
			total += (oData[header] || 0);
			arrNetTotal[header] = arrNetTotal[header] || 0;
			arrNetTotal[header] += (oData[header] || 0);
			ws.getCell(getNextAlphabet(a) + rowCounter).value = helperFn.toFixed((oData[header] || 0), 0);
			a++;
		}
		ws.getCell(getNextAlphabet(aHeader.length-1) + rowCounter).value = helperFn.toFixed(total, 0);
		rowCounter++;
		// netTotal += total;
		// mergeCells(ws, rowCounter, 1, 'Total', aHeader.length - 2);
		// ws.getCell(getNextAlphabet(a) + rowCounter++).value = helperFn.toFixed(netTotal, 0);
	});

	mergeCells(ws, rowCounter, 2, 'Net Total');
	let totalNetTotal = 0, b = 0;
	for (b = 2; b < aHeader.length - headerLength; b++) {
		ws.getCell(getNextAlphabet(b) + rowCounter).value = helperFn.toFixed((arrNetTotal[aHeader[b]]), 0);
		totalNetTotal += arrNetTotal[aHeader[b]];
	}
	ws.getCell(getNextAlphabet(aHeader.length-1) + rowCounter).value = helperFn.toFixed(totalNetTotal, 0);
	saveFileAndReturnCallback(workbook, user.clientId, 'Loading Monthly Report', 'Loading Monthly Report', callback);

	function getNextAlphabet(range) {

		return String.fromCharCode('A'.charCodeAt() + range);
	}
};

module.exports.tripAdvDateRpt = function (aData, type, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(type);
	// formatTitle(ws, 15, 'Date Wise Advance Report');
	let aHeader = ["Advance Type", "Credit Account"];

	let rowCounter = 4;


	for (let i = moment(from).endOf('day').valueOf(); i <= moment(to).endOf('day').valueOf(); i += 86400000) { // 1 day = 86400000 = 1000 * 60 * 60 * 24
		aHeader.push(moment(i).format('DD-MM-YYYY'));
	}

	aHeader.push('Total');
	formatTitle(ws, aHeader.length, type);

	formatColumnHeaders(ws, 3, aHeader, [...Array(aHeader.length).fill(15), 15]);
	let arrNetTotal = {};

	aData.forEach((oData, i) => {
		ws.getCell(toAlphabet(1) + rowCounter).value = oData.advanceType || '';
		ws.getCell(toAlphabet(2) + rowCounter).value = oData.name || '';
		let total = 0,
			a = 2;

		while (a < aHeader.length - 1) {
			let header = aHeader[a];
			total += (oData[header] || 0);
			arrNetTotal[header] = arrNetTotal[header] || 0;
			arrNetTotal[header] += (oData[header] || 0);
			ws.getCell(toAlphabet(a + 1) + rowCounter).value = helperFn.toFixed((oData[header] || 0), 0);
			a++;
		}

		rowCounter++;
		ws.getCell(toAlphabet(a + 1) + (rowCounter - 1)).value = helperFn.toFixed(total, 0);
		//netTotal += total;
	});

	mergeCells(ws, rowCounter, 2, 'Net Total');
	let totalNetTotal = 0, b = 0;
	for (b = 2; b < aHeader.length - 1; b++) {
		ws.getCell(toAlphabet(b + 1) + rowCounter).value = helperFn.toFixed((arrNetTotal[aHeader[b]]), 0);
		totalNetTotal += arrNetTotal[aHeader[b]];
	}
	ws.getCell(toAlphabet(b + 1) + rowCounter).value = helperFn.toFixed(totalNetTotal, 0);
	saveFileAndReturnCallback(workbook, clientId, "Advance Report", type, callback);
};

module.exports.grSummaryReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('GR Summary Report');
	formatTitle(ws, 7, 'Groupwise CN Summary');
	// mergeCells(ws, 2, 7, to + 'to' + from );
	// ws.getCell('A2').value = helperFn.toFixed(to);
	// ws.getCell('C' + 2).value = helperFn.toFixed(from);

	let headers = ["S.No", "Billingparty Name", "Charged Weight", "Actual Weight", "No of Pieces", "No of CN", "ToBeBilled Amount"];
	let rowNum = 5;
	formatColumnHeaders(ws, 4, headers, [6, 20, 16, 16, 16, 10, 20]);
	// let count = 1;


	// aData.forEach(obj => {
	for (let obj of aData) {
		let TotalNoOfPieces = 0, TotalNoOfCN = 0, TotalBilledAmount = 0;
		mergeCells(ws, (rowNum++), 7, obj._id.groupName);

		if (!obj._id.groupName) {
			mergeCells(ws, (rowNum++), 7, "No Billing Party Group");
		}
		let count = 1;
		obj.Data.forEach(o => {
			let row = {};
			row["S.No"] = (count || 0);
			row["Billingparty Name"] = o.billingParty.name || 'NA';
			row["Actual Weight"] = o.actualWeight || 0;
			row["Charged Weight"] = o.chargedWeight || 0;
			row["No of Pieces"] = o.noOfPieces || 0;
			TotalNoOfPieces += o.noOfPieces;
			row["No of CN"] = o.count || 0;
			TotalNoOfCN += o.count;
			row["ToBeBilled Amount"] = o.totalAmount || 0;
			TotalBilledAmount += o.totalAmount;
			count++;
			addWorkbookRow(row, ws, headers, (rowNum++));
		});
		ws.getCell('A' + rowNum).value = '';
		ws.getCell('B' + rowNum).value = '';
		ws.getCell('C' + rowNum).value = 'GRAND TOTAL';
		ws.getCell('D' + rowNum).value = '';
		ws.getCell('E' + rowNum).value = helperFn.toFixed(TotalNoOfPieces, 0);
		ws.getCell('F' + rowNum).value = helperFn.toFixed(TotalNoOfCN, 0);
		ws.getCell('G' + rowNum).value = helperFn.toFixed(TotalBilledAmount, 0);
		rowNum++;
	}

	saveFileAndReturnCallback(workbook, clientId, 'GR Summary Report', 'GR Summary Report', callback);
};

module.exports.deductionReport = function (aData, {from, to}, clientId, callback) {
	let fName = 'Deduction Monthly Report';
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(fName);
	formatTitle(ws, 6, fName);

	let aHeader = ['Billing Party', 'Deduction'];
	let rowCounter = 4;

	for (let m = moment(from); m.diff(to, 'month') <= 0; m.add(1, 'month')) {
		aHeader.push(m.format('MM-YYYY'));
	}

	aHeader.push('Total');

	formatColumnHeaders(ws, 3, aHeader, Array(aHeader.length).fill(15));
	aData.forEach((oData) => {
		ws.getCell(toAlphabet(1) + rowCounter).value = oData.bp || '';
		oData.aDed.forEach(oDed => {
			let colCounter = 2;
			ws.getCell(toAlphabet(colCounter++) + rowCounter).value = oDed.name || '';
			let total = 0,
				i = 2,
				month = oDed.month;

			while (i < aHeader.length - 1) {
				let header = aHeader[i];
				total += (month[header] || 0);
				ws.getCell(toAlphabet(colCounter++) + rowCounter).value = helperFn.toFixed((month[header] || 0), 0);
				i++;
			}

			ws.getCell(toAlphabet(colCounter++) + rowCounter).value = helperFn.toFixed(total, 0);
			rowCounter++;
		});
	});

	// mergeCells(ws, rowCounter, 1, 'Net Total');
	// let totalNetTotal = 0, b = 0;
	// for (b = 1; b < aHeader.length - 1; b++) {
	// 	ws.getCell(getNextAlphabet(b) + rowCounter).value = helperFn.toFixed((arrNetTotal[aHeader[b]]), 0);
	// 	totalNetTotal += arrNetTotal[aHeader[b]];
	// }
	// ws.getCell(getNextAlphabet(b) + rowCounter).value = helperFn.toFixed(totalNetTotal, 0);

	saveFileAndReturnCallback(workbook, clientId, fName, fName, callback);

	function getNextAlphabet(range) {
		return String.fromCharCode('A'.charCodeAt() + range);
	}
};

module.exports.ledgerOutstandingReport = function (aData, {from, to, category, clientId}, callback) {
	let fName = 'LEDGER OUTSTANDING REPORT DAYSWISE';
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(fName);

	let rowOffset = 1;
	ws.mergeCells(`A${rowOffset}:B${rowOffset}`);
	setVal(ws, 'B', rowOffset, "REPORT TYPE", {border: true, cellColor: true});
	ws.mergeCells(`C${rowOffset}:D${rowOffset}`);
	setVal(ws, 'D', rowOffset, "LEDGER OUTSTANDING REPORT DAYSWISE", {border: true, cellColor: true});
	rowOffset++;
	ws.mergeCells(`A${rowOffset}:B${rowOffset}`);
	setVal(ws, 'A', rowOffset, "DATE", {border: true, fill: true});
	ws.mergeCells(`C${rowOffset}:D${rowOffset}`);
	// setVal(ws, 'C', rowOffset, moment(asOnDate).format('DD-MM-YYYY'), {border: true, fill: true});
	setVal(ws, 'C', rowOffset, moment(from).format('DD-MM-YYYY') + " To " + moment(to).format('DD-MM-YYYY'), {
		border: true,
		fill: true
	});
	rowOffset++;
	if (category && category.length) {
		ws.mergeCells(`A${rowOffset}:B${rowOffset}`);
		setVal(ws, 'A', rowOffset, "Category", {border: true, fill: true});
		ws.mergeCells(`C${rowOffset}:D${rowOffset}`);
		// setVal(ws, 'C', rowOffset, moment(asOnDate).format('DD-MM-YYYY'), {border: true, fill: true});
		setVal(ws, 'C', rowOffset, category, {border: true, fill: true});
		rowOffset++;
	}

	rowOffset += 2;

	setVal(ws, 'A', rowOffset, "SR NO", {border: true, cellColor: true});
	setVal(ws, 'B', rowOffset, "CUSTOMER TYPE ", {border: true, width: 29, cellColor: true});
	setVal(ws, 'C', rowOffset, "CUSTOMER NAME ", {border: true, width: 31, cellColor: true});
	setVal(ws, 'D', rowOffset, "BILLING PARTY ", {border: true, width: 31, cellColor: true});
	setVal(ws, 'E', rowOffset, "CONTRACTUAL PAYMENT DAYS ", {border: true, width: 31, cellColor: true});
	setVal(ws, 'F', rowOffset, "BOOKING BRANCH", {border: true, width: 31, cellColor: true});

	ws.mergeCells(`G${rowOffset - 1}:I${rowOffset - 1}`);
	setVal(ws, 'I', rowOffset - 1, "MORE THAN 180 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'G', rowOffset, "REVENUE ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'H', rowOffset, "OUTSTANDING ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'I', rowOffset, "OVERDUE ", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`J${rowOffset - 1}:L${rowOffset - 1}`);
	setVal(ws, 'L', rowOffset - 1, "91-180 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'J', rowOffset, "REVENUE ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'K', rowOffset, "OUTSTANDING ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'L', rowOffset, "OVERDUE ", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`M${rowOffset - 1}:O${rowOffset - 1}`);
	setVal(ws, 'O', rowOffset - 1, "61-90 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'M', rowOffset, "REVENUE ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'N', rowOffset, "OUTSTANDING ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'O', rowOffset, "OVERDUE ", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`P${rowOffset - 1}:R${rowOffset - 1}`);
	setVal(ws, 'R', rowOffset - 1, "31-60 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'P', rowOffset, "REVENUE ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'Q', rowOffset, "OUTSTANDING ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'R', rowOffset, "OVERDUE ", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`S${rowOffset - 1}:U${rowOffset - 1}`);
	setVal(ws, 'U', rowOffset - 1, "UPTO 30 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'S', rowOffset, "REVENUE ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'T', rowOffset, "OUTSTANDING ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'U', rowOffset, "OVERDUE ", {border: true, width: 20, cellColor: true, align: true});

	setVal(ws, 'V', rowOffset, "ON ACCOUNT ", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'W', rowOffset, "NET OUTSTANDING ", {border: true, width: 80, cellColor: true, align: true});
	setVal(ws, 'X', rowOffset, "NET OVERDUES ", {border: true, width: 50, cellColor: true, align: true});
	setVal(ws, 'Y', rowOffset, "TOTAL REVENUE ", {border: true, width: 50, cellColor: true, align: true});
	setVal(ws, 'Z', rowOffset, "TURNOVER 3 MONTH", {border: true, width: 50, cellColor: true, align: true});
	rowOffset++;

	let sno = 1;
	let a180_sub = 0, a90_sub = 0, a60_sub = 0, a30_sub = 0, a0_sub = 0, a180_due = 0, a90_due = 0, a60_due = 0,
		a30_due = 0, a0_due = 0, a180_revenue = 0, a90_revenue = 0, a60_revenue = 0, a30_revenue = 0, a0_revenue = 0,
		onAcc = 0, outStnd = 0, overDue = 0, revenue = 0, turnover3Month = 0;
	aData.forEach((oCustomerType, index) => {
		oCustomerType.data.forEach((oCustomer, index) => {
			oCustomer.data.forEach((oVch) => {
				setVal(ws, 'A', rowOffset, sno++, {border: true});
				setVal(ws, 'B', rowOffset, oCustomerType._id || 'NA', {border: true});
				setVal(ws, 'C', rowOffset, oCustomer.customer && oCustomer.customer.name || '', {border: true});
				setVal(ws, 'D', rowOffset, oVch.billingParty && oVch.billingParty.name || '', {border: true});
				setVal(ws, 'E', rowOffset, oVch.creditDays || '', {border: true});
				setVal(ws, 'F', rowOffset, oCustomer.customer && oCustomer.customer.branch && oCustomer.customer.branch.name || '', {border: true});

				setVal(ws, 'G', rowOffset, oVch['180_revenue'] || 0, {border: true, setFormat: true});
				setVal(ws, 'H', rowOffset, oVch['180_sub'] || 0, {border: true, setFormat: true});
				setVal(ws, 'I', rowOffset, oVch['180_due'] || 0, {border: true, setFormat: true});
				a180_sub += oVch['180_sub'];
				a180_due += oVch['180_due'];
				a180_revenue += oVch['180_revenue'];
				setVal(ws, 'J', rowOffset, oVch['90_revenue'] || 0, {border: true, setFormat: true});
				setVal(ws, 'K', rowOffset, oVch['90_sub'] || 0, {border: true, setFormat: true});
				setVal(ws, 'L', rowOffset, oVch['90_due'] || 0, {border: true, setFormat: true});
				a90_sub += oVch['90_sub'];
				a90_due += oVch['90_due'];
				a90_revenue += oVch['90_revenue'];
				setVal(ws, 'M', rowOffset, oVch['60_revenue'] || 0, {border: true, setFormat: true});
				setVal(ws, 'N', rowOffset, oVch['60_sub'] || 0, {border: true, setFormat: true});
				setVal(ws, 'O', rowOffset, oVch['60_due'] || 0, {border: true, setFormat: true});
				a60_sub += oVch['60_sub'];
				a60_due += oVch['60_due'];
				a60_revenue += oVch['60_revenue'];
				setVal(ws, 'P', rowOffset, oVch['30_revenue'] || 0, {border: true, setFormat: true});
				setVal(ws, 'Q', rowOffset, oVch['30_sub'] || 0, {border: true, setFormat: true});
				setVal(ws, 'R', rowOffset, oVch['30_due'] || 0, {border: true, setFormat: true});
				a30_sub += oVch['30_sub'];
				a30_due += oVch['30_due'];
				a30_revenue += oVch['30_revenue'];
				setVal(ws, 'S', rowOffset, oVch['0_revenue'] || 0, {border: true, setFormat: true});
				setVal(ws, 'T', rowOffset, oVch['0_sub'] || 0, {border: true, setFormat: true});
				setVal(ws, 'U', rowOffset, oVch['0_due'] || 0, {border: true, setFormat: true});
				a0_sub += oVch['0_sub'];
				a0_due += oVch['0_due'];
				a0_revenue += oVch['0_revenue'];
				let onAccount = (oVch.onAccount || 0);
				onAcc += (oVch.onAccount || 0);
				let outstanding = oVch.outstanding || 0;
				outStnd += outstanding;
				let _overDue = (oVch['180_due'] + oVch['90_due'] + oVch['60_due'] + oVch['30_due'] + oVch['0_due']) - onAccount;
				overDue += _overDue;
				let netOutSt = ((outstanding || 0) - (onAccount || 0));
				revenue += oVch.revenue || 0;
				let _turnover3Month = (oVch['0_revenue'] || 0) + (oVch['30_revenue'] || 0) + (oVch['60_revenue'] || 0);
				turnover3Month += _turnover3Month;
				setVal(ws, 'V', rowOffset, parseFloat(onAccount || 0), {border: true, property: true, setFormat: true});
				setVal(ws, 'W', rowOffset, parseFloat(netOutSt || 0), {border: true, property: true, setFormat: true});
				setVal(ws, 'X', rowOffset, _overDue, {border: true, property: true, setFormat: true});
				setVal(ws, 'Y', rowOffset, oVch.revenue, {border: true, property: true, setFormat: true});
				setVal(ws, 'Z', rowOffset, _turnover3Month, {border: true, property: true, setFormat: true});
				rowOffset++;
			});
		});
	});
	setVal(ws, 'F', rowOffset, "TOTAL", {border: true, width: 34, fill: true});

	setVal(ws, 'G', rowOffset, parseFloat(a180_revenue || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'H', rowOffset, parseFloat(a180_sub || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'I', rowOffset, parseFloat(a180_due || 0), {border: true, width: 22, fill: true, setFormat: true});

	setVal(ws, 'J', rowOffset, parseFloat(a90_revenue || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'K', rowOffset, parseFloat(a90_sub || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'L', rowOffset, parseFloat(a90_due || 0), {border: true, width: 22, fill: true, setFormat: true});

	setVal(ws, 'M', rowOffset, parseFloat(a60_revenue || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'N', rowOffset, parseFloat(a60_sub || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'O', rowOffset, parseFloat(a60_due || 0), {border: true, width: 22, fill: true, setFormat: true});

	setVal(ws, 'P', rowOffset, parseFloat(a30_revenue || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'Q', rowOffset, parseFloat(a30_sub || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'R', rowOffset, parseFloat(a30_due || 0), {border: true, width: 22, fill: true, setFormat: true});

	setVal(ws, 'S', rowOffset, parseFloat(a0_revenue || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'T', rowOffset, parseFloat(a0_sub || 0), {border: true, width: 22, fill: true, setFormat: true});
	setVal(ws, 'U', rowOffset, parseFloat(a0_due || 0), {border: true, width: 22, fill: true, setFormat: true});

	setVal(ws, 'V', rowOffset, parseFloat(onAcc || 0), {border: true, width: 29, fill: true, setFormat: true});
	setVal(ws, 'W', rowOffset, parseFloat(outStnd || 0), {border: true, width: 29, fill: true, setFormat: true});
	setVal(ws, 'X', rowOffset, parseFloat(overDue || 0), {border: true, width: 29, fill: true, setFormat: true});
	setVal(ws, 'Y', rowOffset, parseFloat(revenue || 0), {border: true, width: 29, fill: true, setFormat: true});
	setVal(ws, 'Z', rowOffset, parseFloat(turnover3Month || 0), {border: true, width: 29, fill: true, setFormat: true});


	saveFileAndReturnCallback(workbook, clientId, fName, fName, callback);
};

module.exports.billLedgerOutstandingPeriodWiseReport = function (aData, aMonth, {
	from,
	to,
	category,
	clientId
}, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('LEDGER OUTSTANDING REPORT PERIOD WISE');
	formatTitle(ws, 16, 'LEDGER OUTSTANDING REPORT PERIOD WISE');
	ws.mergeCells('A2:P2');
	setVal(ws, 'A', 2, moment(from).format('DD-MM-YYYY') + " To " + moment(to).format('DD-MM-YYYY'), {
		border: true,
		fill: true
	});
	if (category && category.length) {
		ws.mergeCells('A3:P3');
		setVal(ws, 'A', 3, category, {border: true, fill: true});
	}
	let rowCounter = 6;
	let colIndex = 6;
	let rowIndex = 4;
	let rowOffset = 4;
	let count = 1;

	setVal(ws, 'A', rowOffset, "SR NO", {border: true, cellColor: true});
	setVal(ws, 'B', rowOffset, "CUSTOMER TYPE ", {border: true, width: 31, cellColor: true});
	setVal(ws, 'C', rowOffset, "CUSTOMER NAME ", {border: true, width: 40, cellColor: true});
	setVal(ws, 'D', rowOffset, "BILLING PARTY ", {border: true, width: 40, cellColor: true});
	setVal(ws, 'E', rowOffset, "BOOKING BRANCH ", {border: true, width: 40, cellColor: true});
	setVal(ws, 'F', rowOffset, "CONTRACTUAL PAYMENT DAYS ", {border: true, width: 40, cellColor: true});

	let netColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'dfcce1'
		}
	};
	let haderColor = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'a4dada'
		}
	};
	let netTotalOut = {};
	let netTotalOvr = {};
	let netTotalacc = 0, netTotalFOut = 0, netTotalFOvr = 0, netTotalTrnovr = 0, netTotalFRev = 0;

	aMonth.forEach(month => {
		ws.mergeCells(`${numToAlpha(colIndex)}${rowIndex}:${numToAlpha(colIndex + 2)}${rowIndex}`);
		setVal2(ws, ws.getCell(`${numToAlpha(colIndex + 2)}${rowIndex}`), month, {
			border: true,
			width: 20,
			setColor: haderColor,
			align: true
		});
		setVal2(ws, ws.getCell(`${numToAlpha(colIndex)}${rowIndex + 1}`), "Revenue", {
			border: true,
			width: 25,
			setColor: netColor,
			align: true
		});
		setVal2(ws, ws.getCell(`${numToAlpha(colIndex + 1)}${rowIndex + 1}`), "Outstanding", {
			border: true,
			width: 25,
			setColor: netColor,
			align: true
		});
		setVal2(ws, ws.getCell(`${numToAlpha(colIndex + 2)}${rowIndex + 1}`), "Overdue ", {
			border: true,
			width: 25,
			setColor: netColor,
			align: true
		});
		colIndex += 3;
	});

	setVal2(ws, ws.getCell(`${numToAlpha(colIndex)}${rowIndex + 1}`), "ON ACCOUNT ", {
		border: true,
		width: 25,
		cellColor: true,
		align: true
	});

	setVal2(ws, ws.getCell(`${numToAlpha(colIndex + 1)}${rowIndex + 1}`), "NET OUTSTANDING ", {
		border: true,
		width: 25,
		cellColor: true,
		align: true
	});

	setVal2(ws, ws.getCell(`${numToAlpha(colIndex + 2)}${rowIndex + 1}`), "NET OVERDUE ", {
		border: true,
		width: 25,
		cellColor: true,
		align: true
	});

	setVal2(ws, ws.getCell(`${numToAlpha(colIndex + 3)}${rowIndex + 1}`), "TOTAL REVENUE ", {
		border: true,
		width: 25,
		cellColor: true,
		align: true
	});

	setVal2(ws, ws.getCell(`${numToAlpha(colIndex + 4)}${rowIndex + 1}`), "TURNOVER 3 MONTH ", {
		border: true,
		width: 25,
		cellColor: true,
		align: true
	});

	let aTotalRow = new Map();
	let rc;
	let val;

	try {
		aData.forEach((oData, index) => {
			let colIndex = 0;
			setVal2(ws, ws.getCell(numToAlpha(colIndex++) + rowCounter), count++, {
				border: true,
			});
			setVal2(ws, ws.getCell(numToAlpha(colIndex++) + rowCounter), oData.category || '', {
				border: true,
			});
			setVal2(ws, ws.getCell(numToAlpha(colIndex++) + rowCounter), oData.customer || '', {
				border: true
			});
			setVal2(ws, ws.getCell(numToAlpha(colIndex++) + rowCounter), oData.billingParty || '', {
				border: true
			});
			setVal2(ws, ws.getCell(numToAlpha(colIndex++) + rowCounter), oData.branch || '', {
				border: true
			});
			setVal2(ws, ws.getCell(numToAlpha(colIndex++) + rowCounter), oData.creditDays || '', {
				border: true
			});

			aMonth.forEach(s => {
				rc = numToAlpha(colIndex++);
				val = oData.oMonth[s] && oData.oMonth[s].revenue || 0;
				add(rc, val);
				setVal2(ws, ws.getCell(rc + rowCounter), val, {
					border: true,
					setFormat: true
				});

				rc = numToAlpha(colIndex++);
				val = oData.oMonth[s] && oData.oMonth[s].outstanding || 0;
				add(rc, val);
				setVal2(ws, ws.getCell(rc + rowCounter), val, {
					border: true,
					setFormat: true
				});

				rc = numToAlpha(colIndex++);
				val = oData.oMonth[s] && oData.oMonth[s].overDue || 0;
				add(rc, val);
				setVal2(ws, ws.getCell(rc + rowCounter), val, {
					border: true,
					setFormat: true
				});
			});

			rc = numToAlpha(colIndex++);
			val = oData.onAcc || 0;
			add(rc, val);
			setVal2(ws, ws.getCell(rc + rowCounter), val, {
				border: true,
				setFormat: true
			});

			rc = numToAlpha(colIndex++);
			val = (oData.totOutstanding || 0) - (oData.onAcc || 0);
			add(rc, val);
			setVal2(ws, ws.getCell(rc + rowCounter), val, {
				border: true,
				setFormat: true
			});

			rc = numToAlpha(colIndex++);
			val = (oData.totOverDue || 0) - (oData.onAcc || 0);
			add(rc, val);
			setVal2(ws, ws.getCell(rc + rowCounter), val, {
				border: true,
				setFormat: true
			});

			rc = numToAlpha(colIndex++);
			val = oData.totRevenue || 0;
			add(rc, val);
			setVal2(ws, ws.getCell(rc + rowCounter), val, {
				border: true,
				setFormat: true
			});

			rc = numToAlpha(colIndex++);
			val = oData.last3Outstanding || 0;
			add(rc, val);
			setVal2(ws, ws.getCell(rc + rowCounter), val, {
				border: true,
				setFormat: true
			});

			rowCounter++;
		});
	} catch (e) {
		console.log(e);
		throw e;
	}

	setVal2(ws, ws.getCell("E" + rowCounter), 'GRAND TOTAL', {
		border: true,
		fill: true
	});

	aTotalRow.forEach((val, key) => {
		setVal2(ws, ws.getCell(key + rowCounter), val, {
			border: true,
			setFormat: true
		});
	});

	saveFileAndReturnCallback(workbook, clientId, 'LEDGER OUTSTANDING REPORT PERIOD WISE', 'LEDGER OUTSTANDING REPORT PERIOD WISE', callback);

	function add(key, val) {
		aTotalRow.set(key, (aTotalRow.get(key) || 0) + val);
	}
};

module.exports.outstandingUnbilledReport = function (aData, {from, to, clientId}, callback) {
	let fName = 'Unbilled Summary Report';
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(fName);

	let rowOffset = 1;
	ws.mergeCells(`A${rowOffset}:B${rowOffset}`);
	setVal(ws, 'B', rowOffset, "REPORT TYPE", {border: true, cellColor: true});
	ws.mergeCells(`C${rowOffset}:D${rowOffset}`);
	setVal(ws, 'D', rowOffset, "UNBILLED SUMMARY REPORT", {border: true, cellColor: true});
	rowOffset++;
	ws.mergeCells(`A${rowOffset}:B${rowOffset}`);
	setVal(ws, 'A', rowOffset, "REPORT", {border: true, fill: true});
	ws.mergeCells(`C${rowOffset}:D${rowOffset}`);
	setVal(ws, 'C', rowOffset, moment(from).format('DD-MM-YYYY') + " To " + moment(to).format('DD-MM-YYYY'), {
		border: true,
		fill: true
	});
	rowOffset++;

	rowOffset += 2;

	setVal(ws, 'A', rowOffset, "SR NO", {border: true, cellColor: true});
	setVal(ws, 'B', rowOffset, "CUSTOMER TYPE ", {border: true, width: 22, cellColor: true});  //, cellColor:true
	setVal(ws, 'C', rowOffset, "BILLING PARTY ", {border: true, width: 40, cellColor: true});
	setVal(ws, 'D', rowOffset, "BRANCH ", {border: true, width: 40, cellColor: true});
	setVal(ws, 'E', rowOffset, "BILLING BRANCH ", {border: true, width: 40, cellColor: true});

	ws.mergeCells(`F${rowOffset - 1}:G${rowOffset - 1}`);
	setVal(ws, 'G', rowOffset - 1, "MORE THAN 180 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'F', rowOffset, "NO. CN", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'G', rowOffset, "AMOUNT", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`H${rowOffset - 1}:I${rowOffset - 1}`);
	setVal(ws, 'I', rowOffset - 1, "91-180 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'H', rowOffset, "NO. CN", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'I', rowOffset, "AMOUNT", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`J${rowOffset - 1}:K${rowOffset - 1}`);
	setVal(ws, 'K', rowOffset - 1, "61-90 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'J', rowOffset, "NO. CN", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'K', rowOffset, "AMOUNT", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`L${rowOffset - 1}:M${rowOffset - 1}`);
	setVal(ws, 'M', rowOffset - 1, " > 31-60 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'L', rowOffset, "NO. CN", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'M', rowOffset, "AMOUNT", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`N${rowOffset - 1}:O${rowOffset - 1}`);
	setVal(ws, 'O', rowOffset - 1, "Upto 30 DAYS", {border: true, fill: true, cellColor: true, align: true});
	setVal(ws, 'N', rowOffset, "NO. CN", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'O', rowOffset, "AMOUNT", {border: true, width: 20, cellColor: true, align: true});

	ws.mergeCells(`P${rowOffset - 1}:Q${rowOffset - 1}`);
	setVal(ws, 'P', rowOffset, "Total NO. CN", {border: true, width: 20, cellColor: true, align: true});
	setVal(ws, 'Q', rowOffset, "Total AMOUNT", {border: true, width: 20, cellColor: true, align: true});

	rowOffset++;
	let sno = 1;
	let a180_due_count = 0, a90_due_count = 0, a60_due_count = 0, a30_due_count = 0, a0_due_count = 0, a180_due = 0,
		a90_due = 0, a60_due = 0, a30_due = 0, a0_due = 0, onAcc = 0, outStnd = 0;

	aData.forEach((oCustomerType, index) => {
		oCustomerType.data.forEach((oCustomer, index) => {
			oCustomer.data.forEach((oVch) => {
				let netGr = 0, netAmt = 0;
				setVal(ws, 'B', rowOffset, oCustomerType._id || 'NA', {border: true});
				setVal(ws, 'C', rowOffset, oVch._id.billingParty || 'NA', {border: true});

				setVal(ws, 'A', rowOffset, sno++, {border: true});
				setVal(ws, 'D', rowOffset, oVch.branch && oVch.branch.name || 'NA', {border: true});
				setVal(ws, 'E', rowOffset, oVch._id && oVch._id.billingBranch && oVch._id.billingBranch.name || 'NA', {border: true});

				setVal(ws, 'F', rowOffset, parseFloat(oVch['180_due_count'] ? oVch['180_due_count'] : 0), {
					border: true,
					formatC: true
				});
				setVal(ws, 'G', rowOffset, parseFloat(oVch['180_due'] ? oVch['180_due'] : 0), {
					border: true,
					format: true
				});
				a180_due_count += oVch['180_due_count'];
				a180_due += oVch['180_due'];
				netGr += oVch['180_due_count'];
				netAmt += oVch['180_due'];

				setVal(ws, 'H', rowOffset, parseFloat(oVch['90_due_count'] ? oVch['90_due_count'] : 0), {
					border: true,
					formatC: true
				});
				setVal(ws, 'I', rowOffset, parseFloat(oVch['90_due'] ? oVch['90_due'] : 0), {
					border: true,
					format: true
				});
				a90_due_count += oVch['90_due_count'];
				a90_due += oVch['90_due'];
				netGr += oVch['90_due_count'];
				netAmt += oVch['90_due'];

				setVal(ws, 'J', rowOffset, parseFloat(oVch['60_due_count'] ? oVch['60_due_count'] : 0), {
					border: true,
					formatC: true
				});
				setVal(ws, 'K', rowOffset, parseFloat(oVch['60_due'] ? oVch['60_due'] : 0), {
					border: true,
					format: true
				});
				a60_due_count += oVch['60_due_count'];
				a60_due += oVch['60_due'];
				netGr += oVch['60_due_count'];
				netAmt += oVch['60_due'];

				setVal(ws, 'L', rowOffset, parseFloat(oVch['30_due_count'] ? oVch['30_due_count'] : 0), {
					border: true,
					formatC: true
				});
				setVal(ws, 'M', rowOffset, parseFloat(oVch['30_due'] ? oVch['30_due'] : 0), {
					border: true,
					format: true
				});
				a30_due_count += oVch['30_due_count'];
				a30_due += oVch['30_due'];
				netGr += oVch['30_due_count'];
				netAmt += oVch['30_due'];

				setVal(ws, 'N', rowOffset, parseFloat(oVch['0_due_count'] ? oVch['0_due_count'] : 0), {
					border: true,
					formatC: true
				});
				setVal(ws, 'O', rowOffset, parseFloat(oVch['0_due'] ? oVch['0_due'] : 0), {border: true, format: true});
				a0_due_count += oVch['0_due_count'];
				a0_due += oVch['0_due'];
				netGr += oVch['0_due_count'];
				netAmt += oVch['0_due'];

				setVal(ws, 'P', rowOffset, parseFloat(netGr), {border: true, formatC: true});
				setVal(ws, 'Q', rowOffset, parseFloat(netAmt), {border: true, format: true});

				rowOffset++
			});
		});
	});
	setVal(ws, 'E', rowOffset, "TOTAL", {border: true, width: 20, fill: true});
	let netTotalGr = 0, netTotalAmt = 0;
	setVal(ws, 'F', rowOffset, parseFloat(a180_due_count || 0), {border: true, width: 20, fill: true, formatC: true});
	setVal(ws, 'G', rowOffset, parseFloat(a180_due || 0), {border: true, width: 20, fill: true, format: true});
	netTotalGr += a180_due_count;
	netTotalAmt += a180_due;

	setVal(ws, 'H', rowOffset, parseFloat(a90_due_count || 0), {border: true, width: 20, fill: true, formatC: true});
	setVal(ws, 'I', rowOffset, parseFloat(a90_due || 0), {border: true, width: 20, fill: true, format: true});
	netTotalGr += a90_due_count;
	netTotalAmt += a90_due;

	setVal(ws, 'J', rowOffset, parseFloat(a60_due_count || 0), {border: true, width: 20, fill: true, formatC: true});
	setVal(ws, 'K', rowOffset, parseFloat(a60_due || 0), {border: true, width: 20, fill: true, format: true});
	netTotalGr += a60_due_count;
	netTotalAmt += a60_due;

	setVal(ws, 'L', rowOffset, parseFloat(a30_due_count || 0), {border: true, width: 20, fill: true, formatC: true});
	setVal(ws, 'M', rowOffset, parseFloat(a30_due || 0), {border: true, width: 20, fill: true, format: true});
	netTotalGr += a30_due_count;
	netTotalAmt += a30_due;

	setVal(ws, 'N', rowOffset, parseFloat(a0_due_count || 0), {border: true, width: 20, fill: true, formatC: true});
	setVal(ws, 'O', rowOffset, parseFloat(a0_due || 0), {border: true, width: 20, fill: true, format: true});
	netTotalGr += a0_due_count;
	netTotalAmt += a0_due;

	setVal(ws, 'P', rowOffset, parseFloat(netTotalGr || 0), {border: true, width: 20, fill: true, formatC: true});
	setVal(ws, 'Q', rowOffset, parseFloat(netTotalAmt || 0), {border: true, width: 20, fill: true, format: true});

	saveFileAndReturnCallback(workbook, clientId, fName, fName, callback);
};

//
// 	setVal(ws, 'M', rowOffset, parseFloat(a0_due_count || 0).toFixed(0), {border: true, width: 20, fill: true});
// 	setVal(ws, 'N', rowOffset, parseFloat(a0_due || 0).toFixed(0), {border: true, width: 20, fill: true});
//
// 	saveFileAndReturnCallback(workbook, clientId, fName, fName, callback);
// };

module.exports.assetsCategoryReport = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet('Asset Category Report');
	formatTitle(ws, 16, 'Asset Category Report');
	let headers = ["Category", "C.Act Slab", "IT.Act Slab", "Category Code", "Description", "Date", "C.Act SLM Rate", "IT.Act SLM Rate", "C.Act WDV Rate", "IT.Act WDV Rate"];
	let rowNum = 5;
	formatColumnHeaders(ws, 4, headers, [13, 13, 13, 13, 13, 13, 13, 13, 16, 16, 16, 16]);

	for (let obj of aData) {
		// mergeCells(ws, (rowNum++), 7, obj._id.groupName);

		let count = 1;
		let row = {};
		row["Category"] = obj.category;
		row["C.Act Slab"] = obj.CActSlab || 'NA';
		row["IT.Act Slab"] = obj.ITActslab || 'NA';
		row["Category Code"] = obj.categoryCode || 'NA';
		row["Description"] = obj.description || 'NA';
		// row["Account"] = obj.account || 'NA';
		row["Date"] = obj.aRates[obj.aRates.length - 1].effectiveDate || 'NA';
		row["C.Act SLM Rate"] = obj.aRates[obj.aRates.length - 1].CActRateSLM || 'NA';
		row["IT.Act SLM Rate"] = obj.aRates[obj.aRates.length - 1].ITActRateSLM || 'NA';
		row["C.Act WDV Rate"] = obj.aRates[obj.aRates.length - 1].CActRateWDV || 'NA';
		row["IT.Act WDV Rate"] = obj.aRates[obj.aRates.length - 1].ITActRateWDV || 'NA';

		addWorkbookRow(row, ws, headers, (rowNum++));

	}

	saveFileAndReturnCallback(workbook, clientId, 'Asset Category Report', 'Asset Category Report', callback);

};

module.exports.rtpGap = function (aData, clientId, body, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet("RTP Gap Report");
	let headers = ['S.No', 'RT No', 'Vehicle No', 'Missing Start Date', 'Missing End Date', 'Gap Days', 'Suspense Amount', 'Last Trip Settlement Date'];
	formatTitle(ws1, headers.length, "RTP Gap Report");
	let fromDate = moment(new Date(body.from)).format("DD-MM-YYYY");
	let toDate = moment(new Date(body.to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, 'A2', 'H2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);

	formatColumnHeaders(ws1, 3, headers, [10, 15, 15, 15, 15, 15, 15, 25]);
	let rowNum = 4;
	let cnt = 0;
	aData.forEach(o => {
		o.data.forEach(obj => {
			let row = {};
			cnt++;
			let isMissing = (obj.mStartDate && obj.mEndDate) ? true : false;
			row["S.No"] = cnt || '0';
			row["RT No"] = obj.rtNo || 'NA';
			row["Vehicle No"] = obj.vehicle_no || 'NA';
			row["Missing Start Date"] = isMissing ? moment(obj.mStartDate).format("DD-MM-YYYY") : 'NA';
			row["Missing End Date"] = isMissing ? moment(obj.mEndDate).format("DD-MM-YYYY") : 'NA';
			row["Gap Days"] = isMissing ? dateUtil.calDays(obj.mEndDate, obj.mStartDate) : 'NA';                          //noOfDays
			row["Suspense Amount"] = obj.suspense || 'NA';
			row["Last Trip Settlement Date"] = obj.settlemntDate ? moment(obj.settlemntDate).format("DD-MM-YYYY") : 'NA';

			addWorkbookRow(row, ws1, headers, (rowNum++))
		});

	});
	saveFileAndReturnCallback(workbook, clientId, 'RTP Gap Report', 'RTP Gap Report', callback);
};

function toAlphabet(decimalNumber) {

	const alphabet = 'ZABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const alpLen = 26;
	const maxSize = calculateSize(decimalNumber);
	let str = '';
	let remainderFlag = false;

	while (decimalNumber) {
		let rem = (decimalNumber > 26 ? decimalNumber % alpLen : decimalNumber);
		if (decimalNumber <= 26)
			decimalNumber = 1;
		if (remainderFlag) {
			remainderFlag = false;
			rem--;
		}
		if (rem == 0)
			remainderFlag = true;

		str += alphabet[rem];
		decimalNumber = parseInt(decimalNumber / alpLen);
	}

	return reverseString(str).slice(0, maxSize);

	function calculateSize(num) {
		let counter = 1,
			pow = 0,
			size;

		while ((pow += Math.pow(26, counter))) {
			size = counter++;
			if (pow >= num)
				break;
		}
		return size;
	}

	function reverseString(str) {
		let revStr = '';
		for (let i = str.length - 1; i >= 0; i--)
			revStr += str[i];
		return revStr;
	}
}

function numToAlpha(n) {
	let ordA = 'a'.charCodeAt(0);
	let ordZ = 'z'.charCodeAt(0);
	let len = ordZ - ordA + 1;

	let s = "";
	while (n >= 0) {
		s = String.fromCharCode(n % len + ordA) + s;
		n = Math.floor(n / len) - 1;
	}
	return s.toUpperCase();
}

function setVal(worksheet, column, row, value = '', prop = {}) {
	let cell = worksheet.getCell(column + row);
	cell.value = value;
	if (prop.fill) {
		cell.fill = typeof prop.fill === 'boolean' ? columnFill : {
			type: 'pattern',
			pattern: 'solid',
			fgColor: {
				argb: prop.fill
			}
		};
	}

	if (prop.cellColor) {
		cell.fill = typeof prop.fill === 'boolean' ? columnFill : {
			type: 'pattern',
			pattern: 'solid',
			fgColor: {
				argb: 'f2da97'
			}
		};
	}

	if (prop.border) {
		cell.border = {
			top: {style: 'thin'},
			left: {style: 'thin'},
			bottom: {style: 'thin'},
			right: {style: 'thin'}
		};
	}
	if (prop.width) {
		worksheet.getColumn(column).width = prop.width;
	}
	if (prop.bold) {
		cell.font = {
			name: 'Arial Black',
			bold:true,
			family: 2,
			size: 11,
			// italic: true
		};
	}
	if (prop.align) {
		cell.alignment = {vertical: 'middle', horizontal: 'center'};

	}

	if (prop.format) {
		setCellNumFormat(worksheet, column + row)
		// cell.numFmt = '##,##,##,##,##,##0.##';
		// worksheet.getColumn(column).numFmt = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'
	}
	if (prop.formatC) {
		setCellNumFormatCount(worksheet, column + row)
		cell.alignment = {vertical: 'middle', horizontal: 'right'};
	}
	if (prop.setFormat) {
		setCellNumFormat(worksheet, column + row, '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)')
		// cell.numFmt = '##,##,##,##,##,##0.##';
		// worksheet.getColumn(column).numFmt = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'
	}
}

function setVal2(worksheet, cell, value = '', prop = {}) {
	// let cell = worksheet.getCell(column + row);
	cell.value = value;
	if (prop.fill) {
		cell.fill = typeof prop.fill === 'boolean' ? columnFill : {
			type: 'pattern',
			pattern: 'solid',
			fgColor: {
				argb: prop.fill
			}
		};
	}

	if (prop.cellColor) {
		cell.fill = typeof prop.fill === 'boolean' ? columnFill : {
			type: 'pattern',
			pattern: 'solid',
			fgColor: {
				argb: 'f2da97'
			}
		};
	}

	if (prop.setColor) {
		cell.fill = prop.setColor;
	}

	if (prop.border) {
		cell.border = {
			top: {style: 'thin'},
			left: {style: 'thin'},
			bottom: {style: 'thin'},
			right: {style: 'thin'}
		};
	}
	if (prop.width) {
		worksheet.getColumn(cell._address.slice(0, -1)).width = prop.width;
	}
	if (prop.align) {
		cell.alignment = {vertical: 'middle', horizontal: 'center'};

	}

	if (prop.format) {
		setCellNumFormat(worksheet, cell._address);
	}

	if (prop.setFormat) {
		setCellNumFormat(worksheet, cell._address, '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)')
		// cell.numFmt = '##,##,##,##,##,##0.##';
		// worksheet.getColumn(column).numFmt = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'
	}
}

// //Account Balance Report
module.exports.accBalReport = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Account Balance Report`);
	formatTitle(ws1, 4, `Account Balance Report`);
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, 'A2', 'D2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);
	let headers = ['Account', 'Month', 'Closing Bal.', 'Cl. Dr/Cr'];
	formatColumnHeaders(ws1, 3, headers, [22, 13, 13, 13]);
	let rowNum = 4;
	var a = 0;
	aData.forEach(obj => {
		let row = {};
		if (a === 0 && obj.cb === 0) {
			row["Account"] = obj.acntName || (obj.account && obj.account.name) || 'NA';
			row["Month"] = obj.date ? moment(obj.date).format("01-MM-YYYY") : 'NA';
			row['Closing Bal.'] = Math.abs(obj.cb) || 0;
// row['Closing Bal.'] = "rr"|| 0;

			if (obj.cb > 0)
				row['Cl. Dr/Cr'] = 'Dr';
			else
				row['Cl. Dr/Cr'] = 'Cr';
			a++;
		} else {
			row["Account"] = obj.acntName || (obj.account && obj.account.name) || 'NA';
			row["Month"] = obj.date ? moment(obj.date).format("01-MM-YYYY") : 'NA';
			row['Closing Bal.'] = Math.abs(obj.cb) || 0;

			if (obj.cb > 0)
				row['Cl. Dr/Cr'] = 'Dr';
			else
				row['Cl. Dr/Cr'] = 'Cr';
		}
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Account Balance Report', 'Account Balance Report', callback);
}

//Account Balance Monthly New Report
module.exports.accBalReportMonthly = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Account Balance Report`);
	let headers = ['S.No', 'Account', 'Date', 'Opening Bal.', 'Op. Dr/Cr', 'Debit Amt', 'Credit Amt', 'Closing Bal.', 'Cl. Dr/Cr'];
	formatTitle(ws1, headers.length, `Account Balance Report`);
	formatColumnHeaders(ws1, 3, headers, [6, 22, 12, 15, 12, 15, 15, 15, 12]);
	let rowNum = 4;
	let count = 1;
	aData.forEach(obj => {
		let row = {};
		row["S.No"] = count++;
		row["Account"] = obj.acntName || (obj.account && obj.account.name) || 'NA';
		row["Date"] = obj.date ? moment(obj.date).format("MMM-YYYY") : 'NA';
		row['Opening Bal.'] = Math.abs(obj.ob) || 0;
		if (obj.ob < 0)
			row['Op. Dr/Cr'] = 'Cr';
		else
			row['Op. Dr/Cr'] = 'Dr';

		row['Debit Amt'] = obj.dr || 0;
		row['Credit Amt'] = obj.cr || 0;
		row['Closing Bal.'] = Math.abs(obj.cb) || 0;

		if (obj.cb > 0)
			row['Cl. Dr/Cr'] = 'Dr';
		else
			row['Cl. Dr/Cr'] = 'Cr';

		let cell = toAlphabet(4) + rowNum;
		let cell2 = toAlphabet(6) + rowNum;
		let cell3 = toAlphabet(7) + rowNum;
		let cell4 = toAlphabet(8) + rowNum;
		setCellNumFormat(ws1, cell);
		setCellNumFormat(ws1, cell2);
		setCellNumFormat(ws1, cell3);
		setCellNumFormat(ws1, cell4);

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Account Balance Report', 'Account Balance Report', callback);
}

//account Balance monthly[dynamicHeader] report
module.exports.accBalMonthlyReport = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Account Balance Monthly Report`);
	formatTitle(ws1, 4, `Account Balance Monthly Report`);
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, 'A2', 'D2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);
	let aHeader = ['Account'];
	let rowCounter = 4;
	prepareHeadersForMonth(aHeader, from, to);
	formatColumnHeaders(ws1, 3, aHeader, [...Array(aHeader.length).fill(15), 15]);
	aData.forEach((oData) => {
		ws1.getCell(getNextAlphabet(0) + rowCounter).value = oData.name || (oData.account && oData.account.name) || 'NA';
		let index = 1;
		while (index < aHeader.length) {
			let sMonth = aHeader[index];
			ws1.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((oData[sMonth] && oData[sMonth].cb || 0), 0);
			index++;
		}
		rowCounter++;
	});

	saveFileAndReturnCallback(workbook, clientId, 'Account Balance Monthly Report', 'Account Balance Monthly Report', callback);

	function getNextAlphabet(range) {
		return String.fromCharCode('A'.charCodeAt() + range);
	}
}

module.exports.podReport = function (aData, to, from, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('POD Report');
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, 'A2', 'G2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);

	let headers = ["S.No", "GR Date", "Vehicle No", "Customer", "Consignor", "Consignee", "Vendor", "Vendor Mob.No", "GR Status", "Bill Status", "Uplaod Doc Status"];

	let rowNum = 5;
	formatTitle(ws1, 7, "POD Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 10, 10, 10, 10, 10, 10]);

	// aData.forEach(obj => {
	for (let i = 0; i < aData.length; i++) {
		let obj = aData[i];

		let row = {};
		row["S.No"] = i;
		row["GR Date"] = moment(new Date(obj.grDate)).format("DD-MM-YYYY") || 'NA';
		row["Customer"] = obj.customer || 'NA';
		row["Consignee"] = obj.consignee || 'NA';
		row["Consignor"] = obj.consignor || 'NA';
		row["Vendor"] = obj.LR_Total_Freight || 'NA';
		row["Vendor Mob.No"] = obj.LR_Total_Freight || 'NA';
		row["GR Status"] = obj.statuses || 'NA';
		if (obj.bill) {
			row["Bill Status"] = "Billed";
		} else {
			row["Bill Status"] = "Unbilled";
		}
		if (obj.noOfDocs > 0) {
			row["Uplaod Doc Status"] = "Uploaded";
		} else {
			row["Uplaod Doc Status"] = "Not Uploaded";
		}
		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	saveFileAndReturnCallback(workbook, clientId, 'POD Report', 'POD Report', callback);
};

function prepareHeadersForMonth(aHeader, from, to) {
	if (!aHeader) aHeader = [];
	let startMonthYear = new Date(from);
	startMonthYear.setDate(1);
	startMonthYear.setHours(0, 0, 0, 0);
	let endMonth = new Date(to);
	endMonth.setDate(1);
	endMonth.setHours(0, 0, 0, 0);
	aHeader.push(moment(startMonthYear).format('MM-YYYY'));
	let cMonth = startMonthYear.getMonth();
	startMonthYear.setMonth(cMonth + 1);
	while (new Date(startMonthYear) <= new Date(endMonth)) {
		aHeader.push(moment(startMonthYear).format('MM-YYYY'));
		cMonth = startMonthYear.getMonth();
		startMonthYear.setMonth(cMonth + 1);
	}
	return aHeader;
}

function prepareHeadersForDaywise(aHeader, from, to) {
	if (!aHeader) aHeader = [];
	let startDayMonthYear = new Date(from);
	startDayMonthYear.setHours(0, 0, 0, 0);
	let endDayMonthYear = new Date(to);
	endDayMonthYear.setHours(0, 0, 0, 0);
	aHeader.push(moment(startDayMonthYear).format('DD-MM-YYYY'));
	let cDay = startDayMonthYear.getDate();
	startDayMonthYear.setDate(cDay + 1);
	while (new Date(startDayMonthYear) <= new Date(endDayMonthYear)) {
		aHeader.push(moment(startDayMonthYear).format('DD-MM-YYYY'));
		cDay = startDayMonthYear.getDate();
		startDayMonthYear.setDate(cDay + 1);
	}
	return aHeader;
}

function prepareHeadersForMonthOnly(aHeader, from, to) {
	if (!aHeader) aHeader = [];
	let startMonthYear = new Date(from);
	startMonthYear.setDate(1);
	startMonthYear.setHours(0, 0, 0, 0);
	let endMonth = new Date(to);
	endMonth.setDate(1);
	endMonth.setHours(0, 0, 0, 0);
	aHeader.push(moment(startMonthYear).format('MMMM'));
	let cMonth = startMonthYear.getMonth();
	startMonthYear.setMonth(cMonth + 1);
	while (new Date(startMonthYear) <= new Date(endMonth)) {
		aHeader.push(moment(startMonthYear).format('MMMM'));
		cMonth = startMonthYear.getMonth();
		startMonthYear.setMonth(cMonth + 1);
	}
	return aHeader;
}


module.exports.tdsExcReport = function (aData, from, to, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`TDS Report`);
	formatTitle(ws1, 11, `TDS Report`);
	fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, 'A2', 'K2', 'From   ' + fromDate + '   	To  ' + toDate, false, true);
	ws1.mergeCells(`A3:C3`);
	setVal(ws1, 'B', 3, "Deductees details", {border: true, fill: true});
	ws1.mergeCells(`D3:G3`);
	setVal(ws1, 'D', 3, "Deduction details", {border: true, fill: true});
	ws1.mergeCells(`H3:K3`);
	setVal(ws1, 'H', 3, "Challan details", {border: true, fill: true});
	let headers = ['PAN', 'Deductee Name', 'Employee Ref No', 'Section Code', 'Total Amount credited', 'Date of credit', 'Amount of TDS/Surcharge/Cess', 'Challan No.', 'BSR Code', 'Challan deposit date', 'TDS amount/Interest/Late filing fee'];
	formatColumnHeaders(ws1, 4, headers, [13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13]);
	let rowNum = 5;
	var a = 0;
	aData.forEach(obj => {
		let row = {};
		row["PAN"] = obj.acntName || 'NA';
		row["Deductee Name"] = obj.DeducteeName || 'NA';
		row['Employee Ref No'] = obj.refNo || 'NA';
		row["Section Code"] = obj.tdsSection || 'NA';
		row["Total Amount credited"] = obj.amount || 0;
		row['Date of credit'] = obj.date ? moment(obj.date).format("DD-MM-YYYY") : 'NA';
		row['Amount of TDS/Surcharge/Cess'] = obj.tdsAmount || 0;
		row['Challan No.'] = obj.acntName || 'NA';
		row['BSR Code'] = obj.acntName || 'NA';
		row['Challan deposit date'] = obj.acntName || 'NA';
		row['TDS amount/Interest/Late filing fee'] = obj.tdsAmount || 0;

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'TDS Report', 'TDS Report', callback);
}
// DriverAssociation
module.exports.driverVehicleAssoc = function (aData, req, callback) {
    let clientId=req.body.clientId;
	let clientAccess=req && req.access && req.access["Driver And Vehicle Association"]["Assistant Driver"]?true:false;
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Driver & Vehicle Association Report');

	let headers = [
		"S.NO.",
		"ASSOCIATION DATE",
		"DIS-SSOCIATION DATE",
		"VEHICLE NO.",
		"DRIVER CODE",
		"DRIVER NAME",
		"APPLICATION DATE",
		"FATHER NAME",
		"MOB. NO",
		"ALTERNATE NUMBER",
		"DOB",
		"ADDRESS",
		"RELIGION",
		"GUARANTOR NAME",
		"GUARANTOR MOB NAME",
		"LICENSE NO",
		"LICENSE ISSUE AUHORITY",
		"LICENSE EXPIRE DATE",
		"EXPERIENCE",
		"ASSOCIATION ENTRY BY",
		"DISASSOCIATION ENTRY BY",
		"ASSOCIATION REMARK",
		"DISASSOCIATION REMARK",
		"GPS ODO ASSOCIATION",
		"GPS ODO DISASSOCIATION",
		"VEH ODO ASSOCIATION",
		"VEH ODO DISASSOCIATION"
	];
	let h1=["Assistant Driver","Assistant Driver Mob. No."];
	if(clientAccess){
		headers.push(...h1)
	}

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Driver & Vehicle Association Report");
	formatColumnHeaders(ws1, 4, headers, [5, 22, 22, 15, 15, 22, 22, 22, 22, 22, 22, 22, 22,22, 22, 22, 22, 22, 22, 22, 22,22, 22, 22, 22, 22, 22, 22, 22,22,22]);
	let count = 1;
	aData.forEach(obj => {
		let row = {};
		row["S.NO."] = count++;
		row["ASSOCIATION DATE"] = obj._doc.ass_date && moment(new Date(obj._doc.ass_date)).format("DD-MM-YYYY") || 'NA';
		row["DIS-SSOCIATION DATE"] = obj._doc.disass_date && moment(new Date(obj._doc.disass_date)).format("DD-MM-YYYY") || 'NA';
		row["VEHICLE NO."] = (obj._doc && obj._doc.vehicle && obj._doc.vehicle.vehicle_reg_no) || 'NA';
		row["DRIVER CODE"] = (obj._doc && obj._doc.driver && obj._doc.driver._doc.employee_code) || 'NA';
		row["DRIVER NAME"] = (obj._doc && obj._doc.driver && obj._doc.driver.name) || 'NA';
		row["APPLICATION DATE"] = (obj._doc && obj._doc.driver && obj._doc.driver.date_of_joining) && moment(new Date(obj._doc.driver.date_of_joining)).format("DD-MM-YYYY") || 'NA';
		row["FATHER NAME"] = (obj._doc && obj._doc.driver && obj._doc.driver.father_name) || 'NA';
		row["MOB. NO"] = (obj._doc && obj._doc.driver && obj._doc.driver.prim_contact_no) || 'NA';
		row["ALTERNATE NUMBER"] = (obj._doc && obj._doc.driver && obj._doc.driver.alt_contact_no1) || 'NA';
		row["DOB"] = (obj._doc && obj._doc.driver && obj._doc.driver.dob) || 'NA';
		row["ADDRESS"] = (obj._doc && obj._doc.driver && obj._doc.driver.permanent_address) || 'NA';
		row["RELIGION"] = (obj._doc && obj._doc.driver && obj._doc.driver.religion) || 'NA';
		row["GUARANTOR NAME"] = (obj._doc && obj._doc.driver && obj._doc.driver.guarantor_name) || 'NA';
		row["GUARANTOR MOB NAME"] = (obj._doc && obj._doc.driver && obj._doc.driver.guarantor_contact_no) || 'NA';
		row["LICENSE NO"] = (obj._doc && obj._doc.driver && obj._doc.driver.license_no) || 'NA';
		row["LICENSE ISSUE AUHORITY"] = (obj._doc && obj._doc.driver && obj._doc.driver.license_issuing_date) &&  moment(new Date(obj._doc.driver.license_issuing_date)).format("DD-MM-YYYY") || 'NA';
		row["LICENSE EXPIRE DATE"] = (obj._doc && obj._doc.driver && obj._doc.driver.license_expiry_date) && moment(new Date(obj._doc.driver.license_expiry_date)).format("DD-MM-YYYY") || 'NA';
		row["EXPERIENCE"] = (obj._doc && obj._doc.driver && obj._doc.driver.experience) || 'NA';
		row["ASSOCIATION ENTRY BY"] = (obj._doc && obj._doc.ass_by && obj._doc.ass_by._doc && obj._doc.ass_by._doc.full_name) || 'NA';
		row["DISASSOCIATION ENTRY BY"] = (obj._doc && obj._doc.disass_by && obj._doc.disass_by._doc && obj._doc.disass_by._doc.full_name) || 'NA';
		row["ASSOCIATION REMARK"] = obj._doc && obj._doc.ass_remark || 'NA';
		row["DISASSOCIATION REMARK"] = obj._doc && obj._doc.disass_remark || 'NA';
		row["GPS ODO ASSOCIATION"] = obj._doc && (obj._doc.ass_gps_odo || 0) / 1000 || 'NA';
		row["GPS ODO DISASSOCIATION"] = obj._doc && (obj._doc.disass_gps_odo || 0) / 1000 || 'NA';
		row["VEH ODO ASSOCIATION"] = obj._doc && obj._doc.ass_veh_odo || 'NA';
		row["VEH ODO DISASSOCIATION"] = obj._doc && obj._doc.disass_veh_odo || 'NA';
		if(clientAccess){
			row["Assistant Driver"] = obj._doc && obj._doc.driver2 && obj._doc.driver2.name || 'NA';
			row["Assistant Driver Mob. No."] = obj._doc && obj._doc.driver2 && obj._doc.driver2.prim_contact_no || 'NA';
		}

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'Driver & Vehicle Association Report', 'Driver & Vehicle Association Report', callback);
};

module.exports.vehMonthlyPerformanceRpt = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`vehicle Monthly Performance Report`);
	let headers = ['Vehicle No', 'Fleet', 'Total Revenue', 'Total Advance', 'Profit', 'Percent(%)', 'No of Trip'];
	formatTitle(ws1, headers.length, `vehicle Monthly Performance Report`);
	formatColumnHeaders(ws1, 3, headers, [12, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	aData.forEach(obj => {
		let row = {};
		row["Vehicle No"] = obj._id || 'NA';
		row["Fleet"] = obj.fleet || 'NA';
		row["Total Revenue"] = obj.totFreight || 0;
		let totAdv = ((obj.totAdv || 0) + (obj.totExp || 0)) || 0;
		row["Total Advance"] = totAdv
		row["Profit"] = (obj.totFreight - totAdv) || 0;
		row["Percent(%)"] = (totAdv && !obj.totFreight) ? 0 : parseFloat((((totAdv || 0) * 100 / (obj.totFreight || 0)) || 0).toFixed(2));
		row["No of Trip"] = obj.count || 0;

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'MonthlyPerformanceRpt', 'MonthlyPerformanceReport', callback);
}

module.exports.tripsheetSummReport = function(aData, reqBody, clientId, callback){
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet("Tripsheet Summary Report");
	let headers = ['Sr No', "Vehicle No", "Route Details", "Hours", "Route Km", "Trip Date", "RT no", "Driver Name","Driver Code", "On Vehicle", "Driver Licence No", "Advance", "Fuel Vendor", "Diesel Ltr", "Diesel Amt", "Toll", "Total Exp", "Driver Opening Bal", "Driver Closing Bal"];
	formatTitle(ws1, headers.length, `Tripsheet Summary Report`);
	formatColumnHeaders(ws1, 3, headers, [15, 15, 22, 15, 15, 30, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 22, 22]);
	let rowNum = 4;
	let count = 1;

	try{
		aData.forEach( oData => {

			let dataCount = 0, totKm =0;
			let totalHours = 0, totalAdvance = 0, totalDieselLtr = 0, totalDieselAmt = 0, totalToll = 0, totalExp = 0, totalOpBal = 0, totalClBal = 0;

			oData.forEach(obj => {
				row = {};
				if(dataCount === 0)
				{
					row['Sr No'] = count++;
					row["Vehicle No"] = obj.vehicle_no || "NA";
					row["RT no"] = obj.advSettled && obj.advSettled.tsNo || "NA";
					row["Driver Name"] = (obj.driver && obj.driver.name) || "NA";
					row["Driver Code"] = (obj.driver && obj.driver.employee_code) || "NA";
					row["On Vehicle"] = obj.allocation_date && moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") || 'NA'
					row["Driver Licence No"] = (obj.driver && obj.driver.license_no) || "NA";
					row["Diesel Ltr"] = obj.summary && obj.summary.dieselGivLit || 0;
					totalDieselLtr += parseFloat(row["Diesel Ltr"]);
					row["Diesel Amt"] = obj.summary && obj.summary.dieselGivAmt || 0;
					totalDieselAmt += parseFloat(row["Diesel Amt"]);
					row["Toll"] = (obj.summary && obj.summary.netAdvObj && obj.summary.netAdvObj.fastag) || 0;
					totalToll += parseFloat(row["Toll"]);
					row["Total Exp"] = obj.summary && obj.summary.netExpense || 0;
					totalExp += parseFloat(row["Total Exp"]);
					row["Driver Opening Bal"] = (obj.summary && obj.summary.openCloseBal && obj.summary.openCloseBal.driver && obj.summary.openCloseBal.driver.opening) || 0;
					totalOpBal += parseFloat(row["Driver Opening Bal"]);
					row["Driver Closing Bal"] = (obj.summary && obj.summary.openCloseBal && obj.summary.openCloseBal.driver && obj.summary.openCloseBal.driver.closing) || 0;
					totalClBal += parseFloat(row["Driver Closing Bal"]);

					dataCount++;
				}else{
					row['Sr No'] = " ";
					row["Vehicle No"] = " " || "NA";
					row["RT no"] = " " ;
					row["Driver Name"] = " ";
					row["Driver Code"] = " ";
					row["On Vehicle"] = " ";
					row["Driver Licence No"] = " ";
					// row["Advance"] = " ";
					row["Diesel Ltr"] = " ";
					row["Diesel Amt"] = " ";
					row["Toll"] = " ";
					row["Total Exp"] = " ";
					row["Driver Opening Bal"] = " ";
					row["Driver Closing Bal"] = " ";
				}

				row["Route Details"] = obj.route_name || "NA";
				let hour = Math.abs((obj.end_date && new Date(obj.end_date)) - (obj.start_date && new Date(obj.start_date))  )  || 0;
				row["Hours"] = parseFloat(hour/ 36e5).toFixed(2);
				totalHours += parseFloat(row["Hours"]);
				// row["Trip Date"] = ( obj.start_date && moment(new Date(obj.start_date)).format("DD-MM-YYYY") ) ?
				// 	(  (obj.start_date && moment(new Date(obj.start_date)).format("DD-MM-YYYY") +  " to ") +
				// 			( obj.end_date && moment(new Date(obj.end_date)).format("DD-MM-YYYY") ) ?
				// 				( obj.end_date && moment(new Date(obj.end_date)).format("DD-MM-YYYY") )    : "NA"
				// 	)  : "NA";
				row["Trip Date"] = (obj.start_date && obj.end_date) ? (moment(new Date(obj.start_date)).format("DD-MM-YYYY") + " to " + moment(new Date(obj.end_date)).format("DD-MM-YYYY") ) : "NA";
				row["Advance"] = obj.tAdv || 0;
				totalAdvance += parseFloat(row["Advance"]);
				row["Route Km"] = (obj.route && obj.route.route_distance) || "NA";
				totKm += parseFloat(row["Route Km"]);
				let adv = obj.advanceBudget.filter( o => (o.advanceType.toString()) === "Diesel" ) ;
				row["Fuel Vendor"] = adv.map(o => (o.dieseInfo && o.dieseInfo._vendorName)).join(',') || "NA";
				addWorkbookRow(row, ws1, headers, (rowNum++));

			})
			setVal(ws1, 'C', rowNum, 'TOTAL', {fill: 'ccccff'});
			setVal(ws1, 'D', rowNum,  (totalHours).toFixed(2), {fill: 'ccccff'});
			setVal(ws1, 'E', rowNum,  (totKm), {fill: 'ccccff'});
			setVal(ws1, 'K', rowNum, 'TOTAL', {fill: 'ccccff'});
			setVal(ws1, 'L', rowNum,  (totalAdvance).toFixed(2), {fill: 'ccccff'});
			setVal(ws1, 'N', rowNum,  (totalDieselLtr).toFixed(2), {fill: 'ccccff'});
			setVal(ws1, 'O', rowNum,  (totalDieselAmt).toFixed(2), {fill: 'ccccff'});
			setVal(ws1, 'P', rowNum,  (totalToll).toFixed(2), {fill: 'ccccff'});
			setVal(ws1, 'Q', rowNum,  (totalExp).toFixed(2), {fill: 'ccccff'});
			setVal(ws1, 'R', rowNum,  (totalOpBal).toFixed(2), {fill: 'ccccff'});
			setVal(ws1, 'S', rowNum,  (totalClBal).toFixed(2), {fill: 'ccccff'});
			rowNum = rowNum+2 ;
		});
	}catch (e) {
		throw e;
	}
	saveFileAndReturnCallback(workbook, clientId, 'Tripsheet Summary', 'TripsheetSummaryReport', callback);
}
module.exports.tripComparisonReport = function (data, reqBody, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws = workbook.addWorksheet(`Trip Comparison Report - ` + reqBody.rptType);
	formatTitle(ws, 4, `Trip Comparison Report - ` + reqBody.rptType);
	let aHeader = ['Fleet'], aMonth = [];
	prepareHeadersForMonth(aHeader, from, to);
	prepareHeadersForMonth(aMonth, from, to);
	let rowCounter = 4, totalDiff = 0, arrNetTotal = {}, arrNetTotal1 = {};
	oData = data.massageData;
	aData = data.massageFleetData;
	let aHeader1 = ['Segment', aHeader[aHeader.length - 2], aHeader[aHeader.length - 1], 'Difference'];
	formatColumnHeaders(ws, 3, aHeader1, [...Array(aHeader1.length).fill(15), 15]);
	formatColumnHeaders(ws, Object.keys(oData).length + 6, aHeader, [...Array(aHeader.length).fill(15), 15]);

	for (var obj in oData) {
		ws.getCell(getNextAlphabet(0) + rowCounter).value = obj || '';

		let total = 0,
			index = 1, month1 = 0, month2 = 0;

		while (index < aHeader1.length - 1) {
			let sMonth = aHeader1[index];
			// total += (oData[sMonth] && oData[sMonth].month || 0);
			arrNetTotal1[sMonth] = arrNetTotal1[sMonth] || 0;
			arrNetTotal1[sMonth] += (oData[obj][sMonth] || 0);
			if (index === 1)
				month1 = oData[obj][sMonth] || 0;
			if (index === 2)
				month2 = oData[obj][sMonth] || 0;
			ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((oData[obj][sMonth] || 0), 0);

			index++;
		}
		totalDiff += ws.getCell(getNextAlphabet(3) + (rowCounter)).value = helperFn.toFixed((month2 - month1), 0);

		rowCounter++;
	}
	mergeCells(ws, rowCounter, 1, 'Grand Total');
	// let totalNetTotal = 0, index = 1;
	for (index = 1; index < aHeader1.length; index++) {
		ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((arrNetTotal1[aHeader1[index]]), 0);
	}
	ws.getCell(getNextAlphabet(3) + rowCounter).value = helperFn.toFixed(totalDiff, 0);

	rowCounter = Object.keys(oData).length + 7;
	// aData.forEach(obj => {
	for (var obj in aData) {
		ws.getCell(getNextAlphabet(0) + rowCounter).value = obj || 'dummy';

		// obj.items.forEach(oData => {
		// for(var oData in obj.segmentData) {
		// 	ws.getCell(getNextAlphabet(1) + rowCounter).value = oData || 'NA';

		let total = 0,
			index = 1;

		while (index < aHeader.length) {
			let sMonth = aHeader[index];
			// total += oData[sMonth]  || 0;
			arrNetTotal[sMonth] = arrNetTotal[sMonth] || 0;
			arrNetTotal[sMonth] += (aData[obj][sMonth] || 0);
			ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((aData[obj][sMonth] || 0), 0);  //[oData][sMonth]
			index++;
		}
		rowCounter++;

		// }
		// })

	}

	mergeCells(ws, rowCounter, 1, 'Grand Total');
	for (index = 1; index < aHeader.length; index++) {
		ws.getCell(getNextAlphabet(index) + rowCounter).value = helperFn.toFixed((arrNetTotal[aHeader[index]]), 0);
	}

	function getNextAlphabet(range) {
		return String.fromCharCode('A'.charCodeAt() + range);
	}

	saveFileAndReturnCallback(workbook, clientId, 'Trip Comparison Report - ' + reqBody.rptType, 'Trip Comparison Report - ' + reqBody.rptType, callback);
};

module.exports.hirePaymentRpt = function (aData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`hirePayment Report`);
	let headers = ['Office', 'Deal Date', 'Vehicle No', 'Hire Slip No', 'Voucher No', 'Date', 'CH. Wise Amt', 'Amount', 'Basic Charges', 'Rem Amount', 'Cr Name', 'Dr Name', 'Vendor Name', 'Pan Card No', 'Broker Name', 'Narration'];
	formatTitle(ws1, headers.length, `hirePayment Report`);
	formatColumnHeaders(ws1, 3, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
	let rowNum = 4;
	aData.forEach(obj => {
		let extraTds = 0;
		if (obj.vendorDeal && obj.vendorDeal.charges) {
			allCharges = {
				...obj.vendorDeal.charges,
			};

			if (!allCharges)
				return extraTds;
			for (let k in allCharges) {
				if (allCharges.hasOwnProperty(k))
					extraTds = extraTds + (allCharges[k]['tdsAmount'] || 0);
			}
		}
		if (obj.advanceBudget && obj.advanceBudget.length) {
			obj.advanceBudget.forEach(adv => {
				let row = {};
				row["Office"] = obj.branch && obj.branch.name || 'NA';
				row["Deal Date"] = obj.vendorDeal && obj.vendorDeal.deal_at && moment(new Date(obj.vendorDeal.deal_at)).format("DD-MM-YYYY") || 'NA';
				row["Vehicle No"] = obj.vehicle && obj.vehicle.vehicle_no || 0;
				row["Hire Slip No"] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
				row["Voucher No"] = adv.reference_no || 'NA';
				row["Date"] = adv.date && moment(new Date(adv.date)).format("DD-MM-YYYY") || 'NA';
				row["CH. Wise Amt"] = adv.amount || 0;
				let totAmount = obj.vendorDeal && ((obj.vendorDeal.totWithMunshiyana || 0) + (obj.vendorDeal.totalCharges || 0) - (obj.vendorDeal.totalDeduction || 0) - (obj.vendorDeal.tdsAmount || 0) - (extraTds || 0))
				row["Amount"] = totAmount || 0;
				row["Basic Charges"] = obj.vendorDeal && obj.vendorDeal.totalCharges || 0;
				// row["Rem Amount"] = (totAmount - adv.amount) || 0;
				row["Rem Amount"] = ((adv.remainingAmount || 0) - (adv.amount || 0));
				row["Cr Name"] = adv.FromAc && adv.FromAc.name || 'NA';
				row["Dr Name"] = adv.toAc && adv.toAc.name || 'NA';
				row["Vendor Name"] = obj.vendor && obj.vendor.name || 'NA';
				row["Pan Card No"] = obj.vendor && obj.vendor.pan || 'NA';
				row["Broker Name"] = obj.vendorDeal && obj.vendorDeal.broker && obj.vendorDeal.broker.name || 'NA';
				row["Narration"] = adv.narration || 'NA';

				addWorkbookRow(row, ws1, headers, (rowNum++));
			});
		} else {
			let row = {};
			row["Office"] = obj.branch && obj.branch.name || 'NA';
			row["Deal Date"] = obj.vendorDeal && obj.vendorDeal.deal_at && moment(new Date(obj.vendorDeal.deal_at)).format("DD-MM-YYYY") || 'NA';
			row["Vehicle No"] = obj.vehicle && obj.vehicle.vehicle_no || 0;
			row["Hire Slip No"] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
			row["Voucher No"] = 'NA';
			row["Date"] = 'NA';
			row["CH. Wise Amt"] = 0;
			let totAmount = obj.vendorDeal && ((obj.vendorDeal.totWithMunshiyana || 0) + (obj.vendorDeal.totalCharges || 0) - (obj.vendorDeal.totalDeduction || 0) - (obj.vendorDeal.tdsAmount || 0) - (extraTds || 0))
			row["Amount"] = totAmount || 0;
			row["Basic Charges"] = obj.vendorDeal && obj.vendorDeal.totalCharges || 0;
			row["Rem Amount"] = totAmount;
			row["Cr Name"] = 'NA';
			row["Dr Name"] = 'NA';
			row["Vendor Name"] = obj.vendor && obj.vendor.name || 'NA';
			row["Pan Card No"] = obj.vendor && obj.vendor.pan || 'NA';
			row["Broker Name"] = obj.vendorDeal && obj.vendorDeal.broker && obj.vendorDeal.broker.name || 'NA';
			row["Narration"] = 'NA';

			addWorkbookRow(row, ws1, headers, (rowNum++));
		}
	});
	saveFileAndReturnCallback(workbook, clientId, 'hirePaymentRpt', 'hirePayment Report', callback);
}

module.exports.stationaryMissingRpt = function (aData, reqBody, to, from,clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Stationary Missing Report`);
	let headers = ["From", "To", "Count", "BillBook Name", "Missing No"];
	// formatTitle(ws1, headers.length, `Missing Documents Between ` + from + to);
	var fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	var toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, "A3", "E3", `Missing Documents Between ` + fromDate + ' to ' + toDate, true, true);
	mergeCellsHandler(ws1, "A1", "E1",  clientData.client_full_name ,true, true);

	formatColumnHeaders(ws1, 5, headers, [10, 10, 10, 19, 70]);
	let rowNum = 6;
	try{
		aData.forEach(brancjObj => {
			// if()
			mergeCells(ws1, (rowNum++), 5, brancjObj._id === null ?  'Centralised Books': brancjObj._id);
			brancjObj.branchData.forEach( typeObj => {
				ws1.getCell('A' + rowNum++).value = typeObj.type;
				// mergeCells(ws1, (rowNum++), 5, typeObj.type );
				typeObj.data.forEach(obj => {
					if((obj.max- (obj.min - 1)) != obj.count){
						let row = {};
						row["From"] = obj.min || 'NA';
						row["To"] = obj.max || 'NA';
						row["Count"] = obj.count;
						row["BillBook Name"] = obj.name || 0;
						row["Missing No"] = (obj.ranges &&obj.ranges.toString()) || 'NA';

						addWorkbookRow(row, ws1, headers, (rowNum++));
					}

				})

			});

		});

		saveFileAndReturnCallback(workbook, clientId, 'Stationary Missing Report', 'Stationary Missing Report', callback);
	}catch (e) {
		throw e;
	}

};

module.exports.stationaryFullyMissing = function (aData, reqBody, to, from,clientData, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Stationary Fully Missing Report`);
	let headers = ["From", "To", "Stationary Name" , "Book Type" , "Status", "Branch", "CREATED BY" ,"CREATED AT", "LAST MODIFIED" ];
	// formatTitle(ws1, headers.length, `Missing Documents Between ` + from + to);
	// var fromDate = moment(new Date(from)).format("DD-MM-YYYY");
	// var toDate = moment(new Date(to)).format("DD-MM-YYYY");
	mergeCellsHandler(ws1, "A3", "E3", `Fully Missing Documents `, true, true);
	mergeCellsHandler(ws1, "A1", "E1",  clientData.client_full_name ,true, true);

	formatColumnHeaders(ws1, 5, headers, [10, 10, 25, 20, 20,15, 30,30,30]);
	let rowNum = 6;

	try{
		aData.forEach(obj => {
			let row = {};
			row["From"] = obj.min || 'NA';
			row["To"] = obj.max || 'NA';
			row["Stationary Name"] = obj.name;
			row["Book Type"] = obj.type || 0;
			row["Status"] = 'UNUSED';
			row["Branch"] = obj.branch && obj.branch[0] && obj.branch[0].name || 'NA';
			row["CREATED BY"] = obj.user || 'NA';
			row["CREATED AT"] = obj.created_at && moment(new Date(obj.created_at)).format("DD-MM-YYYY") || "NA";
			row["LAST MODIFIED"] = obj.last_modified_at && moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") || "NA";

			addWorkbookRow(row, ws1, headers, (rowNum++));
		});


		saveFileAndReturnCallback(workbook, clientId, 'Stationary Missing Report', 'Stationary_Fully_Missing_Report', callback);
	}catch (e) {
		throw e;
	}

};

module.exports.profit_Loss_Summ_Report = function (aData, body,clientId,clientData, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Profit and Loss Report`);

	mergeCellsHandler(ws1, "A1", "D1", clientData.client_display_name ,true, true);
	mergeCellsHandler(ws1, "A2", "D2", clientData.address ,true, true);
	mergeCellsHandler(ws1, "A3", "D3", "PROFIT AND LOSS A/C SUMMARY", true, true);
	mergeCellsHandler(ws1, "A4", "D4", moment(body.from).format("DD-MMM-YYYY") + ' to ' + moment(body.to).format("DD-MMM-YYYY"), true, true);

	let headers = ['Particulars Profit', 'Profit Account', 'Particulars Loss', 'Loss Account'];
	formatColumnHeaders(ws1, 6, headers, [27, 13, 13, 27, 13, 13]);
	let rowNum = 7;
	let maxData = Math.max((aData.profit ? aData.profit.length : 0), (aData.loss ? aData.loss.length : 0));
	let crProfit_Total = 0, drProfit_Total = 0, crLoss_Total = 0, drLoss_Total = 0 ;

	for(let i =0; i < maxData; i++){
		let row = {};
		row["Particulars Profit"] = aData.profit[i] && aData.profit[i].name;
		// row["CR Profit"] = aData.profit[i] && aData.profit[i].cat === 'CR' ? (aData.profit[i].amount).toFixed(2) : 0.00;
		row["Profit Account"] = aData.profit[i] && (aData.profit[i].amount).toFixed(2) || 0.00;
		// if(row["CR Profit"])
		// 	crProfit_Total += parseFloat(aData.profit[i].amount);
		if(row["Profit Account"])
			drProfit_Total += parseFloat(aData.profit[i].amount);
		row['Particulars Loss'] = aData.loss[i] && aData.loss[i].name;
		// row['CR Loss'] = aData.loss[i] && aData.loss[i].cat === 'CR' ? (aData.loss[i].amount).toFixed(2) : 0.00;
		row["Loss Account"] = aData.loss[i] &&  (aData.loss[i].amount).toFixed(2) || 0.00;
		// if(row['CR Loss'])
		// 	crLoss_Total +=  parseFloat(aData.loss[i].amount);
		if(row["Loss Account"])
			drLoss_Total += parseFloat(aData.loss[i].amount);

		addWorkbookRow(row, ws1, headers, (rowNum++));
	}

	setVal(ws1, 'A', rowNum, 'TOTAL', {fill: 'ccccff'});
	// setVal(ws1, 'B', rowNum,  (crProfit_Total).toFixed(2), {fill: 'ccccff'});
	setVal(ws1, 'B', rowNum, (drProfit_Total).toFixed(2), {fill: 'ccccff'});
	setVal(ws1, 'C', rowNum, 'TOTAL', {fill: 'ccccff'});
	// setVal(ws1, 'E', rowNum, (crLoss_Total).toFixed(2), {fill: 'ccccff'});
	setVal(ws1, 'D', rowNum, (drLoss_Total).toFixed(2), {fill: 'ccccff'});

	saveFileAndReturnCallback(workbook, clientId.clientId, 'Profit and Loss Report', 'ProfitandLossReport', callback);
};

module.exports.profit_Loss_Detail_Report = function (aData, body, clientId, clientData, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet(`Profit and Loss Report`);

	mergeCellsHandler(ws1, "A1", "F1", clientData.client_display_name ,true, true);
	mergeCellsHandler(ws1, "A2", "F2", clientData.address ,true, true);
	mergeCellsHandler(ws1, "A3", "F3", "PROFIT AND LOSS A/C DETAIL", true, true);
	mergeCellsHandler(ws1, "A4", "F4", moment(body.from).format("DD-MMM-YYYY") + ' to ' + moment(body.to).format("DD-MMM-YYYY"), true, true);

	let headers = ['Particulars Loss','   ', '    ',  'Particulars Profit', ' ', '  ',];
	formatColumnHeaders(ws1, 6, headers, [27, 13, 13, 27, 13, 13]);
	let rowNum = 7;
	let maxData = Math.max((aData.profit ? aData.profit.length : 0), (aData.loss ? aData.loss.length : 0) );
	let crProfit_Total = 0, drProfit_Total = 0, crLoss_Total = 0, drLoss_Total = 0 ;
	for(let i =0; i<maxData; i++){
		let row = {};
		setVal(ws1, 'A', rowNum, (aData.loss && aData.loss[i] && aData.loss[i].name?aData.loss[i].name:''), {bold:true});
		setVal(ws1, 'B', rowNum,  (' ') , {});
		setVal(ws1, 'C', rowNum,  (aData.loss && aData.loss[i] && aData.loss[i].amount)? parseFloat(aData.loss[i].amount.toFixed(2)) :0);
		setVal(ws1, 'D', rowNum, (aData.profit && aData.profit[i] && aData.profit[i].name?aData.profit[i].name:''), {bold:true});
		setVal(ws1, 'E', rowNum, (' ') , {});
		setVal(ws1, 'F', rowNum, (aData.profit && aData.profit[i] && aData.profit[i].amount)? parseFloat(aData.profit[i].amount.toFixed(2)) :0);
		rowNum++;
		let maxchild = Math.max(((aData.profit[i] && aData.profit[i].children) ? aData.profit[i].children.length : 0), ((aData.loss[i] && aData.loss[i].children) ? aData.loss[i].children.length : 0));
		//console.log(aData.profit[i].children);
		for(let j=0; j< maxchild; j++){
			row['Particulars Loss'] = aData.loss && aData.loss[i] && aData.loss[i].children && aData.loss[i].children[j] && aData.loss[i].children[j].name || ' ';
			row["   "] = row['Particulars Loss'] === ' ' ? ' ' : (aData.loss && aData.loss[i] && aData.loss[i].children && aData.loss[i].children[j] && aData.loss[i].children[j].cat === 'DR' ? parseFloat((aData.loss[i].children[j].amount).toFixed(2)) : 0) ;
			row["    "] = ' ';


			row["Particulars Profit"] = aData.profit && aData.profit[i] && aData.profit[i].children && aData.profit[i].children[j] && aData.profit[i].children[j].name || ' ';
			row[" "] =  row["Particulars Profit"] === ' ' ? ' ' : (aData.profit && aData.profit[i] && aData.profit[i].children && aData.profit[i].children[j] && aData.profit[i].children[j].cat === 'CR' ? parseFloat((aData.profit[i].children[j].amount).toFixed(2)) :0) ;
			row["  "] = ' ';
			// row["  "] = row["Particulars Profit"] === ' ' ? ' ' : (aData.profit && aData.profit[i] && aData.profit[i].children && aData.profit[i].children[j] && aData.profit[i].children[j].cat ==='DR' ? (aData.profit[i].children[j].amount).toFixed(2) : 0.00) ;


				// row["    "] = row['Particulars Loss'] === ' ' ? ' ' : (aData.loss && aData.loss[i] && aData.loss[i].children && aData.loss[i].children[j] && aData.loss[i].children[j].cat === 'DR' ? (aData.loss[i].children[j].amount).toFixed(2) : 0.00) ;

			addWorkbookRow(row, ws1, headers, (rowNum++));

		}
	}
	rowNum = rowNum + 2;
	setVal(ws1, 'A', rowNum, 'NETT PROFIT', {fill: 'b3ffb3'});
	setVal(ws1, 'B', rowNum,  (' ') , {fill: 'b3ffb3'});
	setVal(ws1, 'C', rowNum, parseFloat((aData.profitAndLoss > 0 ? aData.profitAndLoss:0).toFixed(2)), {fill: 'b3ffb3'});
	setVal(ws1, 'D', rowNum, 'NETT LOSS', {fill: 'b3ffb3'});
	setVal(ws1, 'E', rowNum, (' ') , {fill: 'b3ffb3'});
	setVal(ws1, 'F', rowNum, parseFloat((aData.profitAndLoss < 0 ? aData.profitAndLoss:0).toFixed(2)), {fill: 'b3ffb3'});
	rowNum++;
	setVal(ws1, 'A', rowNum, 'TOTAL', {fill: 'ccccff'});
	setVal(ws1, 'B', rowNum,  (' ') , {fill: 'ccccff'});
	// setVal(ws1, 'B', rowNum,  (crProfit_Total).toFixed(2), {fill: 'ccccff'});
	setVal(ws1, 'C', rowNum, parseFloat((aData.TotalProfit).toFixed(2)), {fill: 'ccccff'});
	setVal(ws1, 'D', rowNum, 'TOTAL', {fill: 'ccccff'});
	setVal(ws1, 'E', rowNum, (' ') , {fill: 'ccccff'});
	// setVal(ws1, 'E', rowNum, (crLoss_Total).toFixed(2), {fill: 'ccccff'});
	setVal(ws1, 'F', rowNum, parseFloat((aData.Totalloss).toFixed(2)), {fill: 'ccccff'});

	saveFileAndReturnCallback(workbook, clientId.clientId, 'Profit And Loss Report', 'Profit And Loss Report', callback);
};

module.exports.quotetionReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Quotetion Report');

	let headers = [
		"VENDOR",
		"VEHICLE",
		"FINAL QUOTATION",
		"PAYMENT TYPE",
		"PAYMENT BASIS",
		"STATUS",
		"CLOSING REASON",
		"DATE",
		"ADVANCE",
		"RATE",
		"TO PAY",
		"TOTAL",

	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Quotetion  Report");
	formatColumnHeaders(ws1, 4, headers, [20, 15, 15, 15, 15, 15, 25, 25, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);

	aData.forEach(obj => {

			let row = {};
			row["VENDOR"] = obj.vendor && obj.vendor.name || 'NA';
			row["VEHICLE"] = obj.vehicleType || 'NA';
			row["FINAL QUOTATION"] = obj.finalised.status ? 'Yes' : 'No'  || 'NA';
			row["PAYMENT TYPE"] = obj.payment_type || 'NA';
			row["PAYMENT BASIS"] = obj.weight_type || 'NA';
			row["STATUS"] = obj.status || 'NA';
			row["CLOSING REASON"] = obj.closedReason  || 'NA';
			row["DATE"] = obj.date && moment(new Date(obj.date)).format("DD-MM-YYYY") || 'NA';
			row["ADVANCE"] = obj.advance || 0;
			row["RATE"] = obj.rate || 0;
			row["TO PAY"] = obj.toPay || 0;
			row["TOTAL"] = obj.total || 0;


			addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'quotetion', 'Quotetion Report', callback);
};

module.exports.tripReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Trip Memo Report');

	let headers = [
		"S.No",
		"Booking No",
		"Vehicle No",
		"Trip No",
		"Trip Memo No",
		"Customer Name",
		"Origin",
		"Intermediary stops",
		"Destination",
		"Total",
		"Advance Receivable",
		"To Pay",
		"Booking Date",
		"Trip Type",
		"Service Type",
		"Packaging Type",
		"Product Type",
		"Driver Name",
		"Branch",
		"Category",
		"Ticket No",
		"Billing Party",
		"Munshiyana",
		"Extra Charges",
		"Deduction",
		"Amount Received",
		"Amount Pending",
		"POD Updated By",
	    "POD Updated At"
	];

	let rowNum = 5;
	formatTitle(ws1, headers.length, "Trip Memo Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15,]);
	let cnt = 1;
	aData.forEach(obj => {

		let row = {};
		row["S.No"] = (cnt++ || 0);
		row["Booking No"] = obj.booking && obj.booking.booking_no || 'NA';
		row["Vehicle No"] = obj.vehicle_no || 'NA';
		row["Trip No"] = obj.trip_no || 'NA';
		row["Trip Memo No"] = obj.tMemo && obj.tMemo.tMNo || 'NA';
		row["Customer Name"] = obj.customer && obj.customer.name || 'NA';
		row["Origin"] = obj.booking && obj.booking.ld && ( obj.booking.ld.c + ' (' + obj.booking.ld.s + ')') || 'NA';

		row["Intermediary stops"] = obj.booking && obj.booking.imd && obj.booking.imd.map( str => {
			return str.c + ' (' + str.s + ')'
		}).join(',')  || 'NA';


		row["Destination"] =  obj.booking && obj.booking.uld && ( obj.booking.uld.c + ' (' + obj.booking.uld.s + ')')  || 'NA';
		row["Total"] = obj.tMemo && obj.tMemo.total || 0;
		row["Advance Receivable"] = obj.tMemo && obj.tMemo.advance || 0;
		row["To Pay"] = obj.tMemo && obj.tMemo.toPay || 0;
		row["Booking Date"] = obj.tMemo && obj.tMemo.date && moment(new Date(obj.tMemo.date)).format("DD-MM-YYYY") || 'NA';
		row["Trip Type"] = obj.trip && obj.trip.type || 0;
		row["Service Type"] = obj.booking && obj.booking.sr || 0;
		row["Packaging Type"] = obj.booking && obj.booking.pkg|| 0;
		row["Product Type"] = obj.material_type && obj.material_type.name || 0;
		row["Driver Name"] = obj.driverData && obj.driverData.name || 0;
		row["Branch"] = obj.branch && obj.branch.name || 0;
		row["Category"] = obj.booking && obj.booking.cat || 0;
		row["Ticket No"] = obj.booking && obj.booking.ticketNo || 0;
		row["Billing Party"] = obj.billingParty && obj.billingParty.name;
		row["Munshiyana"] = obj.tMemo && obj.tMemo.Munshiyana;
		row["Extra Charges"] = obj.totalCharges;
		row["Deduction"] = obj.totalDeduction;
		row["Amount Received"] = obj.receivedAmount;
		row["Amount Pending"] = obj.remainingAmt;
		row["POD Updated By"] = obj.pod && obj.pod.user ||'NA';
   		row["POD Updated At"] = obj.pod && obj.pod.systemDate && moment(new Date(obj.pod.systemDate)).format("DD-MM-YYYY HH:mm")  ||'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'Trip Memo Report', 'Trip Memo Report', callback);
};

// module.exports.tripHireOwnReports = function (aData, req, callback) {
// 	let workbook = new Excel.Workbook();
// 	let ws1 = workbook.addWorksheet('Trial Balance Report');
// 	// formatTitle(ws1, 6,"Trial Balance As on Date : "+ moment(new Date(toDate)).format("DD-MM-YYYY"));
// 	let headers = ["S.No", "Vehicle No.", "Trip Start", "Trip End", "GR No", "GR DATE","Route","Billing Weight", "Rate", "Basic Freight",
// 		"BILLINGPARTY", "Happay", "Happay Suspense", "Fastag", "Fastag Suspense", "Diesel", "Diesel Suspense",  "Driver Cash", "Driver Cash Suspense",
// 		"Shortage","Shortage Suspense", "Challan", "Challan Suspense", "Total Expense", "Profit"
// 	];
// 	let advanceKeys = {};
// 	let suspenseAdvKeys = {};
// 	let count = 1;
// 	let rowNum = 5;
//
// 	formatColumnHeaders(ws1, 4, headers, [5, 30, 15, 15, 15, 15,5, 30, 15, 15, 15, 15,5, 30, 15, 15, 15, 15,5, 30, 15, 15, 15, 15]);
// 	let cnt = 1;
// 	  aData.forEach(obj => {
// 		obj = Trip.eachTripSummary([obj]);
//
// 		try {
// 			obj = obj[0];
// 			let row = {};
// 			let exTds = 0;
// 			let diesel = 0;
// 			let dieselLtr = 0;
// 			let happay = 0;
// 			let fastag = 0;
// 			let driverCash = 0;
// 			let Challan = 0;
// 			let Shortage = 0;
//
// 			//suspense
// 			let diesel_sus = 0;
// 			let dieselLtr_sus = 0;
// 			let happay_sus = 0;
// 			let fastag_sus = 0;
// 			let driverCash_sus = 0;
// 			let Challan_sus = 0;
// 			let Shortage_sus = 0;
// 			if (obj.vendorDeal && obj.vendorDeal.charges) {
// 				allCharges = {
// 					...obj.vendorDeal.charges,
// 				};
//
// 				if (!allCharges)
// 					return 0;
// 				for (let k in allCharges) {
// 					if (allCharges.hasOwnProperty(k))
// 						exTds += (allCharges[k]['tdsAmount'] || 0);
// 					// row["TDS Amt(Extra)"] = (row["TDS Amt(Extra)"] || 0) + (allCharges[k]['tdsAmount'] || 0);
// 				}
// 			}
//
// 			obj.advanceBudget.forEach(oAdv => {
// 				advanceKeys[oAdv.advanceType] = 1;
// 				switch (oAdv.advanceType) {
// 					case 'Happay':
// 						happay += oAdv.amount;
// 						break;
// 					case 'Diesel':
// 						diesel +=  oAdv.amount || 0;
// 						dieselLtr +=  oAdv.dieseInfo && oAdv.dieseInfo.litre || 0;
// 						break;
// 					case 'Fastag':
// 						fastag += oAdv.amount;
// 						break;
// 					case 'Driver Cash':
// 						driverCash += oAdv.amount;
// 						break;
// 					case 'Shortage':
// 						Shortage += oAdv.Shortage;
// 					case 'Challan':
// 						Challan += oAdv.Challan;
// 				}
// 			});
// 			// let susObj = {
// 			// 	"trip_no": {$exists: false},
// 			// 	"vehicle_no" : obj.vehicle_no,
// 			// 	// "date" : {
// 			// 	// 	"$gte": obj.start_date,
// 			// 	// 	"$lte": obj.end_date
// 			// 	// }
// 			// }
// 			// obj.suspense = suspense(susObj);
// 			// console.log(suspense(susObj));
//
//
// 			let susObj = {
// 				"trip_no": {$exists: false},
// 				"vehicle_no" : obj.vehicle_no,
// 				// "date" : {
// 				// 	"$gte": obj.start_date,
// 				// 	"$lte": obj.end_date
// 				// }
// 			}
//
// 			obj.suspense =  suspense(susObj);
//
// 			obj.suspense.forEach(oAdv => {
// 				suspenseAdvKeys[oAdv.advanceType] = 1;
// 				switch (oAdv.advanceType) {
// 					case 'Happay':
// 						happay_sus += oAdv.amount;
// 						break;
// 					case 'Diesel':
// 						diesel_sus +=  oAdv.amount || 0;
// 						dieselLtr_sus +=  oAdv.dieseInfo && oAdv.dieseInfo.litre || 0;
// 						break;
// 					case 'Fastag':
// 						fastag_sus += oAdv.amount;
// 						break;
// 					case 'Driver Cash':
// 						driverCash_sus += oAdv.amount;
// 						break;
// 					case 'Shortage':
// 						Shortage_sus += oAdv.Shortage;
// 					case 'Challan':
// 						Challan_sus += oAdv.Challan;
// 				}
// 			});
//
// 			row["Vehicle No."] = obj.vehicle_no || 'NA';
// 			row["Trip Start"] = obj.trip_start_status ? formatDate(obj.trip_start_status.date) : 'NA';
// 			row["Trip End"] = obj.trip_end_status ? formatDate(obj.trip_end_status.date): 'NA';
// 			row["Trip No."] = obj.trip_no || 'NA';
// 			row["GR No"] = (obj.gr && obj.gr.map(o => o.grNumber).join(' , ') ) || 'NA';
// 			row["GR DATE"] = (obj.gr && obj.gr.map(o => formatDate(o.grDate)).join(' , ') ) || 'NA';   //
// 			// row["Route"] = obj.route_name || obj.rName ||  'NA';
// 			let [src, dest] = obj.rName ? obj.rName.split(' to').map(o => o.trim()) : ( obj.route_name ? obj.route_name.split(' to').map(o => o.trim()) : 'NA' );
// 			row["Source"] = src || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.source).join(' , ') ) || 'NA'; // obj.gr.acknowledge && obj.gr.acknowledge.source) || 'NA';
// 			row["Destination"] = dest || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.destination).join(' , ') ) || 'NA';
// 			row["Billing Weight"] =  obj.gr && obj.gr.map(o => o.invoices && o.invoices.map(obj => obj.billingWeightPerUnit).join(' , ') || '').join(' , ')  || 'NA';
// 			row["Rate"] = obj.gr && obj.gr.map(o => o.invoices && o.invoices.map(obj => obj.rate).join(' , ') || '').join(' , ')  || 'NA';
// 			row["Basic Freight"] = (obj.gr && obj.gr.map(o => round(o.basicFreight || 0)).join(' , ')) || '0';
// 			row["BILLINGPARTY"] = (obj.billingParty && obj.billingParty.name) || 'NA';
// 			row["Happay"] = happay;
// 			row["Fastag"] = fastag;
// 			row["Diesel"] = diesel;
// 			row["Driver Cash"] = driverCash;
// 			row["Shortage"] = Shortage;
// 			row["Challan"] = Challan;
// 			//for suspense
// 			row["Happay Suspense"] = happay_sus;
// 			row["Fastag Suspense"] = fastag_sus;
// 			row["Diesel Suspense"] = diesel_sus;
// 			row["Driver Cash Suspense"] = driverCash_sus;
// 			row["Shortage Suspense"] = Shortage_sus;
// 			row["Challan Suspense"] = Challan_sus;
// 			let totalExp = 0;
// 			obj.trip_expenses.forEach(exp => {
// 				totalExp += exp.amount;
// 			});
// 			let revenue = 0, basicFreightSum = 0;
// 			for (let j = 0; j < obj.gr.length; j++) {
// 				revenue = (revenue || 0) + (obj.gr[j].totalFreight || 0);
// 			}
// 			for (let j = 0; j < obj.gr.length; j++) {
// 				basicFreightSum = (basicFreightSum || 0) + (obj.gr[j].basicFreight || 0);
// 			}
// 			row["Revenue"] = basicFreightSum;
// 			row["Total Expense"] = totalExp || 0;
// 			row["Profit"] = revenue - (row["Total Expense"]);
// 			row["Suspense Amt"] = obj.sum_suspenseAdv;
//
// 		addWorkbookRow(row, ws1, headers, (rowNum++));
// 		cnt++;
// 		} catch (e) {
// 			throw new Error(e);
// 		}
// 	});
//
// 	saveFileAndReturnCallback(workbook, user, 'trialBal', 'trialBalanceReport', callback);
// };
//
//
// async function suspense(obj){
// 	let data = await TripAdvances.find(obj);
// 	return data;
//
// 	// await TripAdvances.find(obj).then(function (data){
// 	//
// 	// 	// console.log('ritika',data);
// 	// 	if(data.length > 0){
// 	// 		return data;
// 	// 	}else{
// 	// 		return [];
// 	// 	}
// 	//
// 	// }).catch(
// 	// 	function (err) {
// 	// 		return err;
// 	// 	}
// 	// );
// }
//

// module.exports.costCenterReport = function(aData, from , to, clientId, callback) {
//
// 	let workbook = new Excel.Workbook();
// 	let ws1 = workbook.addWorksheet('Cost Center Report');
// 	let fromDate = moment(from).format("DD-MM-YYYY");
// 	let toDate = moment(to).format("DD-MM-YYYY");
// 	let headers = ["Name", "Feature", "Category", "Branch", "Created By", "Created At", "Modified By",	"Modified At"];
// 	let options = {
// 		fill: columnFill,
// 		font: {bold: true},
// 		alignment: {vertical: 'middle', horizontal: 'center'},
// 		border: {
// 			top: {style: 'thin'},
// 			left: {style: 'thin'},
// 			bottom: {style: 'thin'},
// 			right: {style: 'thin'}
// 		}
// 	};
// 	let rowNum = 5;
// 	formatTitle(ws1, headers.length, "Cost Center Report");
// 	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15]);
// 	headerTopMerged(ws1, 'F2', 'G2', fromDate, options);
// 	headerTopMerged(ws1, 'H2', 'H2', 'To', options);
// 	headerTopMerged(ws1, 'I2', 'J2', toDate, options);
// 	aData.forEach(obj => {
//
// 		let row = {};
// 		row["Name"] = obj.name || 'NA';
// 		row["Feature"] = obj.feature && obj.feature[0] || 'NA' ;
// 		row["Category"] = obj.category.name || 'NA' ;
// 		row["Branch"] = obj.branch && obj.branch[0] && obj.branch[0].name || 'NA';
// 			// && obj.branch.map(o => o.name).join(', ') || 'NA' ;
// 		row["Created By"] = obj.created_by || 'NA' ;
// 		row["Created At"] = obj.created_at || 'NA' ;
// 		row["Modified By"] = obj.last_modified_by || 'NA' ;
// 		row["Modified At"] = obj.last_modified_at || 'NA' ;
//
// 		addWorkbookRow(row, ws1, headers, (rowNum++));
// 	});
//
// 	saveFileAndReturnCallback(workbook, clientId, 'Cost Center Report', 'Cost Center', callback);
// };

module.exports.costCenterDailyReport = function(aData, from , to, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Cost Center Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["Cost Center", "Debit", "Credit", "Opening Balance", "Closing Balance"];
	let options = {
		fill: columnFill,
		font: {bold: true},
		alignment: {vertical: 'middle', horizontal: 'center'},
		border: {
			top: {style: 'thin'},
			left: {style: 'thin'},
			bottom: {style: 'thin'},
			right: {style: 'thin'}
		}
	};
	let rowNum = 5;
	formatTitle(ws1, headers.length, "Cost Center Report");
	formatColumnHeaders(ws1, 4, headers, [15, 15, 15, 15, 15, 15, 15, 15, 15]);
	headerTopMerged(ws1, 'F2', 'G2', fromDate, options);
	headerTopMerged(ws1, 'H2', 'H2', 'To', options);
	headerTopMerged(ws1, 'I2', 'J2', toDate, options);
	aData.forEach(obj => {

		let row = {};
		row["Cost Center"] = obj.costCenter || 'NA';
		row["Debit"] = obj.dr || 0 ;
		row["Credit"] = obj.cr || 0 ;
		row["Opening Balance"] = obj.ob || 0;
		row["Closing Balance"] = obj.cb || 0 ;

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'Cost Center Report', 'Cost Center', callback);
};

module.exports.billWise = function (aData, to, from, clientId, clientData, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Monthly Bill Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["S.NO","Date", "Particulars", "GSTIN/UIN", "Invoice No", "Taxable Value","Integrated Tax Amount","Central Tax Amount","State Tax Amount","Invoice Amount"
	];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 11;
	formatColumnHeaders(ws1, 10, headers, [10,15, 35, 20, 20, 20, 22, 20, 20, 20]);
	headerTopMerged(ws1, 'A1', 'C1', clientData.client_full_name, option);
	headerTopMerged(ws1, 'A2', 'C2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'C3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'C4', 'Pan No:-AERPG9858F', options);
	headerTopMerged(ws1, 'A5', 'C5', 'GSTIN NO:-'+ clientData.gstin_no, options);
	headerTopMerged(ws1, 'A6', 'C6', 'Voucher Register', option);
	headerTopMerged(ws1, 'A7', 'C7', 'Vouchers of :B2B Invoices - 4A, 4B, 4C, 6B, 6C', options);
	headerTopMerged(ws1, 'A8', 'C8', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
    let totalObj = {
    	totalAmt:0,
    	totalIgst:0,
    	totalCgst:0,
    	totalSgst:0,
		finalAmt:0
	}
	let cnt = 1;
	aData.forEach(obj => {
		totalObj.totalAmt += obj.amount;
		totalObj.totalIgst += obj.iGST;
		totalObj.totalCgst += obj.cGST;
		totalObj.totalSgst += obj.sGST;
		totalObj.finalAmt += obj.billAmount;
		let row = {};
		row["S.NO"] = cnt++;
		row["Date"] = obj.billDate ? moment(obj.billDate).format("DD-MM-YYYY") : 'NA';
		row["Particulars"] = obj.billingName;
		row["GSTIN/UIN"] = obj.GST ;
		row["Invoice No"] = obj.billNo;
		row["Taxable Value"] = parseFloat((obj.amount).toFixed(2));
		row["Integrated Tax Amount"] = parseFloat((obj.iGST).toFixed(2));
		row["State Tax Amount"] = parseFloat((obj.sGST).toFixed(2));
		row["Central Tax Amount"] = parseFloat((obj.cGST).toFixed(2));
		row["Invoice Amount"] = parseFloat((obj.billAmount).toFixed(2));

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,parseFloat((totalObj.totalAmt).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'G',rowNum,parseFloat((totalObj.totalIgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'H',rowNum,parseFloat((totalObj.totalCgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum,parseFloat((totalObj.totalSgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'J',rowNum,parseFloat((totalObj.finalAmt).toFixed(2)),{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'Monthly Bill Report', 'Monthly Bill Report', callback);
};

module.exports.billinglifeCycle = function (aData, to, from, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Bill Life Cycle Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["Bill Date", "Bill No", "Customer Name", "Taxable Value","Sum Of IGST","Sum Of CGST","Sum Of SGST",
		"Sum Of Final Amount","Sum Of Net Receivable","Sum Of Credit Note","Sum Of TDS"
	];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 3;
	formatColumnHeaders(ws1, 2, headers, [20,20, 35, 20, 20, 20, 22, 20, 20, 20,20]);
	headerTopMerged(ws1, 'A1', 'K1', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	aData.forEach(obj => {
		let row = {};
		row["Bill Date"] = obj.billDate ? moment(obj.billDate).format("DD-MM-YYYY") : 'NA';
		row["Customer Name"] = obj.billingName;
		row["Bill No"] = obj.billNo;
		row["Taxable Value"] = parseFloat((obj.amount).toFixed(2));
		row["Sum Of IGST"] = parseFloat((obj.iGST).toFixed(2));
		row["Sum Of CGST"] = parseFloat((obj.sGST).toFixed(2));
		row["Sum Of SGST"] = parseFloat((obj.cGST).toFixed(2));
		row["Sum Of Final Amount"] = parseFloat((obj.billAmount).toFixed(2));
		row["Sum Of Net Receivable"] = parseFloat((obj.billAmount).toFixed(2));
		row["Sum Of Credit Note"] = parseFloat((obj.creditNote && obj.creditNote.amount|| 0 ).toFixed(2));
		row["Sum Of TDS"] = 0;
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'Bill LifeCycle Report', 'Bill LifeCycle Report', callback);
};

module.exports.billingPartyWise = function (aData, to, from, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Summary Bill Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["S.NO", "Particulars", "GSTIN/UIN", "Voucher Count", "Taxable Value",
		"Integrated Tax Amount","Central Tax Amount","State Tax Amount","Total Tax Amount","Invoice Amount"
	];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 11;
	formatColumnHeaders(ws1, 10, headers, [10, 35, 20, 18, 18, 22, 20, 20, 20,20]);
	headerTopMerged(ws1, 'A1', 'B1', 'Caravan Project Logistics(Delhi)', option);
	headerTopMerged(ws1, 'A2', 'B2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'B3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'B4', 'Pan No:-AERPG9858F', options);
	headerTopMerged(ws1, 'A5', 'B5', 'GSTIN NO:-07AERPG9858F1ZW', options);
	headerTopMerged(ws1, 'A6', 'B6', 'Voucher Register', option);
	headerTopMerged(ws1, 'A7', 'B7', 'Vouchers of :B2B Invoices - 4A, 4B, 4C, 6B, 6C', options);
	headerTopMerged(ws1, 'A8', 'B8', fromDate + ' ' +  'TO' + ' ' +  toDate , options);
	let totalObj = {
		totalAmt:0,
		totalIgst:0,
		totalCgst:0,
		totalSgst:0,
		totalTax:0,
		finalAmt:0,
		voucherCount:0
	}
	let cnt = 1;
	aData.forEach(obj => {
		totalObj.totalAmt += obj.invoiceAmount;
		totalObj.totalIgst += obj.igstAmount;
		totalObj.totalCgst += obj.cgstAmount;
		totalObj.totalSgst += obj.sgstAmount;
		totalObj.totalTax += (obj.sgstAmount + obj.cgstAmount + obj.igstAmount);
		totalObj.finalAmt += obj.finalAmount;
		totalObj.voucherCount += obj.count;
		let row = {};
		row["S.NO"] = cnt++;
		row["Particulars"] = obj._id && obj._id.billingName;
		row["GSTIN/UIN"] = obj.GST;
		row["Voucher Count"] = obj.count;
		row["Taxable Value"] = parseFloat((obj.invoiceAmount).toFixed(2));
		row["Integrated Tax Amount"] = parseFloat((obj.igstAmount).toFixed(2));
		row["Central Tax Amount"] = parseFloat((obj.cgstAmount).toFixed(2));
		row["State Tax Amount"] = parseFloat((obj.sgstAmount).toFixed(2));
		row["Total Tax Amount"] = parseFloat((obj.igstAmount + obj.cgstAmount + obj.sgstAmount).toFixed(2));
		row["Invoice Amount"] = parseFloat((obj.finalAmount).toFixed(2));

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,totalObj.voucherCount,{fill:'ccccff'});
	setVal(ws1,'E',rowNum,parseFloat((totalObj.totalAmt).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'F',rowNum,parseFloat((totalObj.totalIgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'G',rowNum,parseFloat((totalObj.totalCgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'H',rowNum,parseFloat((totalObj.totalSgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum,parseFloat((totalObj.totalTax).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'J',rowNum,parseFloat((totalObj.finalAmt).toFixed(2)),{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'Summary Bill Report', 'Summary Bill Report', callback);
};

module.exports.creditNoteWise = function (aData, to, from, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Credit Note Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = ["S.NO","Date", "Billing Party", "GSTIN", "Voucher Type", "Credit No","Invoice NO",
		"Taxable value","Integrated Tax Amount","Central Tax Amount","State Tax Amount","Invoice Amount"
	];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 11;
	formatColumnHeaders(ws1, 10, headers, [10,15, 35, 20, 20, 20, 22, 20, 20, 20]);
	headerTopMerged(ws1, 'A1', 'C1', 'Caravan Project Logistics(Delhi)', option);
	headerTopMerged(ws1, 'A2', 'C2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'C3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'C4', 'Pan No:-AERPG9858F', options);
	headerTopMerged(ws1, 'A5', 'C5', 'GSTIN NO:-07AERPG9858F1ZW', options);
	headerTopMerged(ws1, 'A6', 'C6', 'Voucher Register', option);
	headerTopMerged(ws1, 'A7', 'C7', 'Vouchers of :B2B Invoices - 4A, 4B, 4C, 6B, 6C', options);
	headerTopMerged(ws1, 'A8', 'C8', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	let totalObj = {
		totalAmt:0,
		totalIgst:0,
		totalCgst:0,
		totalSgst:0,
		finalAmt:0
	}
	let cnt = 1;
	aData.forEach(obj => {
		totalObj.totalAmt += obj.amount;
		totalObj.totalIgst += obj.iGST;
		totalObj.totalCgst += obj.cGST;
		totalObj.totalSgst += obj.sGST;
		totalObj.finalAmt += obj.totalAmount;
		let row = {};
		row["S.NO"] = cnt++;
		row["Date"] = obj.date ? moment(obj.date).format("DD-MM-YYYY") : 'NA';
		row["Billing Party"] = obj.billingName;
		row["GSTIN"] = obj.GST ;
		row["Voucher Type"] = obj.type && obj.type[0];
		row["Credit No"] = obj.creditNo;
		row["Invoice NO"] = obj.billNo;
		row["Taxable value"] = "(-)" + parseFloat((obj.amount).toFixed(2));
		row["Integrated Tax Amount"] = "(-)"  + parseFloat((obj.iGST).toFixed(2));
		row["State Tax Amount"] = "(-)" + parseFloat((obj.sGST).toFixed(2));
		row["Central Tax Amount"] = "(-)" + parseFloat((obj.cGST).toFixed(2));
		row["Invoice Amount"] = "(-)" + parseFloat((obj.totalAmount).toFixed(2));

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'H',rowNum,"(-)" + parseFloat((totalObj.totalAmt).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum,"(-)" + parseFloat((totalObj.totalIgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'J',rowNum,"(-)" + parseFloat((totalObj.totalCgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'K',rowNum,"(-)" + parseFloat((totalObj.totalSgst).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'L',rowNum,"(-)" + parseFloat((totalObj.finalAmt).toFixed(2)),{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'Credit Note Report', 'Credit Note Report', callback);
};

module.exports.rtGrossProfit = function (aData, from, to , config, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('RT Gross Profit Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = [
		"Vehicle No.",
		"Trip Start",
		"Trip No",
		"Route",
		"RT No.",
		"GR NO.",
		"Billing Weight",
		"Total Freight",
		"Happay",
		"Diesel Ltr",
		"Diesel Amount",
		"Fastag",
		"Total Expense",
		"Profit"
	];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 7;
	formatColumnHeaders(ws1, 6, headers, [15,22, 20, 25, 15, 20, 22, 20, 20, 20,20,20,20]);
    if(config) {
		headerTopMerged(ws1, 'A1', 'C1', config.name, option);
		headerTopMerged(ws1, 'A2', 'C2', config.address, options);
		headerTopMerged(ws1, 'A3', 'C3', config.address2, options);
	}

	headerTopMerged(ws1, 'A4', 'C4', 'RT GROSS PROFIT REPORT' , option);
	headerTopMerged(ws1, 'A5', 'C5', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	let totalObj = {
		totalFreight:0,
		totalweight:0,
		happayAdvance:0,
		dieselltr:0,
		dieselAdvance:0,
		fastagAdvance:0,
		totalAdvance:0,
		totalProfit:0
	};
	aData.forEach(obj => {
		totalObj.totalFreight +=  round(obj.totalFreight);
		totalObj.totalweight += round(obj.totalweight);
		totalObj.happayAdvance += round(obj.tAdv.happayAdvance);
		totalObj.dieselltr += round(obj.tAdv.dieselltr);
		totalObj.dieselAdvance += round(obj.tAdv.dieselAdvance);
		totalObj.fastagAdvance += round(obj.tAdv.fastagAdvance);
		totalObj.totalAdvance += round(obj.tAdv.totalAdvance);
		totalObj.totalProfit += parseFloat(obj.totalFreight - obj.tAdv.totalAdvance);
		let row = {};
		row["Vehicle No."] = obj.vehicle_no;
		row["Trip Start"] = formatDate(obj.start_date);
		row["Trip No"] = obj.trip_no;
		row["Route"] = obj.route_name;
		row["RT No."] = obj.RT_No || "NA";
		row["GR NO."] = obj.gr.map(oTrip => oTrip.grNumber).join(', ');
		row["Billing Weight"] = round(obj.totalweight);
		row["Total Freight"] = round(obj.totalFreight);
		row["Happay"] = round(obj.tAdv.happayAdvance);
		row["Diesel Ltr"] = round(obj.tAdv.dieselltr);
		row["Diesel Amount"] = round(obj.tAdv.dieselAdvance);
		row["Fastag"] = round(obj.tAdv.fastagAdvance);
		row["Total Expense"] = round(obj.tAdv.totalAdvance);
		row["Profit"] = ((row["Total Freight"] - row["Total Expense"]) < 0) ? (row["Total Freight"] - row["Total Expense"]) : (row["Total Freight"] - row["Total Expense"]);

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum, parseFloat((totalObj.totalweight).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'H',rowNum, parseFloat((totalObj.totalFreight).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum, parseFloat((totalObj.happayAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'J',rowNum, parseFloat((totalObj.dieselltr).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'K',rowNum, parseFloat((totalObj.dieselAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'L',rowNum, parseFloat((totalObj.fastagAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'M',rowNum, parseFloat((totalObj.totalAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'N',rowNum, parseFloat((totalObj.totalProfit).toFixed(2)),{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'Round_Trip_Performance', 'RTGrossProfit_', callback);
};

module.exports.combineRtWiseGrossProfit = function (aData, from, to , clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Combine RT Wise Gross Profit Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let headers = [
		"Vehicle No.",
		"Trip Start",
		"Trip End",
		"Trip No",
		"Route",
		"RT No.",
		"GR NO.",
		"Billing Weight",
		"Total Freight",
		"Happay",
		"Diesel Ltr",
		"Diesel Amount",
		"Fastag",
		"Total Expense",
		"Profit"
	];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 7;
	formatColumnHeaders(ws1, 6, headers, [15,22, 20, 25, 15, 20, 22, 20, 20, 20,20,20,20]);
	headerTopMerged(ws1, 'A1', 'C1', 'Caravan Project Logistics(Delhi)', option);
	headerTopMerged(ws1, 'A2', 'C2', 'Ag-28, Sanjay Gandhi Transport Nagar', options);
	headerTopMerged(ws1, 'A3', 'C3', 'Near G.T. Karnal Road Badli', options);
	headerTopMerged(ws1, 'A4', 'C4', 'COMBINE RT WISE GROSS PROFIT REPORT' , option);
	headerTopMerged(ws1, 'A5', 'C5', fromDate + ' ' + 'TO' + ' ' +  toDate , options);
	let totalObj = {
		totalFreight:0,
		happayAdvance:0,
		dieselltr:0,
		dieselAdvance:0,
		fastagAdvance:0,
		totalAdvance:0,
		totalProfit:0
	};
	aData.forEach(obj => {
		totalObj.totalFreight +=  round(obj.totalFreight);
		totalObj.happayAdvance += round(obj.happayAdvance);
		totalObj.dieselltr += round(obj.dieselltr);
		totalObj.dieselAdvance += round(obj.dieselAdvance);
		totalObj.fastagAdvance += round(obj.fastagAdvance);
		totalObj.totalAdvance += round(obj.totalAdvance);
		totalObj.totalProfit += parseFloat(obj.totalFreight - obj.totalAdvance);
		let row = {};
		row["Vehicle No."] = [...new Set(obj.vehicle_no)].join(', ');
		row["Trip Start"] = obj.start_date.map(oTrip => formatDate(oTrip)).join(', ');
		row["Trip End"] = obj.end_date.map(oTrip => formatDate(oTrip)).join(', ');
		row["Trip No"] = obj.trip_no.join(', ');
		row["Route"] = obj.route_name.join(', ');
		row["RT No."] = obj.RT_No || "NA";
		row["GR NO."] = obj.gr.map(oTrip => oTrip.grNumber).join(', ');
		row["Billing Weight"] = obj.totalweight.join(', ');
		row["Total Freight"] = round(obj.totalFreight);
		row["Happay"] = round(obj.happayAdvance);
		row["Diesel Ltr"] = round(obj.dieselltr);
		row["Diesel Amount"] = round(obj.dieselAdvance);
		row["Fastag"] = round(obj.fastagAdvance);
		row["Total Expense"] = round(obj.totalAdvance);
		row["Profit"] = ((row["Total Freight"] - row["Total Expense"]) < 0) ? (row["Total Freight"] - row["Total Expense"]) : (row["Total Freight"] - row["Total Expense"]);

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	setVal(ws1,'A',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'B',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'C',rowNum,'GRAND TOTAL',{fill:'ccccff'});
	setVal(ws1,'D',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'E',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'F',rowNum,'',{fill:'ccccff'});
	setVal(ws1,'G',rowNum, '',{fill:'ccccff'});
	setVal(ws1,'H',rowNum, parseFloat((totalObj.totalFreight).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'I',rowNum, parseFloat((totalObj.happayAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'J',rowNum, parseFloat((totalObj.dieselltr).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'K',rowNum, parseFloat((totalObj.dieselAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'L',rowNum, parseFloat((totalObj.fastagAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'M',rowNum, parseFloat((totalObj.totalAdvance).toFixed(2)),{fill:'ccccff'});
	setVal(ws1,'N',rowNum, parseFloat((totalObj.totalProfit).toFixed(2)),{fill:'ccccff'});
	saveFileAndReturnCallback(workbook, clientId, 'Round_Trip_Performance', 'CombineRTGrossProfit_', callback);
};

module.exports.dailyMISreport = function (aData, clientData, clientId, callback){
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Combine RT Wise Gross Profit Report');
	// let fromDate = moment(from).format("DD-MM-YYYY");
	// let toDate = moment(to).format("DD-MM-YYYY");
	let headers = [
		"SN",
		"Trip no.",
		"Truck no.",
		"City Name",
		"GR NO.",
		"Cases",
		"Gate out Date",
		"REPORTING DATE",
		"Delivery Status",
		"Delivery Date",
		"REMARKS",
		"GPS Location",
		"GPS Last known D&T",
	];
	let rowNum = 2;
	let count = 1;
	formatColumnHeaders(ws1, 1, headers, [15,22, 20, 25, 15, 20, 22, 20, 20, 20,20,20,20,20]);


	aData.forEach(obj => {
		let row = {};
		row["SN"] = count++;
		row["Trip no."] = obj.trip_no || "NA";
		row["Truck no."] = obj.vehicle_no || "NA";
		row["City Name"] = obj.destination || "NA";
		row["GR NO."] = obj.grNumber || "NA";
		row["Cases"] = obj.noOfUnits || "NA";
		row["Gate out Date"] = obj.gateoutDate ? moment(obj.gateoutDate).format("DD-MM-YYYY") : "NA";
		row["REPORTING DATE"] = obj.unloadingArrivalTime? moment(obj.unloadingArrivalTime).format("DD-MM-YYYY") : "NA";
		if( obj.billingUnloadingTime)
			row["Delivery Status"] = 'Delivered' ;
		else if(obj.unloadingArrivalTime)
			row["Delivery Status"] = 'At dealer point' ;
		else
			row["Delivery Status"] = 'INTRANSIT' ;
		row["Delivery Date"] = obj.billingUnloadingTime ? moment(obj.billingUnloadingTime).format("DD-MM-YYYY") : "NA";
		row["REMARKS"] = obj.arRemark || 'NA' ;
		row["GPS Location"] = obj.gpsData && obj.gpsData.address;
		row["GPS Last known D&T"] = obj.gpsData.positioning_time ? obj.gpsData && moment(obj.gpsData.positioning_time).format("DD-MM-YYYY hh:mm") : 'NA' ;

		addWorkbookRow(row, ws1, headers, (rowNum++));
	});

	saveFileAndReturnCallback(workbook, clientId, 'dailyMISreport', 'dailyMISreport', callback);
}

module.exports.duesReport = function (aData, from, to ,asOnDate,  clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('DUES Report');
	let fromDate = moment(from).format("DD-MM-YYYY");
	let toDate = moment(to).format("DD-MM-YYYY");
	let asOn = moment(asOnDate).format("DD-MM-YYYY");
	let headers = [
		"S.NO",
		"Vehicle No.",
		"DUES TYPE",
		"Expiry"
	];
	let options = {
		font: {bold: true,size:10},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let option = {
		font: {bold: true,size:15},
		alignment: {vertical: 'left', horizontal: 'left'},
	};
	let rowNum = 4;
	formatColumnHeaders(ws1, 3, headers, [15,22, 25]);
	headerTopMerged(ws1, 'A1', 'C1', 'DUES REPORT' , option);
	headerTopMerged(ws1, 'A2', 'D2', fromDate + ' ' + 'TO' + ' ' +  toDate + '     '  + 'asOnDate:-'  +  asOn , options);
	let count = 1;
	aData.forEach(obj => {
		let row = {};
		row["S.NO"] = count++;
		row["Vehicle No."] = obj && obj.aVehCollection && obj.aVehCollection.veh_no;
		row["DUES TYPE"] = obj && obj.duesType;
		row["Expiry"] = obj && obj.aVehCollection && obj.aVehCollection.todt ?  moment(obj.aVehCollection.todt).format("DD-MM-YYYY") : "NA";
		addWorkbookRow(row, ws1, headers, (rowNum++));
	});
	saveFileAndReturnCallback(workbook, clientId, 'DUES', 'DUESReport_', callback);
};

module.exports.trackingReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Tracking Report');
		var headers = [
			"Customer",
			"Vehicle Type",
			"Service Type",
			"TAT hr.",
			"TAT min."
		];

	let rowNum = 2;
	// formatTitle(ws1, headers.length, "Tracking  Reports");
	formatColumnHeaders(ws1, 1, headers, [15, 15, 15, 15, 15]);
	let cnt = 1;
	aData.forEach(obj => {
		let row = {};
		row["Customer"] = obj.customer_name || 'NA';
		row["Vehicle Type"] = obj.vehTypeNam || 'NA';
		row["Service Type"] = obj.service || 'NA';
		row["TAT hr."] = obj.tat_hr || 'NA';
		row["TAT min."] = obj.tat_min || 'NA';

		addWorkbookRow(row, ws1, headers, (rowNum++));
		cnt++;
	});
	saveFileAndReturnCallback(workbook, clientId, 'trackingReports', 'Tracking_Reports', callback);
};

module.exports.budgetingReport = function (aData, clientId, callback) {

	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Budgeting Report');

		let headers = [
			"Customer",
			"Vehicle Type",
			"Service Type",
			"Rate/km",
			"Diesel/km",
			"Toll"
		];

	let rowNum = 2;
	// formatTitle(ws1, headers.length, "Budgeting  Reports");
	formatColumnHeaders(ws1, 1, headers, [15, 15, 15, 15, 15]);
	let cnt = 1;
	aData.forEach(obj => {
		let row = {};
		row["Customer"] = obj.customer_name || 'NA';
		row["Vehicle Type"] = obj.vehTypeNam || 'NA';
		row["Service Type"] = obj.service || 'NA';
		row["Rate/km"] = obj.rateKm || 0;
		row["Diesel/km"] = obj.dieselKm || 0;
		row["Toll"] = obj.toll || 'NA';
		addWorkbookRow(row, ws1, headers, (rowNum++));
		cnt++;
	});
	saveFileAndReturnCallback(workbook, clientId, 'budgetingReports', 'Bracking_Reports', callback);
};

module.exports.jobOrderReport = function(aData, reqBody, clientId, callback){
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet("JobOrderReport");
	let headers = ['Sr No', "Trip/Route Name", "Vehicle Number", "Device Serial No", "Group", "Driver Name", "Driver Number", "Start Date","Origin", "Destination", "Arrival Date At Origin", "Arrival Time At Origin", "Departure Time From Origin", "Loading Duration", "Arrival Date At Destination",
		"Arrival Time At Destination", "Departure Time From Destination", "Unloading Duration", "Job Status", "Vehicle Status","Scheduled Distance (km)","Job Distance (km)", "Delay","Job ETA Status","Job End Time","Duration","Stop Time ( min)","Current Location","Current Status","% Job Completed",
		"Remaining Km To Next Point","Expected Time Of Arrival","Predicated Time Of Arrival","Predicted Delay","TAT","Actual TAT(Hrs)","Package Count At Start Location","Vehicle State","Job Created On","Seal Present","Hard acceleration","Hard deceleration","Idling","Overspeeding"];
	formatTitle(ws1, headers.length, `JobOrderReport`);
	formatColumnHeaders(ws1, 3, headers, [15,30,20,25,20,20,20,22,20,20,15,30,20,25,20,20,20,22,20,20,15,30,20,25,20,20,20,22,20,20,15,30,20,25,20,20,20,20,22,20,20,15,30,20,25,20]);
	let rowNum = 4;
	let count = 1;

	try{
		aData.forEach( oData => {
			let row = {};
			row['Sr No'] = count++;
			row["Trip/Route Name"] = oData.route_name || "NA";
			row["Vehicle Number"] = oData.vehicle_no  || "NA";
			row["Device Serial No"] = (oData.device && oData.device.imei) || "NA";
			row["Group"] = (oData.vendor && oData.vendor.name) || "NA";
			row["Driver Name"] = (oData.driver && oData.driver.name) || "NA";
			row["Driver Number"] = (oData.driver && oData.driver.prim_contact_no) || "NA";
			row["Start Date"] = oData.start_date && moment(new Date(oData.start_date)).format("DD-MM-YYYY HH:mm") || 'NA'
			row["Origin"] = oData.source  || "NA";
			row["Destination"] = oData.destination  || "NA";
			row["Arrival Date At Origin"] = oData.sourceEntryDate ? moment(new Date(oData.sourceEntryDate)).format("DD-MM-YYYY") : (oData.start_date ? moment(new Date(oData.start_date)).format("DD-MM-YYYY HH:mm") : 'NA');
			row["Arrival Time At Origin"] = oData.sourceEntryDate ? moment(new Date(oData.sourceEntryDate)).format("HH:mm") : (oData.start_date ? moment(new Date(oData.start_date)).format("HH:mm") : 'NA') ;
			row["Departure Time From Origin"] = oData.sourceExitDate && moment(new Date(oData.sourceExitDate)).format("DD-MM-YYYY HH:mm") || 'NA';
			row['Loading Duration'] = oData.loadingDuration || "NA";
			row["Arrival Date At Destination"] = oData.destEntryDate && moment(new Date(oData.destEntryDate)).format("DD-MM-YYYY") || 'NA';
			row["Arrival Time At Destination"] = oData.destEntryDate && moment(new Date(oData.destEntryDate)).format("HH:mm") || 'NA';
			row["Departure Time From Destination"] = oData.destExitDate ? moment(new Date(oData.destExitDate)).format("DD-MM-YYYY HH:mm") :(oData.end_date ? moment(new Date(oData.end_date)).format("DD-MM-YYYY HH:mm") : 'NA') ;
			row["Unloading Duration"] = oData.unLoadingDuration || "NA";
			row["Job Status"] = oData.end_date ? "COMPLETED": "IN PROGRESS";
			row["Vehicle Status"] = oData.end_date ? "UNLOADING": "LOADING";
			row["Scheduled Distance (km)"] = oData.scheduleDistance ;
			row["Job Distance (km)"] = oData.jobDistance;
			row["Delay"] = oData.delay || 0;
			row["Job ETA Status"] = oData.jobEta;
			row["Job End Time"] = oData.end_date && moment(new Date(oData.end_date)).format("DD-MM-YYYY HH:mm") || 'NA';
			row["Duration"] = oData.duration || "NA";
			row["Stop Time ( min)"] =  oData.stopTime ;
			row["Current Location"] = oData.currentLocation || "NA";
			row["Current Status"] = oData.currentStatus || "NA";
			row["% Job Completed"] = oData.jobCompleted || "NA";
			row["Remaining Km To Next Point"] = oData.remainKM || 0;
			row["Expected Time Of Arrival"] = oData.expectedArrival || 0;
			row["Predicated Time Of Arrival"] = oData.predecteArrival || 0;
			row["Predicted Delay"] = oData.predectedDelay; // not clear by rajat
			row["TAT"] = (oData.tat_hr || "00") + " : " + (oData.tat_min || "00");
			row["Actual TAT(Hrs)"] = oData.actualTAT || 0;
			row["Package Count At Start Location"] = " ";
			row["Vehicle State"] = oData.end_date ? "UNLOADING": "LOADING";
			row["Job Created On"] = oData.created_at && moment(new Date(oData.created_at)).format("DD-MM-YYYY HH:mm") || 'NA';
			row["Seal Present"] = oData.sealStatus ? 'YES' : 'NO';
			row["Hard acceleration"] =  oData.ha && oData.ha.count || 0;
			row["Hard deceleration"] = oData.hb && oData.hb.count || 0;
			row["Idling"] = oData.playBack && oData.playBack.num_idle || 0; //idling && idling.count || 0;
			row["Overspeeding"] = oData.over_speed && oData.over_speed.count || 0;
		addWorkbookRow(row, ws1, headers, (rowNum++));
		});
	}catch (e) {
		throw e;
	}
	if(reqBody.excel){
		saveFileAndReturnCallback1(workbook, clientId, 'JobOrder', 'JobOrderReport', callback);
	}else{
		saveFileAndReturnCallback(workbook, clientId, 'JobOrder', 'JobOrderReport', callback);
	}

}

module.exports.jobOrderRiskyReport = function(aData, reqBody, clientId, callback){
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet("JobOrderRiskyReport");
	let headers = ['Sr No', "Job Name", "Trip id", "Job start date", "Job start time", "Vehicle Number", "Transporter Name", "Driver Name","Driver Number", "Stoppage >=30 m",
		"Idle Stoppage >=30 m", "Distance", "TAT In Hours", "TAT In Minutes", "Risky Point >=10 m",
		"Risky Points Stoppage Times(m)", "Stoppage >=30 m ", "Distance ", "Delay Jobs", "Risky Points","Stoppage >=30 m  ",
		"Distance  ", "Delay Jobs ","Risky Points ","Total Score","Grade","Risk Level","Job Transit Time In Minutes","Job Transit Time",
		"Job End Date","Job End time","Uptime %","Power Disconnect Events Count","Zig Zag Stop","Package Count At Start Location"];
	formatTitle(ws1, headers.length, `JobOrder Risky Report`);
	formatColumnHeaders(ws1, 3, headers, [15,30,20,25,20,20,20,22,20,20,15,30,20,25,20,20,20,22,20,20,15,30,20,25,20,20,20,22,20,20,15,30,20,25,20]);
	let rowNum = 4;
	let count = 1;

	try{
		aData.forEach( oData => {
			let row = {};
			row['Sr No'] = count++;
			row["Job Name"] = oData.route_name || "NA";
			row["Trip id"] = oData.trip_no  || "NA";
			row["Job start date"] = oData.start_date && moment(new Date(oData.start_date)).format("DD-MM-YYYY") || 'NA'
			row["Job start time"] = oData.start_date && moment(new Date(oData.start_date)).format("HH:mm:ss") || 'NA'
			row["Vehicle Number"] = oData.vehicle_no || "NA";
			row["Transporter Name"] = (oData.vendor && oData.vendor.name) || "NA";
			row["Driver Name"] = (oData.driver && oData.driver.name) || "NA";
			row["Driver Number"] = (oData.driver && oData.driver.prim_contact_no) || "NA";
			row["Stoppage >=30 m"] =  oData.stoppage;
			row["Idle Stoppage >=30 m"] = oData.idleStoppage;
			row["Distance"] =  oData.distance || "NA";
			row["TAT In Hours"] = (oData.tat_hr || "00");
			row['TAT In Minutes'] = (oData.tat_min || "00");
			row["Risky Point >=10 m"] = oData.riskyPoints;
			row["Risky Points Stoppage Times(m)"] = '';
			row["Stoppage >=30 m "] = oData.stoppage1;
			row["Distance "] =  oData.distance1;
			row["Delay Jobs"] = oData.delayJobs;
			row["Risky Points"] =  oData.riskyPoints1;
			row["Stoppage >=30 m  "] = oData.stoppage2;
			row["Distance  "] = oData.distance2;
			row["Delay Jobs "] = oData.delayJobs1;
			row["Risky Points "] = oData.riskyPoints2 ;
			row["Total Score"] = oData.totalScore ;
			row["Grade"] = oData.grade ;
			row["Risk Level"] = oData.riskLevel ;
			row["Job Transit Time In Minutes"] = oData.dur;
			row["Job Transit Time"] = oData.jobTransitTime  || "NA";
			row["Job End Date"] = oData.end_date && moment(new Date(oData.end_date)).format("DD-MM-YYYY") || 'NA';
			row["Job End time"] = oData.end_date && moment(new Date(oData.end_date)).format("HH:mm:ss") || 'NA';
			row["Uptime %"] = " ";
			row["Power Disconnect Events Count"] = oData.power_cut && oData.power_cut.count || 0;;
			row["Zig Zag Stop"] = "FALSE";
			addWorkbookRow(row, ws1, headers, (rowNum++));
		});
	}catch (e) {
		throw e;
	}
	saveFileAndReturnCallback(workbook, clientId, 'JobOrder', 'JobOrderRiskyReport', callback);
}

module.exports.jobOrderPowerReport = function(aData, reqBody, clientId, callback){
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet("JobOrderPowerReport");
	let headers = ['Sr No', "Job Name", "Job Id", "Vehicle Number", "Power Disconnect Time", "Power Disconnect Location", "Power Reconnect Time", "Power Reconnect Location", "Disconnect Duration (In min)", "Disconnect distance (In km)"];
	formatTitle(ws1, headers.length, `JobOrder Power Connect Report`);
	formatColumnHeaders(ws1, 3, headers, [15,30,20,25,20,20,20,22,20,20]);
	let rowNum = 4;
	let count = 1;

	try{
		aData.forEach( oData => {
			let row = {};
			row['Sr No'] = count++;
			row["Job Name"] = oData.route_name || "NA";
			row["Job Id"] = oData.trip_no  || "NA";
			row["Vehicle Number"] = oData.vehicle_no || "NA";
			row["Power Disconnect Time"] = oData.powerCut && moment(new Date(oData.powerCut)).format("DD-MM-YYYY HH:mm:ss") || 'NA'
			row["Power Disconnect Location"] = oData.powerCutLocation || "NA";
			row["Power Reconnect Time"] = oData.powerReconnect && moment(new Date(oData.powerReconnect)).format("DD-MM-YYYY HH:mm:ss") || 'NA'
			row["Power Reconnect Location"] = oData.powerReconnectLocation || "NA";
			row["Disconnect Duration (In min)"] =  oData.dur || 0;
			row["Disconnect distance (In km)"] =  oData.disConnectDistance || 0;
			addWorkbookRow(row, ws1, headers, (rowNum++));
		});
	}catch (e) {
		throw e;
	}
	saveFileAndReturnCallback(workbook, clientId, 'JobOrder', 'JobOrderPowerReport', callback);
}

module.exports.simBasePlayBackReport = function (aData, reqBody, clientId, callback) {
	var workbook = new Excel.Workbook();
	var ws1 = workbook.addWorksheet('SimBased PlayBack Report');
	let header = ['Driver Number', 'Vehicle', 'Start Time', 'Transporter', 'Source','Destination','Current Address','Last Tracked At','ETA','Completed At','Status'];
	formatTitle(ws1, header.length, 'SimBased PlayBack Report');
	formatColumnHeaders(ws1, 2, header, [17, 35, 22, 15, 17,17,30,20,20,20,20]);
	var rowNum = 3;
	var row = {};
	row['Driver Number'] = aData &&  aData.driver || "NA";
	row['Vehicle'] = aData &&  aData.vehicle || "NA";
	row['Start Time'] = aData  && aData.start_time || "NA";
	row['Transporter'] = aData && aData.vendor || "NA";
	row['Source'] = aData && aData.source || "NA";
	row['Destination'] = aData &&  aData.destination || "NA";
	row['Current Address'] = aData &&  aData.last_loc && aData.last_loc.address || "NA";
	row['Last Tracked At'] = aData && aData.last_loc && aData.last_loc.time || "NA";
	row['ETA'] = aData &&  aData.eta || "NA";
	row['Completed At'] = aData  && aData.destination_out || "NA";
	row['Status'] = aData &&  aData.status || "NA";
	addWorkbookRow(row, ws1, header, rowNum++, false);

	let header1 = ['Time', 'Address', 'Halt in', 'Halt out','Kilometer'];
	formatColumnHeaders(ws1,5 , header1, [17,35, 22, 15, 17, 17,]);
	rowNum = 6;

	for (const d of aData.points) {
		var obj = {};
		obj['Time'] = d.start_time || "NA";
		obj['Address'] = d.place_name || 'NA';
		obj['Halt in'] = d.start_time || "NA" ;
		obj['Halt out'] = d.leaving_time || "NA";
		obj['Kilometer'] = d.km || "NA";
		addWorkbookRow(obj, ws1, header1, rowNum++, false);
	}
	saveFileAndReturnCallback(workbook, clientId, 'JobOrder', 'SimBasedPlayBack', callback);
};


function round(num){
	return Math.round(num * 100)/100 || 0;
}

function formatDate(date){
	return date && moment(date).format('DD-MM-YYYY') || '';
}

function numberToAlphabet(index) {
	const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let str = '';

	let q = Math.trunc(index / 26) - 1;
	let r = index % 26;

	return (alpha[q] ? alpha[q] : '') + (alpha[r] ? alpha[r] : '');
}

