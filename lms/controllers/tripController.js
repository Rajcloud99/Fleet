var router = require('express').Router();
var Promise = require('bluebird');
var mongoose = require('mongoose');
var _ = require('lodash');

var tripService = Promise.promisifyAll(commonUtil.getService('trip'));
var Trip = Promise.promisifyAll(commonUtil.getModel('trip'));
var bookingService = Promise.promisifyAll(commonUtil.getService('booking'));
var registeredVehicleService = Promise.promisifyAll(commonUtil.getService('registeredVehicle'));
var GRmasterService = promise.promisifyAll(commonUtil.getService('gr'));
var GRstatusService = promise.promisifyAll(commonUtil.getService('grStatus'));
var UserService = Promise.promisifyAll(commonUtil.getService('user'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var locationService = promise.promisifyAll(commonUtil.getService("location"));
var TripExpense = promise.promisifyAll(commonUtil.getModel("tripExpenses"));
var invoiceService = promise.promisifyAll(commonUtil.getService("invoice"));
var clientService = promise.promisifyAll(commonUtil.getService("client"));
var ContractService = promise.promisifyAll(commonUtil.getService('contract'));

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function  prepareGeofenceData(pointType,pointData) {
	var pData = {
		"name" : pointData.name,
		"addr": pointData.address,
		"data_id" :  mongoose.Types.ObjectId(),
		"type" : pointType,
		"created_at" : new Date(),
		"contact_person_name":  pointData.contact_person_name,
		"contact_person_number":  pointData.contact_person_number,
		"contact_person_email":  pointData.contact_person_email,
	};
	if(pointData.location){
		pData.lat = pointData.location.lat;
		pData.lng = pointData.location.lng;
	}
	if(pointData.isCustomerLocation==true){
		pData.loc = "Customer";
	}
	return pData;
}

var prepareTripData = function (reqBody) {
    var aBookingItems = reqBody.booking_info;
    if (aBookingItems && aBookingItems.length > 0) {
        var oGR = {},
            k = 1;
        for (var i = 0; i < aBookingItems.length; i++) {
            if (oGR[aBookingItems[i].booking_no]) {
                oGR[aBookingItems[i].booking_no].booking_info.push(aBookingItems[i]);
                oGR[aBookingItems[i].booking_no]['freight'] = oGR[aBookingItems[i].booking_no]['freight'] + (aBookingItems[i].freight || 0);
                oGR[aBookingItems[i].booking_no]['weight'] = oGR[aBookingItems[i].booking_no]['weight'] + (aBookingItems[i].weight.value || 0);
                oGR[aBookingItems[i].booking_no]['no_of_unit'] = oGR[aBookingItems[i].booking_no]['no_of_unit'] + (aBookingItems[i].no_of_unit || 0);
                oGR[aBookingItems[i].booking_no]['totalBalance'] = oGR[aBookingItems[i].booking_no]['totalBalance'] + (aBookingItems[i].balance || 0);
                oGR[aBookingItems[i].booking_no]['totalAdvance'] = oGR[aBookingItems[i].booking_no]['totalAdvance'] + (aBookingItems[i].advance || 0);
            } else {
            	var geofence_points = [];
            	if(reqBody.geofence_points){
            		geofence_points = reqBody.geofence_points;
				}else{
            		if(aBookingItems[i].loading_point){
						geofence_points.push(prepareGeofenceData("Loading Point",aBookingItems[i].loading_point));
					}
					if(aBookingItems[i].unloading_point){
						geofence_points.push(prepareGeofenceData("Unloading Point",aBookingItems[i].unloading_point));
					}
				}
                oGR[aBookingItems[i].booking_no] = {
                    booking_info: [aBookingItems[i]],
                    customer_name: aBookingItems[i].customer_name,
                    customer_id: aBookingItems[i].customer_id,
                    consigner_name: aBookingItems[i].consigner_name,
                    consigner_id: aBookingItems[i].consigner,
                    consignee_name: aBookingItems[i].consignee_name,
                    consignee_id: aBookingItems[i].consignee,
					contract_id: aBookingItems[i].contract_id._id,
					contract: aBookingItems[i].contract_id,

                    boe_no: aBookingItems[i].boe_no,
                    boe_value: aBookingItems[i].boe_value,
                    boe_date: aBookingItems[i].boe_date,
                    factory_invoice_number: aBookingItems[i].factory_invoice_number,
                    factory_invoice_value: aBookingItems[i].factory_invoice_value,
                    factory_invoice_date: aBookingItems[i].factory_invoice_date,

                    cha_id: aBookingItems[i].cha,
                    cha_name: aBookingItems[i].cha_name,

                    shipping_line_id: aBookingItems[i].shipping_line,
                    shipping_line_name: aBookingItems[i].shipping_line_name,
                    billing_party_id: aBookingItems[i].billing_party,
                    billing_party_name: aBookingItems[i].billing_party_name,
                    billing_party_address: aBookingItems[i].billing_party_address,
                    billing_party_gstin_no: aBookingItems[i].billing_party_gstin_no,
                    is_gstin_registered: aBookingItems[i].is_gstin_registered,
                    gstin_state_code: aBookingItems[i].gstin_state_code,
                    booking_no: aBookingItems[i].booking_no,
                    branch: aBookingItems[i].branch,
                    loading_point: aBookingItems[i].loading_point,
                    unloading_point: aBookingItems[i].unloading_point,
                    material_group: aBookingItems[i].material_group,
                    material_type: aBookingItems[i].material_type,
                    gr_id: k,
                    rate: aBookingItems[i].rate || 0,
                    freight: aBookingItems[i].freight || 0,
                    weight: aBookingItems[i].weight ? aBookingItems[i].weight.value : 0,
                    no_of_unit: aBookingItems[i].no_of_unit || 0,
                    payment_basis: aBookingItems[i].payment_basis,
					payment_type: aBookingItems[i].payment_type,
                    sap_id: aBookingItems[i].sap_id,
					po_number: aBookingItems[i].po_number,
					isTransporter: aBookingItems[i].isTransporter,
                    geofence_points: geofence_points,
                    totalAdvance: aBookingItems[i].advance || 0,
                    totalBalance: aBookingItems[i].balance || 0,

                };
                k++;
            }
        }
        reqBody.gr = [];
        for (var booking_no in oGR) {
            reqBody.gr.push(oGR[booking_no]);
        }
    }
    return reqBody;
};
var setItems = function (aTrips, i, j) {
    aTrips[i].gr[j].trip_no = aTrips[i].trip_no;
    aTrips[i].gr[j].trip_start = aTrips[i].trip_start;
    aTrips[i].gr[j].trip_end = aTrips[i].trip_end;
    aTrips[i].gr[j].trip_status = aTrips[i].trip_status;
    aTrips[i].gr[j].ownGR = aTrips[i].ownGR;
    aTrips[i].gr[j].gr_type = aTrips[i].gr_type;
    aTrips[i].gr[j].owner_group = aTrips[i].owner_group;
    if (aTrips[i].route && aTrips[i].route.route_name) {
        aTrips[i].gr[j].route_name = aTrips[i].route.route_name;
    }
    aTrips[i].gr[j].diesel_stage = aTrips[i].diesel_stage;
    aTrips[i].gr[j].vehicle_type = aTrips[i].vehicle_type;
    aTrips[i].gr[j].trip_id = aTrips[i]._id;
    aTrips[i].gr[j].vehicle_no = aTrips[i].vehicle_no;
    aTrips[i].gr[j].m_vehicle_no = aTrips[i].m_vehicle_no;
    aTrips[i].gr[j].isMarketVehicle = aTrips[i].isMarketVehicle;
    aTrips[i].gr[j].driver_name = aTrips[i].driver_name;
    aTrips[i].gr[j].allocation_date = aTrips[i].allocation_date;
    aTrips[i].gr[j].remarks = aTrips[i].remarks;
	aTrips[i].gr[j].vendor_payment = aTrips[i].vendor_payment;
    return aTrips[i].gr[j];
}
var getGrFromTrips = function (aTrips, gr_satage) {
    var aTripGrs = [];
    if (aTrips && aTrips.length > 0) {
        for (var i = 0; i < aTrips.length; i++) {
            for (var j = 0; j < aTrips[i].gr.length; j++) {
                if (gr_satage == 'true') {
                    if (aTrips[i].gr[j].gr_stage) {
                        aTripGrs.push(setItems(aTrips, i, j));
                    }
                } else if (gr_satage == 'false') {
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
var getGrAckFromTrips = function (aTrips, ack_stage) {
    var oGRAck = { aGrs: [], aTripsss: [], aTripGrs: [] };
    if (aTrips && aTrips.length > 0) {
        for (var i = 0; i < aTrips.length; i++) {

            for (var j = 0; j < aTrips[i].gr.length; j++) {
                if (ack_stage == 'true') {
                    if (aTrips[i].gr[j].ack_stage) {
                        oGRAck.aTripsss.push(aTrips[i].trip_no);
                        oGRAck.aGrs.push(aTrips[i].gr[j].gr_no);
                        oGRAck.aTripGrs.push(setItems(aTrips, i, j));
                    }
                } else if (ack_stage == 'false') {
                    if (!aTrips[i].gr[j].ack_stage) {
                        oGRAck.aTripsss.push(aTrips[i].trip_no);
                        oGRAck.aGrs.push(aTrips[i].gr[j].gr_no);
                        oGRAck.aTripGrs.push(setItems(aTrips, i, j));
                    }
                } else {
                    oGRAck.aTripsss.push(aTrips[i].trip_no);
                    oGRAck.aGrs.push(aTrips[i].gr[j].gr_no);
                    oGRAck.aTripGrs.push(setItems(aTrips, i, j));
                }
            }
        }
    }
    return oGRAck;
};
var mergeExpenses = function (aTripGrs, aTripExpenses) {
    for (var i = 0; i < aTripGrs.length; i++) {
        for (var j = 0; j < aTripExpenses.length; j++) {
            if (aTripGrs[i].trip_no == aTripExpenses[j].trip_no) {
                aTripGrs[i].trip_expenses = aTripExpenses[j];
            }
        }
    }
};
var mergeBills = function (aTripGrs, aInvoices) {
    for (var i = 0; i < aTripGrs.length; i++) {
        for (var j = 0; j < aInvoices.length; j++) {
            if (aTripGrs[i].gr_no == aInvoices[j].gr_no || (aInvoices[j].booking_info[0] && aTripGrs[i].gr_no == aInvoices[j].booking_info[0].gr_no)) {
                aTripGrs[i].trip_bills = aInvoices[j];
            }
        }
    }
};
/***********add new trip *******/
router.post("/add", function (req, res, next) {
    req.body.clientId = req.user.clientId;
    var cursor = Trip.find({ clientId: req.body.clientId, vehicle: req.body.vehicle }).sort({ $natural: -1 }).limit(1);
    cursor.exec(function (err, tripData) {
        if (err) return res.status(500).json({ "status": "ERROR", "message": err });
        if (tripData && tripData[0]) {
            req.body.lastTripD = {};
            req.body.lastTripD.trip_id = tripData[0]._id;
            req.body.lastTripD.trip_start = tripData[0].trip_start;
            req.body.lastTripD.trip_end = tripData[0].trip_end;
            return next();
        } else {
            return next();
        }
    })
}, function (req, res, next) {
    tripService.addTripAsync(req.body)
        .then(function (trip) {
            return res.status(200).json({
                "status": "OK",
                "message": "trip has been added successfully",
                "data": trip
            });
        }).catch(next)
});

let manageFlow = (data) => {

}

/***********get all trips + search *******/
router.get("/get", function (req, res, next) {
    tripService.getAllTripsAsync(req)
        .then(function (data) {
            return locationService.fillTripsWithLocationAsync(data);
        })
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "trips found",
                "data": data.data,
                "count": data.count,
                "pages": data.no_of_pages
            });
        }).catch(next)
})
/***********get all GR items + search *******/
router.get("/gr", function (req, res, next) {
    tripService.getAllTripsAsync(req)
        .then(function (data) {
            var aGRItems = getGrFromTrips(data.data, req.query.gr_stage);
            return res.status(200).json({
                "status": "OK",
                "message": "gr items found",
                "data": aGRItems,
                "count": aGRItems.length,
                "pages": data.no_of_pages
            });
        }).catch(next)
});
/***********get all GR ACK items + search *******/
router.get("/gr_ack", function (req, res, next) {
    if (req.query && req.query.download && req.query.download == "true") {
        req.toDownload = true;
        req.query.all = true;
    }

    console.log("%%%%%%%%%%%%%%%%%%%%", req.query);

    delete req.query.download;
    if (req.query) {
        req.query.gr_done = { $exists: true, $ne: null };
        req.query.trip_end = true;
        if (req.query.start_date || req.query.end_date) {
            var filterKey = req.query.allocation_date ? "allocation_date" : "ack_receiving_date";
            req.query = getReportQuery(req, filterKey);
            delete req.query.reportType;
            delete req.query.start_date;
            delete req.query.end_date;
        }
    }
    tripService.getAllTripsAsync(req)
        .then(function (data) {
            req.oGRAck = getGrAckFromTrips(data.data, req.query.ack_stage);
            req.oGRAck.no_of_pages = data.no_of_pages;
            if (req.oGRAck.aTripsss.length > 0) {
                var oFilter = { "clientId": req.query.clientId, "trip_no": { $in: req.oGRAck.aTripsss }, "gr_no": { $in: req.oGRAck.aGrs } };
                return invoiceService.findInvoiceAsync(oFilter);
            } else {
                return { noBillData: true };
            }
        }).then(function (aInvoices) {
            mergeBills(req.oGRAck.aTripGrs, aInvoices);
            if (req.toDownload) {
                function GrResponse(data) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "GR report download available.",
                        "url": data.url
                    });
                };
                ReportExelService.generateGRAckExcel(req.oGRAck.aTripGrs, req.query.clientId, GrResponse);
            } else {
                return res.status(200).json({
                    "status": "OK",
                    "message": "gr items found",
                    "data": req.oGRAck.aTripGrs,
                    "count": req.oGRAck.aTripGrs.length,
                    "pages": req.oGRAck.no_of_pages
                });
            }
        }).catch(next)
});
/*************get all pending GR for ack*******/
router.get("/gr/pending_ack", function (req, res, next) {
    if (req.query && req.query.download && req.query.download == "true") {
        req.toDownload = true;
        req.query.all = true;
    }
    delete req.query.download;
    if (req.query) {
        //var today=new Date();
        req.query.gr_done = { $exists: true, $ne: null };
        req.query.trip_end = true;
        req.query.ack_stage = true;
        //req.query.gr_ack_exp_date={$lt: today};
    }
    tripService.getAllTripsAsync(req)
        .then(function (data) {
            req.oGRAck = getGrAckFromTrips(data.data, req.query.ack_stage);
            req.oGRAck.no_of_pages = data.no_of_pages;
            if (req.oGRAck.aTripsss.length > 0) {
                var oFilter = { "clientId": req.query.clientId, "trip_no": { $in: req.oGRAck.aTripsss }, "gr_no": { $in: req.oGRAck.aGrs } };
                return invoiceService.findInvoiceAsync(oFilter);
            } else {
                return { noBillData: true };
            }
        }).then(function (aInvoices) {
            mergeBills(req.oGRAck.aTripGrs, aInvoices);
            if (req.toDownload) {
                function GrResponse(data) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "GR report download available.",
                        "url": data.url
                    });
                };
                ReportExelService.generateGRPendingExcel(req.oGRAck.aTripGrs, req.query.clientId, GrResponse);
            } else {
                return res.status(200).json({
                    "status": "OK",
                    "message": "gr items found",
                    "data": req.oGRAck.aTripGrs,
                    "count": req.oGRAck.aTripGrs.length,
                    "pages": req.oGRAck.no_of_pages
                });
            }

        }).catch(next)
});
/***********get all trips + trim  + search *******/
router.get("/get/trim", function (req, res, next) {
    tripService.searchtripAsync(req.query, true)
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "trips found",
                "data": data.trips
            });
        }).catch(next)
});

