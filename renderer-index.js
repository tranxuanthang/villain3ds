var remote = require('electron').remote;
const {app} = require('electron').remote;
const {dialog} = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
const Store = require('./js/store.js');
const path = require('path')
var fs = require('fs-extra');
var os = require('os');
const shell = require('electron').shell;
const spawn = require('child_process').spawn;
var request = require('request');
var func = require('./js/func.js');
var glob = require("glob");
var parsedEtkBin = new Object();
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var storingData = {sort: 0, page: 0, keyword: ''};
const store = new Store({
	configName: 'config',
	defaults: {
		enctitlekeysBinRemoteUrl: "",
		baseDirectory: path.join(app.getPath('home'), 'Villain3DS'),
		region: "all"
	}
});

var basedir = store.get('baseDirectory');
var etkBinDir = path.join(basedir,'enctitlekeys.bin');

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
function showTitleInfo(data) {
	console.log(queryUrl);
	
	$('#title-name').html(data.query.name);
	$('#title-region').html(data.query.region);
	$('#title-desc').html(data.query.desc);
	$('#title-titleID').html(data.query.titleID);
	$('#title-size').html(func.humanFileSize(data.query.size,true));
	if (data.query.scrtop1!='none') $('#scrtop1').attr('src', data.query.scrtop1);
	if (data.query.scrtop2!='none') $('#scrtop2').attr('src', data.query.scrtop2);
	if (data.query.scrtop3!='none') $('#scrtop3').attr('src', data.query.scrtop3);

	if (data.query.scrbot1!='none') $('#scrbot1').attr('src', data.query.scrbot1);
	if (data.query.scrbot2!='none') $('#scrbot2').attr('src', data.query.scrbot2);
	if (data.query.scrbot3!='none') $('#scrbot3').attr('src', data.query.scrbot3);
	showQrCode(data);
}

async function showQrCode(data) {
	if(!store.get('enctitlekeysBinRemoteUrl')){
        $("#qr-info").show().text('You need to add an encTitleKeys.bin remote URL for the QRcode feature to work. Go to "Config" section to add one.');
    } else {
        let etkBinSuccess = true;
        try {
            if (!fs.existsSync(etkBinDir)) {
                func.simpleDownload(store.get('enctitlekeysBinRemoteUrl'),etkBinDir);
            } else {
                let cleanTime = new Date(fs.statSync(etkBinDir).mtime);
                cleanTime = cleanTime.setDate(cleanTime.getDate() + 2);
                let currentTime = Date.now();
                console.log(cleanTime - currentTime);
                if(cleanTime < currentTime) {
                    func.simpleDownload(store.get('enctitlekeysBinRemoteUrl'),etkBinDir);
                }
            }
        }
        catch(error){
            $("#qr-info").show().text('Can\'t get encTitleKeys.bin ('+error+').');
            if (!fs.existsSync(etkBinDir)) {
                fs.unlinkSync(etkBinDir);
            }
            etkBinSuccess = false;
        };
        if(etkBinSuccess == true){
            parseEtkBin();
            $("#qr-info").hide();
            
            etkBinCheck = true;
			let titlekey = parsedEtkBin[data.query.titleID];
			//$("#qr-info").html('<img id="qr-image" src="https://chart.googleapis.com/chart?cht=qr&chs=400x400&chld=L|0&chl=http%3A%2F%2F3ds.alduin.net%2Ftikserv.php%3Ftitleid%3D'+data.query.titleID+'%26titlekey%3D'+titlekey+'" alt="" style="height:98%;" />');
			$('#qr-image').attr("src",'https://chart.googleapis.com/chart?cht=qr&chs=400x400&chld=L|0&chl=http%3A%2F%2F3ds.alduin.net%2Ftikserv.php%3Ftitleid%3D'+data.query.titleID+'%26titlekey%3D'+titlekey+'');
        }
    }
}

