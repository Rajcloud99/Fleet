var NO_OF_DOCS = 10;
var Promise = require('bluebird');
var Posting = Promise.promisifyAll(commonUtil.getModel('postings'));
var searchService = promise.promisifyAll(commonUtil.getService('search'));

function createPostingId(post){
    var postingID,postingCount,Material_Truck_Type="NON",pCount = "000",postingDate = "";
    if(post.type == "truck"){
        postingID = "T";
        postingCount = truckPostingCounterForDay ++;
        //		if(post.truckType && post.truckType.code){
        //			Material_Truck_Type = post.truckType.code;
        //	    }
    }else{
        postingID = "L";
        postingCount = loadPostingCounterForDay ++;
        //		if(post.materialType && post.materialType.code){
        //			Material_Truck_Type = post.materialType.code;
        //		}
    }
    // 	if(postingCount < 10){
    //		pCount = "00"+postingCount.toString();
    //	}else if(postingCount >= 10 && postingCount<100){
    //		pCount = "0"+postingCount.toString();
    //
    //	}else{
    //		pCount = postingCount.toString();
    //	}
    pCount = postingCount.toString();
    var dateNow = new Date();
    var dMonth;
    if (dateNow.getMonth() < 9) {
        dMonth = "0" + (dateNow.getMonth() + 1).toString();
    } else {
        dMonth = (dateNow.getMonth() + 1).toString();
    }
    var dDate;
    if (dateNow.getDate() < 10) {
        dDate = "0" + dateNow.getDate().toString();
    } else {
        dDate = dateNow.getDate().toString();
    }
    postingDate = dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
    var dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
    postingID = postingID   + dDate + dMonth +dYear + pCount;
    return {'postingID' : postingID,'postingDate' :postingDate } ;
}

module.exports.addLead = function(data, next) {
    var oNewPID = createPostingId(data);
    data.postingId =oNewPID.postingID;
    data.postingDate = oNewPID.postingDate;
    var newPosting = new Posting(data);
    newPosting.saveAsync()
        .then(
            function(posting) {
                winston.info("New posting saved: " + posting);
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


//parameters for text filter include
// lead_owner_name, post owner name, source, destination, trucktype
// parameters for match include lead_creation_date,scheduled_date, post_owner_mobile,lead_owner_mobile,
// lead_owner_id, post_owner_id,lead_status
module.exports.getLeads  = function (req,next) {
    var textToSearch ="";
    if(req.body.source){
        textToSearch= req.body.source.formatted_address
    }
    if(req.body.destination){
        var sDest = req.body.destination.formatted_address;
        textToSearch=  textToSearch + " "+ sDest;
    }
    if (req.body.post_owner_name){
        textToSearch = textToSearch + " " +req.body.post_owner_name;
    }

    if (req.body.post_owner_company){
        textToSearch = textToSearch + " " +req.body.post_owner_company;
    }

    if (req.body.lead_owner_name){
        textToSearch = textToSearch + " " +req.body.lead_owner_name;
    }

    if (req.body.truckType && req.body.truckType.truck_type){
       textToSearch = textToSearch + " "+ req.body.truckType.truck_type;
    }

    var queryObj = req.query || {};
    if (textToSearch.length>0) {
        textToSearch = otherUtil.replaceNonAlpha(textToSearch.toLowerCase().replace(/india/gi, ""));
        queryObj.textToSearch = textToSearch.trim();
    }

    if (req.body.lead_creation_date) {
        queryObj.lead_creation_date= req.body.lead_creation_date;
    }
    if (req.body.scheduled_date){
        queryObj.scheduled_date= req.body.scheduled_date;
    }
    if (req.body.lead_owner_mobile) {
        queryObj.lead_owner_mobile = req.body.lead_owner_mobile;
    }
    if (req.body.post_owner_mobile) {
        queryObj.post_owner_mobile = req.body.post_owner_mobile;
    }
    if (req.body.lead_owner_id){
        queryObj.lead_owner_id = req.body.lead_owner_id;
    }
    if (req.body.post_owner_id){
        queryObj.post_owner_id = req.body.post_owner_id;
    }
    if (req.body.lead_status){
        queryObj.lead_status = req.body.lead_status;
    }
    if (req.body.lead_id){
        queryObj.lead_id=req.body.lead_id;
    }

    console.log("query obj for leads " + JSON.stringify(queryObj));
    searchService.getLeadsByFilterAsync(queryObj)
        .then(function(leads) {
                winston.info("leads fetched " + JSON.stringify(leads));
                return next(null,leads);
                //res.status(200).json({'status': 'OK','data':leads});
            },
            function(err) {
                winston.error("Error in truck retrieval route: "+err);
                //res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
                return next(err);
            }).catch(next);
};

function makeLeadResponseKeyChanges(lead){
    lead.post_owner_id = lead.userId;
    lead.userId= undefined;
    lead.post_owner_mobile = lead.load_owner_mobile || undefined;
    lead.mobile = undefined;
    lead.load_owner_mobile= undefined;
    lead.post_owner_email = lead.load_owner_email || undefined;
    lead.email=undefined;
    lead.load_owner_email = undefined;
    lead.lead_id = lead.postingId ;
    lead.postingId = undefined;
    for (var j = 0; j < lead.interested_to.length; j++) {
            lead.interested_to[j].interested_person_contact
                = lead.interested_to[j].vehicle_person_contact || undefined;
            lead.interested_to[j].interested_person_email
                = lead.interested_to[j].vehicle_person_email || undefined;
            lead.interested_to[j].vehicle_person_email = undefined;
            lead.interested_to[j].vehicle_person_contact = undefined;
        }
    return lead;
}

module.exports.updateLead = function(find_id, newDetails, next) {
var oUpdate = newDetails;
console.log("lead service update payload" + JSON.stringify(oUpdate));
Posting.findOneAndUpdateAsync(find_id, oUpdate, {"new": true,"runValidators" : true})
      .then(
        function(leadData) {
          if(leadData[0]){
              return next(null,leadData[0]);
          }else{
              return next(null,leadData);
          }
        }).catch(
        function(err) {
          return next(err);
        }
      );
    };

