/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 04/10/19
 */

const Excel = require('exceljs');
const moment = require('moment');
const mkdirp = require('mkdirp');

function setHeaderStyle (cell) {
	cell.alignment = {horizontal: 'center'};
	cell.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: '2ed5f2'
		}
	};
	cell.border ={
		top: {style:'thin'},
		left: {style:'thin'},
		bottom: {style:'thin'},
		right: {style:'thin'}
	};
}
function setAggStyle (cell) {
	cell.alignment = {horizontal: 'left'};
	cell.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: {
			argb: 'bad1ff'
		}
	};
	cell.border ={
		top: {style:'thin'},
		left: {style:'thin'},
		bottom: {style:'thin'},
		right: {style:'thin'}
	};
}

function createHeader (ws, headers, row, width) {
	headers.forEach((h, i) =>  {
		ws.getCell(row, i+1).value = h;
		setHeaderStyle(ws.getCell(row, i+1));
		if (width[i]) {
			ws.getColumn(i+1).width = width[i];
		}
	});
}

let addWorkbookRow = function (data, ws, headers, rowNum, showNA, options) {
	let count = 0;
	let show = (showNA === false) ? "" : "NA";
	for (let j = 0; j < headers.length; j++) {
		let cell = ws.getCell(rowNum, j+1);
		cell.value = (typeof data[headers[j]] === "number") ? data[headers[j]] : (data[headers[j]] || show);
		cell.value = (typeof data[headers[j]] === "number" && isNaN(data[headers[j]])) ? 'NA' : data[headers[j]];
		(typeof data[headers[j]] === "string") && (cell.alignment = { wrapText: true });
		if (options) {
			if (options.fill)
				cell.fill = options.fill;
			if (options.alignment)
				cell.alignment = {
					...options.alignment,
					...((typeof data[headers[j]] === "string" && data[headers[j]].length > 40)? { wrapText: true }: {})
				};
			if (options.border)
				cell.border = options.border;
			if (options.numFmt && options.numFmt[headers[j]]) {
				cell.numFmt = options.numFmt[headers[j]];
			}
			if (options.styleFunc) {
				options.styleFunc(cell);
			}
		}
		count++;
	}
};

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

let r= {};

