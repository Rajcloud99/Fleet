/**
 * Created by bharath on 28/04/17.
 */
/**
 * Modified by Pratik on 29/04/17.
 */

var TyreRetread = promise.promisifyAll(commonUtil.getMaintenanceModel('TyreRetread'));
var NO_OF_DOCS = 15;

module.exports.addTyreRetread = function(reqBody,next) {
    idUtil.generateTyreRetreadSlipNumberAsync({clientId:reqBody.clientId})
        .then(function (slip_number) {
            reqBody.issue_slip_no=slip_number;
            var tyreRetread = new TyreRetread(reqBody);
            tyreRetread.saveAsync(reqBody)
                .then(function(added) {
                    return next(null, added);
                })
                .catch(function(err) {
                    return next(err);
                });
        })
        .catch(function(err) {
            return next(err);
        });
};


module.exports.updateTyreRetreadById = function(id,reqBody,next) {
    TyreRetread.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
        .then(function(updated) {
            return next(null, updated);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.findTyreRetreadById = function(id,next) {
    TyreRetread.findByIdAsync(id)
        .then(function (data) {
            return next(null, data);
        }).catch(function (err) {
        return next(err);
    });
};

var allowedSearchFields = {"_id":1,"clientId":1,"tyre_number":1,"issue_date":1,"return_date":1,"bill_no":1,"bill_date":1,"issue_slip_no":1,"vendor_name":1,"vendorId":1,"vendor_id":1,"expected_return_date":1,"returned":1};

function createTyreRetreadAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key==="_id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }else if (key==="returned"){
                obj ={};
                obj[key]= reqBody[key] == "true"?true:false;
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

module.exports.searchTyreRetread = function(reqQuery,next) {
    var aggrFilter  = createTyreRetreadAggrFilter(reqQuery);
    var no_of_documents = parseInt(reqQuery.no_of_docs) || NO_OF_DOCS;
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
    if (!reqQuery.all){
        aggrFilter.push({$limit:parseInt(no_of_documents)});
    }else{
        aggrFilter.push({$limit:10000});
    }
    var datacursor = TyreRetread.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = TyreRetread.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (parseInt(reqQuery.skip)-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }
        if (countArr.length>0){
            var TyreRetreadCount = countArr[0].count;
            var no_of_pages;
            if(TyreRetreadCount/no_of_documents>1){
                no_of_pages = Math.ceil(TyreRetreadCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            datacursor.exec(function (err, TyreRetreads) {
                var TyreRetreads0 = JSON.parse(JSON.stringify(TyreRetreads));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.tyreRetreads = TyreRetreads0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = TyreRetreadCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.tyreRetreads = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};

