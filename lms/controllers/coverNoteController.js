let router = express.Router();
let coverNoteService = promise.promisifyAll(commonUtil.getService('coverNote'));
let Bill = commonUtil.getModel('bills');

router.post('/get', function(req, res, next) {
	coverNoteService.findAsync(req.body)
		.then(function(data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found.',
				'data': data
			});
		})
		.catch(next);
});

router.post('/add', async function(req, res, next) {

	// checking mandatory fields

	try{

		let cnNo = typeof req.body.cnNo === 'string' && req.body.cnNo || false;
		let remark = typeof req.body.remark === 'string' && req.body.remark || '';
		let poNo = typeof req.body.poNo === 'string' && req.body.poNo || '';
		let date = typeof req.body.date === 'string' && req.body.date || Date.now();
		let bills = Array.isArray(req.body.bills) && req.body.bills.length > 0 && req.body.bills || false;
		let billingParty = typeof req.body.billingParty === 'string' && req.body.billingParty || false;
		let customer = typeof req.body.customer === 'string' && req.body.customer || false;

		if(cnNo && bills && billingParty && customer){

			let foundBill = await Bill.find({
				_id: {
					$in: bills
				},
				// 'billingParty': {
				// 	$eq: billingParty
				// },
				'coverNote.unNo': {
					$exists: false
				}
			});

			if(foundBill.length !== bills.length){
				return res.status(500).json({
					'status': 'OK',
					'message': 'Cover note already generated for Some or All Bill'
				})
			}

			let cnobj = {
				cnNo,
				poNo,
				remark: remark || '',
				systemDate: Date.now(),
				date: date,
				user: req.user.full_name,
				clientId: req.user.clientId,
				bills,
				billingParty,
				customer
			};

			let data = await coverNoteService.add(cnobj);
			if (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data added.',
					'data': data
				})
			} else {
				return res.status(500).json({
					'status': 'OK',
					'message': 'Something went wrong'
				})
			}
		}else{
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'All Mandatroy fields are not Provided',
			})
		}

	} catch (e) {
		next(e)
	}
});

router.post('/edit/:_id', async function(req, res, next) {

	// checking mandatory fields

	try{

		let coverNoteId = req.params._id || false;
		let cnNo = typeof req.body.cnNo === 'string' && req.body.cnNo || false;
		let remark = typeof req.body.remark === 'string' && req.body.remark || '';
		let poNo = typeof req.body.poNo === 'string' && req.body.poNo || '';
		let date = typeof req.body.date === 'string' && req.body.date || Date.now();
		let bills = Array.isArray(req.body.bills) && req.body.bills.length > 0 && req.body.bills || false;
		let billingParty = typeof req.body.billingParty === 'string' && req.body.billingParty || false;

		if(coverNoteId){

			if(cnNo || bills){

				let cnobj = {
					_id: coverNoteId,
					cnNo,
					remark,
					poNo,
					date,
					billingParty,
					lastModified: {
						date: Date.now(),
						user: req.user.full_name
					},
					bills
				};

				let data = await coverNoteService.edit(cnobj);
				if (data) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'Data Updated Successfully',
						'data': data
					})

				} else {
					return res.status(500).json({
						'status': 'OK',
						'message': 'Something went wrong'
					})
				}
			}else{
				return res.status(200).json({
					'status': 'Success',
					'message': 'Updated Successfully',
				});
			}

		}else{
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'All Mandatroy fields are not Provided',
			});
		}

	} catch (e) {
		next(e)
	}
});


module.exports = router;
