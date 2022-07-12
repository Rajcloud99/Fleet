/**
 * @Author: bharath
 * @Date:   2016-10-20T17:20:38+05:30
 */
var NO_OF_DOCS = 50;
var Invoice = promise.promisifyAll(commonUtil.getModel('invoice'));
var InvoiceXMLJsonModel = promise.promisifyAll(require('../models/invoiceXmlJsonModel'));
var XmlJsonMappingService = promise.promisifyAll(commonUtil.getService('xmlJsonMapping'));
var BranchService = promise.promisifyAll(commonUtil.getService("branch"));
var billsService = promise.promisifyAll(commonUtil.getService('bills'));
var CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
var allowedFilter = ['invoice_no','clientId', 'trip_no', 'status', 'booking_no', 'billed_start_date', 'billed_end_date', 'more_status', 'boe_no', 'customer_id', 'start_date', 'end_date', 'dispatch_start_date', 'dispatch_end_date', 'gr_no', 'billing_party_name', 'billing_party_id', 'billed_date', 'bill_no', 'container_no', 'route_name', 'vehicle_no'];
var allowedBillFilter = ['clientId', 'trip_no','status','before_billed_date','billed_date','start_date'];
var constructFilters = function (query) {
    var fFilter = {"deleted": false};
    for (i in query) {
        if (otherUtil.isAllowedFilter(i, allowedFilter)) {
            if (i == 'start_date' && query.end_date) {
                var startDate = new Date(query[i]);
                var nextDay = new Date(query.end_date);
                fFilter["invoice_date"] = {
                    "$gte": startDate,
                    "$lt": nextDay
                };
            } else if (i == 'start_date') {
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["invoice_date"] = {
                    "$gte": startDate,
                    "$lt": nextDay
                };
            } else if (i == 'end_date' && !query.start_date) {
                var endDate = new Date(query[i]);
                fFilter["invoice_date"] = {
                    "$lt": endDate
                };
            }
            if (i == 'dispatch_start_date' && query.dispatch_end_date) {
                var startDate = new Date(query[i]);
                var nextDay = new Date(query.dispatch_end_date);
                fFilter["dispatch_date"] = {
                    "$gte": startDate,
                    "$lt": nextDay
                };
            } else if (i == 'dispatch_start_date') {
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["dispatch_date"] = {
                    "$gte": startDate,
                    "$lt": nextDay
                };
            } else if (i == 'dispatch_end_date' && !query.dispatch_start_date) {
                var endDate = new Date(query[i]);
                fFilter["dispatch_date"] = {
                    "$lt": endDate
                };
            }

            if (i == 'billed_start_date' && query.billed_end_date) {
                var startDate = new Date(query[i]);
                var nextDay = new Date(query.billed_end_date);
                nextDay.setSeconds(59);
                nextDay.setHours(23);
                nextDay.setMinutes(59);
                fFilter["billed_date"] = {
                    "$gte": startDate,
                    "$lte": nextDay
                };
            } else if (i == 'billed_start_date') {
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["billed_date"] = {
                    "$gte": startDate,
                    "$lt": nextDay
                };
            } else if (i == 'billed_end_date' && !query.billed_start_date) {
                var endDate = new Date(query[i]);
                fFilter["billed_date"] = {
                    "$lt": endDate
                };
            }



            if (i == 'booking_no') {
                fFilter['booking_no'] = parseInt(query[i]);
            } else if (i == 'customer_id') {
                fFilter['customer_id'] = query[i];
            }

            // created_by: {
            //     date: Date,
            //         name: String,
            //             userId: String
            // },
            /* else if (i == 'created_by') {
                fFilter['created_by'] = query[i];
             }  */


            //  else if (i == 'customer_id') {
            //     fFilter['customer_id'] = query[i];
            // }

            else if (i == 'boe_no') {
                fFilter['booking_info.boe_no'] = parseInt(query[i]);
            } else if (i == 'container_no') {
                fFilter['booking_info.container_no'] = query[i];
            } else if (i == 'trip_no') {
                fFilter['booking_info.trip_no'] = (typeof query[i] == "string")?parseInt(query[i]):query[i];
            } else if (i == 'gr_no') {
                fFilter['booking_info.gr_no'] = query[i];
            } else if (i == 'route_name') {
                fFilter['booking_info.route'] = query[i];
            } else if (i == 'vehicle_no') {
                fFilter['booking_info.veh_no'] = query[i];
            }else if(i =="more_status"){
                //more_status=JSON.stringify(["approved", "dispatched"]);
                var parseFilter = JSON.parse(query[i]);
                fFilter["status"] = {"$in":parseFilter};
            } else {
                fFilter[i] = query[i];
            }
        }
    }
    return fFilter;
};
var constructBillsFilters = function(query){
    var fFilter = {"deleted":false,"bill_no":{$exists:true}};
    for(i in query){
        if(otherUtil.isAllowedFilter(i,allowedBillFilter)){
           if(i =='billed_date'){
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["billed_date"] = {
                            "$gte" :startDate,
                            "$lt":nextDay
                };
            }else if(i =='before_billed_date'){
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                fFilter["billed_date"] = {
                            "$lt" :startDate
                    };
            } else if (i == 'start_date' && query.end_date) {
				var startDate = new Date(query[i]);
				var nextDay = new Date(query.end_date);
				fFilter["billed_date"] = {
					"$gte": startDate,
					"$lt": nextDay
				};
			}else {
                fFilter[i] = query[i];
            }

        }
    }
    return fFilter;
 };
