var Promise = require('bluebird');
var NO_OF_DOCS = 10;

var UnregisteredUser = Promise.promisifyAll(commonUtil.getModel('unregisteredUser'));

var allowedFilter = ['mobile','owner_name','email','company_name','type','pan_no','status','city','isRegistered'];
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
      if(i == 'destination'){
          fFilter['destination'] =  { "$in": [query[i]] } 
      }
      else if(i == 'mobile'){
          fFilter['mobile'] =  { "$in": [query[i]] } 
      }else {
          fFilter[i] = query[i];
      }
    }
  }
  return fFilter;
};

//********************************************************************************************************************
module.exports.addUnregisteredUser = function(data, next) {
    var newUser = new UnregisteredUser(data);
    newUser.saveAsync()
    .then(function(unregisteredUser) {
    	var tempdata = JSON.parse(JSON.stringify(unregisteredUser[0]));
      			return next(null,tempdata);
    		}
  	)
    .catch(function(err) {
     			return next(err);
    		}
  	);
};
//********************************************************************************************************************
module.exports.getAllUnregisteredUser = function(req,next) {
  var ffFilters = constructFilters(req.query);
  var no_of_pages = 1;
  UnregisteredUser.countAsync(ffFilters)
  .then(function(userCount) {
    var cursor = UnregisteredUser.find(ffFilters);
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
module.exports.getUnregisteredUserById = function(data, next) {
  UnregisteredUser.findByIdAsync(data)
  .then(
    function(unregisteredUser) {
      if(unregisteredUser && unregisteredUser[0]){
        var userData = JSON.parse(JSON.stringify(unregisteredUser[0]));
        return next(null, user);
      }else if(unregisteredUser){        
        var userData = JSON.parse(JSON.stringify(unregisteredUser));
        return next(null, user);
      }else{
         return next(null, unregisteredUser);
      }
    }).catch(function(err) {
        return next(err);
    }
  );
};
//********************************************************************************************************************
module.exports.updateUnregisteredUser = function(unregisteredUser_id, newDetails, next) {
  UnregisteredUser.findByIdAndUpdateAsync(unregisteredUser_id,newDetails, {"new": true,"runValidators" : true})
  .then(
    function(unregisteredUser) {
     if(unregisteredUser && unregisteredUser[0]){
        var userData = JSON.parse(JSON.stringify(unregisteredUser[0]));
        return next(null, user);
      }else if(unregisteredUser){        
        var userData = JSON.parse(JSON.stringify(unregisteredUser));
        return next(null, user);
      }else{
         return next(null, unregisteredUser);
      }
    }
  )
  .catch(function(err) {
      return next(err);
    }
  );
};
//********************************************************************************************************************
module.exports.deleteUnregisteredUserById = function(unregisteredUser_id, next) {
  UnregisteredUser.findByIdAndRemoveAsync(unregisteredUser_id)
  .then(
    function(deletedUnregisteredUser){
      if(deletedUnregisteredUser){
          tempPost = JSON.parse(JSON.stringify(deletedUnregisteredUser))
          return next(null,tempPost);
      }else{
        return next(null,deletedUnregisteredUser);
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