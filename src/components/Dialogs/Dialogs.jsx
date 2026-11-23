import React, { useContext, useEffect, useId, useRef, useState } from "react";
import { AppContext } from "../../App";
import { newId } from "../../utils";
import {
  DEFAULT_SCENE_SEC,
  MAX_SCENE_SEC,
  MIN_SCENE_SEC,
  callSummary,
  formatClock,
  normalizeCall,
  pad2,
  parseBattery,
  parseClock,
  parseDuration,
  parseScene,
  parseTime,
} from "../../model";
import { PixelBattery, PocoBattery } from "../StatusBar/StatusBar";
import "./index.css";

/* Editor dialogs. They live outside the phone element and carry .no-export,
   so they never appear in screenshots or videos. */

const Modal = ({ title, onClose, onSubmit, children, actions }) => {
  const ref = useRef();
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const first = ref.current?.querySelector("input, button, select");
    first?.focus();
    first?.select?.();
    return () => previous?.focus?.({ preventScroll: true });
  }, []);
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
    // Keep Tab inside the dialog.
    if (event.key === "Tab") {
      const items = [...ref.current.querySelectorAll("input, button, select")].filter(
        (el) => !el.disabled
      );
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }
  };
  return (
    <div
      className="dialogOverlay no-export"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        ref={ref}
        className="dialogCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="dialogActions">{actions}</div>
      </form>
    </div>
  );
};

