/**
 * Created by manish on 6/1/17.
 */
/**
 * Created by manish on 22/12/16.
 */
var winston = require('winston');
var UserPref = promise.promisifyAll(commonUtil.getModel('userPref'));
var NO_OF_DOCS = 15;

module.exports.addUserPref = function(reqBody,next) {
    var userPref = new UserPref(reqBody);
    userPref.saveAsync(reqBody)
        .then(function(userPref) {
            winston.info("added userPref",JSON.stringify(userPref));
            return next(null, userPref);
        })
        .catch(function(err) {
            winston.error("error in add userPref:" + err);
            return next(err);
        });
};

module.exports.updateUserPrefById = function(id,reqBody,next) {
    UserPref.findByIdAndUpdateAsync(id,{$set:reqBody},{new:true})
        .then(function(userPref) {
            winston.info("updated userPref", JSON.stringify(userPref));
            return next(null, userPref);
        }).catch(function(err) {
        winston.error("error in update userPref" + err);
        return next(err);
    });
};

module.exports.findUserPrefById = function(id,next) {
    UserPref.findByIdAsync(id)
        .then(function (userPref) {
            winston.info("found userPref", JSON.stringify(userPref));
            return next(null, userPref);
        })
        .catch(function (err) {
            winston.error("error in find userPref:" + err);
            return next(err);
        });
};

module.exports.findUserPrefByQuery = function(query,next) {
    UserPref.findAsync(query)
        .then(function (userPref) {
            winston.info("found userPref", JSON.stringify(userPref));
            return next(null, userPref);
        })
        .catch(function (err) {
            winston.error("error in find userPref:" + err);
            return next(err);
        });
};

module.exports.deleteUserPrefById = function(id,next) {
    var remove = {};
    remove._id= id;
    UserPref.removeAsync(remove)
        .then(function(removed) {
            winston.info("removed userPref ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing userPref:" + err);
            return next(err);
        });
};

/**************search userPref**********************/
var allowedSearchFieldsCategory = {"_id":1,"employeeId":1,"code":1};

function createUserPrefAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsCategory)) {
            if (key === "name") {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id" || key==="clientId"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }else {
                obj ={};
                obj[key]= reqBody[key];
                aggrFilter.push({$match: obj});
            }
        }
    }
    return aggrFilter;
}


module.exports.searchUserPref = function(reqQuery,next) {
    var aggrFilter  = createUserPrefAggrFilter(reqQuery);

    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {$project :{_id:1,name:1,code:1}};
        aggrFilter.push(projection);
    }
    var datacursor = UserPref.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = UserPref.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }

    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }
        if (countArr.length>0){
            var userPrefCount = countArr[0].count;
            var no_of_pages;
            if(userPrefCount/no_of_documents>1){
                no_of_pages = Math.ceil(userPrefCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, userPrefs) {
                var userPref0 = JSON.parse(JSON.stringify(userPrefs));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.userPrefs = userPref0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = userPrefCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.userPrefs = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
