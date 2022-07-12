var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
const assetsService = commonUtil.getService('assets');
const Assets = commonUtil.getModel('assets');
const voucherService = commonUtil.getService('voucher');
let PurchaseBill = Promise.promisifyAll(commonUtil.getModel('purchaseBill'));
let moment = require('moment');
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.post("/get", async function (req, res) {
	try {
		let oData = await assetsService.getAssetsRecord(req.body, res);
		if (req.body.download) {
			ReportExelService.assetsReports(oData, req.user.clientId, function (oData) {
				return res.status(200).json({
					"status": "OK",
					"message": "Report download available.",
					"url": oData.url
				});
			});
		}else{
			return res.status(200).json({
				status: 'OK',
				message: 'Assets Record Found',
				data:oData
			});
		}

	} catch (e) {
		throw e;
	}
});

router.post('/add', async function (req, res) {
	try {

		if(!req.body)
			throw new Error('Bad Request');

		let assetsObj = req.body;

		if(!assetsObj.category)
			throw new Error('Category not found');
		if(!assetsObj.assetsAc)
			throw new Error('assets Ac not found');
		if(!assetsObj.depreciationAc)
			throw new Error('depreciation Ac not found');
		if(!assetsObj.depreRateCRate)
			throw new Error('Depre Company Rate not found');
		if(!assetsObj.depreRateItRate)
			throw new Error('Depre IT Rate not found');
		if(!assetsObj.qty)
			throw new Error('Quantity not found');
		if(!assetsObj.rate)
			throw new Error('rate not found');
		if(!assetsObj.method)
			throw new Error('method not found');
		if(assetsObj.uId && assetsObj.uId.length > assetsObj.qty)
			throw new Error('uId can not be greater than assets qty');

		let oSaveObj = await assetsService.saveAssets(assetsObj, req.user);
		if(oSaveObj){
			return res.status(200).json({
				"status": "OK",
				"message": "Saved Successfully",
				"data": oSaveObj,
			});
		} else {
			return res.status(200).json({
				"status": "ERROR",
				"message": "Assets Not Saved",
				"data": oSaveObj,
			});
		}

	} catch (e) {
		return res.status(500).json({'status': 'ERROR', 'error_message': e && e.message || e.toString()});
	}
});

router.put("/update/:_id", async function (req, res, next) {
		try {

			if(!req.body)
				throw new Error('Bad Request');

			let assetsObj = req.body;

			if(!req.params._id)
				throw new Error('Mandatory field required');
			if(!assetsObj.category)
				throw new Error('Category not found');
			if(!assetsObj.assetsAc)
				throw new Error('assets Ac not found');
			if(!assetsObj.depreciationAc)
				throw new Error('depreciation Ac not found');
			if(!assetsObj.depreRateCRate)
				throw new Error('Depre Company Rate not found');
			if(!assetsObj.depreRateItRate)
				throw new Error('Depre IT Rate not found');
			if(!assetsObj.qty)
				throw new Error('Quantity not found');
			if(!assetsObj.rate)
				throw new Error('rate not found');
			if(!assetsObj.method)
				throw new Error('method not found');
			if(assetsObj.uId && assetsObj.uId.length > assetsObj.qty)
				throw new Error('uId can not be greater than assets qty');

			let oData = await Assets.findOne({_id: req.params._id},{_id:1}).lean();
			if(!(oData && oData._id))
				throw new Error('Asset not found to update.');

			let data = await assetsService.updateAssets(assetsObj, req.user, req.params._id);

			return res.status(200).json({
				"status": "OK",
				"message": "Updated successfully",
				"data": data
			});

		} catch (e) {
			return res.status(500).json({
				"status": "ERROR",
				"message": e.toString()
			});
		}
});

router.put('/delete/:_id', async function (req, res) {
	try {

		if(!req.params._id)
			throw new Error('Mandatory field required');

		let oData = await Assets.findOne({_id: req.params._id},{_id:1, depreciation:1, purBill:1}).lean();
		if(!(oData && oData._id))
			throw new Error('Asset not found for Delete.');

		if(oData.depreciation && oData.depreciation.length)
			throw new Error('Can`t Remove Asset Depreciation already calculate.');

		if(oData.purBill)
			throw new Error('Can`t Remove Asset purchaseBill already generated.');


		await assetsService.removeByAssetsId(req.params._id, req.user);

		res.status(200).json({
			status: 'OK',
			message: 'Assets Removed successfully'
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		});
	}
});

router.post("/getDistinct", async function (req, res) {
	try {
		let oData = await assetsService.getDistinctAssets(req, res);

		res.status(200).json({
			status: 'OK',
			message: 'Assets Record Found',
			data:oData
		});
	} catch (e) {
		throw e;
	}
});

router.post('/calDeprReport', async function (req, res, next) {

	try {
		 let data = await assetsService.calDeprecationRecord(req, res);
			if (req.body.download) {
				ReportExelService.calDeprReport(data, req.user.clientId, function (data) {
					return res.status(200).json({
							'status': 'OK',
							'message': 'report download available.',
							'url': data.url
						}
					);
				});

		 }else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found',
					'data': data
				});
			}
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});

