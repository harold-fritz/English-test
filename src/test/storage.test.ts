import { describe, it, expect, beforeEach } from "vitest";
import {
  getKnownIds,
  addKnownIds,
  resetKnownIds,
  knownCount,
} from "@/lib/storage";

describe("storage of known questions", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    expect(getKnownIds("B1").size).toBe(0);
    expect(knownCount("B1")).toBe(0);
  });

  it("adds and persists ids", () => {
    addKnownIds("B1", ["a", "b", "c"]);
    expect(knownCount("B1")).toBe(3);
    expect(getKnownIds("B1").has("b")).toBe(true);
  });

  it("deduplicates ids across calls", () => {
    addKnownIds("B1", ["a", "b"]);
    addKnownIds("B1", ["b", "c"]);
    expect(knownCount("B1")).toBe(3);
  });

  it("keeps levels independent", () => {
    addKnownIds("B1", ["a"]);
    addKnownIds("B2", ["x", "y"]);
    expect(knownCount("B1")).toBe(1);
    expect(knownCount("B2")).toBe(2);
  });

  it("resets a single level", () => {
    addKnownIds("B1", ["a", "b"]);
    resetKnownIds("B1");
    expect(knownCount("B1")).toBe(0);
  });
});