generateInvoiceXMLData = function(trip,response,callback){
  BranchService.findBranchQueryAsync({name:response.branch,clientId:trip.clientId})
    .then(function(branch){
      oResp = JSON.parse(JSON.stringify(response));
      if(branch && branch[0]){
        oResp.profit_center = branch[0].profit_center;
        oResp.cost_center = branch[0].cost_center;
      }
      var dataIDOC = XmlJsonMappingService.prepareInvoiceXMLJsonData(null,oResp);
      var dataToSave = {clientId:trip.clientId,data:dataIDOC};
      var invoiceXMLJsonDataToSave = new InvoiceXMLJsonModel(dataToSave);
      return invoiceXMLJsonDataToSave.saveAsync();
    }).then(function (savedData) {
          callback();
    });
};
module.exports.generateInvoiceXMLDataNew = function(invoice,callback){
  BranchService.findBranchQueryAsync({name:invoice.branch,clientId:invoice.clientId})
    .then(function(branch){
      if(branch && branch[0]){
        invoice.profit_center = branch[0].profit_center;
        invoice.cost_center = branch[0].cost_center;
        if(!branch[0].profit_center) {}//console.log('no profit_center for ',branch[0].name);
        //console.log(invoice.billing_party_name);
        return CustomerService.findCustomerQueryAsync({_id:invoice.billing_party_id,clientId:invoice.clientId});
      }else{
        //console.log('no branch for ',invoice);
      }

    }).then(function (billingParty) {
      if(billingParty && billingParty[0]){
        if(!billingParty[0].sap_id) console.log('no sap id for ',billingParty[0].name);
        invoice.sap_id = billingParty[0].sap_id || invoice.sap_id;
        invoice.billing_party_gstin_no = billingParty[0].gstin_no || invoice.billing_party_gstin_no;
        var dataIDOC = XmlJsonMappingService.prepareInvoiceXMLJsonData(null,invoice);
        var dataToSave = {clientId:invoice.clientId,data:dataIDOC};
        var invoiceXMLJsonDataToSave = new InvoiceXMLJsonModel(dataToSave);
        invoiceXMLJsonDataToSave.saveAsync();
        return invoice;
      }else{
        return console.log('error no billingParty for',invoice);
      }

    }).then(function (savedData) {
          callback(null,invoice);
    });
};

