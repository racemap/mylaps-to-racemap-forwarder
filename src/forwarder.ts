import fs from "node:fs";
import net from "node:net";
import shortId from "shortid";
import APIClient from "./api-client";
import { ExtendedSocket, MessageParts, TimingRead } from "./types";
import { BaseClass } from "./base-class";
import { CRLF, MyLapsDataSeparator, MyLapsFunctions, MyLapsIdentifiers, RacemapMyLapsServerName } from "./consts";
import { error, info, log, processStoredData, storeIncomingRawData, success, warn } from "./functions";

const MAX_MESSAGE_DATA_DELAY_IN_MS = 500;

const logToFileSystem = (message: Buffer) => {
  fs.appendFileSync("./MyLapsInputAdapter.log", `${new Date().toISOString()} message: ${message}\n`);
};

const clearIntervalTimer = (timerHandle: NodeJS.Timeout | null) => {
  if (timerHandle != null) {
    clearInterval(timerHandle);
  }
};

class MyLapsForwarder extends BaseClass {
  _connections: Map<string, ExtendedSocket> = new Map();
  _server: net.Server;
  _apiToken: string;
  _apiClient: APIClient;

  constructor(apiToken: string, listenPort: number, justLocalHost = true) {
    super();

    this._apiToken = apiToken;
    this._apiClient = new APIClient({ "api-token": apiToken });
    this._server = this._configureReceiverSocket(listenPort, justLocalHost ? "127.0.0.1" : "0.0.0.0");
  }

  lastReveivedMessages = (socketId: string): Array<string> => {
    const socket = this._connections.get(socketId);
    if (socket != null) {
      return socket.lastReceivedMessages;
    }
    return [];
  };

  _configureReceiverSocket = (listenPort: number, bindAddress: string): net.Server => {
    const server = net.createServer(this._onNewConnection as (socket: net.Socket) => void);
    server.listen({ host: bindAddress, port: listenPort }, () => {
      info(`${this.className} is listening on \x1b[32m${bindAddress}\x1b[0m:\x1b[35m${listenPort}\x1b[0m`);
    });
    server.on("error", (err) => {
      error(`${this.className}._configureReceiverSocket`, err);
    });
    return server;
  };

  _onNewConnection = (socket: ExtendedSocket): void => {
    log(`${this.className}Socket.onNewConnection`);

    socket.id = shortId.generate();
    socket.userId = "";
    socket.openedAt = new Date();
    socket.identified = false;
    socket.cache = {
      lastTime: Date.now(),
      buffer: Buffer.alloc(0),
      name: `MyLapsInputAdapter.ClienttSocket[${socket.id}].cache`,
    };
    socket.keepAliveTimerHandle = null;
    socket.triggerStartTransmissionHandle = null;
    socket.lastReceivedMessages = [];

    this._connections.set(socket.id, socket); // The server knows its sockets

    // scope is socket
    socket.on("error", (error: Error) => {
      if (error != null) {
        log(`${this.className}Socket.onError: ${error} ${error.stack}`);
        clearIntervalTimer(socket.keepAliveTimerHandle);
        clearIntervalTimer(socket.triggerStartTransmissionHandle);
        this._connections.delete(socket.id);
      }
    });

    // Scope is MyLapsForwarder
    socket.on("end", () => {
      log(`${this.className}Socket.onEnd`);
      clearIntervalTimer(socket.keepAliveTimerHandle);
      clearIntervalTimer(socket.triggerStartTransmissionHandle);
      this._connections.delete(socket.id);
    });

    socket.on("data", (data: Buffer) => {
      try {
        storeIncomingRawData(data, socket.cache, MAX_MESSAGE_DATA_DELAY_IN_MS);
        processStoredData(socket.cache, (message) => {
          this._handleRawMessage(socket, message);
        });
      } catch (e) {
        warn(`${this.className}Socket.onData ParserError`, data, e);
      }
    });

    // Scope is Socket
    socket.sendFrame = function (text: String) {
      log(`Socket.sendFrame`, text);
      return socket.write(text + CRLF);
    };

    socket.sendData = function (data: Array<String>) {
      return socket.sendFrame(data.join(MyLapsDataSeparator) + MyLapsDataSeparator);
    };

    socket.sendObject = function (object: Record<string, string>) {
      for (const [key, value] of Object.entries(object)) {
        socket.sendFrame(`${key}=${value}`);
      }
    };

    socket.sendKeepAlivePing = function () {
      // old version says you should send Pong
      // version 2.1 says you should send Ping
      socket.sendData([RacemapMyLapsServerName, MyLapsFunctions.Ping]);
    };

    socket.keepAliveTimerHandle = setInterval(() => {
      socket.sendKeepAlivePing();
    }, 10000);
  };

