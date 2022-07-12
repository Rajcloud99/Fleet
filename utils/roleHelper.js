/**
 * Created by bharath on 19/04/17.
 */
var roles;
roles = {
	"role": "all",
	"department": "All",
	"allows": [{"key": "masters", "perms": ["read"]}, {
		"key": "branch",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "transportVendor", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "driver",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "regvehicle", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "route",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "customer", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "grMaster",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "sendTripLoc", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "courierVendor",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "fuelVendor", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "sldo",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "booking", "perms": ["read"]}, {
		"key": "bookings",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "vehicleAllocation", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "trip",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "gr", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "pendingGr",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "diesel", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "grAcknowledge",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "billing", "perms": ["read"]}, {
		"key": "savePrintBill",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "generatedBills", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "tripExpense",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "billDispatch", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "customerPayment",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "vendorPayment", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "reports",
		"perms": ["read"]
	}, {"key": "billReport", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "costing",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "profit", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "trips",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "vehicles", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "others",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "masters_maintenance", "perms": ["read"]}, {
		"key": "partCategory",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "mechanic", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "maintenanceVendor_",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "taskMaster", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "spares",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "PrPo", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "POdetail",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "POrelease", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "inventory",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "toolMaster", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "otherExpenses",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "printSlips", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "maintenance_process",
		"perms": ["read"]
	}, {"key": "jobCard", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "masters_tyre_management",
		"perms": ["read"]
	}, {"key": "tyre_master", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "trailer_master",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {
		"key": "structure_master",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {
		"key": "prime_mover_trailer_association",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "user_management", "perms": ["read"]}, {
		"key": "department",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}, {"key": "role", "perms": ["read", "add", "edit", "approve", "remove"]}, {
		"key": "user",
		"perms": ["read", "add", "edit", "approve", "remove"]
	}]
};

var roleObj = {};
for (var i = 0; i < roles.allows.length; i++) {
	var role = roles.allows[i];
	roleObj[role.key] = role.perms;
}
