let Promise = require('bluebird');
let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let JWTStrategy = require('passport-jwt').Strategy;
let jwt = require('jwt-simple');
let url = require('url');
let accessControl = require(projectHome+'/accessControl');
let adminRoles = require(projectHome+'/adminRoles');
const winston = require('winston');

let clientService = Promise.promisifyAll(commonUtil.getService('client'));
let accessControlService = Promise.promisifyAll(commonUtil.getService('accessControl'));
let userService = Promise.promisifyAll(commonUtil.getService('user'));
let RoleService = Promise.promisifyAll(commonUtil.getService('roles'));
let ClientConfig = Promise.promisifyAll(commonUtil.getModel('clientConfig'));
const loginLogger = new (winston.Logger)({
	level: 'error',
	exitOnError: false,
	exceptionHandlers: [
		new winston.transports.File({ filename: projectHome + '/loginSessionError.log', json: true})
	],
	transports: [
		new winston.transports.File({ filename: projectHome + '/loginSessionError.log', json: true})
	]
});

module.exports.localSetup = function() {
    passport.use(
        new LocalStrategy({ 'usernameField': 'userId', 'passwordField': 'password' },
            userService.verifyUser
        )
    );
};

module.exports.jwtSetup = function() {
    passport.use(
        new JWTStrategy({ 'secretOrKey': commonUtil.getConfig('app_secret') },
            function(jwt_payload, done) {
                logger.info("JWT payload decoded");
                userService.findUserAsync(jwt_payload['_id'])
                    .then(
                        function(user) {
                            logger.info("Passed JWT");
                            if (user === null) return done(null, user, { 'status': 'ERROR', 'error_message': "Could not find user" });
                            done(null, user);
                        }
                    )
                    .catch(
                        function(err) {
                            return done(err, false, { 'status': 'ERROR', 'error_message': "Could not find user" });
                        }
                    );
            }
        )
    );
};

/***to crosscheck role data with allowed accesses.Permission names are read,add,edit,remove ***/
/*function checkRouteAccess(req) {
    let roleData = req.loginuser_role_data;
    let reqMethod = req.method;
    let reqURL = req.url;
    let permissionName = "";
    switch (reqMethod) {
        case "POST":
            permissionName = "add";
            break;
        case "PUT":
            permissionName = "edit";
            break;
        case "DELETE":
            permissionName = "remove";
            break;
        case "GET":
            permissionName = "read";
            break;
    }

    let routeAccessAllowed = envProduction;
    let restrictedApis = Object.keys(constant.restrictedResourceRoutes);
    for (let i = 0; i < restrictedApis.size; i++) {
        let accessKeyName = constant.restrictedResourceRoutes[restrictedApis[i]];
        if (reqURL.includes(restrictedApis[i]) &&
            roleData.hasOwnProperty(accessKeyName) && roleData[accessKeyName].indexOf(permissionName) > -1) {
            routeAccessAllowed = true;
            break;
        }
    }
    return routeAccessAllowed;

}*/

/*function findResourcesAllowedToRole(req, callback) {
    let query = {};
    if (req.user.clientAdmin) {
        query = { role: req.user.role, department: req.user.department, clientId: config.super_admin_id }
    } else {
        query = { role: req.user.role, department: req.user.department, clientId: req.user.clientId }
    }
    RoleService.findRoleByQueryAsync(query)
        .then(function(role) {
            let allows = [];
            if (role && role[0]) {
                role_ = JSON.parse(JSON.stringify(role[0]));
                allows = role_.allows || [];
            } else {
                allows = [];
            }
            let loginuser_role_data = {};
            for (let i = 0; i < allows.length; i++) {
                loginuser_role_data[allows[i]["key"]] = allows[i]["perms"];
            }
            req.loginuser_role_data = loginuser_role_data;
            callback();
        });
}*/

/***DashboardDirty is global let ***/
/*function appendDashBoardDirtyFlagsBasisReqType(req) {
    switch (req.method) {
        case "POST":
            dashBoardClientDirty[req.user.clientId] = true;
            break;
        case "DELETE":
            dashBoardClientDirty[req.user.clientId] = true;
            break;
    }
}*/

/****Append client id, created by, updated by fields
 * to req.body for restricted routes***/