  _handleRawMessage = (socket: ExtendedSocket, rawMessage: Buffer): void => {
    if (rawMessage != null) {
      try {
        logToFileSystem(rawMessage);
        log(`${this.className}._handleMessage.rawMessage: ${rawMessage}`);

        socket.lastReceivedMessages.push(rawMessage.toString());
        // limit the number of messages to 100
        if (socket.lastReceivedMessages.length > 100) {
          socket.lastReceivedMessages.shift();
        }

        const separated = rawMessage.toString().split(MyLapsDataSeparator);
        if (separated.length > 0) {
          if (!socket.identified) {
            this._handleWelcomeMessage(socket, separated);
          } else {
            this._handleMessages(socket, separated);
          }
        }
      } catch (e) {
        error(`${this.className}._handleMessage`, e);
      }
    }
  };

  _handleWelcomeMessage = (refToSocket: ExtendedSocket, parts: MessageParts): void => {
    // we assume a client version of 2.1
    if (parts.length === 3 && (parts[1] === MyLapsFunctions.Ping || parts[1] === MyLapsFunctions.Pong)) {
      refToSocket.identified = true;
      refToSocket.meta = {
        name: "",
        version: "v2.1",
        connectionId: undefined,
        sources: {},
        clientRespondedAt: new Date(),
      };

      refToSocket.sendData([RacemapMyLapsServerName, MyLapsFunctions.AckPong, "@Version2.1"]);
      refToSocket.sendData([RacemapMyLapsServerName, MyLapsFunctions.GetInfo]);
      refToSocket.sendData([RacemapMyLapsServerName, MyLapsFunctions.GetLocations]);
    } else {
      warn(`${this.className}._handleWelcomeMessage`, "Unknown welcome message.", parts);
    }
  };

