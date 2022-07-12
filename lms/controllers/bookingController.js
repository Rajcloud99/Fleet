var router = require('express').Router();
var Promise = require('bluebird');
var bookingService = Promise.promisifyAll(commonUtil.getService('booking'));
const tripService = commonUtil.getService('TripV2');
var Booking = commonUtil.getModel('bookings');
let GR = commonUtil.getModel('tripGr');
var ReportExelService = promise.promisifyAll(commonUtil.getService('reportExel'));

let multipartMiddleware = require('connect-multiparty')();
let FileService = commonUtil.getUtil('file_upload_util');
let allowedFiles = ['Rate Approval Doc'];

/***********add new booking *******/
router.post('/add', function (req, res, next) {
  req.body.clientId = req.user.clientId;
  bookingService.addBookingAsync(req.body)
  .then(function (booking) {
  //   var sSMS = 'Hi '+ (req.body.contact_person && req.body.contact_person.name) + ' New '+booking.booking_type+ '   booking received with bNo : '+ booking.booking_no;
  //   if(req.body.contact_person && req.body.contact_person.mobile){
  //     if(booking.customer && booking.customer.name){
  //      // sSMS = sSMS + " from customer "+ booking.customer.name;
  //     }
  //     sSMS = sSMS + " " + booking.remark;
  //     smsUtil.sendSMS(req.body.contact_person.mobile, encodeURIComponent(sSMS),(err, body) => {
	// 						telegram.sendMessage('SMS for booking is send ',sSMS);
	// 					});
  //
  //   }
  //   if(req.body.contact_person && req.body.contact_person.email){
  //     var sGreetings = "New Booking  "+ booking.booking_no + " received  at ";
	// var sBody = sSMS;
  // var sEmailMessage = "<b> Greetings of the day! </b> <br>" + sSMS;
	// var mailOptions = {
  //       from: 'MMP Demo <kamal.mewada@umbrellaprotectionsystems.com',
	// 	    to: 'Kamal MMP Demo ✔ <'+ req.body.contact_person.email+ '>', // list of receivers
	// 	    subject: sGreetings + ' .✔', // Subject line
	// 	    text: sGreetings+'✔', // plaintext body
	// 	    html: '<br>'  +sEmailMessage+ '<br>'// html body
	// 	};
	// emailUtil.sendMail(mailOptions);
  //   }
    return res.status(200).json({
      'status': 'OK',
      'message': 'booking successfully Created',
      'data': booking
    });
    //  return next();
  }).catch(err => {
    res.status(500).json({
      'status': 'ERROR',
      'message': err.message
    });
  });
});

router.post('/createGR', function (req, res, next) {
  req.body.booking.clientId = req.body.clientId;
  bookingService.addBookingAsync(req.body.booking)
  .then(function (booking) {
    req.body.trips = req.body.trips.map(trip => {
      trip.gr[0].booking = booking._id;
      return trip;
    });
    return next();
  })
  .catch(err => {
    return res.status(500).json({
      'status': 'ERROR',
      'message': err.message
    });
  });
}, tripService.add);

router.post('/addGr', tripService.addGR);

/***********get all Bills + search *******/
router.post('/get', function (req, res, next) {
  // req.body = otherUtil.bindBranchFilter(req.body, 'branch_id', req.user.branch);
  req.body.no_of_docs = 100;
  bookingService.getAllBookingsAsync(req.body)
  .then(function (data) {
    return res.status(200).json({
      'status': 'OK',
      'message': 'bookings found',
      'data': data.data,
      'count': data.count,
      'pages': data.no_of_pages
    });
  }).catch(next);
});

/***********get all bookings items + search *******/
router.get('/items', function (req, res, next) {
  bookingService.getAllBookingsAsync(req)
  .then(function (data) {
    var aItems = getItemsFromBookings(data.data, req.query.allocated);
    return res.status(200).json({
      'status': 'OK',
      'message': 'bookings items found',
      'data': aItems,
      'count': aItems.length,
      'pages': data.no_of_pages
    });
  }).catch(next);
});

