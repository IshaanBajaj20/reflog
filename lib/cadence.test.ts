import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCadence } from "./cadence.ts";
import { makeCalendar } from "./fixtures.ts";

const END_OF_2026 = new Date("2026-12-31T23:59:59Z");

test("longest streak spans consecutive active days and reports its dates", () => {
  const days = [
    { date: "2026-01-01", contributionCount: 1 },
    { date: "2026-01-02", contributionCount: 3 },
    { date: "2026-01-03", contributionCount: 2 },
    { date: "2026-01-04", contributionCount: 0 },
    { date: "2026-01-05", contributionCount: 5 },
  ];
  const cadence = computeCadence(days, END_OF_2026);

  assert.equal(cadence.longestStreak.days, 3);
  assert.equal(cadence.longestStreak.start, "2026-01-01");
  assert.equal(cadence.longestStreak.end, "2026-01-03");
  assert.equal(cadence.activeDays, 4);
  assert.deepEqual(cadence.busiestDay, { date: "2026-01-05", contributionCount: 5 });
});

test("a streak still running at the end of the window is the current streak", () => {
  const cadence = computeCadence(
    [
      { date: "2026-01-01", contributionCount: 0 },
      { date: "2026-01-02", contributionCount: 1 },
      { date: "2026-01-03", contributionCount: 1 },
    ],
    END_OF_2026,
  );
  assert.equal(cadence.currentStreak.days, 2);
  assert.equal(cadence.currentStreak.end, "2026-01-03");
});

test("a year with no contributions reports zeroes rather than NaN or nulls", () => {
  const cadence = computeCadence(makeCalendar(2026, 365, [0]), END_OF_2026);
  assert.equal(cadence.activeDays, 0);
  assert.equal(cadence.longestStreak.days, 0);
  assert.equal(cadence.longestStreak.start, null);
  assert.equal(cadence.currentStreak.days, 0);
  assert.equal(cadence.busiestDay, null);
  assert.equal(cadence.weeklyConsistency, 0);
});

test("an empty calendar does not divide by zero", () => {
  const cadence = computeCadence([], END_OF_2026);
  assert.equal(cadence.totalDays, 0);
  assert.equal(cadence.weeklyConsistency, 0);
  assert.ok(Number.isFinite(cadence.weeklyConsistency));
});

test("future days are excluded, so a partial year is not scored against zeroes", () => {
  // Full-year calendar, but only the first 90 days have happened.
  const days = makeCalendar(2026, 365, [1]);
  const cadence = computeCadence(days, new Date("2026-04-01T00:00:00Z"));

  assert.equal(cadence.totalDays, 91, "Jan 1 to Apr 1 inclusive");
  assert.equal(cadence.activeDays, 91);
  assert.equal(cadence.weeklyConsistency, 1, "consistency is not diluted by the future");
});

test("weekly consistency measures weeks touched, not days — nobody commits daily", () => {
  // One contribution every 7th day: sparse daily, perfect weekly.
  const cadence = computeCadence(
    makeCalendar(2026, 70, [1, 0, 0, 0, 0, 0, 0]),
    END_OF_2026,
  );
  assert.equal(cadence.activeDays, 10);
  assert.equal(cadence.weeklyConsistency, 1);
  assert.equal(cadence.longestStreak.days, 1);
});

test("contributions are bucketed by month", () => {
  const cadence = computeCadence(
    [
      { date: "2026-01-15", contributionCount: 4 },
      { date: "2026-02-15", contributionCount: 6 },
      { date: "2026-12-31", contributionCount: 1 },
    ],
    END_OF_2026,
  );
  assert.equal(cadence.byMonth[0], 4);
  assert.equal(cadence.byMonth[1], 6);
  assert.equal(cadence.byMonth[11], 1);
  assert.equal(cadence.byMonth.length, 12);
});
