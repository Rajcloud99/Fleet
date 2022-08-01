/**
 *
 * Created by manish on 10/1/17.
 */

let express = require('express');
let router = express.Router();
let moment = require("moment");
let ClientService = promise.promisifyAll(commonUtil.getService('client'));
let CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
let bookingService = promise.promisifyAll(commonUtil.getService('booking'));
let tripService = promise.promisifyAll(commonUtil.getService('trip'));
let RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
let RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
let ReportService = commonUtil.getService("report");
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let inventoryService = promise.promisifyAll(commonUtil.getMaintenanceService('inventory'));
let jobCardService = promise.promisifyAll(commonUtil.getMaintenanceService('jobCard'));
let poService = promise.promisifyAll(commonUtil.getMaintenanceService('po'));
let TyreMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreMaster'));
let toolService = promise.promisifyAll(commonUtil.getMaintenanceService('tool'));
let contractorExpenseService = promise.promisifyAll(commonUtil.getMaintenanceService('contractor_expense'));
let invoiceService = promise.promisifyAll(commonUtil.getService("invoice"));
let oeService = promise.promisifyAll(commonUtil.getMaintenanceService('otherExpenses'));
let billsService = promise.promisifyAll(commonUtil.getService('bills'));
let Booking = promise.promisifyAll(commonUtil.getModel('bookings'));
let VehicleType = promise.promisifyAll(commonUtil.getModel('vehicleType'));
let Trip = promise.promisifyAll(commonUtil.getModel('trip'));
let TripV2 = commonUtil.getModel('trip');
let TripGr = promise.promisifyAll(commonUtil.getModel('tripGr'));
let Voucher = promise.promisifyAll(commonUtil.getModel('voucher'));
let Customer = promise.promisifyAll(commonUtil.getModel('customer'));
let AccountsVoucher = promise.promisifyAll(commonUtil.getModel('accountsVoucher'));
let Bill = promise.promisifyAll(commonUtil.getModel('bills'));
let gpsService = promise.promisifyAll(commonUtil.getGpsService('deviceMaster'));
let QuotationService = promise.promisifyAll(commonUtil.getMRPService('quotation'));
let SOService = promise.promisifyAll(commonUtil.getMRPService('so'));
let SOInvoiceService = promise.promisifyAll(commonUtil.getMRPService('invoice'));
const serverSidePage = require('../../utils/serverSidePagination');
const TripAdvance = commonUtil.getModel('TripAdvances');
const logsService = commonUtil.getService('logs');
const TripSettlementCache = commonUtil.getModel('tripSettlementCache');
const VehicleProfitCache = commonUtil.getModel('vehicleProfit');
const csvDownload = require('../../utils/csv-download');
const Rtpr = commonUtil.getReports('rtpr.js');
const RtprExp = commonUtil.getReports('rtprExp.js');
const RtGrossProfit = commonUtil.getReports('rtGrossProfit.js');
const LastSettlReport = commonUtil.getReports('lastSettleRtReport.js');
const LastSettlementCache = commonUtil.getModel('lastSettlementCache');
let Dues = commonUtil.getModel('dues');


var converter = require('office-converter')();

let async = require('async');

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

function generateExcel(reportType, aggregateBy, callback) {
	switch (reportType) {
		case "pre_profitability":
			return "";
		/*case "pre-profitability":
         return
         case "pre-profitability":
         return
         case "pre-profitability":
         return*/
	}
}

/**Post profitability **/
router.get("/profitability/post/get", function (req, res, next) {
	ReportService.postProfitabilityIntrmdt(req, function (err, data) {
		let data_ = {};
		data_.data = data;
		if (err) {
			return res.status(200).json({
				"status": "OK",
				"message": err.toString(),
				"data": [],
				"no_of_pages": []
			});
		}

		function profitabilityResponse(data) {
			return res.status(200).json({
				"status": "OK",
				"message": "profitability report download available.",
				"url": data.url
			});
		}

		if ((req.query.report_download && req.query.report_download.toString()) === "true") {
			ReportExelService.generatePostProfitabilityExcel(data_, req.clientData, profitabilityResponse);
		} else if (req.query.aggregateBy) {
			ReportExelService.generatePostProfitabilityAggregationExcel(data_, req.query.aggregateBy, req.clientData, profitabilityResponse);
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "profitability found",
				"data": data,
				"no_of_pages": data.no_of_pages
			});
		}
	});
});

/**Pre profitability **/
/*
	query :{
		start_date:"",
		end_date:"",
		reportType:"miscellaneous",
		aggregateBy : "driver_wise"/"customer_wise"/"executive_wise"/"trip_wise",
		report_download : true;
	}
 */

router.get("/profitability/pre/get",
	/**validate**/
	function (req, res, next) {
		req.query.start_date = dateUtil.getMorning(new Date().getTime());
		req.query.end_date = new Date();
		req.query.aggregateBy = "driver_wise";
		req.query.report_download = true;
		req.query.reportType = "miscellaneous";
		if (!req.query.start_date || !req.query.end_date) {
			return res.status(500).json({
				"status": "ERROR",
				"error_message": "Start date/ end date is required",
			});
		} else {
			return next();
		}

	},
	function (req, res, next) {
		ReportService.preProfitabilityIntrmdt(req, function (err, data) {
			if (err) return next(err);

			function responseHandler(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Pre profitability report download available.",
					"url": data.url
				});
			}

			if (req.query.report_download === "true") {
				let dataForExcelService = {};
				dataForExcelService.data = data;
				dataForExcelService.start_time = req.query.start_date.getTime();
				dataForExcelService.end_time = req.query.end_date.getTime();
				dataForExcelService.clientId = req.user.clientId;
				dataForExcelService.aggregateBy = req.query.aggregateBy;
				dataForExcelService.reportType = req.query.reportType;
				ReportExelService.generatePreProfitabilityExcel(dataForExcelService, req.clientData, responseHandler);
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "Pre profitability found",
					"data": data,
					// "no_of_pages": data.no_of_pages
				});
			}
		});
	}
);
// Ritika Raj
router.post("/vehicle",function(req,res,next) {
	req.body.all=true;
	RegisteredVehicleService.searchRegisteredVehicleAsync(req.body, req)
		.then(function(data) {
			if (data&&data.data&&data.data[0]) {
				let aObjectLevel=data.data;

				//let aObjectLevel = allObjectLevel(aTrip);
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Registered vehicle report download available.",
						"url": data.url
					});
				}

				if(req.body.download){
					if(req.body.reportType=="compostionMatrixExcel"){
						ReportExelService.generateCompositionMatrixExcel(aObjectLevel,req.body.clientId,ReportResponse)
					}
				 	else
				 		ReportExelService.generateRegisteredVehicleExcel(aObjectLevel, req.body.clientId, ReportResponse)
			 }

			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no registered vehicle found"
				});
			}
		}).catch(next)
});
/**************************  Ritika Raj/end  ****************************/


let setRate = function (obj) {
	if (obj.rate)
		return;

	switch (obj.booking && obj.booking.payment_basis) {
		case "PMT":
			obj.rate = obj.rateObj.price_per_mt;
			obj.totalWorking = obj.weight * obj.rate;
			break;

		case "PUnit":
			obj.rate = obj.rateObj.price_per_unit;
			obj.totalWorking = obj.unit * obj.rate;
			break;

		case "Fixed":
			obj.rate = obj.rateObj.vehicle_rate;
			obj.totalWorking = obj.rate;
			break;

		case "Fixed per Trip/Fixed per Booking":
			obj.rate = obj.rateObj.price_per_trip;
			obj.totalWorking = obj.rate;
			break;
	}
};

router.get("/profitability", function (req, res, next) {
	if (!req.query.owner_group) {
		return res.status(500).json({status: "ERROR", message: "owner_group not found!"})
	}
	if (!req.query.start) {
		return res.status(500).json({status: "ERROR", message: "start not found!"})
	}
	if (!req.query.end) {
		return res.status(500).json({status: "ERROR", message: "end not found!"})
	}
	let start = new Date(req.query.start);
	start.setHours(0);
	start.setMinutes(0);
	start.setSeconds(0);
	let end = new Date(req.query.end);
	end.setHours(23);
	end.setMinutes(59);
	end.setSeconds(59);
	let vehicleFilter = {clientId: req.user.clientId, owner_group: req.query.owner_group, category: {$ne: "Trailer"}};
	if (req.query.vehicle_no) {
		vehicleFilter.vehicle_reg_no = req.query.vehicle_no;
	}

	RegisteredVehicle.aggregateAsync({
		$match: vehicleFilter
	}, {
		$graphLookup: {
			from: 'tripv2',
			startWith: '$_id',
			connectFromField: '_id',
			connectToField: 'vehicle',
			as: 'trips',
			restrictSearchWithMatch: {
				isCancelled: false,
				"statuses": {
					$elemMatch: {
						status: "Trip started",
						date: {
							"$gte": start,
							"$lte": end
						}
					}
				}
			}
		}
	}, {
		$unwind: {
			path: '$trips',
			preserveNullAndEmptyArrays: true
		}
	}, {
		$lookup: {
			from: 'transportroutes',
			localField: 'trips.route',
			foreignField: '_id',
			as: 'trips.route'
		}
	}, {
		$unwind: {
			path: '$trips.route',
			preserveNullAndEmptyArrays: true
		}
	}, {
		$lookup: {
			from: 'tripgrs',
			localField: 'trips._id',
			foreignField: 'trip',
			as: 'trips.grs'
		}
	}, {
		$lookup: {
			from: 'tripsexpenses',
			localField: 'trips._id',
			foreignField: 'trip',
			as: 'tripExpenses'
		}
	}, {
		$unwind: {
			path: '$tripExpenses',
			preserveNullAndEmptyArrays: true
		}
	}, {
		$group: {
			_id: {vehicle_id: '$_id', trip: '$trips'},
			vehicle_reg_no: {$first: "$vehicle_reg_no"},
			veh_type: {$first: "$veh_type"},
			owner_group: {$first: "$owner_group"},
			expenses: {$push: '$tripExpenses'},
			diesel: {"$sum": {"$cond": [{"$eq": ['$tripExpenses.type', 'Diesel']}, "$tripExpenses.amount", 0]}},
			driverCash: {"$sum": {"$cond": [{"$eq": ['$tripExpenses.type', 'Driver Cash']}, "$tripExpenses.amount", 0]}},
			netExpense: {"$sum": "$tripExpenses.amount"},
			extraDiesel: {"$sum": {"$cond": [{"$eq": ['$tripExpenses.type', 'Extra Diesel']}, "$tripExpenses.amount", 0]}},
		}
	}, {
		$group: {
			_id: '$_id.vehicle_id',
			vehicle_reg_no: {$first: "$vehicle_reg_no"},
			veh_type: {$first: "$veh_type"},
			owner_group: {$first: "$owner_group"},
			trips: {$push: '$_id.trip'},
			tripCount: {"$sum": {"$cond": [{"$not": ['$_id.trip._id']}, 0, 1]}},
			totalrun: {$sum: '$_id.trip.route.route_distance'},
			diesel: {$sum: '$diesel'},
			driverCash: {$sum: '$driverCash'},
			extraDiesel: {$sum: '$extraDiesel'},
			netExpense: {$sum: '$netExpense'},
			expenses: {$push: '$expenses'}
		}
	}, {
		$graphLookup: {
			from: 'otherexpenses',
			startWith: '$vehicle_reg_no',
			connectFromField: 'vehicle_reg_no',
			connectToField: 'vehicle_no',
			as: 'otherExpenses',
			restrictSearchWithMatch: {
				bill_date: {
					$gte: start,
					$lte: end
				}
			}
		}
	}).then(function (dbData) {
		Booking.populate(dbData, {path: "trips.grs.booking"})
			.then(function (data) {
				data = JSON.parse(JSON.stringify(data));
				data = data.map(function (veh) {
					veh.totalWorking = 0;
					veh.internalWorking = 0;
					veh.shortageWeight = 0;
					veh.shortage = 0;
					veh.trips.forEach(trip => {
						trip.grs.forEach(function (obj) {
							if (obj.booking && obj.booking.routeData) {
								obj.rateObj = obj.booking.routeData.data.find(vObj => ((vObj.vehicle_type_id === veh.veh_type) && (vObj.booking_type === obj.booking.booking_type)));
								if (obj.rateObj) {
									obj.rateObj = obj.rateObj.rate;
									setRate(obj);
								} else {
									console.log('preferred vehicle not found');
								}
							} else
								obj.rate = obj.booking && obj.booking.rate;
							veh.totalWorking += (obj.totalWorking || 0);
							veh.internalWorking += ((obj.internal_rate||0) * (obj.weight||0));
							if (obj.ul_net_w && obj.l_net_w && obj.ul_net_w < obj.l_net_w) {
								obj.shortageWeight = obj.l_net_w - obj.ul_net_w;
								obj.shortage = obj.shortageWeight * obj.rate;
								veh.shortageWeight += (obj.shortageWeight || 0);
								veh.shortage += (obj.shortage || 0);
							}
						})
					});
					veh.miscExpense = 0;
					veh.otherExpenses.forEach(function (exp) {
						veh.miscExpense += (exp.amount || 0);
					});
					return veh;
				});

				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Profitability report download available.",
						"url": data.url
					});
				}

				if (!req.query.download || req.query.download !== "true") {
					return res.status(200).json({
						"status": "OK",
						"message": "Profitability report download available.",
						"data": data
					});
				} else {
					ReportExelService.generateProfitabilityExcel(data, req.query.clientId, ReportResponse);
				}
			});
	})
});

router.get("/customer", function (req, res, next) {
	CustomerService.searchCustomerAsync(req.query, false)
		.then(function (data) {
			if (data && data.customers && data.customers[0]) {
				let aObjectLevel = data.customers;

				//let aObjectLevel = allObjectLevel(aTrip);
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Registered customer report download available.",
						"url": data.url
					});
				}

				ReportExelService.generateCustomerExcel(aObjectLevel, req.query.clientId, ReportResponse)
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no registered customer found"
				});
			}
		}).catch(next)
});

router.get("/quotation", function (req, res, next) {
	QuotationService.searchQuotationAsync(req.query)
		.then(function (data) {
			if (data && data.Quotations && data.Quotations[0]) {

				let objData = data.Quotations;
				if (req.query.downloadExcel) {
					ReportExelService.generateQuotationExcel(objData, req.query.clientId, function (data) {
						return res.status(200).json({
							"status": "OK",
							"message": "Quotation report download available.",
							"url": data.url
						});
					})
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "Quotation report available.",
						"data": data.Quotations
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No quotation found"
				});
			}
		}).catch(next)
});

router.get("/so", function (req, res, next) {
	SOService.searchSOAsync(req.query)
		.then(function (data) {
			if (data && data.SOs && data.SOs[0]) {
				let aObjectLevel = data.SOs;

				if (req.query.downloadExcel) {
					function ReportResponse(data) {
						return res.status(200).json({
							"status": "OK",
							"message": "SO report download available.",
							"url": data.url
						});
					}

					ReportExelService.generateSOExcel(aObjectLevel, req.query.clientId, ReportResponse)
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "SO report available.",
						"data": data.SOs
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No SO found"
				});
			}
		}).catch(next)
});

router.get("/soInvoice", function (req, res, next) {
	SOInvoiceService.searchInvoiceAsync(req.query)
		.then(function (data) {
			if (data && data.Invoices && data.Invoices[0]) {
				let aObjectLevel = data.Invoices;

				if (req.query.downloadExcel) {
					//let aObjectLevel = allObjectLevel(aTrip);
					function ReportResponse(data) {
						return res.status(200).json({
							"status": "OK",
							"message": "SO Invoice report download available.",
							"url": data.url
						});
					}

					ReportExelService.generateSOInvoiceExcel(aObjectLevel, req.query.clientId, ReportResponse)
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "Invoice report available.",
						"data": data.Invoices
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No SO invoices found"
				});
			}
		}).catch(next)
});

router.get("/pending_gr", function (req, res, next) {
	tripService.getAllTripsAsync(req)
		.then(function (data) {
			let aGRItems = getGrFromTrips(data.data, req.query.gr_stage);

			function GrResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "GR report download available.",
					"url": data.url
				});
			}

			ReportExelService.generateGRExcel(aGRItems, req.query.clientId, GrResponse)
		}).catch(next)
});

router.get("/inventory", function (req, res, next) {
	inventoryService.searchInventoryAsync(req.query)
		.then(function (data) {
			if (data && data.inventories && data.inventories[0]) {
				let aObjectLevel = data.inventories;

				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Inventory report download available.",
						"url": data.url
					});
				}

				if (req.query.aggregate) {
					ReportExelService.generateAggrInventoryExcel(aObjectLevel, req.query.clientId, ReportResponse);
				} else {
					ReportExelService.generateInventoryExcel(aObjectLevel, req.query.clientId, ReportResponse);
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no inventory found."
				});
			}
		}).catch(next);
});

router.get("/gpsInventory", function (req, res, next) {
	gpsService.searchDeviceMasterAsync(req.query)
	.then(function(data) {
		if(data && data.deviceMasters && data.deviceMasters[0]) {
			let aDMs = data.deviceMasters;

			if(req.query.downloadExcel) {
				ReportExelService.generateGPSInventoryExcel(aDMs, req.query.clientId, function(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Device Masters report download available.",
						"url": data.url
					});
				});
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "Device masters report available.",
					"data": data.deviceMasters
				});
			}
		} else {
			return res.status(200).json({
				status: "OK",
				message: "No device masters found"
			});
		}
	})
	.catch(next);
});

router.get("/spareInward", function (req, res, next) {
	let allowFilter = ["clientId", "spare_code", "spare_name", "vendor_name", "vendorId", "branchId", "branchName", "start_date", "end_date"];
	let queryFilters = constructFilters(req.query, allowFilter);
	inventoryService.findInventoryAsync(queryFilters)
		.then(function (inventory) {
			if (inventory && inventory[0]) {
				let total_amt = 0;
				for (let i = 0; i < inventory.length; i++) {
					total_amt += inventory[i].billing_amount;
				}

				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Inventory report download available.",
						"url": data.url
					});
				}

				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Inventory report download available.",
						"data": inventory,
						"total": total_amt
					});
				} else {
					ReportExelService.generateInventoryExcel(inventory, req.query.clientId, ReportResponse);
				}

			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no inventory found."
				});
			}
		}).catch(next);
});
let JobCard = promise.promisifyAll(commonUtil.getMaintenanceModel('jobCard'));
router.get("/jobcard/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "branchId", "branchName", "start_date", "end_date", "c_start_date", "c_end_date", "maintenance_type", "vehicle_number", "status"];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	JobCard.findAsync(queryFilters, null, sort)
		.then(function (jobcards) {
			if (jobcards && jobcards[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Job-Card report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = jobcards;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				for (let i = 0; i < data.data.length; i++) {
					if (agg != null && (lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
						lastAggValue = data.data[i][agg];
						response[lastAggValue] = [];
					}
					response[lastAggValue].push(data.data[i]);
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Job Card report download available.",
						"data": response
					});
				} else {
					ReportExelService.generateJobCardAggExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no jobcard found."
				});
			}
		})
});

let SpareIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('spareIssue'));
router.get("/spareissue/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "branchId", "branchName", "start_date", "end_date", "c_start_date", "c_end_date", "jobId", "job_type", 'vehicle_number', 'flag', "maintenance_type", "vehicle_number", "status"];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.$sort = {};
		sort.$sort[agg] = 1;
	}
	SpareIssue.aggregateAsync([{$unwind: "$issued_spare"}, {$match: queryFilters}, sort])
		.then(function (issueData) {
			if (issueData && issueData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Consumption report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = issueData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				for (let i = 0; i < data.data.length; i++) {
					if (agg != null && (lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
						lastAggValue = data.data[i][agg];
						response[lastAggValue] = [];
					}
					response[lastAggValue].push(data.data[i]);
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Consumption report download available.",
						"data": response
					});
				} else {
					ReportExelService.generateSpareIssueAggExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no issue/return detail found."
				});
			}
		})
});

let Tools = promise.promisifyAll(commonUtil.getMaintenanceModel('tool'));
router.get("/tool/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "branchId", "branchName", "start_date", "end_date", "toolId", "spare_name", "vendor_name", "status", "category", "spare_code"];
	allowFilter['deleted.status'] = false;
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	Tools.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tool report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Tool report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateToolAggExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Tool found."
				});
			}
		})
});

let ToolIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('toolIssue'));
router.get("/toolissue/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "branchId", "branchName", "start_date", "end_date", "toolId", "issuer_type", "tool_code",
		"issue_to_employee_name", "vehicle_number", "issue_status", "issue_slip_number", "return_by_type", "return_by_employee_name",
		"return_slip_number", "return_status", "return_date"
	];
	allowFilter['deleted.status'] = false;
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	ToolIssue.find(queryFilters, null, sort).populate('tool_id')
		.exec(function (err, dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tool report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Tool report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateToolIssueAggExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Tool found."
				});
			}
		})
});

let TyreIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreIssue'));
router.get("/tyreissue/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "branchId", "branchName", "start_date", "end_date", "toolId"];
	allowFilter['deleted.status'] = false;
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	TyreIssue.find(queryFilters, null, sort).populate('tyre_id')
		.exec(function (err, dbData) {
			if (err) return res.status(500).json({
				"status": "ERROR",
				"message": "Some error occured check log",
				"log": err
			});
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateTyreIssueAggExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Tyre found."
				});
			}
		})
});