function getTitleInfo(id) {
	queryUrl = 'http://3ds.alduin.net/apiv3.php?type=title&id='+id;
	console.log('Request title info: '+queryUrl);
	$.getJSON(queryUrl, showTitleInfo);
}

function sendDownloadRequest() {
	ipcRenderer.send('download-title',  {titleID: $('#title-titleID').html(),name: $('#title-name').html(),region: $('#title-region').html()});
	ipcRenderer.once('status', function(event, data) {
		if(data=='started-downloading'){
			$('.started-downloading-notif').fadeIn().delay(1200).fadeOut();
		} else if(data=='already-downloading'){
			$('.already-downloading-notif').fadeIn().delay(1200).fadeOut();
		}
		console.log(data);
	});
}

function showListing(param,sort,page,keyword) {
	return function (data) {
		param.hide().empty();
		if(data.error == 2){
			$('.error').html('<section class="hero is-dark"><div class="hero-body"><div class="container">'
			+'<h1 class="title">Oops. Something is wrong</h1>'
			+'<h2 class="subtitle">Your keyword is too short or too long ;-(</h2>'
		  	+'</div></div></section>');
			$('#grid').html('');;
		} else if(data.error == 1){
			$('.error').html('<section class="hero is-dark"><div class="hero-body"><div class="container">'
			+'<h1 class="title">Oops. Something is wrong</h1>'
			+'<h2 class="subtitle">No result was found ;-(</h2>'
		  	+'</div></div></section>');
			$('#grid').html('');;
		} else {
			$('.error').html('');
			var appendTitleList = '';
			for (var i = 0; i < data.query.length; i++) {
				if(data.query[i].icon == "none")iconUrl = './img/blank.png'; else iconUrl = data.query[i].icon;
				appendTitleList +=
				'<div id="item-'+i+'" class="column is-one-third-mobile is-one-quarter-tablet"><div class="box"><article class="media">'
					+'<div class="media-left">'
						+'<img src="'+iconUrl+'" style="width: 37px" border="0" alt="">'
					+'</div>'
					+'<div class="media-content">'
						+'<div class="mdl-card__title"><h3 class="mdl-card__title-text">'
						+'<a href="#" data-id="'+data.query[i].id+'" class="title-link show-modal">'+data.query[i].name+'</a>'
						+'</h2></div>'
						+'<div class="desc">'+data.query[i].region+' | '+data.query[i].type+' | '+func.humanFileSize(data.query[i].size,true)+'</div>'
					+'</div>'
				+'</article></div></div>';
				//$('#item-'+i).fadeIn('fast');
			}
			param.append(appendTitleList);
			//if(i=data.query.length-1)$('#loading').fadeOut();
			param.fadeIn('fast');
			console.log('Request listing: '+queryUrl);
			storingData.sort = sort;
			storingData.page = page;
			storingData.keyword = keyword;
			$("#current-page").html(page);
			$("#sum-page").html(Math.ceil(data.total/36));
			if(page<2) $('#prev-link').attr("disabled", true); else $('#prev-link').attr("disabled", false);
			if(page>Math.ceil(data.total/36)-1) $('#next-link').attr("disabled", true); else  $('#next-link').attr("disabled", false);

			var showDialogButton = $('.show-modal');
			showDialogButton.on('click', function() {
				var $this = $(this),
				getid = parseInt($this.data('id'));
				getTitleInfo(getid);
				$('.modal-title').addClass('is-active');
			});
		}
	}
}

