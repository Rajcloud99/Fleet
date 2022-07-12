var Promise = require('bluebird');
var winston = require('winston');
var mongoose = require ('mongoose');

var NO_OF_DOCS = 15;
var Posting = Promise.promisifyAll(commonUtil.getModel('postings'));
var InterestShown = Promise.promisifyAll(commonUtil.getModel('interest_shown'));
var Booking = Promise.promisifyAll(commonUtil.getModel('bookings'));
var User = Promise.promisifyAll(commonUtil.getModel('user'));

var UnregisteredUser = Promise.promisifyAll(commonUtil.getModel('unregisteredUser'));
var UnregisteredPartLoadUser = Promise.promisifyAll(commonUtil.getModel('user_partLoad'));
var allowedFilter = ['offer','type','otherCustomers','userId','driverId','truck','postingId','verified','postingDate','source','destination','radius','from_date','to_date','truckType','materialType','load_type','no_of_trucks','weight','isRegisteredCustomer'];
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
			}else if(i == 'truckType'){
				fFilter['truckType.truck_type'] =  query[i];
			}else if(i == 'source'){
				fFilter['source.d'] =  query[i];
			}else if(i == 'destination'){
				console.log('destination',[query[i]]);
				fFilter['destination.d'] =  { "$in": [query[i]] }
			}else if(i == 'otherCustomers'){
				//fFilter['userId'] =  { "$ne": query[i] } // do nothing
			}else if(i == 'materialType'){
				fFilter['materialType.material_type'] =  query[i];
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
module.exports.getAllPostingsByText = function(req,next) {
	var filterOnAgg =  [];
	//var  ffFilters= constructAggFilters(req.query);
	filterOnAgg.push({ $match: { $text: { $search: req.query.search },type:'truck' } });
	if(req.query.unique){
		filterOnAgg.push({"$group":{"_id":{"mobile":"$mobile"},"post_owner_company":{"$last":"$post_owner_company"},"post_owner_name":{"$last":"$post_owner_name"},"type":{"$last":"$type"},"mobile":{"$last":"$mobile"}, "source":{"$last":"$source"},"destination":{"$last":"$destination"},"truckType":{"$last":"$truckType"},"created_at":{"$last":"$created_at"},"email":{"$last":"$email"}}});
	}
	filterOnAgg.push({ $sort: { score: { $meta: "textScore" }}});
	if(req.query.unique){
       filterOnAgg.push({ $project: { mobile : 1, _id: 0,email:1,'post_owner_company':1,'post_owner_name':1 } });
	}else{
	   filterOnAgg.push({ $project: { mobile : 1, _id: 0,email:1,type:1,'truckType.truck_type':1,'source.d':1,'source.formatted_address':1, 'destination.formatted_address':1,'destination.d':1,'post_owner_company':1,'post_owner_name':1,'created_at':1 } });
	}
	//var rateCount= filterOnAgg.length;

  var cursor = Posting.aggregate(filterOnAgg);
  var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
	 	if(no_of_documents>15){
			no_of_documents = 15;
		}
  cursor.limit(parseInt(no_of_documents));
  if(req.query && req.query.skip){//TODO check field is valid or not
	var skip_docs = (req.query.skip-1)*no_of_documents;
	cursor.skip(parseInt(skip_docs));
    }
  cursor.exec(function (err, posts) {
    if (err){
      return next(err);
    }
    var tempPosts = JSON.parse(JSON.stringify(posts));
	return next(null, tempPosts);
  });
 };
module.exports.getAllInterestByText = function(req,next) {
	var filterOnAgg =  [];
	//var  ffFilters= constructAggFilters(req.query);
	filterOnAgg.push({ $match: { $text: { $search: req.query.search },type:'load' } });
	if(req.query.unique){
		filterOnAgg.push({"$group":{"_id":{"vehicle_person_contact":"$vehicle_person_contact"},
            "vehicle_person_company":{"$last":"$vehicle_person_company"},
            "vehicle_person":{"$last":"$vehicle_person"},"type":{"$last":"$type"},
            "vehicle_person_contact":{"$last":"$vehicle_person_contact"},
            "source":{"$last":"$source"},"destination":{"$last":"$destination"},
            "truckType":{"$last":"$truckType"},"created_at":{"$last":"$created_at"},
            "vehicle_person_email":{"$last":"$vehicle_person_email"}}});
	}
	filterOnAgg.push({ $sort: { score: { $meta: "textScore" }}});
	if(req.query.unique){
       filterOnAgg.push({ $project: { vehicle_person_contact : 1, _id: 0,
           vehicle_person_email:1,'vehicle_person_company':1,'vehicle_person':1 } });
	}else{
	   filterOnAgg.push({ $project: { vehicle_person_contact : 1, _id: 0,
           'truckType.truck_type':1,vehicle_person_email:1,type:1,
           'source.d':1,'source.formatted_address':1,
           'destination.formatted_address':1,'destination.d':1,'vehicle_person_company':1,'vehicle_person':1,'created_at':1 } });
	}
	//var rateCount= filterOnAgg.length;

  var cursor = InterestShown.aggregate(filterOnAgg);
  var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
	 	if(no_of_documents>15){
			no_of_documents = 15;
		}
  if(req.query && req.query.skip){//TODO check field is valid or not
	var skip_docs = (req.query.skip-1)*no_of_documents;
	cursor.skip(parseInt(skip_docs));
    }
  cursor.limit(parseInt(req.query.no_of_docs));
  cursor.exec(function (err, posts) {
    if (err){
      return next(err);
    }
    var tempPosts = JSON.parse(JSON.stringify(posts));
	return next(null, tempPosts);
  });
 };
module.exports.getAllBookingsByText = function(req,next) {
	var filterOnAgg =  [];
	//var  ffFilters= constructAggFilters(req.query);
	filterOnAgg.push({ $match: { $text: { $search: req.query.search }} });
	if(req.query.unique){
		filterOnAgg.push({"$group":{"_id":{"vehicle_person_contact":"$vehicle_person_contact"},"vehicle_person_company":{"$last":"$vehicle_person_company"},"vehicle_person":{"$last":"$vehicle_person"},"type":{"$last":"$type"},"vehicle_person_contact":{"$last":"$vehicle_person_contact"}, "source":{"$last":"$source"},"destination":{"$last":"$destination"},"truckType":{"$last":"$truckType"},"created_at":{"$last":"$created_at"},"vehicle_person_email":{"$last":"$vehicle_person_email"}}});
	}
	filterOnAgg.push({ $sort: { score: { $meta: "textScore" }}});
	if(req.query.unique){
       filterOnAgg.push({ $project: { vehicle_person_contact : 1, _id: 0,vehicle_person_email:1,'vehicle_person_company':1,'vehicle_person':1 } });
	}else{
	   filterOnAgg.push({ $project: { vehicle_person_contact : 1, _id: 0,'truckType.truck_type':1,vehicle_person_email:1,type:1,'source.d':1,'source.formatted_address':1, 'destination.formatted_address':1,'destination.d':1,'vehicle_person_company':1,'vehicle_person':1,'created_at':1 } });
	}
	//var rateCount= filterOnAgg.length;

  var cursor = Booking.aggregate(filterOnAgg);
  var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
	 	if(no_of_documents>15){
			no_of_documents = 15;
		}

  if(req.query && req.query.skip){//TODO check field is valid or not
	var skip_docs = (req.query.skip-1)*no_of_documents;
	cursor.skip(parseInt(skip_docs));
    }
  cursor.limit(parseInt(req.query.no_of_docs));
  cursor.exec(function (err, posts) {
    if (err){
      return next(err);
    }
    var tempPosts = JSON.parse(JSON.stringify(posts));
	return next(null, tempPosts);
  });
 };
module.exports.getAllUsersByText = function(req,next) {
	var filterOnAgg =  [];
	//var  ffFilters= constructAggFilters(req.query);
	console.log('search service get all users by text query',req.query);
	if(req.query.search && req.query.type){
		filterOnAgg.push({ $match: { $text: { $search: req.query.search },type:req.query.type} });
	}else if(req.query.search){
		filterOnAgg.push({ $match: { $text: { $search: req.query.search } } });
	}else if(req.query.type){
		filterOnAgg.push({ $match: {type:req.query.type} });
	}
	//if(req.query.unique){
		//filterOnAgg.push({"$group":{"_id":{"mobile":"$mobile"},
    // "devices":{"$last":"$devices"},"company_name":{"$last":"$company_name"},
    // "owner_name":{"$last":"$owner_name"},"type":{"$last":"$type"},
    // "mobile":{"$last":"$mobile"}, "city":{"$last":"$city"},
    // "noncust_details":{"$last":"$noncust_details"},
    // "created_at":{"$last":"$created_at"},"email":{"$last":"$email"},
    // "userId":{"$last":"$_id"},"profile_img": { "$last": "$profile_img" }}});
	//}
	if(req.query.search){
	    filterOnAgg.push({ $sort: { score: { $meta: "textScore" }}});
    }
    //filterOnAgg.push(  { "$sum": "no_of_pages" });
	if(req.query.unique){
       filterOnAgg.push({ $project: { mobile : 1,type:1,email:1,
           'company_name':1,'owner_name':1,'devices':1,'userId':1,"profile_img":1} });
	}else{
	   filterOnAgg.push({ $project: { mobile : 1, email:1,type:1,
           'city':1,'noncust_details':1,'company_name':1,'owner_name':1,
           'created_at':1,'userId':1,"profile_img":1} });
	}
	//var rateCount= filterOnAgg.length;
	/*User.countAsync(filterOnAgg)
	 .then(function(userCount) {
       console.log(userCount);
	 });
	 User.aggregateAsync(filterOnAgg)
	 .then(function(userCount,b,c,d) {
       console.log(userCount);
	 });
     */


  var cursor = User.aggregate(filterOnAgg);
  filterOnAgg.push({ $group: {_id: null, count: { $sum : 1 }}});
  var countCursor = User.aggregate(filterOnAgg);
  //var no_of_pages = cursor.count();
  //console.log('no of pagesssss',no_of_pages);
  var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
  if(no_of_documents>15){
	no_of_documents = 15;
   }

  if(req.query && req.query.skip){//TODO check field is valid or not
	var skip_docs = (req.query.skip-1)*no_of_documents;
	cursor.skip(parseInt(skip_docs));
    }
  if(req.noLimit){
    no_of_documents = 50;
  }
  cursor.limit(parseInt(no_of_documents));
  countCursor.exec(function(err, countArr) {
      if (err) {
          return next(err);
      }
      if (countArr && countArr.length > 0) {
            var dirSearchCount = countArr[0].count;
            var no_of_pages;
            if (dirSearchCount / no_of_documents > 1) {
                no_of_pages = Math.ceil(dirSearchCount / no_of_documents);
            } else {
                no_of_pages = 1;
            }

            cursor.exec(function (err, users) {
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.data = users;
                objToReturn.no_of_pages = no_of_pages;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.data = [];
            objToReturn.no_of_pages = 0;
            return next(null, objToReturn);
        }
    });
 };

module.exports.getAllUnRegUsersByText = function(req,next) {
	var filterOnAgg =  [];
	//var  ffFilters= constructAggFilters(req.query);
	console.log('77777777777777',req.query);

	if(req.query.search && req.query.type){
		filterOnAgg.push({ $match: { $text: { $search: req.query.search }} });
	}else if(req.query.search){
		filterOnAgg.push({ $match: { $text: { $search: req.query.search } } });
	}else if(req.query.type){
		filterOnAgg.push({ $match: {type:req.query.type} });
	}
	//if(req.query.unique){
		//filterOnAgg.push({"$group":{"_id":{"mobile":"$mobile"},"devices":{"$last":"$devices"},"company_name":{"$last":"$company_name"},"owner_name":{"$last":"$owner_name"},"type":{"$last":"$type"},"mobile":{"$last":"$mobile"}, "city":{"$last":"$city"},"noncust_details":{"$last":"$noncust_details"},"created_at":{"$last":"$created_at"},"email":{"$last":"$email"},"userId":{"$last":"$_id"},"profile_img": { "$last": "$profile_img" }}});
	//}
	if(req.query.search){
	filterOnAgg.push({ $sort: { score: { $meta: "textScore" }}});
    }
    //filterOnAgg.push(  { "$sum": "no_of_pages" });
	if(req.query.unique){
       filterOnAgg.push({ $project: { mobile : 1,type:1,email:1,'company_name':1,'owner_name':1,'devices':1,'userId':1,"profile_img":1} });
	}else{
	   filterOnAgg.push({ $project: { mobile : 1, email:1,type:1,'city':1,'noncust_details':1,'company_name':1,'owner_name':1,'created_at':1,'userId':1,"profile_img":1} });
	}
  var cursor = UnregisteredUser.aggregate(filterOnAgg);
  var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
  if(no_of_documents>15){
	no_of_documents = 15;
   }

  if(req.query && req.query.skip){//TODO check field is valid or not
	var skip_docs = (req.query.skip-1)*no_of_documents;
	cursor.skip(parseInt(skip_docs));
    }
  if(req.noLimit){
    no_of_documents = 50;
  }
  cursor.limit(parseInt(no_of_documents));
  cursor.exec(function (err, posts) {
    if (err){
      return next(err);
    }
    var tempPosts = JSON.parse(JSON.stringify(posts));
	return next(null, tempPosts);
  });
 };

 module.exports.getAllUnRegPartLoadUsersByText = function(req,next) {
		var filterOnAgg =  [];
		//var  ffFilters= constructAggFilters(req.query);
		console.log('77777777777777',req.query);

		if(req.query.search && req.query.type){
			filterOnAgg.push({ $match: { $text: { $search: req.query.search }} });
		}else if(req.query.search){
			filterOnAgg.push({ $match: { $text: { $search: req.query.search } } });
		}else if(req.query.type){
			filterOnAgg.push({ $match: {type:req.query.type} });
		}
		if(req.query.search){
		filterOnAgg.push({ $sort: { score: { $meta: "textScore" }}});
	    }
		if(req.query.unique){
	       filterOnAgg.push({ $project: { mobile : 1,type:1,email:1,
               'company_name':1,'owner_name':1,'devices':1,'userId':1,"profile_img":1} });
		}else{
		   filterOnAgg.push({ $project: { mobile : 1, email:1,type:1,
               'city':1,'noncust_details':1,'company_name':1,
               'owner_name':1,'created_at':1,'userId':1,"profile_img":1} });
		}
	  var cursor = UnregisteredPartLoadUser.aggregate(filterOnAgg);
      filterOnAgg.push({ $group: {_id: null, count: { $sum : 1 }}});
	  var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
	  if(no_of_documents>15){
		no_of_documents = NO_OF_DOCS;
	   }

	  if(req.query && req.query.skip){//TODO check field is valid or not
		var skip_docs = (req.query.skip-1)*no_of_documents;
		cursor.skip(parseInt(skip_docs));
	    }
	  if(req.noLimit){
	    no_of_documents = 50;
	  }
	  cursor.limit(parseInt(no_of_documents));
     cursor.exec(function (err, posts) {
                  if (err) {
                      return next(err);
                  }
                  var tempPosts = JSON.parse(JSON.stringify(posts));
                  return next(null, tempPosts);
     });

     };



/*qeuryObj contains textToSearch, lead_owner_id,
lead_creation_date, scheduled_date, post_owner_mobile,
lead status*/
function prepareMatchFilterForLeads(queryObj){
	var aggrFilter = [];
    if (queryObj.textToSearch ){
        aggrFilter.push({ $match: { $text: { $search: queryObj.textToSearch}}
        });
    }
    aggrFilter.push({ $match: { type:'load',is_lead:true}});
	if (queryObj.scheduled_date) {
		var startDateScheduled = new Date(queryObj["scheduled_date"]);
        startDateScheduled.setSeconds(0);
		startDateScheduled.setHours(0);
		startDateScheduled.setMinutes(0);
		var nextDayScheduled = new Date(startDateScheduled);
		nextDayScheduled.setDate(startDateScheduled.getDate() + 1);
        aggrFilter.push({ $match: {"date.from": {
                "$gte": startDateScheduled,
                "$lt": nextDayScheduled
            }
        }});
	}

    if (queryObj.lead_creation_date) {
		var startDateCreatedAt = new Date(queryObj["lead_creation_date"]);
		startDateCreatedAt.setSeconds(0);
		startDateCreatedAt.setHours(0);
		startDateCreatedAt.setMinutes(0);
		var nextDayCreatedAt = new Date(startDateCreatedAt);
		nextDayCreatedAt.setDate(startDateCreatedAt.getDate() + 1);
        aggrFilter.push({ $match: {
            "created_at": {
                "$gte": startDateCreatedAt,
                "$lt": nextDayCreatedAt
            }
        }
	    });
    }

	if (queryObj.lead_status){
		aggrFilter.push({ $match: {lead_status:queryObj.lead_status}});
    }
    if (queryObj.lead_owner_mobile){
		aggrFilter.push({ $match: {lead_owner_mobile:queryObj.lead_owner_mobile}});
    }
    if (queryObj.post_owner_mobile){
		aggrFilter.push({ $match: {load_owner_mobile:queryObj.post_owner_mobile}});
	}

    if (queryObj.lead_owner_id ){
		aggrFilter.push({ $match: {lead_owner_id:queryObj.lead_owner_id}});
	}
	if (queryObj.post_owner_id ){
		aggrFilter.push({ $match: {userId:new mongoose.Types.ObjectId(queryObj.post_owner_id)}});
	}
	if (queryObj.lead_id){
		aggrFilter.push({ $match: {postingId:queryObj.lead_id}});
	}

	return aggrFilter;

}

function makeLeadsResponseKeyChanges(leads){
    for (var i=0;i<leads.length;i++){
        leads[i].post_owner_id = leads[i].userId;
        leads[i].userId= undefined;
        leads[i].post_owner_mobile = leads[i].load_owner_mobile || undefined;
        leads[i].mobile = undefined;
        leads[i].load_owner_mobile= undefined;
        leads[i].post_owner_email = leads[i].load_owner_email || undefined;
        leads[i].email=undefined;
        leads[i].load_owner_email = undefined;
        leads[i].lead_id = leads[i].postingId ;
		leads[i].postingId = undefined;
        for (var j=0;j<leads[i].interested_to.length;j++){
            leads[i].interested_to[j].interested_person_contact
                = leads[i].interested_to[j].vehicle_person_contact || undefined;
            leads[i].interested_to[j].interested_person_email
                =leads[i].interested_to[j].vehicle_person_email || undefined;
            leads[i].interested_to[j].vehicle_person_email = undefined;
            leads[i].interested_to[j].vehicle_person_contact = undefined;
        }
    }
    return leads;
}

module.exports.getLeadsByFilter = function (queryObj,next){
	var aggrFilter = prepareMatchFilterForLeads(queryObj);
    aggrFilter.push({ $project: {
        _id:1,post_owner_name:1, post_owner_company:1, mobile:1, email:1, no_of_trucks:1,
        expected_price:1, weight:1, userId:1, lead_creator_id:1, lead_creator_name:1, lead_creator_mobile:1,
        lead_owner_id:1, lead_owner_name:1, lead_owner_mobile:1, postingId:1, lead_bids:1,
        lead_status:1, materialType:1, truckType:1, date:1, isPricePerTruck:1,
        lead_owner_branch:1,load_owner_mobile:1,load_owner_email:1,
        "source.c":1,"source.d":1,"source.s":1,"source.p":1,"source.formatted_address":1,
        "destination.c":1,"destination.d":1,"destination.s":1,"destination.p":1,"destination.formatted_address":1,
        "interested_to.interest_owner_name":1,"interested_to._id":1,
        "created_at":1, "interested_to.interest_owner_company":1,"interested_to.vehicle_person_contact":1,
        "interested_to.vehicle_person_email":1
    }});
    if (queryObj.textToSearch) {
        aggrFilter.push({$sort: {score: {$meta: "textScore"}, created_at:-1}});
    }else{
        aggrFilter.push({$sort: {created_at:-1}});
    }

    var datacursor = Posting.aggregate(aggrFilter);

    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Posting.aggregate(aggrFilter);

    var no_of_documents = queryObj.no_of_docs ? queryObj.no_of_docs : NO_OF_DOCS;
    if(no_of_documents>15){
        no_of_documents = NO_OF_DOCS;
    }

    if(queryObj.skip){
        var skip_docs = (queryObj.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }

        if (countArr.length>0){
            var leadsCount = countArr[0].count;
            var no_of_pages;
            if(leadsCount/no_of_documents>1){
                no_of_pages = Math.ceil(leadsCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            datacursor.limit(parseInt(no_of_documents));
            datacursor.exec(function (err, leads) {
                var leads0 = JSON.parse(JSON.stringify(leads));
                //console.log(leads0);
                var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.data = leads_;
                objToReturn.no_of_pages = no_of_pages;
                objToReturn.total_count = leadsCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.data = [];
            objToReturn.no_of_pages = 0;
            objToReturn.total_count = 0;
            return next(null, objToReturn);
        }
    });
};

