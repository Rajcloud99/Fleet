var Promise = require('bluebird');
var winston = Promise.promisifyAll(require('winston'));
var DriverAdmin = Promise.promisifyAll(commonUtil.getModel('driverAdmin'));
var lPass = "";
var NO_OF_DOCS = 10;
var allowedFilter = ['mobile','created_at','owner_name','email','company_name','type','pincode','status','city','alt_mobile','alt_contact'];
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

module.exports.registerDriver = function(driver, user_id, next) {

  driver.userId = user_id;
  var driverObject = new DriverAdmin(driver);
  driverObject.saveAsync()
    .then(
      function(savedDriver){
        winston.info("passed!");
        if(savedDriver[0]){
          next(null, savedDriver[0]);
        }else{
          next(null, savedDriver);
        }
        
      }
    )
    .catch(
      function(err) {
        winston.error(err.toString());
        next(err);
      }
    );
};

module.exports.getDrivers = function(user_id, next) {
  DriverAdmin.find({"user_id" : user_id})
  .sort({'created_at' : -1})
  .then(
    function (drivers) {
      return next(null, drivers);
    })
  //.catch(next);
};

//******************************************************************************************
module.exports.getAllDrivers = function(req,next) {
  var ffFilters = constructFilters(req.query);
  var no_of_pages = 1;
  DriverAdmin.countAsync(ffFilters)
   .then(function(driverCount) {
      var cursor = DriverAdmin.find(ffFilters);
      if(req.query && req.query.sortby && req.query.sortby.split(':')){
        var params = req.query.sortby.split(':');
          if(params[0]  && params[0] == 'created_at'){
            var oSort = {'created_at' : params[1]}
            cursor.sort(oSort);
          }
      }
    var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
    if(no_of_documents>15){
      no_of_documents = 15;
    }  
    if(req.query && req.query.skip){//TODO check field is valid or not
      var skip_docs = (req.query.skip-1)*no_of_documents;
      cursor.skip(parseInt(skip_docs));
    }
      
    if(driverCount/no_of_documents>1){
      no_of_pages = driverCount/no_of_documents;
    }
        cursor.limit(parseInt(no_of_documents));
        cursor.populate('driver_id')
      
        cursor.exec(function (err, drivers) {
          if (err){
            logger.error("#err driversAdmin: " + err);
            return next(err);
          }
        var tempUsers = JSON.parse(JSON.stringify(drivers));
        var objjj = {};
        objjj.no_of_pages =Math.ceil(no_of_pages);
        objjj.data = tempUsers;
        return next(null, objjj);
      });
  }).catch(function(err) {
       logger.error("Error in DriverAdmin : " + err);
       return next(err);
    });
};
//***************************************************************************************


module.exports.findDriver = function(driver_id, next) {
  DriverAdmin.findByIdAsync(driver_id)
  .then(
    function (driver) {
      if (!driver) return next(null, false);
      return next(null, driver);
    }
  )
  .catch(next);
};
//********************************************************************************************************************************
module.exports.updateAdminDriverByParams = function(driver_id, newDetails, next) {
  DriverAdmin.findOneAndUpdateAsync({driver_id: driver_id}, {"$set": newDetails }, {"new": true,"runValidators" : true})
  .then(function(adminData) {
        if(adminData[0]){
          return next(null,adminData[0]);
        }else{
          return next(null,adminData);
        }
      }).catch(next);
};
//*********************************************************************************************************************************
