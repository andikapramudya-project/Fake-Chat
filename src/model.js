// Pure data helpers for messages, phone settings and the story timeline.
// No DOM or bundler imports here, so everything can be unit-tested with node.

/* ---------------- Phone presets ---------------- */

export const PRESETS = Object.freeze({
  pixel8pro: { id: "pixel8pro", label: "Pixel 8 Pro" },
  pocox7: { id: "pocox7", label: "Poco X7 5G" },
});
export const PRESET_IDS = Object.keys(PRESETS);
export const DEFAULT_PRESET = "pixel8pro";

export const pad2 = (n) => String(n).padStart(2, "0");

/** Status bar clock, always 24-hour HH:mm. */
export const formatClock = (hour, minute) => `${pad2(hour)}:${pad2(minute)}`;

const WHOLE = /^\s*\d+\s*$/;
const readWhole = (value) => (WHOLE.test(String(value ?? "")) ? Number(value) : NaN);

/**
 * Validate the clock dialog fields.
 * @returns {{ok: true, hour: number, minute: number} | {ok: false, errors: {hour?: string, minute?: string}}}
 */
export const parseClock = (hourText, minuteText) => {
  const hour = readWhole(hourText);
  const minute = readWhole(minuteText);
  const errors = {};
  if (!(hour >= 0 && hour <= 23)) errors.hour = "Enter an hour from 00 to 23.";
  if (!(minute >= 0 && minute <= 59)) errors.minute = "Enter minutes from 00 to 59.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, hour, minute };
};

/** Validate the battery dialog field: a whole number 0–100. */
export const parseBattery = (text) => {
  const value = readWhole(text);
  if (!(value >= 0 && value <= 100)) {
    return { ok: false, error: "Enter a whole number from 0 to 100." };
  }
  return { ok: true, value };
};

/** Width of the battery fill, 0–1. */
export const batteryFill = (level) => Math.min(100, Math.max(0, Math.round(level))) / 100;

export const defaultPhoneSettings = (date = new Date()) => ({
  preset: DEFAULT_PRESET,
  hour: date.getHours(),
  minute: date.getMinutes(),
  battery: 58,
  showContactStatus: true,
});

/** Change the preset without touching clock, battery or other settings. */
export const withPreset = (settings, preset) =>
  PRESETS[preset] ? { ...settings, preset } : settings;

/* ---------------- Messages ---------------- */

export const MESSAGE_TYPES = ["text", "image", "call", "voice"];

/** Messages created before `type` existed are text or image messages. */
export const messageType = (message) => {
  if (MESSAGE_TYPES.includes(message?.type)) return message.type;
  return message?.image ? "image" : "text";
};

/** True when the message sits on the right (sent by you). */
export const isSelf = (message) =>
  messageType(message) === "call"
    ? message.call?.direction === "outgoing"
    : message?.self === true;

/**
 * A new bubble group (with a tail and extra top spacing) starts when the side
 * changes. Call cards stand on their own and never join a group.
 */
export const isGroupStart = (list, index) => {
  if (index === 0) return true;
  const prev = list[index - 1];
  const cur = list[index];
  if (messageType(prev) === "call" || messageType(cur) === "call") return true;
  return isSelf(prev) !== isSelf(cur);
};

/** Which notification sound a message plays: "send", "receive" or null. */
export const soundFor = (message) => {
  if (messageType(message) === "call") return null;
  return isSelf(message) ? "send" : "receive";
};

/* ---------------- Durations ---------------- */

/** "m:ss" (or "h:mm:ss"), like WhatsApp voice notes. */
export const formatClockDuration = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${m}:${pad2(sec)}`;
};

/** Natural call length: "45 sec", "3 min", "3 min 20 sec", "1 hr 5 min". */
export const formatCallDuration = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} sec`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m ? `${h} hr ${m} min` : `${h} hr`;
  return sec ? `${m} min ${sec} sec` : `${m} min`;
};

/**
 * Validate minutes + seconds fields.
 * @returns {{ok: true, seconds: number} | {ok: false, error: string}}
 */
export const parseDuration = (minuteText, secondText, { maxMinutes = 999, minSeconds = 1 } = {}) => {
  const m = String(minuteText ?? "").trim() === "" ? 0 : readWhole(minuteText);
  const s = String(secondText ?? "").trim() === "" ? 0 : readWhole(secondText);
  if (!(m >= 0 && m <= maxMinutes)) return { ok: false, error: `Minutes must be 0 to ${maxMinutes}.` };
  if (!(s >= 0 && s <= 59)) return { ok: false, error: "Seconds must be 0 to 59." };
  const seconds = m * 60 + s;
  if (seconds < minSeconds) return { ok: false, error: `Use at least ${minSeconds} second${minSeconds === 1 ? "" : "s"}.` };
  return { ok: true, seconds };
};

