/*
Created By: Pratik
1-This srip performs all pament basis value push into info array.
2- It will convert boe number into String.
*/

var bookings = db.bookings.find({"clientId":"100003"});

while(bookings.hasNext()){
	var oBooking = bookings.next();
	var payment_basis = oBooking.weight_type;
	var oUpdate = {};
	if(oBooking.boe_no){
		oUpdate.boe_no = oBooking.boe_no.toString();
	}
	if(oBooking.info && oBooking.info.lengh>0){
		var aInfo = oBooking.info;
		for (var i = 0; i < aInfo.length; i++) {
			aInfo[i].payment_basis = payment_basis;
		}
		oUpdate.info = aInfo;
	}
	db.bookings.update({_id:oBooking._id},{$set:oUpdate}); 
}