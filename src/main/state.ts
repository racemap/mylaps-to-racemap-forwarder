import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import APIClient from './api-client';
import { log } from './functions';
import type { ServerState } from './types';
import pick from 'lodash/pick';

const userDataPath = app.getPath('userData');
const storagePath = path.join(userDataPath, 'config.json');

let refToElectronWebContents: Electron.WebContents | null = null;
export const EmptyState: ServerState = {
  apiToken: '',
  apiTokenIsValid: false,
  events: [],
  user: null,
  myLapsForwarder: {
    version: null,
    connections: [],
  },
};

export let serverState: ServerState = {
  ...EmptyState,
  apiToken: process.env.RACEMAP_API_TOKEN ?? null,
};

function triggerStateChange(): void {
  console.log('triggerStateChange', serverState);
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
    serverState.events = await apiClient.getMyEvents();
  } else {
    serverState.events = [];
    serverState.user = null;
  }

  log('events', serverState.events);
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
