var mongoose = require ('mongoose');

var BillStationaryUsed = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		bookNo: constant.requiredString,
		usDate:Date
	},
	{
		...constant.timeStamps,
		strict: false
	}
);

BillStationaryUsed.index({bookNo: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('billStationaryUsed', BillStationaryUsed);