function getListing(param,sort,page,keyword) {
	//$('#loading').fadeIn();
	console.log('Current page: '+page);
	start = (page-1)*36;
	let showRegion = store.get('region');
	if(!keyword){
		console.log('Current sorting '+sort);
		queryUrl = 'http://3ds.alduin.net/apiv3.php?sort='+sort+'&from='+start+'&qual=36&region='+showRegion;
	} else {
		queryUrl = 'http://3ds.alduin.net/apiv3.php?type=search&keyword='+encodeURI(keyword)+'&from='+start+'&qual=36&region='+showRegion;
	}
	
	$.getJSON(queryUrl, showListing(param,sort,page,keyword)).done(function(d) {
		//$('#loading').fadeOut();
		$(".main-content").animate({ scrollTop: 0 }, "slow");
	}).fail(function(d) {
		$('.error').html('<section class="hero is-dark"><div class="hero-body"><div class="container">'
			+'<h1 class="title">Oops. Something is wrong</h1>'
			+'<h2 class="subtitle">An error has occured ;-(</h2>'
		  +'</div></div></section>');
		$('#grid').html('');
		//$('#loading').fadeOut();
    });
}

function sortingHandler(){
	var $this = $(this),
	getsort = parseInt($this.data('sort'));

	// Load target page into container
	console.log('send');
	getListing($(".demo-content"),getsort,1,'');
	$('input[name=keyword]').val('');
	switch (getsort) {
		case 0:
			$("#sort-0").addClass('is-active');
			$("#sort-1").removeClass('is-active');
			$("#sort-2").removeClass('is-active');
			break;
		case 1:
			$("#sort-0").removeClass('is-active');
			$("#sort-1").addClass('is-active');
			$("#sort-2").removeClass('is-active');
			break;
		case 2:
			$("#sort-0").removeClass('is-active');
			$("#sort-1").removeClass('is-active');
			$("#sort-2").addClass('is-active');
			break;
		default:
			$("#sort-0").addClass('is-active');
			$("#sort-1").removeClass('is-active');
			$("#sort-2").removeClass('is-active');
	}
}

function pageNavigator(){
	var $this = $(this);
	//var getsort = parseInt($('#storing-data').data('sort'));
	getsort = storingData['sort'];
	page = $this.data('page');
	console.log('sort: '+getsort);
	getKeyword = $('#search').val();
	//page = $this.data('page');
	console.log('storingData-keyword: '+getKeyword);
	currpage = parseInt($('#current-page').html());
	sumpage = parseInt($("#sum-page").html());

	switch (page) {
	case "prev":
		if(currpage>1)
		getListing($(".demo-content"),getsort,currpage-1,getKeyword);
		break;
	case "next":
		if(currpage<sumpage)
		getListing($(".demo-content"),getsort,currpage+1,getKeyword);
	}
	// Stop normal link behavior
	return false;
}

function searchSubmit(e) {
	e.preventDefault();
	// Get input field values
	keyword = $('input[name=keyword]').val();
	console.log(keyword);
	if(keyword!=''){
		getListing($(".demo-content"),'',1,keyword);
		//$('#storing-data').attr("data-keyword", keyword);
		storingData.keyword = keyword;
		$("#sort-0").removeClass('is-active');
		$("#sort-1").removeClass('is-active');
		$("#sort-2").removeClass('is-active');
	}
}
function checkNewVersion() {
	let appVersion = app.getVersion();
	$('#curr-ver').html(appVersion);
	let queryUrl = 'http://3ds.alduin.net/villain3ds_checkver.php?version='+appVersion;
	console.log(queryUrl);
	$.getJSON(queryUrl, function(data){
		if(data.has_newer_version==1){
			$('#check-newer-version').html(
				'Newer version is available.<br>Newest version: <span class="class="allow-select allow-drag">'+data.newest_version+'</span>'
				+'<br><a id="openDownlUrl" href="#">Go to download URL</a>'
				+'<br>Message: <span class="allow-select allow-drag">'+data.message+'</span>'
			);
			$('#openDownlUrl').on('click',function(){
				console.log('open update url once');
				shell.openExternal(data.update_url);
			});
		} else {
			$('#check-newer-version').html(
				'Your app is up-to-date ;-)'
				+'<br><a id="openDownlUrl"href="#">Go to download URL anyways</a>'
				+'<br>Message: <span class="allow-select allow-drag">'+data.message+'</span>'
			);
			$('#openDownlUrl').on('click',function(){
				console.log('open update url once');
				shell.openExternal(data.update_url);
			});
		}
		
	});
}

