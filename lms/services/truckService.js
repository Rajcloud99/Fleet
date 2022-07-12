var Promise = require('bluebird');
var winston = Promise.promisifyAll(require('winston'));

var Truck = Promise.promisifyAll(commonUtil.getModel('truck'));
var TruckAdmin = Promise.promisifyAll(commonUtil.getModel('truckAdmin'));
var NO_OF_DOCS = 10;

var allowedFilter = ['owner_mobile','created_at'];
var allowedParams = ['sortby'];
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
      if(i =='from_date'){
        var startDate = new Date(query[i]);
          startDate.setSeconds(0);
        startDate.setHours(0);
        startDate.setMinutes(0);
        var nextDay = new Date(startDate);
        nextDay.setDate(startDate.getDate() + 1);
        fFilter["date.from"] = {
                  "$gte" :startDate,
                  "$lt":nextDay
          };
      }else if(i == 'destination'){
        fFilter['destination'] =  { "$in": [query[i]] } 
      }else {
        fFilter[i] = query[i];
      }
      
    }
  }
  return fFilter;
 };
function prepareUserResponse(user){
	var userResponse = JSON.parse(JSON.stringify(user));
	userResponse.password = undefined;
	userResponse.pwd = undefined;
	userResponse.status = undefined;
	userResponse.otp = undefined;
	userResponse.nOtp = undefined;
	userResponse.noncust_details = undefined;
	userResponse.latModified = undefined;
	userResponse.created_at = undefined;
	
	return userResponse;
 };
module.exports.registerTruck = function(truck, user_id, next) {
	// take truck, set into db after populating user, done
	winston.info("RegisteredVehicle:");
	winston.info(truck);
	truck.userId = user_id;
	truck.TRUCKID = "FTV"+truckCounterForDay++;
	var truckObject = new Truck(truck);
	truckObject.saveAsync()
	.then(function(truck){
		var truckData = JSON.parse(JSON.stringify(truck[0]));
    	var prepareAdminTruckData = {};
      		for(key in truckData){
        		if(key=="TRUCKID"){
          			prepareAdminTruckData.TRUCKID = truckData.TRUCKID;
        		}
        		if(key=="_id"){
          			prepareAdminTruckData.truck_id = truckData._id;
        		}
        		if(key=="userId"){
          			prepareAdminTruckData.userId=truckData.userId;
        		}
        		if(key=="created_at"){
          			prepareAdminTruckData.created_at = truckData.created_at;
        		}
        		if((key!= "TRUCKID")&&(key!= "__v")&&(key!= "_id")&&(key!= "created_at")&&(key!= "latModified")&&(key!= "userId")){    
          			prepareAdminTruckData[key] = {};
          			prepareAdminTruckData[key].status = "pending";
          			prepareAdminTruckData[key].value = truckData[key];
        		}
      		}
		var newTruckAdmin = new TruckAdmin(prepareAdminTruckData);
      	newTruckAdmin.saveAsync();
      	return truck;
	})
	.then(
		function(savedTruck){
			winston.info("truck registration service passed!");
			next(null, savedTruck[0]);
		}
	)
	.catch(
		function(err) {
			winston.error(err.toString());
			next(err);
		}
	);
 };
module.exports.findTruck = function(truck_id, next) {
	if(truck_id){
		console.log('truck_id',truck_id);
		Truck.findByIdAsync(truck_id)
		.then(
			function (truck) {
				if (!truck) return next(null, false);
				return next(null, truck);
			}
		)
		.catch(next);
	}else{
		next(null, {"type":"load"});
	}
	
 };

//****************************************************************************
module.exports.getTruckByID = function(truck_id,next) {
   var cursor = Truck.findOne({"TRUCKID" : truck_id});
   
  cursor.populate('driverId').exec(function (err, truck) {
    if (err){
      return next(err);
    }
    var temprates = JSON.parse(JSON.stringify(truck));
    return next(null, temprates);
  });
}

