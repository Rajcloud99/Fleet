/**
 * @Author: Pratik
 * @Date:   2016-11-17T11:20:38+05:30
 */
var NO_OF_DOCS = 15;
var TripExpense = promise.promisifyAll(commonUtil.getModel('trip_expenses'));
var ExpensesXmlJsonModel = promise.promisifyAll(require('../models/expensesXmlJsonModel'));
var XmlJsonMappingService = promise.promisifyAll(commonUtil.getService('xmlJsonMapping'));
var BranchService = promise.promisifyAll(commonUtil.getService("branch"));
var Trip = promise.promisifyAll(commonUtil.getModel('trip'));

var allowedTripFilter = ['clientId','isMarketVehicle','gr_done','trip_stage','gr_stage','diesel_stage','status','type','vehicle_no','trip_no','booking_no','boe_no','container_no','customer_id','customer_name','start_date','end_date','route_id','trip_end','gr_ack_exp_date','trip_status','vendor','before_end_date'];
var allowedFilter = ['clientId', 'trip_no', 'status', 'booking_no', 'boe_no', 'customer_id', 'start_date', 'end_date', 'trip_no','vendor_id'];
var allowedFilterForProfitability = ['clientId', 'trip_no'];
var allowedExpenseFilter = ['expense_date','start_date','end_date','before_end_date','clientId'];
function prepareResponseData(trip) {
    var responseData = [];
    for (var i = 0; i < trip.length; i++) {
        if (trip[i].trip_expense) {
            trip[i].trip_expense.allocation_date = trip[i].allocation_date;
            trip[i].trip_expense.route = trip[i].route;
            trip[i].trip_expense.trip_end = trip[i].trip_end;
            trip[i].trip_expense.trip_start = trip[i].trip_start;
            trip[i].trip_expense.vehicle = trip[i].vehicle;
            trip[i].trip_expense.vehicle_no = trip[i].vehicle_no;
            trip[i].trip_expense.vehicle_type = trip[i].vehicle_type;
            trip[i].trip_expense.driver_name = trip[i].driver_name;
            trip[i].trip_expense.driver_contact = trip[i].driver_contact;
            trip[i].trip_expense.vendor_name = trip[i].vendor_name;
            trip[i].trip_expense.vendor_contact = trip[i].vendor_contact?trip[i].vendor_contact:undefined;
            trip[i].trip_expense.vendor = trip[i].vendor;
            responseData.push(trip[i].trip_expense);
        }
    }
    return responseData;
}

function prepareExpenseData(trip) {
    var responseData = [];
    for (var i = 0; i < trip.length; i++) {
        if (trip[i].trip_expense) {
            trip[i].trip_expense.driver_sap_id = trip[i].driver_sap_id;
            trip[i].trip_expense.allocation_date = trip[i].allocation_date;
            trip[i].trip_expense.vehicle_sap_id = trip[i].vehicle_sap_id;
            trip[i].trip_expense.route = trip[i].route;
            trip[i].trip_expense.trip_end = trip[i].trip_end;
            trip[i].trip_expense.trip_start = trip[i].trip_start;
			trip[i].trip_expense.actual_trip_start = trip[i].trip_start.time;
            trip[i].trip_expense.vehicle = trip[i].vehicle;
            trip[i].trip_expense.vehicle_no = trip[i].vehicle_no;
            trip[i].trip_expense.vehicle_type = trip[i].vehicle_type;
            trip[i].trip_expense.driver_name = trip[i].driver_name;
            trip[i].trip_expense.driver_contact = trip[i].driver_contact;
            trip[i].trip_expense.vendor_name = trip[i].vendor_name;
            trip[i].trip_expense.vendor_contact = trip[i].vendor_contact?trip[i].vendor_contact:undefined;
            trip[i].trip_expense.vendor = trip[i].vendor;
            trip[i].trip_expense.gr = trip[i].gr;
            responseData.push(trip[i].trip_expense);
        }
    }
    return responseData;
}
var constructFilters = function (query) {
    var fFilter = {};
    for (var i in query) {
        if (query.hasOwnProperty(i)) {
            if (otherUtil.isAllowedFilter(i, allowedFilter)) {
                if (i == 'start_date' && query.end_date) {
                    var startDate = new Date(query[i]);
                    var nextDay = new Date(query.end_date);
                    fFilter["invoice_date"] = {
                        "$gte": startDate,
                        "$lt": nextDay
                    };
                } else if (i == 'start_date') {
                    var startDate = new Date(query[i]);
                    startDate.setSeconds(0);
                    startDate.setHours(0);
                    startDate.setMinutes(0);
                    var nextDay = new Date(startDate);
                    nextDay.setDate(startDate.getDate() + 1);
                    fFilter["invoice_date"] = {
                        "$gte": startDate,
                        "$lt": nextDay
                    };
                } else if (i == 'end_date' && !query.start_date) {
                    var endDate = new Date(query[i]);
                    fFilter["invoice_date"] = {
                        "$lt": endDate
                    };
                } else {
                    fFilter[i] = query[i];
                }
            }
        }
    }
    return fFilter;
};

