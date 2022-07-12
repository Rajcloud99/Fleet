/**
 * Created by manish on 22/7/16.
 */
var  constant = {};

constant.restrictedResourceRoutes = {
    'api/roles/':'role',
    '/api/users/':'user',
    '/api/department/':'department',
    '/api/client/':'client',
    '/api/material/':'material',
    '/api/branch/':'branch',
    '/api/driver/':'driver',
    '/api/vehicle/':'vehicle',
    '/api/upload/user/':'user',
    '/api/upload/client/':'client',
    '/api/upload/regvehicle/':'regvehicle',
    '/api/upload/driver/':'driver',
    '/api/download/user/':'user',
    '/api/download/client/':'client',
    '/api/download/regvehicle/':'regvehicle',
    '/api/download/driver/':'driver',
    '/api/regvehicle/':'regvehicle',
    '/api/vendor/transport/':'vendorTransport',
    '/api/vendor/fuel/':'vendorFuel',
    '/api/vendor/maintenance/':'vendorMaintenance',
    '/api/vendor/courier/':'vendorCourier',
    '/api/transportroute/':'route',
    '/api/customer/':'customer',
    '/api/contract/':'customer',
    '/api/routedata/':'customer',
    '/api/shippingline/':'sldo',
    '/api/icd/':'icd',
    '/api/bookings/':'bookings',
    '/api/trips/':'trip',
    '/api/bills/':'bill'
};

var oCity = {
    c: String,
    d: String,
    st: String,
    st_s:String,
    p: Number,
    cnt_s:String,
    cnt:String,
    address_components:{
        street_number: String,//'short_name'
        route: String,//'long_name'
        sublocality_level_2: String,//'long_name'
        sublocality_level_3: String,//'long_name'
        sublocality_level_1: String,//'long_name'
        sublocality: String,//'long_name'
        locality: String,//'long_name'
        administrative_area_level_2: String,//'long_name'
        administrative_area_level_1: String,//'short_name',
        administrative_area_level_1_f: String,//'long_name'
        country : String,//'short_name',
        country_f : String,//'long_name',
        postal_code: Number//'short_name'
    },
    formatted_address : String,
    geometry : {
        location:{
            lat: Number,
            lng:Number
        }
    },
    place_id:String,
    types:[String],
    url : String,
    vicinity:String
};

var address =  {
        "line1": String,
        "line2": String,
        "city":String,
        "district": String,
        "state": String,
        "pincode": Number,
        "country": String
    };

var requiredString = {
    "type":String,
    "required":true
};
var requiredUniqueString = {
    "type":String,
    "required":true,
    "unique":true
};

var requiredUniqueNumber = {
	"type":Number,
	"required":true,
	"unique":true
};

var requiredNumber = {
    "type" : Number,
    "required" : true
};

var requiredDate = {
    "type" : Date,
    "required" : true
};

var emailType = {
	type: String,
	trim: true,
	lowercase: true,
	match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
};

var timeStamps = {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "last_modified_at"
    },
};



var ownershipType = ["own", "rented", "market"];

var employeeStatus = ["Temporary", "Permanent"];

var religion = ["Hinduism", "Islam", "Sikhism", "Christianity", "Buddhism", "Jainism","Judaism", "Other"];

var gender = ["Male", "Female", "Other"];

var bloodGroup = ["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"];

var maritalStatus = ["Married", "Single", "Widow", "Widower"];

var educationTypes =["Primary","Secondary","Senior secondary","Graduate","Post graduate","Diploma","Doctorate"];

var reference = {
    "name": String,
    "relation_type": String,
    "employee_code": String,
    "address": String,
	"state_code": String,
    "contact_no": Number
};

var branchType = ["Headquarters", "Regional Head Office", "Inland Office","State Head Office", "Overseas Office"];

var routeType =    ["One Way","Two Way"];

