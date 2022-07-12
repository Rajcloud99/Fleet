let async = require('async');
//let Promise = require('bluebird');
let Trip = commonUtil.getModel('trip');
const tripService = commonUtil.getService('TripV2');
const VehicleDriverAssoc = promise.promisifyAll(commonUtil.getModel('vehicleDriverAssociation'));
let TripAdvance = commonUtil.getModel('TripAdvances');
let BookingModel = commonUtil.getModel('bookings');
let router = express.Router();
let ClientService = promise.promisifyAll(commonUtil.getService('client'));
//let Invoice = promise.promisifyAll(commonUtil.getModel('invoice'));
//let CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
//let tripService = promise.promisifyAll(commonUtil.getService('trip'));
var Driver = promise.promisifyAll(commonUtil.getModel('driver'));
var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
const Datamgnt = commonUtil.getModel('datamanagements');
let TripExpense = promise.promisifyAll(commonUtil.getModel("tripExpenses"));
let coverNoteService = commonUtil.getService('coverNote');
const creditNoteService = commonUtil.getService('creditNote');
const debitNoteService = commonUtil.getService('debitNote');
const CreditNote = commonUtil.getModel('creditNote');
const moneyReceiptService = commonUtil.getService('moneyReceipt');
let billService = commonUtil.getService('bills');
let GR = promise.promisifyAll(commonUtil.getModel('tripGr'));
//let TripExpenseModel = commonUtil.getModel("tripExpenses");
let _ = require('lodash');
let path = require('path');
let fs = promise.promisifyAll(require('fs'));
let moment = require("moment");
let domain = 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/';
// const PlainVoucher = commonUtil.getModel('plainVoucher');
const PlainVoucher = commonUtil.getModel('voucher');
let Bill = promise.promisifyAll(commonUtil.getModel('bills'));
let Bill2 = commonUtil.getModel('bills');
let GenBill = commonUtil.getModel('genBill');
var TransportRoute = promise.promisifyAll(commonUtil.getModel('transportRoute'));
var TransportRoutes = commonUtil.getModel('transportRoute');
let Vehicle = commonUtil.getModel('registeredVehicle');
let AcBal = commonUtil.getModel('accountbalances');
let VoucherService = commonUtil.getService('voucher');
let Accounts = commonUtil.getModel('accounts');
const serverSidePage = require('../../utils/serverSidePagination');
let Handlebars = require('hbs');

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

let a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
let b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];

function intToWords (num) {
	if ((num = num.toString()).length > 9) return 'overflow';
	let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
	if (!n) return; var str = '';
	str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
	str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
	str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
	str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
	str += (n[5] != 0) ? (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
	return str;
}

function toWords(num) {
	let s = num.toString().split('.');
	return intToWords(s[0]) + 'rupees and ' + (s[1] ? intToWords(s[1]) : 'zero') + ' paise';
}

function checkIfFile(file) {
	return fs.statAsync(file).then(stat => {
		return true;
	}).catch(function (err) {
		if (err) {
			return false;
		}
	});
}

async function checkIfFileAsync(file) {

	try{
		if(await fs.statAsync(file))
			return true;
	}catch (e) {
		return false;
	}

}

function prepareClientData(clientData) {
	let cData = {};
	cData.client_full_name = clientData.client_full_name;
	cData.clientId = clientData.clientId;
	cData.client_iso = clientData.client_iso;
	cData.client_display_line_1 = clientData.client_display_line_1;
	cData.client_display_line_2 = clientData.client_display_line_2;
	cData.client_display_line_3 = clientData.client_display_line_3;
	cData.client_display_line_4 = clientData.client_display_line_4;
	cData.client_subtitle = clientData.client_subtitle;
	cData.client_address = ((clientData.client_address && clientData.client_address.line1) ? clientData.client_address.line1 : "") + " " + ((clientData.client_address && clientData.client_address.line2) ? clientData.client_address.line2 : "") + " " +
		((clientData.client_address && clientData.client_address.district) ? clientData.client_address.district : "") + " " + ((clientData.client_address && clientData.client_address.city) ? clientData.client_address.city : "") + " " + ((clientData.client_address && clientData.client_address.state) ? clientData.client_address.state : "") + " " +
		((clientData.client_address && clientData.client_address.country) ? clientData.client_address.country : "");
	cData.client_primary_contact_no = clientData.client_primary_contact_no;
	// if(cData.client_address === "     "){
	// 	cData.client_address = clientData.client_address;
	//
	// }
	cData.client_fax = clientData.client_fax;
	cData.client_pan_no = clientData.client_pan_no;
	cData.client_primary_email = clientData.client_primary_email;
	cData.client_logo = clientData.client_logo;
	return cData;
}
function getLogo(clientId, logoName) {
	return domain + 'logos/' + clientId + "/" + logoName + ".jpg"
}

async function getDocURL(id) {
	let data = await Datamgnt.findOne({linkToId: id});
	let imgUrl;

	if(data && data.files){
		data.files.forEach(obj=>{
			if(obj.category === 'photo')
				imgUrl = obj.name;
		})
	}

	if(imgUrl)
		return domain + imgUrl;
	else
		return domain + 'logos/' + 'dummy.png';

}

function prepareBillData(billData) {
	let newBill;
	for (let i = 0; i < billData.length; i++) {
		let oBill = billData[i];
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
			newBill.booking_info.push(oBill.booking_info[0]);
			if (i == (billData.length - 1)) {
				//newBill.service_tax = parseFloat((Math.round(((newBill.total_expenses)*oBill.service_tax_percent/100) * 100) / 100).toFixed(2));
				//newBill.total_expenses = parseFloat((Math.round((newBill.total_expenses +newBill.service_tax) * 100) / 100).toFixed(2));
			}
		}
	}
	return newBill;
}
function prepareBill(resultData, req) {
	let $scope = {};
	$scope.isMarketVehicle = false;
	$scope.showRate = false;
	$scope.colSpanValue = 12;
	$scope.payment_basisValue = "";
	let selectInVoice = JSON.parse(JSON.stringify(resultData));
	$scope.client_gstin = req.clientData.gstin_no ? req.clientData.gstin_no : "NA";
	$scope.biller_gstin = selectInVoice.billing_party_gstin_no;
	function fixedToTwoDecimal(value) {
		return parseFloat((Math.round((value) * 100) / 100).toFixed(2))
	}

	$scope.total = {
		freight: 0,//freight
		loading_charge: 0,//unloading
		unloading_charge: 0,//unloading
		dtn_amt: 0,//detaintion
		other_charge: 0,//gr charges + fuel + other
		weightman_charges: 0,//weightman_charges
		overweight_charges: 0,//overweight
		extra_running: 0,//othr_exp
		//other_expances:0,
		total_expense: 0,
	};
	if (selectInVoice.booking_info && selectInVoice.booking_info.length > 0) {
		for (let i = 0; i < selectInVoice.booking_info.length; i++) {
			if (selectInVoice.booking_info[i].isMarketVehicle) {
				$scope.isMarketVehicle = selectInVoice.booking_info[i].isMarketVehicle;
			}
			if ((selectInVoice.booking_info[i].payment_basis == "PMT") || (selectInVoice.booking_info[i].payment_basis == "PUnit")) {
				$scope.showRate = true;
				$scope.colSpanValue = 13;
				$scope.payment_basisValue = selectInVoice.booking_info[i].payment_basis;
			}
			$scope.total.freight = fixedToTwoDecimal($scope.total.freight + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].freight) ? selectInVoice.booking_info[i].freight : 0));
			$scope.total.dtn_amt = fixedToTwoDecimal($scope.total.dtn_amt + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].dtn_amt) ? selectInVoice.booking_info[i].dtn_amt : 0));
			$scope.total.other_charge = fixedToTwoDecimal($scope.total.other_charge + ((selectInVoice.booking_info[i].other_charges || 0) + (selectInVoice.booking_info[i].fuel_price_hike || 0) + (selectInVoice.booking_info[i].gr_charges || 0)));
			$scope.total.loading_charge = fixedToTwoDecimal($scope.total.loading_charge + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].loading_charges) ? selectInVoice.booking_info[i].loading_charges : 0));
			$scope.total.unloading_charge = fixedToTwoDecimal($scope.total.unloading_charge + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].unloading_charges) ? selectInVoice.booking_info[i].unloading_charges : 0));
			$scope.total.weightman_charges = fixedToTwoDecimal($scope.total.weightman_charges + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].weightman_charges) ? selectInVoice.booking_info[i].weightman_charges : 0));
			$scope.total.overweight_charges = fixedToTwoDecimal($scope.total.overweight_charges + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].ovr_wt_chrgs) ? selectInVoice.booking_info[i].ovr_wt_chrgs : 0));
			$scope.total.extra_running = fixedToTwoDecimal($scope.total.extra_running + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].othr_exp) ? selectInVoice.booking_info[i].othr_exp : 0));
			$scope.total.total_expense = fixedToTwoDecimal($scope.total.total_expense + ((selectInVoice.booking_info[i] && selectInVoice.booking_info[i].total) ? selectInVoice.booking_info[i].total : 0));
		}
	}

	$scope.cgst = { freight: 0, loading_charge: 0, unloading_charge: 0, dtn_amt: 0, other_charge: 0, weightman_charges: 0, overweight_charges: 0, extra_running: 0, total_expense: 0 };
	$scope.sgst = { freight: 0, loading_charge: 0, unloading_charge: 0, dtn_amt: 0, other_charge: 0, weightman_charges: 0, overweight_charges: 0, extra_running: 0, total_expense: 0 };
	$scope.igst = { freight: 0, loading_charge: 0, unloading_charge: 0, dtn_amt: 0, other_charge: 0, weightman_charges: 0, overweight_charges: 0, extra_running: 0, total_expense: 0 };
	let total = JSON.parse(JSON.stringify($scope.total));
	$scope.totalWithGST = total;
	if ($scope.isMarketVehicle === false) {
		if (selectInVoice.apply_gst) {
			let clientStateCode = $scope.client_gstin.slice(0, 2);
			let billerStateCode = $scope.biller_gstin.slice(0, 2);
			if (clientStateCode == billerStateCode) {
				//result = ((10 / 100) * 1000)+1000; 10% of 1000
				//apply cgst and sgst;
				$scope.cgst = {
					freight: fixedToTwoDecimal((2.5 / 100) * total.freight),
					loading_charge: fixedToTwoDecimal((2.5 / 100) * total.loading_charge),
					unloading_charge: fixedToTwoDecimal((2.5 / 100) * total.unloading_charge),
					dtn_amt: fixedToTwoDecimal((2.5 / 100) * total.dtn_amt),
					other_charge: fixedToTwoDecimal((2.5 / 100) * total.other_charge),
					weightman_charges: fixedToTwoDecimal((2.5 / 100) * total.weightman_charges),
					overweight_charges: fixedToTwoDecimal((2.5 / 100) * total.overweight_charges),
					extra_running: fixedToTwoDecimal((2.5 / 100) * total.extra_running),
					total_expense: fixedToTwoDecimal((2.5 / 100) * total.total_expense),
				};
				$scope.sgst = {
					freight: fixedToTwoDecimal((2.5 / 100) * total.freight),
					loading_charge: fixedToTwoDecimal((2.5 / 100) * total.loading_charge),
					unloading_charge: fixedToTwoDecimal((2.5 / 100) * total.unloading_charge),
					dtn_amt: fixedToTwoDecimal((2.5 / 100) * total.dtn_amt),
					other_charge: fixedToTwoDecimal((2.5 / 100) * total.other_charge),
					weightman_charges: fixedToTwoDecimal((2.5 / 100) * total.weightman_charges),
					overweight_charges: fixedToTwoDecimal((2.5 / 100) * total.overweight_charges),
					extra_running: fixedToTwoDecimal((2.5 / 100) * total.extra_running),
					total_expense: fixedToTwoDecimal((2.5 / 100) * total.total_expense),
				};
				$scope.totalWithGST = {
					freight: fixedToTwoDecimal((total.freight) + ($scope.cgst.freight) + ($scope.sgst.freight)),
					loading_charge: fixedToTwoDecimal((total.loading_charge) + ($scope.cgst.loading_charge) + ($scope.sgst.loading_charge)),
					unloading_charge: fixedToTwoDecimal((total.unloading_charge) + ($scope.cgst.unloading_charge) + ($scope.sgst.unloading_charge)),
					dtn_amt: fixedToTwoDecimal((total.dtn_amt) + ($scope.cgst.dtn_amt) + ($scope.sgst.dtn_amt)),
					other_charge: fixedToTwoDecimal((total.other_charge) + ($scope.cgst.other_charge) + ($scope.sgst.other_charge)),
					weightman_charges: fixedToTwoDecimal((total.weightman_charges) + ($scope.cgst.weightman_charges) + ($scope.sgst.weightman_charges)),
					overweight_charges: fixedToTwoDecimal((total.overweight_charges) + ($scope.cgst.overweight_charges) + ($scope.sgst.overweight_charges)),
					extra_running: fixedToTwoDecimal((total.extra_running) + ($scope.cgst.extra_running) + ($scope.sgst.extra_running)),
					total_expense: fixedToTwoDecimal((total.total_expense) + ($scope.cgst.total_expense) + ($scope.sgst.total_expense)),
				};
			} else {
				//apply IGST
				$scope.igst = {
					freight: fixedToTwoDecimal((5 / 100) * total.freight),
					loading_charge: fixedToTwoDecimal((5 / 100) * total.loading_charge),
					unloading_charge: fixedToTwoDecimal((5 / 100) * total.unloading_charge),
					dtn_amt: fixedToTwoDecimal((5 / 100) * total.dtn_amt),
					other_charge: fixedToTwoDecimal((5 / 100) * total.other_charge),
					weightman_charges: fixedToTwoDecimal((5 / 100) * total.weightman_charges),
					overweight_charges: fixedToTwoDecimal((5 / 100) * total.overweight_charges),
					extra_running: fixedToTwoDecimal((5 / 100) * total.extra_running),
					total_expense: fixedToTwoDecimal((5 / 100) * total.total_expense),
				};

				$scope.totalWithGST = {
					freight: fixedToTwoDecimal((total.freight) + ($scope.igst.freight)),
					loading_charge: fixedToTwoDecimal((total.loading_charge) + ($scope.igst.loading_charge)),
					unloading_charge: fixedToTwoDecimal((total.unloading_charge) + ($scope.igst.unloading_charge)),
					dtn_amt: fixedToTwoDecimal((total.dtn_amt) + ($scope.igst.dtn_amt)),
					other_charge: fixedToTwoDecimal((total.other_charge) + ($scope.igst.other_charge)),
					weightman_charges: fixedToTwoDecimal((total.weightman_charges) + ($scope.igst.weightman_charges)),
					overweight_charges: fixedToTwoDecimal((total.overweight_charges) + ($scope.igst.overweight_charges)),
					extra_running: fixedToTwoDecimal((total.extra_running) + ($scope.igst.extra_running)),
					total_expense: fixedToTwoDecimal((total.total_expense) + ($scope.igst.total_expense)),
				};
			}
		}
	}
	$scope.selectInVoice = selectInVoice;
	return $scope;
}
/*function grModify(clientData, gr) {
	if ((Object.keys(gr).length > 0) && gr.booking_info && gr.booking_info.length > 0) {
		for (let j = 0; j < gr.booking_info.length; j++) {
			gr.booking_info[j].rate = "Fixed";
			gr.booking_info[j].freight = 0;
			gr.booking_info[j].weight = "As per BOE attached";
			gr.booking_info[j].value = "As per BOE attached";
		}
		if ((clientData.clientId == "100002") || (clientData.clientId == "100003")) {
			gr.gr_charges = 0;
			gr.weightman_charges = 0;
			gr.total = 0;
		}
		gr.gr_date = moment(gr.gr_date).format(clientData.dateTimeFormat.momentJS);
		gr.boe_date = moment(gr.boe_date).format(clientData.dateTimeFormat.momentJS);
	}
	return gr;
}*/
function prepareBuiltyTemplateData(clientData, builtyName, grData) {
	let templateData = { [builtyName]: {} };
	switch (clientData.clientId) {
		case "100002":
			templateData[builtyName].grData = grData;
			//templateData[builtyName].tripData = tripData;
			break;
		case "100003":
			templateData[builtyName].grData = grData;
			//templateData[builtyName].tripData = tripData;
			break;
		default:
			templateData[builtyName].grData = grData;
			//templateData[builtyName].tripData = tripData;
	}

	return templateData;
}


