/**
 * @Author: bharath
 * @Date:   2016-10-20T17:18:51+05:30
 */

 var express = require('express');
 var router = express.Router();
 var Promise = require('bluebird');
 var winston = require('winston');
 var Invoice = promise.promisifyAll(commonUtil.getModel('invoice'));
 var billsService = Promise.promisifyAll(commonUtil.getService('bills'));
 var invoiceService = promise.promisifyAll(commonUtil.getService("invoice"));
 var tripExpenseService = promise.promisifyAll(commonUtil.getService("trip_expenses"));
 var tripService = Promise.promisifyAll(commonUtil.getService('trip'));
 var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
 var tripService = Promise.promisifyAll(commonUtil.getService('trip'));

 router.get("/get", function(req, res, next) {

    invoiceService.getInvoiceAsync(req.query)
    .then(function(data) {
       data= JSON.parse(JSON.stringify(data));
        console.log("==================",data);
        if (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "invoice found",
                "data": data.data,
                "no_of_pages": data.no_of_pages,
                "count": data.count
            });
        } else {
            return res.status(200).json({
                "status": "OK",
                "message": "no invoice found",
                "data": []
            });
        }
    }).catch(next);
});

 router.get("/update", function(req, res, next) {
    //console.log('----------- ',req.query)
    invoiceService.getInvoiceAsync(req.query)
    .then(function(data) {
        if (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "invoice found",
                "data": data.data,
                "no_of_pages": data.no_of_pages,
                "count": data.count
            });
        } else {
            return res.status(200).json({
                "status": "OK",
                "message": "no invoice found",
                "data": []
            });
        }
    }).catch(next);
});
 router.get("/getBilled", function(req, res, next) {
    invoiceService.findBilledAsync(req.query)
    .then(function(data) {
        data = JSON.parse(JSON.stringify(data));
        if (data) {
            async.forEachOf(data, function(invoice, index, callback) {
                invoiceService.generateInvoiceXMLDataNewAsync(invoice)
                .then(function(a) {
                    callback();
                })
            }, function(err, proceed) {
                if (err) {
                    console.log('err', err);
                } else {
                    var billReport = {};
                    billReport.name = data;
                    ReportExelService.generateSAPBillsExcel('SAP Billing Report', billReport, {}, req.query.clientId, function(reportData) {
                        return res.status(200).json({
                            "status": "OK",
                            "message": "invoice report available for download",
                            "url": reportData.url
                        });
                    });
                        //return res.status(200).json({"status":"OK","message":"invoice found", "data": data});
                    }
                })
        } else {
            return res.status(200).json({
                "status": "OK",
                "message": "no invoice found",
                "data": []
            });
        }
    }).catch(next);
});

 router.post("/generatebill", function(req, res, next) {
    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for generate bill" });
    }
    if (!req.body.customer_id) {
        return res.status(500).json({ "status": "ERROR", "error_message": "Please provide customer_id" });
    }
    if (!req.body.invoice || req.body.invoice.length == 0) {
        return res.status(500).json({ "status": "ERROR", "error_message": "Please provide invoice to be billed" });
    }
    if (!req.body.due_date) {
        return res.status(500).json({ "status": "ERROR", "error_message": "Please provide Due Date" });
    }
    req.body.clientId = req.user.clientId;

    req.queryFilter = {};
    var $or = [];
    for (var i = 0; i < req.body.invoice.length; i++) {
        var x = {};
        x.invoice_no = req.body.invoice[i].invoice_no;
        x.trip_no = req.body.invoice[i].trip_no;
        $or.push(x);
    }
    var $and = [];
    $and.push({ clientId: req.body.clientId });
    /*$and.push({customer_id:req.body.customer_id});*/
    $and.push({ status: 'pending' });
    $and.push({ $or: $or });
    req.queryFilter.$and = $and;

    req.updateQuery = {};
    req.updateQuery.$set = {};
    idUtil.generateBillNoAsync({ clientId: req.body.clientId, bill_no: { $exists: true } })
    .then(function(bill_no) {
        if (req.body.apply_no_bill) {
            req.updateQuery.$set.status = 'no_bill';
        } else {
            req.updateQuery.$set.bill_no = bill_no;
            req.updateQuery.$set.status = 'billed';
        }
        if (req.body.billing_party_id && req.body.billing_party_id != "") {
            req.updateQuery.$set.billing_party_id = req.body.billing_party_id;
        }
        if (req.body.billing_party_gstin_no && req.body.billing_party_gstin_no != "") {
            req.updateQuery.$set.billing_party_gstin_no = req.body.billing_party_gstin_no;
        }
        if (req.body.gstin_state_code && req.body.gstin_state_code != "") {
            req.updateQuery.$set.gstin_state_code = req.body.gstin_state_code;
        }
        if (req.body.sap_id && req.body.sap_id != "") {
            req.updateQuery.$set.sap_id = req.body.sap_id;
        }
        if (req.body.billing_party_name && req.body.billing_party_name != "") {
            req.updateQuery.$set.billing_party_name = req.body.billing_party_name;
        }
        if (req.body.billing_party_name && req.body.billing_party_name != "") {
            req.updateQuery.$set.billing_party_address = req.body.billing_party_address;
        }

            //req.updateQuery.$set.status=(req.body.apply_no_bill)?'no_bill':'billed';
            req.updateQuery.$set.due_date = req.body.due_date;
            //req.updateQuery.$set.apply_gst=req.body.apply_gst;
            //req.updateQuery.$set.service_tax_percent=req.body.service_tax_percent || 0;

            //var service_tax = parseFloat((Math.round(((invoice.sub_total)*req.body.service_tax_percent/100) * 100) / 100).toFixed(2));
            //var total_expenses = parseFloat((Math.round((invoice.total +service_tax) * 100) / 100).toFixed(2));

            req.updateQuery.$set.billed_date = new Date();
            req.updateQuery.$set.billed_by = {
                date: new Date(),
                name: req.user.full_name,
                userId: req.user.userId
            };
            Invoice.updateAsync(req.queryFilter, req.updateQuery, { multi: true })
            .then(function(updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Bill Generated",
                    "data": updated
                });
            })
            .catch(next)
        })
    .catch(next);

});

 router.get("/getbill", function(req, res, next) {
    var queryFilter = {};
    if (!req.query.bill_no) {
        req.query.bill_no = { $exists: true, $ne: null };
    }
    req.query.clientId = req.user.clientId;
    invoiceService.searchBillsAsync(req.query)
    .then(function(data) {
        if (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "bill found",
                "data": data.data,
                "no_of_pages": data.no_of_pages,
                "count": data.count
            });
        } else {
            return res.status(200).json({
                "status": "OK",
                "message": "no bill found",
                "data": []
            });
        }
    })
});

 router.get("/getbill/detail", function(req, res, next) {
    if (!req.query.bill_no || req.query.bill_no == null) {
        res.status(500).json({
            "status": "ERROR",
            "message": "Please provide 'bill_no'"
        });
    }
    Invoice.findAsync({ clientId: req.user.clientId, bill_no: req.query.bill_no })
    .then(function(billData) {
        billData = JSON.parse(JSON.stringify(billData));
        billData = prepareBillData(billData);
        if (billData) {
            return res.status(200).json({
                "status": "OK",
                "message": "bill details found",
                "data": billData
            });
        } else {
            return res.status(200).json({
                "status": "OK",
                "message": "no bill found",
                "data": []
            });
        }
    })
});


