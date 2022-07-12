var Driver = promise.promisifyAll(commonUtil.getModel('driver'));
var DriverAssociationService = promise.promisifyAll(commonUtil.getService('driverAssociation'));
var departmentService = promise.promisifyAll(commonUtil.getService('department'));
var roleService = promise.promisifyAll(commonUtil.getService('roles'));
var userService = promise.promisifyAll(commonUtil.getService('user'));
const serverSidePage = promise.promisifyAll(require('../../utils/serverSidePagination'));
const driverReports = commonUtil.getReports('driverReports.js');
const csvDownload = require('../../utils/csv-download');
let moment = require("moment");

var NO_OF_DOCS = 15;

function generateDrEmployeeCode() {
    var initCount = 100000;
    var company_short_name = config["company_short_name"];
    var driverCount = initCount + app_constant.driverCount + 1;
    return company_short_name + "D" + (driverCount);
}

module.exports.addDriver = function(reqBody, next) {
	try {
    reqBody.userId = reqBody.license_no;
    reqBody.role = 'Driver';
    reqBody.department = 'Driver Department';
    reqBody.full_name = reqBody.name;
    if(reqBody.name && reqBody.employee_code)
		reqBody.nameCode = reqBody.name + ' (' + reqBody.employee_code + ')';

    if(!reqBody.password) reqBody.password = 'password';

	// reqBody.employee_code = generateDrEmployeeCode();
	var driver = new Driver(reqBody);

		driver.saveAsync(reqBody)
			.then(function (driver) {
				winston.info("added new driver" + JSON.stringify(driver));
				counterUtil.incrementDriverCount();
				return next(null, driver);
			}).catch(function (err) {
			return next(err);
		});

	}catch (err) {
			next(err);
		}
};

