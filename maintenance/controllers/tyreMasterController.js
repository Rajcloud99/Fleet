/**
 * Created by bharath on 21/04/17.
 */

var router = express.Router();
var TyreMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreMaster'));
var poService = promise.promisifyAll(commonUtil.getMaintenanceService('po'));

router.post("/add",
	function(req,res,next){
		if (otherUtil.isEmptyObject(req.body)){
			return res.status(500).json({"status":"ERROR","message":"No update body found"});
		}
		if (!req.body.test_tyres && (!req.body.test_tyres.length>0)){
			return res.status(500).json({"status":"ERROR","message":"Please provide tyre numbers to test the availability."});
		}
		if(req.body.type=="New"){
			if (!req.body.po_id){
				return res.status(500).json({"status":"ERROR","message":"PO id is required."});
			}
			poService.findpoAsync({_id:req.body.po_id})
				.then(function(available){
					if (available  && (available.length>0)) {
						req.po_data = JSON.parse(JSON.stringify(available[0]));
						return next();
					}else{
						return res.status(200).json({
							"status": "ERROR",
							"message": "This po does not exists."
						});
					}
				}).catch(next)
		}
		else{
			return next();
		}

	},
	function(req,res,next){
		TyreMasterService.findTyreMasterByQueryWithProjectionsAsync({ "tyre_number": { "$in": req.body.test_tyres } }, {"tyre_number":1,"_id":0  })
			.then(function(alreadyInDB){
				if (alreadyInDB  && (alreadyInDB.length>0)) {
					var message = "Tyre number: ";
					for (var i = 0; i < alreadyInDB.length; i++) {
						if(alreadyInDB[i].tyre_number){
							if(i==(alreadyInDB.length-1)){
								message = message+alreadyInDB[i].tyre_number+" already exists in the Database.Please provide unique tyre number."
							}else{
								message = message+alreadyInDB[i].tyre_number+", ";
							}
						}
					}
					return res.status(200).json({
						"status": "ERROR",
						"message": message
					});
				}else{
					return next();
				}
			}).catch(next)
	},
	function(req,res,next) {
		var spares = req.body.data;
		var isTyre = true;
		var missingnums="";
		var missing = [];
		var req = ['tyre_number', 'retread_count', 'status','category'];
		async.each(spares, function(spare, done){
			if(!spare.tyres) {
				isTyre = false;
				return done(true);
			}
			if(spare.tyres.length<spare.quantity){
				missingnums+="("+(spare.quantity-spare.tyres.length)+"-"+spare.spare_name+") ";
				return done(true);
			}

			for(var i = 0; i < spare.tyres.length; i++) {
				var tyre = spare.tyres[i];

				for(var j = 0; j < req.length; j++) {
					if(!(req[j] in tyre)) {
						missing.push(req[j]);
						return done(true);
					}
				}
			}
			done();
		}, function(err){
			if(err) {
				if(!isTyre) return res.status(500).json({"status":"ERROR",
					"message":"Please provide tyres array in data."
				});
				else if(missingnums!=""){
                    return res.status(500).json({"status":"ERROR",
                        "message":"Please provide respective numbers of tyre numbers: "+missingnums+"."
                    });
				}
				else {
					return res.status(500).json({"status":"ERROR",
						"message":"Please provide "+ missing.toString() +" in tyres array in data."
					});
				}
			}
			next();
		});
	},
	function(req,res,next) {
		var responseData = [];
		var dataBody={};
		async.forEachOf(req.body.data,function (data,key,callback) {
			dataBody=data;
			data.vendor_name=req.body.vendor_name;
			data.vendorId=req.body.vendorId;
			data.vendor_id=req.body.vendor_id;
			data.manufacturer=req.body.manufacturer;
			data.freight = req.body.freight;
			data.branchName=req.body.branchName || "ICD Loni";
			data.branchId=req.body.branchId || "loni";
			data.invoice_number=req.body.invoice_number;
			data.invoice_date=req.body.invoice_date;
			data.po_number=req.body.po_number;
			data.clientId=req.user.clientId;
			data.tax=data.tax ||0;
			async.forEachOf(data.tyres, function(tyre, key, done) {
				dataBody.tyre_number = tyre.tyre_number;
				dataBody.retread_count = tyre.retread_count;
				dataBody.status = tyre.status;
				if(req.body.type=="New" || req.body.type=="new"){
					dataBody.tyre_category = "New";
				}else{
					dataBody.tyre_category = tyre.category;
				}
				dataBody.billing_amount=dataBody.rate_per_piece+(dataBody.rate_per_piece*dataBody.tax/100);
				dataBody.current_price=dataBody.billing_amount;
				dataBody.created_by_employee_name=req.user.full_name;
				dataBody.created_by_employee_code=req.user.userId;
				TyreMasterService.addTyreMasterAsync(dataBody)
					.then(function(added){
						responseData.push(JSON.parse(JSON.stringify(added)));
						done();
					});
			}, function(err) {
				callback();
			});

		},function (err) {
			if(err){
				return res.status(500).json({"status":"ERROR",
					"message":"Unable to add TyreMaster."
				});
			}else{
				//PO UPDATE by PO ID
				if(req.body && req.po_data && req.po_data.spare && (req.po_data.spare.length>0) && req.body.data && (req.body.data.length>0)){
					var po_update = {};
                    var completeInwarded=true;
                    for (var i = 0; i < req.po_data.spare.length; i++) {
						for (var j = 0; j < req.body.data.length; j++) {
							if(req.po_data.spare[i]._id == req.body.data[j].spare_id){
								req.po_data.spare[i].remaining_quantity = req.po_data.spare[i].remaining_quantity - req.body.data[j].quantity;
                                if(completeInwarded && req.po_data.spare[i].remaining_quantity !=0){
                                    completeInwarded=false;
                                }
							}else if(j==req.body.data.length-1){
								if(completeInwarded && req.po_data.spare[i].remaining_quantity !=0){
									completeInwarded=false;
								}
							}
						}
					}
					if (req.body.to_inward===true) {
						if(!req.po_data.haveSpare && !req.po_data.haveTool) {
							po_update.status = constant.poStatus[3];
						}
						else{
							po_update.status = constant.poStatus[4];
						}
						po_update.haveTyre = false;
					}else{
						po_update.status = constant.poStatus[4];
					}
					po_update.spare = req.po_data.spare;
					po_update.rFreight = req.po_data.rFreight?req.po_data.rFreight:req.po_data.freight;
					po_update.rFreight -= req.body.freight;
					poService.findandUpdatePOByIdAsync(req.po_data._id,po_update)
						.then(function(updated){
							if(updated){
								return res.status(200).json({"status":"OK",
									"message":"TyreMaster has been added successfully",
									"data":responseData
								});
							}else{
								return res.status(500).json({"status":"ERROR",
									"message":"unable to update PO data."});
							}
						}).catch(next)
				}else{
					if(req.body.type=="New"){
						return res.status(500).json({"status":"ERROR",
							"message":"unable to update PO data."
						});
					}
					else {
						return res.status(200).json({"status":"OK",
							"message":"TyreMaster has been added successfully",
							"data":responseData
						});
					}
				}
			}
		})
	}
);
var pmtassoc = promise.promisifyAll(commonUtil.getMaintenanceService('primeMoverTrailerAssociation'));
router.get("/get",function(req,res,next){
	if(req.query.vehicle_no){
		let pmtQuery={isDisassociated:false,$or: [{ vehicle_reg_no:req.query.vehicle_no },{trailer_no:req.query.vehicle_no}]}
		pmtassoc.findPrimeMoverTrailerAssociationByQueryAsync(pmtQuery).then((horseTrailerData)=>{
			horseTrailerData = JSON.parse(JSON.stringify(horseTrailerData));
			if(horseTrailerData && horseTrailerData[0]){
				if(horseTrailerData[0].vehicle_reg_no==req.query.vehicle_no){
					req.query.associatedVeh=horseTrailerData[0].trailer_no;
				}else{
					req.query.associatedVeh=horseTrailerData[0].vehicle_reg_no;
				}
				return next();
			}
			else{
				return next();				
			}
		})
		.catch(next)
	}
	else{
		return next();
	}
},function(req,res,next){
	TyreMasterService.searchTyreMasterAsync(req.query)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Tyre Masters found",
				"data":data.tyreMasters,
				"count":data.count,
				"pages":data.pages});
		}).catch(next)
});

