/**
 * Created by manish on 9/8/16.
 */
var Role = promise.promisifyAll(commonUtil.getModel('role'));
var NO_OF_DOCS =15;


var saveRole = function (reqBody,next){
    var role = new Role(reqBody);
    role.saveAsync(reqBody)
        .then(function(role) {
            winston.info("added role",JSON.stringify(role));
            return next(null, role);
        })
        .catch(function(err) {
            winston.error("error in add role:" + err);
            return next(err);
        });
};

module.exports.addRole = function(reqBody,next) {
    var role = new Role(reqBody);
    role.saveAsync(reqBody)
        .then(function(role) {
            winston.info("added role",JSON.stringify(role));
            return next(null, role);
        })
        .catch(function(err) {
            winston.error("error in add role:" + err);
            return next(err);
        });
};

module.exports.addRoleIfRequired = function(reqBody,next) {
    var role = new Role(reqBody);
    Role.findOneAsync(reqBody)
    .then(function(res){
        if(res) return next(null, role);
        return role.saveAsync(reqBody);
    })
    .then(function(role) {
        winston.info("added role",JSON.stringify(role));
        return next(null, role);
    })
    .catch(function(err) {
        winston.error("error in add role:" + err);
        return next(err);
    });
};

module.exports.updateRoleById = function(id,reqBody,next) {
    Role.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(role) {
            winston.info("updated role ", JSON.stringify(role));
            return next(null, role);
        })
        .catch(function(err) {
            winston.error("error in update role:" + err);
            return next(err);
        });
};

module.exports.updateRoleByQuery = function(query,reqBody,next) {
    Role.findOneAndUpdateAsync(query,{$set:reqBody},{new:true})
        .then(function(role) {
            winston.info("updated role ", JSON.stringify(role));
            return next(null, role);
        })
        .catch(function(err) {
            winston.error("error in update role:" + err);
            return next(err);
        });
};

module.exports.findRoleById = function(id, next) {
    Role.findByIdAsync({_id:id})
        .then(function (role) {
            return next(null, role);
        }).catch(function (err) {
            winston.error("error in find role:" + err);
            return next(err);
    });
};

module.exports.findRoleByQuery = function(query, next) {
    Role.findAsync(query)
        .then(function (role) {
            return next(null, role);
        }).catch(function (err) {
        winston.error("error in find role:" + err);
        return next(err);
    });
};

module.exports.deleteRoleById = function(id, next) {
    Role.removeAsync({_id:id})
        .then(function(removed) {
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove role " + err);
            return next(err);
        });
};

module.exports.deleteRoleByQuery = function(query, next) {
    Role.removeAsync(query)
        .then(function(removed) {
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove role " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"role":1,"department":1,"clientId":1};


function createRoleAggrFilter(reqQuery){
    var aggrFilter = [];
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name" || key==="department") {
                var obj ={};
                obj[key]= {$regex: reqQuery[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key ==="_id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqQuery[key]);
                aggrFilter.push({$match: obj});
            }else {
                obj ={};
                obj[key]= reqQuery[key];
                aggrFilter.push({$match: obj});
            }
        }
    }

    return aggrFilter;
}

module.exports.searchRole = function(reqQuery, next) {
    console.log("request query"+ JSON.stringify(reqQuery));
    var aggrFilter  = createRoleAggrFilter(reqQuery);

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {_id:1,role:1,department:1};
        aggrFilter.push({$project:projection});
    }
    if (reqQuery.config){
        var projection = {_id:1,role:1,department:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = Role.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Role.aggregate(aggrFilter);
    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

    if(no_of_documents > NO_OF_DOCS){
        no_of_documents = NO_OF_DOCS;
    }

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }

        if (countArr.length>0){
            var count = countArr[0].count;
            var no_of_pages;
            if(count/no_of_documents>1){
                no_of_pages = Math.ceil(roleTcount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            datacursor.limit(parseInt(no_of_documents));
            datacursor.exec(function (err, roles) {
                var roles = JSON.parse(JSON.stringify(roles));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.roles = roles;
                objToReturn.pages = no_of_pages;
                objToReturn.count = count;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.roles = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
