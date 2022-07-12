/**
 * Created by manish on 6/1/17.
 */

var DepartmentBranch = promise.promisifyAll(commonUtil.getModel('departmentBranch'));
var NO_OF_DOCS =15;

module.exports.addDepartmentBranch = function(reqBody,next) {
    idUtil.generateDepartmentBranchIdAsync(reqBody.branchId,reqBody.depMasterCode)
        .then(function(departmentBranchId){
            reqBody.depId = departmentBranchId;
            var departmentBranch = new DepartmentBranch(reqBody);
            departmentBranch.saveAsync(reqBody)
                .then(function(departmentBranch) {
                    winston.info("added departmentBranch",JSON.stringify(departmentBranch));
                    return next(null, departmentBranch);
                })
                .catch(function(err) {
                    winston.error("error in add departmentBranch:" + err);
                    return next(err);
                });
        }).catch(next);
};

module.exports.addDepartmentBranchIfRequired = function(reqQuery,next) {
    var departmentBranch = new DepartmentBranch(reqQuery);
    DepartmentBranch.findOneAsync(reqQuery)
        .then(function(dept){
            if(dept) return next(null, dept);
            return departmentBranch.saveAsync(reqQuery);
        })
        .then(function(departmentBranch) {
            winston.info("added departmentBranch",JSON.stringify(departmentBranch));
            return next(null, departmentBranch);
        })
        .catch(function(err) {
            winston.error("error in add departmentBranch:" + err);
            return next(err);
        });
};

module.exports.updateDepartmentBranchById = function(id,reqQuery,next) {
    DepartmentBranch.findOneAndUpdateAsync({_id:id},{$set:reqQuery},{new:true})
        .then(function(departmentBranch) {
            winston.info("updated departmentBranch ", JSON.stringify(departmentBranch));
            return next(null, departmentBranch);
        })
        .catch(function(err) {
            winston.error("error in update departmentBranch:" + err);
            return next(err);
        });
};

module.exports.updateDepartmentBranchByQuery = function(query,reqBody,next) {
    DepartmentBranch.findOneAndUpdateAsync(query,{$set:reqBody},{new:true})
        .then(function(departmentBranch) {
            winston.info("updated departmentBranch ", JSON.stringify(departmentBranch));
            return next(null, departmentBranch);
        })
        .catch(function(err) {
            winston.error("error in update departmentBranch:" + err);
            return next(err);
        });
};

module.exports.findDepartmentBranchById = function(id,next) {
    DepartmentBranch.findAsync({_id:id})
        .then(function (departmentBranch) {
            return next(null, departmentBranch);
        }).catch(function (err) {
        winston.error("error in find departmentBranch:" + err);
        return next(err);
    });
};

module.exports.findDepartmentBranchByQuery = function(query,next) {
    DepartmentBranch.findAsync(query)
        .then(function (departmentBranch) {
            return next(null, departmentBranch);
        }).catch(function (err) {
        winston.error("error in find departmentBranch:" + err);
        return next(err);
    });
};

module.exports.deleteDepartmentBranchById = function(id,next) {
    DepartmentBranch.removeAsync({_id:id})
        .then(function(removed) {
            winston.info("removed departmentBranch",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove departmentBranch " + err);
            return next(err);
        });
};

module.exports.deleteDepartmentBranchByQuery = function(query,next) {
    DepartmentBranch.removeAsync(query)
        .then(function(removed) {
            winston.info("removed departmentBranch",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove departmentBranch " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"depName":1,"code":1,"clientId":1,"depName":1,branchId:1};


function createDepartmentBranchAggrFilter(reqQuery){
    var aggrFilter = [];
    aggrFilter.push({$match:{deleted:{$ne:true}}});
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "depName") {
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

module.exports.searchDepartmentBranchByQuery = function(reqQuery, trim, next) {
    var aggrFilter  = createDepartmentBranchAggrFilter(reqQuery);

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,depame:1,code:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = DepartmentBranch.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = DepartmentBranch.aggregate(aggrFilter);
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
            datacursor.exec(function (err, departmentBranchs) {
                var departmentBranch0 = JSON.parse(JSON.stringify(departmentBranchs));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.departmentBranchs = departmentBranch0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = count;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.departmentBranchs = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
