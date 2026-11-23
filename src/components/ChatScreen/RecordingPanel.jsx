import React, { useEffect, useState } from "react";
import { formatClockDuration, recordingFrame, waveformBars } from "../../model";
import { MicIcon, PauseIcon, SendIcon, TrashIcon } from "../Icons";

export const REC_BARS = 46;

/**
 * Progress (0–1) of a recording scene. Video frames pass `progress` directly
 * (frame time, not wall-clock time); live previews and replays derive it from
 * `startedAt` with requestAnimationFrame.
 */
export const useRecordingProgress = (recording) => {
  const fixed = typeof recording?.progress === "number" ? recording.progress : null;
  const [live, setLive] = useState(0);
  useEffect(() => {
    if (!recording || fixed !== null) return undefined;
    let id;
    const sceneMs = Math.max(0.1, recording.sceneSec) * 1000;
    const tick = () => {
      const p = Math.min(1, (performance.now() - recording.startedAt) / sceneMs);
      setLive(p);
      if (p < 1) id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [recording, fixed]);
  return fixed ?? live;
};

/**
 * WhatsApp's locked voice-recording bar (you are recording). It is part of the
 * scene, so it is exported; the trash/send buttons only act on a draft.
 */
const RecordingPanel = ({ recording, onDiscard, onSend }) => {
  const progress = useRecordingProgress(recording);
  const { elapsedSec, visibleBars } = recordingFrame(progress, recording.durationSec, REC_BARS);
  const bars = waveformBars(recording.seed, REC_BARS).slice(0, visibleBars);
  const interactive = recording.mode === "draft";
  return (
    <div className="recPanel" data-progress={progress.toFixed(3)}>
      <div className="recTop">
        <MicIcon className="recMic" />
        <span className="recTimer">{formatClockDuration(elapsedSec)}</span>
        <div className="recWave">
          {bars.map((h, i) => (
            <span key={i} className="recBar" style={{ height: `${Math.round(h * 100)}%` }} />
          ))}
        </div>
      </div>
      <div className="recControls">
        <button
          type="button"
          className="recTrash"
          onClick={interactive ? onDiscard : undefined}
          aria-label="Discard recording"
          title="Discard this simulated recording"
          tabIndex={interactive ? 0 : -1}
        >
          <TrashIcon />
        </button>
        <span className="recPause" aria-hidden="true">
          <PauseIcon />
        </span>
        <button
          type="button"
          className="recSend"
          onClick={interactive ? onSend : undefined}
          aria-label="Send voice message"
          title="Send as a voice message"
          tabIndex={interactive ? 0 : -1}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

export default RecordingPanel;