  // When the incoming stream is:  Toolkit@GetLocations@ln=Start@ln=5K@ln=Finish@$
  // The parts are: [Toolkit, GetLocations, ln=Start, ln=5K, ln=Finish]
  _handleMessages = (refToSocket: ExtendedSocket, parts: MessageParts): void => {
    if (["v1.0", "v2.1"].includes(refToSocket.meta.version)) {
      const len = parts.length;
      if (len > 1) {
        const myLapsFunction = parts[1];
        switch (myLapsFunction) {
          case MyLapsFunctions.Pong: {
            const replied = refToSocket.sendData([RacemapMyLapsServerName, MyLapsFunctions.AckPong]);
            const locationName = parts[0];
            if (refToSocket.meta.sources[locationName] != null) {
              refToSocket.meta.sources[locationName].lastSeen = new Date();
            }
            info(`${this.className}._handleMessages Pong received from client and ${replied ? "answered" : "not answered"}.`);
            break;
          }

          // ALocationName@AckPong@$
          case MyLapsFunctions.AckPong: {
            const locationName = parts[0];
            if (refToSocket.meta.sources[locationName] != null) {
              refToSocket.meta.sources[locationName].lastSeen = new Date();
            }
            info(`${this.className}._handleMessages`, "AckPong received from client.");
            break;
          }

          case MyLapsFunctions.Ping: {
            const replied = refToSocket.sendData([RacemapMyLapsServerName, MyLapsFunctions.AckPing]);
            const locationName = parts[0];
            if (refToSocket.meta.sources[locationName] != null) {
              refToSocket.meta.sources[locationName].lastSeen = new Date();
            }
            info(`${this.className}._handleMessages Ping received from client and ${replied ? "answered" : "not answered"}.`);
            break;
          }

          // ALocationName@AckPing@$
          case MyLapsFunctions.AckPing: {
            const locationName = parts[0];
            if (refToSocket.meta.sources[locationName] != null) {
              refToSocket.meta.sources[locationName].lastSeen = new Date();
            }
            info(`${this.className}._handleMessages`, "AckPing received from client.");
            break;
          }

          case MyLapsFunctions.GetLocations: {
            refToSocket.meta.name = parts[0];
            for (let i = 2; i < len; i++) {
              const location = parts[i].split("=");
              if (location.length === 2 && location[0] === MyLapsIdentifiers.LocationParameters.LocationName) {
                const locationName = location[1];
                refToSocket.meta.sources[locationName] = {
                  name: locationName,
                  deviceName: "",
                  computerName: "",
                  lastSeen: null,
                };
              } else {
                warn(`${this.className}._handleMessages`, "Unknown location parameter", location);
              }
            }
            success(`${this.className}._handleMessages`, "Answer to GetLocations message received: ", Object.keys(refToSocket.meta.sources));
            break;
          }

          case MyLapsFunctions.AckGetInfo: {
            if (len > 4) {
              const locationName = parts[0];
              const deviceName = parts[2];
              const computerName = parts[4];
              refToSocket.meta.sources[locationName] = {
                name: locationName,
                deviceName,
                computerName,
                lastSeen: new Date(),
              };
              success(`${this.className}._handleMessages`, "AckGetInfo message received: ", locationName, deviceName, computerName);
            } else {
              warn(`${this.className}._handleMessages`, "AckGetInfo message with wrong part length received", parts.length, parts);
            }
            break;
          }

          // case of passings we get something like this from the server:
          // len:  1    2       3                                                                                4                                                                                5    6
          //       10KM@Passing@t=13:11:30.904|c=0000041|ct=UH|d=120606|l=13|dv=4|re=0|an=00001111|g=0|b=41|n=41@t=13:12:21.830|c=0000039|ct=UH|d=120606|l=30|dv=4|re=0|an=00001101|g=0|b=39|n=39@1016@$
          // and we have to return
          //       Test@AckPassing@1016@$
          case MyLapsFunctions.Passing: {
            const locationName = parts[0];
            if (len > 4) {
              const reads: Array<TimingRead> = [];
              const counter = Number.parseInt(parts[len - 2]);
              if (counter > 0) {
                for (let i = 2; i < len - 2; i++) {
                  const passingDetails = parts[i].split("|");

                  const read: TimingRead = {
                    timestamp: "",
                    chipId: "",
                    timingId: "",
                    timingName: locationName,
                  };

                  for (const detail of passingDetails) {
                    const [key, value] = detail.split("=");
                    if (key === MyLapsIdentifiers.PassingParameters.ChipCode) {
                      read.chipId = value;
                    }
                    if (key === MyLapsIdentifiers.PassingParameters.ReaderNumber) {
                      read.timingId = value;
                    }
                    if (key === MyLapsIdentifiers.PassingParameters.Time) {
                      read.timestamp = value;
                    }
                  }
                  reads.push(read);
                }
                refToSocket.sendData([RacemapMyLapsServerName, MyLapsFunctions.AckPassing, counter.toString()]);
              }
              if (reads.length > 0) {
                this._pushNonlocatedReadToRacemap(reads);
              }
            }

            if (refToSocket.meta.sources[locationName] != null) {
              refToSocket.meta.sources[locationName].lastSeen = new Date();
            }
            break;
          }

          default: {
            warn("Message with unknown MyLaps function received:", myLapsFunction, parts);
            break;
          }
        }
      }
    } else {
      warn(`${this.className} - We do not handle messages because protocol version is not in [v1.0, v2.1]`);
    }
  };

  async _pushNonlocatedReadToRacemap(TimingRead: Array<TimingRead>): Promise<void> {
    // log("tryToPushNonlocatedReadToRacemap", TimingRead);
    const response = await this._apiClient.sendTimingReadsAsJSON(TimingRead);
    if (response.status === 200) {
      success("tryToPushNonlocatedReadToRacemap", TimingRead);
    } else {
      warn("tryToPushNonlocatedReadToRacemap", response.status);
    }
  }
}

export default MyLapsForwarder;
