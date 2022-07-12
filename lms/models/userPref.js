/**
 * Created by manish on 6/1/17.
 */
var mongoose = require ('mongoose');

var UserPrefSchema= new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "employeeId":constant.requiredString,
        "email":String,
        "trip": {
            start:Boolean,
            end:Boolean,
            arrival:Boolean,
            loading_start:Boolean,
            loading_end:Boolean,
            unloading_start:Boolean,
            unloading_end: Boolean
        },
        "booking":{
            "cancel":Boolean,
            "deleted":Boolean
        },
        "invoice": {
            "generated": Boolean,
            "approved": Boolean,
            "dispatched": Boolean
        },
        "payment":{
            settlement:Boolean,
            received:Boolean,
            paid:Boolean,
            overdue:Boolean
        },
        "maintenance": {
            start: Boolean,
            end: Boolean,
            due_date: Boolean
        },
        "pod": {
            received: Boolean,
            pending_15days: Boolean
        },
        "profit_report": {
            customer_wise: Boolean,
            date_wise: Boolean,
            daily: Boolean,
            weekly: Boolean,
            monthly: Boolean,
            aggregated: Boolean,
        },
        "trip_status_report": {
            daily: Boolean,
            weekly: Boolean
        },
        "costing_report":{
            daily:Boolean,
            weekly:Boolean,
            monthly:Boolean
        },
        "billing_report":{
            daily:Boolean,
            weekly:Boolean,
            monthly:Boolean
        },
        "vehicle_status_report":{
            daily:Boolean,
            weekly:Boolean,
        }
    },
    constant.timeStamps
);

module.exports = mongoose.model('UserPref', UserPrefSchema);
