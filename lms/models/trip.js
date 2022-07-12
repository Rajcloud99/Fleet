var constants = require('../../constant');
const mongoose = require('mongoose');
const moment = require('moment');
const AcBal = commonUtil.getModel('accountbalances');
let RouteData = commonUtil.getModel('routeData');
var ClientConf = commonUtil.getModel('clientConfig');
let Voucher = commonUtil.getModel('voucher');


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
	date: Date
};

let handleBarHelper = require(projectHome + '/utils/handleBarHelper');

let tripSchema = new mongoose.Schema({
		clientId: constant.requiredString,
		onUpdDate: Date,
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Branch"
		},
		allowed_routes: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "TransportRoute"
		}],
		type: String,           // Intermittent and direct
		serviceTyp: String,           // Trip service type ['Express', 'Standard', 'Time Committed']
		trip_no: Number,
		bill_no: Number,
		startOdo: Number,  //start odo meter
		endOdo: Number,  //End odo meter
		odoKm: Number,  //Total odoKm
		ctrip: String,
		corder: String,
		gps_view: String,
		suspenseRemark: String,
		settled: {
			type: Boolean,
			default: false
		},
		ownershipType: {
			type: String,
			enum: constant.aOwnershipVehicle
		},
		AccManagerRmk: {
			remark: String,
			user_full_name: String,
			date: Date,
		},
		markSettle: {
			isSettled: {
				type: Boolean,
				default: false
			},
			remark: String,
			user_full_name: String,
			date: Date,
		},
		advSettled: {
			isCompletelySettled: {
				type: Boolean,
				default: false
			},
			tsNo: Number,
			openingBal: Number,
			closingBal: Number,
			creation: {
				date: Date,
				user: String
			},
			user_full_name: String,
			date: Date,
			remark: String,
			systemDate: Date,
			aVoucher: [{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			}]
		},
		advanceApprove: [{
			approveId: Number,
			advanceType: {
				type: String,
				required: true
			},
			category: String,
			amount: Number,
			liter: Number,
			remark: String,
			created_at: Date,
			created_by_name: String,
			created_by: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			paid: {
				type: Number,
				default: 0
			},
			paidLiter: {
				type: Number,
				default: 0
			}
		}],
		advanceBudget: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'tripadvances'
		}],
		suspenseAdv: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'tripadvances'
		}],
		rcptAdv: [{ // it ref to all contra receipt voucher created
			ref: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			},
			amount: Number
		}],
		transShipment: {
			vehicle_no: String,
			driver_name: String,
			vehicle: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
			driver: {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "Driver"
			},
			created_by: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			date: Date,
			remark: String,
		},
		status: {
			type: String,
			enum: constant.tripStatus,
			default: "Trip not started"
		},
		rmk: String,
		category: {
			type: String,
			enum: ['Loaded', 'Empty'],
			default: 'Loaded'
		},
		route_name: String,
		extraKm: {
			type: Number,
			default: 0
		},
		route: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "TransportRoute"
		},
		rName: String,
		rKm: Number,
		imd:[{             //intermedite
			c:String,
			d:String,
			s:String,
			sf:String,
			code:String,
			remark:String,
			pin:Number,
			entryDate: Date,
			exitDate: Date,
		}],
		ld:{                  //loading point
			c:String,
			d:String,
			s:String,
			sf:String,
			zone:String,
			code:String,
			pin:Number,
			place_id:String,
			location: {lat: Number, lng: Number},
		},
		uld:{                //unloading point
			c:String,
			d:String,
			s:String,
			sf:String,
			zone:String,
			code:String,
			pin:Number,
			place_id:String,
			location: {lat: Number, lng: Number},

		},
		vehicle_no: String,
		vehicle: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RegisteredVehicle'
		},
		segment_type: String,
		driver: {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": "Driver"
		},
		driverHistory: [{
			driver: {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "Driver"
			},
			person: String,
			time: Date,
		}],
		his :[ {
			action : String,
			dt : Date,
			person : String,
			rmk: String,
			netAdvObj : {},
			netExpObj : {}
		}],
		"driver2": {                                      // assistantDriver
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Driver'
		},
		"driver2Name": String,
		trip_manager_name: String,
		trip_manager: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		loading_babu: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		// vendorAdvance: {
		// 	from: {
		// 		type: mongoose.Schema.Types.ObjectId,
		// 		ref: 'accounts'
		// 	},
		// 	to: {
		// 		type: mongoose.Schema.Types.ObjectId,
		// 		ref: 'accounts'
		// 	},
		// 	amount: Number
		// },
		allocation_date: Date,
		start_date: Date,
		end_date: Date,
		ewayBill_expiry: Date, //Tentative E-way bill expiry
		trip_expenses: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'TripsExpense'
		}],
		isCancelled: {
			type: Boolean,
			default: false
		},
		payments: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Voucher'
		}],
		statuses: [{
			user_full_name: String,
			user_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			date: Date,
			systemDate: Date,
			status: String,
			remark: String,
			gpsData: Object,
		}],
		gr: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'TripGr'
		}],
		geofence_points: [{
			'geofence_type': {
				type: String,
				required: true,
				default: 'Trip'
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
			'deleted': {type: Boolean, default: false},
			tat_hr:Number,
			tat_min:Number,
			halt_d:Number,
			tat_km: Number

		}],
		tat_hr:Number,
		tat_min:Number,
	    sealStatus:String,
		lastTrip: {   // it's last trip on vehicle
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Trip'
		},
		documents: [{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		doc: { // categorized doc
			rc: [{type: String}],
			dl: [{type: String}],
			insurance: [{type: String}],
			fitness: [{type: String}],
			permit: [{type: String}],
			chalan: [{type: String}],
			misc: [{type: String}],
		},
		gTrip_id: String,
		gpsData: {},
	    tripBase:{type:String, enum:["Sim Based", "GPS Based"]},
		vendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorTransport'
		},
		vendorPan: String,
		vendorDeal: {
			created_by: String,
			createdAt: Date,
			lastModifiedBy: String,
			lastModifiedAt: Date,
			deal_at: Date,
			entryDate: Date,
			date: Date,
			modified_at: Date,
			tdsFromAc: {
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts'
				},
				name: String,
			},
			lorryAc: {
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts'
				},
				name: String,
			},
			broker: {
				id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'VendorTransport'
				},
				name: String,
			},
			diesel: {
				quantity: Number,
				rate: Number,
				amount: Number
			},
			acknowledge: {
				ackToAc: {
					id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'accounts'
					},
					name: String,
				},
				status: {
					type: Boolean,
					default: false
				},
				date: Date,
				user: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User'
				},
				userName: String,
				voucher: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Voucher'
				}
			},
			totalUnits: Number,
			tdsPercent: Number,
			tdsAmount: Number,
			tdsVoucher: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			},
			perUnitPrice: Number,
			pmtWeight: Number,
			pmtRate: Number,
			driver_cash: Number,
			toll_tax: Number,
			totalCharges: {
				type: Number,
				default: 0
			},
			totalDeduction: {
				type: Number,
				default: 0
			},
			charges: {
				chalan_charges: chargesType,
				other_charges: chargesType,
				detention_charge: chargesType,
				oveloading_charge: chargesType,
				loading_charges: chargesType,
				unloading_charges: chargesType,
				tirpal_charges: chargesType,
				chalan_rto_charges: chargesType,
				toll_charges: chargesType,
				extra_weight: chargesType
			},
			deduction: {
				tds_deduction: chargesType,
				damage_deduction: chargesType,
				penalty_deduction: chargesType,
				other_deduction: chargesType,
				labourDeduction: chargesType,
				claimDeduction: chargesType,
				Adv_Paymt_Munshiyana: chargesType,
				Bal_Paymt_Munshiyana: chargesType
			},
			total_expense: Number,
			munshiyana: Number,
			otherExp: Number,
			internalFreight: Number,
			totWithMunshiyana: Number,
			advance: Number,
			toPay: Number,
			totalDeal: Number,
			account_payment: Number,
			remark: String,
			account_payment_remark: String,
			other_charges_remark: String,
			loading_slip: {
				type: String
			},
			lsStationaryId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'billStationary'
			},
			lsDocReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			},
			ls_uploading_date: Date,
			bankingDetail: {
				a_c: Number,
				ifsc: String,
				declaration: String,
				cancelled_cheque: String
			},
			advance_due_date: Date,
			topay_due_date: Date,
			weight_type: String,
			weightPercent: Number,
			payment_type: String,
			lsNo: String,
		},
		remarks: String,
		"device":{
			"device_type":String,
			"imei":String
		},
	    "alert":[],
	    "alertData":[],
	    "playBack":{
			"idling": {type:Boolean},
			"top_speed": Number,
			"num_stops": Number,
			"num_idle": Number,
			"tot_dist": Number,
			"dur_total": Number,
			"dur_idle": Number,
			"dur_stop": Number,
			"dur_wo_stop": Number,
			"start_time": Date,
			"end_time": Date,
			"stoppage":Number,
			"idleStoppage":Number
		},
		currentStatus:String,
		currentLocation:String,
		created_by_name: String,
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		last_modified_by_name: String,
		last_modified_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		created_at: Date,
		last_modified_at: Date,
	    traqoTripId:String,
		consent:{type:String, default:"PENDING"},
		barCodeStatus:{type:String, default:"PENDING"},
	    tripBudget: {
			dieselKm:Number,
			rateKm:Number,
			toll:Number,
		}
	},
	{
		usePushEach: true,
		timestamps: {
			updatedAt: "onUpdDate"
		}
	}
);

