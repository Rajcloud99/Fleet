/**
 * Created by kamal on 17/02/19.
 */

function serverSidePaginationClass(oUtils) {
	//put any default configs
}
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
serverSidePaginationClass.paginationServer =  function (Model, reqQuery, next = () => {}) {
	return new Promise((resolve, reject) => {
		let lDoc = reqQuery.batchSize || 300;
		let no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : lDoc+1;
		let autoPagination = true;
		if(no_of_documents>lDoc){
			no_of_documents = lDoc+1;
		}
		if(no_of_documents<=lDoc){
			autoPagination = false;
		}
		let no_of_pages = 1, count = 0;
		let countCursor, paginatedData = [], allData = [];
		if (reqQuery.countQuery) {
			reqQuery.countQuery.push({$group: {_id: null, count: {$sum: 1}}});
			countCursor = Model.aggregate(reqQuery.countQuery);
		} else if (reqQuery.aggQuery) {
			reqQuery.aggQuery.push({$group: {_id: null, count: {$sum: 1}}});
			countCursor = Model.aggregate(reqQuery.aggQuery);
		} else {
			next(true, {message: 'aggregation query not found'});
		}
		countCursor.options = {allowDiskUse: true};
		let t1 = new Date();
        //console.log('start req ',t1);
		countCursor.exec(async function (err, countArr) {
			if (err) {
				next(err);
				return reject(err);
			}
			if (countArr.length > 0) {
				count = countArr[0].count;
				if (count / no_of_documents > 1) {
					no_of_pages = Math.ceil(count / no_of_documents);
				} else {
					no_of_pages = 1;
				}
			}
			if(reqQuery && reqQuery.aggQuery){
				for(let j=0;j<reqQuery.aggQuery.length;j++){
					if(reqQuery.aggQuery[j].hasOwnProperty('$skip') && reqQuery.aggQuery[j]['$skip']){
						autoPagination = false;
					}
					if(reqQuery.aggQuery[j].hasOwnProperty('$limit') &&  reqQuery.aggQuery[j]['$limit'] <= 300){
						autoPagination = false;
					}
				}
			}
			if(autoPagination){
				for (let i = 1; i <= no_of_pages; i++) {
					if(reqQuery && reqQuery.aggQuery){
						for(let j=0;j<reqQuery.aggQuery.length;j++){
							if(reqQuery.aggQuery[j].hasOwnProperty('$skip')){
								reqQuery.aggQuery[j]['$skip'] = (i-1)*no_of_documents;
							}
							if(reqQuery.aggQuery[j].hasOwnProperty('$limit')){
								reqQuery.aggQuery[j]['$limit'] = no_of_documents;
							}
						}
					}
					reqQuery.skip = undefined;
					reqQuery.no_of_docs = no_of_documents;
					if(i>1){
						delete reqQuery.sort;
					}
					paginatedData = await serverSidePaginationClass.requestData(Model, reqQuery, callback);
					allData = allData.concat(paginatedData);
					let minDiff = (new Date().getTime() - t1.getTime())/60000;
					console.log(i,' min ',minDiff,reqQuery.calledFrom);
					if(minDiff > 2){
					  console.log(i,no_of_pages);
					}
				}
			}else{
				reqQuery.skip = undefined;
				reqQuery.no_of_docs = no_of_documents;
				allData = await serverSidePaginationClass.requestData(Model, reqQuery, callback);
			}

			var objToReturn = {};
			objToReturn.data = allData;
			objToReturn.pages = no_of_pages;
			objToReturn.count = count;
			next(null, objToReturn);
			return resolve(objToReturn);
		})
	})
};

serverSidePaginationClass.requestData = async function (Model, query, callback) {
		return new Promise((resolve, reject) => {
			let datacursor,skip_docs,no_of_documents = query.no_of_docs;

			if (query.project && Object.keys(query.project).length) {
				query.aggQuery.push({$project:query.project});
			}
			if(query.noSort){
				//
			}else if(query.sort && Object.keys(query.sort).length){
				query.aggQuery.push({$sort:query.sort});
			}
			datacursor = Model.aggregate(query.aggQuery).cursor({batchSize: 3000 });

			datacursor.options = { allowDiskUse: true,batchSize: 3000 };
			if (query && query.sort) {
				datacursor.sort(query.sort);
			}
			if (query.skip) {
				skip_docs = (query.skip - 1) * no_of_documents;
				datacursor.skip(parseInt(skip_docs));
			}
            if(no_of_documents){
				datacursor.limit(parseInt(no_of_documents));
			}

			datacursor.exec(function (err, routes) {
				if (err) {
					return reject(err);
				}
				let data = JSON.parse(JSON.stringify(routes));
				return resolve(data);
			});
		});
};

function callback(err,resp){
	if(err){
		console.log(err.toString());
	}
}

module.exports = serverSidePaginationClass;
