import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Fictional data only.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fake-chat:help-seen", "1"));
  await page.goto("/");
});

const box = (page) => page.getByRole("textbox", { name: "Message", exact: true });
const send = async (page, text) => {
  await box(page).fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
};
const menu = async (page, name, role = "menuitem") => {
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole(role, { name, exact: true }).click();
};
const closeMenu = (page) => page.keyboard.press("Escape");
const dialog = (page) => page.getByRole("dialog");

const setClock = async (page, h, m) => {
  await page.locator(".sbTime").click();
  await dialog(page).getByLabel("Hour (00–23)").fill(h);
  await dialog(page).getByLabel("Minute (00–59)").fill(m);
  await dialog(page).getByRole("button", { name: "Save clock" }).click();
};
const setBattery = async (page, v) => {
  await page.locator(".sbBatteryBtn").click();
  await dialog(page).getByLabel("Battery (0–100)").fill(v);
  await dialog(page).getByRole("button", { name: "Save battery" }).click();
};

test("clock accepts 00:00 and 23:59, rejects invalid input, cancel keeps value", async ({ page }) => {
  await setClock(page, "0", "0");
  await expect(page.locator(".sbTime")).toHaveText("00:00");
  await setClock(page, "23", "59");
  await expect(page.locator(".sbTime")).toHaveText("23:59");

  await page.locator(".sbTime").click();
  await dialog(page).getByLabel("Hour (00–23)").fill("24");
  await dialog(page).getByRole("button", { name: "Save clock" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("00 to 23");
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator(".sbTime")).toHaveText("23:59");
  // Sending a message never changes the status bar clock.
  await send(page, "Jam tidak berubah");
  await expect(page.locator(".sbTime")).toHaveText("23:59");
});

for (const level of [0, 1, 58, 59, 100]) {
  test(`battery ${level}% shows number and fill on both presets`, async ({ page }) => {
    await setBattery(page, String(level));
    await expect(page.locator(".pxBatteryNum")).toHaveText(String(level));
    const ratio = await page.locator(".pxBatteryFill").evaluate(
      (el) => el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width
    );
    expect(ratio).toBeCloseTo(level / 100, 2);
    await menu(page, "Poco X7 5G", "menuitemradio");
    await closeMenu(page);
    await expect(page.locator(".pcBatteryNum")).toHaveText(`${level}%`);
    const pocoRatio = await page.locator(".pcBatteryFill").evaluate(
      (el) => el.getBoundingClientRect().width / el.parentElement.clientWidth
    );
    expect(pocoRatio).toBeLessThanOrEqual(level / 100 + 0.01);
    expect(pocoRatio).toBeGreaterThanOrEqual(level / 100 - 0.2);
  });
}

test("battery rejects values outside 0–100", async ({ page }) => {
  await page.locator(".sbBatteryBtn").click();
  await dialog(page).getByLabel("Battery (0–100)").fill("101");
  await dialog(page).getByRole("button", { name: "Save battery" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("0 to 100");
  await page.keyboard.press("Escape");
  await expect(page.locator(".pxBatteryNum")).toHaveText("58");
});

test("switching presets keeps clock and battery and changes the layout", async ({ page }) => {
  await setClock(page, "07", "05");
  await setBattery(page, "59");
  const pixelBox = await page.locator(".phone").boundingBox();
  await menu(page, "Poco X7 5G", "menuitemradio");
  await expect(page.locator(".statusBar")).toHaveAttribute("data-preset", "pocox7");
  await expect(page.getByRole("menuitemradio", { name: "Poco X7 5G" })).toHaveAttribute("aria-checked", "true");
  await closeMenu(page);
  await expect(page.locator(".sbTime")).toHaveText("07:05");
  await expect(page.locator(".pcBatteryNum")).toHaveText("59%");
  await expect(page.locator(".pxBattery")).toHaveCount(0);
  // Same phone size for both presets, so exports are comparable.
  expect(await page.locator(".phone").boundingBox()).toEqual(pixelBox);
  await menu(page, "Pixel 8 Pro", "menuitemradio");
  await closeMenu(page);
  await expect(page.locator(".sbTime")).toHaveText("07:05");
  await expect(page.locator(".pxBatteryNum")).toHaveText("59");
});

test("hiding the contact status centers the name and keeps the text", async ({ page }) => {
  await page.getByLabel("Contact status").fill("terakhir dilihat 10:15");
  await menu(page, "Show contact status", "menuitemcheckbox");
  await closeMenu(page);
  await expect(page.getByLabel("Contact status")).toHaveCount(0);
  const name = await page.getByLabel("Contact name").boundingBox();
  const bar = await page.locator(".appBar").boundingBox();
  expect(Math.abs(name.y + name.height / 2 - (bar.y + bar.height / 2))).toBeLessThan(2);
  await menu(page, "Show contact status", "menuitemcheckbox");
  await closeMenu(page);
  await expect(page.getByLabel("Contact status")).toHaveValue("terakhir dilihat 10:15");
});

const addCall = async (page, media, { direction, result, minutes, seconds, time }) => {
  await page.getByRole("button", { name: `Add ${media} call` }).click();
  const d = dialog(page);
  await d.getByRole("radio", { name: direction }).click();
  await d.getByRole("radio", { name: result }).click();
  if (minutes !== undefined) await d.getByLabel("Minutes").fill(minutes);
  if (seconds !== undefined) await d.getByLabel("Seconds").fill(seconds);
  if (time) await d.getByLabel("Time (HH:mm)").fill(time);
  await d.getByRole("button", { name: "Add call" }).click();
};

test("voice and video call cards for every direction/result, editable and deletable", async ({ page }) => {
  await addCall(page, "voice", { direction: "Incoming", result: "Answered", minutes: "3", seconds: "20", time: "08:15" });
  await addCall(page, "video", { direction: "Outgoing", result: "Answered", minutes: "0", seconds: "45" });
  await addCall(page, "voice", { direction: "Incoming", result: "Missed" });
  await addCall(page, "voice", { direction: "Outgoing", result: "Missed" });
  await addCall(page, "video", { direction: "Outgoing", result: "Cancelled" });
  await addCall(page, "video", { direction: "Incoming", result: "Cancelled" });

  const cards = page.locator(".callMsg");
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0)).toContainText("Voice call");
  await expect(cards.nth(0)).toContainText("3 min 20 sec");
  await expect(cards.nth(0)).toContainText("08:15");
  await expect(cards.nth(0)).toHaveClass(/ml/);
  await expect(cards.nth(1)).toContainText("Video call");
  await expect(cards.nth(1)).toContainText("45 sec");
  await expect(cards.nth(1)).toHaveClass(/mr/);
  await expect(cards.nth(2)).toContainText("Missed voice call");
  await expect(cards.nth(3)).toContainText("No answer");
  await expect(cards.nth(3)).not.toContainText("Missed");
  await expect(cards.nth(4)).toContainText("Cancelled");
  await expect(cards.nth(5)).toContainText("Missed video call");
  // No call-length text on calls that never connected.
  for (const i of [2, 3, 4, 5]) await expect(cards.nth(i)).not.toContainText(/\d+ (sec|min)/);
  // Call cards have no read ticks.
  await expect(page.locator(".callMsg .ticks")).toHaveCount(0);

  // Edit: change the first call to missed; duration disappears.
  await cards.nth(0).getByRole("button").click();
  await dialog(page).getByRole("radio", { name: "Missed" }).click();
  await expect(dialog(page).getByLabel("Minutes")).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Save call" }).click();
  await expect(cards.nth(0)).toContainText("Missed voice call");
  await expect(cards.nth(0)).not.toContainText("3 min");

  // Delete.
  await cards.nth(1).getByRole("button").click();
  await dialog(page).getByRole("button", { name: "Delete call" }).click();
  await expect(cards).toHaveCount(5);
});

test("call dialog validates duration and time", async ({ page }) => {
  await page.getByRole("button", { name: "Add voice call" }).click();
  await dialog(page).getByLabel("Minutes").fill("0");
  await dialog(page).getByLabel("Seconds").fill("0");
  await dialog(page).getByLabel("Time (HH:mm)").fill("25:00");
  await dialog(page).getByRole("button", { name: "Add call" }).click();
  await expect(dialog(page).getByRole("alert")).toHaveCount(2);
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".callMsg")).toHaveCount(0);
});

