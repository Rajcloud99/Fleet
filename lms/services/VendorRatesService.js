const VendorRates = commonUtil.getModel('VendorRates');

const add = (obj) => {
	const { clientId, vendorId: vendor, routes } = obj;
	return VendorRates.create({clientId, vendor, routes});
};

module.exports = {
	add
};
