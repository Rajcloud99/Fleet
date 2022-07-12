/**
 * Created by Nipun on 4/12/2017.
 */
var ToolIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('toolIssue'));
var Parts = promise.promisifyAll(commonUtil.getMaintenanceModel('parts'));
var async = require('async');
var NO_OF_DOCS =15;

module.exports.addToolIssue = function(dataBody,next) {
    idUtil.generateToolSlipNumberAsync({clientId:dataBody.clientId})
        .then(function (slipnumber){
            dataBody.issue_slip_number= slipnumber;
            var ToolData = new ToolIssue(dataBody);
            ToolData.saveAsync()
                .then(function(savedData) {
                    return next(null, savedData);
                })
                .catch(function(err) {
                    return next(err);
                });
        }).catch(next);
};

module.exports.findToolIssue = function(oQuery, next) {
        ToolIssue.findAsync(oQuery)
            .then(function (available) {
                return next(null, available);
            })
            .catch(function (err) {
                return next(err);
            });
};

module.exports.updateToolIssueById = function(id,reqBody,next) {
    idUtil.generateToolSlipNumberAsync({clientId:reqBody.clientId})
        .then(function (slipnumber){
            reqBody.return_slip_number= slipnumber;
            ToolIssue.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
                .then(function(updated){
                    return next(null, updated);
                }).catch(function (err) {
                return next(err);
            });
        }).catch(next);
};

module.exports.deleteToolIssueById = function(data,next) {
    var filter = {};
    filter._id= data._id;
    var deleted ={};
    deleted.status=true;
    deleted.deleted_by_employee_name=data.name;
    deleted.deleted_by_employee_code=data.userId;
    deleted.reason=data.reason;
    Task.findByIdAndUpdateAsync(filter,{$set:{deleted:deleted}})
        .then(function(removed) {
            winston.info("removed task ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing task:" + err);
            return next(err);
        });
};