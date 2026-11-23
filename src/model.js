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

export const MESSAGE_TYPES = ["text", "image", "call", "voice", "date"];

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
  const types = [messageType(prev), messageType(cur)];
  if (types.includes("call") || types.includes("date")) return true;
  return isSelf(prev) !== isSelf(cur);
};

/** Which notification sound a message plays: "send", "receive" or null. */
export const soundFor = (message) => {
  const type = messageType(message);
  if (type === "call" || type === "date") return null;
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

/** Call length as WhatsApp (Indonesian) shows it: "45 dtk", "3 mnt 20 dtk", "1 jam 5 mnt". */
export const formatCallDuration = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} dtk`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m ? `${h} jam ${m} mnt` : `${h} jam`;
  return sec ? `${m} mnt ${sec} dtk` : `${m} mnt`;
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
 * Title and detail line of a call card, worded like WhatsApp in Indonesian.
 * Only incoming calls that were never picked up count as missed (red);
 * unanswered outgoing calls just say "Tidak dijawab".
 */
export const callSummary = (rawCall) => {
  const call = normalizeCall(rawCall);
  const kind = call.media === "video" ? "Panggilan video" : "Telepon suara";
  const incoming = call.direction === "incoming";
  if (call.result === "answered") {
    return { title: kind, detail: formatCallDuration(call.durationSec), missed: false };
  }
  if (incoming) {
    return { title: `${kind} tak terjawab`, detail: "Ketuk untuk menelepon balik", missed: true };
  }
  return {
    title: kind,
    detail: call.result === "missed" ? "Tidak dijawab" : "Dibatalkan",
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
  let started = false;
  const items = messages.map((message) => {
    // Date dividers take no time of their own: they appear with the next message.
    if (messageType(message) === "date") return null;
    if (started) cursor += gap;
    started = true;
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
  let next = started ? cursor + gap : leadIn;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i]) next = items[i].appear;
    else items[i] = { appear: next, sceneStart: null, sceneSec: 0 };
  }
  const last = started ? cursor : leadIn - gap;
  const lastAppear = items.reduce((max, item) => Math.max(max, item.appear), last);
  return { items, duration: Math.max(leadIn, lastAppear) + tail };
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

/* ---------------- Message times ---------------- */

/** "HH:mm" → minutes since midnight (NaN when invalid). */
export const toMinutes = (time) => {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(String(time ?? "").trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};

/** WhatsApp in Indonesian writes message times with a dot: 16.01. */
export const displayTime = (time) => String(time ?? "").replace(":", ".");

const hasTime = (message) =>
  messageType(message) !== "date" && Number.isFinite(toMinutes(message?.time));

/**
 * The earliest and latest time a message at `index` may have, so the chat stays
 * in order: not before the previous message and not after the next one. A date
 * divider starts a new day, so it ends the search in that direction.
 * Equal times are allowed.
 * @returns {{min: string | null, max: string | null}}
 */
export const timeBounds = (list, index) => {
  let min = null;
  let max = null;
  for (let i = index - 1; i >= 0; i--) {
    if (messageType(list[i]) === "date") break;
    if (hasTime(list[i])) {
      min = list[i].time;
      break;
    }
  }
  for (let i = index + 1; i < list.length; i++) {
    if (messageType(list[i]) === "date") break;
    if (hasTime(list[i])) {
      max = list[i].time;
      break;
    }
  }
  return { min, max };
};

/** Is "HH:mm" inside the bounds (inclusive)? */
export const timeAllowed = (time, { min, max }) => {
  const t = toMinutes(time);
  if (!Number.isFinite(t)) return false;
  if (min !== null && t < toMinutes(min)) return false;
  if (max !== null && t > toMinutes(max)) return false;
  return true;
};

/** Message that explains the allowed range. */
export const boundsHint = ({ min, max }) => {
  if (min && max) return `Choose a time from ${min} to ${max}.`;
  if (min) return `Choose ${min} or later (the previous message is at ${min}).`;
  if (max) return `Choose ${max} or earlier (the next message is at ${max}).`;
  return "Any time from 00:00 to 23:59.";
};

/** Time for a new message at the end: now, but never before the last message of the day. */
export const nextMessageTime = (list, now) => {
  const { min } = timeBounds(list, list.length);
  if (min !== null && toMinutes(now) < toMinutes(min)) return min;
  return now;
};

/**
 * Validate an hour/minute pair for a message against its bounds.
 * @returns {{ok: true, value: string} | {ok: false, error: string}}
 */
export const parseMessageTime = (hourText, minuteText, bounds) => {
  const parsed = parseClock(hourText, minuteText);
  if (!parsed.ok) return { ok: false, error: parsed.errors.hour || parsed.errors.minute };
  const value = formatClock(parsed.hour, parsed.minute);
  if (!timeAllowed(value, bounds)) return { ok: false, error: boundsHint(bounds) };
  return { ok: true, value };
};

/* ---------------- Dates ---------------- */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date as "YYYY-MM-DD". */
export const isoDate = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const dayNumber = (iso) => {
  const m = ISO_DATE.exec(String(iso ?? ""));
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000 : NaN;
};

export const isValidDate = (iso) => {
  const n = dayNumber(iso);
  return Number.isFinite(n) && isoFromDay(n) === iso;
};

const isoFromDay = (n) => {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};

/** Shift a "YYYY-MM-DD" date by whole days. */
export const addDays = (iso, days) => isoFromDay(dayNumber(iso) + days);

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Date divider label like WhatsApp in Indonesian: "Hari ini", "Kemarin", the
 * weekday within the last week, otherwise the full date ("21 November 2026").
 */
export const dateLabel = (iso, today = isoDate()) => {
  const n = dayNumber(iso);
  if (!Number.isFinite(n)) return "Hari ini";
  const diff = dayNumber(today) - n;
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  const d = new Date(n * 86400000);
  if (diff > 1 && diff < 7) return DAYS_ID[d.getUTCDay()];
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/**
 * Allowed dates for the divider at `index` (-1 = the first divider at the top
 * of the chat, whose date is `chatDate`). Each divider must be later than the
 * one before it and earlier than the one after it.
 * @returns {{min: string | null, max: string | null}} inclusive bounds
 */
export const dateBounds = (list, index, chatDate) => {
  let prev = index < 0 ? null : chatDate;
  for (let i = Math.min(index, list.length) - 1; i >= 0; i--) {
    if (messageType(list[i]) === "date") {
      prev = list[i].date;
      break;
    }
  }
  let next = null;
  for (let i = index + 1; i < list.length; i++) {
    if (messageType(list[i]) === "date") {
      next = list[i].date;
      break;
    }
  }
  return {
    min: prev ? addDays(prev, 1) : null,
    max: next ? addDays(next, -1) : null,
  };
};

export const dateAllowed = (iso, { min, max }) => {
  if (!isValidDate(iso)) return false;
  if (min && dayNumber(iso) < dayNumber(min)) return false;
  if (max && dayNumber(iso) > dayNumber(max)) return false;
  return true;
};

/** Default date for a new divider: today if allowed, otherwise the earliest allowed day. */
export const suggestDate = (bounds, today = isoDate()) => {
  if (dateAllowed(today, bounds)) return today;
  return bounds.min ?? bounds.max ?? today;
};

/* ---------------- Avatars ---------------- */

/** "No photo" avatar colors: background and silhouette. Gray is the default. */
export const AVATAR_COLORS = Object.freeze({
  gray: { label: "Gray", bg: "#6a7175", fg: "#cfd4d6" },
  green: { label: "Green", bg: "#103529", fg: "#25d366" },
  blue: { label: "Blue", bg: "#0e2f44", fg: "#53bdeb" },
  violet: { label: "Violet", bg: "#242446", fg: "#a690fd" },
  orange: { label: "Orange", bg: "#3d2a12", fg: "#ffb35c" },
  pink: { label: "Pink", bg: "#3d1d2c", fg: "#ff72a1" },
});
export const AVATAR_COLOR_IDS = Object.keys(AVATAR_COLORS);
export const DEFAULT_AVATAR_COLOR = "gray";

/** SVG data URL of a "no photo" avatar in one of the colors. */
export const colorAvatar = (colorId) => {
  const c = AVATAR_COLORS[colorId] || AVATAR_COLORS[DEFAULT_AVATAR_COLOR];
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 212 212"><rect width="212" height="212" fill="${c.bg}"/><circle cx="106" cy="86" r="42" fill="${c.fg}"/><path d="M28 196c6-44 40-68 78-68s72 24 78 68a106 106 0 0 1-156 0z" fill="${c.fg}"/></svg>`
    )
  );
};

/** Image URL for a contact avatar setting: {color} or {photo}. */
export const avatarSrc = (avatar) =>
  avatar?.photo ? avatar.photo : colorAvatar(avatar?.color);
