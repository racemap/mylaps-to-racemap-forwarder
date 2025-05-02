import type net from 'node:net';
import type MyLapsForwarder from './forwarder';
import type { ServiceVersion } from './version';

export type RacemapEvent = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type RacemapUser = {
  id: string;
  name: string;
  email: string;
};

export type ForwarderState = {
  version: ServiceVersion | null;
  connections: Array<{
    id: string;
    userId: string;
    openedAt: Date;
    sourceIP: string;
    sourcePort: number;
    identified: boolean;
    locations: Array<string>;
  }>;
};

export type ServerState = {
  apiToken: string | null;
  apiTokenIsValid: boolean;
  events: Array<RacemapEvent>;
  user: RacemapUser | null;
  myLapsForwarder: ForwarderState;
};

export type MyLapsClientVersions = 'v1.0' | 'v2.1';

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

export type LocationUpdate = {
  locationName: string;
  computerName?: string;
  deviceUpdate?: MyLapsDevice;
};

// this can be obtained by calling the getInfo function with the test prefix
// => Send("Test@GetInfo@$")
export type MyLapsLocation = {
  id?: string; // id of the location
  mac?: string; // MAC address of the location
  name: string;
  computerName: string;
  devicesByName: Record<string, MyLapsDevice>;
  lastSeen?: Date | null; // last time the location was seen
  startTimeStamp?: number; // timestamp of the location
  locationName?: string; // name of the location for test
};

export type MyLapsClientMetadata = {
  name: string; // name of the connected client
  version: MyLapsClientVersions; // version of the connected client
  clientRespondedAt: Date; // last time client responded to a ping request
  connectionId?: string;
  locations: Record<string, MyLapsLocation>; // list of connected MyLaps Readers/Hardware/Files
};

export type MyLapsClient = {
  id: string;
  meta: MyLapsClientMetadata;
  openedAt: string;
};

export type MyLapsDevice = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  deviceNumber?: string;
  deviceMac?: string;
  batteryLevel?: string;
  timeBetweenSameChip?: string;
  profile?: string;
  antennaCount?: string;
  firmwareVersion?: string;
  beeperVolume?: string;
  beepType?: string;
  continuousMode?: string;
  gunHoldoff?: string;
  ext1Holdoff?: string;
  ext2Holdoff?: string;
  temperature?: string;
  daylightSavingsTime?: string;
  gPSSatelliteCount?: string;
  gPSLongitude?: string;
  gPSLatitude?: string;
  timezone?: string;
};

export type MyLapsDeviceKeys = keyof MyLapsDevice;
export type MyLapsDeviceShortKeys =
  | 'id'
  | 'n'
  | 'dt'
  | 'nr'
  | 'mac'
  | 'bat'
  | 'tbsc'
  | 'prof'
  | 'ant'
  | 'fwv'
  | 'bvol'
  | 'btyp'
  | 'cont'
  | 'gho'
  | 'ex1ho'
  | 'ex2ho'
  | 'temp'
  | 'dst'
  | 'gpsc'
  | 'gpsx'
  | 'gpsy'
  | 'tz';

export type MyLapsPassing = {
  chipCode?: string;
  chipType?: string;
  date?: string;
  lapNumber?: string;
  deviceNumber?: string;
  readerNumber?: string;
  antennaNumber?: string;
  groupId?: string;
  bibNumber?: string;
  bibText?: string;
  time?: string;
  unixTime?: string;
  utcTime?: string;
  hitCount?: string;
  timeSource?: string;
  batchId?: string;
  amplitude?: string;
  amplitudeDbm?: string;
  macAddress?: string;
  strongestAntenna?: string;
  averageAntenna?: string;
};

export type MyLapsPassingKeys = keyof MyLapsPassing;

export type MyLapsPassingShortKeys =
  | 'c'
  | 'ct'
  | 'd'
  | 'l'
  | 'dv'
  | 're'
  | 'an'
  | 'g'
  | 'b'
  | 'n'
  | 't'
  | 'ut'
  | 'utc'
  | 'h'
  | 'ts'
  | 'bid'
  | 'am'
  | 'amd'
  | 'dm'
  | 'ans'
  | 'ana';

export type TState = {
  aTCPClient: net.Socket | null;
  forwarder: MyLapsForwarder | null;
  mylapsServerMessages: Array<string>;
  mylapsSocketCache: {
    lastTime: number;
    buffer: Buffer;
  };
  connectedClients: Array<MyLapsClient>;
  myLapsTimingReads: Array<StoredTimingRead>;
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
  sendFrame: (text: string) => boolean;
  sendData: (data: Array<string>) => boolean;
  sendObject: (object: Record<string, string>) => void;
  lastReceivedMessages: Array<string>;
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
  id: string;
  clientName: string;
  trasnponderIds: Array<string>;
  locations: Array<MyLapsLocation>;
  passingString: string;
  legacyPassingString: string;
};

export type TTestState = {
  aTCPClient: ExtendedSocket | null;
  forwarder: MyLapsForwarder | null;
  fromServerMessages: Array<string>;
  socketCache: {
    lastTime: number;
    buffer: Buffer;
  };
  passingAttempts: Array<string>;
};
