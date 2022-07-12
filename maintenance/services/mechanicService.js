/**
 * Created by manish on 22/12/16.
 */
var winston = require('winston');
var Mechanic = promise.promisifyAll(commonUtil.getMaintenanceModel('mechanic'));
var NO_OF_DOCS = 15;

module.exports.addMechanic = function(reqBody,next) {
    var mechanic = new Mechanic(reqBody);
    mechanic.saveAsync(reqBody)
        .then(function(mechanic) {
            winston.info("added mechanic",JSON.stringify(mechanic));
            return next(null, mechanic);
        })
        .catch(function(err) {
            winston.error("error in add mechanic:" + err);
            return next(err);
        });
};

module.exports.updateMechanicById = function(id,reqBody,next) {
    Mechanic.findByIdAndUpdateAsync(id,{$set:reqBody},{new:true})
        .then(function(mechanic) {
            winston.info("updated mechanic", JSON.stringify(mechanic));
            return next(null, mechanic);
        }).catch(function(err) {
        winston.error("error in update mechanic" + err);
        return next(err);
    });
};

module.exports.findMechanicById = function(id,next) {
    Mechanic.findByIdAsync(id)
        .then(function (mechanic) {
            winston.info("found mechanic", JSON.stringify(mechanic));
            return next(null, mechanic);
        })
        .catch(function (err) {
            winston.error("error in find mechanic:" + err);
            return next(err);
        });
};

module.exports.findMechanicByQuery = function(query,next) {
    Mechanic.findAsync(query)
        .then(function (mechanic) {
            winston.info("found mechanic", JSON.stringify(mechanic));
            return next(null, mechanic);
        })
        .catch(function (err) {
            winston.error("error in find mechanic:" + err);
            return next(err);
        });
};

module.exports.deleteMechanicById = function(id,next) {
    var remove = {};
    remove._id= id;
    Mechanic.removeAsync(remove)
        .then(function(removed) {
            winston.info("removed mechanic ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing mechanic:" + err);
            return next(err);
        });
};

/**************search mechanic**********************/
var allowedSearchFieldsCategory = {"_id":1,"name":1,"code":1,"clientId":1};


function createMechanicAggrFilter(reqBody){
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


module.exports.searchMechanic = function(reqQuery,next) {
    var aggrFilter  = createMechanicAggrFilter(reqQuery);

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
    var datacursor = Mechanic.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Mechanic.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }

    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }
        if (countArr.length>0){
            var mechanicCount = countArr[0].count;
            var no_of_pages;
            if(mechanicCount/no_of_documents>1){
                no_of_pages = Math.ceil(mechanicCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, mechanics) {
                var mechanic0 = JSON.parse(JSON.stringify(mechanics));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.mechanics = mechanic0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = mechanicCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.mechanics = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
