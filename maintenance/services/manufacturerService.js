/**
 * Created by manish on 21/12/16.
 */

var winston = require('winston');
var Manufacturer = promise.promisifyAll(commonUtil.getMaintenanceModel('manufacturer'));
var NO_OF_DOCS = 15;

module.exports.addManufacturer = function(reqBody,next) {
    var manufacturer = new Manufacturer(reqBody);
    manufacturer.saveAsync(reqBody)
        .then(function(manufacturer) {
            winston.info("added manufacturer",JSON.stringify(manufacturer));
            return next(null, manufacturer);
        })
        .catch(function(err) {
            winston.error("error in add manufacturer:" + err);
            return next(err);
        });
};

module.exports.updateManufacturerById = function(id,reqBody,next) {
    Manufacturer.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
        .then(function(manufacturer) {
            winston.info("updated manufacturer ", JSON.stringify(manufacturer));
            return next(null, manufacturer);
        })
        .catch(function(err) {
            winston.error("error in update manufacturer:" + err);
            return next(err);
        });
};

module.exports.findManufacturerById = function(id,next) {
    Manufacturer.findAsync({_id:id})
        .then(function (manufacturer) {
            winston.info("found manufacturer", JSON.stringify(manufacturer));
            return next(null, manufacturer);
        }).catch(function (err) {
        winston.error("error in find manufacturer:" + err);
        return next(err);
    });
};

module.exports.findManufacturerByQuery = function(query,next) {
    Manufacturer.findAsync(query)
        .then(function (manufacturer) {
            winston.info("found manufacturer", JSON.stringify(manufacturer));
            return next(null, manufacturer);
        }).catch(function (err) {
        winston.error("error in find manufacturer:" + err);
        return next(err);
    });
};

module.exports.deleteManufacturerById = function(id,next) {
    Manufacturer.removeAsync({_id:mongoose.Types.ObjectId(id)})
        .then(function(removed) {
            winston.info("removed manufacturer",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove manufacturer " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"name":1};

function createManufacturerAggrFilter(reqQuery){
    var aggrFilter = [];
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name") {
                var obj ={};
                obj[key]= {$regex: reqQuery[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id"){
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

module.exports.searchManufacturer = function(reqQuery, next) {
    var aggrFilter  = createManufacturerAggrFilter(reqQuery);
    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }
    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {_id:1,name:1,code:1};
        aggrFilter.push({$project:projection});
    }

    var datacursor = Manufacturer.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});

    var countCursor = Manufacturer.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }

        if (countArr.length>0){
            var manufacturerCount = countArr[0].count;
            var no_of_pages;
            if(manufacturerCount/no_of_documents>1){
                no_of_pages = Math.ceil(manufacturerCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, manufacturers) {
                var manufacturers0 = JSON.parse(JSON.stringify(manufacturers));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.manufacturers = manufacturers0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = manufacturerCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.manufacturers = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};






