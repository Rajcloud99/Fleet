/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 19/03/18
 */

let mongoose = require('mongoose');

let Accounts = new mongoose.Schema({
		ancestors: [{type: mongoose.Schema.Types.ObjectId, ref: "accounts"}],
		clientId: constant.requiredString,
		clientR: [String],
		name: {
			_delta: true,
			type: String
		},
		ledger_name: {
			_delta: true,
			type: String
		},
		crDays: {
			type: Number,
			min: 0,
			max: 120
		},
		'isGroup': {
			_delta: true,
			type: Boolean,
			default: false
		},
		'billAc': {
			_delta: true,
			type: Boolean,
			default: false
		},
		lvl: {
			type: Number,
			required: true,
		},
		children: [{
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			name: String,
			level: Number,
		}],
		type: { // Parent
			_id: {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "accounts"
			},
			name: String,
			level: Number
		},
		group: [{
			type: String,
			enum: constant.accountGroup,
			_delta: true,
		}],
		pan_no: String,
		tdsApply: {
			_delta: true,
			type: Boolean,
			default: false
		},
		tdsCategory: {
			type: String,
			enum: constant.tdsCategory,
			_delta: true,
		},
		tdsSources: {
			type: String,
			enum: constant.tdsSource.source,
			_delta: true,
		},
		tdsSection: {
			type: String,
			enum: constant.tdsSource.section,
			_delta: true,
		},
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch',
			_delta: true,
		},
		access: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}],
		accountId: {
			_delta: true,
			...constant.requiredUniqueNumber
		},
		limit: {
			type: Number,
			_delta: true,
		},
		openBal1: Number,
		openBal2: Number,
		opening_balance: {
			type: Number,
			default: 0,
			_delta: true,
		},
	    opn_bal_date:Date,
		balance: {
			type: Number,
			_delta: true,
		},
		status: {
			type: String,
			enum: constant.accountStatuses,
			default: 'Open',
			_delta: true,
		},
		statusHistory: [{
			user_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			date: Date,
			systemDate: Date,
			status: {
				type: String,
				enum: constant.accountStatuses
			},
			remark: String,
		}],
		deleted: {
			type: Boolean,
			default: false
		},
		reserve: {
			type: Boolean,
			default: false
		},
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		exeRate: Number,      // exempted Rate
		exeFrom: Date,   // exempted valid from
		exeTo: Date,     // exempted valid to
		updated_by_name: String,
		tdsRate: Number,
		commonHistory: [{}],
		linkedTo: {
			linkedId: mongoose.Schema.Types.ObjectId,
			linkedModel: String,
			name: String,
			date: Date,
		},
		address: String,
		lastModifiedBy: String,
	},
	{...constant.timeStamps}
);

Accounts.pre('find', function () {
	let isProjection;
	if (this._fields && Object.keys(this._fields).length > 0) {
		isProjection = true;
	}

	if (isProjection && this._fields && this._fields.branch) {
		this.populate({
			path: 'branch',
			select: {'name': 1}
		});
	} else if (!isProjection) {
		this.populate({
			path: 'branch',
			select: {'name': 1}
		});
	}

	if (isProjection && this._fields && this._fields.created_by) {
		this.populate({
			path: 'created_by',
			select: {'userId': 1, 'full_name': 1}
		});
	}else if (!isProjection) {
		this.populate({
			path: 'created_by',
			select: {'userId': 1, 'full_name': 1}
		});
	}
});
module.exports = mongoose.model('accounts', Accounts);
