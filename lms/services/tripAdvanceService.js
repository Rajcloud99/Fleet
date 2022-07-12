const moment = require('moment');
const mongoose = require('mongoose');
const Trip = commonUtil.getModel('trip');
const TripAdvance = commonUtil.getModel('TripAdvances');
const VendorFuel = commonUtil.getModel('vendorFuel');
const Accounts = commonUtil.getModel('accounts');
const RegisteredVehicle = commonUtil.getModel('registeredVehicle');
const voucherService = commonUtil.getService('voucher');

module.exports = {
	completePartials,
	updateImported
};

// function definition

async function completePartials({
									trip,
									isReMap,
									clientId,
									happayMaster,
									fastagMaster,
									branchTransactionMaster,
									partialAdvances,
									req
								})
{
	const stats = [];
	let autoMap = req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.automap;
	if(typeof autoMap !== "boolean")
		autoMap = true;

	let allTransactionAccounts = (await Accounts.find({group: 'Transaction',clientId:clientId}, {
		_id: true,
		name: true
	}).lean()).reduce((acc, curr) => {
		acc[curr.name.trim().toLowerCase()] = curr._id;
		return acc;
	}, {});
	let allHappayAccounts = (await Accounts.find({group: 'Happay Master',clientId:clientId}, {
		_id: true,
		name: true
	}).lean()).reduce((acc, curr) => {
		acc[curr.name.trim().toLowerCase()] = curr._id;
		return acc;
	}, {});
	let allFasttagMasterAccounts = (await Accounts.find({group: 'FastTag Master',clientId:clientId}, {
		_id: true,
		name: true
	}).lean()).reduce((acc, curr) => {
		acc[curr.name.trim().toLowerCase()] = curr._id;
		return acc;
	}, {});

	const completeAdvances = await Promise.all(partialAdvances.map(async adv => {
		adv.cashPump = adv.cashPump || (adv.branch && adv.branch.name) || '';
		let fuelVendor, count = 0, statsObj = {
			'ADVANCE DATE': moment(adv.date).format("DD-MM-YYYY"),
			'ADVANCE TYPE': adv.advanceType,
			'VEHICLE NO': adv.vehicle_no,
			'REFERENCE NO': adv.reference_no,
			'STATUS': 'FAIL',
			'REJECTION REASON': [],
		};
		if (!adv.amount && adv.status != 'Diesel Request') {
			statsObj['REJECTION REASON'].push(`${++count}) Amount not correct`);
			statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
			stats.push(statsObj);
			return;
		}
		if (!adv.reference_no && adv.status != 'Diesel Request') {
			statsObj['REJECTION REASON'].push(`${++count}) Reference not found`);
			statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
			stats.push(statsObj);
			return;
		}
		if (!adv.date && adv.status != 'Diesel Request') {
			statsObj['REJECTION REASON'].push(`${++count}) Reference not found`);
			statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
			stats.push(statsObj);
			return;
		}
		try{

		if (!isReMap) {

			if ((adv.advanceType === 'Driver Cash') || (adv.advanceType === 'Vendor Advance') || (adv.advanceType === 'Vendor Balance')) {
				if (!allTransactionAccounts[adv.cashPump.trim().toLowerCase()]) {
					statsObj['REJECTION REASON'].push(`${++count}) Invalid branch "${adv.cashPump}"`);
					statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
					stats.push(statsObj);
					return;
				}
			}
			if (adv.advanceType === 'Happay') {
				if (!allHappayAccounts[adv.__happay__.trim().toLowerCase()]) {
					statsObj['REJECTION REASON'].push(`${++count}) Invalid happay master "${adv.__happay__}"`);
					statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
					stats.push(statsObj);
					return;
				}
			}
			if (adv.advanceType === 'Fastag') {
				if (!allFasttagMasterAccounts[adv.cashPump.trim().toLowerCase()]) {
					statsObj['REJECTION REASON'].push(`${++count}) Invalid Fastag master "${adv.cashPump}"`);
					statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
					stats.push(statsObj);
					return;
				}
			}
			var vehicleObj = await RegisteredVehicle.findOne({
				clientId,
				vehicle_reg_no: new RegExp(adv.vehicle_no, 'i'),
				ownershipType: {$in: ['Own', 'Associate', 'Sold']}
			}, {
				vehicle_reg_no: 1,
				vendor_id: 1,
				ownershipType: 1,
				driver: 1,
				account: 1,
				driver_name: 1,
				driver_employee_code: 1,
				costCenter:1,
				_id: 1
			}).populate({path: 'vendor_id', select: {'account': 1, 'name': 1, '_id': 1}}).lean();

			if (!vehicleObj) {
				statsObj['REJECTION REASON'].push(`${++count}) Own or Associate Vehicle not found`);
				statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
				stats.push(statsObj);
				return;
			}
			if (adv.advanceType === 'Diesel') {
				if (adv.status != 'Diesel Request' && (!adv.dieseInfo.rate || typeof adv.dieseInfo.rate !== 'number')) {
					statsObj['REJECTION REASON'].push(`${++count}) Diesel rate is required and must be number. Found ${adv.dieseInfo.rate}`);
					statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
					stats.push(statsObj);
					return;
				}
				if (!adv.dieseInfo.litre || typeof adv.dieseInfo.litre !== 'number') {
					statsObj['REJECTION REASON'].push(`${++count}) Diesel litre is required and must be number. Found ${adv.dieseInfo.litre}`);
					statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
					stats.push(statsObj);
					return;
				}
				if (!adv.dieseInfo.vendor) {
					if (adv.dieseInfo._vendorName) {
						fuelVendor = await VendorFuel.findOne({
							clientId,
							name: new RegExp('^' + (adv.dieseInfo._vendorName.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')
						}).lean();
					} else {
						statsObj['REJECTION REASON'].push(`${++count}) Vendor name not provided`);
					}
				} else {
					let oQuery = {};
					if (adv.dieseInfo.vendor.toString().match(/^[0-9a-fA-F]{24}$/)) {
						oQuery['_id'] = adv.dieseInfo.vendor;
					} else {
						oQuery['clientId'] = clientId;
						oQuery['name'] = new RegExp('^' + (adv.dieseInfo.vendor.toString().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i');
						adv.dieseInfo._vendorName = adv.dieseInfo.vendor;
					}
					fuelVendor = await VendorFuel.findOne(oQuery, {account: 1, name: 1, _id: 1}).lean();
				}
				if (fuelVendor) {
					adv.dieseInfo.vendor = fuelVendor._id;
					adv.amount = adv.amount || ((adv.dieseInfo.rate || 0) * adv.dieseInfo.litre);
				} else {
					delete adv.dieseInfo.vendor;
					adv.dieseInfo._vendorName = adv.dieseInfo.vendor;
					statsObj['REJECTION REASON'].push(`${++count}) Vendor not found in masters`);
				}
			} else {
				delete adv.dieseInfo;
			}
			adv._id = adv._id || mongoose.Types.ObjectId();
			adv.remainingAmount = adv.amount || 0;
			adv.settleTheTrip = false;
			adv['from_account'] = adv.advanceType === 'Happay'//
				? allHappayAccounts[adv.__happay__.trim().toLowerCase()]
				: adv.advanceType === 'Fastag'
					? allFasttagMasterAccounts[adv.cashPump.trim().toLowerCase()]
					: (adv.advanceType === 'Driver Cash')
						? allTransactionAccounts[adv.cashPump.trim().toLowerCase()]
						: adv.advanceType === 'Diesel'
							? (fuelVendor && fuelVendor.account)
							: (function () {
								if (fuelVendor && fuelVendor.name) {
									statsObj['REJECTION REASON'].push(`${++count}) Add ${fuelVendor.name}'s account`);
									stats.push(statsObj);
								}
								return undefined;
							})();
			adv['from_account_name'] = adv.advanceType === 'Happay'//
				? adv.__happay__.trim()
				: adv.advanceType === 'Fastag'
					? adv.cashPump.trim()
					: (adv.advanceType === 'Driver Cash')
						? adv.cashPump.trim()
						: adv.advanceType === 'Diesel'
							? (fuelVendor && fuelVendor.name)
							: '';
			if (vehicleObj.ownershipType === 'Own' || vehicleObj.ownershipType === 'Sold') {
				adv['to_account'] = vehicleObj.account ? vehicleObj.account : (function () {
					statsObj['REJECTION REASON'].push(`${++count}) Vehicle account not found`);
					stats.push(statsObj);
					return null;
				})();

				adv['to_account_name'] = vehicleObj.account ? vehicleObj.vehicle_reg_no : (function () {
					statsObj['REJECTION REASON'].push(`${++count}) Vehicle account not found`);
					stats.push(statsObj);
					return null;
				})();
				adv.ccVehicle = vehicleObj.costCenter;
				if (req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.driverDetails) {
					adv.person = vehicleObj.driver_name;
					adv.driverCode = vehicleObj.driver_employee_code;
				}else{
					adv.person = vehicleObj.vehicle_reg_no;
				}

			} else {
				if (vehicleObj.vendor_id && vehicleObj.vendor_id.account && vehicleObj.vendor_id.account[0]) {
					for (let v = 0; v < vehicleObj.vendor_id.account.length; v++) {
						if (vehicleObj.vendor_id.account[v].clientId == clientId) {
							adv['to_account'] = vehicleObj.vendor_id.account[v].ref;
							adv['to_account_name'] = vehicleObj.vendor_id.name;
						}
					}
				} else {
					statsObj['REJECTION REASON'].push(`${++count}) Vendor account not found`);
					stats.push(statsObj);
					return null;
				}
				adv.person = vehicleObj.vendor_id && vehicleObj.vendor_id.name;
				adv.vendor = vehicleObj.vendor_id && vehicleObj.vendor_id._id;
				adv['to_account_list.vendor_account'] = adv['to_account'];
			}
			if (adv.advanceType === 'Driver Cash') {
				adv['to_account_list.branch_master'] = allTransactionAccounts[adv.cashPump.trim().toLowerCase()];
			}
			adv.vehicle_no = vehicleObj.vehicle_reg_no;
			adv.vehicle = vehicleObj._id;
			adv.driver = vehicleObj.driver;
		}
		let tripOnThatVehicle;
		if (trip) {
			tripOnThatVehicle = await Trip.find({_id: otherUtil.arrString2ObjectId(trip)}, {
				trip_no: 1,
				_id: 1,
				driver: 1
			});
		} else if(autoMap){
			// tripOnThatVehicle = await Trip.findByAdvanceDateAdvUpV2({
			// 	clientId: clientId,
			// 	vehicle_no: adv.vehicle_no,
			// 	advanceDate: adv.date,
			// }, {trip_no: 1, _id: 1, driver: 1,advSettled:1,markSettle:1});
		}
		if((!tripOnThatVehicle && req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.automap) || (!tripOnThatVehicle && req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.tripSusnotAllow)){
			tripOnThatVehicle = await Trip.findByAdvanceDateAdvUpV2({
				clientId: clientId,
				vehicle_no: adv.vehicle_no,
				advanceDate: adv.date,
			}, {trip_no: 1, _id: 1, driver: 1,advSettled:1,markSettle:1});
		}
		if (tripOnThatVehicle && tripOnThatVehicle.length > 0) {
			tripOnThatVehicle = tripOnThatVehicle[tripOnThatVehicle.length - 1];
			if (tripOnThatVehicle.advSettled && tripOnThatVehicle.advSettled.isCompletelySettled) {
				statsObj['REJECTION REASON'].push(`${++count}) Trip is alredy completely settled`);
				statsObj['STATUS'] = 'Trip not linked';
			}
			if (tripOnThatVehicle.markSettle && tripOnThatVehicle.markSettle.isSettled) {
				statsObj['REJECTION REASON'].push(`${++count}) Trip is already mark settled`);
				statsObj['STATUS'] = 'Trip not linked';
			} else {
				adv = {
					...adv,
					trip_no: tripOnThatVehicle.trip_no,
					trip: tripOnThatVehicle._id,
					driver: tripOnThatVehicle.driver
				};
			}
		}
		/*
		//don't show trip status reason
		else {
			statsObj['REJECTION REASON'].push(`${++count}) No Trip found`);
			statsObj['STATUS'] = 'PASS';
		}*/
		if(!adv || !adv.reference_no){
				statsObj['REJECTION REASON'].push('some issue with vehicle master, vendor account linking');
				statsObj['STATUS'] = 'Trip not linked';
		}
		if (statsObj['REJECTION REASON'].length > 0) {
			statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
			stats.push(statsObj);
		}

		return Promise.resolve(adv);
	}catch(e){
			statsObj['REJECTION REASON'] = e.message;
			statsObj['STATUS'] = 'FAIL';
			stats.push(statsObj);
			//throw e;
		}
	}));

	return Promise.resolve({stats, completeAdvances});
}

async function updateImported(_id, body, req) {

	try {

		let clientId = req.user.clientId;
		let user = req.user._id;
		let userName = req.user.full_name;
		let internalAccount = body.internalAccount;

		if (!internalAccount)
			throw new Error('Internal A/c is required');

		let fdAdv = await TripAdvance.findOne({_id, clientId}).lean();
		let fdVch = await voucherService.findVoucherByIdAsync(fdAdv.voucher);

		let newVehicleAccount = body.to_account && body.to_account._id || body.to_account;
		let vehicleAccount = fdAdv.to_account && fdAdv.to_account._id && fdAdv.to_account._id || fdAdv.to_account;

		let oTrip = req.body.trip && await Trip.findOne({_id: req.body.trip, clientId: req.user.clientId}, {trip_no: 1, advSettled: 1, markSettle: 1}).lean();

		if(oTrip && oTrip.advSettled && oTrip.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be updated. Because Trip no ${oTrip.trip_no} is Completely Settled`);

		if(oTrip && oTrip.markSettle && oTrip.markSettle.isSettled)
			throw new Error(`Trip Advance Cannot be updated. Because Trip no ${oTrip.trip_no} is Marked Settled`);

		// unSetting trip from trip advance
		await TripAdvance.updateOne({_id: fdAdv._id}, {
			// $unset: {
			// 	trip: 1,
			// 	trip_no: 1
			// },
			$set: {
				editable: false,
				// linkable: true
			}
		});

		// creating Receipt voucher advance

		let receiptAdv = {...fdAdv};

		receiptAdv.editable = false;
		receiptAdv._id = mongoose.Types.ObjectId();
		receiptAdv.voucher = mongoose.Types.ObjectId();
		receiptAdv.created_by = user;
		receiptAdv.created_at = new Date();
		receiptAdv.reference_no = fdVch.refNo + '-R';
		receiptAdv.editable = false;
		// receiptAdv.person = req.body.person;
		receiptAdv.from_account = vehicleAccount;
		receiptAdv.to_account = internalAccount;
		receiptAdv.remark = req.body.remark + ` CONTRA ENTRY FOR VEHICLE UPDATE FROM ${fdAdv.person} to ${req.body.person}`;
		receiptAdv.narration = req.body.remark + ` CONTRA ENTRY FOR VEHICLE UPDATE FROM ${fdAdv.person} to ${req.body.person}`;
		// receiptAdv.vehicle = body.vehicle;
		// receiptAdv.vehicle_no = body.vehicle_no;
		receiptAdv.amount = receiptAdv.amount * -1;
		if(receiptAdv.dieseInfo) {
			receiptAdv.dieseInfo = {...fdAdv.dieseInfo};
			receiptAdv.dieseInfo.litre = receiptAdv.dieseInfo.litre * -1;
		}
		// delete receiptAdv.trip_no;
		// delete receiptAdv.trip;
		// delete receiptAdv.linkable;

		await TripAdvance.create(receiptAdv);

		await Trip.updateOne({
			_id: fdAdv.trip
		}, {
			$addToSet: {
				advanceBudget: receiptAdv._id
			}
		});

		let ledgerVehicleAccount = await Accounts.findOne({_id: vehicleAccount}, {name: 1, ledger_name: 1}).lean();
		let ledgerInternalAccount = await Accounts.findOne({_id: internalAccount}, {name: 1, ledger_name: 1}).lean();

		// creating Receipt voucher
		await voucherService.addVoucherAsync({
			_id: receiptAdv.voucher,
			clientId,
			vT: 'Advance Udpate',
			branch: fdVch.branch,
			refNo: fdVch.refNo + '-R',
			narration: fdVch.narration,
			createdBy: userName,
			date: new Date() || fdAdv.date,
			type: 'Receipt',
			ledgers: [{
				account: vehicleAccount,
				lName: ledgerVehicleAccount.ledger_name || ledgerVehicleAccount.name,
				amount: fdAdv.amount,
				cRdR: 'CR',
				bills: []
			}, {
				account: internalAccount,
				lName: ledgerInternalAccount.ledger_name || ledgerInternalAccount.name,
				amount: fdAdv.amount,
				cRdR: 'DR',
				bills: [{
					billNo: fdVch.refNo,
					billType: 'New Ref',
					amount: fdAdv.amount,
					remAmt: 0,
				}],
			}]
		});

		// creating duplicate advance and voucher and setting them uneditable
		let obj = {...fdAdv};

		delete obj.trip;
		delete obj.trip_no;
		delete obj.driver;
		delete obj.editable;
		delete obj.linkable;

		obj._id = mongoose.Types.ObjectId();
		obj.voucher = mongoose.Types.ObjectId();
		obj.created_by = user;
		obj.created_at = new Date();
		obj.reference_no = fdVch.refNo + '-P';
		obj.editable = false;
		obj.person = req.body.person;
		obj.from_account = internalAccount;
		obj.to_account = newVehicleAccount;
		obj.remark = body.remark + `VEHICLE UPDATE FROM ${fdAdv.person} to ${req.body.person}`;
		obj.narration = body.remark + `VEHICLE UPDATE FROM ${fdAdv.person} to ${req.body.person}`;
		obj.vehicle = body.vehicle;
		obj.vehicle_no = body.vehicle_no;

		oTrip && oTrip._id && (obj.trip = oTrip._id);
		oTrip && oTrip.trip_no && (obj.trip_no = oTrip.trip_no);

		await TripAdvance.create(obj);
		await voucherService.addVoucherAsync({
			_id: obj.voucher,
			clientId,
			vT: 'Advance Udpate',
			branch: obj.branch,
			refNo: obj.reference_no,
			narration: obj.narration,
			createdBy: userName,
			date: new Date() || obj.date,
			type: 'Payment',
			ledgers: [{
				account: internalAccount,
				lName: (await Accounts.findOne({_id: internalAccount}, {name: 1}).lean()).name,
				amount: obj.amount,
				cRdR: 'CR',
				bills: [{
					billNo: fdVch.refNo,
					billType: 'New Ref',
					amount: obj.amount,
					remAmt: 0,
				}]
			}, {
				account: newVehicleAccount,
				lName: (await Accounts.findOne({_id: newVehicleAccount}, {name: 1}).lean()).name,
				amount: obj.amount,
				cRdR: 'DR',
				bills: [],
			}]
		});
		await Trip.updateOne({
			_id: obj.trip,
		}, {
			$addToSet:{
				advanceBudget: obj._id
			}
		});

		return true;

	} catch (e) {
		throw e;
	}
}

module.exports.updateImported = updateImported;
