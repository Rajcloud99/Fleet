/**
 * Created by manish on 25/1/17.
 */
var root = {
    "DEBMAS03": {
        "IDOC": []
    }
};

var IDOC = {
        "EDI_DC40": { "SNDPRN": "PIPCLNT900" }, //whats this?
        "E1KNA1M": {
            "KUNNR": "", //
            "REGIO" : "",//state code
            "STCD3" : "", //gstin no 
            "KTOKD": "Z016",
            "LAND1": "IN", //hard code
            "NAME1": "",
            "NAME2": "",
            "NAME3": "",
            "NAME4": "",
            "SORTL": "",
            "SPRAS": "E", //hard code
            "STRAS": "",
            "ORT01": "", //city
            "PSTLZ": "",
            "TELF1": "",
            "TELF2": "",
            "TELFX": "",
            "E1KNA1H": {
                "MSGFN": "004", // whats this?
            },
            "E1KNVVM": {
                "ZTERM": "0001", //hard code
              },
            "E1KNB1M": {
                "BUKRS": "3200", //hard code
                "AKONT": "0020400045", //hard code
                "INTAD": "", //email
            },
            "E1KNBKM": {
                "STRAS": "",
                "BANKA": "",
                "ORT01": "",
                "BRNCH": "",
                "PROVZ": ""
            },
            "E1KNVAM": {},
            "E1KNVKM": {
                "E1KNVKH": {
                    "E1KNVKL": {}
                }
            },
            "E1KNEXM": {},
            "E1KNASM": {},
            "E1KNKAM": {},
            "E1KNKKM": {
                "E1KNKKH": {
                    "E1KNKKL": {}
                }
            },
            "E1VCKUN": {}
        }
};

module.exports.root = root;
module.exports.IDOC = IDOC;
