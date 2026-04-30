import test from "node:test";
import assert from "node:assert/strict";
import { defaultEstimatedDeliveryFromNow, isPastDeliveryDay } from "./orderLifecycle.js";

test("defaultEstimatedDeliveryFromNow is same calendar date as now + 3 days at 17:00", () => {
  const d = defaultEstimatedDeliveryFromNow();
  const now = new Date();
  const expected = new Date(now);
  expected.setDate(expected.getDate() + 3);
  assert.equal(d.getFullYear(), expected.getFullYear());
  assert.equal(d.getMonth(), expected.getMonth());
  assert.equal(d.getDate(), expected.getDate());
  assert.equal(d.getHours(), 17);
});

test("isPastDeliveryDay is false on delivery day (UTC end not passed)", () => {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 10);
  assert.equal(isPastDeliveryDay(future), false);
});

test("isPastDeliveryDay is true well after delivery day", () => {
  const old = new Date("2020-01-01T12:00:00.000Z");
  assert.equal(isPastDeliveryDay(old), true);
});