router.put("/update/:_id",
    function(req, res, next) {
       if(!req.body.gr_no ){
        return res.status(500).json({ "status": "ERROR", "error_message": "GR Number Not Exist. Please Update the GR No" });
    }
    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for invoice update" });
    }
    tripService.findTripQueryAsync({trip_no:req.body.trip_no,clientId:req.body.clientId}).then(function(data){
        let da=JSON.parse(JSON.stringify(data))
          //console.log('data         ',da)
          //zconsole.log("====================",da[0].gr[0].ack_stage);
       if(da[0].gr[0].ack_stage == true ){
            return res.status(500).json({ "status": "ERROR", "error_message": "Please Acknowledge the GR First" });
        }
        else{
              //console.log('inside else         ')
           return invoiceService.findInvoicebyIdAsync({ _id: req.params._id })
        }
    }).then(function(invoice) {
          //console.log('data       invoice  ')
                if (invoice && invoice[0]) {
                    if (invoice[0].status === 'pending') {
                        req.body.clientId = req.user.clientId;
                        req.body.edited_by = invoice[0].edited_by;
                        req.body.edited_by.push({ dt: new Date(), userId: req.user.userId });
                        return next();
                    } else {
                        return res.status(500).json({ "status": "ERROR", "error_message": "Only pending invoice can update." });
                    }
                } else {
                    return res.status(500).json({ "status": "ERROR", "error_message": "invoice does not exist" });
                }
            });
           },
           function(req, res, next) {
            invoiceService.updateInvoiceAsync(req.params._id, req.body)

            .then(function(updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "invoice data has been updated successfully",
                    "data": updated
                });
            }).catch(next);
        }
        );

