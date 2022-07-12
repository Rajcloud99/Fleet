/**
 * Created by manish on 20/7/16.
 */
let router = require('express').Router();
let multer  = require('multer');

let DriverService = promise.promisifyAll(commonUtil.getService("driver"));
let RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
let ClientService = promise.promisifyAll(commonUtil.getService("client"));
let UserService = promise.promisifyAll(commonUtil.getService("user"));

let getDestinationPath = function (uploadForType) {
	switch (uploadForType) {
		case "driver":
			return path.join(projectHome,"files","drivers");
		case "reg_vehicle":
	}

};

let getFileName = function (fileForType) {

};

let destDriver = multer.diskStorage({
    destination: function (req, file, callback) {
        //console.log("Was here 1");
        callback(null, path.join(projectHome,"files","drivers"));
    },
    filename: function (req, file, callback) {
        //console.log("Was here 2");
        let extension = file.mimetype.substring(file.mimetype.indexOf("/")+1);
        console.log(extension);
        let fileName = "driver_"+file.fieldname + '_'+req.params._id+"."+extension;
        callback(null,fileName);
    }
});

let destRegVehicle = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(projectHome,"files","reg_vehicle"));
    },
    filename: function (req, file, callback) {
        let extension = file.mimetype.substring(file.mimetype.indexOf("/")+1);
        console.log(extension);
        let fileName = "regvehicle_"+file.fieldname + '_'+req.params._id+"."+extension;
        callback(null, fileName);
    }
});

let destVendorTransport = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(projectHome,"files","vendors",""));
    },
    filename: function (req, file, callback) {
        callback(null, "driver_"+file.fieldname + '_'+req.params._id)
    }
});


let destClient = multer.diskStorage({
    destination: function (req, file, callback) {
        //console.log("Was here 1");
        callback(null, path.join(projectHome,"files","clients"));
    },
    filename: function (req, file, callback) {
        //console.log("Was here 2");
        let extension = file.mimetype.substring(file.mimetype.indexOf("/")+1);
        console.log(extension);
        let fileName = file.fieldname + '_'+req.params._id+"."+extension;
        callback(null,fileName);
    }
});

let destUser = multer.diskStorage({
    destination: function (req, file, callback) {
        //console.log("Was here 1");
        callback(null, path.join(projectHome,"files","users"));
    },
    filename: function (req, file, callback) {
        //console.log("Was here 2");
        let extension = file.mimetype.substring(file.mimetype.indexOf("/")+1);
        console.log(extension);
        let fileName = "user_"+file.fieldname + '_'+req.params._id+"."+extension;
        callback(null,fileName);
    }
});

let destCustomer = multer.diskStorage({
	destination: function (req, file, callback) {
		//console.log("Was here 1");
		callback(null, path.join(projectHome,"files","customers"));
	},
	filename: function (req, file, callback) {
		//console.log("Was here 2");
		let extension = file.mimetype.substring(file.mimetype.indexOf("/")+1);
		console.log(extension);
		let fileName = "customer_"+file.fieldname + '_'+req.params._id+"."+extension;
		callback(null,fileName);
	}
});

let uploadDriver = multer(
    {
        storage: destDriver,
        limits: {
            files: 4
        },
        fileFilter: function (req, file, cb) {
            console.log("was here in file filter");
            let doc_mimes = "image/jpg image/jpeg image/bmp image/png application/pdf";
            let allowedMimes = doc_mimes.split(" ");
            if (allowedMimes.indexOf(file.mimetype) < 0) {
                return cb("File type provided for "+file.fieldname +" is not supported",false);
            }else {
                cb(null, true);
            }
        }
    }).any();

let uploadRegVehicle = multer(
    {
        storage: destRegVehicle,
        limits: {
            files: 4
        },
        fileFilter: function (req, file, cb) {
            let doc_mimes = "image/jpg image/jpeg image/bmp image/png application/pdf";
            let allowedMimes = doc_mimes.split(" ");
            if (allowedMimes.indexOf(file.mimetype) < 0) {
                return cb("File type provided for "+file.fieldname +" is not supported",false);
            }else {
                cb(null, true);
            }
        }
    }).any();

let uploadClient = multer(
    {
        storage: destClient,
        limits: {
            files: 4
        },
        fileFilter: function (req, file, cb) {
            console.log("was here in file filter");
            let doc_mimes = "image/jpg image/jpeg image/bmp image/png application/pdf";
            let allowedMimes = doc_mimes.split(" ");
            if (allowedMimes.indexOf(file.mimetype) < 0) {
                return cb("File type provided for "+file.fieldname +" is not supported",false);
            }else {
                cb(null, true);
            }
        }
    }).any();

