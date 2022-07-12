/**
 * Created by manish on 3/2/17.
 */
/**
 * Created by nipun on 21/1/16.
 */
var winston = require('winston');
var PrimeMoverTrailerAssociation = promise.promisifyAll(commonUtil.getMaintenanceModel('primeMoverTrailerAssociation'));
var NO_OF_DOCS = 15;

module.exports.addPrimeMoverTrailerAssociation = function(reqBody,next) {
    var primeMoverTrailerAssociation = new PrimeMoverTrailerAssociation(reqBody);
    primeMoverTrailerAssociation.saveAsync(reqBody)
        .then(function(primeMoverTrailerAssociation) {
            winston.info("added PrimeMoverTrailerAssociation",JSON.stringify(primeMoverTrailerAssociation));
            return next(null, primeMoverTrailerAssociation);
        })
        .catch(function(err) {
            winston.error("error in add PrimeMoverTrailerAssociation:" + err);
            return next(err);
        });
};

module.exports.updatePrimeMoverTrailerAssociationById = function(id,reqBody,next) {
    PrimeMoverTrailerAssociation.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
        .then(function(PrimeMoverTrailerAssociation) {
            winston.info("updated PrimeMoverTrailerAssociation ", JSON.stringify(PrimeMoverTrailerAssociation));
            return next(null, PrimeMoverTrailerAssociation);
        })
        .catch(function(err) {
            winston.error("error in update PrimeMoverTrailerAssociation:" + err);
            return next(err);
        });
};

module.exports.findPrimeMoverTrailerAssociationById = function(id,next) {
    PrimeMoverTrailerAssociation.findByIdAsync(id)
        .then(function (PrimeMoverTrailerAssociation) {
            winston.info("found PrimeMoverTrailerAssociation", JSON.stringify(PrimeMoverTrailerAssociation));
            return next(null, PrimeMoverTrailerAssociation);
        }).catch(function (err) {
        winston.error("error in find PrimeMoverTrailerAssociation:" + err);
        return next(err);
    });
};

module.exports.findPrimeMoverTrailerAssociationByQuery = function(query,next) {
    PrimeMoverTrailerAssociation.findAsync(query)
        .then(function (PrimeMoverTrailerAssociation) {
            winston.info("found PrimeMoverTrailerAssociation", JSON.stringify(PrimeMoverTrailerAssociation));
            return next(null, PrimeMoverTrailerAssociation);
        }).catch(function (err) {
        winston.error("error in find PrimeMoverTrailerAssociation:" + err);
        return next(err);
    });
};

module.exports.deletePrimeMoverTrailerAssociationById = function(id,next) {
    PrimeMoverTrailerAssociation.removeAsync({_id:mongoose.Types.ObjectId(id)})
        .then(function(removed) {
            winston.info("removed PrimeMoverTrailerAssociation",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove PrimeMoverTrailerAssociation " + err);
            return next(err);
        });
};

var allowedSearchFields = {"clientId":1,"_id":1,"name":1,"code":1,"isDisassociated":1,"vehicle_reg_no":1,"trailer_no":1};

function createPrimeMoverTrailerAssociationAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name" || key === "code") {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }else if (key==="isDisassociated"){
                obj ={};
                obj[key]= reqBody[key] == "true" ? true : false;
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

module.exports.searchPrimeMoverTrailerAssociation = function(reqQuery,next) {
    var aggrFilter  = createPrimeMoverTrailerAssociationAggrFilter(reqQuery);

    if (reqQuery.sort) {
		aggrFilter.push({
			$sort: {
				created_at: parseInt(reqQuery.sort)
			}
		})
	}
	var datacursor = PrimeMoverTrailerAssociation.aggregate(aggrFilter);
	aggrFilter.push({
		$group: {
			_id: null,
			count: {
				$sum: 1
			}
		}
	});
	var countCursor = PrimeMoverTrailerAssociation.aggregate(aggrFilter);
	var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

	if (no_of_documents > NO_OF_DOCS) {
		no_of_documents = NO_OF_DOCS;
	}

	if (reqQuery.skip) {
		var skip_docs = (reqQuery.skip - 1) * no_of_documents;
		datacursor.skip(parseInt(skip_docs));
	}
	countCursor.exec(function(err, countArr) {
		if (err) {
			return next(err);
		}

		if (countArr.length > 0) {
			var tyreCount = countArr[0].count;
			var no_of_pages;
			if (tyreCount / no_of_documents > 1) {
				no_of_pages = Math.ceil(tyreCount / no_of_documents);
			} else {
				no_of_pages = 1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			else {
				no_of_pages = 1;
			}
			datacursor.exec(function(err, tyres) {
				var pmt = JSON.parse(JSON.stringify(tyres));
				//console.log(leads0);
				//var leads_ = makeLeadsResponseKeyChanges(leads0);
				if (err) {
					return next(err);
				}
				var objToReturn = {};
				objToReturn.primeMoverTrailerAssociations = pmt;
				objToReturn.pages = no_of_pages;
				objToReturn.count = tyreCount;
				return next(null, objToReturn);
			});
		} else {
			var objToReturn = {};
			objToReturn.tyreMasters = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
