var mongoose = require ('mongoose');

var TableAccess   = new mongoose.Schema(
	{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
		configs: Object,
        clientId: constant.requiredString,
        access:[],
        visible:[],
        pages: constant.requiredString,
        table: constant.requiredString,
	},
	constant.timeStamps
);

module.exports = mongoose.model('tableaccess', TableAccess);
