var fs = require("fs");
var User = promise.promisifyAll(commonUtil.getModel('user'));
var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
var Driver = promise.promisifyAll(commonUtil.getModel('driver'));
var VendorTransport = promise.promisifyAll(commonUtil.getModel('vendorTransport'));
var VendorFuel = promise.promisifyAll(commonUtil.getModel('vendorFuel'));
var VendorMaintenance = promise.promisifyAll(commonUtil.getModel('vendorMaintenance'));
var VendorCourier = promise.promisifyAll(commonUtil.getModel('vendorCourier'));
var Customer = promise.promisifyAll(commonUtil.getModel('customer'));
var Contract = promise.promisifyAll(commonUtil.getModel('contract'));
var ShippingLine= promise.promisifyAll(commonUtil.getModel('shippingLine'));
var RouteData = promise.promisifyAll(commonUtil.getModel('routeData'));
var Route = promise.promisifyAll(commonUtil.getModel('transportRoute'));
var Booking = promise.promisifyAll(commonUtil.getModel('bookings'));
var Trip = promise.promisifyAll(commonUtil.getModel('trip'));
var Client = promise.promisifyAll(commonUtil.getModel('client'));

var counterClass ={};

function getISODate(date){
	var IsoDate = date.getFullYear().toString();
	if(date.getMonth()<9){
		IsoDate = IsoDate + "-0" + (date.getMonth()+1).toString();
	}else{
		IsoDate = IsoDate +"-"+ (date.getMonth()+1).toString();
	}
	if(date.getDate()<10){
		IsoDate = IsoDate+ "-0" + date.getDate().toString();
	}else{
		IsoDate = IsoDate+ "-" + date.getDate().toString();
	}
	IsoDate = IsoDate+"T00:00:00.000Z";
	return IsoDate;
}

function getMMDDYYYY(dateNow){
	dateNow = dateNow || new Date();
	if(dateNow.getMonth()<9){
		dMonth = "0" + (dateNow.getMonth() +1).toString();
	}else{
		dMonth = (dateNow.getMonth() +1).toString();
	}
	if(dateNow.getDate()<10){
		dDate =  "0" + dateNow.getDate().toString();
	}else{
		dDate =  dateNow.getDate().toString();
	}
	return dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
}

function getUserCount(){
	User.countAsync()
		.then(function(count) {
				app_constant.userCount = count;
				fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
				//logger.info("Total users count: " + count);
	    },
		function(err) {
			logger.error("Error in user count: "+err);
		}
	);
}

function getCustomerCount(){
	Customer.countAsync()
		.then(function(count) {
					app_constant.customerCount = count;
					fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
			},
			function(err) {
				logger.error("Error in user count: "+err);
			}
		);
}

function getContractCount(){
	Contract.countWithDeletedAsync()
		.then(function(count) {
					app_constant.contractCount = count;
					fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
			},
			function(err) {
				logger.error("Error in user count: "+err);
			}
		);
}
function getRegisteredVehicleCount(){
	RegisteredVehicle.countWithDeletedAsync()
		.then(function(count) {
				app_constant.regVehicleCount = count;
				fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
				logger.info("Total vehicles count: " + count);
	    },
		function(err) {
			logger.error("Error in vehicle count: "+err);
		}
	);
}
function getDriverCount(){
	Driver.countWithDeletedAsync()
		.then(function(count) {
            app_constant.driverCount = count;
            fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
            logger.info("Total drivers count: " + count);
	    },
		function(err) {
			logger.error("Error in driver count: "+err);
		}
	);
}
function getVendorTransportCount(){

}

function getVendorFuelCount(){
	VendorFuel.countWithDeletedAsync()
		.then(function(count) {
				app_constant.vendorFuelCount = count;
				fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
				//logger.info("Total vendor fuel count: " + count);
			},
			function(err) {
				logger.error("Error in vendor fuel count: "+err);
			}
		);
}


function getVendorMaintenanceCount(){
	VendorMaintenance.countWithDeletedAsync()
		.then(function(count) {
				app_constant.vendorMaintenanceCount = count;
				fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
				//logger.info("Total vendor maintenance count: " + count);
			},
			function(err) {
				logger.error("Error in vendor maintenance count: "+err);
			}
		);
}