tripSchema.pre("save", async function (next) {
	try {
		if (this.isNew) {
			const lastTrip = await this.constructor.find({clientId: this.clientId}, {trip_no: 1}).sort({trip_no: -1}).limit(1);
			this.trip_no = (lastTrip && lastTrip[0] && lastTrip[0].trip_no) ? (parseInt(lastTrip[0].trip_no) + 1) : 1;
			this.created_at = new Date();
		}
		this.last_modified_at = new Date();
		next();
	} catch (err) {
		next(err);
	}
});

let prefind = function () {
	if (this._conditions.populateGR === true) {
		this.populate("gr");
	}
	delete this._conditions.populateGR;

	this.populate("trip_expenses");
	this.populate({
		path: 'branch',
		//match: this._conditions.branch_query,
		select: {'name': 1, 'prim_contact_no': 1, 'prim_email': 1, 'profit_center': 1, 'cost_center': 1, 'lsBook': 1}
	});//.where('branch').ne(null);
	this.populate({
		path: 'route',
		//match: this._conditions.route_query,
		select: {'route_type': 1, 'name': 1, 'detailed_name': 1, 'rates': 1, 'route_distance': 1, 'route_time': 1}
	});//.where('route').ne(null);
	this.populate({
		path: 'driver',
		//match: this._conditions.route_query,
		select: {
			'name': 1,
			'employee_code': 1,
			'code': 1,
			'license_no': 1,
			'prim_contact_no': 1,
			'account': 1,
			'license_expiry_date': 1,
			'blacklisted': 1,
			_id: 1,
			'date_of_joining': 1
		}
	});
	this.populate({
		path: 'vehicle',
		match: this._conditions.vehicle_query,
		select: {
			'vehicle_reg_no': 1,
			'device_imei': 1,
			'driver_name': 1,
			'driver_license': 1,
			'driver_contact_no': 1,
			'driver': 1,
			'ownershipType': 1,
			'owner_group': 1,
			'veh_group_name': 1,
			'veh_type': 1,
			"current_budget": 1,
			"fasttag": 1,
			"dieselInVehicle": 1,
			"capacity_tonne": 1,
			"ass_date": 1,
			"created_at": 1,
			"veh_type_name":1
		}
	});

	this.populate({
		path: 'vendor',
		match: this._conditions.vendor_query,
		select: {
			'name': 1, 'contact_person_name': 1, 'prim_contact_no': 1, 'email': 1,
			'banking_details': 1, pan_no: 1, "account": 1, "tdsRate": 1, 'documents': 1, 'clientId': 1, 'ho_address': 1
		}
	});

	/*TODO use user's full name
	this.populate({
		path: 'vendorDeal.acknowledge.user',
	});
	*/

	this.populate({
		path: 'advanceBudget',
		populate: [
			{path: 'from_account'},
			{path: 'to_account'},
			{path: 'dieseInfo.vendor', select: {name: 1}},
			{path: 'dieseInfo.station', select: {fuel_type: 1, address: 1}},
		]
	});

	//this.where('vehicle').ne(null);
	for (let query in this._conditions) {
		if (!this.schema.paths.hasOwnProperty(query)) {
			delete this._conditions[query];
		}
	}
	// this.sort({"vehicle.driver_contact_no":-1})
};

tripSchema.pre('find', prefind);
tripSchema.pre('findOne', prefind);
tripSchema.pre('findOneAndUpdate', prefind);
tripSchema.post('find', postFind);
tripSchema.post('findOne', postFind);
tripSchema.post('findOneAndUpdate', postFind);

tripSchema.statics.findByAdvanceDateAdvUp = function (filterQuery, proj = {}) {
	let startOfTheAdvanceDay = new Date(filterQuery.advanceDate),
		endOfTheAdvanceDay = new Date(filterQuery.advanceDate);
	startOfTheAdvanceDay.setHours(0, 0, 0, 0);
	endOfTheAdvanceDay.setHours(23, 59, 59, 999);

	return this.aggregate([
		{
			$match: {
				clientId: filterQuery.clientId,
				vehicle_no: filterQuery.vehicle_no,
				status: {$ne: 'Trip cancelled'},
				'markSettle.isSettled': {$not: {$eq: true}}
				//	'statuses.status': {$ne: 'Trip cancelled'},
			}
		},
		{
			$addFields: {
				'gr': {$arrayElemAt: ['$gr', 0]}
			}
		},
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}
		},
		{
			$unwind: {
				path: '$gr',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$match: {
				$and: [
					{
						$or: [
							{
								$and: [
									{'statuses.status': 'Trip started'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip started',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': {$ne: 'Trip started'}},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Vehicle Arrived for loading',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip started'}}, {'gr.statuses.status': {$ne: 'Vehicle Arrived for loading'}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Loading Started',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip started'}}, {'gr.statuses.status': {$nin: ['Vehicle Arrived for loading', 'Loading Started']}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Loading Ended',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip started'}}, {'gr.statuses.status': {$nin: ['Vehicle Arrived for loading', 'Loading Started', 'Loading Ended']}}]},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip not started',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
						]
					},
					{
						$or: [
							{
								$and: [
									{'statuses.status': 'Trip ended'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip ended',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': {$ne: 'Trip ended'}},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Unloading Ended',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip ended'}}, {'gr.statuses.status': {$ne: 'Unloading Ended'}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Unloading Started',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip ended'}}, {'gr.statuses.status': {$nin: ['Unloading Ended', 'Unloading Started']}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Vehicle Arrived for unloading',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{
										$and: [
											{'statuses.status': {$ne: 'Trip ended'}},
											{'gr.statuses.status': {$nin: ['Unloading Ended', 'Unloading Started', 'Vehicle Arrived for unloading']}}
										]
									},
									{$expr: {$gte: [new Date(), startOfTheAdvanceDay]}}
								]
							}
						]
					},
				]
			}
		},
		{$project: proj}
	]);
};
tripSchema.statics.findByAdvanceDateAdvUpV2 = function (filterQuery, proj = {}) {
	let startOfTheAdvanceDay = new Date(filterQuery.advanceDate),
		endOfTheAdvanceDay = new Date(filterQuery.advanceDate);
	startOfTheAdvanceDay.setHours(0, 0, 0, 0);
	endOfTheAdvanceDay.setHours(23, 59, 59, 999);

	return this.aggregate([
		{
			$match: {
				clientId: filterQuery.clientId,
				vehicle_no: filterQuery.vehicle_no,
				status: {$ne: 'Trip cancelled'},
				'markSettle.isSettled': {$not: {$eq: true}}
			}
		},
		{
			$addFields: {
				'trip_start_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip started']}
						}
					}, 0]
				},
				'trip_end_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip ended']}
						}
					}, 0]
				}
			}
		},
		{
			$match: {
				'trip_start_status.date': {$lte: endOfTheAdvanceDay},
				$or: [{trip_end_status: {$exists: false}}, {'trip_end_status.date': {$gte: endOfTheAdvanceDay}}]

			}
		},
		{$project: proj}
	]);
};

