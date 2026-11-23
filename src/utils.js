import { getFontEmbedCSS } from "html-to-image";

// Seconds between messages in replays and videos.
export const MESSAGE_GAP = 2;

export { sleep } from "./timing.js";

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const nowTime = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Elements with the "no-export" class (sender toggle, menus, overlays) are left
// out of screenshots and videos.
const exportFilter = (node) => !node.classList?.contains("no-export");

// Font CSS is embedded once and reused, so Roboto shows up in exports
// without re-downloading it for every video frame.
let fontEmbedCSS;
export const exportOptions = async (node, extra = {}) => {
  await document.fonts.ready;
  await Promise.all([...node.querySelectorAll("img")].map((img) => img.decode()));
  if (fontEmbedCSS === undefined) {
    try {
      fontEmbedCSS = await getFontEmbedCSS(node);
    } catch {
      fontEmbedCSS = "";
    }
  }
  return { filter: exportFilter, fontEmbedCSS, ...extra };
};

export const downloadUrl = (url, filename) => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
};

// Load an image file, scale it down (max 1280px) and return a data URL.
// Data URLs keep screenshots/videos reliable, and the smaller size keeps
// video frames fast to render.
const MAX_IMAGE_SIDE = 1280;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const loadImageFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Not an image"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Please choose an image smaller than 15 MB."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ src: canvas.toDataURL("image/jpeg", 0.9), width, height });
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });

// Exports render a copy of the page, and that copy loses the chat's scroll
// position (it would show the oldest messages). This pins the current scroll
// with a transform while `fn` runs, so the export shows what you see.
export const withPinnedScroll = async (phoneEl, fn) => {
  const box = phoneEl.querySelector(".chatMessages");
  const inner = box?.querySelector(".chatInner");
  if (!inner) return fn();
  const top = box.scrollTop;
  inner.style.transform = `translateY(${-top}px)`;
  box.scrollTop = 0;
  try {
    return await fn();
  } finally {
    inner.style.transform = "";
    box.scrollTop = top;
  }
};
