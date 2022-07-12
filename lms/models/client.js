/**
 * Created by manish on 9/8/16.
 */

var mongoose = require('mongoose');

var ClientSchema = new mongoose.Schema({
    "clientId": constant.requiredUniqueString,
	"clientParentId":String,
    "client_full_name": constant.requiredString,
    "client_display_name": constant.requiredString,
    "client_address": constant.address,
    "client_employee_strength": Number,
    "client_customer_base": Number,
    "client_approx_turnover": Number,
    "gstin_no": constant.requiredString,
    "client_type": {
        type: String,
        enum: constant.clientType
    },
    "client_website_url": String,
    "client_t_n_c": String,
    "client_android_app_link": String,
    "client_ios_app_link": String,
    "client_iso": String,
    "client_display_line_1": String,
    "client_display_line_2": String,
    "client_display_line_3": String,
    "client_display_line_4": String,
    "client_subtitle": String,
    "client_status": {
        type: String,
        enum: constant.customerStatus,
        default: "Active"
    },
    "client_company_type": {
        type: String,
        enum: constant.companyType
    },
    "client_service_tax_no": String,
    "client_tin_no": String,
    "client_pan_no": String,
    "gpsId": String,
    "client_theme_color": {
        type: String,
        default: "#003366"
    },
    flow: {
        type: Array,
        'default': ["GR,DIESEL,TRIP"]
    },
    "client_primary_contact_no": Number,
    "client_alternate_contact_no": Number,
    "client_primary_email": String,
    "client_alt_email": String,
    "client_fax": String,

    "client_prim_contact_person": String,
    "client_prim_contact_designation": String,
    "client_prim_contact_person_no": Number,
    "client_prim_contact_person_email": String,

    "client_alt_contact_person": String,
    "client_alt_contact_person_designation": String,
    "client_alt_contact_person_no": Number,
    "client_alt_contact_person_email": String,

    "client_it_administrator_name": String,
    "client_it_administrator_contact_no": String,
    "client_it_administrator_email": String,

    "role": String,

    "ft_primary_contact_person": String,
    "ft_primary_contact_person_designation": String,
    "ft_primary_contact_person_no": String,
    "ft_primary_contact_person_email": String,

    "ft_alt_contact_person": String,
    "ft_alt_contact_person_designation": String,
    "ft_alt_contact_person_no": String,
    "ft_alt_contact_person_email": String,

    /*"app_access_matrix":[
            String
    ],*/
    "bill_amount_monthly": Number,
    "service_tax_monthly": Number,
    "total_amount_monthly": Number,
    "overall_amount": Number,
    "payment_terms": String,
    "billing_terms": String,
    "billing_frequency": String,
    "remarks_billing": String,
    "sms_limit": Number,
    "email_limit": Number,

    "client_logo": String,
    "client_favicon": String,
    "client_billing_doc": String,
    "client_tin_doc": String,
    "client_pan_doc": String,

    "created_by_name": String,
    "created_by_employee_code": String,
    "created_by": {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    "last_modified_by_name": String,
    "last_modified_employee_code": String,
    "last_modified_by": {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    "booking": {
        booking_date: {
            min_hour: Number,
            max_hour: Number
        }
    },
    allocation: {
        allocation_date: {
            min_hour: Number,
            max_hour: Number
        }
    },
    gr: {
        gr_date: {
            min_hour: Number,
            max_hour: Number
        }
    },
    trip: {
        trip_start_date: {
            min_hour: Number,
            max_hour: Number
        }
    },
    fleet: {
        label: String
    },
    dateTimeFormat: {
        angularJS: {
            type: String,
            default: "DD-MM-yyyy H:m"
        },
        momentJS: {
            type: String,
            default: "DD-MM-YYYY H:m"
        }
    },
	'fastag_customerId': Number,
	'fastag_API_KEY': String
},
    constant.timeStamps
);

module.exports = mongoose.model('Client', ClientSchema);
