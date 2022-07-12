const express = require( 'express' );
const router = express.Router();
let vendorQouteService = commonUtil.getService('vendorquotes');
let ReportExelService = promise.promisifyAll(commonUtil.getService('reportExel'));
var Promise = require('bluebird');
let bookingService = Promise.promisifyAll(commonUtil.getService('booking'));
let booking = Promise.promisifyAll(commonUtil.getModel('bookings'));

router.post( '/addQuote', async function ( req, res, next ) {
	try{
		if(!req.body.booking){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'booking id is mandatory'
			});
		}
		if(!req.body.vendor){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'vendor id is mandatory'
			});
		}
		/*
		//TODO check client config for mandatory routes
		if(!req.body.route){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'route id is mandatory'
			});
		}*/
		if(!req.body.vt){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'vehicle type is mandatory'
			});
		}
		let oQery = {
			booking:req.body.booking,
			vendor:req.body.vendor,
			clientId:req.body.clientId
		};
		/*
		let aQot = await vendorQouteService.getVQuote(req.body);
		if(aQot && aQot[0]){
			return res.status(200).json({
				'status': 'ERROR',
				'message': '1 quote already submitted from same vendor on this booking'
			});
		}
		*/
		req.body.created_By = req.user.full_name;
		req.body.createdAt = new Date();
		let oQ = await vendorQouteService.addVQuote(req.body);
		return res.status(200).json({
			'status': 'OK',
			'message': 'New Quote added',
			'data': oQ
		});
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}

} );

router.post( '/getQuote', async function ( req, res, next ) {
	try{
		if(!req.body.booking){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'booking id is mandatory'
			});
		}

		let oQ = await vendorQouteService.getVQuote(req.body);
		if(req.body.download){
			ReportExelService.quotetionReport(oQ, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		}else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'V Quotes found',
				'data': oQ
			});
		}
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}

} );

router.put('/updateQuote/:_id', async function (req, res, next) {
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body for booking update'});
	}
	try{
		let oQ = await vendorQouteService.updateVQuote({_id:req.params._id},{set:req.body});
		return res.status(200).json({
			'status': 'OK',
			'message': ' Quote updated',
			'data': oQ
		});
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}

});

router.put('/removeQuote/:_id', async function (req, res, next) {
	try{
		let oQ = await vendorQouteService.removeVQuote({_id:req.params._id});
		return res.status(200).json({
			'status': 'OK',
			'message': ' Quote Removed',
			'data': oQ
		});
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}
});

router.put('/finaliseQuote/:_id', async function (req, res, next) {
	try{
		let oQery = {
			booking:req.body.booking,
			clientId:req.body.clientId,
			'finalised.status':true
		};
		let aQot = await vendorQouteService.getVQuote(oQery);
		if(aQot && aQot[0]){
			return res.status(200).json({
				'status': 'ERROR',
				'message': '1 quote already finalised.'
			});
		}
		let thisQ =  await vendorQouteService.getVQuote({_id:req.params._id});
		if(!thisQ || !thisQ[0]){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'quotes id is incorrect'
			});
		}
		if(!thisQ[0].booking){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'incorrect booking on quote'
			});
		}
		let obj = {
		status: "placed",
		closedReason: undefined
		};
		obj.history = thisQ[0] && thisQ[0].history ||[];
		obj.finalised = {
			status:true,
			date : new Date(),
			by:req.body.last_modified_by_name
		}
		obj.history.push({
			finalised:true,
			date:new Date(),
			by:req.body.last_modified_by_name
		})
		let oQ = await vendorQouteService.updateVQuote({_id:req.params._id},{set:obj});
		let obkUp = {quote:req.params._id};
		bookingService.updateBookingAsync(thisQ[0].booking, obkUp)
			.then(function (updated) {
				return res.status(200).json({
					'status': 'OK',
					'message': ' Quote Finalised',
					'data': oQ
				});
			}).catch(next);
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}
});

router.put('/revertQuote/:_id', async function (req, res, next) {
	try{
		let thisQ =  await vendorQouteService.getVQuote({_id:req.params._id});
		if(!thisQ || !thisQ[0]){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'quotes id is incorrect'
			});
		}
		if(!(thisQ && thisQ[0] && thisQ[0].finalised && thisQ[0].finalised.status)){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'This quote is not finalised.'
			});
		}
		if(!thisQ[0].booking){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'incorrect booking on quote'
			});
		}
		let obj = {
			status: "open",
		};
		obj.history = thisQ[0] && thisQ[0].history ||[];
		obj.finalised = {
				status:false,
				date : new Date(),
				by:req.body.last_modified_by_name
			}
		obj.history.push({
			finalised:false,
			date:new Date(),
			by:req.body.last_modified_by_name
		})
		let oBook = await booking.findOneAndUpdate({_id:thisQ[0].booking},{$unset:{quote:1}})
		let updated = await vendorQouteService.updateVQuote({_id:req.params._id},{set:obj});
		await vendorQouteService.getVQuote({_id:req.params._id})
			.then(function (updated) {
				return res.status(200).json({
					'status': 'OK',
					'message': ' Quote Revert successfully',
					'data': updated[0]
				});
			}).catch(next);
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}
});

router.post('/quoteRemark/:_id', async function (req, res, next) {
	try{
		let thisQ =  await vendorQouteService.getVQuote({_id:req.params._id});
		if(!thisQ || !thisQ[0]){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'quotes id is incorrect'
			});
		}

		if(!thisQ[0].booking){
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'incorrect booking on quote'
			});
		}

		let obj = {
			closedReason: req.body.closedReason,
			status:  req.body.status,
		};
		obj.history = thisQ[0] && thisQ[0].history ||[];

		obj.history.push({
			finalised: thisQ[0].finalised.status,
			date: new Date(),
			by: req.user.full_name
		})

		let updated = await vendorQouteService.updateVQuote({_id:req.params._id},{set:obj});

		await vendorQouteService.getVQuote({_id:req.params._id})
			.then(function (updated) {
				return res.status(200).json({
					'status': 'OK',
					'message': ' Quote Update successfully',
					'data': updated[0]
				});
			}).catch(next);
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}
});

module.exports = router;
