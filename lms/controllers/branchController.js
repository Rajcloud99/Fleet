/**
 * Created by manish on 19/7/16.
 */
var router = require('express').Router();
var BranchService = promise.promisifyAll(commonUtil.getService("branch"));
let branchServiceV2 = commonUtil.getService('branch');
var Branch = commonUtil.getModel('branch');
const StationaryUsed = commonUtil.getModel('billStationaryUsed');
let BillBook = commonUtil.getModel('billBook');
let Voucher = commonUtil.getModel('voucher');
let GR = commonUtil.getModel('tripGr');
var DepartmentBranchService = promise.promisifyAll(commonUtil.getService('departmentBranch'));
var async = require('async');
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));



/***********add new branch *******/
router.post("/add",
    /**validations **/
	// async function(req,res,next) {
        /*if(otherUtil.validateClientAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }*/
    //     BranchService.findBranchQueryAsync({clientId:req.user.clientId,name:req.body.name})
    //         .then(function(branchArr){
    //             if (branchArr && branchArr[0]) {
    //                 return res.status(500).json({
    //                     "status": "ERROR",
    //                     "error_message": "Branch name already exists. Please choose a different branch name"
    //                 });
    //             }else{
    //                 return next();
    //             }
    //         }).catch(next);
    // },

	async function(req,res,next){

		try {

			let oBranch = await Branch.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

			if(oBranch)
				throw new Error('This Branch name already exists. Please choose a different name');

			oBranch = await Branch.findOne({code: req.body.code, clientId: req.user.clientId});

			if(oBranch)
				throw new Error('This Branch Code already exists. Please choose a different Code');

			return next();

		}catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString(),
				'data': e
			});
		}
	},

	async function(req,res,next) {
		let branchData;
        // BranchService.addBranchAsync(req.body)
        // .then(function(branch){
		// 	branchData = branch;
        // }).catch(next);
		branchData = await branchServiceV2.addBranchV2(req.body);
		let branchObj = {
			name : branchData.name,
			ref : branchData._id
		};

		if(req.body.lsBook && req.body.lsBook.length){
			for(let ls of req.body.lsBook){
				let lsBook = await BillBook.findOneAndUpdate({_id: ls.ref}, {$set: {branch: branchObj}, isLinked: true}, {
					new: true,
					upsert: true
				});
			}
		}

		if(req.body.crBook && req.body.crBook.length){
			for(let cr of req.body.crBook){
				let crBook = await BillBook.findOneAndUpdate({_id: cr.ref}, {$set: {branch: branchObj}, isLinked: true}, {
					new: true,
					upsert: true
				});
			}
		}

		if(req.body.mrBook && req.body.mrBook.length){
			for(let mr of req.body.mrBook){
				let mrBook = await BillBook.findOneAndUpdate({_id: mr.ref}, {$set: {branch: branchObj}, isLinked: true}, {
					new: true,
					upsert: true
				});
			}
		}

		if(req.body.refNoBook && req.body.refNoBook.length){
			for(let ref of req.body.refNoBook){
				let refNoBook = await BillBook.findOneAndUpdate({_id: ref.ref}, {$set: {branch: branchObj}, isLinked: true}, {
					new: true,
					upsert: true
				});
			}
		}

		return res.status(200).json({"status":"OK",
			"message":"Branch has been added successfully",
			"data":branchData});
    }
);

/***********get all branches + search *******/
router.get("/get",function(req,res,next){
	if(req.query.cClientId)
		req.query.clientId = req.query.cClientId;

	if(req.query.multiClientId)
		req.query.clientId = req.query.multiClientId;
	let trim = req.query && req.query.trim?true:false;
    BranchService.searchBranchAsync(req.query,trim)
        .then(function(data){
            async.forEachOf(data.branches,function (branch,index,callback) {
                DepartmentBranchService.findDepartmentBranchByQueryAsync({clientId:req.user.clientId,branchId:branch.id})
                    .then(function(deparmentBranchArr){
                        data.branches[index].departments  = deparmentBranchArr;
                        callback();
                    }).catch(callback);
            },function (err) {
                if(err) return next(err);
				if (req.query.download) {
					ReportExelService.branchReports(data.branches, req.user.clientId, function(data){
						return res.status(200).json({
							"status": "OK",
							"message": "report download available.",
							"url": data.url
						});
					});
				}else {
					return res.status(200).json({
						"status": "OK",
						"message": "Branches found",
						"data": data.branches,
						"pages": data.pages,
						"count": data.count
					});
				}
            });
        }).catch(next);
});

