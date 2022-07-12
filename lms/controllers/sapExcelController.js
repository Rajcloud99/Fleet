/**
 * Created by kamal on 27/07/17.
 */

var express = require('express');
var router = express.Router();
var moment = require("moment");
var ClientService = promise.promisifyAll(commonUtil.getService('client'));
var tripService = promise.promisifyAll(commonUtil.getService('trip'));
var ReportService = commonUtil.getService("report");
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

router.get("/customer_invoice",
	function(req,res,next){
		if(req.query.reportType){
			req.reportType = req.query.reportType;
			delete req.query.reportType;
		}
		if(req.query.download=="true"){
			req.downloadReport = true;
			delete req.query.download;
		}

		req.query.bill_no={$exists:true,$ne:null};

		req.query.all="true";
		invoiceService.getInvoiceAsync(req.query)
			.then(function(data){
				if(data && data.data && data.data[0]){
					req.billData = data.data;
					return next();
				}else{
					return res.status(200).json({
						"status":"OK",
						"message":"No invoice data found.",
					});
				}
			})
	},
	function(req,res,next){
		ClientService.findClientByQueryAsync({"clientId":req.query.clientId})
			.then(function(client){
				if (client && client[0]){
					var clientData = JSON.parse(JSON.stringify(client[0]));
					req.clientData = {};
					req.clientData.client_full_name = clientData.client_full_name;
					req.clientData.client_iso = clientData.client_iso;
					req.clientData.client_subtitle = clientData.client_subtitle;
					req.clientData.client_address =  (clientData.client_address.line1?clientData.client_address.line1:"")+" "+(clientData.client_address.line2?clientData.client_address.line2:"")+" "+
						(clientData.client_address.district?clientData.client_address.district:"")+" "+(clientData.client_address.city?clientData.client_address.city:"")+" "+(clientData.client_address.state?clientData.client_address.state:"")+" "+
						(clientData.client_address.country?clientData.client_address.country:"");
					req.clientData.client_primary_contact_no = clientData.client_primary_contact_no;
					req.clientData.client_fax = clientData.client_fax;
					req.clientData.client_pan_no = clientData.client_pan_no;
					req.clientData.client_primary_email = clientData.client_primary_email;
					return next();
				}else{
					return res.status(500).json({
						"status": "ERROR",
						"message": "No client found."
					})
				}
			})
	},
	function(req,res,next){
		try{
			var billReport = generateGeneratedBillsReport(req.reportType,req.billData);
			if(req.downloadReport){
				ReportExelService.generateSAPBillsExcel(req.reportType, billReport, req.clientData, req.query.clientId, function(reportData){
					return res.status(200).json({
						"status":"OK",
						"message":"invoice report available for download",
						"url": reportData.url
					});
				});
			}else{

				return res.status(200).json({
					"status":"OK",
					"message":"invoice report available.",
					"data": billReport
				});
			}
		}
		catch(err) {
			return res.status(500).json({
				"status":"ERROR",
				"message":err.message
			});
		}
	}
);