//*****************************************************************************
module.exports.getTrucks = function (ffFilters, next) {
	console.log(ffFilters);
	Truck.find(ffFilters)
	.sort({'created_at' : -1})
	.populate('driverId')
	.exec(function (err, trucks) {
	  if (err){
		  winston.error("#getAllTrucks: " + err);
	      return next(err);
	  }
	  var tempTrucks = JSON.parse(JSON.stringify(trucks));
	  for(var k in tempTrucks){
		  tempTrucks[k].userId =  undefined;//prepareUserResponse(tempTrucks[k].userId);
	  }
	  winston.info("#getAlTruckPostings: retrieved truck postings: ");
      return next(null, tempTrucks);
	})
};
module.exports.updateTruck = function(truck_id, details, next) {
	details.latModified = new Date();
	console.log('in truck update service ',truck_id,details)
	Truck.findByIdAndUpdateAsync(truck_id, {"$set": details}, {"new": true,"runValidators" : true})
	.then(function(truck){
		var truckData = JSON.parse(JSON.stringify(truck));
		details.actualTruckData = truckData;
		var prepareAdminTruckData = {};
      	for(key in truckData){
        	if((key!="TRUCKID")&&(key!="userId")&&(key!= "__v")&&(key!= "_id")&&(key!= "created_at")){    
          		prepareAdminTruckData[key] = {};
          		prepareAdminTruckData[key].value = truckData[key];
        	}
      	}
      	prepareAdminTruckData.latModified = new Date();
		TruckAdmin.findOneAndUpdateAsync({"truck_id":truck_id}, {"$set": prepareAdminTruckData}, {"new": true,"runValidators" : true})
      	.then(function(adminData){
      	if(adminData){
        	return next(null, details.actualTruckData);
      	}else{
        	return next(null, adminData);
      	}
     	}).catch(next);
	}).catch(next);
};

module.exports.deleteTruck = function(truck_id, next) {
	Truck.removeAsync({"_id": truck_id})
	.then(
		function() {
			return next(null);
		}
	)
	.catch(next);
};
module.exports.getAllTrucks = function(req,next) {
	var ffFilters = constructFilters(req.query);
	var no_of_pages = 1;
	console.log("Filters",req.query,ffFilters);
	Truck.countAsync(ffFilters)
	 .then(function(truckCount) {

	      winston.info(" trucks retrieved: " + truckCount);


	      var cursor = Truck.find(ffFilters);
	 	if(req.query && req.query.sortby && req.query.sortby.split(':')){
	  		var params = req.query.sortby.split(':');
	  			if(params[0]  && params[0] == 'created_at'){
	  				var oSort = {'created_at' : params[1]}
	  				cursor.sort(oSort);
	  			}
	  	}
	 	var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
	  	if(req.query && req.query.skip){//TODO check field is valid or not
	  		var skip_docs = (req.query.skip-1)*no_of_documents;
	  		console.log('skip' ,skip_docs)
	             cursor.skip(skip_docs);
	  	}
	  	if(req.query && req.query.no_of_docs){//TODO check field is valid or not
	  	   if(truckCount/no_of_documents>1){
	  		no_of_pages = truckCount/no_of_documents;
	  		}
	  		cursor.limit(no_of_documents);
	  		console.log('no of docs' , no_of_documents,'no_of_pages',no_of_pages);
	  	}
	  	
	  cursor
		.exec(function (err, trucks) {
	  	  if (err){
	  		  logger.error("#err users: " + err);
	  	      return next(err);
	  	  }
	  	  var temptruck = JSON.parse(JSON.stringify(trucks));
	  	  for(var k in temptruck){
		  temptruck[k].userId =  undefined;//prepareUserResponse(tempTrucks[k].userId);
	      }
	  	  winston.info("#getAll users: retrieved users: ");
	  	  var objjj = {};

	  	  objjj.no_of_pages =Math.ceil(no_of_pages);
	  	  objjj.data = temptruck;
	        return next(null, objjj);
	  	});
	    }).catch(function(err) {
	         logger.error("Error in getLastNPosting : " + err);
	     return next(err);
	  });
	
	

};


module.exports.registerTrucksOnIcdInterests = function(aTruck,next) {
     var resp = {"status": "OK","message":"Your Trucks successfully."};
    //  return new Promise(function(resolve, reject){
     if(aTruck.length>0){
        var bulk = Truck.collection.initializeUnorderedBulkOp();
          for(i=0; i<aTruck.length;i++){
          	aTruck[i].TRUCKID = "FTV"+ truckCounterForDay++;
            bulk.insert(aTruck[i])
          }
        
         bulk.execute(function(err, bulkres){
           if (err){ console.log('rejected',err); return next(err);}
             resp.bulkres = bulkres;
           return next(null,resp);
         });
     }else{
          console.log("no RegisteredVehicle found in array");
          return next(null,resp);
        }
       
    //  });
    }
