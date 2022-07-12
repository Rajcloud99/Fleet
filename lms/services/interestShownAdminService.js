var Promise = require('bluebird');
var NO_OF_DOCS = 10;
var InterestShown = Promise.promisifyAll(commonUtil.getModel('interest_shown'));

var allowedFilter = ['status','userId','postingId','verified','postingDate','source','destination','interestId','from_date','to_date','isRegisteredCustomer'];
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
	if(allowedParams.indexOf(sParam)>=0){
		isAllowedP =  true;
	}
	return isAllowedP;
 };
var constructFilters = function(query){
	var fFilter = {};
	for(i in query){
		if(isAllowedFilter(i)){
			console.log(i);
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
				console.log('destination',[query[i]]);
				fFilter['destination.d'] =  { "$in": [query[i]] } 
			}else {
				fFilter[i] = query[i];
			}
			
		}
	}
	return fFilter;
 };
var constructParams = function(query){
	
 };

 module.exports.getAllInterestShown = function(req,next) {
	var aInterestFields;
	if(req.query['device_type'] == 'android'){
		aInterestFields = ['_id','postingId','created_at','interestId','type','status','verified','expected_price','post_owner_name','post_owner_company',
	'post_mobile','source','destination','deal_price_interest','weight','materialType','truck_driver_details',
	'load_person','load_person_company','load_person_contact','load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email','vehicle_person_company'];
	}else{
	aInterestFields = ['_id','accept_price','postingId','interestId','created_at','type','verified','status','expected_price','post_owner_name','post_owner_company',
	'post_mobile','source','destination','quote_prices','deal_price_interest','deal_price_posting','counter_quotes','acceptedBy_interest','acceptedBy_posting','confirmBy_interest','confirmBy_posting','truckType','weight','materialType','truck_driver_details',
	'load_person','load_person_company','load_person_contact','load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email','vehicle_person_company'];
	}
	var aCityFields = ['c','d','s','p','formatted_address'];
	var ffFilters = constructFilters(req.query);
	logger.info("ffFilters",req.query,"filtersss",ffFilters);
	var no_of_pages = 1;
	InterestShown.countAsync(ffFilters)
		 .then(function(postingsCount) {
			  logger.info("interests retrieved: " + postingsCount);
			  var cursor = InterestShown.find(ffFilters);
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
			  	
			  	if(postingsCount/no_of_documents>1){
			  		no_of_pages = postingsCount/no_of_documents;
			  	}
				cursor.limit(parseInt(no_of_documents));
			    cursor.populate('trucks')
			  	.populate('drivers').exec(function (err, interests) {
				  if (err){
					  logger.error("#getAllInterests: " + err);
				      return next(err);
				  }
				  var tempInterests = JSON.parse(JSON.stringify(interests));
				  for(var k in tempInterests){
				  	tempInterests[k] = commonUtil.prepareResponse(tempInterests[k],aInterestFields);
                    if(tempInterests[k]['source']){
                    	tempInterests[k]['source'] = commonUtil.prepareResponse(tempInterests[k]['source'],aCityFields);
                    }
                    if(tempInterests[k]['destination'] && tempInterests[k]['destination'][0]){
                    	tempInterests[k]['destination'][0] = commonUtil.prepareResponse(tempInterests[k]['destination'][0],aCityFields);
                    }
				  }
				  logger.info("#getAlInterestShowns: retrieved interest postings: ");
				  var objjj = {};
			  	  objjj.no_of_pages =Math.ceil(no_of_pages);
			    	objjj.data = tempInterests;
			        return next(null, objjj);
				 });
			    }).catch(function(err) {
		          logger.error("Error in getLastNPosting : " + err);
		      return next(err);
		    });
	  

 };