/** Parse an HH:mm message time typed in a dialog. */
export const parseTime = (text) => {
  const match = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(String(text ?? ""));
  if (!match) return { ok: false, error: "Use the 24-hour format HH:mm, e.g. 09:30." };
  const result = parseClock(match[1], match[2]);
  if (!result.ok) return { ok: false, error: "Use a time from 00:00 to 23:59." };
  return { ok: true, value: formatClock(result.hour, result.minute) };
};

/* ---------------- Calls ---------------- */

export const CALL_MEDIA = ["voice", "video"];
export const CALL_DIRECTIONS = ["incoming", "outgoing"];
export const CALL_RESULTS = ["answered", "missed", "cancelled"];

/** Keep only the fields that make sense: no duration unless answered. */
export const normalizeCall = (call) => {
  const media = CALL_MEDIA.includes(call.media) ? call.media : "voice";
  const direction = CALL_DIRECTIONS.includes(call.direction) ? call.direction : "outgoing";
  const result = CALL_RESULTS.includes(call.result) ? call.result : "answered";
  const durationSec =
    result === "answered" ? Math.max(1, Math.round(call.durationSec || 0)) : 0;
  return { media, direction, result, durationSec };
};

/**
 * Title and detail line of a call card, matched to direction and result.
 * Unanswered outgoing calls are never labelled "missed".
 */
export const callSummary = (rawCall) => {
  const call = normalizeCall(rawCall);
  const kind = call.media === "video" ? "video call" : "voice call";
  const Kind = kind[0].toUpperCase() + kind.slice(1);
  const incoming = call.direction === "incoming";
  if (call.result === "answered") {
    return { title: Kind, detail: formatCallDuration(call.durationSec), missed: false };
  }
  if (incoming) {
    return {
      title: `Missed ${kind}`,
      detail: call.result === "missed" ? "Tap to call back" : "Caller hung up",
      missed: true,
    };
  }
  return {
    title: Kind,
    detail: call.result === "missed" ? "No answer" : "Cancelled",
    missed: false,
  };
};

/* ---------------- Voice messages ---------------- */

export const DEFAULT_SCENE_SEC = 3;
export const MIN_SCENE_SEC = 1;
export const MAX_SCENE_SEC = 15;

export const parseScene = (text) => {
  const value = Number(String(text ?? "").trim().replace(",", "."));
  if (!Number.isFinite(value) || value < MIN_SCENE_SEC || value > MAX_SCENE_SEC) {
    return { ok: false, error: `Scene length must be ${MIN_SCENE_SEC} to ${MAX_SCENE_SEC} seconds.` };
  }
  return { ok: true, value: Math.round(value * 10) / 10 };
};

/** Small deterministic PRNG so a waveform never changes between renders/frames. */
const hashString = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Bar heights (0.15–1) derived from a seed string. Same seed → same bars. */
export const waveformBars = (seed, count = 40) => {
  const rand = mulberry32(hashString(String(seed)));
  const bars = [];
  let prev = 0.5;
  for (let i = 0; i < count; i++) {
    const target = 0.15 + rand() * 0.85;
    prev = prev * 0.35 + target * 0.65;
    bars.push(Math.round(prev * 100) / 100);
  }
  return bars;
};

/**
 * State of the "recording" scene at a given progress (0–1) of the scene.
 * The timer runs from 0 to the voice-note duration, independent of how long
 * the scene itself lasts in the video.
 */
export const recordingFrame = (progress, durationSec, barCount = 32) => {
  const p = Math.min(1, Math.max(0, progress || 0));
  return {
    elapsedSec: Math.floor(p * durationSec),
    visibleBars: Math.max(1, Math.ceil(p * barCount)),
  };
};

/* ---------------- Timeline ---------------- */

/**
 * When each message appears in a replay/video. Voice messages get a recording
 * scene of `sceneSec` seconds right before they appear.
 * @returns {{items: {appear: number, sceneStart: number | null, sceneSec: number}[], duration: number}}
 */
export const buildTimeline = (messages, { leadIn = 1, gap = 2, tail = 2.5 } = {}) => {
  let cursor = leadIn;
  const items = messages.map((message, i) => {
    if (i > 0) cursor += gap;
    if (messageType(message) === "voice") {
      const sceneSec = Math.max(0, Number(message.voice?.sceneSec ?? DEFAULT_SCENE_SEC) || 0);
      if (sceneSec > 0) {
        const sceneStart = cursor;
        cursor += sceneSec;
        return { appear: cursor, sceneStart, sceneSec };
      }
    }
    return { appear: cursor, sceneStart: null, sceneSec: 0 };
  });
  const last = items.length ? items[items.length - 1].appear : leadIn - gap;
  return { items, duration: Math.max(leadIn, last) + tail };
};

/** The voice-recording scene active at time t, if any. */
export const activeScene = (timeline, messages, t) => {
  for (let i = 0; i < timeline.items.length; i++) {
    const item = timeline.items[i];
    if (item.sceneStart !== null && t >= item.sceneStart - 1e-6 && t < item.appear - 1e-6) {
      return { index: i, progress: (t - item.sceneStart) / item.sceneSec, message: messages[i] };
    }
  }
  return null;
};