constant.customerTypes = ["Customer", "Consignee","Consignor","Billing party","CHA","Transporter","Network Company","E-Commerce","Others"];

var customerStatus = ["Active","Inactive"];

var companyType = ["Public Limited","Private","Group"];

var designationType = ["Business Development Manager","Customer Service Executive","Key Account Manager","Telesales Representative"];

var contractType = ["Temporary","Permanent"];

var contractStatus = ["Live","Not started","Completed"];

var paymentType = ["To be billed","To pay","Advance & to pay","Advance & to be billed", "Chit", "Advance & chit"];

var billingType = ["Trip wise","BOE wise","Contract wise","Monthly","Weekly","Bi-Weekly"];

var emailFrequency = ["BOE wise","Trip wise","Contract wise","Monthly","Weekly","Bi-Weekly"];

var cargoType = ["Import - Containerized","Export - Containerized","Domestic - Containerized","Import - Loose Cargo","Export - Loose Cargo","Domestic - Loose Cargo","Empty - Containerized","Empty - Vehicle","Transporter Booking"];

var vehStatus = ["In Trip", "Idle", "Maintenance", "Sold", "Available", "Booked", "Empty Trip"];

//**** developers are requested not to change order of paymentBasis ******/
constant.payment_basis = ["PMT","PUnit","Fixed"];

constant.materialpayment_basis =["PMT" ,"PUnit"];

constant.gst_category = ["FCM" , "RCM"];

constant.gst_percent = ["0","5","12","18","24"];

constant.cType = ["Consignor" , "Consignee"];

constant.tyre_axle_location=["front","rear"];

constant.tyreCategory=["New","Old","Retreaded","Scrapped","Sold"];

constant.tyreStatus=["Scrapped","On Road","Repository Bin","Stock","Issued for retreading"];

constant.clientType = ["Indivisual", "Company"];

constant.idTypes = ["Driving License","Aadhaar Card", "Passport", "Voter ID" ];

constant.employmentTypes = ["Temporary", "Permanent"];

constant.tripStatus = ["Trip not started", "Trip started", "Trip ended", "Trip cancelled"];

constant.defaultRateChartConfig = [
	{ field: "effectiveDate", label: "Date" },
	{ field: "source", label: "Source" },
	{ field: "destination", label: "Destination" },
	{ field: "materialGroupCode", label: "Material Group Code" },
	{ field: "routeDistance", label: "Route KMs" },
	{ field: "paymentBasis", label: "Payment Basis" },
	{ field: "rate", label: "Rate" },
	{ field: "unit", label: "Unit" },
];

constant.liveTrackStatus = ["Running", "Stopped", "In Traffic","Driver Issue","Vehicle Breakdown","Puncture","Traffic Jam","Customer Issue","Driver Rest","SIM"];

constant.grItemStatus = ["GR Not Assigned", "GR Assigned", "Vehicle Arrived for loading", "Loading Started", "Loading Ended", "Departure", "Vehicle Arrived for unloading", "Unloading Started", "Unloading Ended","Trip cancelled", "GR Received", "GR Acknowledged","GR Cancelled", "Revert Acknowledged"];

constant.billType = ["Provisional Bill", "Actual Bill", "Loading Slip", "Supplementary Bill"];

constant.fpaType = ["Associate", "Market"];

constant.billSettleType = ["Bad Debt", "Right Off", "Damage", "Shortage", "Demurrage", "Non-Placement"];

constant.billStatus = ["Unapproved", "Approved", "Cancelled", "Dispatched", "Acknowledged"];

constant.bookingStatus = ["Requested", "Approved", "Serve Started", "Serve Ended", "Cancelled", "Rejected"];

constant.bookingCategoty = ['Regular','Ad-Hoc'];

constant.gr_types = ["Own", "Market","Centralized","Trip Memo", "Broker Memo"];

constant.languageTypes = ["English", "Hindi"];

constant.mechanicRoleTypes = ["Supervisor", "Mechanic"];