/***********update trip*******/
router.put("/update/:_id",
    function (req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for trip update" });
        }
        tripService.findTripIdAsync(mongoose.Types.ObjectId(req.params._id))
            .then(function (trip) {
                if (trip && trip[0]) {
                    req.body.oldTrip = trip[0];
                    return next();
                } else {
                    return res.status(500).json({ "status": "ERROR", "error_message": "trip does not exist" });
                }
            });
    },
    function (req, res, next) {
        tripService.updateTripAsync(req.params._id, req.body)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "trip data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);
/***********update gr items *******/
router.put("/gr/:_id",
    function (req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for trip update" });
        }
        if (!(req.body.hasOwnProperty("gr_no"))) {
            return res.status(200).json({
                "status": "ERROR",
                "canAdd": false,
                "message": "GR number can't be empty."
            });
        }
        tripService.findTripIdAsync({ _id: req.params._id })
            .then(function (trip) {
                if (trip && trip[0]) {
                    if (req.body.ownGR) {
                        var oReqData = req.body;
                        oReqData.gr_no = req.body.gr_no;
                        GRstatusService.isGRstatusExistsAsync({ "gr_no": oReqData.gr_no, clientId: trip[0].clientId, gr_Status: { $ne: 'Unallocated' } })
                            .then(function (exists) {
                                if (exists) {
                                    return res.status(200).json({
                                        "status": "ERROR",
                                        "canAdd": false,
                                        "message": "GR number already exists."
                                    });
                                } else {
                                    GRmasterService.isGRavailableinMasterAsync({ "gr_no": oReqData.gr_no, "branch_name": oReqData.branch_name, clientId: trip[0].clientId })
                                        .then(function (available) {
                                            if (available) {
                                                GRstatusService.addGRAsync(oReqData)
                                                    .then(
                                                    function (added) {
                                                        return next();
                                                    }
                                                    )
                                            } else {
                                                return res.status(200).json({ "status": "ERROR", "canAdd": false, "message": "GR is not available in masters for this branch" });
                                            }
                                        })
                                }
                            })
                    } else if (req.body.centralizedGR) {
                        GRmasterService.findUserActiveGRAsync(req.query)
                            .then(function (grData) {
                                var oGRStatusData = {
                                    "clientId": req.query.clientId,
                                    "branch_name": 'Centralized',
                                    "customer_name": req.body.customer_name,
                                    "isCentralized": true,
                                    "grCode": grData.grCode,
                                    "grSeries": grData.grSeries,
                                    "book_no": grData.book_no,
                                    "book_year": grData.book_year,
                                    "tripId": req.body.tripId,
                                    "trip_no": req.body.trip_no,
                                    "bookingId": req.body.bookingId,
                                    "booking_no": req.body.booking_no,
                                    "centralized_gr_no": req.body.gr_no
                                };
                                GRstatusService.addGRAsync(oGRStatusData)
                                    .then(
                                    function (added) {
                                        return next();
                                    }
                                    )
                            })
                    } else {
                        return next();
                    }
                } else {
                    return res.status(200).json({ "status": "ERROR", "error_message": "trip does not exist" });
                }
            });
    },
    function (req, res, next) {
        var oFilter = { _id: req.params._id, trip_no: req.body.trip_no, "gr.gr_id": req.body.gr_id };
        var oUpdate = {};
        oUpdate["gr.$.gr_no"] = req.body.gr_no.toString();
        if (req.body.gr_date) {
            oUpdate["gr.$.gr_date"] = req.body.gr_date;
        }
        oUpdate["gr.$.gr_charges"] = typeof req.body.gr_charges == "number" ? req.body.gr_charges : 0;

        oUpdate["gr.$.loading_charges"] = typeof req.body.loading_charges == "number" ? req.body.loading_charges : 0;

        oUpdate["gr.$.weightman_charges"] = typeof req.body.weightman_charges == "number" ? req.body.weightman_charges : 0;

        oUpdate["gr.$.unloading_charges"] = typeof req.body.unloading_charges == "number" ? req.body.unloading_charges : 0;

        oUpdate["gr.$.munshiyana_charges"] = typeof req.body.munshiyana_charges == "number" ? req.body.munshiyana_charges : 0;

        oUpdate["gr.$.other_charges"] = typeof req.body.other_charges == "number" ? req.body.other_charges : 0;

		oUpdate["gr.$.fuel_price_hike"] = typeof req.body.fuel_price_hike == "number" ? req.body.fuel_price_hike : 0;

		oUpdate["gr.$.l_tare_w"] = typeof req.body.l_tare_w === "number" ? req.body.l_tare_w : 0;
		oUpdate["gr.$.l_gross_w"] = typeof req.body.l_gross_w === "number" ? req.body.l_gross_w : 0;
		oUpdate["gr.$.l_net_w"] = typeof req.body.l_net_w === "number" ? req.body.l_net_w : 0;
		oUpdate["gr.$.ul_tare_w"] = typeof req.body.ul_tare_w === "number" ? req.body.ul_tare_w : 0;
		oUpdate["gr.$.ul_gross_w"] = typeof req.body.ul_gross_w === "number" ? req.body.ul_gross_w : 0;
		oUpdate["gr.$.ul_net_w"] = typeof req.body.ul_net_w === "number" ? req.body.ul_net_w : 0;

        oUpdate["gr.$.freight"] = req.body.freight || 0;
        oUpdate["gr.$.total"] = req.body.total || 0;
        oUpdate["gr.$.rate"] = req.body.rate || 0;

        oUpdate.ownGR = req.body.ownGR;
        oUpdate.gr_type = req.body.gr_type;
        oUpdate["gr.$.gr_stage"] = req.body.gr_stage || false;

        oFilter.clientId = req.user.clientId;
        tripService.updateTripByFilterAsync(oFilter, oUpdate)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "gr data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);
router.put("/gr_location/update/:_id",
    function (req, res, next) {
        //console.log("============ppp=====",req.body);

        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for trip update" });
        }
        tripService.findTripIdAsync({ _id: req.params._id })
            .then(function (trip) {
                if (trip && trip[0]) {
                    trip = JSON.parse(JSON.stringify(trip[0]));
                    if (req.body.trip_no) {
                        if (req.body.trip_no != trip.trip_no) {
                            return res.status(500).json({ "status": "ERROR", "error_message": "_id and trip_no provided didn't match" });
                        }
                        req.body.Vehicle = trip.vehicle;
                        req.body.vehicle_no = trip.vehicle_no;
                        req.body.route_name = trip.route && trip.route.route_name ? trip.route.route_name : "";
                        return next();
                    } else {
                        return res.status(500).json({ "status": "ERROR", "error_message": "Please provide Trip no" });
                    }
                } else {
                    return res.status(500).json({ "status": "ERROR", "error_message": "trip does not exist" });
                }
            });
    },
    function (req, res, next) {
        var oFilter = {};
        var oUpdate = {};
        if (req.body.trip_no) {
            oFilter = { _id: req.params._id, trip_no: req.body.trip_no };
            if (req.body.gr_id) {
                oFilter = { _id: req.params._id, trip_no: req.body.trip_no, "gr.gr_id": req.body.gr_id };
                if (req.body.arrival_loading) {
                    oUpdate["gr.$.arrival_loading"] = req.body.arrival_loading;
                }
                if (req.body.loading_point) {
                    oUpdate["gr.$.loading_point"] = req.body.loading_point;
                }
                if (req.body.arrival_unloading) {
                    oUpdate["gr.$.arrival_unloading"] = req.body.arrival_unloading;
                }
                if (req.body.unloading_point) {
                    oUpdate["gr.$.unloading_point"] = req.body.unloading_point;
                }

                if (req.body.loading_start) {
                    oUpdate["gr.$.loading_start"] = req.body.loading_start;
                }
                if (req.body.loading_end) {
                    oUpdate["gr.$.loading_end"] = req.body.loading_end;
                }
                if (req.body.unloading_start) {
                    oUpdate["gr.$.unloading_start"] = req.body.unloading_start;
                }
                if (req.body.unloading_end) {
                    oUpdate["gr.$.unloading_end"] = req.body.unloading_end;
                }
            }
        }
        if (req.body.trip_history) {
            oUpdate.trip_history = req.body.trip_history;
        }
        if (req.body.route) {
            oUpdate.route = req.body.route;
        }
        if (req.body.vehicle_running_status) {
            oUpdate.vehicle_running_status = req.body.vehicle_running_status;
        }
        if (req.body.trip_running_status) {
            oUpdate.trip_running_status = req.body.trip_running_status;
        }
        if (req.body.trip_status) {
            oUpdate.trip_status = req.body.trip_status;
            switch (req.body.trip_status) {
                case "Trip started":
                    if (req.body.trip_start) {
                        req.body.trip_start.user = req.user.full_name;
                        req.body.trip_start.user_id = req.user._id;
                        oUpdate.trip_start = req.body.trip_start;
                        oUpdate.actual_trip_start = new Date();
                        req.oFilter = oFilter;
                        tripService.getGrCountandDistAsync(oFilter)
                            .then(function (data) {
                                console.log('req.client    ********************', req.clientData)
                                if (req.clientData.flow.length == 1) {
                                    console.log('request would be running in parallel')
                                }
                                else if (req.clientData.flow.length == 2) {
                                    let splitData = req.clientData.flow[0];
                                    if (splitData[0] == "GR" || splitData[1] == "GR") {
                                        for (var i = 0; i < data.grLength; i++) {
                                            if (!data.gr[i].gr_no || data.gr[i].gr_no == null) {
                                                return res.status(500).json({
                                                    "status": "ERROR",
                                                    "message": "Please do the GR before starting the Trip"
                                                });
                                            }
                                        }
                                    }
                                    else if (splitData[0] == "DIESEL" || splitData[1] == "DIESEL") {
                                        if (data.diesel_stage == true) {
                                            return res.status(500).json({
                                                "status": "ERROR",
                                                "message": "Please do diesel before starting Trip of own vehicle"
                                            });
                                        }
                                    }
                                }
                                req.oUpdate = oUpdate;
                                return next();
                            })

                    } else return res.status(500).json({
                        "status": "ERROR",
                        "message": "trip_start not provided"
                    });
                    break;
                case "Trip ended":
                    if (req.body.trip_end) {
                        //console.log("======",req.oFilter);
                        //console.log("======",req.oUpdate);
                        req.body.trip_end.user = req.user.full_name;
                        req.body.trip_end.user_id = req.user._id;
                        oUpdate.actual_trip_end = Date.now();
                        oUpdate.trip_end = req.body.trip_end;
                        //oUpdate.diesel_stage = true;

                        req.oFilter = oFilter;
                        req.oUpdate = oUpdate;

                        tripService.getGrCountandDistAsync(oFilter)
                            .then(function (data) {
                                console.log('req.client    ********************', req.clientData)
                                if (req.clientData.flow.length == 1) {
                                    console.log('request would be running in parallel')
                                }
                                else if (req.clientData.flow.length == 2) {
                                    let splitData = req.clientData.flow[0];
                                    if (splitData[0] == "GR" || splitData[1] == "GR") {
                                        for (var i = 0; i < data.grLength; i++) {
                                            if (!data.gr[i].gr_no || data.gr[i].gr_no == null) {
                                                return res.status(500).json({
                                                    "status": "ERROR",
                                                    "message": "Please do the GR before starting the Trip"
                                                });
                                            }
                                        }
                                    }
                                    else if (splitData[0] == "DIESEL" || splitData[1] == "DIESEL") {
                                        if (data.diesel_stage == true) {
                                            return res.status(500).json({
                                                "status": "ERROR",
                                                "message": "Please do diesel before starting Trip of own vehicle"
                                            });
                                        }
                                    }
                                }



                                var travelTime = Math.ceil(((data.distance || 250) / 250) + 1);
                                var date = new Date();
                                var gr_ack_exp_date = date.setDate(date.getDate() + travelTime);
                                req.oUpdate.gr = data.gr;
                                for (var i = 0; i < data.grLength; i++) {
                                    req.oUpdate.gr[i].gr_ack_exp_date = gr_ack_exp_date;
                                }
                                var oUpd = {
                                    status: "Available",
                                    previousStatus: "Booked",
                                    last_known: {
                                        status: "Available",
                                        datetime: req.body.trip_end.time || Date.now(),
                                        trip_no: req.body.trip_no,
                                        trip_name: req.body.route_name
                                    }
                                };
                                registeredVehicleService.updateRegisteredVehicleStatusByIdAsync(data.vehicle, oUpd)
                                    .then(function (updated) {
                                        return next();
                                    })
                            })
                    } else return res.status(200).json({ "status": "OK", "message": "trip_end not provided" });
                    break;
                case "Trip cancelled":
                    if (req.body.trip_cancel) {
                        req.body.trip_cancel.user = req.user.full_name;
                        req.body.trip_cancel.user_id = req.user._id;
                        oUpdate.trip_cancel = req.body.trip_cancel;
                        oUpdate.actual_trip_cancel = Date.now();
                        req.oUpdate = oUpdate;
                        req.oFilter = oFilter;
                        tripService.deallocateAsync(req,
                            function (err, resp) {
                                if (err) {
                                    return res.status(500).json(err);
                                } else {
                                    return next();
                                }
                            });
                    } else return res.status(500).json({
                        "status": "ERROR",
                        "message": "trip_cancel not provided"
                    });
                    break;
            }
        } else {
            req.oUpdate = oUpdate;
            req.oFilter = oFilter;
            next();
        }
    },
    function (req, res, next) {
        req.oFilter.clientId = req.user.clientId;
        tripService.updateTripByFilterAsync(req.oFilter, req.oUpdate)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);


//------Trip Location ------
//changes akash 19/12/2017
router.put("/trip_location/update/:_id",
    function (req, res, next) {
        console.log('req. body  ',JSON.stringify(req.body))
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for trip update" });
        }
        tripService.findTripIdAsync({ _id: req.params._id })
            .then(function (trip) {
                if (trip && trip[0]) {
                    trip = JSON.parse(JSON.stringify(trip[0]));
                    req.tripData = trip
                    if (req.body.trip_no) {
                        if (req.body.trip_no != trip.trip_no) {
                            return res.status(500).json({ "status": "ERROR", "error_message": "_id and trip_no provided didn't match" });
                        }
                        if (!(req.body.gr_id && (req.body.geofence || req.body.data_id))) {
                            return res.status(500).json({ "status": "ERROR", "error_message": "gr id or geofence points not provided." });
                        }
                        return next();
                    } else {
                        return res.status(500).json({ "status": "ERROR", "error_message": "Please provide Trip no" });
                    }
                } else {
                    return res.status(500).json({ "status": "ERROR", "error_message": "trip does not exist" });
                }
            });
    },
    function (req, res, next) {
        var oFilter = { _id: req.params._id, "clientId": req.user.clientId, trip_no: req.body.trip_no, "gr.gr_id": req.body.gr_id };

        obj={
            "name":  req.body.geofence.name,
            "addr":   req.body.geofence.address,
			"loc":   req.body.geofence.loc,
            "lat":   req.body.geofence.lat,
            "lng":  req.body.geofence.lng,
            "sms":   req.body.geofence.sms,
            "email":  req.body.geofence.email,
            "type":   req.body.geofence.type,
            "entry":   req.body.geofence.entry,
            "exit":   req.body.geofence.exit,
            "enabled":   req.body.geofence.enabled,
            "created_at": req.body.geofence.created_at,
            "contact_person_name":   req.body.geofence.contact_person_name,
            "contact_person_number":   req.body.geofence.contact_person_number,
            "contact_person_email":   req.body.geofence.contact_person_email
        }
        if (req.body.pushData) {
			obj.data_id = mongoose.Types.ObjectId();
		}
        var oUpdate = req.body.pushData ? { $push: { "gr.$.geofence_points": obj } } : { $pull: { "gr.$.geofence_points": { data_id: req.body.data_id } } };
        tripService.updateLocationTripAsync(oFilter, oUpdate)
            .then(function (updated) {
                var oFilter = { _id: req.params._id, "gr.gr_id": req.body.gr_id };
                geozones = []
                uniqueGeozones = []
                let doc = {}
                geozones.push(obj);
                console.log('client id   ', req.body.clientId)
                obj1 = {
                        clientId:req.body.clientId,
                        user_id :req.clientData._id,
                        vehicle_no:req.tripData.vehicle_no,
                        driver: req.tripData.driver_name,
                        driver_no:req.tripData.driver_contact,
                        trip_id:req.body.trip_no
                    }
                oFilter=obj1
                oFilter.geofence=geozones
                locationService.updateTripOnGPSGAADI(oFilter, "between", function (err, data) {
                    if (err) console.log(err);
                    else console.log(data);
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Data has been updated successfully",
                        "data": updated
                    });
                })

            }).catch(next)
    });

