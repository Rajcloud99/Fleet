/**
 * Created by kamal on 12/5/19.
 */
var root = {
	"ENVELOPE": {
		"HEADER": {
			"TALLYREQUEST": "Import Data"
		},
		"BODY": {
			"IMPORTDATA": {
				"REQUESTDESC": {
					"REPORTNAME": "Vouchers",
					"STATICVARIABLES": {
						"SVCURRENTCOMPANY": "Company Name"
					}
				},
				"REQUESTDATA": {
					"TALLYMESSAGE": {
						"@xmlns:UDF":"TallyUDF",
						"VOUCHER": []
					}
				}
			}
		}
	}
};

var voucher = {
	"@REMOTEID":"",
	"@VCHTYPE":"",
	"@ACTION":"",
	"ISOPTIONAL": "No",
	"USEFORGAINLOSS": "No",
	"USEFORCOMPOUND": "No",
	"VOUCHERTYPENAME": "Journal",
	"DATE": "20190303",
	"EFFECTIVEDATE": "20190303",
	"ISCANCELLED": "No",
	"USETRACKINGNUMBER": "No",
	"ISPOSTDATED": "No",
	"ISINVOICE": "No",
	"DIFFACTUALQTY": "No",
	"VOUCHERNUMBER": "VINAYAK-112774",
	"REFERENCE": "VINAYAK-112774",
	"NARRATION": "37 LTR @ 66.31 ( 9398HR26CU  )",
	"GUID": "8C53D854-50C3-47D5-BC5B-FBD8423A567D",
	"ALTERID": "VINAYAK-112774",
	"ALLLEDGERENTRIES.LIST": []
};

var ledgerEntry = {
	"REMOVEZEROENTRIES": "No",
	"ISDEEMEDPOSITIVE": "Yes",
	"LEDGERFROMITEM": "No",
	"LEDGERNAME": "Car & Bike Expenses",
	"AMOUNT": "-2453.47"
};

var billAllocation = {
	"NAME": "",
	"BILLTYPE": "",
	"AMOUNT": "-2453.47"
};

let categoryAllocationList = () => ({
	"CATEGORY": "",
	"ISDEEMEDPOSITIVE": "Yes",
	"COSTCENTREALLOCATIONS.LIST": []
});

let costCenterAllocationList = () => ({
	"NAME": "",
	"AMOUNT": "",
});

module.exports.root = root;
module.exports.voucher = voucher;
module.exports.ledgerEntry = ledgerEntry;
module.exports.billAllocation = billAllocation;
module.exports.categoryAllocationList = categoryAllocationList;
module.exports.costCenterAllocationList = costCenterAllocationList;
