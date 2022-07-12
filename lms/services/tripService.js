var Promise = require('bluebird');
var NO_OF_DOCS = 15;
var Trip = Promise.promisifyAll(commonUtil.getModel('trip'));
var Client = Promise.promisifyAll(commonUtil.getModel('client'));
var invoiceService = Promise.promisifyAll(commonUtil.getService('invoice'));
var TripExpensesService = Promise.promisifyAll(commonUtil.getService('trip_expenses'));
var bookingService = Promise.promisifyAll(commonUtil.getService('booking'));
var registeredVehicleService = Promise.promisifyAll(commonUtil.getService('registeredVehicle'));
var tripService = Promise.promisifyAll(commonUtil.getService('trip'));
var locationService = promise.promisifyAll(commonUtil.getService("location"));
var GRstatusService = promise.promisifyAll(commonUtil.getService('grStatus'));

var allowedFilter = ['clientId', 'isMarketVehicle', 'ack_stage', 'allocation_date', 'trip_start_date', 'ack_receiving_date', 'trip_end_date', 'trip_cancel_date', 'container_no', 'gr_done', 'trip_stage', 'gr_stage', 'diesel_stage', 'status', 'type', 'vehicle_no', 'trip_no', 'booking_no', 'boe_no', 'customer_id', 'customer_name', 'start_date', 'end_date', 'route_id', 'trip_end', 'gr_ack_exp_date', 'trip_status', 'status_value'];
var allowedParams = ['sortby'];

