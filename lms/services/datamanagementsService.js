const Datamgnt = commonUtil.getModel('datamanagements');
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

module.exports = {
	find,
	upsertdms,
	findOneRec,
	removeByDmsImage,
	upsertTags
};

const ALLOWED_FILTER = ['from', 'to', '_id', 'sch'];

function constructFilters(oQuery) {
	let oFilter={};

	for(i in oQuery){
		if(otherUtil.isAllowedFilter(i, ALLOWED_FILTER)){
			if (i === 'from') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
			} else if(i === '_id') {
				oFilter['linkToId'] = {
					$in: Array.isArray(oQuery[i]) ? oQuery[i].map(o => o.toString()) : [oQuery[i].toString()]
				};
			} else if(i === 'sch') {
				oFilter['linkTo'] = {
					$in: Array.isArray(oQuery[i]) ? oQuery[i].map(o => o.toString()) : [oQuery[i].toString()]
				};
			} else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}

async function upsertdms(req, aFileValid, res) {
	try {
		let savedDms;
		req.body._id = req.params._id;
		let oData = await findOneRec(req.body, req.user);
		if (oData && oData._id) {
			let oFileProp = {};
			for (let m = 0; m < aFileValid.length; m++) {
				oFileProp = {
					name: aFileValid[m].name,
					size: aFileValid[m].size || 10,
					category: aFileValid[m].category,
					scanVal:aFileValid[m].scanVal,
					date: new Date()
				};

				savedDms = await Datamgnt.updateOne({linkToId: req.params._id, linkTo: req.body.modelName},
					{
						$set: {
							last_modified_at: new Date()
						},
						$push: {
							files: oFileProp
						}
					}
				);
			}
		} else {
			let oSaveData = {
				clientId: req.query.clientId,
				linkToId: req.params._id,
				linkTo: req.body.modelName,
				files: aFileValid
			};
			savedDms = await Datamgnt.create(oSaveData);
		}
		return savedDms;
	} catch (e) {
		throw e;
	}
}

async function findOneRec(body, user) {
	try {
		let ofind = {
			clientId: user.clientId,
			linkToId: body._id,
			linkTo: body.modelName
		};
		let oData = await Datamgnt.findOne(ofind).lean();
		return oData;
	} catch (e) {
		throw e;
	}
}

async function find(body, user) {
	try {

		let oFilter = constructFilters(body);
		oFilter.clientId = user.clientId;

		let oData = await Datamgnt.find(oFilter).lean();
		return oData;
	} catch (e) {
		throw e;
	}
}

async function removeByDmsImage(dmsId, body, user) {
	try {
		let objToUpdate = {
			$pull: {
				files: {
					name: body.name
				}
			}
		};

		let ofind = {
			clientId: user.clientId,
			linkToId: body._id,
			linkTo: body.modelName
		};

		return await Datamgnt.update(ofind, objToUpdate);
	} catch (e) {
		throw e;
	}
}

async function upsertTags(req, oFileProp, res) {
	try {
		let savedDms;
		req.body._id = req.params._id;
		let oData = await findOneRec(req.body, req.user);
		if (oData && oData._id) {
			for(let f=0;f<(oData.files && oData.files.length);f++){
                if(oData.files[f].category == oFileProp.category){
					oData.files[f].scanVal = oFileProp.scanVal;
				}
			}

				savedDms = await Datamgnt.updateOne({linkToId: req.params._id, linkTo: req.body.modelName},
					{
						$set: {
							last_modified_at: new Date(),
							files: oData.files
						}
					}
				);
			}
		 else {
			let oSaveData = {
				clientId: req.query.clientId,
				linkToId: req.params._id,
				linkTo: req.body.modelName,
				files: [oFileProp]
			};
			savedDms = await Datamgnt.create(oSaveData);
		}
		return savedDms;
	} catch (e) {
		throw e;
	}
}
