import icon from "../../resources/icon.png?asset";
import APIClient from "./api-client";
import MyLapsForwarder from "./forwarder";
import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { MyLapsToRacemapForwarderVersion } from "./version";
import { info, log, printEnvVar, success } from "./functions";
import {
	getServerState,
	loadServerState,
	saveServerState,
	upgradeAPIToken,
} from "./state";

const RACEMAP_API_HOST = process.env.RCEMAP_API_HOST ?? "https://racemap.com";
const RACEMAP_API_TOKEN = process.env.RACEMAP_API_TOKEN ?? "";
const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? "private";
const LISTEN_PORT = Number.parseInt(process.env.LISTEN_PORT ?? "3097");
const VERSION = MyLapsToRacemapForwarderVersion.gitTag.split("_")[0];
const apiClient = new APIClient({ "api-token": RACEMAP_API_TOKEN });

async function bootup() {
	log("Hello from mylaps-forwarder");

	printEnvVar({ RACEMAP_API_HOST });
	printEnvVar({ RACEMAP_API_TOKEN });
	printEnvVar({ LISTEN_MODE });
	printEnvVar({ LISTEN_PORT });
	printEnvVar({ VERSION });

	info("Check LISTEN_MODE");
	if (!["private", "public"].includes(LISTEN_MODE)) {
		throw new Error(
			`Invalid listen mode. Please use either 'private' or 'public'`,
		);
	}

	info("Try to read users api token");
	if (RACEMAP_API_TOKEN === "") {
		throw new Error(`No api token found. 
      - Please create an .env file and store your token there. 
      - The token should look like this: RACEMAP_API_TOKEN=your-api-token
      - You can get your api token from your racemap account profile section.`);
	}
	success("|-> Users api token is availible");
	info("Try to check validyty of your API Token, sending an empty dataset.");

	const isAvail = await apiClient.checkAvailibility();
	if (isAvail) {
		success("|-> API Token is valid");
		new MyLapsForwarder(
			RACEMAP_API_TOKEN,
			LISTEN_PORT,
			LISTEN_MODE === "private",
		);
	} else {
		throw new Error(
			"API Token is invalid. Please check your token and try again.",
		);
	}
}

function createWindow(): void {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 900,
		height: 670,
		show: false,
		autoHideMenuBar: true,
		...(process.platform === "linux" ? { icon } : {}),
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
	});

	mainWindow.on("ready-to-show", () => {
		mainWindow.show();
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: "deny" };
	});

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
		mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
	// Set app user model id for windows
	electronApp.setAppUserModelId("com.electron");

	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	// IPC testlog(`Handle upgrade API Token ${apiToken}`);
	ipcMain.on("ping", () => console.log("pong"));

	ipcMain.handle("upgradeAPIToken", async (_invokeEvent, apiToken) => {
		return await upgradeAPIToken(apiToken);
	});

	ipcMain.handle("getServerState", async (_invokeEvent) => {
		return getServerState();
	});

	createWindow();

	app.on("activate", () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});

	loadServerState();
	await bootup();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	saveServerState();
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