var constructFiltersForProfitability = function (query) {
    var fFilter = {};
    for (var i in query) {
        if (query.hasOwnProperty(i)) {
            if (otherUtil.isAllowedFilter(i, allowedFilterForProfitability)) {
                if (i === 'trip_no') {
                    fFilter[i] = {$in: query[i]};
                } else {
                    fFilter[i] = query[i];
                }
            }
        }
    }
    return fFilter;
};

var constructTripFilters = function(query){
    var fFilter = {"deleted":false};
    for(i in query){
        if(otherUtil.isAllowedFilter(i,allowedTripFilter)){
            if(i =='start_date' && query.end_date){
                var startDate = new Date(query[i]);
                var nextDay = new Date(query.end_date);
                fFilter["created_at"] = {
                        "$gte" :startDate,
                        "$lt":nextDay
                };
            }else if(i =='start_date'){
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["created_at"] = {
                            "$gte" :startDate,
                            "$lt":nextDay
                    };
            }else if(i =='end_date' && !query.start_date){
                var endDate = new Date(query[i]);
                fFilter["created_at"] = {
                            "$lt" :endDate
                    };
            }else if(i == 'gr_stage'){
                fFilter['gr.gr_stage'] =  query[i];
            }else if(i == 'booking_no'){
                fFilter['gr.booking_info.booking_no'] =  query[i];
            }else if(i == 'container_no'){
                fFilter['gr.booking_info.container_no'] =  query[i];
            }else if(i == 'customer_name'){
                fFilter['gr.booking_info.customer_name'] =  query[i];
            }else if(i == 'customer_id'){
                fFilter['gr.customer_id'] =  query[i];
            }else if(i == 'boe_no'){
                fFilter['gr.booking_info.boe_no'] =  query[i];
            }else if(i == 'materialType'){
                fFilter['materialType.material_type'] =  query[i];
            }else if(i == 'driver'){
                fFilter['driver'] =  mongoose.Types.ObjectId(query[i]);
            }else if(i == 'gr_done'){
                fFilter['gr.gr_no'] =  query[i];
            }else if(i == 'ack_status'){
                fFilter['gr.ack_status'] =  query[i];
            }else if(i == 'gr_ack_exp_date'){
                fFilter['gr.gr_ack_exp_date'] =  query[i];
            }else if(i == 'route_id'){
                fFilter['route.route_id'] =  mongoose.Types.ObjectId(query[i]);
            }else if(i == 'trip_end'){
                fFilter['trip_end.status'] =  query[i] == "true" || true  ? true : false;
            } else if(i == 'isMarketVehicle') {
                fFilter['trip.isMarketVehicle'] = query[i];

            }
            else {
                fFilter[i] = query[i];
            }

        }
    }
    return fFilter;
 };
