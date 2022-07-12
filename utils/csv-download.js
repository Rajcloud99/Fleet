const moment = require('moment');
const fastcsv = require('fast-csv');
const fs = require('fs');
const mkdirp = require('mkdirp');
const DIR = `${projectHome}/files/reports`

class CsvDownload {

	constructor(model, query, options = {}) {

		if(!options.filePath)
			throw new Error("File Path is requried");

		if(!options.fileName)
			throw new Error("File Name is requried");

		this._aggregate = model.aggregate(query);
		this._aggregate.options = {allowDiskUse: true, batchSize: 3000};
		this._options = options;
		mkdirp.sync(`${DIR}/${this._options.filePath}`);
		this._filePath = `${DIR}/${this._options.filePath}/${this._options.fileName}.csv`;
		this._downloadPath = 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/reports/' + this._options.filePath + '/' + this._options.fileName + '.csv';
	}

	async exec(transformerFn, ...params) {
		/************** Enable only if you want to debug **************/
		console.log('[start]', new Date());
		var startT = new Date().getTime();
		var i = 0;
		var now;
		/************** End **************/


		if(!transformerFn)
			throw new Error('Transform function is required');

		this._cursor = this._aggregate.cursor({batchSize: 3000}).exec();
		let csvStream = fastcsv.createWriteStream({headers: true}).transform((doc) => transformerFn(doc, ...params));
		return new Promise((resolve, reject) => {
			let writeStream = fs.createWriteStream(this._filePath);
			let dataStream = this._cursor.stream();
			dataStream.pipe(csvStream).pipe(writeStream);

			/************** Enable only if you want to debug **************/
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
				//console.log(i, 'csv data Min ', now);
			});

			csvStream.on('error', function (data) {
				console.log('csv error', data);
			});
			/************** End **************/

			writeStream.on('finish',  () => {

				/************** Enable only if you want to debug **************/
				//console.log('done', new Date());
				now = new Date().getTime();
				now = parseInt((now - startT) / 60000); //min
				//console.log(' Min ' + now);
				/************** End **************/

				resolve(this._downloadPath);
			});
		});
	}
}

module.exports = CsvDownload;
