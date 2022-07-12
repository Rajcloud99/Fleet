let milliSec = 1000,
	sec = 1000*60,
	min = 1000*60*60,
	hour = 1000*60*60,
	day = 1000*60*60*24,
	month = 1000*60*60*24*30,
	year = 1000*60*60*24*30*12;
let moment = require("moment");
let momentTz = require("moment-timezone");


exports.getDDMMYYYY = function(date_) {
    var date ;
    if (date_) {
        date = new Date(date_);
    }else{
        date = new Date();
    }
    var dMonth, dDate;
    if (date.getMonth() < 9) {
        dMonth = "0" + (date.getMonth() + 1).toString();
    } else {
        dMonth = (date.getMonth() + 1).toString();
    }
    if (date.getDate() < 10) {
        dDate = "0" + date.getDate().toString();
    } else {
        dDate = date.getDate().toString();
    }
    return dDate + "-" + dMonth + "-" + date.getFullYear().toString();
};

exports.addDays = function(date,days){
    if (!date) date = new Date();
    date.setDate(date.getDate()+ days);
    return new Date(date);
};

//santosh
exports.absRound = function(day) {
    return Math.round(Math.abs(day));
};



//santosh
exports.selectGreaterDate=function(aDate, bDate){

    const date1 = new Date(aDate);
    const date2 = new Date(bDate);
    
    if(date1.getTime() > date2.getTime()){
	return aDate;
	}else{
	return bDate;
	}
};



//santosh
exports.ddmmyyyyStringToDate=function(ddmmyyyy){
    var st = ddmmyyyy;
    var pattern = /(\d{2})\/(\d{2})\/(\d{4})/;
    var dt = new Date(st.replace(pattern,'$3-$2-$1'));
    return dt;
};


exports.getMorning = function(date) {
    let dt = momentTz.tz(date,"Asia/Kolkata");
    return dt.startOf('day').toDate();
    //return moment(date).startOf('day').toDate();
    /*date = new Date(date);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;*/
};

exports.getMonthStart = function (date) {
    date = new Date(date);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    date.setDate(1);
    return date;
};

exports.getYesterdayMorning = function() {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    return exports.getMorning(date);
};

exports.gethhmmaa = function(date) {
    date = new Date(date);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
};

exports.getFormattedDateTime = function(date) {
    date = new Date(date);
    return exports.getDDMMYYYY(date) + ' ' + exports.gethhmmaa(date);
};

exports.getMMDDYYYY = function() {
    var dateNow = new Date(),
        dMonth, dDate;
    if (dateNow.getMonth() < 9) {
        dMonth = "0" + (dateNow.getMonth() + 1).toString();
    } else {
        dMonth = (dateNow.getMonth() + 1).toString();
    }
    if (dateNow.getDate() < 10) {
        dDate = "0" + dateNow.getDate().toString();
    } else {
        dDate = dateNow.getDate().toString();
    }
    return dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
};

exports.getYYYYMMDDHHMM = function(date) {
    date = new Date(date);
    var dMonth, dDate;
    if (date.getMonth() < 9) {
        dMonth = "0" + (date.getMonth() + 1).toString();
    } else {
        dMonth = (date.getMonth() + 1).toString();
    }
    if (date.getDate() < 10) {
        dDate = "0" + date.getDate().toString();
    } else {
        dDate = date.getDate().toString();
    }
    var hours = date.getHours();
    hours = hours < 10 ? '0' + hours : hours;
    var minutes = date.getMinutes();
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return date.getFullYear().toString() + dMonth + dDate + hours + minutes;
};

exports.getDateDifferece = function(start, end, format) {
    start = new Date(start);
    end = new Date(end);
    var dur = end.getTime() - start.getTime();
    if(format === 'day')
    	return (dur/1000/60/60/24);
    if (format === 'hour')
		return (dur/1000/60/60);
	if (format === 'minute')
		return (dur/1000/60);
	if (format === 'second')
		return (dur/1000);
	return (dur);
};

exports.getDuration = function(start, end) {
    start = new Date(start);
    end = new Date(end);
    var dur = end.getTime() - start.getTime();
    return exports.getDurationFromSecs(parseInt(dur / 1000));
};