var constructExpenseFilters = function(query){
    var fFilter = {"deleted":false};
    for(i in query){
        if(otherUtil.isAllowedFilter(i,allowedExpenseFilter)){
           if(i =='expense_date'){
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["actual_trip_start"] = {
                            "$gte" :startDate,
                            "$lt":nextDay
                    };
            }else if(i =='expense_date_end'){
			   var startDate = new Date(query[i]);
			   startDate.setSeconds(0);
			   startDate.setHours(0);
			   startDate.setMinutes(0);
			   var nextDay = new Date(startDate);
			   nextDay.setDate(startDate.getDate() + 1);
			   fFilter["trip_end.time"] = {
				   "$gte" :startDate,
				   "$lt":nextDay
			   };
		   }else if(i =='before_end_date'){
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                fFilter["trip_end.time"] = {
                            "$lt" :startDate
                    };
            }else if (i == 'start_date' && query.end_date) {
			   var startDate = new Date(query[i]);
			   var nextDay = new Date(query.end_date);
			   fFilter["actual_trip_start"] = {
				   "$gte": startDate,
				   "$lt": nextDay
			   };
		   }else if (i == 'end_date') {
			  //remove end date filter
		   }else {
                fFilter[i] = query[i];
            }

        }
    }
    return fFilter;
 };

