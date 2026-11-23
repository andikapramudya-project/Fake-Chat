import { flushSync } from "react-dom";
import { toCanvas } from "html-to-image";
import {
  Output,
  Mp4OutputFormat,
  WebMOutputFormat,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  getFirstEncodableVideoCodec,
  getFirstEncodableAudioCodec,
} from "mediabunny";
import { exportOptions, MESSAGE_GAP } from "./utils";
import { renderTimelineAudio } from "./sounds";
import { activeScene, buildTimeline, soundFor } from "./model.js";

/*
 * Chat-story video export.
 *
 * Instead of recording the screen in real time (slow and choppy), the video is
 * built frame by frame: for every frame we set the exact animation state, take
 * a snapshot of the phone and hand it to the browser's video encoder
 * (WebCodecs, through mediabunny). Frames where nothing moves reuse the last
 * snapshot, so rendering stays fast and playback is a steady 30 fps.
 */

export const FPS = 30;
const LEAD_IN = 1; // empty chat before the first message
const TAIL = 2.5; // hold after the last message
const BUBBLE_ANIM = 0.3;
const SCROLL_ANIM = 0.35;
const MAX_WIDTH = 1080;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

const timelineFor = (messages) =>
  buildTimeline(messages, { leadIn: LEAD_IN, gap: MESSAGE_GAP, tail: TAIL });

/** Video length in seconds, including voice-recording scenes. */
export const videoDuration = (messages) => timelineFor(messages).duration;

export class VideoUnsupportedError extends Error {
  name = "VideoUnsupportedError";
}

/**
 * @param {object} p
 * @param {HTMLElement} p.phoneEl - element to film
 * @param {object[]} p.messages - full message list
 * @param {Function} p.setMessageList - React state setter
 * @param {Function} [p.setRecording] - React setter for the voice-recording scene
 * @param {object|null} [p.restoreRecording] - recording state to put back afterwards
 * @param {(percent: number) => void} [p.onProgress]
 * @param {AbortSignal} [p.signal]
 * @returns {Promise<{blob: Blob, extension: string}>}
 */
