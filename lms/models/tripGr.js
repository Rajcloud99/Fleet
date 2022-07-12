const ExcelReader = require('../../utils/ExcelReader');
const mongoose = require('mongoose');
const Trip = commonUtil.getModel('trip');
const async = require('async');
const moment = require('moment');
const RegisteredVehicleModel = commonUtil.getModel('registeredVehicle');
const serverSidePage = require('../../utils/serverSidePagination');

let chargesType = {
	amount: Number,
	typ: String,
	narration: String,
	tdsAmount: Number,
	tdsPercent: Number,
	voucher: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	tdsVoucher: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	from: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	fromName: String,
	to: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	toName: String,
	tdsAccount: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	tdsAccountName: String,
	date: Date,
	remark: String
};

var tripGrSchema = new mongoose.Schema({
		clientId: constant.requiredString,
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		refGr: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "TripGr"
		},
		integration: {
			shell: {
				shipmentNo: String,
				delivered: {
					default: false,
					type: Boolean
				},
			}
		},
		gr_type: {
			type: String,
			enum: constant.gr_types
		},
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'BookingV2'
		},
		trip_no: Number,
		trip: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'tripV2'
		},
		route: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "TransportRoute"
		},
		status: {
			type: String,
			enum: constant.grItemStatus
		},
		coverNote: {
			isCovernote: {
				type: Boolean,
				default: false
			},
			actualGr: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TripGr'
			},
			grNumber: String,
			actualGrNumber: String,
			actualGrDate: String
		},

		isGrBillable: {
			type: Boolean,
			default: true
		},
		isSupplementaryShow: {
			type: Boolean,
			default: true
		},
		gateoutDate:Date,
		gatePassDate:Date,
		vehicle_no: String,
		vehicle: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RegisteredVehicle'
		},
		customer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		consignor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'consignor_consignee'
		},
		consignee: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'consignor_consignee'
		},
		billingParty: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		eWayBills: [{
			number: String,
			expiry: Date,
			markExp: {
				type: Boolean,
				default: false
			},
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		invoices: [{
			routeDistance: Number,
			baseValue: Number,
			rateChartRate: Number,
			baseValueLabel: String,
			dphRate:Number,
			invoiceNo: String,
			invoiceDate: Date,
			gateoutDate:Date,
			gatePassDate:Date,
			invoiceAmt: Number, // Invoice  Amount
			invoiceRate: Number, // Invoice  Rate
			insurRate: Number, // Insurance Rate
			insurVal: Number, // Insurance Value
			rate: Number, // it comes from rateChart
			billingRate: Number,
			materialUnit: String,
			material: {
				material_type: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'MaterialType'
				},
				materialName: String,
				unit: [{
					type: String
				}],
				groupName: String,
				groupCode: String,
				groupId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "MaterialGroup",
				}
			},
			showOnBill: {
				type: Boolean,
				default: true
			},

			// Actual Values
			weightPerUnit: Number, // it holds weight in case of PMT and Weight/Unit in case of PUnit  //actualweight
			noOfUnits: Number, // it hold Number Of Unit in case on PUnit only

			// Billing Values
			billingWeightPerUnit: Number, // it holds weight in case of PMT and Weight/Unit in case of PUnit
			billingNoOfUnits: Number, // it hold Number Of Unit in case on PUnit only

			freight: Number, // freight = rate * (BillingNoOfUnits(in case of PUnit) or BillingWeightPerUnit(in case of Weight))

			loadRefNumber: String,
			ref1: String,
			ref2: String,
			ref3: String,
			ref4: String,
			ref5: String,
			ref6: String,
			num1: Number,
			num2: Number,
			num3: Number,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			},
		}],
		num4: Number,
		num5: Number,
		num6: Number,
		standardTime: Number, // standard "Days" it should take vehice to reach destination
		chargeableTime: Number,
		transitTime: Number,
		incentivePercent: Number,
		loading_amount: Number,
		unloading_amount: Number,

		loadingDetentionRate: Number,
		unloadingDetentionRate: Number,

		//////////////////////////////////////////////////////
		invoiceNumber: String,
		invoiceDate: Date,
		weight_per_unit: Number,
		total_no_of_units: Number,
		loadRefNumber: String,
		///////////////////////////////////////////////////////////////////////////

		"cGST": Number,
		"sGST": Number,
		"iGST": Number,
		"cGST_percent": Number,
		"sGST_percent": Number,
		"iGST_percent": Number,
		"totalAmount": Number,//Total with Tax
		grNumber: String,
		stationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billStationary'
		},
		tjo_no: String,
		estimated_moisture: Number,
		actual_moisture: Number,
		internal_rate: Number,
		grDate: Date,
		container: String,
		weight: Number,
		unit: Number,
		l_tare_w: Number,
		l_gross_w: Number,
		l_net_w: Number,
		ul_tare_w: Number,
		ul_gross_w: Number,
		ul_net_w: Number,
		tripCancelled: {
			type: Boolean,
			default: false
		},
		//expiryDate: Date,  // nipun
		pendingRemark: [{
			systemDate: Date,
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			remark: String,
			place: String,
			reason: {
				type: String
				//enum:['']
			},
			expected_arrival: Date
		}
		],
		expected_arrival: Date,
		acknowledge: {
			status: {
				type: Boolean,
				default: false
			},
			doneRemark: String,
			source: String,
			sourceState: String,
			destination: String,
			destinationState: String,
			billedSource: String,
			bsst: String,
			billedDestination: String,
			bdst: String,
			routeDistance: Number, // rateChart data
			baseValue: Number, // rateChart data
			rateChartRate: Number, // rateChart data
			via: {
				type: {
					type: String,
					enum: ['Driver', 'Courier', 'By Hand']
				},
				courier_name: String,
				courier: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'VendorCourier'
				},
				driver_name: String,
				driver: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Driver'
				},
				referenceNo: String
			},
			user_name: String,
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			systemDate: Date
		},
		statuses: [{
			status: {
				type: String,
				enum: constant.grItemStatus
			},
			syncDate: Date,
			syncBy: String,
			date: Date,
			systemDate: Date,
			user_full_name: String,
			user_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			remark: String,
			location2: String,  //user put manual location for stc
			location: {
				type: Object
			},
			gpsData: {
				type: Object,
				validate: {
					validator: function (o) {
						return !Array.isArray(o);
					}
				}
			}
		}],
		bills: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'bill'
		}],
		supplementaryBillRef: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'bill'
		}],
		provisionalBill: [{
			percent: Number,
			ref: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'bill'
			}
		}],
		isProvBillGen: {
			default: false,
			type: Boolean
		},
		invToBill: {
			default: false,
			type: Boolean
		},
		bill: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'bill'
		},
		documents: [{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		advance: [{
			receivingDate: Date,
			amount: Number,
			ref: String,
			remark: String,
			from: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			to: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			entryDate: {
				type: Date,
				default: Date.now
			}
		}],
		in: [{  //Incidental
			amt: Number,
			refNo: String,
			remark: String,
			vch: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			}
		}],
		his: [{
			typ: String,
			by: String,
			at: Date,
			rmk: String,
		}],
		isNonBillable: {
			default: false,
			type: Boolean
		},
		fpa: {
			amt: Number,
			factor: Number,
			refNo: String,
			rmk: String,
			dedAmt: Number,
			linkMr: Boolean,
			// dedType: String,
			date: Date,
			createdAt: Date,
			createdBy: String,
			vndr: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorTransport'
			},
			vndrName: String,
			vch: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			},
			deduction: {
				tdsDeduction: chargesType,
				insuranceDeduction: chargesType,
				operationDeduction: chargesType,
				shortageDeduction: chargesType,
			},
		},
		moneyReceipt: {
			collection: [{
				mrOffice: String,
				mrDate: Date,
				mrNo: String,
				mrAmount: Number,
				paymentMode: String,
				paymentRef: String,
				paymentRmk: String,
				paymentDate: Date,
				partyName: String,
				paymentId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'tripadvances'
				},
				mrRef: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "MoneyReceipt"
				}
			}],
			branch: {
				ref: {type: mongoose.Schema.Types.ObjectId, ref: 'Branch'},
				name: String,
			},
			deduction: {
				'loadingAmount': Number,
				'unloadingAmount': Number,
				'ltDeliveryAmount': Number,
				'damageAmount': Number,
				'shortageAmount': Number,
				'tdsAmount': Number,
				'kantaCharge': Number,
				'commission': Number,
				'munshiyanaAmount': Number,
				'other': Number,
			},
			'totalMrAmount': Number,
			'chitPending': String,
			'balanceFreight': Number,
			'paymentParty': String,
			'responsiblePerson': String,
			'mobileNo': Number,
			'emailId': String,
			'remark': String,
			'letterNo': String,
		},
		charges: {
			'grCharges': Number,
			'surCharges': Number,
			'cartageCharges': Number,
			'labourCharges': Number,
			'prevFreightCharges': Number,
			'detentionLoading': Number,
			'detentionUnloading': Number,
			'loading_charges': Number,
			'unloading_charges': Number,
			'weightman_charges': Number,
			'overweight_charges': Number,
			'incentive': Number,
			'other_charges': Number,
			'extra_running': Number,
			'dala_charges': Number,
			'diesel_charges': Number,
			'kanta_charges': Number,
			'factory_halt': Number,
			'company_halt': Number,
			'toll_charges': Number,
			'green_tax': Number,
			'twoPtDelivery': Number,
		},
		'detentionLoadingD1': Number,       //Loading Day 1    for STC
		'detentionLoadingD2': Number,       //Loading Day 2    for STC
		'detentionLoadingD3': Number,       //Loading Day 3    for STC
		'detentionUnloadingD1': Number,     //unLoading Day 1   for STC
		'detentionUnloadingD2': Number,     //unLoading Day 2   for STC
		'detentionUnloadingD3': Number,     //unLoading Day 3   for STC
		deduction: {
			'penalty': Number,
			'shortage': Number,
			'damage': Number,
			'discount': Number,
			'advance_charges': Number,
			'ttDelay': Number,
			'dalaComission': Number,
			'tds': Number,
			'mamul': Number,
		},
		nbCharges: {                                //non-billable charges
			'grCharges': Number,
			'surCharges': Number,
			'cartageCharges': Number,
			'labourCharges': Number,
			'prevFreightCharges': Number,
			'detentionLoading': Number,
			'detentionUnloading': Number,
			'loading_charges': Number,
			'unloading_charges': Number,
			'weightman_charges': Number,
			'overweight_charges': Number,
			'incentive': Number,
			'other_charges': Number,
			'extra_running': Number,
			'dala_charges': Number,
			'diesel_charges': Number,
			'kanta_charges': Number,
			'factory_halt': Number,
			'company_halt': Number,
			'toll_charges': Number,
			'green_tax': Number,
			'twoPtDelivery': Number,
		},
		selectedSupply: [{
			type: String
		}],
		supplementaryBill: {
			totalFreight: Number,
			basicFreight: Number,
			rate: Number,
			totalCharges: Number,
			totalDeduction: Number,
			incentivePercent: Number,
			charges: {
				'incentive': Number,
				'grCharges': Number,
				'surCharges': Number,
				'cartageCharges': Number,
				'labourCharges': Number,
				'prevFreightCharges': Number,
				'detentionLoading': Number,
				'detentionUnloading': Number,
				'loading_charges': Number,
				'unloading_charges': Number,
				'weightman_charges': Number,
				'overweight_charges': Number,
				'other_charges': Number,
				'extra_running': Number,
				'dala_charges': Number,
				'diesel_charges': Number,
				'kanta_charges': Number,
				'factory_halt': Number,
				'company_halt': Number,
				'toll_charges': Number,
				'green_tax': Number,
				'twoPtDelivery': Number
			},
			deduction: {
				'penalty': Number,
				'shortage': Number,
				'damage': Number,
				'discount': Number,
				'advance_charges': Number,
				'ttDelay': Number,
				'dalaComission': Number,
				'tds': Number,
				'mamul': Number,
				'otherGuide': Number
			}
		},
		"creditNote": [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "CreditNote"
		}],
		"moneyReceiptRef": [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "MoneyReceipt"
		}],
		dedVchId: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Voucher'
		}],
		dedVch: [{
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			},
			amount: Number,
			date: Date,
			refNo: String,
			vT: String
		}],
		diesel_index: {
			type: Number,
			default: 0
		},
		vehicle2: String,
		pod: {
			arNo: String,
			branch: String,
			date: Date,
			arRemark: String,
			type: {
				type: String,
				enum: ['Driver', 'Courier', 'By Hand']
			},
			courier_name: String,
			courier: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorCourier'
			},
			driver_name: String,
			driver: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Driver'
			},
			user_name: String,
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			person: String,
			received: {
				type: Boolean,
				default: false
			},
			billingLoadingTime: Date,   //Loading End
			billingUnloadingTime: Date, //Unloading End
			loadingArrivalTime: Date,	//Loading Arrival
			unloadingArrivalTime: Date, //Unloading Arrival
			billingWeight: Number,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			},
			doc: {
				front: {type: String},
				back: {type: String},
				grFront: {type: String},
				grBack: {type: String},
				invoice: [{type: String}],
				eway: [{type: String}],
				insur: [{type: String}],
				misc: [{type: String}],
			},
			pendingRemarks: [{
				remark: String,
				givenBy: String,
				givenAt: {
					type: Date,
					default: Date.now,
				},
			}],
			systemDate: Date
		},
		// mr: [{
		// 	mrNo: String,
		// 	checkNo: String,
		// 	checkDate: Date,
		// }],
		geofence_points: [{
			'geofence_type': {
				type: String,
				required: true,
				default: 'GR'
			},
			'data_id': String,
			'name': String,
			'addr': String,
			'geozone': [{latitude: Number, longitude: Number}],
			'radius': {type: Number, default: 2000},
			'is_inside': {type: Boolean, default: false},
			'location_buffer': [{datetime: Date, lat: Number, lng: Number, course: Number}],
			'events': [{
				datetime: Date,
				lat: Number,
				lng: Number,
				course: Number,
				address: String,
				imei: Number,
				entry: Boolean
			}],
			'sms': [String],
			'email': [String],
			'loc': String,
			'type': {type: String},
			'entry': Number,
			'exit': Number,
			'enabled': {type: Number, default: 1},
			'created_at': Date,
			'contact_person_name': String,
			'contact_person_number': Number,
			'contact_person_email': String,
			'deleted': {type: Boolean, default: false}

		}],
		remarks: String,
		payment_type: String,
		payment_basis: String,
		rate: Number,
		advanceAmt: Number,    // Advance receiving
		basicFreight: Number, //only gr freight without extra charges and deductions
		totalFreight: Number,//with charges
		totalCharges: Number,
		tnbCharges: Number, //total non-billable charges
		totalDeduction: Number,
		totalChargesWithoutTax: Number,
		tMemo: {                         // Trip MEMO
			created_by: String,
			createdAt: Date,
			lastModifiedBy: String,
			lastModifiedAt: Date,
			'tMNo': String,
			'stationaryId': {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'billStationary'
			},
			'date': Date,
			'rate': Number, //ratePerTrip
			'pmtRate': Number,
			"perUnitPrice": Number,
			"totalUnits": Number,
			'minPayableAmt': Number,
			"pmtWeight": Number,
			advance: Number,
			toPay: Number,
			munshiyana: Number,
			total: Number,
			totalDeal: Number,
			remark: String,
			advance_due_date: Date,
			topay_due_date: Date,
			payment_type: String,
			weight_type: String,
		},
		bMemo: {                             // broker MEMO
			vendor: {                  // Transport Vendor
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorTransport'
			},
			created_by: String,
			createdAt: Date,
			lastModifiedBy: String,
			lastModifiedAt: Date,
			'bmNo': String,
			'stationaryId': {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'billStationary'
			},
			'date': Date,
			'rate': Number, //ratePerTrip
			'pmtRate': Number,
			"perUnitPrice": Number,
			"totalUnits": Number,
			'minPayableAmt': Number,
			"pmtWeight": Number,
			advance: Number,
			toPay: Number,
			munshiyana: Number,
			comission: Number,
			total: Number,
			totalDeal: Number,
			remark: String,
			advance_due_date: Date,
			topay_due_date: Date,
			payment_type: String,
			weight_type: String,
		},
		tMemoReceipt: [{
			voucher: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			},
			branch: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Branch',
			},
			fromAccount: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts',
			},
			fromName: String,
			toAccount: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts'
			},
			toName: String,
			trip_no: Number,
			vehicle_no: String,
			refNo: String,
			stationaryId: {type: mongoose.Schema.Types.ObjectId, ref: 'billStationary'},
			amount: Number,
			remainingAmount: Number,
			remark: String,
			paymentDate: Date,
			paymentMode: String,
			paymentRef: String,
			vT: String,
			vAdv: String,      // all, advance, balance
			grNumber: String,
			tMemoNo: String,
			created_by: String,
			created_at: Date,
		}],
		created_by_full_name: String,
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		created_at: Date,
		last_modified_at: Date,
		last_modified_by: String,
	},
	{
		usePushEach: true,
		...constant.timeStamps
	}
);

