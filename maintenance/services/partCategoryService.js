/**
 * Created by manish on 21/12/16.
 */
var winston = require('winston');
var PartCategory = promise.promisifyAll(commonUtil.getMaintenanceModel('partCategory'));
var NO_OF_DOCS = 15;

module.exports.addPartCategory = function(reqBody,next) {
    var partCategory = new PartCategory(reqBody);
    partCategory.saveAsync(reqBody)
        .then(function(partCategory) {
            winston.info("added part category",JSON.stringify(partCategory));
            return next(null, partCategory);
        })
        .catch(function(err) {
            winston.error("error in add part category:" + err);
            return next(err);
        });
};

module.exports.updatePartCategoryById = function(id,reqBody,next) {
    PartCategory.findByIdAndUpdateAsync(id,{$set:reqBody},{new:true})
        .then(function(partCategory) {
            winston.info("updated part category", JSON.stringify(partCategory));
            return next(null, partCategory);
        }).catch(function(err) {
        winston.error("error in update part category" + err);
        return next(err);
    });
};

module.exports.findPartCategoryById = function(id,next) {
    PartCategory.findByIdAsync(id)
        .then(function (partCategory) {
            winston.info("found part category", JSON.stringify(partCategory));
            return next(null, partCategory);
        })
        .catch(function (err) {
            winston.error("error in find part category:" + err);
            return next(err);
        });
};

module.exports.findPartCategoryByQuery = function(query,next) {
    PartCategory.findAsync(query)
        .then(function (partCategory) {
            winston.info("found part category", JSON.stringify(partCategory));
            return next(null, partCategory);
        })
        .catch(function (err) {
            winston.error("error in find part category:" + err);
            return next(err);
        });
};

module.exports.deletePartCategoryById = function(id,next) {
    var remove = {};
    remove._id= id;
    PartCategory.removeAsync(remove)
        .then(function(removed) {
            winston.info("removed part category ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing part category:" + err);
            return next(err);
        });
};

/**************search part category**********************/
var allowedSearchFieldsCategory = {"_id":1,"name":1,"code":1,"clientId":1};


function createPartCategoryAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsCategory)) {
            if (key === "name") {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id" ){
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


module.exports.searchPartCategory = function(reqQuery,next) {
    var aggrFilter  = createPartCategoryAggrFilter(reqQuery);
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
    /*if (!reqQuery.all) {
        aggrFilter.push({$limit:parseInt(no_of_documents)});
    }else{
        aggrFilter.push({$limit:1000000});
    }*/

    var datacursor = PartCategory.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = PartCategory.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }

    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }
        if (countArr.length>0){
            var partCategoryCount = countArr[0].count;
            var no_of_pages;
            if(partCategoryCount/no_of_documents>1){
                no_of_pages = Math.ceil(partCategoryCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (!reqQuery.all){
                datacursor.limit(parseInt(no_of_documents));
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, partCategories) {
                if (err){
                    console.log("error" + JSON.stringify(err));
                    console.log("partCategories" + partCategories);
                    return next(err);
                }
                var partCategory0 = JSON.parse(JSON.stringify(partCategories));
                var objToReturn = {};
                objToReturn.partCategories = partCategory0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = partCategoryCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.partCategories = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
