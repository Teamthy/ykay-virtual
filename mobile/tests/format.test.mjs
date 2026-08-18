// Unit tests for the pure mobile formatters (Node's built-in test runner —
// no Jest/Expo runtime needed). Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";

import { formatNaira, formatRating, formatDate, formatDateTime, slugToTitle } from "../src/lib/format.mjs";

test("formatNaira formats whole naira", () => {
  assert.equal(formatNaira(50000), "₦50,000");
  assert.equal(formatNaira(0), "₦0");
  assert.equal(formatNaira(1234567), "₦1,234,567");
});

test("formatNaira handles non-finite", () => {
  assert.equal(formatNaira(NaN), "₦0");
});

test("formatRating handles zero reviews", () => {
  assert.equal(formatRating(0, 0), "No reviews yet");
});

test("formatRating pluralizes", () => {
  assert.equal(formatRating(4.5, 1), "4.5★ · 1 review");
  assert.equal(formatRating(3, 3), "3.0★ · 3 reviews");
});

test("formatDate returns dash for empty", () => {
  assert.equal(formatDate(""), "-");
  assert.equal(formatDate(undefined), "-");
});

test("slugToTitle capitalizes words", () => {
  assert.equal(slugToTitle("igcse-maths"), "Igcse Maths");
  assert.equal(slugToTitle(""), "");
});
