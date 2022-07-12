const router = express.Router();
const Stationery = commonUtil.getModel('stationery');
const StationeryService = commonUtil.getService('stationery');
const stationeryFormatParser = otherUtil.stationeryFormatParser;

router.post('/get', function(req, res, next) {

	StationeryService.getStationery(req.body,function (err, data) {
		if(err)
			return res.status(500).json({
				'status': 'ERROR',
				'message': err.toString()
			});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.',
			'data': data
		})
	});
});

router.post('/getCode/:_id', async function(req, res, next) {
	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide _id'
		})
	}
	try {
		let stationery = await Stationery.find ({
			_id: req.params._id,
			clientId: req.user.clientId
		});
		if (!stationery || !(stationery = stationery[0])) {
			return res.status (500).json ({
				'status': 'ERROR',
				'message': 'Stationery not found!'
			})
		}
		if (stationery.autoGenerate) {
			if (req.body.number) {
				return res.status (500).json ({
					'status': 'ERROR',
					'message': 'Invalid Request!\n' +
					'Stationery is of auto generate type but number found!'
				})
			}
			let formattedSeq;
			if(stationery.current <= stationery.max){
				formattedSeq = stationeryFormatParser(stationery.format, stationery.current);
				if(formattedSeq === 'Invalid'){
					return res.status(500).json({
						status: "ERROR",
						message: 'Invalid Format generated!'
					});
				} else {
					return res.status(200).json({
						status: "OK",
						message: 'Format generated!',
						data: formattedSeq
					});
				}
			}
			else {
				return res.status(500).json({
					status: "ERROR",
					message: 'Bill Book completely used!'
				});
			}
		} else {
			let data = await StationeryService.validateNumberAsync(req.user.clientId, req.params._id, req.body.number);
			if(data) {
				return res.status(200).json({
					status: "OK",
					message: 'Format generated!',
					data: data
				});
			}
		}
	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
});

router.post('/unUse', async function (req, res) {
	try {
		let x = await StationeryService.unUseStationery(req.body);
		return res.status(200).json({
			status: "OK",
			message: "DONE"
		})
	} catch (err){
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		})
	}
});

router.post('/add', async function(req, res, next) {
	try {
		req.body.current = req.body.min;
		req.body.autoGenerate = req.body.category === 'Bill';
		let billBook = new Stationery(req.body);
		let savedBillBook = await billBook.save();
		return res.status (200).json ({
			'status': 'OK',
			'message': 'Data Saved successfully.',
			'data': savedBillBook
		})
	} catch (err){
		return res.status (500).json ({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
});

router.put('/update/:_id', async function(req, res, next) {
    if (!req.params._id) {
        return res.status(500).json({
            'status': 'ERROR',
            'message': 'Please provide _id'
        })
    }
    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
    }
    try {
    	let billBook = await Stationery.find ({
			_id: req.params._id,
			clientId: req.user.clientId
		});
    	if(billBook && billBook[0]){
    		if( billBook[0].current !==  billBook[0].min)
				return res.status (500).json ({
					'status': 'ERROR',
					'message': "Bill book can't be updated!"
				});
			let updatedBillBook = await Stationery.update ({
				_id: req.params._id,
				clientId: req.user.clientId
			}, {$set: req.body});
			if(updatedBillBook)
				return res.status (200).json ({
					'status': 'OK',
					'message': 'Data updated.',
					'data': updatedBillBook
				});
			else
				return res.status (500).json ({
					'status': 'ERROR',
					'message': 'Bill book not updated!'
				})
		} else {
			return res.status (500).json ({
				'status': 'ERROR',
				'message': 'Bill book not found!'
			})
		}

	}catch (err){
		return res.status (500).json ({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
});

router.delete('/remove/:_id', async function(req, res, next) {
    if (!req.params._id) {
        return res.status(500).json({
            'status': 'ERROR',
            'message': 'Please provide _id'
        })
    }
	try {
		let deletedBill = await Stationery.remove ({_id: req.params._id, clientId: req.user.clientId});
		if (deletedBill) {
			return res.status (200).json ({
				'status': 'OK',
				'message': 'Deleted'
			})
		} else
			return res.status (500).json ({
				'status': 'ERROR',
				'message': 'Not Deleted'
			})
	} catch (err){
		return res.status (500).json ({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
});

module.exports = router;
