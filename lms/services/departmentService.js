/**
 * Created by manish on 9/8/16.
 */
var Department = promise.promisifyAll(commonUtil.getModel('department'));
var NO_OF_DOCS =15;

function generateDepartmentId(){
    var initCount=10000;
    var count = app_constant.departmentCount;
    return initCount+(++count);
}

module.exports.addDepartment = function(reqQuery,next) {
    var department = new Department(reqQuery);
    department.saveAsync(reqQuery)
        .then(function(department) {
            winston.info("added department",JSON.stringify(department));
            return next(null, department);
        })
        .catch(function(err) {
            winston.error("error in add department:" + err);
            return next(err);
        });
};

module.exports.addDepartmentIfRequired = function(reqQuery,next) {
    var department = new Department(reqQuery);
    Department.findOneAsync(reqQuery)
    .then(function(dept){
        if(dept) return next(null, dept);
        return department.saveAsync(reqQuery);
    })
    .then(function(department) {
        winston.info("added department",JSON.stringify(department));
        return next(null, department);
    })
    .catch(function(err) {
        winston.error("error in add department:" + err);
        return next(err);
    });
};

module.exports.updateDepartmentById = function(id,reqQuery,next) {
    Department.findOneAndUpdateAsync({_id:id},{$set:reqQuery},{new:true})
        .then(function(department) {
            winston.info("updated department ", JSON.stringify(department));
            return next(null, department);
        })
        .catch(function(err) {
            winston.error("error in update department:" + err);
            return next(err);
        });
};

module.exports.updateDepartmentByQuery = function(query,reqBody,next) {
    Department.findOneAndUpdateAsync(query,{$set:reqBody},{new:true})
        .then(function(department) {
            winston.info("updated department ", JSON.stringify(department));
            return next(null, department);
        })
        .catch(function(err) {
            winston.error("error in update department:" + err);
            return next(err);
        });
};

module.exports.findDepartmentById = function(id,next) {
    Department.findAsync({_id:id})
        .then(function (department) {
            winston.info("found department", JSON.stringify(department));
            return next(null, department);
        }).catch(function (err) {
        winston.error("error in find department:" + err);
        return next(err);
    });
};

module.exports.findDepartmentByQuery = function(query,next) {
    Department.findAsync(query)
        .then(function (department) {
            winston.info("found department", JSON.stringify(department));
            return next(null, department);
        }).catch(function (err) {
        winston.error("error in find department:" + err);
        return next(err);
    });
};

module.exports.deleteDepartmentById = function(id,next) {
    Department.deleteAsync({_id:id})
        .then(function(removed) {
            winston.info("removed department",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove department " + err);
            return next(err);
        });
};

module.exports.deleteDepartmentByQuery = function(query,next) {
    Department.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed department",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove department " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"name":1,"code":1,"clientId":1};


function createDepartmentAggrFilter(reqQuery){
    var aggrFilter = [];
    aggrFilter.push({$match:{deleted:{$ne:true}}});
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name") {
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

module.exports.searchDepartmentByQuery = function(reqQuery, trim, next) {
    var aggrFilter  = createDepartmentAggrFilter(reqQuery);
    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,name:1,code:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = Department.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Department.aggregate(aggrFilter);
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
                no_of_pages = Math.ceil(routeTcount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            datacursor.limit(parseInt(no_of_documents));
            datacursor.exec(function (err, departments) {
                var department0 = JSON.parse(JSON.stringify(departments));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.departments = department0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = count;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.departments = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