router.get("/createGR", function (req, res, next) {
	GR.findAsync({ "clientId": req.user.clientId, "_id": req.query._id })
		.then(foundTrip => {
			let templateData = { layout: false };

			if(!req.clientData.billDir){
				req.clientData.billDir = req.clientData.clientId;
			}

			req.clientData.client_logo = /*req.query.builtyName
				? getLogo(req.clientData.billDir, "logo_" + req.query.builtyName)
				: */getLogo(req.clientData.billDir, ((!req.query.builtyName || req.query.builtyName==="default")?"logo":"logo_"+req.query.builtyName));
			templateData.clientData = prepareClientData(req.clientData);
			templateData.clientData.addressSTC = req.clientConfig._doc.config.client_allowed[0].address
			if (foundTrip && foundTrip[0]) {
				let grData = JSON.parse(JSON.stringify(foundTrip[0]));
				if(grData.charges){
					grData.total_charges = ((grData.charges.grCharges || 0)+(grData.charges.weightman_charges || 0)+(grData.charges.loading_charges ||0)+(grData.charges.unloading_charges || 0)+(grData.charges.detention ||0)+(grData.charges.damage ||0)+(grData.charges.penalty ||0)+(grData.charges.shortage ||0)+(grData.charges.other_charges ||0));
				}
				let splitedRoute;
				if(grData.trip){
					grData.trip.container_number = (Array.isArray(grData.container)? grData.container: []).map(c => c.number).join(",");
					if(grData.trip.route_name){
						splitedRoute = grData.trip.route_name.toLowerCase().split('to');
						grData.trip.fromRoute = splitedRoute.shift();
						grData.trip.toRoute = splitedRoute.join(' to ');
					}
					grData.trip.allocation_date = moment(grData.trip.allocation_date).format(req.clientData.dateTimeFormat.momentJS);
				}
				grData.today = moment().format(req.clientData.dateTimeFormat.momentJS);
				let builtyName = (req.query && req.query.builtyName) ? req.query.builtyName : "defaultData";

				let toBind = prepareBuiltyTemplateData(req.clientData, /*builtyName*/'defaultData', grData);
				_.assign(templateData, toBind)
			}

			let clientCustomBuiltyPath = (req.query && req.query.builtyName) ? path.resolve(projectHome, "hbs", "gr", req.clientData.billDir + "_" + req.query.builtyName + ".hbs") : undefined;
			let clientDefaultBuiltyPath = path.resolve(projectHome, "hbs", "gr", req.clientData.billDir + "_default.hbs");
			let defaultBuiltyPath = path.resolve(projectHome, "hbs", "gr", "gr_default" + ".hbs");

			var rendorGr = function(filePath) {
				res.render(filePath, templateData);
			};
			if (clientCustomBuiltyPath) {
				checkIfFile(clientCustomBuiltyPath).then(function (isClientCustomBuiltyPath) {
					if (isClientCustomBuiltyPath) {
						// handle the file
						rendorGr(clientCustomBuiltyPath);
					} else {
						checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
							if (isClientDefaultBuiltyPath) {
								// handle the file
								rendorGr(clientDefaultBuiltyPath);
							} else {
								checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
									if (isDefaultBuiltyPath) {
										// handle the file
										rendorGr(defaultBuiltyPath);
									}
								}).catch(next);
							}
						}).catch(next);
					}
				}).catch(next);
			} else {
				checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
					if (isClientDefaultBuiltyPath) {
						// handle the file
						rendorGr(clientDefaultBuiltyPath);
					} else {
						checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
							if (isDefaultBuiltyPath) {
								// handle the file
								rendorGr(defaultBuiltyPath);
							}
						}).catch(next);
					}
				}).catch(next);
			}
		})
});

router.get("/createGR_withoutTrip", function (req, res, next) {
	GR.findAsync({ "clientId": req.user.clientId, "_id": req.query._id })
		.then(foundTrip => {
			let templateData = { layout: false };

			if(!req.clientData.billDir){
				req.clientData.billDir = req.clientData.clientId;
			}

			req.clientData.client_logo = /*req.query.builtyName
				? getLogo(req.clientData.billDir, "logo_" + req.query.builtyName)
				: */getLogo(req.clientData.billDir, ((!req.query.builtyName || req.query.builtyName==="default")?"logo":"logo_"+req.query.builtyName));
			templateData.clientData = prepareClientData(req.clientData);
			if (foundTrip && foundTrip[0]) {
				let grData = JSON.parse(JSON.stringify(foundTrip[0]));
				if(grData.charges){
					grData.total_charges = ((grData.charges.grCharges || 0)+(grData.charges.weightman_charges || 0)+(grData.charges.loading_charges ||0)+(grData.charges.unloading_charges || 0)+(grData.charges.detention ||0)+(grData.charges.damage ||0)+(grData.charges.penalty ||0)+(grData.charges.shortage ||0)+(grData.charges.other_charges ||0));
				}
				let splitedRoute;
				if(grData.trip){
					grData.trip.container_number = (Array.isArray(grData.container)? grData.container: []).map(c => c.number).join(",");
					if(grData.trip.route_name){
						splitedRoute = grData.trip.route_name.toLowerCase().split('to');
						grData.trip.fromRoute = splitedRoute.shift();
						grData.trip.toRoute = splitedRoute.join(' to ');
					}
					grData.trip.allocation_date = moment(grData.trip.allocation_date).format(req.clientData.dateTimeFormat.momentJS);
				}
				grData.today = moment().format(req.clientData.dateTimeFormat.momentJS);
				let builtyName = (req.query && req.query.builtyName) ? req.query.builtyName : "defaultData";

				let toBind = prepareBuiltyTemplateData(req.clientData, /*builtyName*/'defaultData', grData);
				_.assign(templateData, toBind)
			}

			let clientCustomBuiltyPath = (req.query && req.query.builtyName) ? path.resolve(projectHome, "hbs", "grWithoutTrip", req.clientData.billDir + "_" + req.query.builtyName + ".hbs") : undefined;
			let clientDefaultBuiltyPath = path.resolve(projectHome, "hbs", req.clientData.billDir + "default.hbs");
			let defaultBuiltyPath = path.resolve(projectHome, "hbs", "grWithoutTrip", "default" + ".hbs");

			var rendorGr = function(filePath) {
				res.render(filePath, templateData);
			};
			if (clientCustomBuiltyPath) {
				checkIfFile(clientCustomBuiltyPath).then(function (isClientCustomBuiltyPath) {
					if (isClientCustomBuiltyPath) {
						// handle the file
						rendorGr(clientCustomBuiltyPath);
					} else {
						checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
							if (isClientDefaultBuiltyPath) {
								// handle the file
								rendorGr(clientDefaultBuiltyPath);
							} else {
								checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
									if (isDefaultBuiltyPath) {
										// handle the file
										rendorGr(defaultBuiltyPath);
									}
								}).catch(next);
							}
						}).catch(next);
					}
				}).catch(next);
			} else {
				checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
					if (isClientDefaultBuiltyPath) {
						// handle the file
						rendorGr(clientDefaultBuiltyPath);
					} else {
						checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
							if (isDefaultBuiltyPath) {
								// handle the file
								rendorGr(defaultBuiltyPath);
							}
						}).catch(next);
					}
				}).catch(next);
			}
		})
});

