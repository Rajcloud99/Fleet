
/**
 * Created by ajay on 3/10/16.
 */
var Promise = require('bluebird');
var GR = Promise.promisifyAll(commonUtil.getModel('gr'));
var UserService = Promise.promisifyAll(commonUtil.getService('user'));
var GRstatusService = Promise.promisifyAll(commonUtil.getService('grStatus'));
var NO_OF_DOCS =10;
var allowedFilter = ["_id","clientId","branch_name","gr_no","book_year","book_no","isCentralized","isActive","branch"];
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
            if(i =='gr_no'){
                var parsedGR = parseInt(query[i]);
                fFilter.gr_no_start = {$lte:parsedGR};//reqQuery.branch_name;
                fFilter.gr_no_end = {$gte:parsedGR};
            }else if(i =='isCentralized'){
                fFilter.isCentralized = query[i] == "true" ? true : false;//reqQuery.branch_name;
            }else if(i =='isActive'){
				fFilter.isActive = query[i].toString() == "true" ? true : false;//reqQuery.branch_name;
			}else{
               fFilter[i] = query[i];
            }
        }
    }
    return fFilter;
};

module.exports.generateGR = function(reqQuery, next) {
    UserService.findUsersByQueryAsync({"clientId":reqQuery.clientId,active_gr_book:{$exists:true}})
    .then(
        function(users) {
            if(users && users[0]){
               GR.findAsync({"clientId":reqQuery.clientId,"isActive":true,"isCentralized":true,"_id":users[0].active_gr_book})
                .then(function(data){
                    if(data && data[0]){
                        GRstatusService.countGRstatusByQueryAsync({"clientId":reqQuery.clientId,"isCentralized":true,"grCode": data[0].grCode,"book_year":data[0].book_year,"book_no":data[0].book_no})
                        .then(function(count){
                            var generateGRNumber = data[0].grCode + data[0].grSeries + data[0].book_year.toString() + data[0].book_no.toString()+(count +1);
                            return next(null, generateGRNumber);
                        })
                    }else{
                        return next(null, null);
                    }
                })
            }

        }
    )
    .catch(
        function(err) {
            winston.error("Error in Centralized gr:" + err);
            return next(err);
        }
    );
};

module.exports.findUserActiveGR = function(reqQuery, next) {
    UserService.findUsersByQueryAsync({"clientId":reqQuery.clientId,active_gr_book:{$exists:true}})
    .then(
        function(users) {
            if(users && users[0]){
               GR.findAsync({"clientId":reqQuery.clientId,"isActive":true,"isCentralized":true,"_id":users[0].active_gr_book})
                .then(function(data){
                    if(data && data[0]){
                        return next(null, data[0]);
                    }
                })
            }

        }
    )
    .catch(
        function(err) {
            winston.error("Error in Centralized gr:" + err);
            return next(err);
        }
    );
};

module.exports.addGR = function(data,next) {
    if((data.isCentralized === true) && (data.isActive === true)){
        GR.updateAsync({"clientId":data.clientId,isCentralized:true},{$set:{isActive:false}},{multi: true})
        .then(function(preUpdate){
            var gr = new GR(data);
            gr.saveAsync(data)
            .then(function(grData) {
                winston.info("added gr",JSON.stringify(grData));
                if(grData.isActive){
                    return UserService.updateUserByQueryAsync({"clientId":grData.clientId,"clientAdmin":true },{"active_gr_book":grData._id})
                        .then(function(userData){
                            return next(null, grData);
                        })
                }else{
                    return next(null, grData);
                }
            })
            .catch(function(err) {
                winston.error("error in add gr:" + err);
                return next(err);
            });
        })
        .catch(function(err) {
            winston.error("error in add gr:" + err);
            return next(err);
        });
    }else{
        var gr = new GR(data);
        gr.saveAsync(data)
        .then(function(grData) {
            winston.info("added gr",JSON.stringify(grData));
            if(grData.isActive){
                return UserService.updateUserByQueryAsync({"clientId":grData.clientId,"clientAdmin":true},{"active_gr_book":grData._id})
                    .then(function(userData){
                        return next(null, grData);
                    })
            }else{
                return next(null, grData);
            }
        })
        .catch(function(err) {
            winston.error("error in add gr:" + err);
            return next(err);
        });
    }

};
module.exports.searchGR = function(reqQuery, next) {
    GR.findAsync()
    .then(
        function(gr_data_list) {
            winston.info("got gr list");
            return next(null, gr_data_list);
        }
    )
    .catch(
        function(err) {
            winston.error("Error in getGRData:" + err);
            return next(err);
        }
    );
};
module.exports.isGRavailableinMaster = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    //db.grs.find({"branch_name" : "Okhla","gr_no_start" : {$lte:500}, "gr_no_end" : {$gte:500}})
    GR.countAsync(queryFilters)
    .then(function(count){
        var cursor = GR.find(queryFilters).populate('created_by','full_name');
        var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
        if(no_of_documents>10){
            no_of_documents = 10;
        }
        if(reqQuery && reqQuery.skip){//TODO check field is valid or not
            var skip_docs = (reqQuery.skip-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }
        if(reqQuery && reqQuery.sortby && reqQuery.sortby.split(':')){
            var params = reqQuery.sortby.split(':');
            if(params[0]  && params[0] == 'created_at'){
                var oSort = {'created_at' : params[1]}
                cursor.sort(oSort);
            }
        }
        if(count/no_of_documents>1){
            no_of_pages = count/no_of_documents;
        }
		if (!reqQuery.all) {
			cursor.limit (no_of_documents);
		}

        cursor.exec(
            function(err,available) {
                if (err){
                  return next(err);
                }
                if(available && available[0]){
                    winston.info("gr is available");
                    var tempGR = JSON.parse(JSON.stringify(available));
                    var oRes = {};
                    oRes.no_of_pages =Math.ceil(no_of_pages);
                    oRes.data = tempGR;
                    return next(null, oRes);
                }else{
                    return next(null, false);
                }
            }
        )
    })

    .catch(
        function(err) {
            winston.error("Error in get available:" + err);
            return next(err);
        }
    );
};

module.exports.findGrId = function(id, next) {
    GR.findAsync({"_id":id})
    .then(function (gr) {
        return next(null, gr);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateGrId = function(id,reqBody,next) {
    if((reqBody.isCentralized === true) && (reqBody.isActive === true)){
        GR.updateAsync({"clientId":reqBody.clientId,isCentralized:true},{$set:{isActive:false}},{multi: true})
        .then(function(preUpdate){
            GR.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
            .then(function(grData){
                if(grData.isActive){
                        UserService.updateUserByQueryAsync({"clientId":grData.clientId,active_gr_book:{$exists:true}},{"active_gr_book":grData._id})
                            .then(function(userData){
                                return next(null, grData);
                            })
                    }else{
                        return next(null, grData);
                    }
            }).catch(function (err) {
                return next(err);
            });
        })
        .catch(function (err) {
            return next(err);
        });
    }else{
        GR.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
        .then(function(grData){
            if(grData.isActive){
                    UserService.updateUserByQueryAsync({"clientId":grData.clientId,active_gr_book:{$exists:true}},{"active_gr_book":grData._id})
                        .then(function(userData){
                            return next(null, grData);
                        })
                }else{
                    return next(null, grData);
                }
        }).catch(function (err) {
            return next(err);
        });
    }

};





