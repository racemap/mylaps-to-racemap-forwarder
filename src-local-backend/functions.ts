/*
 * Just to sum up buffers
 * @param incomingData
 * @param aBufferObject
 * @param maxMessageDataDelayInMilis
 */

import net from "node:net";
import { Buffer } from "node:buffer";
import { CRLF, MyLapsPrefix } from "./consts";
import type {
  ExtendedSocket,
  MyLapsDevice,
  MyLapsDeviceKeys,
  MyLapsDeviceShortKeys,
  MyLapsPassing,
  MyLapsPassingKeys,
  MyLapsPassingShortKeys,
  TimingRead,
} from "./types";
import moment from "moment";

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
      const aTail: Buffer = Buffer.alloc(aBufferToProcess.buffer.length - CRLFPos - CRLF.length);
      // Extracting the message
      aBufferToProcess.buffer.copy(aMessage, 0, 0, CRLFPos);
      // Saving the rest of the message
      aBufferToProcess.buffer.copy(aTail, 0, CRLFPos + CRLF.length, aBufferToProcess.buffer.length);
      // shortening the Raw Buffer
      aBufferToProcess.buffer = aTail;
      CRLFPos = aBufferToProcess.buffer.indexOf(CRLF);
      // trying to analyse the message
      if (messageHandler != null && typeof messageHandler === "function") messageHandler(aMessage);
    }
  }
};

// check if the port is already in use
export const isPortInUse = async (portToCheck: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(portToCheck, () => {
      server.close(() => resolve(false));
    });
    server.on("error", () => resolve(true));
  });
};

export const now = (): string => {
  return new Date().toISOString().split("T")[1].split("Z")[0];
};

export const log = (...args: TArgs): void => {
  console.log(now(), "Log:    ", ...args);
};

export const info = (...args: TArgs): void => {
  console.log(now(), "Info:   \x1b[34m", ...args, "\x1b[0m");
};

export const warn = (...args: TArgs): void => {
  console.log(now(), "Warning:\x1b[91m", ...args, "\x1b[0m");
};

export const error = (...args: TArgs): void => {
  console.log(now(), "Error:  \x1b[31m", ...args, "\x1b[0m");
};

export const success = (...args: TArgs): void => {
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

function prefix(chipId: string): string {
  // When "MyLaps_" is not prepended it should be prepended
  if (chipId.includes(MyLapsPrefix)) {
    return chipId;
  }
  return MyLapsPrefix + chipId;
}

//                                                            |> checksum
// Where one passing is: KV8658316:13:57.417 3 0F  1000025030870
//                       |      |            | |        |> date
//                       |      |            | |> readerNumber
//                       |      |> Time      |>  deviceNumber
//                       |> Transponder Id
export function myLapsLagacyPassingToRead(locationName: string, passingDetails: string): TimingRead | null {
  const passing = passingDetails.trim();
  if (passing.length > 38) {
    // transponderId is the first 7 chars of passingDetails i.e. KV86583
    const transponderId = passingDetails.substring(0, 7);
    // time is the next 12 chars of passingDetails i.e. 16:13:57.417
    const time = passingDetails.substring(7, 19);
    // date is the from len - 8 until len - 2 chars i.e. 250308
    const date = passingDetails.substring(passingDetails.length - 8, passingDetails.length - 2);

    const read: TimingRead = {
      timingId: locationName,
      timingName: locationName,
      timestamp: moment.utc(`${date} ${time}`, "YYMMDD hh:mm:ss.SSS").toISOString(),
      chipId: prefix(transponderId),
    };
    return read;
  }
  return null;
}

// reads stuff like this
// id=20250558568|n=BibTagDecoder00AA|mac=0004B70700AA|ant=1|time=954463123529
export function myLapsDeviceToObject(deviceAsString: string): MyLapsDevice | null {
  const deviceDetails = deviceAsString.split("|");

  const deviceUpdate: MyLapsDevice = {};

  for (const detail of deviceDetails) {
    const [key, value] = detail.split("=");
    deviceUpdate[myLapsDeviceKeyToName(key as MyLapsDeviceShortKeys)] = value;
  }

  if (deviceUpdate.deviceId != null && deviceUpdate.deviceName != null && deviceUpdate.deviceMac != null) {
    return deviceUpdate;
  }
  return null;
}

export function myLapsDeviceKeyToName(key: MyLapsDeviceShortKeys): MyLapsDeviceKeys {
  switch (key) {
    case "id":
      return "deviceId";
    case "n":
      return "deviceName";
    case "mac":
      return "deviceMac";
    case "ant":
      return "antennaCount";
    case "dt":
      return "deviceType";
    case "nr":
      return "deviceNumber";
    case "bat":
      return "batteryLevel";
    case "tbsc":
      return "timeBetweenSameChip";
    case "prof":
      return "profile";
    case "fwv":
      return "firmwareVersion";
    case "bvol":
      return "beeperVolume";
    case "btyp":
      return "beepType";
    case "cont":
      return "continuousMode";
    case "gho":
      return "gunHoldoff";
    case "ex1ho":
      return "ext1Holdoff";
    case "ex2ho":
      return "ext2Holdoff";
    case "temp":
      return "temperature";
    case "dst":
      return "daylightSavingsTime";
    case "gpsc":
      return "gPSSatelliteCount";
    case "gpsx":
      return "gPSLongitude";
    case "gpsy":
      return "gPSLatitude";
    case "tz":
      return "timezone";

    default:
      console.warn("Unknown key:", key);
  }
  return key;
}

// reads stuff like this
// t=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41
export function myLapsPassingToRead(timingId: string, timingName: string, passingAsString: string): TimingRead | null {
  const passingDetails = passingAsString.split("|");

  const passing: MyLapsPassing = {};

  for (const detail of passingDetails) {
    const [key, value] = detail.split("=");
    passing[myLapsPassingKeyToName(key as MyLapsPassingShortKeys)] = value;
  }

  if (passing.chipCode != null && passing.time != null && passing.date != null) {
    return {
      timingId,
      timingName,
      chipId: prefix(passing.chipCode),
      timestamp: moment.utc(`${passing.date}_${passing.time}`, "YYMMDD_hh:mm:ss.SSS").toISOString(),
    };
  }
  return null;
}

export function myLapsPassingKeyToName(key: MyLapsPassingShortKeys): MyLapsPassingKeys {
  switch (key) {
    case "c":
      return "chipCode";
    case "ct":
      return "chipType";
    case "d":
      return "date";
    case "l":
      return "lapNumber";
    case "dv":
      return "deviceNumber";
    case "re":
      return "readerNumber";
    case "an":
      return "antennaNumber";
    case "g":
      return "groupId";
    case "b":
      return "bibNumber";
    case "n":
      return "bibText";
    case "t":
      return "time";
    case "ut":
      return "unixTime";
    case "utc":
      return "utcTime";
    case "h":
      return "hitCount";
    case "ts":
      return "timeSource";
    case "bid":
      return "batchId";
    case "am":
      return "amplitude";
    case "amd":
      return "amplitudeDbm";
    case "dm":
      return "macAddress";
    case "ans":
      return "strongestAntenna";
    case "ana":
      return "averageAntenna";

    default:
      console.warn("Unknown key:", key);
  }
  return key;
}
