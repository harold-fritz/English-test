import type { Question } from "@/types";

export const TEST_SIZE = 60;
export const TEST_DURATION_SECONDS = 60 * 60; // 1 hour

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Select `count` random questions from a pool.
 *
 * Questions the user already answered correctly (stored in localStorage) are
 * excluded first. If not enough unknown questions remain, we fall back to the
 * full pool so the test can always be completed.
 */
export function selectQuestions(
  pool: Question[],
  count: number = TEST_SIZE,
  rand: () => number = Math.random,
  knownIds: Set<string> = new Set()
): Question[] {
  if (pool.length === 0) return [];

  const unknown = pool.filter((q) => !knownIds.has(q.id));
  let chosen = shuffle(unknown, rand).slice(0, count);

  if (chosen.length < count) {
    // Top up with already-known questions (reviewing them is better than a
    // short test) once the fresh pool is exhausted.
    const chosenIds = new Set(chosen.map((q) => q.id));
    const rest = shuffle(
      pool.filter((q) => !chosenIds.has(q.id)),
      rand
    ).slice(0, count - chosen.length);
    chosen = chosen.concat(rest);
  }

  return chosen;
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(mm)}:${pad(sec)}`;
}
