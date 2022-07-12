/**
 * @Author: pratik
 * @Date:   2016-11-17T13:18:51+05:30
 */

var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var winston = require('winston');
var Trip = promise.promisifyAll(commonUtil.getModel("trip"));
var TripGr = promise.promisifyAll(commonUtil.getModel("tripGr"));
var TripExpense = promise.promisifyAll(commonUtil.getModel("tripExpenses"));
var InvoiceService = promise.promisifyAll(commonUtil.getService("invoice"));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var ReportService = commonUtil.getService("report");
let voucherService = promise.promisifyAll(commonUtil.getService('accountsVoucher'))


router.get("/getByTrip/:trip", function(req, res, next) {
	if(!req.params.trip){
		return res.status(500).json({ "status": "ERROR", "error_message": "trip_id not provided in url param" });
	}
	req.query.trip = mongoose.Types.ObjectId(req.params.trip);
    TripExpense.findAsync(req.query)
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Data found",
				"data": data
			});
		})
		.catch(function (err) {
			return res.status(500).json({ "status": "ERROR", "error_message": err.toString() });
		})
});

router.post("/addExpense", async function(req, res, next) {
	try {
		if(otherUtil.isAccountEnabled(req) && (!req.body.account_data.from || !req.body.account_data.to)){
			return res.status(500).json({"status":"OK","message":"provide account's from and to"});
		}
		var body = Object.assign({}, req.body);
		delete body.askPayment;
		let tripData = await Trip.find({_id: body.trip,clientId: req.user.clientId});
		if(!tripData || !tripData[0]){
			return res.status (500).json ({
				"status": "ERROR",
				"message": "Trip not found!"
			});
		}
		if(req.body.askPayment) {
			var askObjIndex = tripData[0].askPayment.findIndex(askP =>
				askP._id.toString() === req.body.askPayment);
			if(askObjIndex <0) {
				return res.status(500).json({ "status": "ERROR", "message": `askPayment object with _id:${req.body.askPayment} not found`});
			}
			if (tripData[0].askPayment[askObjIndex].settledAmount + req.body.amount > tripData[0].askPayment[askObjIndex].amount) {
				return res.status (500).json ({
					"status": "ERROR",
					"message": `amount + settled amount can't be greater than total make payment amount`
				});
			}
		}
		let expenseToSave = new TripExpense(body);
		let savedExpense = await expenseToSave.save();
		tripData[0].trip_expenses.push(savedExpense._id);
		if(askObjIndex >=0) {
			tripData[0].askPayment[askObjIndex].settledAmount = tripData[0].askPayment[askObjIndex].settledAmount + req.body.amount;
			tripData[0].askPayment[askObjIndex].expenses.push (savedExpense._id);
		}
		await tripData[0].set({diesel_stage:false}).save();
		if(otherUtil.isAccountEnabled(req)){
			let prepareExpenseData = {
				clientId : req.user.clientId,
				from: req.body.account_data.from._id,
				to: req.body.account_data.to._id,
				type: "Payment",
				amount: req.body.amount,
				refNo: req.body.reference_no,
				narration: req.body.remark,
				created_by: req.user._id
			};
			let expenseAdded = await voucherService.addVoucherAsync(prepareExpenseData);
		}
		return res.status(200).json({
			"status": "OK",
			"message": "Data Saved",
			"data": savedExpense
		});
	} catch (err) {
		return res.status(500).json({ "status": "ERROR", "message": err.toString() });
	}
});

