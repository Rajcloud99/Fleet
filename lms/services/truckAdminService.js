var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var winston = require('winston');
var TruckAdmin = Promise.promisifyAll(commonUtil.getModel('truckAdmin'));
var lPass = "";
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

module.exports.addUserAdmin = function(truck, user_id, next) {

  truck.truckId = user_id;
  var truckObject = new TruckAdmin(truck);
  truckObject.saveAsync()
    .then(
      function(savedDriver)  {
        winston.info("admin data passed!");
        next(null, savedDriver[0]);
      }
    )
    .catch(
      function(err) {
        winston.error(err.toString());
        next(err);
      }
    );
};



function getUserByEmail(email, next) {
  if (email === null) {
    return next('Email is missing');
  }
  TruckAdmin.findOneAsync({
    'email': email.toLowerCase()
  })
  .then(
    function(user) {
      winston.info('Obtained user');
      return next(null, user);
    }
  )
  .catch(
    function(err) {
      winston.info('userservice -> getUser -> catch');
      winston.error("Error in getUser: " + err);
      return next(err);
    }
  );
}

module.exports.getUserByEmail = getUserByEmail;

function getUserByUSERID(mobile, next) {
  if (mobile === null) {
    return next('Mobile number is missing');
  }
  TruckAdmin.findOneAsync({
    'mobile': mobile
  })
  .then(function(user) {
      winston.info('Obtained user');
      if(user && user[0]){
        return next(null, user[0]);
      }else{
        return next(null, user);
      }
      
    })
  .catch(
    function(err) {
      winston.info('userservice -> getUser -> catch');
      winston.error("Error in getUser: " + err);
      return next(err);
    }
  );
}

module.exports.getUserByUSERID = getUserByUSERID;

module.exports.verifyUser = function(mobile, password, next) {
  winston.info('verifyUser entered');
  Promise.promisify(getUserByUSERID) (mobile)
  .then(
    function(user) {
      //if (err) return next(err);
      winston.info('userservice: obtained user');
      if (user === null) return next(null, false, {'status': 'ERROR', 'error_message': 'No such username'});
      //bcrypt.compare(password, user.password));
      return bcrypt.compareAsync(password, user.password)
      .then(
        function(isMatch) {
          winston.info('isMatch: ' + isMatch);
          if (isMatch === false) return next(null, false, {'status':'ERROR', 'error_message':'Incorrect Credentials'});
          else return next(null, user);
        }
      );
    }
  )
  .catch(
    function(err) {
      return next(err);
    }
  );
};

module.exports.updateUser = function(user_id, newDetails, next) {
  var oUpdate = {};
  console.log('newDetails',newDetails);
    oUpdate.$set = newDetails;
  if(newDetails.add_new_address){
    oUpdate.$push = {"saved_address":{'$each' :newDetails.add_new_address}};
  }
  console.log(oUpdate);
  newDetails.latModified = new Date();
  TruckAdmin.findByIdAndUpdateAsync(user_id, oUpdate, {"new": true,"runValidators" : true})
  .then(function(doc) {
    if(doc[0]){
      return next(null, doc[0]);
    }else{
      return next(null, doc);
    }
  })
  .catch(next);
};


module.exports.updateAdminUserByParams = function(user_id, newDetails, next) {
  var key = user_id;
 console.log('new driver Details',newDetails)

 newDetails.latModified = new Date();
 // var nn ={user_id : key, "$set": newDetails };
 // console.log(nn);
TruckAdmin.findOneAndUpdateAsync({user_id: key}, {"$set": newDetails }, {"new": true,"runValidators" : true,"upsert":true})

    .then(
      function(thing) {
        winston.info("update status: " + JSON.stringify(thing));
        if(thing[0]){
          return next(null,thing[0]);
        }else{
          return next(null,thing);
        }
        
      }
    )
    // .catch(function(err) {
    //       winston.error("update status error: " + err);
    //     return next(err);
    //   });
  };

module.exports.findDriver = function(id, next) {
  winston.info("Passed id: " + id);
  TruckAdmin.findByIdAsync(id)
  .then(
    function(user) {
      winston.info("Found user: ");
      if (!user) return next(null, false);
      return next(null, user);
    }
  )
  .catch(
    function(err) {
      return next(err);
    }
  );
};



module.exports.getAllUsersAdmin = function(req,next) {

    var ffFilters = constructFilters(req.query);
  console.log("ffFilters",req.query,ffFilters);
  var cursor = TruckAdmin.find(ffFilters);
  if(req.query && req.query.sortby && req.query.sortby.split(':')){
    var params = req.query.sortby.split(':');
      if(params[0]  && params[0] == 'created_at'){
        var oSort = {'created_at' : params[1]}
        cursor.sort(oSort);
      }
      
  }
  if(req.query && req.query.no_of_docs){//TODO check field is valid or not
    console.log('no of docs' , req.query.no_of_docs)
           cursor.limit(req.query.no_of_docs);
  }  

  cursor.exec(function (err, users) {
    if (err){
      winston.error("#getAllPostings: " + err);
        return next(err);
    }
    var temprates = JSON.parse(JSON.stringify(users));
    winston.info("#get All Postings: retrieved users postings: "+JSON.stringify(temprates));
      return next(null, temprates);
  });
 
}

//******************************************************************************************
module.exports.getAllTrucks = function(req,next) {
  var ffFilters = constructFilters(req.query);
  var no_of_pages = 1;
  TruckAdmin.countAsync(ffFilters)
   .then(function(truckCount) {
      var cursor = TruckAdmin.find(ffFilters);
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
      
      if(truckCount/no_of_documents>1){
        no_of_pages = truckCount/no_of_documents;
      }
        cursor.limit(parseInt(no_of_documents));
        cursor.populate('truck_id')
      
        cursor.exec(function (err, trucks) {
          if (err){
            logger.error("#err trucksAdmin: " + err);
            return next(err);
          }
        var tempUsers = JSON.parse(JSON.stringify(trucks));
        var objjj = {};
        objjj.no_of_pages =Math.ceil(no_of_pages);
        objjj.data = tempUsers;
        return next(null, objjj);
      });
  }).catch(function(err) {
       logger.error("Error in TruckAdmin : " + err);
       return next(err);
    });
};
//***************************************************************************************
module.exports.updateAdminTruckByParams = function(truck_id, newDetails, next) {
  TruckAdmin.findOneAndUpdateAsync({truck_id: truck_id}, {"$set": newDetails }, {"new": true,"runValidators" : true})
  .then(function(adminData) {
        if(adminData[0]){
          return next(null,adminData[0]);
        }else{
          return next(null,adminData);
        }
      }).catch(next);
};
//***************************************************************************************