router.put("/gr_update/update/:_id",
    function (req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for trip update" });
        }
        tripService.findTripQueryAsync({ trip_no: req.body.trip_no, clientId: req.user.clientId })
            .then(function (trip) {
                if (trip && trip[0]) {
                    trip = JSON.parse(JSON.stringify(trip[0]));
                    if (req.body.trip_no) {
                        if (req.body.trip_no != trip.trip_no) {
                            return res.status(500).json({ "status": "ERROR", "error_message": "_id and trip_no provided didn't match" });
                        }
                        return next();
                    } else {
                        return res.status(500).json({ "status": "ERROR", "error_message": "Please provide Trip no" });
                    }
                } else {
                    return res.status(500).json({ "status": "ERROR", "error_message": "trip does not exist" });
                }
            });
    },
    function (req, res, next) {
        var oFilter = {};
        var oUpdate = {};
        if (req.body.trip_no) {
            oFilter = { clientId: req.user.clientId, trip_no: req.body.trip_no };
            if (req.body.gr_id) {
                oFilter = { clientId: req.user.clientId, trip_no: req.body.trip_no, "gr.gr_id": req.body.gr_id };
                if (req.body.consigner_id) {
                    oUpdate["gr.$.consigner_id"] = req.body.consigner_id;
                }
                if (req.body.consigner_name) {
                    oUpdate["gr.$.consigner_name"] = req.body.consigner_name;
                }
                if (req.body.factory_invoice_number) {
                    oUpdate["gr.$.factory_invoice_number"] = req.body.factory_invoice_number;
                }
                if (req.body.factory_invoice_date) {
                    oUpdate["gr.$.factory_invoice_date"] = req.body.factory_invoice_date;
                }
                if (req.body.consignee_id) {
                    oUpdate["gr.$.consignee_id"] = req.body.consignee_id;
                }
                if (req.body.consignee_name) {
                    oUpdate["gr.$.consignee_name"] = req.body.consignee_name;
                }
				if (req.body.ul_gross_w) {
					oUpdate["gr.$.ul_gross_w"] = req.body.ul_gross_w;
				}
				if (req.body.ul_tare_w) {
					oUpdate["gr.$.ul_tare_w"] = req.body.ul_tare_w;
				}
				if (req.body.ul_net_w) {
					oUpdate["gr.$.ul_net_w"] = req.body.ul_net_w;
				}
				if (req.body.l_gross_w) {
					oUpdate["gr.$.l_gross_w"] = req.body.l_gross_w;
				}
				if (req.body.l_tare_w) {
					oUpdate["gr.$.l_tare_w"] = req.body.l_tare_w;
				}
				if (req.body.l_net_w) {
					oUpdate["gr.$.l_net_w"] = req.body.l_net_w;
				}
            }
        }
        req.oUpdate = oUpdate;
        req.oFilter = oFilter;
        req.oFilter.clientId = req.user.clientId;
        tripService.updateTripByFilterAsync(req.oFilter, req.oUpdate)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);