/*--------------------*/
router.put("/update/bill/:_id",
    function(req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for invoice update" });
        }


        // if(req.body.ack_stage = true){
        //     return res.status(500).json({ "status": "ERROR", "error_message": "Please Acknowledge the GR First" });
        // }




        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Please provide bill no." });
        }
        invoiceService.findInvoiceAsync({ clientId: req.user.clientId, bill_no: req.params._id })
        .then(function(invoice) {
            if (invoice && invoice[0]) {
                req.oUpdate = {};
                if ((invoice[0].status === 'billed') && (req.body.status === 'approved')) {
                    req.oUpdate.status = req.body.status
                    req.oUpdate.approved_by = { date: new Date(), userId: req.user.userId, name: req.user.full_name };
                    req.oUpdate.edited_by = JSON.parse(JSON.stringify(invoice[0].edited_by));
                    req.oUpdate.edited_by.push({ date: new Date(), userId: req.user.userId, name: req.user.full_name });
                    return next();
                } else if ((invoice[0].status === 'approved') && (req.body.status === 'dispatched')) {
                    req.oUpdate.status = req.body.status
                    req.oUpdate.dispatched_by = { date: new Date(), userId: req.user.userId, name: req.user.full_name };
                    req.oUpdate.edited_by = JSON.parse(JSON.stringify(invoice[0].edited_by));
                    req.oUpdate.edited_by.push({ date: new Date(), userId: req.user.userId, name: req.user.full_name });
                    return next();
                } else if (req.body.status === 'cancelled') {
                    req.oUpdate.status = req.body.status
                    req.oUpdate.cancelled_by = { date: new Date(), userId: req.user.userId, name: req.user.full_name };
                    req.oUpdate.status = req.body.status.edited_by = JSON.parse(JSON.stringify(invoice[0].edited_by));
                    req.oUpdate.status = req.body.status.edited_by.push({ date: new Date(), userId: req.user.userId, name: req.user.full_name });
                    return next();
                } else {
                    return res.status(500).json({ "status": "ERROR", "error_message": "Can not update other status" });
                }
            } else {
                return res.status(500).json({ "status": "ERROR", "error_message": "bill does not exist" });
            }
        });
    },
    function(req, res, next) {
        if (req.body.dispatch) {
            for (i in req.body.dispatch) {
                req.oUpdate[i] = req.body.dispatch[i];
            }
        }
        invoiceService.updateBillAsync({ clientId: req.user.clientId, bill_no: req.params._id }, req.oUpdate)
        .then(function(updated) {
            return res.status(200).json({
                "status": "OK",
                "message": "bill data has been updated successfully",
                "data": updated
            });
        }).catch(next);
    }
    );
/*--------------------*/

