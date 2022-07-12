var Promise = require('bluebird');
var AsyncLibrary = require('async');
var moment = require('moment');
var NO_OF_DOCS = 15;
var Booking = Promise.promisifyAll(commonUtil.getModel('bookings'));
var TripGr = Promise.promisifyAll(commonUtil.getModel('tripGr'));
var TransportRoute = Promise.promisifyAll(commonUtil.getModel('transportRoute'));
var Customer = Promise.promisifyAll(commonUtil.getModel('customer'));
var Branch = Promise.promisifyAll(commonUtil.getModel('branch'));
var VendorTransport = Promise.promisifyAll(commonUtil.getModel('vendorTransport'));
var MaterialType = Promise.promisifyAll(commonUtil.getModel('materialType'));
var allowedFilter = ['_id','user','container.number', 'clientId', 'boe_no', 'trip_no', 'status', 'booking_type', 'booking_no', 'bookingId', 'booking_date', 'customer_id', 'transporter', 'start_date', 'end_date', 'status', 'branch_id', 'allocated','route_source','consigner','consignee','uld.c','ld.c','route'];
var allowedParams = ['sortby'];
let _ = require('lodash')
let Pagination = promise.promisify(otherUtil.findPagination);
let telegram = require(projectHome + "/utils/telegramBotUtil");

function createBookingId(bookingCount) { //TODO @kamal put exclusive logic based on booking types
    var bookingID = "B" + otherUtil.getDDMMYY() + (++bookingCount);
    return { 'bookingID': bookingID, booking_no: bookingCount };
}

