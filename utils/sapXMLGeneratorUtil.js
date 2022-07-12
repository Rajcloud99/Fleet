/**
 * Created by manish on 6/2/17.
 */
const builder = require('xmlbuilder');
const mkdirp = require('mkdirp');
const fs = require('fs');
const encoding = 'UTF-8';
const xmlDir = 'sapXmlFiles/';
var CustomerXMLJson = require('../sapXmlJsonMap/customerXmlJson');
var InvoiceXMLJson = require('../sapXmlJsonMap/invoiceXmlJson');
var ExpensesXMLJson = require('../sapXmlJsonMap/expensesXmlJson');

var TripExpense = promise.promisifyAll(commonUtil.getService("trip_expenses"));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var invoiceService = promise.promisifyAll(commonUtil.getService("invoice"));
var CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
var XmlJsonMappingService = promise.promisifyAll(commonUtil.getService('xmlJsonMapping'));

var CustomerXMLJsonModel = promise.promisifyAll(require('../lms/models/customerXmlJsonModel'));
var InvoiceXMLJsonModel = promise.promisifyAll(require('../lms/models/invoiceXmlJsonModel'));
var ExpensesXMLJsonModel = promise.promisifyAll(require('../lms/models/expensesXmlJsonModel'));
var async = require("async");

var clientIdArr = ["100003"];

var generateXMLFromObjectAndSaveToFile = function(objJson, clientId, fileName, encoding, callback) {
    var xml = builder.create(objJson,{ encoding: encoding });
    var dir = xmlDir + clientId;
    mkdirp.sync('./'+ dir);
    var fileName = fileName + '.xml';
    var filePath = dir +'/' + fileName;
    var ws = fs.createWriteStream(filePath);
    ws.on('close', function() {
        console.log(fs.readFileSync(filePath, encoding));
        callback(null,{
            url:'http://'+commonUtil.getConfig('download_host') +':'
            +commonUtil.getConfig('download_port')+'/' + clientId +'/'+ fileName,
            dir:dir,
            filename:fileName
        });
    });
    ws.write(xml.end({ pretty: true }), encoding);
    ws.end();
};

function getCombinedCustomerJson(docsArr) {
    CustomerXMLJson.root.DEBMAS03.IDOC =[];
    for (var i=0;i<docsArr.length;i++){
        docsArr[i].data["@BEGIN"] = "";
        CustomerXMLJson.root.DEBMAS03.IDOC.push(docsArr[i].data)
    }
    return CustomerXMLJson.root;
}

function getCombinedInvoiceJson(docsArr) {
    InvoiceXMLJson.root.ZFI_USER.IDOC =[];
    for (var i=0;i<docsArr.length;i++){
      docsArr[i].data["@BEGIN"] = "";
      InvoiceXMLJson.root.ZFI_USER.IDOC.push(docsArr[i].data)
    }
    return InvoiceXMLJson.root;
}

function getCombinedExpensesJson(docsArr) {
    ExpensesXMLJson.root.ZFI_USER.IDOC =[];
    for (var i=0;i<docsArr.length;i++){
      docsArr[i].data["@BEGIN"] = "";
      ExpensesXMLJson.root.ZFI_USER.IDOC.push(docsArr[i].data)
    }
    return ExpensesXMLJson.root;
}
function generateCustomerXMLData(customer){
	var dataIDOC = XmlJsonMappingService.prepareCustomerXMLJsonData(customer);
	var dataToSave = {clientId:customer.clientId,data:dataIDOC};
	var customerXMLJsonDataToSave = new CustomerXMLJsonModel(dataToSave);
	return customerXMLJsonDataToSave.saveAsync();
}

module.exports.generateCustomerXMLs = function (startTime, endTime, upload, cb) {
    var results =[];
    async.every(clientIdArr,function (clientId, callback) {
        var cursor = CustomerXMLJsonModel.find({clientId:clientId,
            $and:[{created_at:{$lt:new Date(endTime)}},{created_at:{$gte:new Date(startTime)}}]})
            .sort({$natural:-1});
        cursor.exec(function (err, customerXmlJsonDocs) {
            if (customerXmlJsonDocs){
                var combinedCustomerJson = getCombinedCustomerJson(JSON.parse(JSON.stringify(customerXmlJsonDocs)));
                //////filename formatting/////////
                var cDate=new Date();
                var year=cDate.getFullYear();
                var month=("0" + (cDate.getMonth() + 1)).slice(-2);
                var date=("0" + (cDate.getDate())).slice(-2);
                var hour=("0" + (cDate.getHours())).slice(-2);
                var min=("0" + (cDate.getMinutes())).slice(-2);
                var sec=("0" + (cDate.getSeconds())).slice(-2);
                var msec=("00" + (cDate.getMilliseconds() + 1)).slice(-3);
                var fileName = "MapleCustomerMaster"+year+month+date;
                generateXMLFromObjectAndSaveToFile(combinedCustomerJson,clientId,fileName,"UTF-8",
                    function (err,data) {
                    if(err)console.log(err);
                        if(upload && data.dir && data.filename){
                            ftpUtil.uploadFileToFTPServer(data.dir+'/'+data.filename,config.remoteSapCustPath,data.filename);
                        }
                    results.push(data);
                    callback();
                });
            }else{
                callback();
            }
        })
    },function (err) {
        if (cb){
            cb(err,results);
        }
    });
};

module.exports.generateCustomerXMLData = function (req, cb) {
	CustomerService.findCustomerQueryAsync(req.query)
		.then(function(data){
			if(data){
				async.forEachOf(data,function(customer,index,callback){
					generateCustomerXMLData(customer)
						.then(function(a){
							callback();
						})
				},function (err, proceed) {
					if(err){
						console.log('err',err);
					}else {
						return cb(proceed);
					}
				})
			}else{
				console.log('customers not found');
			}
		}).catch(function(err){
			console.log('err',err);
	})
};