function prepareTripExpenseData(tripData) {
    var newExpense = {
        gr_charges: 0,
        weightman_charges: 0,
        loading_charges: 0,
        unloading_charges: 0,
        other_charges: 0,
        rate: 0,
        chalan: 0,
        detaintion: 0,
        damage: 0,
        advance: 0,
        balance: 0,
        driver_cash: 0,
        driver_additional_cash_alloted : (tripData.additional_cash_alloted || 0),
        driver_actual_cash_alloted : (tripData.actual_cash_alloted || 0),
        total_expense: 0,
        toll_tax_total_price: 0,
        diesel_expenses_total_price: 0,
        diesel_expenses_total_litre: 0,
        additional_expenses_total_price: 0,
        penalty_total_price: 0,
        vendor_name: tripData.vendor_name,
        vendor_contact: tripData.vendor_contact?tripData.vendor_contact:null,
        vendor: tripData.vendor,
        route_name : tripData.route?tripData.route.route_name:undefined,
        branch : tripData.branch || tripData.gr[0].branch,
        vehicle_no : tripData.vehicle_no,
        created_by: tripData.created_by,
        driver_name : tripData.driver_name
    };
    newExpense.driver_cash = ((tripData.additional_cash_alloted || 0)+(tripData.actual_cash_alloted || 0));
    newExpense.isMarketVehicle = tripData.isMarketVehicle;
    newExpense.isMultiCustomer = tripData.isMultiCustomer;
    newExpense.total_weight = 0;
    newExpense.weight_unit = "tonne";

    if(newExpense.isMultiCustomer){
        customerName = [];
        customerId = [];
        sap_id = [];
        if(tripData.gr && (tripData.gr.length>0)){
            for (var i = 0; i < tripData.gr.length; i++) {
                customerId.push(tripData.gr[i].customer_id);
                customerName.push(tripData.gr[i].customer_name);
                sap_id.push(tripData.gr[i].sap_id);
                if(tripData.gr[i].weight){
                  newExpense.total_weight = (newExpense.total_weight) + (tripData.gr[i].weight);
                }
            }
        }
        newExpense.customer_id = (customerId.length>0)?customerId.join():null;
        newExpense.customer_name = (customerName.length>0)?customerName.join():null;
        newExpense.sap_id = (sap_id.length>0)?sap_id.join():null;
    }else{
        if(tripData.gr && (tripData.gr.length>0)){
            newExpense.customer_id = tripData.gr[0].customer_id;
            newExpense.customer_name = tripData.gr[0].customer_name;
            newExpense.sap_id = tripData.gr[0].sap_id;
            newExpense.total_weight = tripData.gr[0].weight;
        }
    }
    if (tripData.trip_no) {
        newExpense.trip_no = tripData.trip_no;
    }
    if (tripData.clientId) {
        newExpense.clientId = tripData.clientId;
    }
    if (tripData.isMarketVehicle) {
        if (tripData.vendor_payment) {
            newExpense.vendor_payment = tripData.vendor_payment;
            newExpense.advance = tripData.vendor_payment.advance || 0;
            newExpense.balance = tripData.vendor_payment.toPay || 0;
            newExpense.total_expense = ((tripData.vendor_payment.advance || 0) + (tripData.vendor_payment.toPay || 0));
        }
    } else {

        newExpense.toll_tax_expenses = [];
        newExpense.additional_expenses = [];
        newExpense.penalty = [];
        newExpense.diesel_expenses = [];
        if (tripData.diesel_vendors && tripData.diesel_vendors.length > 0) {
            newExpense.diesel_expenses = tripData.diesel_vendors;
        }
        if (tripData.route && tripData.route.rates && tripData.route.rates.allot) {
            /*if (tripData.route.rates.allot.cash) {
                newExpense.driver_cash = tripData.route.rates.allot.cash;
            }*/
            if (tripData.route.rates.allot.toll_tax) {
                var toll = {};
                toll.toll_cost = tripData.route.rates.allot.toll_tax;
                toll.toll_name = null;
                toll.toll_address = null;
                newExpense.toll_tax_expenses.push(toll);
            }
            if (tripData.route.rates.allot.extra_expenses) {
                newExpense.additional_expenses.push(tripData.route.rates.allot.extra_expenses);
            }
            if (tripData.route.rates.allot.penalty) {
                newExpense.penalty.push(tripData.route.rates.allot.penalty);
            }
        }
        if (newExpense.toll_tax_expenses && newExpense.toll_tax_expenses.length > 0) {
            var sum = 0;
            for (var i = 0; i < newExpense.toll_tax_expenses.length; i++) {
                if (newExpense.toll_tax_expenses[i].toll_cost) {
                    sum = sum + newExpense.toll_tax_expenses[i].toll_cost;
                }
            }
            newExpense.toll_tax_total_price = sum;
        }
        if (newExpense.diesel_expenses && newExpense.diesel_expenses.length > 0) {
            var sum = 0;
            var ltr = 0;
            for (var i = 0; i < newExpense.diesel_expenses.length; i++) {
                if (newExpense.diesel_expenses[i].amount) {
                    sum = sum + newExpense.diesel_expenses[i].amount;
                }
                if (newExpense.diesel_expenses[i].litres) {
                    ltr = ltr + newExpense.diesel_expenses[i].litres;
                }
            }
            newExpense.diesel_expenses_total_price = sum;
            newExpense.diesel_expenses_total_litre = ltr;
        }
        if (newExpense.additional_expenses && newExpense.additional_expenses.length > 0) {
            var sum = 0;
            for (var i = 0; i < newExpense.additional_expenses.length; i++) {
                if (newExpense.additional_expenses[i].cost) {
                    sum = sum + newExpense.additional_expenses[i].cost;
                }
            }
            newExpense.additional_expenses_total_price = sum;
        }
        if (newExpense.penalty && newExpense.penalty.length > 0) {
            var sum = 0;
            for (var i = 0; i < newExpense.penalty.length; i++) {
                if (newExpense.penalty[i].cost) {
                    sum = sum + newExpense.penalty[i].cost;
                }
            }
            newExpense.penalty_total_price = sum;
        }
        newExpense.total_expense = ((newExpense.driver_cash || 0) + (newExpense.toll_tax_total_price || 0) + (newExpense.diesel_expenses_total_price || 0) + (newExpense.additional_expenses_total_price || 0) + (newExpense.penalty_total_price || 0))
        newExpense.total_trip_advance = ((newExpense.driver_cash || 0) + (newExpense.toll_tax_total_price || 0) + (newExpense.diesel_expenses_total_price || 0));
    }
    return newExpense;
}
function generateExpenseXMLData(error,response){
  BranchService.findBranchQueryAsync({name:response.branch,clientId:response.clientId})
    .then(function(branch){
      oResp = JSON.parse(JSON.stringify(response));
      if(branch && branch[0]){
        oResp.profit_center = branch[0].profit_center;
        oResp.cost_center = branch[0].cost_center;
      }
  var dataIDOC = XmlJsonMappingService.prepareExpensesXMLJsonData(null,oResp);
  var dataToSave = {clientId:oResp.clientId,data:dataIDOC};
  var expensesXMLJsonDataToSave = new ExpensesXmlJsonModel(dataToSave);
  return expensesXMLJsonDataToSave.saveAsync();
})
};
module.exports.generateExpenseXMLDataNew = function(expense,callback){
  BranchService.findBranchQueryAsync({name:expense.branch,clientId:expense.clientId})
    .then(function(branch){
      if(branch && branch[0]){
		  expense.profit_center = branch[0].profit_center;
		  expense.cost_center = branch[0].cost_center;
      }else{
        console.log('branch not found',expense.branch);
      }
  var dataIDOC = XmlJsonMappingService.prepareExpensesXMLJsonData(null,expense);
  var dataToSave = {clientId:expense.clientId,data:dataIDOC};
  var expensesXMLJsonDataToSave = new ExpensesXmlJsonModel(dataToSave);
  return expensesXMLJsonDataToSave.saveAsync();
}).then(function (savedData) {
          callback(null,expense);
});
};
module.exports.addTripExpense = function (trip, next) {
    var data = prepareTripExpenseData(trip);
    TripExpense.findAsync({clientId: data.clientId, trip_no: data.trip_no})
        .then(function (count) {
            if (count && count.length === 0) {
                var expense = new TripExpense(data);
                return expense.saveAsync();
            } else if (count && count.length === 1) {
                return {"edit_expense": true,"count":count};
            } else {
                return {"edit_expense": false};
            }
        })
        .then(function (resultedData) {
            if (resultedData && resultedData._id) {
                /**add trip expense xml data**/
              //generateExpenseXMLData(null,resultedData);
              var expenseID = {trip_expense: resultedData._id};
              return Trip.updateAsync({clientId: data.clientId, trip_no: data.trip_no},
                    {"$set": expenseID}, {"new": true, "runValidators": true});
            } else if (resultedData.edit_expense) {
                return TripExpense.findOneAndUpdateAsync({"_id": resultedData.count[0]._id},
                    {"$set": data}, {"new": true, "runValidators": true});
            } else {
                return {"message": "expense not updated"}
            }
        }).then(function (updatedData) {
            winston.info(JSON.stringify(updatedData));
        }).catch(next);
};

