const router = express.Router();
const invoiceService = promise.promisifyAll(commonUtil.getMRPService('invoice'));

function validateMathForInvoice(data) {
	return true;
}

router.post("/add", function (req, res, next) {
	/*validate data */
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({"status": "ERROR", "message": "No update body found"});
	}
	if (req.body.customer && req.body.customer.length === 0) {
		return res.status(500).json({
			"status": "ERROR",
			"message": "Please provide complete customer data"
		});
	}
	if ((req.body.items && req.body.items.length === 0)) {
		return res.status(500).json({
			"status": "ERROR",
			"message": "Please provide atleast one item row"
		});
	}
	invoiceService.addInvoiceAsync(req.body)
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Invoice added successfully",
				"data": data
			});
		}).catch(next)
});

router.get("/get", function (req, res, next) {
	invoiceService.searchInvoiceAsync(req.query)
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Invoice found",
				"data": data.Invoices,
				"count": data.count,
				"pages": data.pages
			});
		}).catch(next)
});

router.get('/preview', function (req, res, next) {
	invoiceService.previewAsync(req.query)
		.then(function (data) {
			let templateData = {
				layout: false,
				invoice: data.Invoices[0],
				clientData: req.clientData
			};
			return res.render('salesOrderInvoicePreview', templateData);
		})
		.catch(next);
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
		if (req.body.customer && req.body.customer.length === 0) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide complete customer data"
			});
		}
		if ((req.body.items && req.body.items.length === 0)) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide atleast one item row"
			});
		}
		invoiceService.findInvoiceAsync({_id: req.params._id}, false)
			.then(function (oldInvoice) {
				if (oldInvoice && oldInvoice[0]) {
					req.body.oldInvoice = oldInvoice[0];
					if (req.body.status === "Approved") {
						if (oldInvoice[0].status === "Unapproved") {
							if ((oldInvoice[0].approver)
								&& (oldInvoice[0].approver.toString() === req.user._id.toString())
								&& (req.user.user_type.indexOf("InvoiceApprover") > -1)) {
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
								"message": "Invoice status: " + oldInvoice[0].status + ". Only Unapproved status of invoice can be approved"
							});
						}
					} else if (req.body.status === "Discarded") {
						if (oldInvoice[0].status === "Unapproved" || oldInvoice[0].status === "Approved") {
							if ((oldInvoice[0].approver)
								&& (oldInvoice[0].approver.toString() === req.user._id.toString())
								&& (req.user.user_type.indexOf("InvoiceApprover") > -1)) {
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
								"message": "Invoice status: " + oldInvoice[0].status + ". Only Unapproved/Approved status of invoice can be discarded."
							});
						}
					} else if (req.body.status === "Dispatched") {
						if (oldInvoice[0].status === "Approved") {
							req.body.dispatched_by = req.user._id;
							req.body.dispatched_by_date = Date.now();
							return next();
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "Invoice status: " + oldInvoice[0].status + ". Only Approved status of invoice can be dispatched."
							});
						}
					} else if (req.body.status === "Part Payment Received" || req.body.status === "Full Payment Received") {
						if (oldInvoice[0].status === "Dispatched") {
							return next();
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "Invoice status: " + oldInvoice[0].status + ". Only Dispatched status of invoice can be marked with payment status."
							});
						}
					}
					else if (oldInvoice[0].status === "Full Payment Received" || oldInvoice[0].status === "Cancelled") {
						return res.status(500).json({
							"status": "ERROR",
							"message": "Invoice has already been approved/discarded. No further update possible"
						});
					} else {
						return next();
					}
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This Invoice does not exist.",
					});
				}
			}).catch(next)
	},
	function (req, res, next) {
		if (!validateMathForInvoice(req.body)) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please check data calculations"
			})
		}
		invoiceService.updateInvoiceAsync({_id: req.params._id}, req.body, false)
			.then(function (updated) {
				if (updated) {
					return res.status(200).json({
						"status": "OK",
						"message": "Invoice has been updated successfully",
						"data": updated
					});
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Invoice update failed"
					});
				}
			}).catch(next)
	}
);

module.exports = router;
