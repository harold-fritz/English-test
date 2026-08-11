import { useCallback, useMemo, useState } from "react";
import { Clock, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { AnsweredQuestion, LevelMeta, Question } from "@/types";
import { cn } from "@/lib/utils";
import { formatTime, TEST_DURATION_SECONDS } from "@/lib/quiz";
import { useCountdown } from "@/hooks/useCountdown";

const LETTERS = ["A", "B", "C", "D", "E"];

interface Props {
  level: LevelMeta;
  questions: Question[];
  onFinish: (
    answers: AnsweredQuestion[],
    finishedByTimeout: boolean,
    durationSeconds: number
  ) => void;
}

export function QuizView({ level, questions, onFinish }: Props) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<Record<string, number>>({});

  const total = questions.length;
  const answeredCount = Object.keys(selected).length;

  const buildAnswers = useCallback((): AnsweredQuestion[] => {
    return questions.map((q) => {
      const sel = q.id in selected ? selected[q.id] : null;
      return {
        question: q,
        selectedIndex: sel,
        correct: sel !== null && sel === q.answerIndex,
      };
    });
  }, [questions, selected]);

  const finish = useCallback(
    (byTimeout: boolean) => {
      const used = TEST_DURATION_SECONDS - remainingRef.current;
      onFinish(buildAnswers(), byTimeout, used);
    },
    [buildAnswers, onFinish]
  );

  const remaining = useCountdown(TEST_DURATION_SECONDS, true, () =>
    finish(true)
  );
  // Keep a ref so `finish` can read the latest remaining without re-creating.
  const remainingRef = useMemo(() => ({ current: TEST_DURATION_SECONDS }), []);
  remainingRef.current = remaining;

  const q = questions[current];
  const timeLow = remaining <= 60;
  const progressPct = ((current + 1) / total) * 100;

  const choose = (value: string) => {
    setSelected((prev) => ({ ...prev, [q.id]: Number(value) }));
  };

  const goto = (idx: number) => {
    setCurrent(Math.max(0, Math.min(total - 1, idx)));
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8">
      {/* Top bar: level, progress, timer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/90">{level.name}</Badge>
          <span className="text-sm text-muted-foreground">
            Pregunta {current + 1} de {total}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold tabular-nums",
            timeLow
              ? "bg-destructive/15 text-destructive"
              : "bg-primary/10 text-primary"
          )}
          role="timer"
          aria-live="off"
        >
          <Clock className="h-4 w-4" />
          {formatTime(remaining)}
        </div>
      </div>

      <Progress
        value={progressPct}
        aria-label="Progreso del test"
        indicatorClassName="bg-primary"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {q.category === "grammar" ? "Gramática" : "Vocabulario"}
            </Badge>
          </div>
          <CardTitle className="mt-2 text-xl leading-relaxed">
            {q.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={q.id in selected ? String(selected[q.id]) : ""}
            onValueChange={choose}
          >
            {q.options.map((opt, i) => {
              const isSel = selected[q.id] === i;
              return (
                <Label
                  key={i}
                  htmlFor={`${q.id}-${i}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 text-base font-normal transition-colors hover:bg-accent/60",
                    isSel && "border-primary bg-primary/10"
                  )}
                >
                  <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} />
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {LETTERS[i]}
                  </span>
                  <span>{opt}</span>
                </Label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => goto(current - 1)}
          disabled={current === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>

        <span className="text-sm text-muted-foreground">
          {answeredCount}/{total} respondidas
        </span>

        {current < total - 1 ? (
          <Button onClick={() => goto(current + 1)}>
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => finish(false)}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <Flag className="h-4 w-4" /> Finalizar
          </Button>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => finish(false)}
        >
          Finalizar test ahora
        </Button>
      </div>
    </div>
  );
}