function getVendorCourierCount(){
	VendorCourier.countWithDeletedAsync()
		.then(function(count) {
				app_constant.vendorCourierCount = count;
				fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
				//logger.info("Total vendor courier count: " + count);
			},
			function(err) {
				logger.error("Error in vendor courier count: "+err);
			}
		);
}

function getRouteDataCount(){
	RouteData.countWithDeletedAsync()
		.then(function(count) {
					app_constant.routeDataCount = count;
					fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
					//logger.info("Total rate count: " + count);
			},
			function(err) {
				logger.error("Error in rate count: "+err);
			}
		);
}

function getRouteCount(){
	Route.countWithDeletedAsync()
		.then(function(count) {
					app_constant.routeCount = count;
					fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
					//logger.info("Total rate count: " + count);
			},
			function(err) {
				logger.error("Error in rate count: "+err);
			}
		);
}

function getShippingLineCount(){
    ShippingLine.countWithDeletedAsync()
        .then(function(count) {
                    app_constant.shippingLineCount = count;
                    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
                    //logger.info("Total rate count: " + count);
            },
            function(err) {
                //logger.error("Error in rate count: "+err);
            }
        );
}
function getBookingCount(){
    Booking.countWithDeletedAsync()
        .then(function(count) {
                    app_constant.bookingCount = count;
                    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
                    //logger.info("Total rate count: " + count);
            },
            function(err) {
                //logger.error("Error in rate count: "+err);
            }
        );
}
function getTripCount(){
    /*Trip.countWithDeletedAsync()
        .then(function(count) {
                    app_constant.tripCount = count;
                    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
                    //logger.info("Total rate count: " + count);
            },
            function(err) {
                //logger.error("Error in rate count: "+err);
            }
        );*/
}

counterClass.getLastAddedClientId = function(callback){
    var cursor = Client.find().sort({created_at:-1}).limit(1);
	cursor.exec(function(err, client){
	    if (client && client[0]){
	        if (client[0].clientId === config.super_admin_id){
	            callback(null,config.client_init_count);
            }else{
                callback(null,client[0].clientId);
            }
        }else{
            callback(err,null);
        }
    });
};
/*
getUserCount();
getDriverCount();
getRegisteredVehicleCount();
getVendorCourierCount();
getVendorFuelCount();
getVendorMaintenanceCount();
getVendorTransportCount();
getVendorCourierCount();
getCustomerCount();
getContractCount();
getRouteDataCount();
getRouteCount();
getTripCount();
getShippingLineCount();
*/
//getLastAddedClientId();
counterClass.incrementUserCount = function (){
    app_constant.userCount = count;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementCustomerCount = function (){
    app_constant.customerCount ++ ;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};


counterClass.incrementContractCount = function (){
    app_constant.contractCount ++ ;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};


counterClass.incrementRegVehicleCount = function (){
    app_constant.regVehicleCount ++;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementDriverCount = function (){
    app_constant.driverCount ++;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementVendorTransportCount = function (){
    app_constant.vendorTransportCount++;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementVendorFuelCount = function (){
    app_constant.vendorFuelCount ++;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementVendorCourierCount = function (){
    app_constant.vendorCourierCount ++;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementVendorMaintenanceCount = function (){
    app_constant.vendorMaintenanceCount ++ ;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementShippingLineCount = function (){
	app_constant.shippingLineCount ++ ;
	fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementRouteDataCount = function (){
    app_constant.routeDataCount ++ ;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementRouteCount = function (){
    app_constant.routeCount ++ ;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementBookingCount = function (){
    app_constant.bookingCount ++ ;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};
counterClass.incrementTripCount = function (){
    app_constant.tripCount ++ ;
    fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
};

counterClass.incrementCountByName = function (counterKeyName){
	  app_constant[counterKeyName] ++ ;
	  fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
					  if (err) {
					    logger.debug("error writing pprofile data to disk with error: %s", err);
					    //callback(null, "error writing pprofile data to disk");
					  } else {
					    //callback(null, "wrote pprofile data to disk");
					  }
					});
 };

counterClass.incrementMRCount = function (){
	app_constant.mrCount++ ;
	fs.writeFile('./app_constant.json', JSON.stringify(app_constant, null, 4), function (err) {
		if (err) {
			logger.debug("error writing pprofile data to disk with error: %s", err);
			//callback(null, "error writing pprofile data to disk");
		} else {
			//callback(null, "wrote pprofile data to disk");
		}
	});
};

module.exports = counterClass;
