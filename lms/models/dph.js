// ********* Created by Dev Dhakad on 09/12/21. **********
// Diesel Petrol Hike (DPH)

const mongoose = require('mongoose');

const dphSchema = new mongoose.Schema({
	clientId: constant.requiredString,
	customer_name: {
		type: String,
		required: true
	},
	customer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Customer',
		required: true
	},
	date: {
		type: Date,
		required: true
	},
	rate: {
		type: Number,
		required: true
	},
	hike: {
		type: Number,
		required: true
	},
	createdBy:{
		type: String,
	}
}, constant.timeStamps);

dphSchema.index({customer: 1, clientId: 1, date: 1}, {unique: true});
module.exports = mongoose.model('dieselPetrolHike', dphSchema);

