var Promise = require('bluebird');
const builder = require('xmlbuilder');
const mkdirp = require('mkdirp');
 const fs = require('fs');
 const encoding = 'UTF-8';
 const xmlDir = 'xmlFiles/';
var oJSON = {
  kamal: {
    bharath: {
      manish: {
        '@type': 'git', // attributes start with @
        '#text': 'git://github.com/oozcitak/xmlbuilder-js.git' // text node
      }
    }
  }
};
//module.exports.generateXMLFromObject = function(oJSON) {
var generateXMLFromObject = function(oJSON) {
  var xml = builder.create(oJSON,{ encoding: encoding });
  //console.log(xml.end({ pretty: true }));
  var path = './files/' + xmlDir;
  mkdirp.sync(path);
  var filePath = path+'/foo.xml';
  var ws = fs.createWriteStream(filePath);
   ws.on('close', function() {
           console.log(fs.readFileSync(filePath, encoding));
   });
   ws.write(xml.end({ pretty: true }), encoding);
   ws.end();
  return xml;
};
function saveFileAndReturnCallback(workbook, clientId, folderType, reportname,  startDDMMYY, endDDMMYY, callback) {
    var dir = 'reports/' + clientId + '/' + folderType+ '/' ;
    if (startDDMMYY && endDDMMYY) {
        var filename = reportname +"_"+ startDDMMYY + "_" + endDDMMYY + '.xlsx';
    }else{
        filename = reportname + '.xlsx';
    }
    mkdirp.sync('./files/' + dir);
    workbook.xlsx.writeFile('./files/' + dir + filename).then(function() {
        callback({
            url:'http://'+commonUtil.getConfig('download_host') +':'
            +commonUtil.getConfig('download_port')+'/' + dir + filename,
            dir:dir,
            filename:filename
        });
    });
}
//generateXMLFromObject(oJSON);