router.post('/calDepreciation/:_id', async function (req, res) {

	try {
		let itNet, itAcum, cNet, cAcum, depData;

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oAssets = await Assets.findOne({_id: req.params._id}).lean();

		if(!oAssets.assetsAc)
			throw new Error('assets Ac not found');
		if(!oAssets.depreciationAc)
			throw new Error('depreciation Ac not found');
		if(!oAssets.depreRateCRate)
			throw new Error('Depre Company Rate not found');
		if(!oAssets.depreRateItRate)
			throw new Error('Depre IT Rate not found');
		if(!oAssets.purBill)
			throw new Error('purchaseBill not generated');

		if(oAssets.purBill) {
			let oPurchaseBill = await PurchaseBill.findOne({_id: oAssets.purBill}, {plainVoucher: 1}).lean();

			if (!oPurchaseBill.plainVoucher)
				throw new Error('purchaseBill Voucher not generated');
		}
		if(oAssets.depreciation && oAssets.depreciation.length){
			if(oAssets.depreciation.length >= oAssets.bookBalanceLife)
				throw new Error('can not calculate depreciation bookBalance Life over');
		}


		let finYearDate = new Date();
		finYearDate.setMonth(3);
		finYearDate.setDate(1);
		if(new Date().getMonth() < 6){
			finYearDate.setFullYear(finYearDate.getFullYear() - 1);
		}

		if(oAssets.depreciation)
			for (let obj of oAssets.depreciation){
				if(obj.date >= finYearDate && obj.date  <= new Date()){
					depData = obj;
				}
			}

		if (depData)
			throw new Error('current year depreciation already calculate');

		if(oAssets.uId)
			for (let obj of oAssets.uId){
				if(obj.status === 'Sold'){
					throw new Error('can not calculate depreciation some of assets are sold');
				}
			}

		itNet = oAssets.itActNetVal || oAssets.amount;
		cNet = oAssets.cActNetVal || oAssets.amount;
		itAcum = oAssets.itActAccumDep || 0;
		cAcum = oAssets.cActAccumDep || 0;


		let obj ={};
		if(oAssets.method === 'SLM'){
			obj.date = new Date();
			obj.itAcum = (oAssets.amount * oAssets.depreRateItRate) / 100;
			obj.cAcum = (oAssets.amount * oAssets.depreRateCRate) / 100;
			itAcum +=  obj.itAcum;
			cAcum +=  obj.cAcum;
			itNet =  oAssets.amount - itAcum;
			cNet =  oAssets.amount - cAcum;
		}
		else if(oAssets.method === 'WDM'){
			obj.date = new Date();
			obj.itAcum = (itNet * oAssets.depreRateItRate) / 100;
			obj.cAcum = (cNet * oAssets.depreRateCRate) / 100;
			itAcum +=  obj.itAcum;
			cAcum +=  obj.cAcum;
			itNet =  oAssets.amount - itAcum;
			cNet =  oAssets.amount - cAcum;
		}
		let oVoucher = {
			amount : obj.itAcum
		};

		let oVch = await assetsService.acknowledgeDepVoucher(req.params._id, oVoucher, req);
		if(oVch){
			let oQuery = {
				...obj,
				voucher: oVch._id,
			};
			await Assets.updateOne({_id: req.params._id}, {
				$push: {
					depreciation: oQuery
				},
				$set: {
					itActNetVal: itNet,
					cActNetVal: cNet,
					itActAccumDep: itAcum,
					cActAccumDep: cAcum,
				}
			});
		}else{
			throw new Error('voucher not generated');
		}


		return res.status(200).json({
			message: 'Depreciation Successfully Applied'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/revertDepreciation/:_id', async function (req, res) {

	try {
       let depData, aRemoveVoucher = [];
		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let finYearDate = new Date();
		finYearDate.setMonth(3);
		finYearDate.setDate(1);
		if(new Date().getMonth() < 3){
			finYearDate.setFullYear(finYearDate.getFullYear() - 1);
		}

		// let oPurchaseBill = await PurchaseBill.findOne({_id: req.params._id}, {plainVoucher: 1, aDiscount: 1, assetItems: 1}).lean();
		let oAssets = await Assets.findOne({_id: req.params._id}).lean();

        if(oAssets.depreciation)
			for (let obj of oAssets.depreciation){
				if(obj.date > finYearDate && obj.date  <= new Date()){
					depData = obj;
				}
			}
		if (!depData)
			throw new Error('current year depreciation not generated');

		if (!depData.voucher)
			throw new Error('Voucher not generated');

		let fData = await voucherService.findVoucherByIdAsync(depData.voucher, {acImp: 1});

		if (!(fData && fData._id))
			throw  new Error('Voucher Not Found');

		if (fData.acImp.st)
			throw  new Error('Cannot revert Voucher is imported to A/c');


		aRemoveVoucher.push(depData.voucher);

		for (let oRVch of aRemoveVoucher)
			await voucherService.removeVoucher({
				_id: oRVch
			});

		await Assets.updateOne({_id: req.params._id}, {
			$pull: {
				'depreciation': {
					voucher: depData.voucher
				}
			},
			$set: {
				itActNetVal: oAssets.itActNetVal + depData.itAcum,
				cActNetVal: oAssets.cActNetVal + depData.cAcum,
				itActAccumDep: oAssets.itActAccumDep - depData.itAcum,
				cActAccumDep: oAssets.cActAccumDep - depData.cAcum
			}
		});

		return res.status(200).json({
			message: 'Depreciation Successfully unapproved'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

module.exports = router;
