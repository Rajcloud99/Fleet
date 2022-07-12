/**
 * Created by shivam on 14/6/18.
 */
let mongoose = require('mongoose');

let deviceMasterSlipSchema = new mongoose.Schema({
    clientId: constant.requiredString,
		slip_number: constant.requiredString,
    slip_type: {
      type: String,
      required: true,
      enum: ['ISSUE', 'RETURN']
    },
    devices: [{
			device_ref: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'deviceMaster'
			},
			device_name: String,
			imei: String
		}],
    issued_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issued_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issued_date: Date,
		returned_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		returned_by_customer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		returned_to: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		returned_date: Date,
		}, {
	...constant.timeStamps,
	strict: true,
	strictQuery: true
});

module.exports = mongoose.model('deviceMasterSlip', deviceMasterSlipSchema);
