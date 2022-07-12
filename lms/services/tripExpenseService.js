/**
 * @Author: Kamal
 * @Date:   2018-01-24T18:20:38+05:30
 */
var TripExpense = promise.promisifyAll(commonUtil.getModel("tripExpenses"));
var ExpensesXmlJsonModel = promise.promisifyAll(require('../models/expensesXmlJsonModel'));
var XmlJsonMappingService = promise.promisifyAll(commonUtil.getService('xmlJsonMapping'));
var BranchService = promise.promisifyAll(commonUtil.getService("branch"));

module.exports.getTripExpenseNew = function (reqQuery, next) {
	let aggQuery = [
		{
			$match : preAggrFilter(reqQuery)
		},
		{
			"$lookup": {
				"from": "trips",
				"localField": "trip",
				"foreignField": "_id",
				"as": "trip"
			}
		},
		{
			"$unwind" : "$trip"
		},
		{
			"$group":{
				"_id" : "$trip._id",
				"trip_no":{"$first":'$trip.trip_no'},
				"vehicle_no":{"$first":'$trip.vehicle_no'},
				"no_of_expense" : {"$sum" :1 },
				"netExpense" : {"$sum" : "$amount"},
				"trip":{"$first":'$trip'},
				"grCharges":{"$sum" : {"$cond":[{"$eq":['$type','Gr Charges']},"$amount",0]}},
				"diesel":{"$sum" : {"$cond":[{"$eq":['$type','Diesel']},"$amount",0]}},
				"loadCharges":{"$sum" : {"$cond":[{"$eq":['$type','Loading Charges']},"$amount",0]}},
				"ulCharges":{"$sum" : {"$cond":[{"$eq":['$type','Unloading Charges']},"$amount",0]}},
				"oCharges":{"$sum" : {"$cond":[{"$eq":['$type','Other Charges']},"$amount",0]}},
				"chalan":{"$sum" : {"$cond":[{"$eq":['$type','Chalan']},"$amount",0]}},
				"driverCash":{"$sum" : {"$cond":[{"$eq":['$type','Driver Cash']},"$amount",0]}},
				"tollTax":{"$sum" : {"$cond":[{"$eq":['$type','Toll Tax']},"$amount",0]}},
				"vACPay":{"$sum" : {"$cond":[{"$eq":['$type','Vendor A/C Pay']},"$amount",0]}},
				"vCash":{"$sum" : {"$cond":[{"$eq":['$type','Vendor Cash']},"$amount",0]}},
				"vCheque":{"$sum" : {"$cond":[{"$eq":['$type','Vendor Cheque']},"$amount",0]}},
				"vPenalty":{"$sum" : {"$cond":[{"$eq":['$type','Vendor Penalty']},"$amount",0]}},
				"vNet":{"$sum" : {"$cond":['$paidToVendor',"$amount",0]}}
			}
		},
		{
			$match : postAggrFilter(reqQuery)
		}
	];
	var cursor = TripExpense.aggregate(aggQuery);
	cursor.exec(function (err, expenses) {
			if (err) {
				return next(err);
			}
			if (expenses && expenses[0]) {
				var expenses = JSON.parse(JSON.stringify(expenses));
				return next(null,expenses);
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
module.exports.generateExpenseXMLDataNew = function(expense,callback){
	BranchService.findBranchQueryAsync({name:expense.trip.branch,clientId:expense.trip.clientId})
		.then(function(branch){
			if(branch && branch[0]){
				expense.profit_center = branch[0].profit_center;
				expense.cost_center = branch[0].cost_center;
			}else{
				console.log('branch not found',expense.branch);
			}
			var dataIDOC = XmlJsonMappingService.prepareExpensesXMLJsonDataNew(null,expense);
			var dataToSave = {clientId:expense.clientId,data:dataIDOC};
			var expensesXMLJsonDataToSave = new ExpensesXmlJsonModel(dataToSave);
			return expensesXMLJsonDataToSave.saveAsync();
		}).then(function (savedData) {
		callback(null,expense);
	});
};
let preAllowedSearchFields = {"clientId":1,"trip":1,"type":1,"person":1,"amount":1,"date":1,"remark":1,"paidToVendor":1,"reference_no":1,"created_by":1,
	"from":1,"to":1};
function preAggrFilter(reqQuery){
	let fFilter = {};
	for(let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in preAllowedSearchFields)) {
			if(key === "created_by" && reqQuery[key].constructor === Array){
				fFilter["created_by"] = {"$in":reqQuery[key]}
			}else if(key === "from" ){
				let startDate = new Date(reqQuery[key]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				let nextDay = new Date(reqQuery.to).setHours(23).setMinutes(59).setSeconds(59)
					|| new Date(startDate).setDate(startDate.getDate() + 1);
				fFilter["created_at"] = {
					"$gte": startDate,
					"$lt": nextDay
				};
			} else if (key === 'to' && !reqQuery.from) {
				let endDate = new Date(reqQuery[key]).setHours(23).setMinutes(59).setSeconds(59);
				fFilter["created_at"] = {
					"$lt": endDate
				};
			} else {
				fFilter[key]= reqQuery[key];
			}
		}
	}
	return fFilter;
}

let postAllowedSearchFields = {"trip_no":1,"customer_id":1,"vendor":1,"route_id":1,"driver":1,"gr_no":1};
function postAggrFilter(reqQuery){
	let fFilter = {};
	for(let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in postAllowedSearchFields)) {
			if(key === "customer_id" ){
				fFilter["trip.gr.booking_info.customer_id"] = {"$in":reqQuery[key].split(",").map(String)}
			}
			else if(key === "vendor" ){
				fFilter["trip.vendor"] = {"$in":reqQuery[key].split(",").map(mongoose.Types.ObjectId)}
			}
			else if(key === "driver" ){
				fFilter["trip.driver"] = {"$in":reqQuery[key].split(",").map(mongoose.Types.ObjectId)}
			}
			else if(key === "route_id" ){
				fFilter["trip.route.route_id"] = {"$in":reqQuery[key].split(",").map(String)}
			}
			else if(key === "gr_no"){
				fFilter["trip.gr.gr_no"] = reqQuery[key]
			}
			else if(key === "trip_no"){
				fFilter["trip_no"] = parseInt(reqQuery[key]);
			}
		}
	}
	return fFilter;
}
