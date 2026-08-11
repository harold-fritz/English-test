import { describe, it, expect, beforeAll } from "vitest";
import { selectQuestions, formatTime, shuffle, TEST_SIZE } from "@/lib/quiz";
import { loadPool } from "@/data";
import type { Question } from "@/types";

describe("formatTime", () => {
  it("formats seconds as HH:MM:SS", () => {
    expect(formatTime(3600)).toBe("01:00:00");
    expect(formatTime(65)).toBe("00:01:05");
    expect(formatTime(0)).toBe("00:00:00");
  });

  it("never goes negative", () => {
    expect(formatTime(-10)).toBe("00:00:00");
  });
});

describe("shuffle", () => {
  it("keeps every element (permutation)", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(input, () => 0.42);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("selectQuestions", () => {
  let b1: Question[];
  let b2: Question[];
  let c1: Question[];

  beforeAll(async () => {
    b1 = await loadPool("B1");
    b2 = await loadPool("B2");
    c1 = await loadPool("C1");
  });

  it("returns TEST_SIZE questions by default", () => {
    expect(selectQuestions(b1)).toHaveLength(TEST_SIZE);
  });

  it("returns questions only from the requested level", () => {
    for (const q of selectQuestions(c1)) expect(q.level).toBe("C1");
  });

  it("returns no duplicates", () => {
    const qs = selectQuestions(b2);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
  });

  it("excludes known ids", () => {
    const known = new Set(b1.slice(0, 30).map((q) => q.id));
    const qs = selectQuestions(b1, TEST_SIZE, Math.random, known);
    for (const q of qs) expect(known.has(q.id)).toBe(false);
  });

  it("tops up with known questions when the fresh pool is exhausted", () => {
    const known = new Set(b1.slice(10).map((q) => q.id));
    const qs = selectQuestions(b1, TEST_SIZE, Math.random, known);
    expect(qs).toHaveLength(TEST_SIZE);
    expect(qs.filter((q) => !known.has(q.id)).length).toBe(10);
  });

  it("returns an empty array for an empty pool", () => {
    expect(selectQuestions([])).toEqual([]);
  });
});
