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
  await expect(cards.nth(0)).toContainText("Telepon suara");
  await expect(cards.nth(0)).toContainText("3 mnt 20 dtk");
  await expect(cards.nth(0)).toContainText("08.15");
  await expect(cards.nth(0)).toHaveClass(/ml/);
  await expect(cards.nth(1)).toContainText("Panggilan video");
  await expect(cards.nth(1)).toContainText("45 dtk");
  await expect(cards.nth(1)).toHaveClass(/mr/);
  await expect(cards.nth(2)).toContainText("Telepon suara tak terjawab");
  await expect(cards.nth(2)).toContainText("Ketuk untuk menelepon balik");
  await expect(cards.nth(2)).toHaveClass(/missed/);
  await expect(cards.nth(3)).toContainText("Tidak dijawab");
  await expect(cards.nth(3)).not.toContainText("tak terjawab");
  await expect(cards.nth(3)).not.toHaveClass(/missed/);
  await expect(cards.nth(4)).toContainText("Dibatalkan");
  await expect(cards.nth(5)).toContainText("Panggilan video tak terjawab");
  // No call-length text on calls that never connected.
  for (const i of [2, 3, 4, 5]) await expect(cards.nth(i)).not.toContainText(/\d+ (dtk|mnt)/);
  // Call cards have no read ticks.
  await expect(page.locator(".callMsg .ticks")).toHaveCount(0);

  // Edit: change the first call to missed; duration disappears.
  await cards.nth(0).getByRole("button").click();
  await dialog(page).getByRole("radio", { name: "Missed" }).click();
  await expect(dialog(page).getByLabel("Minutes")).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Save call" }).click();
  await expect(cards.nth(0)).toContainText("Telepon suara tak terjawab");
  await expect(cards.nth(0)).not.toContainText("3 mnt");

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
  await expect(page.locator(".recordingStatus")).toHaveText("merekam audio…");
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

/* ---------- Header call buttons, avatar, dates and message times ---------- */

test("phone icon only adds voice calls, camera icon only video calls", async ({ page }) => {
  await page.getByRole("button", { name: "Add voice call" }).click();
  await expect(dialog(page).getByRole("heading")).toHaveText("Add voice call");
  await expect(dialog(page).getByRole("radio", { name: "Video" })).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Add call" }).click();
  await page.getByRole("button", { name: "Add video call" }).click();
  await expect(dialog(page).getByRole("heading")).toHaveText("Add video call");
  await dialog(page).getByRole("button", { name: "Add call" }).click();
  const cards = page.locator(".callMsg");
  await expect(cards.nth(0)).toHaveAttribute("data-media", "voice");
  await expect(cards.nth(1)).toHaveAttribute("data-media", "video");
  // Editing keeps the kind of call.
  await cards.nth(1).getByRole("button").click();
  await expect(dialog(page).getByRole("heading")).toHaveText("Edit video call");
});

test("call card fits its content, with a bold title and the time on the detail line", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await addCall(page, "voice", { direction: "Outgoing", result: "Answered", minutes: "0", seconds: "13", time: "16:02" });
  const card = page.locator(".callMsg");
  await expect(card).toContainText("Telepon suara");
  await expect(card).toContainText("13 dtk");
  await expect(card.locator(".meta")).toHaveText("16.02");
  const weight = await card.locator(".callTitle").evaluate((el) => Number(getComputedStyle(el).fontWeight));
  expect(weight).toBeGreaterThanOrEqual(600);
  const detail = await card.locator(".callDetail").boundingBox();
  const meta = await card.locator(".meta").boundingBox();
  expect(Math.abs(detail.y + detail.height - (meta.y + meta.height))).toBeLessThan(6);
  const cardBox = await card.boundingBox();
  const screen = await page.locator(".chatMessages").boundingBox();
  expect(cardBox.width).toBeLessThan(screen.width * 0.6);
});

test("message times use a dot and new messages never go back in time", async ({ page }) => {
  await send(page, "Pertama");
  const first = page.locator(".message").first();
  await expect(first.locator(".meta")).toHaveText(/^\d{2}\.\d{2}$/);
  // Move the first message to 23:59; the next message cannot be earlier.
  await first.click({ button: "right" });
  await dialog(page).getByLabel("Hour (00–23)").fill("23");
  await dialog(page).getByLabel("Minute (00–59)").fill("59");
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(first.locator(".meta")).toHaveText("23.59");
  await send(page, "Kedua");
  await expect(page.locator(".message").nth(1).locator(".meta")).toHaveText("23.59");
});