// [YB]: Add a slight padding to navbar on OSX:
if (process.platform === 'darwin') {
  $('.navmain').addClass('mac-inset');
}

$('#config-button').on('click', function() {
	let showRegion = store.get('region');
	let basePath = store.get('baseDirectory');
	if(showRegion != 'all' && showRegion != 'usa' && showRegion != 'eur' && showRegion != 'jpn'){
		showRegion = 'all';
		store.set('region', showRegion);
	}
	$('.modal-config').addClass('is-active');
	$('#config-form').attr("disabled", false);
	$('#enctitlekeysBinRemoteUrl').val(store.get('enctitlekeysBinRemoteUrl'));
	console.log('current region: '+showRegion);
	$('input[name=region][value='+showRegion+']').prop("checked",true);
	$('#basedirpath').val(basePath);
	$('#basedirpathselect').on('click', function(){
		dialog.showOpenDialog({ 
			defaultPath: $('#basedirpath').val(),
			properties: [ 
				'openDirectory'
			]
		}, function(dirpath){
			console.log(dirpath);
			if(dirpath) $('#basedirpath').val(dirpath);
		});
	});
});

$('#about-button').on('click', function() {
	$('.modal-about').addClass('is-active');
	checkNewVersion();
	let basePath = store.get('baseDirectory');
	let rawdir = path.join(basePath,'raw');
	let etkdir = path.join(basePath,'enctitlekeys.bin');
	/* Define make_cdn_cia location */
	var makeCiaDir;
	if(os.platform()=='win32') {
		makeCiaDir = path.join(basedir,'make_cdn_cia.exe')
	} else if(os.platform()=='linux')  {
		makeCiaDir = path.join(basedir,'make_cdn_cia')
	} else if(os.platform()=='darwin') {
		makeCiaDir = path.join(basedir,'make_cdn_cia_macos')
	}
	let ciadir = path.join(basePath,'cias');
	$('#cleanrawdir').on('click', function(){
		fs.removeSync(rawdir);
		fs.ensureDirSync(rawdir);
		$('.rawdir-cleaned-notif').fadeIn().delay(1200).fadeOut();
	});
	$('#deletemcc').on('click', function(){
		fs.removeSync(makeCiaDir);
		$('.mccfile-cleaned-notif').fadeIn().delay(1200).fadeOut();
	});
	$('#deleteetk').on('click', function(){
		fs.removeSync(etkdir);
		$('.etkfile-cleaned-notif').fadeIn().delay(1200).fadeOut();
	});
	$('#openrawdir').on('click', function(){
		shell.showItemInFolder(rawdir);
	});
	$('#openciasdir').on('click', function(){
		shell.showItemInFolder(ciadir);
	});
});

