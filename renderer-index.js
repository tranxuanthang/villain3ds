var remote = require('electron').remote;
const {app} = require('electron').remote;
const {dialog} = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
const Store = require('./js/store.js');
const path = require('path')
var fs = require('fs-extra');
const shell = require('electron').shell;
var request = require('request');

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
function toHexString(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}
function simpleDownload(simpleUrl,simplePath){
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
                resolve();
            });
        }
        catch(err){
            reject(err);
        }
    });
}
function parseEtkBin(){
	let etkBinFile = fs.readFileSync(etkBinDir);
	let etkBinArrayBuffer = new Uint8Array(etkBinFile);
	let etkBinArrayLength = etkBinArrayBuffer.length;
	let i;
	for(i = 16; i < etkBinArrayLength; i += 32){
		let titleId = toHexString(etkBinArrayBuffer.slice(i+8 ,i+16));
		let titleKey = toHexString(etkBinArrayBuffer.slice(i+16, i+32));
		parsedEtkBin[titleId] = titleKey;
	}
}
function showTitleInfo(data) {
	console.log(queryUrl);
	
	$('#title-name').html(data.query.name);
	$('#title-region').html(data.query.region);
	$('#title-desc').html(data.query.desc);
	$('#title-titleID').html(data.query.titleID);
	$('#title-size').html(data.query.size);
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
                simpleDownload(store.get('enctitlekeysBinRemoteUrl'),etkBinDir);
            } else {
                let cleanTime = new Date(fs.statSync(etkBinDir).mtime);
                cleanTime = cleanTime.setDate(cleanTime.getDate() + 2);
                let currentTime = Date.now();
                console.log(cleanTime - currentTime);
                if(cleanTime < currentTime) {
                    simpleDownload(store.get('enctitlekeysBinRemoteUrl'),etkBinDir);
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
			//$("#qr-info").html('<img id="qr-image" src="https://chart.googleapis.com/chart?cht=qr&chs=400x400&chld=L|0&chl=http%3A%2F%2F3ds.game4u.pro%2Ftikserv.php%3Ftitleid%3D'+data.query.titleID+'%26titlekey%3D'+titlekey+'" alt="" style="height:98%;" />');
			$('#qr-image').attr("src",'https://chart.googleapis.com/chart?cht=qr&chs=400x400&chld=L|0&chl=http%3A%2F%2F3ds.game4u.pro%2Ftikserv.php%3Ftitleid%3D'+data.query.titleID+'%26titlekey%3D'+titlekey+'');
        }
    }
}

function getTitleInfo(id) {
	queryUrl = 'http://3ds.game4u.pro/apiv2.php?type=title&id='+id;
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
		param.hide();
		param.empty();
		$('.error').html('');
		for (var i = 0; i < data.query.length; i++) {
			if(data.query[i].icon == "none")iconUrl = './img/blank.png'; else iconUrl = data.query[i].icon;
			param.append(
			'<div id="item-'+i+'" class="column is-one-third-mobile is-one-quarter-tablet"><div class="box" style="height: 100%;"><article class="media">'
				+'<div class="media-left">'
					+'<img src="'+iconUrl+'" style="width: 37px" border="0" alt="">'
				+'</div>'
				+'<div class="media-content">'
					+'<div class="mdl-card__title"><h3 class="mdl-card__title-text">'
					+'<a href="#" data-id="'+data.query[i].id+'" class="title-link show-modal">'+data.query[i].name+'</a>'
					+'</h2></div>'
					+'<div class="desc">'+data.query[i].region+' | '+data.query[i].type+'<br>'+data.query[i].size+'</div>'
				+'</div>'
			+'</article></div></div>');
			//$('#item-'+i).fadeIn('fast');
		}
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

function getListing(param,sort,page,keyword) {
	//$('#loading').fadeIn();
	console.log('Current page: '+page);
	start = (page-1)*36;
	let showRegion = store.get('region');
	if(!keyword){
		console.log('Current sorting '+sort);
		queryUrl = 'http://3ds.game4u.pro/apiv2.php?sort='+sort+'&from='+start+'&qual=36&region='+showRegion;
	} else {
		queryUrl = 'http://3ds.game4u.pro/apiv2.php?type=search&keyword='+encodeURI(keyword)+'&from='+start+'&qual=36&region='+showRegion;
	}
	
	$.getJSON(queryUrl, showListing(param,sort,page,keyword)).done(function(d) {
		//$('#loading').fadeOut();
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
	getListing($(".demo-content"),'',1,keyword);
	//$('#storing-data').attr("data-keyword", keyword);
	storingData.keyword = keyword;
	$("#sort-0").removeClass('is-active');
	$("#sort-1").removeClass('is-active');
	$("#sort-2").removeClass('is-active');
}
function checkNewVersion() {
	let appVersion = app.getVersion();
	$('#curr-ver').html(appVersion);
	let queryUrl = 'http://3ds.game4u.pro/villain3ds_checkver.php?version='+appVersion;
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
	let ciadir = path.join(basePath,'cias');
	$('#cleanrawdir').on('click', function(){
		fs.removeSync(rawdir);
		fs.ensureDirSync(rawdir);
		$('.rawdir-cleaned-notif').fadeIn().delay(1200).fadeOut();
	});
	$('#openrawdir').on('click', function(){
		shell.showItemInFolder(rawdir);
	});
	$('#openciasdir').on('click', function(){
		shell.showItemInFolder(ciadir);
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