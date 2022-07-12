var fs = require('fs');
var path = require('path');
var mime = require('mime');
var misUtil = {};
var UserPref = promise.promisifyAll(commonUtil.getModel('userPref'));
var ReportService = commonUtil.getService("report");
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var Client = promise.promisifyAll(commonUtil.getModel('client'));
var async = require('async');

function generateProfitabilitySummary(docsArr) {
    var summaryArr = [];
    var profitSum = 0;
    var costingSum = 0;
    var customerPaySum = 0;
    for (var i = 0; i < docsArr.length; i++) {
        customerPaySum += docsArr[i].invoiceTotal;
        costingSum += docsArr[i].total_expences;
        profitSum += docsArr[i].profitability;
    }
    var summaryObj = {};
    summaryObj.desc = "Total Trips";
    summaryObj.value = docsArr.length;
    summaryArr.push(summaryObj);
    var summaryObj = {};
    summaryObj.desc = "Total Customer Pay";
    summaryObj.value = customerPaySum + " Rs";
    summaryArr.push(summaryObj);
    var summaryObj = {};
    summaryObj.desc = "Total Costing";
    summaryObj.value = costingSum + " Rs";
    summaryArr.push(summaryObj);
    var summaryObj = {};
    summaryObj.desc = "Net profit";
    summaryObj.value = profitSum + " Rs";
    summaryArr.push(summaryObj);
    var summaryObj = {};
    summaryObj.desc = "Net Profit %";
    summaryObj.value = Number(((profitSum / costingSum) * 100)).toFixed(2) + " %";
    summaryArr.push(summaryObj);
    return summaryArr;
}

misUtil.generateMISAndMailToUsers = function(misType, timeFired) {
    Client.findAsync({})
        .then(function(clientArr) {
            var req = {};
            var datetimeEnd = timeFired;
            if (misType === "daily") {
                var datetimeStart = dateUtil.getMorning(timeFired).getTime();
            } else if (misType === "weekly") {
                var dateNow = new Date(timeFired);
                dateNow.setDate(dateNow.getDate() - 6);
                dateNow.setHours(0);
                dateNow.setMinutes(0);
                dateNow.setSeconds(0);
                dateNow.setMilliseconds(0);
                datetimeStart = dateNow.getTime();
            } else if (misType === "monthly") {
                var dateNow = new Date(timeFired);
                dateNow.setMonth(dateNow.getMonth() - 1);
                dateNow.setHours(0);
                dateNow.setMinutes(0);
                dateNow.setSeconds(0);
                dateNow.setMilliseconds(0);
                datetimeStart = dateNow.getTime();
                dateNow.setMonth(dateNow.getMonth() + 1);
                dateNow.setDate(dateNow.getDate() - 1);
                datetimeEnd = dateNow.getTime();
            }
            req.query = {};
            req.query.reportType = "mis";
            req.query.start_date = new Date(datetimeStart);
            req.query.end_date = new Date(datetimeEnd);

            async.forEachOf(clientArr, function(client, index, callback) {
                if (client.clientId !== config.super_admin_id) {
                    req.query.clientId = client.clientId;
                    async.series([
                        /**Profitability**/
                        function(callback) {
                            ReportService.postProfitabilityIntrmdt(req, function(err, aData) {
                                if (err) return callback(null, {});
                                if (aData.length > 0) {
                                    var summaryArr = generateProfitabilitySummary(aData);

                                    function handleResults(excelServiceData) {
                                        var dataToEmailService = {};
                                        dataToEmailService.summary = summaryArr;
                                        dataToEmailService.excelServiceData = excelServiceData;
                                        dataToEmailService.reportKind = "profit_report";
                                        callback(null, dataToEmailService);
                                    }

                                    var dataToReportService = {};
                                    dataToReportService.data = aData;
                                    dataToReportService.reportType = "mis";
                                    dataToReportService.start_time = datetimeStart;
                                    dataToReportService.end_time = datetimeEnd;
                                    dataToReportService.mis_type = misType;
                                    ReportExelService.generatePostProfitabilityExcel(dataToReportService,
                                        req.clientData,
                                        handleResults);
                                } else {
                                    callback(null, {});
                                }
                            });
                        },
                        /** Trip status **/
                        function(callback) {
                            callback(null, {})
                        },

                        /**vehicle status **/
                        function(callback) {
                            callback(null, {})
                        },

                        /**costing report **/
                        function(callback) {
                            callback(null, {})
                        },

                        /**Billing report **/
                        function(callback) {
                            callback(null, {})
                        }
                    ], function(err, result) {
                        console.log("result for mis type" + misType + JSON.stringify(result));
                        UserPref.findAsync({ clientId: client.clientId })
                            .then(function(userPrefsArr) {
                                async.forEachOf(userPrefsArr, function(userPref, index, callback) {
                                    sendEmailToUser(misType, datetimeStart,
                                        datetimeEnd, result, userPref);
                                    callback();

                                })
                            })
                    });
                }
            });
        });
};

