const CronJob = require('cron').CronJob;
const mongoose = require('mongoose');
const misUtil = require(projectHome + "/utils/misUtil");
const fastagApiUtil = promise.promisifyAll(require(projectHome + "/utils/fastagApi-util"));
const sapXMLGeneratorUtil = require(projectHome + "/utils/sapXMLGeneratorUtil");
const Client = commonUtil.getModel('client');
const RegVehicle = commonUtil.getModel('registeredVehicle');
const Account = commonUtil.getModel('accounts');
const TripExpense = commonUtil.getModel('tripExpenses');
const Trip = commonUtil.getModel('trip');
const VoucherService = promise.promisifyAll(commonUtil.getService('accountsVoucher'));
const inventorySnapshotService = promise.promisifyAll(commonUtil.getMaintenanceService('inventorySnapshot'));
//const ftpUtil = require(projectHome+"/utils/ftp-util");
const exec = require('child_process').exec;
const fs = require('fs');
const Async = require('async');
let telegram = require(projectHome + "/utils/telegramBotUtil");
const TripAdvance = commonUtil.getModel('TripAdvances');
const tripAdvService = commonUtil.getService('tripAdvance');
var ReportCronService = promise.promisifyAll(commonUtil.getService('reportCron'));
var accountService = promise.promisifyAll(commonUtil.getService('accounts'));
const devConf = require(`../config/${process.env.LMS_ENV || 'dev'}`);
const moment = require('moment');
const _ = require('lodash');


//var misUtil = require(projectHome+"/utils/misUtil");
//var sapXMLGeneratorUtil = require(projectHome+"/utils/sapXMLGeneratorUtil");
//var inventorySnapshotService = promise.promisifyAll(commonUtil.getMaintenanceService('inventorySnapshot'));
//var ftpUtil = require(projectHome+"/utils/ftp-util");
//var exec = require('child_process').exec;
//var fs = require('fs');
/*
MapleCustomerMaster20170824 :     @  22:50
MapleJournalEntryDR20170824  :     @  23:05
MapleJournalEntryKR20170824  :     @  23:20
*/

module.exports = function () {
	/*
	if(config.fasttag && config.fasttag.enabled){
		let fastag = new CronJob({
			cronTime: '00 10 00 * * 0-6',
			onTick: fastagCreditTransaction,
			start: true,
			startNow: true,
			timeZone: 'Asia/Kolkata'
		});
	}

	if(config.backups && config.backups.lmsDB) {
		var dbBackupJob = new CronJob({
			cronTime: '00 29 23 * * 0-6',
			onTick: cronBackup,
			start: true,
			startNow: true,
			timeZone: 'Asia/Kolkata'
		});
	}

	if(false && config.memoryCheck_){
		var jobMemory = new CronJob({
			cronTime: '00 /60 * * * *',
			onTick: memoryCheck,
			start: true,
			timeZone: 'Asia/Kolkata'
		});
	}*/

	var updateAccountBalanceCron = new CronJob({
		//cronTime: '00 50 23 * * 0-6',
		cronTime: '10 59 23 * * *',
		onTick: accBalReportDataUpdate,
		start: true,
		startNow: true,
		timeZone: 'Asia/Kolkata'
	});
/*
		var jobDaily = new CronJob({
			cronTime: '00 59 23 * * 0-6',
			//cronTime: '00 23 12 * * 1-7',
			onTick: misGenerator,
			start: true,
			timeZone: 'Asia/Kolkata'
		});
		var sapXMLDataGeneratorJob = new CronJob({
			cronTime: '00 40 22 * * 0-6',
			onTick: XMLDataGenearator,
			start: true,
			startNow: true,
			timeZone: 'Asia/Kolkata'
		});
		 var sapCustomerXMLGeneratorJob = new CronJob({
		 cronTime: '00 45 22 * * 0-6',
		 onTick: customerXMLFileGenearator,
		 start: true,
		 startNow: true,
		 timeZone: 'Asia/Kolkata'
		 });
		 var sapXMLGeneratorJob = new CronJob({
			cronTime: '00 59 22 * * 0-6',
			onTick: XMLFileGenearator,
			start: true,
			startNow: true,
			timeZone: 'Asia/Kolkata'
		});
		var dbBackupJob = new CronJob({
			cronTime: '00 29 23 * * 0-6',
			onTick: cronBackup,
			start: true,
			startNow: true,
			timeZone: 'Asia/Kolkata'
		});
		var inventorySnapShot =new CronJob({
			cronTime: '00 31 23 * * 0-6',
			onTick: invSnapShot,
			start: true,
			startNow: true,
			timeZone: 'Asia/Kolkata'
		});
		*/
};
var memoryCheck = function () {
	const used = process.memoryUsage();
	for (let key in used) {
		let msg = `${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`;
		telegram.sendMessage(config.serverName + " " + msg);
	}
};
var invSnapShot = function () {
	console.log("SnapShot Creation Started!!");
	inventorySnapshotService.saveSnapshotAsync("100003")
		.then(function (response) {
			console.log(response);
			console.log("Snapshot Done");   //added nitin
		})
		.catch(function (err) {
			console.log("Error in inv snapshot: " + err);
		})
};