function appendAdditionalDataBasisReq(req) {
    switch (req.method) {
        case "POST":
            req.body.clientId = req.user.clientId;
            req.body.created_by= req.user._id;
            req.body.created_by_name = req.user.full_name;
            req.body.created_by_employee_code = req.user.userId;
			req.body.created_by_id = req.user._id;
			req.body.last_modified_by= req.user._id;
			req.body.last_modified_by_name = req.user.full_name;
            req.body.last_modified_employee_code = req.user.userId;
			req.body.last_modified_by_id = req.user._id;
			break;
        case "PUT":
            req.body.clientId = req.user.clientId;
			req.body.last_modified_by= req.user._id;
			req.body.last_modified_by_name = req.user.full_name;
            req.body.last_modified_employee_code = req.user.userId;
			req.body.last_modified_by_id = req.user._id;
			break;
    }
}

/***If an admin key is supplied instead of json token, append a key isAdminKeyOperation to request.
 Also append clientId to req.query from decoded user to filter only client specific results always ***/
module.exports.authenticateRoutes = function(req, res, next) {
	if(accessControl.validateRoute(req.baseUrl, url.parse(req.url).pathname, req.access)){
		return next();
	}
	else {
		return res.status(500).json({
			"status": "ERROR",
			"message": "You do not have access to this resource. Contact your administrator"
		});
	}
};

module.exports.authenticateUser = function(req,res,next){
	if (req.body.adminKey) {
		if (otherUtil.validateAdminKey(req.body.adminKey)) {
			console.log("User has a valid admin key");
			req.isAdminKeyOperation = true;
			return next();
		} else {
			return res.status(500).json({ "status": "ERROR", "message": "Wrong admin key used" });
		}
	} else {
		let token = req.headers['authorization'];
		if (token) {
			let decoded = jwt.decode(token, commonUtil.getConfig('app_secret'));
			userService.findUserByIdAsync(decoded._id)
				.then(async function(user) {
					//logger.info("Passed JWT:");
					if (!user) throw new Error('user not found');

					let validateKey = req.query.validate || req.body.validate || false;
					if(validateKey){
						if(validateKey == 'single') {
							if (decoded.rand_str != user[req._authTokenMatchKey]) {
								loginLogger.error(req);
								res.status(500).json({
									"status": "LOGGED_OUT",
									"message": "Session was logged out because of Security reason. Please login again."
								});
								throw new Error("Session was logged out because of Security reason. Please login again.");
							}
						}else if(validateKey == 'all') {
							if(decoded.rand_str != user.authWeb && decoded.rand_str != user.authAndroid && decoded.rand_str != user.authIOS){
								loginLogger.error(req);
								res.status(500).json({
									"status": "LOGGED_OUT",
									"message": "Session was logged out because of Security reason. Please login again."
								});
								throw new Error("Session was logged out because of Security reason. Please login again.");
							}
						}
					}

					req.decoded = decoded;
					req.user = JSON.parse(JSON.stringify(user));

					if(reqClientId = req.decoded.clientId){
						req.query.clientId = reqClientId;
						req.body.clientId = reqClientId;
						req.user.clientId = reqClientId;
					}
					else {
						req.query.clientId = user.clientId && user.clientId[0];
						req.body.clientId = user.clientId && user.clientId[0];
						req.user.clientId = user.clientId && user.clientId[0];
					}
					/*appendDashBoardDirtyFlagsBasisReqType(req);*/
					req.clientConfig = await ClientConfig.findOne({ "clientId": req.user.clientId });
					return clientService.findClientByQueryAsync({ "clientId": req.user.clientId });
				})
				.then(function(clientSearchData) {
					req.clientData = (clientSearchData && clientSearchData[0]) ? JSON.parse(JSON.stringify(clientSearchData[0])) : {};
					appendAdditionalDataBasisReq(req);
					if (req.user.userId === config.super_admin_id) {
						req.access = adminRoles;
						return next();
					} else {
						if(req.user.access){
							accessControlService.findAccessControlByIdAsync(req.user.access)
								.then(function (access) {
									access = JSON.parse(JSON.stringify(access));
									if(!access){
										return res.status(500).json({
											"status": "ERROR",
											"message": "This user don't have access to system!"
										});
									}
									req.access=access.role;
									return next();
								})
								.catch(function(err) {
									console.log(err);
									return res.status(500).json({ 'status': 'ERROR', 'message': "Could not find user" });
								});
						}
						else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "This user don't have access to system!"
							});
						}
					}
				})
				.catch((e) => {
					// console.error(e);
				});
		} else {
			return res.status(403).send({
				status: 'ERROR',
				message: 'No token provided.'
			});
		}
	}
};

module.exports.validateAdmin = function (req,res) {
	if(!req.user.clientAdmin && req.user.userId !== config.super_admin_id){
		return res.status(500).json({"status":"ERROR",
			"message":"Only admin is allowed to access this feature."});
	}
};