$('#cias-button').on('click', function() {
	$('.modal-cias').addClass('is-active');
	let basePath = store.get('baseDirectory');
	let ciadir = path.join(basePath,'cias');
	fs.readdir(ciadir, {encoding: "utf-8"}, (err, files) => {
		$("#ciaslist").html("");
		$("#ciaslist").append(`<tr><th>Icon</th><th>Title Name</th><th>Region</th><th>TitleID</th></tr>`);
		let ciasList = files
		.filter(value => value.split('.').pop() == "cia")
		.map(value => {
			let fd = fs.openSync(path.join(ciadir,value), "r");
			let certSizeArr = new Uint8Array(4);
			let tikSizeArr = new Uint8Array(4);
			let titleIdArr = new Uint8Array(8);
			fs.readSync(fd, certSizeArr, 0, 4, 0x08);
			fs.readSync(fd, tikSizeArr, 0, 4, 0x0c);
			let certSize = Buffer.from(certSizeArr.reverse()).readUInt32BE(0);
			let tikSize = Buffer.from(tikSizeArr.reverse()).readUInt32BE(0);
			let tmdOffset = 0x2040 + certSize + 0x30 + tikSize;
			fs.readSync(fd, titleIdArr, 0, 8, tmdOffset+0x18C);
			highTitleId = func.toHexString(titleIdArr.slice(0,4));
			return {ciaName: value, titleId: func.toHexString(titleIdArr), highTitleId: highTitleId};
			//return highTitleId == "00040000";
		})
		.filter(value => {
			return value.highTitleId == "00040000";
		})
		.map((value, index, arr) => {
			return {ciaId: `cia-${index}`, ciaName: value.ciaName, titleId: value.titleId, highTitleId: value.highTitleId};
		});
		ciasList.map(value => {
			queryUrl = 'http://3ds.alduin.net/apiv3.php?type=titleid&titleid='+value.titleId;
			$("#ciaslist").append(`<tr id="${value.ciaId}"><td><img class="cias-icon" src="img/blank.png" alt=""/></td><td><div class="cias-name">###</div><div style="font-size: x-small;"><a href="#" class="cias-link" data-cia-name="${value.ciaName}" data-titleid="${value.titleId}">Make this title citra-ready</a></div></td><td class="cias-region">###</td><td><div>${value.titleId}</div><div style="font-size: x-small; color: gray;">${value.ciaName}</div></td></tr>`);
			let fileNameWithoutExt = path.parse(value.ciaName).name;
			let readyCxiFile = path.join(basePath,"citra_ready",`${fileNameWithoutExt}.cxi`);
			
			if(os.platform()!='win32') {
				$(`#${value.ciaId} .cias-link`).hide();
			} else if(fs.existsSync(readyCxiFile)) {
				$(`#${value.ciaId} .cias-link`).text("Open citra-ready file");
			}
			$.getJSON(queryUrl, jsonData => {
				$(`#${value.ciaId} .cias-icon`).attr("src",jsonData.query.iconURL);
				$(`#${value.ciaId} .cias-name`).text(jsonData.query.name);
				$(`#${value.ciaId} .cias-region`).text(jsonData.query.region);
			});
		});

		$(".cias-link").on("click", async function () {
			console.log("click one");
			let $this = $(this);
			let fileNameWithoutExt = path.parse($this.data("cia-name")).name;
			let readyCxiFile = path.join(basePath,"citra_ready",`${fileNameWithoutExt}.cxi`);
			if(fs.existsSync(readyCxiFile)) {
				shell.showItemInFolder(readyCxiFile);
			} else {
				$(".cias-link").off("click");
				$("#decrypt-console-output").hide();
				$('.modal').removeClass('is-active');
				$('.modal-decrypt').addClass('is-active');
				$('.modal-decrypt').find('.dialog-close2').prop('disabled', true);

				let thisCiaDir = path.join(ciadir, $this.data("cia-name"));
				let tempFile = path.join(os.tmpdir(),"Villain3DS","cias-copy",`${$this.data("titleid")}.cia`);
				let tempFolderForDecryption = path.join(basePath,"citra_ready","temp");
				let decryptFileDir = path.join(tempFolderForDecryption,"decrypt.exe");
				fs.ensureDirSync(tempFolderForDecryption);
				try {
					if(!fs.existsSync(decryptFileDir)) {
						$("#decrypt-info").text("Downloading decrypt.exe...");
						//$("#decrypt-console-output").append(`Waiting...`);
						await func.simpleDownload("https://3ds.alduin.net/decrypt.exe", decryptFileDir);
					}
					
				}
				catch (error) {
					$("#decrypt-info").text("Decryption failed. Can't download decrypt.exe from internet.");
					//$("#decrypt-console-output").append(`Failed.`);
					$('.modal-decrypt').find('.dialog-close2').prop('disabled', false);
				}

				const child = spawn(decryptFileDir, [`${thisCiaDir}`]);
				$("#decrypt-info").text("Decrypting this title. This will take up to 5 minutes, depend on CIA size.");
				$("#decrypt-console-output").show().html(`decrypt.exe "${thisCiaDir}"<br>`);
				child.stdout.on('data', (data) => {
					$("#decrypt-console-output").append(`${data.toString().replace(/(?:\r\n|\r|\n)/g, '<br />')}`);
				});
				child.stdin.end('');
				child.on('close', (code) => {
					fs.renameSync(path.join(basePath,"citra_ready","temp",`${fileNameWithoutExt}.0.ncch`), readyCxiFile);
					glob(path.join(basePath,"citra_ready","temp",`*.ncch`), {}, function (er, files) {
						for (const file of files) {
							fs.unlinkSync(file);
						}
					});
					$("#decrypt-info").html(`Decryption completed. Check the console below if there is any error.<br><b><a href="#" class="button is-primary" id="show-citra-ready-file">Show generated file's directory</a></b>`);
					$('#show-citra-ready-file').on('click', function () {
						shell.showItemInFolder(readyCxiFile);
					});
					$("#decrypt-console-output").append(`Completed! (exit code: ${code}).`);
					$('.modal-decrypt').find('.dialog-close2').prop('disabled', false);
				});
			}
		});
	});
});

