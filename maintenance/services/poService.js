let po = promise.promisifyAll(commonUtil.getMaintenanceModel('po'));
let Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
let pr = promise.promisifyAll(commonUtil.getMaintenanceModel('pr'));
let async = require('async');


let NO_OF_DOCS =15;
let allowedFilter = ['clientId','status','not_show', 'isTyre', 'isInv','type','ponumder','vendor_name','start_date','end_date','find'];

let isAllowedFilter  = function(sFilter){
    let isAllowed = false;
    if(allowedFilter.indexOf(sFilter)>=0){
        isAllowed =  true;
    }
    return isAllowed;
};

 let constructFilters = function(query){
    let fFilter = {};
    for(i in query){
        if(otherUtil.isAllowedFilter(i,allowedFilter)){
			if(i ==='start_date' && query.end_date){
				let startDate = new Date(query[i]);
				let nextDay = new Date(query.end_date);
				fFilter["created_at"] = {
					"$gte" :startDate,
					"$lt":nextDay
				};
				delete query.start_date;
				delete query.end_date;
			}else if(i ==='start_date'){
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				let nextDay = new Date(startDate);
				nextDay.setDate(startDate.getDate() + 1);
				fFilter["created_at"] = {
					"$gte" :startDate,
					"$lt":nextDay
				};
			}else if(i ==='end_date' && !query.start_date){
				let endDate = new Date(query[i]);
				fFilter["created_at"] = {
					"$lt" :endDate
				};
			}else if(i ==='not_show'){
	            fFilter["status"] = {$ne:query[i]}
            } else if(i ==='type') {
                switch (query.type){
                    case 'spare':
                    case 'Spare':
                        fFilter.haveSpare=true;
                        break;
                    case 'tool':
                    case 'Tool':
                        fFilter.haveTool=true;
                        break;
                    case 'tyre':
                    case 'Tyre':
                        fFilter.haveTyre=true;
                        break;
                }
            }
			else if(i === 'status'){
				if(query[i]==="inward"){
					fFilter[i]={$in:[constant.poStatus[5],constant.poStatus[4]]};
				}
				else{
					fFilter[i] = query[i];
				}
			}else if(i ==="find"){
				fFilter.$or=[];
				fFilter.$or.push({"ponumder":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"approver.name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"status":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"vendor_name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"payment_terms":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"remark":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"note_to_supplier":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"additional_note_to_supplier":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"created_by_name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.prnumber":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.code":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.type":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.uom":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.brand":{$regex: query[i], $options:'i'}});
			}
            else {
                fFilter[i] = query[i];
            }
        }
    }
    return fFilter;
};

module.exports.addpo = function(data,next) {
    let prs=[];
    for (let i=0; i<data.spare.length; i++){
        prs.push(data.spare[i].prnumber);
    }
    data.prs=Array.from(new Set(prs));
    poData.saveAsync(data)
        .then(function(savedData) {
            return next(null,savedData);
        })
        .catch(function(err) {
            return next(err);
        });
};

let filter=function(array, obj){
    let flag=0;
    for (let i = 0; i < array.length; i++) {
        if(array[i]._id===obj._id){
            array[i].count+=obj.count;
            flag=1;
        }
    }
    if(flag=0)array.push(obj);
};
module.exports.getVendorSuggestion =function(reqQuery,next){
    let data=[];
    po.findAsync({ponumder: reqQuery.ponumder})
        .then(function (poData){
              async.forEachOf(poData[0].spare,function (spare, key, callback){
                    Inventory.aggregateAsync([{$match: {"spare_code": spare.code}}
                                            , { $group : { _id : "$vendor_id", "count":{$sum : 1} }}])
                        .then(function (iSpare){
                            for(let i=0; i<iSpare.length; i++){
                               filter(data, iSpare[i]);
                            }
                            callback();
                        })
              },function () {
                     return next(null,data);
              })
        })
};

module.exports.newpo =function(reqQuery,next){
    let poData={};
    poData.clientId=reqQuery.clientId;
    poData.created_by_name=reqQuery.created_by_name;
    poData.created_by_employee_code=reqQuery.created_by_employee_code;
    poData.created_by=reqQuery.created_by;
    idUtil.generatePOCodeAsync({clientId:reqQuery.clientId})
        .then(function(res){
            if(res.newCode==null)
                return next(null,res);
            poData.ponumder=res.newCode;
            let poD = new po(poData);
            poD.saveAsync(poData)
                .then(function(savedData) {
                    return next(null,savedData);
                })
                .catch(function(err) {
                    return next(err);
                });
        }).catch(next)
};

