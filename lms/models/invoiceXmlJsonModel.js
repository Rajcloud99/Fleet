/**
 * Created by manish on 25/1/17.
 */
var mongoose = require('mongoose');
var invoiceXML = new mongoose.Schema({
    "clientId":constant.requiredString,
    "data": {
        "EDI_DC40": {
          "@SEGMENT":{
            "type":String,
            "default":""
          },
          "SNDPRN": String
          },
        "E1FIKPF":{
           "@SEGMENT":{
              "type":String,
              "default":""
              },
            "BUKRS": String,
            "BLART": String,
            "BLDAT": String,
            "BUDAT": String,
            "MONAT": String,
            "WWERT": String,
            "XBLNR": String,
            "WAERS": String,
            "ZFI_USER": [{
              "_id" : false,
              "@SEGMENT":{
                  "type":String,
                  "default":""
                },
                "POSNR": String,
                "ZZFIELD2": String,
                "ZZOBJ1": String,
                "ZZSALESE1": String,
                "ZZSERVC1": String,
				"ZZINVOICE": String,
				"ZZSTATE": String,
				"ZZSACCODE":String,
				"ZZPAYING":String,
				"ZZGSTNUM":String,
				"ZZGSTRATE":String


            }],
            "E1FISEG": [{
               "_id" : false,
               "@SEGMENT":{
                "type":String,
                "default":""
              },
                "BUZEI": String,
                "BSCHL": String,
                "WRBTR": String,
                "ZUONR": String,
                "SGTXT": String,
                "MENGE": String,
                "MEINS": String,
                "PRCTR": String,
                "BUPLA": String,
                "SECCO": String,
                "HKONT": String,
                "MWSKZ":String,
                "E1FISE2": {},
                "E1FINBU": { "@SEGMENT":{
                  "type":String,
                  "default":""
                },
                "KUNNR": String}
            }],
            "E1FISEC": {
              "@SEGMENT":{
                "type":String,
                "default":""
            }
          },
            "E1FISET": {
              "@SEGMENT":{
                "type":String,
                "default":""
              }
          },
            "E1FIXWT": {
              "@SEGMENT":{
                "type":String,
                "default":""
            }
          }
        }
    }
},
    constant.timeStamps
);

module.exports = mongoose.model('InvoiceXML', invoiceXML);
