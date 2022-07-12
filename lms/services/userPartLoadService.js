var Promise = require('bluebird');
//var bcrypt = Promise.promisifyAll(require('bcrypt'));
var winston = require('winston');
var NO_OF_DOCS = 10;
var User = Promise.promisifyAll(commonUtil.getModel('user'));
var PartLoadUser = Promise.promisifyAll(commonUtil.getModel('user_partLoad'));
var lPass = "";
var allowedFilter = ['mobile','created_at','owner_name','email','company_name','type','pincode','pan_no','status','city','alt_mobile','alt_contact','fax_no'];
var allowedParams = ['sortby'];
var isAllowedFilter  = function(sFilter){
  var isAllowed = false;
  if(allowedFilter.indexOf(sFilter)>=0){
    isAllowed =  true;
  }
  return isAllowed;
 };
var constructFilters = function(query){
  var fFilter = {};
  for(i in query){
      if(isAllowedFilter(i)){
      if(i =='from_date'){
        var startDate = new Date(query[i]);
        startDate.setSeconds(0);
        startDate.setHours(0);
        startDate.setMinutes(0);
        var nextDay = new Date(startDate);
        nextDay.setDate(startDate.getDate() + 1);
        fFilter["date.from"] = {
                  "$gte" :startDate,
                  "$lt":nextDay
          };
      }else {
        fFilter[i] = query[i];
      }
      
    }
  }
  return fFilter;
 };