module.exports.generateInvoiceXMLs = function (startTime, endTime, upload, cb) {
    var results =[];
    async.every(clientIdArr,function (clientId, callback) {
        var cursor = InvoiceXMLJsonModel.find({clientId:clientId,
            $and:[{created_at:{$lt:new Date(endTime)}}, {created_at:{$gte:new Date(startTime)}}]})
            .sort({$natural:-1});
        cursor.exec(function (err, invoiceXmlJsonDocs) {
            if (invoiceXmlJsonDocs){
                var combinedInvoiceJson = getCombinedInvoiceJson(JSON.parse(JSON.stringify(invoiceXmlJsonDocs)));
                //////filename formatting/////////
                var cDate=new Date();
                var year=cDate.getFullYear();
                var month=("0" + (cDate.getMonth()+1)).slice(-2);
                var date=("0" + (cDate.getDate())).slice(-2);
                var hour=("0" + (cDate.getHours())).slice(-2);
                var min=("0" + (cDate.getMinutes())).slice(-2);
                var sec=("0" + (cDate.getSeconds())).slice(-2);
                var msec=("00" + (cDate.getMilliseconds() + 1)).slice(-3);
                var fileName = "MapleJournalEntryDR"+year+month+date;
                //var fileName = 'invoicesXML'+dateUtil.getDDMMYYYY();
                generateXMLFromObjectAndSaveToFile(combinedInvoiceJson,clientId,fileName,"UTF-8",
                    function (err,data) {
                        if(err)console.log(err);
                        if(upload && data.dir && data.filename){
                            ftpUtil.uploadFileToFTPServer(data.dir+'/'+data.filename,config.remoteSapJrnlPath,data.filename);
                        }
                        results.push(data);
                        callback();
                    });
            }else{
                callback();
            }
        })
    },function (err) {
        if (cb){
            cb(err,results);
        }
    });
};

module.exports.generateInvoiceXMLData = function (req, cb) {
	invoiceService.findBilledAsync(req.query)
		.then(function(data){
			data = JSON.parse(JSON.stringify(data));
			if(data){
				async.forEachOf(data,function(invoice,index,callback){
					invoiceService.generateInvoiceXMLDataNewAsync(invoice)
						.then(function(a){
							callback();
						})
				},function (err, proceed) {
					if(err){
						console.log('err',err);
					}else {
						var billReport = {};
						billReport.name = data;
						ReportExelService.generateSAPBillsExcel('SAP Billing Report', billReport, {}, req.query.clientId, function(reportData){
							cb(reportData);
						});
					}
				})
			}else{
				console.log('invoices not found');
				/*
				return res.status(200).json({"status":"OK",
					"message":"no invoice found", "data":[]});
					*/
			}
		}).catch(function(err){
			console.log('err',err);
	});
};

module.exports.generateExpensesXMLs = function (startTime, endTime, upload, cb) {
    var results =[];
    async.every(clientIdArr,function (clientId, callback) {
        var cursor = ExpensesXMLJsonModel.find({clientId:clientId,
            $and:[{created_at:{$lt:new Date(endTime)}},{created_at:{$gte:new Date(startTime)}}]})
            .sort({$natural:-1});
        cursor.exec(function (err, expensesXmlJsonDocs) {
            if (expensesXmlJsonDocs){
                var combinedExpensesJson = getCombinedExpensesJson(JSON.parse(JSON.stringify(expensesXmlJsonDocs)));
                //////filename formatting/////////
                var cDate=new Date();
                var year=cDate.getFullYear();
                var month=("0" + (cDate.getMonth()+1)).slice(-2);
                var date=("0" + (cDate.getDate())).slice(-2);
                var hour=("0" + (cDate.getHours())).slice(-2);
                var min=("0" + (cDate.getMinutes())).slice(-2);
                var sec=("0" + (cDate.getSeconds())).slice(-2);
                var msec=("00" + (cDate.getMilliseconds() + 1)).slice(-3);
                var fileName = "MapleJournalEntryKR"+year+month+date;
                //var fileName = 'expensesXML'+dateUtil.getDDMMYYYY();
                generateXMLFromObjectAndSaveToFile(combinedExpensesJson,clientId,fileName,"UTF-8",
                    function (err,data) {
                        if(err)console.log(err);
                        if(upload && data.dir && data.filename){
                            ftpUtil.uploadFileToFTPServer(data.dir+'/'+data.filename,config.remoteSapJrnlPath,data.filename);
                        }
                        results.push(data);
                        callback();
                    });
            }else{
                callback();
            }
        })
    },function (err) {
        if (cb){
            cb(err,results);
        }
    });
};

module.exports.generateExpensesXMLData = function (req, cb) {
	TripExpense.getTripExpenseNewAsync(req.query)
		.then(function(data){
			data = JSON.parse(JSON.stringify(data));
			if(data){
				async.forEachOf(data,function(expense,index,callback){
					TripExpense.generateExpenseXMLDataNewAsync(expense)
						.then(function(a){
							callback();
						})
				},function (err, proceed) {
					if(err){
						console.log('err',err);
					}else {
						var billReport = {};
						billReport.name = data;
						ReportExelService.generateSAPExpenseExcel('SAP Expense Report', billReport, {}, req.query.clientId, function(reportData){
							cb(reportData);
						});
					}
				})
			}else{
				console.log('expenses not found');
				/*
				return res.status(200).json({"status":"OK",
					"message":"no trip expenses found","data": []});
				*/
			}
		}).catch(function(err){
			console.log('catch err',err);
	})
};
