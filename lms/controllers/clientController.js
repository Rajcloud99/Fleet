/**
 * Created by manish on 9/8/16.
 */
var Promise = require('bluebird');
var router = express.Router();
var ClientService = promise.promisifyAll(commonUtil.getService('client'));
var userService = promise.promisifyAll(commonUtil.getService('user'));
var TripService = promise.promisifyAll(commonUtil.getService('trip'));
var ClientConf = promise.promisifyAll(commonUtil.getModel('clientConfig'));
var _ = require('lodash');

var validateSuperAdmin = function (req, res) {
    if (req.body.clientId == config.super_admin_id || req.query.clientId == config.super_admin_id) {
        return;
    }
    else {
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
}


router.post("/add",
	/***Append some variables basis super client/normal client ***/
	function (req, res, next) {
		req.body.password = req.body.password || 'admin';
		if (req.isAdminKeyOperation) {
			req.body.client_theme_color = config.super_admin_theme_color;
			req.body.clientId = config.super_admin_id;
			req.body.client_full_name = config.super_admin_name;
			req.body.client_display_name = config.super_admin_name;
			return next();
		} else {
			if (otherUtil.validateSuperAdmin(req, res)) {
				return res.status(500).json({
					"status": "ERROR",
					"error_message": "Access Denied!!"
				});
			}
			counterUtil.getLastAddedClientId(function (err, clientId) {
				if (err) return next(err);
				req.body.clientId = parseInt(clientId) + 100;
				return next();
			});
		}
	},
	/***Find client if it exists already. Skip for admin key operation***/
	function (req, res, next) {

		ClientService.findClientByQueryAsync({"client_full_name": req.body.client_full_name})
			.then(function (client) {
				if (client && client[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"error_message": "Client with this name already exists"
					});
				} else {
					return next();
				}
			}).catch(next)

	},
	function (req, res, next) {
		ClientService.addClientAsync(req.body)
			.then(function (client) {
				if (!client) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Some error occurred in client registration process"
					});
				}
				if (client) {
					let reqBody = {clientId: req.body.clientId, name: req.body.client_full_name};
					reqBody.config = {
						"Doc": {
							"driver": {
								"photo": {
									"ext": [
										"image/*",
										"application/pdf"
									],
									"size": Number(200),
									"max": 1,
									"name": "Driver Photo"
								},
								"address_proof_front_copy": {
									"ext": [
										"image/*",
										"application/pdf"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Address Proof Front Copy"
								},
								"address_proof_back_copy": {
									"ext": [
										"image/*",
										"application/pdf"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Address Proof Back Copy"
								},
								"license_front_copy": {
									"ext": [
										"image/*",
										"application/pdf"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "License Front Copy"
								},
								"license_back_copy": {
									"ext": [
										"image/*",
										"application/pdf"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "License Back Copy"
								},
								"other": {
									"ext": [
										"image/*",
										"application/pdf"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Other"
								}
							},
							"customer": {
								"other": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Other"
								},
								"GSTIN": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "GSTIN"
								},
								"PANCard": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "PAN Card"
								},
								"NewCustAdoption": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "New Customer adoption"
								},
								"NonPlacementClause": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Non Placement clause"
								},
								"detentionClause": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Detention Clause"
								},
								"dieselEscalation": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Diesel escalation"
								},
								"contractRate": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Contract Rate"
								}
							},
							"regVehicle": {
								"other": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Other"
								},
								"roadTax": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Road Tax"
								},
								"puc": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "PUC"
								},
								"insurance": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Insurance"
								},
								"fitness": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "FITNESS"
								},
								"permit": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "PERMIT"
								},
								"rc": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "RC"
								}
							},
							"vendor": {
								"other": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Other"
								},
								"loadingSlip": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Loading Slip"
								},
								"cancelCheque": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Cancel cheque"
								},
								"TDS": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "TDS Declaration"
								},
								"PanCard": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "PAN Card"
								},
								"aadharCard": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Aadhar Card"
								},
								"adoptionForm": {
									"ext": [
										"image/*",
										"application/pdf"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Vendor adoption form"
								}
							},
							"gr": {
								"misc": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(1),
									"name": "Misc"
								},
								"insur": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(1),
									"name": "Goods Insurance"
								},
								"eway": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Eway Bill"
								},
								"invoice": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Invoice"
								},
								"grBack": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Gr Back"
								},
								"grFront": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Gr Front"
								},
								"back": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Pod Back"
								},
								"front": {
									"ext": [
										"image/*"
									],
									"size": Number(200),
									"max": Number(2),
									"name": "Pod Front"
								}
							},
							"trip": {
								"misc": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Misc"
								},
								"upVeh": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Photo of Uploaded Vehicle"
								},
								"driver": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Photo of Driver"
								},
								"form15": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Form 15 I"
								},
								"drAadhar": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(2),
									"name": "Driver Aadhar Card"
								},
								"panOwner": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Pan Card of Owner"
								},
								"chalan": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Loading Slip/Chalan"
								},
								"permit": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "National Permit"
								},
								"fitness": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Fitness"
								},
								"insurance": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Insurance"
								},
								"dl": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "Driving License"
								},
								"rc": {
									"ext": [
										"image/*"
									],
									"size": Number(500),
									"max": Number(1),
									"name": "RC"
								}
							}
						},
						"vendorDeal": {
							"multiPayment" : true,
							"accountCr" : "vendor",
							"paymentRef" : false,
							"pmt" : true,
							"payRefNo" : true
						},
						"formula": {
							"Total With Munshiyana" : " total_expense + munshiyana "
						},
						"client_allowed": [
							{
								"_woAccName": "Advance",
								"_woAcc": "",
								"_adjAccName": "Adjustment acc",
								"_adjAcc": "",
								"_sgstAccName": "SGST",
								"_sgstAcc": "",
								"_cgstAccName": "CGST",
								"_cgstAcc": "",
								"_igstAccName": "IGST",
								"_igstAcc": "",
								"_salesAccName": "Sales Account",
								"_salesAcc": "",
								"_state_code": "27",
								"name": req.body.client_full_name,
								"clientId": req.body.clientId
							}
						],
						"tally": {
							"v": "ERP 9 (6.4.5)",
							"name": req.body.client_full_name
						},
						"driverPayments": {
							"branch" : {

							},
							"cashbook" : {

							},
							"aDriverPaymentType": [
								{
									"toGroup": [
										"Driver"
									],
									"fromGroup": [
										"Internal Cashbook"
									],
									"voucherType": [
										"Payment"
									],
									"pType": "Driver Payment(Dr)"
								},
								{
									"toGroup": [
										"Driver"
									],
									"fromGroup": [
										"Driver"
									],
									"voucherType": [
										"Journal",
										"Contra"
									],
									"pType": "Driver to Driver"
								},
								{
									"toGroup": [
										"Internal Cashbook"
									],
									"fromGroup": [
										"Driver"
									],
									"voucherType": [
										"Journal",
										"Contra"
									],
									"pType": "Driver Repay (Cr)"
								}
							]
						},
						"aDriverPaymentType": [
							{
								"toGroup": [
									"Driver"
								],
								"fromGroup": [
									"Internal Cashbook"
								],
								"voucherType": [
									"Payment"
								],
								"pType": "Driver Payment"
							},
							{
								"toGroup": [
									"Driver"
								],
								"fromGroup": [
									"Driver"
								],
								"voucherType": [
									"Journal",
									"Contra"
								],
								"pType": "Driver to Driver"
							},
							{
								"toGroup": [
									"Internal Cashbook"
								],
								"fromGroup": [
									"Driver"
								],
								"voucherType": [
									"Journal",
									"Contra"
								],
								"pType": "Driver Repay"
							}
						],
						"clientR": [],
						"GR": {
							"manualGr" : true,
							"maxAllowedFreight": Number(3000000),
							"config": {
								"branch": {
									"label": "Branch",
									"ourLabel": "Branch",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"gr_type": {
									"label": "Gr Type",
									"ourLabel": "Gr Type",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"grNumber": {
									"label": "Gr Number",
									"ourLabel": "Gr Number",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"grDate": {
									"label": "Gr Date",
									"ourLabel": "Gr Date",
									"type": "__date__",
									"visible": true,
									"editable": true,
									"req": true
								},
								"grRemarks": {
									"label": "Gr Remark",
									"ourLabel": "Gr Remark",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"customer": {
									"label": "Customer",
									"ourLabel": "Customer",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"consignor": {
									"label": "Consignor",
									"ourLabel": "Consignor",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"consignee": {
									"label": "Consignee",
									"ourLabel": "Consignee",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"billingParty": {
									"label": "Billing Party",
									"ourLabel": "Billing Party",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"payment_basis": {
									"label": "Payment Basis",
									"ourLabel": "Payment Basis",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"payment_type": {
									"label": "Payment Type",
									"ourLabel": "Payment Type",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"container": {
									"label": "Container",
									"ourLabel": "Container",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"internal_rate": {
									"label": "Internal Rate",
									"ourLabel": "Internal Rate",
									"type": "string",
									"visible": false,
									"editable": true
								},
								"loadingArrivalTime": {
									"label": "Loading Arrival",
									"ourLabel": "Loading Arrival",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"billingLoadingTime": {
									"label": "Loading End",
									"ourLabel": "Loading End",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"unloadingArrivalTime": {
									"label": "Unloading Arrival",
									"ourLabel": "Unloading Arrival",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"billingUnloadingTime": {
									"label": "Unloading End",
									"ourLabel": "Unloading End",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"standardDays": {
									"label": "Standard Days",
									"ourLabel": "Standard Days",
									"type": "string",
									"visible": false,
									"editable": true
								},
								"chargeableDays": {
									"label": "Chargeable Days",
									"ourLabel": "Chargeable Days",
									"type": "string",
									"visible": false,
									"editable": true
								},
								"source": {
									"label": "Source",
									"ourLabel": "Source",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"destination": {
									"label": "Destination",
									"ourLabel": "Destination",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"destinationState": {
									"label": "Destination State",
									"ourLabel": "Destination State",
									"type": "string",
									"visible": false,
									"editable": true
								},
								"billedSource": {
									"label": "Billed Source",
									"ourLabel": "Billed Source",
									"type": "string",
									"visible": false,
									"editable": true,
									"req": false
								},
								"billedDestination": {
									"label": "Billed Destination",
									"ourLabel": "Billed Destination",
									"type": "string",
									"visible": false,
									"editable": true,
									"req": false
								},
								"arRemark": {
									"label": "POD Remark",
									"ourLabel": "POD Remark",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"isGrBillable": {
									"label": "Is Gr Billable",
									"ourLabel": "Is Gr Billable",
									"type": "checkbox",
									"visible": true,
									"editable": true,
									"req": true
								},
								"totFreight": {
									"label": "Trip Total Freight",
									"ourLabel": "Trip Total Freight",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"totFreightWithCharges": {
									"label": "Trip Total Freight with Charges",
									"ourLabel": "Trip Total Freight with Charges",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"totQty": {
									"label": "Trip Total Qty",
									"ourLabel": "Trip Total Qty",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"showOnBill": {
									"label": "Show On Bill",
									"ourLabel": "Show On Bill",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"materialName": {
									"label": "Material",
									"ourLabel": "Material",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": true
								},
								"materialUnit": {
									"label": "Material Unit",
									"ourLabel": "Material Unit",
									"type": "string",
									"visible": true,
									"editable": true
								},
								"invoiceNo": {
									"label": "Invoice No.",
									"ourLabel": "Invoice No.",
									"type": "string",
									"visible": true,
									"editable": true,
									"req": false
								},
								"invoiceRate": {
									"label": "Invoice Rate",
									"ourLabel": "Invoice Rate",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"invoiceAmt": {
									"label": "Invoice Amount",
									"ourLabel": "Invoice Amount",
									"type": "number",
									"visible": true,
									"editable": true,
									"req": false
								},
								"invoiceDate": {
									"label": "Invoice Date",
									"ourLabel": "Invoice Date",
									"type": "__date__",
									"visible": true,
									"editable": true,
									"req": false
								},
								"insurRate": {
									"label": "Insurance Rate",
									"ourLabel": "Insurance Rate",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"insurVal": {
									"label": "Insurance Value",
									"ourLabel": "Insurance Value",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"loadRefNumber": {
									"label": "Load Ref. Number",
									"ourLabel": "Load Ref. Number",
									"type": "string",
									"visible": false,
									"editable": true
								},
								"routeDistance": {
									"label": "Km",
									"ourLabel": "Km",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"rate": {
									"label": "Rate",
									"ourLabel": "Rate",
									"type": "number",
									"visible": true,
									"editable": true,
									"req": true
								},
								"billingRate": {
									"label": "Billing Rate",
									"ourLabel": "Billing Rate",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"weightPerUnit": {
									"label": "Actual Weight",
									"ourLabel": "Actual Weight",
									"type": "number",
									"visible": true,
									"editable": true,
									"req": true
								},
								"billingWeightPerUnit": {
									"label": "Billing Weight",
									"ourLabel": "Billing Weight",
									"type": "number",
									"visible": true,
									"editable": true,
									"req": true
								},
								"capacity": {
									"label": "Capacity",
									"ourLabel": "Capacity",
									"type": "number",
									"visible": false,
									"editable": false,
									"customValue": true,
									"req": false
								},
								"noOfUnits": {
									"label": "Actual Unit",
									"ourLabel": "Actual Unit",
									"type": "number",
									"visible": true,
									"editable": true,
									"req": true
								},
								"billingNoOfUnits": {
									"label": "Billing Unit",
									"ourLabel": "Billing Unit",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"freight": {
									"label": "Freight",
									"ourLabel": "Freight",
									"type": "computable",
									"visible": true,
									"editable": true,
									"req": true,
									"expression": [
										"Rate",
										"*",
										"Billing Weight"
									],
									"evalExp": [
										"rate",
										"*",
										"billingWeightPerUnit"
									],
									"postfixExp": [
										"rate",
										"billingWeightPerUnit",
										"*"
									]
								},
								"invPayBasis": {
									"label": "Pay. Basis",
									"ourLabel": "Pay. Basis",
									"type": "string",
									"visible": false,
									"editable": false
								},
								"ref1": {
									"label": "Size",
									"ourLabel": "Item Ref 1",
									"type": "string",
									"visible": true,
									"editable": true
								},
								"ref2": {
									"label": "Lot No",
									"ourLabel": "Item Ref 2",
									"type": "string",
									"visible": true,
									"editable": true
								},
								"ref3": {
									"label": "B/E NO",
									"ourLabel": "Item Ref 3",
									"type": "string",
									"editable": true,
									"visible": true
								},
								"ref4": {
									"label": "Item Ref 4",
									"ourLabel": "Item Ref 4",
									"type": "string",
									"editable": false,
									"visible": false
								},
								"ref5": {
									"label": "Item Ref 5",
									"ourLabel": "Item Ref 5",
									"type": "string",
									"editable": true
								},
								"ref6": {
									"label": "Item Ref 6",
									"ourLabel": "Item Ref 6",
									"type": "string",
									"editable": true
								},
								"num1": {
									"label": "Num 1",
									"ourLabel": "Num 1",
									"type": "number",
									"editable": true
								},
								"num2": {
									"label": "Num 2",
									"ourLabel": "Num 2",
									"type": "number",
									"editable": true
								},
								"num3": {
									"label": "Num 3",
									"ourLabel": "Num 3",
									"type": "number",
									"editable": true
								},
								"basicFreight": {
									"label": "Basic Freight",
									"ourLabel": "Basic Freight",
									"type": "number",
									"visible": true,
									"editable": true
								},
								"num4": {
									"label": "Labour Base Value",
									"ourLabel": "Base Value 1",
									"type": "number",
									"editable": true,
									"visible": true
								},
								"num5": {
									"label": "Base Value 5",
									"ourLabel": "Base Value 5",
									"type": "number",
									"editable": true
								},
								"num6": {
									"label": "Base Value 6",
									"ourLabel": "Base Value 6",
									"type": "number",
									"editable": true
								},
								"grCharges": {
									"label": "Challan Charges",
									"ourLabel": "Gr Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": true,
									"editable": true,
									"req": false
								},
								"surCharges": {
									"label": "Surcharge",
									"ourLabel": "Surcharge",
									"notApplyTax": false,
									"type": "number",
									"visible": true,
									"editable": true
								},
								"cartageCharges": {
									"label": "Cartage Charge",
									"ourLabel": "Cartage Charge",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"labourCharges": {
									"label": "Labour Charge",
									"ourLabel": "Labour Charge",
									"notApplyTax": false,
									"type": "number",
									"visible": true,
									"editable": false,
									"req": false,
									"expression": [
										"Billing Weight",
										"*",
										"Labour Base Value"
									],
									"evalExp": [
										"billingWeightPerUnit",
										"*",
										"num4"
									],
									"postfixExp": [
										"billingWeightPerUnit",
										"num4",
										"*"
									]
								},
								"prevFreightCharges": {
									"label": "Prev Freight Charge",
									"ourLabel": "Prev Freight Charge",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"discount": {
									"label": "Discount",
									"ourLabel": "Discount",
									"type": "number",
									"deduction": true,
									"visible": false,
									"editable": true
								},
								"loading_charges": {
									"label": "Loading Charges",
									"ourLabel": "Loading Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"unloading_charges": {
									"label": "Unloading Charges",
									"ourLabel": "Unloading Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"weightman_charges": {
									"label": "Weightman Charges",
									"ourLabel": "Weightman Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"overweight_charges": {
									"label": "Overweight Charges",
									"ourLabel": "Overweight Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"advance_charges": {
									"label": "Advance Charges",
									"ourLabel": "Advance Charges",
									"notApplyTax": true,
									"type": "number",
									"deduction": true,
									"visible": true,
									"editable": true
								},
								"damage": {
									"label": "Damage Charges",
									"ourLabel": "Damage Charges",
									"type": "number",
									"deduction": true,
									"visible": false,
									"editable": true
								},
								"detentionLoading": {
									"label": "Loading Detention",
									"ourLabel": "Loading Detention",
									"type": "number",
									"deduction": true,
									"visible": true,
									"editable": true,
									"req": false
								},
								"detentionUnloading": {
									"label": "Unloading Detention",
									"ourLabel": "Unloading Detention",
									"type": "number",
									"deduction": true,
									"visible": true,
									"editable": true,
									"req": false
								},
								"incentivePercent": {
									"label": "Incentive Percent",
									"ourLabel": "Incentive Percent",
									"type": "number",
									"visible": false
								},
								"incentive": {
									"label": "Incentive",
									"ourLabel": "Incentive",
									"notApplyTax": false,
									"type": "number",
									"visible": false
								},
								"shortage": {
									"label": "Shortage Charges",
									"ourLabel": "Shortage Charges",
									"type": "number",
									"deduction": true,
									"visible": true,
									"editable": true
								},
								"penalty": {
									"label": "Penalty Charges",
									"ourLabel": "Penalty Charges",
									"type": "number",
									"deduction": true,
									"visible": false,
									"editable": true
								},
								"other_charges": {
									"label": "Other Charges",
									"ourLabel": "Other Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": true,
									"editable": true,
									"req": false
								},
								"extra_running": {
									"label": "Extra Charges",
									"ourLabel": "Extra Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"dala_charges": {
									"label": "Dala Charges",
									"ourLabel": "Dala Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"kanta_charges": {
									"label": "Kanta Charges",
									"ourLabel": "Kanta Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": true,
									"editable": true
								},
								"factory_halt": {
									"label": "Factory Halt",
									"ourLabel": "Factory Halt",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"company_halt": {
									"label": "Company Halt",
									"ourLabel": "Company Halt",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"toll_charges": {
									"label": "Toll Charges",
									"ourLabel": "Toll Charges",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"green_tax": {
									"label": "Green Tax",
									"ourLabel": "Green Tax",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"ttDelay": {
									"label": "TT Delay",
									"ourLabel": "TT Delay",
									"type": "number",
									"deduction": true,
									"visible": false,
									"editable": true
								},
								"twoPtDelivery": {
									"label": "Two Point Delivery",
									"ourLabel": "Two Point Delivery",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"diesel_charges": {
									"label": "Diesel Charge",
									"ourLabel": "Diesel Charge",
									"notApplyTax": false,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"diesel_index": {
									"label": "Diesel Index",
									"ourLabel": "Diesel Index",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"freightWithDiesel": {
									"label": "Basic Freight(Diesel)",
									"ourLabel": "Basic Freight(Diesel)",
									"notApplyTax": false,
									"type": "computable",
									"visible": false,
									"editable": false
								},
								"isSupplementaryShow": {
									"label": "Is Supplementary Show",
									"ourLabel": "Is Supplementary Show",
									"notApplyTax": false,
									"type": "checkbox",
									"visible": false,
									"editable": true
								},
								"suppRate": {
									"label": "Supp Rate",
									"ourLabel": "Supp Rate",
									"type": "number",
									"isSupplymentry": true,
									"modelKey": "rate",
									"visible": false,
									"editable": true
								},
								"suppRouteDistance": {
									"label": "Supp Route Distance",
									"ourLabel": "Supp Route Distance",
									"type": "number",
									"isSupplymentry": true,
									"modelKey": "routeDistance",
									"visible": false,
									"editable": false
								},
								"suppIncentivePercent": {
									"label": "Supp Incentive Percent",
									"ourLabel": "Supp Incentive Percent",
									"isSupplymentry": true,
									"type": "number",
									"visible": false
								},
								"suppGrCharges": {
									"label": "Supp Gr Charges",
									"ourLabel": "Supp Gr Charges",
									"isSupplymentry": true,
									"modelKey": "grCharges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppTtDelay": {
									"label": "Supp TT Delay",
									"ourLabel": "Supp TT Delay",
									"isSupplymentry": true,
									"modelKey": "ttDelay",
									"deduction": true,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppSurCharges": {
									"label": "Supp SurCharges",
									"ourLabel": "Supp SurCharges",
									"isSupplymentry": true,
									"modelKey": "surCharges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppCartageCharges": {
									"label": "Supp Cartage Charge",
									"ourLabel": "Supp Cartage Charge",
									"isSupplymentry": true,
									"modelKey": "cartageCharges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppLabourCharges": {
									"label": "Supp Labour Charge",
									"ourLabel": "Supp Labour Charge",
									"isSupplymentry": true,
									"modelKey": "labourCharges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppPrevFreightCharges": {
									"label": "Supp Prev Freight Charge",
									"ourLabel": "Supp Prev Freight Charge",
									"isSupplymentry": true,
									"modelKey": "prevFreightCharges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppDiscount": {
									"label": "Supp Discount",
									"ourLabel": "Supp Discount",
									"isSupplymentry": true,
									"modelKey": "discount",
									"deduction": true,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppLoading_charges": {
									"label": "Supp Loading Charges",
									"ourLabel": "Supp Loading Charges",
									"isSupplymentry": true,
									"modelKey": "loading_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppUnloading_charges": {
									"label": "Supp Unloading Charges",
									"ourLabel": "Supp Unloading Charges",
									"isSupplymentry": true,
									"modelKey": "unloading_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppWeightman_charges": {
									"label": "Supp Weightman Charges",
									"ourLabel": "Supp Weightman Charges",
									"isSupplymentry": true,
									"modelKey": "weightman_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppOverweight_charges": {
									"label": "Supp Overweight Charges",
									"ourLabel": "Supp Overweight Charges",
									"isSupplymentry": true,
									"modelKey": "overweight_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppAdvance_charges": {
									"label": "Supp Advance Charges",
									"ourLabel": "Supp Advance Charges",
									"isSupplymentry": true,
									"modelKey": "advance_charges",
									"deduction": true,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppDamage": {
									"label": "Supp Damage Charges",
									"ourLabel": "Supp Damage Charges",
									"isSupplymentry": true,
									"modelKey": "damage",
									"deduction": true,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppIncentive": {
									"label": "Supp Incentive",
									"ourLabel": "Supp Incentive",
									"isSupplymentry": true,
									"modelKey": "incentive",
									"type": "number",
									"visible": false
								},
								"suppShortage": {
									"label": "Supp Shortage Charges",
									"ourLabel": "Supp Shortage Charges",
									"isSupplymentry": true,
									"modelKey": "shortage",
									"deduction": true,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppPenalty": {
									"label": "Supp Penalty Charges",
									"ourLabel": "Supp Penalty Charges",
									"isSupplymentry": true,
									"modelKey": "penalty",
									"deduction": true,
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppOther_charges": {
									"label": "Supp Other Charges",
									"ourLabel": "Supp Other Charges",
									"isSupplymentry": true,
									"modelKey": "other_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppExtra_running": {
									"label": "Supp Extra Charges",
									"ourLabel": "Supp Extra Charges",
									"isSupplymentry": true,
									"modelKey": "extra_running",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppDala_charges": {
									"label": "Supp Dala Charges",
									"ourLabel": "Supp Dala Charges",
									"isSupplymentry": true,
									"modelKey": "dala_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppKanta_charges": {
									"label": "Supp Kanta Charges",
									"ourLabel": "Supp Kanta Charges",
									"isSupplymentry": true,
									"modelKey": "kanta_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppFactory_halt": {
									"label": "Supp Factory Halt",
									"ourLabel": "Supp Factory Halt",
									"isSupplymentry": true,
									"modelKey": "factory_halt",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppCompany_halt": {
									"label": "Supp Company Halt",
									"ourLabel": "Supp Company Halt",
									"isSupplymentry": true,
									"modelKey": "company_halt",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppToll_charges": {
									"label": "Supp Toll Charges",
									"ourLabel": "Supp Toll Charges",
									"isSupplymentry": true,
									"modelKey": "toll_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppGreen_tax": {
									"label": "Supp Green Tax",
									"ourLabel": "Supp Green Tax",
									"isSupplymentry": true,
									"modelKey": "green_tax",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppTwoPtDelivery": {
									"label": "Supp Two Point Delivery",
									"ourLabel": "Supp Two Point Delivery",
									"isSupplymentry": true,
									"modelKey": "twoPtDelivery",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppDiesel_charges": {
									"label": "Supp Diesel Charge",
									"ourLabel": "Supp Diesel Charge",
									"isSupplymentry": true,
									"modelKey": "diesel_charges",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppDetentionLoading": {
									"label": "Supp Loading Detention",
									"ourLabel": "Supp Loading Detention",
									"isSupplymentry": true,
									"modelKey": "detentionLoading",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppDetentionUnloading": {
									"label": "Supp Unloading Detention",
									"ourLabel": "Supp Unloading Detention",
									"isSupplymentry": true,
									"modelKey": "detentionUnloading",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"suppBasicFreight": {
									"label": "Supp basicFreight",
									"ourLabel": "Supp basicFreight",
									"isSupplymentry": true,
									"modelKey": "basicFreight",
									"type": "number",
									"visible": false,
									"editable": true
								},
								"eWayBillNum": {
									"label": "Eway Bill",
									"ourLabel": "Eway Bill",
									"type": "computable",
									"visible": true,
									"editable": true,
									"req": false
								},
								"eWayBillExp": {
									"label": "Eway Bill Exp",
									"ourLabel": "Eway Bill Exp",
									"type": "__date__",
									"visible": true,
									"editable": true,
									"req": false
								},
								"detentionLoadingRate": {
									"label": "Detention Loading Rate",
									"ourLabel": "Detention Loading Rate",
									"type": "computable",
									"visible": false,
									"editable": true
								},
								"detentionUnloadingRate": {
									"label": "Detention Unloading Rate",
									"ourLabel": "Detention Unloading Rate",
									"type": "computable",
									"visible": false,
									"editable": true
								}
							},
						},
						"Bill": {
							"driverPreview" : [
								{
									"key" : "driverPreview",
									"name" : "Profile"
								}
							],
							"tripAdvBill" : [
								{
									"key" : "TripAdvDefault",
									"name" : "TripAdvDefault"
								}
							],
							"salesAccount" : true,
							"mRTemplate" : [
								{
									"key" : "defaultMr_KSN",
									"name" : "MR Preview"
								}
							],

							"Bill Templates": [
								{
									"key" : "KSN_default",
									"name" : "Default"
								}
							],

							"Payment": {
								"PaymentType": [
									{
										"voucherGroup": [
											"Journal",
											"Payment",
											"Contra"
										],
										"toGroup": [
											"Direct Expense"
										],
										"fromGroup": [
											"Direct Expense"
										],
										"pType": "Banks"
									},
									{
										"voucherGroup": [
											"Journal"
										],
										"toGroup": [
											"Driver"
										],
										"fromGroup": [
											"Internal Cashbook"
										],
										"pType": "Driver Payment"
									},
									{
										"voucherGroup": [
											"Journal"
										],
										"toGroup": [
											"Driver"
										],
										"fromGroup": [
											"Driver"
										],
										"pType": "Driver to Driver"
									}
								]
							},

						},
						"vehAlloc": {"deviceAttach" : true,
							"skipBooking" : true,
							"vendor" : {

							}},
						"master": {
							"settlementObj": [
								{
									"name": "Border"
								},
								{
									"name": "Challan"
								},
								{
									"name": "Dala Commision"
								},
								{
									"name": "Diesel"
								},
								{
									"name": "Fixed"
								},
								{
									"name": "Salary"
								},
								{
									"name": "OK + Time"
								},
								{
									"name": "Parking"
								},
								{
									"name": "Rajai"
								},
								{
									"name": "Repair"
								},
								{
									"name": "Roti"
								},
								{
									"name": "Service"
								},
								{
									"name": "Extra"
								},
								{
									"name": "Miscellaneous Pending"
								},
								{
									"name": "Toll Tax"
								},
								{
									"name": "E-Toll"
								},
								{
									"name": "Fastag"
								},
								{
									"name": "Wages"
								},
								{
									"name": "Local Trip"
								},
								{
									"name": "Add Blue"
								},
								{
									"name": " Phone Expense"
								},
								{
									"name": "Consumable store"
								},
								{
									"name": "Prize"
								},
								{
									"name": "Route Exp"
								},
								{
									"name": "Labour"
								},
								{
									"name": "Fooding"
								},
								{
									"name": "Overloading"
								},
								{
									"name": "2nd Driver Salary"
								},
								{
									"name": "Diesel Rate Difference"
								},
								{
									"name": "Loading"
								},
								{
									"name": " Unloading "
								},
								{
									"name": " Def"
								},
								{
									"name": " Tyre Puncture"
								},
								{
									"name": " Tripal"
								},
								{
									"name": " Guide Charges"
								},
								{
									"name": " Bilty Charges"
								},
								{
									"name": " Green tax"
								},
								{
									"name": " Washing"
								},
								{
									"name": " Maintenance"
								},
								{
									"name": " Weighbridge Charges"
								},
								{
									"name": " Crain Charges"
								},
								{
									"name": "other"
								}
							],

							"driver" : {
								"showProof" : true,
								"idProofRequired" : true,
								"idNumberRequired" : true
							},
							"regVehicle" : {
								"groupRequired" : true,
								"typeRequired" : true,
								"segmentRequired" : true
							},
							"vendor" : {
								"showFactor" : true
							},
							"aSegmentType" : [
								"MARKET"
							],
							"billingParty" : {
								"multiTasking" : true,
								"defaultBillBook" : true
							},
							"consignorConsignee": {},
							"stationaryRpt" : true,
							"showAccount" : false,
							"customer" : {
								"custType" : true
							},

							"TransportRoute" : {
								"addressBook" : true,
								"tatDetails" : true
							},
							"expenseObj" : [
								{
									"name" : "Driver Cash",
									"a1" : [
										"Office",
										"Vendor"
									],
									"a2" : [
										"$driver",
										"Driver",
										"Toll tax"
									],
									"a3" : null,
									"c" : "n",
									"oType" : "Associate",
									"settle" : {
										"dont" : true
									}
								},
								{
									"name" : "Diesel",
									"a1" : "$fvendor",
									"a2" : "$vehicle",
									"a3" : null,
									"c" : "n"
								},
								{
									"name" : "Happay",
									"a1" : "Happay Master",
									"a2" : [
										"$vehicle",
										"$vendor",
										"Cashbook"
									],
									"a3" : null,
									"c" : "n"
								},
								{
									"name" : "Fastag",
									"a1" : "$fastagAcc",
									"a2" : "$vehicle",
									"a3" : null,
									"c" : "n"
								},
								{
									"name" : "M.OIL",
									"a1" : "Vendor",
									"a2" : [
										"$vehicle"
									],
									"a3" : null,
									"c" : "n",
									"gr" : false
								}
							],
							"aServiceType": [
								"Standard",
								"Express",
								"Time Committed",
								"Ferry/Empty"
							]
						},
						"tripAdv": {
							"hideCentRefBtn" : false,
							"showTripSecOnAdv" : true,
							"maxDieselAmt" : 80000,
							"automap" : true,
							"editRate" : true,
							"accounts" : {
								"_ftAcc" : {
									"name" : "ICICI BANK FAST TAG",
									"_id" : "604b2d03ce2e34307cebeb09"
								}
							}
						},
						"account": {},
						"voucher": {
							"allowCRAutoBook" : true,
							"hideAutoRefBtn" : true
						},
						"purBill": {},
						"UnBilledGr": {},
						"creditNote": {},
						"moneyReceipt": {},
						"booking": {},
						"tripMemo": {"show" : true},
						"trips": {
							"tripEndRmkReq" : true,
							"alertData" : true,
							"playBackData" : true
						},
						"eWay": {},
						"tripSettlement": {
							"addKMlimit" : 2000,
							"isOwnOnly" : true,
							"tripExpenseAmt": Number(1000000),
						},
						"tracking" : {
							"aReportTypes" : [
								{
									"scope" : "report_parking",
									"name" : "Halt Report"
								},
								{
									"scope" : "report_overspeed",
									"name" : "Overspeed Report"
								},
								{
									"scope" : "report_activity",
									"name" : "Activity Report"
								},
								{
									"scope" : "report_mileage2",
									"name" : "Kilometer Report (DayWise)"
								},
								{
									"scope" : "report_idealing",
									"name" : "Idle Report (Single Vehicle)"
								},
								{
									"scope" : "report_driver_activity",
									"name" : "Trip Overview Report"
								},
								{
									"scope" : "report_driver_activity_single",
									"name" : "Trip Overview Report(Single)"
								},
								{
									"scope" : "details_analysis",
									"name" : "Details Analysis"
								},
								{
									"scope" : "exception_report",
									"name" : "Exception Report"
								},
								{
									"scope" : "vehicle_exceptions",
									"name" : "Vehicle Exception"
								}
							]
						},
						"tripStatusCheck" : true,
						"branchAccessCtl" : true,
						"driveRptFiltr" : true,
						"_port": "",
						"_domain": ""
					}
					var savedClientConf = new ClientConf(reqBody);
					savedClientConf.saveAsync(reqBody)
						.then(function(client) {
							winston.info("added client", JSON.stringify(client));
							next();
						})
						.catch(function(err) {
							winston.error("error in add Config:" + err);
							return next(err);
						});
				}
				next();
			}).catch(next);
	},
	/**Add user*/
	function (req, res, next) {
		req.body.userId = req.body.clientId;
		req.body.full_name = req.body.client_full_name;
		req.body.role = req.isAdminKeyOperation ? config.super_admin_role_name : config.super_client_role_name;
		req.body.apps_visible = req.isAdminKeyOperation ? config.super_admin_apps_visible : config.super_client_apps_visible;
		req.body.clientAdmin = !req.isAdminKeyOperation;
		userService.addUserAsync(req.body)
			.then(function (client) {
				if (client && req.isAdminKeyOperation) {
					return res.status(200).json({
						"status": "OK",
						"message": "Super client has been added successfully",
						"data": client
					});
				} else if (client) {
					return res.status(200).json({
						"status": "OK",
						"message": "Client has been added successfully",
						"data": client
					});
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Some error occurred in client.js registration process"
					});
				}
			}).catch(next);
	}
);

router.post('/getV2', async function (req, res, next) {

	try {
		delete req.body.clientId;
		let data =  await ClientService.find(req.body, req.user);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.',
			 data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});


router.get("/get", function (req, res, next) {
	if(req.query.clientId === config.super_admin_id){
		let clientId=req.query.clientId;
		delete req.query.request_id;
		delete req.query.validate;
		delete req.query.clientId;
		if(req.query.client_display_name){
			req.query.client_display_name={'$regex':req.query.client_display_name,'$options': 'i'};
		}
		req.query.created_by_employee_code=clientId;
	}

    ClientService.findClientByQueryAsync(req.query)
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Clients found",
                "data": data
            });
        }).catch(next)
});
router.get("/findById", function (req, res, next) {
    ClientService.findClientByQueryAsync(req.query)
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Client found",
                "data": data
            });
        }).catch(next)
});
//akash 19/12/2017
router.get("/createBuilty", function (req, res, next) {
    ClientService.findClientByQueryAsync(req.body)
          .then(function (data) {
              if(data){
				  data = JSON.parse(JSON.stringify(data));
                  console.log('client data      ',data)
                  TripService.findTripQueryAsync({ 'clientId': req.user.clientId, 'trip_no':req.query.trip_no , "gr.gr_no": req.query.gr_no })
                  .then(tripData => {
                    tripData = JSON.parse(JSON.stringify(tripData));
                      console.log('tripData   ',tripData[0].trip_no)
                      let obj = {}
                       obj.client_logo='http://'+commonUtil.getConfig('download_host') +':'
						  + commonUtil.getConfig('download_port')+'/users/' + req.body.clientId + "/logo.jpg";
					  console.log('image       ',obj.image)
                      obj.trip_no=tripData[0].trip_no;
                      let val = _.find(tripData[0].gr, { 'gr_no':  req.query.gr_no });
                     // if (req.query.clientId == 100002 || req.query.clientId == 100003) {
                           obj.container_no=""
                          console.log('inside if')
                          obj.rate = "fixed"
                          obj.freight = 0
                          obj.weight = "As per BOE attached"
                          obj.value = "As per BOE attached"
                          obj.clientName = "mapple"
                          if(req.query.container_no){
                            obj.container_no=req.query.container_no
                          }
                   //   }
                      if (val) {
                          let splitTo=tripData[0].route.route_name.split('to')
                          obj.gr = val,
                              obj.vehicle_no = tripData[0].vehicle_no,
                              obj.gr_no =  req.query.gr_no,
                              obj.trip_no = tripData[0].trip_no,
                              obj.allocation_date = new Date(tripData[0].allocation_date).toLocaleString(),
                              obj.from =splitTo[0]
                              obj.to =splitTo[1]
                              if(splitTo[2]){
                                  obj.to1=splitTo[2]
                              }
                      }
                      var today = new Date();
                      var dd = today.getDate();
                      var mm = today.getMonth() + 1; //January is 0!

                      var yyyy = today.getFullYear();
                      if (dd < 10) {
                          dd = '0' + dd;
                      }
                      if (mm < 10) {
                          mm = '0' + mm;
                      }
                      var today = dd + '/' + mm + '/' + yyyy;
                      obj.today = today
                      res.render("gr", {
                          layout: false,
                          gr: data[0],
                          tripData: obj
                      });
                  })
              }
              // return res.status(200).json({
              //     "status": "OK",
              //     "message": "Client found",
              //     "data": data
              // });
          }).catch(next)
  })

router.get("/grBuiltyPdf", function (req, res, next) {
    ClientService.findClientByQueryAsync(req.query)
        .then(function (data) {


        }).catch(next)
});

router.put("/update/:_id", function (req, res, next) {
    if (otherUtil.validateSuperAdmin(req, res)) {
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({"status": "ERROR", "message": "No update body found"});
    }
    if (otherUtil.isEmptyObject(req.params)) {
        return res.status(500).json({"status": "ERROR", "message": "No id provided for updating client.js"});
    }
    delete req.body.clientId;
    ClientService.updateClientIdAsync(req.params._id, req.body)
        .then(function (updated) {
            //return next();
            return res.status(200).json({
                "status": "OK",
                "message": "Client data has been updated successfully",
                "data": updated
            });
        }).catch(next)
});

router.delete("/delete/:_id", function (req, res, next) {
    if (otherUtil.validateSuperAdmin(req, res)) {
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
    if (otherUtil.isEmptyObject(req.params)) {
        return res.status(500).json({"status": "ERROR", "message": "No id provided to delete for client.js"});
    }
    ClientService.deleteClientIdAsync(req.params._id)
        .then(function (deleted) {
            if (deleted) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Client has been deleted successfully"
                });
            } else {
                return res.status(500).json({"status": "ERROR", "message": "Some error occurred in client.js delete"});
            }
        }).catch(next)
});

module.exports = router;
