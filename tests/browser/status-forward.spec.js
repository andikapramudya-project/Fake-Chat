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

const setBattery = async (page, level, state) => {
  await page.locator(".sbBatteryBtn").click();
  await dialog(page).getByLabel("Battery (0–100)").fill(level);
  if (state) await dialog(page).getByRole("radio", { name: state }).click();
  await dialog(page).getByRole("button", { name: "Save battery" }).click();
  await expect(dialog(page)).toHaveCount(0);
};
const setNetwork = async (page, network, bars) => {
  await page.locator(".sbNetworkBtn").click();
  await dialog(page).getByRole("radio", { name: network, exact: true }).click();
  if (bars) await dialog(page).getByRole("radio", { name: String(bars), exact: true }).click();
  await dialog(page).getByRole("button", { name: "Save network" }).click();
  await expect(dialog(page)).toHaveCount(0);
};
const look = (page) => page.locator("[data-look]");
const fillColor = (page, selector) =>
  page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor);

test("battery is white by default, red below 20% and green with a bolt when charging", async ({ page }) => {
  await expect(look(page)).toHaveAttribute("data-look", "normal");
  expect(await fillColor(page, ".pxBatteryFill")).toBe("rgb(247, 248, 250)");
  await expect(page.locator(".sbBolt")).toHaveCount(0);

  // 20% stays white, 19% turns red on its own.
  await setBattery(page, "20");
  await expect(look(page)).toHaveAttribute("data-look", "normal");
  await setBattery(page, "19");
  await expect(look(page)).toHaveAttribute("data-look", "low");
  expect(await fillColor(page, ".pxBatteryFill")).toBe("rgb(242, 86, 75)");

  // Charging wins, even at a low level, and replaces the terminal with a bolt.
  await setBattery(page, "10", "Charging");
  await expect(look(page)).toHaveAttribute("data-look", "charging");
  expect(await fillColor(page, ".pxBatteryFill")).toBe("rgb(26, 203, 71)");
  await expect(page.locator(".sbBolt")).toBeVisible();
  await expect(page.locator(".pxBatteryNum")).toHaveText("10");

  // Low can be forced at any level.
  await setBattery(page, "80", "Low (red)");
  await expect(look(page)).toHaveAttribute("data-look", "low");
  await expect(page.locator(".sbBolt")).toHaveCount(0);

  // The state survives a preset switch and applies to the Poco battery too.
  await setBattery(page, "70", "Charging");
  await menu(page, "Poco X7 5G", "menuitemradio");
  await closeMenu(page);
  await expect(look(page)).toHaveAttribute("data-look", "charging");
  await expect(page.locator(".pcBatteryNum")).toHaveText("70%");
  expect(await fillColor(page, ".pcBatteryFill")).toBe("rgb(26, 203, 71)");
  await expect(page.locator(".sbBolt")).toBeVisible();
});

test("battery dialog cancel keeps the old state", async ({ page }) => {
  await page.locator(".sbBatteryBtn").click();
  await dialog(page).getByRole("radio", { name: "Charging" }).click();
  await expect(dialog(page).locator("[data-look]")).toHaveAttribute("data-look", "charging");
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(look(page)).toHaveAttribute("data-look", "normal");
});

for (const preset of ["Pixel 8 Pro", "Poco X7 5G"]) {
  test(`network: Wi-Fi, LTE and 5G with 1–4 signal bars on ${preset}`, async ({ page }) => {
    await menu(page, preset, "menuitemradio");
    await closeMenu(page);
    const net = page.locator(".sbNetworkBtn");
    // Default: Wi-Fi with full signal.
    await expect(net).toHaveAttribute("data-network", "wifi");
    await expect(net.locator(".sbWifi")).toBeVisible();
    await expect(net.locator(".sbBadge")).toHaveCount(0);
    await expect(net.locator(".sbSignal .lit")).toHaveCount(4);

    await setNetwork(page, "LTE", 3);
    await expect(net.locator(".sbBadge")).toHaveText("LTE");
    await expect(net.locator(".sbWifi")).toHaveCount(0);
    await expect(net.locator(".sbSignal .lit")).toHaveCount(3);
    await expect(net.locator(".sbSignal .unlit")).toHaveCount(1);
    // The label sits left of the bars.
    const badge = await net.locator(".sbBadge").boundingBox();
    const bars = await net.locator(".sbSignal").boundingBox();
    expect(badge.x + badge.width).toBeLessThanOrEqual(bars.x + 0.5);

    await setNetwork(page, "5G", 1);
    await expect(net.locator(".sbBadge")).toHaveText("5G");
    await expect(net.locator(".sbSignal .lit")).toHaveCount(1);

    await setNetwork(page, "Wi-Fi", 2);
    await expect(net.locator(".sbBadge")).toHaveCount(0);
    await expect(net.locator(".sbWifi")).toBeVisible();
    await expect(net.locator(".sbSignal .lit")).toHaveCount(2);
  });
}

test("network survives a preset switch", async ({ page }) => {
  await setNetwork(page, "5G", 2);
  await menu(page, "Poco X7 5G", "menuitemradio");
  await closeMenu(page);
  await expect(page.locator(".sbBadge")).toHaveText("5G");
  await expect(page.locator(".sbSignal .lit")).toHaveCount(2);
});

