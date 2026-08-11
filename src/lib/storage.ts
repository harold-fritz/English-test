/**
 * Persistence of "already known" questions in localStorage.
 *
 * When a user answers a question correctly, its id is stored per level. On the
 * next test of that level those ids are excluded from the random selection, so
 * the user keeps seeing fresh material instead of questions they already know.
 */
const KEY_PREFIX = "english-test:known:";

function storageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function getKnownIds(level: string): Set<string> {
  if (!storageAvailable()) return new Set();
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + level);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function addKnownIds(level: string, ids: string[]): Set<string> {
  const current = getKnownIds(level);
  for (const id of ids) current.add(id);
  if (storageAvailable()) {
    try {
      window.localStorage.setItem(
        KEY_PREFIX + level,
        JSON.stringify([...current])
      );
    } catch {
      /* ignore quota / private-mode errors */
    }
  }
  return current;
}

export function resetKnownIds(level: string): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(KEY_PREFIX + level);
  } catch {
    /* ignore */
  }
}

export function knownCount(level: string): number {
  return getKnownIds(level).size;
}
