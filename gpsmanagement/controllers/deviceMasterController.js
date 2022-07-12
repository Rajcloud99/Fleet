/**
 * Created by manish on 5/7/16.
 */
const router = express.Router();
const DeviceMasterService = promise.promisifyAll(commonUtil.getGpsService('deviceMaster'));
const CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
const poService = promise.promisifyAll(commonUtil.getMaintenanceService('po'));
const SimMasterService = promise.promisifyAll(commonUtil.getGpsService('simMaster'));
const locationService = promise.promisifyAll(commonUtil.getService('location'));
const {check, validationResult, body} = require('express-validator/check');
const validation = require('../../validations/device_master_validations.js');
const DeviceMasterSlip = require('../DeviceMasterSlip/deviceMasterSlip.service');

router.post('/add',
	function (req, res, next) {
		if (!req.body.imei) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide complete data to add device'
			});
		} else {
			return next();
		}
	},
	function (req, res, next) {
		DeviceMasterService.addDeviceMasterAsync(req.body)
			.then(function (deviceMaster) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Device has been added successfully',
					'data': deviceMaster
				});
			}).catch(next);
	}
);

router.get('/get', function (req, res, next) {
	DeviceMasterService.searchDeviceMasterAsync(req.query)
		.then(function (data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Devices found',
				'data': data.deviceMasters,
				'count': data.count,
				'pages': data.pages
			});
		}).catch(next);
});

router.put('/update/:_id',
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({'status': 'ERROR', 'message': 'No update body found'});
		}
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({'status': 'ERROR', 'message': 'No id provided for updating device'});
		}
		return next();
	},
	function (req, res, next) {
		otherUtil.removeStaticNonUpdatableKeys(req.body);
		DeviceMasterService.updateDeviceMasterAsync({_id: req.params._id}, req.body, true)
			.then(function (updated) {
				req.updated = updated;
				return next();
			}).catch(next);
	},
	/* if sim no is being linked to device */
	function (req, res, next) {
		if (req.body.sim_card_ref && req.body.imei) {
			SimMasterService.updateSimMasterAsync({_id: req.body.sim_card_ref},
				{
					device_imei: req.body.imei,
					status: 'In device'
				});
		}
		return res.status(200).json({
			'status': 'OK',
			'message': 'Device has been updated successfully',
			'data': req.updated
		});
	});

router.delete('/delete/:_id', function (req, res, next) {
	if (otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({'status': 'ERROR', 'message': 'No id provided to delete device'});
	}
	DeviceMasterService.deleteDeviceMasterIdAsync(req.params._id)
		.then(function (deleted) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Device has been deleted successfully',
				'data': deleted
			});
		}).catch(next);
});

router.post('/inward',
	/*validate */
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({'status': 'ERROR', 'message': 'Sent request is empty'});
		}
		if (!req.body.purchased_from) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide vendor identifier'
			});
		}
		if (!req.body.po_number || !req.body.po_ref) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide po number and po identifier'
			});
		}
		if (!req.body.purchase_invoice_no) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide invoice number'
			});
		}
		if (!req.body.items) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide atleast one item row'
			});
		}

		/*fetch PO */
		poService.findpoAsync({_id: req.body.po_ref})
			.then(function (pos_found) {
				if (pos_found && (pos_found.length > 0)) {
					req.po_data = JSON.parse(JSON.stringify(pos_found[0]));
					return next();
				} else {
					return res.status(200).json({
						'status': 'ERROR',
						'message': 'This po does not exist.'
					});
				}
			}).catch(next);
	},
	/* update device inventory */
	function (req, res, next) {
		async.forEach(req.body.items, function (item, callback2) {
			async.forEachOf(item.imei_list, function (imei, index, callback1) {
				let deviceBody = {};
				deviceBody.clientId = req.body.clientId;
				deviceBody.purchased_from_vendor = req.body.purchased_from;
				deviceBody.branch = req.body.branch;
				deviceBody.imei = item.imei_list[index];
				deviceBody.created_by = req.body.created_by;
				deviceBody.last_modified_by = req.body.last_modified_by;
				deviceBody.rate = item.rate;
				deviceBody.rate_inc_tax = item.rate_inc_tax;
				deviceBody.part_ref = item.part_ref;
				deviceBody.purchase_invoice_no = req.body.purchase_invoice_no;
				deviceBody.po_number = req.body.po_number;
				deviceBody.po_ref = req.body.po_ref;

				DeviceMasterService.updateDeviceMasterAsync({imei: deviceBody.imei}, deviceBody, false)
					.then(function (updatedDoc) {
						return callback1();
					}).catch(callback1);
			}, function (err) {
				if (err) {
					return callback2(err);
				}
				return callback2();
			});
		}, function (err) {
			if (err) {
				return next(err.toJSON());
			}
			return next();
		});
	}
	/* update PO */
	, function (req, res, next) {
		if (req.body && req.po_data && req.po_data.spare && (req.po_data.spare.length > 0) && req.body.items && (req.body.items.length > 0)) {
			let po_update = {};
			let completeInwarded = true;
			for (let i = 0; i < req.po_data.spare.length; i++) {
				for (let j = 0; j < req.body.items.length; j++) {
					if (req.po_data.spare[i].part_ref === req.body.items[j].part_ref) {
						req.po_data.spare[i].remaining_quantity = (req.po_data.spare[i].remaining_quantity || req.po_data.spare[i].quantity) - req.body.items[j].quantity;
						req.po_data.spare[i].imei_list = req.body.items[j].imei_list;
					}
				}
				if (completeInwarded && req.po_data.spare[i].remaining_quantity !== 0) {
					completeInwarded = false;
				}
			}

			po_update.status = completeInwarded ? constant.poStatus[3] : constant.poStatus[4];
			po_update.spare = req.po_data.spare;
			po_update.rFreight = req.po_data.rFreight ? req.po_data.rFreight : req.po_data.freight;
			po_update.rFreight -= req.body.freight ? req.body.freight : 0;

			poService.findandUpdatePOByIdAsync(req.po_data._id, po_update)
				.then(function (updated) {
					if (updated) {
						return res.status(200).json({
							'status': 'OK',
							'message': 'Device inventory has been added successfully',
							'data': req.body
						});
					} else {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Unable to update device inventory. PO error.'
						});
					}
				}).catch(next);
		} else {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Unable to update device inventory. PO error 2'
			});
		}
	}
);