module.exports.driverPerformance = function (data, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Driver Performance', {
		properties: {showGridLines: false},
		pageSetup:{paperSize: 9, orientation:'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0}
	});
	ws1.views = [
		{state: 'frozen', ySplit: 2, showGridLines: false, zoomScale: 90}
	];
	ws1.mergeCells('Q1:S1');
	ws1.getCell('Q1').value = 'Contribution';
	setHeaderStyle(ws1.getCell('Q1'));
	let headers = [
		'SN',
		'Start',
		'End',
		'Settle Date',
		'RT No',
		'Route',
		'Vehicle No',
		'KM',
		'Extra KM',
		'Days',
		'KM/Day',
		'Revenue',
		'Advance',
		'Expense',
		'Drv Pymt',
		'Balance',
		'Amount',
		'Per Day',
		'Per KM'
	];
	createHeader(ws1, headers, 2,
		[5,10,10,10,5,25,12,8,8,8,7,11,9,8,8,8,10,8,8]);
	let row = 3;
	let lastDriver = null;
	let driverSn = 1;
	let tripSn = 1;
	let tr = {};
	let netTotal = {};
	data.forEach((d,i) => {
		if (lastDriver === null || d.driver !== lastDriver) {
			lastDriver = d.driver;
			ws1.mergeCells(row,2,row,headers.length);
			let cell = ws1.getCell(row,2);
			cell.value = lastDriver;
			setAggStyle(cell);
			let snCell = ws1.getCell(row++,1);
			tripSn = 1;
			snCell.value = driverSn++;
			setAggStyle(snCell);

		}

		let totExtKm = 0;
		if(d.trips){
			let aTrips = d.trips;
			aTrips.forEach((t,r) => {
				totExtKm+= t.extraKm;
			});
		}


		//let totKmWithExta = (d.totalKM || 0) + totExtKm;
		let r = {};
		r['SN'] = tripSn++;
		r['Start'] = d.trip_start && moment(d.trip_start).format("DD-MM-YYYY") || '';
		r['End'] = d.trip_end && moment(d.trip_end).format("DD-MM-YYYY") || '';
		r['Settle Date'] = d.markSettle && d.markSettle.date && moment(d.markSettle.date).format("DD-MM-YYYY") || '';
		r['RT No'] = d._id;
		r['Route'] = d.route.join(', ');
		r['Vehicle No'] = d.vehicle;
		//r['OB'] = (d.advSettled.openingBal || 0) ;
		//r['CB'] = d.total_advance + (d.advSettled.openingBal || 0) - d.netExpense + d.driverPayment;
		r['KM'] = d.totalKM || 0;
		r['Extra KM'] = totExtKm || 0;
		r['Days'] = d.trip_start && d.trip_end && dateUtil.getDateDifferece(d.trip_start, d.trip_end, 'day');
		r['KM/Day'] = r['Days'] && r['KM']? r['KM']/r['Days']: 0;
		r['Revenue'] = d.internal_freight;
		r['Advance'] = d.total_advance || 0;
		r['Expense'] = d.netExpense || 0;
		r['Drv Pymt'] = d.driverPayment || 0;
		r['Balance'] = r['Advance']+r['Drv Pymt']-r['Expense'];
		r['Amount'] = r['Revenue'] - r['Expense'];
		r['Per Day'] = r['Amount'] && r['Amount']? r['Amount']/r['Days']: 0;
		r['Per KM'] = r['Amount'] && r['KM']? r['Amount']/r['KM']: 0;

		tr['KM'] = tr['KM']? tr['KM'] + r['KM']:  r['KM'];
		tr['Extra KM'] = tr['Extra KM']? tr['Extra KM'] + r['Extra KM']:  r['Extra KM'];
		tr['Days'] = tr['Days']? tr['Days'] + r['Days']:  r['Days'];
		tr['Revenue'] = tr['Revenue']? tr['Revenue'] + r['Revenue']:  r['Revenue'];
		tr['Advance'] = tr['Advance']? tr['Advance'] + r['Advance']:  r['Advance'];
		tr['Expense'] = tr['Expense']? tr['Expense'] + r['Expense']:  r['Expense'];
		tr['Drv Pymt'] = tr['Drv Pymt']? tr['Drv Pymt'] + r['Drv Pymt']:  r['Drv Pymt'];
		tr['Balance'] = tr['Balance']? tr['Balance'] + r['Balance']:  r['Balance'];
		tr['Amount'] = tr['Amount']? tr['Amount'] + r['Amount']:  r['Amount'];

		netTotal['KM'] = netTotal['KM']? netTotal['KM'] + r['KM']:  r['KM'];
		netTotal['Extra KM'] = netTotal['Extra KM']? netTotal['Extra KM'] + r['Extra KM']:  r['Extra KM'];
		netTotal['Days'] = netTotal['Days']? netTotal['Days'] + r['Days']:  r['Days'];
		netTotal['Revenue'] = netTotal['Revenue']? netTotal['Revenue'] + r['Revenue']:  r['Revenue'];
		netTotal['Advance'] = netTotal['Advance']? netTotal['Advance'] + r['Advance']:  r['Advance'];
		netTotal['Expense'] = netTotal['Expense']? netTotal['Expense'] + r['Expense']:  r['Expense'];
		netTotal['Drv Pymt'] = netTotal['Drv Pymt']? netTotal['Drv Pymt'] + r['Drv Pymt']:  r['Drv Pymt'];
		netTotal['Balance'] = netTotal['Balance']? netTotal['Balance'] + r['Balance']:  r['Balance'];
		netTotal['Amount'] = netTotal['Amount']? netTotal['Amount'] + r['Amount']:  r['Amount'];
		addWorkbookRow(r,ws1,headers, row++, false, {
			numFmt: {
				'KM': '0',
				'Extra KM': '0',
				'Days': '0',
				'KM/Day': '0.00',
				'Revenue': '0.00',
				'Advance': '0.00',
				'Expense': '0.00',
				'Drv Pymt': '0.00',
				'Balance': '0.00',
				'Amount': '0.00',
				'Per Day': '0.00',
				'Per KM': '0.00'
			},
			styleFunc: (cell)=> (cell.border ={
				top: {style:'thin'},
				left: {style:'thin'},
				bottom: {style:'thin'},
				right: {style:'thin'}
			})
		});
		if (!data[i+1] || data[i+1].driver !== d.driver) {
			tr['KM/Day'] = tr['KM'] && tr['Days']? tr['KM']/tr['Days']: 0;
			tr['Per Day'] = tr['Amount'] && tr['Days']? tr['Amount']/tr['Days']: 0;
			tr['Per KM'] = tr['Amount'] && tr['KM']? tr['Amount']/tr['KM']: 0;
			ws1.mergeCells(row, 1, row, 6);
			addWorkbookRow(tr,ws1,headers, row++, false, {
				numFmt: {
					'KM': '0',
					'Extra KM': '0',
					'Days': '0',
					'KM/Day': '0.00',
					'Revenue': '0.00',
					'Advance': '0.00',
					'Expense': '0.00',
					'Drv Pymt': '0.00',
					'Balance': '0.00',
					'Amount': '0.00',
					'Per Day': '0.00',
					'Per KM': '0.00'
				},
				styleFunc: (cell) => {
					cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: {
						argb: 'bad1ff'
					}
				};
				cell.border ={
					top: {style:'thin'},
					left: {style:'thin'},
					bottom: {style:'thin'},
					right: {style:'thin'}
				};
				}
			});
			ws1.getCell(row-1, 1).value = 'Total';
			addWorkbookRow({}, ws1, headers, row++, false, {
				styleFunc: (cell) => {
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: {
							argb: '000000'
						}
					};
				}
			});
			ws1.getRow(row-1).height = 6;
			tr = {};
		}
	});
	netTotal['SN'] = 'Net Total';
	netTotal['KM/Day'] = netTotal['KM'] && netTotal['Days']? netTotal['KM']/netTotal['Days']: 0;
	netTotal['Per Day'] = netTotal['Amount'] && netTotal['Days']? netTotal['Amount']/netTotal['Days']: 0;
	netTotal['Per KM'] = netTotal['Amount'] && netTotal['KM']? netTotal['Amount']/netTotal['KM']: 0;
	ws1.mergeCells(row, 1, row, 6);
	/*
	addWorkbookRow(netTotal,ws1,headers, row++, false, {
		numFmt: {
			'KM': '0',
			'Extra KM': '0',
			'Days': '0',
			'KM/Day': '0.00',
			'Revenue': '0.00',
			'Advance': '0.00',
			'Expense': '0.00',
			'Drv Pymt': '0.00',
			'Balance': '0.00',
			'Amount': '0.00',
			'Per Day': '0.00',
			'Per KM': '0.00'
		},
		styleFunc: (cell) => {
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: {
					argb: '9eb4df'
				}
			};
			cell.border ={
				top: {style:'thin'},
				left: {style:'thin'},
				bottom: {style:'thin'},
				right: {style:'thin'}
			};
		}
	});
	*/
	saveFileAndReturnCallback(workbook, clientId, 'performance', 'Driver Performance', callback);
};


