var TableAccess = promise.promisifyAll(commonUtil.getModel('tableAccess'));
var User = promise.promisifyAll(commonUtil.getModel('user'));

module.exports.findTableAccessJson = function(query, next) {
    //query.deleted = false;
    TableAccess.findAsync(query)
        .then(function(data) {
            data = JSON.parse(JSON.stringify(data));
            return next(null, data);
        })
        .catch(next)
};

module.exports.findTableAceessByQuery = function(query, next) {
    //query.deleted = false;
    TableAccess.findAsync(query)
        .then(function(data) {
            data = JSON.parse(JSON.stringify(data));
            return next(null, data);
        })
        .catch(next)
};

/*"userId": otherUtil.arrString2ObjectId(payload.userId),
                "clientId": clientId,
                "table": payload.userId,
                "pages": payload.pages*/

module.exports.upsertTableAceess = async function(payload,user,res) {
    try {
		let TableVal;
		if(payload._id) {
            TableVal = await TableAccess.findOneAndUpdate({_id:payload._id},
            {$set: payload }, {new: true  });
        }
        else
        {
            payload.userId = user._id;
            payload.clientId = user.clientId;

            const newTA = new TableAccess(payload);
			TableVal = await newTA.save();
		}
		return res.status(200).json({
			status: 'Success',
			message: 'Table Setting Saved successfully',
			data: TableVal
		});
	} catch (e) {
		throw e;
	}

};

module.exports.updateUserTableConfig = async function(req,id,res) {
	try {
		let TableVal;
		if(id && req.body.visible) {
			let oUpsertTable = [];
			oUpsertTable.push({
				updateOne: {
					filter: {
						_id:otherUtil.arrString2ObjectId(id),
					},
					update: {
						$set: {visible:req.body.visible,
							access: req.body.access,
							configs:req.body.configs},
					},
					upsert: true
				}
			});

			await TableAccess.bulkWrite(oUpsertTable);
			TableVal = await TableAccess.find({userId:otherUtil.arrString2ObjectId(req.user._id)});

			return res.status(200).json({
				status: 'Success',
				message: 'Table Setting Visibility Saved Successfully',
				data: TableVal
			});
		}
		else{
			return res.status(500).json({
				status: 'Fail',
				message: 'Table Setting Visibility NOT Updated',
				data: TableVal
			});
		}

	} catch (e) {
		throw e;
	}

};

module.exports.updateTableConfig = async function(payload,user,res) {
    try {
        let TableVal;
 		if(payload._id && payload.pages) {

           let oUpsertTable = [];
            oUpsertTable.push({
                updateOne: {
                    filter: {
                        table:payload.table,
                        pages:payload.pages,
                        clientId:user.clientId,
                        userId:otherUtil.arrString2ObjectId(payload._id),
                    },
                    update: {
                        $set: {visible: payload.visible, access: payload.access,
							   configs:payload.configs},
                    },
                    upsert: true
                }
            });

            await TableAccess.bulkWrite(oUpsertTable);
			TableVal = await TableAccess.find({userId:otherUtil.arrString2ObjectId(payload._id)});

            return res.status(200).json({
                status: 'Success',
                message: 'Table Setting Visibility Saved Successfully',
                data: TableVal
            });
        }
        else{
            return res.status(500).json({
                status: 'Fail',
                message: 'Table Setting Visibility NOT Updated',
                data: TableVal
            });
        }

	} catch (e) {
		throw e;
	}

};

module.exports.findTableAccessById = function(userId,next) {
    try {
        if(userId) {
            TableAccess.findAsync({userId:userId})
            .then(
                function(TAcc) {
                    //console.log("TAcc",TAcc);
                    if (!TAcc) return next(null, false);
                    return next(null, TAcc);
                }
            )
            .catch(
                function(err) {
                    return next(err);
                }
            );
        };
    } catch (e) {
        throw e;
    }
};

module.exports.findTableAccessFilter = async function(tableId,next) {
	if (tableId){
		// let TAcc = await TableAccess.findAsync({_id: otherUtil.arrString2ObjectId(tableId)}, {access: 1});
		// return TAcc;

		TableAccess.findAsync({_id: otherUtil.arrString2ObjectId(tableId)}, {visible:1, access: 1})
			.then(function(data) {
				data = JSON.parse(JSON.stringify(data));
				return next(null, data);
			})
			.catch(next)
	}
};

module.exports.getAllTableCol = async function(body,res) {
	try {
		let data;
		data = await TableAccess.find({clientId:body.clientId, userId:otherUtil.arrString2ObjectId(body._id)});
		return res.status(200).json({
			status: 'Success',
			message: 'Table Column Setting Found.',
			data: data
		});

	} catch (e) {
		throw e;
	}
};

