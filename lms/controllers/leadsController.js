/**
 * Created by manish on 29/6/16.
 */

var router = require('express').Router();
var leadService = promise.promisifyAll(commonUtil.getService('lead'));
var bookingService = promise.promisifyAll(commonUtil.getService('booking'));
var PostingService = promise.promisifyAll(commonUtil.getService('posting'));

//lead creator id is same as userId
router.post("/newLead", function(req,res,next){
    console.log('request payload for new lead',JSON.stringify(req.body));
    passport.authenticate('jwt',
        function(error, user, info) {
            if (error) {
                return next(error);
            }
            if (user) {
                var oModifiedCitySource,oModifiedCityDestination;
                if(req.body.source && req.body.source.address_components){
                    oModifiedCitySource = googlePlaceUtil.getFormattedCity(req.body.source.address_components);
                }
                if(!req.body.source.c && oModifiedCitySource){
                    req.body.source.c = oModifiedCitySource.c;
                }
                if(!req.body.source.d && oModifiedCitySource){
                    req.body.source.d = oModifiedCitySource.d;
                }
                if(!req.body.source.s && oModifiedCitySource){
                    req.body.source.s = oModifiedCitySource.s;
                }
                if(!req.body.source.p && oModifiedCitySource){
                    req.body.source.p = oModifiedCitySource.p;
                }
                if(req.body.destination && req.body.destination[0].address_components){
                    oModifiedCityDestination = googlePlaceUtil.getFormattedCity(req.body.destination[0].address_components);
                }
                if(!req.body.destination[0].c && oModifiedCityDestination){
                    req.body.destination[0].c = oModifiedCityDestination.c;
                }
                if(!req.body.destination[0].d && oModifiedCityDestination){
                    req.body.destination[0].d = oModifiedCityDestination.d;
                }
                if(!req.body.destination[0].s && oModifiedCityDestination){
                    req.body.destination[0].s = oModifiedCityDestination.s;
                }
                if(!req.body.destination[0].p && oModifiedCityDestination){
                    req.body.destination[0].p = oModifiedCityDestination.p;
                }

                req.body.type = "load";
                req.body.userId = req.body.post_owner_id;
                req.body.email  = user.email;  // email is of lead creator
                req.body.mobile = req.body.lead_owner_mobile || user.mobile;  // mobile of lead creator
                req.body.load_owner_mobile = req.body.post_owner_mobile;
                req.body.load_owner_email = req.body.post_owner_email;   //

                req.body.verified = 'active';
                req.body.lead_status = req.body.lead_status || "assigned";

                req.body.lead_creator_id = user._id;
                req.body.lead_creator_name = user.owner_name;
                req.body.lead_creator_mobile = user.mobile;
                req.body.created_at = Date.now();
                req.body.lead_owner_id= req.body.lead_owner_id || user._id;
                req.body.lead_owner_name = req.body.lead_owner_name || user.owner_name;
                req.body.lead_owner_mobile = req.body.lead_owner_mobile || user.mobile;

                console.log("before saving to db new lead" + req.body);
                leadService.addLeadAsync(req.body)
                    .then(function(Posting){
                        var resp = {"status": "ok", "message":"lead saved successfully",
                            "lead_id":Posting[0].postingId};
                        console.log("sent after lead creation" + resp);
                        return res.status(200).json(resp);
                    }).catch(next)
            }else{
                res.status(500).json({"status": "error","message":"un-authorised user"});
            }
        })(req, res, next);
});

router.post('/allLeads', function (req, res, next) {
    passport.authenticate('jwt',
        function(error, user, info) {
            if (error){
                return next(error);
            }
            if(user){
                if(user.type == 'ft_admin') {
                    if (!req.query) {
                        req.query={};
                    }
                    leadService.getLeadsAsync(req)
                        .then(
                            function (leads) {
                                res.status(200).json({
                                    'status': 'ok',
                                    'data': leads.data,
                                    'no_of_pages': leads.no_of_pages,
                                    'total_count':leads.total_count
                                });
                            }, function (err) {
                                winston.error("Error in allLeads get: " + err);
                                res.status(500).json({'status': 'error', 'message': err.toString()});
                            }).catch(next);
                }else{
                    var resp = {"status": "error","message":"you are not an admin"};
                    winston.info(resp);
                    return res.status(500).json(resp);
               }
            }else{
                res.status(200).json({'status': 'ok','message':'un-authorised user.'});
            }
        })(req, res, next);
});

router.put(
    '/updateLead/:leadId',
    function(req, res, next) {
        console.log('request payload for lead update',JSON.stringify(req.body));
        passport.authenticate(
            'jwt',
            function (err, user, info) {
                if (err) return next(err);
                if (!user) return res.status(500).json(info);
                if(user.type != 'ft_admin') {
                    return res.status(500).json({'status': 'You are not an admin'});
                }
                if((user.role != 'updateAdmin')&&(user.role != 'superAdmin')){
                    return res.status(500).json({'status': 'You do not have update privilege'});
                }

                if((user.type == 'ft_admin')&&((user.role == 'updateAdmin')||(user.role == 'superAdmin'))){
                    var oParams = {"postingId":req.params.leadId};
                    PostingService.getPostingsByIdAsync(oParams)
                    .then(function(posting){
                        if(posting){
                            return next();
                        }
                        else{
                            res.status(500).json({'status': 'ERROR','message':'Posting is not found'});
                        }

                    }).catch(next);
                }
            }
        )(req, res, next);
    },

    function(req, res, next) {
        if(Object.getOwnPropertyNames(req.body).length>0){
            var oParams = {"postingId":req.params.leadId};
                leadService.updateLeadAsync(oParams, req.body)
                    .then(function (lead) {
                        if (lead) {
                            var resp = {
                                "status": "OK",
                                "message": "lead updated successfully",
                                "data": lead
                            };
                            return res.status(200).json(resp);
                        }
                    }).catch(next)
        }else{
            res.status(500).json({'status': 'ERROR',"error_message":"Nothing to update."});
        }
    }
);

module.exports = router;