// Added By Harikesh - Dated: 17-03-2019
var accBalReportDataUpdate = function () {
	var reqDateLastModify = {};
	let level = 7;

	//* ---- Daily Basis */

	var today = new Date();
	today.setHours(22);
	today.setMinutes(40);
	var yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	yesterday.setHours(22);
	yesterday.setMinutes(40);

	reqDateLastModify = {"from": yesterday, "to": today, "level": level, "clientId": devConf.clientIdConfig};

	console.log(reqDateLastModify);

	// For one Time

	// var startDate = new Date('2020-05-07');
	// startDate.setMonth(startDate.getMonth());
	// startDate.setDate(startDate.getDate());
	// startDate.setHours(0);
	// startDate.setMinutes(0);
	// startDate.setSeconds(0);
	//
	// var endDate = new Date(startDate);
	// endDate.setMonth(startDate.getMonth());
	// endDate.setDate(startDate.getDate());
	// endDate.setHours(23);
	// endDate.setMinutes(59);
	// endDate.setSeconds(59);

	// reqDateLastModify = {"startDate" : startDate, "endDate":endDate, "level":level, "clientId": devConf.clientIdConfig};

	console.log(reqDateLastModify);
	console.log("Upsert date wise sum in account balance - Started.");
	telegram.sendMessage('Upsert date wise sum in account balance - Started.');
	accountService.updateAccountBalanceCron(reqDateLastModify)
		.then(function (response) {
			console.log(response);
			console.log("Upsert date wise sum in account balance - Done");
			telegram.sendMessage('Upsert date wise sum in account balance - Done.');
		})
		.catch(function (err) {
			console.log("Error in Upsert account balance cron: " + err);
			telegram.sendMessage('Upsert date wise sum in account balance - Error.'+  err.toString());
		})

};
// END

// END

