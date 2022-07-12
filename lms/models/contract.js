/**
 * Created by manish on 19/7/16.
 */

var mongoose = require('mongoose');

var ContractSchema = new mongoose.Schema(
    {
        "name": constant.requiredString,
        "contractId": constant.requiredString,
        "clientId": constant.requiredString,
        "customer_name": String,
        "customer__id": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Client',
            required: true
        },
        "contract_type": {
            type: String,
            enum: constant.contractType
        },
        "contract_status": {
            type: String,
            enum: constant.contractStatus
        },
        "payment_type": {
            type: String,
            enum: constant.paymentType
        },
        "billing_type": {
            type: String,
            enum: constant.billingType
        },
        "payment_basis": {
            type: String,
            enum: constant.payment_basis
        },
        "do_weight": Number,
		do_number:String,
        "rate": Number,
        "remaining_weight": Number,
        "contract_start_date": Date,
        "contract_end_date": Date,
        "duration_in_days": Number,
        "duration_in_months": Number,
        "total_vehicle_movement": Number,
        "vehicle_movement_monthly": Number,
        "vehicle_movement_daily": Number,
        "total_container_movement": Number,
        "container_movement_monthly": Number,
        "container_movement_daily": Number,
        "total_amount": Number,
        "amount_monthly": Number,
        "amount_daily": Number,
        "total_weight_moved": Number,
        "weight_moved_monthly": Number,
        "weight_moved_daily": Number,
		"diesel_base_price":Number,
        "diesel_escalation_clause": {
            "base_price": Number,
            "percentage_freight": String,
            "increase_in_price": Number,
            "hike": Number
        },
        "emails_required": Boolean,
        "email": String,
        "email_frequency": {
            type: String,
            enum: constant.billingType
        },
        "credit": {
            "total_credit_limit": Number,
            "credit_days": Number,
            "monthly_credit_limit": Number,
            "daily_credit_limit": Number,
            "payment_cycle_days": Number
        },
		"mine_name": String,
        "billing_generation_date": Number,
        "bank_guarantee": Number,
        "wc_requirement": Number,
        "monthly_bvalue": Number,
        "emd": Number,
        "insurance": Number,
        "overdue_amount": Number,
        "overdue_days": Number,
        "outstanding_amt": Number,
        "totalWeight": Number,
        "servedWeight": Number,
		"totalUnit": Number,
		"servedUnit": Number,
		"totalVehicle": Number,
		"servedVehicle": Number,
        "transport_routes": [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'TransportRoute'
            }
        ],
        "remarks": String,
		"materials":[{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'MaterialType'
		}],
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
        upload_document: { type: String },
		'detentionDateRange':[{
			'start_day': Number,
			'end_day': Number,
			'label': String
		}],
		'detentionCharges': [{
			'vehicleTypeName': String,
			'vehicleTypeId': {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
			'dateRange':[{
				'start_day': Number,
				'end_day': Number,
				'label': String,
				'charge': Number
			}],
		}]
    },
    constant.timeStamps
);

ContractSchema.plugin(mongoose_delete, { overrideMethods: 'all' });



module.exports = mongoose.model('Contract', ContractSchema);
