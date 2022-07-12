
/**
 * Created by ajay on 3/10/16.
 */
var TripLocation = promise.promisifyAll(commonUtil.getModel('tripLocations'));
var NO_OF_DOCS =15;
var allowedFilter = ["_id","clientId","name","routes","customer_name","customerId","customer__id","address","contact_person_name","contact_person_number"];
var isAllowedFilter  = function(sFilter){
    var isAllowed = false;
    if(allowedFilter.indexOf(sFilter)>=0){
        isAllowed =  true;
    }
    return isAllowed;
};
var constructFilters = function(query){
    var fFilter = {};
    for(i in query){
        if(isAllowedFilter(i)){
        	if(i=="name"){
				fFilter[i]={$regex: query[i], $options: 'i'}
			}else {
				fFilter[i] = query[i];
			}
        }
    }
    return fFilter;
};

module.exports.addTrip = function(data,next) {
    var Trip = new TripLocation(data);
    Trip.saveAsync(data)
        .then(function(tripData) {
            winston.info("added gr",JSON.stringify(tripData));
            return next(null, tripData);
        })
        .catch(function(err) {
            winston.error("error in add gr:" + err);
            return next(err);
        });
};

module.exports.getTrips = function(reqQuery, next) {
    var queryFilter = constructFilters(reqQuery);
	reqQuery.queryFilter = queryFilter;
	otherUtil.findPagination(TripLocation, reqQuery, next);
};

module.exports.findTripById = function(id, next) {
    TripLocation.findAsync({"_id":id})
    .then(function (trip) {
        return next(null, trip);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateTripLocationById = function(id,reqBody,next) {
    TripLocation.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};