let uploadUser = multer(
    {
        storage: destUser,
        limits: {
            files: 4
        },
        fileFilter: function (req, file, cb) {
            console.log("was here in file filter");
            let doc_mimes = "image/jpg image/jpeg image/bmp image/png application/pdf";
            let allowedMimes = doc_mimes.split(" ");
            if (allowedMimes.indexOf(file.mimetype) < 0) {
                return cb("File type provided for "+file.fieldname +" is not supported",false);
            }else {
                cb(null, true);
            }
        }
    }).any();

let uploadCustomer = multer(
	{
		storage: destCustomer,
		limits: {
			files: 4
		},
		fileFilter: function (req, file, cb) {
			console.log("was here in file filter");
			let doc_mimes = "image/jpg image/jpeg image/bmp image/png application/pdf";
			let allowedMimes = doc_mimes.split(" ");
			if (allowedMimes.indexOf(file.mimetype) < 0) {
				return cb("File type provided for "+file.fieldname +" is not supported",false);
			}else {
				cb(null, true);
			}
		}
	}).any();

router.post('/driver/:_id',
    function (req, res,next) {
        DriverService.findDriverIdAsync(req.params._id)
            .then(function(driver){
                if (driver && driver[0]){
                    return next();
                }else{
                    return res.status(200).json({"status":"ERROR","message":"Driver does not exist"});
                }
            }).catch(next);
    },
    function (req,res,next){
        uploadDriver(req, res, function (err) {
            if (err) {
                return res.status(500).json({"status":"ERROR","error_message":err});
            }
            console.log("req.files after file uplaod" + JSON.stringify(req.files));
            let updateBody = {};
            for (let j= 0;j<req.files.length;j++) {
                console.log("was here");
                if (req.files[j].fieldname === "photo")
                    updateBody.photo = req.files[j].filename;
                else if (req.files[j].fieldname === "address_proof_front_copy")
                    updateBody.address_proof_front_copy = req.files[j].filename;
                else if (req.files[j].fieldname === "address_proof_back_copy")
                    updateBody.address_proof_back_copy = req.files[j].filename;
                else if (req.files[j].fieldname === "license_front_copy")
                    updateBody.license_front_copy = req.files[j].filename;
                else if (req.files[j].fieldname === "license_back_copy")
                    updateBody.license_back_copy = req.files[j].filename;
            }
            console.log("update body " +JSON.stringify(updateBody));
            DriverService.updateDriverIdAsync(req.params._id,updateBody)
                .then(function (updated) {
                    return res.status(200).json({"status":"OK","message":"Driver documents have been uploaded successfully"});
                }).catch(next);
        })
    }
);

router.post('/regvehicle/:_id',
    function (req, res, next) {
        RegisteredVehicleService.findRegisteredVehicleIdAsync(req.params._id)
            .then(function(registeredVehicle){
                if (registeredVehicle && registeredVehicle[0]){
                    return next();
                }else{
                    return res.status(200).json({"status":"ERROR","message":"Registered vehicle does not exist"});
                }
            }).catch(next);
    },
    function (req, res, next) {
        uploadRegVehicle(req, res, function (err) {
            if (err) {
                return res.status(500).json({"status":"ERROR","error_message":err});
            }
            let updateBody = {};
            console.log("req.files after file uplaod" + JSON.stringify(req.files));
            for (let j= 0;j<req.files.length;j++) {
                console.log("was here");
                if (req.files[j].fieldname === "permit_front_copy")
                    updateBody.permit_front_copy = req.files[j].filename;
                if (req.files[j].fieldname === "permit_back_copy")
                    updateBody.permit_back_copy = req.files[j].filename;
                if (req.files[j].fieldname === "fitness_cert_front_copy")
                    updateBody.fitness_cert_front_copy = req.files[j].filename;
                if (req.files[j].fieldname === "fitness_cert_back_copy")
                    updateBody.fitness_cert_back_copy = req.files[j].filename;
                if (req.files[j].fieldname === "emission_cert_front_copy")
                    updateBody.emission_cert_front_copy = req.files[j].filename;
                if (req.files[j].fieldname === "emission_cert_back_copy")
                    updateBody.emission_cert_back_copy = req.files[j].filename;
                if (req.files[j].fieldname === "insurance_doc_front_copy")
                    updateBody.insurance_doc_front_copy = req.files[j].filename;
                if (req.files[j].fieldname === "insurance_doc_back_copy")
                    updateBody.insurance_doc_back_copy = req.files[j].filename;
                if (req.files[j].fieldname === "road_tax_doc_front_copy")
                    updateBody.road_tax_doc_front_copy = req.files[j].filename;
                if (req.files[j].fieldname === "road_tax_doc_back_copy")
                    updateBody.road_tax_doc_back_copy = req.files[j].filename;
                if (req.files[j].fieldname === "rc_boOK_front_copy")
                    updateBody.rc_boOK_front_copy = req.files[j].filename;
                if (req.files[j].fieldname === "rc_boOK_back_copy")
                    updateBody.rc_boOK_back_copy = req.files[j].filename;
            }
            console.log("update body " +JSON.stringify(updateBody));

            RegisteredVehicleService.updateRegisteredVehicleAsync(req.params._id,updateBody)
                .then(function (updated) {
                    return res.status(200).json({"status":"OK","message":"Registered vehicle documents have been" +
                    " uploaded successfully"});
                }).catch(next);
        })
    }
);

