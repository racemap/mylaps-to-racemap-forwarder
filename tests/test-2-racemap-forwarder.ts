import moment from 'moment';
import APIClient from '../src/main/api-client';
import MyLapsForwarder from '../src/main/mylaps/forwarder';
import { serial as test } from 'ava';
import type { TTestState, TTestFixtures, TPredictionTestTimes } from '../src/types';
import { OneHourInMillis, OneSecondInMillis } from '../src/consts';
import { myLapsLagacyPassingToRead, myLapsPassingToRead } from '../src/main/mylaps/functions';
import { MyLapsFrameTerminator, MyLapsDataSeparator, MyLapsFunctions, MyLapsIdentifiers, MyLapsPrefix } from '../src/main/mylaps/consts';
import {
  sleep,
  isPortInUse,
  shortIdBuilder,
  connectTcpSocket,
  processStoredData,
  storeIncomingRawData,
  removeCertainBytesFromBuffer,
} from '../src/main/functions';

const RACEMAP_API_HOST = process.env.RACEMAP_API_HOST ?? 'https://racemap.com';
const RACEMAP_API_TOKEN = process.env.RACEMAP_API_TOKEN ?? '';
const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? 'private';
const LISTEN_PORT = Number.parseInt(process.env.LISTEN_PORT || '3097');

const apiClient = new APIClient({ authorization: `Bearer ${RACEMAP_API_TOKEN}` });
const forwarderIPAddress = LISTEN_MODE === 'private' ? '127.0.0.1' : '0.0.0.0';

const shortId001 = shortIdBuilder();
const times: TPredictionTestTimes = {
  testStartTime: moment().utc().toDate(),
  testStartTimeMinus60Seconds: moment().utc().add(-60, 'seconds').toDate(),
  startTime: moment().utc().subtract(1, 'h').toISOString(),
  endTime: moment().utc().toISOString(),
};

