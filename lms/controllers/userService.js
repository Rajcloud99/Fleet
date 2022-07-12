module.exports.customerOutstandingReport = async function (reqBody, next) {

	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},
		{
			$project: {
				"dueDate": 1,
				"submitionDate": 1,
				"billDate": 1,
				"billingParty": 1,
				"billAmount": 1,
				"billNo": 1,
				"remarks": 1,
				"moneyReceipt.Sum": {
					$reduce: {
						input: '$receiving.moneyReceipt',
						initialValue: 0,
						in: {$add: ["$$value", '$$this.amount']}
					}
				},
				"deduction.Sum": {
					$reduce: {
						input: '$receiving.deduction',
						initialValue: 0,
						in: {
							"$add": ["$$value", {
								$cond: {
									if: {"$ifNull": ["$$this.mrRef", false]},
									then: 0,
									else: {"$ifNull": ["$$this.amount", 0]}
								}
							}]
						}
					}
				}
			}
		},
		{
			"$lookup": {
				from: "billingparties",
				localField: "billingParty",
				foreignField: "_id",
				as: "billingParty"
			}
		},
		{
			"$unwind": "$billingParty"
		},
		{$match: oBillingParty},
		{
			"$lookup": {
				from: "customers",
				localField: "billingParty.customer",
				foreignField: "_id",
				as: "customers"
			}
		},
		{
			"$unwind": "$customers"
		},
		{$match: oCustomer},
		{
			$project: {
				customerName: "$customers.name",
				billingPartyName: "$billingParty.name",
				"billNo": 1,
				"dueDate": 1,
				"submitionDate": 1,
				"billDate": 1,
				"remarks": 1,
				billAmount: 1,
				"receivedAmt":  {$add: ["$moneyReceipt.Sum", "$deduction.Sum"]},
				overDueAmount: {
					$subtract: ["$billAmount", {$add: ["$moneyReceipt.Sum", "$deduction.Sum"]}],
				},
			}
		},
		{
			"$group": {
				"_id": {
					"customerName": "$customerName"
				},
				"aMonthlyData": {
					$push: "$$ROOT"
				}

			}
		},

	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let getData = await serverSidePage.requestData(Bill, oQuery);
	// console.log(getData);
	return getData;
};



	//return res.status(402).json({success: true, message: "Successfully updated"});

