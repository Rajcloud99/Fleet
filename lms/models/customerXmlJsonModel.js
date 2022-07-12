/**
 * Created by manish on 25/1/17.
 */
var mongoose = require ('mongoose');
var customerXML = new mongoose.Schema({
        "clientId": constant.requiredString,
        "data": {
            "EDI_DC40":{
            "@SEGMENT":{
              "type":String,
              "default":""
            },
              "SNDPRN": String
            },
            "E1KNA1M": {
                "@SEGMENT":{
                  "type":String,
                  "default":""
                },
                "KUNNR": String,
                "REGIO" : String,
                "STCD3" : String,
                "KTOKD": String,
                "LAND1": String,
                "NAME1": String,
                "NAME2": String,
                "NAME3": String,
                "NAME4": String,
                "ORT01": String,
                "PSTLZ": String,
                "SORTL": String,
                "SPRAS": String,
                "STRAS": String,
                "ORT01": String,
                "PSTLZ": String,
                "BRANCH": String,
                "TELF1": String,
                "TELF2": String,
                "TELFX": String,
                "E1KNA11": {},
                "E1KNA1H": {
                  "@SEGMENT":{
                    "type":String,
                    "default":""
                  },
                  "MSGFN": String,
                    "E1KNA1L": {}
                },
                "E1KNVVM": {
                  "@SEGMENT":{
                    "type":String,
                    "default":""
                  },
                    "ZTERM": String,
                    "E1KNVPM": {},
                    "E1KNVDM": {},
                    "E1KNVIM": {},
                    "E1KNVLM": {},
                    "E1KNVVH": {
                        "E1KNVVL": {}
                    }
                },
                "E1KNB1M": {
                  "@SEGMENT":{
                    "type":String,
                    "default":""
                  },
                    "BUKRS": String,
                    "AKONT": String,
                    "INTAD": String,
                    "E1KNB5M": {},
                    "E1KNB1H": {
                        "E1KNB1L": {}
                    }
                },
                "E1KNBKM": {
                  "@SEGMENT":{
                    "type":String,
                    "default":""
                  },
                    "BANKA": String,
                    "STRAS": String,
                    "ORT01": String,
                    "BRNCH": String,
                    "PROVZ": String
                },
                "E1KNVAM": {
                  "@SEGMENT":{
                    "type":String,
                    "default":""
                  }
                },
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
        }
    },
    constant.timeStamps
);

module.exports = mongoose.model('CustomerXML', customerXML);