function addForEachKey(aData, key1, key2){
	if (!aData) {
		return 0
	}
	let toReturn = aData.reduce(function(accumulator, currentValue) {
			return accumulator + ((currentValue[key1] && currentValue[key1][key2])?currentValue[key1][key2]:0);
		},
		0
	);
	if(toReturn<=0) return 0;
	else return toReturn;
}
function addOnKey(aData, key){
	if (!aData) {
		return 0
	}
	let toReturn = aData.reduce(function(accumulator, currentValue) {
			return accumulator + ((currentValue[key])?currentValue[key]:0);
		},
		0
	);
	if(toReturn<=0) return 0;
	else return toReturn;
}

function calculateDieselByKey(aExpense,type,key1,key2) {
	return aExpense.reduce(function(x,c){
			return x+ ((c.type==type)?(key1 && key2)?c[key1][key2]:c[key1]:0)
		},0
	)
}

let setRate = function (obj) {
	if(obj.rate)
		return;

	switch(obj.booking.payment_basis){
		case "PMT":
			obj.rate = obj.rateObj.price_per_mt;
			obj.freight = obj.rate * obj.weight;
			break;

		case "PUnit":
			obj.rate = obj.rateObj.price_per_unit;
			break;

		case "Fixed":
			obj.rate = obj.rateObj.vehicle_rate;
			obj.freight = obj.rate;
			break;

		case "Fixed per Trip/Fixed per Booking":
			obj.rate = obj.rateObj.price_per_trip;
			obj.freight = obj.rate;
			break;
	}
};

function getPMTrate(obj) {
	if(obj.booking && obj.booking.routeData) {
		obj.rateObj = obj.booking.routeData.data.find(vObj => ((vObj.vehicle_type_id === obj.trip.vehicle.veh_type._id) && (vObj.booking_type === obj.booking.booking_type)));
		if(obj.rateObj){
			obj.rateObj = obj.rateObj.rate;
			setRate(obj);
		}else {
			console.log('preferred vehicle not found');
		}
	}else
		obj.rate = obj.booking && obj.booking.rate;

}

function calculateDieselEsc(aGR){
	let total = 0;
	for(let oGR of aGR){
		getPMTrate(oGR.gr);
		let grn_qty = Math.min((oGR.gr.l_net_w || 0),(oGR.gr.ul_net_w || 0));
		let actual_moisture = oGR.gr.actual_moisture || 0;
		let estimated_moisture = oGR.gr.estimated_moisture || 0;
		let normalized_qty = (actual_moisture>estimated_moisture)?(grn_qty * (100-actual_moisture))/(100-estimated_moisture):grn_qty;
		let diesel_base_rate = (oGR.gr.booking && oGR.gr.booking.contract_id && oGR.gr.booking.contract_id.diesel_base_price)? oGR.gr.booking.contract_id.diesel_base_price :0;
		let aExpense = (oGR.gr && oGR.gr.trip && oGR.gr.trip.trip_expenses)?oGR.gr.trip.trip_expenses:[];
		let total_diesel_ltr = calculateDieselByKey(aExpense,"Diesel","diesel_info","litre");
		let total_diesel_amt = calculateDieselByKey(aExpense,"Diesel","amount");
		let increased_rate = Number.isFinite(total_diesel_amt/total_diesel_ltr)?total_diesel_amt/total_diesel_ltr:0;
		let percent_inc_in_diesel_rate = Number.isFinite(((increased_rate-diesel_base_rate)*100)/diesel_base_rate)?((increased_rate-diesel_base_rate)*100)/diesel_base_rate:0;
		let pmtRate = oGR.gr.rate;
		let formula = Number.isFinite(0.37*(percent_inc_in_diesel_rate/100)*pmtRate)?0.37*(percent_inc_in_diesel_rate/100)*pmtRate:0;
		let esc_amount = (Number.isFinite(formula*normalized_qty))?formula*normalized_qty:0;
		total = total+esc_amount;
	}
	return parseFloat(total.toFixed(2));
}

router.post("/billGenerate", async function (req, res, next) {
	// Bill.findAsync({ _id: req.query._id })//.populate('items.trip.trip_expenses')
	// 	// .then(function (billData) {
	// 	// 	return TripExpenseModel.populate(billData, {path: "items.gr.trip.trip_expenses"});
	// 	// })
	// 	.then()
	// 	.catch(next);

	if (!req.body.oBill && !req.query._id) {
		res.status(500).json({"status": "ERROR","message": "Please provide bill id."});
	}

	try {
		let bill_ = await Bill2.find({_id:req.query._id}).populate('items.gr').populate('items.gr.route').populate('billingParty').populate('branch').lean();

		if(!bill_.length)
			bill_ = req.body.oBill;

		let tripMemo_tripNo = (bill_ && bill_[0] && bill_[0].items && bill_[0].items[0] && bill_[0].items[0].gr && bill_[0].items[0].gr.tMemoReceipt && bill_[0].items[0].gr.tMemoReceipt[0] && bill_[0].items[0].gr.tMemoReceipt[0].trip_no) || 0;

		if(tripMemo_tripNo){
				let aggrQuery1 = [
					{
						$match:{
							"trip_no" : tripMemo_tripNo,
							"gr_type": "Trip Memo",
							"tMemoReceipt": {
								"$exists": true
							}
						}
					} ,
					{
						"$addFields": {
							"receivedAmount": {
								"$reduce": {
									input: "$tMemoReceipt.amount",
									initialValue: 0,
									in: {
										"$add": ["$$value", {"$ifNull": ["$$this", 0]}]
									}
								}
							},

						}
					},
					{
						$project: {
							"receivedAmount": 1
						}
					}
				];

				let aTripGR_  = await GR.aggregate(aggrQuery1);
				let data = JSON.parse(JSON.stringify(aTripGR_));
				if(bill_ && bill_[0])
					bill_[0].receivedAmount = data[0].receivedAmount;
				else
					req.body.oBill.receivedAmount = data[0].receivedAmount;
			}

		renderBill( req.body.oBill || bill_);
	} catch (err){
		console.log(err);
	}

	function renderBill (bill) {
		if(bill && bill[0]){
			let billData = JSON.parse(JSON.stringify(bill[0]));
			billData.items.forEach(function (ob) {

				if(!ob.gr && ob.grData){
					ob.gr = ob.grData;
					ob.gr.trip = {
						trip_no: ob.grData.trip_no
					}
				}
				if(ob.gr && ob.gr.invToBill){
					ob.gr.grNumber = ob.gr.grNumber.slice(0, -3);
				}

				let obj = ob.gr;
				if(obj.booking && obj.booking.routeData) {
					obj.rateObj = obj.booking.routeData.data.find(vObj => ((vObj.vehicle_type_id === obj.trip.vehicle.veh_type._id) && (vObj.booking_type === obj.booking.booking_type)));
					if(obj.rateObj){
						obj.rateObj = obj.rateObj.rate;
						setRate(obj);
					}else {
						console.log('preferred vehicle not found');
					}
				}else
					obj.rate = obj.booking && obj.booking.rate;
			});
			let aKeys = ["total_grCharges","total_loading_charges","total_unloading_charges","total_weightman_charges",
				"total_overweight_charges","total_detention","total_damage","total_shortage","total_penalty","total_other_charges",
				"total_extra_running"];
			billData.total_grCharges = addForEachKey(billData.items,"charges", "grCharges");
			billData.total_loading_charges = addForEachKey(billData.items,"charges", "loading_charges");
			billData.total_unloading_charges = addForEachKey(billData.items,"charges", "unloading_charges");
			billData.total_weightman_charges = addForEachKey(billData.items,"charges", "weightman_charges");
			billData.total_overweight_charges = addForEachKey(billData.items,"charges", "overweight_charges");
			billData.total_detention = addForEachKey(billData.items,"charges", "detention");
			billData.total_damage = addForEachKey(billData.items,"charges", "damage");
			billData.total_shortage = addForEachKey(billData.items,"charges", "shortage");
			billData.total_penalty = addForEachKey(billData.items,"charges", "penalty");
			billData.total_other_charges = addForEachKey(billData.items,"charges", "other_charges");
			billData.total_extra_running = addForEachKey(billData.items,"charges", "extra_running");
			billData.total_freight = addOnKey(billData.items,"freight");
			billData.total_weight = addOnKey(billData.items,"weight");
			billData.spanCount = aKeys.reduce(function(accumulator, currentValue) {
					return accumulator + ((billData[currentValue] && billData[currentValue]>0)?1:0);
				},
				1
			);
			if(billData.items.length)
				billData.items[0] && getPMTrate(billData.items[0].gr);
			let aDetention = (billData.detentionCharges && billData.detentionCharges.length>1)?billData.detentionCharges:(billData.items && billData.items[0] && billData.items[0].gr && billData.items[0].gr.booking && billData.items[0].gr.booking.contract_id && billData.items[0].gr.booking.contract_id.detentionCharges)?billData.items[0].gr.booking.contract_id.detentionCharges:[];
			/*let aVehType = [];
            for(let o of aDetention){
                aVehType.push(o.vehicleTypeName);
            }
            let uniqueVehType = aVehType.filter(onlyUnique);
            let aDetentionVehiclewise = [];
            for(let o of uniqueVehType){
                let oData = {veh_type:o,dData:[]}
                for(let u of aDetention){
                    if(o===u.vehicleTypeName){
                        oData.dData.push(u);
                    }
                }
                aDetentionVehiclewise.push(oData);
            }*/

			billData.aDetentionVehiclewise = aDetention;
			//billData.diesel_esc_amount = calculateDieselEsc(billData.items);
			billData.rowSpanCount = billData.comission_percent?4:3;

			billData.items_total = addOnKey(billData.items,"total");
			billData.totalAmountInWords = toWords(parseFloat(billData.totalAmount).toFixed(2));


			let templateData = { layout: false };
			req.clientData.client_logo = getLogo((req.clientData.billDir || req.clientData.clientId), ((!req.query.builtyName || req.query.builtyName==="default")?"logo":"logo_"+req.query.builtyName));
			templateData.clientData = prepareClientData(req.clientData);
			// sorting on tripno

			billData.items.sort(function(a, b){return (a.gr && a.gr.trip && a.gr.trip.trip_no) - (b.gr && b.gr.trip && b.gr.trip.trip_no)});
			templateData.templateBillData = billData;
			if(!req.clientData.billDir){
				req.clientData.billDir = req.clientData.clientId;
			}
			req.clientData.addressSTC = req.clientConfig._doc.config.client_allowed[0].address
			templateData.clientData.addressSTC = req.clientData.addressSTC;
			 let clientCustomBuiltyPath = (req.query && req.query.builtyName) ? path.resolve(projectHome, "hbs", "bill", req.clientData.billDir + "_" + req.query.builtyName + ".hbs") : undefined;
			let clientDefaultBuiltyPath = path.resolve(projectHome, "hbs", "bill", req.clientData.clientId + "_default.hbs");
			let defaultBuiltyPath = path.resolve(projectHome, "hbs", "bill", "bill_default" + ".hbs");

			function renderFile(filePath) {
				res.render(filePath, templateData);
				//res.status(200).json({ success: "OK", "data": {path:filePath, template:templateData }});
			}
			if (clientCustomBuiltyPath) {
				checkIfFile(clientCustomBuiltyPath).then(function (isClientCustomBuiltyPath) {
					if (isClientCustomBuiltyPath) {
						// handle the file
						renderFile(clientCustomBuiltyPath);
					} else {
						checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
							if (isClientDefaultBuiltyPath) {
								// handle the file
								renderFile(clientDefaultBuiltyPath);
							} else {
								checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
									if (isDefaultBuiltyPath) {
										// handle the file
										renderFile(defaultBuiltyPath);
									}
								}).catch(next);
							}
						}).catch(next);
					}
				}).catch(next);
			} else {
				checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
					if (isClientDefaultBuiltyPath) {
						// handle the file
						renderFile(clientDefaultBuiltyPath);
					} else {
						checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
							if (isDefaultBuiltyPath) {
								// handle the file
								renderFile(defaultBuiltyPath);
							}
						}).catch(next);
					}
				}).catch(next);
			}
		}else {
			return res.status(500).json({"status":"ERROR", "message": "No Data Found"})
		}

	}
});

