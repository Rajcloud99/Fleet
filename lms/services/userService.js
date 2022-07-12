var Promise = require('bluebird');
var winston = require('winston');
var NO_OF_DOCS = 10;
var User = Promise.promisifyAll(commonUtil.getModel('user'));
let Branch = commonUtil.getModel('branch');
var allowedSearchFields = ["_id", "access", "userId", "full_name","created_by_employee_code", "billBook_type", "clientId", "role", "user_type", "not_show",
	"mechanic", "supervisor", "deleted", 'from', 'to', 'clientIdv2'];

module.exports.addUser = function(user, next) {
     var hash = encrypt(user.password);
     //winston.info('rh2');
     user.pwd = hash;
     var newUser = new User(user);
     //winston.info("Created user");
     return newUser.saveAsync()
         .then(function(user) {
             console.log("added user " + JSON.stringify(user));
             //winston.info("Saved user");
             return next(null,user);
         }).catch(function(err) {
             winston.error("Error in addUser: " + err);
             return next(err);
         });
 };

function getUserByEmail(email, next) {
	if (email === null) {
		return next('Email is missing');
	}
	User.findOneAsync({
		'email': email.toLowerCase()
	})
	.then(
		function(user) {
			//winston.info('Obtained user');
			return next(null, user);
		}
	)
	.catch(
		function(err) {
			winston.info('userservice -> getUser -> catch');
			winston.error("Error in getUser: " + err);
			return next(err);
		}
	);
 }
module.exports.getUserByEmail = getUserByEmail;

function getUserByUSERID(uid, next) {
	//winston.info('Obtained user fun:'+JSON.stringify(uid));
	if (uid === null) {
		return next('USERID is missing');
	}
	User.findOne({
		'userId': uid
	})
	.populate('branch')
	.exec(function (err, user) {
			if (err){
				winston.error("Error in getUser: " + err);
				return next(err)
			}
			//winston.info('Obtained user:'+JSON.stringify(user));
			if(user){
				return next(null, user);
			}else{
				return next(null, null);
			}
	});


	/*.then(function(user) {
			winston.info('Obtained user:'+JSON.stringify(user));
			if(user){
				return next(null, user);
			}else{
				return next(null, null);
			}

		})
	.catch(
		function(err) {
			//winston.info('userservice -> getUser -> catch');
			winston.error("Error in getUser: " + err);
			return next(err);
		}
	);*/
 }

module.exports.getUserByUSERID = getUserByUSERID;

module.exports.verifyUser = function(userid, password, next) {
	//winston.info('verifyUser entered:'+ userid);
	//console.log(userid);
	Promise.promisify(getUserByUSERID) (userid)
	.then(
		function(user) {
			//winston.info('userservice: obtained user:'+JSON.stringify(user));
			if (user === null) return next(null, false, {'status': 'ERROR', 'error_message': 'No such username'});
			var toMatch = decrypt(user.pwd);
			console.log(userid,"tomatch:"+toMatch,password);
			if (toMatch === password){
				return next(null, user);
			}else{
				winston.info('isMatch: false');
				return next(null, false, {'status':'ERROR', 'error_message':'Incorrect Credentials'});
			}
		}
	)
	.catch(
		function(err) {
			return next(err);
		}
	);
 };

module.exports.updateUserById = function(id,reqBody,next) {
    User.findByIdAndUpdate(id,{$set:reqBody},{new:true})
        .then(function(user) {
            winston.info("updated user ", JSON.stringify(user));
            return next(null, user);
        })
        .catch(function(err) {
            winston.error("error in update user:" + err);
            return next(err);
        });
};

module.exports.updateUserByQuery = function(query,reqBody,next) {
    User.findOneAndUpdateAsync(query,{$set:reqBody},{new:true})
        .then(function(user) {
            winston.info("updated user ", JSON.stringify(user));
            return next(null, user);
        })
        .catch(function(err) {
            winston.error("error in update user:" + err);
            return next(err);
        });
};

module.exports.findUserById = function(id, next) {
	User.findOneAsync({_id:id})
	.then(
		function(user) {
			// winston.info("Found user: " + JSON.stringify(user));
			if (!user) return next(null, false);
			return next(null, user);
		}
	)
	.catch(
		function(err) {
			return next(err);
		}
	);
 };

module.exports.findUsersByQuery = function(query, next) {
	User.findAsync(query)
		.then(function(users) {
				return next(null, users);
			}).catch(
			function(err) {
				return next(err);
			}
		);
};

module.exports.deleteUserById = function(id, next) {
	User.findOneAndUpdateAsync({_id:id},{$set:{deleted:true}},{new:true})
	.then(function() {
		return next(null);
	}).catch(
	    function (err) {
            winston.error("error in remove user " + err);
            return next(err);
        });
};

module.exports.searchUser = function(req, next) {

	let oQuery = {
		queryFilter: createUserAggrFilter(req),
		no_of_docs: req.query.no_of_docs || 10,
		skip: req.query.skip || 1
	};
	oQuery.queryFilter.deleted = false;
	if(req.query.sort){
		oQuery.sort = {full_name:1,created_at:parseInt(req.query.sort)};
	}

	oQuery.populate = [
		{path: 'branch'},
		{path: 'access'}
	];

	otherUtil.findPagination(User, oQuery, function (err, data) {
		if (err) {
			next(err);
		}

		next(null, {
			users: data.data,
			pages: data.pages,
			count: data.count
		});
	});
};

module.exports.findV2 = function(query, projection = {}){
	return User.find(query, projection).lean();
};

module.exports.updateV2 = function(query, update = {}, options = {}){
	let updateQuery = {};
	if(update.set){
		Object.assign(updateQuery, {
			$set: update.set
		});
	}

	if(update.unset){
		Object.assign(updateQuery, {
			$unset: update.unset
		});
	}

	if(update.push){
		Object.assign(updateQuery, {
			$push: update.push
		});
	}

	if(update.addToSet){
		Object.assign(updateQuery, {
			$addToSet: update.addToSet
		});
	}

	if(update.pull){
		Object.assign(updateQuery, {
			$pull: update.pull
		});
	}

	if(Object.keys(update).length)
		return User.update(query, updateQuery, options).lean();

	return false;
};

function createUserAggrFilter(req){
	let oQuery = req.query;

	let oFilter = {};

	for(let key in oQuery){
		if (oQuery.hasOwnProperty(key) && otherUtil.isAllowedFilter(key, allowedSearchFields)) {
			if (key === "full_name") {
				oFilter.$or = [
					{
						full_name: {$regex: oQuery[key], $options: 'i'}
					},{
						userId: {$regex: oQuery[key], $options: 'i'}
					}
				];
			}else if (key === "created_by_employee_code") {
				oFilter['created_by_employee_code'] = {$regex: oQuery[key], $options: 'i'};
			}else if (key==="_id"){
				oFilter[key]= mongoose.Types.ObjectId(oQuery[key]);
			}else if (key==="clientIdv2"){        // filtering user clientId wise with superAdmin login
				oFilter['clientId']= {$in: Array.isArray(oQuery[key]) ? oQuery['key'] : [oQuery[key]]};
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
