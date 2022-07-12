/**
 * Created by manish on 31/8/16.
 */

var router = require('express').Router();
var Driver = promise.promisifyAll(commonUtil.getModel("driver"));
var Branch= promise.promisifyAll(commonUtil.getModel("branch"));
var RegVehicle = promise.promisifyAll(commonUtil.getModel("registeredVehicle"));
var VendorTransport = promise.promisifyAll(commonUtil.getModel("vendorTransport"));
var VendorFuel = promise.promisifyAll(commonUtil.getModel("vendorFuel"));
var VendorMaintenance = promise.promisifyAll(commonUtil.getModel("vendorMaintenance"));
var VendorCourier = promise.promisifyAll(commonUtil.getModel("vendorCourier"));
var TransportRoute = promise.promisifyAll(commonUtil.getModel("transportRoute"));
var Customer = promise.promisifyAll(commonUtil.getModel("customer"));
var User = promise.promisifyAll(commonUtil.getModel("user"));
var Department = promise.promisifyAll(commonUtil.getModel("department"));
var Bookings = promise.promisifyAll(commonUtil.getModel("bookings"));
var Trips = promise.promisifyAll(commonUtil.getModel("trip"));
var Client = promise.promisifyAll(commonUtil.getModel("client"));

var async = require('async');

var stats = {};

var orderOfStats = ["driver","branch","regvehicle","transportVendor","fuelVendor","courierVendor",
    "maintenanceVendor","route","customer","user","department","client","bookings_today","trips_today"
];

module.exports.dashBoardStats = function(req,next){
    console.log("user role data in async: "+JSON.stringify(req.resourcesObj));
        async.series([
                function (callback) {
                    Driver.countAsync({clientId:req.user.clientId})
                        .then(function (countDrivers) {
                            callback(null, countDrivers)
                        })
                },
                function (callback) {
                    Branch.countAsync({clientId:req.user.clientId})
                        .then(function (countBranch) {
                            callback(null, countBranch)
                        })
                },
                function (callback) {
                    RegVehicle.countAsync({clientId:req.user.clientId})
                        .then(function (countRegVehicle) {
                            callback(null, countRegVehicle)
                        })
                },
                function (callback) {
                    VendorTransport.countAsync({clientId:req.user.clientId})
                        .then(function (vendorTransport) {
                            callback(null, vendorTransport)
                        })
                },
                function (callback) {
                    VendorFuel.countAsync({clientId:req.user.clientId})
                        .then(function (vendorFuelCount) {
                            callback(null, vendorFuelCount)
                        })
                },
                function (callback) {
                    VendorCourier.countAsync({clientId:req.user.clientId})
                        .then(function (vendorCourierCount) {
                            callback(null, vendorCourierCount)
                        })
                },
                function (callback) {
                    VendorMaintenance.countAsync({clientId:req.user.clientId})
                        .then(function (countVendorMaintenance) {
                            callback(null, countVendorMaintenance)
                        })
                },
                function (callback) {
                    TransportRoute.countAsync({clientId:req.user.clientId})
                        .then(function (transportRouteCount) {
                            callback(null, transportRouteCount)
                        })
                },
                function (callback) {
                    Customer.countAsync({clientId:req.user.clientId})
                        .then(function (countCustomer) {
                            callback(null, countCustomer)
                        })
                },
                function (callback) {
                    User.countAsync({clientId:req.user.clientId})
                        .then(function (countCustomer) {
                            callback(null, countCustomer-1)
                        })
                },
                function (callback) {
                    Department.countAsync({clientId:req.user.clientId})
                        .then(function (countCustomer) {
                            callback(null, countCustomer)
                        })
                },
                function (callback) {
                    Client.countAsync()
                        .then(function (countCustomer) {
                            callback(null, countCustomer-1)
                        })
                },
                function (callback) {
                    var startDay = new Date();
                    startDay.setDate(startDay.getDate());
                    startDay.setSeconds(0);
                    startDay.setHours(0);
                    startDay.setMinutes(0);
                    var endDay = new Date();
                    endDay.setDate(endDay.getDate());
                    endDay.setSeconds(59);
                    endDay.setHours(23);
                    endDay.setMinutes(59);

                    var dateFilter = {
                        "$gte" :startDay,
                        "$lt":endDay
                    };
                    var filter = [{$match:{created_at:dateFilter}},
                        { $group: {_id: null, count: { $sum : 1 }}}];
                    Bookings.aggregateAsync(filter)
                        .then(function (countArr) {
                            if (countArr.length>0) {
                                callback(null, countArr[0].count)
                            }else{
                                callback(null,0);
                            }
                        })
                },
                function (callback) {
                    var startDay = new Date();
                    startDay.setDate(startDay.getDate());
                    startDay.setSeconds(0);
                    startDay.setHours(0);
                    startDay.setMinutes(0);
                    var endDay = new Date();
                    endDay.setDate(endDay.getDate());
                    endDay.setSeconds(59);
                    endDay.setHours(23);
                    endDay.setMinutes(59);

                    var dateFilter = {
                        "$gte": startDay,
                        "$lt": endDay
                    };
                    var filter = [{$match:{created_at:dateFilter}},
                        { $group: {_id: null, count: { $sum : 1 }}}];
                    Trips.aggregateAsync(filter)
                        .then(function (countArr) {
                            if (countArr.length>0) {
                                callback(null, countArr[0].count)
                            }else{
                                callback(null,0);
                            }
                        })
                }
            ],
            function (err, result) {
                console.log("Got results from async task get dashboard data:" + JSON.stringify(result));
                var toReturn ={};
                for (var i=0 ;i <orderOfStats.length;i++){
                    if (orderOfStats[i] in req.resourcesObj) {
                        toReturn[orderOfStats[i]] = result[i];
                    }
                    else if ((orderOfStats[i]==="bookings_today" && ("bookings" in req.resourcesObj))){
                        toReturn[orderOfStats[i]] = result[i];
                    }
                    else if ((orderOfStats[i]==="trips_today" && ("trip" in req.resourcesObj))){
                        toReturn[orderOfStats[i]] = result[i];
                    }
                }
                console.log("error in async task dashboard:" + JSON.stringify(err));
               return next(err,toReturn);
            }
        );
    };