const fixtures: TTestFixtures = {
  myLaps: {
    id: shortId001,
    clientName: 'RMMyLabsTestClient',
    trasnponderIds: ['0000041', '0000042', '0000043'],
    myLapsLocations: [
      {
        name: 'Start',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_0`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((0 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '1k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_1`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((1 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '2k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_2`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((2 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '3k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_3`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((3 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '5k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_4`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((4 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '8k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_5`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((5 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: '9k',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_6`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((6 * OneHourInMillis) / 7),
        devicesByName: {},
      },
      {
        name: 'Finish',
        locationName: `Dev_${shortIdBuilder()}`,
        computerName: `computer_${shortIdBuilder()}`,
        mac: `${shortId001}_7`,
        startTimeStamp: new Date(times.startTime).valueOf() + Math.floor((7 * OneHourInMillis) / 7),
        devicesByName: {},
      },
    ],
    passingString: 't=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41',
    legacyPassingString: 'KV8658316:13:57.417 3 0F  1000025030870',
  },
  chronoTrack: {
    event: {
      id: shortId001,
      name: `Testevent for ChronoTrack Test (${shortId001})`,
      description: `Just to test the data import. (${shortId001})`,
      locations: [
        { name: 'Start', mac: `${shortId001}_0` },
        { name: '1k', mac: `${shortId001}_1` },
        { name: '2k', mac: `${shortId001}_2` },
        { name: '3k', mac: `${shortId001}_3` },
        { name: '5k', mac: `${shortId001}_4` },
        { name: '8k', mac: `${shortId001}_5` },
        { name: '9k', mac: `${shortId001}_6` },
        { name: 'Finish', mac: `${shortId001}_7` },
      ],
    },
    newLocationName: 'OnBridge',
    connectionId: `g4vnkHCHU8SbsDMF${shortId001}`,
    transponderId: shortId001,
    timingMacs: [],
  },
};

const state: TTestState = {
  myLaps: {
    aTCPClient: null,
    forwarder: null,
    fromServiceMessages: [],
    socketCache: {
      lastTime: 0,
      buffer: Buffer.alloc(0),
    },
    passingAttempts: [],
  },
  chronoTrack: {
    aTCPClient: null,
    forwarder: null,
    fromServiceMessages: [],
    socketCache: {
      lastTime: 0,
      buffer: Buffer.alloc(0),
    },
  },
};

test('Ava is running, fixtures and state exists', async (t) => {
  t.is(true, true);
  t.not(fixtures, null);
  t.not(state, null);
});

test('Test function removeCertainBytesFromBuffer', (t) => {
  const raw = Buffer.from([0x00, 0x00, 0x32, 0x33, 0x00, 0x34]);
  const filtered = removeCertainBytesFromBuffer([0x00], raw);
  t.deepEqual(filtered, Buffer.from([0x32, 0x33, 0x34]), 'should remove 0x00 bytes (0x00, 0x31, 0x00, 0x32) => (0x31, 0x32)');

  const raw2 = Buffer.from([0x0a, 0x0a, 0x32, 0x33, 0x0a, 0x34]);
  const filtered2 = removeCertainBytesFromBuffer([0x0a], raw2);
  t.deepEqual(filtered2, Buffer.from([0x32, 0x33, 0x34]), 'should remove 0x0a bytes (0x0a, 0x31, 0x0a, 0x32) => (0x31, 0x32)');

  const raw3 = Buffer.from([0x0d, 0x0d, 0x32, 0x33, 0x0d, 0x34]);
  const filtered3 = removeCertainBytesFromBuffer([0x0d], raw3);
  t.deepEqual(filtered3, Buffer.from([0x32, 0x33, 0x34]), 'should remove 0x0d bytes (0x0d, 0x31, 0x0d, 0x32) => (0x31, 0x32)');

  const raw4 = Buffer.from([0x00, 0x0a, 0x32, 0x33, 0x0d, 0x34]);
  const filtered4 = removeCertainBytesFromBuffer([0x00, 0x0a, 0x0d], raw4);
  t.deepEqual(
    filtered4,
    Buffer.from([0x32, 0x33, 0x34]),
    'should remove 0x00 and 0x0a and 0x0d bytes (0x00, 0x0a, 0x31, 0x0d, 0x32) => (0x31, 0x32)',
  );
});

test('Test function myLapsLagacyPassingToRead', (t) => {
  const read = myLapsLagacyPassingToRead('Start', fixtures.myLaps.legacyPassingString);

  t.not(read, null, 'read should not be null');
  t.is(read?.chipId, `${MyLapsPrefix}KV86583`, 'chipId should be KV86583');
  t.is(read?.timingId, 'Start', 'timingId should be Start');
  t.is(read?.timingName, 'Start', 'timingName should be Start');
  t.is(read?.timestamp, '2025-03-08T16:13:57.417Z', 'timestamp should be 2025-03-08T16:13:57.417Z');
});

test('Test function myLapsPassingToRead', (t) => {
  const read = myLapsPassingToRead('Start001', 'Start', fixtures.myLaps.passingString);
  t.not(read, null, 'read should not be null');
  t.is(read?.chipId, `${MyLapsPrefix}0000041`, 'chipId should be 0000041');
  t.is(read?.timingId, 'Start001', 'timingId should be Start001');
  t.is(read?.timingName, 'Start', 'timingName should be Start');
  t.is(read?.timestamp, '2012-06-06T13:11:30.904Z', 'timestamp should be 2012-06-06T13:11:30.904Z');
});

test('Try to spin up an instance of the mylaps forwarder', async (t) => {
  if (await isPortInUse(LISTEN_PORT)) {
    t.log(`Port ${LISTEN_PORT} is already in use. We do not have to spin a server.`);
    t.pass();
  } else {
    state.myLaps.forwarder = new MyLapsForwarder(apiClient, LISTEN_PORT);
    t.not(state.myLaps.forwarder, null, 'instance of MyLapsForwarder is not null');
  }
});

test(`should connect to tcp://${forwarderIPAddress}:${LISTEN_PORT}`, async (t) => {
  state.myLaps.aTCPClient = await connectTcpSocket(forwarderIPAddress, LISTEN_PORT);
  t.not(state.myLaps.aTCPClient, null, 'tcp client should be not null but is');
  if (state.myLaps.aTCPClient != null) {
    state.myLaps.aTCPClient.sendFrame = (text: string) => {
      if (state.myLaps.aTCPClient != null) {
        return state.myLaps.aTCPClient.write(`${text}${MyLapsFrameTerminator}`);
      }
      return false;
    };

    state.myLaps.aTCPClient.sendData = (data: Array<string>) => {
      const dataStr = data.join(MyLapsDataSeparator);
      if (state.myLaps.aTCPClient != null) {
        return state.myLaps.aTCPClient.sendFrame(`${dataStr}${MyLapsDataSeparator}`);
      }
      return false;
    };

    state.myLaps.aTCPClient.on('connect', () => {
      t.log('Connected to the server');
    });

    state.myLaps.aTCPClient.on('data', (data: Buffer) => {
      storeIncomingRawData(data, state.myLaps.socketCache);
      processStoredData(
        state.myLaps.socketCache,
        (message) => {
          if (state.myLaps.aTCPClient == null) return;
          const messageStr = message.toString();
          state.myLaps.fromServiceMessages.push(messageStr);
          const parts = messageStr.split(MyLapsDataSeparator);
          const len = parts.length;
          if (len > 2) {
            const serverName = parts[0];
            const myLabsFunction = parts[1];

            switch (myLabsFunction) {
              case MyLapsFunctions.Pong: {
                t.log('Pong from server => AckPong');
                state.myLaps.aTCPClient.sendData([fixtures.myLaps.clientName, MyLapsFunctions.AckPong]);
                break;
              }

              case MyLapsFunctions.Ping: {
                t.log('Ping from server => AckPing');
                state.myLaps.aTCPClient.sendData([fixtures.myLaps.clientName, MyLapsFunctions.AckPing]);
                break;
              }

              case MyLapsFunctions.GetLocations: {
                t.log('GetLocations from server => GetLocations');
                const data = [fixtures.myLaps.clientName, MyLapsFunctions.GetLocations];
                for (const location of fixtures.myLaps.myLapsLocations) {
                  data.push(`${MyLapsIdentifiers.LocationParameters.LocationName}=${location.name}`);
                }
                state.myLaps.aTCPClient?.sendData(data);
                break;
              }

              case MyLapsFunctions.GetInfo: {
                t.log('GetInfo from server => AckGetInfo');
                // if it request an explicit location we only answer for this
                for (const location of fixtures.myLaps.myLapsLocations) {
                  state.myLaps.aTCPClient?.sendData([
                    location.name,
                    MyLapsFunctions.AckGetInfo,
                    location.locationName ?? '',
                    'Unknown',
                    location.computerName,
                  ]);
                }
                break;
              }

              case MyLapsFunctions.AckPong: {
                t.log('AckPong from server. Nice.');
                break;
              }

              case MyLapsFunctions.AckPassing: {
                t.log('AckPassing from server. Nice.');
                break;
              }

              case MyLapsFunctions.AckMarker: {
                t.log('AckMarker from server. Nice.');
                break;
              }

              default: {
                console.warn(`MyLabsTestClient Unknown command from server. ${myLabsFunction}`);
                break;
              }
            }
          }
        },
        MyLapsFrameTerminator,
      );
    });
  }
});

test('should send the welcome message through the socket', async (t) => {
  t.not(state.myLaps.aTCPClient, null, 'tcp client is not null');
  if (state.myLaps.aTCPClient != null) {
    t.true(
      state.myLaps.aTCPClient.sendData([fixtures.myLaps.clientName, MyLapsFunctions.Pong]),
      'it should be possible to write a welcome message to the socket',
    );
    // give the server some time to answer!
    await sleep(500);
  }
});

test('the server should have responded with AckPong and GetLocations and GetInfo', async (t) => {
  t.log('server messages', state.myLaps.fromServiceMessages);

  t.not(state.myLaps.fromServiceMessages, null, 'server messages should not be null');
  t.true(state.myLaps.fromServiceMessages.length > 0, 'server messages should have some content');
  const ackPong = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.AckPong));
  const getLocations = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.GetLocations));
  const getInfo = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.GetInfo));

  t.not(ackPong, undefined, 'server should have responded with AckPong');
  t.not(getLocations, undefined, 'server should have responded with GetLocations');
  t.not(getInfo, undefined, 'server should have responded with GetInfo');
});

