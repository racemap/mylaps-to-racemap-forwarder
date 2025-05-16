import icon from '../../resources/icon.png?asset';
import MyLapsForwarder from './mylaps/forwarder';
import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { ToRacemapForwarderVersion } from '../version';
import { info, log, prepareLogger, printEnvVar } from './functions';
import { getServerState, prepareServerState, saveServerState, upgradeAPIToken, serverState } from './state';

async function bootup() {
  log('Hello from 2-racemap-forwarder');

  const RACEMAP_API_HOST = process.env.RCEMAP_API_HOST ?? 'https://racemap.com';
  const RACEMAP_API_TOKEN = serverState.apiToken ?? '';
  const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? 'private';
  const LISTEN_PORT = Number.parseInt(process.env.LISTEN_PORT ?? '3097');
  const VERSION = ToRacemapForwarderVersion.gitTag.split('_')[0];

  printEnvVar({ RACEMAP_API_HOST });
  printEnvVar({ RACEMAP_API_TOKEN });
  printEnvVar({ LISTEN_MODE });
  printEnvVar({ LISTEN_PORT });
  printEnvVar({ VERSION });

  info('Check LISTEN_MODE');
  if (!['private', 'public'].includes(LISTEN_MODE)) {
    throw new Error(`Invalid listen mode. Please use either 'private' or 'public'`);
  }

  new MyLapsForwarder(RACEMAP_API_TOKEN, LISTEN_PORT, LISTEN_MODE === 'private');
}

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 770,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('ping', () => console.log('pong'));

  ipcMain.handle('upgradeAPIToken', async (_invokeEvent, apiToken) => {
    return await upgradeAPIToken(apiToken);
  });

  ipcMain.handle('getServerState', async (_invokeEvent) => {
    return getServerState();
  });

  const mainWindow = createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  prepareLogger(mainWindow.webContents);
  prepareServerState(mainWindow.webContents);

  await bootup();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  saveServerState();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
