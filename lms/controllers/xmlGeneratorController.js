/**
 * Created by Nipun on 4/10/2017.
 */

var router = require('express').Router();
var sapXMLGeneratorUtil = require(projectHome+"/utils/sapXMLGeneratorUtil");

router.get('/CustomerXML',function (req,res,next) {
    var timeFired = new Date().getTime();
    var startTime = dateUtil.getMorning(timeFired).getTime();
    req.query.upload=req.query.upload=="true"?true:false;
    sapXMLGeneratorUtil.generateCustomerXMLs(startTime, timeFired,req.query.upload || false);
});

router.get('/InvoiceXML',function (req,res,next) {
    var timeFired = new Date().getTime();
    var startTime = dateUtil.getMorning(timeFired).getTime();
    req.query.upload=req.query.upload=="true"?true:false;
    sapXMLGeneratorUtil.generateInvoiceXMLs(startTime, timeFired,req.query.upload || false);
});

router.get('/ExpensesXML',function (req,res,next) {
    var timeFired = new Date().getTime();
    var startTime = dateUtil.getMorning(timeFired).getTime();
    req.query.upload=req.query.upload=="true"?true:false;
    sapXMLGeneratorUtil.generateExpensesXMLs(startTime, timeFired,req.query.upload || false);
});

router.get('/',function (req,res,next) {
    var timeFired = new Date().getTime();
    var startTime = dateUtil.getMorning(timeFired).getTime();
    req.query.upload=req.query.upload=="true"?true:false;
    sapXMLGeneratorUtil.generateCustomerXMLs(startTime, timeFired,req.query.upload || false);
    sapXMLGeneratorUtil.generateInvoiceXMLs(startTime, timeFired,req.query.upload || false);
    sapXMLGeneratorUtil.generateExpensesXMLs(startTime, timeFired,req.query.upload || false);
});

module.exports = router;