$('.modal-config').find('.dialog-close').on('click', function() {
	$('.modal').removeClass('is-active');
	$('#config-form').attr("disabled", true);
	$('#basedirpathselect').off('click');
});

$('.modal-about').find('.dialog-close').on('click', function() {
	$('.modal').removeClass('is-active');
	$('#cleanrawdir').off('click');
	$('#openrawdir').off('click');
	$('#openciasdir').off('click');
});

$('.modal-cias').find('.dialog-close').on('click', function() {
	$('.modal').removeClass('is-active');
	$("#ciaslist").html("");
	$(".cias-link").off("click");
});

$('.modal-decrypt').find('.dialog-close2').on('click', function() {
	$('.modal').removeClass('is-active');
	$("#decrypt-console-output").html("");
	$('#show-citra-ready-file').off('click');
	$("#ciaslist").html("");
});

$("#config-save").click(function(e){
	let enctitlekeysBinRemoteUrl = $('#enctitlekeysBinRemoteUrl').val();
	let basedirpath = $('#basedirpath').val();
	let showRegion = $("input[name=region]:checked").val();
	store.set('enctitlekeysBinRemoteUrl', enctitlekeysBinRemoteUrl);
	store.set('baseDirectory', basedirpath);
	store.set('region', showRegion);
	let targetPath = path.join(app.getPath('userData'), 'etkCache.json');
	if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
	$('.config-saved-notif').fadeIn().delay(1200).fadeOut();
	e.preventDefault();
});

getListing($(".demo-content"),0,1,'');

/* for sorting */
var trigger = $('#sort-0, #sort-1, #sort-2');
trigger.on('click', sortingHandler);

/* for prev - next */
var trigger2 = $('#prev-link, #next-link');
trigger2.on('click', pageNavigator);

/* search */
$("#search-form").submit(searchSubmit);

/* Close modal */
$('.modal-title .dialog-close, .modal-title .modal-background').on('click', function() {
	$('.modal').removeClass('is-active');
	$('#title-name').html('###');
	$('#title-desc, #title-region, #title-desc, #title-titleID, #title-size').empty();
	$('#scrtop1').attr('src', 'img/blank400x240.png');
	$('#scrtop2').attr('src', 'img/blank400x240.png');
	$('#scrtop3').attr('src', 'img/blank400x240.png');

	$('#scrbot1').attr('src', 'img/blank320x240.png');
	$('#scrbot2').attr('src', 'img/blank320x240.png');
	$('#scrbot3').attr('src', 'img/blank320x240.png');

	$('#qr-image').attr('src', 'img/blank400x400.png');
});

/* Click download button */
$('#download-button').on('click', sendDownloadRequest);

ipcRenderer.on('openTitleID' , (event, arg) => {
	setTimeout(function(){
		$('input[name=keyword]').val(arg);
		getListing($(".demo-content"),'',1,arg);
	}, 200);
});