/** bill dispatch get**/
/*router.get("/bill_dispatch/get", function(req, res, next){
	invoiceService.getInvoiceAsync(req.query)
	.then(function(data){
		if(data){
			return res.status(200).json({"status":"OK",
			"message":"invoice found", "data": data.data, "no_of_pages": data.no_of_pages});
		}else{
			return res.status(200).json({"status":"OK",
			"message":"no invoice found", "data":[]});
		}
	}).catch(next);
});

router.put("/bill_dispatch/update/:_id",
	function(req,res,next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body for invoice update"});
		}
		invoiceService.findInvoicebyIdAsync({_id:req.params._id})
			.then(function (invoice) {
				if (invoice && invoice[0]) {
					if(invoice[0].status === 'approved' && req.body.status && !(req.body.status === 'cancelled')){
						return res.status(500).json({"status": "ERROR", "error_message": "Can not edit approved invoice"});
					}
					if(req.body.status === 'approved'){
						req.body.approved_by = {dt: new Date, userId: req.user.userId};
					}
					req.body.clientId = req.user.clientId;
					req.body.edited_by = invoice[0].edited_by;
					req.body.edited_by.push({dt: new Date(), userId: req.user.userId});
					return next();
				} else {
					return res.status(500).json({"status": "ERROR", "error_message": "invoice does not exist"});
				}
			});
	},
	function(req,res,next){
		invoiceService.updateInvoiceAsync(req.params._id, req.body)
			.then(function(updated){
				return res.status(200).json({"status":"OK",
					"message":"invoice data has been updated successfully",
					"data":updated});
			}).catch(next);
	}
    );*/

// CUSTOMER PAYMENT INFORMATION
router.get("/customer_pay_get", function(req, res, next) {
    invoiceService.getInvoiceAsync(req.query)
    .then(function(data) {
        if (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "customer payment info found",
                "data": data.data,
                "no_of_pages": data.no_of_pages
            });
        } else {
            return res.status(200).json({
                "status": "OK",
                "message": "no customer payment info found",
                "data": []
            });
        }
    }).catch(next);
});

router.put("/customer_pay_update/:_id",
    function(req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for invoice update" });
        }
        invoiceService.findInvoicebyIdAsync({ _id: req.params._id })
        .then(function(invoice) {
            if (invoice && invoice[0]) {
                req.body.clientId = req.user.clientId;
                req.body.edited_by = invoice[0].edited_by;
                req.body.edited_by.push({ dt: new Date(), userId: req.user.userId });
                return next();
            } else {
                return res.status(500).json({ "status": "ERROR", "error_message": "invoice does not exist" });
            }
        });
    },
    function(req, res, next) {
        var oUpdate = {};
        if (req.body.payment) {
            oUpdate.payment = req.body.payment;
            invoiceService.updateInvoiceAsync(req.params._id, oUpdate)
            .then(function(updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "customer payment data has been updated successfully",
                    "data": updated
                });
            }).catch(next);
        } else {
            return res.status(200).json({
                "status": "OK",
                "message": "no payment data found."
            });
        }
    }
    );

//**********************************************************************************************************
router.put("/update_trip_invoice_expense/:_id",
    function(req, res, next) {

        //console.log("ppppppppppppppppppppppp",req.body);


        if(req.body.gr_no ){
            return res.status(500).json({ "status": "ERROR", "error_message": "GR Number Not Exist. Please Update the GR No" });
        }


    // if(!req.body.ack_stage === true ){
    //         return res.status(500).json({ "status": "ERROR", "error_message": "Please Acknowledge the GR First" });
    //     }


    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for invoice update" });
    }
    if (otherUtil.isEmptyObject(req.params)) {
        return res.status(500).json({ "status": "ERROR", "error_message": "Nothing in body for invoice update" });
    }
    req.updated_Response = { "status": "OK", "message": "Service initiated. " };

    if (req.body.gr && req.body.gr_data && req.body.gr_data.query && req.body.gr_data.query.gr_id && req.body.gr_data.query.trip_no) {
        var oQuery = { clientId: req.user.clientId, trip_no: req.body.gr_data.query.trip_no, "gr.gr_id": req.body.gr_data.query.gr_id };
        var oGR = req.body.gr_data.to_update;
        var oUpdate = { "gr.$.ack_stage": false };
        if (oGR.place) {
            oUpdate["gr.$.place"] = oGR.place;
        }
        if (oGR.branch) {
            oUpdate["gr.$.branch"] = oGR.branch;
        }
        if (oGR.courier_name) {
            oUpdate["gr.$.courier_name"] = oGR.courier_name;
        }
        if (oGR.courier_id) {
            oUpdate["gr.$.courier_id"] = oGR.courier_id;
        }
        if (oGR.courier_office) {
            oUpdate["gr.$.courier_office"] = oGR.courier_office;
        }
        if (oGR.courier_date) {
            oUpdate["gr.$.courier_date"] = oGR.courier_date;
        }
        if (oGR.receiving_date) {
            oUpdate["gr.$.receiving_date"] = oGR.receiving_date;
        }
        if (oGR.driver_name) {
            oUpdate["gr.$.driver_name"] = oGR.driver_name;
        }
        if (oGR.driver_id) {
            oUpdate["gr.$.driver_id"] = oGR.driver_id;
        }
        if (oGR.branch_id) {
            oUpdate["gr.$.branch_id"] = oGR.branch_id;
        }
        if (oGR.empl_name) {
            oUpdate["gr.$.empl_name"] = oGR.empl_name;
        }
        if (oGR.empl_id) {
            oUpdate["gr.$.empl_id"] = oGR.empl_id;
        }
        tripService.updateTripByFilterAsync(oQuery, oUpdate)
        .then(function(updated) {
            req.updated_Response.message = req.updated_Response.message + "GR data has been updated successfully. "
            req.updated_Response.gr_response = updated;

            return next();
        }).catch(next)
    } else {
        return next();
    }
},


