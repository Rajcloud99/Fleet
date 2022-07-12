var mongoose = require ('mongoose');
var validator = require('validator');

var requiredString =
  {
    'type': 'String',
    'required': 'true'
  };

var gpsGaadiSchema = new mongoose.Schema(
  {
    
    contact_person_name: requiredString,
    
    mobile :
    {
       type: Number,
       required: true,
       set :
          function(num) {
          return Math.abs(Math.round(num));
          }
    },

    email :
    {
       type: String,
       set :
          function(email) {
            return email.toLowerCase();
          },
       validate: [validator.isEmail, "Invalid Email"]
    },

    service: String,

    subject: String,

    message: String,
    
    type : {
      type: String,
      enum: ['contact','enquiry','service'],
     },
    created_at: {'type': Date, default: new Date()},
    latModified: {'type': Date, default: new Date()}
    
  }
 );

module.exports = mongoose.model('gpsGaadies', gpsGaadiSchema);
