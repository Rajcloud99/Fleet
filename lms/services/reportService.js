/**
 * Created by manish on 9/1/17.
 */
var exports ={};
var TripExpense = promise.promisifyAll(commonUtil.getService("trip_expenses"));
var InvoiceService = promise.promisifyAll(commonUtil.getService("invoice"));
var Trip = promise.promisifyAll(commonUtil.getModel("trip"));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function mergeInvoices(aList, aObject){
    var aOutput = [];
    for (var i = 0; i < aList.length; i++) {
        var aSameData = [];
        for (var j = 0; j < aObject.length; j++) {
            if(aList[i] == aObject[j].trip_no) {
                aSameData.push(aObject[j]);
            }
        }
        var invoiceTotal = 0;
        for (var k = 0; k < aSameData.length; k++) {
            if(typeof aSameData[k].total_expenses != 'undefined'){
                invoiceTotal = invoiceTotal + aSameData[k].total_expenses;
            }

            if(k == (aSameData.length -1)) {
                aSameData[k].invoiceTotal = invoiceTotal;
                aOutput.push(aSameData[k]);
            }
        }
    }
    return aOutput;
}

function generateProfitability(aInvoice,aExpense){
    var aProfitability = [];
    for (var g = 0; g < aExpense.length; g++) {
        for (var i = 0; i < aInvoice.length; i++) {
            if(aExpense[g].trip_no == aInvoice[i].trip_no){
                var aCustomerName = [];
                for (var h = 0; h < aInvoice.length; h++) {
                    if(aInvoice[h].trip_no === aInvoice[i].trip_no){
                        aCustomerName.push(aInvoice[h].customer_name);
                    }
                }
                aInvoice[i].customers = aCustomerName.toString();
                console.log(aInvoice[i].branch);
                aInvoice[i].branch = aInvoice[i].booking_info && aInvoice[i].booking_info[0] ? aInvoice[i].booking_info[0].branch : "NA";
                var profit = parseFloat((aInvoice[i].invoiceTotal || 0)-(aExpense[g].total_expense || 0));
                aInvoice[i].profitability = (Math.round(profit * 100) / 100);
                aInvoice[i].total_expences = aExpense[g].total_expense;
                if((aInvoice[i].profitability !== 0) && (aExpense[g].total_expense !== 0)){
                    var percent = ((aInvoice[i].profitability)/(aExpense[g].total_expense))*100;
                    aInvoice[i].profitability_percent = (Math.round(percent * 100) / 100)
                }
                aProfitability.push(aInvoice[i]);
            }
        }
    }
    return aProfitability;
}

exports.postProfitabilityIntrmdt = function(req, callback){
    function getProfitability(req, callback) {
      console.log('getProfitability query',req.query);
        TripExpense.getProfitabilityExpenseAsync(req.query)
            .then(function (data) {
              console.log('getProfitability data',data);
                if (data) {
                    var aExpense = data.data;
                    var aTripNumber = [];
                    if (req.query.reportType!=="mis") {
                        for (var i = 0; i < aExpense.length; i++) {
                            if (aExpense[i].trip_no) {
                                aTripNumber.push(aExpense[i].trip_no);
                            }
                        }
                    }else {
                        aTripNumber = req.query.trip_no;
                    }
                    var oQuery = {"clientId": req.query.clientId, "trip_no": {$in: aTripNumber}};
                    InvoiceService.getProfitabilityInvoiceAsync(oQuery)
                        .then(function (invoiceData) {
                            if (invoiceData && invoiceData[0]) {
                                var aTempTripNo = [];
                                var aInvoiceData = invoiceData;
                                //Getting Trip No from invoice
                                for (var j = 0; j < aInvoiceData.length; j++) {
                                    aTempTripNo.push(aInvoiceData[j].trip_no)
                                }
                                //Unique the Trip No
                                var aUniqueTripNo = aTempTripNo.filter(onlyUnique);
                                //comapiring and generating data
                                var aUniqueInvoice = mergeInvoices(aUniqueTripNo, aInvoiceData);
                                var aProfitability = generateProfitability(aUniqueInvoice, aExpense);
                                callback(null, aProfitability);
                            } else {
                                return callback("No profitability found")
                            }
                        }).catch(callback);
                } else {
                    return callback("No profitability found")
                }
            }).catch(callback);
    }

    /**If mis type requested, find all trips which ended within the period **/
    if (req.query.reportType==="mis"){
        Trip.findAsync({clientId:req.query.clientId,
            $and:[{"trip_end.time" : {$lt: req.query.end_date}},
            {"trip_end.time": {$gte: req.query.start_date}}]})
            .then(function (tripsArr) {
                if (tripsArr.length>0) {
                    var trip_no_arr = [];
                    for (var i = 0; i < tripsArr.length; i++){
                        trip_no_arr.push(tripsArr[i].trip_no);
                    }
                    req.query.trip_no = trip_no_arr;
                    getProfitability(req, callback);
                }else{
                    callback("No trips found to calculate profitability");
                }
            }).catch(callback);
    }else {
        getProfitability(req,callback);
    }

};


/************************pre profitability *****************************************************/

/*
 query = {
    start_date:Date,
    end_date:Date,
    clientId:String,
    reportType:"miscellaneous"/"mis",
    aggregateBy : "driver_wise"/"customer_wise"/"executive_wise"/"trip_wise"
 }
 */

/*aggregatedData = {
    "key1":{
        "results":[{doc} {doc}],
        "summary":{
            key:value,
            key:value
        },
 },
    "key2":{
        "results":[{doc} {doc}],
        "summary":{
            key:value,
            key:value
        },
    }
   }
 }*/
