const path = require('path');
const spawn = require( 'child_process' ).spawn;

const { app, BrowserWindow } = require('electron');
const isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false;

var proc

function createWindow() {
  // launch app 
  process.stdout.write(`launching: ${execPath}`+'\n')
  let command = spawn(execPath, [], {});
  command.stdout.on('data', data => {
    console.log(`stdout: ${data}`);
  });
  command.stderr.on('data', data => {
    console.log(`stderr: ${data}`);
  });
  proc = command

  // Create the browser window.
  const win = new BrowserWindow({
    // width: 800,
    // height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    show: false,
  });

  // and load the index.html of the app.
  // win.loadFile("index.html");
  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : 'http://localhost:5987'
  );
  // Open the DevTools.
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    
  }
  win.maximize()
  win.show()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", async () => {
  if (proc) {
    process.stdout.write(`killing PID: ${proc.pid}`+'\n')
    proc.kill()
  }
});


/////////////////////////////////////// get root path ///////////////////////////////////////
const os = require('os')
const fs = require('fs')
const IS_PROD = process.env.NODE_ENV === 'production';
const isRenderer = process.type === 'renderer'
const isWindows = process.platform === 'win32'

let isPackaged = false;

if (
  process.mainModule &&
  process.mainModule.filename.indexOf('app.asar') !== -1
) {
  isPackaged = true;
} else if (process.argv.filter(a => a.indexOf('app.asar') !== -1).length > 0) {
  isPackaged = true;
}

let rootPath = null;

if (isPackaged) {
  // renderer and main process - packaged build
  if (isWindows) {
    // windows platform
    rootPath = path.join(__dirname, '..', '../../../../');
  } else {
    // non windows platform
    rootPath = path.join(__dirname, '..', '../../../../../');
  }
} else if (IS_PROD) {
  // renderer and main process - prod build
  if (isRenderer) {
    // renderer process - prod build
    rootPath = path.join(__dirname, '..', '..', '..');
  } else if (!module.parent) {
    // main process - prod build (case: run "start")
    rootPath = path.join(__dirname, '..', '..', '..');
  } else {
    // main process - prod (case: run "build")
    rootPath = path.join(__dirname, '..', '..', '..');
  }
} else if (isRenderer) {
  // renderer process - dev build
  rootPath = path.join(__dirname, '..', '..', '..');
} else {
  // main process - dev build
  rootPath = path.join(__dirname, '..', '..', '..');
}


const getPlatform = () => {
  switch (os.platform()) {
    case 'aix':
    case 'freebsd':
    case 'linux':
      return 'linux';
    case 'openbsd':
    case 'android':
    case 'darwin':
      return 'mac';
    case 'sunos':
    case 'win32':
      return 'win';
  }
};


// const binariesFolder = IS_PROD && isPackaged // the path to a bundled electron app.
// ? path.join(rootPath, 'Contents', 'Resources', 'app', 'resources', getPlatform(), 'bin')
// : path.join(rootPath, 'resources', getPlatform(), './bin');

var binariesFolder = path.join(rootPath, 'resources', getPlatform(), './bin')
if (!fs.existsSync(binariesFolder)) {
  binariesFolder = path.join(rootPath, 'Resources', 'app', 'resources', getPlatform(), 'bin')
}

var execPath = path.resolve(
  path.join(binariesFolder, './dbnet-x86_64-apple-darwin')
);
