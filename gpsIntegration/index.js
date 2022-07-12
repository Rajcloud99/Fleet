const Receiver = new require('./receiver');

if(config.gpsServerDetail && config.gpsServerDetail.ip && config.gpsServerDetail.port) {
	console.log("Gps Config Found");
	global.receiver = new Receiver (config.gpsServerDetail.ip, config.gpsServerDetail.port);

	const CronJob = require ('cron').CronJob;
	const job = new CronJob ({
		cronTime: '00 */1 * * * *',
		onTick: function () {
			receiver.sendHeartbeat ();
		},
		start: true
	});
}
