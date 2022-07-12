const moment = require('moment');
const fastcsv = require('fast-csv');
const fs = require('fs');
const mkdirp = require('mkdirp');

module.exports = Stream;

const CONFIG = {
	debug: false,
	downloadLink: true,
};

class Stream {

	_cursor;
	_config = CONFIG;

	get path (){
		return 'reports/' + this._config.dir + '/';
	}

	constructor(cursor, option = {}) {
		if (cursor && typeof cursor.stream != 'function')
			throw new Error("Invalid Cursor");

		Object.assign(this._config, option);

		if(option.toCSV)
			this._applyCSVConfig();

		this._cursor = cursor;
	}

	toCsv(transformerFn, ...params) {

		if (!clientDir)
			throw new Error("Client Directory name is mandatory");

		if (!fileCategory)
			throw new Error("File Category is mandatory");

		if(typeof transformerFn !== 'function')
			throw new Error('Transform Function is required')

		// debug scenario
		if(this._config.debug){
			console.log('[start]', new Date());
			var startT = new Date().getTime();
			var i = 0;
			var now;
		}

		let csvStream = fastcsv.createWriteStream({headers: true}).transform((doc) => transformerFn(doc, ...params));
		let writeStream = fs.createWriteStream(`./files/reports/${req.user.clientId}/tripGrReport/Trip_GrReport_${moment().format('DD-MM-YYYY')}.csv`);
		let dataStream = grDataCursor.stream();
		dataStream.pipe(csvStream).pipe(writeStream);

		// debug scenario
		if(this._config.debug){
			dataStream.on('data', function (p1, p2) {
				now = new Date().getTime();
				now = parseInt((now - startT) / 60000); //min
				console.log(i, 'th Min ' + now);
				i++;
			});

			writeStream.on('open', function (p1, p2) {
				console.log('open');
			});

			writeStream.on('data', function (data) {
				now = new Date().getTime();
				now = parseInt((now - startT) / 60000); //min
				console.log('csv write finish ', now);
			});

			csvStream.on('finish', function () {
				console.log('csv finish');
				now = new Date().getTime();
				now = parseInt((now - startT) / 60000); //min
				console.log('csvStream finish ', now);
			});

			csvStream.on('data', function (data) {
				now = new Date().getTime();
				now = parseInt((now - startT) / 60000); //min
				console.log(i, 'csv data Min ', now);
			});

			csvStream.on('error', function (data) {
				console.log('csv error', data);
			});
		}

		writeStream.on('finish', function () {

			// debug scenario
			if(this._config.debug){
				console.log('done', new Date());
				now = new Date().getTime();
				now = parseInt((now - startT) / 60000); //min
				console.log(' Min ' + now);
			}

			let dir = 'reports/' + req.user.clientId + '/tripGrReport/';
			let filename = 'Trip_GrReport' + '_' + moment().format("DD-MM-YYYY") + '.csv';
			mkdirp.sync('./files/' + dir);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip Gr Report ',
				url: 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/' + dir + filename
			});
		});
	}
}
