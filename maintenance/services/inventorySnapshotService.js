/**
 * Created by Nipun on 8/14/2017.
 */

var InventorySnap = promise.promisifyAll(commonUtil.getMaintenanceModel('inventorySnapshot'));
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));

module.exports.saveSnapshot= function(clientId,next){
	Inventory.aggregateAsync([{$match:{"clientId":clientId,"remaining_quantity":{$gt:0}}},
		{$group:{_id: "$spare_code",
			"inv_id":{$push:"$_id"},
			"entryId":{$push:"$entryId"},
			"remaining_quantity":{$sum: "$remaining_quantity"},
			"spare_code":{$first:"$spare_code"},
			"spare_name":{$last:"$spare_name"},
			"rate_per_piece":{$push:"$rate_per_piece"},
			"rate_inc_tax":{$push:"$rate_inc_tax"},
			"category_name":{$first:"$category_name"},
			"category_code":{$first:"$category_code"},
			"uom":{$last:"$uom"}}},
		{$project:{_id:0}}])
		.then(function(data){
			if(data){
				var d={};
				d.clientId=clientId;
				d.data=data;
				var d2save=new InventorySnap(d);
				d2save.saveAsync()
					.then(function (savedData){
						return next(null,"Snapshot saved successfully!!");
					})
					.catch(function (err){
						return next(err);
					})
			}
		}).catch(next);
};

module.exports.get= function(query,next){

	InventorySnap.findOneAsync(prepareFilter(query))
		.then(function (data) {
			return next(null,data);
		})
		.catch(function (err) {
			return next(err);
		})
};

module.exports.getDates = function (clientId,next) {
	InventorySnap.findAsync({clientId:clientId},{created_at:1})
		.then(function (data) {
			data=JSON.parse(JSON.stringify(data));
			var dates=[];
			for(i=0; i<data.length; i++){
				dates.push(new Date(data[i].created_at));
			}
			return next(null,dates);
		})
		.catch(next)
}

function prepareFilter(query) {
	var filter={};
	var startDate = new Date(query.date);
	startDate.setSeconds(0);
	startDate.setHours(0);
	startDate.setMinutes(0);
	var endDate = new Date(query.date);
	endDate.setSeconds(59);
	endDate.setHours(23);
	endDate.setMinutes(59);
	filter.clientId=query.clientId;
	filter.created_at={};
	filter.created_at.$lt=endDate;
	filter.created_at.$gte=startDate;
	return filter;
}
