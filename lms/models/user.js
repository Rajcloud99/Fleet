var mongoose = require ('mongoose');
var validator = require('validator');

var UserSchema   = new mongoose.Schema(
	{
		//basic info
		"account": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		"userId":constant.requiredString,
		authWeb: String, // authorization token for IOS
		authAndroid: String, // authorization token token for Android
		authIOS: String, // authorization token for IOS
		deleted:{
			type:Boolean,
			default:false
		},
		"clientId":[constant.requiredString],
		"full_name":{
			type:String,
			required:true,
			_delta: true
		},
		"father_name":{
			type:String,
			_delta: true
		},
		"mother_name":{
			type:String,
			_delta: true
		},
		"blood_group":{
            type:String,
			enum:constant.bloodGroup,
			_delta: true
        },
		"gender":{
            type:String,
			enum:constant.gender,
			_delta: true
        },
		"date_of_birth":{
			type:Date,
			_delta: true
		},
		"education":{
            type:String,
			enum:constant.educationTypes,
			_delta: true
        },
		"marital_status":{
            type:String,
			enum:constant.maritalStatus,
			_delta: true
        },
		"no_of_dependents":Number,
		"id_type":{
            type:String,
			enum:constant.idTypes,
			_delta: true
        },
		"id_number":{
			type:String,
			_delta: true
		},
		"nationality":{
			type:String,
			_delta: true
		},
		"current_address":constant.address,
		"permanent_address":constant.address,
		"contact_no":{
			type:Number,
			_delta: true
		},
		"emergency_contact_no":{
			type:Number,
			_delta: true
		},
		"email":{
			type:String,
			_delta: true
		},
		"password":{
			type:String,
			_delta: true
		},
		"pwd":{
			type:String,
			_delta: true
		},


		//employment info.
		"department":{
			type:String,
			_delta: true
		},
		"department_code":{
			type:String,
			_delta: true
		},
		"department_id":{
			type:mongoose.Schema.Types.ObjectId,
			ref:"Department"
		},

		"role" : {
			type:String,
			_delta: true
		},
		"office_email":{
			type:String,
			_delta: true
		},
        "office_telephone":{
			type:String,
			_delta: true
		},
		"type_of_employment":{
            type:String,
			enum:constant.employmentTypes,
			_delta: true
        },
        "user_type":[{
            type:String,
            enum:constant.user_type,
			default:"Employee"
        }],
		"branch_name":{
			type:String,
			_delta: true
		},
		"branch_code":{
			type:String,
			_delta: true
		},
		"branch_id":{
			type:mongoose.Schema.Types.ObjectId,
			ref:"Branch"
		},
		"branch":[{
			_id: {
				type:mongoose.Schema.Types.ObjectId,
				ref:"Branch"
			},
			name:String,
			read: {
				type: Boolean,
				default: true
			},
			write: {
				type: Boolean,
				default: true
			},
		}],
		"customer":[{
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Customer'
			},
			name:String,
		}],
		"hr_manager_name":{
			type:String,
			_delta: true
		},
		"hr_manager_employee_code":{
			type:String,
			_delta: true
		},
		"hr_manager_id":{
			type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		}, //reporting authority info
		"ra_name":{
			type:String,
			_delta: true
		},
		"ra_employee_code":{
			type:String,
			_delta: true
		},
		"ra_manager_id":{
			type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		},
		"hours_per_week":String,
		"gross_annual_salary":Number,
		"net_annual_salary":Number,
		"basic_monthly_allowance":Number,
		"other_monthly_allowance":Number,
		"total_monthly_allowance":Number,
		"work_exp_years":Number,
		"work_exp_month":Number,
		"previous_company_name":{
			type:String,
			_delta: true
		},
		"previous_company_designation":String,
		"previous_company_work_years":String,
		"previous_company_work_months":String,
		"seat_allotted":Boolean,
		"seat_no":String,
		"pc_allotted":Boolean,
		"pc_no":{
			type:String,
			_delta: true
		},
		"start_date":{
			type:Date,
			_delta: true
		},
		"leaving_date":{
			type:Date,
			_delta: true
		},
		"leaving_reason":{
			type:String,
			_delta: true
		},
		"employment_remarks":String,

		//accounts info
		"health_insurance_availed":Boolean,
		"health_insurance_company":{
			type:String,
			_delta: true
		},
		"health_insurance_no":{
			type:String,
			_delta: true
		},
		"life_insurance_availed":Boolean,
		"life_insurance_company":String,
		"life_insurance_no":String,
		"salary_acount_bank":String,
		"salary_acount_bank_branch":String,
		"salary_acount_bank_ifsc":String,
		"salary_account_no":String,
		"pf_account_number":String,
		"pension_account_number":String,
		"account_remarks":String,

		//documents info
		"previous_comp_salary_slip":String,
		"id_proof":{
			type:String,
			_delta: true
		},
		"pf_account":String,
		"pan_proof":String,
		"dob_proof":String,
		"educational_proof":String,

		//creator info
		"created_by_name":String,
		"created_by_employee_code":String,
		"created_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"last_modified_by_name":{
			type:String,
			_delta: true
		},
		"last_modified_employee_code":String,
		"last_modified_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		current_active_trip_no : Number,
		//is user is any kind of admin.Do not use this key anywhere
		"active_gr_book":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'gr'
		},
		vehicle_allowed: [{
			type: String,
		}],
		clientAdmin:{
			type:Boolean,
			default:false
		},
		apps_visible:[
		    String
        ],
		sidebar_visible:{
			type:Boolean,
			default:true
		},
		widgets_visible :[
			String
		],
		preferred_language:{
			type:String,
			default:"English",
			enum:constant.languageTypes
		},
		access:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accessControl'
		},
		billBook_type: [{
			type: String,
			enum: constant.billBookType,
		}],
		segment_type: [{
			type: String,
		}],
		client_allowed: [{
			clientId: String,
			name: String
		}],
		aPaymentType: [{
			pType: String,
			toGroup: [{
				type : String
			}],
			fromGroup: [{
				type : String
			}],
			voucherType: [{
				type: String,
				enum: constant.voucherType,
			}],
		}],
		bmBillName :String,            //broker memo bill name
		brokerbp: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		brokerbpName :String,
		brokerCustomer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		brokerCustName :String,
		notifId :String,           // notification id or user id
	},
	constant.timeStamps
);

UserSchema.pre("findOne",function () {
	this.populate({
		path: 'branch',
		//match: this._conditions.branch_query,
		select: {'name':1,'prim_contact_no':1,'prim_email':1,'profit_center':1,'cost_center':1}
	})
});

module.exports = mongoose.model('User', UserSchema);
