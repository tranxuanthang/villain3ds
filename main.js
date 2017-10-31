const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const dialog = electron.dialog;
const url = require('url')
const path = require('path')
var fs = require('fs');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow


app.setAsDefaultProtocolClient('villain3ds')
app.on('open-url', function (event, url) {
	dialog.showErrorBox('Welcome Back', `You arrived from: ${url}`)
})

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

if (shouldQuit) {
  app.quit();
  return;
}

/* Clean etkCache */
let homedir = app.getPath('home');
let basedir = path.join(homedir, 'Villain3DS');
let targetPath = path.join(basedir, 'etkCache.json');
if (fs.existsSync(targetPath)){
	fs.stat(targetPath, function(err,stats){
		//console.log(stats);
		lastModif = new Date(stats.mtime).getTime();
		cleanTime = new Date(stats.mtime);
		cleanTime = cleanTime.setDate(cleanTime.getDate() + 2);
		currTime = Date.now();
		//console.log(lastModif + ' '+ cleanTime + ' ' +currTime);
		console.log('time left before clean etkCache: '+(cleanTime-currTime));
		if(cleanTime < currTime) {
			fs.unlinkSync(targetPath);
			console.log('deleted cached etk');
		}
	});
}



function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow(
	{
	  width: 900, 
	  height: 700, 
	  minWidth: 760, 
	  minHeight: 480,
	  icon: __dirname + '/img/icon.png',
	  backgroundColor: '#2b3e50'
	}
  )

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
downloadWindow = new Array();
app.showExitPrompt = true;
const ipcMain = electron.ipcMain;
ipcMain.on('download-title', function(event, data){
	if(typeof downloadWindow[data.titleID] === 'undefined'){
		downloadWindow[data.titleID] = new BrowserWindow({
			width: 900, height: 500, minWidth: 640, minHeight: 300, icon: __dirname + '/img/icon.png'
		});
		downloadWindow[data.titleID].loadURL(url.format({
			pathname: path.join(__dirname, 'download.html'),
			protocol: 'file:',
			slashes: true
		}));
		console.log(path.join(__dirname, 'download.html')+'?titleID='+data.titleID+'&name='+data.name+'&region='+data.region);
		downloadWindow[data.titleID].on('closed', function () {
			downloadWindow[data.titleID] = null;
			delete downloadWindow[data.titleID];
		});
		console.log('loaded, '+data.encTitleKey);
		function daibang(arg){
			downloadWindow[data.titleID].webContents.send('download-title', arg);
		}
		ipcMain.once('dlprocess-ready', (event) => {
			daibang(data);
			console.log('received ready from download process');
			ipcMain.removeListener('dlprocess-ready',function (){daibang(data)});
		});
		event.sender.send('status', 'started-downloading');
		//event.returnValue = 'started-downloading';
		
		downloadWindow[data.titleID].on('close', (e) => {
			
			if (app.showExitPrompt) {
				console.log(app.showExitPrompt);
				e.preventDefault() // Prevents the window from closing 
				dialog.showMessageBox({
					type: 'question',
					buttons: ['Yes', 'No'],
					title: 'Unfinished download',
					message: 'Contents that are partially downloaded can\'t be resumed (unless you\'re using the "download manager" method). Are you sure you want to close?'
				}, function (response) {
					if (response === 0) { // Runs the following if 'Yes' is clicked
						app.showExitPrompt = false
						downloadWindow[data.titleID].close()
					}
				})
			}
		})
	} else {
		console.log('this title '+data.titleID+' is already downloading...');
		event.sender.send('status', 'already-downloading');
		//event.returnValue = 'already-downloading';
	}
	//setTimeout(function(){daibang(data)},1000);
});

ipcMain.on('get-homedir', (event) => {
    // Print 1
    homePath = app.getPath('home');
    // Reply on async message from renderer process
    event.returnValue = homePath;
});
