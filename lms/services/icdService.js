/**
 * Created by manish on 31/8/16.
 */
/**
 * Created by manish on 9/8/16.
 */
var ICD = promise.promisifyAll(commonUtil.getModel('icd'));
var NO_OF_DOCS =15;

function generateICDId(){
    var initCount=10000;
    var count = app_constant.icdCount;
    return initCount+(++count);
}

module.exports.addICD = function(reqQuery,next) {
    //reqQuery.icdId = generateICDId();
    var icd = new ICD(reqQuery);
    icd.saveAsync(reqQuery)
        .then(function(icd) {
            //counterUtil.incrementICDCount();
            winston.info("added icd",JSON.stringify(icd));
            return next(null, icd);
        })
        .catch(function(err) {
            winston.error("error in add icd:" + err);
            return next(err);
        });
};

module.exports.updateICDId = function(id,reqQuery,next) {
    ICD.findOneAndUpdateAsync({_id:id},{$set:reqQuery},{new:true})
        .then(function(icd) {
            winston.info("updated icd ", JSON.stringify(icd));
            return next(null, icd);
        })
        .catch(function(err) {
            winston.error("error in update icd:" + err);
            return next(err);
        });
};

module.exports.updateICDQuery = function(query,reqBody,next) {
    ICD.findOneAndUpdateAsync(query,{$set:reqBody},{new:true})
        .then(function(icd) {
            winston.info("updated icd ", JSON.stringify(icd));
            return next(null, icd);
        })
        .catch(function(err) {
            winston.error("error in update icd:" + err);
            return next(err);
        });
};

module.exports.findICDId = function(id,next) {
    ICD.findAsync({_id:id})
        .then(function (icd) {
            winston.info("found icd", JSON.stringify(icd));
            return next(null, icd);
        }).catch(function (err) {
        winston.error("error in find icd:" + err);
        return next(err);
    });
};

module.exports.findICDQuery = function(query,next) {
    ICD.findAsync(query)
        .then(function (icd) {
            winston.info("found route", JSON.stringify(icd));
            return next(null, icd);
        }).catch(function (err) {
        winston.error("error in find route:" + err);
        return next(err);
    });
};

module.exports.deleteICDId = function(id,next) {
    ICD.removeAsync({_id:id})
        .then(function(removed) {
            winston.info("removed icd",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove icd " + err);
            return next(err);
        });
};

module.exports.deleteICDQuery = function(query,next) {
    ICD.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed icd",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove icd " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"port_code":1,"port_name":1};


function createICDAggrFilter(reqQuery){
    var aggrFilter = [];
    aggrFilter.push({$match:{deleted:{$ne:true}}});
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "port_name" || key==="port_code") {
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

module.exports.searchICD = function(reqQuery, trim, getConfig, next) {
    var aggrFilter  = createICDAggrFilter(reqQuery);
    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,icd_full_name:1,icd_display_name:1,
            icdId:1};
        aggrFilter.push({$project:projection});
    }
    if (getConfig){
        var projection = {_id:1,icd_full_name:1,icd_display_name:1,
            icdId:1,icd_theme_color:1,icd_logo:1,icd_favicon:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = ICD.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = ICD.aggregate(aggrFilter);
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
            datacursor.exec(function (err, icds) {
                var icd0 = JSON.parse(JSON.stringify(icds));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.icds = icd0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = count;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.icds = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};