module.exports.deletepoById = function(id,next) {
    let remove = {};
    remove._id= id;
    po.deleteAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};

/*module.exports.updatepoById = function(id,reqBody,next) {
    reqBody.total=0;
    reqBody.haveSpare=false;
    reqBody.haveTool=false;
    reqBody.haveTyre=false;

    for(let i=0; i<reqBody.spare.length; i++){
        switch (reqBody.spare[i].type){
            case constant.spType[0]: reqBody.haveSpare=true; break;
            case constant.spType[1]: reqBody.haveTool=true; break;
            case constant.spType[2]: reqBody.haveTyre=true; break;
        }
        reqBody.spare[i].quantity=reqBody.spare[i].quantity||0;
        reqBody.spare[i].uom=reqBody.spare[i].uom;
        reqBody.spare[i].rate=reqBody.spare[i].rate||0;
        reqBody.spare[i].total=(reqBody.spare[i].rate_inc_tax||reqBody.spare[i].rate)*reqBody.spare[i].quantity;
        reqBody.total=reqBody.total+reqBody.spare[i].total;
    }
    let filter={};
    filter._id=id;
    filter.status="Unapproved";
    if(reqBody.updateFromOther===true){
      delete filter.status;
    }
    po.findOneAndUpdateAsync(filter,{$set:reqBody})
    .then(function(updated){
        if(!updated) return next("Only Unapproved PO can be edited");
      //db.pos.aggregate([{$match:{clientId:'100001'}},{$unwind: '$spare'},{$group:{'_id':'$spare.pr_id','qty':{$sum :'$spare.quantity'}}}]);
        async.forEachOf(updated.spare,function (sparePr, key, callback){
          pr.findAsync({_id:sparePr.pr_id})
             .then(function(pr){
               let aPr = JSON.parse(JSON.stringify(pr));
               if( aPr && aPr[0]){
                 sparePr.oPR = aPr[0];
                 let aggregate = [{$match:{clientId:reqBody.clientId,'spare.pr_id':sparePr.pr_id}},{$unwind: '$spare'},{$group:{'_id':'$spare.pr_id','qty':{$sum :'$spare.quantity'}}}];
                 return po.aggregateAsync(aggregate);
               }else{
                 return null;
               }
             }).then(function(poss){
               if(poss){
                 for(let i=0;i<poss.length;i++){
                   if(poss[i]._id.toString() == sparePr.pr_id.toString()){
                       let remaining_quantity =  sparePr.oPR.quantity - poss[i].qty;
                       let oUpdate = { 'remaining_quantity' : remaining_quantity};
                       if(remaining_quantity < 1){
                         oUpdate.deleted = true;
                       }else{
                         oUpdate.deleted = false;
                       }
                       return pr.findOneAndUpdateAsync({_id:sparePr.pr_id},{$set:oUpdate});
                   }
                 }
               }else{
                   return undefined;
               }
            }).then(function (saved) {
              if(!saved){
                return next("pr data not edited");
              }
            callback();
            })
        },function () {
            return next(null, updated);
        })
    }).catch(function (err) {
        return next(err);
    });
};*/


module.exports.findandUpdatePOById = function(id,reqBody,next) {
    if(reqBody.ponumder){
        delete reqBody.ponumber;
    }
    if(reqBody.created_at){
        delete reqBody.created_at;
    }

    po.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
    .then(function(po) {
            return next(null, po);
    })
    .catch(function(err) {
            return next(err);
    });
};