tripGrSchema.statics.buildPopQuery = function (str = false) {

	let arr, query = [];

	if (str)
		arr = JSON.parse(str);

	if (!Array.isArray(arr))
		return [];

	arr.forEach(key => {
		switch (key) {
			case 'bill':
				query.push(
					{
						$lookup: {
							from: "bills",
							localField: "bill",
							foreignField: "_id",
							as: "bill"
						}
					},
					{
						$unwind: {
							path: '$bill',
							preserveNullAndEmptyArrays: true
						}
					},
				);
				break;
			case 'provisionalBill':
				query.push(
					{
						$lookup: {
							from: "bills",
							localField: "provisionalBill",
							foreignField: "_id",
							as: "provisionalBill"
						}
					},
					{
						$unwind: {
							path: "$provisionalBill",
							preserveNullAndEmptyArrays: true
						}
					}
				);
				break;
		}
	});

	return query;

};

tripGrSchema.statics.uploader = async function ({filePath}) {
	const excelData = new ExcelReader({
		filePath,
		config: {
			'GR ID': {
				keyName: '_id',
			},
			'GR NO.': {
				keyName: 'grNumber',
				ignoreIfValueIs: 'NA',
			},
			'GR DATE': {
				keyName: 'grDate',
				dateFormat: 'DD-MM-YYYY',
				ignoreIfValueIs: 'NA',
			},
			"GR TYPE": {
				keyName: 'gr_type',
				enum: ["Own", "Market", "Centralized"],
				ignoreIfValueIs: 'NA',
			},
			'LOADING DATE': {
				keyName: 'loadingEndDate',
				dateFormat: 'DD-MM-YYYY',
				ignoreIfValueIs: 'NA',
			},
			'VEHICLE NO.': {
				keyName: 'vehicle_no',
				required: true,
				stateReducer: function (vehRegNo) {
					let dig4;
					let remainingChars = vehRegNo.replace(/\d{4}/, function (replacedStr) {
						dig4 = replacedStr;
						return '';
					});
					return remainingChars + dig4;
				}
			},
			"INVOICE NO.": {
				// keyName: 'invoices.$[elem].invoiceNo',
				keyName: 'inv.invoiceNo',
				ignoreIfValueIs: 'NA',
				// ignoreKeyNameEvaluation: true,
			},
			"INVOICE DATE": {
				// keyName: 'invoices.$[elem].invoiceDate',
				keyName: 'inv.invoiceDate',
				// ignoreKeyNameEvaluation: true,
				ignoreIfValueIs: 'NA',
			},
			"WEIGHT PER UNIT": {
				// keyName: 'invoices.$[elem].weightPerUnit',
				keyName: 'inv.weight_per_unit',
				ignoreIfValueIs: 'NA',
				// ignoreKeyNameEvaluation: true,
			},
			"# OF UNITS": {
				// keyName: 'invoices.$[elem].noOfUnits',
				keyName: 'inv.total_no_of_units',
				ignoreIfValueIs: 'NA',
				// ignoreKeyNameEvaluation: true,
			},
			"LOAD REF. NO": {
				// keyName: 'invoices.$[elem].loadRefNumber',
				keyName: 'inv.loadRefNumber',
				ignoreIfValueIs: 'NA',
				// ignoreKeyNameEvaluation: true,
			},
			"INTERNAL RATE": {
				keyName: 'internal_rate',
				ignoreIfValueIs: 'NA',
			},
			"WEIGHT": {
				keyName: 'weight',
				ignoreIfValueIs: 'NA',
			},
			"UNIT": {
				keyName: 'unit',
				ignoreIfValueIs: 'NA',
			},
		},
	});

	let grDetails = await excelData.read();

	const grToTripCache = {};
	async.eachSeries(grDetails, function (gr, callback) {
		RegisteredVehicleModel.findOne({clientId: '10808', vehicle_reg_no: gr.vehicle_no}, {
			vehicle_reg_no: 1,
			_id: 1
		}).then(function (veh) {
			let f = {
				_uploadOp: {$not: {$eq: true}},
				vehicle: veh._id,
				statuses: {
					$elemMatch: {
						status: 'Loading Ended',
						date: {
							$gte: moment(gr.grDate).startOf('day').toDate(),
							$lte: moment(gr.grDate).endOf('day').toDate(),
						}
					}
				}
			};
			mongoose.model('TripGr').findOne(f).populate('trip').then((foundGr) => {
				if (foundGr) {
					console.log('gr found');
				}
				gr['_uploadOp'] = true;
				callback();
				/*if(foundGr) {
		  grToTripCache[`${gr.vehicle_no}${new Date(gr.loadingEndDate).getTime()}`] = foundGr.trip._id;
		  let upsertFil, grId = gr._id, grInv = { ...gr.inv };
					delete gr.inv;
					if(foundGr.trip.gr.includes(gr._id)) {
						upsertFil = { _id: foundGr._id };
						delete gr._id;
					}
					mongoose.model('TripGr').updateOne(upsertFil, { $set: gr, $push: { 'invoices': grInv } }).then(() => {
						callback();
					});
					} else {
					let tripOfGr = grToTripCache[`${gr.vehicle_no}${new Date(gr.loadingEndDate).getTime()}`];
					if(tripOfGr) {
						mongoose.model('TripGr').create(gr).then(function(newGr) {
							Trip.updateOne({ _id: tripOfGr }, { $push: { gr: newGr._id } }).then(function() {
								callback();
							});
						});
					}
				}*/
			});
		});
	}, function (err) {
		if (err) throw err;
		console.log('async eachSeries callback done')

	});

	/*grDetails = await Promise.all(grDetails
		.filter(g => Object.keys(g).length > 1)
		.map(async gr => {
			let foundGr = (await GR.findOne({
				vehicle_no: gr.vehicle_no,
				statuses: {
					$elemMatch: {
						status: 'Loading Ended',
						date: {
							$gte: moment(gr.loadingEndDate).startOf('day').toDate(),
							$lte: moment(gr.loadingEndDate).endOf('day').toDate(),
						}
					}
				}
			}).populate('trip')).lean();
			if(foundGr) {
				gr['_id'] = foundGr._id;
				gr['trip'] = foundGr.trip;
			}
			return gr;
		}));*/

	/*grDetails = GR.find({
		$or: grDetails
			.filter(g => Object.keys(g).length > 1)
			.map(gr => ({
				vehicle_no: gr.vehicle_no,
				statuses: {
					$elemMatch: {
						status: 'Loading Ended',
						date: {
							$gte: moment(gr.loadingEndDate).startOf('day').toDate(),
							$lte: moment(gr.loadingEndDate).endOf('day').toDate(),
						}
					}
				}
		}))
	}).populate('trip').lean();*/

	/*const grIdCache = {};

	let grBulk = grDetails.map(gr => {
		let upsertFil, grId = gr._id, grInv = { ...gr.inv }, oId = mongoose.Types.ObjectId();
		delete gr._id;
		delete gr.inv;
		if(!grIdCache[grId.toString()] && gr.trip.gr.includes(grId.toString())) {
			grIdCache[grId.toString()] = true;
			upsertFil = {
				_id: grId,
			};
		} else {
			gr.trip.gr.push(oId);
			upsertFil = {
				_id: oId,
				vehicle_no: gr.vehicle_no,
				statuses: {
					$elemMatch: {
						status: 'Loading Ended',
						date: {
							$gte: moment(gr.loadingEndDate).startOf('day').toDate(),
							$lte: moment(gr.loadingEndDate).endOf('day').toDate(),
						}
					}
				}
			};
		}
		return {
			updateOne: {
				filter: upsertFil,
				update: {
					$setOnInsert: { _id: oId },
					$set: gr,
					$push: { 'invoices': grInv }
				},
				upsert: true,
				// multi: true,
				// arrayFilters: [ { 'elem.invoiceNo': gr['invoices.$[elem].invoiceNo'] } ],
			},
		};
		/!*return {
			insertOne: {
				document: gr
			}
		};*!/

	});

	const grStats = await this.bulkWrite(grBulk);*/
};

