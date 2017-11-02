var remote = require('electron').remote;
const {app} = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
var fs = require('fs');
var request = require('request');
var sanitizefn = require("sanitize-filename");
const path = require('path');
var exec = require('child_process').exec;
var shell = remote.shell;
var os = require('os');
var flow = require('./js/flow.js')
const Store = require('./js/store.js');
const store = new Store({
  configName: 'config',
  defaults: {
	enctitlekeysBinRemoteUrl: ""
  }
});
const etkStore = new Store({
  configName: 'etkCache',
  defaults: {
  }
});
var basenum = 320;
var tk = 0x140;
var tikteminhex = '00010004d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000526f6f742d434130303030303030332d585330303030303030630000000000000000000000000000000000000000000000000000000000000000000000000000feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface010000cccccccccccccccccccccccccccccccc00000000000000000000000000aaaaaaaaaaaaaaaa00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010014000000ac000000140001001400000000000000280000000100000084000000840003000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
var magicinhex = '00010004919ebe464ad0f552cd1b72e7884910cf55a9f02e50789641d896683dc005bd0aea87079d8ac284c675065f74c8bf37c88044409502a022980bb8ad48383f6d28a79de39626ccb2b22a0f19e41032f094b39ff0133146dec8f6c1a9d55cd28d9e1c47b3d11f4f5426c2c780135a2775d3ca679bc7e834f0e0fb58e68860a71330fc95791793c8fba935a7a6908f229dee2a0ca6b9b23b12d495a6fe19d0d72648216878605a66538dbf376899905d3445fc5c727a0e13e0e2c8971c9cfa6c60678875732a4e75523d2f562f12aabd1573bf06c94054aefa81a71417af9a4a066d0ffc5ad64bab28b1ff60661f4437d49e1e0d9412eb4bcacf4cfd6a3408847982000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000526f6f742d43413030303030303033000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000158533030303030303063000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137a0894ad505bb6c67e2e5bdd6a3bec43d910c772e9cc290da58588b77dcc11680bb3e29f4eabbb26e98c2601985c041bb14378e689181aad770568e928a2b98167ee3e10d072beef1fa22fa2aa3e13f11e1836a92a4281ef70aaf4e462998221c6fbb9bdd017e6ac590494e9cea9859ceb2d2a4c1766f2c33912c58f14a803e36fccdcccdc13fd7ae77c7a78d997e6acc35557e0d3e9eb64b43c92f4c50d67a602deb391b06661cd32880bd64912af1cbcb7162a06f02565d3b0ece4fcecddae8a4934db8ee67f3017986221155d131c6c3f09ab1945c206ac70c942b36f49a1183bcd78b6e4b47c6c5cac0f8d62f897c6953dd12f28b70c5b7df751819a9834652625000100010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010003704138efbbbda16a987dd901326d1c9459484c88a2861b91a312587ae70ef6237ec50e1032dc39dde89a96a8e859d76a98a6e7e36a0cfe352ca893058234ff833fcb3b03811e9f0dc0d9a52f8045b4b2f9411b67a51c44b5ef8ce77bd6d56ba75734a1856de6d4bed6d3a242c7c8791b3422375e5c779abf072f7695efa0f75bcb83789fc30e3fe4cc8392207840638949c7f688565f649b74d63d8d58ffadda571e9554426b1318fc468983d4c8a5628b06b6fc5d507c13e7a18ac1511eb6d62ea5448f83501447a9afb3ecc2903c9dd52f922ac9acdbef58c6021848d96e208732d3d1d9d9ea440d91621c7a99db8843c59c1f2e2c7d9b577d512c166d6f7e1aad4a774a37447e78fe2021e14a95d112a068ada019f463c7a55685aabb6888b9246483d18b9c806f474918331782344a4b8531334b26303263d9d2eb4f4bb99602b352f6ae4046c69a5e7e8e4a18ef9bc0a2ded61310417012fd824cc116cfb7c4c1f7ec7177a17446cbde96f3edd88fcd052f0b888a45fdaf2b631354f40d16e5fa9c2c4eda98e798d15e6046dc5363f3096b2c607a9d8dd55b1502a6ac7d3cc8d8c575998e7d796910c804c495235057e91ecd2637c9c1845151ac6b9a0490ae3ec6f47740a0db0ba36d075956cee7354ea3e9a4f2720b26550c7d394324bc0cb7e9317d8a8661f42191ff10b08256ce3fd25b745e5194906b4d61cb4c2e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000526f6f7400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001434130303030303030330000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007be8ef6cb279c9e2eee121c6eaf44ff639f88f078b4b77ed9f9560b0358281b50e55ab721115a177703c7a30fe3ae9ef1c60bc1d974676b23a68cc04b198525bc968f11de2db50e4d9e7f071e562dae2092233e9d363f61dd7c19ff3a4a91e8f6553d471dd7b84b9f1b8ce7335f0f5540563a1eab83963e09be901011f99546361287020e9cc0dab487f140d6626a1836d27111f2068de4772149151cf69c61ba60ef9d949a0f71f5499f2d39ad28c7005348293c431ffbd33f6bca60dc7195ea2bcc56d200baf6d06d09c41db8de9c720154ca4832b69c08c69cd3b073a0063602f462d338061a5ea6c915cd5623579c3eb64ce44ef586d14baaa8834019b3eebeed3790001000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
var finalTitleKey;

