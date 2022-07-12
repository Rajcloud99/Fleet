const BillBook = commonUtil.getModel('billBook');
const Stationary = commonUtil.getModel('billStationary');
let voucherService = commonUtil.getService('voucher');
let moneyReceiptService = commonUtil.getService('moneyReceipt');
const Branch = commonUtil.getModel('branch');
let GR = commonUtil.getModel('tripGr');
const BillingParty = commonUtil.getModel('billingparty');
const billingPartyService = commonUtil.getService('billingParty');
const moment = require('moment');

const ALLOWED_FILTER = ['_id', 'name', 'date', 'type', 'branch', 'auto', 'bookType', 'billingParty', 'clientId', 'range', 'fromDate', 'toDate', 'isLinked', 'deleted','dateType'];

module.exports = {
	find,
	add,
	genBookNo,
	genBookNoOfAuto,
	genNextAutoStationary,
	validateRange,
	unlinkBillBook,
};

function constructFilters(oQuery) {
	// let oFilter = {
	// 	deleted: {
	// 		$ne: true
	// 	}
	// };
	let oFilter = {};
	if(!oQuery.deletedKey === 'all' ){
		oFilter.deleted = false
	}

	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'fromDate') {
				let startDate = new Date(oQuery[i]);
				startDate.setHours(0, 0, 0);
				oFilter["$or"] = oFilter["$or"] || {};
				oFilter["$or"] = [{'created_at':{$gte:startDate}},{startDate:{$gte:startDate}}];
			} else if (i === 'toDate') {
				let endDate = new Date(oQuery[i]);
				endDate.setHours(23, 59, 59);
				oFilter["$or"] = oFilter["$or"] || {};
				oFilter["$or"] = [{'created_at':{$lte:endDate}},{endDate:{$lte:endDate}}];
			}
			else if (i === 'dateType') {
				let startDate = new Date(oQuery['fromDate']);
				startDate.setHours(0, 0, 0);
				let endDate = new Date(oQuery['toDate']);
				endDate.setHours(23, 59, 59);
				oFilter[oQuery[i]] = oFilter[oQuery[i]] || {};
				oFilter[oQuery[i]].$gte = startDate;
				oFilter[oQuery[i]].$lte = endDate;
				delete oFilter['$or'];
			}
			else if (i === 'branch') {
				oFilter[i] = {
					$elemMatch: {
						ref: oQuery[i]
					}
				};
			} else if (i === 'range') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					min: {
						$lte: oQuery[i]
					},
					max: {
						$gte: oQuery[i]
					}
				});
			}else if(oQuery[i] === 'centralize'){
				oFilter['centralize'] = {$eq: true}

			}else if(oQuery[i] === 'auto'){
				oFilter['auto'] = {$eq: true}
				oFilter['centralize'] = {$ne: true}

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
	console.log(reqQuery.queryFilter);
	reqQuery.populate = query.populate || [];
	otherUtil.findPagination(BillBook, reqQuery, next);
}

// it validated the book range min, max, that it shouldn't overlap with any other book of same gr type
// it returns the first book that's overlapping
async function validateRange(body, oQuery = {}) {

	let min = body.min;
	let max = body.max;
	let type = body.type;
	let clientId = body.clientId;
	let format = body.format;

	if (min && max && type && clientId && format) {

		format = new RegExp(format.replace(/{\d{0,5}}/, '__JACK__').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace('__JACK__', '\\{\\d{0,5}\\}'), 'i')

		return await BillBook.findOne({
			...oQuery,
			type,
			clientId,
			deleted: {
				$ne: true
			},
			format,
			$or: [
				{
					min: {
						$lte: min
					},
					max: {
						$gte: min
					}
				},
				{
					min: {
						$lte: max
					},
					max: {
						$gte: max
					}
				},
				{
					min: {
						$gte: min
					},
					max: {
						$lte: max
					}
				},
			]
		});

	} else
		throw new Error('Mandatory Feild are Required');
}