router.post("/genBillGenerate", async function (req, res, next) {

	if (!req.body._id) {
		res.status(500).json({"status": "ERROR","message": "Please provide bill id."});
	}

	try {
		let bill_ = await GenBill.find({_id:req.body._id}).populate('items.gr').populate('billingParty');
		renderBill( req.body.oBill || bill_);
	} catch (err){
		console.log(err);
	}

	function renderBill (bill) {
		if(bill && bill[0]){
			let billData = JSON.parse(JSON.stringify(bill[0]));
			billData.items.forEach(function (ob) {

				if(!ob.gr && ob.grData){
					ob.gr = ob.grData;
					ob.gr.trip = {
						trip_no: ob.grData.trip_no
					}
				}
				if(ob.gr && ob.gr.invToBill){
					ob.gr.grNumber = ob.gr.grNumber.slice(0, -3);
				}

				let obj = ob.gr;
			});

			let templateData = { layout: false };
			templateData.templateBillData = billData;
			if(!req.clientData.billDir){
				req.clientData.billDir = req.clientData.clientId;
			}

			let defaultPath = path.resolve(projectHome, "hbs", "bill", "10808_saleInvMh.hbs");
			let billPath = path.resolve(projectHome, "hbs", "bill", '10808_' + req.body.billName + '.hbs');

			billPath && checkIfFile (billPath).then(function (data) {
				if (data) {
					res.render(billPath, {
						templateData: billData
					});
				}else{
					res.render(defaultPath, {
						templateData: billData
					});
				}
			}).catch (next);

		}else {
			return res.status(500).json({"status":"ERROR", "message": "No Data Found"})
		}

	}
});

router.post("/tripAdvBillGenerate", async function (req, res, next) {

	if (!req.body._id) {
		res.status(500).json({"status": "ERROR","message": "Please provide bill id."});
	}

	try {
		// let multiAdv = otherUtil.findPagination(TripAdvance, req.body.reference_no, next);
		let multiAdv = await TripAdvance.find({reference_no: req.body.reference_no, clientId: req.user.clientId}).populate('trip').populate('dieseInfo.vendor').populate('driver').populate({
			path: 'created_by',
			select: {'userId':1,'full_name':1}
		}).populate({
			path: 'voucher',
			select: {'created_at':1}
		});
		// let multiAdv =  await TripAdvance.find({reference_no: req.body.reference_no},{amount:1});
		let amountHappay =0,amountCash=0, amountDiesel=0, amountFastag=0, remark='';
		multiAdv.forEach((obj, i) =>{
			if(obj._doc.advanceType === "Happay"){
				amountHappay = obj._doc.amount;
			}else if( obj._doc.advanceType === "Driver Cash"){
				amountCash = obj._doc.amount;
			}else if(obj._doc.advanceType === "Diesel"){
				amountDiesel = obj._doc.amount;
			}else if(obj._doc.advanceType === "Fastag"){
				amountFastag = obj._doc.amount;
			}
			if(obj._doc.remark){
				remark = obj._doc.remark + ";" + remark;
			}



		});
		multiAdv[0]._doc.amountHappay = amountHappay;
		multiAdv[0]._doc.amountCash = amountCash;
		multiAdv[0]._doc.amountDiesel = amountDiesel;
		multiAdv[0]._doc.amountFastag = amountFastag;
		multiAdv[0]._doc.remark = remark;
		// bill_.push(amountSum);
		renderBill( req.body.oBill || multiAdv);
	} catch (err){
		console.log(err);
	}

	function renderBill (bill) {
		if(bill && bill[0]){
			let billData = JSON.parse(JSON.stringify(bill[0]));

			let templateData = { layout: false };
			templateData.templateBillData = billData;
			if(!req.clientData.billDir){
				req.clientData.billDir = req.clientData.clientId;
			}

			req.clientData.client_logo = getLogo(req.clientData.billDir, ((!req.body.billName)?"logo":"logo_"+req.body.billName));
			let defaultPath = path.resolve(projectHome, "hbs", "bill",  req.clientData.clientId  + "_TripAdvDefault.hbs");
			let billPath = (req.body.billName) ? path.resolve(projectHome, "hbs", "bill",  req.clientData.clientId + "_" + req.body.billName + '.hbs') : undefined;
			let UserDetails = req.user;

			billPath && checkIfFile (billPath).then(function (data) {
				if (data) {
					res.render(billPath, {
						templateData: billData,
						client_logo : req.clientData.client_logo
					});
				}else{
					res.render(defaultPath, {
						templateData: billData,
						client_logo : req.clientData.client_logo
					});
				}
			}).catch (next);

		}else {
			return res.status(500).json({"status":"ERROR", "message": "No Data Found"})
		}

	}
});

router.post("/tripSettlPreview", async function (req, res, next) {
	try {

		let aTripGroup = await Trip.find({
			clientId: req.user.clientId,
			'advSettled.tsNo': req.body.tsNo,
			isCancelled: false,
			populateGR: true
		}).populate([
			{
				path: 'payments',
				model: PlainVoucher
			}
		]).lean();
	//
	// .populate([
	// 		{
	// 			path: 'advanceBudget',
	// 			model: TripAdvance,
	// 			populate: { path: 'branch' }
	// 		}
	// 	])
		let oData = {};
		oData.data =  Trip.eachTripSummary(aTripGroup);
		oData.summary = await Trip.tripSummary(oData.data);

		if(!(Array.isArray(aTripGroup) && aTripGroup.length > 0)){
			return res.status(500).json({
				status: "Error",
				message: `No Trip Group with Tsno ${req.query.tsNo} found`,
				error: true
			});
		}

		if(!req.clientData.billDir)
			req.clientData.billDir = req.clientData.clientId;

		aTripGroup = JSON.parse(JSON.stringify(aTripGroup));

		aTripGroup.aFoundDriverVehicle = await VehicleDriverAssoc.find({driver: aTripGroup[0] && aTripGroup[0].driver && aTripGroup[0].driver._id}, {_id : 0, ass_date :1 }).sort({ass_date: -1}).lean();


		let templateData = {
			aTrip: aTripGroup,
			res: oData,
			aAdv: [],
			aFastag: [],
			aExp: [],
			aGr: [],
		};

		aTripGroup.forEach(oTrip => {

			oTrip.gr.forEach(o => {
				templateData.aGr.push(o);
			});

			oTrip.advanceBudget.forEach(oAdv => {
				if(oAdv.advanceType === 'Fastag')
					templateData.aFastag.push(oAdv);
				else
				templateData.aAdv.push(oAdv);
			});

			oTrip.trip_expenses.forEach(o => {
				templateData.aExp.push(o);
			});

				let tripStartDate = oTrip.statuses.find(tr => tr.status === "Trip started");
				if(tripStartDate)
					oTrip.tripStartDate = tripStartDate.date;
				let tripEndDate = oTrip.statuses.find(tr => tr.status === "Trip ended");
				if(tripEndDate)
					oTrip.tripEndDate = tripEndDate.date;

		});
		templateData.aAdv.sort( (a,b) => new Date(a.date) - new Date(b.date));
		// templateData.aFastag.sort( (a,b) => new Date(a.date) - new Date(b.date) );

		if(templateData.aFastag.length > 1){
			templateData.aAdv.push(templateData.aFastag[0]);
			for(let i =1; i < templateData.aFastag.length; i++){
				templateData.aAdv[templateData.aAdv.length - 1].amount += templateData.aFastag[i].amount || 0;
				templateData.aAdv[templateData.aAdv.length - 1].advToDate = templateData.aFastag[i].date;
			}
		}else if (templateData.aFastag.length){
			templateData.aAdv.push(templateData.aFastag[0]);
		}
		let defaultPath= '';
		if(req.body.tripsheet){
			defaultPath = (req.body.tempName) ? path.resolve(projectHome, "hbs", "tripSettlement",  req.clientData.billDir + "_" + req.body.tempName + '.hbs') : undefined;
		}else{
			defaultPath = path.resolve(projectHome, "hbs", "tripSettlement", "10806_TripSettl_Caravan.hbs");
		}

		let configPath = path.resolve(projectHome, "hbs", "tripSettlement", req.body.tempName + '.hbs');

		defaultPath && checkIfFile(defaultPath)
			.then(function (isDefaultPath) {
				if (isDefaultPath) {
					res.render(defaultPath, {
						templateData
					});
				}
			})
			.catch(next);

	} catch (err) {
		return res.status(500).json({
			status: "Error",
			message: err.toString(),
			error: true
		});
	}
});

router.post("/ledgerPreview", async function (req, res, next) {
	try {

		if (!req.body.ledger) {
			return res.status(501).json({
				'status': 'OK',
				'message': 'account name not provided'
			});
		}
		if (!req.body.from_date || !req.body.to_date) {
			return res.status(501).json({
				'status': 'OK',
				'message': 'start date or end date not provided'
			});
		}

		let onlyDate = dateUtil.getMorning(req.body.from_date);//TODO make it dynamic
		let fFil = {clientId: req.user.clientId, account: req.body.ledger, date: {$lte: onlyDate}};
		let oPbal = await AcBal.find(fFil,{date:1,cr:1,dr:1,cb:1,ob:1}).sort({date: -1}).limit(1).lean();
		let dOp = 0;
		let aVch = await VoucherService.ledgerReport(req.body);
		let data;
		if (aVch) {
			data = {data: aVch};
		}
		let respData, summary;

		if (data.data && data.data[0]) {
			if (oPbal && oPbal[0] && moment(oPbal[0].date).diff(req.body.from_date, 'days', true) == 0) {
				data.data[0].dayOb = oPbal[0].ob || 0;
				dOp = data.data[0].dayOb;
			} else if (oPbal && oPbal[0]) {
				data.data[0].dayOb = oPbal[0].cb || 0;
				dOp = data.data[0].dayOb;
			} else {
				data.data[0].dayOb = 0;
			}
			respData = prepareLedger(data.data, req.body.ledger);
			data.data = respData.data;
			summary = {ob: respData.ob, cb: respData.cb, cr: respData.cr, dr: respData.dr};
			data.summary = summary;
			summary.ob = Number(numberUtils.isFloat(summary.ob) ? summary.ob.toFixed(2) : summary.ob);
			summary.cb = Number(numberUtils.isFloat(summary.cb) ? summary.cb.toFixed(2) : summary.cb);
			summary.dr = Number(numberUtils.isFloat(summary.dr) ? summary.dr.toFixed(2) : summary.dr);
			summary.cr = Number(numberUtils.isFloat(summary.cr) ? summary.cr.toFixed(2) : summary.cr);
		} else {
			data.summary = {};
			data.summary.ob = oPbal && oPbal[0] && oPbal[0].cb || 0;
			data.summary.cb = oPbal && oPbal[0] && oPbal[0].cb || 0;
			data.summary.cr = 0;
			data.summary.dr = 0;
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found.',
				'data': data
			});
		}

		let templateData = data;
		templateData.lAc = templateData.data[0].lAc;
		templateData.from = req.body.from_date;
		templateData.to = req.body.to_date;
		templateData.clientName = req.clientData.client_full_name;
		templateData.address = req.clientData.address;
		templateData.accAddress = req.body.address;

		let defaultPath= '';
		if(req.body.ledgerTemp){
			defaultPath = (req.body.ledgerTemp) ? path.resolve(projectHome, "hbs", "ledger", req.body.ledgerTemp + '.hbs') : undefined;
		}else{
			defaultPath = path.resolve(projectHome, "hbs", "ledger", 'ledgerPreview.hbs');
		}


		defaultPath && checkIfFile(defaultPath)
			.then(function (isDefaultPath) {
				if (isDefaultPath) {
					res.render(defaultPath, {
						templateData
					});
				}
			})
			.catch(next);

	} catch (err) {
		return res.status(500).json({
			status: "Error",
			message: err.toString(),
			error: true
		});
	}
});