async function fastagTransaction() {
	try {
		let clientData = await Client.find({clientId: "10808"});
		if (!clientData || !clientData[0] || !clientData[0].fastag_customerId || !clientData[0].fastag_API_KEY) return;
		let vehicles = await RegVehicle.find({clientId: "10808"}, {vehicle_reg_no: 1, account: 1, fasttag: 1});
		if (!vehicles || !vehicles[0]) return;
		let fastagMasterAccount = await Account.find({clientId: "10808", group: "FastTag Master"});
		if (!fastagMasterAccount || !fastagMasterAccount[0]) return;
		else fastagMasterAccount = fastagMasterAccount[0];
		let StartTransactionDate, EndTransactionDate = new Date();
		StartTransactionDate = new Date();
		StartTransactionDate.setDate(StartTransactionDate.getDate() - 1);
		StartTransactionDate.setHours(0);
		StartTransactionDate.setMinutes(0);
		StartTransactionDate.setSeconds(0);
		StartTransactionDate.setMilliseconds(0);
		//EndTransactionDate.setMinutes(EndTransactionDate.getMinutes()-5);
		EndTransactionDate.setDate(EndTransactionDate.getDate() - 1);
		let transactions = [];
		let lData;
		Async.doWhilst(function (callback) {
				fastagApiUtil.getTransactionDetails({
					customerId: clientData[0].fastag_customerId,
					API_KEY: clientData[0].fastag_API_KEY,
					StartTransactionDate: StartTransactionDate,
					EndTransactionDate: EndTransactionDate,
					PageNo: (lData ? (lData.CurrentPageNumber || 0) : 0) + 1
				}, function (err, data) {
					if (err) {
						console.log('Fast tag API Error ', err.toString());
						callback(err);
					}
					lData = Object.assign({}, data);
					if (data && data.TransactionDetails && data.TransactionDetails[0]) {
						transactions.push(...(data.TransactionDetails.filter(obj => {
							obj.vehicle = vehicles.find(v =>
								(v.vehicle_reg_no.toUpperCase() === obj.VehicleNumber.toUpperCase()
									&& v.fasttag && v.account));
							return obj.vehicle !== undefined;
						})));
						callback(null, transactions);
					} else if (data.message) {
						callback(data.message);
					}
				});
			},
			function (err, resp) {
				console.log('fasstag page no ', lData.CurrentPageNumber, lData.TotalPages);
				return lData.TransactionDetails && (lData.CurrentPageNumber < lData.TotalPages)
			}, async function (err) {
				if (err) return console.error(err);
				if (transactions && transactions[0]) {
					const tripExpense = await Promise.all(transactions.map(async obj => {
						if (!obj.vehicle.fasttag || !obj.vehicle.fasttag._id) {
							console.log('Fasttag account for vehicle not found ', obj.VehicleNumber)
						}
						if (!obj.vehicle.account || !obj.vehicle.account._id) {
							console.log('Vehicle account not found ', obj.VehicleNumber)
						}
						let expenseObj = {
							clientId: "10808",
							type: "Fastag",
							person: obj.VehicleNumber,
							amount: obj.TransactionAmount,
							date: new Date(obj.TransactionDateTime),
							remark: `${obj.LaneCode}, ${obj.PlazaCode}, ${obj.TransactionStatus}, ${obj.TransactionReferenceNumber}, ${obj.PlazaName}`,
							fastagDetail: obj,
							reference_no: obj.TransactionReferenceNumber,
							expenseType: 'Fastag'
						}, reqbody = {
							type: "Journal",
							amount: obj.TransactionAmount,
							narration: obj.TransactionId,
							from: obj.vehicle.fasttag._id,
							to: obj.vehicle.account._id,
							refNo: obj.TransactionReferenceNumber,
							clientId: "10808",
							systemGenerated: true
						}, voucher;

						voucher = await VoucherService.addVoucherAsync(reqbody);
						expenseObj.voucher = voucher[0].voucher._id;
						return new TripExpense(expenseObj);
					}));
					if (tripExpense && tripExpense[0])
						await TripExpense.insertMany(tripExpense);
				} else {
					console.log('Transactions not found!');
				}
			}
		);

	} catch (err) {
		console.error(err);
	}
}

//fastagTransaction();