function createTripId(post, count) {

    var tripID, tripCount, Material_Truck_Type = "NON",
        pCount = "000",
        tripDate = "";
    if (post.post_type == "truck") {
        tripID = "TT";
    } else {
        tripID = "TL";
    }
    var ddmmyy = otherUtil.getDDMMYY();
    var tripCount = (count + 1);
    tripID = tripID + ddmmyy + (count + 1);

    return { 'tripID': tripID, trip_no: tripCount };
};
var constructFilters = function (query) {
    var fFilter = { "deleted": false };
    for (i in query) {
        if (otherUtil.isAllowedFilter(i, allowedFilter)) {
            if (i == 'start_date' && query.end_date) {
                var startDate = new Date(query[i]);
                var nextDay = new Date(query.end_date);
                fFilter["created_at"] = {
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
                fFilter["created_at"] = {
                    "$gte": startDate,
                    "$lt": nextDay
                };
            } else if (i == 'end_date' && !query.start_date) {
                var endDate = new Date(query[i]);
                fFilter["created_at"] = {
                    "$lt": endDate
                };
            } else if (i == 'gr_stage') {
                fFilter['gr.gr_stage'] = query[i].toString() == "true" ? true : false;
            } else if (i == 'ack_stage') {
                fFilter['gr.ack_stage'] = query[i].toString() == "true" ? true : false;
            } else if (i == 'booking_no') {
                fFilter['gr.booking_info.booking_no'] = query[i];
            } else if (i == 'container_no') {
                fFilter['gr.booking_info.container_no'] = query[i];
            } else if (i == 'customer_name') {
                fFilter['gr.booking_info.customer_name'] = query[i];
            } else if (i == 'customer_id') {
                fFilter['gr.customer_id'] = query[i];
            } else if (i == 'boe_no') {
                fFilter['gr.booking_info.boe_no'] = query[i];
            } else if (i == 'materialType') {
                fFilter['materialType.material_type'] = query[i];
            } else if (i == 'driver') {
                fFilter['driver'] = mongoose.Types.ObjectId(query[i]);
            } else if (i == 'gr_done') {
                fFilter['gr.gr_no'] = query[i];
            } else if (i == 'ack_status') {
                fFilter['gr.ack_status'] = query[i];
            } else if (i == 'ack_stage') {
                fFilter['gr.ack_stage'] = query[i];
            } else if (i == 'gr_ack_exp_date') {
                fFilter['gr.gr_ack_exp_date'] = query[i];
            } else if (i == 'route_id') {
                fFilter['route.route_id'] = mongoose.Types.ObjectId(query[i]);
            } else if (i == 'trip_end') {
                fFilter['trip_end.status'] = ((query[i].toString() == "true")) ? true : false;
            } else if (i == 'ack_receiving_date') {
                fFilter['gr.receiving_date'] = query[i];
            } else if (i == 'isMarketVehicle') {
                fFilter['trip.isMarketVehicle'] = query[i];
            } else if (i == 'status_value') {
                var status = query[i] == "Started" ? "trip_start.status" : query[i] == "Completed" ? "trip_end.status" : query[i] == "Cancelled" ? "trip_cancel.status" : "";
                fFilter[status] = true;
            } else if (i == 'materialType') {
                fFilter['materialType.material_type'] = query[i];
            } else if (i == 'trip_start_date') {
                fFilter['trip_start.time'] = query[i];
            } else if (i == 'trip_end_date') {
                fFilter['trip_end.time'] = query[i];
            } else if (i == 'trip_cancel_date') {
                fFilter['trip_cancel.time'] = query[i];
            } else {
                fFilter[i] = query[i];
            }

        }
    }
    return fFilter;
};
module.exports.findTripId = function (id, next) {
    Trip.findAsync({ "_id": id })
        .then(function (driver) {
            return next(null, driver);
        })
        .catch(function (err) {
            return next(err);
        });
};
module.exports.findTripQuery = function (query, next) {
    Trip.findAsync(query)
        .then(function (trip) {
            return next(null, trip);
        })
        .catch(function (err) {
            return next(err);
        });
};
module.exports.findTripQueryWithDeleted = function (query, next) {
    Trip.findWithDeletedAsync(query)
        .then(function (trip) {
            return next(null, trip);
        })
        .catch(function (err) {
            return next(err);
        });
};

function flowFilter(req, filterData) {
    //  console.log(req.body.gr_stage, "       req.query.diesel_stage    ", req.query.diesel_stage)
    // if (req.query.diesel_stage == undefined && req.query.gr_stage == undefined) {
    delete req.clientData.flow
    if (req.clientData.flow == null || (req.clientData.flow == undefined)) {
        req.clientData.flow = ["GR,DIESEL,TRIP"]
        Client.update({ clientId: req.query.clientId }, { $set: { flow: ["GR,DIESEL,TRIP"] } }).then(updateFlow => {
            if (updateFlow) {
                console.log('flow updated ', updateFlow)
            }
        })
    }
    if (req.query.source == "TRIP") {
        // console.log('api hit from trip', req.clientData.flow.length)
        let splitFlow = req.clientData.flow[0].split(",")
        if (req.clientData.flow.length == 1) {
            // console.log('task to be done parallel so there will be no validation')
            return filterData;
        }
        else if (req.clientData.flow.length == 2) {
            //   console.log('**********', splitFlow)
            let val = splitFlow.indexOf(constant.flow[2]);
            if (val == -1) {
                filterData["$and"] = [{ 'gr.gr_stage': false }, { diesel_stage: false }]
                return filterData;
            }
            else {
                return filterData;
            }
        }
        else if (req.clientData.flow.length == 3) {
            let val = req.clientData.flow.indexOf(constant.flow[2]);
            if (val == 0) {
                return filterData;
            }
            else if (val == 1) {
                if (req.clientData.flow[0] == constant.flow[0]) {
                    filterData['gr.gr_stage'] = false
                    return filterData;
                }
                else if (req.clientData.flow[0] == constant.flow[1]) {
                    filterData['diesel_stage'] = false
                    return filterData;
                }
            }
            else if (val == 2) {
                filterData["$and"] = [{ 'gr.gr_stage': false }, { diesel_stage: false }]
                return filterData;
            }
        }
    }
    // else if (req.query.diesel_stage) {
    if (req.query.source == "DIESEL") {
        //   console.log('api hit from Diesel', req.clientData.flow.length)
        let splitFlow = req.clientData.flow[0].split(",")
        if (req.clientData.flow.length == 1) {
            //    console.log('task to be done parallel so there will be no validation')
            return filterData;
        }
        else if (req.clientData.flow.length == 2) {
            //    console.log('**********', splitFlow)
            let condition;
            let val = splitFlow.indexOf(constant.flow[1]);
            if (val == -1) {
                filterData["$and"] = [{ 'gr.gr_stage': false }, { 'trip_stage': true }]
                return filterData;
            }
            else {
                return filterData;
            }
        }
        else if (req.clientData.flow.length == 3) {
            let val = req.clientData.flow.indexOf(constant.flow[1]);
            if (val == 0) {
                return filterData;
            }
            else if (val == 1) {
                if (req.clientData.flow[0] == constant.flow[0]) {
                    filterData['gr.gr_stage'] = false
                    return filterData;
                }
                else if (req.clientData.flow[0] == constant.flow[2]) {
                    filterData['trip_stage'] = true
                    return filterData;
                }
            }
            else if (val == 2) {
                filterData["$and"] = [{ 'gr.gr_stage': false }, { 'trip_stage': true }]
                return filterData;
            }
        }
    }
    // else if (req.query.gr_stage) {
    if (req.query.source == "GR") {
        //  console.log('api hit from Diesel', req.clientData.flow.length)
        let splitFlow = req.clientData.flow[0].split(",")
        if (req.clientData.flow.length == 1) {
            //      console.log('task to be done parallel so there will be no validation')
            return filterData;
        }
        else if (req.clientData.flow.length == 2) {
            //    console.log('**********', splitFlow)
            let condition;
            let val = splitFlow.indexOf("GR");
            if (val == -1) {
                filterData["$and"] = [{ 'diesel_stage': false }, { 'trip_stage': true }]
                return filterData;
            }
            else {
                return filterData;
            }
        }
        else if (req.clientData.flow.length == 3) {
            let val = req.clientData.flow.indexOf(constant.flow[0]);
            if (val == 0) {
                return filterData;
            }
            else if (val == 1) {
                if (req.clientData.flow[0] == constant.flow[1]) {
                    filterData['diesel_stage'] = false
                    return filterData;
                }
                else if (req.clientData.flow[0] == constant.flow[2]) {
                    filterData['trip_stage'] = true
                    return filterData;
                }
            }
            else if (val == 2) {
                filterData["$and"] = [{ 'diesel_stage': false }, { 'trip_stage': true }];
                return filterData;
            }
        }
    }
    return filterData;
}

module.exports.getAllTrips = function (req, next) {
    var ff = constructFilters(req.query);
    let ffFilters = flowFilter(req, ff);
    delete ffFilters.deleted;
    if (ffFilters && (ffFilters["trip_cancel.status"] === true)) {

        //ffFilters.trip_status = "Trip cancelled";
        //delete ffFilters["trip_cancel.status"];
        delete ffFilters["trip_cancel.time"];
    }

    delete ffFilters.start_date;
    delete ffFilters.end_date;
    delete ffFilters.trip_start_date;
    delete ffFilters.trip_end_date;
    delete ffFilters.trip_cancel_date;
    //var ownVehicle = ["BMV-1","BMV-2","BMV-3","BMV-4","BMV-5","BMV-6","GA04T4874","GA04T4875","GA04T4876","GA04T4877","GA04T4883","HR11GA5816","HR372131","HR37B4175","HR37B4176","HR37B4178","HR37B4180","HR37B4182","HR37B4183","HR37B4186","HR37B4188","HR37B4189","HR37B4190","HR37B4191","HR37B4192","HR37B4193","HR37B4194","HR37B4195","HR37B4963","HR37B4966","HR37B4967","HR37B4968","HR37B4969","HR37B4970","HR37B4971","HR37B4972","HR37B4973","HR37B4974","HR37B5503","HR37B5504","HR383616","HR38D9519","HR38J0944","HR38J0951","HR38J1321","HR38J1324","HR38J1481","HR38J1484","HR38J1487","HR38J1781","HR38J1784","HR38J1787","HR38J2521","HR38J2524","HR38J3019","HR38J3391","HR38J3394","HR38J4031","HR38J4034","HR38J4037","HR38J4981","HR38J4984","HR38K0221","HR38K0224","HR38K1451","HR38K1454","HR38K3091","HR38K3094","HR38K4326","HR38K4901","HR38K4904","HR38K5311","HR38K5314","HR38K5558","HR38K5559","HR38K5560","HR38K5561","HR38K5809","HR38K5810","HR38K5811","HR38K5812","HR38K5813","HR38K5814","HR38K5815","HR38K5816","HR38K5903","HR38K6115","HR38K6116","HR38K6117","HR38K6118","HR38K6119","HR38K6120","HR38K6122","HR38K6129","HR38K6201","HR38K6202","HR38K6203","HR38K6420","HR38K6468","HR38K6470","HR38K6535","HR38K6536","HR38K6538","HR38K6830","HR38K6831","HR38K6833","HR38K6835","HR38K6836","HR38K7139","HR38K7218","HR38K8027","HR38K8081","HR38K8084","HR38K8320","HR38K8321","HR38K8322","HR38K8323","HR38K8324","HR38K8326","HR38K8327","HR38K8329","HR38K8330","HR38K8331","HR38K8332","HR38K8334","HR38K8336","HR38K8338","HR38K8340","HR38K8341","HR38K8342","HR38K8716","HR38K8747","HR38K8748","HR38K8984","HR38K9199","HR38K9201","HR38K9252","HR38K9253","HR38K9485","HR38K9486","HR38K9487","HR38K9488","HR38K9489","HR38K9498","HR38K9499","HR38K9500","HR38K9501","HR38K9502","HR38K9503","HR38K9505","HR38K9506","HR38K9513","HR38K9514","HR38K9515","HR38K9516","HR38K9517","HR38K9522","HR38K9523","HR38K9524","HR38K9525","HR38K9526","HR38L0110","HR38L0112","HR38L0113","HR38L0260","HR38L0262","HR38L0401","HR38L0402","HR38L0403","HR38L0410","HR38L0412","HR38L0413","HR38L0702","HR38L0703","HR38L0704","HR38L0706","HR38L0714","HR38L0716","HR38L0739","HR38L0741","HR38L0742","HR38L0791","HR38L0798","HR38L0804","HR38L0805","HR38L0806","HR38L0807","HR38L0894","HR38L0896","HR38L0898","HR38L0932","HR38L0943","HR38L1067","HR38L1068","HR38L1069","HR38L1070","HR38L1267","HR38L1269","HR38L1270","HR38L1379","HR38L1380","HR38L1519","HR38L1520","HR38L1646","HR38L1647","HR38L1722","HR38L1723","HR38L1724","HR38L1849","HR38L1971","HR38L1972","HR38L2064","HR38L2065","HR38L2263","HR38L2513","HR38L2516","HR38L2518","HR38L2519","HR38L2520","HR38L2521","HR38L2522","HR38L2770","HR38L2771","HR38L2773","HR38L2774","HR38L2924","HR38L3127","HR38L3128","HR38L3130","HR38L3136","HR38L3139","HR38L3878","HR38L3879","HR38L3880","HR38L4161","HR38L4162","HR38L4249","HR38L4250","HR38L4251","HR38L4252","HR38L4577","HR38L4583","HR38L4586","HR38L4589","HR38L4594","HR38L4596","HR38L4897","HR38L4898","HR38L4899","HR38L4902","HR38L5269","HR38L5270","HR38L5271","HR38L5272","HR38L5273","HR38L5562","HR38L5564","HR38L5566","HR38L5567","HR38L5568","HR38L6576","HR38L6578","HR38L6581","HR38L6582","HR38L6583","HR38L6738","HR38L6739","HR38L6740","HR38L6741","HR38L6742","HR38L6743","HR38L6752","HR38L6754","HR38L6755","HR38L6756","HR38L6758","HR38L6945","HR38L6946","HR38L6947","HR38L6948","HR38L6949","HR38L7199","HR38L7231","HR38L7354","HR38L7356","HR38L7357","HR38L7358","HR38L7359","HR38L7773","HR38L7780","HR38L7861","HR38L7862","HR38L7863","HR38L7864","HR38L7865","HR38L8248","HR38L8249","HR38L8250","HR38L8251","HR38L8252","HR38L8722","HR38L8723","HR38L8724","HR38L8725","HR38L8726","HR38N9043","HR38N9046","HR38N9047","HR38N9048","HR38N9443","HR38Q9667","HR38Q9676","HR38Q9684","HR38Q9687","HR38Q9688","HR38Q9693","HR38Q9699","HR38Q9923","HR38Q9924","HR38Q9925","HR38R0173","HR38R0174","HR38R0176","HR38R0179","HR38R0180","HR38R0322","HR38R0323","HR38R0324","HR38R0325","HR38R0326","HR38R0327","HR38R0328","HR38R0329","HR38R0330","HR38R0331","HR38R0332","HR38R0334","HR38R0418","HR38R0419","HR38R0420","HR38R2465","HR38R2466","HR38R2467","HR38R2468","HR38R2469","HR38R2470","HR38R2472","HR38R2473","HR38R2506","HR38R2507","HR38R3175","HR38R3176","HR38R3180","HR38R3424","HR38R3425","HR38R3426","HR38R3428","HR38R3429","HR38R3430","HR38R3431","HR38R3641","HR38R3642","HR38R3643","HR38R3646","HR38R3758","HR38R3759","HR38R3760","HR38R3761","HR38R3762","HR38R3763","HR38R3838","HR38R3839","HR38R3840","HR38R3841","HR38R3842","HR38R4388","HR38R4389","HR38R4390","HR38R4391","HR38R4392","HR38R4393","HR38R4639","HR38R4640","HR38R4641","HR38R4642","HR38R4643","HR38R4644","HR38R4647","HR38R4648","HR38R4649","HR38R4817","HR38R4818","HR38R4819","HR38R4820","HR38R4918","HR38R4919","HR38R4921","HR38R4923","HR38R4987","HR38R4988","HR38R5237","HR38R5238","HR38R5243","HR38R5244","HR38R5351","HR38R5352","HR38R5354","HR38R5355","HR38R5404","HR38R5405","HR38R6752","HR38R6753","HR38R6754","HR38R6756","HR38R6757","HR38R6758","HR38R6759","HR38R6760","HR38R6761","HR38R6920","HR38R7072","HR38R7073","HR38R7074","HR38R7075","HR38R7076","HR38R7759","HR38R7760","HR38R7762","HR38R7763","HR38R7764","HR38R8000","HR38R8001","HR38R8002","HR38R8003","HR38R8006","HR38R8008","HR38R8009","HR38R8010","HR38R8011","HR38R8012","HR38R8241","HR38R9201","HR38R9202","HR38R9203","HR38R9204","HR38R9290","HR38R9291","HR38R9356","HR38R9357","HR38R9358","HR38R9359","HR38R9360","HR38R9361","HR38R9362","HR38R9363","HR38R9364","HR38R9369","HR38R9370","HR38R9371","HR38R9372","HR38R9373","HR38R9496","HR38R9497","HR38R9498","HR38R9499","HR38R9576","HR38S0101","HR38V0229","HR38V0242","HR38V0243","HR38V0280","HR38V0553","HR38V0561","HR38V0576","HR38V1086","HR38V1129","HR38V2933","HR38V2973","HR38V2974","HR38V3012","HR38V3099","HR38V3105","HR38V3247","HR38V3804","HR38V3809","HR38V3844","HR38V4022","HR38V4186","HR38V4204","HR38V4211","HR38V4275","HR38V5349","HR38V5380","HR38V5382","HR38V5835","HR38V5839","HR38V6745","HR38V6798","HR38V7053","HR38V7081","HR38V7083","HR38V7094","HR38V7114","HR38V7120","HR38V7121","HR38V7578","HR38V7625","HR38V7628","HR38V7765","HR38V7766","HR38V7926","HR38V7936","HR38V8157","HR38V8163","HR38V8165","HR38V8181","HR38V8640","HR38V8652","HR38V8745","HR38V9234","HR38V9246","HR38V9457","HR38V9783","HR38V9994","HR38W0135","HR38W0273","HR38W0868","HR38W1964","HR38W2066","HR38W2459","HR38W2567","HR38W2669","HR38W2802","HR38W3509","HR38W4004","HR38W4837","HR38W4889","HR38W4986","HR38W5460","HR38W5532","HR38W6548","HR38W6667","HR38W6764","HR38W7364","HR38W7403","HR38W7629","HR38W7772","HR38W7984","HR38W8240","HR38W8317","HR38W8779","HR38W8901","HR38W9669","HR38W9812","HR45A0489","HR45A0490","HR45A0491","HR45A0492","HR45A0493","HR45A0494","HR45A0495","HR45A0496","HR45A0497","HR45A0498","HR45A0499","HR45A0501","HR45A0502","HR45A0503","HR474741","HR476885","HR477878","HR47A0306","HR47A3111","HR55G4745","HR55H4391","HR63A1788","HR63B0178","HRDR-1","HRDR-10","HRDR-11","HRDR-12","HRDR-13","HRDR-14","HRDR-15","HRDR-16","HRDR-17","HRDR-18","HRDR-19","HRDR-2","HRDR-20","HRDR-3","HRDR-4","HRDR-5","HRDR-6","HRDR-7","HRDR-8","HRDR-9","MARKET VEH.","MARKETVEH.","MV-","MV-1","MV-10","MV-11","MV-12","MV-13","MV-14","MV-15","MV-16","MV-17","MV-18","MV-19","MV-2","MV-20","MV-21","MV-22","MV-23","MV-24","MV-25","MV-26","MV-27","MV-28","MV-29","MV-3","MV-4","MV-5","MV-6","MV-7","MV-8","MV-9","RJ09GA7322","RJ09GA7323","RJ09GA7324","RJ09GA7325","RJ09GA7326","RJ09GA7327","RJ09GA7329","RJ09GA7330","RJ09GA7331","VM HP623051","VM HP62A3482","VM HR55S8439","VM HR55S8440","VM HR55S8441","VM HR55U3042","VM HR55U4907","VM HR55U6695","VM HR55U7778","VM HR55U9147","VM HR55U9851","VM HR55V0967","VM HR55V1026","VM HR55V1030","VM HR55V3927","VM HR55V4639","VM HR55V8730","VM HR55V9135","VM HR55V9330","VM HR55V9440","VM HR55V9606","VM HR55W6833","VM HR63C9587","VM-HP623051","VM-HP62A3482","VM-HR55S8439","VM-HR55S8440","VM-HR55S8441","VM-HR55U3042","VM-HR55U4907","VM-HR55U6695","VM-HR55U7778","VM-HR55U9147","VM-HR55U9851","VM-HR55V0967","VM-HR55V1026","VM-HR55V1030","VM-HR55V3927","VM-HR55V4639","VM-HR55V8730","VM-HR55V9135","VM-HR55V9330","VM-HR55V9440","VM-HR55V9606","VM-HR55W6833","VM-HR63C9587","VMHP623051","VMHP62A3482","VMHR55S8439","VMHR55S8440","VMHR55S8441","VMHR55U3042","VMHR55U4907","VMHR55U6695","VMHR55U7778","VMHR55U9147","VMHR55U9851","VMHR55V0967","VMHR55V1026","VMHR55V1030","VMHR55V3927","VMHR55V4639","VMHR55V8730","VMHR55V9135","VMHR55V9330","VMHR55V9440","VMHR55V9606","VMHR55W6833","VMHR63C9587","VMRJ14GB1440","VMRJ14GB5409"];
    //ffFilters.vehicle_no = {$nin : ownVehicle };

    var no_of_pages = 1;
    var countCursor;

    if (ffFilters && (ffFilters["trip_cancel.status"] === true)) {
        countCursor = Trip.countWithDeletedAsync(ffFilters);
    } else {
        countCursor = Trip.countAsync(ffFilters)
    }
    //Trip.countAsync(ffFilters)
    //Trip.countWithDeletedAsync(ffFilters)
    countCursor.then(function (postingsCount) {
        logger.info(" trips retrieved: " + postingsCount);
        var cursor;

        if (ffFilters && (ffFilters["trip_cancel.status"] === true)) {
            cursor = Trip.findWithDeleted(ffFilters);
        } else {
            cursor = Trip.find(ffFilters);
        }
        var oSort = { 'trip_no': -1 };
        cursor.sort(oSort);
        var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
        if (req.query.all) {
            no_of_documents = postingsCount;
        }
        cursor.limit(parseInt(no_of_documents));
        if (req.query && req.query.skip) { //TODO check field is valid or not
            var skip_docs = (req.query.skip - 1) * no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }
        if (postingsCount / no_of_documents > 1) {
            no_of_pages = postingsCount / no_of_documents;
        }
        cursor.populate('vehicle')
            .populate('driver')
            .populate('trip_expense')
            .exec(function (err, posts) {
                if (err) {
                    logger.error("#getAlltrips: " + err);
                    return next(err);
                }
                var tempPosts = JSON.parse(JSON.stringify(posts));
                if (req.query.boe_no) {
                    for (var i = 0; i < tempPosts.length; i++) {
                        if (tempPosts[i].booking_info && tempPosts[i].booking_info.length > 0) {
                            var rTempBInfo = [];
                            for (var k = 0; k < tempPosts[i].booking_info.length; k++) {
                                if (tempPosts[i].booking_info[k].boe_no == req.query.boe_no) {
                                    rTempBInfo.push(tempPosts[i].booking_info[k]);
                                }
                            }
                            tempPosts[i].booking_info = rTempBInfo;
                        }
                    }
                }
                logger.info("#getAlltrips: retrieved trips: ");
                var objjj = {};
                objjj.no_of_pages = Math.ceil(no_of_pages);
                objjj.data = tempPosts;
                objjj.count = postingsCount;
                return next(null, objjj);
            });
    }).catch(function (err) {
        logger.error("Error in getLastNPosting : " + err);
        return next(err);
    });
};


module.exports.addTrip = function (data, next) {
    idUtil.generateTripNoAsync({ clientId: data.clientId })
        .then(function (count) {
            var oNewPID = createTripId(data, count);
            data.tripId = oNewPID.tripID;
            data.trip_no = oNewPID.trip_no;
            if (data.gr[0] && data.gr[0].branch) {
                data.branch = data.gr[0].branch;
            }
            data.created_at = Date.now();
            delete data._id;
            var newTrip = new Trip(data);
            newTrip.saveAsync()
                .then(function (trip) {
                    winston.info("New trip saved: ");

                    counterUtil.incrementTripCount();
                    if (trip[0]) {
                        return next(null, trip[0]);
                    } else {
                        return next(null, trip);
                    }
                })
        }).catch(function (err) {
            winston.error("Error in addTrip: " + err.toString());
            return next(err);
        });
};

module.exports.updateLocationTrip = function (oQuery, oUpdate, next) {
    var waitFor = Trip.findOneAndUpdateWithDeletedAsync(oQuery, oUpdate, { "new": true, "runValidators": true });
    waitFor.then(function (doc) {
        var temptrip = JSON.parse(JSON.stringify(doc));
        return next(null, temptrip);
    })
        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};

module.exports.printDieselData = function (oQuery, next) {
    Trip.aggregateAsync([{ $match: { "diesel_vendors._id": mongoose.Types.ObjectId(oQuery.vendor_id), "trip_no": parseInt(oQuery.trip_no), "clientId": oQuery.clientId } }, { $project: { vehicle_no: 1, driver_name: 1, trip_no: 1, diesel_vendors: { $filter: { input: '$diesel_vendors', as: 'diesel_vendor', cond: { $eq: ['$$diesel_vendor._id', mongoose.Types.ObjectId(oQuery.vendor_id)] } } } } }, { $unwind: "$diesel_vendors" }, { $addFields: { printed_by: 'Application', datetime: new Date() } }])
        .then(function (doc) {
            var temptrip = JSON.parse(JSON.stringify(doc));
            return next(null, temptrip);
        })
        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};

module.exports.updateTrip = function (trip_id, details, next) {
    var oUpdate = {};
    if (details.trip_history) {
        oUpdate.$push = { "trip_history": details.trip_history };
        delete details.trip_history;
    }
    details.latModified = Date.now();
    oUpdate.$set = details;
    var newTrip;
    var waitFor;
    if (details.deleted === true) {
        waitFor = Trip.findOneAndUpdateWithDeletedAsync({ "_id": trip_id }, oUpdate, { "new": true, "runValidators": true });
    } else {
        waitFor = Trip.findOneAndUpdateAsync({ "_id": trip_id }, oUpdate, { "new": true, "runValidators": true });
    }

    waitFor.then(function (doc) {
        newTrip = doc;
        var temptrip = JSON.parse(JSON.stringify(doc));
        return next(null, temptrip);
    })
        .then(function () {
            if (details.oldTrip.trip_end.status === false && details.trip_end && details.trip_end.status === true) {
                return TripExpensesService.addTripExpense(newTrip);
            }
            return Promise.resolve(true);
        }).then(function () {
            if (details.oldTrip.trip_end.status === false && details.trip_end && details.trip_end.status === true) {
                return invoiceService.addInvoiceAsync(newTrip);
            }
            return Promise.resolve(true);
        })
        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};
module.exports.updateTripByNo = function (trip_no, details, next) {
    details.latModified = Date.now();
    Trip.findOneAndUpdateAsync({ "trip_no": trip_no }, { "$set": details, $push: prepareDataPush }, { "new": true })
        .then(function (doc) {
            var temptrip = JSON.parse(JSON.stringify(doc));
            return next(null, temptrip);
        })
        .catch(next);
};

module.exports.getGrCountandDist = function (filter, next) {
    Trip.find(filter)
        .then(function (tripData) {
            tripData = JSON.parse(JSON.stringify(tripData[0]));
            tripData.grLength = tripData.gr.length || 0;
            tripData.distance = tripData.route.route_distance;
            return next(null, tripData);
        })
        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};

module.exports.updateTripByFilter = function (oFilter, details, next) {
    var oUpdate = {};
    if (details.trip_history) {
        oUpdate.$push = { "trip_history": details.trip_history };
        delete details.trip_history;
    }
    details.last_modified = Date.now();
    var newTrip;
    var waitFor;
    if (details.trip_cancel && (details.trip_cancel.status === true)) {
        details.deleted = true;
        oUpdate.$set = details;
        waitFor = Trip.findOneAndUpdateWithDeletedAsync(oFilter, oUpdate, { "new": true, "runValidators": true });
    } else {
        oUpdate.$set = details;
        waitFor = Trip.findOneAndUpdateAsync(oFilter, oUpdate, { "new": true, "runValidators": true });
    }

    waitFor.then(function (doc) {
        var temptrip = JSON.parse(JSON.stringify(doc));
        newTrip = temptrip;
        details.doc = temptrip;
        return next(null, temptrip);
    })
        .then(function () {
            if (details.trip_start && details.trip_start.status === true) {
                return TripExpensesService.addTripExpense(newTrip);
            }
            if (details.trip_end && details.trip_end.status === true) {
                return TripExpensesService.addTripExpense(newTrip);
            }
            return Promise.resolve(true);
        })
        .then(function () {
            if (details.trip_end && details.trip_end.status === true) {
                return invoiceService.addInvoiceAsync(newTrip);
            }
            return Promise.resolve(true);
        })
        .then(function () {
            details.gTrip_id = details.doc.gTrip_id;
            details.vehicle_no = details.doc.vehicle_no;
            details.clientId = details.doc.clientId;
            if (details.trip_status == "Trip started" && details.trip_start && details.trip_start.status) { //if (trip is started)
                locationService.updateTripOnGPSGAADI(details, "start", function (err, data) {
                    if (err) console.log(err);
                    else console.log(data);
                })
            } else if (details.trip_status = "Trip ended" && details.trip_end && details.trip_end.status) { //if (trip is ended)
                locationService.updateTripOnGPSGAADI(details, "complete", function (err, data) {
                    if (err) console.log(err);
                    else console.log(data);
                })
            }
        })


        .catch(function (err) {
            winston.info(err);
            next(err);
        });
};

module.exports.deallocate = function (req, next) {
    var details = { deleted: true, trip_cancel: { status: true, user: req.user.full_name, user_id: req.user._id, time: Date.now() } };
    Trip.findOneAndUpdateWithDeletedAsync({ "clientId": req.user.clientId, "trip_no": req.body.trip_no }, { "$set": details }, { "new": true, "runValidators": true })
        .then(function (trip) {
            req.delTrip = trip;
            return bookingService.updateBulkBookingInfoAsync(trip, false);
        }).then(function (booking) {
            if (booking && req.body.Vehicle) {
                req.booking = booking;
                var oUpdate = {
                    status: "Available",
                    previousStatus: "Booked",
                    last_known: {
                        status: "Available",
                        datetime: Date.now(),
                        trip_no: req.body.trip_no,
                        trip_name: req.body.route_name
                    }
                };
                if (req.body.trip_cancel && req.body.trip_cancel.time) {
                    oUpdate.last_known.datetime = req.body.trip_cancel.time;
                }
                return registeredVehicleService.updateRegisteredVehicleStatusByIdAsync(req.body.Vehicle, oUpdate);
            } else {
                return undefined;
            }
        }).then(function (vehicle) {
            var oTrip = JSON.parse(JSON.stringify(req.delTrip));
            if (req.body.trip_cancel) {
                oTrip.gr_history = {
                    title: "Trip Cancelled",
                    person: req.body.trip_cancel.user,
                    reason: req.body.trip_cancel.reason || "trip cancelled",
                    time: req.body.trip_cancel.time,
                    remark: req.body.trip_cancel.remark || "NA"
                };
            }
            return GRstatusService.updateBulkGRStatusAsync(oTrip, 'Cancelled');
        }).then(function (grs) {
            if (grs) {
                return next(null, { "status": "OK", "message": "vehicle de-allocated successfully", "data": req.booking });
            } else {
                return next({ "status": "ERROR", "message": "vehicle de-allocated failed", "data": grs });
            }
        }).catch(next);
};
