'use strict';
var remote = require('electron').remote;
const {app} = require('electron').remote;
const {dialog} = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
var fs = require("fs-extra");
var request = require('request');
var Downloader = require('mt-files-downloader');
var sanitizefn = require("sanitize-filename");
const path = require('path');
var exec = require('child_process').exec;
var shell = remote.shell;
var os = require('os');
var Mustache = require('mustache');
const crypto = require('crypto');
var func = require('./js/func.js');

app.showExitPrompt = false;

/* Get saved data from config file */
const Store = require('./js/store.js');
const store = new Store({
    configName: 'config',
    defaults: {
        enctitlekeysBinRemoteUrl: "",
        baseDirectory: path.join(app.getPath('home'), 'Villain3DS'),
        region: "all"
    }
});
const etkStore = new Store({
    configName: 'etkCache',
    defaults: {}
});

const newTitleTemplate = 
'<div class="card" id="{{title-id}}">'
    +'<header class="card-header">'
        +'<p class="card-header-title">'
            +'<span class="title-name allow-select allow-drag" style="margin-right: 3px;">{{title-name}}</span> (<span class="title-region">{{title-region}}</span>)'
        +'</p>'
    +'</header>'
    +'<div class="card-content">'
        +'<div class="columns title-info-columns">'
            +'<div class="column title-info-column">'
                +'<strong>TitleID:</strong><br><span class="title-id allow-select allow-drag">{{title-id}}</span>'
            +'</div>'
            +'<div class="column title-info-column">'
                +'<strong>TitleKey:</strong><br><span class="title-key allow-select allow-drag">{{title-key}}</span>'
            +'</div>'
        +'</div>'
        +'<div class="columns title-info-columns">'
            +'<div class="column title-info-column">'
                +'<strong>Tmd:</strong> <span class="title-tmd allow-select allow-drag">#</span>'
            +'</div>'
            +'<div class="column title-info-column">'
                +'<strong>Cetk:</strong> <span class="title-cetk allow-select allow-drag">#</span>'
            +'</div>'
            +'<div class="column title-info-column">'
                +'<strong>Content:</strong> <span class="title-contentcount allow-select allow-drag">#</span>'
            +'</div>'
        +'</div>'
        +'<div class="alert allow-select allow-drag"></div>'
    +'</div>'
+'</div>';

const newContentTemplate = 
'<div class="title-content" id="{{content-id}}">'
    +'<div class="level cdlevel"><div class="content-title allow-select allow-drag level-left cdlevel-left">Content: {{content-id}}</div><div class="level-right cdlevel-right"><div class="download-control level-item"></div></div></div>'
    +'<progress class="progress is-primary is-small" value="0" max="100"></progress>'
    +'<div class="content-status allow-select allow-drag">{{content-progress}}</div>'
+'</div>';

const tk = 0x140;

var titleQueue = new Array();
var parsedEtkBin = new Object();

/* Get base directory from config file */
var basedir = store.get('baseDirectory');

/* Requirement check */
var mccCheck = false;
var etkBinCheck = false;

/* Downloader variable */
var downloader = new Downloader();
var dl = new Array();

/* Define and create (if not exist) various app directory */
var rawdir = path.join(basedir,'raw');
var ciadir = path.join(basedir,'cias');
fs.ensureDirSync(rawdir);
fs.ensureDirSync(ciadir);

/* Execute some commands */
function execute(command, callback){
    exec(command, function(error, stdout, stderr){ callback(stdout); });
}

/* Convert hex string to binary array */
function hex2binArr(inputhex){
	var a = [];
	for (var i = 0; i < inputhex.length; i += 2) {
		a.push(parseInt(inputhex.substr(i, 2),16));
	}
	return a;
}

/* Define make_cdn_cia URL for each OS */
var mccUrl;
if(os.platform()=='win32'){
    mccUrl = 'https://github.com/tranxuanthang/villain3ds/raw/master/make_cdn_cia.exe';
} else if(os.platform()=='linux'){
    mccUrl = 'https://github.com/tranxuanthang/villain3ds/raw/master/make_cdn_cia';
} else if(os.platform()=='darwin'){
    mccUrl = 'https://github.com/tranxuanthang/villain3ds/raw/master/make_cdn_cia_macos';
}

/* Define make_cdn_cia location */
var makeCiaDir;
if(os.platform()=='win32') {
    makeCiaDir = path.join(basedir,'make_cdn_cia.exe')
} else if(os.platform()=='linux')  {
    makeCiaDir = path.join(basedir,'make_cdn_cia')
} else if(os.platform()=='darwin') {
    makeCiaDir = path.join(basedir,'make_cdn_cia_macos')
}

var etkBinDir = path.join(basedir,'enctitlekeys.bin');

