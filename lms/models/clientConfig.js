/**
 * Created by nipun on 28/12/17.
 */

var mongoose = require ('mongoose');

var clientConfigSchema = new mongoose.Schema(
	{
		clientId: String,
		name: String,
		config: {}
	}
);

module.exports = mongoose.model('ClientConfig', clientConfigSchema);
