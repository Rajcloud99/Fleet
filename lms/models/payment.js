var mongoose = require ('mongoose');
var validator = require('validator');
var paymentSchema = new mongoose.Schema(
  {   
  entityName :{
    type: String,
    enum: ['PAYMENT'],
    default:'PAYMENT'
   },
  PAYU_BASE_URL : String, 
  paymentId : String,
  paymentDate : String,
  amount:Number,
  bookingId : String,
  bookingDate : String,
  post_type : {
      'type': 'String',
      'enum': ['load','truck','SL'],
      default : 'load'
      },
  interest_id : {
      type: mongoose.Schema.Types.ObjectId,
       ref: 'ShowInterest'  
     },
  posting_id : {
      type: mongoose.Schema.Types.ObjectId,
        ref: 'Posting'  
     },
  status : 
      {
      'type': 'String',
      'enum': ['initiated','failed_online_payment','confirm'],
      default : 'initiated'
      },
  priceCurrency : {
      'type': 'String',
      'enum': ['RS','USD','EURO'],
      default : 'RS'
     },
  post_owner_id:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
  interest_owner_id:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
  discount : Number,
  offer : String,
  done_by :  {
      'type': 'String',
      'enum': ['post_owner','interest_owner','admin'],
      default : 'post_owner'
     },
  code: {
     type:String,
       'enum': ['ADV','8A2D','7A3D','5A5D','DEL','NA'],
         default : 'NA'
     },
  mode: { 
     type:String,
       'enum': ['Internet','Wallet','Cash','Check'],
          default : 'Cash'
     },
  percent : Number,
  transporter_payment:{
      loading:Number,
      loading_type:String,
      unloading:Number,
      munshiyana:Number,
      service_charge:Number,
      advance:Number,
      balance:Number,
      total:Number,
      mode: String,
      detaintion:Number
    },
    loader_payment:{
      toPayPOD:Boolean,
      toPayPODdata:Number,
      loading:Number,
      loading_type:String,
      unloading:Number,
      munshiyana:Number,
      service_tax:Number,
      tds:Number,
      advance:Number,
      balance:Number,
      total:Number,
      mode: String,
      detaintion:Number
    },
  created_at: {'type': Date, default: Date.now()},
  latModified: {'type': Date, default: Date.now()},
  oPUM : {
      txnid: String,
      firstname: String,
      email: String,
      amount: Number,
      phone: Number,
      productinfo : String,
     //      productinfo: {
     //        paymentParts: [
     //          {
     //            name: String,
     //            description: String,
     //            isRequired:  {
     //              type : Boolean,
     //              default : false
     //            },
     //            value: Number,
     //            settlementEvent: String
     //          }
     //        ],
     //        paymentIdentifiers : [
     //          {
     //            field: String,
     //            value: String
     //          }
     //        ]
     //       },
      udf1: String,
      udf2: String,
      udf3: String,
      udf4: String,
      udf5: String,
      surl:String,
      furl:String,
      curl:String,
      key:String,
      address1:String,
      address2:String,
      city:String,
      state:String,
      country:String,
      zipcode:Number,
      shipping_firstname:String,
      shipping_lastname:String,
      shipping_address1:String,
      shipping_address2:String,
      shipping_city:String,
      shipping_state:String,
      shipping_country:String,
      shipping_zipcode:Number,
      shipping_phone:Number,
      shipping_phoneverified:String,
      service_provider: String,
      hash:String
     },
  oRes : {
    mihpayid : String,
    mode : String,
    status :  { 
      type:String,
      'enum': ['success','pending','failure'],
      default : 'pending'
      },
    key:String,
    txnid: String,
    amount: Number,
    discount: Number,
    firstname: String,
    lastname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    country: String,
    zipcode: Number,
    email: String,
    phone: Number,
    udf1: String,
    udf2: String,
    udf3: String,
    udf4: String,
    udf5: String,
    hash: String,
    Error: String,
    PG_TYPE: String,
    bank_ref_num: Number,
    shipping_firstname: String,
    shipping_lastname : String,
    shipping_address1: String,
    shipping_address2: String,
    shipping_city: String,
    shipping_country: String,
    shipping_zipcode: String,
    shipping_phone: String,
    shipping_phoneverified: String,
    unmappedstatus: String,
    payuMoneyId : String,
    productinfo : String,
    /* productinfo: {
        paymentParts: [
          {
            name: String,
            description: String,
            isRequired:  {
              type : Boolean,
              default : false
            },
            value: Number,
            settlementEvent: String
          }
        ],
        paymentIdentifiers : [
          {
            field: String,
            value: String
          }
        ]
       }
       */
     }
   }
 );

module.exports = mongoose.model('Payment',paymentSchema);