/* Show directories location to GUI */
$('#dldir').val(rawdir);
$('#opendldir').on('click',function (){shell.showItemInFolder(rawdir)});
$('#ciadir').val(ciadir);
$('#openciadir').on('click',function (){shell.showItemInFolder(ciadir)});

async function mccHandler(doCheck = false){
    $('#mcc').html('Downloading...');
    let mccHandlerSuccess = true;
    try{
        if (!fs.existsSync(makeCiaDir)) {
            await func.simpleDownload(mccUrl,makeCiaDir);
        }
    }
    catch(error){
        $('#mcc').html('Error :( <a id="retry-mcc" class="button is-small is-primary">Retry</a>');
        $('#retry-mcc').on('click',function(){console.log('run');mccHandler(true)});
        $("#mcc-check").show().text('Can\'t get make_cdn_cia for your OS ('+error+').');
        if (!fs.existsSync(makeCiaDir)) {
            fs.unlinkSync(makeCiaDir);
        }
        mccHandlerSuccess = false;
    };
    if(mccHandlerSuccess == true){
        //Make the make_cdn_cia file executable on linux and macOS
        if(os.platform()=='linux' || os.platform()=='darwin'){
            fs.chmodSync(makeCiaDir,'744');
        }
        $('#mcc').text('Download completed');
        $("#mcc-check").html('').hide();
        mccCheck = true;
        if(doCheck == true) checkRequirement();
    }
}

function parseEtkBin(){
    let etkBinFile = fs.readFileSync(etkBinDir);
    let etkBinArrayBuffer = new Uint8Array(etkBinFile);
    let etkBinArrayLength = etkBinArrayBuffer.length;
    let i;
    for(i = 16; i < etkBinArrayLength; i += 32){
        let titleId = func.toHexString(etkBinArrayBuffer.slice(i+8 ,i+16));
        let titleKey = func.toHexString(etkBinArrayBuffer.slice(i+16, i+32));
        parsedEtkBin[titleId] = titleKey;
    }
}

async function etkBinHandler(doCheck = false){
    if(!store.get('enctitlekeysBinRemoteUrl')){
        $('#etkbin').html('No encTitleKeys.bin URL');
        $("#etkbin-check").show().text('You need to add an encTitleKeys.bin remote URL for this app to work. Go to "Config" section to add one.');
    } else {
        let etkBinSuccess = true;
        $('#etkbin').html('Downloading...');
        try {
            if (!fs.existsSync(etkBinDir)) {
                await func.simpleDownload(store.get('enctitlekeysBinRemoteUrl'),etkBinDir);
            } else {
                let cleanTime = new Date(fs.statSync(etkBinDir).mtime);
                cleanTime = cleanTime.setDate(cleanTime.getDate() + 2);
                let currentTime = Date.now();
                console.log(cleanTime - currentTime);
                if(cleanTime < currentTime) {
                    await func.simpleDownload(store.get('enctitlekeysBinRemoteUrl'),etkBinDir);
                }
            }
        }
        catch(error){
            $('#etkbin').html('Error :( <a id="retry-etkbin" class="button is-small is-primary">Retry</a>');
            $('#retry-etkbin').unbind('click').on('click',function(){etkBinHandler(true)});
            $("#etkbin-check").show().text('Can\'t get encTitleKeys.bin ('+error+').');
            if (!fs.existsSync(etkBinDir)) {
                fs.unlinkSync(etkBinDir);
            }
            etkBinSuccess = false;
        };
        if(etkBinSuccess == true){
            $("#etkbin").text('Parsing...');
            $("#etkbin-check").html('').hide();
            parseEtkBin();
            $("#etkbin").text('Download/parse completed');
            
            etkBinCheck = true;
            if(doCheck == true) checkRequirement();
        }
    }
}

function checkRequirement(){
    if(mccCheck==true && etkBinCheck==true){
        $("#check-requirement").text('All requirements are fulfilled. Waiting for information from main window...');
        ipcRenderer.send('dlprocess-ready');
        ipcRenderer.once('download-title' , addNewDownload);
    } else {
        $("#check-requirement").show().html('Some requirements can\'t be acquired. The application will not continue until those requirements is fulfilled.');
    }
}

async function getRequirement(){
    $("#check-requirement").show().html('Waiting for all requirements to be acquired...');
    await Promise.all([mccHandler(),etkBinHandler()]);
    checkRequirement();
}

