var async = require('async');
var fs = require('fs');
var mkdirp = require('mkdirp');

module.exports.generateCustomerXML = function(data, clientId, callback) {
 var oCustomer =  {
  "DEBMAS03": {
    "IDOC": {
      "EDI_DC40": {
        "SNDPRN": "PIPCLNT900"
      },
      "E1KNA1M": {
        "KUNNR": "M143",
        "KTOKD": "Z016",
        "LAND1": "IN",
        "PROVZ":"MP",
        "NAME1": "Best Food International Pvt.Ltd.",
        "ORT01": "Indri",
        "PSTLZ": "132037",
        "SORTL": "M143",
        "SPRAS": "E",
        "STRAS": "BESTFOODINTERNATIONALPVT.LTD.,POSTB",
        "TELF1": "09416202012",
        "TELF2":"9535888738",
        "TELFX":"9535888738",
        "E1KNA1H": {
          "MSGFN": "004"
        },
        "E1KNVVM": {
          "ZTERM": "0001"
        },
        "E1KNB1M": {
          "BUKRS": "3200",
          "AKONT": "20400045",
          "INTAD": "bestbasmati@yahoo.com"
        },
        "E1KNBKM": {
          "BANKA": "DEVRAJ(OWNER)-09416209039.MR.GURULAL(MANAGER)-09416202012",
          "STRAS": "OXNO.-5,INDRI,DISTRICT-KARNAL,HARYA",
          "ORT01": "NA.PH.-0184-2382467/2382225.FAX-238",
          "BRANCH": "2201.EMAIL-bestbasmati@yahoo.com,MR",
          "PROVZ": "07"
        }
      }
    }
  }
};
	saveFileAndReturnCallback(oCustomer, clientId, data.reportType || 'miscellaneous', 'customer',
        dateUtil.getDDMMYYYY(data.start_time), dateUtil.getDDMMYYYY(data.end_time), callback);
};
