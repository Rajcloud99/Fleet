
/**
 * Updated by kamal on 3/1/17.
 */
var CustomerXMLJson = require('../../sapXmlJsonMap/customerXmlJson');
var InvoiceXMLJson = require('../../sapXmlJsonMap/invoiceXmlJson');
var ExpensesXMLJson = require('../../sapXmlJsonMap/expensesXmlJson');
var invoiceService = promise.promisifyAll(commonUtil.getService("invoice"));
var SAP = ["BMV-1","BMV-2","BMV-3","BMV-4","BMV-5","BMV-6","GA04T4874","GA04T4875","GA04T4876","GA04T4877","GA04T4883","HR11GA5816","HR372131","HR37B4175","HR37B4176","HR37B4178","HR37B4180","HR37B4182","HR37B4183","HR37B4186","HR37B4188","HR37B4189","HR37B4190","HR37B4191","HR37B4192","HR37B4193","HR37B4194","HR37B4195","HR37B4963","HR37B4966","HR37B4967","HR37B4968","HR37B4969","HR37B4970","HR37B4971","HR37B4972","HR37B4973","HR37B4974","HR37B5503","HR37B5504","HR383616","HR38D9519","HR38J0944","HR38J0951","HR38J1321","HR38J1324","HR38J1481","HR38J1484","HR38J1487","HR38J1781","HR38J1784","HR38J1787","HR38J2521","HR38J2524","HR38J3019","HR38J3391","HR38J3394","HR38J4031","HR38J4034","HR38J4037","HR38J4981","HR38J4984","HR38K0221","HR38K0224","HR38K1451","HR38K1454","HR38K3091","HR38K3094","HR38K4326","HR38K4901","HR38K4904","HR38K5311","HR38K5314","HR38K5558","HR38K5559","HR38K5560","HR38K5561","HR38K5809","HR38K5810","HR38K5811","HR38K5812","HR38K5813","HR38K5814","HR38K5815","HR38K5816","HR38K5903","HR38K6115","HR38K6116","HR38K6117","HR38K6118","HR38K6119","HR38K6120","HR38K6122","HR38K6129","HR38K6201","HR38K6202","HR38K6203","HR38K6420","HR38K6468","HR38K6470","HR38K6535","HR38K6536","HR38K6538","HR38K6830","HR38K6831","HR38K6833","HR38K6835","HR38K6836","HR38K7139","HR38K7218","HR38K8027","HR38K8081","HR38K8084","HR38K8320","HR38K8321","HR38K8322","HR38K8323","HR38K8324","HR38K8326","HR38K8327","HR38K8329","HR38K8330","HR38K8331","HR38K8332","HR38K8334","HR38K8336","HR38K8338","HR38K8340","HR38K8341","HR38K8342","HR38K8716","HR38K8747","HR38K8748","HR38K8984","HR38K9199","HR38K9201","HR38K9252","HR38K9253","HR38K9485","HR38K9486","HR38K9487","HR38K9488","HR38K9489","HR38K9498","HR38K9499","HR38K9500","HR38K9501","HR38K9502","HR38K9503","HR38K9505","HR38K9506","HR38K9513","HR38K9514","HR38K9515","HR38K9516","HR38K9517","HR38K9522","HR38K9523","HR38K9524","HR38K9525","HR38K9526","HR38L0110","HR38L0112","HR38L0113","HR38L0260","HR38L0262","HR38L0401","HR38L0402","HR38L0403","HR38L0410","HR38L0412","HR38L0413","HR38L0702","HR38L0703","HR38L0704","HR38L0706","HR38L0714","HR38L0716","HR38L0739","HR38L0741","HR38L0742","HR38L0791","HR38L0798","HR38L0804","HR38L0805","HR38L0806","HR38L0807","HR38L0894","HR38L0896","HR38L0898","HR38L0932","HR38L0943","HR38L1067","HR38L1068","HR38L1069","HR38L1070","HR38L1267","HR38L1269","HR38L1270","HR38L1379","HR38L1380","HR38L1519","HR38L1520","HR38L1646","HR38L1647","HR38L1722","HR38L1723","HR38L1724","HR38L1849","HR38L1971","HR38L1972","HR38L2064","HR38L2065","HR38L2263","HR38L2513","HR38L2516","HR38L2518","HR38L2519","HR38L2520","HR38L2521","HR38L2522","HR38L2770","HR38L2771","HR38L2773","HR38L2774","HR38L2924","HR38L3127","HR38L3128","HR38L3130","HR38L3136","HR38L3139","HR38L3878","HR38L3879","HR38L3880","HR38L4161","HR38L4162","HR38L4249","HR38L4250","HR38L4251","HR38L4252","HR38L4577","HR38L4583","HR38L4586","HR38L4589","HR38L4594","HR38L4596","HR38L4897","HR38L4898","HR38L4899","HR38L4902","HR38L5269","HR38L5270","HR38L5271","HR38L5272","HR38L5273","HR38L5562","HR38L5564","HR38L5566","HR38L5567","HR38L5568","HR38L6576","HR38L6578","HR38L6581","HR38L6582","HR38L6583","HR38L6738","HR38L6739","HR38L6740","HR38L6741","HR38L6742","HR38L6743","HR38L6752","HR38L6754","HR38L6755","HR38L6756","HR38L6758","HR38L6945","HR38L6946","HR38L6947","HR38L6948","HR38L6949","HR38L7199","HR38L7231","HR38L7354","HR38L7356","HR38L7357","HR38L7358","HR38L7359","HR38L7773","HR38L7780","HR38L7861","HR38L7862","HR38L7863","HR38L7864","HR38L7865","HR38L8248","HR38L8249","HR38L8250","HR38L8251","HR38L8252","HR38L8722","HR38L8723","HR38L8724","HR38L8725","HR38L8726","HR38N9043","HR38N9046","HR38N9047","HR38N9048","HR38N9443","HR38Q9667","HR38Q9676","HR38Q9684","HR38Q9687","HR38Q9688","HR38Q9693","HR38Q9699","HR38Q9923","HR38Q9924","HR38Q9925","HR38R0173","HR38R0174","HR38R0176","HR38R0179","HR38R0180","HR38R0322","HR38R0323","HR38R0324","HR38R0325","HR38R0326","HR38R0327","HR38R0328","HR38R0329","HR38R0330","HR38R0331","HR38R0332","HR38R0334","HR38R0418","HR38R0419","HR38R0420","HR38R2465","HR38R2466","HR38R2467","HR38R2468","HR38R2469","HR38R2470","HR38R2472","HR38R2473","HR38R2506","HR38R2507","HR38R3175","HR38R3176","HR38R3180","HR38R3424","HR38R3425","HR38R3426","HR38R3428","HR38R3429","HR38R3430","HR38R3431","HR38R3641","HR38R3642","HR38R3643","HR38R3646","HR38R3758","HR38R3759","HR38R3760","HR38R3761","HR38R3762","HR38R3763","HR38R3838","HR38R3839","HR38R3840","HR38R3841","HR38R3842","HR38R4388","HR38R4389","HR38R4390","HR38R4391","HR38R4392","HR38R4393","HR38R4639","HR38R4640","HR38R4641","HR38R4642","HR38R4643","HR38R4644","HR38R4647","HR38R4648","HR38R4649","HR38R4817","HR38R4818","HR38R4819","HR38R4820","HR38R4918","HR38R4919","HR38R4921","HR38R4923","HR38R4987","HR38R4988","HR38R5237","HR38R5238","HR38R5243","HR38R5244","HR38R5351","HR38R5352","HR38R5354","HR38R5355","HR38R5404","HR38R5405","HR38R6752","HR38R6753","HR38R6754","HR38R6756","HR38R6757","HR38R6758","HR38R6759","HR38R6760","HR38R6761","HR38R6920","HR38R7072","HR38R7073","HR38R7074","HR38R7075","HR38R7076","HR38R7759","HR38R7760","HR38R7762","HR38R7763","HR38R7764","HR38R8000","HR38R8001","HR38R8002","HR38R8003","HR38R8006","HR38R8008","HR38R8009","HR38R8010","HR38R8011","HR38R8012","HR38R8241","HR38R9201","HR38R9202","HR38R9203","HR38R9204","HR38R9290","HR38R9291","HR38R9356","HR38R9357","HR38R9358","HR38R9359","HR38R9360","HR38R9361","HR38R9362","HR38R9363","HR38R9364","HR38R9369","HR38R9370","HR38R9371","HR38R9372","HR38R9373","HR38R9496","HR38R9497","HR38R9498","HR38R9499","HR38R9576","HR38S0101","HR38V0229","HR38V0242","HR38V0243","HR38V0280","HR38V0553","HR38V0561","HR38V0576","HR38V1086","HR38V1129","HR38V2933","HR38V2973","HR38V2974","HR38V3012","HR38V3099","HR38V3105","HR38V3247","HR38V3804","HR38V3809","HR38V3844","HR38V4022","HR38V4186","HR38V4204","HR38V4211","HR38V4275","HR38V5349","HR38V5380","HR38V5382","HR38V5835","HR38V5839","HR38V6745","HR38V6798","HR38V7053","HR38V7081","HR38V7083","HR38V7094","HR38V7114","HR38V7120","HR38V7121","HR38V7578","HR38V7625","HR38V7628","HR38V7765","HR38V7766","HR38V7926","HR38V7936","HR38V8157","HR38V8163","HR38V8165","HR38V8181","HR38V8640","HR38V8652","HR38V8745","HR38V9234","HR38V9246","HR38V9457","HR38V9783","HR38V9994","HR38W0135","HR38W0273","HR38W0868","HR38W1964","HR38W2066","HR38W2459","HR38W2567","HR38W2669","HR38W2802","HR38W3509","HR38W4004","HR38W4837","HR38W4889","HR38W4986","HR38W5460","HR38W5532","HR38W6548","HR38W6667","HR38W6764","HR38W7364","HR38W7403","HR38W7629","HR38W7772","HR38W7984","HR38W8240","HR38W8317","HR38W8779","HR38W8901","HR38W9669","HR38W9812","HR45A0489","HR45A0490","HR45A0491","HR45A0492","HR45A0493","HR45A0494","HR45A0495","HR45A0496","HR45A0497","HR45A0498","HR45A0499","HR45A0501","HR45A0502","HR45A0503","HR474741","HR476885","HR477878","HR47A0306","HR47A3111","HR55G4745","HR55H4391","HR63A1788","HR63B0178","HRDR-1","HRDR-10","HRDR-11","HRDR-12","HRDR-13","HRDR-14","HRDR-15","HRDR-16","HRDR-17","HRDR-18","HRDR-19","HRDR-2","HRDR-20","HRDR-3","HRDR-4","HRDR-5","HRDR-6","HRDR-7","HRDR-8","HRDR-9","MARKET VEH.","MARKETVEH.","MV-","MV-1","MV-10","MV-11","MV-12","MV-13","MV-14","MV-15","MV-16","MV-17","MV-18","MV-19","MV-2","MV-20","MV-21","MV-22","MV-23","MV-24","MV-25","MV-26","MV-27","MV-28","MV-29","MV-3","MV-4","MV-5","MV-6","MV-7","MV-8","MV-9","RJ09GA7322","RJ09GA7323","RJ09GA7324","RJ09GA7325","RJ09GA7326","RJ09GA7327","RJ09GA7329","RJ09GA7330","RJ09GA7331","VM HP623051","VM HP62A3482","VM HR55S8439","VM HR55S8440","VM HR55S8441","VM HR55U3042","VM HR55U4907","VM HR55U6695","VM HR55U7778","VM HR55U9147","VM HR55U9851","VM HR55V0967","VM HR55V1026","VM HR55V1030","VM HR55V3927","VM HR55V4639","VM HR55V8730","VM HR55V9135","VM HR55V9330","VM HR55V9440","VM HR55V9606","VM HR55W6833","VM HR63C9587","VM-HP623051","VM-HP62A3482","VM-HR55S8439","VM-HR55S8440","VM-HR55S8441","VM-HR55U3042","VM-HR55U4907","VM-HR55U6695","VM-HR55U7778","VM-HR55U9147","VM-HR55U9851","VM-HR55V0967","VM-HR55V1026","VM-HR55V1030","VM-HR55V3927","VM-HR55V4639","VM-HR55V8730","VM-HR55V9135","VM-HR55V9330","VM-HR55V9440","VM-HR55V9606","VM-HR55W6833","VM-HR63C9587","VMHP623051","VMHP62A3482","VMHR55S8439","VMHR55S8440","VMHR55S8441","VMHR55U3042","VMHR55U4907","VMHR55U6695","VMHR55U7778","VMHR55U9147","VMHR55U9851","VMHR55V0967","VMHR55V1026","VMHR55V1030","VMHR55V3927","VMHR55V4639","VMHR55V8730","VMHR55V9135","VMHR55V9330","VMHR55V9440","VMHR55V9606","VMHR55W6833","VMHR63C9587","VMRJ14GB1440","VMRJ14GB5409",'HR38W1442','HR38W1930','HR38W2004','HR38W3109','HR38W3853','HR38W4341','HR38W4657','HR38W6160','HR38W7125','HR38W7812','HR38W2031','HR38W2054','HR38W2125','HR38W3140','HR38W3284','HR38W3309','HR38W3319','HR38W6149','HR38W6353','HR38W9093','HR38L2774','RJ09GA7327','HR38W0458','HR38W1377','HR38W1805','HR38W3380','HR38W6023','HR38W7067','HR38W8950','RJ09GA7327','HR38X9255','HR38X9378','HR38X9608','HR38X9713','HR38X9742','HR38X9885','HR38X3218','HR38X8412','HR38X9153','HR38X4459','HR38X8564','HR38X6527','HR38X9946','HR38X4556','HR38X5010','HR38X5280','HR38X5434','HR38X5443','HR38X5466','HR38X6983','HR38X6996','HR38X7641','HR38X7740','HR38X8295','HR38X8517','HR38X8545','HR38X8968','HR38X9148','HR38X0564','HR38X0674','HR38X1181','HR38X1582','HR38X1868','HR38X2064','HR38X2952','HR38X3080','HR38X3174','HR38X3340','HR38X3409','HR38X3555','HR38X4203','HR38X4405','HR38X4441'];