async function addNewDownload(event,receivedData){
    let titleData = receivedData;
    var dldir = path.join(rawdir,titleData.titleID);
    let tempFileName = sanitizefn(titleData.titleID+'.cia');
    let fileName = sanitizefn(titleData.name+' '+titleData.region+' ('+titleData.titleID+').cia');
    let downloadContinue = true;
    let mainContentId;
    fs.ensureDirSync(dldir);

    console.log('data is received.');
    console.log(titleData);
    if(titleData.titleID && titleData.region && titleData.name){
        $(".predownload").hide();
    } else {
        $("#check-requirement").text('Main process did not send anything :(');
        $('.predownload').show();
        downloadContinue = false;
    }
    
    if(downloadContinue == true){
        var titleKey = parsedEtkBin[titleData.titleID];

        /* Show html from template */
        let view = {"title-id": titleData.titleID, "title-name": titleData.name, "title-region": titleData.region, "title-key": titleKey};
        $('.download-section').prepend(Mustache.render(newTitleTemplate, view));
        
        /* Check invalid titlekey */
        if(typeof titleKey === 'undefined'){
            downloadContinue = false;
            $('#'+titleData.titleID+' .alert').text('Could not find the titlekey for the title you\'re trying to download. Please try deleting enctitlekeys.bin file in your base directory.').show();
        } else if(titleKey.length!=32){
            downloadContinue = false;
            $('#'+titleData.titleID+' .alert').text('The titlekey has invalid length. Please try deleting enctitlekeys.bin file in your base directory.').show();
        }
    }

    if(downloadContinue == true){
        await getTmd(titleData.titleID,dldir);
    }

    if(downloadContinue == true){
        $('#'+titleData.titleID+' .title-tmd').text('OK');
        try {
            let results = await Promise.all([getContentCount(titleData.titleID,dldir),createCetk(titleData.titleID,titleKey,dldir)]);
            var contentCount = results[0];
            var decryptedTitleKey = results[1];
        }
        catch(error) {
            downloadContinue = false;
            $('#'+titleData.titleID+' .alert').text('Something bad happened when working with downloaded tmd file ('+error+').').show();
            console.error(error);
        }
    }
    
    if(downloadContinue == true){
        /* Array for pushing promises to */
        var contentTask = [];

        /* Push download promises of each content to above array */
        for(let i = 0; i < contentCount; i++) {
            //console.log('i='+i);
            let tmdFile = fs.readFileSync(path.join(dldir,'tmd'),null).buffer;
            let tmdFileArrayBuffer = new Uint8Array(tmdFile);
            let cOffs = 0xB04+(0x30*i);
            let cID = func.toHexString(tmdFileArrayBuffer.slice(cOffs, cOffs+0x04));
            let contentIndex = func.toHexString(tmdFileArrayBuffer.slice(cOffs+0x04, cOffs+0x06));
            if(contentIndex == "0000") mainContentId = cID;
            let contentHash = func.toHexString(tmdFileArrayBuffer.slice(cOffs+0x10, cOffs+0x10+0x20));
            let view = {"content-id": cID};
            $('#'+titleData.titleID+' .card-content').append(Mustache.render(newContentTemplate, view));
            renderDownloadTasks(cID,titleData.titleID);
            contentTask.push(() => dlTaskHandler('http://ccs.cdn.c.shop.nintendowifi.net/ccs/download/'+titleData.titleID+'/'+cID, path.join(dldir,cID), cID, contentIndex, contentCount, dldir,titleData.titleID, false, contentHash, decryptedTitleKey));
        }
        console.log(contentTask);

        /* Run download 2 contents in parallel at one time */
        try {
            for(let i = 0;i<=contentTask.length-1;i+=2){
                if(i+1 == contentTask.length){
                    await contentTask[i]();
                } else {
                    await Promise.all([contentTask[i](),contentTask[i+1]()]);
                }
            }
            makeCia(titleData.titleID, dldir, path.join(ciadir,tempFileName), path.join(ciadir,fileName), tempFileName, fileName, mainContentId);
        }
        catch(error){
            $('#'+titleData.titleID+' .alert').html('One or more downloads did not completed successfully :(').show();
        }
    }
}

function getTmd(titleId,dldir){
    return new Promise(async function(resolve,reject){
        let tmdUrl = 'http://ccs.cdn.c.shop.nintendowifi.net/ccs/download/'+titleId+'/tmd';
        try {
            await func.simpleDownload(tmdUrl,path.join(dldir,'tmd'));
            console.log('resolved');
            $('#'+titleId+' .alert').hide();
            resolve();
        } catch(error){
            console.error(error);
            $('#'+titleId+' .alert').html('Something bad happened when downloading tmd file ('+error+').<br><a class="button is-primary" id="tmdagain">Try again</a>').show();
            $('#tmdagain').on('click',function(){
                $('#tmdagain').off('click');
                console.log('clicked try gagain');
                getTmd(titleId,dldir).then(function(){
                    console.log('resolved in recursive');
                    resolve();
                });
            });
        }
    });
}