test("hold or right-click a message to change its time within its neighbours", async ({ page }) => {
  await addCall(page, "voice", { direction: "Outgoing", result: "Answered", minutes: "0", seconds: "13", time: "09:00" });
  await send(page, "Tengah");
  await addCall(page, "video", { direction: "Incoming", result: "Missed", time: "23:59" });
  const middle = page.locator(".message").nth(1);

  // Right-click (desktop).
  await middle.click({ button: "right" });
  await expect(dialog(page).getByRole("heading")).toHaveText("Message options");
  await expect(dialog(page)).toContainText("09:00 to 23:59");
  await dialog(page).getByLabel("Hour (00–23)").fill("08");
  await dialog(page).getByLabel("Minute (00–59)").fill("59");
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("09:00 to 23:59");
  // Equal to the previous message is allowed.
  await dialog(page).getByLabel("Hour (00–23)").fill("09");
  await dialog(page).getByLabel("Minute (00–59)").fill("00");
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(middle.locator(".meta")).toHaveText("09.00");

  // Press and hold (touch or mouse) on a call card opens the time editor, not the call editor.
  const call = page.locator(".callMsg").first();
  const b = await call.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(dialog(page).getByRole("heading")).toHaveText("Message time");
  await expect(dialog(page)).toContainText("09:00 or earlier");
  await page.keyboard.press("Escape");
  // A normal click still opens the call editor.
  await call.getByRole("button").click();
  await expect(dialog(page).getByRole("heading")).toHaveText("Edit voice call");
  await page.keyboard.press("Escape");

  // The call dialog follows the same rule.
  await call.getByRole("button").click();
  await dialog(page).getByLabel("Time (HH:mm)").fill("10:00");
  await dialog(page).getByRole("button", { name: "Save call" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("09:00 or earlier");
});

test("date chip says Hari ini, can be changed, and dividers can be added mid-chat", async ({ page }) => {
  const iso = (offset) => page.evaluate((o) => {
    const d = new Date();
    d.setDate(d.getDate() + o);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }, offset);
  await send(page, "Pesan kemarin");
  const chips = page.locator(".dayChip");
  await expect(chips).toHaveText(["Hari ini"]);

  // Top chip → yesterday.
  await chips.first().click();
  await dialog(page).getByLabel("Date").fill(await iso(-1));
  await dialog(page).getByRole("button", { name: "Save date" }).click();
  await expect(chips).toHaveText(["Kemarin"]);

  // Add a divider for today; the next message goes under it with its own clock.
  await menu(page, "Add date divider");
  await expect(dialog(page).getByLabel("Date")).toHaveValue(await iso(0));
  await dialog(page).getByRole("button", { name: "Add divider" }).click();
  await send(page, "Pesan hari ini");
  await expect(chips).toHaveText(["Kemarin", "Hari ini"]);
  const order = await page.locator(".chatInner > .dayChip, .chatInner > .message").evaluateAll((els) =>
    els.map((e) => (e.classList.contains("dayChip") ? `[${e.textContent}]` : e.querySelector(".messageText").textContent))
  );
  expect(order).toEqual(["[Kemarin]", "Pesan kemarin", "[Hari ini]", "Pesan hari ini"]);

  // Dividers stay in order: the second one cannot go before the first.
  await chips.nth(1).click();
  await dialog(page).getByLabel("Date").fill(await iso(-1));
  await dialog(page).getByRole("button", { name: "Save date" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("days stay in order");
  await page.keyboard.press("Escape");

  // Insert a divider above a message from its time editor, then delete it.
  await send(page, "Lusa");
  await chips.first().click();
  await dialog(page).getByLabel("Date").fill(await iso(-3));
  await dialog(page).getByRole("button", { name: "Save date" }).click();
  await page.locator(".message").nth(0).click({ button: "right" });
  await expect(dialog(page).getByRole("button", { name: "Add date above" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator(".message").nth(2).click({ button: "right" });
  await dialog(page).getByRole("button", { name: "Add date above" }).click();
  await expect(dialog(page).getByRole("heading")).toHaveText("Add date divider");
  await dialog(page).getByRole("button", { name: "Add divider" }).click();
  await expect(chips).toHaveCount(3);
  await chips.nth(2).click();
  await dialog(page).getByRole("button", { name: "Delete divider" }).click();
  await expect(chips).toHaveCount(2);
});

test("profile picture: gray by default, color options and a photo from the device", async ({ page }) => {
  const src = () => page.locator(".ppImage").getAttribute("src");
  expect(decodeURIComponent(await src())).toContain("#6a7175");
  await page.getByRole("button", { name: "Change profile picture" }).click();
  await expect(dialog(page).getByRole("radio", { name: "Gray" })).toHaveAttribute("aria-checked", "true");
  await dialog(page).getByRole("radio", { name: "Blue" }).click();
  expect(decodeURIComponent(await src())).toContain("#0e2f44");
  await dialog(page).getByLabel("Profile photo file").setInputFiles("docs/chat.png");
  await expect(dialog(page).getByRole("button", { name: "Remove photo" })).toBeVisible();
  expect(await src()).toMatch(/^data:image\/jpeg/);
  await dialog(page).getByRole("button", { name: "Done" }).click();
  // The contact's voice notes use the same picture.
  await startVoice(page, { sender: "Them" });
  await page.locator(".themRecording").getByRole("button", { name: "Send" }).click();
  expect(await page.locator(".voiceMsg.ml .voiceAvatar img").getAttribute("src")).toBe(await src());
  await page.getByRole("button", { name: "Change profile picture" }).click();
  await dialog(page).getByRole("button", { name: "Remove photo" }).click();
  expect(decodeURIComponent(await src())).toContain("#6a7175");
});

test("composer and chat are in Indonesian", async ({ page }) => {
  await expect(box(page)).toHaveAttribute("placeholder", "Ketik pesan");
});

test("video with date dividers keeps the timeline length", async ({ page }) => {
  test.setTimeout(90_000);
  await send(page, "Satu");
  await menu(page, "Add date divider");
  await dialog(page).getByLabel("Date").fill("2099-01-01");
  await dialog(page).getByRole("button", { name: "Add divider" }).click();
  await send(page, "Dua");
  const downloadPromise = page.waitForEvent("download", { timeout: 80_000 });
  await menu(page, "Save video");
  await downloadPromise;
  await expect(page.locator(".dayChip")).toHaveCount(2);
  await expect(page.locator(".message")).toHaveCount(2);
});