module.exports.prepareCustomerXMLJsonData = function(customerObj){
    if(!customerObj.sap_id) console.log('sap id not found',customerObj);
    CustomerXMLJson.IDOC.E1KNA1M.KUNNR = customerObj.sap_id || customerObj.customerId;
    CustomerXMLJson.IDOC.E1KNA1M.REGIO = customerObj.state_code;
    CustomerXMLJson.IDOC.E1KNA1M.STCD3 = customerObj.gstin_no;
    CustomerXMLJson.IDOC.E1KNA1M.NAME1 = customerObj.name.substr(0,35);
    CustomerXMLJson.IDOC.E1KNA1M.NAME2 = customerObj.name.length>35?customerObj.name.substr(35,70):undefined;
    CustomerXMLJson.IDOC.E1KNA1M.NAME3 = customerObj.name.length>70?customerObj.name.substr(70,105):undefined;
    CustomerXMLJson.IDOC.E1KNA1M.NAME4 = customerObj.name.length>105?customerObj.name.substr(105,140):undefined;
    CustomerXMLJson.IDOC.E1KNA1M.SORTL = customerObj.sap_id ||  customerObj.customerId;
    if (customerObj.address && customerObj.address.line1 && customerObj.address.line2) {
        var address=customerObj.address.line1+" "+customerObj.address.line2+" "+customerObj.address.district;
        CustomerXMLJson.IDOC.E1KNA1M.STRAS = address.substr(0,35);
        CustomerXMLJson.IDOC.E1KNA1M.E1KNBKM.BANKA = address.length>35?
        customerObj.address.line1.substr(35,70):undefined;
        CustomerXMLJson.IDOC.E1KNA1M.E1KNBKM.BRNCH = address.length>70?
        customerObj.address.line1.substr(70,105):undefined;
    }

    if (customerObj.address && customerObj.address.city && customerObj.address.state) {
        CustomerXMLJson.IDOC.E1KNA1M.E1KNBKM.ORT01 = customerObj.address.city+" "+customerObj.address.state;
    }
    if(customerObj.address && customerObj.address.pincode){
        CustomerXMLJson.IDOC.E1KNA1M.PSTLZ = customerObj.address.pincode;
    }
    CustomerXMLJson.IDOC.E1KNA1M.TELF1 = customerObj.prim_cont_no?customerObj.prim_cont_no:"00000000000";
    CustomerXMLJson.IDOC.E1KNA1M.TELF2 = customerObj.sec_cont_no?customerObj.sec_cont_no:undefined;
    CustomerXMLJson.IDOC.E1KNA1M.TELFX = customerObj.fax?customerObj.fax:undefined;
    CustomerXMLJson.IDOC.E1KNA1M.E1KNB1M.INTAD = customerObj.prim_email?customerObj.prim_email:undefined;
    return CustomerXMLJson.IDOC;
};
function copyJson(obj){
  return JSON.parse(JSON.stringify(obj));
}
module.exports.prepareInvoiceXMLJsonData = function(invoiceObjOld, invoiceObjNew){
	var tAmount = 0;
	if(SAP.indexOf(invoiceObjNew.vehicle_no) <= -1){
		invoiceObjNew.vehicle_sap_id = invoiceObjNew.vehicle_sap_id || "MV-1";
	}
	var billing_party_state_code = invoiceObjNew.billing_party_gstin_no ? invoiceObjNew.billing_party_gstin_no.slice(0,2) : invoiceObjNew.gstin_state_code || 07;
	InvoiceXMLJson.IDOC.E1FIKPF.BLDAT = otherUtil.generateDateForXMLJson(invoiceObjNew.billed_date);
    InvoiceXMLJson.IDOC.E1FIKPF.BUDAT = otherUtil.generateDateForXMLJson(new Date());//TODO bill generation date
    InvoiceXMLJson.IDOC.E1FIKPF.XBLNR = invoiceObjNew.bill_no;
    InvoiceXMLJson.IDOC.E1FIKPF.WWERT = otherUtil.generateDateForXMLJson(new Date());
    var obj1 = copyJson(InvoiceXMLJson.ZFI_USER);
    obj1.POSNR = "001";
    obj1.ZZFIELD2 = invoiceObjNew.booking_info[0].trip_no;
    obj1.ZZOBJ1 = invoiceObjNew.vehicle_sap_id || invoiceObjNew.booking_info[0].veh_no;
    obj1.ZZSALESE1 = invoiceObjNew.driver_sap_id || "D0";
    obj1.ZZSERVC1 = invoiceObjNew.booking_info[0].trip_no;
	obj1.ZZINVOICE = invoiceObjNew.bill_no;
	obj1.ZZSTATE = billing_party_state_code;
	obj1.ZZSACCODE = "996511";
	obj1.ZZPAYING = invoiceObjNew.billing_party_name;
	obj1.ZZGSTNUM = invoiceObjNew.billing_party_gstin_no || 'NA';
	obj1.ZZGSTRATE = "5";
    InvoiceXMLJson.IDOC.E1FIKPF.ZFI_USER = [];
    InvoiceXMLJson.IDOC.E1FIKPF.ZFI_USER.push(obj1);
    obj1 = copyJson(InvoiceXMLJson.ZFI_USER);
    obj1.POSNR = "002";
	obj1.ZZFIELD2 = invoiceObjNew.booking_info[0].trip_no;
    //obj1.ZZOBJ1 = invoiceObjNew.booking_info[0].veh_no;
	obj1.ZZOBJ1 = invoiceObjNew.vehicle_sap_id || invoiceObjNew.booking_info[0].veh_no;
    obj1.ZZSALESE1 = invoiceObjNew.driver_sap_id || "D0";
    obj1.ZZSERVC1 = invoiceObjNew.booking_info[0].trip_no;
	obj1.ZZINVOICE = invoiceObjNew.bill_no;
	obj1.ZZSTATE = billing_party_state_code;
	obj1.ZZSACCODE = "996511";
	obj1.ZZPAYING = invoiceObjNew.billing_party_name;
	obj1.ZZGSTNUM = invoiceObjNew.billing_party_gstin_no || 'NA';
	obj1.ZZGSTRATE = "5";
    InvoiceXMLJson.IDOC.E1FIKPF.ZFI_USER.push(obj1);

    obj1 = copyJson(InvoiceXMLJson.E1FISEG);
    obj1.BUZEI = "002";
    obj1.BSCHL = "50";
    obj1.MWSKZ = "V0";
	invoiceObjNew.total_expenses = Math.round(invoiceObjNew.total_expenses * 100) / 100;
	obj1.WRBTR =  invoiceObjNew.total_expenses + "-";
    if(invoiceObjNew.vehicle_sap_id){
		obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
	}else{
		obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no || 0;
	}
    obj1.SGTXT = invoiceObjNew.booking_info[0].route;
    obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
    obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
    obj1.PRCTR = "00"+invoiceObjNew.profit_center;
    obj1.HKONT = "0030026000"; // freight income
    obj1.BUPLA = "3200";
    InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG = [];
    InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);
    var client_state_code = 07;
    var UT = [4,04,7,07,25,26,31,34,35];//union teretory
    if(!invoiceObjNew.apply_gst || invoiceObjNew.isMarketVehicle || invoiceObjNew.billing_party_gstin_no){
        invoiceObjNew.tax_code = "no tax";
    }else if(billing_party_state_code == 07 || billing_party_state_code == 7){
            invoiceObjNew.tax_code = "4C";//UGST
    }else{
            invoiceObjNew.tax_code = "4A";//IGST
    }

    if(invoiceObjNew.tax_code == '4A'){
        obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "003";
        obj1.BSCHL = "50";
        obj1.MWSKZ = "4A";
        var IGSTAmount = (invoiceObjNew.total_expenses * 5) / 100;
		IGSTAmount = Math.round(IGSTAmount * 100) / 100;
        obj1.WRBTR = IGSTAmount + "-";
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = "IGST";
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center;
        obj1.HKONT = "0010499010"; // freight income
        obj1.BUPLA = "3200";
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

        obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "001";
        obj1.BSCHL = "01";
        obj1.MWSKZ = "V0";
		obj1.WRBTR = invoiceObjNew.total_expenses + IGSTAmount || "0";

        //obj1.WRBTR = (invoiceObjNew.total_expenses + parseFloat((Math.round((invoiceObjNew.total_expenses) * 5) / 100).toFixed(2)) || "0");
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = invoiceObjNew.booking_info[0].route;
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "Ton" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center
        obj1.BUPLA = "3200";
        obj1.E1FINBU.KUNNR = invoiceObjNew.sap_id;// TODO need to attach it from db
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

     }else  if(invoiceObjNew.tax_code == '4B'){
        obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "003";
        obj1.BSCHL = "50";
        obj1.MWSKZ = "4B";
	    var SGSTAmount =  (invoiceObjNew.total_expenses * 2.5) / 100;
	    SGSTAmount = Math.round(tAmount * 100) / 100;
		obj1.WRBTR = SGSTAmount + "-";
        //obj1.WRBTR = parseFloat((Math.round((invoiceObjNew.total_expenses) * 2.5) / 100).toFixed(2))+"-";
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = "SGST";
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center;
        obj1.HKONT = "0010499000"; // freight income
        obj1.BUPLA = "3200";
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

		obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "004";
        obj1.BSCHL = "50";
        obj1.MWSKZ = "4B";
		//tAmount = (invoiceObjNew.total_expenses * 2.5) / 100;
		obj1.WRBTR = SGSTAmount +  "-";

        //obj1.WRBTR = parseFloat((Math.round((invoiceObjNew.total_expenses) * 2.5) / 100).toFixed(2))+"-";
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = "CGST";
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center;
        obj1.HKONT = "0010499005"; // freight income
        obj1.BUPLA = "3200";
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

        obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "001";
        obj1.BSCHL = "01";
        obj1.MWSKZ = "V0";
		obj1.WRBTR = invoiceObjNew.total_expenses + SGSTAmount + SGSTAmount;
        //obj1.WRBTR = (invoiceObjNew.total_expenses + parseFloat((Math.round((invoiceObjNew.total_expenses) * 5) / 100).toFixed(2)) || "0");
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = invoiceObjNew.booking_info[0].route;
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center
        obj1.BUPLA = "3200";
        obj1.E1FINBU.KUNNR = invoiceObjNew.sap_id;// TODO need to attach it from db
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

    }else  if(invoiceObjNew.tax_code == '4C'){
          obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "003";
        obj1.BSCHL = "50";
        obj1.MWSKZ = "4C";
		var UGSTAmount  = (invoiceObjNew.total_expenses * 2.5) / 100;
		UGSTAmount = Math.round(UGSTAmount * 100) / 100;
		obj1.WRBTR = UGSTAmount || "-";
        //obj1.WRBTR = parseFloat((Math.round((invoiceObjNew.total_expenses) * 2.5) / 100).toFixed(2))+"-";
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = "UGST";
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center;
        obj1.HKONT = "0010499015"; // freight income
        obj1.BUPLA = "3200";
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);


        obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "004";
        obj1.BSCHL = "50";
        obj1.MWSKZ = "4C";
		//tAmount = (invoiceObjNew.total_expenses * 2.5) / 100;
		obj1.WRBTR = UGSTAmount || "-";
        //obj1.WRBTR = parseFloat((Math.round((invoiceObjNew.total_expenses) * 2.5) / 100).toFixed(2))+"-";
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = "CGST";
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center;
        obj1.HKONT = "0010499005"; // freight income
        obj1.BUPLA = "3200";
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

        obj1 = copyJson(InvoiceXMLJson.E1FISEG);
        obj1.BUZEI = "001";
        obj1.BSCHL = "01";
        obj1.MWSKZ = "V0";
		obj1.WRBTR = invoiceObjNew.total_expenses + UGSTAmount + UGSTAmount  || "0";
		//obj1.WRBTR = (invoiceObjNew.total_expenses + parseFloat((Math.round((invoiceObjNew.total_expenses) * 5) / 100).toFixed(2)) || "0");
		if(invoiceObjNew.vehicle_sap_id){
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
		}else{
			obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
		}
        obj1.SGTXT = invoiceObjNew.booking_info[0].route;
        obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
        obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
        obj1.PRCTR = "00"+invoiceObjNew.profit_center
        obj1.BUPLA = "3200";
        obj1.E1FINBU.KUNNR = invoiceObjNew.sap_id;// TODO need to attach it from db
        InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);
    }else{
     obj1 = copyJson(InvoiceXMLJson.E1FISEG);
     obj1.BUZEI = "001";
     obj1.BSCHL = "01";
     obj1.MWSKZ = "V0";
     //tAmount = invoiceObjNew.total_expenses;
	 obj1.WRBTR = invoiceObjNew.total_expenses;
     //obj1.WRBTR = (invoiceObjNew.total_expenses || "0");
     if(invoiceObjNew.vehicle_sap_id){
		obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no + "/" + invoiceObjNew.booking_info[0].veh_no;;
	}else{
		obj1.ZUONR = invoiceObjNew.booking_info[0].gr_no;
	}
     obj1.SGTXT = invoiceObjNew.booking_info[0].route;
     obj1.MENGE = invoiceObjNew.booking_info[0].weight || 0;//need to cal total weight
     obj1.MEINS = "TON" || invoiceObjNew.booking_info[0].weight_unit;
     obj1.PRCTR = "00"+invoiceObjNew.profit_center
     obj1.BUPLA = "3200";
     obj1.E1FINBU.KUNNR = invoiceObjNew.sap_id;// TODO need to attach it from db
     InvoiceXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);
    }
    return InvoiceXMLJson.IDOC;
};

