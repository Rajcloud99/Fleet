var Promise = require('bluebird');
var winston = require('winston');
var NO_OF_DOCS = 10;
var PostingPartLoad = Promise.promisifyAll(commonUtil.getModel('postingPartLoad'));
function prepareUserResponse(user){
	var userResponse =undefined;
	if(user){
    userResponse = JSON.parse(JSON.stringify(user));
	userResponse.password = undefined;
	userResponse.pwd = undefined;
	userResponse.status = undefined;
	userResponse.otp = undefined;
	userResponse.nOtp = undefined;
	userResponse.noncust_details = undefined;
	userResponse.latModified = undefined;
	userResponse.created_at = undefined;
	}
    return userResponse;
 };
function createPostingId(post){
	var postingID,postingCount,Material_Truck_Type="NON",pCount = "000",postingDate = "";
	postingID = "PL";
	postingCount = loadPostingCounterForDay;
	pCount = postingCount.toString();
	var dateNow = new Date();
	if(dateNow.getMonth()<9){
		dMonth = "0" + (dateNow.getMonth() +1).toString();
	}else{
		dMonth = (dateNow.getMonth()+1).toString();	
	}
	if(dateNow.getDate()<10){
		dDate =  "0" + dateNow.getDate().toString();
	}else{
		dDate =  dateNow.getDate().toString();
	}
	postingDate = dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
	dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
	postingID = postingID   + dDate + dMonth +dYear + pCount;
	
	return {'postingID' : postingID,'postingDate' :postingDate } ;
 };
var allowedFilter = ['expected_price','mobile','email','weight','post_owner_name','post_owner_company','postingId','source','destination','services','from_date','modes_of_transportation','home_to_home','type'];
var allowedParams = ['sortby'];
var isAllowedFilter  = function(sFilter){
	var isAllowed = false;
	if(allowedFilter.indexOf(sFilter)>=0){
		isAllowed =  true;
	}
	return isAllowed;
 };
var isAllowedParam = function(sParam){
	var isAllowedP = false;
	if(allowedParams.indexOf(sParam)>0){
		isAllowedP =  true;
	}
	return isAllowedP;
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
			}else if(i == 'source'){
				fFilter['source.d'] =  query[i]; 
			}else if(i == 'destination'){
				fFilter['destination.d'] =  { "$in": [query[i]] } 
			}else if(i == 'services'){
				fFilter[i] =  { "$in": [query[i]] } 
			}else if(i == 'modes_of_transportation'){
				fFilter[i] =  { "$in": [query[i]] } 
			}
			else {
				fFilter[i] = query[i];
			}
			
		}
	}
	return fFilter;
 };
var constructParams = function(query){
	
 };

module.exports.addPosting = function(data, next) {
	var oNewPID = createPostingId(data);
	data.postingId =oNewPID.postingID;
	data.postingDate = oNewPID.postingDate;
	var newPosting = new PostingPartLoad(data);
	newPosting.saveAsync()
	.then(
		function(posting) {
      	loadPostingCounterForDay ++ ;
      	return next(null,posting);
    	}
  	)
  	.catch(
    	function(err) {
      	winston.error("Error in addPosting: " + err.toString());
      	return next(err);
    	}
 	);
};
//***********************************************************************************************************
module.exports.getAllPosting = function(req,next) {
  var ffFilters = constructFilters(req.query);
  var no_of_pages = 1;
  PostingPartLoad.countAsync(ffFilters)
  .then(function(postCount) {
    var cursor = PostingPartLoad.find(ffFilters);
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
      cursor.skip(parseInt(skip_docs));
    }
    if(postCount/no_of_documents>1){
        no_of_pages = postCount/no_of_documents;
    }
    cursor.limit(parseInt(no_of_documents));  
    cursor.exec(function (err, partLoad) {
      if (err){
        logger.error("#err in Part-load Posting: " + err);
        return next(err);
      }
      var tempPartLoad = JSON.parse(JSON.stringify(partLoad));
      var toSend = {};
      toSend.no_of_pages =Math.ceil(no_of_pages);
      toSend.data = tempPartLoad;
      return next(null, toSend);
    });
  }).catch(function(err) {
      logger.error("Error in Part-load Posting : " + err);
      return next(err);
  });
};
//*******************************************************************************************************************