/**
 * @Author: kamal
 * @Date:   2017-12-19T21:26:04+05:30
 */
const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
function getToken() {
	//if (config.isProductionServer) return '295852134:AAEPG3t_bUNzwrfYWTzlP-T3c2sjurNqohA';
	if (config.isTestServer || config.isProductionServer){
		return '500561125:AAHDz_LN-j0wRoIQs2Yp30AUPHU4zEXAixc';
	}

	return false;
}

function getChatId() {
	//if (config.isProductionServer) return '-167944093';
	//if (config.isTestServer) return '-150594517';
	//if (config.isDevelopServer) return '-223292466';
	return '-269687603';
	//return false;
}

function getAlertChatId() {
	return '-214960690';
}

let bot;

if (getToken()) bot = new TelegramBot(getToken(), {polling: false});
exports.sendMessage = function () {
	if (!bot) return;
	bot.sendMessage(getChatId(), Array.from(arguments).join(' ')).then(function () {
	}).catch(function () {
	});
};

exports.sendAlert = function () {
	if (!bot) return;
	bot.sendMessage(getAlertChatId(), Array.from(arguments).join(' ')).then(function () {
	}).catch(function () {
	});
	bot.sendMessage(getChatId(), Array.from(arguments).join(' ')).then(function () {
	}).catch(function () {
	});
};
