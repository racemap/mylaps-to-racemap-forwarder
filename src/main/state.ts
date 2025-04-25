import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import APIClient from "./api-client";
import { log } from "./functions";
import type { ServerState } from "./types";
import pick from "lodash/pick";

const userDataPath = app.getPath("userData");
const storagePath = path.join(userDataPath, "config.json");

export const EmptyState: ServerState = {
	apiToken: "",
	apiTokenIsValid: false,
	events: [],
	user: null,
};

export let state: ServerState = {
	...EmptyState,
	apiToken: process.env.RACEMAP_API_TOKEN ?? null,
};

export async function upgradeAPIToken(apiToken: string): Promise<boolean> {
	state.apiToken = apiToken;
	const apiClient = new APIClient({
		authorization: `Bearer ${state.apiToken}`,
	});
	state.apiTokenIsValid = (await apiClient.checkToken()) ?? false;
	if (state.apiTokenIsValid) {
		state.events = await apiClient.getMyEvents();
	} else {
		state.events = [];
		state.user = null;
	}

	log("events", state.events);

	return state.apiTokenIsValid;
}

export function getServerState(): Promise<ServerState> {
	return Promise.resolve(state);
}

export function saveServerState(): void {
	fs.writeFileSync(
		storagePath,
		JSON.stringify(pick(state, ["apiToken"]), null, 2),
	);
}

export function loadServerState(): void {
	if (fs.existsSync(storagePath)) {
		const parsedState = JSON.parse(fs.readFileSync(storagePath, "utf-8"));
		state = {
			...parsedState,
		};
	}
}
