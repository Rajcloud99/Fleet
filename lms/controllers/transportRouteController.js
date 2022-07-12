/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var TransportRouteService = promise.promisifyAll(commonUtil.getService('transportRoute'));
var transportRoute = promise.promisifyAll(commonUtil.getModel('transportRoute'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let GR = commonUtil.getModel('tripGr');
let Trip = commonUtil.getModel('trip');
let Booking = commonUtil.getModel('bookings');
const logsService = commonUtil.getService('logs');
/**************transport route*********/
router.post("/add",
    function(req,res,next){
        TransportRouteService.findTransportRouteQueryAsync({
					clientId:req.body.clientId,
					name:new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')
        }).then(function(route){
                if (route && route[0] && !(route[0].deleted)) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This transport route name already exists. Please choose a different routename",
                        "data": route
                    });
                }else{
                    return next();
                }
        }).catch(next)
    },
    function(req,res,next) {
        TransportRouteService.addTransportRouteAsync(req.body)
            .then(function(route){
                return res.status(200).json({"status":"OK",
                    "message":"Transport route has been added successfully",
                    "data":route});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    TransportRouteService.searchTransportRouteAsync(req.query,false)
        .then(function(data){
			if (req.query.download) {
				ReportExelService.transportRouteReports(data.routes, req.user.clientId, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else {
				return res.status(200).json({
					"status": "OK",
					"message": "Transport routes found",
					"data": data.routes,
					"count": data.count,
					"pages": data.pages
				});
			}
        }).catch(next)
});

router.get("/get/trim",function(req,res,next){
    TransportRouteService.searchTransportRouteAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Transport routes found",
                "data":data.routes});
        }).catch(next)
});


router.put("/update/:id",async function(req,res,next){
    if (otherUtil.isEmptyObject(req.body)){
        return res.status(500).json({"status":"ERROR","message":"No update body found"});
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided for updating transport vendor"});
    }
	let duplicateAc;
	let dupFilter={};
	if(req.body.name){
		dupFilter.name = new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i');
	}
	// Step0. Check in Booking
	if(Object.keys(dupFilter).length>0){//check duplicacy for name
		dupFilter.clientId = req.user.clientId || req.body.clientId;
		duplicateAc = await transportRoute.find(dupFilter,{name:1}).lean();
		if (duplicateAc) {
			for (let i = 0; i < duplicateAc.length; i++) {
				if(duplicateAc[i]._id.toString() !== req.params.id.toString()){
					return res.status(500).json({"status":"ERROR","message":"This route name already exists can't update it."});
				}
			}
		}
	}
	// Step1. Check in Booking
	let oBooking = await Booking.findOne({ "route": otherUtil.arrString2ObjectId(req.params.id) },{_id:1, booking_no:1,}).lean();
	if(oBooking && oBooking._id){
		return res.status(500).json({"status":"OK",
		"message":`Booking (${oBooking.booking_no}) already exist so you cant delete.`,
		"data":[]});
	}
	// Step2. Check in Trip
	let oTrip = await Trip.findOne({"route": otherUtil.arrString2ObjectId(req.params.id)}, {_id: 1, trip_no:1}).lean();
	if(oTrip && oTrip._id){
		return res.status(500).json({"status":"OK",
		"message":`Trip (${oTrip.trip_no}) already exist so you cant delete.`,
		"data":[]});
	}
	// Step3. Check in GR
	let oGr = await GR.findOne({"route":otherUtil.arrString2ObjectId(req.params.id)},{_id:1, grNumber:1, trip_no:1}).lean();
	if(oGr && oGr._id){
		return res.status(500).json({"status":"OK",
		"message":`TripGr (${oGr.trip_no}) already exist so you cant delete.`,
		"data":[]});
	}
	// checking end
    TransportRouteService.updateTransportRouteIdAsync(req.params.id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"Transport route data has been updated successfully",
                "data":updated});
        }).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for driver"});
    }
    TransportRouteService.deleteTransportRouteIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Transport route has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

router.post("/routesexcel" , function(req,res,next)
{


	transportRoute.find()
		.then(function(dbData)
		{
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Report download available.",
						"url": data.url
					});
				}

				if (req.body.download && (req.body.download !== "false")) {



					ReportExelService.generateRoutesExcel(dbData,req.user.clientId,ReportResponse);

				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Routes data",
						"data": dbData
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Routes found.",
					"data":[]
				});
			}
		}).catch(next)




})

router.post("/update/:_id", async function (req,res,next){

	try {

		let  body= req.body;

		if(!body._id)
			throw new Error('Mandatory fields are required');
		if(!body.route_distance)
			throw new Error('Mandatory fields are required');
		if(!body.remark)
			throw new Error('Mandatory fields are required');

		let oRoute = await transportRoute.findOne({_id: req.params._id, clientId: req.user.clientId});

		if (!oRoute)
			throw new Error('Route not found!');

		let routeUpdate = await transportRoute.updateOne({_id: req.params._id, clientId: req.user.clientId},{$set:{route_distance:body.route_distance}});

		await logsService.add('TransportRoute', {
			uif: oRoute.name +":"+ req.params._id,
			category: 'update',
			nData: {},
			action: {
				refNo: "oldKm.: " + oRoute.route_distance,
				remarkByUser: req.user.full_name,
				addedUser: req.user.full_name,
				remarkDatetime: Date.now(),
				remark: body.remark
			},
			oData: JSON.parse(JSON.stringify(oRoute)),
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Route Km Successfully Update',
			routeUpdate
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}

});


module.exports = router;
