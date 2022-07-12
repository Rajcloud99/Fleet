//Unregistered Vehicle, Driver and Transporter Registration Service
var Promise = require('bluebird');
var NO_OF_DOCS = 10;

var UnregisteredVDT = Promise.promisifyAll(commonUtil.getModel('unregisteredVDT'));

var allowedFilter = ['isRegistered','agent_name'];
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
      fFilter[i] = query[i];
    }
  }
  return fFilter;
};

//********************************************************************************************************************
module.exports.addUnregisteredVDT = function(data, next) {
    var newUser = new UnregisteredVDT(data);
    newUser.saveAsync()
    .then(function(unregisteredVDT) {
    	var tempdata = JSON.parse(JSON.stringify(unregisteredVDT[0]));
      			return next(null,tempdata);
    		}
  	)
    .catch(function(err) {
     			return next(err);
    		}
  	);
};
//********************************************************************************************************************
module.exports.getAllUnregisteredVDT = function(req,next) {
  var ffFilters = constructFilters(req.query);
  var no_of_pages = 1;
  UnregisteredVDT.countAsync(ffFilters)
  .then(function(userCount) {
    var cursor = UnregisteredVDT.find(ffFilters);
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
    if(req.query && req.query.skip){
      var skip_docs = (req.query.skip-1)*no_of_documents;
      cursor.skip(skip_docs);
    }
    if(userCount/no_of_documents>1){
        no_of_pages = userCount/no_of_documents;
    }
    cursor.limit(no_of_documents);  
    cursor.exec(function (err, users) {
      if (err){
        logger.error("#err in Unregistered users: " + err);
        return next(err);
      }
      var tempUsers = JSON.parse(JSON.stringify(users));
      var toSend = {};
      toSend.no_of_pages =Math.ceil(no_of_pages);
      toSend.data = tempUsers;
      return next(null, toSend);
    });
  }).catch(function(err) {
      logger.error("Error in Unregistered : " + err);
      return next(err);
  });
};
//********************************************************************************************************************
module.exports.getUnregisteredVDTById = function(data, next) {
  UnregisteredVDT.findByIdAsync(data)
  .then(
    function(unregisteredVDT) {
      if(unregisteredVDT&&unregisteredVDT[0]){
        var vdtData = JSON.parse(JSON.stringify(unregisteredVDT[0]));
        return next(null, vdtData);
      }else{
        return next(null, unregisteredVDT);
      }
    }).catch(function(err) {
        return next(err);
    }
  );
};
//********************************************************************************************************************
module.exports.updateUnregisteredVDT = function(unregisteredVDT_id, newDetails, next) {
  UnregisteredVDT.findByIdAndUpdateAsync(unregisteredVDT_id,newDetails, {"new": true,"runValidators" : true})
  .then(
    function(unregisteredVDT) {
      if(unregisteredVDT&&unregisteredVDT[0]){
        var vdtData = JSON.parse(JSON.stringify(unregisteredVDT[0]));
        return next(null,vdtData);
      }else{
          return next(null,unregisteredVDT);
      }
    }
  )
  .catch(function(err) {
      return next(err);
    }
  );
};
//********************************************************************************************************************
module.exports.deleteUnregisteredVDTById = function(unregisteredVDT_id, next) {
  UnregisteredVDT.findByIdAndRemoveAsync(unregisteredVDT_id)
  .then(
    function(deletedUnregisteredVDT) {
      if(deletedUnregisteredVDT){
          tempPost = JSON.parse(JSON.stringify(deletedUnregisteredVDT))
          return next(null,tempPost);
      }else{
        return next(null,deletedUnregisteredVDT);
      }
    }
  )
  .catch(
    function(err) {
      return next(err);
    }
  );
};
//********************************************************************************************************************