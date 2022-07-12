var router = express.Router();
var fs = require( 'fs' );
var filePath;

var downloadFile = function ( req, res) {
    var providedFileName = req.params.fileName;
    var options = {
        host : commonUtil.getConfig('host'),
        port : commonUtil.getConfig('port'),
        path : providedFileName
    };
    console.log(providedFileName);
    console.log( filePath );
    var extname = path.extname(providedFileName);
    console.log(extname);
    extname = extname.toLowerCase();
    if ( extname == ".png" || extname == ".jpeg" || extname == ".jpg") {
        var ext = extname.replace('.', '');
        var file = fs.readFileSync( filePath, 'base64' );
        //res.setHeader( 'Content-Length', file.length );
        //res.write( file, 'base64' );
        //res.end();
        var data = {};
        data.completePath = "data:image/"+ext+";base64,"+file;
        data.format = 'image';
        res.send(data);
    } else if(extname == ".pdf"){
        var ext = extname.replace('.', '');
        var file = fs.readFileSync( filePath, 'base64' );
        var completePath = "data:application/"+ext+";base64,"+file;
        res.send(completePath);
    } else {
        res.status(500).json( {"status":"ERROR","message" : "file extension "+extname+" is not valid. Please use one out of png,jpeg,jpg,pdf."} );
    }
};

router.get( '/:fileName', function ( req, res, next ) {
    filePath = path.join( projectHome, "files", "clients", req.params.fileName);
    downloadFile(req,res);
});

router.get( '/drivers/:fileName', function ( req, res, next ) {
    filePath = path.join( projectHome, "files", "drivers", req.params.fileName);
    downloadFile(req,res);
});

/*var downloadFile = function ( req, res, fromFolder) {
    var providedFileName = req.params.fileName;
    var filePath = path.join(projectHome,"files",fromFolder,providedFileName);
    console.log(filePath);
    var options = {
        host : commonUtil.getConfig('host'),
        port : commonUtil.getConfig('port'),
        path : filePath
    };
    var extname = path.extname(providedFileName);
    console.log(extname);
    extname = extname.toLowerCase();
    if ( extname == ".png" || extname == ".jpeg" || extname == ".jpg" || extname ==".pdf" ) {
        var file = fs.readFileSync( filePath, 'binary' );
        res.setHeader( 'Content-Length', file.length );
        res.write( file, 'binary' );
        res.end();
    } else {
        res.status(500).json( {"status":"ERROR","message" : "file extension "+extname+" is not valid. Please use one out of png,jpeg,jpg,pdf."} );
    }
};

router.get( '/client/:fileName', function ( req, res, next ) {
    downloadFile(req,res,"clients");
});

router.get( '/user/:fileName', function ( req, res, next ) {
    downloadFile(req,res,"users");
});*/

module.exports = router;
