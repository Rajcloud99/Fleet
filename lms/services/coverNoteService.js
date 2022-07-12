let CoverNote = commonUtil.getModel('coverNote');
let Bill = commonUtil.getModel('bills');

const ALLOWED_FILTER =['_id', 'cnNo', 'number', 'billingParty', 'poNo', 'date'];

module.exports = {
	find,
	findAggr,
	add,
	edit
};

function constructFilters(oQuery) {
	let oFilter={};

	for(i in oQuery){
		if(otherUtil.isAllowedFilter(i,ALLOWED_FILTER)){
			if (i === 'from_date') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
			} else if (i === 'to_date') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
			} else if(i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}

function find(query, next) {
	let reqQuery = query;
	reqQuery.queryFilter = constructFilters(query);
	reqQuery.populate = ['bills', 'billingParty', 'customer'];
	reqQuery.sort = {
		'bills.billNoInt': 1
	};
	otherUtil.findPagination(CoverNote, reqQuery, next);
}

async function findAggr(query) {
	const coverNotes = [];
	query.no_of_docs = query.no_of_docs || 10;
	query.skip = query.skip || 1;
	const coverNoteCursor = CoverNote.aggregate([
		{ $match: constructFilters(query) },
		{ $skip: (query.no_of_docs * query.skip) - query.no_of_docs },
		{ $limit: query.no_of_docs },
		// { $lookup: { from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty' } },
		// { $unwind: { path: '$billingParty', preserveNullAndEmptyArrays: true } },
		// { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customer' } },
		// { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'bills', localField: 'bills', foreignField: '_id', as: 'bills' } },
		{ $unwind: { path: '$bills', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'billingparties', localField: 'bills.billingParty', foreignField: '_id', as: 'bills.billingParty' } },
		{ $unwind: { path: '$bills.billingParty', preserveNullAndEmptyArrays: true } },
		{ $unwind: { path: '$bills.items', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'tripgrs', localField: 'bills.items.gr', foreignField: '_id', as: 'bills.items.gr' } },
		{ $unwind: { path: '$bills.items.gr', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'consignor_consignees', localField: 'bills.items.gr.consignee', foreignField: '_id', as: 'bills.items.gr.consignee' } },
		{ $unwind: { path: '$bills.items.gr.consignee', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'registeredvehicles', localField: 'bills.items.gr.vehicle', foreignField: '_id', as: 'bills.items.gr.vehicle' } },
		{ $unwind: { path: '$bills.items.gr.vehicle', preserveNullAndEmptyArrays: true } },
		{ $group: {
				_id: "$_id",
				bills: { $push: "$bills" },
				// billingParty: { $first: "$billingParty" },
				unNo: { $first: "$unNo" },
				// customer: { $first: "$customer" },
				cnNo: { $first: "$cnNo" },
				date: { $first: "$date" },
				clientId: { $first: "$clientId" },
				remark: { $first: "$remark" },
				poNo: { $first: "$poNo" },
				systemDate: { $first: "$systemDate" },
				lastModified: { $first: "$lastModified" },
				user: { $first: "$user" },
			}},
		{ $project: {
			bills: true,
			unNo: true,
			cnNo: true,
			date: true,
			clientId: true,
			remark: true,
			poNo: true,
			billingParty: true,
			customer: true,
			systemDate: true,
			lastModified: true,
			user: true,
		} }
	])
		.allowDiskUse(true)
		.cursor({batchSize: 1000})
		.exec();
	await coverNoteCursor.eachAsync(function(data) {
		data.bills = data.bills.reduce((acc, curr, i) => {
			let isFound = acc.find(doc => doc.billNo === curr.billNo);
			if(isFound) {
				if (Array.isArray(isFound.items)) {
					isFound.items.push(curr.items);
					return acc;
				} else {
					isFound.items = [isFound.items];
					isFound.items.push(curr.items);
					return acc;
				}
			} else {
				curr.items = [curr.items];
				return [...acc, curr];
			}
		}, []);
		coverNotes.push(data);
	});
	return { data: coverNotes };
}

async function add(query) {

	try {

		query.unNo = await genCoverNoteUniqueIndexNumber({
			clientId: query.clientId
		});

		let coverNote = new CoverNote(query);
		let savedCoverNote = await coverNote.save();

		await Bill.updateMany({_id: otherUtil.arrString2ObjectId(query.bills)}, {
			$set: {
				"coverNote": {
					unNo: query.unNo,
					cnNo: query.cnNo,
					poNo: query.poNo,
					coverNoteId: savedCoverNote._id
				}
			}
		});

		return savedCoverNote;

	}catch (e) {
		console.log(e);
		return false;
	}
}

async function edit(query) {

	try {

		let foundCoverNote = await CoverNote.findOne({
			_id: query._id
		});

		// // validating that the id have same billing party and all id's are valid
		// let foundBill = await Bill.find({
		// 	_id: {
		// 		$in: query.bills
		// 	},
		// 	billingParty: {
		// 		$eq: foundCoverNote.billingParty
		// 	}
		// });
		//
		// if(foundBill.length !== query.bills.length){
		// 	console.log('Bill Not found or Bill with different billing party');
		// 	return false;
		// }

		// fetching bill's that are removed from the coverNote group
		let diffId = [];
		foundCoverNote.bills.forEach(s => {
			if(!(query.bills.indexOf(s)+1))
				diffId.push(s);
		});

		if(diffId.length){
			await Bill.updateMany({
				_id: otherUtil.arrString2ObjectId(diffId)
			},{
				$unset:{
					coverNote: 1
				}
			})
		}

		foundCoverNote.set({
			cnNo: query.cnNo,
			poNo: query.poNo,
			remark: query.remark,
			date: query.date,
			lastModified: query.lastModified,
			bills: query.bills
		});
		let updatedCoverNote = await foundCoverNote.save();
		await Bill.updateMany({_id: otherUtil.arrString2ObjectId(query.bills)}, {
			$set: {
				"coverNote": {
					unNo: updatedCoverNote.unNo,
					cnNo: updatedCoverNote.cnNo,
					poNo: updatedCoverNote.poNo,
					coverNoteId: updatedCoverNote._id
				}
			}
		});

		return updatedCoverNote;

	}catch (e) {
		console.log(e);
		return false;
	}
}

async function genCoverNoteUniqueIndexNumber({clientId}) {

	try{

		let uniqueCnNo = await CoverNote.find({
			clientId,
			'unNo': {$exists: true}
		}, {'unNo': 1}).sort({'unNo': -1}).limit(1);

		if (Array.isArray(uniqueCnNo) && uniqueCnNo.length > 0) {
			uniqueCnNo = uniqueCnNo[0].unNo + 1;
		} else
			uniqueCnNo = 1;

		return uniqueCnNo;

	}catch (e) {
		console.log(e);
	}
}