tripGrSchema.statics.paginate = async function (query) {
	query.queryFilter.trip_query = query.queryFilter.trip_query || {};
	query.queryFilter.bill_query = query.queryFilter.bill_query || {};
	query.queryFilter.vehicle_query = query.queryFilter.vehicle_query || {};

	let trip_query = {};
	for (ky in query.queryFilter.trip_query) {
		if (query.queryFilter.trip_query.hasOwnProperty(ky)) {
			if (ky !== 'trip_no' && typeof ky === "string" && query.queryFilter.trip_query[ky].match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i)) {
				trip_query[`trip.${ky}`] = mongoose.Types.ObjectId(query.queryFilter.trip_query[ky]);
			} else {
				trip_query[`trip.${ky}`] = query.queryFilter.trip_query[ky];
			}
		}
	}

	let bill_query = {};
	for (ky in query.queryFilter.bill_query) {
		if (query.queryFilter.bill_query.hasOwnProperty(ky)) {
			if (mongoose.Types.ObjectId.isValid(query.queryFilter.bill_query[ky])) {
				bill_query[`bill.${ky}`] = mongoose.Types.ObjectId(query.queryFilter.bill_query[ky]);
			} else {
				bill_query[`bill.${ky}`] = query.queryFilter.bill_query[ky];
			}
		}
	}

	let vehicle_query = {};
	for (ky in query.queryFilter.vehicle_query) {
		if (query.queryFilter.vehicle_query.hasOwnProperty(ky)) {
			if ((ky == 'vendor_id' || ky == '_id') && mongoose.Types.ObjectId.isValid(query.queryFilter.vehicle_query[ky])) {
				vehicle_query[`trip.vehicle.${ky}`] = mongoose.Types.ObjectId(query.queryFilter.vehicle_query[ky]);
			} else {
				vehicle_query[`trip.vehicle.${ky}`] = query.queryFilter.vehicle_query[ky];
			}
		}
	}

	delete query.queryFilter.trip_query;
	delete query.queryFilter.bill_query;
	delete query.queryFilter.vehicle_query;

	if (query.queryFilter['billingParty._id']) {
		query.queryFilter['billingParty'] = mongoose.Types.ObjectId(query.queryFilter['billingParty._id']);
	}
	let grLevel2Filters = {};
	if (query.queryFilter['GR Assigned status.date']) {
		grLevel2Filters['GR Assigned status.date'] = query.queryFilter['GR Assigned status.date'];
		delete query.queryFilter['GR Assigned status.date'];
	}
	if (query.queryFilter['Loading Ended status.date']) {
		grLevel2Filters['Loading Ended status.date'] = query.queryFilter['Loading Ended status.date'];
		delete query.queryFilter['Loading Ended status.date'];
	}
	if (query.queryFilter['Vehicle Arrived for unloading status.date']) {
		grLevel2Filters['Vehicle Arrived for unloading status.date'] = query.queryFilter['Vehicle Arrived for unloading status.date'];
		delete query.queryFilter['Vehicle Arrived for unloading status.date'];
	}
	delete query.queryFilter['billingParty._id'];
	let companyFilter = {};
	if (query.queryFilter['billingParty.clientId']) {
		companyFilter = {'billingParty.clientId': query.queryFilter['billingParty.clientId']};
	}
	delete query.queryFilter['billingParty.clientId'];

	let projection = {
		status: 1,
		grNumber: 1,
		grDate: 1,
		'statuses.date': 1,
		'statuses.status': 1,
		'statuses.remark': 1,
		'statuses.location2': 1,
		'statuses.systemDate': 1,
		'statuses.user_full_name': 1,
		"totalVM": 1,
		"vendorAdvancePaid": 1,
		"totSubsAmt": 1,
		"totRemAmt": 1,
		'trip.trip_no': 1,
		'trip.imd': 1,
		'trip.ld': 1,
		'trip.uld': 1,
		'trip.statuses': 1,
		'trip.status': 1,
		'trip.allocation_date':1,
		'trip.vehicle.vehicle_reg_no': 1,
		'trip.vehicle.gpsData': 1,
		'trip.vehicle_no': 1,
		'trip.vehicle.model': 1,
		'trip.vehicle.costCenter': 1,
		'trip.vehicle.veh_group_name': 1,
		'trip.vehicle.owner_name': 1,
		'trip.vehicle.owner_name': 1,
		'trip.vehicle.vendor_id': 1,
		'trip.vehicle.driver_name': 1,
		'trip.segment_type': 1,
		'trip.start_date': 1,
		'trip.end_date': 1,
		'trip.vehicle.vendor_name': 1,
		'trip.vehicle.vendor_mobile': 1,
		'trip.vendorDeal.loading_slip': 1,
		'trip.vendorDeal.totalCharges': 1,
		'trip.vendorDeal.totalDeduction': 1,
		'trip.vendorDeal.totWithMunshiyana': 1,
		'trip.vendorDeal.tdsAmount': 1,
		'trip.vendorDeal.charges': 1,
		'trip.ownershipType': 1,
		'trip._id': 1,
		'trip.driver.name':1,
		'trip.driver._id':1,
		invoices: 1,
		num4: 1,
		num5: 1,
		num6: 1,
		'customer.name': 1,
		'customer._id': 1,
		'customer.configs': 1,
		'customer.billTemplate': 1,
		'customer.grTemplate': 1,
		'customer.shipperEnterprise': 1,
		'customer.shipperOrganization': 1,
		'customer.category': 1,
		'trip.route': 1,
		'trip.route_name': 1,
		'trip.rName': 1,
		'consignor.name': 1,
		'consignor.businessLocation': 1,
		'consignor._id': 1,
		'consignor.address': 1,
		'consignee.name': 1,
		'consignee.businessLocation': 1,
		'consignee._id': 1,
		'consignee.address': 1,
		'stationaryId': 1,
		'supplementaryBillRef': 1,
		'billingParty': 1,
		'deduction': 1,
		'vehicle': 1,
		'route.name': 1,
		'route.source.c': 1,
		'route.destination.c': 1,
		'route.route_distance': 1,
		acknowledge: 1,
		payment_basis: 1,
		payment_type: 1,
		container: 1,
		charges: 1,
		gateoutDate:1,
		gatePassDate:1,
		nbCharges: 1,
		moneyReceipt: 1,
		supplementaryBill: 1,
		basicFreight: 1,
		'route._id': 1,
		totalFreight: 1,
		cGST: 1,
		sGST: 1,
		iGST: 1,
		iGST_percent: 1,
		cGST_percent: 1,
		sGST_percent: 1,
		totalAmount: 1,
		'branch.name': 1,
		'branch.grBook.ref': 1,
		'branch._id': 1,
		'branch.billCC': 1,
		'branch.gstin': 1,
		'trip.vendor.name': 1,
		eWayBills: 1,
		remarks: 1,
		pod: 1,
		container: 1,
		vehicle2: 1,
		gr_type: 1,
		coverNote: 1,
		isGrBillable: 1,
		invToBill: 1,
		his: 1,
		isNonBillable: 1,
		isSupplementaryShow: 1,
		selectedSupply: 1,
		totalCharges: 1,
		tnbCharges: 1,
		standardTime: 1,
		totalChargesWithoutTax: 1,
		chargeableTime: 1,
		loadingDetentionRate: 1,
		unloadingDetentionRate: 1,
		total_no_of_units: 1,
		internal_rate: 1,
		pendingRemark: 1,
		in: 1,
		fpa: 1,
		last_modified_at: 1,
		last_modified_by: 1,
		last_sync_at: 1,
		last_sync_by: 1,
		expected_arrival: 1,
		bill: 1,
		documents: 1,
		diesel_index: 1,
		created_by_full_name: 1,
		created_at: 1,
		incentivePercent: 1,
		trip_no: 1,
		vehicle_no: 1,
		provisionalBill: 1,
		'datamanagements': 1,
		integration: 1,
		tMemo: 1,
		bMemo: 1,
		advanceAmt: 1,
		tMemoReceipt: 1,
		loading_amount: 1,
		unloading_amount: 1,
		'detentionLoadingD1': 1,       //Loading Day 1    for STC
		'detentionLoadingD2': 1,       //Loading Day 2    for STC
		'detentionLoadingD3': 1,       //Loading Day 3    for STC
		'detentionUnloadingD1': 1,     //unLoading Day 1   for STC
		'detentionUnloadingD2': 1,     //unLoading Day 2   for STC
		'detentionUnloadingD3': 1,    //unLoading Day 3   for STC
	};


	if (Object.keys(query.queryFilter).length < 3 && !query.bClientId && Object.keys(companyFilter).length == 0 &&
		Object.keys(trip_query).length == 0 && Object.keys(bill_query).length == 0 && Object.keys(vehicle_query).length == 0) {
		let nDays = 1;
		let toDate = new Date();
		let fromDate = new Date();
		fromDate.setDate(toDate.getDate() - nDays);
		query.queryFilter = {
			created_at: {$gte: fromDate},
			clientId: query.clientId,
			tripCancelled: false
		};

	}

	let grAggQ = [
		{$match: query.queryFilter},
		/*
		{
			$addFields: {
				'GR Assigned status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'GR Assigned'] }
						}
					}, 0]
				},
				'Loading Ended status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Loading Ended'] }
						}
					}, 0]
				},
				'Vehicle Arrived for unloading status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Vehicle Arrived for unloading'] }
						}
					}, 0]
				},
			}
		},
		{$match:grLevel2Filters},
		*/
	];
	// if(query.queryFilter.grNumber){
	// 	grAggQ.push({
	// 		$limit: 20
	// 	});
	// }
	grAggQ.push({
			$lookup: {
				from: 'billingparties',
				localField: 'billingParty',
				foreignField: '_id',
				as: 'billingParty'
			}
		},
		{
			$unwind: {
				path: '$billingParty',
				preserveNullAndEmptyArrays: true
			}
		});
	if (query.bClientId) {
		grAggQ.push({
			$match: {
				'billingParty.clientId': query.bClientId
			}
		});
	}

	// FILTER
	grAggQ.push(
		{$match: companyFilter},
		{$lookup: {from: 'tripv2', localField: 'trip', foreignField: '_id', as: 'trip'}},
		{$unwind: {path: '$trip', preserveNullAndEmptyArrays: true}},
		{
			$lookup: {
				from: 'tripadvances',
				localField: 'trip.advanceBudget',
				foreignField: '_id',
				as: 'trip.advanceBudget'
			}
		});
	//, {$unwind: {path: '$trip.advanceBudget', preserveNullAndEmptyArrays: true}}

	if (query.aGrDt && query.aGrDt.length > 0) {
		let aGrDt = query.aGrDt;
		grAggQ.push(
			{
				"$addFields": {"grStrId": {"$toString": "$_id"}},
			},
			{
				"$lookup": {
					"from": "datamanagements",
					"localField": "grStrId",
					"foreignField": "linkToId",
					"as": "datamanagements"
				}
			},
			{
				"$match": {
					"datamanagements.files.category": {$in: aGrDt}
				}
			}
		);
	}

	if (query.vendPaymStatus) {

		grAggQ.push({
				"$addFields": {
					"totalVM": {
						"$add":
							["$trip.vendorDeal.totWithMunshiyana", "$trip.vendorDeal.totalCharges"]
					},
				}
			},

			{
				"$addFields": {
					"vendorAdvancePaid": {
						"$reduce": {
							input: "$trip.advanceBudget",
							initialValue: 0,
							in: {
								"$add": ["$$value", {"$ifNull": ["$$this.amount", 0]}]
							}
						}
					}
				}
			},

			{
				"$addFields": {
					"totSubsAmt": {
						"$add": ["$vendorAdvancePaid", "$trip.vendorDeal.tdsAmount", "$trip.vendorDeal.totalDeduction"]
					}
				}
			},

			{
				"$addFields": {
					"totRemAmt": {
						"$subtract": ["$totalVM", "$totSubsAmt"]
					}
				}
			});

		if (query.vendPaymStatus == 'Paid') {
			grAggQ.push({$match: {"totRemAmt": 0, "totalVM": {$gt: 0}}});
		} else if (query.vendPaymStatus == 'Unpaid') {
			grAggQ.push({
					$match: {
						$expr: {
							$and: [
								{
									$eq: [
										"$totRemAmt",
										"$totalVM"
									]
								},
								{
									$gt: [
										"$totalVM",
										0
									]
								}
							]
						}
					}
				}
			);
		} else if (query.vendPaymStatus == 'Balance Pending') {
			grAggQ.push({$match: {"totRemAmt": {$gt: 0}}});
		} else if (query.vendPaymStatus == 'Over Paid') {
			grAggQ.push({$match: {"totRemAmt": {$lt: 0}}});
		}
	}
	grAggQ.push({$match: trip_query},
		{$lookup: {from: 'registeredvehicles', localField: 'trip.vehicle', foreignField: '_id', as: 'trip.vehicle'}},
		{$unwind: {path: '$trip.vehicle', preserveNullAndEmptyArrays: true}},
		{$match: vehicle_query},
		{$lookup: {from: 'bills', localField: 'bill', foreignField: '_id', as: 'bill'}},
		{$unwind: {path: '$bill', preserveNullAndEmptyArrays: true}},
		{$match: bill_query},
		{
			$lookup: {
				from: 'customers',
				localField: 'customer',
				foreignField: '_id',
				as: 'customer'
			}
		},
		{
			$unwind: {
				path: '$customer',
				preserveNullAndEmptyArrays: true
			}
		},
		// SORT
		{$sort: query.sort},
		// SKIP
		{$skip: ((query.no_of_docs * query.skip) - query.no_of_docs)},
		// LIMIT
		{$limit: query.no_of_docs},
		// OTHER


		{
			$lookup: {
				from: 'consignor_consignees',
				localField: 'consignor',
				foreignField: '_id',
				as: 'consignor'
			}
		},
		{
			$unwind: {
				path: '$consignor',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'consignor_consignees',
				localField: 'consignee',
				foreignField: '_id',
				as: 'consignee'
			}
		},
		{
			$unwind: {
				path: '$consignee',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'branches',
				localField: 'branch',
				foreignField: '_id',
				as: 'branch'
			}
		},
		{
			$unwind: {
				path: '$branch',
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
			"$lookup": {
				"from": "users",
				"localField": "pod.user",
				"foreignField": "_id",
				"as": "pod.user"
			}
		},
		{
			"$unwind": {
				"path": "$pod.user",
				"preserveNullAndEmptyArrays": true
			}
		},
		// {
		// 	$lookup: {
		// 		from: "bills",
		// 		localField: "provisionalBill.ref",
		// 		foreignField: "_id",
		// 		as: "provisionalBill.ref"
		// 	}
		// },
		{
			$lookup: {
				from: 'drivers',
				localField: 'trip.driver',
				foreignField: '_id',
				as: 'trip.driver'
			}
		},
		{
			$unwind: {
				path: '$trip.driver',
				preserveNullAndEmptyArrays: true
			}
		},
		/*{
			$lookup: {
				from: 'vendortransports',
				localField: 'trip.vendor',
				foreignField: '_id',
				as: 'trip.vendor'
			}
		},
		{
			$unwind: {
				path: '$trip.vendor',
				preserveNullAndEmptyArrays: true
			}
		},*/
		//...this.buildPopQuery(query.populate),
		// {
		// 	$project: Array.isArray(query.projection) && query.projection.length ? query.projection.reduce( (a,b) =>  (a[b] = 1,a)  , {}) :  projection
		// }
	);

	if (query.populate.indexOf('provisionalBill') + 1)
		grAggQ.push(
			{
				$lookup: {
					from: 'bills',
					localField: 'provisionalBill.ref',
					foreignField: '_id',
					as: 'provisionalBill.ref'
				}
			}
		);

	grAggQ.push(
		{$project: Array.isArray(query.projection) && query.projection.length ? query.projection.reduce((a, b) => (a[b] = 1, a), {}) : projection}
	);

	//let grs = await this.aggregate(grAggQ);
	//console.log(JSON.stringify(grAggQ));
	let oQuery = {aggQuery: grAggQ, no_of_docs: 10000};
	let grs = await serverSidePage.requestData(this, oQuery);
	return Promise.resolve({data: grs});
};

