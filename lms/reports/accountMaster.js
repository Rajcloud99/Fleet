let moment = require("moment");
let account = {};

account.headers = ["NAME", "LEDGER", "TYPE", "GROUP", "BRANCH", "BALANCE","Opening Bal","OB Date", "Is Group", "Bill Track", "Linking", "Level","ACCOUNT ID", "Creation"];

account.transform = function (obj) {
	try {
		let row = {};
		row['NAME'] = obj.name || 'NA';
		row['LEDGER'] = obj.ledger_name || 'NA';
		row['TYPE'] = (obj.group && obj.group.join && obj.group.join(', ')) || 'NA';
		row['GROUP'] = obj.type && obj.type.name || 'NA';
		row['BRANCH'] = (obj.branch && obj.branch.name) || 'NA';
		row['Is Group'] = obj.isGroup ? 'YES' : 'NO';
		row['BALANCE'] = obj.balance || 0;
		row['Opening Bal'] = obj.opening_balance || 0;
		row['OB Date'] = obj.opn_bal_date ? moment(new Date(obj.opn_bal_date)).format("DD-MM-YYYY") : "NA";
		row['ACCOUNT ID'] = obj.accountId || 'NA';
		row['Bill Track'] = obj.billAc ? 'YES' : 'NO';
		row['Linking'] = obj.linkedTo && obj.linkedTo.name || 'NA';
		row['Level'] = obj.lvl || 'NA';
		row['Creation'] = obj.created_at || 'NA';
		return row;
	} catch (e) {
		throw new Error(e);
	}
};

function round(num){
	return Math.round(num * 100)/100 || 0;
}

function formatDate(date){
	return date && moment(date).format('DD-MM-YYYY') || '';
}

module.exports = account;