module.exports.addInvoice = function (trip, next) {
    var data = billsService.prepareInvoiceData(trip);
    Invoice.countAsync({clientId : trip.clientId})
        .then(function (allCount) {
           Invoice.countAsync({clientId: trip.clientId, trip_no: trip.trip_no})
              .then(function (count) {
                if (count === 0) {
                async.each(data, function (invoice, callback) {
                 invoice.invoice_no = data.indexOf(invoice) + allCount + 1;
                 var newInvoiceData = new Invoice(invoice);
                 newInvoiceData.saveAsync()
                    .then(function (savedInvoice) {
                        callback();
                        //generateInvoiceXMLData(trip,savedInvoice,callback);
                    })
                   .error(function (err) {
                        winston.info('inv err', err);
                    });
                 }, function (err) {
                     if(err) winston.info('inv err', err);
                     next(null, null);
                 });
            }else{
               winston.info('invoice count: '+count);
               next(null, null);
            }
    }).catch(next);
}).catch(next);
};

module.exports.findInvoiceByInvoiceId = function (query, next) {
    Invoice.findAsync(query)
        .then(function (invoice) {
            return next(null, invoice);
        })
        .catch(function (err) {
            return next(err);
        });
};

module.exports.findInvoice = function (query, next) {
    var ffFilters = constructFilters(query);
    delete ffFilters.start_date;
    delete ffFilters.end_date;
    delete ffFilters.dispatch_start_date;
    delete ffFilters.dispatch_end_date;
    Invoice.findAsync(ffFilters)
        .then(function (invoice) {
            return next(null, invoice);
        })
        .catch(function (err) {
            return next(err);
        });
};
module.exports.findBilled = function (query, next) {
    var ffFilters = constructBillsFilters(query);
	//var failedTrips = [153,160,290,291,292,293,317,318,323,324,329,331,350,353,356,383,390,392,394,397,398,399,400,405,409,412,413,414,415,419,422,433,434,435,477,478,480,482,483,491,492,493,494,544,545,546,549,561,562,563,564,565,641,642,643,644,645,646,647,1451,1452,1453,1454,1455,1456,1462,1463,1464,1465,1466,1467,1468,1469,1470,1489,1559,1673,1676,1678,1679,1681,1682,1683,1685,1686,1687,1688,1689,1690,1692,1693,1862,1891,1892,1982,1991,2088,2089,2090,2115,2156,2157,2158,2159,2160,2161,2198,2199,2485,2487,2709,2710,2711,2860,2862,2863,2864,2888,3035,3036,3037,3273,3400,3529,3577,3700,3701,4215,4216,4217,4345,4541,4542,4544];
	//ffFilters['booking_info.trip_no'] = {$in : failedTrips };

	Invoice.findAsync(ffFilters)
        .then(function (invoice) {
            return next(null, invoice);
        })
        .catch(function (err) {
            return next(err);
        });
};

module.exports.findInvoicebyId = function (id, next) {
    Invoice.findAsync({"_id": id})
        .then(function (invoice) {
            //console.log(invoice);
            return next(null, invoice);
        })
        .catch(function (err) {
            return next(err);
        });
};

module.exports.updateInvoice = function (id, details, next) {
    Invoice.findOneAndUpdateAsync({"_id": id}, {"$set": details}, {"new": true, "runValidators": true})
        .then(function (doc) {
            var temp = JSON.parse(JSON.stringify(doc));
            return next(null, temp);
            /*
            var dataIDOC = XmlJsonMappingService.prepareInvoiceXMLJsonData(null,temp);
            var dataToSave = {clientId:doc.clientId,data:dataIDOC};
            var invoiceXMLJsonDataToSave = new InvoiceXMLJsonModel(dataToSave);
            invoiceXMLJsonDataToSave.saveAsync()
                .then(function (savedData) {
                    return next(null, temp);
                }).catch(next);
                */
        })
        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};