tripSchema.statics.findByAdvanceDate = function (filterQuery, proj = {}) {
	let startOfTheAdvanceDay = new Date(filterQuery.advanceDate),
		endOfTheAdvanceDay = new Date(filterQuery.advanceDate);
	startOfTheAdvanceDay.setHours(0, 0, 0, 0);
	endOfTheAdvanceDay.setHours(23, 59, 59, 999);

	let aggQuery = [
		{
			$match: {
				clientId: filterQuery.clientId,
				vehicle_no: filterQuery.vehicle_no,
				status: {$ne: 'Trip cancelled'},
				'markSettle.isSettled': {$not: {$eq: true}},
				'statuses.status': {$ne: 'Trip cancelled'},
			}
		},
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}
		},
		{
			$addFields: {
				'agr': {$arrayElemAt: ['$gr', 0]}
			}
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'agr.customer',
				foreignField: '_id',
				as: 'agr.customer'
			}
		},
		{
			$unwind: {
				path: '$agr.customer',
				preserveNullAndEmptyArrays: true
			}
		},
		// {
		// 	$unwind: {
		// 		path: '$gr',
		// 		preserveNullAndEmptyArrays: true
		// 	}
		// },
		{
			$match: {
				$and: [
					{
						$or: [
							{
								$and: [
									{'statuses.status': 'Trip started'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip started',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': {$ne: 'Trip started'}},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Vehicle Arrived for loading',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip started'}}, {'gr.statuses.status': {$ne: 'Vehicle Arrived for loading'}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Loading Started',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip started'}}, {'gr.statuses.status': {$nin: ['Vehicle Arrived for loading', 'Loading Started']}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Loading Ended',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip started'}}, {'gr.statuses.status': {$nin: ['Vehicle Arrived for loading', 'Loading Started', 'Loading Ended']}}]},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip not started',
												'date': {$lte: endOfTheAdvanceDay}
											}
										}
									},
								]
							},
						]
					},
					{
						$or: [
							{
								$and: [
									{'statuses.status': 'Trip ended'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip ended',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': {$ne: 'Trip ended'}},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Unloading Ended',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip ended'}}, {'gr.statuses.status': {$ne: 'Unloading Ended'}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Unloading Started',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{$and: [{'statuses.status': {$ne: 'Trip ended'}}, {'gr.statuses.status': {$nin: ['Unloading Ended', 'Unloading Started']}}]},
									{
										'gr.statuses': {
											$elemMatch: {
												'status': 'Vehicle Arrived for unloading',
												'date': {$gte: startOfTheAdvanceDay}
											}
										}
									},
								]
							},
							{
								$and: [
									{
										$and: [
											{'statuses.status': {$ne: 'Trip ended'}},
											{'gr.statuses.status': {$nin: ['Unloading Ended', 'Unloading Started', 'Vehicle Arrived for unloading']}}
										]
									},
									{$expr: {$gte: [new Date(), startOfTheAdvanceDay]}}
								]
							}
						]
					},
				]
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
		{
			$lookup: {
				from: 'accounts',
				localField: 'vehicle.account',
				foreignField: '_id',
				as: 'vehicle.account'
			}
		},
		{
			$unwind: {
				path: '$vehicle.account',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'vehicle.fasttag',
				foreignField: '_id',
				as: 'vehicle.fasttag'
			}
		},
		{
			$unwind: {
				path: '$vehicle.fasttag',
				preserveNullAndEmptyArrays: true
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
				from: 'accounts',
				localField: 'driver.happay',
				foreignField: '_id',
				as: 'driver.happay'
			}
		},
		{
			$unwind: {
				path: '$driver.happay',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'driver.account',
				foreignField: '_id',
				as: 'driver.account'
			}
		},
		{
			$unwind: {
				path: '$driver.account',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'vendortransports',
				localField: 'vendor',
				foreignField: '_id',
				as: 'vendor'
			}
		},
		{
			$unwind: {
				path: '$vendor',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'vendor.account',
				foreignField: '_id',
				as: 'vendor.account'
			}
		},
		{
			$unwind: {
				path: '$vendor.account',
				preserveNullAndEmptyArrays: true
			}
		},
	];

	if (Object.keys(proj).length)
		aggQuery.push({
			$project: proj
		});

	return this.aggregate(aggQuery);
};

