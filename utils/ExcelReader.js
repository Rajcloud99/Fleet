/*
* Created by Shivam Malhotra
* */

'use strict';

const moment = require('moment');
const Excel = require('exceljs');

class ExcelReader {

	static set(obj, path, val) {
		const keys = path.split('.');
		const lastKey = keys.pop();
		const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
		lastObj[lastKey] = val;
	};

	static checkDateFromat(date) {
		if(date instanceof Date){
			let tD = date.setUTCHours(0,0,0,0);
			tD =  new Date(tD);
			return tD;
		}else if(date.split('/').length){
			return date;
		}else if(date.split('-').length){
			return date;
		}else{
			return date;
		}
	};

	static renameKeys(obj, keysMap) {
		return Object
			.keys(obj)
			.reduce((acc, key) => ({
				...acc,
				...{ [keysMap[key] || key]: obj[key] }
			}), {});
	}

	constructor({ config, filePath, inject }) {
		this.config = ExcelReader.renameKeys(config, Object.keys(config).reduce((acc, curr) => ({...acc, [curr]: curr.trim().toLowerCase()}), {}));
		this.filePath = filePath;
		this.inject = inject || {};
		this.data = [];
	}

	read() {
		const self = this;
		const workbook = new Excel.Workbook();
		return workbook.xlsx.readFile(self.filePath)
			.then(() => {
				const worksheet = workbook.getWorksheet(1);
				if (worksheet) {
					var hasData = worksheet.getRow(2).actualCellCount;
					if (hasData > 0) {
						worksheet.eachRow((row, rowCount) => {
							if (rowCount === 1) {
								row.eachCell({includeEmpty: true}, (cell, colNumber) => {
									let cellValueLower = (cell.value || '').trim().toLowerCase();
									if (self.config[cellValueLower]) {
										let found = self.config[cellValueLower];
										found.label = cellValueLower;
										delete self.config[cellValueLower];
										self.config[colNumber] = found;
									}
								});
								const foundRequiredHeadersNotPresentInExcel = Object.entries(self.config).filter(([confKey, confValue]) => confValue.required && isNaN(parseInt(confKey)));
								if(foundRequiredHeadersNotPresentInExcel.length > 0) {
									throw new Error(`Header ${foundRequiredHeadersNotPresentInExcel.map(([requiredHeaderName, confObj]) => confObj.enum ? `'${requiredHeaderName}' (${confObj.enum})` : `'${requiredHeaderName}'`).join(', ')} is/are mandatory column(s).`);
								}
							} else {
								let _d = { ...self.inject };
								row.eachCell({includeEmpty: true}, (cell, colNumber) => {
									if(self.config[colNumber]) {
										let key = self.config[colNumber]['keyName'];
										if(cell.value && cell.value.richText && cell.value.richText[0] && cell.value.richText[0].text){
											cell.value = cell.value.richText[0].text;
										}
										let reducedValue = (self.config[colNumber]['stateReducer'] && self.config[colNumber]['stateReducer'](cell.value)) || (typeof cell.value === 'string' ? cell.value.trim() : cell.value);
										if(reducedValue || reducedValue === 0) {
											let ignoreIfValueIs = self.config[colNumber]['ignoreIfValueIs'];
											if(!ignoreIfValueIs ||
												(ignoreIfValueIs &&
													(Array.isArray(ignoreIfValueIs) ? (ignoreIfValueIs.indexOf(reducedValue) === -1) : (ignoreIfValueIs !== reducedValue))
												)) {
												let dateFormat = self.config[colNumber]['dateFormat'];
												let ignoreHours = self.config[colNumber]['ignoreHours'];
												let futureDate = self.config[colNumber]['futureDate'];
												if (dateFormat && !ignoreHours) {
													reducedValue = moment(reducedValue, dateFormat).seconds(0).milliseconds(0).toDate();
												}
												if (dateFormat && ignoreHours) {
													reducedValue = ExcelReader.checkDateFromat(reducedValue);
													reducedValue = moment(reducedValue, dateFormat).hours(0).minutes(0).seconds(0).milliseconds(0).toDate();
													if(!futureDate && new Date().getTime() < reducedValue.getTime()){
														throw new Error(`Date can not be in future  ${self.config[colNumber]['dateFormat']}`);
													}
												}
												if (reducedValue.toString() === 'Invalid Date') {
													throw new Error(`Date must be of format ${self.config[colNumber]['dateFormat']}`);
												}
												if(self.config[colNumber]['enum'] && Array.isArray(self.config[colNumber]['enum']) && self.config[colNumber]['enum'].indexOf(reducedValue) === -1) {
													throw new Error(`${key} must be either of these ${self.config[colNumber]['enum'].join(', ')}`);
												}
												if(self.config[colNumber]['ignoreKeyNameEvaluation']) {
													_d[key] = reducedValue;
												} else {
													ExcelReader.set(_d, key, reducedValue);
												}
											}
										} else {
											if (self.config[colNumber]['required']) {
												throw new Error(`${self.config[colNumber]['label']} is a required field`);
											}
										}
									}
								});
								self.data.push(_d);
							}
						});
						return self.data;
					} else {
						throw new Error('Excel doesn\'t have rows to upload');
					}
				} else {
					throw new Error('Excel doesn\'t have a worksheet');
				}
			})
			.catch(err => {
				global.TRIP_ADVANCES_UPLOADING = false;
				throw err;
			});
	}

}

module.exports = ExcelReader;