/***********get all branches + trim + search  *******/
router.get("/get/trim",function(req,res,next){
	if(req.query.cClientId)
		req.query.clientId = req.query.cClientId;

    BranchService.searchBranchAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Branches found",
                "data":data.branches});
        }).catch(next);
});

/***********returns branches which have maintenance dep in them *******/
router.get("/get/maintenance",function(req,res,next){
    DepartmentBranchService.searchDepartmentBranchByQueryAsync(
        {"clientId":req.user.clientId,"depName":"Maintenance"},false)
        .then(function (maintenanceDepData) {
            var branchResults = [];
            if (maintenanceDepData && maintenanceDepData.departmentBranchs.length>0){
                async.forEachOf(maintenanceDepData.departmentBranchs, function (maintDep, index, callback) {
                    BranchService.findBranchQueryAsync({clientId:req.user.clientId,
                        id:maintDep.branchId})
                        .then(function (branch) {
                            if (branch && branch[0] && branch[0].id && branch[0].name && branch[0]._id){
                                var branch_ = {_id:branch[0]._id,id:branch[0].id,name:branch[0].name};
                                branchResults.push(branch_);
                            }
                            callback();
                        })
                },function (err) {
                    if (err){
                        return res.status(500).json({"status":"ERROR",
                        "message":err});
                    }
                    return res.status(200).json({"status":"OK",
                        "message":"Branches found",
                        "data":branchResults});
                })
            }else{
                return res.status(200).json({"status":"OK",
                    "message":"Branches found",
                    "data":[]});
            }
        }).catch(next);
});