module.exports.prepareExpensesXMLJsonData = function(expensesObjOld, expensesObjNew){
	var tAmount;
	if(SAP.indexOf(expensesObjNew.vehicle_no) <= -1){
		expensesObjNew.vehicle_sap_id = expensesObjNew.vehicle_sap_id || "MV-1";
	}
    var trip_start_date = new Date();
    if(expensesObjNew.trip_start && expensesObjNew.trip_start.time){
		trip_start_date = new Date(expensesObjNew.trip_start.time);
    }
    ExpensesXMLJson.IDOC.E1FIKPF.BLDAT = otherUtil.generateDateForXMLJson(trip_start_date);// expensesObjNew.invoice_date);
    ExpensesXMLJson.IDOC.E1FIKPF.BUDAT = otherUtil.generateDateForXMLJson(new Date());
    ExpensesXMLJson.IDOC.E1FIKPF.XBLNR = expensesObjNew.trip_no;
    ExpensesXMLJson.IDOC.E1FIKPF.WWERT = otherUtil.generateDateForXMLJson(new Date());
    var obj1 = copyJson(ExpensesXMLJson.ZFI_USER);
    obj1.POSNR = "002";
    obj1.ZZFIELD2 = expensesObjNew.trip_no;
    //obj1.ZZOBJ1 = "MV-1" || expensesObjNew.vehicle_sap_id ||  expensesObjNew.vehicle_no;
	obj1.ZZOBJ1 = expensesObjNew.vehicle_sap_id || expensesObjNew.vehicle_no;
    obj1.ZZSALESE1 = expensesObjNew.driver_sap_id ||"D0";
    obj1.ZZSERVC1 = expensesObjNew.trip_no;
    obj1.ZZINVOICE = expensesObjNew.trip_no;
    ExpensesXMLJson.IDOC.E1FIKPF.ZFI_USER = [];
    ExpensesXMLJson.IDOC.E1FIKPF.ZFI_USER.push(obj1);

    obj1 = copyJson(ExpensesXMLJson.ZFI_USER);
    obj1.POSNR = "003";
    obj1.ZZFIELD2 = expensesObjNew.trip_no;
    //obj1.ZZOBJ1 = "MV-1" ||  expensesObjNew.vehicle_sap_id || expensesObjNew.vehicle_no;
	obj1.ZZOBJ1 = expensesObjNew.vehicle_sap_id || expensesObjNew.vehicle_no;
    obj1.ZZSALESE1 = expensesObjNew.driver_sap_id || "D0";
    obj1.ZZSERVC1 = expensesObjNew.trip_no;
	obj1.ZZINVOICE = expensesObjNew.trip_no;
    ExpensesXMLJson.IDOC.E1FIKPF.ZFI_USER.push(obj1);

    obj1 = copyJson(ExpensesXMLJson.E1FISEG);
    obj1.BUZEI = "001";
    obj1.BSCHL = "31";
	expensesObjNew.driver_cash = Math.round(expensesObjNew.driver_cash * 100) / 100;
	expensesObjNew.diesel_expenses_total_price = Math.round(expensesObjNew.diesel_expenses_total_price * 100) / 100;
	obj1.WRBTR = Math.round((expensesObjNew.diesel_expenses_total_price +  expensesObjNew.driver_cash)*100)/100 +  "-";
    //obj1.WRBTR = (expensesObjNew.total_expense || "0") + "-";
    if(expensesObjNew.gr_nos && expensesObjNew.gr_nos[0]){
      obj1.ZUONR =   expensesObjNew.gr_nos[0];
    }else if(expensesObjNew.gr && expensesObjNew.gr[0]){
      obj1.ZUONR =   expensesObjNew.gr[0].gr_no;
    }else{
       obj1.ZUONR = 0;
    }
	if(expensesObjNew.vehicle_sap_id){
		obj1.ZUONR = obj1.ZUONR + "/" + expensesObjNew.vehicle_no;;
	}
    //obj1.ZUONR = expensesObjNew.gr_nos && expensesObjNew.gr_nos[0] ? expensesObjNew.gr_nos[0] : 0;
    obj1.SGTXT = expensesObjNew.route_name;
    obj1.MENGE = expensesObjNew.total_weight || 0;//need to cal total weight
    obj1.MEINS = "TON" || expensesObjNew.weight_unit;
    obj1.PRCTR = "00"+expensesObjNew.profit_center;
    obj1.E1FINBU.LIFNR = "0000700514";
    ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG = [];
    ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

    var obj1 = copyJson(ExpensesXMLJson.E1FISEG);
    obj1.BUZEI = "002";
    obj1.BSCHL = "40";
	obj1.WRBTR =  expensesObjNew.diesel_expenses_total_price;
    //obj1.WRBTR = (expensesObjNew.diesel_expenses_total_price || "0");
    if(expensesObjNew.gr_nos && expensesObjNew.gr_nos[0]){
      obj1.ZUONR =   expensesObjNew.gr_nos[0];
    }else if(expensesObjNew.gr && expensesObjNew.gr[0]){
      obj1.ZUONR =   expensesObjNew.gr[0].gr_no;
    }else{
       obj1.ZUONR = 0;
    }
	if(expensesObjNew.vehicle_sap_id){
		obj1.ZUONR = obj1.ZUONR + "/" + expensesObjNew.vehicle_no;;
	}
    //obj1.ZUONR = expensesObjNew.gr_nos && expensesObjNew.gr_nos[0] ? expensesObjNew.gr_nos[0] : 0;
    obj1.SGTXT = expensesObjNew.route_name;
    obj1.HKONT = "0040206000";
    obj1.MENGE = expensesObjNew.diesel_expenses_total_litre || 0;//expensesObjNew.booking_info[0].weight;//need to cal total weight
    obj1.MEINS = "TON" || "Litre";//expensesObjNew.booking_info[0].weight_unit || "Ton";
    obj1.PRCTR = "00"+expensesObjNew.profit_center;
    ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

    var obj1 = copyJson(ExpensesXMLJson.E1FISEG);
    obj1.BUZEI = "003";
    obj1.BSCHL = "40";
	obj1.WRBTR = expensesObjNew.driver_cash;
    //obj1.WRBTR = (expensesObjNew.driver_cash || "0");
    if(expensesObjNew.gr_nos && expensesObjNew.gr_nos[0]){
      obj1.ZUONR =   expensesObjNew.gr_nos[0];
    }else if(expensesObjNew.gr && expensesObjNew.gr[0]){
      obj1.ZUONR =   expensesObjNew.gr[0].gr_no;
    }else{
       obj1.ZUONR = 0;
    }
	if(expensesObjNew.vehicle_sap_id){
		obj1.ZUONR = obj1.ZUONR + "/" + expensesObjNew.vehicle_no;
	}
    //obj1.ZUONR = expensesObjNew.gr_nos && expensesObjNew.gr_nos[0] ? expensesObjNew.gr_nos[0] : 0;
    obj1.SGTXT = expensesObjNew.route_name;
    obj1.HKONT = "0040206005";
    obj1.MENGE = 0;//expensesObjNew.booking_info[0].weight;//need to cal total weight
    obj1.MEINS = "TON";//expensesObjNew.booking_info[0].weight_unit || "Ton";
    obj1.PRCTR = "00"+expensesObjNew.profit_center
    ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);
    return ExpensesXMLJson.IDOC;
};

