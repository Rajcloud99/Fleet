var roles={};

//* Note Please keep all api(s) and url(s) in lowercase() to avoid string compare issue ***/

roles['/api/users']={
	"url":{
		'/isavailable/*':[["User","Add"]],
		'/add':[["User","Add"]],
		'/get':[["Branch","Read"],["Vehicle Allocation","Allocate"],["User","Read"],["Job Cards","Contractor Exp"],
			["Job Cards","Services Add"],["Job Cards","Services Update"],["Inventory","Issue Spare"],
			["Tools","Tool Issue"],["Tools","Tools Return"],["Maintenance Diesel","In-Out"],
			["PR","Read"],["PR","Add"],["PR","Update"],["PR-PO","PR-PO"],["Tyre Master","Issue"],
			["Tyre Master","Return"],["Account Master","Add"],["Account Master","Update"],["Create GR","Read"],["Trip Expense","Deal Acknowledge"]],
		'/update/*':[["User","Update"]],
		'/delete/*':[["User","Delete"]],
		'/fetch_password_lms/*': [["User","Password"]]
	}
};
roles['/api/department']={
	"url":{
		"/add":[],
		"/get":[],
		"/get/trim":[["Branch","Read"],["User","Read"],["User","Add"],["User","Update"]],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/client']={
	"url":{
		"/add":[["Client","Admin"]],
		"/get":[["Client","Admin"]],
		"/getV2":[["Client","Admin"]],
		"/findbyid":[["GR","Print"],["Diesels","Print Diesel"],["Diesels","Print Undertaking"],["Pending GR","Print"],
			["Unbilled Gr","Generate Bill Unbilled"],["Generated Bills","Preview"],["Bill Dispatch","Preview"],
			["Job Cards","Services Update"],["Inventory","Read"],["Inventory","Inward"],
			["Tools","Read"],["Tools","Inward"],["PR","Read"],["PO Detail","Print"],
			["PO Release","Print"],["Tyre Master","Read"],["Retreated","Read"]],
		"/createbuilty":[["Pending GR","Print"]],
		"/grbuiltypdf":[],
		"/update/*":[["Client","Admin"]],
		"/delete/*":[["Client","Admin"]]
	}
};
roles['/api/material']={
	"url":{
		"/group/add":[],
		"/type/add":[],
		"/group/get":[],
		"/type/get":[],
		"/group/get/trim":[],
		"/type/get/trim":[],
		"/get":[["Bookings","Add"],["Bookings","Update"],["Create GR","Read"]],
		"/group/update/*":[],
		"/type/update/*":[],
		"/group/delete/*":[],
		"/type/delete/*":[],
		"/group/search":[],
		"/type/search":[]
	}
};
roles['/api/branch']={
	"url":{
		"/add":[["Branch","Add"]],
		"/get":[["Branch","Read"],["GR Master","Read"],["GR Master","Add"],["GR Master","Update"],["Bookings","Read"],["User","Read"],
			["Bookings","Add"],["Bookings","Update"],["GR Acknowledge","Acknowledge"],["Bill Dispatch","Dispatch"],
			["Job Cards","Add"],["Job Cards","Update"],["Inventory","Issue Spare"],["GR Acknowledge","Read"],["Trip Expense","Deal Acknowledge"]],
		"/get/trim":[["Maintenance Vendor","Read"],["Tyre Master","Issue"],["Account Masters","Update"]],
		"/get/maintenance":[],
		"/update/*":[["Branch","Update"]],
		"/enabledisable/*":[["Branch","Update"]],
		"/delete/*":[["Branch","Delete"]]
	}
};
roles['/api/driver']={
	"url":{
		"/add":[["Driver","Add"]],
		"/get":[["Driver","Read"],["Registered Vehicle","Read"],["Vehicle Allocation","Allocate"],["Trip","Trip Update"],
			["Vehicle Report","Read"],["Tools","Tool Issue"],["Tools","Tools Return"],
			["Tyre Master","Issue"]],
		"/get/trim":[["GR Acknowledge","Acknowledge"],["Bill Dispatch","Dispatch"],["Tyre Master","Return"],["GR Acknowledge","Read"]],
		"/update/*":[["Driver","Update"]],
		"/delete/*":[["Driver","Delete"]],
		"/current_trip/get/":[],
		"/getreport":[],
		"/addhappay/*":[["Driver","Add Happay"]],
		"/driverexcel":[["Driver","Read"]],
		"/upload":[["Driver","Read"]]
	}
};
roles['/api/vehicle']={
	"url":{
		"/group/add":[],
		"/type/add":[],
		"/group/get":[],
		"/type/get":[["Transport Route","Add"],["Transport Route","Update"],["Rates","Read"],["Vehicle Allocation","Allocate"],
		["Contract","Read"]],
		"/group/get/trim":[],
		"/type/get/trim":[["Bookings","Update"],["Bookings","Add"]],
		"/get":[["Registered Vehicle","Read"],["Vehicle Allocation","Allocate"],["All Vendor","Read"],["Bookings","Update"],["Create GR","Read"]],
		"/get/owned":[],
		"/group/update/*":[],
		"/type/update/*":[],
		"/group/delete/*":[],
		"/type/delete/*":[],
		"/group/search":[],
		"/type/search":[],
		"/type/updatemulti": [["Client", "Admin"]]
	}
};
roles['/api/upload']={
	"url":{
		'/driver/*':[],
		'/regvehicle/*':[],
		'/client/*':[],
		'/user/*':[],
		'/vendor/transport/:id':[],
		'/vendor/fuel/:id':[],
		'/vendor/maintenace/:id':[],
		'/vendor/courier/:id':[]
	}
};
roles['/api/download']={
	"url":{
		'/*':[],
		'/drivers/*':[]
	}
};
roles['/api/regvehicle']={
	"url":{
		"/add":[["Registered Vehicle","Read"]],
		"/addrates/*":[["Registered Vehicle","Add Rates"]],
		"/addfasttag/*":[["Registered Vehicle","Add Fasttag"]],
		"/get":[["Registered Vehicle","Read"],["Vehicle Allocation","Allocate"],["Expenses","Read"],
			["Job Cards","Add"],["Job Cards","Update"],["Job Cards","Close"],["Tools","Tool Issue"],
			["Maintenance Diesel","In-Out"],["Tyre Master","Issue"],["Prime mover trailer association","Read"],["Initial Profit Report","Read"],
			["GR Acknowledge","Read"],["Diesels","Read"],["GR","Read"],["GPS Reports","Read"]],
		"/vehicles-for-allocation":[["Registered Vehicle","Read"],["Vehicle Allocation","Allocate"],["Expenses","Read"],
      ["Job Cards","Add"],["Job Cards","Update"],["Job Cards","Close"],["Tools","Tool Issue"],
      ["Maintenance Diesel","In-Out"],["Tyre Master","Issue"],["Prime mover trailer association","Read"],["Initial Profit Report","Read"],
        ["GR Acknowledge","Read"],["Diesels","Read"],["GR","Read"]],
		"/get/trim":[["Registered Vehicle","Read"],["Trip Expense","Read"],["Unbilled Report","Read"],["Costing Report","Read"],
			["Profit Report","Read"],["Trip Report","Read"],["Combined Expense","Report"],
			["Job Cards","Read"]],
		"/updateRegVehicle/":[["Registered Vehicle","Update"]],
		"/update/*":[["Registered Vehicle","Update"]],
		"/delete/*":[["Registered Vehicle","Update"]],
		"/report":[["Vehicle Report","Read"]],
		"/vehicleexcel":[["Registered Vehicle","Read"]],
		"/vehiclecheck":[["Registered Vehicle","Read"]],
		"/associate_segment":[["Registered Vehicle","Associate Segment"]]
	}
};
roles['/api/vendor/transport']={
	"url":{
		"/add":[["All Vendor","Add"]],
		"/get":[["All Vendor","Read"],["All Vendor","Trim Read"],["Registered Vehicle","Read"],["Vehicle Allocation","Allocate"],["Diesels","Read"]
			["Customer Payment","Read"],["Vendor Payment","Read"],["Costing Report","Read"],["Trip Expense","Read"],["GR","Read"]],
		"/id":[],
		"/get/trim":[["Registered Vehicle","Read"]],
		"/update/*":[["All Vendor","Update"]],
		"/delete/*":[["All Vendor","Delete"]],
		"/reg_on_the_go/*":[["Vehicle Allocation","Allocate"]]
	}
};
roles['/api/vendor/fuel']={
	"url":{
		"/add":[["Fuel Vendor","Add Vendor"]],
		"/get":[["Fuel Vendor","Read"],["Diesels","Add"],["Maintenance Diesel","In-Out"],["GR Acknowledge","Read"],["Diesels","Add"]],
		"/update/*":[["Fuel Vendor","Update Vendor"]],
		"/delete/*":[]
	}
};
roles['/api/fuel_station']={
	"url":{
		"/add":[["Fuel Vendor","Add Station"]],
		"/get":[["Fuel Vendor","Read"]],
		"/update/*":[["Fuel Vendor","Update Station"]],
		"/delete/*":[["Fuel Vendor","Update Station"]]
	}
};
roles['/api/vendor/maintenance']={
	"url":{
		"/add":[],
		"/get":[],
		"/get/trim":[],
		"/one/*":[],
		"/update/*":[],
		"/delete/*":[]
	}
};


roles['/api/vendor/courier']={
	"url":{
		"/add":[["Courier Vendor","Add Vendor"]],
		"/get":[["Courier Vendor","Read"],["GR Acknowledge","Acknowledge"],["Bill Dispatch","Dispatch"],["GR Acknowledge","Read"]],
		"/update/*":[["Courier Vendor","Update Vendor"]],
		"/delete/*":[]
	}
};
roles['/api/courier_office']={
	"url":{
		"/add":[["Courier Vendor","Add Office"]],
		"/get":[["Courier Vendor","Read"],["Bill Dispatch","Dispatch"]],
		"/update/*":[["Courier Vendor","Update Office"]],
		"/delete/*":[]
	}
};
roles['/api/transportroute']={
	"url":{
		"/add":[["Transport Route","Add"]],
		"/get":[["Transport Route","Read"],["All Vendor","Read"],["Rates","Read"],["Bookings","Update"],["Vehicle Allocation","Read"],
			["Trip","Change Route"],["Unbilled Gr","Read"],["Generated Bills","Read"],["Bill Dispatch","Read"],
			["Trip Expense","Read"],["Unbilled Report","Read"],["Costing Report","Read"],["Profit Report","Read"],
			["Trip Report","Read"],["Profit Report - GR","Read"],["Create GR","Read"],["Diesels","Read"]],
		"/get/trim":[],
		"/update/*":[["Transport Route","Update"]],
		"/delete/*":[],
		"/routesexcel":[["Transport Route","Read"]]
	}
};
roles['/api/customer']={
	"url":{
		"/add":[["Customer","Add"]],
		"/get":[["Customer","Read"],["Trip Location","Read"],["Trip Location","Add"],["Bookings","Add"],["Bookings","Update"],["Vehicle Allocation","Allocate"],
			["GR","Update"],["GR","Print"],["Pending GR","Read"],["Pending GR","Print"],["Unbilled Gr","Generate Bill Unbilled"],
			["Unbilled Gr","Read"],["Generated Bills","Read"],["Bill Dispatch","Read"],["Trip Expense","Read"],
			["Customer Payment","Read"],["Vendor Payment","Read"],["Unbilled Report","Read"],["Bill Register","Read"],
			["Costing Report","Read"],["Profit Report","Read"],["Trip Report","Read"],["Rates","Read"],["Bill Settlement","Read"],["Create GR","Read"],["GR","Read"]],
		"/getcust":[],
		"/get/trim":[["Customer","Read"],["Bookings","Add"],["Bookings","Update"],["Unbilled Gr","Update"],
			["Unbilled Gr","Generate Bill Unbilled"],["Create GR","Read"]],
		"/update/*":[["Customer","Update"],["Contract","Update"]],
		"/delete/*":[],
		"/register_user_gpsgaadi":[["Customer","GpsGaadi Access"]],
		"/change_password_gpsgaadi":[["Customer","GpsGaadi Access"]],
		"/forgot_password_gpsgaadi":[["Customer","GpsGaadi Access"]],
		"/user_id_availability_gpsgaadi":[["Customer","GpsGaadi Access"]],
		"/update_user_gpsgaadi":[["Customer","GpsGaadi Access"]],
		"/check_password_gpsgaadi":[["Customer","GpsGaadi Access"]]
	}
};
roles['/api/contract']={
	"url":{
		"/renew":[["Contract","Clone"]],
		"/add":[["Contract","Add"]],
		"/get":[["Contract","Read"],["Rates","Read"],["Bookings","Add"],["Bookings","Update"],["Create GR","Read"]],
		"/get/trim":[],
		"/update/*":[["Contract","Update"]],
		"/delete/*":[],
		"/customer/*":[],
		"/:contract__id/transportroute/assign":[],   // todo: resolve the issue
		"/:contract__id/transportroute/get":[]   // todo: resolve the issue
	}
};
roles['/api/routedata']={
	"url":{
		"/latest_rate":[["Vehicle Allocation","Allocate"]],
		"/add":[["Rates","Add"]],
		"/addroutetracking":[["Transport Route","Add"]],
		"/editroutetracking/*":[["Transport Route","Add"]],
		"/gettracking":[["Transport Route","Add"]],
		"/get":[["Rates","Read"],["Bookings","Add"]],
		"/update/*":[["Rates","Update"]],
		"/delete/*":[]
	}
};
roles['/api/shippingline']={
	"url":{
		"/add":[["SLDO","Add"]],
		"/get":[["SLDO","Read"],["Bookings","Add"],["Bookings","Update"]],
		"/get/trim":[],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/fleet']={
	"url":{
		"/add":[["Fleet","Add"]],
		"/get":[["Fleet","Read"],["Registered Vehicle","Read"]],
		"/update/*":[["Fleet","Update"]],
		"/delete/*":[["Fleet","Delete"]]
	}
};
roles['/api/icd']={
	"url":{
		"/add":[],
		"/get":[],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/bookings']={
	"url":{
		"/add":[["Bookings","Add"]],
		"/get":[["Bookings","Read"],["Unbilled Gr","Read"],["Generated Bills","Read"],
			["Bill Dispatch","Read"],["Vehicle Allocation","Allocate"]],
		"/items":[["Vehicle Allocation","Read"],["Vehicle Allocation","Allocate"]],
		"/get/trim":[],
		"/update/*":[["Bookings","Update"],["Bookings","Upload"]],
		"/approveupdate/*":[],
		"/get/getreport":[],
		"/creategr":[["Bookings","Add"]],
    "/addgr":[]
	}
};
roles['/api/trips']={
	"url":{
		"/add":[],
		"/get":[["Trip","Read"],["Diesels","Read"],["Trip Advance","Read"]],
		"/gr":[["GR","Read"]],
		"/gr_ack":[["GR Acknowledge","Read"]],
		"/gr/pending_ack":[["Pending GR","Read"]],
		"/get/trim":[],
		"/update/*":[["Trip","Trip Update"],["Diesels","Add"]],
		"/gr/*":[["GR","Add"]],
		"/gr_location/update/*":[["Trip","Change Route"],["Trip","Trip Update"],["Trip","Trip Cancel"]],
		"/trip_location/update/*":[["Trip","Create Geofence"]],
		"/gr_update/update/*":[["GR","Update"]],
		"/gr_ack/*":[["Pending GR","Add Remark"]],
		"/allocatevehicle":[["Vehicle Allocation","Allocate"]],
		"/deallocatevehicle":[],
		"/report":[["Trip Report","Read"],["Others","Trips"]],
		"/report_fleet_owner":[["Vehicle Report","Read"],["Fleet Owner Report","Read"]],
		"/vendoracknowledge":[["Trip Expense","Deal Acknowledge"]],
		"/approveadvance": [["Trip Advance", "Approve"]],
		"/addadvance": [["Trip Advance", "Add"]]
	}
};
roles['/api/cities']={
	"url":{
		'/*':[]
	}
};
roles['/api/bills']={
	"url":{
		'/driver':[["Diesels","Print Undertaking"]],
		'/builty':[["GR","Print"],["Pending GR","Print"]],
		'/diesel':[["Diesels","Print Diesel"]],
		'/invoice':[["Generated Bills","Preview"],["Bill Dispatch","Preview"]],
		'/inv_inward':[["Inventory","Inward"]],
		'/tool_inv_inward':[["Tools","Inward"]],
		'/tyre_inv_inward':[["Tyre Master","Inward"]],
		'/jcd_pdf':[["Job Cards","Jcd"]],
		'/po':[["PO Detail","Print"],["PO Release","Print"]],
		'/issueslip':[["Inventory","Issue Spare"],["Inventory","Return Spare"],["Spare Slips","Download"]],
		'/dieselslip':[["Maintenance Diesel","Slip"]],
		'/tyreissueslip':[],
		'/tyreretreadissueslip':[["Retreated","Read"]],
		'/prslip':[["PR","PR Download"]],
		'/serviceslip':[],
		'/poquote':[],
		'/add':[["Unbilled Gr","Read"],["Unbilled Gr","Generate Bill Unbilled"]],
		'/get':[["Generated Bills","Read"],["Bill Dispatch","Read"],["Bill Acknowledge","Read"],["Bill Settlement","Read"]],
		'/update':[["Generated Bills","Read"],["Bill Acknowledge","Read"]],
		'/cancelBill':[["Generated Bills","Read"],["Bill Dispatch","Read"]],
		'/approveBill':[["Generated Bills","Read"]],
		'/amendBill':[["Bill Settlement","Read"],["Bill Settlement","Credit Debit"]],
		'/bill_settle':[["Bill Settlement","Settle"]]
	}
};
roles['/api/gr']={
	"url":{
		"/add":[["GR Master","Add"]],
		"/get":[["GR Master","Read"]],
		"/update/*":[["GR Master","Update"]],
		"/generate_gr":[["GR","Generate Gr"]]
	}
};
roles['/api/grstatus']={
	"url":{
		"/get":[["GR Master","Read"]],
		"/freegr/*":[["GR Master","Free GR"]],
		"/update/*":[]
	}
};
roles['/api/triplocation']={
	"url":{
		"/add":[["Trip Location","Add"]],
		"/get":[["Trip Location","Read"],["Bookings","Add"],["Bookings","Update"]],
		"/update/*":[["Trip Location","Update"]]
	}
};
roles['/api/vendorroute']={
	"url":{
		"/add":[["All Vendor","Update"]],
		"/get":[["All Vendor","Read"]],
		"/get/trim":[],
		"/get/search":[],
		"/get/vendors_route":[["Vehicle Allocation","Read"]],
		"/update/*":[["All Vendor","Update"]],
		"/delete/*":[]
	}
};
roles['/api/invoice']={
	"url":{
		"/get":[["Unbilled Gr","Read"],["Others","Bill-Trip Wise"]],
		"/update":[],
		"/getbilled":[],
		"/generatebill":[["Unbilled Gr","Generate Bill Unbilled"]],
		"/getbill":[["Generated Bills","Read"],["Generated Bills","Preview"],["Bill Dispatch","Read"]],
		"/getbill/detail":[["Bill Dispatch","Preview"]],
		"/update/*":[["Unbilled Gr","Update"]],
		"/update/bill/*":[["Generated Bills","Approve"],["Bill Dispatch","Dispatch"]],
		"/customer_pay_get":[["Customer Payment","Read"]],
		"/customer_pay_update/*":[["GR Acknowledge","Customer Payment"],["Customer Payment","Update Payment"]],
		"/update_trip_invoice_expense/*":[["GR Acknowledge","Acknowledge"]],
		"/resetbill/*":[["Generated Bills","Reset Bill"],["Bill Dispatch","Reset Bill"]]
	}
};
roles['/api/trip_expenses']={
	"url":{
		"/getbytrip/*":[["Trip Expense","Read"],["Diesels","Add"],["GR Acknowledge","Read"],["Diesels","Print Diesel"],
			["Diesels","Add"]],
		"/addexpense":[["Trip Expense","Add Expenses"],["Diesels","Add"],["Trip Expense","Deduct TDS"]],
		"/getaggregated":[["Trip Expense","Read"],["Costing Report","Read"]],
		"/vendorreconciliation":[["Trip Expense","Read"]]
	}
};
roles['/api/departmentbranch']={
	"url":{
		"/add":[["Branch","Read"]],
		"/get":[["Branch","Read"]],
		"/update/*":[["Branch","Read"]],
		"/delete/*":[["Branch","Read"]]
	}
};
roles['/api/userpref']={
	"url":{
		"/add":[],
		"/get":[],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/reports']={
	"url":{
		"/profitability":[["Initial Profit Report"]],
		"/profitability/gr":[["Profit Report - GR","Read"]],
		"/profitability/post/get":[["Profit Report","Read"],["Others","Profitablity"]],
		"/profitability/pre/get":[],
		"/vehicle":[["Registered Vehicle","Report"]],
		"/customer":[["Customer","Download Report"]],
		"/gr":[["GR","Report"]],
		"/pending_gr":[],
		"/inventory":[["Inventory","Report"],["Aggregated Inventory","Read"]],
		"/spareinward":[["Spare Inventory Inward","Report"]],
		"/jobcard/aggregate":[["Job Card","Report"]],
		"/spareissue/aggregate":[["Spare Consumption","Report"]],
		"/tool/aggregate":[["Tool","Report"]],
		"/toolissue/aggregate":[["Tool Issue","Report"]],
		"/tyreissue/aggregate":[["Tyre Issue","Report"]],
		"/tyreissue/summary":[["Tyre Issue","Report"]],
		"/contractor":[],
		"/jobcard":[["Job Cards","Report"]],
		"/tyre":[["Tyre Master","Report"]],
		"/tyre/aggregate":[["Tyre","Report"]],
		"/tyre/summary":[["Tyre","Report"]],
		"/po/aggregate":[],
		"/tyreretread/aggregate":[["Tyre Retreat","Report"]],
		"/pmtassoc/aggregate":[["Prime Trailer association","Report"]],
		"/mtask/aggregate":[["Job Card Task","Report"]],
		"/contractor-expense/aggregate":[["Contractor Expense","Report"]],
		"/otherexpense/aggregate":[["Expense Report","Report"]],
		"/customerreach/aggregate":[],
		"/combinedexpense":[["Combined Expense","Report"]],
		"/tool":[["Tools","Report"]],
		"/trip":[],
		"/idletimereport":[["Trip Report","Read"]],
		"/po":[["PO Detail","Report"],["PO Release","Report"]],
		"/booking":[["Bookings","Download"],["Booking Report","Read"]],
		"/invoice":[["Billing Report","Read"]],
		"/generated_bills":[["Bill Register","Read"]],
		"/maintenance_expenses":[],
		"/unbilled_invoice":[["Unbilled Report","Read"]],
		"/incomplete_trip":[["Unbilled Report","Read"]],
		"/quotation":[["Quotation Report","Read"]],
		"/so":[["SO Report","Read"]],
		"/soInvoice":[["Invoice Report (SO)","Read"]],
		"/fuelVendor":[["Costing Report","Read"]],
		"/booking/aggregate":[["Booking Report","Read"]],
		"/gr/aggregate":[["GR Report","Read"]],
		"/bills/aggregate":[["Billing Report","Read"]],
		"/trip/aggregate":[["Trip Report","Read"]]
	}
};
roles['/api/sapxml']={
	"url":{
		"/customerxml":[],
		"/invoicexml":[],
		"/expensesxml":[]
	}
};
roles['/api/accesscontrol']={
	"url":{
		'/get':[],
		'/getall':[["User","Update"],["User","Add"],["Role","Read"]],
		'/update/*':[["Role","Update"]],
		'/remove/*':[["Role","Delete"]]
	}
};


/***************** maintenance module ***********************/
roles['/api/maintenance/manufacturer']={
	"url":{
		"/add":[],
		"/get":[],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/maintenance/partcategory']={
	"url":{
		"/add":[["Part Category","Add"]],
		"/get":[["Part Category","Read"],["Task Master","Read"],["Spares","Add"],
			["Spares","Update"]],
		"/update/*":[["Part Category","Update"]],
		"/delete/*":[["Part Category","Delete"]],
	}
};
roles['/api/maintenance/vendor']={
	"url":{
		"/add":[["Maintenance Vendor","Add"],["Maintenance Vendor","Read"]],
		"/get":[["Maintenance Vendor","Read"],["Inventory","Read"],["Aggregated Inventory","Read"],
			["Tools","Read"],["PR-PO","PR-PO"],["PO Detail","Read"],["PO Detail","Print"],
			["PO Detail","Approve"],["PO Release","Read"],["PO Release","Release"],
			["PO Release","Print"],["Tyre Master","Read"],["Retreated","Issue"],
			["Spare Inventory","Report"],["Spare Inventory Inward","Report"]],
		"/update/*":[["Maintenance Vendor","Update"]],
		"/delete/*":[["Maintenance Vendor","Delete"]]
	}
};
roles['/api/maintenance/parts']={
	"url":{
		"/add":[["Spares","Add"]],
		"/get":[["Spares","Read"],["Inventory","Read"],["Inventory","Issue Spare"],
			["Aggregated Inventory","Read"],["Tools","Read"],["Tools","Inward"],
			["PR","Add"],["PR","Update"],["Spare Inventory","Report"],
			["Spare Inventory Inward","Report"]],
		"/update/*":[["Spares","Update"]],
		"/delete/*":[["Spares","Delete"]]
	}
};
roles['/api/maintenance/mechanic']={
	"url":{
		"/add":[],
		"/get":[],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/maintenance/inventory']={
	"url":{
		"/add":[["Inventory","Inward"]],
		"/get":[["Inventory","Read"],["Aggregated Inventory","Read"],["PR","Add"],
			["Spare Inventory","Report"]],
		"/getqty":[["Inventory","Issue Spare"],["PR","Add"],["PR","Update"]],
		"/update/*":[],
		"/getpr":[["Inventory","Get Pr"]],
		"/delete/*":[],
		"/snapshot":[["Inventory Snapshot","Report"]],
		"/snapshot/getdates":[["Inventory Snapshot","Report"]]
	}
};
roles['/api/maintenance/tool']={
	"url":{
		"/add":[["Tools","Inward"]],
		"/get":[["Tools","Read"]],
		"/getqty":[],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/maintenance/toolissue']={
	"url":{
		"/issue":[["Tools","Tool Issue"]],
		"/get":[["Tools","History"],["Tools","Tools Return"]],
		"/return/*":[["Tools","Tools Return"]]
	}
};
roles['/api/maintenance/vehicle_model']={
	"url":{
		"/add":[],
		"/get":[["Spares","Add"],["Spares","Update"]],
		"/manufacturers/get":[],
		"/matrix/get":[["Registered Vehicle","Read"]],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/maintenance/taskmaster']={
	"url":{
		"/add":[["Task Master","Add"]],
		"/getsparesuggestion":[["Job Cards","Services Add"]],
		"/get":[["Task Master","Read"],["Job Cards","Services Add"],["Job Cards","Services Update"],
			["Retreated","Issue"]],
		"/update/*":[["Task Master","Update"]],
		"/delete/*":[["Task Master","Delete"]]
	}
};
roles['/api/maintenance/jobcard']={
	"url":{
		"/add":[["Job Cards","Add"]],
		"/get":[["Expenses","Add"],["Job Cards","Read"],["Inventory","Issue Spare"],
			["Inventory","Return Spare"],["Spare Slips","Read"],["Tyre Master","Issue"]],
		"/update/*":[["Job Cards","Update"],["Job Cards","Close"]],
		"/delete/*":[],
		"/jcd/*":[["Job Cards","Jcd"]]
	}
};
roles['/api/maintenance/task']={
	"url":{
		"/add":[["Job Cards","Services Add"]],
		"/get":[["Job Cards","Read"],["Job Cards","Contractor Exp"],["Inventory","Issue Spare"],
			["Tyre Master","Issue"]],
		"/update/*":[["Job Cards","Services Update"],["Job Cards","Services Close"]],
		"/delete/*":[]
	}
};
roles['/api/maintenance/pr']={
	"url":{
		"/add":[["Inventory","Get Pr"],["PR","Add"]],
		"/get":[["PR","Read"],["PR-PO","PR-PO"]],
		"/update/*":[["PR","Update"]],
		"/approve/*":[["PR","Approve"]],
		"/process/*":[["PR","Process"]],
		"/delete/*":[]
	}
};
roles['/api/maintenance/po']={
	"url":{
		"/add":[],
		"/new":[["PR-PO","PR-PO"]],
		"/get":[["Inventory","Read"],["Inventory","Inward"],["Aggregated Inventory","Read"],
			["Tools","Read"],["Tools","Inward"],["PR-PO","PR-PO"],["PO Detail","Read"],
			["PO Release","Read"]],
		"/pr-to-po/*":[["PR-PO","PR-PO"]],
		"/update/*":[["PO Detail","Approve"],["PO Release","Release"]]
	}
};
roles['/api/maintenance/spareuse']={
	"url":{
		"/add":[["Job Cards","Add"]],
		"/get":[["Inventory","Issue Spare"],["Tyre Master","Read"]],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/maintenance/spareissue']={
	"url":{
		"/add":[["Inventory","Issue Spare"],["Inventory","Return Spare"]],
		"/get":[["Job Cards","Read"],["Inventory","Return Spare"],["Spare Slips","Read"]],
		"/issue":[]
	}
};
roles['/api/maintenance/trailermaster']={
	"url":{
		"/add":[],
		"/get":[],
		"/update/*":[],
		"/delete/*":[]
	}
};
roles['/api/maintenance/structuremaster']={
	"url":{
		"/add":[["Structure Master","Add"]],
		"/get":[["Registered Vehicle","Read"],["Tyre Master","Read"],["Tyre Master","Issue"],
			["Structure Master","Read"]],
		"/delete/*":[["Structure Master","Delete"]]
	}
};
roles['/api/maintenance/primemovertrailerassociation']={
	"url":{
		"/add":[["Prime mover trailer association","Associate"]],
		"/get":[["Prime mover trailer association","Read"]],
		"/update/*":[["Prime mover trailer association","Dis-Associate"]],
		"/getasocveh":[["Tyre Master","Read"]]
	}
};
roles['/api/maintenance/otherexpenses']={
	"url":{
		"/add":[["Expenses","Add"]],
		"/get":[["Expenses","Read"]],
		"/update/*":[],
		"/approve/*":[]
	}
};
roles['/api/maintenance/tyremaster']={
	"url":{
		"/add":[["Tyre Master","Inward"]],
		"/get":[["Tyre Master","Read"],["Tyre Master","Issue"],["Retreated","Read"]],
		"/update/*":[["Tyre Master","Move to Scrap"],["Tyre Master","Move to Stock"]],
		"/delete/*":[]
	}
};
roles['/api/maintenance/tyreissue']={
	"url":{
		"/issue":[["Tyre Master","Issue"]],
		"/return":[["Tyre Master","Return"]],
		"/get":[["Tyre Master","Read"],["Tyre Master","Issue"],["Tyre Master","Return"]]
	}
};
roles['/api/maintenance/tyreretread']={
	"url":{
		"/issue":[["Retreated","Issue"]],
		"/return/*":[["Retreated","Return"]],
		"/get":[["Retreated","Read"]]
	}
};
roles['/api/maintenance/contractor']={
	"url":{
		"/add":[["Contractor","Add"]],
		"/get":[["Contractor","Read"],["Job Cards","Contractor Exp"],["Job Cards","Services Add"],
			["Job Cards","Services Update"],["Inventory","Issue Spare"],["Tools","Tool Issue"],
			["Tools","Tools Return"]],
		"/update/*":[["Contractor","Update"]],
		"/delete/*":[["Contractor","Delete"]]
	}
};
roles['/api/maintenance/contractor_expense']={
	"url":{
		"/get":[["Job Cards","Contractor Exp"],["Job Cards","Services Update"]],
		"/update":[["Job Cards","Contractor Exp"]]
	}
};
roles['/api/maintenance/diesel']={
	"url":{
		"/add":[["Maintenance Diesel","In-Out"]],
		"/get":[["Maintenance Diesel","Read"]]
	}
};

roles['/api/quotation']={
	"url":{
		"/add":[["Quotation","Add"]],
		"/get":[["Quotation","Read"]],
		"/update/*":[["Quotation","Update"]],
		"/delete/*":[["Quotation","Delete"]]
	}
};

roles['/api/so']={
	"url":{
		"/add":[["SO","Add"]],
		"/get":[["SO","Read"]],
		"/update/*":[["SO","Update"]],
		"/delete/*":[["SO","Delete"]],
		"/new":[["SO","Add"]]
	}
};


roles['/api/soInvoice']={
	"url":{
		"/add":[["SO Invoice","Add"]],
		"/get":[["SO Invoice","Read"]],
		"/update/*":[["SO Invoice","Update"]],
		"/delete/*":[["SO Invoice","Delete"]]
	}
};

roles['/api/accounts'] ={
	"url":{
		"/get":[["All Vendor","Add"],["Driver","Add"],["Driver","Update"],["Customer","Add"],["Customer","Update"],
				["Account Master","Read"],["DayBook","Add"],["Bill Settlement","Settle"],
				["GR Acknowledge","Read"], ["Diesels","Add"],["Trip Expense","Deal Acknowledge"],["User","Read"]],
		"/add":[["Account Master","Add"]],
		"/update/*":[["Account Master","Update"]]
	}
};

roles['/api/voucher'] = {
	"url":{
		"/add":[["DayBook","Add"]],
		"/remove":[["DayBook","Delete"]],
		"/update":[["DayBook","Update"]],
		"/get":[["DayBook","Read"],["Account Report","Read"]],
		"/ledger":[["Ledger","Read"]],
		"/taxes":[["GST Report","Read"]],
		"/tds":[["TDS Report","Read"]],
		"/gstr1":[["GSTR-1","Read"]],
		"/resetopeningclosing":[["DayBook","Read"]],
		"/create-vouchers-common":[["Voucher","Add"]],
	}
};


roles['/api/plain_voucher'] = {
	"url":{
		"/add":[["DayBook","Add"]],
		"/get":[["DayBook","Read"]],
		"/get/report":[["DayBook","Read"]],
		"/edit":[["DayBook","Read"]],
		"/reverse":[["DayBook","Read"]],
		"/delete":[["DayBook","Read"]],
	}
};

roles['/api/voucher2'] = {
	"url":{
		"/add":[["DayBook","Add"]],
		"/get":[["DayBook","Read"]],
		"/get/report":[["DayBook","Read"]],
		"/edit":[["DayBook","Read"]],
		"/reverse":[["DayBook","Read"]],
		"/delete":[["DayBook","Read"]],
	}
};


// roles['/api/utility/updateClient'] = {
// 	"url":{
// 		"/update":[["Customers", "Edit Client"], ["Consignor Consignee", "Edit Client"], ["Billing Party", "Edit Client"]]
// 	}
// };

roles['/api/trip_gr'] ={
	"url" :{
		"/get":[["Unbilled Gr","Read"],["GR Acknowledge","Read"],["Pending GR","Read"],["GR","Read"]],
		"/update/*":[["Unbilled Gr","Read"],["GR Acknowledge","Read"]],
		"/acknowledge_gr":[["GR Acknowledge","Acknowledge"]],
		"/pending_gr_remark":[["Pending GR","Add Remark"]]
	}
};

roles['/api/pdf'] = {
	"url" :{
		"/billGenerate":[["Generated Bills","Preview"],["Bill Dispatch","Preview"],["Bill Settlement","Preview"]],
		"/createGR":[["GR Acknowledge","Read"],["Pending GR","Print"]]
	}
};


roles['/api/dashboard'] = {
	"url":{
		"/profit-analysis":[["Summary","Read"],["Detail","Read"]],
		"/gr-analysis":[["Summary","Read"],["Detail","Read"]],
		"/bill-analysis":[["Summary","Read"],["Detail","Read"]],
		"/vehicle-analysis":[["Summary","Read"],["Detail","Read"]]
	}
};


roles['/api/consignor_consignee'] = {
	"url":{
		"/get":[["Consignor Consignee","Read"]],
		"/add":[["Consignor Consignee","Add"]],
		"/update/*":[["Consignor Consignee","Update"]],
		"/delete/*":[["Consignor Consignee","Delete"]]
	}
};

roles['/api/billingparty'] = {
	"url":{
		"/get":[["Billing Party","Read"]],
		"/add":[["Billing Party","Add"]],
		"/update/*":[["Billing Party","Update"]],
		"/delete/*":[["Billing Party","Delete"]],
		"/deleteConfig/*":[["Billing Party","Update","Read"]]
	}
};

roles['/api/accidentVehicle']={
	"url":{
		"/add":[],
		"/get":[],
		"/update/*":[],
		"/delete/*":[]
	}
};

roles['/api/driverCounselling']={
	"url":{
		"/add":[],
		"/get":[],
		"/delete/*":[]
	}
};


module.exports.getRoles = ()=>{return roles;};

module.exports.getAdminRole = ()=>{
	let savableRole={};
	for(let api in roles){
		savableRole[roles[api].module]={};
		for(let role in roles[api].url){
			savableRole[roles[api].module][roles[api].url[role]]=true;
		}
	}
	return savableRole;
};

module.exports.validateRoute = (parentUrl,url,allowedAccess)=>{
	if(url[url.length-1] === "/"){
		url = url.substring(0,url.length-1);
	}
	else if(url.substring(url.length-2,url.length-1) === "/*"){
		url = url.substring(0,url.length-1);
	}
	parentUrl = parentUrl.toLowerCase();
	url = url.toLowerCase();
	let currentUrlRole = roles[parentUrl];
	//console.log(currentUrlRole);
	//console.log(currentUrlRole.url[url],allowedAccess[currentUrlRole.module]);
	if(currentUrlRole && currentUrlRole.url[url])
	{
		for(let set in currentUrlRole.url[url]){
			if(allowedAccess[currentUrlRole.url[url][set][0]] && allowedAccess[currentUrlRole.url[url][set][0]][currentUrlRole.url[url][set][1]]){
				return true;
			}
		}
		return false;
	}
	else if(currentUrlRole) {
		for(let u in currentUrlRole.url){
			if(u[u.length-1] === "*" && url.indexOf(u.substring(0,u.length-1))>-1){
				for(let set in currentUrlRole.url[u]){
					if(allowedAccess[currentUrlRole.url[u][set][0]] && allowedAccess[currentUrlRole.url[u][set][0]][currentUrlRole.url[u][set][1]]){
						return true;
					}
				}
				return false;
			}
		}
		return false;
	}else{
		return false;
	}
};
