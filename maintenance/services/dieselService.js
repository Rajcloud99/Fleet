/**
 * Created by Nipun on 7/13/2017.
 */

var Diesel=promise.promisifyAll(commonUtil.getMaintenanceModel('diesel'));

module.exports.addDiesel = function(reqBody,next) {
    if(reqBody.flag=="Outward"){
        idUtil.generateDieselSlipAsync({clientId:reqBody.clientId,flag:"Outward"})
            .then(function (slipnumber) {
                reqBody.slip_number=slipnumber;
                var DieselData = new Diesel(reqBody);
                DieselData.saveAsync()
                    .then(function(savedData) {
                        return next(null, savedData);
                    })
                    .catch(function(err) {
                        return next(err);
                    });
            })
    }
    else {
		if(reqBody.total_amount)reqBody.total_amount=Math.round(reqBody.total_amount * 100) / 100;
        var DieselData = new Diesel(reqBody);
        DieselData.saveAsync()
            .then(function(savedData) {
                return next(null, savedData);
            })
            .catch(function(err) {
                return next(err);
            });
    }
};

module.exports.getDiesel = function(reqQuery,next) {
	var cursor = Diesel.find(reqQuery).sort({$natural:-1});
    cursor.exec(function (err,dieselData) {
    	if(err)return next(err);
		if(dieselData && dieselData.length>0){
			dieselData=JSON.parse(JSON.stringify(dieselData));
			var totalDiesel=0, dieselIn=0, dieselOut=0;
			for(var i=0; i<dieselData.length; i++){
				if(dieselData[i].flag=="Inward"){
					dieselIn+=dieselData[i].quantity;
					totalDiesel+=dieselData[i].quantity;
				}else if(dieselData[i].flag=="Outward"){
					dieselOut+=dieselData[i].quantity;
					totalDiesel-=dieselData[i].quantity;
				}
			}
			return next(null, {data:dieselData,totalDiesel:totalDiesel, dieselIn:dieselIn, dieselOut:dieselOut});
		}
		else {
			return next(null, {data:[],totalDiesel:0, dieselIn:0, dieselOut:0});
		}
	});
};
