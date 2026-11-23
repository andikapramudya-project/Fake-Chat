import React, { useContext, useEffect, useId, useRef, useState } from "react";
import { AppContext } from "../../App";
import { loadImageFile, newId, nowTime } from "../../utils";
import {
  AVATAR_COLORS,
  AVATAR_COLOR_IDS,
  BATTERY_MODES,
  BATTERY_MODE_IDS,
  LOW_BATTERY,
  NETWORKS,
  NETWORK_IDS,
  SIGNAL_LEVELS,
  batteryLook,
  canForward,
  signalBars,
  withNetwork,
  DEFAULT_SCENE_SEC,
  MAX_SCENE_SEC,
  MIN_SCENE_SEC,
  avatarSrc,
  boundsHint,
  callSummary,
  colorAvatar,
  dateAllowed,
  dateBounds,
  dateLabel,
  displayTime,
  formatClock,
  isoDate,
  messageType,
  nextMessageTime,
  normalizeCall,
  pad2,
  parseBattery,
  parseClock,
  parseDuration,
  parseScene,
  parseMessageTime,
  parseTime,
  suggestDate,
  timeAllowed,
  timeBounds,
} from "../../model";
import StatusBar, { PixelBattery, PocoBattery } from "../StatusBar/StatusBar";
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
        (el) => !el.disabled && el.getClientRects().length > 0
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

const Toggle = ({ label, checked, onChange, hint }) => {
  const id = useId();
  return (
    <div className="field toggleField">
      <label className="toggleRow" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
      {hint && <p className="dialogHint toggleHint">{hint}</p>}
    </div>
  );
};

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
  const [mode, setMode] = useState(BATTERY_MODES[phone.batteryMode] ? phone.batteryMode : "normal");
  const [error, setError] = useState("");
  const parsed = parseBattery(value);
  const save = () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setPhone((p) => ({ ...p, battery: parsed.value, batteryMode: mode }));
    close();
  };
  const autoLow = mode === "normal" && parsed.ok && batteryLook(parsed.value, mode) === "low";
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
          {parsed.ok && <Preview level={parsed.value} mode={mode} />}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <Choice
        label="Battery state"
        value={mode}
        options={BATTERY_MODE_IDS.map((id) => ({ value: id, label: BATTERY_MODES[id] }))}
        onChange={setMode}
      />
      <p className="dialogHint">
        {mode === "charging"
          ? "Green with a charging bolt, at any level."
          : mode === "low"
            ? "Red at any level, like battery saver."
            : `White. Turns red on its own below ${LOW_BATTERY}%${autoLow ? " (it will be red now)" : ""}.`}
      </p>
    </Modal>
  );
};

/* ---------- Network ---------- */

const NetworkDialog = ({ close }) => {
  const { phone, setPhone } = useContext(AppContext);
  const [network, setNetwork] = useState(NETWORKS[phone.network] ? phone.network : "wifi");
  const [signal, setSignal] = useState(signalBars(phone.signal));
  const save = () => {
    setPhone((p) => withNetwork(p, { network, signal }));
    close();
  };
  const preview = withNetwork(phone, { network, signal });
  return (
    <Modal
      title="Network"
      onClose={close}
      onSubmit={save}
      actions={
        <>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save network
          </button>
        </>
      }
    >
      <Choice
        label="Connection"
        value={network}
        options={NETWORK_IDS.map((id) => ({ value: id, label: NETWORKS[id].label }))}
        onChange={setNetwork}
      />
      <Choice
        label="Signal bars"
        value={signal}
        options={SIGNAL_LEVELS.map((n) => ({ value: n, label: String(n) }))}
        onChange={setSignal}
      />
      <div className="networkPreview" aria-hidden="true" inert>
        <StatusBar settings={preview} />
      </div>
      <p className="dialogHint">
        {network === "wifi"
          ? "Signal bars with the Wi-Fi icon."
          : `"${NETWORKS[network].badge}" left of the signal bars, without the Wi-Fi icon.`}
      </p>
    </Modal>
  );
};

/* ---------- Call history ---------- */