app.showExitPrompt = false;

function isDev() {
  return process.mainModule.filename.indexOf('app.asar') === -1;
}

function execute(command, callback){
    exec(command, function(error, stdout, stderr){ callback(stdout); });
}

function downloadMcc(file_url , targetPath,callback){
    let req = request({
        method: 'GET',
        uri: file_url
    });
	let downloadfile = fs.createWriteStream(targetPath, {'flags': 'w'});
    req.on('data', function(chunk) {
		downloadfile.write(chunk, encoding='binary');
    });
    req.on('end', function() {
		downloadfile.end();
		$('#mcc').html('Download completed');
		console.log('Finished downloading make_cdn_cia for this OS.');
		callback();
	});
	req.on('error', function() {
		$('#mcc').html('ERROR');
        $('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">Cannot download make_cdn_cia from the internet.</div>');
        throw 'download_mcc_failed';
    });
}

function validFileCheck(targetPath, total_bytes){
	if (fs.existsSync(targetPath)) {
		var stats = fs.statSync(targetPath)
		var fileSizeInBytes = stats["size"];
		console.log('Local file size: '+fileSizeInBytes+', True file size: '+total_bytes);
		if( fileSizeInBytes == total_bytes){
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

function humanFileSize(bytes, si) {
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

function toHexString(byteArray) {
  return Array.prototype.map.call(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function hex2binArr(inputhex){
	var a = [];
	for (var i = 0; i < inputhex.length; i += 2) {
		a.push(parseInt(inputhex.substr(i, 2),16));
	}
	return a;
}

function makecia(makeciadir, rawdir , ciadir){
	execute(makeciadir+' "'+rawdir+'" "'+ciadir+'"', function(output) {
		console.log(makeciadir+' "'+rawdir+'" "'+ciadir+'"');
		console.log(output);
		output = output.replace(/(?:\r\n|\r|\n)/g, '<br />');
		$('#makecia').html(''+makeciadir+' "'+rawdir+'" "'+ciadir+'"'+'<br>'+output+'');
		$('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">Everything finished.</div>');
		app.showExitPrompt = false;
	});
}

function choiceHandle(file_url , targetPath, cID, ContentCount, dldir){
	let req = request({
		method: 'GET',
		uri: file_url
	});
	req.on('response', function ( data ) {
		// Change the total bytes value to get progress later.
			fileSize = parseInt(data.headers['content-length' ]);
			//fileSize = xhr.getResponseHeader('Content-Length');
			console.log('cid '+cID+' size: '+fileSize);
			if (fs.existsSync(targetPath)) {
				var checkValid = validFileCheck(targetPath,fileSize);
				if(checkValid == true){
					$('#info'+cID).html('Content #'+cID+' seems like it\'s already downloaded, with matched size.<br><button id="redownload" class="mdl-button mdl-js-button mdl-button--primary">Redownload</button>'
					+'<button id="finished" class="mdl-button mdl-js-button mdl-button--primary">Keep it</button>');
					$('#info'+cID+' #redownload').on('click', function(){
						if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
						choiceHandle(file_url , targetPath, cID, ContentCount, dldir);
					});
					$('#info'+cID+' #finished').on('click', function(){
						$('#info'+cID).hide();
						$('#instruct'+cID).hide();
						document.querySelector('#p'+cID).MaterialProgress.setProgress(100);
						$('#done'+cID).html('Content #'+cID+' is already downloaded before.');
						checkFinished(cID,ContentCount);
					});
				} else {
					$('#info'+cID).html('Content #'+cID+' seems like it\'s just partially downloaded and corrupted.<br><button id="redownload" class="mdl-button mdl-js-button mdl-button--primary">Redownload</button>');
					$('#info'+cID+' #redownload').on('click', function(){
						if (fs.existsSync(targetPath)) {fs.unlinkSync(targetPath);}
						choiceHandle(file_url , targetPath, cID, ContentCount, dldir);
					});
				}
			}else if(fileSize > 100000000){
				largeFileChoices = 'Content #'+cID+' is quite large ('+humanFileSize(fileSize,false)+').<br><button id="dlanyway" class="mdl-button mdl-js-button mdl-button--primary">Download anyway</button>';
				largeFileChoices+= '<button id="dlmanually" class="mdl-button mdl-js-button mdl-button--primary">I\'ll download it myself</button>'
				if(os.platform()=='win32')
					largeFileChoices+='<button id="dlwithidm" class="mdl-button mdl-js-button mdl-button--primary">Download with IDM</button>';
				else if(os.platform()=='linux')
					largeFileChoices+='<button id="dlwithuget" class="mdl-button mdl-js-button mdl-button--primary">Download with uGet</button>';
				largeFileChoices +='<button id="finished" class="mdl-button mdl-js-button mdl-button--primary">I\'ve downloaded it</button>';
				
				$('#info'+cID).html(largeFileChoices);
				
				$('#info'+cID+' #dlanyway').on('click', function(){
					$('#info'+cID).hide();
					$('#instruct'+cID).hide();
					downloadFile(file_url , targetPath, cID, ContentCount)
				});
				$('#info'+cID+' #dlmanually').on('click', function(){
					$('#instruct'+cID).html('Download following file URL:<br><span class="mdl-chip"><span class="mdl-chip__text">'+file_url+'</span></span><br>And save it to this path:<br><span class="mdl-chip"><span class="mdl-chip__text">'+dldir+'</span></span><br>With filename: <span class="mdl-chip"><span class="mdl-chip__text">'+cID+'</span></span>. After the file is finished downloading, click <span class="mdl-chip"><span class="mdl-chip__text">I\'ve downloaded it</span></span> button.');
				});
				
				$('#info'+cID+' #dlwithidm').on('click', function(){
					defaultidmpath = 'C:\\Program Files (x86)\\Internet Download Manager\\IDMan.exe';
					$('#instruct'+cID).html('<div class="mdl-textfield mdl-js-textfield"><input class="mdl-textfield__input" type="text" value="'+defaultidmpath+'" id="idmpathinput"></div><button id="selectidmpath" class="mdl-button mdl-js-button mdl-button--raised mdl-button--accent">Select...</button><br><button id="idmapply" class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-button--primary">Apply</button>');
					$('#instruct'+cID+' #selectidmpath').on('click', function(){
						dialog.showOpenDialog({ 
							defaultPath: defaultidmpath,
							filters: [{name: 'IDMan.exe File', extensions: ['exe']}],
							properties: [ 
								'openFile', 'multiSelections'
							]
						}, function(filePaths){
							console.log(filePaths);
							if(filePaths) $('#idmpathinput').val(filePaths);
						});
					});
					
					$('#instruct'+cID+' #idmapply').on('click', function(){
						if (fs.existsSync(targetPath)) {fs.unlinkSync(targetPath);}
						execute('"'+$('#idmpathinput').val()+'" /d '+file_url+' /p "'+dldir+'" /f "'+cID+'"', function(output) {
							console.log('"'+$('#idmpathinput').val()+'" /d '+file_url+' /p "'+dldir+'" /f "'+cID+'"');
							console.log(output);
						});
					});
					
			   });
			   
			   
			   $('#info'+cID+' #dlwithuget').on('click', function(){
						execute('uget-gtk --filename="'+cID+'" --folder="'+dldir+'" "'+file_url+'"', function(output) {
						console.log('"'+$('#idmpathinput').val()+'" /d '+file_url+' /p "'+dldir+'" /f "'+cID+'"');
						console.log(output);
						});
			   });
			   
			   
				$('#info'+cID+' #finished').on('click', function(){
					
					if (fs.existsSync(targetPath)) {
						var stats = fs.statSync(targetPath)
						var fileSizeInBytes = stats["size"];
						if(fileSizeInBytes == fileSize){
							$('#info'+cID).hide();
							$('#instruct'+cID).hide();
							document.querySelector('#p'+cID).MaterialProgress.setProgress(100);
							$('#done'+cID).html('Content #'+cID+' is succesfully downloaded by user.');
							checkFinished(cID,ContentCount);
						} else {
							$('#instruct'+cID).html('Content #'+cID+' which you\'ve manually downloaded is probably corrupted.');
						}
					} else {
						$('#instruct'+cID).html('Content #'+cID+' is not exist. Are you sure you did downloaded this and put '+cID+' file to the right directory?');
					}
				});
		   } else {
			   $('#info'+cID).html('');
			   downloadFile(file_url , targetPath, cID, ContentCount);
		   }
	});
	req.on('error', function() {
        $('#info'+cID).html('Content #'+cID+' is failed to download.<br><button id="dlanyway" class="mdl-button mdl-js-button mdl-button--primary">Redownload</button>');
		$('#info'+cID+' #dlanyway').on('click', function(){
			if (fs.existsSync(targetPath)) {fs.unlinkSync(targetPath);}
			choiceHandle(file_url , targetPath, cID, ContentCount, dldir);
		});
		app.showExitPrompt = false;
    });
}

function downloadFile(file_url , targetPath, cID, ContentCount){
	if (fs.existsSync(targetPath)) {
		fs.unlinkSync(targetPath);
	}
    // Save variable to know progress
    let received_bytes = 0;
    let total_bytes = 0;

    let req = request({
        method: 'GET',
        uri: file_url
    });

    //var out = fs.createWriteStream(targetPath);
	let cIData = cID;
    //req.pipe(out);
	let downloadfile = fs.createWriteStream(targetPath, {'flags': 'w'});
    req.on('response', function ( data ) {
        // Change the total bytes value to get progress later.
        total_bytes = parseInt(data.headers['content-length' ]);
    });

    req.on('data', function(chunk) {
		downloadfile.write(chunk, encoding='binary');
        // Update the received bytes
		received_bytes += chunk.length;
        showProgress(received_bytes, total_bytes, cID);
		app.showExitPrompt = true;
    });

    req.on('end', function() {
		downloadfile.end();
		var checkValid = validFileCheck(targetPath,total_bytes);
		if (checkValid == true){
			$('#done'+cIData).html('Content #'+cIData+' is succesfully downloaded.');
			checkFinished(cIData,ContentCount);
		} else {
			$('#done'+cIData).html('');
			$('#info'+cIData).html('Content #'+cIData+' is somehow corrupted when downloading.<br><button id="redownload" class="mdl-button mdl-js-button mdl-button--primary">Redownload</button>');
			$('#info'+cID+' #redownload').on('click', function(){
				if (fs.existsSync(targetPath)) {fs.unlinkSync(targetPath);}
				choiceHandle(file_url , targetPath, cID, ContentCount, dldir);
			});
			$('#info'+cID).show();
		}
		app.showExitPrompt = false;
	});
	req.on('error', function() {
        $('#info'+cIData).html('Content #'+cIData+' is failed to download.<br><button id="redownload" class="mdl-button mdl-js-button mdl-button--primary">Redownload</button>');
		$('#info'+cID+' #redownload').on('click', function(){
			if (fs.existsSync(targetPath)) {fs.unlinkSync(targetPath);}
			choiceHandle(file_url , targetPath, cID, ContentCount, dldir);
		});
		$('#info'+cID).show();
		app.showExitPrompt = false;
    });
}

function showProgress(received, total, cID){
    var percentage = (received * 100) / total;
    //console.log(percentage + "% | " + received + " bytes out of " + total + " bytes.");
	$('#info'+cID).html('');
	$('#done'+cID).html(percentage.toFixed(2) + '% | ' + humanFileSize(received,false) + ' out of ' + humanFileSize(total,false));
	document.querySelector('#p'+cID).MaterialProgress.setProgress(percentage);
	//$("#output").append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">'+cID+': '+percentage.toFixed(2) + '% | ' + humanFileSize(received,false) + ' out of ' + humanFileSize(total,false) + '.</div>');
}

var cIDtotal = [];
function checkFinished(cID, ContentCount){
	cIDtotal.push(cID);
	if(cIDtotal.length==ContentCount){
		$('#content').append('<div id="makecia" class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">All tasks finished. Executing make_cdn_cia.exe. It will take long if the cia file is large...</div>');
		makecia(makeciadir, dldir, path.join(basedir,'cias',filename));
	}
}


function processDownloadTitle(results,data) {
	tmdDownloadedData = results['tmdData'];
	//$("#enctitlekey").html('Precaching. This might take a while!');
	if(etkStore.get('status')!='done'){
		encTitleKeysData = results['etkData'];
		var encTitleKeysArray = new Uint8Array(encTitleKeysData.target.response);
		etkArrLength = encTitleKeysArray.length;
		addEtkCache = new Object();
		for(let i = 16; i < etkArrLength; i += 32){
			let titleId = toHexString(encTitleKeysArray.slice(i+8 ,i+16));
			let titleKey = toHexString(encTitleKeysArray.slice(i+16, i+32));
			addEtkCache[titleId] = titleKey;
			if(titleId == data.titleID){
				finalTitleKey = toHexString(encTitleKeysArray.slice(i+16, i+32));
				console.log(titleId,finalTitleKey);
			}
		}
		addEtkCache['status'] = 'done';
		try {
			fs.writeFileSync(path.join(basedir, 'etkCache.json'), JSON.stringify(addEtkCache));
		}
		catch (err){
			console.log(err);
		}
		if(typeof finalTitleKey === 'undefined') {
			$("#enctitlekey").html('ERROR');
			$("#tmd").html('ERROR');
			$('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">Your remote enctitlekeys.bin file does not contain necessary titlekey. Please recheck your remote enctitlekeys.bin file URL.</div>');
			app.showExitPrompt = false;
			throw 'no_titlekey_found_from_enctitlekeys_bin';
		} else {
			$("#enctitlekey").html(finalTitleKey);
		}
	}
	
	
	var tmdByteTypedArray = new Uint8Array(tmdDownloadedData.target.response);
	
	/* Convert tiktem and magic in hexadecimal to a binary array */
	tikdataArr = hex2binArr(tikteminhex);
	magic = hex2binArr(magicinhex);
	
	
	/* Count the number of content(s) that need to be downloaded */
	hexContentCount = toHexString(tmdByteTypedArray.slice(tk+0x9E, tk+0xA0));
	ContentCount = parseInt(hexContentCount,16);
	$('#contentcount').html(ContentCount);
	
	
	//console.log('tikdatainhex with hextobinarr:');
	//console.log(hex2binArr(tikteminhex));
	//tikdataArr = Array.prototype.slice.call(tikdata);
	
	/* Replace #1 */
	tmdcut = tmdByteTypedArray.slice(476, 478);
	tmdcutArr = Array.prototype.slice.call(tmdcut);
	Array.prototype.splice.apply(tikdataArr, [486, tmdcutArr.length].concat(tmdcutArr));
	
	/* Replace #2 */
	titleIdArr = hex2binArr(data.titleID);
	//console.log('titleIdArr: '+titleIdArr+ ' and '+titleIdArr.length);
	Array.prototype.splice.apply(tikdataArr, [476,titleIdArr.length].concat(titleIdArr));
	
	/* Replace #3 */
	encTitleKeyArr = hex2binArr(finalTitleKey);
	//console.log('encTitleKeyArr: '+encTitleKeyArr+ ' and '+encTitleKeyArr.length);
	Array.prototype.splice.apply(tikdataArr, [447, encTitleKeyArr.length].concat(encTitleKeyArr));
	
	
	/* Create cetk file by joining tikdata with magic */
	var finalCetk = new Buffer(tikdataArr.concat(magic));
	
	/* Save tmd and cetk file to download dir */
	try {
		fs.writeFileSync(path.join(dldir,'tmd'), tmdByteTypedArray);
		$("#tmd").html('Saved tmd!');
	} catch (err) {
		throw err;
		$("#tmd").html('Error while saving tmd!');
	}
	
	try {
		fs.writeFileSync(path.join(dldir,'cetk'), finalCetk );
		$("#cetk").html('Saved cetk!');
	} catch (err) {
		throw err;
		$("#cetk").html('Error while saving cetk!');
	}


	/* Paste make_cdn_cia to base dir */
	
	if(os.platform()=='win32'){
		mccUrl = 'https://github.com/tranxuanthang/villain3ds/raw/master/make_cdn_cia.exe';
	} else if(os.platform()=='linux'){
		mccUrl = 'https://github.com/tranxuanthang/villain3ds/raw/master/make_cdn_cia';
	} else if(os.platform()=='darwin'){
		mccUrl = 'https://github.com/tranxuanthang/villain3ds/raw/master/make_cdn_cia_macos';
	}

	flow.exec(
		function(){
			if (!fs.existsSync(makeciadir)){
				$('#mcc').html('Downloading...');
				downloadMcc(mccUrl , makeciadir,this);
				console.log('Started downloading make_cdn_cia for this OS.');
			} else {
				$('#mcc').html('Already downloaded before');
				console.log('Skipped downloading make_cdn_cia because this file is already exist.');
				this();
			}
		},
		function(){
			if(os.platform()=='linux' || os.platform()=='darwin'){
				fs.chmodSync(makeciadir,'744');
			}
			for(var i = 0; i < ContentCount; i++) {
				//console.log('i='+i);
				var cOffs = 0xB04+(0x30*i);
				var cID = toHexString(tmdByteTypedArray.slice(cOffs, cOffs+0x04));
				$('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing"><div>Content: '+cID+'</div><div id="p'+cID+'" class="progressbar mdl-progress mdl-js-progress"></div><div id="info'+cID+'"></div><div id="instruct'+cID+'"></div><div id="done'+cID+'"></div></div>');
				var prog = document.querySelector('#p'+cID);
				componentHandler.upgradeElement(prog);
				choiceHandle('http://ccs.cdn.c.shop.nintendowifi.net/ccs/download/'+data.titleID+'/'+cID, path.join(dldir,cID), cID, ContentCount, dldir);
			}
		}
	);

	/* Create download tasks for each cID */
	
	
	filename = sanitizefn(data.name+' '+data.region+' ('+data.titleID+').cia');
	//}
}
function processDownload(event, data){
	if(!data.titleID || !data.region ||!data.name){
		$("#name").html('ERROR');
		$("#region").html('ERROR');
		$("#titleid").html('ERROR');
		$('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">Title information can\'t be achieved.</div>');
		throw 'title-info-can-not-be-achieved';
	} else {
		$("#name").html(data.name);
		$("#region").html(data.region);
		$("#titleid").html(data.titleID);
	}
	/* Get home directory */
	homedir = app.getPath('home');
	
	/* Generate app's directories */
	basedir = path.join(homedir, 'Villain3DS');
	if(os.platform()=='win32') {
		makeciadir = path.join(basedir,'make_cdn_cia.exe')
	} else if(os.platform()=='linux')  {
		makeciadir = path.join(basedir,'make_cdn_cia')
	} else if(os.platform()=='darwin') {
		makeciadir = path.join(basedir,'make_cdn_cia_macos')
	}
	
	rawdir = path.join(basedir,'raw');
	dldir = path.join(rawdir,data.titleID);
	ciadir = path.join(basedir,'cias');
	
	/* Create dir if not exist */
	if (!fs.existsSync(basedir)){
		fs.mkdirSync(basedir);
	}
	if (!fs.existsSync(rawdir)){
		fs.mkdirSync(rawdir);
	}
	if (!fs.existsSync(dldir)){
		fs.mkdirSync(dldir);
	}
	if (!fs.existsSync(path.join(basedir,'cias'))){
		fs.mkdirSync(path.join(basedir,'cias'));
	}

	$('#dldir').html(dldir);
	$('#showinfm').on('click',function (){shell.showItemInFolder(dldir)});
	
	$('#ciadir').html(ciadir);
	$('#showinfm2').on('click',function (){shell.showItemInFolder(ciadir)});

	/* Fetch encTitleKeys.bin (from user defined url) and tmd (from cdn) asynchronously (hopefully) */
	if(!store.get('enctitlekeysBinRemoteUrl')){
		$('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">No encTitleKeys.bin remote URL detected. Please add one (by opening "config" section in main window).</div>');
		$("#enctitlekey").html('ERROR');
		$("#tmd").html('ERROR');
		throw 'no_enctitlekeys_bin_remote_url_found';
		app.showExitPrompt = false;
	} else {
		flow.exec(
			function() {
				if(etkStore.get('status')!='done'){
					$("#enctitlekey").html('Fetching...');
					etkXhr = new XMLHttpRequest();
					etkXhr.open('GET', store.get('enctitlekeysBinRemoteUrl'), true);
					etkXhr.responseType = 'arraybuffer';
					etkXhr.onload = this.MULTI('etkData');
					etkXhr.send();
					etkXhr.onerror = function() {
						$('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">Cannot fetch enctitlekeys.bin data.</div>');
						$("#enctitlekey").html('ERROR');
						$("#tmd").html('ERROR');
						app.showExitPrompt = false;
					}
				} else {
					finalTitleKey = etkStore.get(data.titleID);
					$("#enctitlekey").html(finalTitleKey);
				}
				
				$("#tmd").html('Fetching...');
				tmdXhr = new XMLHttpRequest();
				tmdXhr.open('GET', 'http://ccs.cdn.c.shop.nintendowifi.net/ccs/download/'+data.titleID+'/tmd', true);
				tmdXhr.responseType = 'arraybuffer';
				tmdXhr.onload = this.MULTI('tmdData');
				tmdXhr.send();
				tmdXhr.onerror = function() {
					$('#content').append('<div class="mdl-color--white mdl-color-text--grey-800 mdl-cell mdl-cell--12-col listing">Cannot fetch tmd data from CDN.</div>');
					$("#enctitlekey").html('ERROR');
					$("#tmd").html('ERROR');
					app.showExitPrompt = false;
				}
			},function(results){
				processDownloadTitle(results,data);
			}
		);
	}
}

ipcRenderer.once('download-title' , processDownload);
$(document).ready(function(){
	ipcRenderer.send('dlprocess-ready');
});