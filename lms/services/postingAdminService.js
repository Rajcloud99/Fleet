var Promise = require('bluebird');
var NO_OF_DOCS = 10;
var PostingAdmin = Promise.promisifyAll(commonUtil.getModel('postings'));

module.exports.updatePosting = function(postingId, newDetails, next) {
 PostingAdmin.findOneAndUpdateAsync({"postingId":postingId}, {"$set": newDetails }, {"new": true,"runValidators" : true})
  .then(
    function(updatedPosting) {
      if(updatedPosting[0]){
      	  tempPost = JSON.parse(JSON.stringify(updatedPosting[0]))
    	  return next(null,tempPost);
      }else{
    	  return next(null,updatedPosting);
      }
     
    }
  )
  .catch(
    function(err) {
      return next(err);
    }
  );
 };

//****************************************************************************************

 module.exports.getPostingsById = function(postingId, next) {
     PostingAdmin.findOneAsync(postingId)
	  .then(
	    function(posting) {
	      tempPost = JSON.parse(JSON.stringify(posting))
	      return next(null, tempPost);
	    }
	  )
	  .catch(
	    function(err) {
	      return next(err);
	    }
	  )
     };
//******************************************************************************************************************
module.exports.deletePosting = function(postingId, next) {
 PostingAdmin.findOneAndRemoveAsync({"postingId":postingId})
  .then(
    function(deletedPosting) {
      if(deletedPosting){
          tempPost = JSON.parse(JSON.stringify(deletedPosting))
        return next(null,tempPost);
      }else{
        return next(null,deletedPosting);
      }
     
    }
  )
  .catch(
    function(err) {
      return next(err);
    }
  );
 };
//******************************************************************************************************************