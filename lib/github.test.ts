import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCommitLocalTime } from "./github.ts";

/**
 * GraphQL returns committedDate as a GitTimestamp, which keeps the author's
 * original UTC offset instead of normalising to UTC. Applying that offset on
 * top of the written time — which an earlier version did — turns an 11pm
 * commit in IST into a 4am one and invents a night owl out of nothing.
 */
test("the written wall-clock hour is preserved, whatever the offset", () => {
  assert.deepEqual(parseCommitLocalTime("2026-03-04T23:10:05+05:30"), { hour: 23, weekday: 3 });
  assert.deepEqual(parseCommitLocalTime("2026-03-04T23:10:05Z"), { hour: 23, weekday: 3 });
  assert.deepEqual(parseCommitLocalTime("2026-01-01T00:30:00-08:00"), { hour: 0, weekday: 4 });
  assert.deepEqual(parseCommitLocalTime("2026-12-31T23:59:59+09:00"), { hour: 23, weekday: 4 });
  assert.deepEqual(parseCommitLocalTime("2026-06-15T09:00:00+05:30"), { hour: 9, weekday: 1 });
});

test("malformed timestamps are rejected rather than silently bucketed", () => {
  const malformed = [
    "",
    "garbage",
    "2026-06-15",
    "2026-06-15T09:00:00",
    "2026-13-01T09:00:00Z", // month 13 rolls into next January if unchecked
    "2026-02-30T09:00:00Z", // Feb 30 rolls into March if unchecked
    "2026-00-10T09:00:00Z",
    "2026-06-00T09:00:00Z",
  ];
  for (const value of malformed) {
    assert.equal(parseCommitLocalTime(value), null, `should reject: ${value}`);
  }
});

test("an out-of-range hour is rejected", () => {
  assert.equal(parseCommitLocalTime("2026-06-15T99:00:00Z"), null);
});
