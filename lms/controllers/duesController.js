
let router = require('express').Router();

let Dues = commonUtil.getModel('dues');
let Accounts = commonUtil.getModel('accounts');
const Joi = require('joi');
const duesService = commonUtil.getService('dues');
const billStationaryService = commonUtil.getService('billStationary');
let VoucherService = commonUtil.getService('voucher');
const validate = require('express-validation');
var multipartMiddleware = require('connect-multiparty')();
const path = require('path');



/** POST /api/trip_gr/get - Get trips */
router.route('/add').post(duesService.add);

router.post('/get', async function (req, res, next) {

	try {

		await duesService.get(req, res);

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});


router.post('/update/:_id', async function(req, res, next){
	try{
	    const oRes = {
		status: "OK",
		message: 'Dues Updated Successfully'
	     };
	let prepareDuesObj = {}, body= req.body;
	let nRefNo;
	let oRefNo;
	let nStationaryId;
	let oStationaryId;

	nRefNo = req.body.refNo;
	nStationaryId = req.body.stationaryId;

		if(!nRefNo)
			throw new Error('Mandatory fields are required');
		if(!body.duesType)
			throw new Error('Mandatory fields are required');
		if(!body.branch)
			throw new Error('Mandatory fields are required');
		if(!body.from_account)
			throw new Error('Mandatory fields are required');
		if(!body.to_account)
			throw new Error('Mandatory fields are required');
		if(!body.amount)
			throw new Error('Mandatory fields are required');

		let oDues = await Dues.findOne({_id: req.params._id, clientId: req.user.clientId});

		if (!oDues)
			throw new Error('Dues not found!');

		prepareDuesObj = {
			...req.body,
			veh_no: req.body.veh_no,
			refNo: req.body.refNo,
			date: req.body.date || new Date(),
			amount: req.body.amount,
			from_account: req.body.from_account,
			to_account: req.body.to_account
		};


		if (oDues.voucher) {

			let fdVch = await VoucherService.findVoucherByIdAsync(oDues.voucher, { acImp: 1, ledgers: 1,refNo:1,stationaryId:1});

			if(!(fdVch && fdVch._id))
				throw new Error('Voucher not Found');

			if(fdVch && fdVch.acImp.st)
				throw new Error(`Account already imported`);

			 oRefNo = fdVch.refNo;
			 oStationaryId = fdVch.stationaryId;

			if(!nStationaryId){
				let foundId = await billStationaryService.findByRefAndType({
					bookNo: nRefNo,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if(foundId){
					nStationaryId = foundId._id.toString();
					req.body.stationaryId = nStationaryId;
				}
			}



			if(oRefNo !== nRefNo){
				let foundDues = await Dues.findOne({
					refNo: nRefNo
				});

				if(foundDues && foundDues._id)
					throw new Error(`Dues with Ref. No. ${nRefNo} already exists.`);

				if(!nStationaryId){
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: nRefNo,
						type: 'Ref No',
						clientId: req.user.clientId
					});

					if(foundStationary){
						prepareDuesObj.stationaryId = nStationaryId = foundStationary._id;
					}else{
						Dues.findByIdAndUpdate(req.params.id, {
							$unset: {
								'stationaryId': 1
							}
						});
					}
				}

				if(nStationaryId && (await billStationaryService.isUsed(nStationaryId)))
					throw new Error('Ref No already used');
			}


			let oVouch = {
				date: req.body.date,
				lbastModifiedBy: req.user.full_name,
				clientId: req.user.clientId,
				refNo: req.body.refNo,
				stationaryId: req.body.stationaryId,
				branch: req.body.branch,
				narration: req.body.narration,
				vT: req.body.duesType,
				_id: fdVch._id,
			};

			if(fdVch.ledgers){
				let aLedger = [];

				if(body.iGST){
					if(!body.iGSTAccount)
						throw new Error('IGST A/c not Defined');

					let fName = await Accounts.findOne({_id: body.iGSTAccount}, {name: 1, ledger_name: 1}).lean();
					body.iGSTAccountName = fName.ledger_name || fName.name;
				}

				if(body.cGST){
					if(!body.cGSTAccount)
						throw new Error('CGST A/c not Defined');

					let fName = await Accounts.findOne({_id: body.cGSTAccount}, {name: 1, ledger_name: 1}).lean();
					body.cGSTAccountName = fName.ledger_name || fName.name;
				}

				if(body.sGST){
					if(!body.sGSTAccount)
						throw new Error('SGST A/c not Defined');

					let fName = await Accounts.findOne({_id: body.sGSTAccount}, {name: 1, ledger_name: 1}).lean();
					body.sGSTAccountName = fName.ledger_name || fName.name;
				}

				aLedger.push({
					account: body.from_account,
					lName: body.fromAcName,
					amount: body.amount,
					cRdR: 'CR',
					bills:  [{
						billNo: body.refNo,
						billType: 'New Ref',
						amount: body.amount,
						remAmt: body.amount
					}]
				});

				if(body.tdsAmt)
					aLedger.push({
						account: body.tdsAccount,
						lName: body.tdsAccountName,
						amount: body.tdsAmt,
						cRdR: 'CR',
						bills:  []
					});

				aLedger.push({
					account: body.to_account,
					lName: body.toAcName,
					amount: body.amt,
					cRdR: 'DR',
					bills: []
				});

				if(body.prepaidAmt){
					aLedger.push({
						account: body.prepaidAcc,
						lName: body.prepaidAccName,
						amount: body.prepaidAmt,
						cRdR: 'DR',
						bills: []
					});
				}

				if(body.cGST){
					aLedger.push({
						account: body.cGSTAccount,
						lName: body.cGSTAccountName,
						amount: body.cGST,
						cRdR: 'DR',
						bills: []
					});
				}

				if(body.sGST){
					aLedger.push({
						account: body.sGSTAccount,
						lName: body.sGSTAccountName,
						amount: body.sGST,
						cRdR: 'DR',
						bills: []
					});
				}

				if(body.iGST){
					aLedger.push({
						account: body.iGSTAccount,
						lName: body.iGSTAccountName,
						amount: body.iGST,
						cRdR: 'DR',
						bills: []
					});
				}

				// if(body.tPiGST){
				// 	aLedger.push({
				// 		account: body.tPiGSTAcc,
				// 		lName: body.tPiGSTAccName,
				// 		amount: body.tPiGST,
				// 		cRdR: 'DR',
				// 		bills: []
				// 	});
				// }
				// if(body.tPcGST){
				// 	aLedger.push({
				// 		account: body.tPcGSTAcc,
				// 		lName: body.tPcGSTAccName,
				// 		amount: body.tPcGST,
				// 		cRdR: 'DR',
				// 		bills: []
				// 	});
				// }
				// if(body.tPsGST){
				// 	aLedger.push({
				// 		account: body.tPsGSTAcc,
				// 		lName: body.tPsGSTAccName,
				// 		amount: body.tPsGST,
				// 		cRdR: 'DR',
				// 		bills: []
				// 	});
				// }

				oVouch.ledgers = aLedger;
			}

			await VoucherService.editVoucher(oVouch);

		}


		oDues = await Dues.findOneAndUpdate({_id: oDues._id}, {
			$set: prepareDuesObj
		}, {new: true});

		if(oRefNo !== nRefNo){
			await billStationaryService.setUnset({
				modelName: 'dues',
				userName: req.user.full_name,
				docId: oDues._id
			},{
				refNo: nRefNo,
				stationaryId: nStationaryId
			},{
				refNo: oRefNo,
				stationaryId: oStationaryId
			});
		}

		return res.status(200).json(oDues);
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.post('/delete/:id', async (req, res, next) => {
	try {

		let oDues = await Dues.findOne({_id: req.params.id, clientId: req.user.clientId});

		if(oDues.voucher){

			let foundVoucher = await VoucherService.findVoucherByIdAsync(oDues.voucher, {acImp: 1});

			if(foundVoucher.acImp.st){
				throw new Error('Dues Cannot be deleted. Voucher Imported to A/c');
			}
		}

		let stationaryId = oDues.stationaryId;

		if(stationaryId){
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'dues',
				docId: oDues._id,
				stationaryId,
			}, 'cancelled');
		}

		if(oDues.voucher)
			await VoucherService.removeVoucher({_id: oDues.voucher});

		let resData = await Dues.remove({_id: req.params.id});

		return res.status(200).json({
			status: 'OK',
			message: 'Data Deleted!',
			data: resData
		})
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

module.exports = router;