async function fastagCreditTransaction() {
	let startDate = new Date(), endDate = new Date();
	startDate.setDate(startDate.getDate() - 1);
	try {
		let clientData = await Client.find({clientId: "10808"});
		if (!clientData || !clientData[0] || !clientData[0].fastag_customerId || !clientData[0].fastag_API_KEY) return;
		let vehicles = await RegVehicle.find({clientId: "10808"}, {account: 1, fasttag: 1, vehicle_reg_no: 1});
		if (!vehicles || !vehicles[0]) return;
		let fastagMasterAccount = await Account.find({clientId: "10808", group: "FastTag Master"});
		if (!fastagMasterAccount || !fastagMasterAccount[0]) return;
		else fastagMasterAccount = fastagMasterAccount[0];
		for (let veh of vehicles) {
			let LastTripAdvance = await TripAdvance.find({
				'clientId': clientData[0].clientId,
				'vehicle': veh._id,
				'fastagDetail.DateOfTransaction': {$exists: true}
			}).sort({
				'advanceBudget.fastagDetail.DateOfTransaction': -1
			}).limit(1);
			let StartTransactionDate, EndTransactionDate = new Date();
			if (LastTripAdvance && LastTripAdvance[0] && LastTripAdvance[0].fastagDetail) {
				StartTransactionDate = new Date(LastTripAdvance[0].fastagDetail.DateOfTransaction);
				StartTransactionDate.setSeconds(StartTransactionDate.getSeconds() + 1);
				StartTransactionDate.setMilliseconds(0);
				startDate = new Date(LastTripAdvance[0].fastagDetail.DateOfTransaction);
			} else {
				StartTransactionDate = new Date(startDate);
				StartTransactionDate.setHours(0);
				StartTransactionDate.setMinutes(0);
				StartTransactionDate.setSeconds(0);
				StartTransactionDate.setMilliseconds(0);
			}
			EndTransactionDate = startDate;
			EndTransactionDate.setDate(startDate.getDate() + 2);
			//EndTransactionDate.setMinutes(EndTransactionDate.getMinutes()-5);

			fastagApiUtil.getCreditTransactionDetails({
				customerId: clientData[0].fastag_customerId,
				API_KEY: clientData[0].fastag_API_KEY,
				FromDate: StartTransactionDate,
				ToDate: EndTransactionDate,
				VehicleNumber: veh.vehicle_reg_no
			}, async function (err, data) {
				if (data && data.CreditTransactionDetails && data.CreditTransactionDetails[0]) {
					let transactions = data.CreditTransactionDetails.filter(obj => {
						obj.vehicle = vehicles.find(v =>
							(v.vehicle_reg_no.toUpperCase() === obj.VehicleNumber.toUpperCase()
								&& v.fasttag && v.account));
						return obj.vehicle !== undefined;
					});
					(transactions.forEach(async obj => {
						let trip = await findTripforTime('10808', obj.vehicle, obj.DateOfTransaction);
						if (!trip) {
							console.error('trip not found ', obj.vehicle.vehicle_reg_no, obj.DateOfTransaction);
						}
						if (!obj.vehicle.fasttag || !obj.vehicle.fasttag._id) {
							console.error('fastag account not found ', obj.vehicle.vehicle_reg_no);
						}
						let prepareAdvanceObj = {
							amount: obj.Amount,
							person: obj.VehicleNumber + " FastTag",
							date: new Date(obj.DateOfTransaction),
							remark: obj.TypeOfTransaction + " by APIs",
							advanceType: 'Fastag',
							fastagDetail: obj,
							vehicle: obj.vehicle._id,
							vehicle_no: obj.vehicle.vehicle_reg_no,
							trip: (trip && trip._id) || undefined,
							trip_no: (trip && trip.trip_no) || undefined,
							driver: (trip && trip.driver && trip.driver._id) || undefined,
							vendor: (trip && trip.vendor && trip.vendor._id) || undefined,
							created_at: new Date(),
							clientId: clientData[0].clientId,
							remainingAmount: obj.Amount,
							bill_no: new Date(obj.DateOfTransaction).getTime(),
							reference_no: new Date(obj.DateOfTransaction).getTime(),
							from_account: fastagMasterAccount._id,
							to_account: obj.vehicle.fasttag._id,
							created_at: new Date()

						};
						if (obj.vehicle.fasttag && obj.vehicle.fasttag._id) {
							prepareVoucherData = {
								clientId: clientData[0].clientId,
								from: fastagMasterAccount._id,
								to: obj.vehicle.fasttag._id,
								type: "Payment",
								amount: obj.Amount,
								date: new Date(obj.DateOfTransaction),
								systemGenerated: true,
								//refNo:(trip && trip.trip_no) +
								narration: obj.vehicle.vehicle_reg_no + " by Fast Tag APIs " + (trip && trip.trip_no)
							};

							let expenseVoucher = await VoucherService.addVoucherAsync(prepareVoucherData);
							prepareAdvanceObj.voucher = expenseVoucher[0].voucher._id;
						}
						let advance2save = new TripAdvance(prepareAdvanceObj);
						let savedAdvance = await advance2save.save();
						if (trip) {
							await Trip.update(
								{
									_id: trip._id
								},
								{
									$push: {
										'advanceBudget': savedAdvance._id
									}
								}
							);
						}

					}));
				}
			});
		}

	} catch (err) {
		console.error(err);
	}
}

