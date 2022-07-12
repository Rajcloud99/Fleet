var mongoose = require('mongoose');

var GPSData = new mongoose.Schema({
  acc: Boolean,
  address: String,
  device_id: Number,
  odo: Number,
  vehicle_no: [String],
  voltage: Number,
  status: String,
  speed: Number,
  positioning_time: Number,
  location_time: Number,
  lat: Number,
  lng: Number,
  io_state: String,
  datetime: Number,
  course: Number,
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
}, {strict: false});

GPSData.index({vehicle_no: 1, datetime: 1}); // Compound Index
GPSData.index({location: '2dsphere'});

module.exports = mongoose.model('GPSData', GPSData);
