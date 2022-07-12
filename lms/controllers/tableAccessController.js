var router = express.Router()
var authUtil = commonUtil.getUtil('auth-util')
var tableAccess = promise.promisifyAll(commonUtil.getService('tableAccess'))


router.get('/getAll', function(req, res) {
    try{
        tableAccess.findTableAccessJsonAsync(req.body,next)
}
    catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.get('/getAllTableCol', function(req, res) {
	try{

		if(!req.query._id){
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'User not found.',
				'data': e
			})
		}

		tableAccess.getAllTableColAsync(req.query, res);

	}
	catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/upsert', function(req, res, next) {
    if(!req.user._id)
    {
        return res.status(500).json({
            'status':'ERROR',
            'message': 'User not found.'
        })
    }
    // Upsert - if exist then update else insert...
    tableAccess.upsertTableAceessAsync(req.body, req.user, res)
            .then (function(data){
                return res.status(200).json({
                    'status': 'OK',
                    'message': 'Updated Successfully.',
                    'data': data
                });
             })
             .catch(function (err) {
                return res.status(err.statusCode || 500).json({
                    'status': 'ERROR',
                    'message': err.message || err.toString()
                });
            });

});

router.post('/updateTableConfig', function(req, res, next) {

	try {

		if (!req.body._id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'User not found.'
			});
		}

		if (!req.body.pages) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Page name not found.'
			});
		}

		if (!req.body.table) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Table name not found.'
			});
		}

		if (!req.body.visible) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Visible column not found.'
			});
		}

		if (!req.body.access) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Access column not found.'
			});
		}

		tableAccess.updateTableConfigAsync(req.body, req.user, res)
			.then(function (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Updated Successfully.',
					'data': data
				});
			})
			.catch(function (err) {
				return res.status(err.statusCode || 500).json({
					'status': 'ERROR',
					'message': err.message || err.toString()
				});
			});
	} catch(err){
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		});
	}
});

router.put('/updateUserTableConfig/:id', function(req, res, next) {

	try {
		if (!req.params.id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'User not found.'
			})
		}

		if (!req.body.visible) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Column not found.'
			})
		}

		tableAccess.updateUserTableConfigAsync(req, req.params.id, res)
			.then(function (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Updated Successfully.',
					'data': data
				});
			})
			.catch(function (err) {
				return res.status(err.statusCode || 500).json({
					'status': 'ERROR',
					'message': err.message || err.toString()
				});
			});
	} catch(err){
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		});
	}

});


module.exports = router
