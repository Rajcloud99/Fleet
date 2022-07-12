const GR = commonUtil.getModel('tripGr');

module.exports = function (FPASchema) {

	FPASchema.statics.add = async function(data) {
		let fpa = await this.create(data);
		let grUpdate = await GR.updateMany({_id:{$in:fpa.items.map(x=>x.gr)}},{
			$set:{ fpaBill:fpa._id },
			$addToSet:{ fpaBills:fpa._id }
		});
		return Promise.resolve(fpa);
	};

};
