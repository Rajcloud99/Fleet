const CostCenter = new mongoose.Schema({
	clientId: String,
	name: String,
	feature: [String], // enum: happay, fastag, driver, diesel cash, bill, money receipt etc.
	category: {
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'costCategory',
		},
		name: String,
	},
	branch: [{
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch',
		},
		name: String,
	}],
	created_at: Date,
	created_by: String,
	last_modified_at: Date,
	last_modified_by: String,
	deleted: Boolean
});

CostCenter.index({name: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('costCenter', CostCenter);