function(req, res, next) {

    if (req.body.invoice && req.body.invoice_data && req.body.invoice_data.query && req.body.invoice_data.query._id ) {
        invoiceService.findInvoicebyIdAsync({ _id: req.body.invoice_data.query._id })
        .then(function(invoice) {
            if (invoice && invoice[0]) {
                var oInvoice = req.body.invoice_data.to_update;
                oInvoice.clientId = req.user.clientId;
                oInvoice.edited_by = invoice[0].edited_by;
                oInvoice.edited_by.push({ dt: new Date(), userId: req.user.userId });

                        //*************************************
                        var no_of_items = oInvoice.booking_info.length;
                        var aBooking_Info = oInvoice.booking_info;
                        var aTempBooking_info = [];
                        for (var i = 0; i < no_of_items; i++) {
                            var oBooking_info = aBooking_Info[i];
                            oBooking_info.gr_charges = parseFloat(((oInvoice.gr_charges || 0) / no_of_items).toFixed(2)),
                            oBooking_info.weightman_charges = parseFloat(((oInvoice.weightman_charges || 0) / no_of_items).toFixed(2)),
                            oBooking_info.loading_charges = parseFloat(((oInvoice.loading_charges || 0) / no_of_items).toFixed(2)),
                            oBooking_info.unloading_charges = parseFloat(((oInvoice.unloading_charges || 0) / no_of_items).toFixed(2)),
                            oBooking_info.munshiyana_charges = parseFloat(((oInvoice.munshiyana_charges || 0) / no_of_items).toFixed(2)),
                            oBooking_info.other_charges = parseFloat(((oInvoice.other_charges || 0) / no_of_items).toFixed(2)),
                            oBooking_info.off_ld_chrgs = ((parseFloat(((oInvoice.loading_charges || 0) / no_of_items).toFixed(2)) || 0) + (parseFloat(((oInvoice.unloading_charges || 0) / no_of_items).toFixed(2)) || 0)),
                                //****
                                aTempBooking_info.push(oBooking_info);
                            }

                        //*************************************
                        oInvoice.booking_info = aTempBooking_info;
						oInvoice.ack_stage = false;
                        delete oInvoice._id;
                        //Database Call Service
                        invoiceService.updateInvoiceAsync(req.body.invoice_data.query._id, oInvoice)
                        .then(function(updated) {
                            req.updated_Response.message = req.updated_Response.message + "Invoice data has been updated successfully. "
                            req.updated_Response.invoice_response = updated;
                            return next();
                        }).catch(next);
                    } else {
                        req.updated_Response.message = req.updated_Response.message + "Invoice does not exist. "
                        return next();
                    }
                });
    } else {
        return next();
    }
},
function(req, res, next) {
    if (req.body.expense && req.body.expense_data && req.body.expense_data.query && req.body.expense_data.query._id) {
        tripExpenseService.findTripExpenseIdAsync({ _id: req.body.expense_data.query._id })
        .then(function(expense) {
            if (expense && expense[0]) {
                var oExpense = req.body.expense_data.to_update;
                delete oExpense._id;
                        //Database Call Service
                        tripExpenseService.updateTripExpenseAsync(req.body.expense_data.query._id, oExpense)
                        .then(function(updated) {
                            req.updated_Response.message = req.updated_Response.message + "Expense data has been updated successfully. "
                            req.updated_Response.expense_response = updated;
                            return next();
                        }).catch(next);
                    } else {
                        req.updated_Response.message = req.updated_Response.message + "Expense does not exist."
                        return next();
                    }
                });
    } else {
        return next();
    }
},
function(req, res, next) {
	if ((req.body.grInvoiceAck && req.body.grInvoiceAck.query)) {
		invoiceService.updateInvoiceByQueryAsync(req.body.grInvoiceAck.query,req.body.grInvoiceAck.update)
			.then(function(updatedTrip) {
				return next();
			}).catch(next)
	} else {
		return next();
	}

},
function(req, res, next) {
    if (!(req.body.gr || req.body.invoice || req.body.expense)) {
        tripService.updateTripByFilterAsync({ clientId: req.user.clientId, trip_no: parseInt(req.params._id), "gr.gr_id": req.body.gr_id }, { "gr.$.ack_stage": false })
        .then(function(updatedTrip) {
            return res.status(200).json(req.updated_Response);
        }).catch(next)
    } else {
        return res.status(200).json(req.updated_Response);
    }

}
);