async function genNextAutoStationary(body) {

	let bookId = body.billBookId;
	let type = body.type;
	let clientId = body.clientId;
	let pageDate = body.backDate;
	let centralize = body.centralize;
	let schema = body.sch;
	let useDate = body.useDate;
	let inc = body.inc || 1;


	if ((centralize ? true : bookId) && type && clientId && schema) {

		let findQuery = {
			type,
			clientId,
			deleted: {
				$ne: true
			}
		};

		if(bookId && bookId[0]){
			findQuery._id =  {$in:bookId}
		}

		if(useDate) {
			findQuery['startDate'] = {
				$lte: new Date(useDate)
			};
			findQuery['endDate'] = {
				$gte: new Date(useDate)
			}
		}

		if(centralize)
			findQuery.centralize = centralize;

		if(body.auto)
			findQuery.auto = body.auto;

		let foundBook = await BillBook.findOne(findQuery, {format: 1, current: 1, min: 1, max: 1});

		if(schema === 'onBook') {

			if (!foundBook)
				throw new Error('Book Not Found');
			// check if last stationary of the book is unused then return that stationary
			foundBook.current += inc - 1;
			findQuery.unformattedBookNo = foundBook.current;
			if(findQuery.centralize || body.auto) {
				delete findQuery.centralize;
				delete findQuery.startDate;
				delete findQuery.endDate;
				delete findQuery._id;
				delete findQuery.auto;
				findQuery.billBookId = foundBook._id;
			}

			let foundStationary = await Stationary.findOne(findQuery).lean();

			if(foundStationary && foundStationary._id && (foundStationary.status === 'unused' || foundStationary.status === 'cancelled')){
				let newBookNo = genBookNoOfAuto(foundBook.format, foundBook.current, pageDate);
				foundStationary = await Stationary.findOneAndUpdate({_id: foundStationary._id}, {bookNo: newBookNo}, {new: true});
				return [foundStationary];
			}

			// book length validation
			if(foundBook.current && (foundBook.current + inc) > foundBook.max)
				throw new Error('Book Max limit Over');

            // generate next auto stationary
			let unformattedBookNo = (typeof foundBook.current === 'number' && !isNaN(foundBook.current)) && foundBook.current ? (foundBook.current + inc) : foundBook.min;
			let nextBookNo = genBookNoOfAuto(foundBook.format, unformattedBookNo, pageDate);

			if(!nextBookNo)
				throw new Error('Invalid Format');

				let savedStationary = await new Stationary({
				clientId,
				type,
				status: 'unused',
				billBookId: foundBook._id,
				bookNo: nextBookNo,
				unformattedBookNo: unformattedBookNo
			}).save();

			await foundBook.set({
				current: unformattedBookNo
			}).save();

			return [savedStationary];
		}

		if (foundBook && foundBook._id) {

			let toFind = {
				key: new RegExp('^' + genBookNoOfAuto(foundBook.format, 'regex', pageDate) + '$'),
				clientId,
				type
			};

			if (!toFind.key)
				throw new Error('Invalid Format');

			let counter = await genNextStationay(toFind, schema);

			counter = counter === false ? foundBook.min : counter;

			// book length validation
			if(counter && counter > foundBook.max)
				throw new Error('Book Max limit Over');

			return [{
				bookNo: genBookNoOfAuto(foundBook.format, counter, pageDate)
			}];

		} else
			throw new Error('Book Not Found');

	} else {
		throw new Error('Mandatory fields are required');
	}

	async function genNextStationay(toFind, fromSchema) {

		let bookNo;
		switch (fromSchema) {
			case 'vch': {

				let fd = await voucherService.findVoucherByQueryAsync({
					refNo: toFind.key,
					clientId: toFind.clientId,
					no_of_docs: 1,
					sort: {refNoInt: -1},
				}, {refNo: 1});

				bookNo = fd[0] && fd[0].refNo;
			}
				break;

			case 'cnote': {

				let fd = await moneyReceiptService.find({
					mrNo: toFind.key,
					clientId: toFind.clientId,
					no_of_docs: 1,
					sort: {_id: -1},
				}, {mrNo: 1});

				bookNo = fd && fd.data && fd.data[0] && fd.data[0].mrNo;
			}
				break;

			default:
				throw new Error('Next Not Defined');
		}

		if (bookNo)
			return Number(bookNo.match(toFind.key)[1]) + inc;
		else
			return false;
	}
}

