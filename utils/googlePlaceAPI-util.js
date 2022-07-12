var oSampleData = {
		
};
function getFormatedCity(oCityData){
	var oCity = {};
	 oCity.c = oCityData.sublocality_level_3 || oCityData.sublocality_level_2 || oCityData.sublocality_level_1 || oCityData.sublocality || oCityData.locality || oCityData.administrative_area_level_2;
	 oCity.d = oCityData.administrative_area_level_2|| oCityData.locality ||  oCityData.sublocality || oCityData.sublocality_level_1 || oCityData.sublocality_level_2 || oCityData.sublocality_level_3;
	if(!oCity.c && oCityData.administrative_area_level_1_f){
		oCity.c = oCityData.administrative_area_level_1_f;		
	}
	if(!oCity.d && oCityData.administrative_area_level_1_f){
		oCity.d = oCityData.administrative_area_level_1_f;
	}
	oCity.c =  oCity.c && oCity.c.toLowerCase ? oCity.c.toLowerCase():oCity.c;
	oCity.d =  oCity.d && oCity.d.toLowerCase ? oCity.d.toLowerCase():oCity.d;
	var city = "city";
	oCity.d = otherUtil.replaceFillerDistrict(oCity.d);
	oCity.s =  oCityData.administrative_area_level_1 || oCityData.administrative_area_level_2|| oCityData.locality ||  oCityData.sublocality || oCityData.sublocality_level_1 || oCityData.sublocality_level_2 || oCityData.sublocality_level_3;
	 if(oCityData.postal_code){
		 oCity.p = oCityData.postal_code;
	 }
	 console.log(oCityData,oCity);
	 return oCity;
}
//getFormattedCity(oSampleData);
module.exports.getFormattedCity = getFormatedCity;