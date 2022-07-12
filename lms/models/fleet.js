/**
 * Created by manish on 19/7/16.
 */

var mongoose = require('mongoose');

var FleetSchema = new mongoose.Schema({
        "clientId": constant.requiredString,
        "name": constant.requiredString,
        "designation": String,
        "prim_cont_no": Number,
        "other_cont_no": Number,
        "prim_email": String,
        "alt_email": String,
        "remarks": String,
		"monthlyManpower":[{
			mm_yy : Date,//01 day fix
			component: String,//manpower
			amount: Number,
			created_by:String,
			created_at:Date
		}],
        "created_by": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
      /**
 * added by manish
 */
    // "manufacturer": String,
    // "veh_type": {
    //     "type": mongoose.Schema.Types.ObjectId,
    //     "ref": "VehicleType"
    // },
    // "structure_name": String,
    // "veh_group_name": String,
   /**
 * added by manish
 */

        "last_modified_by_name": String,
        "last_modified_employee_code": String,
        "last_modified_by": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    constant.timeStamps
);

FleetSchema.plugin(mongoose_delete, {
	overrideMethods: 'all'
});

module.exports = mongoose.model('Fleet', FleetSchema);