function genBookNo(format = '18/19-{5}ABCD', num) {
	let regex = /{\d{0,5}}/;

	function isValid(format) {
		format = typeof format == 'string' && format.length > 0 && format || false;

		if (format)
			return !!format.match(regex);

		return false;
	}

	function _genrateBookNo(format, key) {

		if (!isValid(format) || !(typeof key == 'number' && key))
			return false;

		let noOfZero = Number(format.match(regex)[0].slice(1, -1));

		let zeros = false;
		if (noOfZero - (key + '').length >= 0)
			zeros = Array(noOfZero - (key + '').length).fill(0).join('');

		if (zeros === false)
			return false;

		return format.replace(regex, zeros + key);
	}

	return _genrateBookNo(format, num)
}

function genBookNoOfAuto(format = '18/19-{5}ABCD', num, date = new Date()) {

	let aAllowedAnnotation = [
		'{\\d{0,5}}',
		'{YYYY}',
		'{YY}',
		'{MMMM}',
		'{MMM}',
		'{MM}',
		'{DD}',
	];

	let regex = new RegExp(aAllowedAnnotation.join('|'), 'g');

	if (!isValidFormat() || (num != 'regex' && !addZeros()))
		return false;

	return _generateBookNo();

	function _generateBookNo() {
		return format.replace(regex, function (match) {
			if (match.match(aAllowedAnnotation[0]))
				return num != 'regex' ? num : `(\\d${match})`;
			else
				return moment(date).format(match.slice(1, -1));
		})
	}

	function isValidFormat() {
		format = typeof format == 'string' && format.length > 0 && format || false;

		if (format)
			return !!format.match(aAllowedAnnotation[0]);

		return false;
	}

	function addZeros() {
		if (!(typeof num == 'number' && num))
			return false;

		let noOfZero = Number(format.match(aAllowedAnnotation[0])[0].slice(1, -1));

		let zeros = false;
		if (noOfZero - (num + '').length >= 0)
			zeros = Array(noOfZero - (num + '').length).fill(0).join('');

		if (zeros === false)
			return false;

		num = zeros + num;

		return true;
	}
}

async function unlinkBillBook(billId) {
	try {
		let aFoundBillParty = await BillingParty.find({
			$or: [
				{"billBook.ref": billId},
				{"cnBook.ref": billId}
			]
		}, {_id: 1}).lean();
		if (aFoundBillParty && aFoundBillParty.length > 0) {
			for (bb = 0; bb < aFoundBillParty.length; bb++) {
				await BillingParty.updateOne({_id: aFoundBillParty[bb]._id}, {
					$pull: {
						"billBook": {ref: billId},
						"cnBook": {ref: billId}
					}
				});
			}
		}

		let aFoundBranch = await Branch.find({
			$or: [
				{"grBook.ref": billId},
				{"lsBook.ref": billId},
				{"crBook.ref": billId},
				{"refNoBook.ref": billId},
				{"mrBook.ref": billId},
				{"fpaBook.ref": billId}
			]
		}, {_id: 1}).lean();

		if (aFoundBranch && aFoundBranch.length > 0) {
			for (b = 0; b < aFoundBranch.length; b++) {
				await Branch.updateOne({_id: aFoundBranch[b]._id}, {
					$pull: {
						"grBook": {ref: billId},
						"lsBook": {ref: billId},
						"crBook": {ref: billId},
						"refNoBook": {ref: billId},
						"mrBook": {ref: billId},
						"fpaBook": {ref: billId},
					}
				});
			}
		}

		return true;

	} catch (e) {
		throw e;
	}
};

// it filter the stationary i.e. not present in db and save them
async function add(aStationary, req) {

	let foundStationary = await Stationary.find({bookNo: {$in: aStationary}}, {bookNo: 1}).lean();

	aStationary = aStationary.filter(s => !foundStationary.find(o => o.bookNo === s.bookNo));

	if (aStationary.length == 0)
		throw new Error('All the stationary are already defined');

	let billBookId = mongoose.Types.ObjectId();

	let stationaryItems = aStationary.map(bookNo => ({
		clientId: req.user.clientId,
		type: req.body.type,
		status: 'unused',
		billBookId,
		bookNo,
		created_at: Date.now()
	}));

	await Stationary.insertMany(stationaryItems, {ordered: true});

	await BillBook.create({
		type: req.body.type,
		name: req.body.name,
		startDate: req.body.startDate,
		endDate: req.body.endDate,
		clientId: req.user.clientId,
		user: req.user.full_name,
		_id: billBookId
	});

	return `${aStationary.length} Stationary Successfully Created with book Name ${req.body.name}`;
}


