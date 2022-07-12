var mongoose = require ('mongoose');

var ModelMasterSchema = new mongoose.Schema(
    {
        "manufacturer":String,
        "model":String,
        "axle_type":String,
        "fuel_tank":Number,
        "length":Number,
        "width":Number,
        "height":Number,
        "capacity":Number,
        "image_url":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('ModelMaster', ModelMasterSchema);