var constructFilters = function (query) {
    var fFilter = {};
    for (i in query) {
        if (otherUtil.isAllowedFilter(i, allowedFilter)) {
			if (i === 'start_date') {
				let startDate = new Date (query[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				fFilter["booking_date"] = fFilter["booking_date"] || {};
				fFilter["booking_date"].$gte = startDate;
			} else if (i === 'end_date') {
				let endDate = new Date (query[i]);
				endDate.setSeconds (59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter['booking_date'] = fFilter['booking_date'] || {};
				fFilter['booking_date'].$lte = endDate;
			} else if (i === 'customer_id') {
				fFilter['customer'] = query[i];
			} else if (i === 'boe_no') {
				fFilter['boe.number'] = query[i];
			} else if (i === 'materialType') {
				fFilter['materialType.material_type'] = query[i];
			} else if (i === 'trip_no') {
				fFilter['info.trip_no'] = query[i];
			} else if (i === 'allocated') {
				fFilter['info.vehicle_alloted'] = (query[i] === 'true');
			} else if (i === 'status') {
				fFilter['booking_status.status'] = query[i];
			} else if (i === 'container.number') {
				fFilter['container.number'] = { $regex: query[i], $options: '-i' };
			} else if (i === 'branch_id') {
				if (query[i] && query[i].length > 0) {
					fFilter['branch_id'] = { $in: query[i] };
				}
			}else if (i === 'user') {
				fFilter['tr_mgr.user'] = query[i];
			} else {
				fFilter[i] = query[i];
			}
				}
		}
    return fFilter;
};

module.exports.findBookingId = function (id, next) {
    Booking.findAsync({ "_id": id })
        .then(function (driver) {
            return next(null, driver);
        })
        .catch(function (err) {
            return next(err);
        });
};
module.exports.findBookingData = function (id, next) {
    Booking.findAsync(id)
        .then(function (data) {
            return next(null, data);
        })
        .catch(function (err) {
            return next(err);
        });
};

module.exports.getAllBookings = function (req, next) {
    var ffFilters = constructFilters(req);
	delete ffFilters.start_date;
	delete ffFilters.end_date;
	req.queryFilter = ffFilters;
	Pagination(Booking, req).then(posts=>{
		var tempPosts = posts.data
		TripGr.aggregate([{
			$match: {tripCancelled:false}
		},
			{
		$group: {
			_id: "$booking",
			servedWeight: { $sum: "$weight" },
			servedUnit: { $sum: "$unit" },
			servedTrip: { $sum: 1 },
			servedContainer: { $push: "$container"}
		}
	}]).then(tripgrdata => {
		//var tripgrdata = JSON.parse(JSON.stringify(tripgrdata));
	async.forEachSeries(tempPosts, (element, callback) => {
		let bookingData = _.find(tripgrdata, { '_id': element._id });
	if (bookingData) {
		element._doc.served = bookingData
		callback()
	}
	else {
		callback()
	}
}, (err) => {
		return next(null, posts);
	})
})
}).catch(function (err) {
		logger.error("Error in getLastNPosting : " + err);
		return next(err);
	});
};

// async function validateBookingParams(oBooking) {
//     // let cb = false;
//     // let route = await TransportRoute.findOne({ _id: route });
//     // if (!route) { return false } else { cb = true };
//     // let branch = await Branch.findOne({ _id: branch_id });
//     // if (!branch) { return false } else { cb = true };
//     // let customer = await Customer.findOne({ _id: customer_id });
//     // if (!customer) { return false } else { cb = true };
//     // let consigner = await Customer.findOne({ _id: consigner });
//     // if (!consigner) { return false } else { cb = true };
//     // return cb;
//     return true;
// }


/*async function validationCheck(data, cb) {
   // callback(null, "success")
    let route = data.route
    let branch_id = data.branch_id
    let customer_id = data.customer
    let material_type = data.material_type
    let consigner_id = data.consigner
    let consignee_id = data.consignee
    let billing_id = data.billing_party

    AsyncLibrary.parallel([
        function (callback) {
            TransportRoute.findOne({ _id: route }).then(routeData => {
                var routeData = JSON.parse(JSON.stringify(routeData));
                if (routeData) {
                    callback(null, "success")
                }
                else {
                    callback(new Error("invalid route Id"))
                }
            })
        },
        function (callback) {
            Branch.findOne({ _id: branch_id }).then(branch => {
                var branch = JSON.parse(JSON.stringify(branch));
                if (branch) {
                    callback(null, "success")
                }
                else {
                    callback(new Error("invalid branch Id"))
                }
            })
        },
        function (callback) {
            Customer.findOne({ _id: customer }).then(customer => {
                var customer = JSON.parse(JSON.stringify(customer));
                if (customer) {
                    callback(null, "success")
                }
                else {
                    callback(new Error("invalid customer Id"))
                }

            })
        },
        function (callback) {
            MaterialType.findOne({ _id: material_type }).then(material => {
                var material = JSON.parse(JSON.stringify(material));
                if (material) {
                    callback(null, "success")
                }
                else {
                    callback(new Error("invalid material type Id"))
                }

            })
        },
        function (callback) {
            Customer.findOne({ _id: consigner }).then(consigner => {
                var consigner = JSON.parse(JSON.stringify(consigner));
                if (consigner) {
                    callback(null, "success")
                }
                else {
                    callback(new Error("invalid consigner Id"))
                }
            })
        },
        function (callback) {
            Customer.findOne({ _id: consignee }).then(consignee => {
                var consignee = JSON.parse(JSON.stringify(consignee));
                if (consignee) {
                    callback(null, "success")
                }
                else {
                    callback(new Error("invalid consignee Id"))
                }
            })
        }
    ], function (err, results) {
        if (err) {
            console.log(err)
            return cb(err)
        }
        else if (results) {
            return cb(null, "success")
        }
    });
}*/

module.exports.addBooking = function (data, next) {
    if (data.preference) {
        data.preference = otherUtil.arrString2ObjectId(data.preference);
    }
	Booking.countAsync({ clientId: data.clientId })
		.then(function (bookingCount) {
			var oNewPID = createBookingId(bookingCount);
			data.booking_no = oNewPID.booking_no;
			data.created_at = Date.now();
			data.type = data && data.imd && data.imd[0] ? "Intermittent":"Direct";
			var newBooking = new Booking(data);
			return newBooking.saveAsync();
		})
		.then(async function (booking) {
			winston.info("New booking saved: ");
			counterUtil.incrementBookingCount();
			var vendors = await VendorTransport.find({
				'clientId': data.clientId,
				'routes.route': {$in: otherUtil.arrString2ObjectId(data.route)},
				'routes.vehicleTypes.vehicleType': {$in: data.preference},
			});
			if(vendors && vendors[0]) {
				booking.populate('route').populate('preference', function (err, populatedBooking) {
					var bookingRoutes = populatedBooking.route.map(r => r.name).join(', ');
					var bookingPreferredVehicle = populatedBooking.preference.map(p => p.name).join(', ');
					var contactPersonName = populatedBooking.contact_person && populatedBooking.contact_person.name || 'NA';
					var contactPersonMobile = populatedBooking.contact_person && populatedBooking.contact_person.mobile || 'NA';
					var pickUp = populatedBooking.serve_start ? moment(populatedBooking.serve_start).format('MMM Do YY') : moment(populatedBooking.booking_date).format('MMM Do YY');
					var numbers = vendors.map(vendor => `91${vendor.prim_contact_no}`).join(',');
					smsUtil.sendSMS(numbers, encodeURIComponent(`Load available for ${bookingPreferredVehicle} from ${bookingRoutes} of total weight: ${data.total_weight} tonne.
					Pickup: ${pickUp}
					Contact ${contactPersonName} at ${contactPersonMobile}`),
						(err, body) => {
							telegram.sendMessage('SMS for booking is send to Numbers',numbers);
							if (booking[0]) {
								return next(null, booking[0]);
							} else {
								return next(null, booking);
							}
						}
					);
				});
			} else {
				if (booking[0]) {
					return next(null, booking[0]);
				} else {
					return next(null, booking);
				}
			}
		})
		.catch(function (err) {
			winston.error("Error in addBooking: " + err.toString());
			console.log("ddd", err);
			return next(err);
		})

};

module.exports.updateBooking = function (booking_id, details, next) {
    details.latModified = Date.now();
	details.type = details && details.imd && details.imd[0] ? "Intermittent":"Direct";
    var oUpdate = {};
    oUpdate.$set = details;
    Booking.findByIdAndUpdateAsync(booking_id, oUpdate, { "new": true })
        .then(function (doc) {
            var tempBooking = JSON.parse(JSON.stringify(doc));
            return next(null, tempBooking);
        })
        .catch(next);
};
