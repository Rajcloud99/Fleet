/**
 * Created by manish on 4/7/16.
 */
var mongoose = require ('mongoose');
var oGoogleCity = {
        c: String,
        s: String,
        p: Number,
        d: String,
        sf : String,
        address_components:{
              street_number: String,//'short_name'
              route: String,//'long_name'
              sublocality_level_2: String,//'long_name'
              sublocality_level_3: String,//'long_name'
              sublocality_level_1: String,//'long_name'
              sublocality: String,//'long_name'
              locality: String,//'long_name'
              administrative_area_level_2: String,//'long_name'
              administrative_area_level_1: String,//'short_name',
              administrative_area_level_1_f: String,//'long_name'
              country : String,//'short_name',
              country_f : String,//'long_name',
              postal_code: Number,//'short_name'
        },
        formatted_address : String,
        geometry : {
            location:{
                lat: Number,
                lng:Number
            }
        },
        place_id:String,
        types:[String],
        url : String,
        vicinity:String     
    };

var bidNRateSchema = new mongoose.Schema({
        vendorId:{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'  
        },
        postingId : String,
        isBooked :{
          type:Boolean,
          default : false
        },
        bookingId : {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Booking'  
        },
        vendor_name: String,
        vendor_company: String,
        vendor_mobile: Number,
        vendor_email: String,
        post_owner_name: String,
        post_owner_company: String,
        post_owner_mobile: Number,
        post_owner_email: String,
        rating:Number,
        source : oGoogleCity,
        destination: oGoogleCity,
        truckType:	{
            _id : String,
            code: String,
            truck_type: String,
            category: String,
            capacity:Number
        },
        bids:[Number],
        current_bid : Number,
        lead_by_Id :{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'  
        },
        rated_by_Id :{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'  
        },
        created_at: {'type': Date, default: Date.now()},
        latModified: {'type': Date, default: Date.now()}
    }
);

module.exports = mongoose.model('VendorBidRate', bidNRateSchema);