router.get("/tyreissue/summary", function (req, res, next) {
	let allowFilter = ["clientId", "branchId", "branchName", "start_date", "end_date", "toolId"];
	allowFilter['deleted.status'] = false;
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	let aggregator = "issue_category";
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
		aggregator = agg;
	}
	TyreIssue.aggregate([
		{
			$match: queryFilters
		},
		{
			"$lookup": {
				"from": "tyremasters",
				"localField": "tyre_id",
				"foreignField": "_id",
				"as": "tyre_id"
			}
		},
		{
			"$unwind": "$tyre_id"
		},
		{
			"$group": {
				"_id": "$" + aggregator,
				"no_of_tyre": {"$sum": 1},
				"cost": {"$sum": "$amount"}
			}
		}
	])
		.exec(function (err, dbData) {
			if (err) return res.status(500).json({
				"status": "ERROR",
				"message": "Some error occured check log",
				"log": err
			});
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre Issue Summary download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre Issue Summary download available.",
						"data": dbData
					});
				} else {
					ReportExelService.generateTyreIssueSummaryExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Tyre found."
				});
			}
		})
});

router.get("/contractor", function (req, res, next) {
	contractorExpenseService.findContractorExpenseAsync(req.query)
		.then(function (data) {
			if (data) {
				let aObjectLevel = data;

				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Contractor report download available.",
						"url": data.url
					});
				}

				ReportExelService.generateContractorExpenseExcel(aObjectLevel, req.query.clientId, ReportResponse)
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no inventory found."
				});
			}
		}).catch(next)
});


router.get("/jobCard", function (req, res, next) {
	jobCardService.getReportAsync(req.query)
		.then(function (data) {
			if (data && data[0]) {
				function jobCard(url) {
					return res.status(200).json({
						"status": "OK",
						"message": "Job card report download available.",
						"url": url.url
					});
				}

				ReportExelService.generateJobCardExcel(data, req.query.clientId, jobCard)
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Job Card found",
					"data": []
				});
			}
		}).catch(next)
});

router.get("/tyre", function (req, res, next) {
	TyreMasterService.searchTyreMasterAsync(req.query)
		.then(function (data) {
			if (data && data.tyreMasters && data.tyreMasters[0]) {
				let aObjectLevel = {};
				aObjectLevel.data = data.tyreMasters;
				function ReportResponse(url) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre report download available.",
						"url": url.url
					});
				}

				ReportExelService.generateTyreExcel(aObjectLevel, req.query.clientId, ReportResponse)
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no tyre found."
				});
			}
		}).catch(next)
});
// gt_type,grDate,customer, branch, vehicle , status ,booking_no


router.get("/booking/aggregate", function (req, res, next) {
	req.query.dateKey = req.query.dataKey || req.query.dateKey || "booking_date";
	let allowFilter = ["booking_no", "booking_type", "created_at", "customer", "branch_id", "clientId", "_id", "start_date", "end_date", "booking_date"];
	let queryFilters = constructFilters(req.query, allowFilter);
	if(req.query.bookingCustomer){
		queryFilters.customer = otherUtil.arrString2ObjectId(req.query.bookingCustomer);
	}
	let sort = {};
	if (req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[req.query.aggregateBy] = -1;
	}

	let cursor = Booking.find(queryFilters)
		.populate('contract_id')
		.populate('branch_id')
		.populate('customer')
		.populate('route')
		.populate('statuses.user')
		.populate('consigner')
		.populate('consignee')
		.populate('billing_party')
		.populate('shipping_line')
		.populate('cha')
		.populate('preference.vehicleType')
		.populate('material_type')
		.populate('created_by')
		.lean();
	if (sort.sort) cursor = cursor.sort(sort.sort);

	cursor.execAsync()
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Booking report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				let name = [];
				for (let i = 0; i < data.data.length; i++) {
					if (agg === "customer" && data.data[i]["customer"] && data.data[i]["customer"]["name"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i]["customer"]["name"])) {
							lastAggValue = data.data[i]["customer"]["name"];
							response[lastAggValue] = [];
						}
					} else if (agg === "booking_date") {
						if ((lastAggValue === "" || lastAggValue !== new Date(data.data[i][agg]).toDateString())) {
							lastAggValue = new Date(data.data[i][agg]).toDateString();
							response[lastAggValue] = [];
						}
					} else if (agg === "branch_id" && data.data[i]["branch_id"] && data.data[i]["branch_id"]["name"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i]["branch_id"]["name"])) {
							lastAggValue = data.data[i]["branch_id"]["name"];
							response[lastAggValue] = [];
						}
					} else {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}

					}
					response[lastAggValue].push(data.data[i]);
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Booking Report",
						"value": Object.keys(response).length > 0 ? response : dbData,
						"name": Object.keys(response).length > 0 ? Object.keys(response) : Object.keys(dbData)
					});
				} else {
					ReportExelService.generateBookingExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Booking found."
				});
			}
		})
});

// type,status, billDate ,dueDate,billingParty(name)
router.get("/bills/aggregate", function (req, res, next) {
	req.query.aggregateBy = req.query.aggregateBy || 'status';
	req.query.dateKey = req.query.dateKey || "billDate";
	let allowFilter = ["clientId", "branch", "gr_type", "booking", "trip", "status", "grNumber", "provisionalBill", "bill", "created_by", "billDate", "created_at", "start_date", "end_date"];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	sort.sort = {billNo:1,actualBillNo:1};
	queryFilters[req.query.aggregateBy] = {$exists: true};
	sort.sort[req.query.aggregateBy] = 1;
	Bill.find(queryFilters, null, sort).populate({path:'billingParty', select: 'name'})
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "GR report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				for (let i = 0; i < data.data.length; i++) {
					if (agg === "billingParty" && data.data[i]["billingParty"] && data.data[i]["billingParty"]["name"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i]["billingParty"]["name"])) {
							lastAggValue = data.data[i]["billingParty"]["name"];
							response[lastAggValue] = [];
						}
					} else if (agg === "billDate" || (agg === "dueDate" && data.data[i][agg])) {
						if ((lastAggValue === "" || lastAggValue !== new Date(data.data[i][agg]).toDateString())) {
							lastAggValue = new Date(data.data[i][agg]).toDateString();
							response[lastAggValue] = [];
						}
					} else {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}

					}
					response[lastAggValue].push(data.data[i]);
				}
				var summary = Object
					.values(response)
					.reduce((acc, curr, i) => acc.concat(curr), [])
					.reduce((acc, curr, i) => {
            acc.totalTaxedAmount += curr.totalAmount;
            acc.totalIGSTAmount += curr.iGST;
            acc.totalSGSTAmount += curr.sGST;
            acc.totalCGSTAmount += curr.cGST;
            acc.totalAmount += (curr.totalAmount - (curr.iGST + curr.sGST + curr.cGST));
            acc.totalTax += (curr.iGST + curr.sGST + curr.cGST);
						return acc;
						}, {totalAmount: 0, totalTaxedAmount: 0, totalTax: 0, totalCGSTAmount: 0, totalIGSTAmount: 0, totalSGSTAmount: 0}
				);
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "GR report  aggregted data.",
						"value": Object.keys(response).length > 0 ? response : dbData,
						"name": Object.keys(response).length > 0 ? Object.keys(response) : Object.keys(dbData),
						summary: summary
					});
				} else {
					data.summary = summary;
					ReportExelService.generateBillExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no GR found."
				});
			}
		});
});

function getReportQuery(req, keyName) {
	if (req.query.start_date && req.query.end_date) {
		let startDate = new Date(req.query.start_date);
		startDate.setSeconds(0);
		startDate.setHours(0);
		startDate.setMinutes(0);
		let nextDay = new Date(req.query.end_date);
		nextDay.setSeconds(59);
		nextDay.setHours(23);
		nextDay.setMinutes(59);
		req.query[keyName] = {"$gte": startDate, "$lt": nextDay};
	} else if (req.query.start_date) {
		let startDate = new Date(req.query.start_date);
		startDate.setSeconds(0);
		startDate.setHours(0);
		startDate.setMinutes(0);
		let nextDay = new Date(startDate);
		nextDay.setDate(startDate.getDate() + 1);
		req.query[keyName] = {"$gte": startDate, "$lt": nextDay};
	} else if (req.query.end_date && !query.start_date) {
		let endDate = new Date(req.query.end_date);
		endDate.setSeconds(59);
		endDate.setHours(23);
		endDate.setMinutes(59);
		fFilter[keyName] = {"$lt": endDate};
	}
	return req.query;
}

router.get("/trip/aggregate", async function (req, res, next) {
	req.query.dateKey = req.query.dateKey || 'booking_date';
	let hasTimeoutExecuted = false;
	let timer = setTimeout(() => {
		hasTimeoutExecuted = true;
		if (!res.headersSent) {
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}
	}, 1000 * 20);
	let str = req.query.reportType;
	if (req.query.reportType === "Dispatch Report") {
		req.reportType === "Dispatch Report";
		req.query = getReportQuery(req, "trip_start_date");
		req.query.status = "Trip started";
		delete req.query.reportType;
		delete req.query.start_date;
		delete req.query.end_date;
	} else if (req.query.reportType === "Trip Complete Report") {
		req.query.status = "Trip ended";
		req.query = getReportQuery(req, "trip_end_date");
		req.query.status_value = "Completed";
		delete req.query.reportType;
		delete req.query.start_date;
		delete req.query.end_date;
	} else if (req.query.reportType === "Trip Cancel Report") {
		req.query.status = "Trip cancelled";
		req.query = getReportQuery(req, "trip_cancel_date");
		delete req.query.reportType;
		delete req.query.start_date;
		delete req.query.end_date;
	} else if (req.query.reportType === "Allocation Report") {
		req.reportType === "Allocation Report";
		req.query = getReportQuery(req, "allocation_date");
		delete req.query.reportType;
		delete req.query.start_date;
		delete req.query.end_date;
	} else if (req.query.reportType === "Incomplete Report") {
		req.reportType = "Incomplete Report";
		req.query = getReportQuery(req, "created_at");
		req.query.trip_end = false;
		delete req.query.reportType;
		delete req.query.start_date;
		delete req.query.end_date;
	}
  let allowFilter = ["trip_no", "status", "created_at", "last_modified_by", 'route', 'customer', 'start_end', 'end_date', "clientId", "_id", "vehicle_no", 'isCancelled'];
	let queryFilters = constructFilters(req.query, allowFilter);

	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}

	Trip.find(queryFilters)
		.populate([{
			path: 'gr',
			populate: {
				path: 'booking'
			}
		}, {
			path: 'preference'
		}])
		.sort(sort.sort)
		.execAsync()
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				async function ReportResponse(data) {
					if (hasTimeoutExecuted) {
						await logsService.addLog('Trip_Report', {
							uif: str + "_" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${data.url}' download='${data.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'Trip Report'
						}, req);
					} else {
						clearTimeout(timer);
						return res.status(200).json({
							"status": "OK",
							"message": "Trip report download available.",
							"url": data.url
						});
					}
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.report_download || req.query.report_download === "false") {
					VehicleType.populate(dbData, {path: "vehicle.veh_type"}).then(vehicleTypeData => {
						if (vehicleTypeData) {
							return res.status(200).json({
								"status": "OK",
								"message": "Trip report download available.",
								"data": Object.keys(response).length > 0 ? response : dbData
							});
						}
					})
				} else {
					ReportExelService.generateTripExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Trip Found."
				});
			}
		})
});

let TyreMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreMaster'));
router.get("/tyre/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "tyre_number", "status", "vehicle_no", "tyre_category", "start_date", "end_date", "po_number", "invoice_number"];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	TyreMaster.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateTyreExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Tyre found."
				});
			}
		})
});

router.get("/tyre/summary", function (req, res, next) {
	let allowFilter = ["clientId", "branchId", "branchName", "start_date", "end_date", "toolId"];
	allowFilter['deleted.status'] = false;
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	let aggregator = "tyre_category";
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
		aggregator = agg;
	}
	TyreMaster.aggregate([
		{
			$match: queryFilters
		},
		{
			"$group": {
				"_id": "$" + aggregator,
				"no_of_tyre": {"$sum": 1},
				"cost": {"$sum": "$billing_amount"},
				"total_km": {"$sum": "$total_run"},
				"avg_run_per_tyre": {"$avg": "$total_run"}
			}
		}
	])
		.exec(function (err, dbData) {
			if (err) return res.status(500).json({
				"status": "ERROR",
				"message": "Some error occured check log",
				"log": err
			});
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre Summary download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre Summary download available.",
						"data": dbData
					});
				} else {
					ReportExelService.generateTyreSummaryExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Tyre found."
				});
			}
		})
});

let PO = promise.promisifyAll(commonUtil.getMaintenanceModel('po'));
router.get("/po/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "branchName", "ponumder", "haveTool", "haveSpare", "haveTyre",
		"vendor_name", "vendorId"
	];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	PO.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "PO report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateTyreExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no PO found."
				});
			}
		})
});

let TyreRetread = promise.promisifyAll(commonUtil.getMaintenanceModel('TyreRetread'));
router.get("/tyreretread/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "tyre_number", "issued_by_employee_name", "issue_date",
		"returned_by_employee_name", "return_date", "bill_date", "vendor_name", "expected_return_date"
	];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	TyreRetread.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "TyreRetread report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "TyreRetread report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateTyreRetreadExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no TyreRetread found."
				});
			}
		})
});

let pmtassoc = promise.promisifyAll(commonUtil.getMaintenanceModel('primeMoverTrailerAssociation'));
router.get("/pmtassoc/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "vehicle_reg_no", "trailer_no", "odometer_on_association",
		"odometer_on_disassociation", "place_of_association", "association_datetime", "disassociation_datetime", "place_of_disassociation",
		"associated_by_employee_name", "disassociated_by_employee_name"
	];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	pmtassoc.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "PMT Association report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "PMT Association report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generatePMTAssocExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no PMT Association found."
				});
			}
		})
});

let Mtasks = promise.promisifyAll(commonUtil.getMaintenanceModel('task'));
router.get("/mtask/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "jobId", "taskId", "task_name", "supervisor_name", "mechanics_involved", "status", "priority",
		"start_datetime", "close_datetime", "remarks", "created_by_name"
	];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	Mtasks.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Task report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						let mechanics = "";
						for (mechI = 0; mechI < data.data[i].mechanics_involved.length; mechI++) {
							mechanics += data.data[i].mechanics_involved[mechI].name + " ";
						}
						data.data[i]._doc.mechanics = mechanics;
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Task report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateMtaskExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Task found."

				});
			}
		})
});

let ContractorExpense = promise.promisifyAll(commonUtil.getMaintenanceModel('contractor_expense'));
router.get("/contractor-expense/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "vehicle_number", "vehicle_number", "vehicle_number",
		"task_name", "contractor_name", "contractor_name", "supervisor_employee_id", "start_time", "end_time", "bill_number",
		"created_by_employee_code"
	];
	let queryFilters = constructFilters(req.query, allowFilter);
	queryFilters.deleted = false;
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	ContractorExpense.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Contractor-Expense report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Contractor-Expense report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateContractorExpenseAggExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Contractor-Expense found."
				});
			}
		})
});

let Expense = promise.promisifyAll(commonUtil.getMaintenanceModel('otherExpenses'));
router.get("/otherexpense/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "expense_no", "type", "jobId", "branchName", "branchId", "vehicle_no",
		"created_by_name", "approved_by_name", "amount", "bill_date"
	];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	Expense.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Contractor-Expense report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Contractor-Expense report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateOtherExpenseAggExcel(data, req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no Contractor-Expense found."
				});
			}
		})
});

/********************Customer Reach Report**************************/
let Trips = promise.promisifyAll(commonUtil.getModel('trip'));
router.get("/customerreach/aggregate", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "trip_no"];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	if (agg = req.query.aggregateBy) {
		sort.sort = {};
		sort.sort[agg] = 1;
	}
	Trips.findAsync(queryFilters, null, sort)
		.then(function (dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Customer Reach report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy || null;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				if (agg != null) {
					for (let i = 0; i < data.data.length; i++) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
						response[lastAggValue].push(data.data[i]);
					}
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Customer Reach report download available.",
						"data": Object.keys(response).length > 0 ? response : dbData
					});
				} else {
					ReportExelService.generateCustomerReachExcel(data, req.clientData, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Customer Reach report data found."
				});
			}
		})
});
/******************************************************************/

let TripExpense = promise.promisifyAll(commonUtil.getModel('tripExpenses'));
router.get("/fuelVendor", function (req, res, next) {
	let allowFilter = ["clientId", "_id", "start_date", "end_date", "trip_no","trip","diesel_info.vendor","diesel_info.station"];
	req.query.dateKey = req.query.dateKey || "date";
	let queryFilters = constructFilters(req.query, allowFilter);
	queryFilters.type = {
		$in:['Diesel','Extra Diesel']
	};
	let cursor = TripExpense.find(queryFilters).populate("trip").populate("created_by");
	cursor.exec(function (err, dbData) {
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Fuel Vendor report download available.",
						"url": data.url
					});
				}
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "Fuel Vendor report is available.",
						"data": dbData
					});
				} else {
					ReportExelService.generateFuelVendorExcel({data:dbData}, req.clientData, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Fuel Vendor report data found."
				});
			}
		})
});

router.get("/account-voucher/aggregate", function (req, res, next) {
	req.query.aggregateBy = req.query.aggregateBy || 'type';
	req.query.dateKey = req.query.dataKey || 'created_at';
	let allowFilter = ['clientId','from','to','type',"created_at", "start_date", "end_date"];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	sort.sort = {};
	sort.sort[req.query.aggregateBy] = 1;
	AccountsVoucher.find(queryFilters, null, sort)
		.populate('from')
		.populate('to')
		.populate('created_by')
		.exec(function (err, dbData) {
			if(err)return res.status(500).json({
				"status": "ERROR",
				"message": err
			});
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "GR report download available.",
						"url": data.url
					});
				}

				let data = {};
				data.data = dbData;
				data.aggregateBy = req.query.aggregateBy;
				let lastAggValue = "";
				let agg = data.aggregateBy;
				let response = {};
				for (let i = 0; i < data.data.length; i++) {
					if (agg === "created_at") {
						if ((lastAggValue === "" || lastAggValue !== new Date(data.data[i][agg]).toDateString())) {
							lastAggValue = new Date(data.data[i][agg]).toDateString();
							response[lastAggValue] = [];
						}
					} else if (agg === "from" && data.data[i]["from"] && data.data[i]["from"]["name"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i]["from"]["name"])) {
							lastAggValue = data.data[i]["from"]["name"];
							response[lastAggValue] = [];
						}
					} else if (agg === "to" && data.data[i]["to"] && data.data[i]["to"]["name"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i]["to"]["name"])) {
							lastAggValue = data.data[i]["to"]["name"];
							response[lastAggValue] = [];
						}
					} else if (agg === "type" && data.data[i]["type"]) {
						if ((lastAggValue === "" || lastAggValue !== data.data[i]["type"])) {
							lastAggValue = data.data[i]["type"];
							response[lastAggValue] = [];
						}
					} else {
						if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
							lastAggValue = data.data[i][agg];
							response[lastAggValue] = [];
						}
					}
					response[lastAggValue].push(data.data[i]);
				}

				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "GR report  aggregted data.",
						"value": Object.keys(response).length > 0 ? response : dbData,
						"name": Object.keys(response).length > 0 ? Object.keys(response) : Object.keys(dbData)
					});
				} else {
					ReportExelService.generateAccountVoucherExcel(JSON.parse(JSON.stringify(data)), req.query.clientId, ReportResponse)
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no GR found."
				});
			}
		})
});