module.exports.findDriverId = function(id, next) {
    Driver.findAsync({
            "_id": id
        })
        .then(function(driver) {
            return next(null, driver);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.findDriverQuery = function(query, next) {
    Driver.findAsync(query)
        .then(function(driver) {
            return next(null, driver);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.findAccountQuery = function(query, next) {
	Driver.findAsync(query)
		.then(function(driver) {
			return next(null, driver);
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.updateDriverId = function(id, reqBody, next) {

	if(reqBody.name && reqBody.employee_code)
		reqBody.nameCode = reqBody.name + ' (' + reqBody.employee_code + ')';

    Driver.findOneAndUpdateAsync({
            _id: id
        }, {
            $set: reqBody
        }, {
            new: true
        })
        .then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.updateDriverIdSetPush = function(id, newData, next) {
    var newDetails = {};
    if (newData.toSet) {
        newDetails["$set"] = newData.toSet;
    }
    if (newData.toPush) {
        newDetails["$push"] = newData.toPush;
    }
    Driver.findOneAndUpdateAsync({
            _id: id
        }, newDetails, {
            new: true
        })
        .then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.deleteDriverId = function(id, next) {
    Driver.deleteAsync({
            _id: id
        })
        .then(function(removed) {
            return next(null, removed);
        }).catch(function(err) {
            return next(err);
        });
};


var allowedSearchFields = {
    "_id": 1,
    "employee_code": 1,
    "name": 1,
    "father_name": 1,
    "guarantor_name": 1,
    "insurance_policy_number": 1,
    "date_of_joining": 1,
    "date_of_birth": 1,
    "blood_group": 1,
    "gender": 1,
	"from":1,
	"to":1,
    "license_no": 1,
    "vehicle_assigned_reg_name": 1,
    "vehicle_assigned_type": 1,
    "drivers": 1,
	"clientId":1,
	"blacklisted":1,
	"passportNo":1,
	"deleted":1
};


function createDriverAggrFilter(reqQuery) {
    let obj = {};

    for (let key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === 'from') {
				let startDate = new Date(reqQuery[key]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (!reqQuery.dateType || reqQuery.dateType === 'last_modified_at') {
					obj["last_modified_at"] = obj["last_modified_at"] || {};
					obj["last_modified_at"].$gte = startDate;
				}
			} else if (key === 'to') {
				let endDate = new Date(reqQuery[key]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (!reqQuery.dateType || reqQuery.dateType === 'last_modified_at') {
					obj["last_modified_at"] = obj["last_modified_at"] || {};
					obj["last_modified_at"].$lte = endDate;
				}
			}
            else if (key === "guarantor_name" ||
				key === "father_name" ||
				key === "passportNo" ||
				key === "license_no" ||
				key === "vehicle_assigned_reg_name") {
                obj[key] = new RegExp(reqQuery[key].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
            }else if (key === "name") {
				obj['$or'] = obj['$or'] || [];
				obj['$or'].push({
					'name': new RegExp(reqQuery[key].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i')
				}, {
					'code': new RegExp(reqQuery[key].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i')
				}, {
					'employee_code': new RegExp(reqQuery[key].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i')
				});
			}
            else if (key === "_id") {
                obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
            }else if(key === 'drivers'){
                obj['license_no'] = {$in: reqQuery[key]};
            }else if(key === 'blacklisted'){
				obj[key] = reqQuery[key] === 'true' ? true : {$not: {$eq: true}}
            }else if(key === 'deleted'){
				obj[key] = reqQuery[key] === 'true' ? true : {$ne: true}
            } else {
                obj[key] = reqQuery[key];
            }
        }
    }
    return obj;
}

module.exports.searchDriver = function(reqQuery, trim, next) {

	const aggrFilter = [];

	aggrFilter.push(
		{
			$match: createDriverAggrFilter(reqQuery)
		},
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
				path:"$account",
				preserveNullAndEmptyArrays: true
			}
		});
	if (reqQuery.sort) {
		aggrFilter.push({
			$sort: {
				created_at: parseInt(reqQuery.sort)
			}
		});
	}
	if (trim) {
		var projection = {
			_id: 1,
			name: 1,
			license_no: 1,
			employee_code: 1,
			prim_contact_no: 1
		};
		aggrFilter.push({
			$project: projection
		});
	}
	var datacursor = Driver.aggregate(aggrFilter);
	aggrFilter.push({
		$group: {
			_id: null,
			count: {
				$sum: 1
			}
		}
	});
	var countCursor = Driver.aggregate(aggrFilter);
	var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

	if (no_of_documents > NO_OF_DOCS) {
		no_of_documents = NO_OF_DOCS;
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
			var driverCount = countArr[0].count;
			var no_of_pages;
			if (driverCount / no_of_documents > 1) {
				no_of_pages = Math.ceil(driverCount / no_of_documents);
			} else {
				no_of_pages = 1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			datacursor.exec(function(err, drivers) {
				var driver0 = JSON.parse(JSON.stringify(drivers));
				//console.log(leads0);
				//var leads_ = makeLeadsResponseKeyChanges(leads0);
				if (err) {
					return next(err);
				}
				var objToReturn = {};
				objToReturn.drivers = driver0;
				objToReturn.pages = no_of_pages;
				objToReturn.count = driverCount;
				return next(null, objToReturn);
			});
		} else {
			var objToReturn = {};
			objToReturn.drivers = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};


module.exports.driverReport = async function(req, res, next){
	let reqQuery = req.query;
	const aggrQuery = [];

	aggrQuery.push(
		{
			$match: createDriverAggrFilter(reqQuery)
		},
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
				path:"$account",
				preserveNullAndEmptyArrays: true
			}
		});

	 if(reqQuery.download && reqQuery.downloadCSV){
		let downloadPath = await new csvDownload(Driver, aggrQuery, {
			filePath: `${reqQuery.clientId}/Driver`,
			fileName: `Driver_Reports_${moment().format('DD-MM-YYYY')}`
		}).exec(driverReports.transform, req);

		return downloadPath;
	}
	else if(reqQuery.download && !reqQuery.downloadCSV){
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 1000};
		 return await serverSidePage.requestData(Driver, oQuery);
	}
}

module.exports.makeDriverReport = function(data){
	var driver = {};
	for(var i = 0; i < data.length; i++){
		if(!driver[data[i].driver.employee_code]) {
			data[i].driver.trips = [];
			driver[data[i].driver.employee_code] = data[i].driver;
		}
		data[i].driver.trips.push(data[i]);
	}
	return driver;
};