test('it should be possible to send 3 passings for every location to the server', async (t) => {
  t.not(state.myLaps.aTCPClient, null, 'tcp client is not null');
  if (state.myLaps.aTCPClient != null) {
    // for every location we define 3 passings
    for (const location of fixtures.myLaps.myLapsLocations) {
      const Attempt = Math.round(100 * Math.random()).toString();
      const passings = [location.name, MyLapsFunctions.Passing];
      for (let i = 0; i < 3; i++) {
        if (location.startTimeStamp != null) {
          const passing = [
            `${MyLapsIdentifiers.PassingParameters.Time}=${moment(location.startTimeStamp + i * OneSecondInMillis).format('HH:mm:ss.SSS')}`,
            `${MyLapsIdentifiers.PassingParameters.ChipCode}=${fixtures.myLaps.trasnponderIds[i]}`,
            `${MyLapsIdentifiers.PassingParameters.ChipType}=UH`,
            `${MyLapsIdentifiers.PassingParameters.Date}=${moment(location.startTimeStamp + i * OneSecondInMillis).format('YYMMDD')}`,
            `${MyLapsIdentifiers.PassingParameters.LapNumber}=1`,
            `${MyLapsIdentifiers.PassingParameters.DeviceNumber}=4`,
            `${MyLapsIdentifiers.PassingParameters.ReaderNumber}=1`,
            `${MyLapsIdentifiers.PassingParameters.AntennaNumber}=00001101`,
            `${MyLapsIdentifiers.PassingParameters.GroupId}=0`,
            `${MyLapsIdentifiers.PassingParameters.BibNumber}=1`,
          ];
          passings.push(passing.join('|'));
        }
      }
      passings.push(Attempt);
      state.myLaps.passingAttempts.push(Attempt);
      t.true(state.myLaps.aTCPClient.sendData(passings), 'it should be possible to write a passings message to the socket');
    }
    await sleep(500);
  }
});