/** This is how attachments is prepared
 attachments = [ {
 filename : fileName ,
 path: fileAbsolutePath,
 contentType: contentType}]
}*/

function sendEmailToUser(misType, start_time, end_time, arrObjEmailServiceData, userPref) {
    /**If userPref doc has email **/
    if (userPref.email) {
        var arrAttachments = [];
        /**If userPref doc has access to reportKind and misType, add it to attachments list **/
        for (var j = 0; j < arrObjEmailServiceData.length; j++) {
            if (Object.keys(arrObjEmailServiceData[j]).length > 0) {
                if (userPref[arrObjEmailServiceData[j]["reportKind"]] &&
                    userPref[arrObjEmailServiceData[j]["reportKind"]][misType]) {
                    arrAttachments.push({
                        filename: arrObjEmailServiceData[j].excelServiceData.filename,
                        path: projectHome + '/files/' + arrObjEmailServiceData[j].excelServiceData.dir +
                            arrObjEmailServiceData[j].excelServiceData.filename,
                        contentType: mime.lookup(arrObjEmailServiceData[j].excelServiceData.filename)
                    });
                }
            }
        }

        /**If user has any preferences set, size(attachments) from above would be >0 **/
        if (arrAttachments.length > 0) {
            var summary = "";
            for (var i = 0; i < arrObjEmailServiceData.length; i++) {
                if (arrObjEmailServiceData[i].summary) {
                    for (var j = 0; j < arrObjEmailServiceData[i].summary.length; j++) {
                        summary = summary + " " +
                            arrObjEmailServiceData[i].summary[j].desc + " : " + arrObjEmailServiceData[i].summary[j].value;
                        if (j !== arrObjEmailServiceData[i].summary.length) {
                            summary = summary + ",";
                        }
                    }
                    summary = summary + "\n";
                }
            }
            var mailOptions;
            if (misType === "daily") {
                mailOptions = {
                    to: userPref.email,
                    from: 'LMS [System Generated] <futuretrucksakh@gmail.com>',
                    subject: 'LMS daily MIS Reports : ' + dateUtil.getDDMMYYYY(start_time), // Subject line
                    text: "Dear user, \n Please find attached daily MIS reports." +
                        "To know more details, please login to your LMS account\n" +
                        "Summary : \n" + summary,
                    html: "Dear user, <br> Please find attached daily MIS reports." +
                        "To know more details, please login to your LMS account<br>" +
                        "Summary :<br>" + summary,
                    attachments: arrAttachments
                };
            } else if (misType === "aggregated") {
                mailOptions = {
                    to: userPref.email,
                    from: 'LMS [System Generated] <futuretrucksakh@gmail.com>',
                    subject: 'LMS month-aggregated MIS Reports : ' + dateUtil.getDDMMYYYY(start_time) + " to " +
                        dateUtil.getDDMMYYYY(end_time), // Subject line
                    text: "Dear user, \n Please find attached month-aggregated MIS reports." +
                        "To know more details, please login to your LMS account\n" +
                        "Summary : \n" + summary,
                    html: "Dear user, <br> Please find attached month-aggregated MIS reports." +
                        "To know more details, please login to your LMS account<br>" +
                        "Summary :<br>" + summary,
                    attachments: arrAttachments
                };
            } else if (misType === "weekly") {
                mailOptions = {
                    to: userPref.email,
                    from: 'LMS [System Generated] <futuretrucksakh@gmail.com>',
                    subject: 'LMS weekly MIS Reports : ' + dateUtil.getDDMMYYYY(start_time) + " to " +
                        dateUtil.getDDMMYYYY(end_time), // Subject line
                    text: "Dear user, \n Please find attached weekly MIS reports." +
                        "To know more details, please login to your LMS account\n" +
                        "Summary : \n" + summary,
                    html: "Dear user, <br> Please find attached weekly MIS reports." +
                        "To know more details, please login to your LMS account<br>" +
                        "Summary :<br>" + summary,
                    attachments: arrAttachments
                };
            } else if (misType === "monthly") {
                mailOptions = {
                    to: userPref.email,
                    from: 'LMS [System Generated] <futuretrucksakh@gmail.com>',
                    subject: 'LMS monthly MIS Reports : ' + dateUtil.getDDMMYYYY(start_time) + " to " +
                        dateUtil.getDDMMYYYY(end_time), // Subject line
                    text: "Dear user, \n Please find attached monthly MIS reports." +
                        "To know more details, please login to your LMS account\n" +
                        "Summary : \n" + summary,
                    html: "Dear user, <br> Please find attached monthly MIS reports." +
                        "To know more details, please login to your LMS account<br>" +
                        "Summary :<br>" + summary,
                    attachments: arrAttachments
                };
            }
            //console.log(mailOptions);
            emailUtil.sendMailWithAttachments(mailOptions);
        }
    }
}

module.exports = misUtil;