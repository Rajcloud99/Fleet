/**
 Author: Nipun,
 Date: 4/1/18
 **/

let express = require('express');
let router = express.Router();

let TripExpense = promise.promisifyAll(commonUtil.getModel("trip_expenses"));

router.get('/get',
	function (req,res,next) {
		TripExpense.findAsync(req.query)
			.then(function (data) {

			})
	}
)

module.exports = router;