const startVoice = async (page, { sender, minutes = "0", seconds = "13", scene } = {}) => {
  await page.getByRole("button", { name: "Record voice message" }).click();
  const d = dialog(page);
  if (sender) await d.getByRole("radio", { name: sender }).click();
  await d.getByLabel("Voice note minutes").fill(minutes);
  await d.getByLabel("Seconds").fill(seconds);
  if (scene) await d.getByLabel(/Recording scene/).fill(scene);
  await d.getByRole("button", { name: "Start simulation" }).click();
};

test("outgoing and incoming voice messages", async ({ page }) => {
  await startVoice(page, { minutes: "2", seconds: "05" });
  await expect(page.locator(".recPanel")).toBeVisible();
  await expect(page.locator(".recPanel .recTimer")).toHaveText("2:05", { timeout: 5000 });
  await page.getByRole("button", { name: "Send voice message" }).click();
  await expect(page.locator(".recPanel")).toHaveCount(0);
  const mine = page.locator(".voiceMsg.mr");
  await expect(mine).toHaveCount(1);
  await expect(mine.locator(".voiceDuration")).toHaveText("2:05");
  await expect(mine.locator(".ticks")).toHaveCount(1);

  await startVoice(page, { sender: "Them", seconds: "7" });
  await expect(page.locator(".recordingStatus")).toHaveText("recording audio…");
  await page.locator(".themRecording").getByRole("button", { name: "Send" }).click();
  const theirs = page.locator(".voiceMsg.ml");
  await expect(theirs).toHaveCount(1);
  await expect(theirs.locator(".voiceDuration")).toHaveText("0:07");
  await expect(theirs.locator(".ticks")).toHaveCount(0);
  await expect(page.getByLabel("Contact status")).toHaveValue("online");

  // The waveform is stable across re-renders.
  const bars = () => mine.locator(".voiceBar").evaluateAll((els) => els.map((e) => e.style.height).join());
  const before = await bars();
  await send(page, "Render ulang");
  expect(await bars()).toBe(before);

  // Simulated playback is visual only.
  await mine.getByRole("button", { name: "Play voice message preview" }).click();
  await expect(mine.getByRole("button", { name: "Pause voice message preview" })).toBeVisible();
  await mine.getByRole("button", { name: "Pause voice message preview" }).click();
});

