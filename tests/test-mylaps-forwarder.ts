import moment from "moment";
import MyLapsForwarder from "../src/forwarder";
import { serial as test } from "ava";
import { CRLF, MyLapsFunctions, MyLapsIdentifiers, MyLapsDataSeparator, OneHourInMillis, OneSecondInMillis, MyLapsPrefix } from "../src/consts";
import type { TPredictionTestTimes, TTestFixtures, TTestState } from "../src/types";
import {
  sleep,
  isPortInUse,
  shortIdBuilder,
  connectTcpSocket,
  processStoredData,
  storeIncomingRawData,
  myLapsLagacyPassingToRead,
  myLapsPassingToRead,
} from "../src/functions";

const RACEMAP_API_HOST = process.env.RACEMAP_API_HOST ?? "https://racemap.com";
const RACEMAP_API_TOKEN = process.env.RACEMAP_API_TOKEN ?? "";
const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? "private";
const LISTEN_PORT = Number.parseInt(process.env.LISTEN_PORT || "3097");

const forwarderIPAddress = LISTEN_MODE === "private" ? "127.0.0.1" : "0.0.0.0";

const shortId001 = shortIdBuilder();
const times: TPredictionTestTimes = {
  testStartTime: moment().utc().toDate(),
  testStartTimeMinus60Seconds: moment().utc().add(-60, "seconds").toDate(),
  startTime: moment().utc().subtract(1, "h").toISOString(),
  endTime: moment().utc().toISOString(),
};