const CallDialog = ({ close, dialog }) => {
  const { messageList, setMessageList } = useContext(AppContext);
  const editIndex = dialog.editId ? messageList.findIndex((m) => m.msgId === dialog.editId) : -1;
  const editing = editIndex >= 0 ? messageList[editIndex] : null;
  const start = editing
    ? normalizeCall(editing.call)
    : { media: dialog.media || "voice", direction: "outgoing", result: "answered", durationSec: 65 };
  // The header button decides the kind: the phone icon adds voice calls, the
  // camera icon adds video calls. Editing keeps the kind of the call.
  const media = start.media;
  const [direction, setDirection] = useState(start.direction);
  const [result, setResult] = useState(start.result);
  const [minutes, setMinutes] = useState(String(Math.floor((start.durationSec || 0) / 60)));
  const [seconds, setSeconds] = useState(pad2((start.durationSec || 0) % 60));
  const bounds = editing ? timeBounds(messageList, editIndex) : timeBounds(messageList, messageList.length);
  const [time, setTime] = useState(
    () => editing?.time ?? nextMessageTime(messageList, nowTime())
  );
  const [errors, setErrors] = useState({});

  const answered = result === "answered";
  const duration = answered ? parseDuration(minutes, seconds) : { ok: true, seconds: 0 };
  const preview = callSummary({ media, direction, result, durationSec: duration.ok ? duration.seconds : 1 });

  const save = () => {
    const t = parseTime(time);
    const next = {};
    if (!duration.ok) next.duration = duration.error;
    if (!t.ok) next.time = t.error;
    else if (!timeAllowed(t.value, bounds)) next.time = boundsHint(bounds);
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
      title={`${editing ? "Edit" : "Add"} ${media === "video" ? "video call" : "voice call"}`}
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
        Preview: <b>{preview.title}</b> · {preview.detail} · {displayTime(time)}.{" "}
        {boundsHint(bounds)} Local simulation only, no real call is made.
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

/* ---------- Message time (hold or right-click a bubble) ---------- */

const TimeDialog = ({ close, dialog }) => {
  const { messageList, setMessageList, setDialog } = useContext(AppContext);
  const index = messageList.findIndex((m) => m.msgId === dialog.msgId);
  const message = messageList[index];
  const [h, m] = (message?.time || "00:00").split(":");
  const [hour, setHour] = useState(h);
  const [minute, setMinute] = useState(m);
  const [forwarded, setForwarded] = useState(message?.forwarded === true);
  const [fwdButton, setFwdButton] = useState(message?.forwardButton === true);
  const [error, setError] = useState("");
  if (!message) return null;
  const forwardable = canForward(message);
  const photo = messageType(message) === "image";
  const bounds = timeBounds(messageList, index);
  const parsed = parseMessageTime(hour, minute, bounds);
  // A divider can go above any message except the first one of a day.
  const canInsertDate = index > 0 && messageType(messageList[index - 1]) !== "date";

  const save = () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const extra = forwardable ? { forwarded } : {};
    if (photo) extra.forwardButton = fwdButton;
    setMessageList((list) =>
      list.map((x) => (x.msgId === message.msgId ? { ...x, time: parsed.value, ...extra } : x))
    );
    close();
  };
  const onField = (setter) => (v) => {
    setter(v);
    setError("");
  };

  return (
    <Modal
      title={forwardable ? "Message options" : "Message time"}
      onClose={close}
      onSubmit={save}
      actions={
        <>
          {canInsertDate && (
            <button
              type="button"
              className="aside"
              onClick={() => setDialog({ kind: "date", insertBefore: message.msgId })}
            >
              Add date above
            </button>
          )}
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {forwardable ? "Save" : "Save time"}
          </button>
        </>
      }
    >
      <div className="fieldPair">
        <NumberField label="Hour (00–23)" name="msgHour" value={hour} error={error} onChange={onField(setHour)} />
        <span className="fieldColon">:</span>
        <NumberField label="Minute (00–59)" name="msgMinute" value={minute} error={error} onChange={onField(setMinute)} />
      </div>
      <ErrorText>{error}</ErrorText>
      <p className="dialogHint">
        Shown as <b>{parsed.ok ? displayTime(parsed.value) : "--.--"}</b>. {boundsHint(bounds)}{" "}
        The same time as the message before it is fine.
      </p>
      {forwardable && (
        <Toggle
          label="Forwarded (Diteruskan)"
          checked={forwarded}
          onChange={setForwarded}
          hint="Shows the italic “Diteruskan” label above the message."
        />
      )}
      {photo && (
        <Toggle
          label="Forward button beside the photo"
          checked={fwdButton}
          onChange={setFwdButton}
          hint="The round quick-forward arrow WhatsApp shows next to photos."
        />
      )}
    </Modal>
  );
};

/* ---------- Date divider ---------- */

const DateDialog = ({ close, dialog }) => {
  const { messageList, setMessageList, chatDate, setChatDate } = useContext(AppContext);
  const dateId = useId();
  const top = dialog.target === "top";
  const editIndex = dialog.editId ? messageList.findIndex((m) => m.msgId === dialog.editId) : -1;
  const insertIndex = dialog.insertBefore
    ? messageList.findIndex((m) => m.msgId === dialog.insertBefore)
    : messageList.length;
  const index = top ? -1 : editIndex >= 0 ? editIndex : insertIndex;
  const bounds = dateBounds(messageList, index, chatDate);
  const current = top ? chatDate : editIndex >= 0 ? messageList[editIndex].date : null;
  const [value, setValue] = useState(() => current ?? suggestDate(bounds));
  const [error, setError] = useState("");
  if ((dialog.editId && editIndex < 0) || (dialog.insertBefore && insertIndex < 0)) return null;

  const range =
    bounds.min && bounds.max
      ? `Pick a date from ${dateLabel(bounds.min)} to ${dateLabel(bounds.max)}`
      : bounds.min
        ? `Pick ${dateLabel(bounds.min)} or later`
        : bounds.max
          ? `Pick ${dateLabel(bounds.max)} or earlier`
          : "";

  const save = () => {
    if (!dateAllowed(value, bounds)) {
      setError(`${range || "Pick a valid date"}, so the days stay in order.`);
      return;
    }
    if (top) setChatDate(value);
    else if (editIndex >= 0) {
      setMessageList((list) =>
        list.map((m) => (m.msgId === dialog.editId ? { ...m, date: value } : m))
      );
    } else {
      const divider = { msgId: newId(), type: "date", date: value };
      setMessageList((list) => {
        const at = dialog.insertBefore
          ? list.findIndex((m) => m.msgId === dialog.insertBefore)
          : list.length;
        return at < 0 ? list : [...list.slice(0, at), divider, ...list.slice(at)];
      });
    }
    close();
  };
  const remove = () => {
    setMessageList((list) => list.filter((m) => m.msgId !== dialog.editId));
    close();
  };

  const adding = !top && editIndex < 0;
  return (
    <Modal
      title={adding ? "Add date divider" : "Chat date"}
      onClose={close}
      onSubmit={save}
      actions={
        <>
          {editIndex >= 0 && (
            <button type="button" className="danger" onClick={remove}>
              Delete divider
            </button>
          )}
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {adding ? "Add divider" : "Save date"}
          </button>
        </>
      }
    >
      <div className={`field ${error ? "hasError" : ""}`}>
        <label htmlFor={dateId}>Date</label>
        <input
          id={dateId}
          name="dividerDate"
          type="date"
          value={value}
          min={bounds.min ?? undefined}
          max={bounds.max ?? undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          aria-invalid={error ? true : undefined}
        />
      </div>
      <ErrorText>{error}</ErrorText>
      <p className="dialogHint">
        Shown as <b>{dateAllowed(value, { min: null, max: null }) ? dateLabel(value) : "—"}</b>
        {" "}(today is {dateLabel(isoDate())}: “Hari ini”, yesterday “Kemarin”).
        {adding && !dialog.insertBefore && " Messages you send next appear under this divider."}
        {range && ` ${range}.`}
      </p>
    </Modal>
  );
};

/* ---------- Profile picture ---------- */

const AvatarDialog = ({ close }) => {
  const { contact, setContact, operationRef, setOperation } = useContext(AppContext);
  const fileRef = useRef();
  const [error, setError] = useState("");
  const selected = contact.avatar?.photo ? "photo" : contact.avatar?.color || "gray";

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || operationRef.current) return;
    operationRef.current = "image";
    setOperation("image");
    try {
      // Stays in this browser tab: the photo is never uploaded anywhere.
      const image = await loadImageFile(file);
      setContact((c) => ({ ...c, avatar: { photo: image.src } }));
      setError("");
    } catch (e) {
      setError(e.message === "Not an image" ? "Choose an image file (JPG, PNG, WebP…)." : e.message || "Could not load this image.");
    } finally {
      operationRef.current = null;
      setOperation(null);
    }
  };

  return (
    <Modal
      title="Profile picture"
      onClose={close}
      onSubmit={close}
      actions={
        <button type="submit" className="primary">
          Done
        </button>
      }
    >
      <div className="field" role="radiogroup" aria-label="Avatar color">
        <span className="fieldLabel">No photo: pick a color</span>
        <div className="swatches">
          {AVATAR_COLOR_IDS.map((id) => (
            <button
              type="button"
              key={id}
              role="radio"
              aria-checked={selected === id}
              aria-label={AVATAR_COLORS[id].label}
              title={AVATAR_COLORS[id].label}
              className={`swatch ${selected === id ? "on" : ""}`}
              onClick={() => setContact((c) => ({ ...c, avatar: { color: id } }))}
            >
              <img src={colorAvatar(id)} alt="" />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="fieldLabel">Or use a photo from this device</span>
        <div className="photoRow">
          {selected === "photo" && (
            <img className="photoPreview" src={avatarSrc(contact.avatar)} alt="Current profile photo" />
          )}
          <button type="button" onClick={() => fileRef.current.click()}>
            {selected === "photo" ? "Change photo" : "Upload photo"}
          </button>
          {selected === "photo" && (
            <button type="button" onClick={() => setContact((c) => ({ ...c, avatar: { color: "gray" } }))}>
              Remove photo
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={pickFile}
          aria-label="Profile photo file"
        />
      </div>
      <ErrorText>{error}</ErrorText>
      <p className="dialogHint">The photo stays in this browser and is never uploaded.</p>
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
    case "network":
      return <NetworkDialog {...props} />;
    case "call":
      return <CallDialog key={dialog.editId || dialog.media} {...props} />;
    case "voice":
      return <VoiceDialog {...props} />;
    case "time":
      return <TimeDialog key={dialog.msgId} {...props} />;
    case "date":
      return <DateDialog key={dialog.editId || dialog.insertBefore || dialog.target || "end"} {...props} />;
    case "avatar":
      return <AvatarDialog {...props} />;
    default:
      return null;
  }
};

export default Dialogs;