prepareLedger = function (data, ACname) {
	let tCr = 0, tDr = 0, cb = 0, ob = data[0].dayOb;
	for (let i = 0; i < data.length; i++) {
		for (let l = 0; l < data[i].ledgers.length; l++) {
			if (data[i].ledgers[l].account.toString() == ACname) {
				if (data[i].ledgers[l].cRdR == 'CR') {
					if (i === 0) {
						data[i].balance = ob - data[i].ledgers[l].amount;
						data[i].lAc = data[i].ledgers[l].lName;
						data[i].acc = data[i].ledgers[l].account;
					} else {
						data[i].balance = data[i - 1].balance - data[i].ledgers[l].amount;
					}
					data[i].cr = data[i].ledgers[l].amount;
					tCr = tCr + data[i].ledgers[l].amount;
				} else {
					if (i === 0) {
						data[i].balance = ob + data[i].ledgers[l].amount;
						data[i].lAc = data[i].ledgers[l].lName;
					} else {
						data[i].balance = data[i - 1].balance + data[i].ledgers[l].amount;
					}
					data[i].dr = data[i].ledgers[l].amount;
					tDr = tDr + data[i].ledgers[l].amount;
				}
			} else if(!data[i].pAc) {
				data[i].pAc =  data[i].ledgers[l].lName;
			}
		}

		cb = ob + tDr - tCr;
		data[i].balance = Number(numberUtils.isFloat(data[i].balance) ? data[i].balance.toFixed(2) : data[i].balance);
	}
	return {data: data, cr: tCr, dr: tDr, cb: cb, ob: ob};
};


router.post("/multiBillGenerate", async function (req, res, next) {

	if (!(Array.isArray(req.body.aBill) && req.body.aBill.length))
		res.status(500).json({"status": "ERROR","message": "Mandatory Fields are required."});

	let group = req.body.group || 'bill';
	let hbsPtr = group === 'bill' ? 'templateBillData' : 'templateData';

	try {

		let foundData;

		if(group == 'bill'){
			foundData = await Bill2.find({
				_id: {
					$in: req.body.aBill.map(o => o._id)
				}
			}).populate('items.gr').populate('billingParty').lean();
		}else if(group == 'cover note'){
			foundData = await coverNoteService.findAggr({
				_id: req.body.aBill.map(o => o._id)
			});

			foundData = foundData && foundData.data;
		}

		renderBill(foundData);

		async function renderBill (bill) {
			if(bill && bill.length){

				let aTemplate = [];

				for(let len=0; len < bill.length; len++){

					let oBill = bill[len];

					let billTemplateData = req.body.aBill.find(o => o._id === oBill._id.toString());
					let templateData = { layout: false };
					req.clientData.client_logo = getLogo(req.clientData.clientId, ((!billTemplateData.billTemplate || billTemplateData.billTemplate === "default") ? "logo" : "logo_" + billTemplateData.billTemplate));
					templateData.clientData = prepareClientData(req.clientData);
					if(!req.clientData.billDir)
						req.clientData.billDir = req.clientData.clientId;

					templateData[hbsPtr] = oBill;

					let locArr = genBillLoc();

					for(let i=0; i < locArr.length; i++){

						let path = await checkIfFileAsync(locArr[i]);

						if(path){
							renderFile(locArr[i]);
							break;
						}
					}

					function renderFile(filePath) {
						let htmlString = fs.readFileSync(filePath).toString();
						try {
							aTemplate.push(Handlebars.compile(htmlString)(templateData));
						} catch(e) {
							console.log(e);
						}
					}

					function genBillLoc() {
						let arr = [];

						if(group === 'bill'){
							arr.push(billTemplateData.billTemplate ? path.resolve(projectHome, "hbs", "bill", req.clientData.billDir + "_" + billTemplateData.billTemplate + ".hbs") : undefined);
							arr.push(path.resolve(projectHome, "hbs", "bill", req.clientData.clientId + "_default.hbs"));
							arr.push(path.resolve(projectHome, "hbs", "bill", "bill_default" + ".hbs"));
						}else if(group === 'cover note'){
							arr.push(path.resolve(projectHome, "hbs", "bill", '10808_' + billTemplateData.billTemplate + '.hbs'));
							arr.push(path.resolve(projectHome, "hbs", "bill", "10808_default_CoverNote.hbs"));
						}

						return arr;
					}
				}

				let html = aTemplate.join(' <div style="clear:both!important;"/></div>\n' +
					'<div style="page-break-after:always"></div> \n' +
					'<div style="clear:both!important;"/> </div><br/> ');

				return res.status(200).json(html);

			}else {
				return res.status(500).json({"status":"ERROR", "message": "No Data Found"})
			}

		}

	} catch (err){
		console.log(err);
	}
});

router.post("/coverNote", async function (req, res, next) {

	if (!req.body._id || !req.body.billName)
		res.status(500).json({"status": "ERROR","message": "Mandatory Fields are required"});

	coverNoteService.findAggr(req.body)
		.then(async function({ data }) {

			let oCoverNote = data[0];

			let defaultPath = path.resolve(projectHome, "hbs", "bill", "10808_default_CoverNote.hbs");
			let billPath = path.resolve(projectHome, "hbs", "bill", '10808_' + req.body.billName + '.hbs');

			billPath && checkIfFile (billPath).then(function (data) {
				if (data) {
					res.render(billPath, {
						templateData: oCoverNote
					});
				}else{
					res.render(defaultPath, {
						templateData: oCoverNote
					});
				}
			}).catch (next);
		})
		.catch(next);
});

