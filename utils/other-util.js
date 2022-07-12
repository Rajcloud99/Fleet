/**
 * Created by manish on 30/6/16.
 */

var fs = require("fs");

function otherUtilClass(oUtils) {
	//put any default configs
}
//replaces non alphabetical characters, multiple spaces to single spaces
otherUtilClass.replaceNonAlpha = function(input){
    return input.replace(/\W+/g, " ")
};


//get numers from string
otherUtilClass.getNoFromStr = function(str){
	var nstr="";
	if(str){
		str.match(/\d+/g).map(function(n){
			nstr = nstr+n;
		});
		return nstr;
	}else{
		return nstr;
	}
};

function deg2rad(deg) {
	return deg * (Math.PI / 180)
}

otherUtilClass.getDistanceInKm = function (lat1, lon1, lat2, lon2) {
	let R = 6371; // Radius of the earth in km
	let dLat = deg2rad(lat2 - lat1);  // deg2rad below
	let dLon = deg2rad(lon2 - lon1);
	let a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2)
	;
	let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	let d = R * c; // Distance in km
	return d;
};

//replaces non alphabetical characters, multiple spaces to single spaces
otherUtilClass.replaceNonAlphaWithSpace = function(input){
    return input.replace(/[^0-9a-zA-Z]/g, '');
};

otherUtilClass.replaceFillerDistrict = function (input){
    return replaceNonAlpha(input
        .replace(/new |old |east |west |north |south |navi |central |lower |upper |chhota |dakshina |city /gi, ""));
};

// This should work both there and elsewhere.
otherUtilClass.isEmptyObject = function (obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
};

otherUtilClass.getDD_MM_YYYY = function (dateInp){
    var dateNow = dateInp || new Date();
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
    return  dDate + "-"+dMonth+"-"+ dateNow.getFullYear().toString();
};

otherUtilClass.getDD_MM_YY = function (dateInp){
    var dateNow = dateInp || new Date();
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
    dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
    return  dDate + "-" + dMonth +"-"+ dYear;
};

otherUtilClass.getDDMMYY = function (dateInp){
    var dateNow = dateInp || new Date();
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
    dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
    return  dDate + dMonth + dYear;
};

otherUtilClass.isAllowedFilter  = function(sFilter,aAllowedFilter){
	var isAllowed = false;
	if(aAllowedFilter.indexOf(sFilter)>=0){
		isAllowed =  true;
	}
	return isAllowed;
 };

otherUtilClass.isAllowedParam = function(sParam,aAllowedParams){
	var isAllowedP = false;
	if(aAllowedParams.indexOf(sParam)>0){
		isAllowedP =  true;
	}
	return isAllowedP;
 };

otherUtilClass.validateAdminKey = function(passedEncrypedKey){
  if (passedEncrypedKey && decrypt(passedEncrypedKey)===config.secure_admin_key){
    return true;
  }else{
    return false;
  }
};

otherUtilClass.generateDateForXMLJson = function(dateParam){
    dateParam = dateParam ? new Date(dateParam) : new Date();
    if(dateParam.getMonth()<9){
        dMonth = "0" + (dateParam.getMonth() +1).toString();
    }else{
        dMonth = (dateParam.getMonth()+1).toString();
    }
    if(dateParam.getDate()<10){
        dDate =  "0" + dateParam.getDate().toString();
    }else{
        dDate =  dateParam.getDate().toString();
    }
    return  dateParam.getFullYear().toString()+dMonth+dDate ;
};

otherUtilClass.validateSuperAdmin = function (req,res) {
    if(req.body.clientId==config.super_admin_id || req.query.clientId==config.super_admin_id){
        return false;
    }
    else{
        return true;
    }
}

otherUtilClass.validateClientAdmin = function (req,res) {
    if(req.user.clientAdmin && !(req.body.clientId==config.super_admin_id || req.query.clientId==config.super_admin_id)){
        return false;
    }
    else{
        return true;
    }
}

otherUtilClass.validateAdmin = function (req,res) {
    if(req.user.clientAdmin || req.user.clientId == config.super_admin_id){
        return false;
    }
    else{
        return true;
    }
}

otherUtilClass.isAccountEnabled = function (req) {
	return (req
		&& req.clientConfig
		&& req.clientConfig.config
		&& req.clientConfig.config.master
		&& req.clientConfig.config.master.showAccount) || false;
};

otherUtilClass.mergeArray =function () {
	var arr=[];
	for(var i=0; i<arguments.length; i++){
		for (var j=0; j<arguments[i].length; j++){
			arr.push(arguments[i][j]);
		}
	}
	return arr;
};

otherUtilClass.isBSON = function (str) {
	return typeof str === 'string' && str.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i) || false;
}