module.exports.updateInvoiceByQuery = function (query, details, next) {
	Invoice.findOneAndUpdateAsync(query, {"$set": details}, {"new": true, "runValidators": true})
		.then(function (doc) {
			var temp = JSON.parse(JSON.stringify(doc));
			return next(null, temp);
		})
		.catch(function (err) {
			winston.info(err);
			next(err);
		});
};
module.exports.updateBill = function (query, details, next) {
    Invoice.updateAsync(query, {"$set": details}, {"new": true, "multi": true})
        .then(function (doc) {
            var temp = JSON.parse(JSON.stringify(doc));
            return next(null, temp);
        })
        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};

module.exports.resetBill = function (query, next) {
	Invoice.updateAsync({"bill_no":query.bill_no,clientId:query.clientId},{$unset:{bill_no:"",billed_date:""},$set:{status:"pending"}},{"multi":true})
		.then(function (doc) {
			var temp = JSON.parse(JSON.stringify(doc));
			return next(null, temp);
		})
		.catch(function (err) {
			winston.info(err);
			next(err);
		});
};


module.exports.getInvoice = function (reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    delete queryFilters.start_date;
    delete queryFilters.end_date;
    delete queryFilters.dispatch_start_date;
    delete queryFilters.dispatch_end_date;
    delete queryFilters.billed_start_date;
    delete queryFilters.billed_end_date;
    var no_of_pages = 1;
    Invoice.countAsync(queryFilters)
        .then(function (count) {
            var cursor = Invoice.find(queryFilters);

            var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
            if (no_of_documents > 80) {
                no_of_documents = 80;
            }
            if (reqQuery.all == "true") {
                no_of_documents = 100000;
            }
            if (reqQuery && reqQuery.skip) {//TODO check field is valid or not
                var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                cursor.skip(parseInt(skip_docs));
            }
            cursor.sort({'invoice_no': -1});
            if (count / no_of_documents > 1) {
                no_of_pages = count / no_of_documents;
            }
            cursor.limit(no_of_documents);
            cursor.exec(
                function (err, available) {
                    if (err) {
                        return next(err);
                    }
                    if (available && available[0]) {
                        var temp = JSON.parse(JSON.stringify(available));
                        var oRes = {};
                        oRes.no_of_pages = Math.ceil(no_of_pages);
                        oRes.count = count
                        oRes.data = temp;
                        return next(null, oRes);
                    } else {
                        return next(null, false);
                    }
                }
            )
        })
        .catch(
            function (err) {
                return next(err);
            }
        );
};


module.exports.getProfitabilityInvoice = function (query, next) {
    var cursor = Invoice.find(query);
    cursor.exec(function (err, available) {
        if (err) {
            return next(err);
        }
        if (available && available[0]) {
            var temp = JSON.parse(JSON.stringify(available));
            return next(null, temp);
        } else {
            return next(null, false);
        }
    })
        .catch(
            function (err) {
                return next(err);
            }
        );
};


module.exports.searchBills = function (reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    delete queryFilters.start_date;
    delete queryFilters.end_date;
    delete queryFilters.dispatch_start_date;
    delete queryFilters.dispatch_end_date;
    var no_of_pages = 1;
    var count = 0;
    var matchQuery = { $match : queryFilters};
    var groupQuery = { $group : { _id : "$bill_no", "Total":{$sum : "$sub_total"},"dispatch_date":{$first:"$dispatch_date"},"billed_date":{$first:"$billed_date"},"trip_no":{$first:"$trip_no"},"container_no":{$first:"$container_no"},"booking_no":{$first:"$booking_no"},"boe_no":{$first:"$boe_no"},"status":{$first:"$status"},"route":{$first:"$booking_info.route"},
        "due_date":{$first:"$due_date"},"created_by":{$first:"$created_by.name"}, "billing_party_name":{$first:"$billing_party_name"}, "customer_name":{$first:"$customer_name"} }};
    var sortQuery = {"$sort":{"billed_date":-1}};
    var countQuery = {$count:"count"};
    var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
    if (no_of_documents > 15) {
        no_of_documents = 15;
    };
    var limitQuery = (reqQuery && reqQuery.all=="true")?{$limit: 100000}:{$limit: no_of_documents};
    Invoice.aggregateAsync([matchQuery,groupQuery,countQuery])
    .then(
        function (countData) {
            if (countData && countData[0]) {
                count = countData[0].count || 0;
                var aQuery = [matchQuery,groupQuery,sortQuery];
                if (reqQuery && reqQuery.skip) {
                    var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                    aQuery.push({$skip: skip_docs});
                }
                if (count / no_of_documents > 1) {
                    no_of_pages = count / no_of_documents;
                }
                aQuery.push(limitQuery);
                Invoice.aggregateAsync(aQuery)
                .then(
                    function (available) {
                        if (available && available[0]) {
                            var temp = JSON.parse(JSON.stringify(available));
                            var oRes = {};
                            oRes.no_of_pages = Math.ceil(no_of_pages);
                            oRes.count = count
                            oRes.data = temp;
                            return next(null, oRes);
                        } else {
                            return next(null, false);
                        }
                    }
                )
            } else {
                return next(null, false);
            }
        }
    ).catch(
        function (err) {
            return next(err);
        }
    );
};

