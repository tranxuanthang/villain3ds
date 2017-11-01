var remote = require('electron').remote;
const {app} = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
const Store = require('./js/store.js');
const path = require('path')
var fs = require('fs');
const shell = require('electron').shell;

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var storingData = {sort: 0, page: 0, keyword: ''};


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
		// this function never gets called
		console.log(data);
	});
}

function showListing(param,sort,page,keyword) {
	return function (data) {
		$('.error').html('');
		param.fadeOut('fast').hide();
		param.empty();
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
			console.log(getid);
			getTitleInfo(getid);
			$('.modal-title').addClass('is-active');
		});
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
		});
		$('#download-button').unbind('click').on('click', sendDownloadRequest);
	}
}

function getListing(param,sort,page,keyword) {
	$('#loading').fadeIn();
	console.log('Current page: '+page);
	start = (page-1)*36;
	if(!keyword){
		console.log('Current sorting '+sort);
		queryUrl = 'http://3ds.game4u.pro/apiv2.php?sort='+sort+'&from='+start+'&qual=36';
	} else {
		queryUrl = 'http://3ds.game4u.pro/apiv2.php?type=search&keyword='+encodeURI(keyword)+'&from='+start+'&qual=36';
	}
	$.getJSON(queryUrl, showListing(param,sort,page,keyword)).done(function(d) {
		$('#loading').fadeOut();
	}).fail(function(d) {
		$('.error').html('<section class="hero is-dark"><div class="hero-body"><div class="container">'
			+'<h1 class="title">Oops. Something is wrong</h1>'
			+'<h2 class="subtitle">An error has occured ;-(</h2>'
		  +'</div></div></section>');
		$('#grid').html('');
		$('#loading').fadeOut();
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
			$('#check-newer-version').html('Newer version is available.<br>Newest version: '+data.newest_version+'<br><a id="openDownlUrl" href="#">Go to download URL</a>');
			$('#openDownlUrl').on('click',function(){
				console.log('open update url once');
				shell.openExternal(data.update_url);
			});
		} else {
			$('#check-newer-version').html('Your app is up-to-date ;-)<br><a id="openDownlUrl" href="#">Go to download URL anyways</a>');
			$('#openDownlUrl').on('click',function(){
				console.log('open update url once');
				shell.openExternal(data.update_url);
			});
		}
		
	});
}
$('#config-button').on('click', function() {
	$('.modal-config').addClass('is-active');
	$('#config-form').attr("disabled", false);
	$('#enctitlekeysBinRemoteUrl').val(store.get('enctitlekeysBinRemoteUrl'));
});
$('#about-button').on('click', function() {
	$('.modal-about').addClass('is-active');
	checkNewVersion();
});
$('.modal-config .dialog-close, .modal-config .modal-background').on('click', function() {
	$('.modal').removeClass('is-active');
	$('#config-form').attr("disabled", true);
});
$('.modal-about .dialog-close, .modal-about .modal-background').on('click', function() {
	$('.modal').removeClass('is-active');
});

const store = new Store({
  configName: 'config',
  defaults: {
    enctitlekeysBinRemoteUrl: ""
  }
});
$("#config-form").submit(function(e){
	let enctitlekeysBinRemoteUrl = $('#enctitlekeysBinRemoteUrl').val();
	console.log(enctitlekeysBinRemoteUrl);
	store.set('enctitlekeysBinRemoteUrl', enctitlekeysBinRemoteUrl);
	let homedir = app.getPath('home');
	let basedir = path.join(homedir, 'Villain3DS');
	let targetPath = path.join(basedir, 'etkCache.json');
	if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
	$('.config-saved-notif').fadeIn().delay(1200).fadeOut();
	e.preventDefault();
});
$(document).ready(function(){
	/* for sorting */
	var trigger = $('#sort-0, #sort-1, #sort-2');
	trigger.on('click', sortingHandler);
	
	/* for prev - next */
	var trigger2 = $('#prev-link, #next-link');
	trigger2.on('click', pageNavigator);
	
	/* search */
	$("#search-form").submit(searchSubmit);
	
	
});

getListing($(".demo-content"),0,1,'');
