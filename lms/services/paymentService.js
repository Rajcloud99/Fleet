var Promise = require('bluebird');
var winston = require('winston');
var NO_OF_DOCS = 10;
var Payment = Promise.promisifyAll(commonUtil.getModel('payment'));
function prepareUserResponse(user){
	var userResponse =undefined;
	if(user){
    userResponse = JSON.parse(JSON.stringify(user));
	userResponse.password = undefined;
	userResponse.pwd = undefined;
	userResponse.status = undefined;
	userResponse.otp = undefined;
	userResponse.nOtp = undefined;
	userResponse.noncust_details = undefined;
	userResponse.latModified = undefined;
	userResponse.created_at = undefined;
	}
    return userResponse;
 };
function createPaymentId(booking){
	var paymentDate,paymentId ="P"+ booking.bookingId;
    var dateNow = new Date();
	if(dateNow.getMonth()<9){
		dMonth = "0" + (dateNow.getMonth() +1).toString();
	}else{
		dMonth = (dateNow.getMonth()+1).toString();	
	}
	if(dateNow.getDate()<10){
		dDate =  "0" + dateNow.getDate().toString();
	}else{
		dDate =  dateNow.getDate().toString();
	}
	paymentDate = dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
	dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
	return {'paymentId' : paymentId,'paymentDate' : paymentDate } ;
 };

module.exports.addPayment = function(data, next) {
	var oNewPID = createPaymentId(data);
	data.paymentId =oNewPID.paymentId;
	Payment.countAsync({"bookingId":data.bookingId})
	.then(function(count){
		if((count==0)||(count>0)){
			data.paymentId =oNewPID.paymentId+count;
		}
		data.paymentDate = oNewPID.paymentDate;
		console.log(data);
		var newPayment = new Payment(data);
	  	newPayment.saveAsync()
	  	.then(function(payment) {
	      winston.info("New payment saved: ");
	     if(payment[0]){
	      	return next(null,payment[0]);
	      }
	      else{
	    	  return next(null,payment);
	      }
	    })
	})
	.catch(function(err) {
      winston.error("Error in addpayment: " + err.toString());
      return next(err);
    });
};


module.exports.getPaymentByParams = function(data, next) {
 var cursor =  Payment.find(data);
   cursor.populate('post_owner_id')
   .populate('interest_owner_id')
	 .exec(function (err, posts) {
	  if (err){
		  winston.error("#getAllPayments: " + err);
	      return next(err);
	  }
	  winston.info("#getAllPayments: retrieved  Payment: ");
	  if(posts && posts[0]){
		  return next(null, posts[0]);

	  }else{
		  return next(null, posts);

	  }
 	});
};
module.exports.getPaymentById = function(data, next) {
	  Payment.findAsync(data)
	  .then(
	    function(bookings) {
	      winston.info("Post bookings retrieved: " + bookings);
	      if(bookings[0]){
	    	  return next(null, bookings[0]);
	      }else{
	    	  return next(null, bookings);
	      }
	    }).catch(function(err) {
	      winston.info("Error in getPaymentByParams: " + err);
	      return next(err);
	    }
	  );
	};
module.exports.updatePayment = function(oParam, newDetails, next) {
	var oUpdate = {};
	if(newDetails.setNewVal){
		oUpdate.$set = newDetails.setNewVal;
	}
	if(newDetails.pushToArr){
		oUpdate.$push = newDetails.pushToArr;
	}
	console.log(oUpdate);
 Payment.updateAsync(oParam,oUpdate, {"new": true,"runValidators" : true})
	  .then(
	    function(updatePayment) {
	      winston.info("Payment update status: ");
	      if(updatePayment[0]){
	    	  return next(null,updatePayment[0]);
	      }else{
	    	  return next(null,updatePayment);
	      }
	      
	    }
	  )
	  .catch(function(err) {
	        winston.error("updateBooking: " + err);
	      return next(err);
	    });
	 };