//******************************************************************************************************
/*module.exports.addUserforPartLoad = function(user, next) {
  User.findOneAsync({'mobile': user.mobile})
  .then(function(savedUser) {
	   if(savedUser){
		    console.log('user already exists.');
		   next(false,false);
      }else{
        PartLoadUser.findOneAsync({'mobile': user.mobile})
        .then(function(partloaduser){
          if(partloaduser){
            console.log('Part Load user already exists.');
            next(false,false);
          }else{  
            bcrypt.hashAsync(user.password, 8)
            .then(function(hash) {
              lPass = user.password;
              user.pwd = user.password;
              user.password = hash;
              otp = smsUtil.generateOtp();
              user.otp = otp;
              user.nOtp = 0;
              user.USERID = "NA";
              var newUser = new PartLoadUser(user);
              return newUser.saveAsync();
            })
            .then(function(user) {
              if(user[0].status==='active'){
                var sGreetings = "Dear "+user[0].owner_name+",";
                var sBody = "Thank you for registration with Future Trucks. Download our android application from  https://goo.gl/khpPCW";
                var sSMS = sGreetings + sBody;
                var mss= "New User Registration at FT : "+user[0].owner_name+ "( " +user[0].company_name +" ) "+user[0].mobile + " password : "+ user[0].pwd; 
                if(commonUtil.getConfig('domain_name') == 'futuretrucks.in'){
                  smsUtil.sendSMS("8373901906", mss);
                }
                smsUtil.sendSMS(user[0].mobile,sSMS);
                if(user[0] && user[0].email){
                  var sEmailMessage = "<b>" + sGreetings + "</b> <br>"  + sBody;
                  var mailOptions = {
                    to: user[0].owner_name+ ' ? <'+user[0].email+'>',
                    subject: 'Thank you for registration with Future Trucks.?', 
                    text: 'Welcome from Future Trucks?',  
                    html: '<br>'+sEmailMessage+'<br>' 
                  };
                  emailUtil.sendMail(mailOptions);
                }
                return user;
              }else{
                console.log(user);
                winston.info("OTP genetation",user[0].otp);
                var sGreetings = "Dear Client,";
                var sBody = "OTP : " + user[0].otp + " to complete registration on futuretrucks.in . Do not share your OTP with anyone for security reasons. Download our android application from  https://goo.gl/khpPCW";
                var sSMS = sBody; //sGreetings + sBody;
                var mss= "New User Registration at FT : "+user[0].owner_name+ "( " +user[0].company_name +" ) "+user[0].mobile + " password : "+ lPass; 
                if(commonUtil.getConfig('domain_name') == 'futuretrucks.in'){
                  smsUtil.sendSMS("8373901906", mss);
                }
                smsUtil.sendSMS(user[0].mobile,sSMS);
                if(user[0] && user[0].email){
                  var sEmailMessage = "<b>" + sGreetings + "</b> <br>"  + sBody;
                  var mailOptions = {
                    to: user[0].owner_name+ ' ? <'+user[0].email+'>',
                    subject: 'OTP for user registration at Future Trucks.?', 
                    text: 'Welcome from Future Trucks?',  
                    html: '<br>'+sEmailMessage+'<br>' 
                  };
                  emailUtil.sendMail(mailOptions);
                }
                return user;
              }
            })
            .then(function(user) {
              winston.info("Saved user");
              return next(null,user);
            })
            .catch(function(err) {
              winston.error("Error in addUser: " + err);
              return next(err);
            });
          }
        })
      }
    }).catch(
			function(err) {
				winston.error("Error in find user: " + err);
				return next(err);
			}
		);
};*/
//*****************************************************************************************************************
module.exports.getAllUserOfPartLoad = function(req,next) {
  var ffFilters = constructFilters(req.query);
  var no_of_pages = 1;
  PartLoadUser.countAsync(ffFilters)
  .then(function(userCount) {
    var cursor = PartLoadUser.find(ffFilters);
    if(req.query && req.query.sortby && req.query.sortby.split(':')){
      var params = req.query.sortby.split(':');
      if(params[0]  && params[0] == 'created_at'){
        var oSort = {'created_at' : params[1]}
        cursor.sort(oSort);
      }
    }
    var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
    if(no_of_documents>15){
      no_of_documents = 15;
    }
    if(req.query && req.query.skip){
      var skip_docs = (req.query.skip-1)*no_of_documents;
      cursor.skip(skip_docs);
    }
    if(userCount/no_of_documents>1){
      no_of_pages = userCount/no_of_documents;
    }
    cursor.limit(no_of_documents);  
    cursor.exec(function (err, users) {
      if (err){
        logger.error("#err in Unregistered users: " + err);
        return next(err);
      }
      var tempUsers = JSON.parse(JSON.stringify(users));
      var toSend = {};
      toSend.no_of_pages =Math.ceil(no_of_pages);
      toSend.data = tempUsers;
      return next(null, toSend);
    });
  }).catch(function(err) {
      logger.error("Error in Unregistered : " + err);
      return next(err);
  });
};
//*****************************************************************************************************
module.exports.getPartLoadUserById = function(data, next) {
  PartLoadUser.findByIdAsync(data)
  .then(
    function(partLoadUser) {
      if(partLoadUser&&partLoadUser[0]){
        var userData = JSON.parse(JSON.stringify(partLoadUser[0]));
        return next(null, user);
      }else{
        return next(null, partLoadUser);
      }
    }).catch(function(err) {
        return next(err);
    }
  );
};
//*********************************************************************************************************
module.exports.updatePartLoadUser = function(partLoadUser_id, newDetails, next) {
  PartLoadUser.findByIdAndUpdateAsync(partLoadUser_id,newDetails, {"new": true,"runValidators" : true})
  .then(
    function(partLoadUser) {
      if(partLoadUser&&partLoadUser[0]){
        var userData = JSON.parse(JSON.stringify(partLoadUser[0]));
        return next(null,user);
      }else{
          return next(null,partLoadUser);
      }
    }
  )
  .catch(function(err) {
      return next(err);
    }
  );
};
//***********************************************************************************************************
module.exports.deletePartLoadUserById = function(partLoadUser_id, next) {
  PartLoadUser.findByIdAndRemoveAsync(partLoadUser_id)
  .then(
    function(deletedPartLoadUser) {
      if(deletedPartLoadUser){
          tempPost = JSON.parse(JSON.stringify(deletedPartLoadUser))
          return next(null,tempPost);
      }else{
        return next(null,deletedPartLoadUser);
      }
    }
  )
  .catch(
    function(err) {
      return next(err);
    }
  );
};
//***********************************************************************************************************