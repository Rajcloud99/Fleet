const router = require('express').Router();
const liveTrackService = commonUtil.getService('liveTrack');
let Async = require('async');

/** POST /api/liveTrack/get - Get trips */
router.route('/get').post(liveTrackService.get);

/** POST /api/liveTrack/add - Create new live track */
router.route('/add').post(liveTrackService.add);

/** POST /api/liveTrack/update - Create update live track */
//router.route('/update').post(liveTrackService.update);


router.delete("/delete/:_id",async function(req,res,next) {

    try{

        if(!req.params._id)
             throw new Error('No id provided to detete for address location.');
        
        let fdData = await liveTrackService.findId(req.params._id, {_id: 1});
        
        if(!fdData._id)
            throw new Error('Record not found to delete the address location');

        await liveTrackService.deleteliveTrackId(req.params._id);
        
        return res.status(200).json({
            'status': 'OK',
            'message': 'Address Location Deleted Successfully.'
        });
    }
    catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});




module.exports = router;