module.exports.driverAccReport = function (data, clientId, callback) {
	let workbook = new Excel.Workbook();
	let ws1 = workbook.addWorksheet('Driver Trip Account', {
		properties: {showGridLines: false},
		pageSetup:{paperSize: 9, orientation:'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0}
	});
	ws1.views = [
		{state: 'frozen', ySplit: 2, showGridLines: false, zoomScale: 90}
	];

	let headers = [
		'SN',
		'Start',
		'End',
		'Settle Date',
		'Vehicle No',
		'Type',
		'RT/Trip No',
		'particulars',
		'Remark',
		'Advance',
		'Expense',
		'Variance',
		'Net',
	];
	createHeader(ws1, headers, 2, [5,15,15,15,15,10,10,17,20,15,15,15,15]);
	let row = 3;
	let lastDriver = null;
	let lastDriverCode = null;
	let driverSn = 1;
	let Sn = 1;
	let UnSn = 1;
	let Sno = 1;
	let tsr = {};
	let tusr = {};
	let netTotal = {};
	data.forEach(obj =>{
	obj.aTrips.forEach((d,i) => {
		if (lastDriver === null || d.driverName !== lastDriver) {
			lastDriver = d.driverName;
			lastDriverCode = d.driverCode;
			d.openingBal =  obj.ob;
			ws1.mergeCells(row,2,row, headers.length);
			let cell = ws1.getCell(row,2);
			cell.value = lastDriver +', Code: ' + lastDriverCode+', OpBal: ' + obj.ob;
			setAggStyle(cell);
			let snCell = ws1.getCell(row++,1);
			Sn = Sno = UnSn = 1;
			snCell.value = driverSn++;
			setAggStyle(snCell);
		}
		d.isSettled = d.markSettle && d.markSettle.isSettled;
		if(d.isSettled && Sn === 1) {
			ws1.mergeCells(row,1,row,headers.length);
			let cell = ws1.getCell(row++,1);
			cell.value = "Settle";
			setAggStyle(cell);
			Sno = Sn;
			Sn++;
		}else if(!d.isSettled && UnSn === 1){
			ws1.mergeCells(row,1,row,headers.length);
			let cell = ws1.getCell(row++,1);
			cell.value = "UnSettle";
			setAggStyle(cell);
			Sno = UnSn;
			UnSn++;
		}

		let r = {};
		r['SN'] = Sno++;
		r['Start'] = d.tripStart && moment(d.tripStart).format("DD-MM-YYYY") || '';
		r['End'] = d.tripEnd && moment(d.tripEnd).format("DD-MM-YYYY") || '';
		r['Settle Date'] = d.markSettle && d.markSettle.date && moment(d.markSettle.date).format("DD-MM-YYYY") || '';
		r['Vehicle No'] = d.vehicle_no || d.trips[0].vehicle_no;
		r['Type'] = (d.markSettle && d.markSettle.isSettled)? 'RT': "Trip";
		r['RT/Trip No'] = d._id && d._id.tsNo || d.trip_no || "";
		r['particulars'] = "";
		r['Remark'] = d.markSettle && d.markSettle.remark;
		r['Advance'] = d.tAdv || 0;
		r['Expense'] = d.tExp || 0;
		r['Variance'] = r['Advance'] - r['Expense'];
		r['Net'] = (tsr['Net'] || 0) + (tusr['Net'] || 0) + r['Variance'] + (d.openingBal || 0);

		if(d.markSettle && d.markSettle.isSettled){
		   tsr['Advance'] = (tsr['Advance'] || 0) + r['Advance'];
			tsr['Expense'] = (tsr['Expense'] || 0) + r['Expense'];
			tsr['Variance'] = (tsr['Variance'] || 0) + r['Variance'];
			tsr['Net'] =   r['Net'];
		} else{
			tsr.Net = 0;
			tusr['Advance'] = (tusr['Advance'] || 0) + r['Advance'];
			tusr['Expense'] =  (tusr['Expense'] || 0) + r['Expense'];
			tusr['Variance'] = (tusr['Variance'] || 0) + r['Variance'];
			tusr['Net'] =   r['Net'];
		}

		netTotal['Advance'] = netTotal['Advance']? netTotal['Advance'] + r['Advance']:  r['Advance'];
		netTotal['Expense'] = netTotal['Expense']? netTotal['Expense'] + r['Expense']:  r['Expense'];
		netTotal['Variance'] = netTotal['Variance']? netTotal['Variance'] + r['Variance']:  r['Variance'];
		netTotal['Net'] =   r['Net'];


		addWorkbookRow(r,ws1,headers, row++, false, {
			numFmt: {
				'Advance': '0.00',
				'Expense': '0.00',
				'Variance': '0.00',
				'Net': '0.00',
			},
			styleFunc: (cell)=> (cell.border ={
				top: {style:'thin'},
				left: {style:'thin'},
				bottom: {style:'thin'},
				right: {style:'thin'}
			})
		});

		if (Array.isArray(d.payments) && d.payments.length) {
					d.payments.forEach(oPayment => {
						oPayment.ledgers.forEach(oLedger => {
							if (d.driverAcc.toString() === oLedger.account.toString()) {
								if (oLedger.cRdR === 'DR') {
									oPayment.adv = oPayment.adv || 0;
									oPayment.adv += oLedger.amount
								} else {
									oPayment.exp = oPayment.exp || 0;
									oPayment.exp += oLedger.amount;
								}
							}
						});
						let r = {};
						r['SN'] = Sno++;
						r['Start'] = oPayment.date && moment(oPayment.date).format("DD-MM-YYYY") || '';
						r['End'] = '';
						r['Settle Date'] = '';
						r['Vehicle No'] = d.vehicle_no || d.trips[0].vehicle_no;
						r['Type'] = oPayment.vT || "";
						r['RT/Trip No'] = d._id && d._id.tsNo || d.trip_no || "";
						r['particulars'] = "";
						r['Remark'] = oPayment.narration || "";
						r['Advance'] = oPayment.adv || 0;
						r['Expense'] = oPayment.exp || 0;
						r['Variance'] = r['Advance'] - r['Expense'];
						r['Net'] = (tsr['Net'] || 0) + (tusr['Net'] || 0) + r['Variance'];


						if (d.markSettle && d.markSettle.isSettled) {
							tsr['Advance'] = (tsr['Advance'] || 0) + r['Advance'];
							tsr['Expense'] = (tsr['Expense'] || 0) + r['Expense'];
							tsr['Variance'] = (tsr['Variance'] || 0) + r['Variance'];
							tsr['Net'] =  r['Net'];
						} else {
							tusr['Advance'] = (tusr['Advance'] || 0) + r['Advance'];
							tusr['Expense'] = (tusr['Expense'] || 0) + r['Expense'];
							tusr['Variance'] = (tusr['Variance'] || 0) + r['Variance'];
							tusr['Net'] =  r['Net'];
						}

						netTotal['Advance'] = netTotal['Advance'] ? netTotal['Advance'] + r['Advance'] : r['Advance'];
						netTotal['Expense'] = netTotal['Expense'] ? netTotal['Expense'] + r['Expense'] : r['Expense'];
						netTotal['Variance'] = netTotal['Variance'] ? netTotal['Variance'] + r['Variance'] : r['Variance'];
						netTotal['Net'] =  r['Net'];


						addWorkbookRow(r,ws1,headers, row++, false, {
							numFmt: {
								'Advance': '0.00',
								'Expense': '0.00',
								'Variance': '0.00',
								'Net': '0.00',
							},
							styleFunc: (cell)=> (cell.border ={
								top: {style:'thin'},
								left: {style:'thin'},
								bottom: {style:'thin'},
								right: {style:'thin'}
							})
						});
					});
				}


		if (d.markSettle && d.markSettle.isSettled && obj.aTrips[i+1] && !obj.aTrips[i+1].markSettle.isSettled) {
			ws1.mergeCells(row, 1, row, 9);
			addWorkbookRow(tsr,ws1,headers, row++, false, {
				numFmt: {
					'Advance': '0.00',
					'Expense': '0.00',
					'Variance': '0.00',
					'Net': '0.00',
				},
				styleFunc: (cell) => {
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: {
							argb: 'B3F8FE'
						}
					};
					cell.border ={
						top: {style:'thin'},
						left: {style:'thin'},
						bottom: {style:'thin'},
						right: {style:'thin'}
					};
				}
			});
			ws1.getCell(row-1, 1).value = 'Total';
			addWorkbookRow({}, ws1, headers, row++, false, {
				styleFunc: (cell) => {
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: {
							argb: '000000'
						}
					};
				}
			});
			ws1.getRow(row-1).height = 6;
			tsr.Advance = 0;
			tsr.Expense = 0;
			tsr.Variance = 0;
		}

		else if (!obj.aTrips[i+1] || obj.aTrips[i+1].driverName !== d.driverName) {
			ws1.mergeCells(row, 1, row, 9);
			addWorkbookRow(tusr,ws1,headers, row++, false, {
				numFmt: {
					'Advance': '0.00',
					'Expense': '0.00',
					'Variance': '0.00',
					'Net': '0.00',
				},
				styleFunc: (cell) => {
					cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: {
						argb: 'B3F8FE'
					}
				};
				cell.border ={
					top: {style:'thin'},
					left: {style:'thin'},
					bottom: {style:'thin'},
					right: {style:'thin'}
				};
				}
			});
			ws1.getCell(row-1, 1).value = 'Total';
			addWorkbookRow({}, ws1, headers, row++, false, {
				styleFunc: (cell) => {
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: {
							argb: '000000'
						}
					};
				}
			});
			ws1.getRow(row-1).height = 6;
			tsr = {};
			tusr = {};
		}
	});
	});
	// netTotal['SN'] = 'Net Total';
	ws1.mergeCells(row, 1, row, 9);
	addWorkbookRow(netTotal,ws1,headers, row++, false, {
		numFmt: {
			'Advance': '0.00',
			'Expense': '0.00',
			'Variance': '0.00',
			'Net': '0.00',
		},
		styleFunc: (cell) => {
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: {
					argb: 'F4E895'
				}
			};
			cell.border ={
				top: {style:'thin'},
				left: {style:'thin'},
				bottom: {style:'thin'},
				right: {style:'thin'}
			};
		}
	});
	ws1.getCell(row-1, 1).value = 'Net Total';
	saveFileAndReturnCallback(workbook, clientId, 'Account', 'Driver Trip  Account', callback);
};

// module.exports = r;
