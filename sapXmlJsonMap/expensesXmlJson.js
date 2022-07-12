/**
 * Created by kamal on 25/1/17.
 */
var root = {
    "ZFI_USER": {
        "IDOC": []
    }
};

var IDOC = {
    "EDI_DC40": {"SNDPRN": "PIPCLNT900"},
    "E1FIKPF": {
        "BUKRS": "3200",
        "BLART": "KR",
        "BLDAT": "20161130", //bill date
        "BUDAT": "20161130", //current date
        "MONAT": "6",
        "BKTXT": "1110", //? Quantity at header level in terms of TEU , SAP :Doc. Header text
        "WWERT": "20161130",
        "XBLNR": "16170003094",
        "WAERS": "INR",
        "ZFI_USER": [],
        "E1FISEG": [],
        "E1FISEC": {},
        "E1FISET": {},
        "E1FIXWT": {}
    }
};

var E1FISEG = {
    "BUZEI": "001",
    "BSCHL": "01",
    "WRBTR": "112000.00",
    "ZUONR": "416866",
    "SGTXT": "Wadkal(Pen)-Kanpur",
    "MENGE": "0.0",
    "MEINS": "TON",
    "PRCTR": "0032000020",
    "BUPLA": "3200",
    "SECCO": "3200",
    "E1FISE2": {},
    "E1FINBU": {"LIFNR": ""}
};

var ZFI_USER = {
    "POSNR": "0000000002",
    "ZZFIELD2": "420017",
    "ZZOBJ1": "HR38R9369",
    "ZZSALESE1": "DS0218",
    "ZZSERVC1": "2430,2430",
	"ZZINVOICE":"000"
};

module.exports.root = root;
module.exports.IDOC = IDOC;
module.exports.ZFI_USER = ZFI_USER;
module.exports.E1FISEG = E1FISEG;