constant.taskStatusTypes = ["Open", "Closed"];

constant.taskPriorityTypes = ["High", "Medium", "Low"];

constant.yesNoTypes = ["Yes,No"];

constant.vehicleType = ["Horse","Trailer", "Truck"];

constant.vehicleCategory = ["Horse", "Truck","Trailer"];

constant.jobCardStatusTypes = ["Not started", "Open", "Closed"];

constant.jobCardMaintenanceTypes = ["Preventive","Running","Accident","Breakdown","Major","Minor","TrailerModification"];

constant.jobCardFlagTypes = ["Red","Green","Yellow"];

constant.uom=["Litre","Set","Dozen","Kilo","Piece","Packet","Feet","Meter"];

constant.user_type=["Driver","Supervisor","Trip Manager","Mechanic","Marketing Manager","Employee","POapprover",
	"PRapprover", "QuotApprover","SOApprover", "InvoiceApprover","Dealer", "Customer", "Branch Admin", "Transporter", "Broker",'SalesExecutive', 'Loading Babu'];

constant.poStatus=["Approved","Unapproved","Received","Inwarded","Partial Inwarded","Released"];

constant.prStatus=["New","Approved","Processed"];

constant.spType=["Spare","Tool","Tyre",'Gps','Sim'];

constant.aContainerTypes = ["20 Feet","40 Feet"];

constant.toolCategory=["new","old","scrapped"];

constant.toolStatus=["issued","InStock","scrapped"];

constant.accountType=["Purchase Accounts","Sales Account","Duties and Taxes","Direct Expenses","Indirect Expenses",
	"Indirect Income","Already Created in Tally","Bank Account","Deposit Account","Capital A/c","Current Assets",
	"Current Liabilities","Sundry Creditor","Loans and Advances (Assets)","Loans Liabilities","Fixed Assets",
	"Bank OCC","Bank OD","Branch/Divisions","Cash in Hand","Investments","Stock-in-hand","Misc. Expense (ASSET)",
	"Suspense A/c","Secured Loan","Unsecured Loan","Reserve & Surplus","Provisions","Sundry Debtors"];

constant.accountGroup=["Bad Dept", "Customer", "Driver", "Happay", "Happay Master", "FastTag", "FastTag Master", "Diesel", "Managers",
	"Miscellaneous", "Vendor", "Sales", "Transaction", "Purchase", 'Toll tax', 'Hire Vehicle', 'Vehicle', 'Cashbook', 'banks',
	'Internal Cashbook', 'Diesel-Bill', 'Car', 'Generator','Staff','Office', 'Deduction','Lorry Hire',"Loan","Others", 'Discount',
	'IGST Paid', 'IGST Payable', 'CGST Paid', 'CGST Payable', 'SGST Paid', 'SGST Payable', 'Adjustment', 'Vendor TDS', 'Receipt Deduction','Debtor with Hold',
'CGST Receivable','SGST Receivable','IGST Receivable'];

// constant.tdsSources = ["Payment of Salary Income", "Interest on Securities", "Interest on Debentures", "Dividend Income", "Prize money from lottery, cross word puzzle etc", "Winning from horse race/Jackpot", "Payments to contractors and sub-contractors", "Commission paid by Insurance companies to its agents", "Maturity of life insurance policy", "Payment of National Savings Scheme Deposits", "Repurchase of units by mutual fund or Unit Trust of India", "\tCommission on the sale of lottery tickets", "Commission or Brokerage", "Rent for use of Land and building/ furniture/ fitting", "Rent for use of Plant and machinery", "Sale proceeds of immovable property other than agriculture land", "Royalty, professional or technical services", "Dividend income from shares and mutual fund units", "Compensation paid on acquisition of certain immovable property", "Interest from infrastructure debt fund"];

