import test from "node:test";
import assert from "node:assert/strict";
import {
  BATTERY_MODE_IDS,
  NETWORK_IDS,
  batteryLook,
  canForward,
  forwardButton,
  forwardedLabel,
  signalBars,
  withNetwork,
  addDays,
  avatarSrc,
  colorAvatar,
  dateAllowed,
  dateBounds,
  dateLabel,
  displayTime,
  nextMessageTime,
  parseMessageTime,
  suggestDate,
  timeBounds,
  activeScene,
  batteryFill,
  buildTimeline,
  callSummary,
  defaultPhoneSettings,
  formatCallDuration,
  formatClock,
  formatClockDuration,
  isGroupStart,
  isSelf,
  messageType,
  normalizeCall,
  parseBattery,
  parseClock,
  parseDuration,
  parseScene,
  parseTime,
  recordingFrame,
  soundFor,
  waveformBars,
  withPreset,
} from "../src/model.js";

test("clock edges 00:00 and 23:59 use 24-hour HH:mm", () => {
  assert.deepEqual(parseClock("0", "0"), { ok: true, hour: 0, minute: 0 });
  assert.equal(formatClock(0, 0), "00:00");
  assert.deepEqual(parseClock("23", "59"), { ok: true, hour: 23, minute: 59 });
  assert.equal(formatClock(23, 59), "23:59");
});

test("invalid clock values are rejected with field errors", () => {
  assert.ok(parseClock("24", "00").errors.hour);
  assert.ok(parseClock("12", "60").errors.minute);
  assert.ok(parseClock("", "5").errors.hour);
  assert.ok(parseClock("1.5", "5").errors.hour);
  assert.ok(parseClock("-1", "5").errors.hour);
});

test("battery accepts whole numbers 0–100 and fills proportionally", () => {
  for (const level of [0, 1, 58, 59, 100]) {
    assert.deepEqual(parseBattery(String(level)), { ok: true, value: level });
    assert.equal(batteryFill(level), level / 100);
  }
  for (const bad of ["101", "-1", "58.5", "", "abc"]) {
    assert.equal(parseBattery(bad).ok, false, bad);
  }
});

test("switching presets keeps clock, battery and status settings", () => {
  const start = { ...defaultPhoneSettings(new Date(2026, 0, 1, 23, 59)), battery: 1, showContactStatus: false };
  const poco = withPreset(start, "pocox7");
  assert.equal(poco.preset, "pocox7");
  assert.deepEqual({ ...poco, preset: start.preset }, start);
  const back = withPreset(poco, "pixel8pro");
  assert.deepEqual(back, start);
  assert.equal(withPreset(start, "unknown"), start);
});

test("legacy messages without type still render as text or image", () => {
  assert.equal(messageType({ text: "hi", self: true }), "text");
  assert.equal(messageType({ text: "", image: { src: "x" } }), "image");
  assert.equal(messageType({ type: "voice" }), "voice");
  assert.equal(messageType({ type: "bogus", text: "x" }), "text");
});

test("call labels follow direction and result (Indonesian WhatsApp wording)", () => {
  const s = (media, direction, result, durationSec = 0) =>
    callSummary({ media, direction, result, durationSec });
  assert.deepEqual(s("voice", "outgoing", "answered", 13), { title: "Telepon suara", detail: "13 dtk", missed: false });
  assert.deepEqual(s("video", "incoming", "answered", 65), { title: "Panggilan video", detail: "1 mnt 5 dtk", missed: false });
  assert.deepEqual(s("voice", "incoming", "missed"), { title: "Telepon suara tak terjawab", detail: "Ketuk untuk menelepon balik", missed: true });
  assert.deepEqual(s("video", "incoming", "cancelled"), { title: "Panggilan video tak terjawab", detail: "Ketuk untuk menelepon balik", missed: true });
  // Unanswered outgoing calls are never shown as missed.
  assert.deepEqual(s("voice", "outgoing", "missed"), { title: "Telepon suara", detail: "Tidak dijawab", missed: false });
  assert.deepEqual(s("video", "outgoing", "cancelled"), { title: "Panggilan video", detail: "Dibatalkan", missed: false });
});

