var AccessControl = promise.promisifyAll(commonUtil.getModel('accessControl'));
var User = promise.promisifyAll(commonUtil.getModel('user'));

var allowedSearchFields = ["_id", "access", "userId", "name", "billBook_type", "clientId", "role", "user_type", "not_show",
	"mechanic", "supervisor", "deleted", 'from', 'to'];

function createUserAggrFilter(req){
	let oQuery = req.query;

	let oFilter = {};

	for(let key in oQuery){
		if (oQuery.hasOwnProperty(key) && otherUtil.isAllowedFilter(key, allowedSearchFields)) {
			if (key === "name") {
				oFilter[key] = {$regex: oQuery[key], $options: 'i'}
			} else if (key==="_id"){
				oFilter[key]= mongoose.Types.ObjectId(oQuery[key]);
			}else if(key==="clientId" && req.user.role===config.super_admin_role_name){
				/***skip any clientId filtering for super admin only***/
			}else if(key==="not_show"){
				oFilter["role"]= {"$ne":oQuery["not_show"]};
			}else if(key === "mechanic" || key === "supervisor"){
				// obj = {};
				let index = key === "mechanic" ? 3 : 1;
				if(oQuery[key] === 'true'){

					oFilter[key].$or = oFilter[key].$or ? oFilter[key].$or : [];
					oFilter[key].$or.push({user_type:constant.user_type[index]});
					delete oQuery[key];

				}else if (oQuery[key] === 'false'){

					oFilter[key].$and = oFilter[key].$and ? oFilter[key].$and : [];
					oFilter[key].$and.push({user_type:{$ne:constant.user_type[index]}});
					delete oQuery[key];

				}

			}else if(key==="from"){
				let startDate = new Date (oQuery[key]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter["created_at"] = {
					$gte: startDate
				};
			}else if(key==="to"){
				let endDate = new Date (oQuery[key]);
				endDate.setSeconds (59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter["created_at"] = {
					$lte: endDate
				};
			}else {
				oFilter[key]= oQuery[key];
			}
		}
	}

	return oFilter;
}

module.exports.findAceessControlByQuery = function(req, next) {
    let  oQuery = createUserAggrFilter(req);
	oQuery.deleted = false;

    AccessControl.findAsync(oQuery)
        .then(function(data) {
            data = JSON.parse(JSON.stringify(data));
            return next(null, data);
        })
        .catch(next)
};

module.exports.updateAccessControlById = function(id, body, next) {
	body.role = removeFalseRoles(body.role);
    AccessControl.findOneAndUpdateAsync({ _id: id }, { $set: body })
        .then(function(data) {
            return next(null, data);
        })
        .catch(next)
};

module.exports.getRoleName = async function (reqBody, next) {
	let getData = await AccessControl.find({"name": reqBody.accessBody && reqBody.accessBody.name,clientId:reqBody.clientId});
	return getData;
};


module.exports.addAccessControl = function(body, next) {
	body.role = removeFalseRoles(body.role);
	var dataToSave = new AccessControl(body);
    dataToSave.saveAsync()
        .then(function(data) {
            data = JSON.parse(JSON.stringify(data));
            return next(null, data);
        })
        .catch(next)
};

module.exports.deleteAccessControl = function(id, hardDelete, next) {
    if (hardDelete !== true) {
        User.findAsync({ access: mongoose.Types.ObjectId(id) })
            .then(function(data) {
                if (data && data[0]) {
                    return next(null, { message: "This role is being used users", deleted: false });
                } else {
                    AccessControl.findOneAndUpdateAsync({ _id: id }, { $set: { deleted: true } })
                        .then(function(data) {
                            return next(null, { message: "Deleted role", deleted: true });
                        })
                        .catch(next)
                }
            })

    }
    AccessControl.findOneAndUpdateAsync({ _id: mongoose.Types.ObjectId(id) }, { $set: { deleted: true } })
        .then(function(data) {
            return next(null, { message: "Deleted role", deleted: true });
        })
        .catch(next)
};

module.exports.findAccessControlById = function(id, next) {
    AccessControl.findOneAsync({ _id: mongoose.Types.ObjectId(id), deleted: false })
        .then(function(data) {
            return next(null, data);
        })
        .catch(next)
};

function removeFalseRoles(roles) {
	for(let module in roles){
		for(let access in roles[module]){
			if(roles[module][access] !== true){
				delete roles[module][access];
			}
		}
		if(Object.keys(roles[module]).length <1){
			delete roles[module];
		}
	}
	return roles;
}