test("voice simulation can be cancelled or discarded, and text still sends", async ({ page }) => {
  await page.getByRole("button", { name: "Record voice message" }).click();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".recPanel")).toHaveCount(0);

  await startVoice(page);
  await page.getByRole("button", { name: "Discard recording" }).click();
  await expect(page.locator(".recPanel")).toHaveCount(0);
  await expect(page.locator(".voiceMsg")).toHaveCount(0);

  await page.getByRole("button", { name: "Record voice message" }).click();
  await dialog(page).getByLabel("Voice note minutes").fill("0");
  await dialog(page).getByLabel("Seconds").fill("0");
  await dialog(page).getByRole("button", { name: "Start simulation" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("at least 1 second");
  await page.keyboard.press("Escape");

  await box(page).fill("Teks tetap terkirim");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".message")).toHaveText(/Teks tetap terkirim/);
  await expect(dialog(page)).toHaveCount(0);
});

test("PNG of the recording scene excludes dialogs and keeps the draft", async ({ page }) => {
  await send(page, "Sebelum rekaman");
  await startVoice(page);
  await expect(page.locator(".recPanel .recTimer")).toHaveText("0:13", { timeout: 5000 });
  const downloadPromise = page.waitForEvent("download");
  await menu(page, "Take screenshot");
  const bytes = await readFile(await (await downloadPromise).path());
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  await expect(page.locator(".recPanel")).toBeVisible();
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
  // Status bar buttons do not keep focus after an export.
  expect(await page.evaluate(() => document.activeElement?.className || "")).not.toMatch(/sbTime|sbBatteryBtn/);
});

test("cancel video restores mixed chat and the recording draft", async ({ page }) => {
  await send(page, "Teks");
  await addCall(page, "voice", { direction: "Incoming", result: "Missed" });
  await startVoice(page);
  await page.getByRole("button", { name: "Send voice message" }).click();
  await startVoice(page, { seconds: "9" });
  await menu(page, "Save video");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".loading")).toBeHidden();
  await expect(page.locator(".message")).toHaveCount(3);
  await expect(page.locator(".recPanel")).toBeVisible();
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
});

test("replay plays the recording scene before the voice note, cancel restores", async ({ page }) => {
  await send(page, "Halo");
  await startVoice(page, { seconds: "30", scene: "2" });
  await page.getByRole("button", { name: "Send voice message" }).click();
  await menu(page, "Replay chat");
  await expect(page.locator(".message")).toHaveCount(1, { timeout: 4000 });
  await expect(page.locator(".recPanel")).toBeVisible({ timeout: 4000 });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(2);
  await expect(page.locator(".recPanel")).toHaveCount(0);
});

test("video with text, photo, call and voice note has the timeline length", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await send(page, "Cerita fiksi");
  await page.locator(".chatScreen input[type=file]").setInputFiles("docs/chat.png");
  await expect(page.locator(".imageMsg")).toHaveCount(1);
  await addCall(page, "video", { direction: "Outgoing", result: "Answered", minutes: "1", seconds: "5" });
  // 30-minute voice note, 2-second scene: the video must not wait 30 minutes.
  await startVoice(page, { sender: "Them", minutes: "30", seconds: "0", scene: "2" });
  await page.locator(".themRecording").getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".message")).toHaveCount(4);

  const downloadPromise = page.waitForEvent("download", { timeout: 140_000 });
  await menu(page, "Save video");
  const download = await downloadPromise;
  const bytes = await readFile(await download.path());
  const metadata = await page.evaluate(async ({ data, type }) => {
    const video = document.createElement("video");
    const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([raw], { type }));
    try {
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Exported video cannot be decoded"));
        video.src = url;
      });
      return { duration: video.duration, width: video.videoWidth };
    } finally {
      URL.revokeObjectURL(url);
    }
  }, { data: bytes.toString("base64"), type: download.suggestedFilename().endsWith("mp4") ? "video/mp4" : "video/webm" });
  // 1 lead-in + 3×2 gaps + 2 scene + 2.5 tail = 11.5 s.
  expect(metadata.duration).toBeCloseTo(11.5, 0);
  expect(metadata.width).toBeGreaterThan(0);
  await expect(page.locator(".message")).toHaveCount(4);
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
});
