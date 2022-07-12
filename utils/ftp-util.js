var Client = require('ftp');
var fs = require('fs');
exports.uploadFileToFTPServer = function(local,remote,filename){
  var c = new Client();
  c.on('ready', function(e) {
      console.log(e,local,remote);
    c.put(projectHome+'/'+local,filename, function(err) {
      if (err) throw err;
      c.end();
    });
  });
  if(config.remoteServerConfig) c.connect(config.remoteServerConfig);
};
exports.listFilesFromRemoteServer = function(){
 var c = new Client();
 c.on('ready', function() {
  c.list(function(err, list) {
    if (err) throw err;
    console.dir(list);
    c.end();
  });
  });
 console.log(config.remoteServerConfig);
 if(config.remoteServerConfig) c.connect(config.remoteServerConfig);
};
exports.createDirOnFTPServer = function(){
  var c = new Client();
  c.on('ready', function() {
    c.mkdir('TEST2', function(err) {
      if (err) throw err;
      c.end();
    });
  });
 if(config.remoteServerConfig) c.connect(config.remoteServerConfig);
};

//testing
//exports.uploadFileToFTPServer("sapXmlFiles/100001/customerXML.xml","/TEST","/TEST/customerXML.xml");
//exports.createDirOnFTPServer();
//exports.listFilesFromRemoteServer();