function prepareBillData(billData) {
    var newBill;
    for (var i = 0; i < billData.length; i++) {
        var oBill = billData[i];
        billData[i].booking_info[0].invoice_date = oBill.invoice_date;
        billData[i].booking_info[0].invoice_no = oBill.invoice_no;
        billData[i].booking_info[0]._id = oBill._id;
        billData[i].booking_info[0].invoice_date = oBill.invoice_date;
        if (i == 0) {
            newBill = oBill;
            if (i == (billData.length - 1)) {
                //newBill.service_tax = parseFloat((Math.round(((newBill.total_expenses)*oBill.service_tax_percent/100) * 100) / 100).toFixed(2));
                //newBill.total_expenses = parseFloat((Math.round((newBill.total_expenses +newBill.service_tax) * 100) / 100).toFixed(2));
            }
        } else {
            newBill.sub_total = newBill.sub_total + oBill.sub_total;
            newBill.total_expenses = newBill.total_expenses + oBill.total_expenses;
            newBill.booking_info.push(oBill.booking_info[0])
            if (i == (billData.length - 1)) {
                //newBill.service_tax = parseFloat((Math.round(((newBill.total_expenses)*oBill.service_tax_percent/100) * 100) / 100).toFixed(2));
                //newBill.total_expenses = parseFloat((Math.round((newBill.total_expenses +newBill.service_tax) * 100) / 100).toFixed(2));
            }
        }
    }
    return newBill;
};

router.put("/resetBill/:bill_no",function(req, res, next) {
	if(!req.params.bill_no){
		return res.status(500).json({ "status": "ERROR", "error_message": "Please provide bill number." });
	}
	invoiceService.findInvoiceAsync({bill_no:req.params.bill_no,clientId:req.user.clientId}).then(function(billData){
		if(billData && billData[0]){
			var parsedBillData = JSON.parse(JSON.stringify(billData));
			invoiceService.resetBillAsync({bill_no:req.params.bill_no,clientId:req.user.clientId})
				.then(function (resetData) {
					if(resetData){
						return res.status(200).json({"status":"OK",
							"message":"bill reset successfully",
							"data":resetData
						});
					}else {
						return res.status(500).json({ "status": "ERROR", "error_message": "bill reset failed." });
					}
				}).catch(next)
		}else {
			return res.status(404).json({ "status": "ERROR", "message": "bill not found." });
		}
	}).catch(next)
}
);

module.exports = router;