const NumberField = ({ label, value, onChange, error, maxLength = 2, suffix, name, ...rest }) => {
  const id = useId();
  return (
    <div className={`field ${error ? "hasError" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="fieldRow">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {suffix && <span className="fieldSuffix">{suffix}</span>}
      </div>
    </div>
  );
};

const Choice = ({ label, value, options, onChange }) => {
  const id = useId();
  return (
    <div className="field" role="radiogroup" aria-labelledby={id}>
      <span className="fieldLabel" id={id}>
        {label}
      </span>
      <div className="segmented">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? "on" : ""}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const ErrorText = ({ children }) =>
  children ? (
    <p className="fieldError" role="alert">
      {children}
    </p>
  ) : null;

/* ---------- Clock ---------- */

const ClockDialog = ({ close }) => {
  const { phone, setPhone } = useContext(AppContext);
  const [hour, setHour] = useState(pad2(phone.hour));
  const [minute, setMinute] = useState(pad2(phone.minute));
  const [errors, setErrors] = useState({});
  const parsed = parseClock(hour, minute);
  const save = () => {
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setPhone((p) => ({ ...p, hour: parsed.hour, minute: parsed.minute }));
    close();
  };
  return (
    <Modal
      title="Phone clock"
      onClose={close}
      onSubmit={save}
      actions={
        <>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save clock
          </button>
        </>
      }
    >
      <div className="fieldPair">
        <NumberField
          label="Hour (00–23)"
          name="hour"
          value={hour}
          error={errors.hour}
          onChange={(v) => {
            setHour(v);
            setErrors((e) => ({ ...e, hour: undefined }));
          }}
        />
        <span className="fieldColon">:</span>
        <NumberField
          label="Minute (00–59)"
          name="minute"
          value={minute}
          error={errors.minute}
          onChange={(v) => {
            setMinute(v);
            setErrors((e) => ({ ...e, minute: undefined }));
          }}
        />
      </div>
      <ErrorText>{errors.hour || errors.minute}</ErrorText>
      <p className="dialogHint">
        Shown as <b>{parsed.ok ? formatClock(parsed.hour, parsed.minute) : "--:--"}</b> (24-hour).
        The status bar clock stays fixed and never changes message times.
      </p>
    </Modal>
  );
};

/* ---------- Battery ---------- */

const BatteryDialog = ({ close }) => {
  const { phone, setPhone } = useContext(AppContext);
  const [value, setValue] = useState(String(phone.battery));
  const [error, setError] = useState("");
  const parsed = parseBattery(value);
  const save = () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setPhone((p) => ({ ...p, battery: parsed.value }));
    close();
  };
  const Preview = phone.preset === "pocox7" ? PocoBattery : PixelBattery;
  return (
    <Modal
      title="Battery level"
      onClose={close}
      onSubmit={save}
      actions={
        <>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save battery
          </button>
        </>
      }
    >
      <div className="fieldPair">
        <NumberField
          label="Battery (0–100)"
          name="battery"
          value={value}
          maxLength={3}
          suffix="%"
          error={error}
          onChange={(v) => {
            setValue(v);
            setError("");
          }}
        />
        <div className={`batteryPreview sb-${phone.preset}`} aria-hidden="true">
          {parsed.ok && <Preview level={parsed.value} />}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
};

/* ---------- Call history ---------- */

const CallDialog = ({ close, dialog }) => {
  const { phone, messageList, setMessageList } = useContext(AppContext);
  const editing = dialog.editId
    ? messageList.find((m) => m.msgId === dialog.editId)
    : null;
  const start = editing
    ? normalizeCall(editing.call)
    : { media: dialog.media || "voice", direction: "outgoing", result: "answered", durationSec: 65 };
  const [media, setMedia] = useState(start.media);
  const [direction, setDirection] = useState(start.direction);
  const [result, setResult] = useState(start.result);
  const [minutes, setMinutes] = useState(String(Math.floor((start.durationSec || 0) / 60)));
  const [seconds, setSeconds] = useState(pad2((start.durationSec || 0) % 60));
  const [time, setTime] = useState(editing?.time ?? formatClock(phone.hour, phone.minute));
  const [errors, setErrors] = useState({});

  const answered = result === "answered";
  const duration = answered ? parseDuration(minutes, seconds) : { ok: true, seconds: 0 };
  const preview = callSummary({ media, direction, result, durationSec: duration.ok ? duration.seconds : 1 });

  const save = () => {
    const t = parseTime(time);
    const next = {};
    if (!duration.ok) next.duration = duration.error;
    if (!t.ok) next.time = t.error;
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const call = normalizeCall({ media, direction, result, durationSec: duration.seconds });
    const message = {
      msgId: editing?.msgId ?? newId(),
      type: "call",
      call,
      self: direction === "outgoing",
      time: t.value,
    };
    setMessageList((list) =>
      editing ? list.map((m) => (m.msgId === editing.msgId ? message : m)) : [...list, message]
    );
    close();
  };

  const remove = () => {
    setMessageList((list) => list.filter((m) => m.msgId !== editing.msgId));
    close();
  };

  if (dialog.editId && !editing) return null;

  return (
    <Modal
      title={editing ? "Edit call" : media === "video" ? "Add video call" : "Add voice call"}
      onClose={close}
      onSubmit={save}
      actions={
        <>
          {editing && (
            <button type="button" className="danger" onClick={remove}>
              Delete call
            </button>
          )}
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {editing ? "Save call" : "Add call"}
          </button>
        </>
      }
    >
      <Choice
        label="Call type"
        value={media}
        onChange={setMedia}
        options={[
          { value: "voice", label: "Voice" },
          { value: "video", label: "Video" },
        ]}
      />
      <Choice
        label="Direction"
        value={direction}
        onChange={setDirection}
        options={[
          { value: "incoming", label: "Incoming" },
          { value: "outgoing", label: "Outgoing" },
        ]}
      />
      <Choice
        label="Result"
        value={result}
        onChange={(v) => {
          setResult(v);
          setErrors((e) => ({ ...e, duration: undefined }));
        }}
        options={[
          { value: "answered", label: "Answered" },
          { value: "missed", label: "Missed" },
          { value: "cancelled", label: "Cancelled" },
        ]}
      />
      {answered && (
        <div className="fieldPair">
          <NumberField
            label="Minutes"
            name="callMinutes"
            maxLength={3}
            value={minutes}
            onChange={(v) => {
              setMinutes(v);
              setErrors((e) => ({ ...e, duration: undefined }));
            }}
            error={errors.duration}
          />
          <span className="fieldColon">:</span>
          <NumberField
            label="Seconds"
            name="callSeconds"
            value={seconds}
            onChange={(v) => {
              setSeconds(v);
              setErrors((e) => ({ ...e, duration: undefined }));
            }}
            error={errors.duration}
          />
        </div>
      )}
      <ErrorText>{errors.duration}</ErrorText>
      <TimeField value={time} onChange={(v) => { setTime(v); setErrors((e) => ({ ...e, time: undefined })); }} error={errors.time} />
      <ErrorText>{errors.time}</ErrorText>
      <p className="dialogHint">
        Preview: <b>{preview.title}</b> · {preview.detail}. Local simulation only, no
        real call is made.
      </p>
    </Modal>
  );
};

const TimeField = ({ value, onChange, error }) => {
  const id = useId();
  return (
    <div className={`field ${error ? "hasError" : ""}`}>
      <label htmlFor={id}>Time (HH:mm)</label>
      <input
        id={id}
        name="callTime"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d:.]/g, ""))}
        aria-invalid={error ? true : undefined}
      />
    </div>
  );
};

/* ---------- Voice message ---------- */

const VoiceDialog = ({ close }) => {
  const { sendAsSelf, setRecording } = useContext(AppContext);
  const [self, setSelf] = useState(sendAsSelf);
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("13");
  const [scene, setScene] = useState(String(DEFAULT_SCENE_SEC));
  const [errors, setErrors] = useState({});

  const start = () => {
    const d = parseDuration(minutes, seconds, { maxMinutes: 99 });
    const s = parseScene(scene);
    const next = {};
    if (!d.ok) next.duration = d.error;
    if (!s.ok) next.scene = s.error;
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setRecording({
      mode: "draft",
      self,
      durationSec: d.seconds,
      sceneSec: s.value,
      seed: newId(),
      startedAt: performance.now(),
    });
    close();
  };

  const sceneId = useId();
  return (
    <Modal
      title="Voice message"
      onClose={close}
      onSubmit={start}
      actions={
        <>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Start simulation
          </button>
        </>
      }
    >
      <Choice
        label="Sender"
        value={self ? "you" : "them"}
        onChange={(v) => setSelf(v === "you")}
        options={[
          { value: "you", label: "You" },
          { value: "them", label: "Them" },
        ]}
      />
      <div className="fieldPair">
        <NumberField
          label="Voice note minutes"
          name="voiceMinutes"
          value={minutes}
          onChange={(v) => {
            setMinutes(v);
            setErrors((e) => ({ ...e, duration: undefined }));
          }}
          error={errors.duration}
        />
        <span className="fieldColon">:</span>
        <NumberField
          label="Seconds"
          name="voiceSeconds"
          value={seconds}
          onChange={(v) => {
            setSeconds(v);
            setErrors((e) => ({ ...e, duration: undefined }));
          }}
          error={errors.duration}
        />
      </div>
      <ErrorText>{errors.duration}</ErrorText>
      <div className={`field ${errors.scene ? "hasError" : ""}`}>
        <label htmlFor={sceneId}>
          Recording scene in replay/video ({MIN_SCENE_SEC}–{MAX_SCENE_SEC} s)
        </label>
        <div className="fieldRow">
          <input
            id={sceneId}
            name="sceneSeconds"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            maxLength={4}
            value={scene}
            onChange={(e) => {
              setScene(e.target.value.replace(/[^\d.,]/g, ""));
              setErrors((x) => ({ ...x, scene: undefined }));
            }}
            aria-invalid={errors.scene ? true : undefined}
          />
          <span className="fieldSuffix">s</span>
        </div>
      </div>
      <ErrorText>{errors.scene}</ErrorText>
      <p className="dialogHint">
        Simulation only: the microphone is never used and there is no audio. The
        recording timer counts up to the voice note length within the scene length.
      </p>
    </Modal>
  );
};

const Dialogs = () => {
  const { dialog, setDialog } = useContext(AppContext);
  const close = () => setDialog(null);
  if (!dialog) return null;
  const props = { close, dialog };
  switch (dialog.kind) {
    case "clock":
      return <ClockDialog {...props} />;
    case "battery":
      return <BatteryDialog {...props} />;
    case "call":
      return <CallDialog key={dialog.editId || dialog.media} {...props} />;
    case "voice":
      return <VoiceDialog {...props} />;
    default:
      return null;
  }
};

export default Dialogs;
