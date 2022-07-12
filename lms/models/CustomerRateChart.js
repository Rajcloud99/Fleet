const mongoose = require('mongoose');

const customerRateChartSchema = new mongoose.Schema({
	clientId: constant.requiredString,
	customer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Customer',
		// required: true
	},
	effectiveDate: {
		type: Date,
		required: true
	},
	vehicleTypeCode: String,
	materialGroupCode: {
		type: String,
		lowercase: true,
		trim: true
	},
	materialGroupName: {
	    type: String
	},
	source: {
		type: String,
		// required: true,
		lowercase: true,
		trim: true
	},
	destination: {
		type: String,
		// required: true,
		lowercase: true,
		trim: true
	},
	routeDistance: {
		type: Number,
	},
	unit: {
		type: String,
		enum: ['Pcs', 'Tonne', 'Ft', 'Ltr'],
		// required: true
	},
	paymentBasis: {
		type: String,
		enum: ['Fixed', 'PUnit', 'PMT', 'Percentage']
	},
	rate: Number,
	invoiceRate: Number,
	insurRate: Number,
	grCharges: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Percent of basic freight']
		}
	},
	surCharges: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	cartageCharges: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	labourCharges: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	otherCharges: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	prevFreightCharges: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	detentionLoading: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	detentionUnloading: {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	discount:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	loading_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	unloading_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	weightman_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	overweight_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	advance_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	damage:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	incentive:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Percent of basic freight', 'Fixed', 'Percent']
		}
	},
	shortage:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	penalty:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	extra_running:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	dala_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	diesel_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	kanta_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	factory_halt:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	company_halt:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	toll_charges:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	internal_rate:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	green_tax:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	twoPtDelivery:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	standardTime:  {
		rate: Number,
		basis: {
			type: String,
			enum: ['Fixed']
		}
	},
	baseValue: {
		type: Number
	},
	baseValueLabel: String,
	baseRate:[{
		rate:Number,
		baseVal:Number,
		label:String,
	}],
	billingParty: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'billingparty',
	},
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'VendorTransport',
	},
	hsnCode: String,
	type: String,
	uploaded_at: Date,
	uploaded_by: String
}, { ...constant.timeStamps, strict: false });

module.exports = mongoose.model('customerratecharts', customerRateChartSchema, 'customerratecharts');

// Customer Configs

const HMSI = [
	{label: 'Date', field: 'effectiveDate'},
	{label: 'Origin', field: 'source'},
	{label: 'Destination', field: 'destination'},
	{label: 'Material Group', field: 'materialGroupCode'},
	{label: 'KM', field: 'routeDistance'},
	{label: 'Unit', field: 'unit', default: 'Pcs'},
	{label: 'Payment Basis',field: 'paymentBasis', default: 'PUnit'},
	{label: 'Honda 44', field: 'rate'},
	{label: 'LRCharge', field: 'grCharges.rate', enum: [0, 4]},
	{label: 'SurCharge', field: 'surCharges.rate', default: 0},
	{label: 'Cartage', field: 'cartageCharges.rate', default: 0},
	{label: 'Labour', field: 'labourCharges.rate', default: 0},
	{label: 'Other', field: 'otherCharges.rate', default: 0},
	{label: 'PrevFreight', field: 'prevFreightCharges.rate', default: 0},
	{label: 'Detention', field: 'detention.rate', default: 0},
	{label: 'Discount', field: 'discount.rate', default: 0},
	{label: 'LRChargeType', field: 'grCharges.basis', default: 'Percent of basic freight'},
	{label: 'SurChargeType', field: 'surCharges.basis', default: 'Fixed'},
	{label: 'CartageType', field: 'cartageCharges.basis', default: 'Fixed'},
	{label: 'LabourType', field: 'labourCharges.basis', default: 'Fixed'},
	{label: 'OtherType', field: 'otherCharges.basis', default: 'Fixed'},
	{label: 'PrevFreightType', field: 'prevFreightCharges.basis', default: 'Fixed'},
	{label: 'DetentionType', field: 'detention.basis', default: 'Fixed'},
	{label: 'DiscountType', field: 'discount.basis', default: 'Fixed'},
	{label: 'BaseValue', field: 'baseValue', default: 40, enum: [40, 65]}
];

const HONDA = [];