constant.tdsSource = [
	{source:"Payment of Salary Income",section:'192'},
	{source: "Interest on Securities",section:'193'},
	{source:"Interest on Debentures",section:'193'},
	{source:"Dividend Income",section:'194'},
	{source:"Prize money from lottery, cross word puzzle etc",section:'194 B'},
	{source:"Winning from horse race/Jackpot",section:'194 BB'},
	{source:"Payments to contractors and sub-contractors",section:'194 C'},
	{source:"Commission paid by Insurance companies to its agents",section:'194 D'},
	{source: "Maturity of life insurance policy",section:'194 DA'},
	{source:"Payment of National Savings Scheme Deposits",section:'194 EE'},
	{source:"Repurchase of units by mutual fund or Unit Trust of India",section:'194 F'},
	{source:"Commission on the sale of lottery tickets",section:'194 G'},
	{source:"Commission or Brokerage",section:'194 H'},
	{source:"Rent for use of Land and building/ furniture/ fitting",section:'194 I'},
	{source: "Rent for use of Plant and machinery",section:'194 I'},
	{source:"Sale proceeds of immovable property other than agriculture land",section:'194 IA'},
	{source:"Royalty, professional or technical services",section:'194 J'},
	{source:"Dividend income from shares and mutual fund units",section:'194 K'},
	{source: "Compensation paid on acquisition of certain immovable property",section:'194 LA'},
	{source: "Interest from infrastructure debt fund",section:'194 LB'}
	];

constant.tdsCategory = ['Individuals or HUF','Non Individual/corporate'];

constant.aAdvanceType = ['Gr Charges', 'Loading Charges', 'Unloading Charges', 'Other Charges', 'Chalan', 'Driver Cash', 'Driver To Driver', 'Diesel','Extra Diesel', 'Toll Tax', 'Vendor A/C Pay', 'Vendor Cash', 'Vendor Cheque','Vendor Detention',"Vendor Overload Charges",'Vendor Penalty','Vendor Damage','Vendor Chalan', "Happay", "FastTag","Fasttag","Fastag","Vendor Advance","Vendor Balance", "Trip Memo"];

constant.aAmtType = ['Advance', 'Dala', 'Gate Pass', 'Kanta', 'Panni', 'Account Salary', 'Service', 'Unloading', 'Repairing', 'Commission'];

constant.voucherType = ["Receipt", "Journal", "Sales", "Credit Note", "Debit Note", "Purchase", "Payment", "Contra"];

constant.billServices = ["Transportation","IT","Infrastructure","Trading","Maintenance","Tyre","Others"];

constant.aExpenseType = ['Spare','Tyre','Other'];

constant.aOwnershipVendor = ["Associate", "Market"];

constant.aVendorCategory = ["Owner", "Broker"];

constant.aOwnershipVehicle = ["Own", "Associate", "Market", "Sold"];

constant.accountStatuses = ['Open', 'Linked', 'Unlinked', 'Close'];
constant.physicalStatuses = ['Tangable', 'Non-Tangable'];
constant.unitPrimary = ['Yes', 'No'];
constant.flow = ['GR','DIESEL','TRIP'];

constant.billBookType = ['Gr', 'Bill', 'FPA', 'Hire Slip', 'Ref No', 'Cash Receipt', 'Money Receipt', 'Credit Note','Trip Memo','Broker Memo' ,'Debit Note'];

constant.expenseType = [
	'Gr Charges',
	'Loading Charges',
	'Unloading Charges',
	'Other Charges',
	'Chalan',
	'Driver Cash',
	'Diesel',
	'Toll Tax',
	'Extra Diesel',
	'Driver to Driver',
	'Vendor Advance',
	'Vendor A/C Pay',
	"Vendor Balance",
	"Happay",
	"Fastag",
	"TDS",
	"Damage",
	"Penalty",
	"Other",
	"Border",
	"Challan",
	"Dala Commision",
	"Extra",
	"Fixed + Salary",
	"OK + Time",
	"Parking",
	"Rajai",
	"Repair",
	"Roti",
	"Service",
	"Wages",
	"Miscellaneous Pending",
	"Local Trip",
	"Fastag Toll Tax",
	"Cash Toll Tax",
	"Consumable store",
	"Phone Expense",
	"Add Blue"
];
constant.fpaDeduction = {
	"TDS": 'FT',
	"Insurance": 'FI',
	"Operation Charges": 'FOC',
	"Shortage Charges": 'FSC',
};

