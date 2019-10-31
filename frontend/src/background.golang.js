'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import {
  createProtocol,
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'
import path from 'path';
const exec = require('child_process').exec;
const spawn = require('child_process').spawn
const log = require('electron-log');

const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win, apiServerCmd, apiServerArgs, apiServerFolder
let url = 'http://localhost:9999'
let errors = {}

// Need to declare and launch backend process
if (isDevelopment) {
  apiServerFolder = `${process.cwd()}/../backend`
  apiServerCmd = "go run *.go"
} else {
  apiServerFolder = process.resourcesPath
  if (process.platform === 'win32') {
    apiServerCmd = `${apiServerFolder}\\backend-win.exe`
  } else if (process.platform === 'darwin') {
    apiServerCmd = `${apiServerFolder}/backend-mac`
  }
  else if (process.platform === 'linux') {
    apiServerCmd = `${apiServerFolder}/backend-linux`
  } else {
    log.error(`Unable to match process.platform value: ${process.platform}`);
    app.quit();
  }
}


const apiServerProc = exec(apiServerCmd, { cwd: apiServerFolder, env: process.env }, function(error, stdout, stderr) {
  if (error) {
    log.error(`Error executing apiServerProc, in directory '${apiServerFolder}'`);
    log.error(error);
    errors['apiServerProc'] = error
    return;
  }
});

apiServerProc.stdout.on('data', function (data) {
  log.info(data.toString())
});

apiServerProc.stderr.on('data', function (data) {
  log.error(data.toString())
});

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])

function createWindow () {

  // Create the browser window.
  win = new BrowserWindow({ width: 800, height: 600, webPreferences: {
    nodeIntegration: true
  } })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    // win.loadURL('app://./index.html')

    log.info('API Server [' + apiServerProc.pid + '] running at ' + url);
    win.loadURL(url)

  }

  win.on('closed', () => {
    win = null
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // Devtools extensions are broken in Electron 6.0.0 and greater
    // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
    // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
    // If you are not using Windows 10 dark mode, you may uncomment these lines
    // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
    // try {
    //   await installVueDevtools()
    // } catch (e) {
    //   log.error('Vue Devtools failed to install:', e.toString())
    // }

  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

process.on('exit', function() {
  log.info("Shutting down API server");
  apiServerProc.kill();
});


//////// Debugging //////////////////////
ipcMain.on('asynchronous-message', (event, arg) => {
  log.info(arg)
  event.reply('asynchronous-reply', global[arg])
})

ipcMain.on('get-var', (event, arg) => {
  log.info(arg)
  event.returnValue = typeof global[arg] === 'object' ? JSON.stringify(global[arg]) : global[arg]
})