const Castrol = [
	{label: 'Date', field: 'effectiveDate'},
	{label: 'Origin', field: 'source'},
	{label: 'Destination', field: 'destination'},
	{label: 'Material Group', field: 'materialGroupCode'},
	{label: 'KM', field: 'routeDistance'},
	{label: 'Unit', field: 'unit', default: 'Pcs'},
	{label: 'Payment Basis',field: 'paymentBasis', default: 'PUnit'},
	{label: 'LRChargeType', field: 'grCharges.basis', default: 'Percent of basic freight'},
	{label: 'LRCharge', field: 'grCharges.rate', enum: [0, 4]},
	{label: 'SurChargeType', field: 'surCharges.basis', default: 'Fixed'},
	{label: 'SurCharge', field: 'surCharges.rate', default: 0},
	{label: 'CartageType', field: 'cartageCharges.basis', default: 'Fixed'},
	{label: 'Cartage', field: 'cartageCharges.rate', default: 0},
	{label: 'LabourType', field: 'labourCharges.basis', default: 'Fixed'},
	{label: 'Labour', field: 'labourCharges.rate', default: 0},
	{label: 'OtherType', field: 'otherCharges.basis', default: 'Fixed'},
	{label: 'Other', field: 'otherCharges.rate', default: 0},
	{label: 'PrevFreightType', field: 'prevFreightCharges.basis', default: 'Fixed'},
	{label: 'PrevFreight', field: 'prevFreightCharges.rate', default: 0},
	{label: 'DetentionType', field: 'detention.basis', default: 'Fixed'},
	{label: 'Detention Loading', field: 'detentionLoading.rate', default: 0},
	{label: 'Detention Unloading', field: 'detentionUnloading.rate', default: 0},
	{label: 'DiscountType', field: 'discount.basis', default: 'Fixed'},
	{label: 'Discount', field: 'discount.rate', default: 0},
	{label: 'Loading Type', field: 'loading_charges.basis', default: 'Fixed'},
	{label: 'Loading Charges', field: 'loading_charges.rate', default: 0},
	{label: 'Unloading Type', field: 'unloading_charges.basis', default: 'Fixed'},
	{label: 'Unloading Charges', field: 'unloading_charges.rate', default: 0},
	{label: 'WeightMan Type', field: 'weightman_charges.basis', default: 'Fixed'},
	{label: 'WeightMan Charges', field: 'weightman_charges.rate', default: 0},
	{label: 'OverWeight Type', field: 'overweight_charges.basis', default: 'Fixed'},
	{label: 'OverWeight Charges', field: 'overweight_charges.rate', default: 0},
	{label: 'Advance Type', field: 'advance_charges.basis', default: 'Fixed'},
	{label: 'Advance Charges', field: 'advance_charges.rate', default: 0},
	{label: 'Damage Type', field: 'damage.basis', default: 'Fixed'},
	{label: 'Damage Charges', field: 'damage.rate', default: 0},
	{label: 'Shortage Type', field: 'shortage.basis', default: 'Fixed'},
	{label: 'Shortage Charges', field: 'shortage.rate', default: 0},
	{label: 'Penalty Type', field: 'penalty.basis', default: 'Fixed'},
	{label: 'Penalty Charges', field: 'penalty.rate', default: 0},
	{label: 'Extra Type', field: 'extra_running.basis', default: 'Fixed'},
	{label: 'Extra Charges', field: 'extra_running.rate', default: 0},
	{label: 'Dala Type', field: 'dala_charges.basis', default: 'Fixed'},
	{label: 'Dala Charges', field: 'dala_charges.rate', default: 0},
	{label: 'Diesel Type', field: 'diesel_charges.basis', default: 'Fixed'},
	{label: 'Diesel Charges', field: 'diesel_charges.rate', default: 0},
	{label: 'Kanta Type', field: 'kanta_charges.basis', default: 'Fixed'},
	{label: 'Kanta Charges', field: 'kanta_charges.rate', default: 0},
	{label: 'Factory Halt Type', field: 'factory_halt.basis', default: 'Fixed'},
	{label: 'Factory Halt Charges', field: 'factory_halt.rate', default: 0},
	{label: 'Company Halt Type', field: 'company_halt.basis', default: 'Fixed'},
	{label: 'Company Halt Charges', field: 'company_halt.rate', default: 0},
	{label: 'Toll Type', field: 'toll_charges.basis', default: 'Fixed'},
	{label: 'Toll Tax', field: 'toll_charges.rate', default: 0},
	{label: 'Internal Type', field: 'internal_rate.basis', default: 'Fixed'},
	{label: 'Internal Rate', field: 'internal_rate.rate', default: 0},
	{label: 'Green Type', field: 'green_tax.basis', default: 'Fixed'},
	{label: 'Green Tax ', field: 'green_tax.rate', default: 0},

	{lable: "Rate","fields":"baseRate","ftype":"Array"}
];

/*
Sampel for Castrol
	"baseRate": [{
	"rate":25000,
	"baseVal":14,
	"basis":"PMT",
	"":"14 "
},
	{
		"rate":26000,
		"baseVal":16,
		"basis":"PMT"
	},
	{
		"rate":2700,
		"baseVal":19,
		"basis":"PMT"
	},
	{
		"rate":28000,
		"baseVal":21,
		"basis":"PMT"
	}
]
*/