constant.sCharges = {
	chalan_charges: 'HCC',
	other_charges: 'HCO',
	detention_charge: 'HCDTN',
	oveloading_charge: 'HCOV',
	loading_charges: 'HCL',
	unloading_charges: 'HCU',
	tirpal_charges: 'HCT',
	chalan_rto_charges: 'HCCR',
	tds_deduction: 'HCTDS',
	damage_deduction: 'HCD',
	penalty_deduction: 'HCP',
	other_deduction: 'HCOD',
	labourDeduction: 'HCLD',
	claimDeduction: 'HCCD',
	toll_charges: 'HCT',
	Bal_Paymt_Munshiyana: 'BPM',
	Adv_Paymt_Munshiyana: 'APM',
};

constant.dedCharges = {
	'Late Delivery': 'DLD',
	'Damages': "DDA",
	'Shortage': 'DSH',
	'Claim': "DCL",
	'Non-Placement': 'DNP',
	'Parking': 'DPA',
	'Loading/Unloading': 'DLU',
	'ESI/PF': 'DEP',
	'GPS Recovery': 'DGR',
	'Insurance': 'DIN',
	'Rate Difference': 'DRD',
	'Misc Recovery': 'DMR',
	'Deduction': 'DDE',
	'Detention': 'DDT',
};

constant.miscDedCharges = {
	'Security Recovery': 'DSR',
	'Trucking Charge': "DTC",
	'Parking Charge': 'DPC',
	'Employer Contribution - PF': "DEC",
	'Employer Contribution ESI': 'DECE',
	'Penalty': 'DPT',
	'Loading & Unloading Charges': 'DLUC',
	'Insurance Charges for goods Intransit': 'DINC',
	'Non Placement Charges]': 'DNPC',
	'Misc Recovery': 'DMR',
};

constant.masterUpsertConf = {
	'': {

	}
};

constant.voucherTypeMapper = {
  'Receipt': 'RP',
  'Journal': 'JR',
  'Sales': 'SA',
  'Credit Note': 'CN',
  'Debit Note': 'DN',
  'Purchase': 'PR',
  'Payment': 'PY',
  'Contract': 'CT'
};

constant.states = [/Andhra Pradesh/i, /Arunachal Pradesh/i, /Assam/i, /Bihar/i, /Chhattisgarh/i, /Chandigarh/i, /Dadra and Nagar Haveli/,/Dadra And Nagar Haveli/, /Daman and Diu/i, /Delhi/i, /Goa/i, /Gujarat/i, /Gurugram/i, /Haryana/i, /Himachal Pradesh/i, /Jammu and Kashmir/i, /Jharkhand/i, /Karnataka/i, /Kerala/i, /Madhya Pradesh/i, /Maharashtra/i, /Manipur/i, /Meghalaya/i, /Mizoram/i, /Nagaland/i, /Odisha/i, /Punjab/i, /Puducherry/i, /Rajasthan/i, /Sikkim/i, /Tamil Nadu/i, /Telangana/i, /Tripura/i, /Uttar Pradesh/i, /Uttarakhand/i, /West Bengal/i, /Lakshadweep/i, /Bengaluru/i, /Solapur/i, /Vijayawada/i, /Maruti Udyog/i, /Chennai/i, /Vapi/i,/Kalol/i, /Varanasi/i, /Rewari/i, /Haridwar/i, /Sabarkatha/i, /Manesar/i, /Gulistanpur/i, /Kota/i, /Daman & Diu/i, /Mathura/i, /Chandapura/i, /Karnal/i, /Ajmer/i,/Aurangabad/i,/Hyderabad/i,/Bijapur/i,/Kavangarai/i,/Khamgaon/i,/Thane/i,/Jabalpur/i,/Sonepat/i,/Secunderabad/i,/Ahmedabad/i,/Kamothe/i,/Naveen Galla Mandi/i,/Pune/i,/Nepal/i,/Enmulanara/i
];

