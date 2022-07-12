'use strict';

const GPSData = require('../models/gpsData');

module.exports.findGPSDataByTime = (vehicle_no, isoDateString, opts = {window: 1}) => {
  if(!vehicle_no) throw new Error('Vehicle no. is a required field');
  var timeInMillis = (isoDateString && new Date(isoDateString).getTime()) || Date.now();
  return (
    GPSData.find({
			vehicle_no: vehicle_no,
      datetime: {
				$lte: timeInMillis,
        $gte: (timeInMillis - (1000 * 60 * 60 * 24 * opts.window)), // 1 Day Window period by default
      }
    })
    .sort({datetime: -1})
    .limit(1)
  );
};