router.post('/client/:_id',
    function (req, res,next) {
        ClientService.findClientByIdAsync(req.params._id)
            .then(function(client){
                if (client){
                    return next();
                }else{
                    return res.status(200).json({"status":"ERROR","message":"Client does not exist"});
                }
            }).catch(next);
    },
    function (req,res,next){
        uploadClient(req, res, function (err) {
            if (err) {
                return res.status(500).json({"status":"ERROR","error_message":err});
            }
            console.log("req.files after file uplaod" + JSON.stringify(req.files));
            let updateBody = {};
            for (let j= 0;j<req.files.length;j++) {
                console.log("was here");
                if (req.files[j].fieldname === "client_logo")
                    updateBody.client_logo = req.files[j].filename;
                else if (req.files[j].fieldname === "client_favicon")
                    updateBody.client_favicon = req.files[j].filename;
                else if (req.files[j].fieldname === "client_billing_doc")
                    updateBody.client_billing_doc = req.files[j].filename;
                else if (req.files[j].fieldname === "client_tin_doc")
                    updateBody.client_tin_doc = req.files[j].filename;
                else if (req.files[j].fieldname === "client_pan_doc")
                    updateBody.client_pan_doc = req.files[j].filename;
            }
            console.log("update body " +JSON.stringify(updateBody));

            ClientService.updateClientIdAsync(req.params._id,updateBody)
                .then(function (updated) {
                    return res.status(200).json({"status":"OK",
                        "message":"Client documents have been uploaded successfully","data":updated});
                }).catch(next);
        })
    }
);

router.post('/user/:_id',
    function (req, res,next) {
        UserService.findUserAsync(req.params._id)
            .then(function(user){
                if (user){
                    return next();
                }else{
                    return res.status(200).json({"status":"ERROR","message":"User does not exist"});
                }
            }).catch(next);
    },
    function (req,res,next){
        uploadUser(req, res, function (err) {
            if (err) {
                return res.status(500).json({"status":"ERROR","error_message":err});
            }
            console.log("req.files after file uplaod" + JSON.stringify(req.files));
            let updateBody = {};
            for (let j= 0;j<req.files.length;j++) {
                console.log("was here");
                if (req.files[j].fieldname === "previous_comp_salary_slip")
                    updateBody.previous_comp_salary_slip = req.files[j].filename;
                else if (req.files[j].fieldname === "id_proof")
                    updateBody.id_proof = req.files[j].filename;
                else if (req.files[j].fieldname === "pf_account")
                    updateBody.pf_account = req.files[j].filename;
                else if (req.files[j].fieldname === "pan_proof")
                    updateBody.pan_proof = req.files[j].filename;
                else if (req.files[j].fieldname === "dob_proof")
                    updateBody.dob_proof = req.files[j].filename;
                else if (req.files[j].fieldname === "educational_proof")
                    updateBody.educational_proof = req.files[j].filename;
            }
            console.log("update body " +JSON.stringify(updateBody));

            UserService.updateUserAsync(req.params._id,updateBody)
                .then(function (updated) {
                    return res.status(200).json({"status":"OK",
                        "message":"Client documents have been uploaded successfully","data":updated});
                }).catch(next);
        })
    }
);

router.post('/vendor/transport/:id', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            // An error occurred when uploading
            return
        }

        // Everything went fine
    })
});


router.post('/vendor/fuel/:id', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            // An error occurred when uploading
            return
        }

        // Everything went fine
    })
});


router.post('/vendor/maintenace/:id', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            // An error occurred when uploading
            return
        }

        // Everything went fine
    })
});


router.post('/vendor/courier/:id', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            // An error occurred when uploading
            return
        }

        // Everything went fine
    })
});

module.exports = router;