/* Count the number of content(s) that need to be downloaded */
async function getContentCount(titleId,dldir){
    try{
        let tmdFileSize = fs.statSync(path.join(dldir,'tmd')).size;
        let tmdFile = fs.readFileSync(path.join(dldir,'tmd'),null).buffer;
        let tmdFileArrayBuffer = new Uint8Array(tmdFile);
        
        let hexContentCount = func.toHexString(tmdFileArrayBuffer.slice(tk+0x9E, tk+0xA0));
        let contentCount = parseInt(hexContentCount,16);
        if(contentCount <1 ){
            console.log(tmdFileArrayBuffer);
            throw 'Error: Can\'t read the tmd file, or tmd file is broken, tmd file has '+tmdFileSize+' bytes, content count is '+contentCount;
        }
        $('#'+titleId+' .title-contentcount').text(contentCount);
        return contentCount;
        console.log(tmdFileArrayBuffer);
        console.log(hexContentCount);
    } catch(error) {
        $('#'+titleId+' .title-contentcount').text('Failed');
    }
}

function getDecryptedTitleKeyFromEncryptedTitleKey(cetkInUint8Array, encTitleKey, titleID) {
    /* Common key collection */
    const commonKeys = ["64C5FD55DD3AD988325BAAEC5243DB98", "4AAA3D0E27D4D728D0B1B433F0F9CBC8",
                        "FBB0EF8CDBB0D8E453CD99344371697F", "25959B7AD0409F72684198BA2ECD7DC6",
                        "7ADA22CAFFC476CC8297A0C7CEEEEEBE", "A5051CA1B37DCF3AFBCF8CC1EDD9CE02"];
    
    /* Find index of common key used to decrypt the title key of this title */
    const indexToCommonKeyYUsed = cetkInUint8Array.slice(tk+0xB1,tk+0xB1+1)[0];

    /* Build 16 bytes long IV from the title ID */
    const binaryArraytitleID = hex2binArr(titleID);
    const titleIDToIv = new Uint8Array([...binaryArraytitleID, ...new Array(8).fill(0)]);

    /* Convert encrypted title key to typed array format */
    const encTitleKeyUint8Array = new Uint8Array(hex2binArr(encTitleKey));

    /* Convert used common key to typed array format */
    const keyUsedForDecryptingUint8Array = new Uint8Array(hex2binArr(commonKeys[indexToCommonKeyYUsed]));

    /* For debugging */
    //console.log("encTitleKeyUint8Array: ", encTitleKeyUint8Array);
    //console.log("indexToCommonKeyYUsed: ",indexToCommonKeyYUsed[0],"key: ",new Uint8Array(hex2binArr(commonKeys[indexToCommonKeyYUsed])));
    //console.log("titleIDToIv: ",titleIDToIv);

    /* Start decrypting */
    const cipher = crypto.createDecipheriv('aes-128-cbc', keyUsedForDecryptingUint8Array, titleIDToIv);
    cipher.setAutoPadding(false);
    let decryptedTitleKey = cipher.update(encTitleKeyUint8Array, 'buffer' , 'hex') + cipher.final('hex');

    /* Return */
    return decryptedTitleKey;
}

