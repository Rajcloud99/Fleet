var bookingSchema = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		branch_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		booking_no: Number,
		minWeight: Number,
		type:String,      // Intermittent and direct
		booking_type: String,
		sr:String,
		ticketNo:String,
		cat: {
			type: String,
			enum: constant.bookingCategoty,
			default:constant.bookingCategoty[0]
		},
		booking_date: { 'type': Date },
		po_number:Number,
		do_number:String,
    	route_source: String,
		payment_type: String,
		payment_basis: String,
		remark: String,
		customer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		contract_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Contract'
		},
		routeData: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RouteData'
		},
		//do_start:Date,
		//do_end:Date,
		"documents":[{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		serve_start:Date,
		serve_end:Date,
		geofence_points: [constant.geofence_points],
		route: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "TransportRoute"
		}],
		statuses: [{
			status: {
				type: String,
				enum: constant.bookingStatus
			},
			date: Date,
			systemDate: Date,
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			remark: String
		}],
		tripStartDate:Date,
		contact_person: {
			name: String,
			mobile: Number,
			email: String,
			role: String,
			id: String
		},
		contact_person_2: {
			name: String,
			mobile: Number,
			email: String,
			role: String,
			id: String
		},
		booking_supervisor: {
			name: String,
			mobile: Number,
			employee_id: String
		},
		consigner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'consignor_consignee'
		},
		consignee: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'consignor_consignee'
		}],
		billing_party: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		shipping_line: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ShippingLine'
		},
		cha: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		//material_group: String,
		//material_group_id: String,
		material_type: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'MaterialGroup'
		},
		weight_per_unit:Number,
		//material_type_id: String,
		boe: {
			number: String,
			date: String,
			start: Date,
			end: Date,
			weight: Number,
			value: Number,
			total_container: Number,
		},
		total_value: Number,
		total_weight: Number,
		total_no_of_units: Number,
		rate: Number,
		'pmtRate': Number,
		"perUnitPrice": Number,
		"pmtWeight": Number,
		advance: Number,
		toPay: Number,
		munshiyana:Number,
		total: Number,
		advancePayment: Number,
		container: [{
			number: String,
			cType: String,
			length: Number
		}],
		offloading_yard: String,
		factory_invoice_number: Number,
		factory_invoice_value: Number,
		factory_invoice_date: { 'type': Date },
		shipping_bill_no: Number,
		shipping_bill_date: { 'type': Date },
		customer_invoice: String,
		customer_invoice_date: { 'type': Date },
		preference: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VehicleType'
		}],
		tr_mgr:[{
			name:String,
			contact_no:Number,
			user:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			date:Date,
			assignBy:String
		}],
		quote : {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'vendorquotes'
		},
		pkg:String,
		lDate:Date,
		dDate:Date,
		rName:String,
		rKm:Number,
		ld:{//loading point
			c:String,
			d:String,
			s:String,
			sf:String,
			zone:String,
			pin:Number,
			place_id:String
		},
		uld:{//unloading point
			c:String,
			d:String,
			s:String,
			sf:String,
			zone:String,
			pin:Number,
			place_id:String
		},
		imd:[{             //intermedite
			c:String,
			d:String,
			s:String,
			sf:String,
			pin:Number
		}]

	},
	constant.timeStamps
);

bookingSchema.pre('find', function () {
	this.populate('contract_id'),
		this.populate('branch_id'),
		this.populate('customer'),
		this.populate('route'),
		this.populate('routeData'),
		this.populate('statuses.user'),
		this.populate('consigner'),
		this.populate('consignee'),
		this.populate('billing_party'),
		this.populate('shipping_line'),
		this.populate('cha'),
		this.populate('preference')
		this.populate('material_type')
	    this.populate('created_by')
	// for (let query in this._conditions) {
	// 	if (!this.schema.paths.hasOwnProperty(query)) {
	// 		delete this._conditions[query];
	// 	}
	// }
});

module.exports = mongoose.model('BookingV2', bookingSchema);