test('the server should have responded with AckPassing for every passing', async (t) => {
  t.not(state.myLaps.fromServiceMessages, null, 'server messages should not be null');
  t.true(state.myLaps.fromServiceMessages.length > 0, 'server messages should have some content');
  const ackPassing = state.myLaps.fromServiceMessages.filter((message) => message.includes(MyLapsFunctions.AckPassing));
  t.is(ackPassing.length, state.myLaps.passingAttempts.length, 'server should have responded with AckPassing for every passing');
  for (const attempt of state.myLaps.passingAttempts) {
    const ack = ackPassing.find((message) => message.includes(attempt));
    t.not(ack, undefined, `server should have responded with AckPassing for attempt ${attempt}`);
  }
});

test('it should be possibel to send 3 markers to the server', async (t) => {
  t.not(state.myLaps.aTCPClient, null, 'tcp client is not null');
  if (state.myLaps.aTCPClient != null) {
    const attempt = Math.round(100 * Math.random()).toString();
    const marker = [
      fixtures.myLaps.myLapsLocations[0].name,
      MyLapsFunctions.Marker,
      [
        `${MyLapsIdentifiers.MarkerParameters.Time}=11:03:40.347`,
        `${MyLapsIdentifiers.MarkerParameters.Type}=Gunshot`,
        `${MyLapsIdentifiers.MarkerParameters.Name}=Gunshot 1`,
      ].join('|'),
      [
        `${MyLapsIdentifiers.MarkerParameters.Time}=11:03:41.327`,
        `${MyLapsIdentifiers.MarkerParameters.Type}=Gunshot`,
        `${MyLapsIdentifiers.MarkerParameters.Name}=Gunshot 2`,
      ].join('|'),
      [
        `${MyLapsIdentifiers.MarkerParameters.Time}=11:03:42.141`,
        `${MyLapsIdentifiers.MarkerParameters.Type}=Gunshot`,
        `${MyLapsIdentifiers.MarkerParameters.Name}=Gunshot 3`,
      ].join('|'),
      attempt,
    ];
    t.true(state.myLaps.aTCPClient.sendData(marker), 'it should be possible to write a marker message to the socket');
    await sleep(500);
  }
});

test('the server should have responded with AckMarker for the last marker telegram', async (t) => {
  t.log('server messages', state.myLaps.fromServiceMessages);
  t.not(state.myLaps.fromServiceMessages, null, 'server messages should not be null');
  t.true(state.myLaps.fromServiceMessages.length > 0, 'server messages should have some content');
  const ackMarker = state.myLaps.fromServiceMessages.find((message) => message.includes(MyLapsFunctions.AckMarker));
  t.not(ackMarker, undefined, 'server should have responded with AckMarker');
});

test('should wait 20 seconds before kill', async (t) => {
  t.timeout(30000);
  t.log('Waiting 20 seconds before kill');
  await sleep(20000);
  t.pass();
});
