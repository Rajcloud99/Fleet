let Directory = commonUtil.getModel('directory');
const serverSidePage = require('../../utils/serverSidePagination');
module.exports = {
	findDirectoryAggr
};

const ALLOWED_FILTER = ['company_name', 'first_name', "mobile1", "email1", "city", "state"];
function constructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'first_name') {
				//oFilter[i] = new RegExp(`${oQuery[i].trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}`, 'im');
				oFilter[i] = new RegExp('^'+oQuery[i].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
			} else if (i === 'company_name' || i === 'state' || i === 'city' || i === 'email1') {
				oFilter[i] = new RegExp('^'+oQuery[i].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
			}else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function findDirectoryAggr(query, next) {
	let oFil = constructFilters(query);
	query.aggQuery = [{$match: oFil}];
	let aDirectory = await serverSidePage.requestData(Directory, query);
	return aDirectory;
}
