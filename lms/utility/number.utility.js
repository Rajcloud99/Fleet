function isFloat(n){
	return Number(n) === n && n % 1 !== 0;
}
module.exports.isFloat = isFloat;

module.exports.isNumber = function (num) {
	return !isNaN(num) && typeof num === 'number' && num || false;
};