exports.getDurationFromSecs = function(dur) {
    var days = parseInt(dur / (60 * 60 * 24));
    var hours = parseInt((dur % (60 * 60 * 24)) / (60 * 60));
    var mins = parseInt((dur % (60 * 60)) / 60);
    days = days > 0 ? days + ' D ' : '';
    hours = hours > 0 ? hours + ' H ' : '';
    mins = mins > 0 ? mins + ' M ' : '';
    return days + hours + mins;
};

exports.getDurationFromSecs2 = function(dur) {
    var days = parseInt(dur / (60 * 60 * 24));
    var hours = parseInt((dur % (60 * 60 * 24)) / (60 * 60));
    var mins = parseInt((dur % (60 * 60)) / 60);
    var secs = parseInt(dur % (60));
    days = days > 0 ? days + ' days ' : '';
    hours = hours > 0 ? hours + ' hours ' : '';
    mins = mins > 0 ? mins + ' mins ' : '';
    secs = secs + ' secs';
    return days + hours + mins + secs;
};
exports.getDMYHMSMs = function (d) {
	d = new Date(d);
	return d.getFullYear() +"-"+
		("00" + (d.getMonth() + 1)).slice(-2) + "-" +
		("00" + d.getDate()).slice(-2) + " " +
		("00" + d.getHours()).slice(-2) + ":" +
		("00" + d.getMinutes()).slice(-2) + ":" +
		("00" + d.getSeconds()).slice(-2) +"."+
		("00" + d.getMilliseconds()).slice(-3);
};

exports.calDays = function (toDate,fromDate){

	if(!(toDate && fromDate))
		return 0;
	if(toDate === fromDate)
		return 0 ;
	toDate = setHours(toDate, 0, 0, 0);
	fromDate = setHours(fromDate, 0, 0, 0);
	if(!(toDate instanceof Date && fromDate instanceof Date))
		return 'Invalid Date' ;

	return Math.round((toDate-fromDate)/day);

	function setHours(date, hour, minutes, second){
		return new Date(new Date(date).setHours(hour, minutes, second))
	}
};

exports.calDetentionDays = function (toDate, fromDate) {

    if(new Date(toDate).toString() === "Invalid Date" || new Date(fromDate).toString() === "Invalid Date")
        return false;

    toDate = new Date(toDate);
    fromDate = new Date(fromDate);

	if(!(toDate instanceof Date && fromDate instanceof Date))
		return false;
	let totday = (toDate - fromDate)/day;

	if(totday > 0 && totday <= 1)
		totday -= 1;

    return Math.floor(Math.abs(totday));

};

exports.calDays2 = function (toDate,fromDate){

	if(!(toDate && fromDate))
		return 0;

	toDate = setHours(toDate, 0, 0, 0);
	fromDate = setHours(fromDate, 0, 0, 0);
	if(!(toDate instanceof Date && fromDate instanceof Date))
		return 'Invalid Date' ;

	return Math.floor((toDate-fromDate)/day);

	function setHours(date, hour, minutes, second){
		return new Date(new Date(date).setHours(hour, minutes, second))
	}
};

exports.proposedDate = function (fromDate,StandardTime){
	fromDate = new Date(fromDate).getTime();
	return moment(fromDate+(24*60*60*1000*StandardTime));
};
exports.monthName = function (d) {
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	d = new Date(d);
	return months[d.getMonth()] ;

};
exports.year = function (y) {
	y= new Date(y);
	return y.getFullYear();
};

exports.dateFilter = function (	from, to, allowedDays) {
	from = new Date(new Date(from).setHours(0, 0, 0, 0));
	to = new Date(new Date(to).setHours(23, 59, 59, 999));
	if (allowedDays && (to - from)>allowedDays * 24 * 3600000) {
		return new Error("Date range can't be more than "+ allowedDays+ " days.");
	}
	return {
		$gte: from, $lte: to
	}
};

exports.getUniqueCustomer = function(obj) {

	let aData = [];
	Array.isArray(obj.gr) && obj.gr.forEach(oItem => {
		// if (!oItem._id)
		// 	return;
		let flag = false;

		if (oItem.customer && oItem.customer.name) {
			if (aData.length)
				aData.find(o => {
					if (o.toLowerCase() == (oItem.customer.name).toLowerCase()) {
						flag = true;
					}
				});
			if (!flag)
				aData.push(oItem.customer.name);
		}

	});

	return aData.join(', ');
}
