import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fake-chat:help-seen", "1"));
  await page.goto("/");
});

const send = async (page, text) => {
  await page.getByRole("textbox", { name: "Message", exact: true }).fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
};
const menu = async (page, name) => {
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
};

test("project identity and repository point to Andika", async ({ page }) => {
  await expect(page).toHaveTitle("Fake Chat — Andika Pramudya");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByText("Maintained by Andika Pramudya")).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("menuitem", { name: "Source code" }).click();
  const popup = await popupPromise;
  expect(popup.url()).toBe("https://github.com/andikapramudya-project/Fake-Chat");
  await popup.close();
});

test("two senders and switching an existing message", async ({ page }) => {
  await send(page, "Halo Andika");
  await page.getByRole("button", { name: "Sending as you. Click to switch." }).click();
  await send(page, "Halo juga");
  await expect(page.locator(".message.mr")).toHaveCount(1);
  await expect(page.locator(".message.ml")).toHaveCount(1);
  await page.locator(".message.ml").dblclick();
  await expect(page.locator(".message.mr")).toHaveCount(2);
});

test("cancel replay restores all messages and unlocks editing", async ({ page }) => {
  await send(page, "Pertama");
  await send(page, "Kedua");
  await menu(page, "Replay chat");
  await expect(page.locator(".phone")).toHaveAttribute("inert", "");
  await expect(page.locator(".message")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(2);
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
  await send(page, "Ketiga");
  await expect(page.locator(".message")).toHaveCount(3);
});

test("completed replay preserves the conversation", async ({ page }) => {
  await send(page, "Selesai");
  await menu(page, "Replay chat");
  await expect(page.locator(".loading")).toBeHidden({ timeout: 6000 });
  await expect(page.locator(".message")).toHaveText(/Selesai/);
});

test("clear requires confirmation", async ({ page }) => {
  await send(page, "Jangan hilang");
  page.once("dialog", (dialog) => dialog.dismiss());
  await menu(page, "Clear chat");
  await expect(page.locator(".message")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await menu(page, "Clear chat");
  await expect(page.locator(".message")).toHaveCount(0);
});

test("PNG export downloads a real image and releases editor lock", async ({ page }) => {
  await send(page, "Contoh fiksi untuk screenshot");
  const downloadPromise = page.waitForEvent("download");
  await menu(page, "Take screenshot");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^fake-chat-\d+\.png$/);
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(bytes.length).toBeGreaterThan(10000);
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
});

test("image errors are visible and keep caption, valid image exports", async ({ page }) => {
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Caption tetap ada");
  const dialogPromise = page.waitForEvent("dialog");
  await page.locator(".chatScreen input[type=file]").setInputFiles({
    name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image"),
  });
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain("Could not read image");
  await dialog.accept();
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("Caption tetap ada");
  await page.locator(".chatScreen input[type=file]").setInputFiles("docs/chat.png");
  await expect(page.locator(".imageMsg")).toHaveCount(1);
  await expect(page.locator(".caption")).toContainText("Caption tetap ada");
  const downloadPromise = page.waitForEvent("download");
  await menu(page, "Take screenshot");
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.png$/);
});

test("cancel video restores chat even before encoder startup", async ({ page }) => {
  await send(page, "Video fiksi");
  await menu(page, "Save video");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".loading")).toBeHidden();
  await expect(page.locator(".message")).toHaveCount(1);
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
});

test("video export downloads a playable clip and restores chat", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await send(page, "Cerita fiksi Andika");
  const downloadPromise = page.waitForEvent("download", { timeout: 80_000 });
  await menu(page, "Save video");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
  const bytes = await readFile(await download.path());
  expect(bytes.length).toBeGreaterThan(1000);
  const metadata = await page.evaluate(async ({ data, type }) => {
    const video = document.createElement("video");
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    try {
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Exported video cannot be decoded"));
        video.src = url;
      });
      return { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }, { data: bytes.toString("base64"), type: download.suggestedFilename().endsWith("mp4") ? "video/mp4" : "video/webm" });
  expect(metadata.duration).toBeCloseTo(3.5, 0);
  expect(metadata.width).toBeGreaterThan(0);
  expect(metadata.height).toBeGreaterThan(0);
  await expect(page.locator(".message")).toHaveCount(1);
  await expect(page.locator(".phone")).not.toHaveAttribute("inert");
});