function generateGeneratedBillsReport(reportType, aData){
	header = [
		'Sl No','Billing Party Name','Bill No','Billed Date',
		'Customer Name','Route Name','Booking No', 'Trip No',
		'GR No', 'GR Type','Vehicle No','Vehicle Type','BOE No.',
		'Container No.', 'Container Type', 'No Of Container','Weight',
		'Rate','Freight','GR Charges','Loading Charges','Unloading Charges',
		'Weightman Charges','Fuel Price Hike','Other Charges','Over Weight Charges',
		'Detention Charges','Extra Running','Total','Advance','Balance','Billed By','Trip Start Date',
		'Trip End Date','Remark'
	];

	var reportTypeUnique = [];
	var keyName;
	function filterUniqueType(){
		var tempData = [];
		if(aData && aData.length>0){
			for (var u = 0; u < aData.length; u++) {
				if(aData[u][keyName]){
					if(keyName == "dispatch_date"){
						var modifiedDate = moment(aData[u][keyName]).format("DD-MM-YYYY");
						tempData.push(modifiedDate);
					}else{
						tempData.push(aData[u][keyName]);
					}
				}
			}
		}
		return tempData.filter(onlyUnique);
	}
	if(reportType=="Customer Wise"){
		keyName = "customer_name";
		reportTypeUnique = filterUniqueType()
	}else if(reportType=="Billing Party Wise"){
		keyName = "billing_party_name";
		reportTypeUnique = filterUniqueType()
	}else if(reportType=="Vehicle Wise"){
		keyName = "vehicle_no";
		reportTypeUnique = filterUniqueType()
	}else if(reportType=="Invoice Wise"){
		keyName = "invoice_no";
		reportTypeUnique = filterUniqueType()
	}else if(reportType=="Dispatch Date Wise"){
		keyName = "dispatch_date";
		reportTypeUnique = filterUniqueType()
	}else{
		keyName = "bill_no";
		reportTypeUnique = filterUniqueType()
	}

	var oInvoice = {};
	if(reportTypeUnique.length>0){
		for (var t = 0; t < reportTypeUnique.length; t++) {
			oInvoice[reportTypeUnique[t]] = [];
			for (var i = 0; i < aData.length; i++) {
				if(reportTypeUnique[t]==((keyName == "dispatch_date")?moment(aData[i][keyName]).format("DD-MM-YYYY"):aData[i][keyName])){
					var oValue = {
						invoice_no:aData[i].invoice_no,
						invoice_date:aData[i].invoice_date,
						bill_no:aData[i].bill_no,
						billed_date:aData[i].billed_date,
						dispatch_date:aData[i].dispatch_date,
						booking_no:aData[i].booking_no,
						trip_no:aData[i].trip_no,
						boe_no:aData[i].boe_no,
						container_no:aData[i].container_no,
						branch:aData[i].branch,
						customer_name:aData[i].customer_name,
						billing_party_name:aData[i].billing_party_name,
						advance:aData[i].advance,
						balance:aData[i].balance,
						trip_start_time:aData[i].trip_start_time,
						trip_end_time:aData[i].trip_end_time,
					}
					if(aData[i].booking_info && aData[i].booking_info.length>0){
						for(var j=0; j < aData[i].booking_info.length; j++){
							if(j==0){
								oValue.route=aData[i].booking_info[j].route;
								oValue.container_size=aData[i].booking_info[j].container_size;
								oValue.gr_no=aData[i].booking_info[j].gr_no;
								oValue.gr_type=aData[i].booking_info[j].gr_type;
								oValue.veh_no=aData[i].booking_info[j].veh_no;
								oValue.veh_type=aData[i].booking_info[j].veh_type;
								oValue.weight=aData[i].booking_info[j].weight;
								oValue.weight_unit=aData[i].booking_info[j].weight_unit;
								oValue.payment_basis=aData[i].booking_info[j].payment_basis;
								oValue.rate=aData[i].booking_info[j].rate;
								oValue.freight=aData[i].booking_info[j].freight;
								oValue.gr_charges=aData[i].booking_info[j].gr_charges;
								oValue.loading_charges=aData[i].booking_info[j].loading_charges;
								oValue.unloading_charges=aData[i].booking_info[j].unloading_charges;
								oValue.weightman_charges=aData[i].booking_info[j].weightman_charges;
								oValue.fuel_price_hike=aData[i].booking_info[j].fuel_price_hike;
								oValue.other_charges=aData[i].booking_info[j].other_charges;
								oValue.ovr_wt_chrgs=aData[i].booking_info[j].ovr_wt_chrgs;
								oValue.dtn_amt=aData[i].booking_info[j].dtn_amt;
								oValue.othr_exp=aData[i].booking_info[j].othr_exp;
								oValue.total=aData[i].booking_info[j].total;
								oValue.remarks=aData[i].booking_info[j].remarks;
								oInvoice[reportTypeUnique[t]].push(oValue);
							}else{
								var otherData = {};
								otherData.route=aData[i].booking_info[j].route;
								otherData.container_size=aData[i].booking_info[j].container_size;
								otherData.gr_no=aData[i].booking_info[j].gr_no;
								oValue.gr_type=aData[i].booking_info[j].gr_type;
								otherData.veh_no=aData[i].booking_info[j].veh_no;
								otherData.veh_type=aData[i].booking_info[j].veh_type;
								otherData.weight=aData[i].booking_info[j].weight;
								otherData.weight_unit=aData[i].booking_info[j].weight_unit;
								otherData.payment_basis=aData[i].booking_info[j].payment_basis;
								otherData.rate=aData[i].booking_info[j].rate;
								otherData.freight=aData[i].booking_info[j].freight;
								otherData.gr_charges=aData[i].booking_info[j].gr_charges;
								otherData.loading_charges=aData[i].booking_info[j].loading_charges;
								otherData.unloading_charges=aData[i].booking_info[j].unloading_charges;
								otherData.weightman_charges=aData[i].booking_info[j].weightman_charges;
								otherData.fuel_price_hike=aData[i].booking_info[j].fuel_price_hike;
								otherData.other_charges=aData[i].booking_info[j].other_charges;
								otherData.ovr_wt_chrgs=aData[i].booking_info[j].ovr_wt_chrgs;
								otherData.dtn_amt=aData[i].booking_info[j].dtn_amt;
								otherData.othr_exp=aData[i].booking_info[j].othr_exp;
								otherData.total=aData[i].booking_info[j].total;
								otherData.remarks=aData[i].booking_info[j].remarks;
								oInvoice[reportTypeUnique[t]].push(otherData);
							}
						}
					}else{
						oInvoice[reportTypeUnique[t]].push(oValue);
					}
				}
			}
		}
	}
	return {"header":header,"keyName":keyName,"name":reportTypeUnique,"value":oInvoice}
};

