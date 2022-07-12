const mongoose = require('mongoose');
const TableConfiguration = promise.promisifyAll(commonUtil.getModel('tableConfiguration'));

module.exports.addTableConfiguration = async function(body) {
	try{
          let obj = {
          	  user:body.user,
			  clientId:body.clientId,
			  table:body.table,
			  page:body.page,
		  }
		  const data = await TableConfiguration.updateOne(obj,{$set:body},{upsert:true});
	}catch(e){
		console.log(e);
		throw new Error('Error in Account Balance fun..');
	}
};

module.exports.getTableConfiguration = async function(body) {
	try{
          let data = await TableConfiguration.findOne({user:mongoose.Types.ObjectId(body.user),clientId:body.clientId,
			  table:body.table});
          if(data){
          	return data;
		  }else{
          	let adminData = await TableConfiguration.findOne({clientId:body.clientId,clientAdmin:true,
				clientSuperAdmin:false,table:body.table});
          	if(adminData){
          		return adminData;
			}else{
				let superAdminData = await TableConfiguration.findOne({clientId:body.clientId,clientAdmin:false,
					clientSuperAdmin:true,table:body.table});
				return superAdminData;
			}
		  }
	}catch(e){
		console.log(e);
		throw new Error('Error in Account Balance fun..');
	}
};