router.put("/update/:_id",
	function(req,res,next){
		if (otherUtil.isEmptyObject(req.body)){
			return res.status(500).json({"status":"ERROR","message":"No update body found"});
		}
		if (otherUtil.isEmptyObject(req.params)){
			return res.status(500).json({"status":"ERROR","message":"No id provided for updating Tyre Master"});
		}
		/**validate existing name/code **/
		TyreMasterService.findTyreMasterByQueryAsync({"tyre_number":req.body.tyre_number,"_id":req.params._id})
			.then(function (TyreMasters) {
				if (TyreMasters && TyreMasters.length==1) {
					return next();
				}else{

					return res.status(500).json({
						"status": "ERROR",
						"message": "Tyre Number not found in our database."
					});
				}
			}).catch(next);
	},
	function(req,res,next){
		TyreMasterService.updateTyreMasterByIdAsync(req.params._id,req.body)
			.then(function(updated){
				return res.status(200).json({"status":"OK",
					"message":"Tyre Master data has been updated successfully",
					"data":updated});
			}).catch(next)
	}
);

router.delete("/delete/:_id",function(req,res,next){
	if (otherUtil.isEmptyObject(req.params)){
		return res.status(500).json({"status":"ERROR","message":"No id provided to delete for Tyre Master"});
	}
	TyreMasterService.deleteTyreMasterByIdAsync(req.params._id)
		.then(function(deleted){
			return res.status(200).json({"status":"OK",
				"message":"Tyre Master has been deleted successfully",
				"data":deleted});
		}).catch(next)
});

module.exports = router;
