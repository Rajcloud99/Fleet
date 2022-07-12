var City = commonUtil.getModel('city');

function constructFilter(q, req) {
	var f = {};
	f.$or = [
		{clientId:q.clientId},
		{clientId: {$exists: false}}
	];
	if(req.clientConfig && req.clientConfig.config && req.clientConfig.config && req.clientConfig.config.master && req.clientConfig.config.master.cityState && req.clientConfig.config.master.cityState.onlyClientRegCity){
		f = {clientId:q.clientId};
	}
	for(let key in q) {
		if(q.hasOwnProperty(key) && ['c', 's', 'p', 'd','zone'].indexOf(key) !== -1) {
			if (key === 'c' || key === 's' || key === 'd' || key === 'zone') {
				// f[key] = { $regex: `.*${q[key]}.*`, $options: 'i'};
				f[key] = { $regex: `^${q[key]}.*`, $options: 'i'};
			} else {
				f[key] = q[key];
			}
		}
	}
	return f;
}

module.exports.get = async function(req) {
	try {
		req.body.no_of_docs = req.body.no_of_docs || 10;
		req.body.skip = req.body.skip || 1;
		req.body.clientId = req.user.clientId;
		if(req.body.download)
			req.body.no_of_docs = 5000;

		const oFilter = constructFilter(req.body, req);
		const cities = await City.find(
			oFilter,
			{},
			{
				sort:{c:1},
				skip:(req.body.no_of_docs * req.body.skip) - req.body.no_of_docs,
				limit:req.body.no_of_docs
			}).lean();
		return cities;
	} catch (e) {
		throw e;
	}
};

module.exports.autosuggest = async function(str) {
	try {
		const cities = await City.find(
			{ $text: { $search: str, $caseSensitive: false, $diacriticSensitive: false } },
			{ score: { $meta: "textScore" } }
		).sort({ score: { $meta: "textScore" } }).lean();
		return cities;
	} catch (e) {
		throw e;
	}
};

module.exports.upsert = async function(payload, req) {
	try {
		let city;
		if(payload._id) {
			payload.lastModifiedAt = new Date();
			payload.lastModifiedBy = req.user.full_name;
			city = await City.findByIdAndUpdate(payload._id, { $set: payload }, { new: true }).lean();
		} else {
			payload.createdAt = new Date();
			payload.createdBy = req.user.full_name;
			city = await City.findOneAndUpdate({
				c: new RegExp('^' + (payload.c.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')
			}, { $set: payload }, { new: true, upsert: true }).lean();
		}
		return city;
	} catch (e) {
		throw e;
	}
};

module.exports.removeCity =  async function(query) {
	if (Object.keys(query).length) {
		let savedData = await City.remove(query);
		if (savedData) {
			return savedData;
		} else {
			return null;
		}
	} else {
		return null;
	}
};