test("unanswered calls carry no duration", () => {
  assert.equal(normalizeCall({ media: "voice", direction: "outgoing", result: "missed", durationSec: 300 }).durationSec, 0);
  assert.equal(normalizeCall({ media: "video", direction: "incoming", result: "answered", durationSec: 0 }).durationSec, 1);
});

test("natural call durations", () => {
  assert.equal(formatCallDuration(5), "5 dtk");
  assert.equal(formatCallDuration(60), "1 mnt");
  assert.equal(formatCallDuration(200), "3 mnt 20 dtk");
  assert.equal(formatCallDuration(3900), "1 jam 5 mnt");
  assert.equal(formatCallDuration(7200), "2 jam");
});

test("call side comes from direction, and calls break bubble groups", () => {
  const list = [
    { type: "text", text: "a", self: true },
    { type: "call", call: { direction: "outgoing" } },
    { type: "text", text: "b", self: true },
    { type: "text", text: "c", self: true },
    { type: "call", call: { direction: "incoming" } },
  ];
  assert.equal(isSelf(list[1]), true);
  assert.equal(isSelf(list[4]), false);
  assert.deepEqual(list.map((_, i) => isGroupStart(list, i)), [true, true, true, false, true]);
  assert.equal(soundFor(list[1]), null);
  assert.equal(soundFor(list[0]), "send");
  assert.equal(soundFor({ type: "voice", self: false }), "receive");
});

test("voice-note durations and scene lengths are validated separately", () => {
  assert.deepEqual(parseDuration("0", "13"), { ok: true, seconds: 13 });
  assert.deepEqual(parseDuration("12", "05"), { ok: true, seconds: 725 });
  assert.equal(parseDuration("0", "0").ok, false);
  assert.equal(parseDuration("1", "60").ok, false);
  assert.equal(formatClockDuration(4), "0:04");
  assert.equal(formatClockDuration(725), "12:05");
  assert.equal(formatClockDuration(3725), "1:02:05");
  assert.deepEqual(parseScene("3"), { ok: true, value: 3 });
  assert.equal(parseScene("0").ok, false);
  assert.equal(parseScene("16").ok, false);
  assert.deepEqual(parseTime("9.05"), { ok: true, value: "09:05" });
  assert.equal(parseTime("24:00").ok, false);
});

test("waveforms are stable for the same message", () => {
  const a = waveformBars("msg-1", 36);
  assert.deepEqual(a, waveformBars("msg-1", 36));
  assert.notDeepEqual(a, waveformBars("msg-2", 36));
  assert.ok(a.every((h) => h >= 0.15 && h <= 1));
});

test("recording frames depend only on scene progress", () => {
  assert.deepEqual(recordingFrame(0, 600, 40), { elapsedSec: 0, visibleBars: 1 });
  assert.deepEqual(recordingFrame(0.5, 600, 40), { elapsedSec: 300, visibleBars: 20 });
  assert.deepEqual(recordingFrame(1, 600, 40), { elapsedSec: 600, visibleBars: 40 });
});

test("timeline: a long voice note only adds its short scene", () => {
  const messages = [
    { type: "text", text: "hi", self: true },
    { type: "voice", self: false, msgId: "v", voice: { durationSec: 1800, sceneSec: 3 } },
    { type: "call", call: { direction: "incoming", result: "missed" } },
  ];
  const tl = buildTimeline(messages, { leadIn: 1, gap: 2, tail: 2.5 });
  assert.deepEqual(tl.items.map((i) => i.appear), [1, 6, 8]);
  assert.equal(tl.items[1].sceneStart, 3);
  assert.equal(tl.duration, 10.5);
  assert.equal(activeScene(tl, messages, 2.9), null);
  const mid = activeScene(tl, messages, 4.5);
  assert.equal(mid.index, 1);
  assert.equal(mid.progress, 0.5);
  assert.equal(activeScene(tl, messages, 6), null);
  // Legacy single text message keeps the old 3.5 s video length.
  assert.equal(buildTimeline([{ text: "x" }]).duration, 3.5);
});

