import React from "react";
import { NETWORKS, batteryFill, batteryLook, formatClock, signalBars } from "../../model";
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

// Unlit bars stay visible but dimmed, like Android (reference: 3 of 4 bars).
const PixelSignal = ({ bars = 4 }) => (
  <svg className="sbSignal" viewBox="0 0 18 16" aria-hidden="true" data-bars={bars}>
    {[
      [0.6, 10.4],
      [5.2, 7.2],
      [9.8, 4],
      [14.4, 0.8],
    ].map(([x, y], i) => (
      <rect
        key={x}
        x={x}
        y={y}
        width="3"
        height={15.2 - y}
        rx="1.5"
        fill="currentColor"
        className={i < bars ? "lit" : "unlit"}
      />
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

const PocoSignal = ({ bars = 4 }) => (
  <svg className="sbSignal" viewBox="0 0 17 14" aria-hidden="true" data-bars={bars}>
    {[
      [0.5, 9.5],
      [4.7, 6.5],
      [8.9, 3.5],
      [13.1, 0.5],
    ].map(([x, y], i) => (
      <rect
        key={x}
        x={x}
        y={y}
        width="2.6"
        height={13.5 - y}
        rx="0.5"
        fill="currentColor"
        className={i < bars ? "lit" : "unlit"}
      />
    ))}
  </svg>
);

/** Charging bolt drawn where the battery terminal would be. */
const Bolt = ({ className }) => (
  <svg className={className} viewBox="0 0 10 16" aria-hidden="true">
    <path d="M6.4.6 1 9h3.6l-1 6.4L9 7H5.4L6.4.6Z" fill="currentColor" />
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

/*
 * Battery looks (see batteryLook in model.js):
 *   normal   white fill (Pixel) / white outline (Poco)
 *   charging green fill, dark number and a bolt instead of the terminal
 *   low      red fill, automatic below 20% or forced
 */
const PixelBattery = ({ level, mode }) => {
  const look = batteryLook(level, mode);
  return (
    <span className={`pxBatteryWrap look-${look}`} data-look={look}>
      <span className="pxBattery" data-digits={String(level).length}>
        <span className="pxBatteryFill" style={{ width: `${batteryFill(level) * 100}%` }} />
        <span className="pxBatteryNum">{level}</span>
      </span>
      {look === "charging" && <Bolt className="sbBolt" />}
    </span>
  );
};

const PocoBattery = ({ level, mode }) => {
  const look = batteryLook(level, mode);
  return (
    <span className={`pcBatteryWrap look-${look}`} data-look={look}>
      <span className="pcBatteryNum">{level}%</span>
      <span className="pcBattery">
        <span className="pcBatteryFill" style={{ width: `${batteryFill(level) * 100}%` }} />
      </span>
      {look === "charging" && <Bolt className="sbBolt" />}
    </span>
  );
};

const StatusBar = ({ settings, onClockClick, onBatteryClick, onNetworkClick }) => {
  const { preset, hour, minute, battery, batteryMode } = settings;
  const time = formatClock(hour, minute);
  const pixel = preset !== "pocox7";
  const network = NETWORKS[settings.network] ? settings.network : "wifi";
  const { badge, label } = NETWORKS[network];
  const bars = signalBars(settings.signal);
  const look = batteryLook(battery, batteryMode);
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
        <button
          type="button"
          className="sbNetworkBtn"
          onClick={onNetworkClick}
          data-network={network}
          aria-label={`Network ${label}, signal ${bars} of 4. Click to change.`}
          title="Click to change Wi-Fi / LTE / 5G and signal strength"
        >
          {badge && <span className="sbBadge">{badge}</span>}
          {pixel ? <PixelSignal bars={bars} /> : <PocoSignal bars={bars} />}
          {!badge && (pixel ? <PixelWifi /> : <PocoWifi />)}
        </button>
        <button
          type="button"
          className="sbBatteryBtn"
          onClick={onBatteryClick}
          aria-label={`Battery ${battery}%${look === "normal" ? "" : `, ${look}`}. Click to change.`}
          title="Click to change the battery level and charging state"
        >
          {pixel ? (
            <PixelBattery level={battery} mode={batteryMode} />
          ) : (
            <PocoBattery level={battery} mode={batteryMode} />
          )}
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
