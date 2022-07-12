/**
 * Created by nipun on 28/12/17.
 */

var router = express.Router();


var ClientConf = promise.promisifyAll(commonUtil.getModel('clientConfig'));

router.get("/get", function (req, res, next) {
	ClientConf.findAsync()
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Clients Configs",
				"data": data,
			});
		}).catch(next)
});


module.exports = router;
