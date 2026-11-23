import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../../App";
import {
  avatarSrc,
  callSummary,
  displayTime,
  formatClockDuration,
  messageType,
  normalizeCall,
  waveformBars,
} from "../../model";
import { CallCardIcon, MicIcon, PauseIcon, PlayIcon, SELF_AVATAR } from "../Icons";
import "./index.css";

export const Ticks = () => (
  <svg className="ticks" viewBox="0 0 16 11" aria-hidden="true">
    <path
      fill="currentColor"
      d="M11.07.65 10.4.12a.4.4 0 0 0-.56.07L4.7 6.62 2.33 4.4a.4.4 0 0 0-.56.02l-.6.64a.4.4 0 0 0 .02.57l3.2 3a.4.4 0 0 0 .59-.05l6.16-7.36a.4.4 0 0 0-.07-.57Z"
    />
    <path
      fill="currentColor"
      d="m15.07.65-.67-.53a.4.4 0 0 0-.56.07L8.7 6.62l-.85-.8-.92 1.1 1.5 1.42a.4.4 0 0 0 .59-.05l6.16-7.36a.4.4 0 0 0-.07-.57Z"
    />
  </svg>
);

const Meta = ({ time, ticks }) => (
  <span className="meta">
    {displayTime(time)}
    {ticks && <Ticks />}
  </span>
);

/* ---------- Hold (or right-click) to change the time ---------- */

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

/**
 * Press and hold a bubble (touch or mouse), or right-click it, to open the
 * time editor. The click that ends a long press is swallowed, so it never
 * also plays a voice note or opens the call editor.
 */
