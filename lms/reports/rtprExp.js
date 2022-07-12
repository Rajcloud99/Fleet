let moment = require("moment");
let rtprExp = {};

rtprExp.headers = ['S.No', /*'RT Date',*/"Vehicle No.", 'Driver', 'Trip Start', 'Trip End', 'Fleet', 'RT No.', 'Settlement Date', /*'Segment', 'Vehicle Type',*/ 'KM', 'Advance', 'Diesel', 'TT days', 'Expense', 'Expense/KM', 'Profit/Day', 'Border', 'Challan', 'Dala Commision', 'Total Diesel', 'Fixed', 'OK Time', 'Parking', 'Rajai', 'Repair', 'Roti', 'Service', 'Extra', 'MissPend', 'Fastag Toll Tax', 'Cash Toll Tax', 'Wages', 'Local Trip', 'Consumable store', 'Add Blue', 'Phone Expense', 'Suspense', 'Settlement By', 'Settlement Remark', 'Route', 'Audit Date', 'Audit By'];

rtprExp.transform = function (obj) {
	try {
		let getItem = obj.settlementObj.find((item)=> item.name == ' Guide Charges');
		if(getItem){
			let header1 = ['Guide Charges','Bilty Charges','Green tax','Washing' ,'Maintenance','Weighbridge Charges','Crain Charges' ]
			rtprExp.headers = [...(rtprExp.headers),...header1];
		}
		let row = {};
		let aExpenseType = [
			{key:"Diesel", value: 'dieselExp'},
			{key:'Border', value: 'border'},
			{key:'Challan', value: 'challan'},
			{key:'Dala Commision',value: "dCommision"},
			{key:'OK + Time', value:"okTime"},
			{key:'Fixed + Salary', value: "fixSal"},
			{key: "Parking", value: "parking"},
			{key:"Rajai", value: "rajai"},
			{key:"Repair", value: "repair"},
			{key:"Roti", value: "roti"},
			{key:"Service", value: "serviExp"},
			{key :"Extra", value:"extra"},
			{key: "Miscellaneous Pending", value: "mPending"},
			{key: "Fastag Toll Tax", value: "fToll"},
			{key:"Cash Toll Tax", value: "cToll"},
			{key:"Toll Tax", value: "tollExp"},
			{key: "Wages", value: "wages"},
			{key: "Local Trip", value: "lTrip"},
			{key: "Add Blue", value: "addBlue"},
			{key: "Consumable store", value: "cStore"},
			{key: "Phone Expense", value: "pExpense"},
			{key:"Guide Charges", value: "GuideCharges"},
			{key: "Bilty Charges", value: "BiltyCharges"},
			{key: "Green tax", value: "Gtax"},
			{key: "Washing", value: "Washing"},
			{key: "Maintenance", value: "Maintenance"},
			{key: "Weighbridge Charges", value: "WeighbridgeCharges"},
			{key: "Crain Charges", value: "CrainCharges"}];

		obj.trip.forEach(oTrip=>{
			oTrip.trip_expenses.forEach(oExp=>{
				aExpenseType.forEach(ob=>{
					if(ob.key === oExp.type){
						obj[ob.value] = (obj[ob.value] || 0) + oExp.amount;
					}
				});
			})
		});

		let lastTrip = obj.trip.slice(-1)[0];
		lastTrip.markSettle = lastTrip.markSettle || {};
		lastTrip.advSettled = lastTrip.advSettled || {};

		row["Vehicle No."] = obj.vehicle && obj.vehicle.vehicleNo || 0;
		row['Driver'] = obj.driver && obj.driver.name || 'NA';
		row["Trip Start"] = formatDate(obj.startDate);
		row["Trip End"] = formatDate(obj.endDate);
		row['Fleet'] = obj.vehicle && obj.vehicle.fleet || 'NA';
		row['Ownership'] = obj.ownershipType || obj.vehicle && obj.vehicle.ownershipType || 'NA';
		row['RT No.'] = obj.tsNo || 'NA';
		row["Settlement Date"] = formatDate(obj.date);
		row['KM'] = (round(obj.totalKm || 0) + round(obj.totalExtraKm || 0)) || 0;
		row["Advance"] = round(obj.netAdvance);
		row["Diesel(lit)"] = round(obj.dieselGivLit);
		row["TT days"] = Math.floor(obj.ttDays);
		row["Expense"] = round(obj.netExpense);
		row["Expense/KM"] = round(obj.expenseByKm);
		row["Profit/Day"] = round(obj.profitByday);
		row['Border'] = round(obj.border);
		row['Challan'] = round(obj.challan);
		row['Dala Commision'] = round(obj.dCommision);
		row['Diesel Exp'] = round(obj.dieselExp);
		row['Fixed'] = round(obj.fixSal);
		row['OK Time'] = round(obj.okTime);
		row['Parking'] = round(obj.parking);
		row['Rajai'] = round(obj.rajai);
		row['Repair'] = round(obj.repair);
		row['Roti'] = round(obj.roti);
		row['Service'] = round(obj.serviExp);
		row['Extra'] = round(obj.extra);
		row['MissPend'] = round(obj.mPending);
		row['Fastag Toll Tax'] = round(obj.fToll);
		row['Cash Toll Tax'] = round(obj.cToll);
		row['Toll Tax'] = round(obj.tollExp);
		row['Wages'] = round(obj.wages);
		row['Local Trip'] = round(obj.lTrip);
		row['Consumable store'] = round(obj.cStore);
		row['Add Blue'] = round(obj.addBlue);
		row['Phone Expense'] = round(obj.pExpense);
		row['Suspense'] = round(obj.totalSuspence);
		// row['Adv. Diesel'] = round(obj.netAdvObj && obj.netAdvObj.diesel || 0);
		// row['Adv. Driver Cash'] = round(obj.netAdvObj && obj.netAdvObj.driverCash || 0);
		// row['Adv. Happay'] = round(obj.netAdvObj && obj.netAdvObj.happay || 0);
		// row['Adv. Fastag'] = round(obj.netAdvObj && obj.netAdvObj.fastag || 0);
		row["Settlement By"] = obj.msBy;
		row["Settlement Remark"] = obj.msRemark;
		row["Route"] = obj.trip.map(oTrip => oTrip.route_name).join(', ');
		row["Audit Date"] = obj.creation && formatDate(obj.creation.date);
		row["Audit By"] = obj.creation && obj.creation.user || '';
		row['Guide Charges'] = round(obj.GuideCharges);
		row['Bilty Charges'] = round(obj.BiltyCharges);
		row['Green tax'] = round(obj.Gtax);
		row['Washing'] = round(obj.Washing);
		row['Maintenance'] = round(obj.Maintenance);
		row['Weighbridge Charges'] = round(obj.WeighbridgeCharges);
		row['Crain Charges']=round(obj.CrainCharges);

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

module.exports = rtprExp;