router.post('/allocate',
	function (req, res, next) {
		if (!(req.body.devices && req.body.devices.length > 0)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide imei data to allocate device'
			});
		} else {
			return next();
		}
	},
	function (req, res, next) {
		let registerData = {
			user_id: req.body.customer.gpsgaadi.user_id,
			clientId: req.clientData.clientId,
			devices: req.body.devices
		};
		locationService.registerDeviceAsync(registerData)
			.then(function (response) {
				if (response.status === 'OK') {
					DeviceMasterService.bulkUpdateDeviceMasterAsync(req.body, 'allocate')
						.then(function (updated) {
							return res.status(200).send(response);
						}).catch(next);
				} else {
					return res.status(500).send(response);
				}
			}).catch(next);
	}
);

router.post('/issue',
	function (req, res, next) {
		if (!(req.body.devices && req.body.devices.length > 0)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide imei data to allocate device'
			});
		} else {
			return next();
		}
	},
	function (req, res, next) {
		DeviceMasterService
			.bulkUpdateDeviceMasterAsync(req.body, 'issue')
			.then(async function (doc) {
				if (doc.ok) {
					let data = {...req.body, slip_type: 'ISSUE'};
					try {
						var result = await DeviceMasterSlip.addSlip(data);
						return res.status(200).json({
							status: 'OK',
							message: 'Device has been issued and a slip is generated',
							data: data
						});
					} catch (e) {
						return next(new Error(e));
					}
				} else {
					return next(new Error('Some error occured'));
				}
			})
			.catch(next);
	}
);

router.post('/returnFromSalesExecutive',
	function (req, res, next) {
		if (!(req.body.devices && req.body.devices.length > 0)) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide imei data to allocate device'
			});
		} else {
			return next();
		}
	},
	function (req, res, next) {
		DeviceMasterService
			.bulkUpdateDeviceMasterAsync(req.body, 'returnFromSalesExecutive')
			.then(async function (doc) {
				if (doc.ok) {
					let data = {...req.body, slip_type: 'RETURN'};
					try {
						var result = await DeviceMasterSlip.addSlip(data);
						return res.status(200).json({
							status: 'OK',
							message: 'Device has been issued and a return slip is generated',
							data: data
						});
					} catch (e) {
						return next(new Error(e));
					}
				} else {
					return next(new Error('Some error occured'));
				}
			})
			.catch(next);

	}
);

router.post('/returnFromCustomer',
	(req, res, next) => {
		req.body.customer = req.body.returned_by_customer;
		next();
	},
	validation.returnFromCustomer,
	function (req, res, next) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': errors.array().map(item => ' ' + item.msg).toString()
			});
		}

		if (!req.clientData.gpsgaadi_user_id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Client does not have gpsgaadi user id'
			});
		}

		if (!req.clientData.gpsgaadi_token) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Client does not have gpsgaadi token'
			});
		}

		req.body.selected_uid = req.clientData.gpsgaadi_user_id;
		req.body.client_token = req.clientData.gpsgaadi_token;

		CustomerService.findCustomerIdAsync(req.body.customer)
			.then(function (customerDoc) {
				if (customerDoc && customerDoc[0]) {
					customerDoc[0].gpsgaadi && customerDoc[0].gpsgaadi.user_id
						? req.body.user_id = customerDoc[0].gpsgaadi.user_id
						: null;

					return customerDoc[0].gpsgaadi && customerDoc[0].gpsgaadi.user_id
						? next()
						: res.status(500).json({
							'status': 'ERROR',
							'message': 'This customer is not registered with gpsgaadi. Customer return not allowed'
						});
				} else {
					return res.status(500).json({
						'status': 'ERROR',
						'message': 'Customer with this _id does not exist'
					});
				}
			})
			.catch(next);
	},
	function (req, res, next) {
		locationService.deRegisterDeviceAsync(req.body)
			.then(function (response) {
				if (response.status === 'OK') {
					DeviceMasterService.bulkUpdateDeviceMasterAsync(req.body, 'returnFromCustomer')
						.then(function (updated) {
							response.message += '. Customer data updated';
							return res.status(200).send(response);
						}).catch(next);
				} else {
					response.message += '. Customer data update failed';
					return res.status(500).send(response);
				}
			}).catch(next);
	}
);