module.exports.searchBillsMerge = function (reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    delete queryFilters.start_date;
    delete queryFilters.end_date;
    delete queryFilters.dispatch_start_date;
    delete queryFilters.dispatch_end_date;
    var no_of_pages = 1;
    var count = 0;
    var matchQuery = { $match : queryFilters};
    var groupQuery = { $group :
    	{
	    	 _id : "$bill_no",
	    	"billing_party_name":{$addToSet:"$billing_party_name"},
	    	"customer_name":{$addToSet:"$customer_name"},
	    	"route":{$addToSet:"$route"},
	    	"booking_no":{$addToSet:"$booking_no"},
	    	"trip_no":{$addToSet:"$trip_no"},
	    	"gr_no":{$addToSet:"$gr_no"},
	    	"gr_type":{$addToSet:"$gr_type"},
	    	"vehicle_no":{$addToSet:"$vehicle_no"},
	    	"vehicle_type":{$addToSet:"$vehicle_type"},
	    	"boe_no":{$addToSet:"$boe_no"},
	    	"container_no":{$addToSet:"$container_no"},
	    	"weight":{$addToSet:"$weight"},
	    	"rate":{$addToSet:"$rate"},
	    	"freight":{$addToSet:"$freight"},
	    	"detaintion":{$addToSet:"$detaintion"},
	    	"other_charges":{$addToSet:"$other_charges"},
	    	"balance":{$addToSet:"$balance"},
	    	"billed_by":{$addToSet:"$billed_by.name"},
            "inserted_by":{$addToSet:"$inserted_by.name"},
            "created_by": { $addToSet: "$created_by.name" },


    	}
    };
    var sortQuery = {"$sort":{"billed_date":-1}};
    var countQuery = {$count:"count"};
    var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
    if (no_of_documents > 15) {
        no_of_documents = 15;
    };
    var limitQuery = (reqQuery && reqQuery.all=="true")?{$limit: 100000}:{$limit: no_of_documents};
    Invoice.aggregateAsync([matchQuery,groupQuery,countQuery])
    .then(
        function (countData) {
            if (countData && countData[0]) {
                count = countData[0].count || 0;
                var aQuery = [matchQuery,groupQuery,sortQuery];
                if (reqQuery && reqQuery.skip) {
                    var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                    aQuery.push({$skip: skip_docs});
                }
                if (count / no_of_documents > 1) {
                    no_of_pages = count / no_of_documents;
                }
                aQuery.push(limitQuery);
                Invoice.aggregateAsync(aQuery)
                .then(
                    function (available) {
                        if (available && available[0]) {
                            var temp = JSON.parse(JSON.stringify(available));
                            var oRes = {};
                            oRes.no_of_pages = Math.ceil(no_of_pages);
                            oRes.count = count
                            oRes.data = temp;
                            return next(null, oRes);
                        } else {
                            return next(null, false);
                        }
                    }
                )
            } else {
                return next(null, false);
            }
        }
    ).catch(
        function (err) {
            return next(err);
        }
    );
};