/*

 aggregatedDataBeforeExcel = {
    start_date: Date,
    end_date: Date,
    clientId: String,
    reportType:"miscellaneous"/"mis",
    data:{
    "key":{
        "results":[{doc} {doc}],
        "summary":{
            key:value,
            key:value
        },
    }
    }
    }
 */

function processPreProfitabilityDocs(docsArr){
    /**Split multiple gr's into singular objects **/
    var data = [];
    for (var i=0;i<docsArr.length;i++) {
        var totalTripWeight = 0;
        var indivisualGRWeights = [];
        for (var j=0;j<docsArr[i].gr.length;j++) {
            var indivisualGRWeight = 0;
            for (var k=0;k<docsArr[i].gr[j].booking_info.length;k++){
                if (docsArr[i].gr[j].booking_info[k].weight.unit==="mt"){
                    totalTripWeight += docsArr[i].gr[j].booking_info[k].weight.value;
                   indivisualGRWeight += docsArr[i].gr[j].booking_info[k].weight.value;
                }else if(docsArr[i].gr[j].booking_info[k].weight.unit==="tonne")
                    totalTripWeight +=  docsArr[i].gr[j].booking_info[k].weight.value * (1.0160469088);
                    indivisualGRWeight += docsArr[i].gr[j].booking_info[k].weight.value * (1.0160469088);
            }
            indivisualGRWeights.push(indivisualGRWeight);
        }
        for (var j=0;j<docsArr[i].gr.length;j++){
            var toPush = JSON.parse(JSON.stringify(docsArr[i]));
            toPush.gr = docsArr[i].gr[j];
            var sum_cost = 0;
            var sum_sold = 0;
            for (var k=0;k<toPush.gr.booking_info.length;k++){
                sum_sold+= toPush.gr.booking_info[k].rate;
            }
            sum_cost += toPush.gr.loading_charges || 0;
            sum_cost += toPush.gr.unloading_charges || 0;
            sum_cost += toPush.gr.munshiyana_charges || 0;
            sum_cost += toPush.gr.other_charges || 0;
            sum_cost += ((toPush.total_diesel_cost || 0) * indivisualGRWeights[j])/totalTripWeight;
            sum_cost += ((toPush.actual_cash_allotted || 0) * indivisualGRWeights[j])/totalTripWeight;
            toPush.gr.sum_cost = sum_cost;
            toPush.gr.sum_sold = sum_sold;
            toPush.gr.profit_made = sum_sold -sum_cost;
            toPush.gr.profit_percent = ((sum_sold-sum_cost)/sum_cost)*100;
            data.push(toPush);
        }
    }
    return data;
}

function aggregateDocsBy (docsArr, keyName) {
    var aggregatedDataObj= {};
    for (var i=0;i<docsArr.length;i++){
        if (aggregatedDataObj[docsArr[i][keyName]]){
            aggregatedDataObj[docsArr[i][keyName]].results.push(docsArr[i])
        }else{
            aggregatedDataObj[docsArr[i][keyName]] = {};
            aggregatedDataObj[docsArr[i][keyName]]["results"] = [];
            aggregatedDataObj[docsArr[i][keyName]].results.push(docsArr[i])
        }
    }
    return aggregatedDataObj;
}

/**first argument is aggregatedDataObj, rest are keys to summarize **/
function summarize(){
    var aggregatedDataObj = arguments[0];
    var args = Array.prototype.splice.call(arguments,1);
    var summary = {};
    var keys = Object.keys(aggregatedDataObj);
    for (var i=0;i<keys.length;i++){
        if (aggregatedDataObj.hasOwnProperty(keys[i])) {
            for (var m = 0; m < args.length; m++) {
                summary[args[m]] = 0;
            }
            for (var j = 0; j < aggregatedDataObj[keys[i]]["results"].length; j++) {
                for (var k = 0; k < args.length; k++) {
                    summary[args[j]] += aggregatedDataObj[keys[i]]["results"][j][args[k]];
                }
            }
            aggregatedDataObj[keys[i]]["summary"] = summary;
        }
    }
    return aggregatedDataObj;
}

exports.preProfitabilityIntrmdt = function(req, callback) {
    Trip.findAsync({clientId:req.query.clientId,
        $or:[{"allocation_date" : {$lt: req.query.end_date}},
            {"allocation_date": {$gte: req.query.start_date}}]})
        .then(function(tripDocsArrr){
            tripDocsArrr = JSON.parse(JSON.stringify(tripDocsArrr));
            console.log("tripsss",JSON.stringify(tripDocsArrr));
            var data = processPreProfitabilityDocs(tripDocsArrr);
            var aggregatedDataWithSummary;
            if (req.query.aggregateBy ==="driver_wise"){
                var aggregatedData = aggregateDocsBy(data,"driver");
                aggregatedDataWithSummary = summarize(aggregatedData,"gr.sum_cost",
                    "gr.sum_sold","gr.profit_made");
                //callback(null,aggregatedDataWithSummary);
            }else if(req.query.aggregateBy ==="customer_wise"){
                aggregatedData = aggregateDocsBy(data,"gr.customer_id");
                aggregatedDataWithSummary = summarize(aggregatedData,"gr.sum_cost",
                    "gr.sum_sold","gr.profit_made");
                //callback(null,aggregatedDataWithSummary);
            }else if(req.query.aggregateBy ==="trip_wise"){
                aggregatedData = aggregateDocsBy(data,"trip_no");
                aggregatedDataWithSummary = summarize(aggregatedData,"gr.sum_cost",
                    "gr.sum_sold","gr.profit_made");
                //callback(null,aggregatedDataWithSummary);
            }
            callback(null,aggregatedDataWithSummary);

        }).catch(callback);
};

module.exports = exports;
