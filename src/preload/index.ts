import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { upgradeAPIToken } from '../main/state';
import type { getServerState } from '../main/state';
import type { ServerState } from '../main/types';

// Custom APIs for renderer
const api = {
  upgradeAPIToken(...params: Parameters<typeof upgradeAPIToken>): ReturnType<typeof upgradeAPIToken> {
    return ipcRenderer.invoke('upgradeAPIToken', ...params);
  },

  getServerState(): ReturnType<typeof getServerState> {
    return ipcRenderer.invoke('getServerState');
  },

  onServerStateChange: (callback: (serverState: ServerState) => void) => {
    console.log('onServerStateChange');
    ipcRenderer.on('onServerStateChange', (_event, serverState: ServerState) => {
      callback(serverState);
    });
  },
  removeServerStateChangeListener: (callback) => {
    ipcRenderer.removeListener('onServerStateChange', callback);
  },
};

export type API = typeof api;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  console.log('The Electron context is isolated');
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
