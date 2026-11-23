import React from "react";
import { batteryFill, formatClock } from "../../model";
import "./index.css";

/*
 * Phone status bar, drawn with local SVG/CSS so it stays sharp in exports.
 *
 * pixel8pro: matches the attached reference screenshots (1008×2244, the
 *   Pixel 8 Pro FHD+ resolution): rounded signal pills, thick Wi-Fi arcs and a
 *   filled battery pill with the percentage inside it.
 * pocox7: HyperOS-style (assumed, no reference screenshot): bold clock, thin
 *   square signal bars, light Wi-Fi arcs and an outlined battery with the
 *   percentage beside it.
 *
 * The clock and battery are buttons for editing, styled to look like plain
 * status bar text (no border, caret or focus ring in exports).
 */

const PixelSignal = () => (
  <svg className="sbSignal" viewBox="0 0 18 16" aria-hidden="true">
    {[
      [0.6, 10.4],
      [5.2, 7.2],
      [9.8, 4],
      [14.4, 0.8],
    ].map(([x, y]) => (
      <rect key={x} x={x} y={y} width="3" height={15.2 - y} rx="1.5" fill="currentColor" />
    ))}
  </svg>
);

const PixelWifi = () => (
  <svg className="sbWifi" viewBox="0 0 20 16" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M2 5.6a11.6 11.6 0 0 1 16 0" />
      <path d="M5.3 9a7 7 0 0 1 9.4 0" />
    </g>
    <circle cx="10" cy="13.3" r="1.9" fill="currentColor" />
  </svg>
);

const PocoSignal = () => (
  <svg className="sbSignal" viewBox="0 0 17 14" aria-hidden="true">
    {[
      [0.5, 9.5],
      [4.7, 6.5],
      [8.9, 3.5],
      [13.1, 0.5],
    ].map(([x, y]) => (
      <rect key={x} x={x} y={y} width="2.6" height={13.5 - y} rx="0.5" fill="currentColor" />
    ))}
  </svg>
);

const PocoWifi = () => (
  <svg className="sbWifi" viewBox="0 0 20 15" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M1.6 5.1a12.2 12.2 0 0 1 16.8 0" />
      <path d="M4.5 8.1a8 8 0 0 1 11 0" />
      <path d="M7.4 11a3.8 3.8 0 0 1 5.2 0" />
    </g>
    <circle cx="10" cy="13.4" r="1.2" fill="currentColor" />
  </svg>
);

const PixelBattery = ({ level }) => (
  <span className="pxBattery" data-digits={String(level).length}>
    <span className="pxBatteryFill" style={{ width: `${batteryFill(level) * 100}%` }} />
    <span className="pxBatteryNum">{level}</span>
  </span>
);

const PocoBattery = ({ level }) => (
  <>
    <span className="pcBatteryNum">{level}%</span>
    <span className="pcBattery">
      <span className="pcBatteryFill" style={{ width: `${batteryFill(level) * 100}%` }} />
    </span>
  </>
);

const StatusBar = ({ settings, onClockClick, onBatteryClick }) => {
  const { preset, hour, minute, battery } = settings;
  const time = formatClock(hour, minute);
  const pixel = preset !== "pocox7";
  return (
    <div className={`statusBar sb-${pixel ? "pixel8pro" : "pocox7"}`} data-preset={preset}>
      <button
        type="button"
        className="sbTime"
        onClick={onClockClick}
        aria-label={`Phone clock ${time}. Click to change.`}
        title="Click to change the phone clock"
      >
        {time}
      </button>
      <div className="sbIcons">
        {pixel ? <PixelSignal /> : <PocoSignal />}
        {pixel ? <PixelWifi /> : <PocoWifi />}
        <button
          type="button"
          className="sbBatteryBtn"
          onClick={onBatteryClick}
          aria-label={`Battery ${battery}%. Click to change.`}
          title="Click to change the battery level"
        >
          {pixel ? <PixelBattery level={battery} /> : <PocoBattery level={battery} />}
        </button>
      </div>
    </div>
  );
};

/** Gesture navigation handle at the bottom of the screen. */
export const NavHandle = ({ preset }) => (
  <div className={`navHandle nh-${preset === "pocox7" ? "pocox7" : "pixel8pro"}`} aria-hidden="true">
    <span />
  </div>
);

export { PixelBattery, PocoBattery };
export default StatusBar;
