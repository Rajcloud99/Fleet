/**
 * updated by kamal on 1/4/17.
 */
var root = {
    "ZFI_USER": {
        "IDOC": []
    }
};

var IDOC ={
    "EDI_DC40": {"SNDPRN": "PIPCLNT900"},//?
    "E1FIKPF": {
        "BUKRS": "3200",//company_code fixed
        "BLART": "DR",//document_type KR - invoice, KG - credit note/invoice cancellation
        "BLDAT": "20161130",//Invoice date in format DD.MM.YYYY
        "BUDAT": "20161130",//current Date ( should be same as invoice date)
        "MONAT": "6",  //? period
        "WWERT": "20161130", //?
        "XBLNR": "421038", //invoice number
        "WAERS": "INR",//currency
        "ZFI_USER": [], // not required
        "E1FISEG":[], //?
        "E1FISEC": {},
        "E1FISET": {},
        "E1FIXWT": {}
    }
};

var ZFI_USER = {
        "POSNR": "0000000002",
        "ZZFIELD2": "421038",//? trip no / gr no
        "ZZOBJ1": "HR38R3761",//vehicle no
        "ZZSALESE1": "DS0473", //Sales Employee Name
        "ZZSERVC1": "1110,1110",//Job Number
		"ZZINVOICE": "",
		"ZZSTATE": "",
	    "ZZSACCODE":"996511",
	    "ZZPAYING":"",
	    "ZZGSTNUM":"",
	    "ZZGSTRATE":"5"
    };

var E1FISEG = {
    "BUZEI": "001",
    "BSCHL": "01",//for Creditor Invoice (doc type KR) , posting key for Creditor Invoice = Debit (31),
                   //for  Expenses = Credit (40),for credit memo (doc type KG) ,  For Vendor  = Debit (21),
                   //expenses Credit  = (50), Posting Key
    "WRBTR": "3500-",//Same as invoice currency
                     //Amount in Document currency
    "ZUONR": "417885",//Assignment trip no ?
    "SGTXT": "Jhabrera-Bhagwanpur To Jhabrera ",//No of TEUs route?
    "MENGE": "41.29999923706055",//1.0  ( Qty for respective Job/Sub job) mandatory
    "MEINS": "TON",//Unit of Measurement
    "PRCTR": "0032000006",// Branch code.(Attached in excel)
                          //Fixed 0031000000 Series, 10 digit
    "BUPLA": "3200",//Business Place,blank
    "SECCO": "3200",//? fixed 3200
    "HKONT" : "",//GL Account, Can be any 1 out of the 7
                           //Expenses GLs - 40499810,40499785,40499800,40499815,40499790 ,40499805,40499795
                           //it is empty for first entry as of now out of 3 segs
    "MWSKZ":"",
    "E1FISE2": {},
    "E1FINBU": {"KUNNR": ""}
};
// PRCTR    =      Branch code.(Attached in excel)
//  HKONT(KR) =  0040206000  (For Diesel, Hard coded for Trip)
//  HKONT(KR) =  0040206005  (For Cash, Hard coded for Trip)
// LIFNR  (KR) =  0000700514   ( Hard Coded For Trip)


module.exports.root = root;
module.exports.IDOC = IDOC;
module.exports.ZFI_USER = ZFI_USER;
module.exports.E1FISEG = E1FISEG;