test("forwarded label on text, photo and voice; never on calls", async ({ page }) => {
  await send(page, "Pesan terusan fiksi");
  await page.locator(".chatScreen input[type=file]").setInputFiles("docs/chat.png");
  await expect(page.locator(".imageMsg")).toHaveCount(1);
  // A call card: the hold menu only offers the time.
  await page.getByRole("button", { name: "Add voice call" }).click();
  await dialog(page).getByRole("button", { name: "Add call" }).click();
  await expect(dialog(page)).toHaveCount(0);

  const text = page.locator(".message").nth(0);
  await text.click({ button: "right" });
  await expect(dialog(page).getByRole("heading")).toHaveText("Message options");
  await expect(dialog(page).getByLabel("Forward button beside the photo")).toHaveCount(0);
  await dialog(page).getByLabel("Forwarded (Diteruskan)").check();
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(text.locator(".forwarded")).toHaveText("Diteruskan");
  // Label is above the text, inside the bubble.
  const label = await text.locator(".forwarded").boundingBox();
  const body = await text.locator(".messageText").boundingBox();
  expect(label.y + label.height).toBeLessThanOrEqual(body.y + 1);
  expect(await text.locator(".forwarded").evaluate((el) => getComputedStyle(el).fontStyle)).toBe("italic");

  const photo = page.locator(".imageMsg");
  await photo.click({ button: "right" });
  await dialog(page).getByLabel("Forwarded (Diteruskan)").check();
  await dialog(page).getByLabel("Forward button beside the photo").check();
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(photo.locator(".forwarded")).toBeVisible();
  const button = await photo.locator(".fwdButton").boundingBox();
  const bubble = await photo.boundingBox();
  // Your photo: the round button sits left of the bubble, vertically centered.
  expect(button.x + button.width).toBeLessThan(bubble.x);
  expect(Math.abs(button.y + button.height / 2 - (bubble.y + bubble.height / 2))).toBeLessThan(2);
  // Switching sides moves the button to the right of their photo.
  await photo.dblclick();
  await expect(photo).toHaveClass(/\bml\b/);
  const button2 = await photo.locator(".fwdButton").boundingBox();
  const bubble2 = await photo.boundingBox();
  expect(button2.x).toBeGreaterThan(bubble2.x + bubble2.width);

  const call = page.locator(".callMsg");
  await call.click({ button: "right" });
  await expect(dialog(page).getByRole("heading")).toHaveText("Message time");
  await expect(dialog(page).getByLabel("Forwarded (Diteruskan)")).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(call.locator(".forwarded")).toHaveCount(0);

  // Turning it off again removes the label.
  await text.click({ button: "right" });
  await dialog(page).getByLabel("Forwarded (Diteruskan)").uncheck();
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(text.locator(".forwarded")).toHaveCount(0);
});

test("forwarded voice note keeps its label after replay", async ({ page }) => {
  await page.getByRole("button", { name: "Record voice message" }).click();
  await dialog(page).getByLabel(/Recording scene/).fill("1");
  await dialog(page).getByRole("button", { name: "Start simulation" }).click();
  await page.getByRole("button", { name: "Send voice message" }).click();
  const voice = page.locator(".voiceMsg");
  await expect(voice).toHaveCount(1);
  await voice.click({ button: "right" });
  await dialog(page).getByLabel("Forwarded (Diteruskan)").check();
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(voice.locator(".forwarded")).toBeVisible();
  await menu(page, "Replay chat");
  await expect(page.locator(".loading")).toBeHidden({ timeout: 20_000 });
  await expect(page.locator(".voiceMsg .forwarded")).toHaveText("Diteruskan");
});

test("phone-only header hides the video icon; ▾ adds video calls; new icons render", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Add video call" }).locator("svg rect")).toHaveCount(1);
  await menu(page, "Phone icon only (▾)", "menuitemcheckbox");
  await expect(page.getByRole("menuitemcheckbox", { name: "Phone icon only (▾)" })).toHaveAttribute("aria-checked", "true");
  await closeMenu(page);
  await expect(page.locator(".appBarRight")).toHaveAttribute("data-header-calls", "phone");
  await expect(page.locator(".appBarRight svg rect")).toHaveCount(0);
  await expect(page.locator(".appBarCaret")).toBeVisible();

  await page.getByRole("button", { name: "Add voice call" }).click();
  await expect(dialog(page).getByRole("heading")).toHaveText("Add voice call");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add video call" }).click();
  await expect(dialog(page).getByRole("heading")).toHaveText("Add video call");
  await page.keyboard.press("Escape");

  await menu(page, "Phone icon only (▾)", "menuitemcheckbox");
  await closeMenu(page);
  await expect(page.locator(".appBarCaret")).toHaveCount(0);
  await expect(page.locator(".appBarRight")).toHaveAttribute("data-header-calls", "both");
});

test("PNG export shows the charging battery, 5G label and forwarded bubble", async ({ page }) => {
  await setBattery(page, "70", "Charging");
  await setNetwork(page, "5G", 3);
  await send(page, "Diteruskan untuk ekspor");
  await page.locator(".message").first().click({ button: "right" });
  await dialog(page).getByLabel("Forwarded (Diteruskan)").check();
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();

  const downloadPromise = page.waitForEvent("download");
  await menu(page, "Take screenshot");
  const download = await downloadPromise;
  const data = (await readFile(await download.path())).toString("base64");
  // Count the green battery pixels in the top strip of the exported image.
  const green = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const strip = ctx.getImageData(0, 0, img.width, Math.round(img.height * 0.04)).data;
    let count = 0;
    for (let i = 0; i < strip.length; i += 4) {
      if (Math.abs(strip[i] - 26) < 20 && Math.abs(strip[i + 1] - 203) < 20 && Math.abs(strip[i + 2] - 71) < 20) count++;
    }
    return count;
  }, data);
  expect(green).toBeGreaterThan(50);
  await expect(page.locator(".phone .forwarded")).toBeVisible();
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
});
