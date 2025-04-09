import moment from "moment";
import MyLapsForwarder from "../src/forwarder";
import { serial as test } from "ava";
import { connectTcpSocket, processStoredData, shortIdBuilder, sleep, storeIncomingRawData } from "../src/functions";
import { TPredictionTestTimes, TTestFixtures, TTestState } from "../src/types";
import { CRLF, MyLapsDataSeparator, MyLapsFunctions } from "../src/consts";

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
  serverMessages: [],
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
  state.forwarder = new MyLapsForwarder(RACEMAP_API_TOKEN, LISTEN_PORT);
  t.not(state.forwarder, null, "instance of MyLapsForwarder is not null");
});

test(`should connect to tcp://${forwarderIPAddress}:${LISTEN_PORT}`, async (t) => {
  state.aTCPClient = await connectTcpSocket(forwarderIPAddress, LISTEN_PORT);
  t.not(state.aTCPClient, null, "tcp client should be not null but is");
  if (state.aTCPClient != null) {
    state.aTCPClient.sendFrame = (text: String) => {
      state.aTCPClient?.write(`${text}${CRLF}`);
    };

    state.aTCPClient.sendData = (data: Array<String>) => {
      const dataStr = data.join(MyLapsDataSeparator);
      state.aTCPClient?.sendFrame(`${dataStr}${MyLapsDataSeparator}`);
    };

    state.aTCPClient.on("connect", () => {
      console.log("Connected to the server");
    });

    state.aTCPClient.on("data", (data: Buffer) => {
      storeIncomingRawData(data, state.socketCache);
      processStoredData(state.socketCache, (message) => {
        if (state.aTCPClient == null) return;
        const messageStr = message.toString();
        state.serverMessages.push(messageStr);
        const parts = messageStr.split(MyLapsDataSeparator);
        const len = parts.length;
        if (len > 2) {
          const myLabsFunction = parts[0];

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

            case MyLapsFunctions.GetInfo: {
              fixtures.sources.forEach((source) => {
                state.aTCPClient?.sendData([source.name, MyLapsFunctions.AckGetInfo, source.deviceName, "Unknown", source.computerName]);
              });
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
  t.log("server messages", state.serverMessages);

  t.not(state.serverMessages, null, "server messages should not be null");
  t.true(state.serverMessages.length > 0, "server messages should have some content");
  const ackPong = state.serverMessages.find((message) => message.includes(MyLapsFunctions.AckPong));
  const ackGetInfo = state.serverMessages.find((message) => message.includes(MyLapsFunctions.AckGetInfo));
  const getLocations = state.serverMessages.find((message) => message.includes(MyLapsFunctions.GetLocations));
  t.not(ackPong, undefined, "server should have responded with AckPong");
  t.not(getLocations, undefined, "server should have responded with GetLocations");
  t.not(ackGetInfo, undefined, "server should have responded with AckGetInfo");
});