tripGrSchema.pre('save', async function (next) {
	try {
		if (this.isNew) {
			this.created_at = new Date();
		}
		this.last_modified_at = new Date();
		next();
	} catch (err) {
		next(err);
	}
});

tripGrSchema.pre('find', function () {
	let isProjection = false;
	if (this._fields) {
		for (var key in this._fields) {
			if (this._fields.hasOwnProperty(key))
				isProjection = true;
		}
	}

	if (isProjection && this._fields && this._fields.branch) {
		this.populate({
			path: 'branch',
			match: this._conditions.branch_query,
			select: {'name': 1, 'prim_contact_no': 1, 'prim_email': 1, 'profit_center': 1, 'cost_center': 1}
		});
	} else if (!isProjection) {
		this.populate({
			path: 'branch',
			match: this._conditions.branch_query,
			select: {'name': 1, 'prim_contact_no': 1, 'prim_email': 1, 'profit_center': 1, 'cost_center': 1}
		});
	}

	delete this._conditions.branch_query;
	/*
		this.populate({
			path: 'booking',
			match: this._conditions.booking_query
		});

		delete this._conditions.booking_query;
	*/
	if (isProjection && this._fields && this._fields.trip) {
		this.populate({
			path: 'trip',
			match: this._conditions.trip_query,
			select: {_id: 1, trip_no: 1, vehicle: 1, status: 1}
		});
	} else if (!isProjection) {
		this.populate({
			path: 'trip',
			match: this._conditions.trip_query
		});
	}
	delete this._conditions.trip_query;

	if (isProjection && this._fields && this._fields.route) {
		this.populate({
			path: 'route',
			match: this._conditions.route_query
		});
	} else if (!isProjection) {
		this.populate({
			path: 'route',
			match: this._conditions.route_query
		});
	}
	delete this._conditions.route_query;

	if (isProjection && this._fields && this._fields.bill) {
		this.populate({
			path: 'bill',
			select: {billNo: 1, _id: 1, date: 1}
		});
	} else if (!isProjection) {
		//this.populate('bill');
	}

	if (isProjection && this._fields && this._fields.customer) {
		this.populate({
			path: 'customer',
			select: {name: 1, _id: 1}
		});
	} else if (!isProjection) {
		this.populate('customer');
	}

	if (isProjection && this._fields && this._fields.consignor) {
		this.populate({
			path: 'consignor',
			select: {name: 1, _id: 1, address: 1}
		});
	} else if (!isProjection) {
		this.populate('consignor');
	}

	if (isProjection && this._fields && this._fields.billingParty) {
		this.populate({
			path: 'billingParty',
			select: {name: 1, _id: 1}
		});
	} else if (!isProjection) {
		this.populate('billingParty');
	}

	if (isProjection && this._fields && this._fields.consignee) {
		this.populate({
			path: 'consignee',
			select: {name: 1, _id: 1, address: 1}
		});
	} else if (!isProjection) {
		this.populate('consignee');
	}


});
tripGrSchema.index({grNumber: 1, clientId: 1}, {unique: true, partialFilterExpression: {tripCancelled: {$eq: false}}});

module.exports = mongoose.model('TripGr', tripGrSchema);
