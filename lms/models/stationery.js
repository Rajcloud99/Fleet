var mongoose = require ('mongoose');

var Stationery   = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		category: {
			type: String,
			enum: ['Bill', 'GR', 'Cash Receipt']
		},
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		name: constant.requiredString,
		min: constant.requiredNumber,
		max: constant.requiredNumber,
		year: Number,
		format: {
			type: String,
			regex: /{\d{0,5}}/
		},
		current:Number,
		autoGenerate: {
			type: Boolean,
			required: true
		},
		default: {
			type: Boolean,
			default: false
		},
		active:{
			type: Boolean,
			default: true
		},
		used: [{
			number: Number,
			formatted: String,
			details: {},
			unUsed: {
				type: Boolean,
				default: false
			},
			usedDate: Date,
			usedBy: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			}
		}],
		remark: String,
		created_by:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	constant.timeStamps
);

Stationery.pre('find',function () {
	this.populate({
		path: 'branch',
		select: {'name':1,'prim_contact_no':1,'prim_email':1,'profit_center':1,'cost_center':1}
	});
	this.populate({
		path: 'created_by',
		select: {'userId':1,'full_name':1}
	});
	this.populate({
		path: 'used.usedBy',
		select: {'userId':1,'full_name':1}
	});
});

module.exports = mongoose.model('stationery', Stationery);
