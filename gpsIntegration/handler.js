var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));

module.exports = async function (data) {
	 switch (data.type) {
		case 'message':
			switch (data.msg.request) {
				case "live_feed":
            const oSave = {
              ...data.msg.data,
              location: {
                type: 'Point',
                coordinates: [data.msg.data.lng, data.msg.data.lat]
              }
            };
             if(data.msg.data.lng && data.msg.data.lat){
				await Promise.all([
					RegisteredVehicle.updateMany({device_imei: data.msg.data.device_id}, {$set: {
						odometer: data.msg.data.odo,
						gpsData: oSave
          },
          $unset:{gpsVendor:1}
        })
				]);
			 }
					break;
        case 'alarm_request':
          var geofence_points = await RegisteredVehicle.aggregate([
            {
              $match: {
                device_imei: data.msg.data.device_id,
                status: 'In Trip'
              }
            },
            {
              $graphLookup: {
                from: 'tripv2',
                startWith: '$_id',
                connectFromField: 'vehicle',
                connectToField: 'vehicle',
                restrictSearchWithMatch: {
                  status: {
                    $nin: ['Trip ended', 'Trip cancelled']
                  }
                },
                as: 'trip_doc'
              }
            },
            {
              $unwind: '$trip_doc'
            },
            {
              $unwind: '$trip_doc.gr'
            },
            {
              $project: {
                'trip_doc.gr': true,
                'trip_doc.geofence_points': true
              }
            },
            {
              $lookup: {
                from: 'tripgrs',
                localField: 'trip_doc.gr',
                foreignField: '_id',
                as: 'trip_doc.gr_doc'
              }
            },
            {
              $unwind:'$trip_doc.gr_doc'
            },
            {
              $project: {
                'trip_doc.gr_doc.geofence_points': true,
                'trip_doc.geofence_points': true
              }
            },
            {
              $group: {
                _id: '$_id',
                'trip_geofence_points': {
                  $first: '$trip_doc.geofence_points'
                },
                'gr_geofence_points': {
                  $push: '$trip_doc.gr_doc.geofence_points'
                }
              }
            },
            {
              $addFields: {
                'gr_geofence_points': {
                  $reduce: {
                    input: "$gr_geofence_points",
                    initialValue: [],
                    in: {
                      $concatArrays: ["$$value", "$$this"]
                    }
                  }
                }
              }
            },
            {
              $project: {
                'combined_geofence_points': {
                  $concatArrays: ['$trip_geofence_points', '$gr_geofence_points']
                }
              }
            },
            {
              $group: {
                _id: null,
                'geofence_points': {
                  $push: '$combined_geofence_points'
                }
              }
            },
            {
              $addFields: {
                'geofence_points': {
                  $reduce: {
                    input: "$geofence_points",
                    initialValue: [],
                    in: {
                      $concatArrays: ["$$value", "$$this"]
                    }
                  }
                }
              }
            }
          ]);
          receiver.sendMessage(geofence_points);
        	break;
			}
			break;
		case 'device_connected':

			break;
		case 'device_disconnected':

			break;
		case 'heartbeat':
			// winston.info('got hb ack', data.msg);
			break;
	}
};
