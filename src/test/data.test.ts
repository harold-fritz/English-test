import { describe, it, expect, beforeAll } from "vitest";
import { LEVELS, loadPool } from "@/data";
import type { Question } from "@/types";

const LEVEL_IDS = ["B1", "B2", "C1", "C2", "D1"];
const pools: Record<string, Question[]> = {};

beforeAll(async () => {
  for (const id of LEVEL_IDS) {
    pools[id] = await loadPool(id);
  }
});

describe("question pools integrity", () => {
  it("defines the expected levels B1..D1", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVEL_IDS);
  });

  for (const level of LEVEL_IDS) {
    describe(`level ${level}`, () => {
      it("has at least 600 questions", () => {
        expect(pools[level].length).toBeGreaterThanOrEqual(600);
      });

      it("every question has exactly 5 unique options", () => {
        for (const q of pools[level]) {
          expect(q.options).toHaveLength(5);
          const unique = new Set(q.options.map((o) => o.toLowerCase()));
          expect(unique.size).toBe(5);
        }
      });

      it("every question has a valid answerIndex", () => {
        for (const q of pools[level]) {
          expect(q.answerIndex).toBeGreaterThanOrEqual(0);
          expect(q.answerIndex).toBeLessThan(5);
        }
      });

      it("every question has a non-empty Spanish explanation", () => {
        for (const q of pools[level]) {
          expect(q.explanation.trim().length).toBeGreaterThan(0);
        }
      });

      it("all question ids are unique", () => {
        const ids = new Set(pools[level].map((q) => q.id));
        expect(ids.size).toBe(pools[level].length);
      });

      it("declared count matches the actual pool size", () => {
        const meta = LEVELS.find((l) => l.id === level)!;
        expect(meta.count).toBe(pools[level].length);
      });
    });
  }
});