router.post("/getAggregated", function(req, res, next) {
	return res.status(200).json({
		"status": "OK",
		"message": "No TripExpense found.",
		"data":[]
	});
//TODO blocked as server crashing
	req.body.dateType = req.body.dateType || 'allocation_date';
	req.body.aggQuery = [
		{
			$match : tripFilter(req.body)
		},
		{
			"$lookup": {
				"from": "tripsexpenses",
				"localField": "_id",
				"foreignField": "trip",
				"as": "tripExpenses"
			}
		},
		{
			"$unwind" : {
				"path":"$tripExpenses",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$match: expenseFilter(req.body)
		},
		{
			"$group":{
				"_id" : "$_id",
				"trip_no":{"$first":'$trip_no'},
				"vehicle_no":{"$first":'$vehicle_no'},
				"no_of_expense" : {"$sum" :1 },
				"netExpense" : {"$sum" : "$tripExpenses.amount"},
				"trip":{"$first":'$$ROOT'},
				"grCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Gr Charges']},"$tripExpenses.amount",0]}},
				"diesel":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Diesel']},"$tripExpenses.amount",0]}},
				"dieselLtr":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Diesel']},"$tripExpenses.diesel_info.litre",0]}},
				"loadCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Loading Charges']},"$tripExpenses.amount",0]}},
				"ulCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Unloading Charges']},"$tripExpenses.amount",0]}},
				"oCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Other Charges']},"$tripExpenses.amount",0]}},
				"chalan":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Chalan']},"$tripExpenses.amount",0]}},
				"driverCash":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Driver Cash']},"$tripExpenses.amount",0]}},
				"tollTax":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Toll Tax']},"$tripExpenses.amount",0]}},
				"vACPay":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor A/C Pay']},"$tripExpenses.amount",0]}},
				"vCash":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Cash']},"$tripExpenses.amount",0]}},
				"vCheque":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Cheque']},"$tripExpenses.amount",0]}},
				"vPenalty":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Penalty']},"$tripExpenses.amount",0]}},
				"vDamage":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Damage']},"$tripExpenses.amount",0]}},
				"vDetention":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Detention']},"$tripExpenses.amount",0]}},
				"vChalan":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Chalan']},"$tripExpenses.amount",0]}},
				"vOverload":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Overload Charges']},"$tripExpenses.amount",0]}},
				"vNet":{"$sum" : {"$cond":['$tripExpenses.paidToVendor',"$tripExpenses.amount",0]}}
			}
		},
		{
			$addFields:{
				"paymentStatus": {
					"$cond": [{"$gt": ['$vNet', '$trip.vendorDeal.total_expense']}, undefined,
						{"$cond": [{"$eq": ['$vNet', '$trip.vendorDeal.total_expense']},"Paid",
								{"$cond": [{"$eq": ['$vNet', 0]},"Pending","Partial Paid"]}]}]
				}
			}
		},
		{
			"$lookup": {
				"from": "tripgrs",
				"localField": "trip.gr",
				"foreignField": "_id",
				"as": "trip.aGR"
			}
		},
		{
			"$lookup": {
				"from": "vendortransports",
				"localField": "trip.vendor",
				"foreignField": "_id",
				"as": "trip.vendorData"
			}
		},
		{
			"$unwind" : {
				"path":"$trip.vendorData",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$match : postAggrFilter(req.body)
		},
		{
			$sort:{
				[(req.body.aggregateBy && `trip.${req.body.aggregateBy}`) ||'trip.allocation_date']: -1
			}
		}
	];

	otherUtil.pagination(Trip,req.body, async function (err,dbData) {
			if(err) return res.status(500).json({
				"status": "ERROR",
				"message": err.toString()
			});
			if (dbData && dbData.data && dbData.data[0]) {

				await TripGr.populateAsync(dbData.data,{path: "trip.gr"/*, match:{"populateGR":true}*/});

				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Report download available.",
						"url": data.url
					});
				}

				let data = formatResponseData(dbData);
				data.aggregateBy = req.body.aggregateBy;
				let lastAggValue = "";
				let agg = data.data.aggregateBy = data.aggregateBy;
				let response = {};
				for (let i = 0; i < data.data.data.length; i++) {
					if (agg === "allocation_date") {
						if ((lastAggValue === "" || lastAggValue !== new Date(data.data.data[i]['trip'][agg]).toDateString())) {
							lastAggValue = new Date(data.data.data[i]['trip'][agg]).toDateString();
							response[lastAggValue] = [];
						}
					} else if (agg === "vehicle_no" && data.data.data[i]["trip"] && data.data.data[i]["trip"]["vehicle_no"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data.data[i]["trip"]["vehicle_no"])) {
							lastAggValue = data.data.data[i]["trip"]["vehicle_no"];
							response[lastAggValue] = [];
						}
					} else if (agg === "trip_no" && data.data.data[i]["trip"] && data.data.data[i]["trip"]["trip_no"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data.data[i]["trip"]["trip_no"])) {
							lastAggValue = data.data.data[i]["trip"]["trip_no"];
							response[lastAggValue] = [];
						}
					} else {
						if ((lastAggValue === "" || lastAggValue !== data.data.data[i][agg])) {
							lastAggValue = data.data.data[i][agg];
							response[lastAggValue] = [];
						}
					}
					response[lastAggValue].push(data.data.data[i]);
				}
				if (req.body.download && (req.body.download !== "false")) {
					switch (req.body.reportType){
						case "Trip Expense":
							if(req.body.aggregateBy) {
								ReportExelService.generateTripExpenseAggExcelReport(data.data, req.query.clientId, ReportResponse);
							} else {
								ReportExelService.generateTripExpenseAggExcel(data, req.query.clientId, ReportResponse);
							}
							break;
						case "Vendor Reconciliation":
							ReportExelService.generateVendorReconciliationAggExcel (data, req.query.clientId, ReportResponse);
							break;
						default :
							ReportExelService.generateVendorReconciliationAggExcel (data, req.query.clientId, ReportResponse);
							break;
					}
				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Trip aggregated data",
						"data": dbData.data
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No TripExpense found.",
					"data":[]
				});
			}
	});

});


