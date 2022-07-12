let moment = require("moment");
let tripUnSettle = {};

tripUnSettle.headers = ["S.No", "Vehicle No.", "GR No", "Bill No", "Bill Date", "Source", "Destination", "Trip Start", "HIRE SLIP No.", "Segment", "Trip No.", "Customer", "Customer Category", "Route", "Kilometer", "Deal Total",
	"Revenue", "Profit", "Internal Profit", "Vendor Deal", "Cash Adv", "Total Advance/Paid", "Vendor Charges", "Vendor Deduction", "TDS Amount", "TDS PERCENTAGE", "TDS Amt(Extra)", "Adv/KM", "Driver", "Vendor Name",
	"PAN CARD NO", "Trip Status", "Category", "Trip End", "Loading Ended", "Unloading Date", "Rate", "Basic Freight", "Ownership", "Branch", "COMPANY", "Id", "Remark", "Hire Party Remark", "VENDOR ADVANCE PAID", "PAY BY CHEQUE",
	"PAY BY BROKER", "PAY BY DIESEL", "PAY BY CASH", "REMAINING AMOUNT", "Deal Date"
];
let advanceKeys = {};
let count = 1;

tripUnSettle.transform = function (obj) {

	try {
		let row = {};

		row["Vehicle No."] = obj.vehicle && obj.vehicle.vehicle_no || 'NA';
		row["GR No"] = (obj.gr && obj.gr.map(o => o.grNumber).join(' , ') ) || 'NA';
		row["Bill No"] = obj.bill_no || 'NA';
		row['Segment'] = obj.vehicle && obj.vehicle.segment || 'NA';
		row["HIRE SLIP No."] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Category"] = obj.category || 'NA';
		row["Customer"] = (obj.gr && obj.gr.map(o => o.customer && o.customer.name).join(' , ') ) || 'NA';
		row["Customer Category"] = (obj.gr && obj.gr.map(o => o.customer && o.customer.category).join(' , ') ) || 'NA';
		row["Route"] = obj.route && obj.route.name || 'NA';
		row["Kilometer"] = obj.route && obj.route.km || 'NA';
		row['Deal Total'] = obj.vendorDeal && obj.vendorDeal.totalDeal && parseFloat(obj.vendorDeal.totalDeal.toFixed(2) || 0);
		for (let j = 0; j < obj.gr.length; j++) {
			row["Revenue"] = (row["Revenue"] || 0) + (obj.gr[j].totalFreight || 0);
		}
		row["Revenue"] = parseFloat(row["Revenue"]);
		row['Vendor Deal'] = (obj.vendorDeal && obj.vendorDeal.totWithMunshiyana && parseFloat(obj.vendorDeal.totWithMunshiyana.toFixed(2) || 0));
		row['Vendor Charges'] = obj.vendorDeal && obj.vendorDeal.totalCharges && parseFloat(obj.vendorDeal.totalCharges.toFixed(2) || 0);
		row['Vendor Deduction'] = obj.vendorDeal && obj.vendorDeal.totalDeduction && parseFloat(obj.vendorDeal.totalDeduction.toFixed(2) || 0);
		row["Internal Profit"] = (row["Deal Total"] || 0) - (obj.vendorDeal && obj.vendorDeal.internalFreight || 0);
		row["Profit"] = (row["Revenue"] || 0) - (row['Deal Total'] || 0);
		row["TDS Amount"] = obj.vendorDeal && obj.vendorDeal.tdsAmount || 'NA';
		row["Allocation Date"] = moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") || 'NA';
		row["Trip Status"] = obj.status || 'NA';
		row["Driver"] = (obj.driver && obj.driver.name) || "NA";
		row["PAN CARD NO"] = obj.vendor ? obj.vendor.pan : "NA";
		row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";
		row["Trip Start"] = formatDate(obj.start_date);
		row["Trip End"] = formatDate(obj.end_date);
		row["Basic Freight"] = (obj.gr && obj.gr.map(o => o.basicFreight).join(' , ')) || '0';
		// row["Rate"] = (obj.avgRate && obj.avgRate.join(' , ') ) || '0';
		row["Ownership"] = obj.ownershipType || 'NA';
		row["Branch"] = obj.branch && obj.branch.name || 'NA';
		row["Deal Date"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? formatDate(obj.vendorDeal.deal_at) : "NA";
		row["Remark"] = obj.remark || 'NA';
		row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';

		if (obj.vendorDeal && obj.vendorDeal.charges) {
			allCharges = {
				...obj.vendorDeal.charges,
			};

			if (!allCharges)
				return 0;
			for (let k in allCharges) {
				if (allCharges.hasOwnProperty(k))
					row["TDS Amt(Extra)"] = (row["TDS Amt(Extra)"] || 0) + (allCharges[k]['tdsAmount'] || 0);
			}
		}


		obj.advanceBudget.forEach(oAdv => {
			advanceKeys[oAdv.advanceType] = 1;
			switch (oAdv.advanceType) {
				case 'Diesel':
					advanceKeys["Driver Lit."] = 1;
					row["Diesel"] = (row["Diesel"] || 0) + oAdv.amount;
					break;
				default:
					row[oAdv.advanceType] = (row[oAdv.advanceType] || 0) + oAdv.amount;
					break;
			}
		});
		if(obj.vendorDeal && obj.vendorDeal.weight_type === 'PMT'){
			row['PMT RATE'] = obj.vendorDeal.pmtRate;
			row['PMT WEIGHT'] = obj.vendorDeal.pmtWeight;
			row['OTHER EXP'] = obj.vendorDeal.otherExp;
		}

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
module.exports = tripUnSettle;