tripSchema.statics.findByVehicleWithin = function (filterQuery) {
	return this.aggregate([
		{
			$match: {
				clientId: filterQuery.clientId,
				vehicle: filterQuery.vehicle,
				'statuses.status': {$ne: 'Trip cancelled'}
			}
		},
		{
			$addFields: {
				'gr': {$arrayElemAt: ['$gr', 0]}
			}
		},
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}
		},
		{
			$unwind: {
				path: '$gr',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$match: {
				$or: [
					{
						'statuses': {
							$elemMatch: {
								'status': 'Trip started',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'gr.statuses': {
							$elemMatch: {
								'status': 'Vehicle Arrived for loading',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'gr.statuses': {
							$elemMatch: {
								'status': 'Loading Started',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'gr.statuses': {
							$elemMatch: {
								'status': 'Loading Ended',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'statuses': {
							$elemMatch: {
								'status': 'Trip not started',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'statuses': {
							$elemMatch: {
								'status': 'Trip ended',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'gr.statuses': {
							$elemMatch: {
								'status': 'Unloading Ended',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'gr.statuses': {
							$elemMatch: {
								'status': 'Unloading Started',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					},
					{
						'gr.statuses': {
							$elemMatch: {
								'status': 'Vehicle Arrived for unloading',
								'date': {$gte: new Date(filterQuery.start), $lte: new Date(filterQuery.end)}
							}
						}
					}
				]
			}
		}
	]);
};

tripSchema.statics.eachTripSummary =  function (aTrip, configs) {
	if (!aTrip.length)
		return false;

	// aTrip is array then this function return array else if aTrip is object then it transform object into array(for computation) and return aTrip first element
	let aTripTypeIsArray = true;

	if (!Array.isArray(aTrip)) {
		aTrip = [aTrip];
		aTripTypeIsArray = false;
	}

	for(const oTripDoc of aTrip) {
		let oTrip = oTripDoc._doc || oTripDoc;

		oTrip.dieselGivenLtr = 0; // total diesel(in liter) given in advance
		oTrip.dieselGivenAmt = 0;
		oTrip.totalCash = 0;
		oTrip.totalKm = (oTrip.route && oTrip.route.route_distance || oTrip.rKm || 1) + (oTrip.extraKm || 0); // routeDistance + extra Km
		oTrip.tAdvVoucher = 0; // total Advance given whose voucher is created
		oTrip.actual_expense = 0; // total Expense or total settled amount
		oTrip.actualExpenseVoucher = 0; // total Advance given whose voucher is created
		oTrip.advanceAggr = {}; // it contain advance aggregation based on "advance key"
		oTrip.expenseAggr = {}; // it contain expense/settlement aggregation based on "settlement advance key"

		// New added by harikesh dated: 14/10/19
		oTrip.vendorAdvancePaid = 0;
		oTrip.payByCheque = 0;
		oTrip.payByBroker = 0;
		oTrip.payByDiesel = 0;
		oTrip.payByCash = 0;
		oTrip.remainingAmt = 0;
		//oTrip.totalPayable  = 0;
		//end


		// total Advance given
		oTrip.tAdv = oTrip.advanceBudget && oTrip.advanceBudget.reduce((acc, oAdv) => {
			oTrip.dieselGivenLtr += (oAdv && oAdv.dieseInfo && oAdv.dieseInfo.litre || 0);

			if (oAdv.advanceType == 'Diesel') {
				oTrip.dieselGivenAmt += (oAdv && oAdv.amount || 0);
			}

			// for STC fastag exclude from total advance
			if (oAdv.advanceType == 'Fastag' && configs && configs.tripSettlement && configs.tripSettlement.settleLitreWise){
				oAdv.cloneAmount = oAdv.amount; // amount clone for UI
				oAdv.amount = 0;
			}

			// Added by Harikesh - dated: 14/10/2019
			if (oAdv.advanceType == 'Vendor Advance') {
				oTrip.vendorAdvancePaid += (oAdv && oAdv.amount || 0);
			}

			if (oAdv.vendorPayment && oAdv.vendorPayment.paymentMode == 'Diesel') {
				oTrip.payByDiesel += (oAdv && oAdv.amount || 0);
			}

			if (oAdv.vendorPayment && oAdv.vendorPayment.paymentMode == 'Cash') {
				oTrip.payByCash += (oAdv && oAdv.amount || 0);
			}

			if (oAdv.vendorPayment && oAdv.vendorPayment.paymentMode == 'Cheque') {
				oTrip.payByCheque += (oAdv && oAdv.amount || 0);
			}

			if (oAdv.vendorPayment && oAdv.vendorPayment.paymentMode == 'Broker') {
				oTrip.payByBroker += (oAdv && oAdv.amount || 0);
			}

			//End

			oTrip.advanceAggr[oAdv.advanceType] = oTrip.advanceAggr[oAdv.advanceType] || {
				amt: 0,
				amtVch: 0,
				lit: 0
			};

			oTrip.advanceAggr[oAdv.advanceType].amt += oAdv.amount;
			oTrip.advanceAggr[oAdv.advanceType].lit += oAdv.dieseInfo && oAdv.dieseInfo.litre || 0;

			if (oAdv.voucher) {
				oTrip.advanceAggr[oAdv.advanceType].amtVch += oAdv.amount;
				oTrip.tAdvVoucher += oAdv && oAdv.amount || 0;
			}

			return acc + (oAdv && oAdv.amount || 0);

		}, 0);


		if (oTrip.vendorDeal && oTrip.vendorDeal.charges) {
			allCharges = {
				...oTrip.vendorDeal.charges,
			};

			if (!allCharges)
				return 0;
			for (let kk in allCharges) {
				if (allCharges.hasOwnProperty(kk))
					oTrip.extraTdsAmt = (oTrip.extraTdsAmt || 0) + (allCharges[kk]['tdsAmount'] || 0);
			}
		}


		// For remaing amount... - by Harikesh 14/10/2019
		if (oTrip.vendorDeal) {
			if (!oTrip.vendorDeal.totWithMunshiyana)
				oTrip.vendorDeal.totWithMunshiyana = 0;
			if (!oTrip.vendorDeal.totalCharges)
				oTrip.vendorDeal.totalCharges = 0;
			if (!oTrip.vendorDeal.totalDeduction)
				oTrip.vendorDeal.totalDeduction = 0;
			if (!oTrip.vendorDeal.tdsAmount)
				oTrip.vendorDeal.tdsAmount = 0;
			if (!oTrip.vendorDeal.extChargesTdsAmount)
				oTrip.vendorDeal.extChargesTdsAmount = 0;
			if (!oTrip.vendorAdvancePaid)
				oTrip.vendorAdvancePaid = 0;
			if (!oTrip.extraTdsAmt)
				oTrip.extraTdsAmt = 0;

			oTrip.remainingAmt = (oTrip.vendorDeal.totWithMunshiyana + oTrip.vendorDeal.totalCharges - oTrip.vendorAdvancePaid - oTrip.vendorDeal.totalDeduction - oTrip.vendorDeal.tdsAmount - oTrip.extraTdsAmt - oTrip.vendorDeal.extChargesTdsAmount) || 'NA';
			//oTrip.remainingAmt+= oTrip.totalPayable - oTrip.tAdv;
		}


		//TODO separate it with diff key on reports @kamal
		if (oTrip.vendorDeal && oTrip.vendorDeal.total_expense) {
			oTrip.vendorDeal.totalDeal = oTrip.vendorDeal.total_expense + handleBarHelper.sumOfCharges(oTrip.vendorDeal.charges) - handleBarHelper.sumOfCharges(oTrip.vendorDeal.deduction);
		}
		// total diesel settled(in liter)
		oTrip.dieselSettledLtr = oTrip.trip_expenses.reduce((acc, oExp) => {

			oTrip.actual_expense += oExp.amount || 0;

			oTrip.expenseAggr[oExp.advanceType] = oTrip.expenseAggr[oExp.advanceType] || {
				amt: 0,
				amtVch: 0,
				lit: 0
			};

			oTrip.expenseAggr[oExp.advanceType].amt += oExp.amount;
			oTrip.expenseAggr[oExp.advanceType].lit += oExp.diesel_info && oExp.diesel_info.litre || 0;

			if (oExp.voucher) {
				oTrip.expenseAggr[oExp.advanceType].amtVch += oExp.amount;
				oTrip.actualExpenseVoucher += oExp.amount || 0;
			}

			return acc + (oExp.diesel_info && oExp.diesel_info.litre || 0);
		}, 0);
		//TODO commented du to performance
		// fetch config based on client id
		/*
		let conf = await ClientConf.findOne({"clientId" : oTrip.clientId},{"config":1}).lean();
		if(conf) conf = conf.config;
		const isCustWiseBudgeting = conf && conf.tripSettlement && conf.tripSettlement.custwiseBudgeting;
		// calculate net budget and diesel budget
	    // req.clientConfig.config.tripSettlement.custwiseBudgeting

		if(false && isCustWiseBudgeting && oTrip && oTrip.route && oTrip.route._id && oTrip.vehicle && oTrip.vehicle.veh_type && oTrip.gr && oTrip.gr[0] && oTrip.gr[0].customer && oTrip.gr[0].customer._id && oTrip.serviceTyp) {
			try {
				let qryObj = {
					category: "budgeting",
					service: oTrip.serviceTyp,
					route__id: mongoose.Types.ObjectId(oTrip.route._id),
					vehType: mongoose.Types.ObjectId(oTrip.vehicle.veh_type),
					customer__id:mongoose.Types.ObjectId(oTrip.gr[0].customer._id)
				};
				let data = await RouteData.findOne(qryObj,{"rateKm":1,"dieselKm":1,"toll":1}).lean();
				if(data) {
					// customer wise budgeting
					// calculate net budget
					if (data && data.rateKm)
						oTrip.netBudget = (data.rateKm * oTrip.totalKm) || 0;
					else oTrip.netBudget = 0;

					// calculate diesel budget
					if (data && data.dieselKm)
						oTrip.dieselBudgetLtr = oTrip.totalKm / data.dieselKm;
					else
						oTrip.dieselBudgetLtr = 0;
					oTrip.dieselBudgetLtr = Math.round(oTrip.dieselBudgetLtr * 100) / 100;

					// calculate net toll
					if (data && data.toll)
						oTrip.netToll = data.toll;
					else oTrip.netToll = 0;
				} else {
					oTrip.netBudget = 0;
					oTrip.netToll = 0;
				}

			} catch (err) {
				oTrip.netBudget = 0;
				console.log(err);
			}
		} else {

			// calculate net budget
			if (oTrip.vehicle && oTrip.vehicle.current_budget && oTrip.vehicle.current_budget.rpk)
				oTrip.netBudget = (oTrip.vehicle.current_budget.rpk * oTrip.totalKm) || 0;

				// calculate diesel budget
			if (oTrip.vehicle && oTrip.vehicle.current_budget && oTrip.vehicle.current_budget.mileage)
				oTrip.dieselBudgetLtr = oTrip.totalKm / oTrip.vehicle.current_budget.mileage;
			else
				oTrip.dieselBudgetLtr = 0;
			oTrip.dieselBudgetLtr = Math.round(oTrip.dieselBudgetLtr * 100) / 100;
		}
		*/
		/***************************** block start ******************/
		// calculate net budget
		if (oTrip.serviceTyp && oTrip.vehicle && oTrip.vehicle.current_budget && oTrip.vehicle.current_budget[oTrip.serviceTyp] && oTrip.vehicle.current_budget[oTrip.serviceTyp].rpk) {
			oTrip.netBudget = (oTrip.vehicle.current_budget[oTrip.serviceTyp].rpk * oTrip.totalKm) || 0;
		} else if(oTrip.vehicle && oTrip.vehicle.current_budget && oTrip.vehicle.current_budget.rpk) {
			oTrip.netBudget = (oTrip.vehicle.current_budget.rpk * oTrip.totalKm) || 0;
		}

		// calculate diesel budget
		if(oTrip.serviceTyp && oTrip.vehicle && oTrip.vehicle.current_budget && oTrip.vehicle.current_budget[oTrip.serviceTyp] && oTrip.vehicle.current_budget[oTrip.serviceTyp].mileage) {
			oTrip.dieselBudgetLtr = oTrip.totalKm / oTrip.vehicle.current_budget[oTrip.serviceTyp].mileage;
		} else if (oTrip.vehicle && oTrip.vehicle.current_budget && oTrip.vehicle.current_budget.mileage)
			oTrip.dieselBudgetLtr = oTrip.totalKm / oTrip.vehicle.current_budget.mileage;
		else
			oTrip.dieselBudgetLtr = 0;
		oTrip.dieselBudgetLtr = Math.round(oTrip.dieselBudgetLtr * 100) / 100;
		/***************************** block end ******************/
		// cal internal freight i.e. sum of internal rate on each gr
		if (Array.isArray(oTrip.gr))
			oTrip.internal_freight = oTrip.gr.reduce((a, obj) => a + (obj.internal_rate || 0), 0);
		else
			oTrip.internal_freight = oTrip.gr && oTrip.gr.internal_rate || 0;
		//cal initial freight PKM
		oTrip.internal_freightPKM = (oTrip.internal_freight / oTrip.totalKm).toFixed(2);

		if (Array.isArray(oTrip.gr))
			oTrip.actaul_freight = oTrip.gr.reduce((a, obj) => a + (obj.totalAmount || obj.totalFreight || 0), 0);
		else
			oTrip.actaul_freight = oTrip.gr && oTrip.gr.totalAmount || oTrip.gr.totalFreight || 0;

		oTrip.actaul_freightPKM = (oTrip.actaul_freight / oTrip.totalKm).toFixed(2);

		if (!oTrip.internal_freightPKM || oTrip.internal_freightPKM == 0) {
			oTrip.internal_freightPKM = oTrip.actaul_freightPKM;
		}

		if (!oTrip.internal_freight || oTrip.internal_freight == 0) {
			oTrip.internal_freight = oTrip.actaul_freight;
		}

		// totalCash = happay + cash + fasttag
		oTrip.totalCash = oTrip.tAdv ? (oTrip.tAdv - oTrip.dieselGivenAmt) : 0;
		oTrip.advPKM = ((oTrip.tAdv || 0) / (oTrip.totalKm || 1)).toFixed(2);

		// cal initial profit i.e. (internal freight) - (total Advance given)
		if (oTrip.vendorDeal && oTrip.vendorDeal.totalDeal) {
			oTrip.intial_profit = oTrip.internal_freight - oTrip.vendorDeal.totalDeal;
		} else {
			oTrip.intial_profit = oTrip.internal_freight && oTrip.tAdv ? (oTrip.internal_freight - oTrip.tAdv) : 0;
		}

		oTrip.freight_profit = oTrip.actaul_freight && oTrip.tAdv ? (oTrip.actaul_freight - oTrip.tAdv) : 0;

		//cal profit per KM

		oTrip.profitPKM = (oTrip.intial_profit / oTrip.totalKm).toFixed(2);

		oTrip.frProfitPKM = (oTrip.freight_profit / oTrip.totalKm).toFixed(2);

		if (!oTrip.profitPKM || oTrip.profitPKM == 0) {
			oTrip.profitPKM = oTrip.frProfitPKM;
		}


		// cal profit margin i.e. (initial profit)/(internal freight)*100
		oTrip.initial_profit_margin = oTrip.intial_profit && oTrip.internal_freight ? (oTrip.intial_profit / oTrip.internal_freight * 100) : 'NA';

		// cal actual profit i.e. (internal freight - total settlement)/(internal freight)*100
		oTrip.actual_profit = oTrip.internal_freight && oTrip.actual_expense
			? ((oTrip.internal_freight - oTrip.actual_expense) / oTrip.internal_freight * 100)
			: 'NA';
	   }

	return aTripTypeIsArray ? aTrip : aTrip[0];
};

tripSchema.statics.tripSummary = async function (aTrip) {
	if (!aTrip.length)
		return false;

	if (!Array.isArray(aTrip)) {
		aTrip = [aTrip];
	}

	// calculating driver payment
	let driverIncentive = 0,
		driverIncentiveVch = 0,
		driverPenalty = 0,
		driverPenaltyVch = 0,
		driverPayment = 0;

	aTrip.forEach(oTrip => {
		Array.isArray(oTrip.payments) && oTrip.payments.forEach(oPayment => {
			let amt = oPayment.ledgers && oPayment.ledgers.reduce((amt, o) => {
				let driverAcc = oTrip.driver && oTrip.driver.account && oTrip.driver.account._id;
				if (driverAcc && driverAcc.toString() === o.account.toString()) {
					if (o.cRdR === 'DR') {
						return amt + o.amount
					} else {
						return amt - o.amount;
					}
				} else
					return amt;

			}, 0);

			// driverIncentiveVch += amt || 0;
			driverPayment += amt || 0;
		});
	});

	let summary = {
		totalKm: 0, // sum of total Km on each trip
		totalExtraKm: 0, // sum of total Extra Km on each trip
		netBudget: 0, // sum of netBudget on each trip
		netToll: 0, // sum of netToll on each trip
		netAdvVch: 0, // sum of totalAdvance with voucher on each trip
		totDrSecurity : 0,   // total driver security deposit
		netAdvObj: {
			driver: 0,
			happay: 0,
			fastag: 0,
			vendor: 0,
			diesel: 0,
			driverCash: 0,
		},
		netAdvance: 0, // sum of tAdv on each trip
		netAdvVchObj: {
			driver: 0,
			happay: 0,
			fastag: 0,
			vendor: 0,
		},
		netExpense: 0, // sum of actual_expense/total settlement on each trip
		netExpVch: 0, // sum of actual_expense/total settlement with voucher on each trip
		netExpObj: {
			driver: 0,
			happay: 0,
			fastag: 0,
			vendor: 0,
		},
		netExpVchObj: {
			driver: 0,
			happay: 0,
			fastag: 0,
			// vendor: 0,
		},
		dieselBudget: 0, // sum of  on each trip
		dieselGivLit: 0, // sum of actual_expense/total settlement with voucher on each trip
		dieselGivAmt: 0, // sum of actual_expense/total settlement with voucher on each trip
		overDue: 0, // diff of net budget & net advance
		openCloseBal: {}, // it contains opening and closing balance of unique(advance and settlement) indulged account
		// driverIncentive,
		driverIncentiveVch,
		// driverPenalty,
		// driverPenaltyVch,
		driverPayment
	};

	aTrip.forEach(oTripDoc => {

		let oTrip = oTripDoc._doc || oTripDoc;

		summary.totalKm += oTrip.totalKm || 0;
		summary.totalExtraKm += oTrip.extraKm || 0;
		summary.netBudget += oTrip.netBudget || 0;
		summary.netToll += oTrip.netToll || 0;
		summary.netAdvance += oTrip.tAdv || 0;
		summary.netAdvVch += oTrip.tAdvVoucher || 0;



		summary.netAdvObj.driver += ['Driver Cash', 'Diesel'].reduce((a, str) => a + (oTrip.advanceAggr && oTrip.advanceAggr[str] && oTrip.advanceAggr[str].amt || 0), 0);
		summary.netAdvObj.diesel += oTrip.advanceAggr['Diesel'] && oTrip.advanceAggr['Diesel'].amt || 0;
		summary.netAdvObj.driverCash += oTrip.advanceAggr['Driver Cash'] && oTrip.advanceAggr['Driver Cash'].amt || 0;
		summary.netAdvObj.happay += oTrip.advanceAggr['Happay'] && oTrip.advanceAggr['Happay'].amt || 0;
		summary.netAdvObj.fastag += oTrip.advanceAggr['Fastag'] && oTrip.advanceAggr['Fastag'].amt || 0;
		summary.netAdvObj.vendor += ['Vendor Advance', 'Vendor Balance', 'TDS', 'Damage'].reduce((a, str) => a + (oTrip.advanceAggr && oTrip.advanceAggr[str] && oTrip.advanceAggr[str].amt || 0), 0);

		summary.netAdvVchObj.driver += ['Driver Cash', 'Diesel'].reduce((a, str) => a + (oTrip.advanceAggr && oTrip.advanceAggr[str] && oTrip.advanceAggr[str].amtVch || 0), 0);
		summary.netAdvVchObj.happay += oTrip.advanceAggr['Happay'] && oTrip.advanceAggr['Happay'].amtVch || 0;
		summary.netAdvVchObj.fastag += oTrip.advanceAggr['Fastag'] && oTrip.advanceAggr['Fastag'].amtVch || 0;
		summary.netAdvVchObj.vendor += ['Vendor Advance', 'Vendor Balance', 'TDS', 'Damage'].reduce((a, str) => a + (oTrip.advanceAggr && oTrip.advanceAggr[str] && oTrip.advanceAggr[str].amtVch || 0), 0);

		summary.netExpense += oTrip.actual_expense || 0;
		summary.netExpVch += oTrip.actualExpenseVoucher || 0;
		summary.dieselBudget += oTrip.dieselBudgetLtr || 0;
		summary.dieselGivLit += oTrip.dieselGivenLtr || 0;
		summary.dieselGivAmt += oTrip.dieselGivenAmt || 0;

		summary.netExpObj.driver += ['Driver Cash', 'Diesel'].reduce((a, str) => a + (oTrip.expenseAggr && oTrip.expenseAggr[str] && oTrip.expenseAggr[str].amt || 0), 0);
		summary.netExpObj.happay += oTrip.expenseAggr['Happay'] && oTrip.expenseAggr['Happay'].amt || 0;
		summary.netExpObj.fastag += oTrip.expenseAggr['Fastag'] && oTrip.expenseAggr['Fastag'].amt || 0;
		summary.netExpObj.vendor += ['Vendor Advance', 'Vendor Balance', 'TDS', 'Damage'].reduce((a, str) => a + (oTrip.expenseAggr && oTrip.expenseAggr[str] && oTrip.expenseAggr[str].amt || 0), 0);

		summary.netExpVchObj.driver += ['Driver Cash', 'Diesel'].reduce((a, str) => a + (oTrip.expenseAggr && oTrip.expenseAggr[str] && oTrip.expenseAggr[str].amtVch || 0), 0);
		summary.netExpVchObj.happay += oTrip.expenseAggr['Happay'] && oTrip.expenseAggr['Happay'].amtVch || 0;
		summary.netExpVchObj.fastag += oTrip.expenseAggr['Fastag'] && oTrip.expenseAggr['Fastag'].amtVch || 0;
		summary.netExpVchObj.vendor += ['Vendor Advance', 'Vendor Balance', 'TDS', 'Damage'].reduce((a, str) => a + (oTrip.expenseAggr && oTrip.expenseAggr[str] && oTrip.expenseAggr[str].amtVch || 0), 0);
	});

	let aSortedTrip = aTrip.map(o => {
		let status = o.statuses.find(os => os.status === 'Trip started');
		o.tripStarted = status && new Date(status.date).getTime() || 0;
		return o;
	});

	aSortedTrip.sort((a, b) => new Date(a.tripStarted) - new Date(b.tripStarted));

	let driverBal = 0;
	if (aSortedTrip[0].driver && aSortedTrip[0].driver.account) {
		driverBal = await AcBal.findOne({
			account: aSortedTrip[0].driver.account._id,
			date: {$lte: moment(aSortedTrip[0].tripStarted).startOf('day').toDate()}
		}, {ob: 1, date: 1, cb: 1}).sort({date: -1}).limit(1).lean();

		if (driverBal) {
			if (moment(driverBal.date).diff(aSortedTrip[0].tripStarted, 'days') == 0)
				driverBal = driverBal.ob;
			else
				driverBal = driverBal.cb;
		}

		let conf = await ClientConf.findOne({"clientId" : aSortedTrip[0].clientId},{"config":1}).lean();
		if(conf) conf = conf.config;

		if(conf.tripSettlement && conf.tripSettlement.driverSecurity){

			let aggQuery = [{
				$match: {
					clientId: aSortedTrip[0].clientId,
					deleted: {$not: {$eq: true}},
					'vT': "Driver Security",
					'ledgers.account': mongoose.Types.ObjectId(aSortedTrip[0].driver.account._id)
				}
			}, {
				$project: {
					date: 1,
					refNo: 1,
					ledgers: 1
				}
			}, {
				$unwind: '$ledgers'
			},
				{
					"$group": {
						"_id":  null,
						// "data":{$push: "$$ROOT"},
						"amount":{$sum:{$cond:[{$eq:["$ledgers.cRdR","CR"]},"$ledgers.amount",0]}},
					}
				}
			];
			let foundData = await Voucher.aggregate(aggQuery);
			if(foundData && foundData.length)
				summary.totDrSecurity = foundData[0].amount || 0;
		}

       /*
		let oData = await VoucherService.getDrSecurity({account:aSortedTrip[0].driver.account._id, vT: "Driver Security", clientId: aSortedTrip[0].clientId });
		if(oData && oData.amount)
			summary.totDrSecurity = oData.amount;
		*/


		// if (aSortedTrip[0].advSettled && aSortedTrip[0].advSettled.isCompletelySettled) {
		// 	driverBal = aSortedTrip[0].advSettled.openingBal || 0;
		// } else if (driverBal) {
		//
		// } else
		// 	driverBal = 0;

		// let vehData = await VoucherService.getAllDrAcLedgers({
		// 	clientId: aSortedTrip[0].clientId,
		// 	ledger: aSortedTrip[0].driver.account._id,
		// 	from_date: moment(aSortedTrip[0].tripStarted).startOf('day').toDate(),
		// 	to_date: moment(aSortedTrip[0].tripStarted).toDate(),
		// });

		// if(vehData && vehData.total){
		// 	driverBal += vehData.total;
		// }
	}

	// let driverBal = aSortedTrip[0] && aSortedTrip[0].driver && aSortedTrip[0].driver.account && aSortedTrip[0].driver.account.balance || 0;
	// let happayBal = aSortedTrip[0] && aSortedTrip[0].driver && aSortedTrip[0].driver.happay && aSortedTrip[0].driver.happay.balance || 0;
	// let fastagBal = aSortedTrip[0] && aSortedTrip[0].vehicle && aSortedTrip[0].vehicle.fasttag && aSortedTrip[0].vehicle.fasttag.balance || 0;
	// let vendorBal = aSortedTrip[0] && aSortedTrip[0].vendor && aSortedTrip[0].vendor.account && aSortedTrip[0].vendor.account.balance || 0;

	summary.openCloseBal = {
		driver: {
			opening: driverBal //driverBal + summary.netExpVchObj.driver - summary.netAdvVchObj.driver + (driverIncentive - driverIncentiveVch) - (driverPenalty - driverPenaltyVch)
		},
		// happay: {
		// 	opening: happayBal + summary.netExpVchObj.happay - summary.netAdvVchObj.happay
		// },
		// fastag: {
		// 	opening: fastagBal + summary.netExpVchObj.fastag - summary.netAdvVchObj.fastag
		// },
		// vendor: {
		// 	opening: vendorBal + summary.netExpVchObj.vendor - summary.netAdvVchObj.vendor
		// }
	};

	summary.openCloseBal.driver.closing = summary.openCloseBal.driver.opening + summary.netAdvance - summary.netExpense + driverPayment;
	// summary.openCloseBal.happay.closing = summary.openCloseBal.happay.opening + summary.netAdvObj.happay - summary.netExpObj.happay;
	// summary.openCloseBal.fastag.closing = summary.openCloseBal.fastag.opening + summary.netAdvObj.fastag - summary.netExpObj.fastag;
	// summary.openCloseBal.vendor.closing = summary.openCloseBal.vendor.opening + summary.netAdvObj.vendor - summary.netExpObj.vendor;

	summary.overDue = summary.netAdvance - summary.netBudget;

	return summary;
};

tripSchema.statics.paginate = async function (query) {
	query.queryFilter.gr_query = query.queryFilter.gr_query || {};
	let gr_query = {};
	if(query.grGenerated || query.grNotGenerated){
		gr_query["gr.grNumber"] = query.grGenerated.grNumber;
	}
	for (ky in query.queryFilter.gr_query) {
		if (query.queryFilter.gr_query.hasOwnProperty(ky)) {
			if (mongoose.Types.ObjectId.isValid(query.queryFilter.gr_query[ky])) {
				gr_query[`gr.${ky}`] = mongoose.Types.ObjectId(query.queryFilter.gr_query[ky]);
			} else {
				gr_query[`gr.${ky}`] = query.queryFilter.gr_query[ky];
			}
		}
	}

	delete query.queryFilter.gr_query;
	let advance_query = {};
	if (query.queryFilter.advance_query) {
		advance_query = {"advanceBudget.reference_no": query.queryFilter.advance_query.reference_no};
		query.queryFilter["advanceBudget.0"] = {$exists: true};
		delete query.queryFilter.advance_query;
	}


	let popolate = {
		tripadvances: 1,
		tripExpense: 1,
		gr: 1,
		imd: 1,
		customer: 1,
		consignor: 1,
		consignee: 1,
		billingParty: 1,
		branch: 1,
		vehicle: 1,
		route: 1,
		booking: 1,
		vendor: 1,
		broker: 1,
		driver: 1,
		payments: 1,
		datamanagements: 1
	};
	let projections = {};
	let arr = [];
	if(query.queryFilter.source){
		arr.push({$match: {'route.source.placeName':query.queryFilter.source}});
		delete query.queryFilter.source;
	}if(query.queryFilter.destination){
		arr.push({$match: {'route.destination.placeName':query.queryFilter.destination}});
		delete query.queryFilter.destination;
	}
	let tripAggQ = [
		{$match: query.queryFilter}
	];
	if (popolate.route) {
		tripAggQ.push({
			$lookup: {
				from: 'transportroutes',
				localField: 'route',
				foreignField: '_id',
				as: 'route'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$route',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if(arr && arr[0]){
		tripAggQ = [...tripAggQ , ...arr];
	}
	if (query.sort) {
		tripAggQ.push({$sort: query.sort});
	}
	// if(Object.keys(gr_query).length == 0  && Object.keys(advance_query).length == 0 )
	if(!query.custFil){
		tripAggQ.push({$skip: ((query.no_of_docs * (query.skip || 1)) - query.no_of_docs)});
		tripAggQ.push({$limit: query.no_of_docs});
	}
	//}

	if (query.tripDocType && query.tripDocType.length > 0) {

		let aTripDt = query.tripDocType;

		if (popolate.datamanagements) {
			tripAggQ.push(
				{
					"$addFields": {"tripStrId": {"$toString": "$_id"}},
				},
				{
					"$lookup": {
						"from": "datamanagements",
						"localField": "tripStrId",
						"foreignField": "linkToId",
						"as": "datamanagements"
					}
				},
				{
					"$match": {
						"datamanagements.files.category": {$in: aTripDt}
					}
				}
			);
		}
	}
	if (popolate.vehicle) {
		tripAggQ.push({
			$lookup: {
				from: 'registeredvehicles',
				localField: 'vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.broker) {
		tripAggQ.push({
			$lookup: {
				from: 'vendortransports',
				localField: 'vendorDeal.broker.id',
				foreignField: '_id',
				as: 'vendorDeal.broker'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$vendorDeal.broker',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.branch) {
		tripAggQ.push({
			$lookup: {
				from: 'branches',
				localField: 'branch',
				foreignField: '_id',
				as: 'branch'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$branch',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.vendor) {
		tripAggQ.push({
			$lookup: {
				from: 'vendortransports',
				localField: 'vendor',
				foreignField: '_id',
				as: 'vendor'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$vendor',
				preserveNullAndEmptyArrays: true
			}
		});

		if (query.vClientId) {
			tripAggQ.push({
				$match: {
					'vendor.clientId': query.clientId
				}
			});
		}
	}
	if (popolate.driver) {
		tripAggQ.push({
			$lookup: {
				from: 'drivers',
				localField: 'driver',
				foreignField: '_id',
				as: 'driver'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$driver',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.driver) {
		tripAggQ.push({
			$lookup: {
				from: 'accounts',
				localField: 'driver.account',
				foreignField: '_id',
				as: 'driver.account'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$driver.account',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr',
				preserveNullAndEmptyArrays: true
			}
		});
		tripAggQ.push({$match: gr_query});
	}
	if (popolate.tripadvances) {
		tripAggQ.push({
			$lookup: {
				from: 'tripadvances',
				localField: 'advanceBudget',
				foreignField: '_id',
				as: 'advanceBudget'
			}
		});

		if (query.vendPaymStatus) {

			tripAggQ.push({
					"$addFields": {
						"totalVM": {
							"$add":
								["$vendorDeal.totWithMunshiyana", "$vendorDeal.totalCharges"]
						},
					}
				},

				{
					"$addFields": {
						"vendorAdvancePaid": {
							"$reduce": {
								input: "$advanceBudget",
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
							"$add": ["$vendorAdvancePaid", "$vendorDeal.tdsAmount", "$vendorDeal.totalDeduction"]
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
				tripAggQ.push({$match: {"totRemAmt": 0, "totalVM": {$gt: 0}}});
			} else if (query.vendPaymStatus == 'Unpaid') {
				tripAggQ.push({
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
				tripAggQ.push({$match: {"totRemAmt": {$gt: 0}}});
			} else if (query.vendPaymStatus == 'Over Paid') {
				tripAggQ.push({$match: {"totRemAmt": {$lt: 0}}});
			}
		}

		tripAggQ.push({$match: advance_query});
	}
	if ((Object.keys(gr_query).length > 0 || Object.keys(advance_query).length > 0) || query.custFil){
		query.no_of_docs = 20;
		tripAggQ.push({$skip: ((query.no_of_docs * (query.skip || 1)) - query.no_of_docs)});
		tripAggQ.push({$limit: query.no_of_docs});
	}
	if (popolate.tripExpense) {
		tripAggQ.push({
			$lookup: {
				from: 'tripsexpenses',
				localField: 'trip_expenses',
				foreignField: '_id',
				as: 'trip_expenses'
			}
		});
	}
	if (popolate.customer && popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'customers',
				localField: 'gr.customer',
				foreignField: '_id',
				as: 'gr.customer'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr.customer',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.consignor && popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'consignor_consignees',
				localField: 'gr.consignor',
				foreignField: '_id',
				as: 'gr.consignor'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr.consignor',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.consignee && popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'consignor_consignees',
				localField: 'gr.consignee',
				foreignField: '_id',
				as: 'gr.consignee'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr.consignee',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.billingParty && popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'billingparties',
				localField: 'gr.billingParty',
				foreignField: '_id',
				as: 'gr.billingParty'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr.billingParty',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.branch && popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'branches',
				localField: 'gr.branch',
				foreignField: '_id',
				as: 'gr.branch'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr.branch',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.route && popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'transportroutes',
				localField: 'gr.route',
				foreignField: '_id',
				as: 'gr.route'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr.route',
				preserveNullAndEmptyArrays: true
			}
		});
	}
	if (popolate.booking && popolate.gr) {
		tripAggQ.push({
			$lookup: {
				from: 'bookingv2',
				localField: 'gr.booking',
				foreignField: '_id',
				as: 'gr.booking'
			}
		});
		tripAggQ.push({
			$unwind: {
				path: '$gr.booking',
				preserveNullAndEmptyArrays: true
			}
		});

	}
	if(query.queryFilter.trip_no){
		tripAggQ.push({
			$sort: {
				'gr.grNumber':1
			}
		});
	}
	if (popolate.payments) {
		tripAggQ.push({
			$lookup: {
				from: 'vouchers',
				localField: 'payments',
				foreignField: '_id',
				as: 'payments'
			}
		});
	}
	if (popolate.gr) {
		tripAggQ.push(
			{
				"$group": {
					"_id": "$_id",
					'trip': {$first: '$$ROOT'},
					"gr": {"$push": "$gr"}
				}
			},
			{
				$addFields: {
					'trip.gr': "$gr"
				}
			},
			{
				$replaceRoot: {newRoot: "$trip"}
			},
			{
				"$sort": query.sort ? query.sort :{
					"_id": -1
				}
			}
		 );
	}

	if (query.addField)
		tripAggQ.push(query.addField);

	// console.log(JSON.stringify(tripAggQ));
	let trips = await this.aggregate(tripAggQ).allowDiskUse(true);
	return Promise.resolve({data: trips});
};

tripSchema.statics.findByStatusDate = function (filterQuery, project) {
	let trip_start = new Date(filterQuery.trip_start),
		trip_end = new Date(filterQuery.trip_end);
	return this.aggregate([
		{
			$match: {
				clientId: filterQuery.clientId,
				vehicle: filterQuery.vehicle,
				status: {$ne: 'Trip cancelled'},
				'statuses.status': {$ne: 'Trip cancelled'},
				$or: [
					{
						$and: [ //when trip is between date range selected
							{
								$and: [
									{'statuses.status': 'Trip started'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip started',
												'date': {$gte: trip_start}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': 'Trip ended'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip ended',
												'date': {$lte: trip_end}
											}
										}
									},
								]
							}
						]
					},
					{
						$and: [ //when trip is out of  date range selected
							{
								$and: [
									{'statuses.status': 'Trip started'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip started',
												'date': {$lte: trip_start}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': 'Trip ended'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip ended',
												'date': {$gte: trip_end}
											}
										}
									},
								]
							}
						]
					},
					{
						$and: [ //when trip start is within date range
							{
								$and: [
									{'statuses.status': 'Trip started'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip started',
												'date': {$gte: trip_start}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': 'Trip started'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip started',
												'date': {$lte: trip_end}
											}
										}
									},
								]
							}
						]
					},
					{
						$and: [ //when trip end is within date range
							{
								$and: [
									{'statuses.status': 'Trip ended'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip ended',
												'date': {$gte: trip_start}
											}
										}
									},
								]
							},
							{
								$and: [
									{'statuses.status': 'Trip ended'},
									{
										'statuses': {
											$elemMatch: {
												'status': 'Trip ended',
												'date': {$lte: trip_end}
											}
										}
									},
								]
							}
						]
					}
				]

			}
		},
		{$project: project}
	]);
};

function postFind(doc) {
	if (!doc) return;
	if (!Array.isArray(doc))
		doc = [doc];

	doc.forEach(oTripDoc => {
		let oTrip = oTripDoc && oTripDoc._doc ? oTripDoc._doc : {};
		// for empty trip
		oTrip.gr = Array.isArray(oTrip.gr) ? oTrip.gr : [{}];
	});

	return doc;
}

tripSchema.index({trip_no: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('tripV2', tripSchema);
