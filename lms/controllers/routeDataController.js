/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
let RouteData = commonUtil.getModel('routeData');
var CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
var ContractService = promise.promisifyAll(commonUtil.getService('contract'));
var RouteDataService = promise.promisifyAll(commonUtil.getService('routeData'));
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));


router.get("/latest_rate",
    function(req,res,next){
        if (!req.query){
            return res.status(500).json({"status":"ERROR","message":"No query found"});
        }
        if (!req.query.customerId){
            return res.status(500).json({"status":"ERROR","message":"No customerId provided."});
        }
        if (!req.query.route_id){
            return res.status(500).json({"status":"ERROR","message":"No route id provided."});
        }
        CustomerService.findCustomerQueryAsync({customerId:req.query.customerId,clientId:req.user.clientId})
            .then(function(customer){
                if (customer && customer[0]) {
                    req.cutomerData = JSON.parse(JSON.stringify(customer[0]));
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "This customer name does not exists."
                    });
                }
            }).catch(next)
    },
    function(req,res,next){
        function constructLatestContractFilters(){
            var oFilter = {
                "clientId":req.user.clientId,
                "all":true
            };
            if(req.cutomerData._id){
                oFilter.customer__id = req.cutomerData._id;
            }
            if(req.cutomerData.active_contract__id){
                oFilter.contract__id = req.cutomerData.active_contract__id;
            }
            if(req.query.route_id){
                oFilter.route__id = req.query.route_id;
            }
            /*if(req.query.vehicle_type_id){
                oFilter.vehicle_type_id = req.query.vehicle_type_id;
            }
            if(req.query.vehicle_type){
                oFilter.vehicle_type = req.query.vehicle_type;
            }*/
            if(req.query.no_of_docs){
                oFilter.no_of_docs = req.query.no_of_docs;
            }
            if(req.query.skip){
                oFilter.skip = req.query.skip;
            }
            return oFilter;
        };

        RouteDataService.findLatestContractRateAsync(constructLatestContractFilters())
            .then(function(data){
                var aData = (data&&data.data[0]&&data.data[0].data)?data.data[0].data:[];
                var toUpdateData = [];
                function prepareData(vehicle_type_id,booking_type,aLatestRates){
                    var aResult = [];
                    for (var i = 0; i < aLatestRates.length; i++) {
                        if(vehicle_type_id){
                            if(aLatestRates[i].vehicle_type_id==vehicle_type_id){
                                aResult.push(aLatestRates[i]);
                            }
                        }else if(booking_type){
                            if(aLatestRates[i].booking_type==booking_type){
                                aResult.push(aLatestRates[i]);
                            }
                        }
                    }
                    return aResult;
                }

                if(aData.length){
                    if(req.query.vehicle_type_id && req.query.booking_type){
                        var aVehicleFiltered = prepareData(req.query.vehicle_type_id,false,aData);
                        var aVehcleAndBookingFiltered = prepareData(false,req.query.booking_type,aVehicleFiltered);
                        toUpdateData = aVehcleAndBookingFiltered;
                    }else if(req.query.vehicle_type_id){
                        var aVehicleFiltered = prepareData(req.query.vehicle_type_id,false,aData);
                        toUpdateData = aVehicleFiltered;
                    }else if(req.query.booking_type){
                       var aBookingFiltered = prepareData(false,req.query.booking_type,aData);
                        toUpdateData = aBookingFiltered;
                    }
                }
                var toSendData = {};
                if(data && data.data[0]){
                    toSendData = data.data[0];
                    toSendData.data = toUpdateData;
                }
                return res.status(200).json({
                    "status":"OK",
                    "message":"Latest contract rate found.",
                    "data":toSendData,
                    "count":data.count,
                    "pages":data.pages
                });
        }).catch(next)
    }
);