router.put("/gr_ack/:_id",
    function (req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for trip update" });
        }


        // console.log("====================",req.body);
        tripService.findTripIdAsync(mongoose.Types.ObjectId(req.params._id))
            .then(function (trip) {
                if (trip && trip[0]) {
                    return next();
                } else {
                    return res.status(500).json({ "status": "ERROR", "error_message": "trip does not exist" });
                }
            });
    },
    function (req, res, next) {
        var oFilter = { _id: req.params._id, trip_no: req.body.trip_no, "gr.gr_id": req.body.gr_id };
        var oUpdate = {};
        if (req.body.place) {
            oUpdate["gr.$.place"] = req.body.place;
        }
        if (req.body.branch) {
            oUpdate["gr.$.branch"] = req.body.branch;
        }
        if (req.body.courier_name) {
            oUpdate["gr.$.courier_name"] = req.body.courier_name;
        }
        if (req.body.courier_id) {
            oUpdate["gr.$.courier_id"] = req.body.courier_id;
        }
        if (req.body.courier_date) {
            oUpdate["gr.$.courier_date"] = req.body.courier_date;
        }
        if (req.body.courier_office) {
            oUpdate["gr.$.courier_office"] = req.body.courier_office;
        }
        if (req.body.courier_office_id) {
            oUpdate["gr.$.courier_office_id"] = req.body.courier_office_id;
        }
        if (req.body.receiving_date) {
            oUpdate["gr.$.receiving_date"] = req.body.receiving_date;
        }
        if (req.body.receiving_person) {
            oUpdate["gr.$.receiving_person"] = req.body.receiving_person;
        }
        if (req.body.driver_name) {
            oUpdate["gr.$.driver_name"] = req.body.driver_name;
        }
        if (req.body.driver_id) {
            oUpdate["gr.$.driver_id"] = req.body.driver_id;
        }
        if (req.body.branch_id) {
            oUpdate["gr.$.branch_id"] = req.body.branch_id;
        }
        if (req.body.empl_name) {
            oUpdate["gr.$.empl_name"] = req.body.empl_name;
        }
        if (req.body.empl_id) {
            oUpdate["gr.$.empl_id"] = req.body.empl_id;
        }
        if (req.body.pending_gr_remarks) {
            oUpdate["gr.$.pending_gr_remarks"] = req.body.pending_gr_remarks;
        }
        oUpdate["gr.$.ack_stage"] = req.body.ack_stage || false;
        oUpdate["gr.$.ack_status"] = req.body.ack_status || true;
        oFilter.clientId = req.user.clientId;
        tripService.updateTripByFilterAsync(oFilter, oUpdate)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "gr ack data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);
/***********allocate vehicle for a trip *******/
router.post("/allocateVehicle", function (req, res, next) {
    registeredVehicleService.findRegisteredVehicleIdAsync(req.body.vehicle)
        .then(function (vehicleData) {
            if (vehicleData && vehicleData[0]) {
                if (vehicleData[0].own && vehicleData[0].last_known.status != "Available") {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Vehicle is not available for allocation"
                    });
                } else {
                    req.body.owner_group = vehicleData[0].owner_group;
                    req.body.isOwn = vehicleData[0].own;
                    return next();
                }
            } else {
                return res.status(500).json({
                    "status": "ERROR",
                    "message": "Vehicle not found"
                });
            }
        })
},
    function (req, res, next) {
        req.body.clientId = req.user.clientId;
        var cursor = Trip.find({ clientId: req.body.clientId, vehicle: req.body.vehicle }).sort({ $natural: -1 }).limit(1);
        cursor.exec(function (err, tripData) {
            if (err) return res.status(500).json({ "status": "ERROR", "message": err });
            if (tripData && tripData[0]) {
                req.body.lastTripD = {};
                req.body.lastTripD.trip_id = tripData[0]._id;
                req.body.lastTripD.trip_no = tripData[0].trip_no;
                req.body.lastTripD.trip_start = tripData[0].trip_start;
                req.body.lastTripD.trip_end = tripData[0].trip_end;
                return next();
            } else {
                return next();
            }
        })
    },
    function (req, res, next) {

        if (req.body.isMarketVehicle) {
            var advance = req.body.vendor_payment.advance ? parseInt(req.body.vendor_payment.advance) : 0;
            var toPay = req.body.vendor_payment.toPay ? parseInt(req.body.vendor_payment.toPay) : 0;
            if (advance == 0 && toPay == 0) {
                return res.status(500).json({
                    "status": "ERROR",
                    "message": "Advance and to pay cannot be empty"
                });
            }
        }
        var oTripData = prepareTripData(req.body);
        req.contractUpdate = [];
		for (var gr in oTripData.gr) {
			let cObj={};
			cObj.find = {'_id': mongoose.Types.ObjectId(oTripData.gr[gr].contract_id)};
			let serveQty = 0;
			switch (oTripData.gr[gr].contract.payment_basis){
				case constant.payment_basis[0]:
						serveQty = oTripData.gr[gr].weight;
						break;
				case constant.payment_basis[1]:
						serveQty = oTripData.gr[gr].no_of_unit;
						break;
				case constant.payment_basis[2]:
					serveQty = 1;
					break;
			}
			cObj.update = {$inc:{sQty:serveQty}}
			req.contractUpdate.push(cObj);
		}
        if (!req.body.trip_manager && req.user) {
            oTripData.trip_manager = {
                "name": req.user.full_name,
                "mobile": req.user.contact_no,
                "email": req.user.email,
                "empl_id": req.user.userId,
                "userId": req.user.userId
            };
        }
        oTripData.created_by = req.user.full_name;
        oTripData.diesel_stage = req.body.diesel_stage || req.body.isOwn;
        oTripData.vendor_payment = req.body.vendor_payment;
        oTripData.clientId = req.user.clientId;
        /* if(req.body.isMarketVehicle&&req.body.diesel_stage)
         {
        	   return res.status(500).json({"status":"ERROR",
        	 "message":"Trip not found"
        	 });
         }*/

        tripService.addTripAsync(oTripData)
            .then(function (trip) {
                if (trip) {
                    req.trip_no = trip.trip_no;
                    if (req.body.isMarketVehicle) {
                        trip.created_by = {
                            date: Date.now(),
                            name: req.user.name

                        }
                        //TripExpense.createTripExpenseAsync(trip);
                    }
                    var cb = function (err, respp) {
                        if (err) console.log(err);
                        if (respp && respp.trip_id) {
                            Trip.updateAsync({ _id: trip._id }, { $set: { gTrip_id: respp.trip_id } })
                                .then(function (updatedTrip) {
                                    console.log('trip created on gpsgaadi');
                                })
                        }
                        console.log('gpsss');
                    };
                    locationService.createTripOnGPSGAADI(trip, cb);
                    return bookingService.updateBulkBookingInfoAsync(trip, true);
                } else {
                    return undefined;
                }

            }).then(function (booking) {
                if (booking && req.body.vehicle) {
                    req.booking = booking;
                    var oUpdate = {
                        status: "Booked",
                        last_known: {
                            status: "Booked",
                            datetime: Date.now(),
                            trip_no: req.body.trip_no,
                            trip_name: req.body.route.route_name,
                        }
                    };
                    ContractService.updateBulkContract(req.contractUpdate);
					return registeredVehicleService.updateRegisteredVehicleIdAsync(req.body.vehicle, oUpdate);
				} else {
                    return undefined;
                }
            }).then(function (vehicle) {
                if (vehicle) {
                    bookingService.findBookingDataAsync({ clientId: req.body.clientId, booking_no: req.body.booking_info[0].booking_no })
                        .then(function (booking) {
                            //console.log("ppppppppppppppp", JSON.parse(JSON.stringify(booking)));
                            let bookingData = JSON.parse(JSON.stringify(booking))
                            //var a = bookingData[0].no_of_container;
                            //console.log("7777777777777777777777",a);
                            var vehilcle_alloted_count_true = 0;
                            var vehilcle_alloted_count_false = 0;
                            req.bookingId = bookingData[0]._id;

                            async.each(bookingData[0].info, function (obj, callback) {
                                console.log('dffffffffffff    ', obj.vehicle_alloted);
                                //console.log('dffffffffffffhjshhshhshhs    ', obj.no_of_container);
                                // console.log('dffffffffffffuuuuuuuuuuuu    ', obj);


                                if (obj.vehicle_alloted == true) {

                                    vehilcle_alloted_count_true = vehilcle_alloted_count_true + 1;

                                }
                                else if (obj.vehicle_alloted == false) {

                                    vehilcle_alloted_count_false = vehilcle_alloted_count_false + 1;
                                }
                                callback()
                            }, err => {
                                var obj1 = {}
                                //console.log(obj.no_of_container);
                                if (vehilcle_alloted_count_true == bookingData[0].no_of_container) {
                                   obj1={
                                       'booking_status.status' : 'Allocation Completed'

                                   }

                                }
                                else if (vehilcle_alloted_count_false == bookingData[0].no_of_container) {
                                    obj1={
                                        'booking_status.status': 'Pending'
                                        }

                                }

                                else if (vehilcle_alloted_count_true < bookingData[0].no_of_container) {
                                    obj1 ={
                                        'booking_status.status': 'Partial Allocation Done'
                                        }
                                    }

                                bookingService.updateBookingAsync(req.bookingId, obj1).then((updateBooking) => {
                                    if (updateBooking) {
                                        console.log('updateBooking     ', updateBooking)
                                        return res.status(200).json({
                                            "status": "OK",
                                            "message": "vehicle allocated successfully",
                                            "data": req.booking
                                        });
                                    }
                                })
                            })

                            /*
                                            uncomment when working for driver app.
                              if(vehicle){
                                var oUpdate = { current_active_trip_no :  req.trip_no };
                                console.log(vehicle.driver);
                                var driver_license = req.body.driver_license || vehicle.driver_license;
                                if(driver_license){
                                    return UserService.updateUserByQueryAsync({userId:driver_license},oUpdate);
                                }else{
                                    return true;
                                }
                              }else{
                                  return undefined;
                              }

                          }).then(function(driver){
                                        */


                            //   req.bookingData = JSON.parse(booking)
                        }).catch(next)
                } else {
                    res.status(500).json({
                        "status": "OK",
                        "message": "vehicle allocation failed",
                        "data": vehicle
                    });
                }
            }).catch(next)
    });
