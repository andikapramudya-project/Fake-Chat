import test from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../src/timing.js";

test("a normal wait completes", async () => {
  await sleep(1);
});

test("cancelling an active replay wait rejects immediately", async () => {
  const controller = new AbortController();
  const waiting = sleep(60_000, controller.signal);
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });
});

test("an already cancelled replay never waits for its timer", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(sleep(60_000, controller.signal), { name: "AbortError" });
});
