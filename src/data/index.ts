import type { Question, LevelMeta } from "@/types";
import levelsJson from "./questions/levels.json";

export const LEVELS = levelsJson as LevelMeta[];

// Each pool is imported dynamically so only the selected level's JSON is
// downloaded, keeping the initial bundle small.
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  B1: () => import("./questions/B1.json"),
  B2: () => import("./questions/B2.json"),
  C1: () => import("./questions/C1.json"),
  C2: () => import("./questions/C2.json"),
  D1: () => import("./questions/D1.json"),
};

const cache = new Map<string, Question[]>();

export async function loadPool(level: string): Promise<Question[]> {
  const cached = cache.get(level);
  if (cached) return cached;
  const loader = LOADERS[level];
  if (!loader) return [];
  const mod = await loader();
  const pool = mod.default as unknown as Question[];
  cache.set(level, pool);
  return pool;
}

export function getLevelMeta(level: string): LevelMeta | undefined {
  return LEVELS.find((l) => l.id === level);
}