router.post('/deallocate',
	validation.returnFromCustomer,
	function (req, res, next) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': errors.array().map(item => ' ' + item.msg).toString()
			});
		}

		if (!req.clientData.gpsgaadi_user_id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Client does not have gpsgaadi user id'
			});
		}

		if (!req.clientData.gpsgaadi_token) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Client does not have gpsgaadi token'
			});
		}

		req.body.selected_uid = req.clientData.gpsgaadi_user_id;
		req.body.client_token = req.clientData.gpsgaadi_token;

		CustomerService.findCustomerIdAsync(req.body.customer)
			.then(function (customerDoc) {
				if (customerDoc && customerDoc[0]) {
					customerDoc[0].gpsgaadi && customerDoc[0].gpsgaadi.user_id
						? req.body.user_id = customerDoc[0].gpsgaadi.user_id
						: null;

					return customerDoc[0].gpsgaadi && customerDoc[0].gpsgaadi.user_id
						? next()
						: res.status(500).json({
							'status': 'ERROR',
							'message': 'This customer is not registered with gpsgaadi. Customer return not allowed'
						});
				} else {
					return res.status(500).json({
						'status': 'ERROR',
						'message': 'Customer with this _id does not exist'
					});
				}
			})
			.catch(next);
	},
	function (req, res, next) {
		locationService.deRegisterDeviceAsync(req.body)
			.then(function (response) {
				if (response.status === 'OK') {
					DeviceMasterService.bulkUpdateDeviceMasterAsync(req.body, 'deallocate')
						.then(function (updated) {
							response.message += '. Customer data updated';
							return res.status(200).send(response);
						}).catch(next);
				} else {
					response.message += '. Customer data update failed';
					return res.status(500).send(response);
				}
			}).catch(next);
	}
);

router.post('/replaceDevice',
	(req, res, next) => {
		req.body.customer = req.body.returned_by_customer;
		next();
	},
	validation.replaceDevice,
	function (req, res, next) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': errors.array().map(item => ' ' + item.msg).toString()
			});
		}

		if (!req.clientData.gpsgaadi_user_id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Client does not have gpsgaadi user id'
			});
		}

		if (!req.clientData.gpsgaadi_token) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Client does not have gpsgaadi token'
			});
		}

		req.body.selected_uid = req.clientData.gpsgaadi_user_id;
		req.body.client_token = req.clientData.gpsgaadi_token;

		CustomerService.findCustomerIdAsync(req.body.customer)
			.then(function (customerDoc) {
				if (customerDoc && customerDoc[0]) {
					customerDoc[0].gpsgaadi && customerDoc[0].gpsgaadi.user_id
						? req.body.user_id = customerDoc[0].gpsgaadi.user_id
						: null;

					return customerDoc[0].gpsgaadi && customerDoc[0].gpsgaadi.user_id
						? next()
						: res.status(500).json({
							'status': 'ERROR',
							'message': 'This customer is not registered with gpsgaadi. Customer return not allowed'
						});
				} else {
					return res.status(500).json({
						'status': 'ERROR',
						'message': 'Customer with this _id does not exist'
					});
				}
			})
			.catch(next);
	},
	function (req, res, next) {
		locationService.deRegisterDeviceAsync(req.body)
			.then(function (response) {
				if (response.status === 'OK') {
					DeviceMasterService.bulkUpdateDeviceMasterAsync(req.body, 'returnFromCustomer')
						.then(function (updated) {
							return locationService.registerDeviceAsync({
								user_id: req.body.user_id,
								clientId: req.clientData.clientId,
								devices: req.body.new_devices
							});
						})
						.then(function (response) {
							if (response.status === 'OK') {
								DeviceMasterService.bulkUpdateDeviceMasterAsync(req.body, 'allocationInReplace')
									.then(function (updated) {
										return res.status(200).send(response);
									}).catch(next);
							} else {
								return res.status(500).send(response);
							}
						})
						.catch(next);
				} else {
					response.message += '. Customer data update failed';
					return res.status(500).send(response);
				}
			}).catch(next);
	}
);

module.exports = router;
