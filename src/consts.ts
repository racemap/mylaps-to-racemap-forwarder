export const MyLapsFunctions = {
  Pong: "Pong",
  Ping: "Ping",
  Store: "Store",
  AckPing: "AckPing",
  AckPong: "AckPong",
  GetInfo: "GetInfo",
  Passing: "Passing",
  AckPassing: "AckPassing",
  AckGetInfo: "AckGetInfo",
  GetLocations: "GetLocations",
};

export const MyLapsIdentifiers = {
  RaceInfoParameters: {
    RaceName: "rn", // Name of the race: Valley park Triathlon
    StartDate: "sd", // Start date of the race format: YYYY-MM-DD
  },
  MarkerParameters: {
    Type: "mt", // What type of marker this is: Gunshot
    Time: "t", // Time of the day where this marker occurs in hh:mm:ss.001: 11:03:40.347
    Name: "n", // Name of the marker: Gunshot 1
  },
  PassingParameters: {
    ChipCode: "c", // 7-character chip code: DX93845, 0000345, 4AYXRTF
    ChipType: "ct", // The type of chip this is: AP, LF, CX, UH, NOTCX, UNKNOWN
    Date: "d", // Date of passing in YYMMDD format: 120122
    LapNumber: "l", // Lap count: 0, 1, 2
    DeviceNumber: "dv", // Number of the device where this passing has been recorded: 0
    ReaderNumber: "re", // Number of the reader where this passing has been recorded: 1
    AntennaNumber: "an", // Antenna where this passing has been recorded: 1 (or BibTag: 00010000)
    GroupId: "g", // Group id of this passing (BibTag): 0, 2
    BibNumber: "b", // Bib number associated to the passing (BibTag): 1
    BibText: "n", // Bib text associated to the passing (BibTag): F-10145
    Time: "t", // Time of the day where this passing occurs in hh:mm:ss.001 format: 14:22:33.091
    UnixTime: "ut", // Time of the day of this passing in milliseconds (UNIX format): 18274599
    UtcTime: "utc", // Time of the day of this passing in milliseconds on UTC (UNIX format): 11273599
    HitCount: "h", // Number of detections (ProChip/BibTag): 10
    TimeSource: "ts", // Time source the device was using: GPS
    BatchId: "bid", // Batch id of this passing (BibTag): 23-33290
    Amplitude: "am", // Amplitude in points (ProChip/BibTag): 15
    AmplitudeDbm: "amd", // Amplitude in dBm (ProChip/BibTag): -101.15
    MacAddress: "dm", // MAC address of the device this passing has been recorded: 0030568F2CE
    StrongestAntenna: "ans", // Strongest antenna id (BibTag): 1
    AverageAntenna: "ana", // Average antenna (BibTag): 1.7
  },
  DeviceParameters: {},
  LocationParameters: {
    LocationName: "ln", // Name of the location as it is written in Timing & Scoring: Start, Finish, 5K
  },
};

export const RacemapMyLapsServerName = "RacemapMyLapsServer_v1.0.0";

export const CRLF = "$"; // special character to separate messages in MyLaps TCP IP protocol
export const MyLapsDataSeparator = "@"; // special character to separate data in MyLaps TCP IP protocol