module.exports.prepareExpensesXMLJsonDataNew = function(expensesObjOld, expensesObjNew){
	var tAmount;
	if(SAP.indexOf(expensesObjNew.vehicle_no) <= -1){
		expensesObjNew.vehicle_sap_id = expensesObjNew.vehicle_sap_id || "MV-1";
	}
	var trip_start_date = new Date();
	if(expensesObjNew.trip_start && expensesObjNew.trip.trip_start.time){
		trip_start_date = new Date(expensesObjNew.trip.trip_start.time);
	}
	ExpensesXMLJson.IDOC.E1FIKPF.BLDAT = otherUtil.generateDateForXMLJson(trip_start_date);// expensesObjNew.invoice_date);
	ExpensesXMLJson.IDOC.E1FIKPF.BUDAT = otherUtil.generateDateForXMLJson(new Date());
	ExpensesXMLJson.IDOC.E1FIKPF.XBLNR = expensesObjNew.trip_no;
	ExpensesXMLJson.IDOC.E1FIKPF.WWERT = otherUtil.generateDateForXMLJson(new Date());
	var obj1 = copyJson(ExpensesXMLJson.ZFI_USER);
	obj1.POSNR = "002";
	obj1.ZZFIELD2 = expensesObjNew.trip_no;
	//obj1.ZZOBJ1 = "MV-1" || expensesObjNew.vehicle_sap_id ||  expensesObjNew.vehicle_no;
	obj1.ZZOBJ1 = expensesObjNew.vehicle_sap_id || expensesObjNew.vehicle_no;
	obj1.ZZSALESE1 = expensesObjNew.driver_sap_id ||"D0";
	obj1.ZZSERVC1 = expensesObjNew.trip_no;
	obj1.ZZINVOICE = expensesObjNew.trip_no;
	ExpensesXMLJson.IDOC.E1FIKPF.ZFI_USER = [];
	ExpensesXMLJson.IDOC.E1FIKPF.ZFI_USER.push(obj1);

	obj1 = copyJson(ExpensesXMLJson.ZFI_USER);
	obj1.POSNR = "003";
	obj1.ZZFIELD2 = expensesObjNew.trip_no;
	//obj1.ZZOBJ1 = "MV-1" ||  expensesObjNew.vehicle_sap_id || expensesObjNew.vehicle_no;
	obj1.ZZOBJ1 = expensesObjNew.vehicle_sap_id || expensesObjNew.vehicle_no;
	obj1.ZZSALESE1 = expensesObjNew.driver_sap_id || "D0";
	obj1.ZZSERVC1 = expensesObjNew.trip_no;
	obj1.ZZINVOICE = expensesObjNew.trip_no;
	ExpensesXMLJson.IDOC.E1FIKPF.ZFI_USER.push(obj1);

	obj1 = copyJson(ExpensesXMLJson.E1FISEG);
	obj1.BUZEI = "001";
	obj1.BSCHL = "31";
	expensesObjNew.driverCash = Math.round(expensesObjNew.driverCash * 100) / 100;
	expensesObjNew.diesel = Math.round(expensesObjNew.diesel * 100) / 100;
	obj1.WRBTR = Math.round((expensesObjNew.diesel +  expensesObjNew.driverCash)*100)/100 +  "-";
	//obj1.WRBTR = (expensesObjNew.total_expense || "0") + "-";
	if(expensesObjNew.gr_nos && expensesObjNew.gr_nos[0]){
		obj1.ZUONR =   expensesObjNew.gr_nos[0];
	}else if(expensesObjNew.gr && expensesObjNew.gr[0]){
		obj1.ZUONR =   expensesObjNew.gr[0].gr_no;
	}else{
		obj1.ZUONR = 0;
	}
	if(expensesObjNew.vehicle_sap_id){
		obj1.ZUONR = obj1.ZUONR + "/" + expensesObjNew.vehicle_no;;
	}
	//obj1.ZUONR = expensesObjNew.gr_nos && expensesObjNew.gr_nos[0] ? expensesObjNew.gr_nos[0] : 0;
	obj1.SGTXT = expensesObjNew.route_name;
	obj1.MENGE = expensesObjNew.total_weight || 0;//need to cal total weight
	obj1.MEINS = "TON" || expensesObjNew.weight_unit;
	obj1.PRCTR = "00"+expensesObjNew.profit_center;
	obj1.E1FINBU.LIFNR = "0000700514";
	ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG = [];
	ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

	var obj1 = copyJson(ExpensesXMLJson.E1FISEG);
	obj1.BUZEI = "002";
	obj1.BSCHL = "40";
	obj1.WRBTR =  expensesObjNew.diesel;
	//obj1.WRBTR = (expensesObjNew.diesel_expenses_total_price || "0");
	if(expensesObjNew.gr_nos && expensesObjNew.gr_nos[0]){
		obj1.ZUONR =   expensesObjNew.gr_nos[0];
	}else if(expensesObjNew.gr && expensesObjNew.gr[0]){
		obj1.ZUONR =   expensesObjNew.gr[0].gr_no;
	}else{
		obj1.ZUONR = 0;
	}
	if(expensesObjNew.vehicle_sap_id){
		obj1.ZUONR = obj1.ZUONR + "/" + expensesObjNew.vehicle_no;;
	}
	//obj1.ZUONR = expensesObjNew.gr_nos && expensesObjNew.gr_nos[0] ? expensesObjNew.gr_nos[0] : 0;
	obj1.SGTXT = expensesObjNew.route_name;
	obj1.HKONT = "0040206000";
	obj1.MENGE = expensesObjNew.diesel_expenses_total_litre || 0;//expensesObjNew.booking_info[0].weight;//need to cal total weight
	obj1.MEINS = "TON" || "Litre";//expensesObjNew.booking_info[0].weight_unit || "Ton";
	obj1.PRCTR = "00"+expensesObjNew.profit_center;
	ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);

	var obj1 = copyJson(ExpensesXMLJson.E1FISEG);
	obj1.BUZEI = "003";
	obj1.BSCHL = "40";
	obj1.WRBTR = expensesObjNew.driver_cash;
	//obj1.WRBTR = (expensesObjNew.driver_cash || "0");
	if(expensesObjNew.gr_nos && expensesObjNew.gr_nos[0]){
		obj1.ZUONR =   expensesObjNew.gr_nos[0];
	}else if(expensesObjNew.gr && expensesObjNew.gr[0]){
		obj1.ZUONR =   expensesObjNew.gr[0].gr_no;
	}else{
		obj1.ZUONR = 0;
	}
	if(expensesObjNew.vehicle_sap_id){
		obj1.ZUONR = obj1.ZUONR + "/" + expensesObjNew.vehicle_no;
	}
	//obj1.ZUONR = expensesObjNew.gr_nos && expensesObjNew.gr_nos[0] ? expensesObjNew.gr_nos[0] : 0;
	obj1.SGTXT = expensesObjNew.route_name;
	obj1.HKONT = "0040206005";
	obj1.MENGE = 0;//expensesObjNew.booking_info[0].weight;//need to cal total weight
	obj1.MEINS = "TON";//expensesObjNew.booking_info[0].weight_unit || "Ton";
	obj1.PRCTR = "00"+expensesObjNew.profit_center
	ExpensesXMLJson.IDOC.E1FIKPF.E1FISEG.push(obj1);
	return ExpensesXMLJson.IDOC;
};