module.exports.getallpo = function(reqQuery, next) {
    let typeFilter={};
    typeFilter.$match={};
    if(reqQuery.type){

        typeFilter.$match["spare.type"]=reqQuery.type;
    }
    let queryFilters = constructFilters(reqQuery);
    po.aggregateAsync([{$match: queryFilters},{ $sort : { 'created_at' : 1 } },{$unwind: '$spare'},typeFilter,
                { $group: {_id: '$_id', spare: {$push: '$spare'},
                    ponumder:{$first:'$ponumder'},
                    branchId:{$first:'$branchId'},
                    branchName:{$first:'$branchName'},
                    haveTool:{$first:'$haveTool'},

                    payment_terms:{$first:'$payment_terms'},
                    note_to_supplier:{$first:'$note_to_supplier'},
                    additional_note_to_supplier:{$first:'$additional_note_to_supplier'},

                    haveSpare:{$first:'$haveSpare'},
                    haveTyre:{$first:'$haveTyre'},
                    freight:{$first:'$freight'},
					rFreight:{$first:'$rFreight'},
					tax:{$first:'$tax'},
                    total:{$first:'$total'},
                    vendor_name:{$first:'$vendor_name'},
                    vendorId:{$first:'$vendorId'},
                    vendor_id:{$first:'$vendor_id'},
                    status:{$first:'$status'},
                    clientId:{$first:'$clientId'},
                    approver:{$first:'$approver'},
                    billing_location:{$first:'$billing_location'},
                    shipping_location:{$first:'$shipping_location'},
                    promised_date:{$first:'$promised_date'},
                    needed_date:{$first:'$needed_date'},
                    created_by_name:{$first:'$created_by_name'},
                    created_by_employee_code:{$first:'$created_by_employee_code'},
                    created_by:{$first:'$created_by'},
                    last_modified_by_name:{$first:'$last_modified_by_name'},
                    last_modified_employee_code:{$first:'$last_modified_employee_code'},
                    last_modified_by:{$first:'$last_modified_by'},
                    created_at:{$first:'$created_at'},
                    last_modified_at:{$first:'$last_modified_at'}}}])
        .then(function (available) {
            return next(null, available);
        })
        .catch(function (err) {
            return next(err);
        });
};


module.exports.getpo = function(reqQuery, next) {
    let queryFilters = constructFilters(reqQuery);
    let no_of_pages = 1;
    po.countAsync(queryFilters)
    .then(function(count){
        let cursor = po.find(queryFilters);
        cursor.sort({'created_at' : -1})
        let no_of_documents;
        if(reqQuery.all === "true"){
            no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
            if(count/no_of_documents>1){
                no_of_pages = postingsCount/no_of_documents;
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
            let skip_docs = (reqQuery.skip-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }

        cursor.exec(
            function(err,available) {
                if (err){
                  return next(err);
                }
                if(available && available[0]){
                    let temp = JSON.parse(JSON.stringify(available));
                    let oRes = {};
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

module.exports.findpo = function(oQuery, next) {
    po.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};


module.exports.addPoItemById = function(id,reqBody,next) {
    reqBody.total=0;
    reqBody.haveSpare=false;
    reqBody.haveTool=false;
    reqBody.haveTyre=false;

    for(let i=0; i<reqBody.spare.length; i++){
        switch (reqBody.spare[i].type){
            case constant.spType[0]: reqBody.haveSpare=true; break;
            case constant.spType[1]: reqBody.haveTool=true; break;
            case constant.spType[2]: reqBody.haveTyre=true; break;
        }
        reqBody.spare[i].quantity=reqBody.spare[i].quantity||0;
        reqBody.spare[i].uom=reqBody.spare[i].uom;
        reqBody.spare[i].rate=reqBody.spare[i].rate||0;
        reqBody.spare[i].total=(reqBody.spare[i].rate_inc_tax||reqBody.spare[i].rate)*reqBody.spare[i].quantity;
        reqBody.total=reqBody.total+reqBody.spare[i].total;
    }
    let filter={};
    filter._id=id;
    filter.status="Unapproved";
    let prs=[];
    for (let i=0; i<reqBody.spare.length; i++){
        prs.push(reqBody.spare[i].prnumber);
    }
    reqBody.prs=Array.from(new Set(prs));
    po.findOneAndUpdateAsync(filter,{$set:reqBody}, {new: true})
    .then(function(updatedPO){
       if(updatedPO){
            let poData = JSON.parse(JSON.stringify(updatedPO));
            async.forEachOf(poData.spare,function (spare, i, callback){
                //db.prs.update({"prnumber" : spare.prnumber,"spare.code" : spare.code},{$push:{"spare.$.po_no":poData.ponumder},"$inc":{"spare.$.remaining_quantity":spare.delta}})
                pr.findOneAndUpdateAsync({"prnumber" : spare.prnumber,"spare.code" : spare.code},{"$addToSet":{"spare.$.po_no":poData.ponumder},"$inc":{"spare.$.remaining_quantity":spare.delta}}, {new: true})
                .then(function (updated){
                    callback();
                })
                .catch(function(err) {
                    callback();
                });
            }, function(err){
                if(err) return(err);
                return next(null, poData)
            })
       }else{
            return next(null, false);
        }
    }).catch(function (err) {
        return next(err);
    });
};
