import moment from "moment";
import MyLapsForwarder from "../src/forwarder";
import { serial as test } from "ava";
import { shortIdBuilder } from "../src/functions";
import { TPredictionTestTimes, TTestFixtures, TTestState } from "../src/types";

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

const fixtures: TTestFixtures = {};

const state: TTestState = {
  forwarder: null,
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
