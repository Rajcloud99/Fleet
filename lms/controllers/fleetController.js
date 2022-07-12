/**
 * Created by pratik on 4/10/17.
 */

var router = express.Router();
var FleetService = promise.promisifyAll(commonUtil.getService('fleet'));

/**************fleet vendor *********/
router.post("/add",
    function(req, res, next) {
        FleetService.findFleetAsync({ name: req.body.name })
            .then(function(fleet) {
                if (fleet && fleet[0]) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This fleet name already exists. Please choose a different fleet name.",
                        "data": fleet
                    });
                } else {
                    return next();
                }
            }).catch(next)
    },
    function(req, res, next) {
        FleetService.addFleetAsync(req.body)
            .then(function(addedFleet) {
                if (addedFleet) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Fleet has been added successfully.",
                        "data": addedFleet
                    });
                } else {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Unable to add fleet."
                    });
                }

            }).catch(next)
    }
);

router.get("/get", function(req, res, next) {
    FleetService.getFleetAsync(req.query)

        .then(function(data) {
            if (data) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Registered Fleet found.",
                    "data": data.data,
                    "pages": data.pages,
                    "count": data.count
                });
            }

        }).catch(next)
});

router.put("/update/:_id",
    function(req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "message": "No update body found." });
        }
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({ "status": "ERROR", "message": "No id provided for updating fleet." });
        }
        FleetService.findFleetAsync({ _id: req.params._id })
            .then(function(fleet) {
                if (fleet) {
                    return next();
                } else {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This fleet name does not exists.",
                    });
                }
            }).catch(next)
    },
    // check name exist or not - Harikesh - 08/11/2019
    /*function(req, res, next) {
        FleetService.findFleetAsync(
            { 
                "$and": {
                    "name": req.body.name,
                    "_id": {
                        "$ne": req.params._id
                    }
                }
            }
            )
            .then(function(fleet) {
                if (fleet && fleet[0]) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This fleet name already exists. Please choose a different fleet name.",
                        "data": fleet
                    });
                } else {
                    return next();
                }
            }).catch(next)
    },*/
    // DONE
    function(req, res, next) {
        FleetService.updateFleetByIdAsync(req.params._id, req.body)
            .then(function(updated) {
                if (updated) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Fleet data has been updated successfully.",
                        "data": updated
                    });
                } else {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "unable to update fleet data."
                    });
                }
            }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req, res, next) {
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({ "status": "ERROR", "message": "No id provided to delete the fleet." });
        }
        FleetService.findFleetAsync({ _id: req.params._id })
            .then(function(fleet) {
                if (fleet) {
                    return next();
                } else {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This fleet id does not exists.",
                    });
                }
            }).catch(next)
    },
    function(req, res, next) {
        FleetService.deleteFleetAsync(req.params._id)
            .then(function(deleted) {
                if (deleted) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Fleet has been deleted successfully.",
                        "data": deleted
                    });
                } else {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "unable to delete fleet."
                    });
                }
            }).catch(next)
    }
);

// By harikesh - Dated: 11/11/2019
router.post("/fleet_segment",
	function (req, res, next) {
		FleetService.updateMultipleVehicleFleetSegmentAsync({
			body: req.body,
			user: req.user
		})
		.then(function (registeredVehicle) {
			if (registeredVehicle.ok) {

				return res.status (200).json ({
					"status": "OK",
					"message": "Vehicles Updated successfully",
					"data": registeredVehicle
				});
			}

			return res.status(200).json({
				"status": "ERROR",
				"message": registeredVehicle,
				"data": registeredVehicle
			});

		}).catch(next);
	}
);


module.exports = router;