router.get("/gr/aggregate", async function (req, res, next) {
	try {
		req.query.aggregateBy = req.query.aggregateBy || 'status';
		req.query.dateKey = req.query.dataKey || req.query.dateKey || "grDate";
		let allowFilter = ["clientId", "branch", "gr_type", "booking", "trip", "status", "grNumber", "provisionalBill", "bill", "pod.received", "acknowledge.status", "created_by", "grDate", "created_at", "start_date", "end_date", "billingParty", "customer"];
		let queryFilters = constructFilters(req.query, allowFilter);
		if (req.query.dateKey) {
			req.query.sort = req.query.sort || {};
			req.query.sort[req.query.dateKey] = -1;
		}

		let sort = {};
		sort.sort = {};
		sort.sort[req.query.aggregateBy] = 1;
		const aggQuery = [
			{$match: queryFilters},
			// {$sort: {_id: -1}},
			{
				"$lookup": {
					"from": "bills",
					"localField": "bill",
					"foreignField": "_id",
					"as": "bill"
				}
			},
			{
				$unwind: {path: '$bill', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "branches",
					"localField": "branch",
					"foreignField": "_id",
					"as": "branch"
				}
			},
			{
				$unwind: {path: '$branch', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "customers",
					"localField": "customer",
					"foreignField": "_id",
					"as": "customer"
				}
			},
			{
				$unwind: {path: '$customer', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "tripv2",
					"localField": "trip",
					"foreignField": "_id",
					"as": "trip"
				}
			},
			{
				$unwind: {path: '$trip', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "drivers",
					"localField": "trip.driver",
					"foreignField": "_id",
					"as": "trip.driver"
				}
			},
			{
				$unwind: {path: '$trip.driver', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "vendortransports",
					"localField": "trip.vendor",
					"foreignField": "_id",
					"as": "trip.vendor"
				}
			},
			{
				$unwind: {path: '$trip.vendor', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "bookingv2",
					"localField": "booking",
					"foreignField": "_id",
					"as": "booking"
				}
			},
			{
				$unwind: {path: '$booking', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "materialgroups",
					"localField": "booking.material_type",
					"foreignField": "_id",
					"as": "booking.material_type"
				}
			},
			{
				$unwind: {path: '$booking.material_type', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "consignor_consignees",
					"localField": "consignee",
					"foreignField": "_id",
					"as": "consignee"
				}
			},
			{
				$unwind: {path: '$consignee', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "consignor_consignees",
					"localField": "consignor",
					"foreignField": "_id",
					"as": "consignor"
				}
			},
			{
				$unwind: {path: '$consignor', preserveNullAndEmptyArrays: true}

			},
			{
				"$lookup": {
					"from": "billingparties",
					"localField": "billingParty",
					"foreignField": "_id",
					"as": "billingParty"
				}
			},
			{
				$unwind: {path: '$billingParty', preserveNullAndEmptyArrays: true}

			},
			{$project:{
					grNumber:1,
					gr_type:1,
					grDate:1,
					tripNo:"$trip.trip_no",
					vehicleNo:"$trip.vehicle_no",
					bookingNo:"$booking.booking_no",
					bookingType:"$booking.booking_type",
					bookingContactIdName:"$booking.contract_id.name",
					branchName:"$branch.name",
					billingParty:"$billingParty.name",
					consignee:"$consignee.name",
					consignor:"$consignor.name",
                    customer:"$customer.name",
					rName:"$trip.route_name",
					invoices:1,
					weight:1,
					pod:1,
					pendingRemark:1,
					acknowledge:1,
					billNo:"$bill.billNo",
					billDate:"$bill.billDate",
					charges:1,
					totalAmount:1,
					cGST:"$bill.cGST",
					sGST:"$bill.sGST",
					iGST:"$bill.iGST",
					vendorDeal:"$trip.vendorDeal",
					trip_expenses:"$trip.trip_expenses",
					rateObj:1,
					totalWorking:1,
					internal_rate:1,
					driver:"$trip.driver.name",
					vendor:"$trip.vendor.name"

				}}
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 10000};
		let dbData = await serverSidePage.requestData(TripGr, oQuery);
		let data = {};
		data.data = dbData;
		data.aggregateBy = req.query.aggregateBy || null;
		// let lastAggValue = "";
		// let agg = data.aggregateBy;
		// const aggQuery1 = [
		// 	{
		// 		$limit: 4000
		// 	},
		// 	{
		// 		"$group": {
		// 			"_id" : {"status" : "$status"},
		// 			"Data": {
		// 				"$push": "$$ROOT"
		// 			}
		// 		}
		// 	}
		// ];
		//
		// let oQuery1 = {aggQuery: aggQuery1, no_of_docs: 10000};
		// let aFoundData = await serverSidePage.requestData(TripGr, oQuery1);
		// let massagedData = {};
		// // aFoundData.forEach(oData => {
		// // 	let key = oData._id.agg;
		// // 	massagedData[key] = oData.Data || {};
		// // });
		// // return Object.values(massagedData);
		//
		// aFoundData.forEach(oData => {
		// 	// let obj = oData._id;
		// 	massagedData[oData._id] = massagedData[oData._id] || {};
		// 	massagedData[oData._id].agg = oData._id;
		// 	massagedData[oData.Data] = massagedData[oData.Data] || {};
		// 	massagedData[oData.Data].data = oData.Data;
		//
		// 	// let lastAggValue = oData.agg;
		// 	// massagedData[lastAggValue] = [];
		// 	// massagedData[lastAggValue] = oData;
		// });
		// return Object.values(massagedData);
		// if (!req.query.download || req.query.download === "false") {
		// 	return res.status(200).json({
		// 		"status": "OK",
		// 		"message": "GR report  aggregted data.",
		// 		"value": Object.keys(massagedData).length > 0 ? massagedData : dbData,
		// 		"name": Object.keys(massagedData).length > 0 ? Object.keys(massagedData) : Object.keys(dbData)
		// 	});
		// } else {
			ReportExelService.generateGrExcel(JSON.parse(JSON.stringify(data)), req.query.clientId, function (d){
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				});
			});
		// }


	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

// router.get("/gr/aggregate1", function (req, res, next) {
// 	req.query.aggregateBy = req.query.aggregateBy || 'status';
// 	req.query.dateKey = req.query.dataKey || req.query.dateKey || "grDate";
// 	let allowFilter = ["clientId", "branch", "gr_type", "booking", "trip", "status", "grNumber", "provisionalBill", "bill", "pod.received", "acknowledge.status","created_by", "grDate", "created_at", "start_date", "end_date", "billingParty", "customer"];
// 	let queryFilters = constructFilters(req.query, allowFilter);
// 	if(req.query.dateKey) {
// 		req.query.sort = req.query.sort || {};
// 		req.query.sort[req.query.dateKey] = -1;
// 	}
// 	let sort = {};
// 	sort.sort = {};
// 	sort.sort[req.query.aggregateBy] = 1;
// 	TripGr.find(queryFilters, null, sort).populate("bill")
// 		.exec(function (err, dbData) {
// 			if(err)return res.status(500).json({
// 				"status": "ERROR",
// 				"message": err
// 			});
// 			if (dbData && dbData[0]) {
// 				function ReportResponse(data) {
// 					return res.status(200).json({
// 						"status": "OK",
// 						"message": "GR report download available.",
// 						"url": data.url
// 					});
// 				}
//
// 				let data = {};
// 				data.data = dbData;
// 				data.aggregateBy = req.query.aggregateBy || null;
// 				// let lastAggValue = "";
// 				// let agg = data.aggregateBy;
// 				// let response = {};
// 				// for (let i = 0; i < data.data.length; i++) {
// 				// 	if (agg === "customer" && data.data[i]["customer"] && data.data[i]["customer"]["name"]) {
// 				// 		if ((lastAggValue === "" || lastAggValue !== data.data[i]["customer"]["name"])) {
// 				// 			lastAggValue = data.data[i]["customer"]["name"];
// 				// 			response[lastAggValue] = [];
// 				// 		}
// 				// 	} else if (agg === "grDate") {
// 				// 		if ((lastAggValue === "" || lastAggValue !== new Date(data.data[i][agg]).toDateString())) {
// 				// 			lastAggValue = new Date(data.data[i][agg]).toDateString();
// 				// 			response[lastAggValue] = [];
// 				// 		}
// 				// 	} else if (agg === "branch" && data.data[i]["branch"] && data.data[i]["branch"]["name"]) {
// 				// 		if ((lastAggValue === "" || lastAggValue !== data.data[i]["branch"]["name"])) {
// 				// 			lastAggValue = data.data[i]["branch"]["name"];
// 				// 			response[lastAggValue] = [];
// 				// 		}
// 				// 	} else if (agg === "booking_no" && data.data[i]["booking"] && data.data[i]["booking"]["booking_no"]) {
// 				// 		if ((lastAggValue === "" || lastAggValue !== data.data[i]["booking"]["booking_no"])) {
// 				// 			lastAggValue = data.data[i]["booking"]["booking_no"];
// 				// 			response[lastAggValue] = [];
// 				// 		}
// 				// 	} else if (agg === "vehicle_no" && data.data[i]["trip"] && data.data[i]["trip"]["vehicle_no"]) {
// 				// 		if ((lastAggValue === "" || lastAggValue !== data.data[i]["trip"]["vehicle_no"])) {
// 				// 			lastAggValue = data.data[i]["trip"]["vehicle_no"];
// 				// 			response[lastAggValue] = [];
// 				// 		}
// 				// 	} else if (agg === "trip_no" && data.data[i]["trip"] && data.data[i]["trip"]["trip_no"]) {
// 				// 		if ((lastAggValue === "" || lastAggValue !== data.data[i]["trip"]["trip_no"])) {
// 				// 			lastAggValue = data.data[i]["trip"]["trip_no"];
// 				// 			response[lastAggValue] = [];
// 				// 		}
// 				// 	} else {
// 				// 		if ((lastAggValue === "" || lastAggValue !== data.data[i][agg])) {
// 				// 			lastAggValue = data.data[i][agg];
// 				// 			response[lastAggValue] = [];
// 				// 		}
// 				//
// 				// 	}
// 				// 	response[lastAggValue].push(data.data[i]);
// 				// }
// 				//
// 				// if (!req.query.download || req.query.download === "false") {
// 				// 	return res.status(200).json({
// 				// 		"status": "OK",
// 				// 		"message": "GR report  aggregted data.",
// 				// 		"value": Object.keys(response).length > 0 ? response : dbData,
// 				// 		"name": Object.keys(response).length > 0 ? Object.keys(response) : Object.keys(dbData)
// 				// 	});
// 				// } else {
// 					ReportExelService.generateGrExcel(JSON.parse(JSON.stringify(data)), req.query.clientId, ReportResponse)
// 				// }
// 			} else {
// 				return res.status(200).json({
// 					"status": "OK",
// 					"message": "no GR found."
// 				});
// 			}
// 		})
// });

// GR wise profitability report
//TODO @kamal optimize it and then unblock the route
router.get('/_profitability/gr', function(req, res, next) {
	req.query.aggregateBy = req.query.aggregateBy || 'status';
	req.query.dateKey = req.query.dateKey || "grDate";
	let allowFilter = ["clientId", "branch", "gr_type", "booking", "trip", "status", "grNumber", "provisionalBill", "bill", "created_by", "grDate", "created_at", "start_date", "end_date"];
	let queryFilters = constructFilters(req.query, allowFilter);
	let sort = {};
	sort.sort = {};
	sort.sort[req.query.aggregateBy] = 1;
	TripGr.find(queryFilters, null, sort)
		.populate("bill")
		.exec(function (err, dbData) {
			if(err){return res.status(500).json({
				"status": "ERROR",
				"message": err
			});}
			if (dbData && dbData[0]) {
				let data = {};
				data.data = dbData;
				if (!req.query.download || req.query.download === "false") {
					return res.status(200).json({
						"status": "OK",
						"message": "GR wise profitability report data",
						"value": dbData
					});
				} else {
					ReportExelService.profitGrExcel(data, req.query.clientId, function ReportResponse(data) {
						return res.status(200).json({
							"status": "OK",
							"message": "GR report download available.",
							"url": data.url
						});
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no GR found."
				});
			}
		})
});

router.get("/combinedexpense", function (req, res, next) {
	let allowFilter = ["clientId", "start_date", "end_date", "type", "jobId"];
	let queryFilters = constructFilters(req.query, allowFilter);
	if (req.query.vehicle_no) {
		queryFilters.$or = [];
		queryFilters.$or.push({jobVehicle: req.query.vehicle_no});
		queryFilters.$or.push({vehicle_number: req.query.vehicle_no});
	}
	oeService.getCombineExpenseAsync(queryFilters)
		.then(function (data) {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Combined-Expense report download available.",
					"url": data.url
				});
			}

			if (req.query.download === "true") {
				ReportExelService.generateCombinedExpenseAggExcel(data, req.query.clientId, ReportResponse)
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "Combined-Expense report download available.",
					"data": data
				});
			}
		})
});

router.get("/tool", function (req, res, next) {
	req.query.branchId = req.query.branchId || "loni";
	toolService.searchToolAsync(req.query)
		.then(function (data) {
			if (data && data.inventories && data.inventories[0]) {
				let aObjectLevel = data.inventories;

				function ReportResponse(url) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tool report download available.",
						"url": url.url
					});
				}

				ReportExelService.generateToolExcel(aObjectLevel, req.query.clientId, ReportResponse)
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no tool found."
				});
			}
		}).catch(next)
});


router.get("/trip", function (req, res, next) {
	tripService.getAllTripsAsync(req)
		.then(function (data) {
			if (data && data.data && data.data[0]) {
				let aTrip = data.data;
				let aObjectLevel = allObjectLevel(aTrip);

				function TripResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "trip report download available.",
						"data": aObjectLevel,
						"url": data.url
					});
				}

				ReportExelService.generateTripExcel(aObjectLevel, false, req.clientData, TripResponse)
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no trip found",
					"data": []
				});
			}
		}).catch(next)
});

router.get("/idletimereport", function (req, res, next) {
	tripService.getAllTripsAsync(req)
		.then(function (data) {
			if (data && data.data && data.data[0]) {
				let aTrip = data.data;
				for (let i = 0; i < aTrip.length; i++) {
					let oTrip = aTrip[i];
					oTrip.aCustomer = [];
					for (let g = 0; g < oTrip.gr.length; g++) {
						oTrip.aCustomer.push(oTrip.gr[g].customer_name);
					}
					let tripStartTime = oTrip.trip_start.time ? new Date(oTrip.trip_start.time) : new Date();
					let lastTripEndTime = new Date(oTrip.lastTripD.trip_end.time || new Date());
					let actualIdleTripTotalHrs = Math.ceil(Math.abs(tripStartTime.getTime() - lastTripEndTime.getTime())) / (1000 * 3600);
					oTrip.idle_hour = oTrip.lastTripD.trip_end.time ? Math.ceil(actualIdleTripTotalHrs * 100) / 100 : "NA";
				}
				if (req.query.report_download && req.query.report_download === "true") {
					function TripResponse(data) {
						return res.status(200).json({
							"status": "OK",
							"message": "trip report download available.",
							"url": data.url
						});
					}

					ReportExelService.generateIdleTripExcel(aTrip, req.query.clientId, TripResponse);
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "trip report download available.",
						"data": aTrip
					});
				}

			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "no trip found",
					"data": []
				});
			}
		}).catch(next)
});

router.get("/po", function (req, res, next) {
	if (req.query.no_of_docs) {
		poService.getpoAsync(req.query)
			.then(function (data) {
				if (data && data[0]) {
					let aObjectLevel = data;

					function ReportResponse(url) {
						return res.status(200).json({
							"status": "OK",
							"message": "PO report download available.",
							"url": url.url
						});
					}

					ReportExelService.generatePoExcel(aObjectLevel, req.query.clientId, ReportResponse)
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No po found.",
						"data": []
					});
				}
			}).catch(next)
	} else {
		poService.getallpoAsync(req.query)
			.then(function (data) {
				if (data && data[0]) {
					let aObjectLevel = data;

					function ReportResponse(url) {
						return res.status(200).json({
							"status": "OK",
							"message": "PO report download available.",
							"url": url.url
						});
					}

					ReportExelService.generatePoExcel(aObjectLevel, req.query.clientId, ReportResponse)
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No po found.",
						"data": []
					});
				}
			}).catch(next)
	}
});

