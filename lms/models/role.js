/**
 * Created by user on 08-Oct-16.
 */
var mongoose = require ('mongoose');

/**Role data saved is an array since objects do not preserve order.
Wherever easy access is required, role data is referred as processed_role_data ***/
var RoleSchema = new mongoose.Schema(
    {
        "role":constant.requiredString,
        "department":constant.requiredString,
        "clientId":constant.requiredString
    },{strict:false}
);

module.exports = mongoose.model('Role', RoleSchema);
