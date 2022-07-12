/* Created By Pratik
*New Joi Validator used for params and body validation used as Middleware
* */
const Joi = require('joi');
const validations = {
	/** POST /api/trips/vehicle_allocate - Create new trip */
	add:{
		body:Joi.object({
			trips:Joi.array().items(
				Joi.object({ vehicle_no: Joi.string().required() }).min(1)
			).min(1)
		}).min(1)
	},

	addEmptyTrip:{
		body: Joi.object({
			vehicle:Joi.string().required(),
			vehicle_no:Joi.string().required(),
			route:Joi.string(),
			route_name:Joi.string(),
			driver:Joi.string().required(),
			tripStartDate:Joi.string().required(),
			tripEndDate:Joi.string(),
			segment_type:Joi.string(),
		})
	},

	update_payment:{
		param:Joi.object({
			_id:Joi.string().required()
		})

	},

	/** PUT /api/trips/update_status/:_id - Update trip status*/
	update:{
		params:{
			_id: Joi.string().required()
		}
	},

	/** PUT /api/trips/update/:_id - Update trip*/
	update_status:{
		params:{
			_id: Joi.string().required()
		},
		body: {
			status: Joi.string().required()
		}
	},

	bulk_update_status:{
		body: {
      tripIds: Joi.array().items(Joi.string().required()).min(1),
			status: Joi.string().required()
		}
	},
	/** PUT /api/trips/update/:_id - cancel trip*/
	cancel:{
		params:{
			_id: Joi.string().required()
		},
		body: {
			status: Joi.string().required()
		}
	},
	add_geofence:{
		params:{
			_id: Joi.string().required()
		},
		body: {
			name : Joi.string().required(),
			lat : Joi.number().min(-90).max(90),
			lng: Joi.number().min(-180).max(180),
			type : Joi.string().required()
		}
	},
	rm_geofence:{
		params:{
			_id: Joi.string().required()
		},
		body: {
			l_id : Joi.string().required(),
		}
	},
	approveAdvanceValidator:{
		params:{
			_id: Joi.string().required()
		},
		body: {
			advanceType : Joi.any()
				//.valid(constant.aAdvanceType)
				.required(),
			amount: Joi.number().greater(0),
			remark: Joi.string(),
			category: Joi.string(),
			liter: Joi.number().when('advanceType', {'is': 'Diesel', then: Joi.number().greater(0).required()})
		}
	},
	addAdvanceValidator:{
		// params:{
		// 	_id: Joi.string().required()
		// },
		body: {
			advanceType : Joi.string().required(),
			amount: Joi.number().required(),
			remark: Joi.string(),
			reference_no: Joi.string(),
			person: Joi.string().required(),
			vendor: Joi.string(),
			driver: Joi.string(),
			diesel_info: Joi.object({
				litre: Joi.number().required(),
				rate: Joi.number().greater(0).required(),
				vendor: Joi.string().required(),
			}).when('advanceType', {'is': 'Diesel', then: Joi.object().required()}),
			account_data: Joi.object({
				from: Joi.string().required(),
				to: Joi.string().required(),
			}).required()
		}
	},
	settleTripValidator:{
		body: {
			aSettle : Joi.array().items(Joi.object().keys({
				trip_no: Joi.number().required(),
				trip_id: Joi.string().required(),
				type: Joi.string().required(),
				amount: Joi.number(),
				created_at: Joi.string(),
				//remark: Joi.string(),
				//reference_no: Joi.string(),
				person: Joi.string().required()
				/*
				diesel_info: Joi.object({
					litre: Joi.number(),
					rate: Joi.number()
				}).when('settleType', {'is': 'Diesel', then: Joi.object()}),
				*/
			})),
			aTrips: Joi.array().items(Joi.string())
		}
	},
	UpdateSettleTripValidator:{
		params:{
			_id: Joi.string().required()
		},
		body: {
			amount: Joi.number()
		}
	},
	approvedBudgetValidator: {
		query: {
			type: Joi.string().valid(['Diesel', 'Happay', 'Fasttag'])
		},
		body: {
			type: Joi.string().valid(['Diesel', 'Happay', 'Fasttag'])
		}
	}
};


module.exports = validations;
