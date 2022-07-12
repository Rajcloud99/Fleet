'use strict';

/*
* Created by Shivam Malhotra
* */

const Excel = require('exceljs');
const csv = require("fast-csv");
const moment = require('moment');

class ExcelCSV {

	static set(obj, path, val) {
		const keys = path.split('.');
		const lastKey = keys.pop();
		const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
		if(lastObj[lastKey] && Array.isArray(lastObj[lastKey]) && Array.isArray(val)) {
			lastObj[lastKey] = lastObj[lastKey].concat(val);
		} else {
			lastObj[lastKey] = val;
		}
	};

	constructor({ rateChartConfig, filePath, $inject }) {
		this.rateChartConfig = rateChartConfig;
		this.filePath = filePath;
		this.rateList = [];
		this.$inject = $inject;
	}

	readExcelAndGetRateList() {
		const self = this;
		const workbook = new Excel.Workbook();
		return workbook.xlsx.readFile(self.filePath)
			.then(() => {
				const worksheet = workbook.getWorksheet(1) || workbook.getWorksheet(2) || workbook.getWorksheet(3);
				if(worksheet) {
					var hasData = worksheet.getRow(2).actualCellCount;
					if(hasData > 0) {
						worksheet.eachRow((row, rowCount) => {
							if (rowCount === 1) {
								if(row.cellCount !== self.rateChartConfig.length) {
									throw new Error('Please check number of columns in sample before uploading. Number of columns doesn\'t match');
								}
								row.eachCell({includeEmpty: true}, (cell, colNumber) => {
									if(self.rateChartConfig[colNumber-1].label !== cell.value) {
										throw new Error('Please check name, spelling and ordering of columns in sample before uploading.');
									}
								});
							} else {
								let rates = {...self.$inject};
								row.eachCell({includeEmpty: true}, (cell, colNumber) => {
									let value = cell.value;// || self.rateChartConfig[colNumber-1].rate;
									if (value && self.rateChartConfig[colNumber-1].field === 'baseRate') {
										value = [{
											rate:value,
											baseVal:self.rateChartConfig[colNumber-1].baseVal,
											label:self.rateChartConfig[colNumber-1].label,
										}];
									}
									if (self.rateChartConfig[colNumber-1].field === 'effectiveDate') {
										value = moment(value,'DD-MM-YYYY').toDate();
										if(!(value && value instanceof Date && value !== 'Invalid Date')) {
											throw new Error('Invalid date for Cell '+ cell._address);
										} else {
											value.setHours(0);
											value.setMinutes(0);
											value.setSeconds(0);
											value.setMilliseconds(0);
										}
									}
									if (self.rateChartConfig[colNumber-1].field === 'source') {
										if(!value || (typeof value !== 'string')) {
											throw new Error('Source must be a valid location for Cell '+ cell._address);
										} else {
											value = value.trim().toLowerCase();
										}
									}
									if (self.rateChartConfig[colNumber-1].field === 'destination') {
										if(!value || (typeof value !== 'string')) {
											throw new Error('Destination must be a valid location for Cell '+ cell._address);
										} else {
											value = value.trim().toLowerCase();
										}
									}
									if (self.rateChartConfig[colNumber-1].field === 'materialGroupCode') {
										if(!value || (typeof value !== 'string')) {
											throw new Error('Material group code invalid for Cell '+ cell._address);
										} else {
											value = value.trim().toLowerCase();
										}
									}
									if (self.rateChartConfig[colNumber-1].field === 'routeDistance') {
										if(!value || (typeof value !== 'number')) {
											throw new Error('route distance must be a valid number for cell '+ cell._address);
										}
									}
									if (self.rateChartConfig[colNumber-1].field === 'rate') {
										if((!value && value != 0) || (typeof value !== 'number')) {
											throw new Error('rate must be a valid number for cell '+ cell._address);
										}
									}
									if (self.rateChartConfig[colNumber-1].field === 'unit') {
										if(!value || (typeof value !== 'string')) {
											throw new Error('invalid unit for cell '+ cell._address);
										}
									}
									if (self.rateChartConfig[colNumber-1].field === 'paymentBasis') {
										if(!value || (typeof value !== 'string')) {
											throw new Error('invalid paymentBasis for cell '+ cell._address);
										}
									}
									if (value) {
										ExcelCSV.set(rates, self.rateChartConfig[colNumber-1].field, value);
									}
								});
								self.rateList.push(rates);
							}
						});
						return self.rateList;
					} else {
						throw new Error('Excel doesn\'t have rows to upload');
					}
				} else {
					throw new Error('Excel doesn\'t have a worksheet');
				}
			})
			.catch(err => { throw err });
	}

	// parseCSVFile(filePath, file_type, callback) {
	// 	var index = 0;
	// 	var start_time = Date.now();
	// 	var end_time = Date.now();
	// 	var headers;
	// 	var aData = [];
	// 	var that  = this;
	// 	var bulk;
	// 	csv.fromPath(filePath)
	// 		.on("data", function (data) {
	// 			if (index == 0) {
	// 				for (var i = 0; i < data.length; i++) {
	// 					if (data[i]) {//translate headers TODO keep in utils
	// 						data[i] = data[i].trim();
	// 						data[i] = data[i].toLocaleLowerCase();
	// 					}
	// 				}
	// 				headers = data;
	//
	// 			} else {
	// 				var oData = {};
	// 				for (var i = 0; i < headers.length; i++) {
	// 					if (headers[i]) {
	// 						oData[headers[i]] = data[i];
	// 					}
	// 				}
	// 				aData.push(oData);
	// 			}
	// 			index++;
	// 		})
	// 		.on("end", function (err) {
	// 			var oSettings = {start_time: start_time,index:index};
	// 			return callback(null,aData);
	// 			//return that.bulkExecute(bulk,oSettings,callback);
	// 		});
	// }

}

module.exports = ExcelCSV;
