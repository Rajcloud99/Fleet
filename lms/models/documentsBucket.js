var mongoose = require('mongoose');
var DocumentsSchema = new mongoose.Schema({},{ strict: false });
module.exports =  mongoose.model("Documents", DocumentsSchema, "DocumentsBucket.files" );
