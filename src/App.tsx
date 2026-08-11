import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { LevelSelect } from "@/components/LevelSelect";
import { QuizView } from "@/components/QuizView";
import { ResultsView } from "@/components/ResultsView";
import { LEVELS, getLevelMeta, loadPool } from "@/data";
import { selectQuestions } from "@/lib/quiz";
import {
  addKnownIds,
  getKnownIds,
  knownCount,
  resetKnownIds,
} from "@/lib/storage";
import type { AnsweredQuestion, LevelMeta, Question, TestResult } from "@/types";

type Phase = "select" | "loading" | "quiz" | "results";

export default function App() {
  const [phase, setPhase] = useState<Phase>("select");
  const [level, setLevel] = useState<LevelMeta | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [newlyMastered, setNewlyMastered] = useState(0);
  // Bumped whenever localStorage changes to refresh the level cards.
  const [progressTick, setProgressTick] = useState(0);

  const knownByLevel = useMemo(() => {
    void progressTick;
    const map: Record<string, number> = {};
    for (const l of LEVELS) map[l.id] = knownCount(l.id);
    return map;
  }, [progressTick]);

  const startLevel = useCallback(async (levelId: string) => {
    const meta = getLevelMeta(levelId);
    if (!meta) return;
    setLevel(meta);
    setResult(null);
    setPhase("loading");
    const pool = await loadPool(levelId);
    setQuestions(
      selectQuestions(pool, undefined, Math.random, getKnownIds(levelId))
    );
    setPhase("quiz");
  }, []);

  const handleFinish = useCallback(
    (
      answers: AnsweredQuestion[],
      finishedByTimeout: boolean,
      durationSeconds: number
    ) => {
      if (!level) return;
      const correctCount = answers.filter((a) => a.correct).length;

      // Persist newly-mastered questions so they don't reappear next time.
      const before = knownCount(level.id);
      const correctIds = answers
        .filter((a) => a.correct)
        .map((a) => a.question.id);
      addKnownIds(level.id, correctIds);
      const after = knownCount(level.id);

      setNewlyMastered(after - before);
      setResult({
        level: level.id,
        total: answers.length,
        correctCount,
        answers,
        finishedByTimeout,
        durationSeconds,
      });
      setProgressTick((t) => t + 1);
      setPhase("results");
    },
    [level]
  );

  const retry = useCallback(() => {
    if (!level) return;
    startLevel(level.id);
  }, [level, startLevel]);

  const goHome = useCallback(() => {
    setPhase("select");
    setLevel(null);
    setQuestions([]);
    setResult(null);
  }, []);

  const handleReset = useCallback((levelId: string) => {
    resetKnownIds(levelId);
    setProgressTick((t) => t + 1);
  }, []);

  return (
    <main className="min-h-screen w-full">
      {phase === "select" && (
        <LevelSelect
          levels={LEVELS}
          knownByLevel={knownByLevel}
          onSelect={startLevel}
          onReset={handleReset}
        />
      )}

      {phase === "loading" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Preparando tu test…</p>
        </div>
      )}

      {phase === "quiz" && level && questions.length > 0 && (
        <QuizView level={level} questions={questions} onFinish={handleFinish} />
      )}

      {phase === "results" && level && result && (
        <ResultsView
          level={level}
          result={result}
          newlyMastered={newlyMastered}
          onRetry={retry}
          onHome={goHome}
        />
      )}

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        English Test · Práctica por niveles MCER A1–C2
      </footer>
    </main>
  );
}
