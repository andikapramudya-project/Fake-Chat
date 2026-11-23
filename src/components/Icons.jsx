// Filled icons below (MoreIcon, SendIcon) come from Material Icons (Apache 2.0).
const Svg = ({ children, className, ...rest }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

// Stroke icons drawn to match the WhatsApp Android dark header/composer
// reference: rounded caps and joins, ~2px stroke on a 24px grid.
const Line = ({ children, className, width = 2, ...rest }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

export const BackIcon = (p) => (
  <Line {...p}>
    <path d="M20 12H4.6M10.6 5.4 4 12l6.6 6.6" />
  </Line>
);

// Header icons redrawn from the current WhatsApp Android header (2026 refs):
// a rounded-square camera body with a solid lens wedge, and an outlined handset.
export const VideoIcon = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <rect
      x="2.5"
      y="4.8"
      width="14.4"
      height="14.4"
      rx="1.9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
    />
    <path
      d="M17.6 10.4 22.2 7.3v9.4l-4.6-3.1Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
  </svg>
);

// Outlined handset (Material Symbols "call", Apache 2.0), the shape WhatsApp uses.
export const CallIcon = (p) => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false" {...p}>
    <path
      fill="currentColor"
      d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67Z"
    />
  </svg>
);

/** Small filled ▾ next to the handset in "phone only" headers. */
export const DropdownIcon = (p) => (
  <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false" {...p}>
    <path d="M1.6 3.6h8.8a.6.6 0 0 1 .45 1L6.45 9.2a.6.6 0 0 1-.9 0L1.15 4.6a.6.6 0 0 1 .45-1Z" fill="currentColor" />
  </svg>
);

/**
 * WhatsApp forward arrow: a bent shaft with a double chevron head. Used for
 * the "Diteruskan" label and the round quick-forward button beside photos.
 */
export const ForwardIcon = ({ width = 2.2, ...p }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...p}
  >
    <path d="M3.4 18.2v-3.4a4 4 0 0 1 4-4h8.4" />
    <path d="M12.4 6.6 16.6 10.8 12.4 15" />
    <path d="M17.2 6.6 21.4 10.8 17.2 15" />
  </svg>
);

export const MoreIcon = (p) => (
  <Svg {...p}>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </Svg>
);

// WhatsApp's composer "sticker" face: rounded square with a peeled corner.
export const EmojiIcon = (p) => (
  <Line {...p} width={1.9}>
    <path d="M20.6 12.6V7.4a4 4 0 0 0-4-4H7.4a4 4 0 0 0-4 4v9.2a4 4 0 0 0 4 4h5.2l8-8Z" />
    <path d="M12.6 20.6v-3.9a4.1 4.1 0 0 1 4.1-4.1h3.9" />
    <path d="M7.6 13.6a4.6 4.6 0 0 0 3.6 2.4" />
    <circle cx="9" cy="9.6" r=".9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9.6" r=".9" fill="currentColor" stroke="none" />
  </Line>
);

export const AttachIcon = (p) => (
  <Line {...p} width={1.9}>
    <path d="M16.8 7.2v9a4.8 4.8 0 0 1-9.6 0V6.4a3.3 3.3 0 0 1 6.6 0v9.4a1.8 1.8 0 0 1-3.6 0V7.6" />
  </Line>
);

export const CameraIcon = (p) => (
  <Line {...p} width={1.9}>
    <path d="M4.8 6.8h2.7l1.6-2.2h5.8l1.6 2.2h2.7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4.8a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
    <circle cx="12" cy="13" r="3.6" />
  </Line>
);

export const MicIcon = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <rect x="8.6" y="2.6" width="6.8" height="12.2" rx="3.4" fill="currentColor" />
    <path
      d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0M12 17.8v3.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const TrashIcon = (p) => (
  <Line {...p} width={1.9}>
    <path d="M4.5 6.6h15M9.4 6.6V4.4h5.2v2.2M6.4 6.6l.9 12.6a1.6 1.6 0 0 0 1.6 1.4h6.2a1.6 1.6 0 0 0 1.6-1.4l.9-12.6" />
  </Line>
);

export const PlayIcon = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <path d="M7 4.2v15.6a.8.8 0 0 0 1.2.7l12.3-7.8a.8.8 0 0 0 0-1.4L8.2 3.5a.8.8 0 0 0-1.2.7Z" fill="currentColor" />
  </svg>
);

export const PauseIcon = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
  </svg>
);

export const PersonIcon = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <circle cx="12" cy="8.2" r="4" fill="currentColor" />
    <path d="M4.4 19.4c0-3.3 3.4-5.6 7.6-5.6s7.6 2.3 7.6 5.6v.6H4.4Z" fill="currentColor" />
  </svg>
);

export const SendIcon = (p) => (
  <Svg {...p}>
    <path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
  </Svg>
);

// Your own "no photo" avatar on voice notes (violet, like WhatsApp dark theme).
// The contact avatar comes from model.js (gray by default, or a chosen color/photo).
const avatarSvg = (bg, fg) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 212 212"><rect width="212" height="212" fill="${bg}"/><circle cx="106" cy="88" r="21" fill="${fg}"/><path d="M66 140c0-17 18-27 40-27s40 10 40 27v6H66z" fill="${fg}"/></svg>`
  );
export const SELF_AVATAR = avatarSvg("#242446", "#a690fd");

const HANDSET =
  "M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z";
const CAMERA =
  "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z";

/**
 * Call-card glyph like WhatsApp: a filled handset (or camera) with the call
 * direction arrow in its corner. Incoming points in, outgoing points out.
 */
export const CallCardIcon = ({ media, direction, ...p }) => {
  const video = media === "video";
  const arrow =
    direction === "incoming"
      ? video
        ? "M21 3.6 16.2 8.4M16.2 4.6v3.8H20"
        : "M20.6 3.4 14.6 9.4M14.6 5v4.4H19"
      : video
        ? "M16.2 8.4 21 3.6M17.2 3.6H21v3.8"
        : "M14.6 9.4 20.6 3.4M16.2 3.4h4.4v4.4";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
      {video ? (
        <path d={CAMERA} fill="currentColor" transform="translate(-0.2 4.6) scale(0.82)" />
      ) : (
        <path d={HANDSET} fill="currentColor" />
      )}
      <path
        d={arrow}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