module.exports.getTripExpense = function (reqQuery, next) {
    var queryFilters = constructTripFilters(reqQuery);
    queryFilters.trip_expense = { $exists : true };
    var no_of_pages = 1;
    Trip.countAsync(queryFilters)
        .then(function (count) {
            var cursor = Trip.find(queryFilters);
            var oSort = {'trip_no': -1};
            cursor.sort(oSort);

            var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
            if (no_of_documents > 15) {
                no_of_documents = 15;
            }
            if (reqQuery && reqQuery.skip) {//TODO check field is valid or not
                var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                cursor.skip(parseInt(skip_docs));
            }
         /* if (reqQuery && reqQuery.sortby && reqQuery.sortby.split(':')) {
              var params = reqQuery.sortby.split(':');
              if (params[0] && params[0] == 'created_at') {
                  //var oSort = {'created_at': params[1]};

              }
          }*/

            /*if(count/no_of_documents>1){
             no_of_pages = count/no_of_documents;
             }*/

            var no_of_documents;
            if (reqQuery.all == "true") {
                no_of_documents = 1000;
                if (count / no_of_documents > 1) {
                    no_of_pages = count / no_of_documents;
                }
                cursor.limit(parseInt(no_of_documents));
            } else {
                no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
                if (no_of_documents > 15) {
                    no_of_documents = 15;
                }
                if (count / no_of_documents > 1) {
                    no_of_pages = count / no_of_documents;
                }
                cursor.limit(parseInt(no_of_documents));
            }

            if (reqQuery && reqQuery.skip) {//TODO check field is valid or not
                var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                cursor.skip(parseInt(skip_docs));
            }

            cursor.limit(no_of_documents);
            cursor.populate("trip_expense");
            cursor.exec(
                function (err, available) {
                    if (err) {
                        return next(err);
                    }
                    if (available && available[0]) {
                        var temp = JSON.parse(JSON.stringify(available));
                        var modifiedData = prepareResponseData(temp);
                        var oRes = {};
                        oRes.no_of_pages = Math.ceil(no_of_pages);
                        oRes.data = modifiedData;
                        return next(null, oRes);
                    } else {
                        return next(null, false);
                    }
                }
            )
        })
        .catch(
            function (err) {
                return next(err);
            }
        );
};

