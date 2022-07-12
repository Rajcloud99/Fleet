var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
var DriverAssociationService = promise.promisifyAll(commonUtil.getService('driverAssociation'));
var RegisteredVehicleAssociationService = promise.promisifyAll(commonUtil.getService('registeredVehicleAssociation'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var locationService = promise.promisifyAll(commonUtil.getService("location"));
var Account = commonUtil.getModel('accounts');
var vehicleBudget = commonUtil.getModel('vehicleBudget');
var NO_OF_DOCS = 10;

function generateRegVehId() {
    var ddmmyy = otherUtil.getDDMMYY();
    var company_short_name = config["company_short_name"];
    var regVehicleCount = app_constant.regVehicleCount;
    return company_short_name + "V" + ddmmyy + (++regVehicleCount);
}

module.exports.addRegisteredVehicle = function(reqQuery, next) {
    reqQuery.vehicleId = generateRegVehId(reqQuery);
    var registeredVehicle = new RegisteredVehicle(reqQuery);
    registeredVehicle.saveAsync(reqQuery)
        .then(function(registeredVehicle) {
        	counterUtil.incrementRegVehicleCount();
					if(reqQuery.account && reqQuery.account._id) {
						Account.findByIdAndUpdate(reqQuery.account._id,{$set:{
								'linkedTo.linkedId':registeredVehicle._id,
								'linkedTo.name': registeredVehicle.vehicle_reg_no,
								'linkedTo.linkedModel':'RegisteredVehicle',
								'linkedTo.date':new Date(),
							}}).lean().then((doc) => {
							winston.info("added new registered vehicle" + JSON.stringify(registeredVehicle));
							return next(null, registeredVehicle);
						});
					} else {
						winston.info("added new registered vehicle" + JSON.stringify(registeredVehicle));
						return next(null, registeredVehicle);
					}
        }).catch(function(err) {
            return next(err);
        });

};

module.exports.addRates = function(reqQuery , next)
{
	let reqBody={
		budgeting:
			{
            "clientId":reqQuery.clientId,
            "serviceTyp":reqQuery.serviceTyp,
            "rpk":reqQuery.rpk,
			"mileage":reqQuery.mileage,
            "adv":reqQuery.adv,
			"createdAt" : Date.now(),
			"userName": reqQuery.created_by_name,
            "veh": reqQuery._id
			},
		cbObj: {
            "date" : Date.now(),
			"rpk":reqQuery.rpk,
            "adv":reqQuery.adv,
			"mileage":reqQuery.mileage
		}
	};
    let savedBudget =  (new vehicleBudget(reqBody.budgeting)).save();

	RegisteredVehicle.findOneAndUpdateAsync({
		_id: reqQuery._id
	},{
		$set:{[`current_budget.${reqQuery.serviceTyp}`]:reqBody.cbObj}
	},{
		'new': true
	})
		.then(function(data) {
			return next(null, data);
		}) .catch(function(err) {
		return next(err);
	});
}

module.exports.getRates = async function (req, res, next) {

	let oRates = await vehicleBudget.find({clientId: req.user.clientId, veh:req.body._id}).sort({_id:-1}).lean();

	return res.status(200).json({
		'status': 'OK',
		'message': 'Data found',
		'data': oRates
	});

}

module.exports.findRegisteredVehicleId = function(id, next) {
    RegisteredVehicle.findAsync({
            "_id": id
        })
        .then(function(registeredVehicle) {
            return next(null, registeredVehicle);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.getRegisteredVehicle = async function (oFilter,oProject) {
	let prj = oProject  || {};
	let oVehicle = await RegisteredVehicle.findOne(oFilter,prj);
	return oVehicle;
};

module.exports.findAccountQuery = function(query, next) {
	RegisteredVehicle.findAsync(query)
		.then(function(registeredVehicle) {
			return next(null, registeredVehicle);
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.updateRegisteredVehicle = async function (oFilter,oData) {
	let oVehicle = await RegisteredVehicle.findOneAndUpdate(oFilter,oData,{new: true});
	return oVehicle;
};

module.exports.updateRegisteredVehicleStatusById = function(id, oUpdate, next) {
    RegisteredVehicle.findAsync({ "_id": mongoose.Types.ObjectId(id) })
        .then(function(registeredVehicle) {
            if (registeredVehicle && registeredVehicle[0]) {
                var updateNow = false;
                var lastvehiucleStatus = registeredVehicle[0].status;
                if (oUpdate.status == 'Available' && lastvehiucleStatus == 'Maintenance' && oUpdate.previousStatus == 'Maintenance') {
                    updateNow = true; //close job card
                } else if (oUpdate.status == 'Available' && lastvehiucleStatus == 'Booked' && oUpdate.previousStatus == 'Booked') {
                    updateNow = true; //trip end
                } else if (oUpdate.status == 'Booked' && lastvehiucleStatus == 'Maintenance' && oUpdate.previousStatus == 'Maintenance') {
                    updateNow = true; //resume trip on close job card
                } else if (oUpdate.status == 'Booked' && lastvehiucleStatus == 'Available' && oUpdate.previousStatus == 'Available') {
                    updateNow = true; //allocation
                } else if (oUpdate.status == 'Maintenance' && lastvehiucleStatus == 'Available' && oUpdate.previousStatus == 'Available') {
                    updateNow = true; //open job card
                } else if (oUpdate.status == 'Maintenance' && lastvehiucleStatus == 'Booked' && oUpdate.previousStatus == 'Available') {
                    updateNow = true; //open job card when vehicle was on trip
                } else {
                    return { status: 'ERROR', 'message': 'vehicle status update from unknow scenario' };
                }
                if (updateNow) {
                    delete oUpdate.previousStatus; //trip start on available vehicle
                    var cb = function(resp) {
                        console.log(resp);
                    };
                    var oVehicle = {
                        vehicle_status: oUpdate.status,
                        vehicle_no: registeredVehicle[0].vehicle_reg_no,
                        owner_group: registeredVehicle[0].owner_group,
                        clientId: registeredVehicle[0].clientId
                    };
                    locationService.updateVehicleOnGPSGAADI(oVehicle, cb);
                    return RegisteredVehicle.findByIdAndUpdateAsync(mongoose.Types.ObjectId(id), { $set: oUpdate });
                }
            } else {
                oUpdate = undefined;
                return { status: 'ERROR', 'message': 'vehicle not found' };
            }
        }).then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.findRegisteredVehicleQuery = function(query, next) {
    RegisteredVehicle.findAsync(query)
        .then(function(registeredVehicle) {
            return next(null, registeredVehicle);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.updateMultipleVehicleSegment = async function({body, user}, next) {

	try {

		return next(null, await RegisteredVehicle.bulkWrite(
			body.aVehicle.map( obj  => {
				return { updateOne :
					{
						"filter" : { "_id" : obj._id },
						"update" : {
							$set : { "segment_type" : body.segment_type },
							$push: {
								"segmentHistory" : {
									segment_type: obj.segment_type,
									person: user._id,
									full_name: user.full_name,
									time: new Date()
								}
							}
						}
					}
				};
			} )
		));

	}catch (e) {
		console.log(err);
		return next(err);
	}
};

module.exports.updateRegisteredVehicleId = function(id, reqBody, next) {
    RegisteredVehicle.findByIdAndUpdate(id, { $set: reqBody },{new: true})
        .then(function(updated) {
        	if(reqBody.account && reqBody.account._id) {
				Account.findByIdAndUpdate(reqBody.account._id, {
					$set: {
						'linkedTo.linkedId': id,
						'linkedTo.name': reqBody.vehicle_reg_no,
						'linkedTo.linkedModel': 'RegisteredVehicle',
						'linkedTo.date': new Date(),
					}
				}).lean().then((doc) => {
					return next(null, updated);
				});
			} else {
				return next(null, updated);
			}
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.updateRegisteredVehicleByQuery = function(query, reqBody, next) {
    RegisteredVehicle.findOneAndUpdateAsync(query, {
            $set: reqBody
        })
        .then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.updateRegisteredVehicleIdSetPush = function(id, newData, next) {
    var newDetails = {};
    if (newData.toSet) {
        newDetails["$set"] = newData.toSet;
    }
    if (newData.toPush) {
        newDetails["$push"] = newData.toPush;
    }
    RegisteredVehicle.findOneAndUpdateAsync({
            _id: id
        }, newDetails)
        .then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.deleteRegisteredVehicle = function(id, next) {


	/*RegisteredVehicle.deleteAsync({
            _id: id
        })*/
	RegisteredVehicle.findOneAndUpdateAsync({
		_id: id
	}, {$set:{deleted:true}})
        .then(function(removed) {
            return next(null, removed);
        }).catch(function(err) {
            return next(err);
        });
};

var allowedSearchFields = {
    "_id": 1,
    "clientId": 1,
    "vehicle_reg_no": 1,
    "model": 1,
    "manufacturer": 1,
    "refrigeration": 1,
    "group": 1,
    "veh_type": 1,
    "veh_type_name": 1,
    "supervisor": 1,
    "driver": 1,
    "driverAvl": 1,
    "driver_name": 1,
    "chassis_no": 1,
    "engine_no": 1,
    "fitness_cert_no": 1,
    "insurance_no": 1,
    "insurance_company": 1,
    "rc_book_no": 1,
    "emission_cert_no": 1,
    "permit_reg_no": 1,
    "make_year": 1,
    "vendor_id": 1,
    "status": 1,
    "vehicles": 1,
    "own": 1,
	"from":1,
	"to":1,
    "is_market": 1,
    "dontshow": 1,
    "category": 1,
    "associationFlag": 1,
    "associated_vehicle": 1,
    "ne_category": 1,
    "ne_status": 1,
	"vehicle_no":1,
	"ownershipType":1,
	"segment_type":1,
	"device_imei":1,
	"owner_group":1,
	"gpsData":1,
	"vendor_id":1,
	"account":1,
	"gpsData.datetime":1,
	"deleted": 1
};

var allowedFields = [ "_id", "clientId", "vehicle_reg_no", "model", "manufacturer", "refrigeration", "group", "veh_type", "veh_type_name",
	                "supervisor", "driver", "driverAvl", "driver_name", "chassis_no", "engine_no", "fitness_cert_no", "insurance_no",
	                "insurance_company", "rc_book_no", "emission_cert_no", "permit_reg_no", "make_year", "vendor_id", "status", "vehicles",
	                "own", "from", "to", "is_market", "dontshow", "category", "associationFlag", "associated_vehicle", "ne_category", "ne_status",
	                "vehicle_no", "ownershipType", "segment_type", "device_imei", "owner_group", "gpsData", "vendor_id", "account",
	                "gpsData.datetime", "deleted"];

function constructFilters(oQuery) {
	let oFilter = {deleted: {$ne: true}};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, allowedFields)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
				oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
				oFilter[oQuery.dateType || 'created_at'].$gte = startDate;
				// }
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
				oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
				oFilter[oQuery.dateType || 'created_at'].$lte = endDate;
				// }
			} else if (i === 'veh_type') {
				oFilter['veh_type'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])}
			}else if (i === 'vehicle_reg_no') {
				if(oQuery[i] instanceof Array){
					oFilter[i] = {$in:oQuery[i]}
				}else{
					oFilter[i] = oQuery[i];
				}
			}else if (i === 'vehicle_no') {
				oFilter["vehicle_reg_no"] = { $regex:  oQuery[i].replace(' ','.+') , $options:'i'};
			}else if (i === "_id" || i === "veh_group" || i === "supervisor" || i === "driver" || i === "vendor_id") {
				if(oQuery[i] !== 'undefined') {
					oFilter[i] = mongoose.Types.ObjectId(oQuery[i]);
				}
			} else if (i === 'status') {
				oFilter["status"] = oQuery[i];
			} else if (i === 'ne_category') {
				oFilter["category"] = { $ne: oQuery[i] };
			} else if (i === 'ne_status') {
				oFilter["status"] = { $ne: oQuery[i] };
			} else if (i === 'vehicles') {
				oFilter['vehicle_reg_no']= { $in: oQuery[i] }
			} else if (i === 'own') {
				oFilter[i] = oQuery[i] == "true" ? true : false;
			} else if (i === 'is_market') {
				oFilter[i] = oQuery[i] == "true" ? true : false;
			} else if (i === 'associationFlag') {
				oFilter[i] = oQuery[i] == "false" ? false : true;
			} else if (i === 'veh_type_name') {
				oFilter[i] = oQuery[i] == "2*20 Feet" ? { $in: ["20 Feet", "40 Feet"] } : oQuery[i];
			} else if (i == 'dontshow') {
				oFilter['status']= { $ne:  oQuery[i] }
			}else if (i == 'driverAvl' && oQuery.driverAvl != "") {
				oFilter['driver_name'] = oQuery[i] == "true" ? { $exists: true } : { $exists: false };
			}else if(i==='owner_group') {
				if(oQuery[i] instanceof Array){
					oFilter['owner_group'] = {$in: oQuery[i]};
				}
				else{
					oFilter['owner_group'] = oQuery[i];
				}
			}else if (i == 'ownershipType' && oQuery[i]) {
				oFilter['ownershipType'] = {
					$in: Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]]
				};
			}else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

function createRegisteredVehicleAggrFilter(reqQuery) {
    var aggrFilter = [];
    // aggrFilter.push({
    //     $match: {
    //         deleted: {
    //             $ne: true
    //         }
    //     }
    // });
    for (var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === 'from') {
				obj = {};
				let startDate = new Date(reqQuery[key]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (!reqQuery.dateType || reqQuery.dateType === 'created_at') {
					obj["created_at"] = obj["created_at"] || {};
					obj["created_at"].$gte = startDate;
				}
				aggrFilter.push({ $match: obj });
			} else if (key === 'to') {
				obj = {};
				let endDate = new Date(reqQuery[key]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (!reqQuery.dateType || reqQuery.dateType === 'created_at') {
					obj["created_at"] = obj["created_at"] || {};
					obj["created_at"].$lte = endDate;
				}
				aggrFilter.push({ $match: obj });
			}
			else if (key === "vehicle_reg_no") {
				 obj = {};
				 try{
					 let x = JSON.parse(reqQuery[key])
					 if(x instanceof Array){
						 obj["vehicle_reg_no"] = { $in:  x };
					 }
					 else{
						 obj["vehicle_reg_no"] = reqQuery[key];
					 }
				 }catch(err) {
					 obj["vehicle_reg_no"] = reqQuery[key];
				 }
                aggrFilter.push({ $match: obj });
            }
            else if (key === "vehicle_no") {
				obj = {};
				obj["vehicle_reg_no"] = { $regex:  reqQuery[key].replace(' ','.+') , $options:'i'};
				aggrFilter.push({ $match: obj });
			}
             else if (key === "veh_type") {
                 obj = {};
                 obj["veh_type"] = { $in: otherUtil.arrString2ObjectId(reqQuery[key]) };
                 aggrFilter.push({ $match: obj });
             }

             else if (key === "_id" || key === "veh_group" || key === "supervisor" || key === "driver" || key === "vendor_id") {
             	if(reqQuery[key] !== 'undefined') {
								obj = {};
								obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
								aggrFilter.push({
									$match: obj
								});
							}
            } else if (key === 'status') {
                obj = {};
                obj["status"] = reqQuery[key];
                aggrFilter.push({
                    $match: obj
                });
            } else if (key === 'ne_category') {
                obj = {};
                obj["category"] = { $ne: reqQuery[key] };
                aggrFilter.push({
                    $match: obj
                });
            } else if (key === 'ne_status') {
                obj = {};
                obj["status"] = { $ne: reqQuery[key] };
                aggrFilter.push({
                    $match: obj
                });
            } else if (key === 'vehicles') {
                aggrFilter.push({
                    $match: {
                        vehicle_reg_no: { $in: reqQuery[key] }
                    }
                });
            } else if (key === 'own') {
                obj = {};
                obj[key] = reqQuery[key] == "true" ? true : false;
                aggrFilter.push({
                    $match: obj
                });
            } else if (key === 'is_market') {
                obj = {};
                obj[key] = reqQuery[key] == "true" ? true : false;
                aggrFilter.push({
                    $match: obj
                });
            } else if (key === 'associationFlag') {
                obj = {};
                obj[key] = reqQuery[key] == "false" ? false : true;
                aggrFilter.push({
                    $match: obj
                });
            } else if (key === 'veh_type_name') {
                obj = {};
                obj[key] = reqQuery[key] == "2*20 Feet" ? { $in: ["20 Feet", "40 Feet"] } : reqQuery[key];
                aggrFilter.push({
                    $match: obj
                });
            } else if (key == 'dontshow') {
                aggrFilter.push({
                    $match: {
                        status: { $ne:  reqQuery[key] }
                    }
                });
            }
             else if (key == 'driverAvl' && reqQuery.driverAvl != "") {
                obj = {};
                obj['driver_name'] = reqQuery[key] == "true" ? { $exists: true } : { $exists: false };
                aggrFilter.push({
                    $match: obj
                });
            }
			else if(key==='owner_group') {
				obj = {};
				if(reqQuery[key] instanceof Array){
					obj['owner_group'] = {$in: reqQuery[key]};
				}
				else{
					obj['owner_group'] = reqQuery[key];
				}
				aggrFilter.push({
					$match: obj
				});
			}
            else if (key == 'ownershipType' && reqQuery[key]) {
				obj = {};
				obj['ownershipType'] = {
					$in: Array.isArray(reqQuery[key]) ? reqQuery[key] : [reqQuery[key]]
				};
				aggrFilter.push({
					$match: obj
				});
            } else if (key === 'deleted') {
				obj = {};
				obj[key] = reqQuery[key] === true ? true : reqQuery[key] === 'true' ? true: {$ne: true};
				aggrFilter.push({
					$match: obj
				});
			}
            else if (reqQuery[key] !== 'undefined') {
                obj = {};
                obj[key] = reqQuery[key];
                aggrFilter.push({
                    $match: obj
                });
            }

        }
    }
    return aggrFilter;
}

module.exports.getVehiclesForAllocation = (req, next) => {
  var reqBody = req.body;
  var aggr1 = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [reqBody.lng || 0, reqBody.lat || 0]
        },
        distanceField: 'distanceAway',
        maxDistance: 1000 * 1000, // 40KM to 1,000KM to show all vehicle
        distanceMultiplier: 0.001, // Distance in KM
        spherical: true,
        query: {
          'clientId': req.user.clientId,
          'device_imei': {
            $ne: null
          },
          /*'gpsData.datetime': {
            $gt: Date.now() - 28800000 // 8 Hr
          },*/
          'status': reqBody.status || 'Available'
        }
      }
    },
    {
      $lookup: {
        from: "vehicletypes",
        localField: "veh_type",
        foreignField: "_id",
        as: "veh_type"
      }
    },
    {
      $unwind: {
        path: '$veh_type',
        preserveNullAndEmptyArrays: true
      },
    }
  ];
  var aggr2 = [
    {
      $match: {
        'device_imei': {$eq: null}
      }
    },
    ...createRegisteredVehicleAggrFilter(reqBody),
    {
      $sort: {
        vehicle_reg_no: 1,
        created_at: -1
      }
    },
    {
      $lookup: {
        from: "vehicletypes",
        localField: "veh_type",
        foreignField: "_id",
        as: "veh_type"
      }
    },
    {
      $unwind: {
        path: '$veh_type',
        preserveNullAndEmptyArrays: true
      },
    }
  ];

  Promise.all([
    RegisteredVehicle.aggregate(aggr1),
    RegisteredVehicle.aggregate(aggr2),
  ])
  .then(vehicles => {
    var vehiclesWithGPSDevice = vehicles[0];
    var vehiclesWithoutGPSDevice = vehicles[1];
    return next(null, [...vehiclesWithGPSDevice, ...vehiclesWithoutGPSDevice]);
  })
  .catch(next);

};

module.exports.searchRegisteredVehicle=function(reqBody, req, next) {
	let oFill = constructFilters(reqBody);
    let populate=[];
	var aggrFilter = [];
	aggrFilter.push({ $match: oFill });
	if (reqBody.trim) {
		var projection = {
			_id: 1,
			vehicle_reg_no: 1,
			vehicle_no:1,
			driver_name:1,
			ownershipType:1,
			category:1,
			structure_name:1,
			last_known:1

		};
		aggrFilter.push({
			$project: projection
		});
	}

    if (reqBody.populate)
        populate=RegisteredVehicle.buildPopQuery(reqBody.populate, req)||[];

    var oSort={vehicle_reg_no: 1,created_at: -1};
	aggrFilter.push(
		{
			$sort: oSort
		},
		{
			$lookup: {
				from: "vehicletypes",
				localField: "veh_type",
				foreignField: "_id",
				as: "veh_type"
			}
		},
		{
			$unwind: {
				path: "$veh_type",
				preserveNullAndEmptyArrays: true
			}
		},
		// {
		// 	"$match": {
		// 		"deleted": false
		// 	}
		// },
		{
			$lookup: {
				from: "accounts",
				localField: "account",
				foreignField: "_id",
				as: "account"
			}
		},
		{
			$unwind: {
				path: "$account",
				preserveNullAndEmptyArrays: true
			}
		},
		{
			'$lookup': {
				from: 'drivers',
				localField: 'driver',
				foreignField: '_id',
				as: 'driver'
			}
		},
		{ '$unwind': { path: '$driver', preserveNullAndEmptyArrays: true } },
        /*
        //TODO already coming from frontend as popultae
		{$lookup: {from: 'vendortransports', localField: 'vendor_id', foreignField: '_id', as: 'vendor_id'}},
		{$unwind: {path: '$vendor_id', preserveNullAndEmptyArrays: true}},
		{
			$lookup: {
				from: "accounts",
				localField: "vendor_id.account",
				foreignField: "_id",
				as: "vendor_id.account"
			}
		},
		{
			$unwind: {
				path: "$vendor_id.account",
				preserveNullAndEmptyArrays: true
			}
		},
        */
		...populate,
	);
    reqBody.aggQuery=aggrFilter;
    otherUtil.pagination(RegisteredVehicle,reqBody,next);
};

module.exports.searchReportRegisteredVehicle = function(reqQuery, trim, next) {
    var aggrFilter = createRegisteredVehicleAggrFilter(reqQuery);
    var oSort = { vehicle_reg_no: 1, created_at: -1 };
    aggrFilter.push({ $sort: oSort });
    if (trim || reqQuery.trim) {
        var projection = {
            _id: 1,
            vehicleId: 1,
            vehicle_reg_no: 1
        };
        aggrFilter.push({
            $project: projection
        });
    }
    aggrFilter.push({
        $lookup: {
            from: "trips",
            localField: "last_known.trip_no",
            foreignField: "trip_no",
            as: "trip_doc"
        }
    })

    var datacursor = RegisteredVehicle.aggregate(aggrFilter);
    aggrFilter.push({
        $group: {
            _id: null,
            count: {
                $sum: 1
            }
        }
    });
    var countCursor = RegisteredVehicle.aggregate(aggrFilter);
    var no_of_documents;
    if (reqQuery.all == "true") {
        no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
    } else {
        no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
        if (no_of_documents > NO_OF_DOCS) {
            no_of_documents = NO_OF_DOCS;
        }
    }
    if (reqQuery.skip) {
        var skip_docs = (reqQuery.skip - 1) * no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr) {
        if (err) {
            return next(err);
        }
        if (countArr.length > 0) {
            var registeredVehicleCount = countArr[0].count;
            var no_of_pages;
            if (registeredVehicleCount / no_of_documents > 1) {
                no_of_pages = Math.ceil(registeredVehicleCount / no_of_documents);
            } else {
                no_of_pages = 1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function(err, registeredVehicles) {
                var registeredVehicle0 = JSON.parse(JSON.stringify(registeredVehicles));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err) {
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.registeredVehicles = registeredVehicle0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = registeredVehicleCount;
                return next(null, objToReturn);
            });
        } else {
            var objToReturn = {};
            objToReturn.registeredVehicles = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};

module.exports.searchRegisteredVehicleAggr = function( reqBody, next) {
	let project = reqBody.project || {vehicle_reg_no: 1, status:1, ownershipType: 1,driver:1,driver_name:1, vendor_name:1, owner_name:1, device_imei:1};
	// var aggrFilter = createRegisteredVehicleAggrFilter(reqBody);
	let oFill = constructFilters(reqBody);
	var aggrFilter = [];
	aggrFilter.push({ $match: oFill });
	//console.log(aggrFilter);
	var no_of_documents = reqBody && reqBody.no_of_docs ? reqBody.no_of_docs : NO_OF_DOCS;
	if (no_of_documents > 4000) {
		no_of_documents = NO_OF_DOCS;
	}
	if (reqBody.skip) {
		var skip_docs = (reqBody.skip - 1) * no_of_documents;
		aggrFilter.push({$skip: skip_docs});
		cursor.skip(parseInt(skip_docs));
	}

	if (reqBody && reqBody.all) {
		aggrFilter.push({$limit: parseInt(100000)});
	} else {
		aggrFilter.push({$limit: parseInt(no_of_documents)});
	}
	aggrFilter.push({$sort: {_id: -1}});
	aggrFilter.push({$project: project});
	var cursor = RegisteredVehicle.aggregate(aggrFilter);
	cursor.exec(function (err, customer) {
		if (err) {
			return next(err);
		}
		var temp = JSON.parse(JSON.stringify(customer));
		if (temp && temp.length > 0) {
			var objToReturn = {};
			objToReturn.data = temp;
			return next(null, objToReturn);
		} else {
			var objToReturn = {};
			objToReturn.data = [];
			return next(null, objToReturn);
		}
	}).catch(function (err) {
		return next(err);
	});
};
