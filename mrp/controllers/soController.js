const router = express.Router();
const SOService = promise.promisifyAll(commonUtil.getMRPService('so'));
const InvoiceService = promise.promisifyAll(commonUtil.getMRPService('invoice'));

function validateMathForSO(data) {
	return true;
}

router.get("/get", function (req, res, next) {
	SOService.searchSOAsync(req.query)
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "SO found",
				"data": data.SOs,
				"count": data.count,
				"pages": data.pages
			});
		}).catch(next)
});

router.get("/new",function(req,res,next){
	req.query.created_by=req.user._id;
	req.query.last_updated_by=req.user._id;
	SOService.newSOAsync(req.query)
		.then(function(data){
			if(data){
				return res.status(200).json({"status":"OK",
					"message":"New SO created",
					"data":data});
			}else{
				return res.status(200).json({"status":"OK",
					"message":"SO creation failed"});
			}
		}).catch(next)
});

router.put("/update/:_id",
	/*validate data */
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "message": "No update body found"});
		}
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({"status": "ERROR", "message": "No _id provided for updating quotation"});
		}
		if (req.body.customer && req.body.customer.length===0) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide complete customer data"
			});
		}
		if ((req.body.items && req.body.items.length ===0)) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide atleast one item row"
			});
		}
		SOService.findSOAsync({_id: req.params._id},false)
			.then(function (oldSO) {
				if (oldSO && oldSO[0]) {
					req.body.oldSO = oldSO[0];
					if (req.body.status === "Approved") {
						if (oldSO[0].status === "Unapproved") {
							if ((oldSO[0].approver)
								&& (oldSO[0].approver.toString()=== req.user._id.toString())
								&& (req.user.user_type.indexOf("SOApprover") > -1)) {
								req.body.approved_by = req.user._id;
								req.body.approved_by_date = Date.now();
								return next();
							} else {
								return res.status(500).json({
									"status": "ERROR",
									"message": "You do not have access to approve sales order."
								});
							}
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "SO status: " + oldSO[0].status + ". Only Unapproved status of so can be approved"
							});
						}
					} else if (req.body.status === "Discarded") {
						if (oldSO[0].status === "Unapproved" || oldSO[0].status === "Approved") {
							if ((oldSO[0].approver)
								&& (oldSO[0].approver.toString() === req.user._id.toString())
								&& (req.user.user_type.indexOf("SOApprover") > -1)) {
								req.body.discarded_by = req.user._id;
								req.body.discarded_by_date = Date.now();
								return next();
							} else {
								return res.status(500).json({
									"status": "ERROR",
									"message": "You do not have access to discard sales order."
								});
							}
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "SO status: " + oldSO[0].status + ". Only Unapproved/Approved status of so can be discarded."
							});
						}
					} else if (oldSO[0].status === "Approved" || oldSO[0].status === "Discarded") {
						return res.status(500).json({
							"status": "ERROR",
							"message": "SO has already been approved/discarded. No further update possible"
						});
					} else {
						return next();
					}
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This SO does not exist.",
					});
				}
			}).catch(next)
	},
	function (req, res, next) {
		if (!validateMathForSO(req.body)) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please check data calculations"
			})
		}
		SOService.updateSOAsync({_id: req.params._id}, req.body, false)
			.then(function (updated) {
				if (updated) {
					return res.status(200).json({
						"status": "OK",
						"message": "SO has been updated successfully",
						"data": updated
					});
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "SO update failed"
					});
				}
			}).catch(next)
	}
);

router.get('/preview', function(req, res, next) {
	SOService.searchSOAsync(req.query)
		.then(function (data) {
			let templateData = {
				layout: false,
				so: data.SOs[0]
			};
			return res.render('soPreview', templateData);
		})
		.catch(next);
});

router.put("/convert_to_invoice/:_id",
	/*validate data */
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({"status": "ERROR", "message": "No _id provided for converting so"});
		}
		SOService.findSOAsync({_id: req.params._id},false)
			.then(function (existingSO) {
				if (existingSO && existingSO[0]) {
					req.existingSO = existingSO[0];
					if (existingSO[0].status === "Approved") {
						return next();
					} else {
						return res.status(500).json({
							"status": "ERROR",
							"message": "SO current status: " + existingSO[0].status + ". Only approved status of SO can be converted to invoice."
						});
					}
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This SO does not exist.",
					});
				}
			}).catch(next)
	},
	function (req, res, next) {
		let newInvoiceFromSO = JSON.parse(JSON.stringify(req.existingSO));
		newInvoiceFromSO.created_by=req.user._id;
		newInvoiceFromSO.last_modified_by=req.user._id;
		newInvoiceFromSO.sos = [newInvoiceFromSO._id];
		delete newInvoiceFromSO.created_at;
		delete newInvoiceFromSO.last_modified_at;

		for (let i = 0; i < newInvoiceFromSO.items.length; i++) {
			newInvoiceFromSO.items[i].so_number = newInvoiceFromSO.so_number;
			newInvoiceFromSO.items[i].so_ref = newInvoiceFromSO._id;
			delete newInvoiceFromSO.items[i]._id;
		}

		delete newInvoiceFromSO._id;
		InvoiceService.addInvoiceAsync(newInvoiceFromSO)
			.then(function (newlyAddedInvoice) {
				if (newlyAddedInvoice) {
					req.newInvoice = newlyAddedInvoice;
					return next();
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "SO conversion to invoice failed"
					});
				}
			})
			.catch(next)
	},
	function (req, res, next) {
		req.existingSO.last_modified_by = req.user._id;
		for (let y = 0; y < req.existingSO.items.length; y++) {
			req.existingSO.items[y].invoice_no = [req.newInvoice.invoice_no];
			req.existingSO.items[y].invoice_ref = [req.newInvoice._id];
			req.existingSO.items[y].remaining_quantity = 0;
		}
		req.existingSO.status = "Fully Invoiced";
		req.existingSO.total_remaining_quantity = 0;
		SOService.updateSOAsync({_id: req.params._id}, req.existingSO, false)
			.then(function (updated) {
				if (updated) {
					return res.status(200).json({
						"status": "OK",
						"message": "SO successfully converted to invoice",
						"data": updated
					});
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "SO conversion to invoice failed"
					});
				}
			}).catch(next)
	},
);


module.exports = router;