constant.stateToZone = {
	"Uttar Pradesh": "North-East",
	"Bihar": "North-East",
	"Jharkhand": "North-East",
	"Odisha": "East",
	"West Bengal": "East",
	"Daman and Diu": "West",
	"Goa": "West",
	"Gujarat": "West",
	"Maharashtra": "West",
	"Andhra Pradesh": "South",
	"Karnataka": "South",
	"Kerala": "South",
	"Tamil Nadu": "South",
	"Telangana": "South",
	"Lakshadweep": "South",
	"Nepal": "Export",
	"Chandigarh": "North",
	"Delhi": "North",
	"Haryana": "North",
	"Himachal Pradesh": "North",
	"Jammu and Kashmir": "North",
	"Punjab": "North",
	"Rajasthan": "North",
	"Uttarakhand": "North",
	"Assam": "East",
	"Arunachal Pradesh": "East",
	"Manipur": "East",
	"Meghalaya": "East",
	"Mizoram": "East",
	"Nagaland": "East",
	"Tripura": "East",
	"Sikkim": "East",
	"Chhattisgarh": "Central",
	"Madhya Pradesh": "Central",
	"Dadra and Nagar Haveli": "West",
	"Puducherry": "South",
	'No GPS Device': 'No GPS Device',
};

constant.geofence_points = {
	'data_id': String,
	'name': String,
	'addr': String,
	'geozone':[{latitude:Number,longitude:Number}],
	'radius':{type: Number, default: 2000},
	'is_inside':{type:Boolean},
	'location_buffer':[{datetime:Date,lat:Number,lng:Number,course:Number}],
	'events':[{datetime:Date,lat:Number,lng:Number,course:Number,address:String}],
	'sms': [String],
	'email': [String],
	'loc': String,
	'type': {type: String},
	'entry': Number,
	'exit': Number,
	'enabled': {type: Number, default: 1},
	'created_at': Date,
	'contact_person_name': String,
	'contact_person_number': Number,
	'contact_person_email': String,
	'deleted': {type: Boolean, default: false}
};
module.exports.geofenceCategory = ["customerLocation"];

module.exports = constant;
module.exports.oCity = oCity;
module.exports.requiredString = requiredString;
module.exports.requiredNumber = requiredNumber;
module.exports.requiredDate = requiredDate;
module.exports.emailType = emailType;
module.exports.timeStamps = timeStamps;
module.exports.requiredUniqueString = requiredUniqueString;
module.exports.requiredUniqueNumber = requiredUniqueNumber;
module.exports.address = address;
module.exports.employeeStatus = employeeStatus;
module.exports.religion = religion;
module.exports.gender = gender;
module.exports.bloodGroup = bloodGroup;
module.exports.educationTypes = educationTypes;
module.exports.maritalStatus = maritalStatus;
module.exports.reference = reference;
module.exports.branchType = branchType;
module.exports.routeType = routeType;
module.exports.customerStatus = customerStatus;
module.exports.companyType = companyType;
module.exports.designationType = designationType;
module.exports.contractType = contractType;
module.exports.contractStatus = contractStatus;
module.exports.paymentType = paymentType;
module.exports.billingType = billingType;
module.exports.emailFrequency = emailFrequency;
module.exports.cargoType = cargoType;
module.exports.vehStatus = vehStatus;
module.exports.maxDieselAmount = 70000;