module.exports.getTripExpenseNew = function (reqQuery, next) {
     //if(!reqQuery.end_date) reqQuery.end_date = new Date();
     var queryFilters = constructExpenseFilters(reqQuery);
	queryFilters.trip_expense = { $exists : true };
     //var uploadedTrips = [23,31,57,77,80,81,86,103,105,106,164,191,229,230,2,27,33,34,35,36,37,38,39,40,42,43,44,45,46,72,74,83,98,28,58,67,68,69,70,71,73,75,76,78,82,84,87,97,104,107,111,113,114,116,117,119,121,126,165,123,125,131,217,220,285,286,287,288,289,294,295,296,297,305,306,307,311,312,313,322,32,95,99,118,140,162,184,192,214,215,216,218,219,236,357,383,390,394,403,404,435,450,457,458,460,461,462,463,464,465,466,467,468,470,471,472,473,474,475,476,477,480,482,484,485,486,487,488,489,490,501,502,504,505,507,508,512,513,514,519,521,527,528,530,100,115,183,193,228,239,253,255,319,320,321,323,326,353,369,398,399,401,402,409,422,433,438,439,456,459,483,491,492,531,532,533,534,537,538,544,545,546,549,561,562,563,564,565,575,576,577,578,579,580,581,582,583,584,585,586,587,588,589,591,594,595,597,599,604,605,606,607,608,609,610,611,612,613,614,615,617,618,619,620,622,623,625,626,627,628,629,630,631,641,642,643,644,645,646,647,648,649,650,651,653,658,664,671,672,683,687,688,689,690,691,692,695,703,704,705,708,709,710,711,712,713,714,715,716,717,720,722,726,729,148,291,293,324,329,331,350,368,392,397,414,419,437,493,529,660,743,744,762,765,768,769,771,779,795,800,801,810,811,813,814,829,834,839,855,856,857,858,859,861,864,866,867,868,869,221,252,393,400,412,413,434,478,494,573,574,596,780,850,860,870,872,875,876,878,880,882,883,884,895,896,897,898,899,900,901,903,904,905,912,913,914,915,918,919,920,922,923,924,925,935,939,940,941,942,943,944,945,953,955,957,958,961,963,966,968,970,971,972,973,975,976,996,1018,1019,1020,1021,1022,102,124,137,251,590,842,854,921,946,947,948,950,952,977,1077,1091,1094,1096,1098,1099,1100,1101,1104,1105,1106,1110,1111,1112,1116,1119,1126,1128,1130,1135,1137,1139,1154,1157,1159,1161,1163,1165,1172,1173,1175,1194,1198,1199,1201,1202,1203,1204,1205,1206,1207,1208,1220,1230,1231,1232,1233,1234,1235,1236,1237,1238,1240,1241,1248,1254,1255,1260,415,902,986,1078,1079,1080,1109,1299,1300,1301,1318,1319,1320,1328,1329,1330,1353,1354,1355,1364,1365,1370,1372,1377,1380,1386,1402,1403,1404,1405,1406,1407,1410,1411,1412,1413,1414,1415,1416,1417,1418,1439,1440,112,141,824,851,885,1200,1450,1451,1458,1459,1462,1463,1470,1471,1472,1473,1489,1502,1504,1512,1513,1514,1516,1518,1521,1525,1533,1536,1540,1542,1544,1545,1546,1547,1548,1550,1551,1557,1559,1567,1570,1571,1572,1573,1574,1575,1576,1580,1581,1582,1583,1584,1585,1586,1597,1598,1599,1600,1602,1604,1605,1606,1611,1612,1613,1615,1618,1619,1620,1623,1624,1625,1626,1628,1629,1631,1650,1651,1653,1654,1655,143,1675,79,85,101,122,250,318,365,367,405,423,733,784,823,837,874,877,879,949,965,969,1035,1342,1343,1453,1457,1464,1465,1466,1467,1468,1621,1622,1667,1678,1681,1682,1683,1687,1688,1690,1704,1706,1707,1708,1709,1710,1711,1712,1713,1714,1719,1723,1724,1731,1733,1740,1741,1742,1743,1744,1745,1746,1747,1748,1749,1750,1751,1752,1753,1754,1755,1756,1757,1758,1760,1761,1762,1795,1796,1797,1799,1804,1805,1806,1807,1808,1809,1813,1814,1815,1816,292,1004,1689,1867,1868,1869,1870,1871,1872,1875,1876,1878,1880,1887,1888,1889,1890,1901,1905,1906,1908,1909,1910,1911,1913,1915,1917,1918,1919,1920,1921,1922,1923,1924,1925,1927,1928,1929,1930,1931,1932,1933,1934,1935,153,290,1454,1460,1541,1944,1945,1949,1950,1951,1953,1955,1956,1957,1958,1959,1960,1965,1966,1967,1968,1969,1970,1971,1972,1973,1974,1981,1988,1989,1990,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035,2037,160,1456,1632,1638,1641,1759,2088,2094,2095,2097,2100,2101,2115,917,1441,1633,317,1676,1863,1942,1943,1982,2154,916,1075,1302,1442,1443,1444,1449,1452,1455,1469,1640,1645,1666,1685,1686,1692,1705,1864,1891,1892,1941,2048,2127,2133,2135,2136,2137,2138,2146,2147,2150,2151,2219,2252,2253,2254,2264,1673,1693,2049,2134,2139,2142,2144,2145,2191,2208,2215,2220,2221,2228,2229,2232,2266,2268,2314,2315,2316,2317,2321,2323,2324,2332,2334,2335,2336,2337,2338,2346,2347,2348,2350,2351,2352,2353,2354,2355,2356,2357,2358,2359,2360,2361,2362,2365,2366,2367,2368,2369,2370,2371,2373,2375,2376,2382,2399,2400,2401,2402,2403,2404,2405,2406,1543,1991,2075,2090,2149,2156,2157,2160,2207,2209,2225,2230,2231,2257,2258,2259,2263,2267,2298,2301,2305,2307,2308,2309,2311,2312,2345,2372,2374,2390,2391,2392,2397,2460,2461,2462,2463,2485,2486,2487,2488,2510,110,254,2143,2227,2234,2235,2265,2299,2300,2344,2363,2415,2416,2418,2420,2532,2533,2534,2535,2536,2538,2540,2541,2542,2543,2544,2545,2546,2547,2548,2549,2550,2551,2552,2553,2554,2556,2558,2559,2560,2563,2562,2564,2572,2574,2577,2578,2579,2581,2582,2583,2584,2585,2586,2587,2588,2595,2597,2598,2600,2602,2603,2611,2619,2621,2622,2623,2624,2625,2626,2627,2629,2630,2631,2632,2633,2634,2635,2638,2639,2641,2643,2644,2645,2649,2651,2652,2653,2654,2655,2656,2657,2679,2680,2681,2682,2683,2685,2686,2688,2691,2692,2695,2697];
     //queryFilters.trip_no = {$nin : uploadedTrips };
	//var failedTrips = [9916,9240,9167,9118,9086,9080,9079,9078,9076,9075,9074,9073,9071,9069,9068,9067,9066,9065,9063,9058,9048,9047,9044,9043,9042,9041,9040,9039,9038,9037,9033,9031,9030,9014,9013,8999,8998,8988,8909,8908,8704,8689];
	//queryFilters.trip_no = {$in : failedTrips };
	var cursor = Trip.find(queryFilters);
     var oSort = {'trip_no': -1};
      cursor.sort(oSort);
      cursor.populate("trip_expense");
      cursor.exec(function (err, available) {
            if (err) {
                 return next(err);
             }
             if (available && available[0]) {
                  var temp = JSON.parse(JSON.stringify(available));
                  var modifiedData = prepareExpenseData(temp);
				  return next(null,modifiedData);
              } else {
                  return next(null, false);
             }
            }
         ).catch(
            function (err) {
                return next(err);
            }
        );
};