router.post("/rtpr", async (req, res, next) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	let hasTimeoutExecuted = false;
	let timer = setTimeout(() => {
		hasTimeoutExecuted = true;
		if(!res.headersSent){
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}
	}, 1000 * 30);
	const consFilter = (oBody) => {
		let o = {
			'advSettled.tsNo': {$exists:true},
		    'ownershipType': req.body.ownershipType ? {$in:req.body.ownershipType} :  {"$ne": "Market"}
			//'ownershipType': {$in:['Own']}
		};
		for (let key in oBody) {
			if (oBody.hasOwnProperty(key) && ['advSettled.tsNo', 'vehicle', 'segment_type'].indexOf(key) >= 0) {
				if(oBody[key].toString().match(/^[0-9a-fA-F]{24}$/)) {
					o[key] = otherUtil.arrString2ObjectId(oBody[key]);
				}else if (key === 'segment_type') {
					if (oBody[key] instanceof Array) {
						o[key] = {$in: oBody[key]};
					} else {
						o[key] = oBody[key];
					}
				}else {
					o[key] = oBody[key];
				}
			}
		}
		if ((typeof(o['advSettled.tsNo']) !== 'number') && oBody.from && oBody.to) {
			o['markSettle.date'] = {
				$gte: moment(oBody.from).startOf('day').toDate(),
				$lte: moment(oBody.to).endOf('day').toDate(),
			};
		}
		return o;
	};
	let oFil = consFilter(req.body);
	oFil.clientId = req.user.clientId;
	let vehicleQuery = {};
	if(req.body.owner_group){
		if(req.body.owner_group instanceof Array){
			vehicleQuery['vehicle.owner_group'] = {$in:req.body.owner_group};
		}
		else{
			vehicleQuery['vehicle.owner_group'] = req.body.owner_group;

		}
	}
	const aggrQuery = [
		{$match: oFil},
		{
			$project: {
				"statuses": 1,
				category: 1,
				"gr": 1,
				"driver": 1,
				"route": 1,
				"trip_expenses": 1,
				"advanceBudget": 1,
				"extraKm": 1,
				"advSettled": 1,
				"vehicle": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"markSettle": 1,
				"payments": 1,
				"rKm":1
			}
		},
		{
			$addFields: {
				'trip_start_status': {
					$arrayElemAt: [{
						$filter: {input: '$statuses', as: 'item', cond: {$eq: ['$$item.status', 'Trip started']}}
					}, 0]
				},
				'trip_end_status': {
					$arrayElemAt: [{
						$filter: {input: '$statuses', as: 'item', cond: {$eq: ['$$item.status', 'Trip ended']}}
					}, 0]
				},
			}
		},
		//{$match:consFilter(req.body)},
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}
		},
		{
			$lookup: {
				from: 'drivers',
				localField: 'driver',
				foreignField: '_id',
				as: 'driver'
			}
		},
		{
			$unwind: {
				path: '$driver',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'transportroutes',
				localField: 'route',
				foreignField: '_id',
				as: 'route'
			}
		},
		{
			$unwind: {
				path: '$route',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'tripsexpenses',
				localField: 'trip_expenses',
				foreignField: '_id',
				as: 'trip_expenses'
			}
		},
		{
			$lookup: {
				from: 'tripadvances',
				localField: 'advanceBudget',
				foreignField: '_id',
				as: 'advanceBudget'
			}
		},
		{
			$project: {
				"statuses": 1,
				category: 1,
				"driver": 1,
				"extraKm": 1,
				"vehicle": 1,
				"advSettled": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"trip_expenses.amount": 1,
				"trip_expenses.type": 1,
				"gr":1,
				// "gr.totalFreight": 1,
				// "gr.internal_rate": 1,
				"advanceBudget.amount": 1,
				"advanceBudget.advanceType": 1,
				"advanceBudget.dieseInfo": 1,
				"route.route_distance": req && req.clientConfig && req.clientConfig.config  && req.clientConfig.config.tripSettlement && req.clientConfig.config.tripSettlement.gpsKm ? "$rKm" : 1,
				"route_name": "$route.name",
				"trip_start_status": 1,
				"trip_end_status": 1,
				"markSettle": 1,
				"payments": 1
			}
		},
		{
			$addFields: {
				'actual_expense': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {$add: ["$$value", {$ifNull: ["$$this.amount", 0]}]},
					}
				},
				'borderExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Border"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'challanExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Challan"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'datacommiExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Dala Commision"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'diesalExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Diesel"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'fixedSalExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Fixed + Salary"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'oktimeExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "OK + Time"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'parkingExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Parking"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'rajaiExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Rajai"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'repairExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Repair"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'rotiExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Roti"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'serviceExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Service"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'extraExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Extra"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'missPendExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Miscellaneous Pending"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'fastagTollExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Fastag Toll Tax"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'cashTollExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Cash Toll Tax"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'tollExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Toll Tax"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'wagesExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Wages"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'localTripExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Local Trip"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'consumStoreExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Consumable store"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'addBlueExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Add Blue"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'phoneExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Phone Expense"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'guideChargesExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Guide Charges"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'biltyChargesExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Bilty Charges"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'greenTaxExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Green tax"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'washingExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Washing"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'maintenanceExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Maintenance"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'WeighChargesExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Weighbridge Charges"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'crainChargesExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Crain Charges"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'internal_freight': {
					$reduce: {
						input: '$gr',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{"$ifNull": ["$$this.totalFreight", {"$ifNull": ["$$this.internal_rate", 0]}]}
							]
						},
					}
				},
				'tAdv': {
					$reduce: {
						input: '$advanceBudget',
						initialValue: 0,
						in: {$add: ["$$value", {$ifNull: ["$$this.amount", 0]}]},
					}
				},
				'diesel': {
					$reduce: {
						input: '$advanceBudget',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{
											$or: [
												{$eq: ["$$this.advanceType", "Diesel"]},
												{$eq: ["$$this.advanceType", "Extra Diesel"]},
											]
										},
										{$ifNull: ["$$this.dieseInfo.litre", 0]},
										0
									]
								}
							]
						},
					}
				},
				'trip_total_dist': {$cond: [ {$eq: ["$route.route_distance", 0]}, 1, {$ifNull: ['$route.route_distance', 1]} ]},
				'trip_total_ext': {$ifNull: ['$extraKm', 0]},

				// 	'trip_total_dist': {
				// 		$add: [
				// 			{ $cond: [ { $eq: ['$route.route_distance', 0] }, 1, '$route.route_distance'] },
				// 			0,
				// 		]
				// 	},
				// 	'trip_total_dist_with_ekm': {
				// 		$add: [
				// 			{
				// 				$cond: [
				// 					{$eq: ['$route.route_distance', 0]},
				// 					1,
				// 					{$ifNull: ['$route.route_distance', 1]},
				// 				]
				// 			},
				// 			{$ifNull: ['$extraKm', 0]}
				// 		]
				// 	}
			}
		},
		{
			$addFields: {
				'initial_profit': {
					$subtract: ['$internal_freight', '$actual_expense']
				},
			}
		},

		{
			$lookup: {
				from: 'registeredvehicles',
				localField: 'vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		},
		{
			$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
			}
		},
		{$match: vehicleQuery},
		{
			$project: {
				"actual_expense": 1,
				"borderExp": 1,
				"challanExp": 1,
				"datacommiExp": 1,
				"diesalExp": 1,
				"fixedSalExp": 1,
				"oktimeExp": 1,
				"parkingExp": 1,
				"rajaiExp": 1,
				"repairExp": 1,
				"rotiExp": 1,
				"serviceExp": 1,
				"extraExp": 1,
				"missPendExp": 1,
				"fastagTollExp": 1,
				"cashTollExp": 1,
				"tollExp": 1,
				"wagesExp": 1,
				"localTripExp": 1,
				"addBlueExp": 1,
				"consumStoreExp": 1,
				"phoneExp": 1,
				'guideChargesExp':1,
				'biltyChargesExp':1,
				'greenTaxExp':1,
				'washingExp':1,
				'maintenanceExp':1,
				'WeighChargesExp':1,
				'crainChargesExp':1,
				"internal_freight": 1,
		 		"tAdv": 1,
				"diesel": 1,
				"trip_total_dist": 1,
				"trip_total_ext": 1,
				"initial_profit": 1,
				"vehicle": 1,
				"statuses": 1,
				"driver": 1,
				"extraKm": 1,
				"advSettled": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"trip_expenses.amount": 1,
				"trip_expenses.type": 1,
				"gr":1,
				// "gr.totalFreight": 1,
				// "gr.internal_rate": 1,
				"advanceBudget.amount": 1,
				"advanceBudget.advanceType": 1,
				"advanceBudget.dieseInfo": 1,
				"route.route_distance": 1,
				"route_name": 1,
				"trip_start_status": 1,
				"trip_end_status": 1,
				"markSettle": 1,
				"payments": 1,
				category: 1,
			}
		},
		{
			"$lookup": {
				"from": "vouchers",
				"localField": "payments",
				"foreignField": "_id",
				"as": "payment"
			}
		},
		{$sort: {'trip_start_status.date': 1}},
		{
			$group: {
				_id: '$advSettled.tsNo',
				trips: {$push: '$$ROOT'},
				allSegments: {$push: {$concat: ['$segment_type', '(', {$toString: '$trip_no'}, ')']}},
				segment: {$last: '$segment_type'},
				vehicle_no: {$last: '$vehicle_no'},
				vehicle_type: {$last: '$veh_type_name'},
				advSettled: {$last: '$advSettled'},
				route: {$last: '$route'},
				totalKM: {$sum: '$trip_total_dist'},
				totalExtKM: {$sum: '$trip_total_ext'},
				// totalKM: {$sum:'$trip_total_dist_with_ekm'},
				// totalExtKM: {$sum: '$trip_total_ext'},
				firstTripStart: {$first: '$trip_start_status'},
				lastTripEnd: {$last: '$trip_end_status'},
				netExpense: {$sum: '$actual_expense'},
				total_internal_freight: {$sum: '$internal_freight'},
				total_actual_profit: {$sum: '$initial_profit'},
				total_diesel: {$sum: '$diesel'},
				total_advance: {$sum: '$tAdv'},
				totBorderExp: {$sum: '$borderExp'},
				totChallanExp: {$sum: '$challanExp'},
				totDatacommiExp: {$sum: '$datacommiExp'},
				totDiesalExp: {$sum: '$diesalExp'},
				totFixedSalExp: {$sum: '$fixedSalExp'},
				totOktimeExp: {$sum: '$oktimeExp'},
				totParkingExp: {$sum: '$parkingExp'},
				totRajaiExp: {$sum: '$rajaiExp'},
				totRepairExp: {$sum: '$repairExp'},
				totRotiExp: {$sum: '$rotiExp'},
				totServiceExp: {$sum: '$serviceExp'},
				totExtraExp: {$sum: '$extraExp'},
				totMissPendExp: {$sum: '$missPendExp'},
				totFastagTollExp: {$sum: '$fastagTollExp'},
				totCashTollExp: {$sum: '$cashTollExp'},
				totTolltaxExp: {$sum: '$tollExp'},
				totWagesExp: {$sum: '$wagesExp'},
				totConsumStoreExp: {$sum: '$consumStoreExp'},
				totLocalTripExp: {$sum: '$localTripExp'},
				totPhoneExp: {$sum: '$phoneExp'},
				totGuideChargesExp: {$sum: '$guideChargesExp'},
				totBiltyChargesExp: {$sum: '$biltyChargesExp'},
				totGreenTaxExp: {$sum: '$greenTaxExp'},
				totWashingExp: {$sum: '$washingExp'},
				totMaintenanceExp: {$sum: '$maintenanceExp'},
				totWeighChargesExp: {$sum: '$WeighChargesExp'},
				totCrainChargesExp: {$sum: '$crainChargesExp'},
				totAddBlueExp: {$sum: '$addBlueExp'},
			}
		},
		//{$sort:{_id:1}},
		//{$sort: {'firstTripStart.date': -1}}
	];
	if(req.body.sSkip){
		aggrQuery.push({$skip:req.body.sSkip});
	}
	if(req.body.limit){
		aggrQuery.push({$limit:req.body.limit});
	}
		aggrQuery.push(
		{
			$addFields: {
				// in days
				rtElapsed: {
					$divide: [
						{
							$subtract: ['$lastTripEnd.date', '$firstTripStart.date']
						},
						86400000
					]
				},
				sumTotKm: {
					$add: [
						{$ifNull: ['$totalKM', 0]},
						{$ifNull: ['$totalExtKM', 0]}
					]
				}
			}
		},
		{
			$addFields: {
				'revenue/km': {$divide: ['$total_internal_freight', {$cond: [{$eq: ['$totalKM', 0]}, 1, '$totalKM']}]},
				'expense/km': {$divide: ['$netExpense', {$cond: [{$eq: ['$sumTotKm', 0]}, 1, '$sumTotKm']}]},
				'profit/km': {$divide: ['$total_actual_profit', {$cond: [{$eq: ['$totalKM', 0]}, 1, '$totalKM']}]},
				'profit/day': {$divide: ['$total_actual_profit', {$cond: [{$eq: ['$rtElapsed', 0]}, 1, '$rtElapsed']}]},
			}
		},
		{
			$project: {
				_id: 1,
				//	trips:1,
				segment_type: 1,
				trip_no: 1,
				segment: 1,
				vehicle_type: 1,
				vehicle_no: 1,
				advSettled: 1,
				route: 1,
				totalKM: 1,
				"totalExtKM": 1,
				'firstTripStart.date': 1,
				'firstTripStart.status': 1,
				'lastTripEnd.date': 1,
				'lastTripEnd.status': 1,
				netExpense: 1,
				total_internal_freight: 1,
				total_actual_profit: 1,
				total_diesel: 1,
				// Added New For Expense Report...
				totBorderExp: 1,
				totChallanExp: 1,
				totDatacommiExp: 1,
				totDiesalExp: 1,
				totFixedSalExp: 1,
				totOktimeExp: 1,
				totParkingExp: 1,
				totRajaiExp: 1,
				totRepairExp: 1,
				totRotiExp: 1,
				totServiceExp: 1,
				totExtraExp: 1,
				totMissPendExp: 1,
				totFastagTollExp: 1,
				totCashTollExp: 1,
				totTolltaxExp: 1,
				totWagesExp: 1,
				totPhoneExp: 1,
				totGuideChargesExp:1,
				totBiltyChargesExp: 1,
				totGreenTaxExp: 1,
				totWashingExp: 1,
				totMaintenanceExp: 1,
				totWeighChargesExp: 1,
				totCrainChargesExp: 1,
				totAddBlueExp: 1,
				totLocalTripExp: 1,
				totConsumStoreExp: 1,
				// END
				total_advance: 1,
				rtElapsed: 1,
				'revenue/km': 1,
				'expense/km': 1,
				'profit/km': 1,
				'profit/day': 1,
				"trips.markSettle": 1,
				"trips.trip_no": 1,
				"trips.category": 1,
				"trips.payments": 1,
				"trips.totalExtKM": 1,
				"trips.totalKM": 1,
				"trips.trip_start_status.status": 1,
				"trips.trip_start_status.date": 1,
				"trips.trip_end_status.status": 1,
				"trips.trip_end_status.date": 1,
				"trips.advSettled": 1,
				"trips.vehicle.veh_owner_group": 1,
				"trips.vehicle_no": 1,
				"trips.vehicle.veh_type_name": 1,
				"trips.vehicle.owner_group": 1,
				"trips.route_name": 1,
				"trips.route.route_distance": 1,
				"trips.extraKm": 1,
				"trips.driver.name": 1,
				"trips.driver.account": 1,
				"trips.internal_freight": 1,
				"trips.segment_type": 1,
				"trips.gr.grNumber": 1,
				"trips.gr.weight": 1,
				"trips.gr.customer": 1,
				"trips.payment": 1
			}
		});
	if(req.body.report_category === "Performance"){
		aggrQuery.push({$sort:{'firstTripStart.date': 1}});
	}
	aggrQuery.push({$sort:{'vehicle_no': 1}});

	const tripCursor = TripV2.aggregate(aggrQuery);
	tripCursor.options = { allowDiskUse: true, batchSize: 1000};
	//tripCursor.cursor({batchSize: 1000});
	tripCursor.exec(async function (err, aData) {
		if (err) {
			return res.status(500).json({
				status: "ERROR",
				message: err.toString()
			});
		}
		if (!aData.length) {
			if(hasTimeoutExecuted){
				console.log('No Round Trips found.');
			}else{
				clearTimeout(timer);
				return res.status(500).json({
					status: "ERROR",
					message: 'No Round Trips found.'
				});
			}
		}

		//
		let d = {...aData[0]};
		delete d.roundTrips;

		//------------ Summery Done.........
		aData = await Voucher.populate(aData, {
			path:"trips.payments",
			select: {"ledgers.amount":1, "ledgers.account":1, "ledgers.cRdR":1 },
			options: { lean: true}});
		aData = await Customer.populate(aData, {
			path:"trips.gr.customer",
			select: {"name":1},
			options: { lean: true}});
		if (req.body.download) {
			if(req.body.report_category === "Performance") {
				/*
				aData.sort((a,b) => {
					if ( a.trips[0].vehicle_no < b.trips[0].vehicle_no ){
						return -1;
					}
					if ( a.trips[0].vehicle_no > b.trips[0].vehicle_no ){
						return 1;
					}
					return 0;
				});
				*/
			  aData[0].showTrips = req.body.showTrips;
			  aData[0].category = req.body.category;
			  aData[0].trip = req.body.trip;
			  if(req.body.vehicle || req.body.allowYear){
				  for(let r=0;r<aData.length;r++){
					  if(aData[r].lastTripEnd && aData[r].lastTripEnd.date && aData[r].firstTripStart && aData[r].firstTripStart.date){
						  let oFilSuspense = {
							  trip:{$exists:false},
							  date:{$gte:new Date(aData[r].firstTripStart.date),$lte:new Date(aData[r].lastTripEnd.date)},
							  vehicle_no:aData[r].vehicle_no
						  };
						  let aggrPipe = [
							  {$match:oFilSuspense},
							  {$group:{
									  _id:null,
									  sus:{$sum:'$amount'}
								  }
							  }
						  ];
						  let oSusAdv = await  TripAdvance.aggregate(aggrPipe);
						  aData[r].suspense =oSusAdv && oSusAdv[0] && oSusAdv[0].sus;
						  if(aData[r].suspense){
							  console.log('suspense amount found',aData[r].vehicle_no,aData[r].suspense,aData[r]._id);
						  }else{
						  	console.log(r, ' / ', aData.length);
						  }
					  }
				  }
			  }
				// if (req.body.category === "Trip Detail")
				//
				// else if (req.body.category === "Loaded Trip")
				ReportExelService.rtprDetailed(aData, req.user.clientId, req.body.segment_type, async function(d) {
					if(hasTimeoutExecuted){
						console.log(d.url);
						await logsService.addLog('RTP_Detail_Report', {
							uif: "RTP_Detail_Report_" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'Trip Advance Report'
						}, req);
					}else {
						clearTimeout(timer);
						return res.status(200).json({
							status: "SUCCESS",
							message: 'Round Trip Detailed Profitability Report',
							url: d.url
						});
					}
				});
			}
			else if(req.body.report_category === "RTPExpense") {
				req.body.settlementObj = req.clientConfig && req.clientConfig.config && req.clientConfig.config.master && req.clientConfig.config.master.settlementObj || [];
				ReportExelService.rtpExpense(aData, req.user.clientId, req.body, async function(d) {
					if(hasTimeoutExecuted){
						await logsService.addLog('RTP_Expense_Report', {
							uif: "RTP_Expense_Report" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'Trip Advance Report'
						}, req);
					}else {
						clearTimeout(timer);
						if(req.body.download==="excelDownload"){
							var urlSplit = d.url.split('/');
							var reportIndex = urlSplit.findIndex(s=>s==='reports');
							var urljoin = urlSplit.slice(reportIndex).join('/');
							//var pdfUrl = urljoin.replace('xlsx', 'pdf');

							let path = global.projectHome + '/files/' + urljoin;
							converter.generatePdf(path, function(err, result) {
								// Process result if no error
								if (result.status === 0) {
									console.log('Output File located at ' + result.outputFile);
								}
								if(err){
									console.log('pdf error is : ' + err);
								}
							});

						}
						else{
							return res.status(200).json({
								status: "SUCCESS",
								message: 'Round Trip RTP Expense Report',
								url: d.url
							});
						}
					}


				});
			}
			else {
				if(req.body.vehicle || req.body.allowYear){
					for(let r=0;r<aData.length;r++){
						if(aData[r].lastTripEnd && aData[r].lastTripEnd.date && aData[r].firstTripStart && aData[r].firstTripStart.date){
							let oFilSuspense = {
								trip:{$exists:false},
								date:{$gte:new Date(aData[r].firstTripStart.date),$lte:new Date(aData[r].lastTripEnd.date)},
								vehicle_no:aData[r].vehicle_no
							};
							let aggrPipe = [
								{$match:oFilSuspense},
								{$group:{
										_id:null,
										sus:{$sum:'$amount'}
									}
								}
							];
							let oSusAdv = await  TripAdvance.aggregate(aggrPipe);
							aData[r].suspense =oSusAdv && oSusAdv[0] && oSusAdv[0].sus;
							if(aData[r].suspense){
								console.log('suspense amount found',aData[r].vehicle_no,aData[r].suspense,aData[r]._id);
							}else{
								console.log(r, ' / ', aData.length);
							}
						}
					}
				}
				ReportExelService.rtpr(aData, req.user.clientId, req.body, async function(d) {
					if(hasTimeoutExecuted){
						let rName = 'RTP';
						if(req.body.owner_group && req.body.owner_group[0]){
							rName = rName + req.body.owner_group[0];
						}
						if(req.body.segment_type && req.body.segment_type[0]){
							rName = rName + req.body.segment_type[0];
						}
						if(req.body.vehicle){
							rName = rName + aData[0].trips[0].vehicle_no;
						}
						await logsService.addLog('RTP_Report', {
							uif: rName + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id
						}, req);
					}else {
						clearTimeout(timer);
						return res.status(200).json({
							status: "SUCCESS",
							message: 'Round Trip profitability Report',
							url: d.url
						});
					}
				});
			}
		} else {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Round Trip profitability Report',
				data: {
			        data:aData || []
				},
			});
		}
	});
});

router.post("/rtprExNew", async (req, res, next) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	let hasTimeoutExecuted = false;
	let timer = setTimeout(() => {
		hasTimeoutExecuted = true;
		if(!res.headersSent){
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}
	}, 1000 * 30);


	let aggrQuery = [
		{
			$match: constructFilter()
		},
		{
			$project: {
				"borderExp": 1,
				"challanExp": 1,
				"tsNo": 1,
				"startDate": 1,
				"endDate": 1,
				"cSettle": 1,
				"mSettle": 1,
				"openingBal": 1,
				"sysDate": 1,
				"date": 1,
				"csBy": 1,
				"msBy": 1,
				"csRemark": 1,
				"msRemark": 1,
				"creation.date": 1,
				"creation.user": 1,
				"vehicle": 1,
				"driver.name": 1,
				"suspense": 1,
				"gapSuspense": 1,
				"totalKm": 1,
				"totalExtraKm": 1,
				"netBudget": 1,
				"netAdvVch": 1,
				"netAdvObj": 1,
				"netAdvance": 1,
				"netAdvVchObj": 1,
				"netExpense": 1,
				"netExpVch": 1,
				"netExpObj": 1,
				"netExpVchObj": 1,
				"dieselBudget": 1,
				"dieselGivLit": 1,
				"dieselGivAmt": 1,
				"overDue": 1,
				"openCloseBal": 1,
				"driverIncentiveVch": 1,
				"driverPayment": 1,
				"revenue": 1,
				"profit": 1,
				"revenueByKm": 1,
				"expenseByKm": 1,
				"profitByKm": 1,
				"profitByday": 1,
				"ttDays": 1,
				"totalSuspence": 1,
				"totBorderExp": 1,
				"totChallanExp": 1,

				"trip.trip_no": 1,
				"trip.bill_no": 1,
				"trip.startDate": 1,
				"trip.endDate": 1,
				"trip.suspenseRemark": 1,
				"trip.settled": 1,
				"trip.ownershipType": 1,
				"trip.AccManagerRmk": 1,
				"trip.advanceBudget": 1,
				"trip.status": 1,
				"trip.rmk": 1,
				"trip.category": 1,
				"trip.extraKm": 1,
				"trip.route_name": 1,
				"trip.routeKm": 1,
				"trip.allocation_date": 1,
				"trip.trip_expenses": 1,
				"trip.payments": 1,
				"trip.statuses": 1,
				"trip.gr": 1,
				"trip.remarks": 1,
                "settlementObj":req.clientConfig && req.clientConfig.config && req.clientConfig.config.master && req.clientConfig.config.master.settlementObj || []
			}
		}
	];

	let downloadPath = await new csvDownload(TripSettlementCache, aggrQuery, {
		filePath: `${req.user.clientId}/Round_Trip_Expense`,
		fileName: `RTP_EXP_NEW_${moment().format('DD-MM-YYYY_hh:mm')}`
	}).exec(RtprExp.transform, req);

	if(hasTimeoutExecuted){
		await logsService.addLog('RTP_Expense_Report', {
			uif: "RTP_Expense_Report" + moment().format('DD-MM-YYYY hh:mm'),
			docId: req.user._id,
			category: 'Notification',
			delta: [],
			dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
			userId: req.user._id,
			subCategory: 'RTP Expense Report'
		}, req);
	}else {
		clearTimeout(timer);
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Trip Expense Report ',
			url: downloadPath
		});
	}

	function constructFilter() {
		let filter = {
			clientId: req.user.clientId,
			'tsNo': {$exists:true},
			// 'trip.ownershipType': req.body.ownershipType ? {$in:req.body.ownershipType} :  {"$ne": "Market"}
		};
		let query = req.body;
		const DATE_BY = {
			"RT Start": 'startDate',
			"RT End": 'endDate',
			"RT Creation": 'creation.date',
			"RT Mark Settle": 'date',
		};
		const KEY_MAPPER = {
			vehicle: 'vehicle._id',
			driver: 'driver._id',
			rtNo: 'tsNo',
			owner_group: 'vehicle.fleet',
			segment_type: 'vehicle.segment',
		};

		const ALLOWED_KEY = ['from', 'to', 'vehicle', 'rtNo', 'owner_group', 'segment_type', 'mSettle', 'driver'];
		for(let key in query){
			if(req.body.hasOwnProperty(key) && ALLOWED_KEY.indexOf(key) != -1){
				if(key == 'from' || key == 'to'){
					if(typeof query.rtNo != 'undefined' && query.rtNo)
						continue;
					let compareTo = DATE_BY[query.by] || "date";
					filter[compareTo] = filter[compareTo] || {};
					filter[compareTo][key === 'from' ? '$gte' : '$lt'] = moment(query[key])[key === 'from' ? 'startOf' : 'endOf']('day').toDate();
				}else
					filter[KEY_MAPPER[key] || key] = formatData(query[key]);
			}
		}

		return filter;
	}

	function formatData(value){
		if(Array.isArray(value))
			if(value.length == 1)
				return value[0];
			else
				return {
					$in: value
				};

		if(typeof value == 'string' && value.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i))
			return otherUtil.arrString2ObjectId(value);

		return value;
	}
});

