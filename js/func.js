var request = require('request');
var fs = require('fs-extra');
/* Byte to human readable file size. From https://stackoverflow.com/a/14919494 */

exports.humanFileSize = function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}

exports.simpleDownload = function simpleDownload(simpleUrl,simplePath){
    return new Promise(function (resolve,reject){
        try{
            let req = request({method: 'GET',uri: simpleUrl})
            .on('end', function(chunk) {
                console.log('done '+simpleUrl);
            })
            .on('error', function(error) {
                reject(error);
            })
            .pipe(fs.createWriteStream(simplePath, {'flags': 'w'}));

            req.on('finish',function(){
                let stats = fs.statSync(simplePath)
                let fileSizeInBytes = stats["size"];
                if(fileSizeInBytes!=0){
                    console.log('done2 '+fileSizeInBytes);
                    resolve();
                } else {
                    reject();
                }
            });
        }
        catch(err){
            reject(err);
        }
    });
}

/* Convert binary arraybuffer to hex string */
exports.toHexString = function toHexString(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

exports.hexForHuman = function hexForHuman(hexString) {
    return hexString.match(/.{1,2}/g).join(" ");
}