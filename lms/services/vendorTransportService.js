var VendorTransport = promise.promisifyAll(commonUtil.getModel('vendorTransport'));
var VendorRatesService = commonUtil.getService('VendorRates');
var FileService = commonUtil.getUtil('file_upload_util');
let Trip = commonUtil.getModel('trip');

var NO_OF_DOCS = 15;

function generateTransportVendorId() {
    var count = app_constant.vendorTransportCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return "VT" + ddmmyy + (++count);
}

/**************transport vendor ***********/
module.exports.addVendorTransport = function (reqBody, next) {
    reqBody.vendorId = generateTransportVendorId();
	reqBody.created_at = new Date();
    var vendorT = new VendorTransport(reqBody);
    vendorT.saveAsync(reqBody)
        .then(function (vendorT) {
            counterUtil.incrementVendorTransportCount();
            return next(null, vendorT);
        })
        .catch(function (err) {
            winston.error("error in add vendor transport:" + err);
            return next(err);
        });
};


module.exports.findAccountQuery = function(query, next) {
	VendorTransport.findAsync(query)
		.then(function(vendor) {
			return next(null, vendor);
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.deleteVendTransRecordById = function (id, next) {
    var remove = {};
    remove._id = id;
    VendorTransport.removeAsync(remove)
        .then(function (removed) {
            return next(null, removed);
        })
        .catch(function (err) {
            winston.error("error in remove vendor transport " + err);
            return next(err);
        });
};

module.exports.updateVendorTransport = function (id, reqBody, next) {
    VendorTransport.findOneAndUpdateAsync({ _id: id }, { $set: reqBody }, { new: true })
			.then((branch) => {
				VendorRatesService.add({
					vendorId: id,
					clientId: reqBody._cid_,
					routes: reqBody.routes
				});
				return branch;
			})
			.then(function (branch) {
					return next(null, branch);
			})
			.catch(function (err) {
					winston.error("error in update vendor transport:" + err);
					return next(err);
			});
};

module.exports.findVendorTransportId = function (query, next) {
    VendorTransport.find(query)
        .populate("vehicle_services_provided")
        .populate("routes_serviced")
        .exec(function (err, vendor) {
            if (err) {
                return next(err);
            }
            return next(null, vendor);
        }).catch(next);
};

module.exports.findVendorTransportQuery = function (query, next) {
    VendorTransport.find(query)
        .populate("vehicle_services_provided")
        .populate("routes_serviced")
        .then(function (vendor) {
            return next(null, vendor);
        }).catch(function (err) {
            winston.error("error in find vendor:" + err);
            return next(err);
        });
};

module.exports.findTripRecord = function (query, next) {
    Trip.find(query).then(function (trip) {
            return next(null, trip);
        }).catch(function (err) {
            winston.error("error in find trip:" + err);
            return next(err);
        });
};

module.exports.deleteVendorTransportId = function (id, next) {
    var remove = {};
    remove._id = id;
    VendorTransport.deleteAsync(remove)
        .then(function (removed) {
            return next(null, removed);
        })
        .catch(function (err) {
            winston.error("error in remove vendor transport " + err);
            return next(err);
        });
};

module.exports.deleteVendorTransportQuery = function (query, next) {
    VendorTransport.deleteAsync(query)
        .then(function (removed) {
            return next(null, removed);
        })
        .catch(function (err) {
            winston.error("error in remove vendor transport " + err);
            return next(err);
        });
};

var allowedSearchFields = {
    "name": 1, "_id":1, "pan_no": 1, "category": 1, "ownershipType": 1, "contact_person_name": 1,
    "prim_contact_no": 1, "contact_person_email": 1, "from":1, "to":1,
    "vehicle_services_provided": 1, "route": 1, "rating": 1, 'vehicleType':1,
	'ownershipType': 1,'deleted':1, 'or': 1,'account.0': 1
};

function createVendorTransportAggrFilter(reqQuery) {
	var fFilter = {
		$and:[{
			$or:[{clientId:reqQuery.clientId},{clientR:reqQuery.clientId}]}]
	};
    for (var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === 'from') {
				obj = {};
				let startDate = new Date(reqQuery[key]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (!reqQuery.dateType || fFilter.dateType === 'created_at') {
					fFilter["created_at"] = obj["created_at"] || {};
					fFilter["created_at"].$gte = startDate;
				}
			} else if (key === 'to') {
				obj = {};
				let endDate = new Date(reqQuery[key]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (!reqQuery.dateType || fFilter.dateType === 'created_at') {
					fFilter["created_at"] = obj["created_at"] || {};
					fFilter["created_at"].$lte = endDate;
				}
			}else if (key === "name" || key === "email" || key === "contact_person_name" || key === "remark" || key === "area") {
                fFilter[key] = { $regex: reqQuery[key].replace(' ','.+'), $options: 'i' };
            }
			else if (key === "pan_no" || key === "ownershipType" || key === "category") {
				fFilter[key] = { $regex: reqQuery[key].replace(' ','.+'), $options: 'i' };
			}
            /*else if (key === "prim_contact_no") {
				fFilter[key] = { $regex: "/" + reqQuery[key] + "$/" };
            }*/
            else if (key === "vehicleType") {
				if(reqQuery[key].length > 0)
					fFilter["routes.vehicleTypes.vehicleType"] = { $in: otherUtil.arrString2ObjectId(reqQuery[key]) };
            }

            else if (key === "route") {
            	if(reqQuery[key].length > 0)
					fFilter["routes.route"] = { $in: otherUtil.arrString2ObjectId(reqQuery[key]) };
            }

            else if (key === "rating") {
				fFilter["ratings.rating"] = { $in:  reqQuery[key] };
            }

			else if (key === "or" && reqQuery[key] && typeof reqQuery[key].value === 'string' && Array.isArray(reqQuery[key].in)) {
				fFilter["$or"] = fFilter["$or"] || [];
				fFilter["$or"].push(...reqQuery[key].in.map(s => ({
					[s]: { $regex: reqQuery[key].value.replace(' ','.+'), $options: 'i' }
				})));
			}

            /*else if (key === "global") {
                aggrFilter.push({ $text: { $search: reqQuery[key] } }, { score: { $meta: "textScore" } })
            }*/
            else {
				fFilter[key] = reqQuery[key];
            }
        }
    }
    return fFilter;
}

module.exports.searchVendorTransport = function ( reqBody,trim, next) {
    var queryFilter = createVendorTransportAggrFilter(reqBody);
    reqBody.queryFilter = queryFilter;
    if(!reqBody.sort)  reqBody.sort = {_id:-1};

	if(!trim)
	reqBody.populate =  [{path: 'account.ref', select: "name ledger_name branch group isGroup accountId type opening_balance pan_no tdsCategory tdsSources tdsRate tdsSection tdsApply exeRate exeFrom exeTo"}];
	otherUtil.findPagination(VendorTransport, reqBody, next);
};

module.exports.findVendorInBulk = function (queryFilters, next) {
    var no_of_pages = 1;
    //db.grs.find({"branch_name" : "Okhla","gr_no_start" : {$lte:500}, "gr_no_end" : {$gte:500}})
    VendorTransport.countAsync({ "_id": queryFilters })
        .then(function (count) {
            var cursor = VendorTransport.find({ "_id": queryFilters });

            var no_of_documents = queryFilters && queryFilters.no_of_docs ? queryFilters.no_of_docs : NO_OF_DOCS;
            if (no_of_documents > 15) {
                no_of_documents = 15;
            }
            if (queryFilters && queryFilters.skip) {//TODO check field is valid or not
                var skip_docs = (queryFilters.skip - 1) * no_of_documents;
                cursor.skip(parseInt(skip_docs));
            }
            if (count / no_of_documents > 1) {
                no_of_pages = count / parseInt(no_of_documents);
            }

            cursor.exec(
                function (err, available) {
                    if (err) {
                        return next(err);
                    }
                    if (available && available[0]) {
                        var tempGR = JSON.parse(JSON.stringify(available));
                        var oRes = {};
                        oRes.no_of_pages = Math.ceil(no_of_pages);
                        oRes.data = tempGR;
                        return next(null, oRes);
                    } else {
                        return next(null, false);
                    }
                }
            )
        })
        .catch(
        function (err) {
            winston.error("Error in get fuel station available:" + err);
            return next(err);
        }
        );
};

module.exports.update = async (req, res, next) => {
	try {
		if(req.files) {
			await FileService.uploadFiles(req, 'VendorTransport', req.vendorData);
		}
		req.body.documents = req.vendorData.documents;
		delete req.files;
		let updated = await VendorTransport.findOneAndUpdateAsync({_id: req.params._id}, {$set: req.body}, {new: true});
		return res.status(200).json({
			'status': 'OK',
			'message': 'documents uploaded',
			'data': updated
		});
	} catch(err) {
		next(err);
	}
};