/***********update branch *******/
router.put("/update/:_id",
    function(req,res,next){
        /*if(otherUtil.validateClientAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }*/
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","error_message":"No id supplied to update branch"});
        }
        BranchService.findBranchIdAsync(req.params._id)
            .then(function(branch){
                if (branch && branch[0]) {
                    req.branch = branch[0];
                    return next();
                }else{
                    return res.status(500).json({"status": "ERROR", "error_message": "Branch does not exist"});
                }
            }).catch(next)
    },
    function(req,res,next) {
	if (req.branch.name ==req.body.name){
            return next();
        }else {
            BranchService.findBranchQueryAsync({name: req.body.name})
                .then(function (branch) {
                    if (branch && branch[0]) {
                        return res.status(500).json({
                            "status": "ERROR",
                            "error_message": "Branch name already exists. Please choose a different branch name"
                        });
                    } else {
                        return next();
                    }
                }).catch(next);
        }
    },
    function(req,res,next) {
        if (req.branch.code ==req.body.code){
            return next();
        }else {
            BranchService.findBranchQueryAsync({code: req.body.code})
                .then(function (branch) {
                    if (branch && branch[0]) {
                        return res.status(500).json({
                            "status": "ERROR",
                            "error_message": "Branch code already exists. Please choose a different code"
                        });
                    } else {
                        return next();
                    }
                }).catch(next);
        }
    },

	async function(req,res,next){

		let branchObj = {
			name: req.body.name,
			ref: req.params._id,
		};

		if(req.body.removeBooks && req.body.removeBooks.length){
			for(let book of req.body.removeBooks){
				let usedBook = await StationaryUsed.findOne({billBookId:mongoose.Types.ObjectId(book._id)},{status:1})
				if(usedBook){
					return res.status(500).json({
						'status': 'ERROR',
						'message': 'Some book used now you can not remove  branch!'
					});
				}
				let removeBook = await BillBook.findOneAndUpdate({_id: book._id}, {$set: {branch: []}, isLinked: false}, {
					new: true,
					upsert: true
				});
			}
		}
		if(req.body.lsBook && req.body.lsBook.length){
			for(let ls of req.body.lsBook){
				if(ls.newBook){
					let billBook = await BillBook.findById(ls.ref).lean();
					let usedBook = await StationaryUsed.findOne({billBookId:mongoose.Types.ObjectId(ls.ref)},{status:1})
					if(usedBook && billBook.branch.length){
						if((billBook.branch[0].ref.toString()) != req.params._id.toString()){
							return res.status(500).json({
								'status': 'ERROR',
								'message': `${billBook.name} book used now you can not update branch on ${billBook.name} book!`
							});
						}
					}
				    if(!usedBook){
						let lsBook = await BillBook.findOneAndUpdate({_id: ls.ref}, {$set: {branch: branchObj}, isLinked: true}, {
							new: true,
							upsert: true
						});
					}
				}
			}
		}

		if(req.body.crBook && req.body.crBook.length){
			for(let cr of req.body.crBook){
				if(cr.newBook) {
					let billBook = await BillBook.findById(cr.ref).lean();
					let usedBook = await StationaryUsed.findOne({billBookId:mongoose.Types.ObjectId(cr.ref)},{status:1})
					if(usedBook && billBook.branch.length){
						if((billBook.branch[0].ref.toString()) != req.params._id.toString()){
							return res.status(500).json({
								'status': 'ERROR',
								'message': `${billBook.name} book used now you can not update branch on ${billBook.name} book!`
							});
						}
					}
				    if(!usedBook){
						let crBook = await BillBook.findOneAndUpdate({_id: cr.ref}, {
							$set: {branch: branchObj},
							isLinked: true
						}, {
							new: true,
							upsert: true
						});
					}
				}
			}
		}

		if(req.body.mrBook && req.body.mrBook.length){
			for(let mr of req.body.mrBook){
				if(mr.newBook) {
					let billBook = await BillBook.findById(mr.ref).lean();
					let usedBook = await StationaryUsed.findOne({billBookId:mongoose.Types.ObjectId(mr.ref)},{status:1})
					if(usedBook && billBook.branch.length){
						if((billBook.branch[0].ref.toString()) != req.params._id.toString()){
							return res.status(500).json({
								'status': 'ERROR',
								'message': `${billBook.name} book used now you can not update branch on ${billBook.name} book!`
							});
						}
					}
					if(!usedBook){
						let mrBook = await BillBook.findOneAndUpdate({_id: mr.ref}, {
							$set: {branch: branchObj},
							isLinked: true
						}, {
							new: true,
							upsert: true
						});
					}
				}
			}
		}

		if(req.body.refNoBook && req.body.refNoBook.length){
			for(let ref of req.body.refNoBook){
				if(ref.newBook) {
					let billBook = await BillBook.findById(ref.ref).lean();
					let usedBook = await StationaryUsed.findOne({billBookId:mongoose.Types.ObjectId(ref.ref)},{status:1})
					if(usedBook && billBook.branch.length ){
						if((billBook.branch[0].ref.toString()) != req.params._id.toString()){
							return res.status(500).json({
								'status': 'ERROR',
								'message': `${billBook.name} book used now you can not update branch on ${billBook.name} book !`
							});
						}
					}
					if(!usedBook){
						let refNoBook = await BillBook.findOneAndUpdate({_id: ref.ref}, {
							$set: {branch: branchObj},
							isLinked: true
						}, {
							new: true,
							upsert: true
						});
					}
				}
			}
		}

        BranchService.updateBranchIdAsync(req.params._id,req.body)
            .then(function (branch) {
                return res.status(200).json({"status":"OK",
                    "message":"Branch has been updated successfully",
                    "data":branch});
            })
            .catch(next)
    }
);

