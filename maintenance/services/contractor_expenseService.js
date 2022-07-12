/**
 * Created by Nipun on 5/29/2017.
 */

var ContractorExpense=promise.promisifyAll(commonUtil.getMaintenanceModel('contractor_expense'));

module.exports.findContractorExpense = function(oQuery, next) {
    ContractorExpense.findAsync(oQuery)
        .then(function (available) {
            return next(null, available);
        })
        .catch(function (err) {
            return next(err);
        });
};

module.exports.updateContractorExpense = function (contractorExpenseArray, next) {
    var bulkUpdate = ContractorExpense.collection.initializeOrderedBulkOp();

    for(var index=0; index<contractorExpenseArray.length; index++){
        var expenseData=JSON.parse(JSON.stringify(contractorExpenseArray[index]));
        if(expenseData._id){//this means data is already stored in db
            //update the latest body provided
            var id=contractorExpenseArray[index]._id;
            delete expenseData._id;
            var updation={};
			updation.deleted=expenseData.deleted;
			updation.last_modified_at=new Date();
			bulkUpdate.find({_id:mongoose.Types.ObjectId(id)}).update({$set:updation});
            //bulkUpdate.update({_id:contractorExpenseArray[index]._id},{$set:expenseData});

        }
        else{
            //add as a new record
			var data=new ContractorExpense(expenseData);
			var data2insert=JSON.parse(JSON.stringify(data));
			delete data2insert._id;
			data2insert.created_at=new Date();
			bulkUpdate.insert(data2insert);
        }
    }
    bulkUpdate.execute(function(err, updatedDBResponse) {
        console.log(err);
        var response=JSON.parse(JSON.stringify(updatedDBResponse));
        return next(err,response);
    });
}

