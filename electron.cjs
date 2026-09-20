const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let launcherWindow;
let gameWindow;
let lastLauncherPayload;

function sendLauncherStatus(status, details = {}) {
  lastLauncherPayload = { status, ...details };
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.webContents.send('launcher:status', lastLauncherPayload);
  }
}

function createGameWindow() {
  gameWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'One Piece Tactics',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  gameWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  gameWindow.on('closed', () => {
    gameWindow = null;
  });
}

function launchGame() {
  if (gameWindow) return;
  createGameWindow();
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.close();
  }
}

function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: 480,
    height: 360,
    resizable: false,
    maximizable: false,
    title: 'One Piece Tactics - Launcher',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  launcherWindow.loadFile(path.join(__dirname, 'launcher.html'));
  launcherWindow.webContents.on('did-finish-load', () => {
    if (lastLauncherPayload) {
      launcherWindow.webContents.send('launcher:status', lastLauncherPayload);
    }
  });
  launcherWindow.on('closed', () => {
    launcherWindow = null;
    if (!gameWindow) app.quit();
  });
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => sendLauncherStatus('checking'));
  autoUpdater.on('update-available', (info) => {
    sendLauncherStatus('downloading', { version: info.version });
    autoUpdater.downloadUpdate().catch((error) => {
      sendLauncherStatus('error', { message: error.message });
    });
  });
  autoUpdater.on('update-not-available', (info) => {
    sendLauncherStatus('ready', { version: info.version });
  });
  autoUpdater.on('download-progress', (progress) => {
    sendLauncherStatus('progress', { percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendLauncherStatus('downloaded', { version: info.version });
  });
  autoUpdater.on('error', (error) => {
    sendLauncherStatus('offline', { message: error.message, version: app.getVersion() });
  });
}

ipcMain.handle('launcher:launch', () => {
  launchGame();
});

ipcMain.handle('launcher:install', () => {
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  createLauncherWindow();
  configureAutoUpdater();

  if (!app.isPackaged) {
    sendLauncherStatus('ready', { version: app.getVersion(), development: true });
    return;
  }

  autoUpdater.checkForUpdates().catch((error) => {
    sendLauncherStatus('offline', { message: error.message, version: app.getVersion() });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
