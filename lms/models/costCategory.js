const CostCategory = new mongoose.Schema({
	clientId: String,
	name: String,
	created_at: Date,
	created_by: String,
	last_modified_at: Date,
	last_modified_by: String
}, constant.timeStamps);

CostCategory.index({name: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('costCategory', CostCategory);