/* ---------- Message times ---------- */

const t = (time, extra = {}) => ({ type: "text", text: "x", self: true, time, ...extra });
const day = (date) => ({ type: "date", date });

test("message times display with a dot like Indonesian WhatsApp", () => {
  assert.equal(displayTime("16:01"), "16.01");
  assert.equal(displayTime("00:00"), "00.00");
});

test("time bounds come from the previous and next message, equal times allowed", () => {
  const list = [t("09:00"), t("09:30"), t("10:00")];
  assert.deepEqual(timeBounds(list, 1), { min: "09:00", max: "10:00" });
  assert.deepEqual(timeBounds(list, 0), { min: null, max: "09:30" });
  assert.deepEqual(timeBounds(list, 2), { min: "09:30", max: null });
  assert.deepEqual(parseMessageTime("9", "0", timeBounds(list, 1)), { ok: true, value: "09:00" });
  assert.deepEqual(parseMessageTime("10", "00", timeBounds(list, 1)), { ok: true, value: "10:00" });
  assert.equal(parseMessageTime("08", "59", timeBounds(list, 1)).ok, false);
  assert.match(parseMessageTime("10", "01", timeBounds(list, 1)).error, /09:00 to 10:00/);
  assert.equal(parseMessageTime("24", "00", { min: null, max: null }).ok, false);
});

test("a date divider starts a new day for time bounds", () => {
  const list = [t("23:50"), day("2026-11-23"), t("07:00"), t("08:00")];
  assert.deepEqual(timeBounds(list, 2), { min: null, max: "08:00" });
  assert.deepEqual(timeBounds(list, 0), { min: null, max: null });
  assert.equal(parseMessageTime("01", "00", timeBounds(list, 2)).ok, true);
});

test("new messages never go before the last message of the day", () => {
  assert.equal(nextMessageTime([t("15:00")], "14:00"), "15:00");
  assert.equal(nextMessageTime([t("15:00")], "16:00"), "16:00");
  assert.equal(nextMessageTime([t("23:00"), day("2026-11-23")], "08:00"), "08:00");
  assert.equal(nextMessageTime([], "08:00"), "08:00");
});

/* ---------- Dates ---------- */