/* Create the ticket file */
async function createCetk(cetkTitleId, cetkTitleKey,dldir){
    let tmdFileSize = fs.statSync(path.join(dldir,'tmd')).size;
    let tmdFile = fs.readFileSync(path.join(dldir,'tmd'),null).buffer;
    let tmdFileArrayBuffer = new Uint8Array(tmdFile);
    
    //console.log(tmdFileArrayBuffer);
    let tikteminhex = '00010004d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0d15ea5e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000526f6f742d434130303030303030332d585330303030303030630000000000000000000000000000000000000000000000000000000000000000000000000000feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface010000cccccccccccccccccccccccccccccccc00000000000000000000000000aaaaaaaaaaaaaaaa00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010014000000ac000000140001001400000000000000280000000100000084000000840003000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    let magicinhex = '00010004919ebe464ad0f552cd1b72e7884910cf55a9f02e50789641d896683dc005bd0aea87079d8ac284c675065f74c8bf37c88044409502a022980bb8ad48383f6d28a79de39626ccb2b22a0f19e41032f094b39ff0133146dec8f6c1a9d55cd28d9e1c47b3d11f4f5426c2c780135a2775d3ca679bc7e834f0e0fb58e68860a71330fc95791793c8fba935a7a6908f229dee2a0ca6b9b23b12d495a6fe19d0d72648216878605a66538dbf376899905d3445fc5c727a0e13e0e2c8971c9cfa6c60678875732a4e75523d2f562f12aabd1573bf06c94054aefa81a71417af9a4a066d0ffc5ad64bab28b1ff60661f4437d49e1e0d9412eb4bcacf4cfd6a3408847982000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000526f6f742d43413030303030303033000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000158533030303030303063000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137a0894ad505bb6c67e2e5bdd6a3bec43d910c772e9cc290da58588b77dcc11680bb3e29f4eabbb26e98c2601985c041bb14378e689181aad770568e928a2b98167ee3e10d072beef1fa22fa2aa3e13f11e1836a92a4281ef70aaf4e462998221c6fbb9bdd017e6ac590494e9cea9859ceb2d2a4c1766f2c33912c58f14a803e36fccdcccdc13fd7ae77c7a78d997e6acc35557e0d3e9eb64b43c92f4c50d67a602deb391b06661cd32880bd64912af1cbcb7162a06f02565d3b0ece4fcecddae8a4934db8ee67f3017986221155d131c6c3f09ab1945c206ac70c942b36f49a1183bcd78b6e4b47c6c5cac0f8d62f897c6953dd12f28b70c5b7df751819a9834652625000100010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010003704138efbbbda16a987dd901326d1c9459484c88a2861b91a312587ae70ef6237ec50e1032dc39dde89a96a8e859d76a98a6e7e36a0cfe352ca893058234ff833fcb3b03811e9f0dc0d9a52f8045b4b2f9411b67a51c44b5ef8ce77bd6d56ba75734a1856de6d4bed6d3a242c7c8791b3422375e5c779abf072f7695efa0f75bcb83789fc30e3fe4cc8392207840638949c7f688565f649b74d63d8d58ffadda571e9554426b1318fc468983d4c8a5628b06b6fc5d507c13e7a18ac1511eb6d62ea5448f83501447a9afb3ecc2903c9dd52f922ac9acdbef58c6021848d96e208732d3d1d9d9ea440d91621c7a99db8843c59c1f2e2c7d9b577d512c166d6f7e1aad4a774a37447e78fe2021e14a95d112a068ada019f463c7a55685aabb6888b9246483d18b9c806f474918331782344a4b8531334b26303263d9d2eb4f4bb99602b352f6ae4046c69a5e7e8e4a18ef9bc0a2ded61310417012fd824cc116cfb7c4c1f7ec7177a17446cbde96f3edd88fcd052f0b888a45fdaf2b631354f40d16e5fa9c2c4eda98e798d15e6046dc5363f3096b2c607a9d8dd55b1502a6ac7d3cc8d8c575998e7d796910c804c495235057e91ecd2637c9c1845151ac6b9a0490ae3ec6f47740a0db0ba36d075956cee7354ea3e9a4f2720b26550c7d394324bc0cb7e9317d8a8661f42191ff10b08256ce3fd25b745e5194906b4d61cb4c2e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000526f6f7400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001434130303030303030330000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007be8ef6cb279c9e2eee121c6eaf44ff639f88f078b4b77ed9f9560b0358281b50e55ab721115a177703c7a30fe3ae9ef1c60bc1d974676b23a68cc04b198525bc968f11de2db50e4d9e7f071e562dae2092233e9d363f61dd7c19ff3a4a91e8f6553d471dd7b84b9f1b8ce7335f0f5540563a1eab83963e09be901011f99546361287020e9cc0dab487f140d6626a1836d27111f2068de4772149151cf69c61ba60ef9d949a0f71f5499f2d39ad28c7005348293c431ffbd33f6bca60dc7195ea2bcc56d200baf6d06d09c41db8de9c720154ca4832b69c08c69cd3b073a0063602f462d338061a5ea6c915cd5623579c3eb64ce44ef586d14baaa8834019b3eebeed3790001000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    let tikdataArr = hex2binArr(tikteminhex);
    let magic = hex2binArr(magicinhex);
    
    /* Replace #1 */
    let tmdcut = tmdFileArrayBuffer.slice(476, 478);
    let tmdcutArr = Array.prototype.slice.call(tmdcut);
    
    Array.prototype.splice.apply(tikdataArr, [486, tmdcutArr.length].concat(tmdcutArr));

    /* Replace #2 */
    let titleIdArr = hex2binArr(cetkTitleId);
    //console.log('titleIdArr: '+titleIdArr+ ' and '+titleIdArr.length);
    Array.prototype.splice.apply(tikdataArr, [476,titleIdArr.length].concat(titleIdArr));

    /* Replace #3 */
    let encTitleKeyArr = hex2binArr(cetkTitleKey);
    Array.prototype.splice.apply(tikdataArr, [447, encTitleKeyArr.length].concat(encTitleKeyArr));

    /* Create cetk file by joining tikdata with magic */
    let finalCetk = new Buffer(tikdataArr.concat(magic));
    
    let cetkSuccess = true;

    let decryptedTitleKey;
    /* Decrypt the title key */
    try {
        decryptedTitleKey = getDecryptedTitleKeyFromEncryptedTitleKey(tikdataArr, cetkTitleKey, cetkTitleId);
        //throw "fuck";
	} catch (err) {
        cetkSuccess = false;
        $('#'+cetkTitleId+' .title-cetk').text('Failed');
		throw err;
    }
    
    /* Save created cetk file */
    try {
        fs.writeFileSync(path.join(rawdir,cetkTitleId,'cetk'), finalCetk);
        $('#'+cetkTitleId+' .title-cetk').text('OK');
	} catch (err) {
        cetkSuccess = false;
        $('#'+cetkTitleId+' .title-cetk').text('Failed');
		throw err;
    }
    
    return decryptedTitleKey;
}
function renderDownloadTasks(cID,titleId){
    let progressElement = $('#'+titleId+' #'+cID+' .content-status');
    let progressBar = $('#'+titleId+' #'+cID+' .progress');
    let downloadControl = $('#'+titleId+' #'+cID+' .download-control');

    downloadControl.html(
        '<a class="button is-link is-small download-play" disabled><span class="icon is-small"><i class="ion-play"></i></span></a>'
        +'<a class="button is-link is-small download-pause" disabled><span class="icon is-small"><i class="ion-pause"></i></span></a>'
        +'<a class="button is-link is-small download-destroy" disabled><span class="icon is-small"><i class="ion-close"></i></span></a>'
    );
}
function dlTaskHandler(contentUrl, contentPath, cID, contentIndex, contentCount, dldir, titleId, redownload = false, contentHash, decryptedTitleKey){
    return new Promise(function(resolve,reject){
        function disableAllButton(){
            $('#'+titleId+' #'+cID+' .download-control').children('.download-play, .download-pause, .download-destroy').attr('disabled','disabled');
        }
        createContentDlTask(contentUrl, contentPath, cID, contentIndex, contentCount, dldir, titleId, redownload, contentHash, decryptedTitleKey)
        .then(function(){
            resolve();
        })
        .catch(function(error){
            if(error == 'error_destroyed_by_user') redownload = true;
            $('#'+titleId+' #'+cID+' .download-control').show();
            disableAllButton();
            $('#'+titleId+' #'+cID+' .download-control').children('.download-play').removeAttr('disabled');
            $('#'+titleId+' #'+cID+' .download-play').on('click',function(){
                dlTaskHandler(contentUrl, contentPath, cID, contentIndex, contentCount, dldir, titleId, redownload, contentHash, decryptedTitleKey)
                .then(function(){
                    resolve();
                });
            });
        });
    });
}

