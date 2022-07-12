/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var ContractService = promise.promisifyAll(commonUtil.getService('contract'));
var CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
var RouteDataService = promise.promisifyAll(commonUtil.getService('routeData'));

var multer = require('multer');
var maxFileSize = 5000000;//bytes(default)--->==5MB
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(projectHome, "files", "users", req.user.clientId));
    },
    filename: function (req, file, cb) {
        cb(null, "contract_" + file.fieldname + "_" + req.params._id + path.extname(file.originalname));
    }
})

var upload = multer({
    storage: storage,
    //dest: path.join(projectHome,"files","users"),
    limits: { fileSize: maxFileSize },
    fileFilter: function (req, file, cb) {
        // The function should call `cb` with a boolean
        // to indicate if the file should be accepted
        //var doc_mimes = "image/jpeg image/bmp image/png application/pdf";
        if ((file.mimetype == 'image/jpeg') || (file.mimetype == 'image/png') || (file.mimetype == 'image/bmp') || (file.mimetype == 'application/pdf')) {
            // To accept the file pass `true`, like so:
            cb(null, true);
        } else {
            // To reject this file pass `false`, like so:
            cb(null, false)
        }
        // You can always pass an error if something goes wrong:
        //cb(new Error('I don\'t have a clue!'))
    }
})
//****************************************************************
//************Allowed Docs****************************************
var docUpload = upload.fields(
    [
        { name: "upload_document", maxCount: 1 }
    ]
);

router.post("/renew",
    function (req, res, next) {
        CustomerService.findCustomerQueryAsync({ name: req.body.customer_name, clientId: req.user.clientId })
            .then(function (customer) {
                if (customer && customer[0]) {
                    return next();
                } else {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "This customer name does not exists."
                    });
                }
            }).catch(next)
    },
    function (req, res, next) {
        ContractService.findContractQueryAsync({ name: req.body.old_contract_name, customer__id: req.body.customer__id })
            .then(function (contract) {
                if (contract && contract[0]) {
                    req.oldContractData = JSON.parse(JSON.stringify(contract[0]));
                    return next();
                } else {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This contract name does not exists."
                    });
                }
            }).catch(next)
    },
    function (req, res, next) {
        RouteDataService.findRouteDataQueryAsync({ contract__id: req.body.old_contract__id })
            .then(function (routeData) {
                if (routeData && routeData[0]) {
                    req.oldRouteData = JSON.parse(JSON.stringify(routeData));
                    return next();
                } else {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "Route data for this contract does not exists."
                    });
                }
            }).catch(next)
    },
    function (req, res, next) {
        var newContractData = JSON.parse(JSON.stringify(req.oldContractData));
        delete newContractData._id;
        newContractData.name = req.body.new_contract_name;
        newContractData.contract_start_date = req.body.contract_start_date;
        newContractData.contract_end_date = req.body.contract_end_date;
        newContractData.contract_status = req.body.contract_status ? req.body.contract_status : req.oldContractData;
        ContractService.addContractAsync(newContractData)
            .then(function (contract) {
                req.newContractData = JSON.parse(JSON.stringify(contract));
                return next();
            }).catch(next)
    },
    function (req, res, next) {
        if (req.body.set_default) {
            var customerData = {};
            customerData.active_contract = req.newContractData.name;
            customerData.active_contractId = req.newContractData.contractId;
            customerData.active_contract__id = req.newContractData._id;
            customerData.last_modified_by_name = req.user.full_name;
            customerData.last_modified_employee_code = req.user.userId;

            CustomerService.updateCustomerIdAsync(req.body.customer__id, customerData)
                .then(function (updated) {
                    return next();
                }).catch(next)
        } else {
            return next();
        }
    },
    function (req, res, next) {
        async.forEachOf(req.oldRouteData, function (oldRoute, key, callback) {
            var newRouteData = JSON.parse(JSON.stringify(oldRoute));
            delete newRouteData._id;
            newRouteData.contract_name = req.newContractData.name;
            newRouteData.contractId = req.newContractData.contractId;
            newRouteData.contract__id = req.newContractData._id;
            RouteDataService.addRouteDataAsync(newRouteData)
                .then(function (RouteData) {
                    callback();
                }).catch(callback)
        }, function (err) {
            if (err) {
                return res.status(500).json({
                    "status": "ERROR",
                    "message": err.toString()
                })
            }
            else {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Contract renewed successfully.",
                    "data": req.newContractData
                })
            }
        });
    }
);






router.post("/add",
    function (req, res, next) {
        ContractService.findContractQueryAsync({ name: req.body.name, customer__id: req.body.customer__id })
            .then(function (contract) {
                if (contract && contract[0]) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This contract name already exists. Please choose a different name",
                        "data": contract
                    });
                } else {
                    return next();
                }
            }).catch(next)
    },
    function (req, res, next) {
        req.body.remaining_weight = req.body.do_weight;
        ContractService.addContractAsync(req.body)
            .then(function (contract) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Contract has been added successfully",
                    "data": contract
                });
            }).catch(next)
    }
);

router.get("/get", function (req, res, next) {
    ContractService.searchContractAsync(req.query, false)
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Contracts found",
                "data": data.contracts,
                "count": data.count,
                "pages": data.pages
            });
        }).catch(next)
});

router.get("/get/trim", function (req, res, next) {
    ContractService.searchContractAsync(req.query, true)
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Contracts found",
                "data": data.contracts
            });
        }).catch(next)
});


router.put("/update/:_id", function (req, res, next) {
    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({ "status": "ERROR", "message": "No update body found" });
    }
    if (otherUtil.isEmptyObject(req.params)) {
        return res.status(500).json({ "status": "ERROR", "message": "No id provided for updating contract" });
    }
    docUpload(req, res, function (err) {
        if (err) {
            return res.status(500).json({
                "status": "ERROR",
                "error_message": JSON.stringify(err)
            });
        } else {
            return next();
        }
    })
},
    function (req, res, next) {
        if (req.files) {
            if ((req.files.upload_document) && (req.files.upload_document[0]) && (req.files.upload_document[0].filename !== undefined)) req.body.upload_document = req.files.upload_document[0].filename;
        }
        ContractService.updateContractIdAsync(
            req.params._id, req.body)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Contract data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    })

router.delete("/delete/:_id", function (req, res, next) {
    if (otherUtil.isEmptyObject(req.params)) {
        return res.status(500).json({ "status": "ERROR", "message": "No id provided to delete for contract" });
    }
    ContractService.deleteContractIdAsync(req.params._id)
        .then(function (deleted) {
            return res.status(200).json({
                "status": "OK",
                "message": "Contract has been deleted successfully",
                "data": deleted
            });
        }).catch(next)
});

router.get("/customer/:_id", function (req, res, next) {
    ContractService.searchContractAsync(req.params, req.body, false)
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Contracts found",
                "data": data.contracts,
                "count": data.count,
                "pages": data.pages
            });
        }).catch(next)
});

router.post("/:contract__id/transportroute/assign", function (req, res, next) {
    ContractService.updateContractIdAsync(req.params.contract__id, req.body)
        .then(function (updated) {
            return res.status(200).json({
                "status": "OK",
                "message": "Transport Routes have been assigned to contract successfully",
                "data": updated
            });
        }).catch(next)
});

router.get("/:contract__id/transportroute/get", function (req, res, next) {
    ContractService.getAssignedTransportRouteAsync(req.params.contract__id)
        .then(function (data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Transport routes found",
                "data": data
            });
        }).catch(next)
});





module.exports = router;
