/* Created By Pratik
*New Joi Validator used for params and body validation used as Middleware
* */
const Joi = require('joi');
const validations = {
	add_gr_number:{
		params:{
			_id: Joi.string().required()
		},
		body: Joi.object({
			grNumber: Joi.string().required(),
			grDate: Joi.string().required()
		}).min(1)
	},
	update:{
		params:{
			_id: Joi.string().required()
		},
		body: Joi.object({}).min(1)
	},
	update_status:{
		params:{
			_id: Joi.string().required()
		},
		body: Joi.object({
			status: Joi.string().required()
		}).min(1)
	},
	charge_update:{
		params:{
			_id: Joi.string().required()
		},
		body: Joi.object({
			charges: Joi.object().required()
		}).min(1)
	},
	admin_update:{
		params:{
			_id: Joi.string().required()
		}
	},
	acknowledge_gr:{
		params:{
			_id: Joi.string().required()
		},
		body: Joi.object({
			charges: Joi.object(),
			acknowledge:Joi.object(),
		}).min(1)
	},
	pending_gr_remark:{
		params:{
			_id: Joi.string().required()
		},
		body: Joi.object({
			pendingRemark: Joi.object().min(1)
		}).min(1)
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
	}
};

module.exports = validations;