otherUtilClass.searchRegex = function (str) {
	return new RegExp('^' + str.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
}

otherUtilClass.arrString2ObjectId = (obj) => {
	if(Array.isArray(obj)){
		return obj.map(curr => mongoose.Types.ObjectId(curr))
	}else
		return mongoose.Types.ObjectId(obj);
};

//var TripExpense = promise.promisifyAll(commonUtil.getModel("tripExpenses"));

/**
 *
 *
 * @param Model: model on which query need to be performed
 * @param query:
 * 				{
 * 					skip: Number, eg: 1 for first page and n for nth page
 * 					no_of_doc:Number, eg:10 to get 10 rows of data in 1 page
 * 					all:BooleanString, eg: "true" to get all data without pagination
 * 					sort: sorting Object
 * 					aggQuery:Filters in format that can be passed in aggregate function of mongoose
 * 				}
 * @param next: callback function on success sends
 * 					{
 * 						data = array of data;
						pages = no_of_pages;
						count = total documents;
 * 					}
 */
otherUtilClass.pagination = function (Model, query, next = () => {}) {
	return new Promise((resolve, reject) => {
		var countCursor,datacursor,skip_docs;
		var no_of_documents = query.no_of_docs || 20;
		if (query.project) {
			query.aggQuery.push({$project:query.project});
		}

		datacursor = Model.aggregate(query.aggQuery);
		datacursor.options = { allowDiskUse: true };
		if(query.countQuery){
			query.countQuery.push({ $group: { _id: null, count: { $sum: 1 } } });
			countCursor = Model.aggregate(query.countQuery);
		}else{
			query.aggQuery.push({ $group: { _id: null, count: { $sum: 1 } } });
			countCursor = Model.aggregate(query.aggQuery);
		}
		countCursor.options = { allowDiskUse: true };
		if (query.skip) {
			skip_docs = (query.skip - 1) * no_of_documents;
			datacursor.skip(parseInt(skip_docs));
		}
		countCursor.exec(function (err, countArr) {
			if (err) {
				next(err);
				return reject(err);
			}
			if (countArr.length > 0) {
				var count = countArr[0].count;
				var no_of_pages;
				if (count / no_of_documents > 1) {
					no_of_pages = Math.ceil(count / no_of_documents);
				} else {
					no_of_pages = 1;
				}
				if (query && !query.all) {
					datacursor.limit(parseInt(no_of_documents));
				} else {
					datacursor.limit(parseInt(count));
				}
				if (query && query.sort) {
					datacursor.sort(query.sort);
				}
				datacursor.exec(function (err, routes) {
					if (err) {
						next(err);
						return reject(err);
					}
					var data = JSON.parse(JSON.stringify(routes));
					var objToReturn = {};
					objToReturn.data = data;
					objToReturn.pages = no_of_pages;
					objToReturn.count = count;
					next(null, objToReturn);
					return resolve(objToReturn);
				});
			} else {
				var objToReturn = {};
				objToReturn.data = [];
				objToReturn.pages = 0;
				objToReturn.count = 0;
				next(null, objToReturn);
				return resolve(objToReturn);
			}
		});
	});
};

let NO_OF_DOC = 10;

let isDeepFilter = function(queryFilter,allowedRef){
	for(let i in queryFilter){
		if(allowedRef.hasOwnProperty(i)){
			return true;
		}
	}
	return false;
};

let doDeepFilter = function (response,reqQuery){
	let no_of_documents = response.data.length;
	let oRes = {pages:1};
	oRes.data = response.data.filter(function (item) {
		for(let i in reqQuery.allowedRef){
			if(!item[reqQuery.allowedRef[i]] || item[reqQuery.allowedRef[i]] === null || (item[reqQuery.allowedRef[i]].length === 0)){
				return false;
			}
		}
		return true;
	});
	oRes.count = oRes.data.length;
	if(reqQuery.all !== "true"){
		no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOC;
		if(no_of_documents>NO_OF_DOC){
			no_of_documents = NO_OF_DOC;
		}
		if(oRes.count/no_of_documents>1){
			oRes.pages = oRes.count/no_of_documents;
		}
	}
	if(reqQuery && reqQuery.skip ){
		let skip_docs = (reqQuery.skip-1)*no_of_documents;
		oRes.data = oRes.data.splice(skip_docs,no_of_documents);
	}
	return oRes;

};

/**
 *
 *
 * @param Model: model on which query need to be performed
 * @param reqQuery:
 * 				{
 * 					skip: Number, eg: 1 for first page and n for nth page
 * 					no_of_doc:Number, eg:10 to get 10 rows of data in 1 page
 * 					all:BooleanString, eg: "true" to get all data without pagination
 * 					sort: sorting Object
 * 					queryFilter: Filters in format that can be passed in find function of mongoose
 * 					allowedRef: Object
 * 				}
 * @param next: callback function on success sends
 * 					{
 * 						data = array of data;
						pages = no_of_pages;
						count = total documents;
 * 					}
 */
otherUtilClass.findPagination = function (Model, reqQuery, next) {
	var queryFilters = reqQuery.queryFilter;
	var no_of_pages = 1;
	Model.countAsync(queryFilters)
		.then(function(count){
			reqQuery.count = count;
			reqQuery.isDeepFilter = (reqQuery.allowedRef && isDeepFilter(reqQuery.queryFilter,reqQuery.allowedRef));
			var cursor = Model.find(queryFilters);
			var no_of_documents;
			if(reqQuery.all == true || reqQuery.all == "true" || reqQuery.isDeepFilter){
				no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOC;
				if(count/no_of_documents>1){
					no_of_pages = count/no_of_documents;
				}
				cursor.limit(parseInt(no_of_documents));
			}else{
				no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOC;
				if(count/no_of_documents>1){
					no_of_pages = count/no_of_documents;
				}
				cursor.limit(parseInt(no_of_documents));
			}

			if(reqQuery && reqQuery.skip && !reqQuery.isDeepFilter && (reqQuery.all != "true" || reqQuery.all != true) ){
				var skip_docs = (reqQuery.skip-1)*no_of_documents;
				cursor.skip(parseInt(skip_docs));
			}
			if(reqQuery && reqQuery.populate && Array.isArray(reqQuery.populate)){
				for(let pop of reqQuery.populate){
					cursor.populate(pop);
				}
			}
			if(reqQuery && reqQuery.sort){
				cursor.sort(reqQuery.sort);
			}
			cursor.exec(
				function(err,response) {
					if (err) {
						return next(err);
					}
					let data = response;
					let objToReturn = {};
					objToReturn.data = data;
					objToReturn.pages = no_of_pages;
					objToReturn.count = reqQuery.count;
					if(reqQuery.isDeepFilter){
						return next(null,doDeepFilter(objToReturn,reqQuery));
					}else {
						return next(null, objToReturn);
					}
				}
			)
		})
		.catch(
			function(err) {
				return next(err);
			}
		);
};

otherUtilClass.pickPropertyFromObject = function (obj, keys) {
	return keys.map(k => ((k in obj) && (obj[k]!==undefined)) ? {[k]: obj[k]} : {})
		.reduce((res, o) => Object.assign(res, o), {});
};

otherUtilClass.validateMathForGpsPO = function (poData) {
	return true;
};

otherUtilClass.validateItemsForGpsSO = function (soData) {
	return true;
};

otherUtilClass.validateMathForGpsPO = function (soData) {
	return true;
};

otherUtilClass.removeStaticNonUpdatableKeys = function (doc) {
	delete doc._id;
	delete doc.created_at;
	delete doc.created_by_employee_code;
	delete doc.created_by_name;
	delete doc.created_by;
	delete doc.last_modified_at;
};

otherUtilClass.bindBranchFilter = function(oQuery,key,aBranch){
	var aUserBranch = (aBranch && aBranch.length>0)? aBranch.map(a => a._id):[];
	aUserBranch = JSON.parse(JSON.stringify(aUserBranch));
	if(oQuery[key]){
		if(aUserBranch.indexOf(oQuery[key]) > -1 ){
			oQuery[key] = [oQuery[key]];
		}else {
			oQuery[key] = aUserBranch;
		}
	}else {
		if(aUserBranch.length>0){
			oQuery[key] = aUserBranch;
		}else {
			delete oQuery[key];
		}
	}
	return oQuery;
}

otherUtilClass.stationeryFormatParser = function(formant, currentPtr){
	let isValid;
	currentPtr+='';

	if((isValid = formant.match(/{\d{0,5}}/)) && isValid[0].length > 2){
		let numLength = Number(isValid[0].slice(1,-1)) - currentPtr.length;

		if(numLength < 0)
			return currentPtr;

		return formant.replace(isValid, Array(numLength).fill(0).join('')+currentPtr);
	}

	return 'Invalid';
};

otherUtilClass.getObjectProperty = function (obj, str){
	str = str.split('.').map( s => s.trim());
	let ptr = obj;
	let inc = 0;

	str.forEach(s => {
		if(typeof ptr !== 'undefined')
			ptr = ptr[s];
	});

	return ptr;
};

otherUtilClass.filterObject = function(obj, filterArr){

	let newObj = {};

	if(Array.isArray(filterArr))
		filterArr.forEach(key => obj[key] && Object.assign(newObj, obj[key]));
	else
		throw new Error('filter Parameter should be array');

	return newObj;
};

// object key sum
otherUtilClass.sumObjKey = function(obj){

		if(!obj)
			return 0;

		let sum = 0;

		for(let k in obj){
			if(obj.hasOwnProperty(k))
				sum+=(obj[k] || 0);
		}

		return sum;
};
//change vehicle no
otherUtilClass.stateReducer = function(vehRegNo) {
	let dig4;
	let remainingChars = vehRegNo.trim().replace(/\d{4}/, function (replacedStr) {
		dig4 = replacedStr;
		return '';
	});
	if(dig4){
		return dig4 + remainingChars;
	}else{
		return remainingChars;
	}
};

module.exports = otherUtilClass;