export async function renderChatVideo({
  phoneEl,
  messages,
  setMessageList,
  setRecording = () => {},
  restoreRecording = null,
  onProgress,
  signal,
}) {
  signal?.throwIfAborted();
  if (typeof VideoEncoder === "undefined") throw new VideoUnsupportedError();

  const box = phoneEl.querySelector(".chatMessages");
  const inner = box.querySelector(".chatInner");

  // Output size: phone size at 2x (max 1080px wide), even numbers for H.264.
  const rect = phoneEl.getBoundingClientRect();
  const scale = Math.min(2, MAX_WIDTH / rect.width);
  const width = even(rect.width * scale);
  const height = even(rect.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Prefer MP4/H.264 (plays everywhere), fall back to WebM.
  const videoCodec = await getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], {
    width,
    height,
  });
  if (!videoCodec) throw new VideoUnsupportedError();
  const isMp4 = videoCodec === "avc";
  const format = isMp4
    ? new Mp4OutputFormat({ fastStart: "in-memory" })
    : new WebMOutputFormat();
  const audioCodec = await getFirstEncodableAudioCodec(
    isMp4 ? ["aac", "opus"] : ["opus"],
    { numberOfChannels: 2, sampleRate: 48000 }
  );
  signal?.throwIfAborted();

  const output = new Output({ format, target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: QUALITY_HIGH,
  });
  output.addVideoTrack(videoSource, { frameRate: FPS });
  let audioSource = null;
  if (audioCodec) {
    audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: QUALITY_MEDIUM });
    output.addAudioTrack(audioSource);
  }

  // Each frame is computed from its own timestamp (f / FPS), never from
  // wall-clock time, so timers and waveforms are identical on every machine.
  const timeline = timelineFor(messages);
  const appear = timeline.items.map((item) => item.appear);
  const duration = timeline.duration;
  const totalFrames = Math.ceil(duration * FPS);
  const options = await exportOptions(phoneEl, { pixelRatio: scale });

  phoneEl.classList.add("recording");
  let finished = false;
  try {
    signal?.throwIfAborted();
    await output.start();

    if (audioSource) {
      const audio = await renderTimelineAudio(
        messages
          .map((m, i) => ({ time: appear[i], sound: soundFor(m) }))
          .filter((e) => e.sound)
          .map((e) => ({ time: e.time, self: e.sound === "send" })),
        duration
      );
      await audioSource.add(audio);
    }

    let shown = -1;
    let offset = 0;
    let scrollFrom = 0;
    let scrollTo = 0;
    let scrollStart = 0;
    let lastKey = "";
    let lastScene = "";
    let lastSceneId = "";
    flushSync(() => setRecording(null));

    for (let f = 0; f < totalFrames; f++) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const t = f / FPS;

      // Which messages are visible at this moment?
      let count = 0;
      while (count < appear.length && appear[count] <= t + 1e-6) count++;
      // Voice-recording scene (you: recording bar, them: "recording audio…").
      const scene = activeScene(timeline, messages, t);
      const sceneId = scene ? String(scene.index) : "";
      const sceneProgress = scene ? scene.progress.toFixed(3) : "";
      let layoutChanged = false;
      if (count !== shown) {
        flushSync(() => setMessageList(messages.slice(0, count)));
        shown = count;
        layoutChanged = true;
      }
      if (sceneId + sceneProgress !== lastScene) {
        flushSync(() =>
          setRecording(
            scene
              ? {
                  mode: "frame",
                  self: scene.message.self === true,
                  durationSec: scene.message.voice?.durationSec || 1,
                  sceneSec: timeline.items[scene.index].sceneSec,
                  seed: scene.message.msgId,
                  progress: scene.progress,
                }
              : null
          )
        );
        if (sceneId !== lastSceneId) layoutChanged = true;
        lastSceneId = sceneId;
        lastScene = sceneId + sceneProgress;
      }
      if (layoutChanged) {
        // The composer/recording bar can change height: re-measure the scroll.
        box.scrollTop = 0;
        scrollFrom = offset;
        scrollTo = Math.max(0, inner.offsetHeight - box.clientHeight);
        scrollStart = t;
      }

      const since = count > 0 ? t - appear[count - 1] : Infinity;
      const p = clamp01(since / BUBBLE_ANIM);
      offset = scrollFrom + (scrollTo - scrollFrom) * easeOutCubic(clamp01((t - scrollStart) / SCROLL_ANIM));

      // Only re-render the phone when something actually changed.
      const key = `${count}|${p.toFixed(3)}|${offset.toFixed(1)}|${lastScene}`;
      if (key !== lastKey) {
        lastKey = key;
        inner.style.transform = `translateY(${-offset}px)`;
        const bubbles = inner.querySelectorAll(".message");
        const newest = bubbles[bubbles.length - 1];
        if (newest) {
          const e = easeOutBack(p);
          newest.style.opacity = String(clamp01(p * 2.5));
          newest.style.transform = `translateY(${(1 - e) * 16}px) scale(${0.94 + 0.06 * e})`;
        }
        const frame = await toCanvas(phoneEl, options);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frame, 0, 0, width, height);
      }

      await videoSource.add(t, 1 / FPS);
      onProgress?.(((f + 1) / totalFrames) * 100);
    }

    signal?.throwIfAborted();
    await output.finalize();
    finished = true;
    return {
      blob: new Blob([output.target.buffer], { type: format.mimeType }),
      extension: format.fileExtension,
    };
  } finally {
    if (!finished) await output.cancel().catch(() => {});
    phoneEl.classList.remove("recording");
    inner.style.transform = "";
    flushSync(() => {
      setMessageList(messages);
      setRecording(restoreRecording);
    });
    inner.querySelectorAll(".message").forEach((el) => {
      el.style.opacity = "";
      el.style.transform = "";
    });
    box.scrollTop = box.scrollHeight;
  }
}