module.exports.findTripExpense = function (query, next) {
    var ffFilters = constructFilters(query);
    winston.info('find invoice filters:', JSON.stringify(ffFilters));
    var cursor = TripExpense.find(ffFilters);
    cursor.exec(function (err, data) {
        next(err, data);
    });
};

module.exports.findTripExpenseId = function (id, next) {
    TripExpense.findAsync({"_id": id})
        .then(function (invoice) {
            return next(null, invoice);
        })
        .catch(function (err) {
            return next(err);
        });
};

module.exports.updateTripExpense = function (id, details, next) {
    if (details.trip_no) {
        delete details.trip_no;
    }
    if (details.clientId) {
        delete details.clientId;
    }
    if (details._id) {
        delete details._id;
    }
    TripExpense.findOneAndUpdateAsync({"_id": id}, {"$set": details}, {"new": true, "runValidators": true})
        .then(function (doc) {
            var temp = JSON.parse(JSON.stringify(doc));
            //var dataIDOC = XmlJsonMappingService.prepareExpensesXMLJsonData(null,temp);
            //var dataToSave = {clientId:doc.clientId,data:dataIDOC};
            //var expensesXMLJsonDataToSave = new ExpensesXmlJsonModel(dataToSave);
            //expensesXMLJsonDataToSave.saveAsync();
            return next(null, temp);
        })
        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};