router.post("/newRtpr", async (req, res, next) => {

	let hasTimeoutExecuted = false;
	let timer = setTimeout(() => {
		hasTimeoutExecuted = true;
		return res.status(200).json({
			status: 'SUCCESS',
			message: 'Report is taking time. Please wait, you will receive notification.',
		});
	}, 1000 * 60);

	let aggrQuery = [
		{
			$match: constructFilter()
		},
		{
			$project: {
				"vehicle.vehicleNo": 1,
				"driver.name": 1,
				"startDate": 1,
				"endDate": 1,
				"vehicle.fleet": 1,
				"tsNo": 1,
				"totalKm": 1,
				"totalExtraKm": 1,
				"netAdvance": 1,
				"dieselGivLit": 1,
				"ttDays": 1,
				"revenue": 1,
				"revenueByKm": 1,
				"netExpense": 1,
				"expenseByKm": 1,
				"profit": 1,
				"profitByKm": 1,
				"profitByday": 1,
				"totalSuspence": 1,
				"msBy": 1,
				"msRemark": 1,
				"trip.route": 1,
				"date": 1,
				"creation.date": 1,
				"creation.user": 1
			}
		}
	];

	let downloadPath = await new csvDownload(TripSettlementCache, aggrQuery, {
		filePath: `${req.user.clientId}/Round_Trip_Performance`,
		fileName: `RTPR_NEW_${moment().format('DD-MM-YYYY_hh:mm')}`
	}).exec(Rtpr.transform, req);

	if(hasTimeoutExecuted){
		await logsService.addLog('RTP Report', {
			uif: "RTPR_New_" + moment().format('DD-MM-YYYY hh:mm'),
			docId: req.user._id,
			category: 'Notification',
			delta: [],
			dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
			userId: req.user._id,
			subCategory: 'RTP Report'
		}, req);
	}else {
		clearTimeout(timer);
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Trip Gr Report ',
			url: downloadPath
		});
	}

	function constructFilter() {
		let filter = {
			clientId: req.user.clientId
		};
		let query = req.body;
		const DATE_BY = {
			"RT Start": 'startDate',
			"RT End": 'endDate',
			"RT Creation": 'creation.date',
			"RT Mark Settle": 'date',
		};
		const KEY_MAPPER = {
			vehicle: 'vehicle._id',
			driver: 'driver._id',
			rtNo: 'tsNo',
			owner_group: 'vehicle.fleet',
			segment_type: 'vehicle.segment',
		};

		const ALLOWED_KEY = ['from', 'to', 'vehicle', 'rtNo', 'owner_group', 'segment_type', 'mSettle', 'driver'];
		for(let key in query){
			if(req.body.hasOwnProperty(key) && ALLOWED_KEY.indexOf(key) != -1){
				if(key == 'from' || key == 'to'){
					if(typeof query.rtNo != 'undefined' && query.rtNo)
						continue;
					let compareTo = DATE_BY[query.by] || "startDate";
					filter[compareTo] = filter[compareTo] || {};
					filter[compareTo][key === 'from' ? '$gte' : '$lt'] = moment(query[key])[key === 'from' ? 'startOf' : 'endOf']('day').toDate();
				}else
					filter[KEY_MAPPER[key] || key] = formatData(query[key]);
			}
		}

		return filter;
	}

	function formatData(value){
		if(Array.isArray(value))
			if(value.length == 1)
				return value[0];
			else
				return {
					$in: value
				};

		if(typeof value == 'string' && value.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i))
			return otherUtil.arrString2ObjectId(value);

		return value;
	}
});

router.post("/rtpGap", async (req, res, next) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	const consFilter = (oBody) => {
		let o = {
			'advSettled.tsNo': {$exists:true},
		};
		for (let key in oBody) {
			if (oBody.hasOwnProperty(key) && ['advSettled.tsNo', 'markSettle.date', 'segment_type'].indexOf(key) >= 0) {
				if(oBody[key].toString().match(/^[0-9a-fA-F]{24}$/)) {
					o[key] = otherUtil.arrString2ObjectId(oBody[key]);
				}else if (key === 'segment_type') {
					if (oBody[key] instanceof Array) {
						o[key] = {$in: oBody[key]};
					} else {
						o[key] = oBody[key];
					}
				}else {
					o[key] = oBody[key];
				}
			}
		}
		if ((typeof(o['advSettled.tsNo']) !== 'number') && oBody.from && oBody.to) {
			o['markSettle.date'] = {
				$gte: moment(oBody.from).startOf('day').toDate(),
				$lte: moment(oBody.to).endOf('day').toDate(),
			};
		}
		return o;
	};
	let oFil = consFilter(req.body);
	oFil.clientId = req.body.clientId;
	const aggrQuery = [
		{$match: oFil},
		{$limit: 500},
		{
			$project:{
				rtNo: "$advSettled.tsNo",
				vehicle_no: 1,
				trip_no: 1,
				"settlemntDate": "$markSettle.date",
				"statuses": 1,
			}
		},

		{
			"$addFields": {
				"trip_start_status": {
					"$arrayElemAt": [
						{
							"$filter": {
								"input": "$statuses",
								"as": "item",
								"cond": {
									"$eq": [
										"$$item.status",
										"Trip started"
									]
								}
							}
						},
						0
					]
				},
				"trip_end_status": {
					"$arrayElemAt": [
						{
							"$filter": {
								"input": "$statuses",
								"as": "item",
								"cond": {
									"$eq": [
										"$$item.status",
										"Trip ended"
									]
								}
							}
						},
						0
					]
				}
			}
		},

		{
			$project:{
				rtNo: 1,
				vehicle_no: 1,
				// trip_no: 1,
				"settlemntDate": 1,
				tripStartDate: "$trip_start_status.date",
				tripEndDate: "$trip_end_status.date",

			}
		},
		{
			"$group": {
				_id : "$rtNo",
				"settlemntDate" : {$first: "$settlemntDate"},
				"vehicle_no" : {$first: "$vehicle_no"},
				"rtNo" :{"$first": "$rtNo"},
				data: { $push: "$$ROOT"},
			}
		},
		{$sort: {_id: 1} },
		{
			"$group": {
				_id : "$vehicle_no",
				data: { $push: "$$ROOT"},
			}
		},
		{$sort: {_id: 1} }
	];

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let aFoundData = await serverSidePage.requestData(TripV2, oQuery);

	if (!aFoundData.length) {
		return res.status(500).json({
			status: "ERROR",
			message: 'No Round Trip found'
		});
	}

	aFoundData.forEach(obj =>{
		obj.data.forEach(insideObj =>{
			insideObj.settlemntDate = insideObj.data[0].settlemntDate;
			insideObj.rtStartDate = insideObj.data[0].tripStartDate;
			insideObj.rtEndDate = insideObj.data.slice(-1)[0].tripEndDate || new Date();
			insideObj.mStartDate = new Date(new Date(insideObj.rtEndDate).setDate(new Date(insideObj.rtEndDate).getDate() + 1));
		});
		for(let i=0; i<obj.data.length-1; i++){
			let j = i;
			obj.data[i].mEndDate = new Date(obj.data[j+1].rtStartDate);
		}
	});

	for(let obj of aFoundData){
		if(obj._id){
			for(let r=0;r<obj.data.length;r++){
				if(obj.data[r].rtStartDate && obj.data[r].rtEndDate){
					let oFilSuspense = {
						trip:{$exists:false},
						date:{$gte:new Date(obj.data[r].rtStartDate),$lte:new Date(obj.data[r].rtEndDate)},
						vehicle_no:obj.data[r].vehicle_no
					};
					let aggrPipe = [
						{$match:oFilSuspense},
						{$group:{
								_id:null,
								sus:{$sum:'$amount'}
							}
						}
					];
					let oSusAdv = await  TripAdvance.aggregate(aggrPipe);
					obj.data[r].suspense =oSusAdv && oSusAdv[0] && oSusAdv[0].sus;
					if(obj.data[r].suspense){
						console.log('suspense amount found',obj.data[r].vehicle_no,obj.data[r].suspense,obj.data[r]._id);
					}else{
						console.log(r, ' / ', obj.data.length);
					}
				}
			}
		}
	}
		if (req.body.download) {
				ReportExelService.rtpGap(aFoundData, req.body.clientId, req.body, function(d) {
					return res.status(200).json({
						status: "SUCCESS",
						message: 'Round Trip profitability Report',
						url: d.url
					});
				});
		} else {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Round Trip profitability Report',
				data: {
					data:aData || [],
				},
			});
		}
});

router.post("/dlp-dup", async (req, res, next) => {
	if (!req.body.from || !req.body.to || !req.body.rpType) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date, rpType are mandatory',
		});
	}
	const constMatch = (body) => {
		const o = {
			clientId: req.user.clientId,
			/*'trip_expenses.0': {$exists: true},
			'advanceBudget.0': {$exists: true},*/
		};
		if(body.rpType === 'dlp'){
			o['category'] = body.category;
		}
		if (body.from && body.to) {
			o[`${body.rpType === 'dlp' ? 'trip_start' : 'trip_end'}_status.date`] = {
				$gte: moment(body.from).startOf('day').toDate(),
				$lte: moment(body.to).endOf('day').toDate(),
			};
	 	}
	 	// if (body.segment_type) {
	 	// 	o['segment_type'] = body.segment_type;
		// }
		 if (body.segment_type) {
			if(body.segment_type instanceof Array){
				o['segment_type'] = {$in:body.segment_type};
			}
			else{
				o['segment_type'] = body.segment_type;
			}
		}
		 // if(body.category === 'Loaded'){
		 // 	o['category'] = body.category;
		 // }
		return o;
	};
	let oFil = constMatch(req.body);
	let vehicleQuery = {};
	if(req.body.owner_group){
		if(req.body.owner_group instanceof Array){
			vehicleQuery['vehicle.owner_group'] = {$in:req.body.owner_group};
		}
		else{
			vehicleQuery['vehicle.owner_group'] = req.body.owner_group;
		}
	}
	const aggrQuery = [
		{$addFields: {
				'trip_start_status': {
					$arrayElemAt: [{
						$filter: { input: '$statuses', as: 'item', cond: { $eq: ['$$item.status', 'Trip started'] } }
					}, 0]
				},
				'trip_end_status': {
					$arrayElemAt: [{
						$filter: { input: '$statuses', as: 'item', cond: { $eq: ['$$item.status', 'Trip ended'] } }
					}, 0]
				},
			}},
		{$match: oFil},
		{$limit:40000},
		{
			$project:{
				gr:1,
				"vehicle":1,
				"driver":1,
				"route":1,
				"trip_expenses":1,
				"advanceBudget":1,
				"extraKm":1,
				"trip_no":1,
				"trip_start_status.date":1,
				"segment_type":1,
				"vehicle_no":1,
				"route_name":1,

			}
		},
		{$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}},
		{$lookup: {
				from: 'registeredvehicles',
				localField: 'vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}},
		{$match:vehicleQuery},
		{$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
			}},
		{$lookup: {
				from: 'drivers',
				localField: 'driver',
				foreignField: '_id',
				as: 'driver'
			}},
		{$unwind: {
				path: '$driver',
				preserveNullAndEmptyArrays: true
			}},
		{$lookup: {
				from: 'transportroutes',
				localField: 'route',
				foreignField: '_id',
				as: 'route'
			}},
		{$unwind: {
				path: '$route',
				preserveNullAndEmptyArrays: true
			}},
		{$lookup: {
				from: 'tripsexpenses',
				localField: 'trip_expenses',
				foreignField: '_id',
				as: 'trip_expenses'
			}},
		{$lookup: {
				from: 'tripadvances',
				localField: 'advanceBudget',
				foreignField: '_id',
				as: 'advanceBudget'
			}},
		{
			$project:{
				"advanceBudget":1,
				"gr.internal_rate":1,
				"route.route_distance":1,
				"extraKm":1,
				"trip_expenses":1,
				"trip_no":1,
				"trip_start_status.date":1,
				"segment_type":1,
				"vehicle_no":1,
				"route_name":1,

			}
		},
		{$addFields: {
				'tAdv':{
					$reduce: {
						input: '$advanceBudget',
						initialValue: { cashAdvance: 0, dieselAdvance: 0, totalAdvance: 0 },
						in: {
							cashAdvance: {
								$add: [
									"$$value.cashAdvance",
									{ $cond: [
											{ $or: [
													{ $eq: [ "$$this.advanceType", "Driver Cash" ] },
													{ $eq: [ "$$this.advanceType", "Happay" ] },
													{ $eq: [ "$$this.advanceType", "Fastag" ] }
												] },
											{ $ifNull: ["$$this.amount", 0] },
											0
										] }
								] },
							dieselAdvance: {
								$add: [
									"$$value.dieselAdvance",
									{ $cond: [ { $eq: [ "$$this.advanceType", "Diesel" ] }, { $ifNull: ["$$this.amount", 0] }, 0 ] }
								] },
							totalAdvance: {
								$add: [
									"$$value.totalAdvance",
									{ $cond: [
											{ $or: [
													{ $eq: [ "$$this.advanceType", "Driver Cash" ] },
													{ $eq: [ "$$this.advanceType", "Happay" ] },
													{ $eq: [ "$$this.advanceType", "Fastag" ] },
													{ $eq: [ "$$this.advanceType", "Diesel" ] },
												] },
											{ $ifNull: ["$$this.amount", 0] },
											0
										] }
								] }
						}
					}
				},
				'actual_expense': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{ $ifNull: ["$$this.amount", 0] }
							]
						},
					}
				},
				'internal_freight': {
					$reduce: {
						input: '$gr',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{ $ifNull: ["$$this.internal_rate", 0] }
							] },
					}
				},
				'totalKM': {
					$add: [
						{ $ifNull: ['$route.route_distance', 0] },
						{ $ifNull: ['$extraKm', 0] },
					] },
			}},
		{
			$project:{
				"advanceBudget":1,
				"gr.internal_rate":1,
				"route.route_distance":1,
				"extraKm":1,
				"trip_expenses":1,
				"trip_no":1,
				"trip_start_status.date":1,
				"segment_type":1,
				"vehicle_no":1,
				"route_name":1,
				"tAdv" : 1,
				"actual_expense":1,
				"internal_freight":1,
				"totalKM":1
			}
		},
		{$addFields: {
				'revenue/km': {
					$divide: [
						'$internal_freight',
						{ $cond: [ { $eq: [ '$totalKM', 0 ] }, 1, '$totalKM' ] }
					]
				},
				'adv/km': {
					$divide: [
						'$tAdv.totalAdvance',
						{ $cond: [ { $eq: ['$totalKM', 0] }, 1, '$totalKM' ] }
					]
				},
				'profit': {
					$subtract: ['$tAdv.totalAdvance', '$actual_expense']
				},
			}},
		{$addFields: {
				'profit/km': {
					$divide: [
						'$profit',
						{ $cond: [ { $eq: [ '$totalKM', 0 ] }, 1, '$totalKM' ] }
					]
				},
			}},
		{
			$project:{
				"vehicle_no":1,
				"trip_start_status":1,
				"segment_type":1,
				"trip_no":1,
				"route_name":1,
				"route":1,
				"internal_freight":1,
				"tAdv":1,
				"revenue/km":1,
				"adv/km":1,
				"profit":1,
				"profit/km":1,

			}
		},
		{ $sort: {
				[`${req.body.rpType === 'dlp' ? 'trip_start' : 'trip_end'}_status.date`]: -1
			} },
		// {$group:{
		// 		_id:null,
		// 		trips:{$push:'$$ROOT'},
		// 		// tripsCount:{$sum:1},
		// 		// tTotalKM: {$sum:'$totalKM'},
		// 		// tTotal_profit:{$sum:'$profit'},
		// 		// tTotal_expense:{$sum:'$actual_expense'},
		// 		// tInternal_freight:{$sum:'$internal_freight'},
		// 	}},
	];
	const tripCursor = TripV2.aggregate(aggrQuery);
	tripCursor.options = { allowDiskUse: true, batchSize: 1000};
	tripCursor.exec(function (err, aData) {
		if (err) {
			return res.status(500).json({
				status: "ERROR",
				message: err.toString()
			});
		}
		if (aData.length === 0) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'No trips found',
			});
		}
		let trip = [];
		aData.forEach(obj => {
			trip.push(obj);
		});
		if(trip.length){
			aData = [];
	    	aData.push({});
			aData[0].trips = trip;
		}
		if (req.body.download) {
			ReportExelService.dlpDup(aData, req.body.rpType, req.user.clientId, function(d) {
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Round Trip profitability Report',
					url: d.url
				});
			});
		} else {
			// let d = {...aData[0]};
			// delete d.trips;
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Round Trip profitability Report',
				data: {
					data:aData[0].trips,
					// summary:d,
				},
			});
		}
	});
});

router.post("/lastSettlRtReport", async (req, res, next) => {

	let oFilter = {clientId: req.user.clientId};
	if(req.body.vehicle){
		oFilter['vehicle._id'] = mongoose.Types.ObjectId(req.body.vehicle)
	}
	if(req.body.segment_type && req.body.segment_type.length){
		oFilter['vehicle.segment_type'] = {$in:req.body.segment_type}
	}
	if(req.body.owner_group && req.body.owner_group.length){
		oFilter['vehicle.owner_group'] = {$in:req.body.owner_group}
	}
	let aggrQuery = [
		{$match:oFilter},
		{$limit:3500}
	];

	let downloadPath = await new csvDownload(LastSettlementCache, aggrQuery, {
		filePath: `${req.user.clientId}/Last_Settle_RT`,
		fileName: `Last_Settle_RT_${moment().format('DD-MM-YYYY_hh:mm')}`
	}).exec(LastSettlReport.transform, req);

	// if(hasTimeoutExecuted){
	//   await logsService.addLog('Last Settle RT', {
	//     uif: "Last_Settle_RT_" + moment().format('DD-MM-YYYY hh:mm'),
	//     docId: req.user._id,
	//     category: 'Notification',
	//     delta: [],
	//     dwnldLnk: <a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>,
	//     userId: req.user._id,
	//     subCategory: 'Last Settle RT Report'
	//   }, req);
	// }
	// else {
	//   clearTimeout(timer);
	return res.status(200).json({
		status: "SUCCESS",
		message: 'Trip Gr Report ',
		url: downloadPath
	});
	// }
});

router.post("/lastSettleRtpr", async (req, res, next) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	const consFilter = (oBody) => {
		let o = {
			'advSettled.tsNo': {$exists:true},
			'ownershipType': req.body.ownershipType ? {$in:req.body.ownershipType} :  {"$ne": "Market"}
		};
		for (let key in oBody) {
			if (oBody.hasOwnProperty(key) && ['advSettled.tsNo', 'vehicle', 'segment_type'].indexOf(key) >= 0) {
				if(oBody[key].toString().match(/^[0-9a-fA-F]{24}$/)) {
					o[key] = otherUtil.arrString2ObjectId(oBody[key]);
				}else if (key === 'segment_type') {
					if (oBody[key] instanceof Array) {
						o[key] = {$in: oBody[key]};
					} else {
						o[key] = oBody[key];
					}
				}else {
					o[key] = oBody[key];
				}
			}
		}
		if ((typeof(o['advSettled.tsNo']) !== 'number') && oBody.from && oBody.to) {
			o['end_date'] = {
				$gte: moment(oBody.from).startOf('day').toDate(),
				$lte: moment(oBody.to).endOf('day').toDate(),
			};
		}
		return o;
	};
	let oFil = consFilter(req.body);
	oFil.clientId = req.body.clientId;
	let vehicleQuery = {};
	if(req.body.owner_group){
		if(req.body.owner_group instanceof Array){
			vehicleQuery['vehicle.owner_group'] = {$in:req.body.owner_group};
		}
		else{
			vehicleQuery['vehicle.owner_group'] = req.body.owner_group;

		}
	}
	const aggrQuery = [
		{$match: oFil},
		{$limit:40000},
		{
			$project:{
				"vehicle": 1,
				"statuses": 1,
				// "driver": 1,
				"advSettled": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"markSettle": 1,
				"start_date": 1,
				"end_date": 1,
			}
		},
		// {
		// 	$lookup: {
		// 		from: 'drivers',
		// 		localField: 'driver',
		// 		foreignField: '_id',
		// 		as: 'driver'
		// 	}
		// },
		// {
		// 	$unwind: {
		// 		path: '$driver',
		// 		preserveNullAndEmptyArrays: true
		// 	}
		// },
		{
			$lookup: {
				from: 'registeredvehicles',
				localField: 'vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		},
		{
			$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
			}
		},
		{$match: vehicleQuery},
		{
			$project: {
				"vehicle.owner_group": 1,
				"vehicle.driver_name": 1,
				"vehicle.driver_employee_code": 1,
				"advSettled.tsNo": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"start_date": 1,
				"end_date": 1,
			}
		},
		{$sort: {end_date: 1} },
		{
			$group: {
				_id: '$advSettled.tsNo',
				trips: { $push: "$$ROOT"},
				segment: {$last: '$segment_type'},
				vehicle_no: {$last: '$vehicle_no'},
				fleet: {$last: '$vehicle.owner_group'},
				driverName: {$last: '$vehicle.driver_name'},
				driverCode: {$last: '$vehicle.driver_employee_code'},
				rtNo: {$last: '$advSettled.tsNo'},
				start_date: {$first: '$start_date'},
				end_date: {$last: '$end_date'},
			}
		},
		{$sort: {end_date: -1} },
		{
			$group: {
				_id: '$vehicle_no',
				data: { $push: "$$ROOT"},
				segment: {$first: '$segment'},
				vehicle_no: {$first: '$vehicle_no'},
				fleet: {$first: '$fleet'},
				driverName: {$first: '$driverName'},
				driverCode: {$first: '$driverCode'},
				rtNo: {$first: '$rtNo'},
				start_date: {$first: '$start_date'},
				end_date: {$first: '$end_date'},
			}
		},
		{$sort: {_id: 1} },
	];

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let aFoundData = await serverSidePage.requestData(TripV2, oQuery);

	if (!aFoundData.length) {
		return res.status(500).json({
			status: "ERROR",
			message: 'No Round Trip found'
		});
	}


	if (req.body.download) {
		ReportExelService.lastSettleRtp(aFoundData, req.body.to, req.body.clientId, function(d) {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Last Settle RT Report',
				url: d.url
			});
		});
	} else {
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Last RT Settle Report',
			data: {
				data:aFoundData || [],
			},
		});
	}
});