router.post("/add",
	function(req,res,next){

	RouteDataService.findRouteDataQueryAsync({clientId:req.body.clientId,route__id:req.body.route__id,contract__id:req.body.contract__id})
			.then(function(routeData){
				if (routeData && routeData[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"error_message": "Route data for this route and contract already exists",
						"data":routeData
					});
				}else{
					return next();
				}
			}).catch(next)
	},
	function(req,res,next) {
		RouteDataService.addRouteDataAsync(req.body)
			.then(function(RouteData){
				return res.status(200).json({"status":"OK",
					"message":"Route data has been added successfully",
					"data":RouteData});
			}).catch(next)
	}
);

router.post("/addRouteTracking",
		function(req,res,next){
			RouteDataService.findRouteDataQueryAsync({clientId:req.body.clientId,route__id:req.body.route__id,customer__id : req.body.customer__id, service:req.body.service, vehType:req.body.vehType,category:req.body.category})
				.then(function(routeData){
					if (routeData && routeData[0]) {
						return res.status(500).json({
							"status": "ERROR",
							"error_message": "Customer data for this route already exists",
							"data":routeData
						});
					}else{
						return next();
					}
				}).catch(next)
		},
		function(req,res,next) {
			RouteDataService.addRouteDataAsync(req.body)
				.then(function(RouteData){
					return res.status(200).json({"status":"OK",
						"message":"Customer data has been added successfully",
						"data":RouteData});
				}).catch(next)
		}
	)

router.post('/editRouteTracking/:_id', async function(req, res, next){
	try{
		const oRes = {
			status: "OK",
			message: 'Updated Successfully'
		};
		let prepareObj = {}, body= req.body;

		let oRoute = await RouteData.findOne({_id: req.params._id, clientId: req.user.clientId});

		if (!oRoute)
			throw new Error('Route not found!');

		let fdtata = await RouteData.find({clientId:req.body.clientId,_id:{$ne :req.params._id},route__id :{$eq :req.body.route__id},customer__id : req.body.customer__id, service:req.body.service, vehType:req.body.vehType,category:req.body.category});
					if (fdtata && fdtata[0]) {
						throw new Error('Customer data for this route already exists');
					}

		prepareObj = {
			...req.body,
		};


		oRoute = await RouteData.findOneAndUpdate({_id: oRoute._id}, {
			$set: prepareObj
		}, {new: true});

		return res.status(200).json(oRoute);
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});


router.post("/getTracking", async function(req, res, next){

	try {

		await RouteDataService.getTracking(req, res);

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});

router.get("/get",function(req,res,next){
	RouteDataService.searchRouteDataAsync(req.query,false)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Route datas found",
				"data":data.routeDatas,
				"count":data.count,
				"pages":data.pages});
		}).catch(next)
});

router.put("/update/:__id",
    function(req,res,next) {
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "No id provided to update route data"
            });
        }
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","error_message":"No update body found"});
        }
        RouteDataService.findRouteDataIdAsync(req.params.__id)
            .then(function (routeData) {
                if (routeData && routeData[0]){
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Route data does not exist"
                    });
                }
            }).catch(next)
    },
    function(req,res,next){
	RouteDataService.updateRouteDataIdAsync(req.params.__id,req.body)
		.then(function(updated){
			return res.status(200).json({"status":"OK",
				"message":"Route data has been updated successfully",
				"data":updated});
		}).catch(next)
});

router.delete("/delete/:__id"
    ,function(req,res,next) {
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "No id provided to delete for RouteDataService"
            });
        }
        RouteDataService.findRouteDataIdAsync(req.params.__id)
            .then(function (routeData) {
                if (routeData && routeData[0]){
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Route data does not exist"
                    });
                }
            }).catch(next)
    }
    ,function(req,res,next) {
        RouteDataService.deleteRouteDataIdAsync(req.params.__id)
            .then(function (deleted) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Route data has been deleted successfully",
                    "data": deleted
                });
            }).catch(next)
    }
);


router.get('/trackingReport',async function(req, res, next) {
	try{
		let data = await RouteDataService.trackingData(req);
		if(req.query.type === 'tracking'){
			ReportExelService.trackingReport(data, req.user.clientId, function(data){
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		}else if(req.query.type === 'budgeting'){
			ReportExelService.budgetingReport(data, req.user.clientId, function(data){
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		}

	}catch(e){
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});



module.exports = router;