router.post("/creditNote", async function (req, res, next) {

	if (!req.body._id || !req.body.cNoteName)
		res.status(500).json({"status": "ERROR","message": "Mandatroy Fields are required"});

	try {

		req.body.populate = ['billRef', "billRef.consignee"];

		let data = await creditNoteService.find(req.body, req.user, 'template', req);

		let oCreditNote = data.data[0];
		// let voucherData = await CreditNote.find
		oCreditNote.logo = req.body.cNoteName ? getLogo(req.clientData.clientId, "logo_" + req.body.cNoteName) : getLogo(req.clientData.clientId, "logo");

		let defaultPath = path.resolve(projectHome, "hbs", "bill", "10808_CREDIT_NOTE_Print_format.hbs");
		let billPath = path.resolve(projectHome, "hbs", "bill", req.clientData.clientId + "_" + req.body.cNoteName + '.hbs');

		billPath && checkIfFile (billPath).then(function (data) {
			if (data) {
				res.render(billPath, {
					templateData: oCreditNote,
					// clientData: req.clientData
				});
			}else{
				res.render(defaultPath, {
					templateData: oCreditNote,
					// clientData: req.clientData
				});
			}
		}).catch (next);


	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.post("/debitNote", async function (req, res, next) {

	if (!req.body._id || !req.body.dNoteName)
		res.status(500).json({"status": "ERROR","message": "Mandatroy Fields are required"});

	try {

		req.body.populate = ['billRef', "billRef.consignee",'purBillRef','vendor'];
		let data = await debitNoteService.find(req.body, req.user, 'template', req);

		let oDebitNote = data.data[0];
		// let voucherData = await CreditNote.find
		oDebitNote.logo = req.body.dNoteName ? getLogo(req.clientData.clientId, "logo_" + req.body.dNoteName) : getLogo(req.clientData.clientId, "logo");

		let defaultPath = path.resolve(projectHome, "hbs", "bill", "10808_CREDIT_NOTE_Print_format.hbs");
		let billPath = path.resolve(projectHome, "hbs", "bill", req.clientData.clientId + "_" + req.body.dNoteName + '.hbs');

		billPath && checkIfFile (billPath).then(function (data) {
			if (data) {
				res.render(billPath, {
					templateData: oDebitNote,
					// clientData: req.clientData
				});
			}else{
				res.render(defaultPath, {
					templateData: oDebitNote,
					// clientData: req.clientData
				});
			}
		}).catch (next);


	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.post("/getTrip", async function (req, res){

	if (!req.body._id || !req.body.pBillName)
		res.status(500).json({"status": "ERROR","message": "Mandatroy Fields are required"});

	try {

		let data = await tripService.getV3(req);
		let oTripData = data;

		let logoDir = req.clientData.billDir ? req.clientData.billDir : req.clientData.clientId;

		req.clientData.client_logo = getLogo(logoDir, ((!req.body.pBillName)?"logo":"logo_"+req.body.pBillName));

		let defaultPath = path.resolve(projectHome, "hbs", "tripPerformance", "default.hbs");
		let billPath = path.resolve(projectHome, "hbs", "tripPerformance", '11709_' + req.body.pBillName + '.hbs');

		if(billPath && checkIfFile (billPath))
		{
			if (data) {
				res.render(billPath, {
					templateData: oTripData.data[0],
					client_logo : req.clientData.client_logo
				});
			}else{
				res.render(defaultPath, {
					templateData: oTripData.data[0],
					client_logo : req.clientData.client_logo
				});
			}

		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

})



router.post("/purchaseBill", async function (req, res, next) {

	if (!req.body._id || !req.body.pBillName)
		res.status(500).json({"status": "ERROR","message": "Mandatroy Fields are required"});

	try {

		// req.body.populate = ["branch", "vendor"];

		let data = await billService.getAllPurchaseBills(req.body);
		let oPurchaseBill = data[0];

		let defaultPath = path.resolve(projectHome, "hbs", "bill", "10808_DGFC_PurchaseBillPreview.hbs");
		let billPath = path.resolve(projectHome, "hbs", "bill", '10808_' + req.body.pBillName + '.hbs');

		if(billPath && checkIfFile (billPath))
		{
			// .then(function (data) {
			if (data) {
				res.render(billPath, {
					templateData: oPurchaseBill
				});
			}else{
				res.render(defaultPath, {
					templateData: oPurchaseBill
				});
			}
			//})
		}
		//.catch (next);


	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.post("/driverPreview", async function (req, res, next) {

	if (!req.body._id || !req.body.driverTemp)
		res.status(500).json({"status": "ERROR","message": "Mandatroy Fields are required"});

	try {
		let data = await Driver.find({_id: req.body._id}).lean();
		let oDriverData = data[0];
		oDriverData.vehicle = {};


		let aFoundDriverVehicle = await VehicleDriverAssoc.find({driver: req.body._id}).sort({_id: -1}).lean();

		if(aFoundDriverVehicle && aFoundDriverVehicle.length)
		 oDriverData.vehicle = aFoundDriverVehicle[0];

		let defaultPath = path.resolve(projectHome, "hbs", "driver", "driverPreview.hbs");
		let previewPath = path.resolve(projectHome, "hbs", "driver", req.body.driverTemp + '.hbs');

		if(req.body._id)
			oDriverData.client_logo = await getDocURL(req.body._id);

		oDriverData.clientName = req.clientData && req.clientData.client_full_name && req.clientData.client_full_name.toUpperCase();
		oDriverData.aggrementlogo = domain + 'logos/' + 'driver' + "/" + 'img' + ".png";
		oDriverData.barCodelogo = domain + 'logos/' + 'driver' + "/" + 'barCode' + ".png";

		if(previewPath && checkIfFile (previewPath))
		{
			if (data) {
				res.render(previewPath, {
					templateData: oDriverData
				});
			}else{
				res.render(defaultPath, {
					templateData: oDriverData
				});
			}
		}
			//.catch (next);


	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.get("/tripPerfBillGenerate", async function (req, res, next) {
	try
	{
		let foundTrip = await Trip.find({ clientId: req.user.clientId, _id: req.query._id }).populate('gr').lean();
		let templateData = { layout: false };
		let tripData = {};

		if(!req.clientData.billDir){
			req.clientData.billDir = req.clientData.clientId;
		}
		if (foundTrip && foundTrip[0]) {
			tripData = JSON.parse(JSON.stringify(foundTrip[0]));
		}

		let previewPath = (req.query && req.query.builtyName) ? path.resolve(projectHome, "hbs", "tripPerformance", req.clientData.billDir + "_" + req.query.builtyName + ".hbs") : undefined;
		let defaultPath = path.resolve(projectHome, "hbs", "tripPerformance", "default" + ".hbs");


		if(req.body._id)
			tripData.client_logo = await getDocURL(req.body._id);

		tripData.clientName = req.clientData && req.clientData.client_full_name && req.clientData.client_full_name.toUpperCase();

		if(previewPath && checkIfFile (previewPath))
		{
			if (tripData) {
				res.render(previewPath, {
					templateData: tripData
				});
			}else{
				res.render(defaultPath, {
					templateData: tripData
				});
			}
		}









		//
		// if(!req.clientData.billDir){
		// 	req.clientData.billDir = req.clientData.clientId;
		// }
		//
		// templateData.clientData = prepareClientData(req.clientData);
		// if (foundTrip && foundTrip[0]) {
		// 	let tripData = JSON.parse(JSON.stringify(foundTrip[0]));
		//
		// 	let builtyName = (req.query && req.query.builtyName) ? req.query.builtyName : "defaultData";
		//
		// 	let toBind = prepareBuiltyTemplateData(req.clientData, /*builtyName*/'defaultData', tripData);
		// 	_.assign(templateData, toBind)
		// }
		//
		// let clientCustomBuiltyPath = (req.query && req.query.builtyName) ? path.resolve(projectHome, "hbs", "tripPerformance", req.clientData.billDir + "_" + req.query.builtyName + ".hbs") : undefined;
		// let clientDefaultBuiltyPath = path.resolve(projectHome, "hbs", req.clientData.billDir + "default.hbs");
		// let defaultBuiltyPath = path.resolve(projectHome, "hbs", "tripPerformance", "default" + ".hbs");
		//
		// var rendorGr = function(filePath) {
		// 	res.render(filePath, templateData);
		// };
		// if (clientCustomBuiltyPath) {
		// 	checkIfFile(clientCustomBuiltyPath).then(function (isClientCustomBuiltyPath) {
		// 		if (isClientCustomBuiltyPath) {
		// 			// handle the file
		// 			rendorGr(clientCustomBuiltyPath);
		// 		} else {
		// 			checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
		// 				if (isClientDefaultBuiltyPath) {
		// 					// handle the file
		// 					rendorGr(clientDefaultBuiltyPath);
		// 				} else {
		// 					checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
		// 						if (isDefaultBuiltyPath) {
		// 							// handle the file
		// 							rendorGr(defaultBuiltyPath);
		// 						}
		// 					}).catch(next);
		// 				}
		// 			}).catch(next);
		// 		}
		// 	}).catch(next);
		// } else {
		// 	checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
		// 		if (isClientDefaultBuiltyPath) {
		// 			// handle the file
		// 			rendorGr(clientDefaultBuiltyPath);
		// 		} else {
		// 			checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
		// 				if (isDefaultBuiltyPath) {
		// 					// handle the file
		// 					rendorGr(defaultBuiltyPath);
		// 				}
		// 			}).catch(next);
		// 		}
		// 	}).catch(next);
		// }
	}catch(err){
		return res.status(500).json({
			status: "Error",
			message: err.toString(),
			error: true
		});
	}




});

router.post("/tripMemo", async function (req, res, next) {

	if (!req.body._id)
		res.status(500).json({"status": "ERROR","message": "Select any trip memo"});

	try {

		let data = await GR.find({_id: req.body._id}).populate([{
					path: 'vehicle',
					model: Vehicle
				}]).populate([{
			path: 'booking',
			model: BookingModel,
			select: {ld: 1,uld:1}
		}]).lean();
		let oGrData = data[0];

	// .populate([{
	// 		path: 'route',
	// 		model: TransportRoutes
	// 	}]).populate([{
	// 		path: 'vehicle',
	// 		model: Vehicle
	// 	}])

		let tripStartDate = oGrData.trip.statuses.find(tr => tr.status === "Trip started");
		if(tripStartDate)
			oGrData.tripStartDate = tripStartDate.date;


		let defaultPath = path.resolve(projectHome, "hbs", "tripMemo", "tripMemoPreview.hbs");
		// let defaultPreviewPath = path.resolve(projectHome, "hbs", "tripMemo", req.body.builtyName + '.hbs');
		let previewPath = path.resolve(projectHome, "hbs", "tripMemo", (req.clientData.clientId ? (req.clientData.clientId + '_') : '') + req.body.builtyName + '.hbs');


		oGrData.logo = domain + 'logos/' + 'tripMemo' + "/" + 'logo' + ".jpg";
		oGrData.logoC = domain + 'logos/' + 'tripMemo' + "/" + (req.clientData.clientId ? (req.clientData.clientId + '_') : '') + 'logo' +  (req.body.builtyName ? ('_' + req.body.builtyName): '') + ".jpg";

		oGrData.panCard =  domain + 'logos/' + 'tripMemo' + "/" + 'panCard' + ".jpg";
		oGrData.signature =  domain + 'logos/' + 'tripMemo' + "/" + 'signature' + ".jpg";

		if(previewPath && checkIfFile (previewPath))
		{
			if (data) {
				res.render(previewPath, {
					templateData: oGrData
				});
			}else{
				res.render(defaultPath, {
					templateData: oGrData
				});
			}
		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.post("/moneyReceipt", async function (req, res, next) {

	if (!req.body._id || !req.body.mReceiptName)
		res.status(500).json({"status": "ERROR","message": "Mandatroy Fields are required"});

	try {

		// req.body.populate = ['billRef'];
		req.body.populate = true;

		let data = await moneyReceiptService.findPop(req.body,req.user);

		let oMoneyReceipt = data.data[0];

		let defaultPath = path.resolve(projectHome, "hbs", "mr", "defaultMr.hbs");
		let billPath = path.resolve(projectHome, "hbs", "mr", req.body.mReceiptName + '.hbs');
		// let billPath = path.resolve(projectHome, "hbs", "mr", 'defaultMr.hbs');

		billPath && checkIfFile (billPath).then(function (data) {
			if (data) {
				res.render(billPath, {
					templateData: oMoneyReceipt
				});
			}else{
				res.render(defaultPath, {
					templateData: oMoneyReceipt
				});
			}
		}).catch (next);


	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.get("/diesel", function (req, res, next) {
	let errorFile = path.resolve(projectHome, "hbs", "error", "err" + ".hbs");
	if (!req.query.expense_id) {
		res.render(errorFile, { layout: false, error_message: "Expese id not provided!" });
	} else {
		TripExpense.findAsync({ "clientId": req.user.clientId, _id: mongoose.Types.ObjectId(req.query.expense_id), populate:'true' })
			.then(foundTrip => {
				if (foundTrip && foundTrip[0]) {
					let templateData = { layout: false };
					req.clientData.client_logo = req.query.builtyName ? getLogo(req.clientData.clientId, "logo_" + req.query.builtyName) : getLogo(req.clientData.clientId, "logo");
					templateData.clientData = prepareClientData(req.clientData);
					let tripData = JSON.parse(JSON.stringify(foundTrip[0]));
					tripData.diesel_vendors = tripData.diesel_info;
					if (tripData.diesel_vendors) {
						tripData.diesel_vendors.diesel_date = (tripData.date) ? moment(tripData.date).format(req.clientData.dateTimeFormat.momentJS) : "";
						tripData.diesel_vendors.amount = ((tripData.diesel_vendors.rate || 0) * (tripData.diesel_vendors.litre || 0)).toFixed(2);
						tripData.diesel_vendors.amount_in_words = toWords(parseFloat(tripData.diesel_vendors.amount).toFixed(2));
					}
					tripData.datetime = moment().format(req.clientData.dateTimeFormat.momentJS);
					let toBind = { tripData: tripData };
					_.assign(templateData, toBind);
					let clientCustomTemplatePath = (req.query && req.query.templateName) ? path.resolve(projectHome, "hbs", "diesel", req.clientData.clientId + "_" + req.query.templateName + ".hbs") : undefined;
					let clientDefaultTemplatePath = path.resolve(projectHome, "hbs", "diesel", req.clientData.clientId + "_default.hbs");
					let defaultTemplatePath = path.resolve(projectHome, "hbs", "diesel", "diesel_default" + ".hbs");
					function rendorGr(filePath) {
						res.render(filePath, templateData);
					}
					if (clientCustomTemplatePath) {
						checkIfFile(clientCustomTemplatePath).then(function (isClientCustomBuiltyPath) {
							if (isClientCustomBuiltyPath) {
								// handle the file
								rendorGr(clientCustomTemplatePath);
							} else {
								checkIfFile(clientDefaultTemplatePath).then(function (isClientDefaultBuiltyPath) {
									if (isClientDefaultBuiltyPath) {
										// handle the file
										rendorGr(clientDefaultTemplatePath);
									} else {
										checkIfFile(defaultTemplatePath).then(function (isDefaultBuiltyPath) {
											if (isDefaultBuiltyPath) {
												// handle the file
												rendorGr(defaultTemplatePath);
											}
										}).catch(next);
									}
								}).catch(next);
							}
						}).catch(next);
					} else {
						checkIfFile(clientDefaultTemplatePath).then(function (isClientDefaultBuiltyPath) {
							if (isClientDefaultBuiltyPath) {
								// handle the file
								rendorGr(clientDefaultTemplatePath);
							} else {
								checkIfFile(defaultTemplatePath).then(function (isDefaultBuiltyPath) {
									if (isDefaultBuiltyPath) {
										// handle the file
										rendorGr(defaultTemplatePath);
									}
								}).catch(next);
							}
						}).catch(next);
					}
				} else {
					res.render(errorFile, { layout: false, error_message: "Expese id does not exist!" });
				}
			})
	}

});

router.get("/driver_undertaking", function (req, res, next) {
	let errorFile = path.resolve(projectHome, "hbs", "error", "err" + ".hbs");
	if(!req.query.expense_id){
		res.render(errorFile, {layout: false,error_message:"Expese id not provided!"});
	}else {
		TripExpense.findAsync({ "clientId": req.user.clientId, _id: mongoose.Types.ObjectId(req.query.expense_id) })
			.then(foundTrip => {
				if (foundTrip && foundTrip[0]) {
					let templateData = { layout: false };
					req.clientData.client_logo = req.query.builtyName ? getLogo(req.clientData.clientId, "logo_" + req.query.builtyName) : getLogo(req.clientData.clientId, "logo");
					templateData.clientData = prepareClientData(req.clientData);
					let tripData = JSON.parse(JSON.stringify(foundTrip[0]));
					tripData.diesel_vendors = tripData.diesel_info;
					if (tripData.diesel_vendors) {
						tripData.diesel_vendors.diesel_date = (tripData.date) ? moment(tripData.date).format(req.clientData.dateTimeFormat.momentJS) : "";
						tripData.diesel_vendors.amount = ((tripData.diesel_vendors.rate ||0)*(tripData.diesel_vendors.litre || 0)).toFixed(2);
						tripData.diesel_vendors.amount_in_words = toWords(parseFloat(tripData.diesel_vendors.amount).toFixed(2));
					}
					tripData.datetime = moment().format(req.clientData.dateTimeFormat.momentJS);
					let toBind = { tripData: tripData };
					_.assign(templateData, toBind);
					let clientCustomTemplatePath = (req.query && req.query.templateName) ? path.resolve(projectHome, "hbs", "diesel", req.clientData.clientId + "_" + req.query.templateName + ".hbs") : undefined;
					let clientDefaultTemplatePath = path.resolve(projectHome, "hbs", "diesel", req.clientData.clientId + "_default.hbs");
					let defaultTemplatePath = path.resolve(projectHome, "hbs", "diesel", "diesel_default" + ".hbs");
					function rendorGr(filePath) {
						res.render(filePath, templateData);
					}
					if (clientCustomTemplatePath) {
						checkIfFile(clientCustomTemplatePath).then(function (isClientCustomBuiltyPath) {
							if (isClientCustomBuiltyPath) {
								// handle the file
								rendorGr(clientCustomTemplatePath);
							} else {
								checkIfFile(clientDefaultTemplatePath).then(function (isClientDefaultBuiltyPath) {
									if (isClientDefaultBuiltyPath) {
										// handle the file
										rendorGr(clientDefaultTemplatePath);
									} else {
										checkIfFile(defaultTemplatePath).then(function (isDefaultBuiltyPath) {
											if (isDefaultBuiltyPath) {
												// handle the file
												rendorGr(defaultTemplatePath);
											}
										}).catch(next);
									}
								}).catch(next);
							}
						}).catch(next);
					} else {
						checkIfFile(clientDefaultTemplatePath).then(function (isClientDefaultBuiltyPath) {
							if (isClientDefaultBuiltyPath) {
								// handle the file
								rendorGr(clientDefaultTemplatePath);
							} else {
								checkIfFile(defaultTemplatePath).then(function (isDefaultBuiltyPath) {
									if (isDefaultBuiltyPath) {
										// handle the file
										rendorGr(defaultTemplatePath);
									}
								}).catch(next);
							}
						}).catch(next);
					}
				}else {
					res.render(errorFile, {layout: false,error_message:"Expese id does not exist!"});
				}
			})
	}

});

router.get("/loading_slip/:bill_id", function (req, res, next) {
	Bill.findAsync({ "_id": req.params.bill_id })
		.then(bill => {
			let templateData = { layout: false };
			req.clientData.client_logo = req.query.builtyName ? getLogo(req.clientData.clientId, "logo_" + req.query.builtyName) : getLogo(req.clientData.clientId, "logo");
			req.clientData.client_logo = getLogo(req.clientData.clientId, "logo");
			req.clientData.client_pan = getLogo(req.clientData.clientId, "pan");
			templateData.clientData = prepareClientData(req.clientData);
			if (bill && bill[0]) {
				bill = JSON.parse(JSON.stringify(bill[0]));
				let tdsData = {
					customerName: req.clientData.client_full_name,
					date: bill.created_at,
					route:bill.items[0].gr.trip.route.name,
					vehicleNumber: bill.items[0].gr.trip.vehicle_no,
					vehicleType: bill.items[0].gr.trip.vehicle.veh_type.name,
					driverPhone: bill.items[0].gr.trip.vehicle.driver_contact_no,
					driverName: bill.items[0].gr.trip.vehicle.driver_name,
					clientLogo: req.clientData.client_logo,
					clientPan: req.clientData.client_pan,
					paymentMode: bill.items[0].gr.booking && bill.items[0].gr.booking.payment_type,
					total: bill.totalAmount,
					advance: bill.advanceAsked,
					toPay: (bill.totalAmount || 0)-(bill.advanceAsked||0),
					detentationRate: "NA",
					clientData: req.clientData,
					billNo: bill.billNo
				};
				templateData.defaultData = tdsData
			}

			let clientCustomBuiltyPath = (req.query && req.query.builtyName) ? path.resolve(projectHome, "hbs", "gr", req.clientData.clientId + "_" + req.query.builtyName + ".hbs") : undefined;
			let clientDefaultBuiltyPath = path.resolve(projectHome, "hbs", "loadingSlip", req.clientData.clientId + "_default.hbs");
			let defaultBuiltyPath = path.resolve(projectHome, "hbs", "loadingSlip", "loading_default" + ".hbs");


			function rendorTds(filePath) {
				res.render(filePath, templateData);
			}
			if (clientCustomBuiltyPath) {
				checkIfFile(clientCustomBuiltyPath).then(function (isClientCustomBuiltyPath) {
					if (isClientCustomBuiltyPath) {
						// handle the file
						rendorTds(clientCustomBuiltyPath);
					} else {
						checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
							if (isClientDefaultBuiltyPath) {
								// handle the file
								rendorTds(clientDefaultBuiltyPath);
							} else {
								checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
									if (isDefaultBuiltyPath) {
										// handle the file
										rendorTds(defaultBuiltyPath);
									}
								}).catch(next);
							}
						}).catch(next);
					}
				}).catch(next);
			} else {
				checkIfFile(clientDefaultBuiltyPath).then(function (isClientDefaultBuiltyPath) {
					if (isClientDefaultBuiltyPath) {
						// handle the file
						rendorTds(clientDefaultBuiltyPath);
					} else {
						checkIfFile(defaultBuiltyPath).then(function (isDefaultBuiltyPath) {
							if (isDefaultBuiltyPath) {
								// handle the file
								rendorTds(defaultBuiltyPath);
							}
						}).catch(next);
					}
				}).catch(next);
			}
		})
});

router.get("/tds", function (req, res, next) {

	let clientCustomBuiltyPath = (req.query && req.query.builtyName) ? path.resolve (projectHome, "hbs", "tds", req.clientData.clientId + "_" + req.query.builtyName + ".hbs") : undefined;
	let clientDefaultBuiltyPath = path.resolve (projectHome, "hbs", "tds", req.clientData.clientId + "_default.hbs");
	let defaultBuiltyPath = path.resolve (projectHome, "hbs", "tds", "tds_default" + ".hbs");

	function rendorTds (filePath) {
		res.render (filePath, {dateValue: Date.now (),layout: false, customerData:req.query, clientData: req.clientData, clientLogo:getLogo(req.clientData.clientId, "logo")});
	}

	if (clientCustomBuiltyPath) {
		checkIfFile (clientCustomBuiltyPath).then (function (isClientCustomBuiltyPath) {
			if (isClientCustomBuiltyPath) {
				// handle the file
				rendorTds (clientCustomBuiltyPath);
			} else {
				checkIfFile (clientDefaultBuiltyPath).then (function (isClientDefaultBuiltyPath) {
					if (isClientDefaultBuiltyPath) {
						// handle the file
						rendorTds (clientDefaultBuiltyPath);
					} else {
						checkIfFile (defaultBuiltyPath).then (function (isDefaultBuiltyPath) {
							if (isDefaultBuiltyPath) {
								// handle the file
								rendorTds (defaultBuiltyPath);
							}
						}).catch (next);
					}
				}).catch (next);
			}
		}).catch (next);
	} else {
		checkIfFile (clientDefaultBuiltyPath).then (function (isClientDefaultBuiltyPath) {
			if (isClientDefaultBuiltyPath) {
				// handle the file
				rendorTds (clientDefaultBuiltyPath);
			} else {
				checkIfFile (defaultBuiltyPath).then (function (isDefaultBuiltyPath) {
					if (isDefaultBuiltyPath) {
						// handle the file
						rendorTds (defaultBuiltyPath);
					}
				}).catch (next);
			}
		}).catch (next);
	}
});

router.get("/trip_summary_gen", async function (req, res, next) {

	let aTripGroup;

	try{
		aTripGroup = await Trip.find(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.query.tsNo,
				populateGR: true
			});

		if(!(Array.isArray(aTripGroup) && aTripGroup.length > 0)){
			res.status(400).json({
				status: "Error",
				message: `No Trip Group with Tsno ${req.query.tsNo} found`,
				error: true
			});
			return;
		}

	}catch (err) {
		console.log(err);
		return;
	}


	// Massageing Data

	aTripGroup = JSON.parse(JSON.stringify(aTripGroup));

	let templateData = {
		aTrip: aTripGroup,
		aAdv: [], // merging all Advances from all trips
		totAdvVoucher: 0, // total Advance Amount with voucher on all trips
		totSettle: 0, // total Settle Amount on all trips
		totSettleVoucher: 0, // total Settle Amount with voucher on all trips
		advSummary: {}, // sum of distint Advance Type on each Trips
		settleSummary: {}, // sum of distint Settle Type on each Trips
		totalKm: 0, // Sum of km of all trips
		dieselBudget: 0, // sum of all diesel budget(route_distace/mileage) of trips
		dieselGiv: 0, // sum of all Advance(of diesel liter) given on trips
		netAdvance: 0, // sum of all Advance given on trips
		netBudget: 0, // sum of all netBudget(i.e. ratePerKm/RouteDistance) on trips
		overDue: 0, // (netBudget - netAdvance) on all trips
		rtBalance: 0, // sum of balance of all account i.e. drive, happay, diesel, fasttag, vendor (rt => Round Trip)
		openingBal: 0, // opening Balance of RT NO. i.e. (sum of all account - sum of all advance with voucher + sum of settlement with voucher)
		closingBal: 0, // closing Balance of RT NO. i.e. (sum of all account - sum of all advance with voucher + sum of settlement with voucher)
	};

	aTripGroup.forEach(oTrip => {

		oTrip.advanceBudget.forEach( oAdv => {
			templateData.aAdv.push(oAdv);

			templateData.advSummary[oAdv.advanceType] = templateData.advSummary[oAdv.advanceType] || {
				amt: 0,
				settleAmt: {
					amt: 0,
					lit: 0
				}
			};

			templateData.advSummary[oAdv.advanceType].amt += oAdv.amount;
			templateData.totAdv += oAdv.amount;
			if(oAdv.voucher && oAdv.voucher._id)
				templateData.totAdvVoucher += oAdv.amount;
		});

		oTrip.trip_expenses.forEach(o => {

			templateData.advSummary[o.advanceType] = templateData.advSummary[o.advanceType] || {
				amt: 0,
				settleAmt: {
					amt: 0,
					lit: 0
				}
			};

			templateData.advSummary[o.advanceType].settleAmt.amt += o.amount;
			templateData.advSummary[o.advanceType].settleAmt.lit += o.dieseInfo && o.dieseInfo.litre || 0;

			templateData.settleSummary[o.type] = templateData.settleSummary[o.type] || {
				amt: 0,
				lit: 0
			};

			templateData.settleSummary[o.type].amt += o.amount;
			templateData.settleSummary[o.type].lit += o.dieseInfo && o.dieseInfo.litre || 0;

			templateData.totSettle += o.amount;
			if(o.voucher && o.voucher._id)
				templateData.totSettleVoucher += o.amount;
		});

		let routeDistance = (oTrip.route.route_distance + oTrip.extraKm) || 0;
		templateData.totalKm += routeDistance;
		templateData.dieselBudget += routeDistance / (oTrip.vehicle && oTrip.vehicle.current_budget && oTrip.vehicle.current_budget.mileage || 1);
		templateData.dieselGiv += oTrip.dieselGivenLtr;
		templateData.netAdvance += oTrip.tAdv||0;
		templateData.netBudget += oTrip.netBudget||0;

		oTrip.grNo = oTrip.gr.map(o => o.grNumber).join(', ');

	});

	templateData.overDue = templateData.netBudget - templateData.netAdvance;
	templateData.rtBalance = (templateData.aTrip[0].driver && templateData.aTrip[0].driver.account && templateData.aTrip[0].driver.account.balance || 0) +
								(templateData.aTrip[0].driver && templateData.aTrip[0].driver.happay && templateData.aTrip[0].driver.happay.balance || 0) +
								(templateData.aTrip[0].vehicle && templateData.aTrip[0].vehicle.fasttag && templateData.aTrip[0].vehicle.fasttag.balance || 0) +
								(templateData.aTrip[0].vendor && templateData.aTrip[0].vendor.account && templateData.aTrip[0].vendor.account.balance || 0);
	templateData.openingBal = templateData.rtBalance + templateData.totSettleVoucher - templateData.totAdvVoucher;
	templateData.closingBal = templateData.openingBal + templateData.netAdvance - templateData.totSettle;

	// transfroming object(templateData.advSummary) to array(templateData.advSummary)
	let tempArr = [];
	for(let key in templateData.advSummary){
		tempArr.push({
			type: key,
			amt: templateData.advSummary[key].amt,
			settleAmt: {
				amt: templateData.advSummary[key].settleAmt.amt,
				lit: templateData.advSummary[key].settleAmt.lit
			}
		})
	}

	templateData.advSummary = tempArr;

	// transfroming object(templateData.settleSummary) to array(templateData.settleSummary)
	tempArr = [];

	for(let key in templateData.settleSummary){
		tempArr.push({
			type: key,
			amt: templateData.settleSummary[key].amt,
			lit: templateData.settleSummary[key].lit
		})
	}

	templateData.settleSummary = tempArr;

	// Adjusting the length of Advance Summary with Settle Summary
	if(templateData.advSummary.length < templateData.settleSummary.length){
		let diff = templateData.settleSummary.length - templateData.advSummary.length;
		templateData.advSummary.push(...Array(diff).fill({}));
	}

	let defaultTripSummaryPath = path.resolve (projectHome, "hbs", "tripSummary", "trip_summary_default.hbs");

	function rendorTripSummary (filePath) {
		res.render (filePath, {
			templateData
		});
	}

	defaultTripSummaryPath && checkIfFile (defaultTripSummaryPath).then (function (isDefaultBuiltyPath) {
		if (isDefaultBuiltyPath) {
			// handle the file
			rendorTripSummary (defaultTripSummaryPath);
		}
	}).catch (next);
});

router.get("/round_trip_summary_gen", async function (req, res, next) {
	try {

		let aTripGroup = await Trip.find({
			clientId: req.user.clientId,
			'advSettled.tsNo': req.query.tsNo,
			//populateGR: true
		}).populate([{
			path: 'payments',
			model: PlainVoucher
		}]);

		let oData = {};
		oData.data =  Trip.eachTripSummary(aTripGroup);
		oData.summary = await Trip.tripSummary(oData.data);

		if(!(Array.isArray(aTripGroup) && aTripGroup.length > 0)){
			return res.status(500).json({
				status: "Error",
				message: `No Trip Group with Tsno ${req.query.tsNo} found`,
				error: true
			});
		}

		aTripGroup = JSON.parse(JSON.stringify(aTripGroup));

		let templateData = {
			aTrip: aTripGroup,
			res: oData,
		};

		let defaultTripSummaryPath = path.resolve(projectHome, "hbs", "roundTrip", "10808_roundTrip_summary.hbs");

		defaultTripSummaryPath && checkIfFile (defaultTripSummaryPath).then(function (isDefaultBuiltyPath) {
			if (isDefaultBuiltyPath) {
				res.render(defaultTripSummaryPath, {
					templateData
				});
			}
		}).catch (next);

	} catch (err) {
		return res.status(500).json({
			status: "Error",
			message: err.toString(),
			error: true
		});
	}
});

router.get("/round_trip_detailed_summary_gen", async function (req, res, next) {
	try {

		let aTripGroup = await Trip.find({
			clientId: req.user.clientId,
			'advSettled.tsNo': req.query.tsNo,
			populateGR: true
		}).populate([
			{
				path: 'payments',
				model: PlainVoucher
			}
		]);

		let oData = {};
		oData.data =  Trip.eachTripSummary(aTripGroup);
		oData.summary = await Trip.tripSummary(oData.data);

		if(!(Array.isArray(aTripGroup) && aTripGroup.length > 0)){
			return res.status(500).json({
				status: "Error",
				message: `No Trip Group with Tsno ${req.query.tsNo} found`,
				error: true
			});
		}

		aTripGroup = JSON.parse(JSON.stringify(aTripGroup));

		let templateData = {
			aTrip: aTripGroup,
			res: oData,
			aAdv: [],
			aExp: [],
			advSummary: {},
			settleSummary: {},
		};

		aTripGroup.forEach(oTrip => {

			oTrip.advanceBudget.forEach(oAdv => {
				templateData.aAdv.push(oAdv);

				templateData.advSummary[oAdv.advanceType] = templateData.advSummary[oAdv.advanceType] || {
					amt: 0,
					settleAmt: {
						amt: 0,
						lit: 0
					}
				};

				templateData.advSummary[oAdv.advanceType].amt += oAdv.amount;
				templateData.totAdv += oAdv.amount;
				if(oAdv.voucher && oAdv.voucher._id)
					templateData.totAdvVoucher += oAdv.amount;
			});

			oTrip.trip_expenses.forEach(o => {
				templateData.aExp.push(o);
				templateData.advSummary[o.advanceType] = templateData.advSummary[o.advanceType] || {
					amt: 0,
					settleAmt: {
						amt: 0,
						lit: 0
					}
				};

				templateData.advSummary[o.advanceType].settleAmt.amt += o.amount;
				templateData.advSummary[o.advanceType].settleAmt.lit += o.dieseInfo && o.dieseInfo.litre || 0;

				templateData.settleSummary[o.type] = templateData.settleSummary[o.type] || {
					amt: 0,
					lit: 0
				};

				templateData.settleSummary[o.type].amt += o.amount;
				templateData.settleSummary[o.type].lit += o.dieseInfo && o.dieseInfo.litre || 0;

				templateData.totSettle += o.amount;
				if(o.voucher && o.voucher._id)
					templateData.totSettleVoucher += o.amount;
			});

		});

		let defaultTripSummaryPath = path.resolve(projectHome, "hbs", "roundTrip", "10808_roundTrip_detailed.hbs");

		defaultTripSummaryPath && checkIfFile(defaultTripSummaryPath)
			.then(function (isDefaultBuiltyPath) {
				if (isDefaultBuiltyPath) {
					res.render(defaultTripSummaryPath, {
						templateData
					});
				}
			})
			.catch(next);

	} catch (err) {
		return res.status(500).json({
			status: "Error",
			message: err.toString(),
			error: true
		});
	}
});

router.post("/voucher", async function (req,res,next) {
try{
	let voucherData = await PlainVoucher.find({_id: req.body._id}).lean();
	renderVoucher(voucherData);

}catch(err){
	console.log(err);
}
	function renderVoucher (voucher) {

		if(voucher && voucher[0]){
			let voucherData = JSON.parse(JSON.stringify(voucher[0]));

			let tdsAccount = {};
			// let ledgerArray = [];
			let crAccount = [];
			let drAccount = [];
			let tdsArray = [];
			voucherData.total_drAmount = 0, voucherData.total_crAmount = 0;
			voucherData.billNumber = '';
			voucherData.accName = '';

		voucherData.ledgers.forEach(obj => {
				var reg = /tds/i.test(obj.lName) ;
				if(reg){
					tdsAccount.lName = obj.lName;
					tdsAccount.amount = obj.amount;
					tdsAccount.bills = [];
					tdsAccount.bills.push(obj.bills);
					tdsArray.push(tdsAccount);
				}
				if(!reg && obj.cRdR === "CR"){
					crAccount.push(obj);
					voucherData.total_crAmount += obj.amount;
					voucherData.accName += (voucherData.lName  ? ( ' , ' + obj.lName) : obj.lName);

					obj.bills.forEach(ob => {
						voucherData.billNumber += (voucherData.billNumber  ? ( ' , ' + ob.billNo) : ob.billNo);
					});

				}
				if(!reg && obj.cRdR === "DR"){
					drAccount.push(obj);
					voucherData.total_drAmount += obj.amount;
				}
				});
			voucherData.tdsAccount = tdsAccount;
			voucherData.tdsArray =  tdsArray;
			voucherData.crAccount = crAccount;
			voucherData.drAccount = drAccount;

			let templateVoucherData = { layout: false };
			if(!req.clientData.billDir){
				req.clientData.billDir = req.clientData.clientId;
			}

			let defaultPath = path.resolve(projectHome, "hbs", "voucher", "11309_default.hbs");
			let billPath = path.resolve(projectHome, "hbs", "voucher", req.clientData.clientId + "_" + req.body.builtyName + '.hbs');
			voucherData.logo = domain + 'logos/' + 'voucher' + "/" + ((!req.body.builtyName)?"logo":"logo_"+req.body.builtyName) + ".jpg";

			billPath && checkIfFile (billPath).then(function (data) {
				if (data) {
					res.render(billPath, {
						templateVoucherData: voucherData
					});
				}else{
					res.render(defaultPath, {
						templateVoucherData: voucherData
					});
				}
			}).catch (next);

		}else {
			return res.status(500).json({"status":"ERROR", "message": "No Data Found"})
		}
	}
});

router.get("/multiAdvPreview", async function (req,res,next){
	try{
		let multVendData = await Trip.find({_id: req.query._id}).populate('gr').populate('vendor').lean();
		renderMultVend(multVendData);
	}catch(err){
		return res.status(500).json({
			status: "Error",
			message: err.toString(),
			error: true
		});
	}

	function renderMultVend(multVend) {
		if(multVend && multVend[0]){
			let multVendData = JSON.parse(JSON.stringify(multVend[0]));
			multVendData.todayDate = new Date();
			multVendData.source = multVendData.rName && multVendData.rName.slice(0, multVendData.rName.indexOf(' '));
			multVendData.destination = multVendData.rName && multVendData.rName.slice(multVendData.rName.lastIndexOf(' ') + 1);
			multVendData.remainingAmt = (multVendData.vendorDeal && multVendData.vendorDeal.totWithMunshiyana ? multVendData.vendorDeal.totWithMunshiyana : 0) +
										(multVendData.vendorDeal && multVendData.vendorDeal.totalCharges ? multVendData.vendorDeal.totalCharges : 0) -
										(multVendData.vendorDeal && multVendData.vendorDeal.totalDeduction ? multVendData.vendorDeal.totalDeduction : 0) -
										(multVendData.vendorDeal && multVendData.vendorDeal.tdsAmount ? multVendData.vendorDeal.tdsAmount : 0 );

			if(!req.clientData.billDir){
				req.clientData.billDir = req.clientData.clientId;
			}

			let defaultPath = path.resolve(projectHome, "hbs", "multiVendor",  req.clientData.clientId + "_" + "FT_advancePaymentSlip.hbs");
			let MultVendPath = path.resolve(projectHome, "hbs", "multiVendor", req.clientData.clientId + "_" + req.query.builtyName + '.hbs');
			multVendData.logo = domain + 'logos/' + 'multiVendor' + "/" + ((!req.query.builtyName)?"logo":"logo_"+req.query.builtyName) + ".jpg";

			MultVendPath && checkIfFile (MultVendPath).then(function (data) {
				if (data) {
					res.render(MultVendPath, {
						multVendorData: multVendData
					});
				}else{
					res.render(defaultPath, {
						multVendorData: multVendData
					});
				}
			}).catch (next);

		}else {
			return res.status(500).json({"status":"ERROR", "message": "No Data Found"})
		}
	}
});

module.exports = router;