/***********de-allocate vehicle for a trip *******/
router.post("/deallocateVehicle", function (req, res, next) {
    tripService.deallocateAsync(req,
        function (err, resp) {
            if (err) {
                return res.status(500).json(err);
            } else {
                return res.status(200).json(resp);
            }
        });
});



function getReportQuery(req, keyName) {
    if (req.query.start_date && req.query.end_date) {
        var startDate = new Date(req.query.start_date);
        startDate.setSeconds(0);
        startDate.setHours(0);
        startDate.setMinutes(0);
        var nextDay = new Date(req.query.end_date);
        nextDay.setSeconds(59);
        nextDay.setHours(23);
        nextDay.setMinutes(59);
        req.query[keyName] = { "$gte": startDate, "$lt": nextDay };
    } else if (req.query.start_date) {
        var startDate = new Date(req.query.start_date);
        startDate.setSeconds(0);
        startDate.setHours(0);
        startDate.setMinutes(0);
        var nextDay = new Date(startDate);
        nextDay.setDate(startDate.getDate() + 1);
        req.query[keyName] = { "$gte": startDate, "$lt": nextDay };
    } else if (req.query.end_date && !query.start_date) {
        var endDate = new Date(req.query.end_date);
        endDate.setSeconds(59);
        endDate.setHours(23);
        endDate.setMinutes(59);
        fFilter[keyName] = { "$lt": endDate };
    }
    return req.query;
}
router.get("/report", function (req, res, next) {
    if (req.query.report_download == "true") {
        req.report_download = true;
    }
    delete req.query.report_download;
    req.type = JSON.parse(JSON.stringify(req.query.type || {}));
    delete req.query.type;
    if (req.query.reportType == "Dispatch Report") {
        req.reportType == "Dispatch Report";
        req.query = getReportQuery(req, "trip_start_date");
        req.query.status_value = "Started";
        delete req.query.reportType;
        delete req.query.start_date;
        delete req.query.end_date;
    } else if (req.query.reportType == "Trip Complete Report") {
        req.reportType == "Trip Complete Report";
        req.query = getReportQuery(req, "trip_end_date");
        req.query.status_value = "Completed";
        delete req.query.reportType;
        delete req.query.start_date;
        delete req.query.end_date;
    } else if (req.query.reportType == "Trip Cancel Report") {
        req.reportType == "Trip Cancel Report";
        req.query.status_value = "Cancelled";
        req.query = getReportQuery(req, "trip_cancel_date");
        delete req.query.reportType;
        delete req.query.start_date;
        delete req.query.end_date;
    } else if (req.query.reportType == "Allocation Report") {
        req.reportType == "Allocation Report";
        req.query = getReportQuery(req, "allocation_date");
        delete req.query.reportType;
        delete req.query.start_date;
        delete req.query.end_date;
    } else if (req.query.reportType == "Incomplete Report") {
        req.reportType == "Incomplete Report";
        req.query = getReportQuery(req, "created_at");
        req.query.trip_end = false;
        delete req.query.reportType;
        delete req.query.start_date;
        delete req.query.end_date;
    }
    tripService.getAllTripsAsync(req)
        .then(function (data) {
            if (data && data.data && data.data[0]) {
                var aTrip = data.data;
                var aObjectLevel = allObjectLevel(aTrip);

                function TripResponse(data) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "trip report download available.",
                        "data": aObjectLevel,
                        "url": data.url
                    });
                };
                if (req.query.aggregateBy) {
                    ReportExelService.generateTripAggregationExcel(aObjectLevel, req.query.aggregateBy, req.query.clientId, TripResponse);
                } else if ((req.report_download) && (req.query.status_value == "Cancelled")) {
                    ReportExelService.generateTripCancelExcel(aObjectLevel, req.type, req.query.clientId, TripResponse);
                } else if ((req.report_download)) {
                    ReportExelService.generateTripExcel(aObjectLevel, req.type, req.clientData, TripResponse);
                } else {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "trip report data available.",
                        "data": aObjectLevel,
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
        driver_additional_cash_alloted: (tripData.additional_cash_alloted || 0),
        driver_actual_cash_alloted: (tripData.actual_cash_alloted || 0),
        total_expense: 0,
        toll_tax_total_price: 0,
        diesel_expenses_total_price: 0,
        diesel_expenses_total_litre: 0,
        additional_expenses_total_price: 0,
        penalty_total_price: 0,
        vendor_name: tripData.vendor_name,
        vendor_contact: tripData.vendor_contact ? tripData.vendor_contact : null,
        vendor: tripData.vendor,
        route_name: tripData.route ? tripData.route.route_name : undefined,
        branch: tripData.branch || tripData.gr[0].branch,
        vehicle_no: tripData.vehicle_no,
        driver_name: tripData.driver_name
    };
    newExpense.driver_cash = ((tripData.additional_cash_alloted || 0) + (tripData.actual_cash_alloted || 0));
    newExpense.isMarketVehicle = tripData.isMarketVehicle;
    newExpense.isMultiCustomer = tripData.isMultiCustomer;
    newExpense.total_weight = 0;
    newExpense.weight_unit = "tonne";

    if (newExpense.isMultiCustomer) {
        customerName = [];
        customerId = [];
        sap_id = [];
        if (tripData.gr && (tripData.gr.length > 0)) {
            for (var i = 0; i < tripData.gr.length; i++) {
                customerId.push(tripData.gr[i].customer_id);
                customerName.push(tripData.gr[i].customer_name);
                sap_id.push(tripData.gr[i].sap_id);
                if (tripData.gr[i].weight) {
                    newExpense.total_weight = (newExpense.total_weight) + (tripData.gr[i].weight);
                }
            }
        }
        newExpense.customer_id = (customerId.length > 0) ? customerId.join() : null;
        newExpense.customer_name = (customerName.length > 0) ? customerName.join() : null;
        newExpense.sap_id = (sap_id.length > 0) ? sap_id.join() : null;
    } else {
        if (tripData.gr && (tripData.gr.length > 0)) {
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

function allObjectLevel(aTrip) {
    aData = [];
    for (var i = 0; i < aTrip.length; i++) {
        aTrip[i].expenseData = prepareTripExpenseData(aTrip[i]);
        var aCustomer = [];
        var aCHA = [];
        var aBillingParty = [];
        var aContainerLine = [];
        var aGRno = [];
        var aBookingno = [];
        var aBookingType = [];
        var aBOE = [];
        var aBranch = [];
        var aContainerNo = [];
        var aContainerType = [];
        var weight = 0;
        var start_loc;
        var end_loc;
        var trip_loc;
        var rate = 0;
        var freight = 0;
        if (aTrip[i].gr && aTrip[i].gr[0]) {
            start_loc = aTrip[i].gr[0].loading_point ? aTrip[i].gr[0].loading_point.address ? aTrip[i].gr[0].loading_point.address : "NA" : "NA";
            end_loc = aTrip[i].gr[0].unloading_point ? aTrip[i].gr[0].unloading_point.address ? aTrip[i].gr[0].unloading_point.address : "NA" : "NA";
            for (var j = 0; j < aTrip[i].gr.length; j++) {
                if (aTrip[i].gr[j].customer_name) {
                    aCustomer.push(aTrip[i].gr[j].customer_name);
                };
                if (aTrip[i].gr[j].rate) {
                    rate = aTrip[i].gr[j].rate
                };
                if (aTrip[i].gr[j].freight) {
                    freight = aTrip[i].gr[j].freight
                };
                if (aTrip[i].gr[j].weight) {
                    weight += (aTrip[i].gr[j].weight);
                };
                if (aTrip[i].gr[j].cha_name) {
                    aCHA.push(aTrip[i].gr[j].cha_name);
                };
                if (aTrip[i].gr[j].shipping_line_name) {
                    aContainerLine.push(aTrip[i].gr[j].shipping_line_name);
                };
                if (aTrip[i].gr[j].billing_party_name) {
                    aBillingParty.push(aTrip[i].gr[j].billing_party_name);
                };
                if (aTrip[i].gr[j].gr_no) {
                    aGRno.push(aTrip[i].gr[j].gr_no);
                };
                if (aTrip[i].gr[j] && aTrip[i].gr[j].booking_info && aTrip[i].gr[j].booking_info.length > 0) {
                    var tempInfo = aTrip[i].gr[j].booking_info;
                    for (var t = 0; t < tempInfo.length; t++) {
                        if (tempInfo[t].booking_no) {
                            aBookingno.push(tempInfo[t].booking_no);
                        };
                        if (tempInfo[t].booking_type) {
                            aBookingType.push(tempInfo[t].booking_type);
                        };
                        if (tempInfo[t].boe_no) {
                            aBOE.push(tempInfo[t].boe_no);
                        };
                        if (tempInfo[t].branch) {
                            aBranch.push(tempInfo[t].branch);
                        };
                        /* if(tempInfo[t].cha_name){
                        	 aCHA.push(tempInfo[t].cha_name);
                         };
                         if(tempInfo[t].shipping_line_name){
                        	 aContainerLine.push(tempInfo[t].shipping_line_name);
                         };*/
                        if (tempInfo[t].container_no) {
                            aContainerNo.push(tempInfo[t].container_no);
                            aContainerType.push(tempInfo[t].container_type);
                        };
                    }
                }
            };
        };

        if ((aTrip[i].trip_start.status === false) && (aTrip[i].trip_end.status === false)) {
            trip_loc = 'Not Started Yet!';
        } else if ((aTrip[i].trip_start.status === true) && (aTrip[i].trip_end.status === false)) {
            trip_loc = aTrip[i].trip_start.address || "NA";
        } else {
            trip_loc = aTrip[i].trip_end.address || "NA";
        };

        aTrip[i].rate = rate;
        aTrip[i].weight = weight;
        aTrip[i].freight = freight;
        aTrip[i].trip_loc = trip_loc;
        aTrip[i].start_loc = start_loc;
        aTrip[i].end_loc = end_loc;
        aTrip[i].aCustomer = aCustomer.filter(onlyUnique);
        aTrip[i].aCHA = aCHA.filter(onlyUnique);
        aTrip[i].aBillingParty = aBillingParty.filter(onlyUnique);
        aTrip[i].aGRno = aGRno.filter(onlyUnique);
        aTrip[i].aBookingno = aBookingno.filter(onlyUnique);
        aTrip[i].aBOE = aBOE.filter(onlyUnique);
        aTrip[i].aBranch = aBranch.filter(onlyUnique);
        aTrip[i].aContainerLine = aContainerLine.filter(onlyUnique);
        aTrip[i].aContainerNo = aContainerNo.filter(onlyUnique);
        aTrip[i].aContainerType = aContainerType.filter(onlyUnique);
        aTrip[i].booking_type = (aBookingType && aBookingType.length > 0) ? aBookingType.filter(onlyUnique) : (aTrip[i].route && aTrip[i].route.rates && aTrip[i].route.rates.booking_type) ? [aTrip[i].route.rates.booking_type] : "";
        aData.push(aTrip[i])
    };
    return aData;
};

router.post("/bulkStatusUpdate", function (req, res, next) {
    if (!req.body.tripId || !req.body.status || !req.body.remark) {
        return res.status(200).json({
            "message": "missing Arguements"
        });
    }
    let tripId=req.body.tripId
    let arr=[]
    async.forEachSeries(tripId, (element, callback) => {
        tripService.findTripIdAsync(element).then(tripData=>{
            if (tripData) {
                if (tripData.status == req.body.status) {
                    let obj={
                        _id: element,
                        message:"already Updated"
                    }
                    arr.push(obj)
                }
                else{
                    let prepareData={
                        status: req.body.status,
                    }
                    let prepareDataPush={
                        statuses:{
                            user_id:req.user._id,
                            systemDate: new Date(),
                            status: req.body.status,
                            remarks:req.body.remarks
                        }
                    }
                    tripService.updateTripByIdAsync(element, prepareData, prepareDataPush).then(updateTrip=>{
                        if (updateTrip) {
                            let obj = {
                                _id: element,
                                message: "Updated"
                            }
                            arr.push(obj)
                            callback()
                        }
                    })
                }
            }
        })
    },(err)=>{
        return res.status(200).json({
            "status": "OK",
            "message": "Bulk Trip Updated",
            "data": arr
        });
    })
})





module.exports = router;