export const useLongPress = (onLongPress) => {
  const timer = useRef(null);
  const start = useRef(null);
  const fired = useRef(false);
  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    onPointerDown: (event) => {
      fired.current = false;
      if (event.button !== 0) return; // right-click goes through onContextMenu
      start.current = { x: event.clientX, y: event.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event) => {
      if (!start.current) return;
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (event) => {
      event.preventDefault();
      if (fired.current) return; // touch long press already opened it
      cancel();
      fired.current = true;
      onLongPress();
    },
    onClickCapture: (event) => {
      if (!fired.current) return;
      fired.current = false;
      event.stopPropagation();
      event.preventDefault();
    },
  };
};

const useTimeEditor = (message) => {
  const { openDialog } = useContext(AppContext);
  return useLongPress(() => openDialog({ kind: "time", msgId: message.msgId }));
};

const HOLD_HINT = "Hold or right-click to change the time";

/* ---------- Call history card ---------- */

const CallCard = ({ message, componentRef }) => {
  const { openDialog } = useContext(AppContext);
  const press = useTimeEditor(message);
  const call = normalizeCall(message.call);
  const { title, detail, missed } = callSummary(call);
  const outgoing = call.direction === "outgoing";
  const edit = () => openDialog({ kind: "call", editId: message.msgId });
  return (
    <div
      className={`message callMsg first ${outgoing ? "mr" : "ml"} ${missed ? "missed" : ""}`}
      ref={componentRef || undefined}
      data-type="call"
      data-media={call.media}
      data-direction={call.direction}
      data-result={call.result}
      title={`Click to edit the call. ${HOLD_HINT}.`}
      {...press}
    >
      <button
        type="button"
        className="callEdit"
        onClick={edit}
        aria-label={`${title}, ${detail}, ${displayTime(message.time)}. Edit call`}
      >
        <span className="callBadge">
          <CallCardIcon media={call.media} direction={call.direction} className="callGlyph" />
        </span>
        <span className="callText">
          <span className="callTitle">{title}</span>
          <span className="callDetailRow">
            <span className="callDetail">{detail}</span>
            <Meta time={message.time} />
          </span>
        </span>
      </button>
    </div>
  );
};

/* ---------- Voice message ---------- */

const BAR_COUNT = 36;

const VoiceBubble = ({ message, left, first, componentRef, onFlip }) => {
  const { contact, operation } = useContext(AppContext);
  const press = useTimeEditor(message);
  const duration = Math.max(1, message.voice?.durationSec || 1);
  const bars = waveformBars(message.msgId, BAR_COUNT);
  // Simulated playback: purely visual, there is no recorded audio.
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const frame = useRef();

  useEffect(() => {
    if (!playing) return undefined;
    const start = performance.now() - progress * duration * 1000;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      setProgress(p);
      if (p >= 1) {
        setPlaying(false);
        setProgress(0);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  // Exports and replays always show the voice note at rest.
  useEffect(() => {
    if (operation === "video" || operation === "replay") {
      setPlaying(false);
      setProgress(0);
    }
  }, [operation]);

  const togglePlay = (event) => {
    event.stopPropagation();
    setPlaying((p) => !p);
  };

  const shown = playing || progress > 0 ? progress * duration : duration;
  const playedBars = Math.round(progress * BAR_COUNT);
  const avatar = left ? avatarSrc(contact.avatar) : SELF_AVATAR;

  return (
    <div
      onClick={onFlip}
      className={`message voiceMsg ${left ? "ml" : "mr"} ${first ? "first" : ""}`}
      title={`Double-click to switch sides. ${HOLD_HINT}.`}
      ref={componentRef || undefined}
      data-type="voice"
      {...press}
    >
      <div className="voiceRow">
        <span className="voiceAvatar">
          <img src={avatar} alt="" draggable={false} />
          <MicIcon className={`voiceMic ${left ? "unplayed" : ""}`} />
        </span>
        <button
          type="button"
          className="voicePlay"
          onClick={togglePlay}
          onDoubleClick={(e) => e.stopPropagation()}
          aria-label={playing ? "Pause voice message preview" : "Play voice message preview"}
          title="Visual preview only, no audio"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="voiceTrack">
          <div className="voiceWave">
            <span
              className="voiceDot"
              style={{ left: `calc(${progress.toFixed(4)} * (100% - 1.35vh))` }}
            />
            {bars.map((h, i) => (
              <span
                key={i}
                className={`voiceBar ${i < playedBars ? "played" : ""}`}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            ))}
          </div>
          <div className="voiceInfo">
            <span className="voiceDuration">{formatClockDuration(shown)}</span>
            <Meta time={message.time} ticks={!left} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Text and photo ---------- */

const ChatMessage = ({ message, left, first, componentRef }) => {
  const { setMessageList } = useContext(AppContext);
  const press = useTimeEditor(message);
  const { text, image, time, msgId } = message;
  const type = messageType(message);

  // Double-click (or double-tap) a bubble to move it to the other side.
  const messageClick = (event) => {
    if (event.detail === 2) {
      setMessageList((list) =>
        list.map((m) => (m.msgId === msgId ? { ...m, self: !m.self } : m))
      );
    }
  };

  if (type === "call") return <CallCard message={message} componentRef={componentRef} />;
  if (type === "voice") {
    return (
      <VoiceBubble
        message={message}
        left={left}
        first={first}
        componentRef={componentRef}
        onFlip={messageClick}
      />
    );
  }

  const meta = <Meta time={time} ticks={!left} />;

  // WhatsApp shows very tall/wide photos cropped to a sensible shape.
  const ratio = image
    ? Math.min(Math.max(image.width / image.height, 0.62), 1.9)
    : 1;

  return (
    <div
      onClick={messageClick}
      className={`message ${left ? "ml" : "mr"} ${first ? "first" : ""} ${
        image ? "imageMsg" : ""
      }`}
      title={`Double-click to switch sides. ${HOLD_HINT}.`}
      ref={componentRef || undefined}
      data-type={type}
      {...press}
    >
      {image ? (
        <>
          <div className="photo" style={{ aspectRatio: ratio }}>
            <img src={image.src} alt="" draggable={false} />
            {!text && <span className="photoMeta">{meta}</span>}
          </div>
          {text && (
            <div className="caption">
              <span className="messageText">{text}</span>
              {meta}
            </div>
          )}
        </>
      ) : (
        <>
          <span className="messageText">{text}</span>
          {meta}
        </>
      )}
    </div>
  );
};

export default ChatMessage;
