import test from "node:test";
import assert from "node:assert/strict";
import {
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

test("call labels follow direction and result", () => {
  const s = (media, direction, result, durationSec = 0) =>
    callSummary({ media, direction, result, durationSec });
  assert.deepEqual(s("voice", "outgoing", "answered", 65), { title: "Voice call", detail: "1 min 5 sec", missed: false });
  assert.deepEqual(s("video", "incoming", "answered", 45), { title: "Video call", detail: "45 sec", missed: false });
  assert.deepEqual(s("voice", "incoming", "missed"), { title: "Missed voice call", detail: "Tap to call back", missed: true });
  assert.deepEqual(s("video", "incoming", "cancelled"), { title: "Missed video call", detail: "Caller hung up", missed: true });
  // Unanswered outgoing calls are never shown as "missed".
  assert.deepEqual(s("voice", "outgoing", "missed"), { title: "Voice call", detail: "No answer", missed: false });
  assert.deepEqual(s("video", "outgoing", "cancelled"), { title: "Video call", detail: "Cancelled", missed: false });
});

test("unanswered calls carry no duration", () => {
  assert.equal(normalizeCall({ media: "voice", direction: "outgoing", result: "missed", durationSec: 300 }).durationSec, 0);
  assert.equal(normalizeCall({ media: "video", direction: "incoming", result: "answered", durationSec: 0 }).durationSec, 1);
});

test("natural call durations", () => {
  assert.equal(formatCallDuration(5), "5 sec");
  assert.equal(formatCallDuration(60), "1 min");
  assert.equal(formatCallDuration(200), "3 min 20 sec");
  assert.equal(formatCallDuration(3900), "1 hr 5 min");
  assert.equal(formatCallDuration(7200), "2 hr");
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