/***********delete branch *******/
router.delete("/delete/:_id",
    function(req,res,next){
        /*if(otherUtil.validateClientAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }*/
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","error_message":"No id supplied to delete for branch"});
        }
        BranchService.findBranchIdAsync(req.params._id)
            .then(function(branch){
                if (branch && branch[0]) {
                    req.branch = branch[0];
                    return next();
                }else{
                    return res.status(500).json({"status": "ERROR", "error_message": "Branch does not exist"});
                }
            })
            .catch(function (err) {
                return next(err);
            });
    },
    /**delete all associated departments for this branch**/
    function(req,res,next){
        DepartmentBranchService.deleteDepartmentBranchByQueryAsync({clientId:req.user.clientId,branchId:req.branch.id})
        return next();
    },
    function(req,res,next) {
        BranchService.deleteBranchIdAsync(req.params._id)
            .then(function(deleted){
                return res.status(200).json({"status":"OK",
                    "message":"Branch has been deleted successfully",
                    "data":deleted});
            })
            .catch(function (err) {
                return next(err);
            });
    }
);

router.post('/enabledisable/:id', async (req, res, next) => {
	try {
		let reqBody = req.body;
		if(!req.params.id)
			throw new Error('Mandatory fields are required');
		if(!reqBody)
			throw new Error('Mandatory fields are required');

		let  oBranch = await Branch.findOne({_id: otherUtil.arrString2ObjectId( req.params.id)}, {_id: 1, grBook:1, lsBook:1, crBook:1, refNoBook:1, mrBook:1, fpaBook:1 , miscCNBook:1, tripMemoBook:1}).lean();

		if (reqBody.deleted && oBranch && !oBranch._id)
			throw new Error('Branch Not Found');

		if (reqBody.deleted && oBranch.grBook && oBranch.grBook.length)
			throw new Error(`Can not Disable!! GR Book linked to branch`);

		if (reqBody.deleted && oBranch.lsBook && oBranch.lsBook.length)
			throw new Error(`Can not Disable!! Hire Slip Book linked to branch`);

		if (reqBody.deleted && oBranch.crBook && oBranch.crBook.length)
			throw new Error(`Can not Disable!! CR Book linked to branch`);

		if (reqBody.deleted && oBranch.refNoBook && oBranch.refNoBook.length)
			throw new Error(`Can not Disable!! REF Book linked to branch`);

		if (reqBody.deleted && oBranch.mrBook && oBranch.mrBook.length)
			throw new Error(`Can not Disable!! MR Book linked to branch`);

		if (reqBody.deleted && oBranch.fpaBook && oBranch.fpaBook.length)
			throw new Error(`Can not Disable!! FPA Book linked to branch`);

		if (reqBody.deleted && oBranch.miscCNBook && oBranch.miscCNBook.length)
			throw new Error(`Can not Disable!! miscCN Book linked to branch`);

		if (reqBody.deleted && oBranch.tripMemoBook && oBranch.tripMemoBook.length)
			throw new Error(`Can not Disable!! tripMemo Book linked to branch`);

		let  oVoucher = await Voucher.find({branch: otherUtil.arrString2ObjectId( req.params.id)}, {_id: 1}).lean();

		if (reqBody.deleted &&  oVoucher.length)
			throw new Error(`Can not Disable!! voucher already generated for this branch`);

		let  oGR = await GR.find({branch: otherUtil.arrString2ObjectId( req.params.id)}, {_id: 1}).lean();

		if (reqBody.deleted && oGR.length)
			throw new Error(`Can not Disable!! GR already generated for this branch`);

		oBranch = await Branch.updateOne({_id: req.params.id, clientId: req.user.clientId}, {
			$set: {
				deleted:reqBody.deleted,
				last_modified_at: new Date(),
				last_modified_by_name:  req.user.full_name,
				// last_modified_by:  req.user._id,
				last_modified_employee_code:  req.user.clientId
			}
		});

		return res.status(200).json({
			status: 'OK',
			message: 'Branch Updated!',
			data: oBranch
		})
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

module.exports = router;