module.exports.getProfitabilityExpense = function (reqQuery, next) {
    var queryFilters = constructFiltersForProfitability(reqQuery);
    var no_of_pages = 1;
    console.log('queryFilters',queryFilters);
    TripExpense.countAsync(queryFilters)
        .then(function (count) {
            var cursor = TripExpense.find(queryFilters);
            if (reqQuery && reqQuery.sortby && reqQuery.sortby.split(':')) {
                var params = reqQuery.sortby.split(':');
                if (params[0] && params[0] == 'created_at') {
                    var oSort = {'created_at': params[1]}
                    cursor.sort(oSort);
                }
            }
            if (reqQuery.all == "true") {
                //do nothing
            } else {
                var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
                if (no_of_documents > 15) {
                    no_of_documents = 15;
                }
                if (reqQuery && reqQuery.skip) {//TODO check field is valid or not
                    var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                    cursor.skip(parseInt(skip_docs));
                }

                if (count / no_of_documents > 1) {
                    no_of_pages = count / no_of_documents;
                }
                cursor.limit(no_of_documents);
            }
            cursor.exec(
                function (err, available) {
                    if (err) {
                        return next(err);
                    }
                    if (available && available[0]) {
                        var temp = JSON.parse(JSON.stringify(available));
                        var oRes = {};
                        oRes.no_of_pages = Math.ceil(no_of_pages);
                        oRes.data = temp;
                        return next(null, oRes);
                    } else {
                        return next(null, false);
                    }
                }
            )
        })
        .catch(
            function (err) {
                return next(err);
            }
        );
};

module.exports.prepareTripExpenseData = prepareTripExpenseData;
