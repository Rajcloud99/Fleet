//a. return noOfOrders & averageBillValue

router.post('/calOrders', async function (req, res) {
	try {
		var data = await Order.aggregate([
			{
				$project:{
					userId : 1,
					subtotal :1
				}
			},
			{
				"$lookup": {
					from: "users",
					localField: "userId",
					foreignField: "_id",
					as: "userId"
				}
			},
			{

				"$unwind": {
					"path": "$userId",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$project:{
					"userId" : "$userId.userId",
					"name" : "$userId.name",
					"subtotal": 1
				}
			},
			{
				"$group": {
					"_id": "$userId",
					"noOfOrders": {$sum:1},
					"averageBillValue": {$avg: "$subtotal"},
					name : {$last:"$name"},
					userId : {$last:"$userId"}
				}
			},
			{
				$project:{
					userId:1,
					name:1,
					noOfOrders:1,
					averageBillValue: {$floor : "$averageBillValue"}

				}
			}
		]).toArray();
		return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
		});
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});




// b. update userTable

router.put('/updateUser/:_id', async function (req, res) {
	try {
		for (const obj of req.body.user) {
			noOfOrders : req.body.noOfOrders
			await User.updateOne({_id: otherUtil.arrString2ObjectId(obj._id)}, { $set: noOfOrders });
		}
		return res.status(200).json({
			success: true,
			message: "Successfully updated"
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		})
	}
});