test("date labels: Hari ini, Kemarin, weekday, full date", () => {
  const today = "2026-11-23"; // Monday
  assert.equal(dateLabel("2026-11-23", today), "Hari ini");
  assert.equal(dateLabel("2026-11-22", today), "Kemarin");
  assert.equal(dateLabel("2026-11-20", today), "Jumat");
  assert.equal(dateLabel("2026-11-17", today), "Selasa");
  assert.equal(dateLabel("2026-11-16", today), "16 November 2026");
  assert.equal(dateLabel("2025-01-01", today), "1 Januari 2025");
  assert.equal(dateLabel("2026-12-01", today), "1 Desember 2026");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("date dividers stay in order", () => {
  const list = [t("09:00"), day("2026-11-20"), t("10:00"), day("2026-11-23"), t("11:00")];
  const chatDate = "2026-11-18";
  assert.deepEqual(dateBounds(list, -1, chatDate), { min: null, max: "2026-11-19" });
  assert.deepEqual(dateBounds(list, 1, chatDate), { min: "2026-11-19", max: "2026-11-22" });
  assert.deepEqual(dateBounds(list, 3, chatDate), { min: "2026-11-21", max: null });
  // A new divider at the end comes after the last one.
  assert.deepEqual(dateBounds(list, list.length, chatDate), { min: "2026-11-24", max: null });
  // Inserting above the message at index 2.
  assert.deepEqual(dateBounds(list, 2, chatDate), { min: "2026-11-21", max: "2026-11-22" });
  assert.equal(dateAllowed("2026-11-20", { min: "2026-11-21", max: null }), false);
  assert.equal(dateAllowed("2026-02-30", { min: null, max: null }), false);
  assert.equal(suggestDate({ min: null, max: null }, "2026-11-23"), "2026-11-23");
  assert.equal(suggestDate({ min: "2026-11-24", max: null }, "2026-11-23"), "2026-11-24");
});

test("date dividers are silent, break groups and appear with the next message", () => {
  const list = [t("09:00"), day("2026-11-23"), t("10:00"), day("2026-11-24")];
  assert.equal(soundFor(list[1]), null);
  assert.deepEqual(list.map((_, i) => isGroupStart(list, i)), [true, true, true, true]);
  const tl = buildTimeline(list, { leadIn: 1, gap: 2, tail: 2.5 });
  assert.deepEqual(tl.items.map((i) => i.appear), [1, 3, 3, 5]);
  assert.equal(tl.duration, 7.5);
  // Dividers add no time between messages.
  assert.equal(buildTimeline([t("1"), day("2026-01-01"), t("2")]).duration, buildTimeline([t("1"), t("2")]).duration);
});

/* ---------- Avatars ---------- */

test("avatar defaults to gray and supports colors and photos", () => {
  assert.equal(avatarSrc(undefined), colorAvatar("gray"));
  assert.match(decodeURIComponent(colorAvatar("gray")), /#6a7175/);
  assert.match(decodeURIComponent(avatarSrc({ color: "blue" })), /#0e2f44/);
  assert.equal(avatarSrc({ photo: "data:image/jpeg;base64,AAA" }), "data:image/jpeg;base64,AAA");
  assert.equal(avatarSrc({ color: "nope" }), colorAvatar("gray"));
});

/* ---------- Battery state, network, forwarded ---------- */

test("battery look: white by default, red below 20%, charging always green", () => {
  assert.deepEqual(BATTERY_MODE_IDS, ["normal", "charging", "low"]);
  assert.equal(batteryLook(58), "normal");
  assert.equal(batteryLook(20, "normal"), "normal");
  assert.equal(batteryLook(19, "normal"), "low");
  assert.equal(batteryLook(0, "normal"), "low");
  assert.equal(batteryLook(5, "charging"), "charging");
  assert.equal(batteryLook(100, "charging"), "charging");
  assert.equal(batteryLook(90, "low"), "low");
  assert.equal(batteryLook(90, "unknown"), "normal");
});

test("network settings: Wi-Fi/LTE/5G and 1–4 bars, unknown values fall back", () => {
  assert.deepEqual(NETWORK_IDS, ["wifi", "lte", "5g"]);
  const base = defaultPhoneSettings(new Date(2026, 0, 1, 9, 30));
  assert.equal(base.network, "wifi");
  assert.equal(base.signal, 4);
  assert.equal(base.batteryMode, "normal");
  assert.equal(base.headerCalls, "both");
  assert.deepEqual([1, 2, 3, 4].map(signalBars), [1, 2, 3, 4]);
  assert.equal(signalBars(0), 4);
  assert.equal(signalBars(5), 4);
  assert.equal(signalBars("3"), 3);
  const lte = withNetwork(base, { network: "lte", signal: 2 });
  assert.equal(lte.network, "lte");
  assert.equal(lte.signal, 2);
  assert.equal(lte.hour, 9);
  const bad = withNetwork(lte, { network: "3g" });
  assert.equal(bad.network, "lte");
  assert.equal(bad.signal, 2);
});

test("forwarded label only on text, photo and voice; button only on photos", () => {
  const text = { msgId: "a", text: "hai", forwarded: true, forwardButton: true };
  const photo = { msgId: "b", image: { src: "x", width: 1, height: 1 }, forwarded: true, forwardButton: true };
  const voice = { msgId: "c", type: "voice", voice: { durationSec: 3 }, forwarded: true, forwardButton: true };
  const call = { msgId: "d", type: "call", call: { media: "voice" }, forwarded: true };
  const date = { msgId: "e", type: "date", date: "2026-11-23", forwarded: true };
  assert.deepEqual([text, photo, voice, call, date].map(canForward), [true, true, true, false, false]);
  assert.deepEqual([text, photo, voice, call, date].map(forwardedLabel), [true, true, true, false, false]);
  assert.deepEqual([text, photo, voice, call, date].map(forwardButton), [false, true, false, false, false]);
  assert.equal(forwardedLabel({ text: "lama" }), false);
});
