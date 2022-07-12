var router = express.Router()
var authUtil = commonUtil.getUtil('auth-util')
var acService = promise.promisifyAll(commonUtil.getService('accessControl'))
var logsService = commonUtil.getService('logs');

router.get('/get', function(req, res, next) {
    return res.status(200).json({
        'status': 'OK',
        'message': 'Data found.',
        'data': req.access
    })
});

router.get('/getAll', function(req, res, next) {
    //authUtil.validateAdmin(req, res);
    acService.findAceessControlByQueryAsync(req)
        .then(function(data) {
            if (data && data[0]) {
                return res.status(200).json({
                    'status': 'OK',
                    'message': 'Data found.',
                    'data': data
                })
            } else {
                return res.status(200).json({
                    'status': 'OK',
                    'message': 'Nothing found.',
                    'data': []
                })
            }
        })
        .catch(next)
})

router.put('/update/:_id', function(req, res, next) {
    authUtil.validateAdmin(req, res)
    if (!req.params._id) {
        return res.status(500).json({
            'status': 'ERROR',
            'message': 'Please provide _id'
        })
    }
    if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
    }
    if(req.body.clientId)
		req.body.clientId = req.body.actualClientId ||req.body.clientId;


    acService.findAceessControlByQueryAsync({ _id: req.params._id })
    .then(function(accDate){
        acService.updateAccessControlByIdAsync(req.params._id, req.body)
            .then(function(data) {
                if (data) {

                        acService.findAceessControlByQueryAsync({ _id: req.params._id })
                        .then(function(accDateUp){
                        logsService.add('accessControl', {
                            uif: req.body.name,
                            category: 'Update',
                            nData: accDateUp[0],
                            oData: JSON.parse(JSON.stringify(accDate[0])),
                        }, req);

                        return res.status(200).json({
                            'status': 'OK',
                            'message': 'Data updated.',
                            'data': data
                        })

                    }).catch(next)

                } else {
                    return res.status(200).json({
                        'status': 'OK',
                        'message': 'Nothing updated.',
                        'data': null
                    })
                }
            })
            .catch(next)
    }).catch(next)
})

router.delete('/remove/:_id', function(req, res, next) {
    authUtil.validateAdmin(req, res)
    if (!req.params._id) {
        return res.status(500).json({
            'status': 'ERROR',
            'message': 'Please provide _id'
        })
    }

    acService.findAceessControlByQueryAsync({ _id: req.params._id })
    .then(function(accDate){
        acService.deleteAceessControlAsync(req.params._id, req.query.hardDelete)
            .then(function(message) {

                logsService.add('accessControl', {
                    uif: accDate[0].name,
                    category: 'delete',
                    nData: {},
                    oData: JSON.parse(JSON.stringify(accDate[0])),
                }, req);

                return res.status(200).json({
                    'status': 'OK',
                    'message': message
                })
            })
            .catch(next)
    }).catch(next)
})

module.exports = router