//fastagCreditTransaction();

async function settleFastagExpensesOnTrip() {
	let expenses = await TripExpense.find({
		clientId: "10808",
		trip: {$exists: false},
		"fastagDetail.VehicleNumber": {$exists: true}
	});
	expenses.forEach(async exp => {
		let trip = await findTripforTime('10808', {vehicle_reg_no: exp.fastagDetail.VehicleNumber}, exp.fastagDetail.TransactionDateTime);
		if (trip) {
			let data = await TripExpense.update({_id: exp._id}, {$set: {trip: trip._id, trip_no: trip.trip_no}});
			let tData = await Trip.update({_id: trip._id}, {$push: {trip_expenses: data._id}});
		}
	})
}

//settleFastagExpensesOnTrip();

async function settleAdvancesOnTrip() {
	let advances = await TripAdvance.find({clientId: "10808", trip: {$exists: false}, vehicle: {$exists: true}})
		.populate('vehicle');
	advances.forEach(async adv => {
		let trip = await findTripforTime('10808', adv.vehicle, adv.date);
		if (trip) {
			let data = await TripAdvance.update({_id: adv._id}, {$set: {trip: trip._id, trip_no: trip.trip_no}});
			let tData = await Trip.update({_id: trip._id}, {$push: {advanceBudget: data._id}});
		}
	})
}

//settleAdvancesOnTrip();

async function findTripforTime(clientId, vehicle, time) {
	let aTrip = await Trip.findByAdvanceDate({
		clientId: clientId,
		vehicle_no: vehicle.vehicle_reg_no,
		advanceDate: time,
	});
	if (aTrip && aTrip[0]) return aTrip[0];
	return;
	/*
	return (await (Trip.find({
		clientId:clientId,
		vehicle_no:vehicle.vehicle_reg_no,
		$and:[
			{
				statuses:{
					$elemMatch:{
						status: {$in:["Trip not started","Trip started"]},
						date: {$lte : new Date(time)}
					}
				}

			},
			{
				statuses:{
					$elemMatch:{
						status: {$in:["Trip ended","Trip cancelled"]},
						date: {$gte : new Date(time)}
					}
				}
			}
		]

	}).sort({$natural:-1}).limit(1)))[0];
	*/
}

function misGenerator() {
	/*
	 * Runs from monday to saturday (Monday through Saturday)
	 * at 11:59:00 PM.
	 */
	console.log('scheduler fired!!');
	/**daily mis**/
	var timeFired = new Date().getTime();
	misUtil.generateMISAndMailToUsers("daily", timeFired);
	/**aggregated mis**/
	misUtil.generateMISAndMailToUsers("aggregated", timeFired);
	/**weekly mis if sunday **/
	if (new Date(timeFired).getDay() === 0) {
		misUtil.generateMISAndMailToUsers("weekly", timeFired);
	}
	/**monthly mis**/
	if (new Date(timeFired).getDate() === 1) {
		misUtil.generateMISAndMailToUsers("monthly", timeFired);
	}
};