let tripSearchFields = {"clientId":1, "trip_no":1, "vendor":1,"route_id":1,"driver":1,"vehicle_no":1, "from":1,"to":1};
let tripDateFilters = ["allocation_date","vendorDeal.advance_due_date","vendorDeal.topay_due_date","vendorDeal.ls_uploading_date","askPayment.date"];
function tripFilter(reqQuery){
	let fFilter = {};
	for(let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in tripSearchFields)) {
			if (key === 'from') {
				if(reqQuery.dateType && tripDateFilters.indexOf(reqQuery.dateType) !== -1) {
					let startDate = new Date (reqQuery[key]);
					startDate.setSeconds (0);
					startDate.setHours (0);
					startDate.setMinutes (0);
					fFilter[reqQuery.dateType] = fFilter[reqQuery.dateType] || {};
					fFilter[reqQuery.dateType].$gte = startDate;
				}
			} else if (key === 'to') {
				if (reqQuery.dateType && tripDateFilters.indexOf(reqQuery.dateType) !== -1) {
					let endDate = new Date (reqQuery[key]);
					endDate.setSeconds (59);
					endDate.setHours (23);
					endDate.setMinutes (59);
					fFilter[reqQuery.dateType] = fFilter[reqQuery.dateType] || {};
					fFilter[reqQuery.dateType].$lte = endDate;
				}
			}
			else if(key === "vendor" ){
				if(reqQuery[key].length > 0)
					fFilter["vendor"] = {"$in":otherUtil.arrString2ObjectId(reqQuery[key])}
			}
			else if(key === "driver" ){
				if(reqQuery[key].length > 0)
					fFilter["driver"] = {"$in":otherUtil.arrString2ObjectId(reqQuery[key])}
			}
			else if(key === "route_id"){
				if(reqQuery[key].length > 0)
					fFilter["route"] = {"$in":otherUtil.arrString2ObjectId(reqQuery[key])}
			}
			else if(key === "trip_no"){
				fFilter["trip_no"] = parseInt(reqQuery[key]);
			}
			else {
				fFilter[key] = reqQuery[key];
			}
		}
	}
	return fFilter;
}

let expenseSearchFields = {"type":1,"from":1,"to":1,"person":1,"amount":1,"date":1,"remark":1,"paidToVendor":1,"reference_no":1};
let expenseDateFilters = ["date","created_at"];
function expenseFilter (reqQuery) {
	let fFilter = {};
	for(let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in expenseSearchFields)) {
			if (key === 'from') {
				if(reqQuery.dateType && expenseDateFilters.indexOf(reqQuery.dateType) !== -1) {
					let startDate = new Date (reqQuery[key]);
					startDate.setSeconds (0);
					startDate.setHours (0);
					startDate.setMinutes (0);
					fFilter["tripExpenses." + (reqQuery.dateType || "created_at")] = fFilter["tripExpenses." + (reqQuery.dateType || "created_at")] || {};
					fFilter["tripExpenses." + (reqQuery.dateType || "created_at")].$gte = startDate;
				}
			} else if (key === 'to') {
				if (reqQuery.dateType && expenseDateFilters.indexOf(reqQuery.dateType) !== -1) {
					let endDate = new Date (reqQuery[key]);
					endDate.setSeconds (59);
					endDate.setHours (23);
					endDate.setMinutes (59);
					fFilter["tripExpenses." + (reqQuery.dateType || "created_at")] = fFilter["tripExpenses." + (reqQuery.dateType || "created_at")] || {};
					fFilter["tripExpenses." + (reqQuery.dateType || "created_at")].$lte = endDate;
				}
			}
			else {
				fFilter['tripExpenses.'+key] = reqQuery[key];
			}

		}
	}
	return fFilter;
}

