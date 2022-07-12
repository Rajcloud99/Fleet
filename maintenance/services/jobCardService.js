
/**
 * Created by pratik on 27/12/16.
 */
var JobCard = promise.promisifyAll(commonUtil.getMaintenanceModel('jobCard'));
var Task = promise.promisifyAll(commonUtil.getMaintenanceModel('task'));
var async = require('async');
var NO_OF_DOCS =15;
var allowedFilter = ["clientId","branchId","branchName",'jobId','vehicle_number','last_trip_number','status','maintenance_type','job_type','start_date','end_date'];

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
            if(i =='start_date' && query.end_date){
                var startDate = new Date(query[i]);
                var nextDay = new Date(query.end_date);
                fFilter["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
                delete query.start_date;
                delete query.end_date;
            }else if(i =='start_date'){
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
            }else if(i =='end_date' && !query.start_date){
                var endDate = new Date(query[i]);
                fFilter["created_at"] = {
                    "$lt" :endDate
                };
            }else if (i == "jobId") {
                fFilter[i]= {$regex: query[i], $options: 'i'};
            }else {
                fFilter[i] = query[i];
            }
        }
    }
    return fFilter;
};

var allowedReportFilter = ['clientId','start_date','end_date','vehicle_number','branchId'];

var reportFilter=function(query){
    var fFilter={clientId: query.clientId};
    for(i in query){
        if(otherUtil.isAllowedFilter(i,allowedReportFilter)){
          if(i =='start_date' && query.end_date){
              var startDate = new Date(query[i]);
              var nextDay = new Date(query.end_date);
              fFilter["created_at"] = {
                      "$gte" :startDate,
                      "$lt":nextDay
              };
          }else if(i =='start_date'){
              var startDate = new Date(query[i]);
              startDate.setSeconds(0);
              startDate.setHours(0);
              startDate.setMinutes(0);
              var nextDay = new Date(startDate);
              nextDay.setDate(startDate.getDate() + 1);
              fFilter["created_at"] = {
                      "$gte" :startDate,
                      "$lt":nextDay
              };
          }else if(i =='end_date' && !query.start_date){
              var endDate = new Date(query[i]);
              fFilter["created_at"] = {
                          "$lt" :endDate
              };
          }else if(i=='vehicle_number'){
              if(query.vehicle_number>1){
                  fFilter["vehicle_number"].$in=[];
                  for (var j = 0; j < query.vehicle_number.length; j++) {
                      fFilter["vehicle_number"].$in.push(query.vehicle_number[j]);
                  }
              }
              else {
                fFilter["vehicle_number"]=query[i];
              }
          }
        }
    }
    return fFilter;
}

module.exports.getReport=function(reqQuery,next){
  var queryFilters = reportFilter(reqQuery);
  JobCard.findAsync(queryFilters)
    .then(function (data){
        async.forEachOf(data, function(jobCard, key, callback){
            Task.findAsync({jobId: jobCard.jobId})
                .then(function(taskArray){
                    for (var k = 0; k < taskArray.length; k++) {
                        data[key]._doc.decription+=taskArray[k].task_name+", ";
                    }
                    callback();
                })
        },function () {
             return next(null,data);
        })
    })
    .catch(function (err) {
        return next(err);
    });
}

module.exports.addJobCard = function(reqBody,next) {
    idUtil.generateJobCardIdAsync({clientId:reqBody.clientId})
        .then(function(jobId){
            reqBody.jobId = jobId;
            var JobCardData = new JobCard(reqBody);
            JobCardData.saveAsync(reqBody)
                .then(function(savedData) {
                    return next(null, savedData);
                })
                .catch(function(err) {
                    return next(err);
                });
        });
};

module.exports.getJobCard = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    JobCard.countAsync(queryFilters)
    .then(function(count){
        var cursor = JobCard.find(queryFilters);
        cursor.sort({"created_at":-1});
        var no_of_documents;
        if(reqQuery.all == "true"){
            no_of_documents = count;
            if(count/no_of_documents>1){
                no_of_pages = count/no_of_documents;
            }
            cursor.limit(parseInt(no_of_documents));
        }else{
            no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
            if(no_of_documents>15){
                no_of_documents = 15;
            }
            if(count/no_of_documents>1){
                no_of_pages = count/no_of_documents;
            }
            cursor.limit(parseInt(no_of_documents));
        }

        if(reqQuery && reqQuery.skip){
            var skip_docs = (reqQuery.skip-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }
		cursor.populate("vehicle");
        cursor.exec(
            function(err,available) {
                if (err){
                  return next(err);
                }
                if(available && available[0]){
                    var temp = JSON.parse(JSON.stringify(available));
                    var oRes = {};
                    oRes.no_of_pages =Math.ceil(no_of_pages);
                    oRes.data = temp;
                    return next(null, oRes);
                }else{
                    return next(null, false);
                }
            }
        )
    })
    .catch(
        function(err) {
            return next(err);
        }
    );
};

module.exports.findJobCard = function(oQuery, next) {
    JobCard.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateJobCardById = function(id,reqBody,next) {
    JobCard.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.deleteJobCardById = function(id,next) {
    var remove = {};
    remove._id= id;
    JobCard.removeAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};