function customerXMLFileGenearator() {
	var timeFired = new Date().getTime();
	var startTime = dateUtil.getMorning(timeFired).getTime();
	sapXMLGeneratorUtil.generateCustomerXMLs(startTime, timeFired, true);
};

function XMLDataGenearator() {

	console.log("XML Data Generator Started"); // added nitin
	var genCallback = function (resp) {

		if (!resp) {
			console.log(" No Response For XML Data Generator");
		} else {
			console.log('customer success XML Data Generator');
		}
	};

	var today = new Date();
	today.setHours(22);
	today.setMinutes(40);
	var yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	yesterday.setHours(22);
	yesterday.setMinutes(40);

	var customerReq = {query: {clientId: '100003', last_modified_at: {$gte: yesterday, $lt: today}}};
	sapXMLGeneratorUtil.generateCustomerXMLData(customerReq, genCallback);

	var expenseReq = {query: {clientId: '100003', start_date: yesterday, end_date: today}};
	sapXMLGeneratorUtil.generateExpensesXMLData(expenseReq, genCallback);

	var invoiceReq = {query: {clientId: '100003', start_date: yesterday, end_date: today}};
	sapXMLGeneratorUtil.generateInvoiceXMLData(invoiceReq, genCallback);
};

function XMLFileGenearator() {
	console.log('XML File Generator Started !!');   // added nitin

	var timeFired = new Date().getTime();
	var startTime = dateUtil.getMorning(timeFired).getTime();
	sapXMLGeneratorUtil.generateExpensesXMLs(startTime, timeFired, true);
	sapXMLGeneratorUtil.generateInvoiceXMLs(startTime, timeFired, true);

};

var cronBackup = function () {
	console.log("cron_backup");
	backup_command("dumps/cron/");
};

function backup_command(path) {
	console.log("backup_command()");
	var cDate = new Date();
	var year = cDate.getFullYear();
	var month = ("0" + (cDate.getMonth())).slice(-2);
	var date = ("0" + (cDate.getDate())).slice(-2);
	var hour = ("0" + (cDate.getHours())).slice(-2);
	var min = ("0" + (cDate.getMinutes())).slice(-2);
	var sec = ("0" + (cDate.getSeconds())).slice(-2);
	var msec = ("00" + (cDate.getMilliseconds() + 1)).slice(-3);
	var filename = "dump_" + year + month + date;
	exec(config.backups.lmsDB + config.backups.path + filename, function (error, stdout, stderr) {
		console.log('dumpOut: ' + stdout);
		console.log('dumpCnt: ' + stderr);
		console.log('dumpfilename: ' + filename);

		if (error !== null) {
			console.log('exec error: ' + error);
		}
	});
	var keepingDump = 10;
	fs.readdir(config.backups.path, function (err, files) {
		files ? console.log("Dumps count: " + files.length.toString()) : console.log("Dumps count: " + 0);
		if (files && files.length > keepingDump) {
			var sortedFiles = orderByCTime(config.backups.path, files);
			for (var fi = 0; fi < files.length - keepingDump; fi++) {
				deleteFolderRecursive(config.backups.path + sortedFiles[fi]);
				console.log("Deleted dump: " + sortedFiles[fi]);
			}
		}
	})
}

function orderByCTime(directory, files) {
	files = files.map(function (fileName) {
		return {
			name: fileName,
			time: fs.statSync(directory + fileName).mtime.getTime()
		};
	})
		.sort(function (a, b) {
			return a.time - b.time;
		})
		.map(function (v) {
			return v.name;
		});
	return files;
}

var deleteFolderRecursive = function (path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function (file, index) {
			var curPath = path + "/" + file;
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};
//invSnapShot();
//backup_command("dump/");
//misGenerator();
//XMLDataGenearator();
//customerXMLFileGenearator();
//XMLFileGenearator();

