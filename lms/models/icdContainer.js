var mongoose = require('mongoose');
var validator = require('validator');
var ICDcity = require('./icdcity');
var User = require('./user');

var ICDContainerSchema = new mongoose.Schema(
  { 
    postingId : String,
    postingDate : String,
    entityName :{
      type: String,
      enum: ['POSTING'],
      default:'POSTING'
    },

    containers: [
    {
      
        container_type: String,
        
        cost : {
            type: Number,
            min: 0
        },
        
        posted_container:{
            type: Number,
            min: 0
        },
        
        interested_container:{
            type: Number,
            min: 0
        },
        
        remaining_container:{
            type: Number,
            min: 0
        },
        
    }],

    date: {
            from:
              {
                type: Date
              },
            to:
              {
                type: Date
              }
          },

    source:
      {
        port_name: { type:String,
          ref: 'ICDcity',
          required: true
        }
      },
    destination:[
      {
          port_name: { type:String,
            ref: 'ICDcity',
            required: true
          }
      }],

    radius: Number,

    post_owner_mobile : Number,
    post_owner_email:String,
    post_owner_name:String,
    post_owner_company:String,

    invoice_interest : {   
        invoice_no : Number,
        customer_name : String,
        customer_address : String,
        items :[
        {
          name : String,
          quantity : Number,
          price  : String,
          cost : Number
        }],
        total_amount_payable : Number,
        grand_total_amount : Number,
        bookingDate :  {'type': Date}
    },

    contact_person_payment_at_dropofLocation : {
        name : String,
        number : Number,
        amount : Number,
        percent: Number,
        status :  { 
            type:String,
            'enum': ['pending','received','paid','NA'],
            default : 'pending'
         }
    },

    contact_person_payment_at_pickupLocation : {
        name : String,
        number : Number,
        amount : Number,
        percent: Number,
        status :  { 
            type:String,
            'enum': ['pending','received','paid','NA'],
            default : 'pending'
         }
    },
     

    userId:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },

    verified : 
       {
        'type': 'String',
        'enum': ['active', 'pending', 'inactive','booked','history'],
        default : 'pending'
       },

    isDaily : {
        type : Boolean,
        default : false
    },

    type : {
      type: String,
      enum: ['container'],
      default:'container'
    },

    
    interested_to: [
    {
	        type: mongoose.Schema.Types.ObjectId,
	        ref: 'ICDShowInterest'
	  }],

    dropofLocation : {
          name : String,
          mobile: Number,
          address : String,
          landmark : String,
          city : String,
          district : String,
          state : String,
          pincode: Number         
    },

    pickupLocation : {
        name : String,
        mobile: Number,
        address : String,
        landmark : String,
        city : String,
        district : String,
        state : String,
        pincode: Number 
    },
     
    created_at: {type: Date, default: Date.now()},
    latModified: {type: Date, default: Date.now()}
  }
);

module.exports = mongoose.model('ICDContainers',ICDContainerSchema);