router.post("/vehicleProfitReport",async function(req,res,next) {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	let dateMorning = new Date(req.body.from);
	dateMorning.setHours(0);
	dateMorning.setMinutes(0);
	dateMorning.setSeconds(0);
	dateMorning.setMilliseconds(0);
	let dateNight = new Date(req.body.to);
	dateNight.setHours(23);
	dateNight.setMinutes(59);
	dateNight.setSeconds(59);
	dateNight.setMilliseconds(999);
	let query = [
		{
			$match: {
				clientId: req.query.clientId,
				date: {$gte: dateMorning,$lte:dateNight},
			}
		},
		{$project:{
				"vehicle":1,
				"clientId":1,
				"revenue":1,
				"adv":{$sum:"$advExp.amount"},
				"dues":{$sum:"$duesExp.amount"},
				"voucher":{$sum:"$voucherExp.amount"},

			}}
		,{
			$group: {
				_id: {
					vehicle: "$vehicle",
					clientId:"$clientId"
				},
				duesExp:{$sum:"$dues"},
				revenue:{$sum:"$revenue"},
				advExp:{$sum:"$adv"},
				voucherExp:{$sum:"$voucher"},
			}
		},{
			$lookup: {
				from: 'registeredvehicles',
				localField: '_id.vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		},{$unwind:"$vehicle"},
		{$project:{
				duesExp:1,
				revenue:1,
				advExp:1,
				voucherExp:1,
				vehicleNo:"$vehicle.vehicle_reg_no"
			}}
	];
	let data = await VehicleProfitCache.aggregateAsync(query);
	if (data.length) {
		if(req.body.download){
			ReportExelService.generateVehicleProfitExcel({data:data,fromDate:dateMorning,toDate:dateNight}, req.body.clientId, function(d) {
				return res.status(200).json({
					"status": "SUCCESS",
					"message": "Vehicle Profit report download available.",
					"url": d.url
				});
			});
		}else{
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Vehicle Profit Report data get successfully',
				data: data ,
			});
		}

	} else {
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Vehicle Profit Report',
			data:[],
		});
	}

});

router.post("/vehicleExpenseReport",async function(req,res,next) {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	let dateMorning = new Date(req.body.from);
	dateMorning.setHours(0);
	dateMorning.setMinutes(0);
	dateMorning.setSeconds(0);
	dateMorning.setMilliseconds(0);
	let dateNight = new Date(req.body.to);
	dateNight.setHours(23);
	dateNight.setMinutes(59);
	dateNight.setSeconds(59);
	dateNight.setMilliseconds(999);
	let query = [
		{
			$match: {
				clientId: req.query.clientId,
				date: {$gte: dateMorning,$lte:dateNight},
			}
		},
		{$project:{
				"vehicle":1,
				"clientId":1,
				"revenue":1,
				"adv":{$sum:"$advExp.amount"},
				"dues":{$sum:"$duesExp.amount"},
				"voucher":{$sum:"$voucherExp.amount"}

			}}
		,{
			$group: {
				_id: {
					vehicle: "$vehicle",
					clientId:"$clientId",
				},
				duesExp:{$sum:"$dues"},
				revenue:{$sum:"$revenue"},
				advExp:{$sum:"$adv"},
				voucherExp:{$sum:"$voucher"},
			}
		},{
			$lookup: {
				from: 'registeredvehicles',
				localField: '_id.vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		},{$unwind:"$vehicle"},
		{$project:{
				duesExp:1,
				revenue:1,
				advExp:1,
				voucherExp:1,
				vehicleNo:"$vehicle.vehicle_reg_no"
			}}
	];
	let data = await VehicleProfitCache.aggregateAsync(query);
	if (data.length) {
		if(req.body.download){
			ReportExelService.generateVehicleExpenseExcel({data:data,fromDate:dateMorning,toDate:dateNight}, req.body.clientId, function(d) {
				return res.status(200).json({
					"status": "SUCCESS",
					"message": "Vehicle Profit report download available.",
					"url": d.url
				});
			});
		}else{
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Vehicle Expense Report data get successfully',
				data: data ,
			});
		}
	} else {
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Vehicle Expense Report',
			data:[],
		});
	}

});

let Contract = promise.promisifyAll(commonUtil.getModel('contract'));
router.get("/contractReport", function (req, res, next) {
	let date = req.query.date ? new Date(req.query.date) : new Date();
	let dateMorning = new Date(date);
	dateMorning.setHours(0);
	dateMorning.setMinutes(0);
	dateMorning.setSeconds(0);
	dateMorning.setMilliseconds(0);
	let dateNight = new Date(date);
	dateNight.setHours(23);
	dateNight.setMinutes(59);
	dateNight.setSeconds(59);
	dateNight.setMilliseconds(999);
	let query = [
		{
			$match: {
				clientId: req.query.clientId,
				contract_end_date: {$gte: date},
				contract_start_date: {$lte: date}
			}
		},
		{
			$lookup: {
				from: 'bookingv2',
				localField: '_id',
				foreignField: 'contract_id',
				as: 'booking'
			}
		},
		{
			$unwind: {
				path: '$booking',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$graphLookup: {
				from: "tripgrs",
				startWith: "$booking._id",
				connectFromField: "booking._id",
				connectToField: "booking",
				as: "gr",
				restrictSearchWithMatch: {
					"tripCancelled": false
				}
			}
		},
		/*{
			$lookup: {
				from: 'tripgrs',
				localField: 'booking._id',
				foreignField: 'booking',
				as: 'gr'
			}
		},*/
		{
			$unwind: {
				path: '$gr',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$group: {
				_id: '$_id',
				customer_name: {$first: '$customer_name'},
				name: {$first: '$name'},
				contract_type: {$first: '$contract_type'},
				do_weight: {$first: '$do_weight'},
				do_number: {$first: '$do_number'},
				contract_start_date: {$first: '$contract_start_date'},
				contract_end_date: {$first: '$contract_end_date'},
				mine_name: {$first: '$mine_name'},
				totalWeight: {$first: '$totalWeight'},
				totalUnit: {$first: '$totalUnit'},
				todayTrucks: {$sum: {$cond: [{$and: [{$gte: ['$gr.grDate', dateMorning]}, {$lte: ['$gr.grDate', dateNight]}]}, 1, 0]}},
				todayQty: {$sum: {$cond: [{$and: [{$gte: ['$gr.grDate', dateMorning]}, {$lte: ['$gr.grDate', dateNight]}]}, '$gr.weight', 0]}},
				totalTrucks: {$sum: 1},
				totalQty: {$sum: '$gr.weight'},
				lastGr: {$last: '$gr'}
				//, gr : {$push : '$gr'}
			}
		}
	];
	Contract.aggregateAsync(query)
		.then(async function (data) {
			await Trip.populate(data, {path: 'lastGr.trip'});
			if (req.query.download && req.query.download === 'true') {

				function ReportResponse(url) {
					return res.status(200).json({
						"status": "OK",
						"message": "Contract report download available.",
						"url": url.url
					});
				}

				ReportExelService.generateContractExcel({data: data, date: date}, req.query.clientId, ReportResponse);
			}
			else {
				return res.status(200).json({
					"status": "OK",
					"message": "Contracts found.",
					"data": data
				});
			}
		})
		.catch(function (err) {
			return res.status(500).json({
				"status": "ERROR",
				"message": err
			});
		})
});


let setItems = function (aTrips, i, j) {
	aTrips[i].gr[j].trip_no = aTrips[i].trip_no;
	aTrips[i].gr[j].ownGR = aTrips[i].ownGR;
	if (aTrips[i].route && aTrips[i].route.route_name) {
		aTrips[i].gr[j].route_name = aTrips[i].route.route_name;
	}
	aTrips[i].gr[j].diesel_stage = aTrips[i].diesel_stage;
	aTrips[i].gr[j].vehicle_type = aTrips[i].vehicle_type;
	aTrips[i].gr[j].trip_id = aTrips[i]._id;
	aTrips[i].gr[j].vehicle_no = aTrips[i].vehicle_no;
	aTrips[i].gr[j].isMarketVehicle = aTrips[i].isMarketVehicle;
	aTrips[i].gr[j].driver_name = aTrips[i].driver_name;
	aTrips[i].gr[j].allocation_date = aTrips[i].allocation_date;
	return aTrips[i].gr[j];
}

let getGrFromTrips = function (aTrips, gr_satage) {
	let aTripGrs = [];
	if (aTrips && aTrips.length > 0) {
		for (let i = 0; i < aTrips.length; i++) {
			for (let j = 0; j < aTrips[i].gr.length; j++) {
				if (gr_satage === 'true') {
					if (aTrips[i].gr[j].gr_stage) {
						aTripGrs.push(setItems(aTrips, i, j));
					}
				} else if (gr_satage === 'false') {
					if (!aTrips[i].gr[j].gr_stage) {
						aTripGrs.push(setItems(aTrips, i, j));
					}
				} else {
					aTripGrs.push(setItems(aTrips, i, j));
				}
			}
		}
	}
	return aTripGrs;
};


function allObjectLevel(aTrip) {
	aData = [];
	for (let i = 0; i < aTrip.length; i++) {
		let aCustomer = [];
		let aGRno = [];
		let start_loc;
		let end_loc;
		let trip_loc;
		if (aTrip[i].gr && aTrip[i].gr[0]) {
			start_loc = aTrip[i].gr[0].loading_point ? aTrip[i].gr[0].loading_point.address ? aTrip[i].gr[0].loading_point.address : "NA" : "NA";
			end_loc = aTrip[i].gr[0].unloading_point ? aTrip[i].gr[0].unloading_point.address ? aTrip[i].gr[0].unloading_point.address : "NA" : "NA";
			for (let j = 0; j < aTrip[i].gr.length; j++) {
				if (aTrip[i].gr[j].customer_name) {
					aCustomer.push(aTrip[i].gr[j].customer_name);
				}
				if (aTrip[i].gr[j].gr_no) {
					aGRno.push(aTrip[i].gr[j].gr_no);
				}
			}
		}
		if ((aTrip[i].trip_start.status === false) && (aTrip[i].trip_end.status === false)) {
			trip_loc = 'Not Started Yet!';
		} else if ((aTrip[i].trip_start.status === true) && (aTrip[i].trip_end.status === false)) {
			trip_loc = aTrip[i].trip_start.address || "NA";
		} else {
			trip_loc = aTrip[i].trip_end.address || "NA";
		}
		aTrip[i].trip_loc = trip_loc;
		aTrip[i].start_loc = start_loc;
		aTrip[i].end_loc = end_loc;
		aTrip[i].aCustomer = aCustomer;
		aTrip[i].aGRno = aGRno;
		aData.push(aTrip[i])
	}
	return aData;
}

let isAllowedFilter = function (sFilter, allowedFilter) {
	let isAllowed = false;
	if (allowedFilter.indexOf(sFilter) >= 0) {
		isAllowed = true;
	}
	return isAllowed;
};

let constructFilters = function (query, allowedFilter) {
	let fFilter = {};
	let dateKey = query.dateKey || 'created_at';
	for (let i in query) {
		if (isAllowedFilter(i, allowedFilter)) {
			if (i === 'start_date' && query.end_date) {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				let nextDay = new Date(query.end_date);
				nextDay.setSeconds(59);
				nextDay.setHours(23);
				nextDay.setMinutes(59);
				nextDay.setMilliseconds(999);
				fFilter[dateKey] = {
					"$gte": startDate,
					"$lt": nextDay
				};
				delete query.start_date;
				delete query.end_date;
			} else if (i === 'start_date') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				let nextDay = new Date();
				fFilter[dateKey] = {
					"$gte": startDate,
					"$lt": nextDay
				};
			} else if (i === 'end_date' && !query.start_date) {
				let endDate = new Date(query[i]);
				fFilter[dateKey] = {
					"$lt": endDate
				};
			} else if (i === 'c_start_date' && query.c_end_date) {
				let startDate = new Date(query[i]);
				let nextDay = new Date(query.c_end_date);
				fFilter["actual_release_date"] = {
					"$gte": startDate,
					"$lt": nextDay
				};
				delete query.c_start_date;
				delete query.c_end_date;
			} else if (i === 'c_start_date') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				let nextDay = new Date();
				fFilter["actual_release_date"] = {
					"$gte": startDate,
					"$lt": nextDay
				};
			} else if (i === 'c_end_date' && !query.c_start_date) {
				let endDate = new Date(query[i]);
				fFilter["actual_release_date"] = {
					"$lt": endDate
				};
			} else if(i === 'bill'){
				fFilter["bill"] = JSON.parse(query[i]);
			} else if ((i === 'customer') || (i === 'billingParty')) {
				fFilter[i] = typeof query[i] === "string" && mongoose.Types.ObjectId(query[i]) || query[i];
			}
			// else if (i === 'clientId') {
			// 	fFilter['clientId'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
			// }
			else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};


router.get("/invoice",
	function (req, res, next) {
		if (req.query.reportType) {
			req.reportType = req.query.reportType;
			delete req.query.reportType;
		}
		if (req.query.download === "true") {
			req.downloadReport = true;
			delete req.query.download;
		}
		if (req.query.dispatch === "true") {
			req.query.bill_no = {$exists: true, $ne: null};
		}
		req.query.all = "true";
		invoiceService.getInvoiceAsync(req.query)
			.then(function (data) {
				if (data && data.data && data.data[0]) {
					req.billData = data.data;
					return next();
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No invoice data found.",
					});
				}
			})
	},
	function (req, res, next) {
		ClientService.findClientByQueryAsync({"clientId": req.query.clientId})
			.then(function (client) {
				if (client && client[0]) {
					let clientData = JSON.parse(JSON.stringify(client[0]));
					req.clientData = {};
					req.clientData.client_full_name = clientData.client_full_name;
					req.clientData.client_iso = clientData.client_iso;
					req.clientData.client_subtitle = clientData.client_subtitle;
					req.clientData.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
						(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
						(clientData.client_address.country ? clientData.client_address.country : "");
					req.clientData.client_primary_contact_no = clientData.client_primary_contact_no;
					req.clientData.client_fax = clientData.client_fax;
					req.clientData.client_pan_no = clientData.client_pan_no;
					req.clientData.client_primary_email = clientData.client_primary_email;
					return next();
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "No client found."
					})
				}
			})
	},
	function (req, res, next) {
		try {
			let billReport = generateInvoiceReport(req.reportType, req.billData);
			if (req.downloadReport) {
				ReportExelService.generateInvoiceExcel(req.reportType, billReport, req.clientData, req.query.clientId, function (reportData) {
					return res.status(200).json({
						"status": "OK",
						"message": "invoice report available for download",
						"url": reportData.url
					});
				});
			} else {

				return res.status(200).json({
					"status": "OK",
					"message": "invoice report available.",
					"data": billReport
				});
			}
		} catch (err) {
			return res.status(500).json({
				"status": "ERROR",
				"message": err.message
			});
		}
	}
);


function generateInvoiceReport(reportType, aData) {
	header = [
		'Sl No', 'Invoice No', 'Invoice Date', 'Bill No', 'Billed Date', 'Dispatch Date', 'Booking No', 'Trip No', 'BOE No', 'Container No',
		'Branch Name', 'Customer Name', 'Billing Party Name', 'Advance Cash', 'Balance', 'GR No', 'GR Type', 'Route',
		'Vehicle No', 'Vehicle Type', 'Weight', 'Weight Unit'
	];

	myHeaders = ["Sl No.", "Bill No", "Trip No", "Trip Start Time", "Trip End Time", "Vehicle No.", "Customer Name", "Billing Party", "Route Name", "GR Type", "GR No.", "BOE No.", "Container No", "Container Type", "Payment Basis", "Weight(Tonne)", "Rate", "Frieght", "GR Charges", "Loading Charges", "Unloading Charges", "Weightman Charges", "Fuel Price Hike", "Other Charges", "Over Weight Charges", "Detaintion Charge", "Extra Running", "Total", "Advance", "Balance", "Billed By", "Remark"]

	let reportTypeUnique = [];
	let keyName;

	function filterUniqueType() {
		let tempData = [];
		if (aData && aData.length > 0) {
			for (let u = 0; u < aData.length; u++) {
				if (aData[u][keyName]) {
					if (keyName === "dispatch_date") {
						let modifiedDate = moment(aData[u][keyName]).format("DD-MM-YYYY");
						tempData.push(modifiedDate);
					} else {
						tempData.push(aData[u][keyName]);
					}
				}
			}
		}
		return tempData.filter(onlyUnique);
	}

	if (reportType === "Customer Wise") {
		keyName = "customer_name";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Billing Party Wise") {
		keyName = "billing_party_name";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Vehicle Wise") {
		keyName = "vehicle_no";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Invoice Wise") {
		keyName = "invoice_no";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Dispatch Date Wise") {
		keyName = "dispatch_date";
		reportTypeUnique = filterUniqueType()
	} else {
		keyName = "bill_no";
		reportTypeUnique = filterUniqueType()
	}

	let oInvoice = {};
	if (reportTypeUnique.length > 0) {
		for (let t = 0; t < reportTypeUnique.length; t++) {
			oInvoice[reportTypeUnique[t]] = [];
			for (let i = 0; i < aData.length; i++) {
				if (reportTypeUnique[t] === ((keyName === "dispatch_date") ? moment(aData[i][keyName]).format("DD-MM-YYYY") : aData[i][keyName])) {
					let oValue = {
						invoice_no: aData[i].invoice_no,
						invoice_date: aData[i].invoice_date,
						bill_no: aData[i].bill_no,
						gr_received: (aData[i].ack_stage === false) ? "Yes" : "No",
						billed_date: aData[i].billed_date,
						dispatch_date: aData[i].dispatch_date,
						booking_no: aData[i].booking_no,
						trip_no: aData[i].trip_no,
						boe_no: aData[i].boe_no,
						container_no: aData[i].container_no,
						branch: aData[i].branch,
						customer_name: aData[i].customer_name,
						billing_party_name: aData[i].billing_party_name,
						advance: aData[i].advance,
						balance: aData[i].balance,
					}
					if (aData[i].booking_info && aData[i].booking_info.length > 0) {
						for (let j = 0; j < aData[i].booking_info.length; j++) {
							if (j === 0) {
								oValue.route = aData[i].booking_info[j].route;
								oValue.gr_no = aData[i].booking_info[j].gr_no;
								oValue.gr_type = aData[i].booking_info[j].gr_type;
								oValue.veh_no = aData[i].booking_info[j].veh_no;
								oValue.veh_type = aData[i].booking_info[j].veh_type;
								oValue.weight = aData[i].booking_info[j].weight;
								oValue.weight_unit = aData[i].booking_info[j].weight_unit;
								oInvoice[reportTypeUnique[t]].push(oValue);
							} else {
								let otherData = {};
								otherData.route = aData[i].booking_info[j].route;
								otherData.gr_no = aData[i].booking_info[j].gr_no;
								oValue.gr_type = aData[i].booking_info[j].gr_type;
								otherData.veh_no = aData[i].booking_info[j].veh_no;
								otherData.veh_type = aData[i].booking_info[j].veh_type;
								otherData.weight = aData[i].booking_info[j].weight;
								otherData.weight_unit = aData[i].booking_info[j].weight_unit;
								oInvoice[reportTypeUnique[t]].push(otherData);
							}
						}
					} else {
						oInvoice[reportTypeUnique[t]].push(oValue);
					}
				}
			}
		}
	}
	return {"header": header, "keyName": keyName, "name": reportTypeUnique, "value": oInvoice}
}

