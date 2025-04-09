import net from "node:net";
import MyLapsForwarder from "./forwarder";

export type MyLapsClientVersions = "v1.0" | "v2.1";

export type TimingRead = {
  timestamp: string; // Millis since EPOCH
  chipId: string; // BiB or TransponderId or ChipID
  timingId: string; // ID of Timing Hardware or the reader or the antenna
  timingName?: string; // User defined name of the hardware i.e. Start 9K 42K or Finish
  lat?: number | null; // Latitude on earth in degree if availible (most timing system does not have this)
  lng?: number | null; // Longitude on earth in degree
  alt?: number | null; // Elevation in meters above sea level
};

export type StoredTimingRead = TimingRead & {
  receivedAt: string;
};

// this can be obtained by calling the getInfo function with the test prefix
// => Send("Test@GetInfo@$")
export type MyLapsSource = {
  id?: string; // id of the source
  mac?: string; // MAC address of the source
  name: string;
  deviceName: string;
  computerName: string;
  lastSeen?: Date | null; // last time the source was seen
};

export type MyLapsClientMetadata = {
  name: string; // name of the connected client
  version: MyLapsClientVersions; // version of the connected client
  clientRespondedAt: Date; // last time client responded to a ping request
  connectionId?: string;
  sources: Record<string, MyLapsSource>; // list of connected MyLaps Readers/Hardware/Files
};

export type MyLapsDevice = {
  id: string;
  meta: MyLapsClientMetadata;
  openedAt: string;
};

export type TState = {
  aTCPClient: net.Socket | null;
  forwarder: MyLapsForwarder | null;
  mylapsServerMessages: Array<any>;
  mylapsSocketCache: {
    lastTime: number;
    buffer: Buffer;
  };
  connectedClients: Array<MyLapsDevice>;
  chronoTimingReads: Array<StoredTimingRead>;
};

export type ExtendedSocket = net.Socket & {
  id: string;
  meta: MyLapsClientMetadata;
  token: string;
  cache: { lastTime: number; buffer: Buffer; name: string };
  userId: string;
  openedAt: Date;
  identified: boolean;
  keepAliveTimerHandle: NodeJS.Timeout | null;
  triggerStartTransmissionHandle: NodeJS.Timeout | null;
  sendKeepAlivePing: () => void;
  sendFrame: (text: string) => void;
  sendData: (data: Array<String>) => void;
  sendObject: (object: Record<string, string>) => void;
};

export type MessageParts = Array<string>;

// for the test
export type TPredictionTestTimes = {
  testStartTime: Date;
  testStartTimeMinus60Seconds: Date;
  startTime: string;
  endTime: string;
};

export type TTestFixtures = {
  is: string;
  clientName: string;
  sources: Array<MyLapsSource>;
};

export type TTestState = {
  aTCPClient: ExtendedSocket | null;
  forwarder: MyLapsForwarder | null;
  serverMessages: Array<any>;
  socketCache: {
    lastTime: number;
    buffer: Buffer;
  };
};