/***********get all bookings + trim  + search *******/
router.get('/get/trim', function (req, res, next) {
  bookingService.searchbookingAsync(req.query, true)
  .then(function (data) {
    return res.status(200).json({
      'status': 'OK',
      'message': 'bookings found',
      'data': data.bookings
    });
  }).catch(next);
});

/***********update booking*******/
router.put('/update/:_id',
  function (req, res, next) {
    if (otherUtil.isEmptyObject(req.body)) {
      return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body for booking update'});
    }
    bookingService.findBookingIdAsync({_id: req.params._id})
    .then(function (booking) {
      if (booking && booking[0]) {
        req.bookingData = JSON.parse(JSON.stringify(booking[0]));
        return next();
      } else {
        return res.status(500).json({'status': 'ERROR', 'error_message': 'booking does not exist'});
      }
    });
  },
  multipartMiddleware,
  async function (req, res, next) {
    if (req.files) {
      await FileService.uploadFiles(req, 'Booking', req.bookingData, allowedFiles);
    }
    req.body.documents = req.bookingData.documents;
    delete req.files;
    bookingService.updateBookingAsync(req.params._id, req.body)
    .then(function (updated) {
      return res.status(200).json({
        'status': 'OK',
        'message': 'booking data has been updated successfully',
        'data': updated
      });
    }).catch(next);
  }
);

/***********update booking*******/
router.put('/approveUpdate/:_id',
  function (req, res, next) {
    if (otherUtil.isEmptyObject(req.body)) {
      return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body for booking update'});
    }
    if (req.user.role != config.approve_Admin_for_Booking) {
      return res.status(500).json({
        'status': 'ERROR',
        'error_message': 'You don,t have permission to update this booking'
      });
    }
    bookingService.findBookingIdAsync({_id: req.params._id})
    .then(function (booking) {
      if (booking && booking[0]) {
        return next();
      } else {
        return res.status(500).json({'status': 'ERROR', 'error_message': 'booking does not exist'});
      }
    });
  },
  function (req, res, next) {
    bookingService.updateBookingAsync(req.params._id, req.body)
    .then(function (updated) {
      return res.status(200).json({
        'status': 'OK',
        'message': 'booking data has been updated successfully',
        'data': updated
      });
    }).catch(next);
  }
);
/***********get all bookings report *******/
router.get('/get/getReport', function (req, res, next) {
  bookingService.getAllBookingsAsync(req)
  .then(function (data) {
    return ReportExelService.generateBookingsExcel(data.data, req.query.clientId, function (data) {
      return res.status(200).json({
        'status': 'OK',
        'message': 'bookings report available for download',
        'url': data.url
      });
    });
  })
  .catch(next);
});

router.post('/delete/:id', async (req, res, next) => {
	try {

		if(!req.params.id)
			throw new Error('Mandatory feilds required');


		let oBooking = await Booking.findOne({_id: req.params.id, clientId: req.user.clientId});

		if(!oBooking)
			throw new Error('Booking Not Found');

		let oGR = await GR.findOne({booking: req.params.id, clientId: req.user.clientId});

		if(oGR)
			throw new Error('Booking Cannot be deleted. Gr Generated on this booking');



		let resData = await Booking.remove({_id: req.params.id});

		return res.status(200).json({
			status: 'OK',
			message: 'Booking Data Deleted!',
			data: resData
		})
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.put('/assign/:_id',
	function (req, res, next) {
		if (!req.body.tr_mgr) {
			return res.status(500).json({'status': 'ERROR', 'error_message': 'no users are sent to assign'});
		}
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body for booking update'});
		}
		bookingService.findBookingIdAsync({_id: req.params._id})
			.then(function (booking) {
				if (booking && booking[0]) {
					req.bookingData = JSON.parse(JSON.stringify(booking[0]));
					return next();
				} else {
					return res.status(500).json({'status': 'ERROR', 'error_message': 'booking does not exist'});
				}
			});
	},
	async function (req, res, next) {
		bookingService.updateBookingAsync(req.params._id, req.body)
			.then(function (updated) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'booking assigned successfully',
					'data': updated
				});
			}).catch(next);
	}
);
module.exports = router;