router.get("/generated_bills",
	function (req, res, next) {
		if (req.query.reportType) {
			req.reportType = req.query.reportType;
			delete req.query.reportType;
		}
		if (req.query.download === "true") {
			req.downloadReport = true;
			delete req.query.download;
		}

		req.query.bill_no = {$exists: true, $ne: null};

		req.query.all = "true";
		invoiceService.getInvoiceAsync(req.query)
			.then(function (data) {
				if (data && data.data && data.data[0]) {
					req.billData = data.data;
					return next();
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No invoice data found.",
					});
				}
			})
	},
	function (req, res, next) {
		ClientService.findClientByQueryAsync({"clientId": req.query.clientId})
			.then(function (client) {
				if (client && client[0]) {
					let clientData = JSON.parse(JSON.stringify(client[0]));
					req.clientData = {};
					req.clientData.client_full_name = clientData.client_full_name;
					req.clientData.client_iso = clientData.client_iso;
					req.clientData.client_subtitle = clientData.client_subtitle;
					req.clientData.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
						(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
						(clientData.client_address.country ? clientData.client_address.country : "");
					req.clientData.client_primary_contact_no = clientData.client_primary_contact_no;
					req.clientData.client_fax = clientData.client_fax;
					req.clientData.client_pan_no = clientData.client_pan_no;
					req.clientData.client_primary_email = clientData.client_primary_email;
					return next();
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "No client found."
					})
				}
			})
	},
	function (req, res, next) {
		try {
			let billReport = generateGeneratedBillsReport(req.reportType, req.billData);
			if (req.downloadReport) {
				ReportExelService.generateGeneratedBillsExcel(req.reportType, billReport, req.clientData, req.query.clientId, function (reportData) {
					return res.status(200).json({
						"status": "OK",
						"message": "invoice report available for download",
						"url": reportData.url
					});
				});
			} else {

				return res.status(200).json({
					"status": "OK",
					"message": "invoice report available.",
					"data": billReport
				});
			}
		} catch (err) {
			return res.status(500).json({
				"status": "ERROR",
				"message": err.message
			});
		}
	}
);


function generateGeneratedBillsReport(reportType, aData) {
	header = [
		'Sl No', 'Billing Party Name', 'Bill No', 'Billed Date',
		'Customer Name', 'Route Name', 'Booking No', 'Trip No',
		'GR No', 'GR Type', 'Vehicle No', 'Vehicle Type', 'BOE No.',
		'Container No.', 'Container Type', 'No Of Container', 'Weight',
		'Rate', 'Freight', 'GR Charges', 'Loading Charges', 'Unloading Charges',
		'Weightman Charges', 'Fuel Price Hike', 'Other Charges', 'Over Weight Charges',
		'Detention Charges', 'Extra Running', 'Total', 'Advance', 'Balance', 'Billed By', 'Trip Start Date',
		'Trip End Date', 'Remark'
	];

	let reportTypeUnique = [];
	let keyName;

	function filterUniqueType() {
		let tempData = [];
		if (aData && aData.length > 0) {
			for (let u = 0; u < aData.length; u++) {
				if (aData[u][keyName]) {
					if (keyName === "dispatch_date") {
						let modifiedDate = moment(aData[u][keyName]).format("DD-MM-YYYY");
						tempData.push(modifiedDate);
					} else {
						tempData.push(aData[u][keyName]);
					}
				}
			}
		}
		return tempData.filter(onlyUnique);
	}

	if (reportType === "Customer Wise") {
		keyName = "customer_name";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Billing Party Wise") {
		keyName = "billing_party_name";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Vehicle Wise") {
		keyName = "vehicle_no";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Invoice Wise") {
		keyName = "invoice_no";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Dispatch Date Wise") {
		keyName = "dispatch_date";
		reportTypeUnique = filterUniqueType()
	} else {
		keyName = "bill_no";
		reportTypeUnique = filterUniqueType()
	}

	let oInvoice = {};
	if (reportTypeUnique.length > 0) {
		for (let t = 0; t < reportTypeUnique.length; t++) {
			oInvoice[reportTypeUnique[t]] = [];
			for (let i = 0; i < aData.length; i++) {
				if (reportTypeUnique[t] === ((keyName === "dispatch_date") ? moment(aData[i][keyName]).format("DD-MM-YYYY") : aData[i][keyName])) {
					let oValue = {
						invoice_no: aData[i].invoice_no,
						invoice_date: aData[i].invoice_date,
						bill_no: aData[i].bill_no,
						billed_date: aData[i].billed_date,
						dispatch_date: aData[i].dispatch_date,
						booking_no: aData[i].booking_no,
						//trip_no:aData[i].trip_no,
						boe_no: aData[i].boe_no,
						gr_received: (aData[i].ack_stage === false) ? "Yes" : "No",
						branch: aData[i].branch,
						customer_name: aData[i].customer_name,
						billing_party_name: aData[i].billing_party_name,
						advance: aData[i].advance,
						balance: aData[i].balance,
						trip_start_time: aData[i].trip_start_time,
						trip_end_time: aData[i].trip_end_time,
					}
					if (aData[i].booking_info && aData[i].booking_info.length > 0) {
						for (let j = 0; j < aData[i].booking_info.length; j++) {
							if (j === 0) {
								oValue.route = aData[i].booking_info[j].route;
								oValue.trip_no = aData[i].booking_info[j].trip_no;
								oValue.container_no = aData[i].booking_info[j].container_no;
								oValue.container_size = aData[i].booking_info[j].container_size;
								oValue.gr_no = aData[i].booking_info[j].gr_no;
								oValue.gr_type = aData[i].booking_info[j].gr_type;
								oValue.veh_no = aData[i].booking_info[j].veh_no;
								oValue.veh_type = aData[i].booking_info[j].veh_type;
								oValue.weight = aData[i].booking_info[j].weight;
								oValue.weight_unit = aData[i].booking_info[j].weight_unit;
								oValue.payment_basis = aData[i].booking_info[j].payment_basis;
								oValue.rate = aData[i].booking_info[j].rate;
								oValue.freight = aData[i].booking_info[j].freight;
								oValue.gr_charges = aData[i].booking_info[j].gr_charges;
								oValue.loading_charges = aData[i].booking_info[j].loading_charges;
								oValue.unloading_charges = aData[i].booking_info[j].unloading_charges;
								oValue.weightman_charges = aData[i].booking_info[j].weightman_charges;
								oValue.fuel_price_hike = aData[i].booking_info[j].fuel_price_hike;
								oValue.other_charges = aData[i].booking_info[j].other_charges;
								oValue.ovr_wt_chrgs = aData[i].booking_info[j].ovr_wt_chrgs;
								oValue.dtn_amt = aData[i].booking_info[j].dtn_amt;
								oValue.othr_exp = aData[i].booking_info[j].othr_exp;
								oValue.total = aData[i].booking_info[j].total;
								oValue.remarks = aData[i].booking_info[j].remarks;
								oInvoice[reportTypeUnique[t]].push(oValue);
							} else {
								let otherData = {};
								otherData.route = aData[i].booking_info[j].route;
								otherData.trip_no = aData[i].booking_info[j].trip_no;
								otherData.container_no = aData[i].booking_info[j].container_no;
								otherData.container_size = aData[i].booking_info[j].container_size;
								otherData.gr_no = aData[i].booking_info[j].gr_no;
								oValue.gr_type = aData[i].booking_info[j].gr_type;
								otherData.veh_no = aData[i].booking_info[j].veh_no;
								otherData.veh_type = aData[i].booking_info[j].veh_type;
								otherData.weight = aData[i].booking_info[j].weight;
								otherData.weight_unit = aData[i].booking_info[j].weight_unit;
								otherData.payment_basis = aData[i].booking_info[j].payment_basis;
								otherData.rate = aData[i].booking_info[j].rate;
								otherData.freight = aData[i].booking_info[j].freight;
								otherData.gr_charges = aData[i].booking_info[j].gr_charges;
								otherData.loading_charges = aData[i].booking_info[j].loading_charges;
								otherData.unloading_charges = aData[i].booking_info[j].unloading_charges;
								otherData.weightman_charges = aData[i].booking_info[j].weightman_charges;
								otherData.fuel_price_hike = aData[i].booking_info[j].fuel_price_hike;
								otherData.other_charges = aData[i].booking_info[j].other_charges;
								otherData.ovr_wt_chrgs = aData[i].booking_info[j].ovr_wt_chrgs;
								otherData.dtn_amt = aData[i].booking_info[j].dtn_amt;
								otherData.othr_exp = aData[i].booking_info[j].othr_exp;
								otherData.total = aData[i].booking_info[j].total;
								otherData.remarks = aData[i].booking_info[j].remarks;
								oInvoice[reportTypeUnique[t]].push(otherData);
							}
						}
					} else {
						oInvoice[reportTypeUnique[t]].push(oValue);
					}
				}
			}
		}
	}
	return {"header": header, "keyName": keyName, "name": reportTypeUnique, "value": oInvoice}
}

router.get("/maintenance_expenses",
	function (req, res, next) {
		if (req.query.reportType) {
			req.reportType = req.query.reportType;
			delete req.query.reportType;
		}
		if (req.query.download === "true") {
			req.downloadReport = true;
			delete req.query.download;
		}
		req.query.all = "true";
		oeService.searchOEAsync(req.query)
			.then(function (data) {
				if (data && data.oe && data.oe[0]) {
					req.expensesData = data.oe;
					return next();
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No expenses data found.",
					});
				}
			})
	},
	function (req, res, next) {
		ClientService.findClientByQueryAsync({"clientId": req.query.clientId})
			.then(function (client) {
				if (client && client[0]) {
					let clientData = JSON.parse(JSON.stringify(client[0]));
					req.clientData = {};
					req.clientData.client_full_name = clientData.client_full_name;
					req.clientData.client_iso = clientData.client_iso;
					req.clientData.client_subtitle = clientData.client_subtitle;
					req.clientData.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
						(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
						(clientData.client_address.country ? clientData.client_address.country : "");
					req.clientData.client_primary_contact_no = clientData.client_primary_contact_no;
					req.clientData.client_fax = clientData.client_fax;
					req.clientData.client_pan_no = clientData.client_pan_no;
					req.clientData.client_primary_email = clientData.client_primary_email;
					return next();
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "No client found."
					})
				}
			})
	},
	function (req, res, next) {
		try {
			let expensesReport = generateMaintenanceExpenses(req.reportType, req.expensesData);
			if (req.downloadReport) {
				ReportExelService.generateMaintenanceExpensesExcel(req.reportType, expensesReport, req.clientData, req.query.clientId, function (reportData) {
					return res.status(200).json({
						"status": "OK",
						"message": "expense report available for download",
						"url": reportData.url
					});
				});
			} else {

				return res.status(200).json({
					"status": "OK",
					"message": "expense report available.",
					"data": expensesReport
				});
			}
		} catch (err) {
			return res.status(500).json({
				"status": "ERROR",
				"message": err.message
			});
		}
	}
);


function generateMaintenanceExpenses(reportType, aData) {
	header = [
		'Sl No', 'Bill No', 'Bill Date', 'Job Id',
		'Branch Name', 'Type', 'Vehicle No', 'Amount',
		'Created By', 'Approved By', 'Created Date'
	];

	let reportTypeUnique = [];
	let keyName;

	function filterUniqueType() {
		let tempData = [];
		if (aData && aData.length > 0) {
			for (let u = 0; u < aData.length; u++) {
				if (aData[u][keyName]) {
					if (keyName === "created_at") {
						let modifiedDate = moment(aData[u][keyName]).format("DD-MM-YYYY");
						tempData.push(modifiedDate);
					} else {
						tempData.push(aData[u][keyName]);
					}
				}
			}
		}
		return tempData.filter(onlyUnique);
	}

	if (reportType === "Type Wise") {
		keyName = "type";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Vehicle Wise") {
		keyName = "vehicle_no";
		reportTypeUnique = filterUniqueType()
	} else if (reportType === "Date Wise") {
		keyName = "created_at";
		reportTypeUnique = filterUniqueType()
	} else {
		keyName = "bill_no";
		reportTypeUnique = filterUniqueType()
	}

	let oExpenses = {};
	if (reportTypeUnique.length > 0) {
		for (let t = 0; t < reportTypeUnique.length; t++) {
			oExpenses[reportTypeUnique[t]] = [];
			for (let i = 0; i < aData.length; i++) {
				if (reportTypeUnique[t] === ((keyName === "created_at") ? moment(aData[i][keyName]).format("DD-MM-YYYY") : aData[i][keyName])) {
					let oValue = {
						bill_no: aData[i].bill_no,
						bill_date: aData[i].bill_date,
						jobId: aData[i].jobId,
						branchName: aData[i].branchName,
						type: aData[i].type,
						vehicle_no: aData[i].vehicle_no,
						amount: aData[i].amount,
						created_by_name: aData[i].created_by_name,
						approved_by_name: aData[i].approved_by_name,
						created_at: aData[i].created_at
					}
					oExpenses[reportTypeUnique[t]].push(oValue);
				}
			}
		}
	}
	return {"header": header, "keyName": keyName, "name": reportTypeUnique, "value": oExpenses}
}

router.get("/unbilled_invoice",
	function (req, res, next) {
		if (req.query.reportType === "Unbilled Invoice") {
			req.query.status = "pending";
		}
		if (req.query.reportType) {
			req.reportType = req.query.reportType;
			delete req.query.reportType;
		}
		if (req.query.download === "true") {
			req.downloadReport = true;
			delete req.query.download;
		}
		if (req.query.dispatch === "true") {
			req.query.bill_no = {$exists: true, $ne: null};
		}
		req.query.all = "true";
		invoiceService.getInvoiceAsync(req.query)
			.then(function (data) {
				if (data && data.data && data.data[0]) {
					req.billData = data.data;
					return next();
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No invoice data found.",
					});
				}
			})
	},
	function (req, res, next) {
		ClientService.findClientByQueryAsync({"clientId": req.query.clientId})
			.then(function (client) {
				if (client && client[0]) {
					let clientData = JSON.parse(JSON.stringify(client[0]));
					req.clientData = {};
					req.clientData.client_full_name = clientData.client_full_name;
					req.clientData.client_iso = clientData.client_iso;
					req.clientData.client_subtitle = clientData.client_subtitle;
					req.clientData.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
						(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
						(clientData.client_address.country ? clientData.client_address.country : "");
					req.clientData.client_primary_contact_no = clientData.client_primary_contact_no;
					req.clientData.client_fax = clientData.client_fax;
					req.clientData.client_pan_no = clientData.client_pan_no;
					req.clientData.client_primary_email = clientData.client_primary_email;
					return next();
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "No client found."
					})
				}
			})
	},
	function (req, res, next) {
		try {
			let billReport = generateUnbilledInvoiceReport(req.billData);
			if (req.downloadReport) {
				ReportExelService.generateUnbilledInvoiceExcel(req.reportType, billReport, req.clientData, req.query.clientId, function (reportData) {
					return res.status(200).json({
						"status": "OK",
						"message": "invoice report available for download",
						"url": reportData.url
					});
				});
			} else {

				return res.status(200).json({
					"status": "OK",
					"message": "invoice report available.",
					"data": billReport
				});
			}
		} catch (err) {
			return res.status(500).json({
				"status": "ERROR",
				"message": err.message
			});
		}
	}
);


function generateUnbilledInvoiceReport(aData) {
	let aInvoice = [];
	if (aData && aData.length > 0) {
		for (let i = 0; i < aData.length; i++) {
			let oValue = {
				invoice_no: aData[i].invoice_no,
				invoice_date: aData[i].invoice_date,
				bill_no: aData[i].bill_no,
				billed_date: aData[i].billed_date,
				dispatch_date: aData[i].dispatch_date,
				booking_no: aData[i].booking_no,
				trip_start_time: aData[i].trip_start_time,
				trip_end_time: aData[i].trip_end_time,
				boe_no: aData[i].boe_no,
				gr_received: (aData[i].ack_stage === false) ? "Yes" : "No",
				branch: aData[i].branch,
				customer_name: aData[i].customer_name,
				billing_party_name: aData[i].billing_party_name,
				advance: aData[i].advance,
				balance: aData[i].balance,
			}

			if (aData[i].booking_info && aData[i].booking_info.length > 0) {
				for (let j = 0; j < aData[i].booking_info.length; j++) {
					oValue.trip_no = aData[i].booking_info[j].trip_no;
					oValue.container_no = aData[i].booking_info[j].container_no;
					oValue.container_size = aData[i].booking_info[j].container_size;
					oValue.payment_basis = aData[i].booking_info[j].payment_basis;
					oValue.rate = aData[i].booking_info[j].rate;
					oValue.freight = aData[i].booking_info[j].freight;
					oValue.gr_charges = aData[i].booking_info[j].gr_charges;
					oValue.loading_charges = aData[i].booking_info[j].loading_charges;
					oValue.unloading_charges = aData[i].booking_info[j].unloading_charges;
					oValue.weightman_charges = aData[i].booking_info[j].weightman_charges;
					oValue.fuel_price_hike = aData[i].booking_info[j].fuel_price_hike;

					oValue.other_charges = aData[i].booking_info[j].other_charges;
					oValue.ovr_wt_chrgs = aData[i].booking_info[j].ovr_wt_chrgs;
					oValue.dtn_amt = aData[i].booking_info[j].dtn_amt;
					oValue.othr_exp = aData[i].booking_info[j].othr_exp;
					oValue.total = aData[i].booking_info[j].total;

					oValue.route = aData[i].booking_info[j].route;
					oValue.gr_no = aData[i].booking_info[j].gr_no;
					oValue.gr_type = aData[i].booking_info[j].gr_type;
					oValue.veh_no = aData[i].booking_info[j].veh_no;
					oValue.m_vehicle_no = aData[i].booking_info[j].m_vehicle_no;
					oValue.veh_type = aData[i].booking_info[j].veh_type;
					oValue.weight = aData[i].booking_info[j].weight;
					oValue.weight_unit = aData[i].booking_info[j].weight_unit;
					aInvoice.push(oValue);
				}
			} else {
				aInvoice.push(oValue);
			}
		}
	}
	return aInvoice
}

router.get("/incomplete_trip",
	function (req, res, next) {
		if (req.query.reportType) {
			req.reportType = req.query.reportType;
			delete req.query.reportType;
		}
		if (req.query.download === "true") {
			req.downloadReport = true;
			delete req.query.download;
		}
		req.query.all = "true";
		tripService.getAllTripsAsync(req)
			.then(function (data) {
				if (data && data.data && data.data[0]) {
					req.tripData = data.data;
					return next();
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No trip data found.",
					});
				}
			})
	},
	function (req, res, next) {
		ClientService.findClientByQueryAsync({"clientId": req.query.clientId})
			.then(function (client) {
				if (client && client[0]) {
					let clientData = JSON.parse(JSON.stringify(client[0]));
					req.clientData = {};
					req.clientData.client_full_name = clientData.client_full_name;
					req.clientData.client_iso = clientData.client_iso;
					req.clientData.client_subtitle = clientData.client_subtitle;
					req.clientData.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
						(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
						(clientData.client_address.country ? clientData.client_address.country : "");
					req.clientData.client_primary_contact_no = clientData.client_primary_contact_no;
					req.clientData.client_fax = clientData.client_fax;
					req.clientData.client_pan_no = clientData.client_pan_no;
					req.clientData.client_primary_email = clientData.client_primary_email;
					return next();
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "No client found."
					})
				}
			})
	},
	function (req, res, next) {
		try {
			let aInvoice = [];
			if (req.tripData && req.tripData.length > 0) {
				for (let i = 0; i < req.tripData.length; i++) {
					let invoice = billsService.prepareInvoiceData(req.tripData[i]) //req.tripData[i].trip_no;
					Array.prototype.push.apply(aInvoice, invoice);
				}
			}
			let billReport = generateUnbilledInvoiceReport(aInvoice);
			if (req.downloadReport) {
				ReportExelService.generateUnbilledInvoiceExcel(req.reportType, billReport, req.clientData, req.query.clientId, function (reportData) {
					return res.status(200).json({
						"status": "OK",
						"message": "invoice report available for download",
						"url": reportData.url
					});
				});
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "invoice report available.",
					"data": billReport
				});
			}
		} catch (err) {
			return res.status(500).json({
				"status": "ERROR",
				"message": err.message
			});
		}
	}
);

