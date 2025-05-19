import fs from 'node:fs';
import pick from 'lodash/pick';
import path from 'node:path';
import APIClient from './api-client';
import { log } from './functions';
import { app, shell } from 'electron';
import { EmptyServerState } from '../consts';
import type { ServerState } from '../types';

const isElectron = !!process.versions?.electron;

const userDataPath = isElectron ? app.getPath('userData') : './';
const storagePath = path.join(userDataPath, 'config.json');

let refToElectronWebContents: Electron.WebContents | null = null;

export let serverState: ServerState = {
  ...EmptyServerState,
  apiToken: process.env.RACEMAP_API_TOKEN ?? null,
};

function triggerStateChange(): void {
  refToElectronWebContents?.send('onServerStateChange', serverState);
}

export function updateServerState(newState: Partial<ServerState>): void {
  serverState = {
    ...serverState,
    ...newState,
  };
  triggerStateChange();
}

export async function upgradeAPIToken(apiToken: string): Promise<boolean> {
  serverState.apiToken = apiToken;
  const apiClient = new APIClient({
    authorization: `Bearer ${serverState.apiToken}`,
  });
  serverState.apiTokenIsValid = (await apiClient.checkToken()) ?? false;
  if (serverState.apiTokenIsValid) {
    serverState.events = [...(await apiClient.getMyPredictionEvents('today')), ...(await apiClient.getMyPredictionEvents('future'))].map((e) => ({
      name: e.name,
      id: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
      modules: e.modules,
    }));
  } else {
    serverState.events = [];
    serverState.user = null;
  }

  log(serverState.events.map((e) => `${e.name} ${e.modules?.predictive?.enabled === true ? '(predictive)' : '(non-predictive)'}`));

  triggerStateChange();

  return serverState.apiTokenIsValid;
}

export function getServerState(): Promise<ServerState> {
  return Promise.resolve(serverState);
}

export function saveServerState(): void {
  fs.writeFileSync(storagePath, JSON.stringify(pick(serverState, ['apiToken']), null, 2));
}

export function loadServerState(): void {
  if (fs.existsSync(storagePath)) {
    const parsedState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    console.log('parsedState', parsedState);
    serverState = {
      ...serverState,
      ...parsedState,
    };
    console.log('serverState', serverState);
  }
}

export function prepareServerState(webContents: Electron.WebContents): void {
  refToElectronWebContents = webContents;
  loadServerState();
}

export function callExternalLink(url: string): void {
  log('callExternalLink', url);
  if (isElectron) {
    shell.openExternal(url);
  }
}
