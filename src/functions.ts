/*
 * Just to sum up buffers
 * @param incomingData
 * @param aBufferObject
 * @param maxMessageDataDelayInMilis
 */

import net from "node:net";
import { Buffer } from "node:buffer";
import { CRLF } from "./consts";
import { ExtendedSocket } from "./types";

type TArgs = Array<unknown>;

type BufferObject = {
  buffer: Buffer;
  lastTime: number;
  name?: string;
};

export const storeIncomingRawData = (incomingData: Buffer, aBufferObject: BufferObject, maxMessageDataDelayInMilis = 200): void => {
  const newBufferlength: number = aBufferObject.buffer.length + incomingData.length;
  const now: number = Date.now();
  if (aBufferObject.buffer.length > 0 && aBufferObject.lastTime + maxMessageDataDelayInMilis < now) {
    console.warn(
      `storeIncomingRawData - ${aBufferObject.name} Buffer to old!`,
      "ΔT =",
      now - aBufferObject.lastTime,
      "ms",
      "allowedΔT =",
      maxMessageDataDelayInMilis,
      "ms",
      "dropped bytes:",
      aBufferObject.buffer,
    );
    aBufferObject.buffer = Buffer.alloc(0);
  }
  aBufferObject.buffer = Buffer.concat([aBufferObject.buffer, incomingData], newBufferlength);
  aBufferObject.lastTime = now;
};

/*
 * Just to find serialized data seperated by CRLF
 * @param aBufferToProcess
 * @param messageHandler
 */
export const processStoredData = (aBufferToProcess: BufferObject, messageHandler: (message: Buffer) => void): void => {
  if (aBufferToProcess.buffer.length > 0) {
    let CRLFPos: number = aBufferToProcess.buffer.indexOf(CRLF);
    while (CRLFPos > -1) {
      // Reserving some Space
      const aMessage: Buffer = Buffer.alloc(CRLFPos);
      // Reserving some Space for the Rest of the Message
      const aTail: Buffer = Buffer.alloc(aBufferToProcess.buffer.length - CRLFPos - 2);
      // Extracting the message
      aBufferToProcess.buffer.copy(aMessage, 0, 0, CRLFPos);
      // Saving the rest of the message
      aBufferToProcess.buffer.copy(aTail, 0, CRLFPos + 2, aBufferToProcess.buffer.length);
      // shortening the Raw Buffer
      aBufferToProcess.buffer = aTail;
      CRLFPos = aBufferToProcess.buffer.indexOf(CRLF);
      // trying to analyse the message
      if (messageHandler != null && typeof messageHandler === "function") messageHandler(aMessage);
    }
  }
};

export const now = (): string => {
  return new Date().toISOString().split("T")[1].split("Z")[0];
};

export let log = (...args: TArgs): void => {
  console.log(now(), "Log:    ", ...args);
};

export let info = (...args: TArgs): void => {
  console.log(now(), "Info:   \x1b[34m", ...args, "\x1b[0m");
};

export let warn = (...args: TArgs): void => {
  console.log(now(), "Warning:\x1b[91m", ...args, "\x1b[0m");
};

export let error = (...args: TArgs): void => {
  console.log(now(), "Error:  \x1b[31m", ...args, "\x1b[0m");
};

export let success = (...args: TArgs): void => {
  console.log(now(), "Success:\x1b[32m", ...args, "\x1b[0m");
};

export function connectTcpSocket(ip: string, port: number): Promise<ExtendedSocket> {
  return new Promise((resolve, reject) => {
    try {
      const tcpClient = new net.Socket();
      tcpClient.connect(port, ip, () => {
        resolve(tcpClient as ExtendedSocket);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * build a random string with 9 characters
 * @returns string
 */
export function shortIdBuilder(): string {
  return characterIdBuilder();
}

/**
 * build a character based id with a controlable number of characters
 * @param numberOfCharacter - The number digits the id will have
 * @returns id
 */
export function characterIdBuilder(numberOfCharacter = 9): string {
  return Math.random().toString(36).substr(2, numberOfCharacter);
}

export function sleep(millisToSleep: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, millisToSleep);
  });
}

export const printEnvVar = (envVar: { [name: string]: unknown }, isPublic = true): void => {
  let name = "???";
  let value: unknown | null = null;
  if (envVar != null && typeof envVar === "object" && Object.keys(envVar).length === 1) {
    name = Object.keys(envVar)[0];
    value = isPublic ? Object.values(envVar)[0] : "***";
  }
  console.log(now(), "Log:", `    |-> \x1b[35m${name}\x1b[0m: \x1b[36m${value || "???"}\x1b[0m`);
};
