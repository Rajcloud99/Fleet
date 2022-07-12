
let router = express.Router();
let Consignor_eeService = promise.promisifyAll(commonUtil.getService('consignor_consignee'));
let Consignor_eeModel = commonUtil.getModel('consignor_consignee');
let tripGRModel = commonUtil.getModel('tripGr');

router.post("/add",
	function(req,res,next){
		Consignor_eeService.findConsignor_ConsigneeQueryAsync({
			name:new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'),
			clientId:req.user.clientId,
			type:req.body.type
		})
			.then(function(consignor_ee){
				if (consignor_ee && consignor_ee[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": `This ${req.body.type} name already exists. Please choose a different name`,
						"data":consignor_ee
					});
				}else{
					return next();
				}
			}).catch(next)
	},
	function(req,res,next) {
		req.body.created_at = Date.now();
		req.body.last_modified_at = Date.now();
		Consignor_eeService.addConsignor_ConsigneeAsync(req.body)
			.then(function(consignor_ee){
				return res.status(200).json({"status":"OK",
					"message":`${req.body.type} has been added successfully`,
					"data":consignor_ee
				});
			}).catch(next)
	}
);
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.get('/get', function(req, res, next) {
	req.query.clientId = req.user.clientId;
	Consignor_eeService.searchConsignor_ConsigneeAsync(req.query, false)
		.then(function(data) {
			if (req.query.download) {
				ReportExelService.consignorConsigneeReports(data.data, req.user.clientId, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else if(data && data.data && data.data[0]){
			return res.status(200).json({
				'status': 'OK',
				'message': 'Consignors found',
				'data': data.data,
				'count': data.count,
				'pages': data.pages
			})}
			else{
				return res.status(200).json({
					'status': 'OK',
					'message': ' No Consignors found',
					'data':data

				})
			};
		}).catch(next);
});

router.get('/get/trim', function(req, res, next) {
	Consignor_eeService.searchConsignor_ConsigneeAsync(req.query, true)
		.then(function(data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Consignors found',
				'data': data.consignors
			});
		}).catch(next);
});

router.put('/update/:_id',
	async function(req, res, next) {
		if(otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body for Consignor update'});
		}
		let duplicateAc;
		let dupFilter={};
		if(req.body.name){
			dupFilter.name = new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i');
		}
		if(Object.keys(dupFilter).length>0){//check duplicacy for name
			dupFilter.clientId = req.user.clientId || req.body.clientId;
			dupFilter.type = req.body.type;
			duplicateAc = await Consignor_eeModel.find(dupFilter,{name:1}).lean();
			if (duplicateAc) {
				for (let i = 0; i < duplicateAc.length; i++) {
					if(duplicateAc[i]._id.toString() !== req.params._id.toString()){
						return res.status(500).json({"status":"ERROR","message":"This name already exists can't update it."});
					}
				}
			}
		}
		Consignor_eeService.findConsignor_ConsigneeIdAsync({_id: req.params._id})
			.then(function(consignor_ee) {
				if(consignor_ee && consignor_ee[0]) {
					req.consignorData = JSON.parse(JSON.stringify(consignor_ee[0]));
					return next();
				} else {
					return res.status(500).json({'status': 'ERROR', 'error_message': 'Consignor does not exist'});
				}
			});
	},

	async function(req, res, next) {
		Consignor_eeService.updateConsignor_ConsigneeIdAsync(req.params._id, req.body)
			.then(function(updated) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Consignor data has been updated successfully',
					'data': updated
				});
			}).catch(next);
	}
);

router.delete("/delete/:_id",function(req,res,next) {
	if (otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({"status": "ERROR", "message": "No id provided to delete for consignor"});
	}
		Consignor_eeService.findConsignor_ConsigneeIdAsync(req.params._id)
		.then(async function (consignor) {
			if (consignor && consignor[0]) {
				let GR  = await tripGRModel.findOne({$or:[{consignee:mongoose.Types.ObjectId(req.params._id)},{consignor:mongoose.Types.ObjectId(req.params._id)}]},{trip_no:1});
				if(GR){
					return res.status(500).json({'status': 'ERROR', 'error_message': 'Consignor/Consignee exist on gr you can not delete'});
				}else{
					return next();
				}
			} else {
				return res.status(500).json({'status': 'ERROR', 'error_message': 'Consignor/Consignee does not exist'});
			}
		}).catch(next);
},
	function(req,res,next){

	Consignor_eeService.deleteConsignor_ConsigneeIdAsync(req.params._id)
		.then(function(deleted){
			return res.status(200).json({"status":"OK",
				"message":"Consignor has been deleted successfully",
				"data":deleted});
		}).catch(next)
});


module.exports = router;