const PAYMENT_STATUS = ["Pending", "Partial Paid", "Paid", "Over Paid"];
let postAllowedSearchFields = {"customer_id":1,"gr_no":1,"from":1,"to":1,"paymentStatus":1};
let postDateFilters = ["trip.aGR.acknowledge.systemDate"];
function postAggrFilter(reqQuery){
	let fFilter = {};
	for(let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in postAllowedSearchFields)) {
			if (key === 'from') {
				if(reqQuery.dateType && postDateFilters.indexOf(reqQuery.dateType) !== -1) {
					let startDate = new Date (reqQuery[key]);
					startDate.setSeconds (0);
					startDate.setHours (0);
					startDate.setMinutes (0);
					fFilter[reqQuery.dateType] = fFilter[reqQuery.dateType] || {};
					fFilter[reqQuery.dateType].$gte = startDate;
				}
			} else if (key === 'to') {
				if (reqQuery.dateType && postDateFilters.indexOf(reqQuery.dateType) !== -1) {
					let endDate = new Date (reqQuery[key]);
					endDate.setSeconds (59);
					endDate.setHours (23);
					endDate.setMinutes (59);
					fFilter[reqQuery.dateType] = fFilter[reqQuery.dateType] || {};
					fFilter[reqQuery.dateType].$lte = endDate;
				}
			}else if(key === "customer_id" && reqQuery[key].length > 0){
				fFilter["trip.aGR.booking.customer_id"] = {"$in":reqQuery[key]}
			}else if(key === "gr_no"){
				fFilter["trip.aGR.grNumber"] = reqQuery[key]
			}else if(key === "paymentStatus" && PAYMENT_STATUS.indexOf(reqQuery[key])>-1){
				fFilter[key] = reqQuery[key]
			}

		}
	}
	return fFilter;
}
function formatResponseData(oData){
	try {
		let fData = {};
		let dbData = oData.data;
		for(var i=0;i<dbData.length;i++){
			dbData[i].netPayables = dbData[i].vNet - dbData[i].vDamage - dbData[i].vPenalty;
			dbData[i].netPayablesWoExtra = (dbData[i].vNet || 0) - (dbData[i].vDetention || 0 ) - ( dbData[i].vOverload || 0);
			if(dbData[i].trip && dbData[i].trip.vendorDeal){
				if(dbData[i].trip.vendorDeal.advance && (dbData[i].trip.vendorDeal.advance >= dbData[i].netPayablesWoExtra)){
					dbData[i].actualAdvancedPaid = dbData[i].netPayablesWoExtra || 0;
					dbData[i].actualBalancedPaid = 0;
				}else{
					dbData[i].actualAdvancedPaid = dbData[i].trip.vendorDeal.advance || 0;
					dbData[i].actualBalancedPaid = (dbData[i].netPayablesWoExtra || 0) - (dbData[i].trip.vendorDeal.advance || 0);
				}
			}
		}
		oData.data = dbData;
		fData.data = oData;
		fData.vendor_name = (
			fData.data
			&& fData.data.data
			&& fData.data.data[0]
			&& fData.data.data[0].trip
			&& fData.data.data[0].trip.vendorData
			&& fData.data.data[0].trip.vendorData.name
		) ? fData.data.data[0].trip.vendorData.name : "NA";
		fData.aData = (fData.data && fData.data.data )?fData.data.data:[];
		return fData;
	} catch(err) {
		throw err;
	}
}
module.exports = router;