router.post('/fpa', async (req, res, next) => {
	try {
		let body = req.body;
		if (!(body.grNumber || body.refNo || (body.from && body.to))) {
			return res.status (500).json ({
				status: "ERROR",
				message: "Search by grNumber or fpaNo or date range."
			})
		}
		let data;
		if (body.dateType === 'FPA' && (body.from && body.to)) {
			data = await serverSidePage.requestData (Voucher, {
				aggQuery: [{
					$match: {
						clientId: req.user.clientId,
						vT: 'FPA',
						...(body.from && body.to? {date: dateUtil.dateFilter (body.from, body.to, 120)}: {}),
						...(body.refNo? {refNo: body.refNo}: {}),
						...(body.account ? {
							ledgers: {
								$elemMatch: {
									cRdR: 'CR',
									account: mongoose.Types.ObjectId(body.account)
								}
							}
						} : {})
					}
				}, {
					$project: {
						refNo: 1,
						date: 1,
						ledgers: {
							$arrayElemAt: [{
								$filter: {
									input: '$ledgers',
									as: 'ledger',
									cond: {
										$eq: ['$$ledger.cRdR', 'CR']
									}
								}
							}, 0]
						}
					}
				}, {
					$lookup: {
						from: 'tripgrs',
						localField: 'refNo',
						foreignField: 'fpa.refNo',
						as: 'gr'
					}
				}, {
					$unwind: '$gr'
				}, {
					$project: {
						refNo: 1,
						date: 1,
						ledgers: 1,
						grNumber: '$gr.grNumber',
						grDate: '$gr.grDate',
						billingParty: '$gr.billingParty',
						vehicle_no: '$gr.vehicle_no',
						route: '$gr.route',
						bill: '$gr.bill',
						totalFreight: '$gr.totalFreight',
						fpaAmount: '$gr.fpa.amt',
					}
				}, ...(body.grNumber || body.vehicle_no?[{
					$match: {
						...(body.grNumber? {grNumber: body.grNumber}:{}),
						...(body.vehicle_no? {vehicle_no: body.vehicle_no}:{})
					}
				}]:[]), {
					$lookup: {
						from: 'billingparties',
						localField: 'billingParty',
						foreignField: '_id',
						as: 'billingParty'
					}
				}, {
					$project: {
						refNo: 1,
						date: 1,
						ledgers: 1,
						grNumber: 1,
						billingParty: {$arrayElemAt: ['$billingParty', 0]},
						vehicle_no: 1,
						route: 1,
						bill: 1,
						totalFreight: 1,
						grDate: 1,
						fpaAmount:1
					}
				}, {
					$lookup: {
						from: 'transportroutes',
						localField: 'route',
						foreignField: '_id',
						as: 'route'
					}
				}, {
					$project: {
						refNo: 1,
						date: 1,
						ledgers: 1,
						grNumber: 1,
						billingParty: '$billingParty.name',
						vehicle_no: 1,
						route: {$arrayElemAt: ['$route', 0]},
						bill: 1,
						totalFreight: 1,
						grDate: 1,
						fpaAmount:1
					}
				}, {
					$lookup: {
						from: 'bills',
						localField: 'bill',
						foreignField: '_id',
						as: 'bill'
					}
				}, {
					$unwind: {
						path: '$bill',
						preserveNullAndEmptyArrays: true
					}
				}, {
					$project: {
						refNo: 1,
						date: 1,
						ledgers: 1,
						grNumber: 1,
						billingParty: 1,
						vehicle_no: 1,
						route: '$route.name',
						bill: '$bill.billNo',
						totalFreight: 1,
						grDate: 1,
						fpaAmount:1
					}
				}, {
					$sort: {vehicle_no: 1}
				}, {
					$sort: {'ledgers.laName': 1}
				}]
			})
		} else {
			data = await serverSidePage.requestData (TripGr, {
				aggQuery: [{
					$match: {
						clientId: req.user.clientId,
						...(body.grNumber? {grNumber: body.grNumber}: {}),
						...(body.vehicle_no? {vehicle_no: body.vehicle_no}: {}),
						...(body.from && body.to? {grDate: dateUtil.dateFilter (body.from, body.to, 120)}: {}),
						...(body.refNo? {'fpa.refNo': body.refNo}: {'fpa.refNo': {$exists: true}})
					}
				}, {
					$project: {
						refNo: '$fpa.refNo',
						fpaAmount: '$fpa.amt',
						grDate: 1,
						grNumber: 1,
						billingParty: 1,
						vehicle_no: 1,
						route: 1,
						bill: 1,
						totalFreight: 1
					}
				}, {
					$lookup: {
						from: 'vouchers',
						localField: 'refNo',
						foreignField: 'refNo',
						as: 'voucher'
					}
				}, {
					$unwind: '$voucher'
				}, {
					$project: {
						refNo: 1,
						fpaAmount: 1,
						date: '$voucher.date',
						ledgers: {
							$arrayElemAt: [{
								$filter: {
									input: '$voucher.ledgers',
									as: 'ledger',
									cond: {
										$eq: ['$$ledger.cRdR', 'CR']
									}
								}
							}, 0]
						},
						grDate: 1,
						grNumber: 1,
						billingParty: 1,
						vehicle_no: 1,
						route: 1,
						bill: 1,
						totalFreight: 1
					}
				}, ...(body.account?[{
					$match: {
						...(body.account? {'ledgers.account': mongoose.Types.ObjectId(body.account)}:{}),
					}
				}]:[]), {
					$lookup: {
						from: 'billingparties',
						localField: 'billingParty',
						foreignField: '_id',
						as: 'billingParty'
					}
				}, {
					$project: {
						refNo: 1,
						fpaAmount: 1,
						date: 1,
						grDate: 1,
						ledgers: 1,
						grNumber: 1,
						billingParty: {$arrayElemAt: ['$billingParty', 0]},
						vehicle_no: 1,
						route: 1,
						bill: 1,
						totalFreight: 1
					}
				}, {
					$lookup: {
						from: 'transportroutes',
						localField: 'route',
						foreignField: '_id',
						as: 'route'
					}
				}, {
					$project: {
						refNo: 1,
						fpaAmount: 1,
						date: 1,
						grDate: 1,
						ledgers: 1,
						grNumber: 1,
						billingParty: '$billingParty.name',
						vehicle_no: 1,
						route: {$arrayElemAt: ['$route', 0]},
						bill: 1,
						totalFreight: 1
					}
				}, {
					$lookup: {
						from: 'bills',
						localField: 'bill',
						foreignField: '_id',
						as: 'bill'
					}
				}, {
					$unwind: {
						path: '$bill',
						preserveNullAndEmptyArrays: true
					}
				}, {
					$project: {
						refNo: 1,
						fpaAmount: 1,
						date: 1,
						grDate: 1,
						ledgers: 1,
						grNumber: 1,
						billingParty: 1,
						vehicle_no: 1,
						route: '$route.name',
						bill: '$bill.billNo',
						totalFreight: 1
					}
				}, {
					$sort: {vehicle_no: 1}
				}, {
					$sort: {'ledgers.laName': 1}
				}]
			})
		}
		if (!req.body.download || req.body.download === "false") {
			return res.status (200).json ({
				status: 'OK',
				message: 'FPA Report Data',
				data: data
			})
		} else {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "FPA Report Excel",
					"url": data.url,
					"html": data.html
				});
			}
			ReportExelService.generateFPAExcel(data, req.query.clientId, req.body.pdf, ReportResponse)
		}

	} catch (err) {
		return res.status (500).json ({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post("/rtGrossProfit", async (req, res, next) => {
	try{
		if (!req.body.from || !req.body.to) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date, to date are mandatory',
			});
		}
		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}, 1000 * 60);
		let obj = {
			clientId: req.user.clientId,
			start_date:{
				$gte: new Date(req.body.from),
				$lte: new Date(req.body.to),
			}
		}
		if(req.body.vehicle_no){
			obj.vehicle_no = req.body.vehicle_no;
		}else{
            obj.ownershipType =  "Own";
		}
		if(req.body["advSettled.tsNo"]){
			obj["advSettled.tsNo"] = req.body[["advSettled.tsNo"]];
		}
		if(req.body.mSettle === true || req.body.mSettle === false){
			obj.markSettle = {}
			obj.markSettle.isSettled = req.body.mSettle;
		}
		const aggrQuery = [
			{$match: obj},
			{$limit:40000},
			{
				$project:{
					gr:1,
					"advanceBudget":1,
					"trip_no":1,
					"start_date":1,
					"vehicle_no":1,
					"route_name":1,
					"advSettled.tsNo":1,

				}
			},
			{$lookup: {
					from: 'tripgrs',
					localField: 'gr',
					foreignField: '_id',
					as: 'gr'
				}},
			{
				$unwind: {
					path: '$gr',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project:{
					"advanceBudget":1,
					"totalweight":{"$sum": "$gr.invoices.billingWeightPerUnit"},
					"trip_no":1,
					"vehicle_no":1,
					"route_name":1,
					"start_date":1,
					"RT_No":"$advSettled.tsNo",
					"gr":1,
				}
			},
			{
				$group:{
					_id: {id: '$_id'},
					"advanceBudget":{$first: "$advanceBudget"},
					"totalweight":{"$sum": "$totalweight"},
					"trip_no":{$first: "$trip_no"},
					"vehicle_no":{$first: "$vehicle_no"},
					"route_name":{$first: "$route_name"},
					"start_date":{$first: "$start_date"},
					"RT_No":{$first: "$RT_No"},
					"gr":{$push: "$gr"},
				}
			},{$lookup: {
					from: 'tripadvances',
					localField: 'advanceBudget',
					foreignField: '_id',
					as: 'advanceBudget'
				}},
			{$addFields: {
					'tAdv':{
						$reduce: {
							input: '$advanceBudget',
							initialValue: { happayAdvance:0,fastagAdvance: 0,dieselltr:0, dieselAdvance: 0, totalAdvance: 0 },
							in: {
								happayAdvance: {
									$add: [
										"$$value.happayAdvance",
										{ $cond: [ { $eq: [ "$$this.advanceType", "Happay" ] }, { $ifNull: ["$$this.amount", 0] }, 0 ] }
									] },
								fastagAdvance: {
									$add: [
										"$$value.fastagAdvance",
										{ $cond: [ { $eq: [ "$$this.advanceType", "Fastag" ] }, { $ifNull: ["$$this.amount", 0] }, 0 ] }
									] },
								dieselltr: {
									$add: [
										"$$value.dieselltr",
										{ $cond: [ { $eq: [ "$$this.advanceType", "Diesel" ] }, { $ifNull: ["$$this.dieseInfo.litre", 0] }, 0 ] }
									] },
								dieselAdvance: {
									$add: [
										"$$value.dieselAdvance",
										{ $cond: [ { $eq: [ "$$this.advanceType", "Diesel" ] }, { $ifNull: ["$$this.amount", 0] }, 0 ] }
									] },
								totalAdvance: {
									$add: [
										"$$value.totalAdvance",
										{ $cond: [
												{ $or: [
														{ $eq: [ "$$this.advanceType", "Happay" ] },
														{ $eq: [ "$$this.advanceType", "Fastag" ] },
														{ $eq: [ "$$this.advanceType", "Diesel" ] },
													] },
												{ $ifNull: ["$$this.amount", 0] },
												0
											] }
									] }
							}
						}
					},
				}},
			{
				$project:{
					"tAdv":1,
					"totalFreight":{$sum:"$gr.basicFreight"},
					"totalweight":1,
					"trip_no":1,
					"vehicle_no":1,
					"route_name":1,
					"start_date":1,
					"RT_No":1,
					"gr":1,
					"_id":0
				}
			}

		];

		let data = await TripV2.aggregate(aggrQuery);
		if (data.length) {
			let config = req.clientConfig && req.clientConfig.config && req.clientConfig.config.client_allowed && req.clientConfig.config.client_allowed[0]
				ReportExelService.rtGrossProfit(data,req.body.from,req.body.to, config, req.body.clientId, async function(d) {
					if(hasTimeoutExecuted){
						await logsService.addLog('RTP Report', {
							uif: "RTGrossProfit_" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'RTP Report'
						}, req);
					}else {
						clearTimeout(timer);
						return res.status(200).json({
							status: "SUCCESS",
							message: 'Trip RT Gross Profit_ Report ',
							url: d.url
						});
					}
				});

		} else {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip RT Gross Profit_ Report ',
				data:[],
			});
		}
	}catch (err) {
		return res.status (500).json ({
			status: 'ERROR',
			message: err.toString()
		})
	}
});


router.post("/combineRtWiseGrossProfit", async (req, res, next) => {
	try{
		if (!req.body.from || !req.body.to) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date, to date are mandatory',
			});
		}
		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}, 1000 * 60);
		let obj = {
			clientId: req.user.clientId,
			start_date:{
				$gte: new Date(req.body.from),
				$lte: new Date(req.body.to),
			}
		}
		if(req.body.vehicle_no){
			obj.vehicle_no = req.body.vehicle_no;
		}else{
			obj.ownershipType =  "Own";
		}
		if(req.body["advSettled.tsNo"]){
			obj["advSettled.tsNo"] = req.body[["advSettled.tsNo"]];
		}else{
			obj["advSettled.tsNo"] = {$exists:true};
		}
		if(req.body.mSettle === true || req.body.mSettle === false){
			obj.markSettle = {}
			obj.markSettle.isSettled = req.body.mSettle;
		}
		const aggrQuery = [
			{$match: obj},
			{
				"$limit": 40000
			},
			{
				"$project": {
					"gr": 1,
					"advanceBudget": 1,
					"trip_no": 1,
					"start_date": 1,
					"end_date": 1,
					"vehicle_no": 1,
					"route_name": 1,
					"advSettled.tsNo": 1
				}
			},
			{
				"$lookup": {
					"from": "tripgrs",
					"localField": "gr",
					"foreignField": "_id",
					"as": "gr"
				}
			},
			{
				"$unwind": {
					"path": "$gr",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$project": {
					"advanceBudget": 1,
					"totalweight": {
						"$sum": "$gr.invoices.billingWeightPerUnit"
					},
					"trip_no": 1,
					"vehicle_no": 1,
					"route_name": 1,
					"start_date": 1,
					"end_date": 1,
					"RT_No": "$advSettled.tsNo",
					"gr": 1
				}
			},
			{
				"$group": {
					"_id": {
						"id": "$_id"
					},
					"advanceBudget": {
						"$first": "$advanceBudget"
					},
					"totalweight": {
						"$sum": "$totalweight"
					},
					"trip_no": {
						"$first": "$trip_no"
					},
					"vehicle_no": {
						"$first": "$vehicle_no"
					},
					"route_name": {
						"$first": "$route_name"
					},
					"start_date": {
						"$first": "$start_date"
					},
					"end_date": {
						"$first": "$end_date"
					},
					"RT_No": {
						"$first": "$RT_No"
					},
					"gr": {
						"$push": "$gr"
					}
				}
			},
			{
				"$lookup": {
					"from": "tripadvances",
					"localField": "advanceBudget",
					"foreignField": "_id",
					"as": "advanceBudget"
				}
			},
			{
				"$addFields": {
					"tAdv": {
						"$reduce": {
							"input": "$advanceBudget",
							"initialValue": {
								"happayAdvance": 0,
								"fastagAdvance": 0,
								"dieselltr": 0,
								"dieselAdvance": 0,
								"totalAdvance": 0
							},
							"in": {
								"happayAdvance": {
									"$add": [
										"$$value.happayAdvance",
										{
											"$cond": [
												{
													"$eq": [
														"$$this.advanceType",
														"Happay"
													]
												},
												{
													"$ifNull": [
														"$$this.amount",
														0
													]
												},
												0
											]
										}
									]
								},
								"fastagAdvance": {
									"$add": [
										"$$value.fastagAdvance",
										{
											"$cond": [
												{
													"$eq": [
														"$$this.advanceType",
														"Fastag"
													]
												},
												{
													"$ifNull": [
														"$$this.amount",
														0
													]
												},
												0
											]
										}
									]
								},
								"dieselltr": {
									"$add": [
										"$$value.dieselltr",
										{
											"$cond": [
												{
													"$eq": [
														"$$this.advanceType",
														"Diesel"
													]
												},
												{
													"$ifNull": [
														"$$this.dieseInfo.litre",
														0
													]
												},
												0
											]
										}
									]
								},
								"dieselAdvance": {
									"$add": [
										"$$value.dieselAdvance",
										{
											"$cond": [
												{
													"$eq": [
														"$$this.advanceType",
														"Diesel"
													]
												},
												{
													"$ifNull": [
														"$$this.amount",
														0
													]
												},
												0
											]
										}
									]
								},
								"totalAdvance": {
									"$add": [
										"$$value.totalAdvance",
										{
											"$cond": [
												{
													"$or": [
														{
															"$eq": [
																"$$this.advanceType",
																"Happay"
															]
														},
														{
															"$eq": [
																"$$this.advanceType",
																"Fastag"
															]
														},
														{
															"$eq": [
																"$$this.advanceType",
																"Diesel"
															]
														}
													]
												},
												{
													"$ifNull": [
														"$$this.amount",
														0
													]
												},
												0
											]
										}
									]
								}
							}
						}
					}
				}
			},
			{
				"$project": {
					"tAdv": 1,
					"totalFreight": {
						"$sum": "$gr.basicFreight"
					},
					"totalweight": 1,
					"trip_no": 1,
					"vehicle_no": 1,
					"route_name": 1,
					"start_date": 1,
					"end_date": 1,
					"RT_No": 1,
					"gr": 1,
					"_id": 0
				}
			},
			{
				"$sort": {
					"trip_no": 1
				}
			},
			{
				"$group": {
					"_id": {
						"RT_No": "$RT_No"
					},
					"totalFreight": {
						"$sum": "$totalFreight"
					},
					"totalweight": {
						"$push": "$totalweight"
					},
					"trip_no": {
						"$push": "$trip_no"
					},
					"vehicle_no": {
						"$push": "$vehicle_no"
					},
					"route_name": {
						"$push": "$route_name"
					},
					"start_date": {
						"$push": "$start_date"
					},
					"end_date":{
						"$push": "$end_date"
					},
					"RT_No": {
						"$first": "$RT_No"
					},
					"happayAdvance": {
						"$sum": "$tAdv.happayAdvance"
					},
					"fastagAdvance": {
						"$sum": "$tAdv.fastagAdvance"
					},
					"dieselltr": {
						"$sum": "$tAdv.dieselltr"
					},
					"dieselAdvance": {
						"$sum": "$tAdv.dieselAdvance"
					},
					"totalAdvance": {
						"$sum": "$tAdv.totalAdvance"
					},
					"gr": {
						"$push": "$gr"
					}
				}
			},
			{
				"$unwind": {
					"path": "$gr",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$unwind": {
					"path": "$gr",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$group": {
					"_id": {
						"id": "$_id"
					},
					"totalFreight": {
						"$first": "$totalFreight"
					},
					"totalweight": {
						"$first": "$totalweight"
					},
					"trip_no": {
						"$first": "$trip_no"
					},
					"vehicle_no": {
						"$first": "$vehicle_no"
					},
					"route_name": {
						"$first": "$route_name"
					},
					"start_date": {
						"$first": "$start_date"
					},
					"end_date":{
						"$first": "$end_date"
					},
					"RT_No": {
						"$first": "$RT_No"
					},
					"happayAdvance": {
						"$first": "$happayAdvance"
					},
					"fastagAdvance": {
						"$first": "$fastagAdvance"
					},
					"dieselltr": {
						"$first": "$dieselltr"
					},
					"dieselAdvance": {
						"$first": "$dieselAdvance"
					},
					"totalAdvance": {
						"$first": "$totalAdvance"
					},
					"gr": {
						"$push": "$gr"
					}
				}
			}
		]

		let data = await TripV2.aggregate(aggrQuery);
		if (data.length) {
			ReportExelService.combineRtWiseGrossProfit(data,req.body.from,req.body.to, req.body.clientId, async function(d) {
				if(hasTimeoutExecuted){
					await logsService.addLog('RTP Report', {
						uif: "CombineRTGrossProfit_" + moment().format('DD-MM-YYYY hh:mm'),
						docId: req.user._id,
						category: 'Notification',
						delta: [],
						dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
						userId: req.user._id,
						subCategory: 'RTP Report'
					}, req);
				}else {
					clearTimeout(timer);
					return res.status(200).json({
						status: "SUCCESS",
						message: 'Trip RT Gross Profit_ Report ',
						url: d.url
					});
				}
			});

		} else {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip RT Gross Profit_ Report ',
				data:[],
			});
		}
	}catch (err) {
		return res.status (500).json ({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post("/duesReport", async (req, res, next) => {
	try{
		if (!req.body.from || !req.body.to || ! req.body.asOnDate) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date, to date  and asOnDate are mandatory',
			});
		}
		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}, 1000 * 60);
		let obj = {
			clientId: req.user.clientId,
			date:{
				$gte: new Date(req.body.from),
				$lte: new Date(req.body.to),
			}
		}
		if(req.body.duesType){
			obj.duesType = {"$in": req.body.duesType };
		}
		let obj1 = {
			"aVehCollection.todt" : {$lte: new Date(req.body.asOnDate)}
		};
		// if(req.body.asOnDate){
		// 	obj1.aVehCollection = {
		// 		"todt":{$lte: new Date(req.body.asOnDate)}
		// 	}
		// }
		const aggrQuery = [
			{$match: obj},
			{$limit:40000},
			{$unwind:"$aVehCollection"},
			{
				$unwind: {
					path: '$aVehCollection',
					preserveNullAndEmptyArrays: true
				}
			},
			{$match:obj1},
			{$project:{
					duesType:1,
					"aVehCollection.veh_no":1,
					"aVehCollection.todt":1
				}}
		];

		let data = await Dues.aggregate(aggrQuery);
		if (data.length) {
			ReportExelService.duesReport(data,req.body.from,req.body.to, req.body.asOnDate ,  req.body.clientId, async function(d) {
				if(hasTimeoutExecuted){
					await logsService.addLog('Dues Report', {
						uif: "DuesReport_" + moment().format('DD-MM-YYYY hh:mm'),
						docId: req.user._id,
						category: 'Notification',
						delta: [],
						dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
						userId: req.user._id,
						subCategory: 'DUES Report'
					}, req);
				}else {
					clearTimeout(timer);
					return res.status(200).json({
						status: "SUCCESS",
						message: 'DUES_ Report ',
						url: d.url
					});
				}
			});

		} else {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'DUES_ Report ',
				data:[],
			});
		}
	}catch (err) {
		return res.status (500).json ({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

module.exports = router;