function calcFileHashWithSha256(fileDir) {
    return new Promise((resolve, reject) => {
        let hash = crypto.createHash("sha256");
        let stream = fs.createReadStream(fileDir);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

function decryptContentFile(contentPath, titleId, cID, contentIndex, decryptedTitleKey, decryptedPath) {
    return new Promise((resolve, reject) => {
        /* Convert decrypted title key to typed array */
        const decryptedTitleKeyUint8Array = new Uint8Array(hex2binArr(decryptedTitleKey));

        /* Build IV from content index */
        const contentIndexArray = hex2binArr(contentIndex);
        const ivFromContentIndex = new Uint8Array([...contentIndexArray, ...new Array(14).fill(0)]);

        /* Create R&W stream for CDN encrypted & decrypted files */
        const readContentFile = fs.createReadStream(contentPath);
        const writeDecryptedContentFile = fs.createWriteStream(decryptedPath);
        console.log(decryptedPath);

        /* Start decrypting */
        const decrypt = crypto.createDecipheriv('aes-128-cbc', decryptedTitleKeyUint8Array, ivFromContentIndex);
        decrypt.setAutoPadding(false);
        readContentFile.pipe(decrypt).pipe(writeDecryptedContentFile);
        writeDecryptedContentFile.on('finish', function () {
            resolve();
        });
        writeDecryptedContentFile.on('error', function (error) {
            reject(error);
        });
    });
}

async function verifyContent(contentPath, contentHash, titleId, cID, contentIndex, decryptedTitleKey) {
    const decryptedPath = path.join(os.tmpdir(),"Villain3DS", titleId, `decrypted.${contentIndex}.${cID}.tmp`);
    fs.ensureDirSync(path.join(os.tmpdir(),"Villain3DS", titleId));
    await decryptContentFile(contentPath, titleId, cID, contentIndex, decryptedTitleKey, decryptedPath);
    const hashResult = await calcFileHashWithSha256(decryptedPath);
    console.log("cIndex: ", contentIndex, hashResult, "content hash: ", contentHash);
    if(hashResult == contentHash) {
        return {result: true, calculatedHash: hashResult};
    } else {
        return {result: false, calculatedHash: hashResult};
    }
}

/* Create the content download */
function createContentDlTask(contentUrl, contentPath, cID, contentIndex, contentCount, dldir, titleId, redownload, contentHash, decryptedTitleKey){
    return new Promise(function(resolve,reject) {
        let num = cID;
        let progressElement = $('#'+titleId+' #'+cID+' .content-status');
        let progressBar = $('#'+titleId+' #'+cID+' .progress');
        let downloadControl = $('#'+titleId+' #'+cID+' .download-control');
        
        if(fs.existsSync(contentPath+'.mtd') && redownload == false && fs.statSync(contentPath+'.mtd').size>0){
            console.log('found mtd file')
            var dl = downloader.resumeDownload(contentPath);
        } else {
            console.log('NOT found mtd file')
            var dl = downloader.download(contentUrl, contentPath);
        }
        if(fs.existsSync(contentPath)){
            dl.status = 3;
            dl.alreadydownloaded = true;
        } else {
            dl.start();
        }
        $('#'+titleId+' #'+cID+' .download-play').on('click',function(){
            if(fs.existsSync(contentPath+'.mtd') && !fs.existsSync(contentPath) && fs.statSync(contentPath+'.mtd').size>0){
                dl.resume();
            } else if(fs.existsSync(contentPath) && !fs.existsSync(contentPath+'.mtd') && fs.statSync(contentPath).size>0) {
                dl.setStatus(3);
            } else {
                dl.resume();
            }
        });
        $('#'+titleId+' #'+cID+' .download-pause').on('click',function(){
            dl.stop();
        });
        $('#'+titleId+' #'+cID+' .download-destroy').on('click',async function(){
            dl.destroy();
        });

        function disableAllButton(){
            $('#'+titleId+' #'+cID+' .download-control').children('.download-play, .download-pause, .download-destroy').attr('disabled','disabled');
        }
        function hideButtons(){
            $('#'+titleId+' #'+cID+' .download-control').hide();
        }
        dl.setRetryOptions({
            maxRetries: 3,		// Default: 5
            retryInterval: 1000 // Default: 2000
        });
        
        dl.setOptions({
            threadsCount: 6, // Default: 2, Set the total number of download threads
            method: 'GET', 	 // Default: GET, HTTP method
            port: 80, 	     // Default: 80, HTTP port
            timeout: 5000,   // Default: 5000, If no data is received, the download times out (milliseconds)
            range: '0-100',  // Default: 0-100, Control the part of file that needs to be downloaded.
        });
        dl.on('error',function(){
            //reject();
        });
        let timer = setInterval(function() {
            if(dl.status === -1 || dl.status === 3 || dl.status === -3) {
                clearInterval(timer);
                timer = null;
            }

            if(dl.status == 0) {
                disableAllButton();
                let stats = dl.getStats();
                let totalSize = func.humanFileSize (stats.total.size,true);
                progressBar.val(0).removeClass('is-primary is-warning is-danger is-success').addClass('is-warning');
                progressElement.text('Preparing to download...');
            } else if(dl.status == 1) {
                let stats = dl.getStats();
                //console.log(stats);
                progressBar.val(stats.total.completed).removeClass('is-primary is-warning is-danger is-success').addClass('is-primary');
                let currentSize = func.humanFileSize (stats.total.downloaded,true);
                let totalSize = func.humanFileSize (stats.total.size,true);
                progressElement.html('Downloading: '+ stats.total.completed +' % | '+currentSize+' out of '+totalSize
                +'<br>Speed: '+func.humanFileSize(stats.present.speed,true)+'/s | ETA: '+Downloader.Formatters.remainingTime(stats.future.eta));
                disableAllButton();
                $('#'+titleId+' #'+cID+' .download-control').children('.download-pause, .download-destroy').removeAttr('disabled');
            } else if(dl.status == 2) {
                progressBar.removeClass('is-primary is-warning is-danger is-success').addClass('is-warning');
                progressElement.text('Something bad happened. Retrying...');
                disableAllButton();
            } else if(dl.status == 3) {
                progressBar.val(100).removeClass('is-primary is-warning is-danger is-success').addClass('is-success');
                progressElement.html(`Content #${num} is downloaded. Decrypting & calculating hash...`);
                verifyContent(contentPath, contentHash, titleId, cID, contentIndex, decryptedTitleKey)
                .then(hashVerify => {
                    if(hashVerify.result == true) {
                        if(dl.alreadydownloaded == true) {
                            progressElement.html(`Content #${num} is already downloaded before. Checksum is successfully verified.`);
                        } else {
                            progressElement.html(`Content #${num} is successfully downloaded. Checksum is successfully verified.`);
                        }
                        disableAllButton();
                        hideButtons();
                        $('#'+titleId+' #'+cID).delay(1900).slideUp();
                        resolve();
                    } else {
                        progressBar.removeClass('is-primary is-warning is-danger is-success').addClass('is-danger');
                        progressElement.html(`Content #${num} is downloaded, but has the wrong SHA-256 hash!!.<br>Content hash from tmd is: <br>${func.hexForHuman(contentHash)}.<br>Caculated hash is: <br>${func.hexForHuman(hashVerify.calculatedHash)}.`);
                        disableAllButton();
                        hideButtons();
                        dl.destroy();
                        reject("error_destroyed_by_user");
                    }
                });
                
            } else if(dl.status == -1) {
                progressBar.removeClass('is-primary is-warning is-danger is-success').addClass('is-danger');
                progressElement.text('Content #'+ num +' is failed to download ('+ dl.error+').');
                disableAllButton();
                hideButtons();
                reject(dl.error);
            } else if(dl.status == -2) {
                progressBar.removeClass('is-primary is-warning is-danger is-success').addClass('is-warning');
                progressElement.text('Paused.');
                disableAllButton();
                $('#'+titleId+' #'+cID+' .download-control').children('.download-play, .download-destroy').removeAttr('disabled');
            } else if(dl.status == -3) {
                progressBar.removeClass('is-primary is-warning is-danger is-success').addClass('is-danger').val(100);
                progressElement.text('Destroyed by user.');
                disableAllButton();
                hideButtons();
                reject('error_destroyed_by_user');
            }

            if(dl.status === -1 || dl.status === 3 || dl.status === -3) {
                clearInterval(timer);
                timer = null;
            }
        }, 200);
    });
    
}

function makeCia(titleId, rawFileDir, tempCiaDir, ciadir, tempFileName, fileName, mainContentId){
    let command = '"'+makeCiaDir+'" "'+rawFileDir+'" "'+tempCiaDir+'"';
    $('#'+titleId+' .card-content').append('<div class="mcc-execute"><div class="mcc-result">Executing make_cdn_cia...</div><div class="mcc-note content is-small" style="display:none;"></div><div class="mcc-output content is-small" style="font-family: monospace; display:none;">Waiting for output...</div></div>');
	execute(command, function(output) {
        output = output.replace(/(?:\r\n|\r|\n)/g, '<br />');
        output = output.trim();
        if(output)
        $('#'+titleId+' .mcc-output').show().html('<p class="result-note allow-select allow-drag">'+command+'</p><p class="allow-select allow-drag">'+output+'</p>');
        let stats = fs.statSync(tempCiaDir);
        let fileSizeInBytes = stats["size"];
        if (fs.existsSync(tempCiaDir) && fileSizeInBytes!=0) {
            try{
                fs.renameSync(tempCiaDir,ciadir);
                $('#'+titleId+' .mcc-result').html('<!--<p class="allow-select allow-drag">Renamed <span class="tag is-primary allow-select allow-drag">'+tempFileName+'</span> to <span class="tag is-primary allow-select allow-drag">'+fileName+'</span>.</p>-->'
                +'<p class="allow-select allow-drag">CIA file is generated successfully ('+func.humanFileSize(fileSizeInBytes,true)+') 😊.</p>'
                +'<!--<p class="allow-select allow-drag">The CIA file size is: '+func.humanFileSize(fileSizeInBytes,true)+'</p>-->');
                
                //fs.removeSync(rawFileDir);
            }
            catch (error){
                $('#'+titleId+' .mcc-result').html('<p class="allow-select allow-drag">Too bad. Something\'s wrong ('+error+') 😥.</p>');
            }
		} else {
			$('#'+titleId+' .mcc-result').html('<p class="allow-select allow-drag">Too bad. Something\'s wrong 😥.</p>');
        }
        $('#'+titleId+' .mcc-result').append('<p><a class="button is-primary is-small" id="openciafiledir">Open CIA directory</a> <a class="button is-primary is-small" id="cleanrawdir">Clean raw directory</a></p>');
        $('#openciafiledir').on('click',function (){shell.showItemInFolder(ciadir)});
        $('#cleanrawdir').on('click', function(){
            fs.removeSync(rawFileDir);
            $('#cleanrawdir').html('Cleaned').attr('disabled', true);
        });
    });
    const decryptedPath = path.join(os.tmpdir(),"Villain3DS", titleId, `decrypted.0000.${mainContentId}.tmp`);
    console.log(decryptedPath);
    const readNcchFlag7 = fs.createReadStream(decryptedPath, { start : 0x18F, end: 0x18F });
    readNcchFlag7.setEncoding('binary')
    let ncchFlag7Raw = '', ncchFlag7Array, ncchFlag7;
    readNcchFlag7.on("data", chunk => {
        ncchFlag7Raw += chunk;
    });
    readNcchFlag7.on("end", () => {
        ncchFlag7Array = Buffer.from(ncchFlag7Raw, 'binary');
        ncchFlag7 = ncchFlag7Array[0];
        if(ncchFlag7 == 32)
        $('#'+titleId+' .mcc-note').show().html("<b>Note:</b> This title is a 9.6.0+ title and requires an additional seed. After installation, the title may not be launched unless you import an additional seed for it. If you don't, you will get one of these scenarios: black screen on launch, 3ds get rebooted, or luma3ds exception.<br>More information <a href=\"#\" id=\"openseedfaq\"><b>here</b></a>.");
        $("#openseedfaq").on("click", function() {
            shell.openExternal("https://github.com/tranxuanthang/villain3ds/wiki/FAQs#user-content-how-to-install-additional-seed-for-960-titles");
        });
        fs.removeSync(path.join(os.tmpdir(),"Villain3DS", titleId));
    });
}

$(document).ready(function(){
    getRequirement();
});