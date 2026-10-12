import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUsdc, amount } from "./amounts";
test("USDC decimal conversion preserves six decimals without floating point rounding", () => {
  assert.equal(parseUsdc("0.000001"), 1n);
  assert.equal(parseUsdc("213.580001"), 213580001n);
  assert.equal(amount(213580001n), "213.580001");
  assert.equal(parseUsdc("18446744073709.551615"), 18446744073709551615n);
});
test("invalid and overflowing transfer amounts are rejected", () => {
  for (const s of [
    "0",
    "-10",
    "1e6",
    "1.0000001",
    "NaN",
    "10 USDC",
    "18446744073709.551616",
  ])
    assert.throws(() => parseUsdc(s));
});
