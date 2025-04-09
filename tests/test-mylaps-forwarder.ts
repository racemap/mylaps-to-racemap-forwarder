import moment from "moment";
import MyLapsForwarder from "../src/forwarder";
import { serial as test } from "ava";
import { sleep, isPortInUse, shortIdBuilder, connectTcpSocket, processStoredData, storeIncomingRawData } from "../src/functions";
import { CRLF, MyLapsFunctions, MyLapsIdentifiers, MyLapsDataSeparator } from "../src/consts";
import type { TPredictionTestTimes, TTestFixtures, TTestState } from "../src/types";

const RACEMAP_API_HOST = process.env.RACEMAP_API_HOST ?? "https://racemap.com";
const RACEMAP_API_TOKEN = process.env.RACEMAP_API_TOKEN ?? "";
const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? "private";
const LISTEN_PORT = Number.parseInt(process.env.LISTEN_PORT || "3097");

const forwarderIPAddress = LISTEN_MODE === "private" ? "127.0.0.1" : "0.0.0.0";

const shortId001 = shortIdBuilder();
const times: TPredictionTestTimes = {
  testStartTime: moment().utc().toDate(),
  testStartTimeMinus60Seconds: moment().utc().add(-60, "seconds").toDate(),
  startTime: moment().utc().subtract(2, "h").toISOString(),
  endTime: moment().utc().toISOString(),
};

const fixtures: TTestFixtures = {
  id: shortId001,
  clientName: "RMMyLabsTestClient",
  sources: [
    {
      name: "Start",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_0`,
    },
    {
      name: "1k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_1`,
    },
    {
      name: "2k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_2`,
    },
    {
      name: "3k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_3`,
    },
    {
      name: "5k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_4`,
    },
    {
      name: "8k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_5`,
    },
    {
      name: "9k",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_6`,
    },
    {
      name: "Finish",
      deviceName: `Dev_${shortIdBuilder()}`,
      computerName: `computer_${shortIdBuilder()}`,
      mac: `${shortId001}_7`,
    },
  ],
};

const state: TTestState = {
  aTCPClient: null,
  forwarder: null,
  fromServerMessages: [],
  socketCache: {
    lastTime: 0,
    buffer: Buffer.alloc(0),
  },
};

test("Ava is running, fixtures and state exists", async (t) => {
  t.is(true, true);
  t.not(fixtures, null);
  t.not(state, null);
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
      console.log("Connected to the server");
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
              console.log("Pong from server => AckPong");
              state.aTCPClient.sendData([fixtures.clientName, MyLapsFunctions.AckPong]);
              break;
            }

            case MyLapsFunctions.Ping: {
              console.log("Ping from server => AckPing");
              state.aTCPClient.sendData([fixtures.clientName, MyLapsFunctions.AckPing]);
              break;
            }

            case MyLapsFunctions.GetLocations: {
              console.log("GetLocations from server => GetLocations");
              const data = [fixtures.clientName, MyLapsFunctions.GetLocations];
              for (const source of fixtures.sources) {
                data.push(`${MyLapsIdentifiers.LocationParameters.LocationName}=${source.name}`);
              }
              state.aTCPClient?.sendData(data);
              break;
            }

            case MyLapsFunctions.GetInfo: {
              console.log("GetInfo from server => AckGetInfo");
              for (const source of fixtures.sources) {
                state.aTCPClient?.sendData([source.name, MyLapsFunctions.AckGetInfo, source.deviceName, "Unknown", source.computerName]);
              }
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

test("it should be possible to send some passings to the server", async (t) => {});

test("should wait 20 seconds before kill", async (t) => {
  t.timeout(30000);
  t.log("Waiting 20 seconds before kill");
  await sleep(20000);
  t.pass();
});