const fixtures: TTestFixtures = {
  id: shortId001,
  clientName: "RMMyLabsTestClient",
  trasnponderIds: ["0000041", "0000042", "0000043"],
  sources: [
    {
      name: "Start",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_0`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((0 * OneHourInMillis) / 7),
    },
    {
      name: "1k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_1`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((1 * OneHourInMillis) / 7),
    },
    {
      name: "2k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_2`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((2 * OneHourInMillis) / 7),
    },
    {
      name: "3k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_3`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((3 * OneHourInMillis) / 7),
    },
    {
      name: "5k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_4`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((4 * OneHourInMillis) / 7),
    },
    {
      name: "8k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_5`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((5 * OneHourInMillis) / 7),
    },
    {
      name: "9k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_6`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((6 * OneHourInMillis) / 7),
    },
    {
      name: "Finish",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_7`,
      startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((7 * OneHourInMillis) / 7),
    },
  ],
  passingString: "t=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41",
  legacyPassingString: "KV8658316:13:57.417 3 0F  1000025030870",
};

const state: TTestState = {
  aTCPClient: null,
  forwarder: null,
  fromServerMessages: [],
  socketCache: {
    lastTime: 0,
    buffer: Buffer.alloc(0),
  },
  passingAttempts: [],
};

test("Ava is running, fixtures and state exists", async (t) => {
  t.is(true, true);
  t.not(fixtures, null);
  t.not(state, null);
});

test("Test function myLapsLagacyPassingToRead", (t) => {
  const read = myLapsLagacyPassingToRead("Start", fixtures.legacyPassingString);
  t.not(read, null, "read should not be null");
  t.is(read?.chipId, `${MyLapsPrefix}KV86583`, "chipId should be KV86583");
  t.is(read?.timingId, "Start", "timingId should be Start");
  t.is(read?.timingName, "Start", "timingName should be Start");
  t.is(read?.timestamp, "2025-03-08T16:13:57.417Z", "timestamp should be 2025-03-08T16:13:57.417Z");
});

test("Test function myLapsPassingToRead", (t) => {
  const read = myLapsPassingToRead("Start001", "Start", fixtures.passingString);
  t.not(read, null, "read should not be null");
  t.is(read?.chipId, `${MyLapsPrefix}0000041`, "chipId should be 0000041");
  t.is(read?.timingId, "Start001", "timingId should be Start001");
  t.is(read?.timingName, "Start", "timingName should be Start");
  t.is(read?.timestamp, "2012-06-06T13:11:30.904Z", "timestamp should be 2012-06-06T13:11:30.904Z");
});

test("Try to spin up an instance of the mylaps forwarder", async (t) => {
  if (await isPortInUse(LISTEN_PORT)) {
    t.log(`Port ${LISTEN_PORT} is already in use. We do not have to spin a server.`);
    t.pass();
  } else {
    state.forwarder = new MyLapsForwarder(RACEMAP_API_TOKEN, LISTEN_PORT);
    t.not(state.forwarder, null, "instance of MyLapsForwarder is not null");
  }
});

test(`should connect to tcp://${forwarderIPAddress}:${LISTEN_PORT}`, async (t) => {
  state.aTCPClient = await connectTcpSocket(forwarderIPAddress, LISTEN_PORT);
  t.not(state.aTCPClient, null, "tcp client should be not null but is");
  if (state.aTCPClient != null) {
    state.aTCPClient.sendFrame = (text: string) => {
      if (state.aTCPClient != null) {
        return state.aTCPClient.write(`${text}${CRLF}`);
      }
      return false;
    };

    state.aTCPClient.sendData = (data: Array<string>) => {
      const dataStr = data.join(MyLapsDataSeparator);
      if (state.aTCPClient != null) {
        return state.aTCPClient.sendFrame(`${dataStr}${MyLapsDataSeparator}`);
      }
      return false;
    };

    state.aTCPClient.on("connect", () => {
      t.log("Connected to the server");
    });

    state.aTCPClient.on("data", (data: Buffer) => {
      storeIncomingRawData(data, state.socketCache);
      processStoredData(state.socketCache, (message) => {
        if (state.aTCPClient == null) return;
        const messageStr = message.toString();
        state.fromServerMessages.push(messageStr);
        const parts = messageStr.split(MyLapsDataSeparator);
        const len = parts.length;
        if (len > 2) {
          const serverName = parts[0];
          const myLabsFunction = parts[1];

          switch (myLabsFunction) {
            case MyLapsFunctions.Pong: {
              t.log("Pong from server => AckPong");
              state.aTCPClient.sendData([fixtures.clientName, MyLapsFunctions.AckPong]);
              break;
            }

            case MyLapsFunctions.Ping: {
              t.log("Ping from server => AckPing");
              state.aTCPClient.sendData([fixtures.clientName, MyLapsFunctions.AckPing]);
              break;
            }

            case MyLapsFunctions.GetLocations: {
              t.log("GetLocations from server => GetLocations");
              const data = [fixtures.clientName, MyLapsFunctions.GetLocations];
              for (const source of fixtures.sources) {
                data.push(`${MyLapsIdentifiers.LocationParameters.LocationName}=${source.name}`);
              }
              state.aTCPClient?.sendData(data);
              break;
            }

            case MyLapsFunctions.GetInfo: {
              t.log("GetInfo from server => AckGetInfo");
              for (const source of fixtures.sources) {
                state.aTCPClient?.sendData([source.name, MyLapsFunctions.AckGetInfo, source.deviceName, "Unknown", source.computerName]);
              }
              break;
            }

            case MyLapsFunctions.AckPong: {
              t.log("AckPong from server. Nice.");
              break;
            }

            case MyLapsFunctions.AckPassing: {
              t.log("AckPassing from server. Nice.");
              break;
            }

            default: {
              console.warn(`MyLabsTestClient Unknown command from server. ${myLabsFunction}`);
              break;
            }
          }
        }
      });
    });
  }
});

test("should send the welcome message through the socket", async (t) => {
  t.not(state.aTCPClient, null, "tcp client is not null");
  if (state.aTCPClient != null) {
    t.true(state.aTCPClient.sendData([fixtures.clientName, MyLapsFunctions.Pong]), "it should be possible to write a welcome message to the socket");
    // give the server some time to answer!
    await sleep(500);
  }
});

test("the server should have responded with AckPong and GetLocations and GetInfo", async (t) => {
  t.log("server messages", state.fromServerMessages);

  t.not(state.fromServerMessages, null, "server messages should not be null");
  t.true(state.fromServerMessages.length > 0, "server messages should have some content");
  const ackPong = state.fromServerMessages.find((message) => message.includes(MyLapsFunctions.AckPong));
  const getLocations = state.fromServerMessages.find((message) => message.includes(MyLapsFunctions.GetLocations));
  const getInfo = state.fromServerMessages.find((message) => message.includes(MyLapsFunctions.GetInfo));

  t.not(ackPong, undefined, "server should have responded with AckPong");
  t.not(getLocations, undefined, "server should have responded with GetLocations");
  t.not(getInfo, undefined, "server should have responded with GetInfo");
});

test("it should be possible to send 3 passings for every source to the server", async (t) => {
  t.not(state.aTCPClient, null, "tcp client is not null");
  if (state.aTCPClient != null) {
    // for every source we define 3 passings
    for (const source of fixtures.sources) {
      const Attempt = Math.round(100 * Math.random()).toString();
      const passings = [source.name, MyLapsFunctions.Passing];
      for (let i = 0; i < 3; i++) {
        if (source.startTimeStamp != null) {
          const passing = [
            `${MyLapsIdentifiers.PassingParameters.Time}=${moment(source.startTimeStamp + i * OneSecondInMillis).format("HH:mm:ss.SSS")}`,
            `${MyLapsIdentifiers.PassingParameters.ChipCode}=${fixtures.trasnponderIds[i]}`,
            `${MyLapsIdentifiers.PassingParameters.ChipType}=UH`,
            `${MyLapsIdentifiers.PassingParameters.Date}=${moment(source.startTimeStamp + i * OneSecondInMillis).format("YYMMDD")}`,
            `${MyLapsIdentifiers.PassingParameters.LapNumber}=1`,
            `${MyLapsIdentifiers.PassingParameters.DeviceNumber}=4`,
            `${MyLapsIdentifiers.PassingParameters.ReaderNumber}=1`,
            `${MyLapsIdentifiers.PassingParameters.AntennaNumber}=00001101`,
            `${MyLapsIdentifiers.PassingParameters.GroupId}=0`,
            `${MyLapsIdentifiers.PassingParameters.BibNumber}=1`,
          ];
          passings.push(passing.join("|"));
        }
      }
      passings.push(Attempt);
      state.passingAttempts.push(Attempt);
      t.true(state.aTCPClient.sendData(passings), "it should be possible to write a passings message to the socket");
    }
    await sleep(500);
  }
});

test("the server should have responded with AckPassing for every passing", async (t) => {
  t.log("server messages", state.fromServerMessages);
  t.not(state.fromServerMessages, null, "server messages should not be null");
  t.true(state.fromServerMessages.length > 0, "server messages should have some content");
  const ackPassing = state.fromServerMessages.filter((message) => message.includes(MyLapsFunctions.AckPassing));
  t.is(ackPassing.length, state.passingAttempts.length, "server should have responded with AckPassing for every passing");
  for (const attempt of state.passingAttempts) {
    const ack = ackPassing.find((message) => message.includes(attempt));
    t.not(ack, undefined, `server should have responded with AckPassing for attempt ${attempt}`);
  }
});

test("should wait 20 seconds before kill", async (t) => {
  t.timeout(30000);
  t.log("Waiting 20 seconds before kill");
  await sleep(20000);
  t.pass();
});
