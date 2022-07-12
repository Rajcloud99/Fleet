/**
 * Created by manish on 5/7/16.
 */
const router = express.Router();
const QuotationService = promise.promisifyAll(commonUtil.getMRPService('quotation'));
const SOService = promise.promisifyAll(commonUtil.getMRPService('so'));
const async = require('async');

function validateMathForQuotation(data) {
	return true;
}

router.post("/add",
	/*validate data */
	function (req, res, next) {
		if (!req.body.customer) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide customer info"
			});
		}
		if (!req.body.items || (req.body.items && req.body.items.length===0)) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide atleast one item row."
			});
		}

		return next();
	},
	/* finally add */
	function (req, res, next) {
		QuotationService.addQuotationAsync(req.body)
			.then(function (addedQuoteDoc) {
				if (addedQuoteDoc && addedQuoteDoc._doc) {
					return res.status(200).json({
						"status": "OK",
						"message": "Quotation has been added successfully",
						"data": addedQuoteDoc
					});
				} else {
					return res.status(500).json({
						"status": "OK",
						"message": "Quotation add failed",
						"data": addedQuoteDoc
					});
				}
			}).catch(next)
	}
);

router.get("/get", function (req, res, next) {
	QuotationService.searchQuotationAsync(req.query)
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Quotations found",
				"data": data.Quotations,
				"count": data.count,
				"pages": data.pages
			});
		}).catch(next)
});

router.get('/preview', function(req, res, next) {
	QuotationService.searchQuotationAsync(req.query)
		.then(function (data) {
			let templateData = {
				layout: false,
				quote: data.Quotations[0]
			};
			return res.render('quotationPreview', templateData);
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
		if (req.body.customer && req.body.customer.length===0) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide complete customer data"
			});
		}
		if (req.body.items && req.body.items.length===0) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide atleast one item row."
			});
		}
		if (!validateMathForQuotation(req.body)) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please check data calculations"
			})
		}
		QuotationService.findQuotationAsync({_id: req.params._id}, false)
			.then(function (quotation) {
				if (quotation && quotation[0]) {
					req.body.oldQuotation = quotation[0];
					if (req.body.quot_status === "Approved for sale") {
						if (quotation[0].quot_status === "Unapproved") {
							if ((quotation[0].quot_approver)
								&& (quotation[0].quot_approver.toString() === req.user._id.toString())
								&& (req.user.user_type.indexOf("QuotApprover") > -1)) {
								req.body.quot_approved_by = req.user._id;
								req.body.quot_approval_date = Date.now();
								return next();
							} else {
								return res.status(500).json({
									"status": "ERROR",
									"message": "You do not have access to approve quotation."
								});
							}
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "Quotation current status: " + quotation[0].quot_status + ". Only Unapproved status of Quotation can be approved."
							});
						}
					} else if (req.body.quot_status === "Cancelled") {
						if (quotation[0].quot_status === "Approved for sale") {
							if ((quotation[0].quot_approver)
								&& (quotation[0].quot_approver.toString() === req.user._id.toString())
								&& (req.user.user_type.indexOf("QuotApprover") > -1)) {
								req.body.quot_cancelled_by = req.user._id;
								req.body.quot_cancelled_date = Date.now();
								return next();
							} else {
								return res.status(500).json({
									"status": "ERROR",
									"message": "You do not have access to cancel approved quotation"
								});
							}
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "Quotation current status: " + quotation[0].quot_status + ". Only Approved status of Quotation can be cancelled."
							});
						}
					} else if (quotation[0].quot_status === "Approved for sale"
						|| quotation[0].quot_status === "Cancelled") {
						return res.status(500).json({
							"status": "ERROR",
							"message": "Quotation has already been approved/cancelled. No further update is possible."
						});
					} else {
						return next();
					}
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This quotation does not exist.",
					});
				}
			}).catch(next)
	},
	function (req, res, next) {
		QuotationService.updateQuotationAsync({_id: req.params._id}, req.body, false)
			.then(function (updated) {
				if (updated && updated._doc) {
					return res.status(200).json({
						"status": "OK",
						"message": "Quotation has been updated successfully",
						"data": updated
					});
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Quotation update failed"
					});
				}
			}).catch(next)
	}
);

router.put("/convert_to_so/:_id",
	/*validate data */
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({"status": "ERROR", "message": "No _id provided for converting quotation"});
		}
		QuotationService.findQuotationAsync({_id: req.params._id},false)
			.then(function (quotation) {
				if (quotation && quotation[0]) {
					req.quotation = quotation[0];
					if (quotation[0].quot_status === "Approved for sale") {
						return next();
					} else {
						return res.status(500).json({
							"status": "ERROR",
							"message": "Quotation current status: " + quotation[0].quot_status + ". Only approved status of Quotation can be converted to SO."
						});
					}
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This quotation does not exist.",
					});
				}
			}).catch(next)
	},
	function (req, res, next) {
		let newSOFromQuotation = JSON.parse(JSON.stringify(req.quotation));
		newSOFromQuotation.created_by=req.user._id;
		newSOFromQuotation.last_modified_by=req.user._id;
		newSOFromQuotation.billing_address = newSOFromQuotation.address;
		newSOFromQuotation.shipping_address = newSOFromQuotation.address;
		newSOFromQuotation.total_remaining_quantity = newSOFromQuotation.total_quantity;
		newSOFromQuotation.quotations = [newSOFromQuotation._id];
		for (let i = 0; i < newSOFromQuotation.items.length; i++) {
			newSOFromQuotation.items[i].quot_number = newSOFromQuotation.quot_number;
			newSOFromQuotation.items[i].quot_ref = newSOFromQuotation.quot_ref;
			newSOFromQuotation.items[i].remaining_quantity = newSOFromQuotation.items[i].quantity;
			delete newSOFromQuotation.items[i]._id;
		}
		delete newSOFromQuotation.created_at;
		delete newSOFromQuotation.last_modified_at;
		delete newSOFromQuotation._id;
		delete newSOFromQuotation.address;
		SOService.addSOAsync(newSOFromQuotation)
			.then(function (newlyAddedSO) {
				if (newlyAddedSO) {
					req.newSO = newlyAddedSO;
					return next();
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Quotation conversion to SO failed"
					});
				}
			})
			.catch(next)
	},
	function (req, res, next) {
		req.quotation.last_modified_by = req.user._id;
		for (let y = 0; y < req.quotation.items.length; y++) {
			req.quotation.items[y].so_number = req.newSO.so_number;
			req.quotation.items[y].remaining_quantity = 0;
		}
		req.quotation.quot_status = "Fully converted to SO";
		req.quotation.total_remaining_quantity = 0;
		req.quotation.quot_converted_to_so_by = req.user._id;
		req.quotation.quot_converted_to_so_date = Date.now();
		QuotationService.updateQuotationAsync({_id: req.params._id}, req.quotation, false)
			.then(function (updated) {
				if (updated && updated._doc) {
					return res.status(200).json({
						"status": "OK",
						"message": "Quotation successfully converted to SO",
						"data": updated
					});
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Quotation conversion to SO failed"
					});
				}
			}).catch(next)
	},
);

module.exports = router;
