/**
 * Created by manish on 6/2/17.
 */

var router = express.Router();
var sapXmlGeneratorUtil = require("../../utils/sapXMLGeneratorUtil");

router.get("/customerxml",function(req,res,next){
    if(!req.query) req.query={};
    if(!req.query.end_time) req.query.end_time = new Date().getTime();
    if(!req.query.start_time) req.query.start_time = dateUtil.getMorning(req.query.end_time).getTime();
    req.upload=req.query.upload=="true"?true:false;
    sapXmlGeneratorUtil.generateCustomerXMLs(req.query.start_time,req.query.end_time,req.upload,function (err,respObj) {
        if(err) return next(err);
        return res.status(200).json({
                "status":"OK",
                "message":"Generated sap xmls links",
                "data":respObj
            })
        })
});

router.get("/invoicexml",function(req,res,next){
    if(!req.query) req.query={};
    if(!req.query.end_time) req.query.end_time = new Date().getTime();
    if(!req.query.start_time) req.query.start_time = dateUtil.getMorning(req.query.end_time).getTime();
    req.upload=req.query.upload=="true"?true:false;
    sapXmlGeneratorUtil.generateInvoiceXMLs(req.query.start_time,req.query.end_time,req.upload,function (err,respObj) {
        if(err) return next(err);
        return res.status(200).json({
            "status":"OK",
            "message":"Generated sap xmls links",
            "data":respObj
        })
    })
});

router.get("/expensesxml",function(req,res,next){
    if(!req.query) req.query={};
    if(!req.query.end_time) req.query.end_time = new Date().getTime();
    if(!req.query.start_time) req.query.start_time = dateUtil.getMorning(req.query.end_time).getTime();
    req.upload=req.query.upload=="true"?true:false;
    sapXmlGeneratorUtil.generateExpensesXMLs(req.query.start_time,req.query.end_time,req.upload,function (err,respObj) {
        if(err) return next(err);
        return res.status(200).json({
            "status":"OK",
            "message":"Generated sap xmls links",
            "data":respObj
        })
    })
});

module.exports = router;