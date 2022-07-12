/**
 * Created by Pratik on 1/7/16.
 */

var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');

var PostingService = Promise.promisifyAll(commonUtil.getService('posting'));
//var VendorBidService = Promise.promisifyAll(commonUtil.getService('vendor'));
var userService = Promise.promisifyAll(commonUtil.getService('user'));

router.post(
    '/:postingId',
    function(req, res, next) {
        console.log('request payload for new bid',JSON.stringify(req.body));
        passport.authenticate(
            'jwt',
            function (err, user, info) {
                if (err) return next(err);
                if (!user) return res.status(401).json(info);
                if(user.type != 'ft_admin'){
                    return res.status(401).json({'status': 'You are not an admin'});
                }
                if((user.role != 'updateAdmin')&&(user.role != 'superAdmin')){
                    return res.status(401).json({'status': 'You do not have update privilege'});
                }
                if((user.type == 'ft_admin')&&((user.role == 'updateAdmin')||(user.role == 'superAdmin'))){
                    var oParams = {"postingId":req.params.postingId};
                    PostingService.getPostingsByIdAsync(oParams)
                    .then(function(posting){
                        if(posting && posting[0]){
                            if(req.body && req.body.vendorId){
                                userService.findUserAsync(req.body.vendorId)
                                .then(function(user){
                                    if(user){
                                        req.venderData = user;
                                        var qObj = {};
                                        qObj.body = {
                                            "postingId":req.params.postingId,
                                            "vendorId": req.body.vendorId
                                        };
                                        VendorBidService.findVendorBidRateAsync(qObj)
                                        .then(function(bidData){
                                            if((bidData) && (bidData.length===0)){
                                                req.postingData = posting[0];
                                                req.postingData.getUserID = user._id;
                                                return next();
                                            }else{
                                                return res.status(500).json({'status': 'ERROR','message':'This vendor has already shown interest on this Load Post.'});
                                            }
                                        })
                                    }else{
                                        return res.status(500).json({'status': 'ERROR','message':'This vendor does not exists.'});
                                    }
                                })
                            }else{
                                return res.status(404).json({'status': 'ERROR','message':'Please Provide Vendor id.'});
                            }
                        }else{
                            return res.status(500).json({'status': 'ERROR','message':'This posting does not exists.'});
                        }
                    }).catch(next);
                }
            }
        )(req, res, next);
    },

    function(req, res, next) {
        if(Object.getOwnPropertyNames(req.body).length>0){
        	if((req.body.vendorId)&&(req.body.bid || req.body.rating)){
        		newBid = {};
    			newBid.postingId = req.params.postingId;
				newBid.vendorId= req.body.vendorId;
                newBid.vendor_name= req.venderData.owner_name;
                newBid.vendor_company= req.venderData.company_name;
                newBid.vendor_mobile= req.venderData.mobile;
                newBid.vendor_email= req.venderData.email;
                newBid.post_owner_name= req.postingData.post_owner_name;
                newBid.post_owner_company= req.postingData.post_owner_company;
                newBid.post_owner_mobile= req.postingData.mobile;
                newBid.post_owner_email= req.postingData.email;
                newBid.rating= parseInt(req.body.rating) || undefined;
                if(req.body.bid){
                    newBid.bids= [parseInt(req.body.bid)];
                    newBid.current_bid= parseInt(req.body.bid);
                }
				newBid.source = req.postingData.source;
                if(req.postingData.destination && req.postingData.destination[0]){
                    newBid.destination= req.postingData.destination[0];
                }
				newBid.truckType = req.postingData.truckType;
				newBid.lead_by_Id=req.postingData.getUserID;

        		VendorBidService.addVendorBidRateAsync(newBid)
        		.then(function(bid){
        			if(bid._id){
        				data = {};
        				data.pushToArr={
        					lead_bids : bid._id,
        				};
        				data.setNewVal = {
        					lead_status : "bid"
        				};
        				PostingService.updatePostingInterestAsync(req.postingData._id,data)
        				.then(function(post){
        					if(post){
        						return res.status(200).json({'status': 'OK', 'messages': 'Bid added successfully'});
        					}
        					else{
        						return res.status(500).json({'status': 'ERROR',"error_message":"Biding failed."});
        					}
        				})
        			}
        		},
        		function(err){
        			return res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
        		}).catch(next)
			}else{
                res.status(500).json({'status': 'ERROR',"error_message":"Please Provide Bidder information and bid."});
            }
        }else{
            res.status(400).json({'status': 'ERROR',"error_message":"No data found."});
        }
    }
);

router.put(
    '/:postingId',
    function(req, res, next) {
        console.log('request payload for update bid',JSON.stringify(req.body));
        passport.authenticate(
            'jwt',
            function (err, user, info) {
                if (err) return next(err);
                if (!user) return res.status(401).json(info);
                if(user.type != 'ft_admin'){
                    return res.status(401).json({'status': 'You are not an admin'});
                }
                if((user.role != 'updateAdmin')&&(user.role != 'superAdmin')){
                    return res.status(401).json({'status': 'You do not have update privilege'});
                }
                if((user.type == 'ft_admin')&&((user.role == 'updateAdmin')||(user.role == 'superAdmin'))){
                    var oParams = {"postingId":req.params.postingId};
                    PostingService.getPostingsByIdAsync(oParams)
                    .then(function(posting){
                        if(posting && posting[0]){
                            if(req.body && req.body.vendorId){
                                userService.findUserAsync(req.body.vendorId)
                                .then(function(user){
                                    if(user){
                                        var qObj = {};
                                        qObj.body = {
                                            "postingId":req.params.postingId,
                                            "vendorId": req.body.vendorId
                                        };
                                        VendorBidService.findVendorBidRateAsync(qObj)
                                        .then(function(bidData){
                                            if((bidData) && (bidData.length>0)){
                                                req.bid_id = bidData[0]._id;
                                                return next();
                                            }
                                            else{
                                                res.status(404).json({'status': 'ERROR','message':'Posting is not assigned to anyone. Please assign first.'});
                                            }
                                        })
                                    }else{
                                        return res.status(500).json({'status': 'ERROR','message':'This vendor does not exists.'});
                                    }
                                })
                            }else{
                                return res.status(404).json({'status': 'ERROR','message':'Please Provide Vendor id.'});
                            }
                        }else{
                            return res.status(500).json({'status': 'ERROR','message':'This posting does not exists.'});
                        }
                    }).catch(next);
                }
            }
        )(req, res, next);
    },

    function(req, res, next) {
        if(Object.getOwnPropertyNames(req.body).length>0){
        	if(req.body.bid || req.body.rating){
        		data ={};
                data.setNewVal={};
                if(req.body.bid){
                    data.pushToArr={};
                    data.pushToArr.bids = parseInt(req.body.bid);
                    data.setNewVal.current_bid = parseInt(req.body.bid);
                }
                if(req.body.rating){
                    data.setNewVal.rating = parseInt(req.body.rating);
                }
                var oParams = {"_id":req.bid_id};
				VendorBidService.updateVendorBidRateAsync(oParams,data)
        		.then(function(bid){
        			if(bid){
        				return res.status(200).json({'status': 'OK', 'messages': 'Bid updated successfully'});
					}
        		},
        		function(err){
        			return res.status(500).json({'status': 'ERROR', 'error_messages': "bid updation failed"+err.toString()});
        		}).catch(next)
			}else{
                return res.status(500).json({'status': 'ERROR',"error_message":"Please provide bid or rating value to update bid."});
            }
        }else{
            res.status(400).json({'status': 'ERROR',"error_message":"No data found."});
        }
    }
);

module.exports = router;