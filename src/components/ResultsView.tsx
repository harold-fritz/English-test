import { CheckCircle2, XCircle, RotateCcw, Home, Clock, Timer } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { LevelMeta, TestResult } from "@/types";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/quiz";

const LETTERS = ["A", "B", "C", "D", "E"];

interface Props {
  level: LevelMeta;
  result: TestResult;
  newlyMastered: number;
  onRetry: () => void;
  onHome: () => void;
}

export function ResultsView({
  level,
  result,
  newlyMastered,
  onRetry,
  onHome,
}: Props) {
  const { total, correctCount, answers, finishedByTimeout, durationSeconds } =
    result;
  const pct = Math.round((correctCount / total) * 100);
  const wrong = answers.filter((a) => !a.correct);
  const passed = pct >= 60;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Card
        className={cn(
          passed ? "bg-pastel-green/50" : "bg-pastel-peach/50",
          "border-transparent"
        )}
      >
        <CardHeader className="items-center text-center">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              passed
                ? "bg-success/20 text-success"
                : "bg-destructive/15 text-destructive"
            )}
          >
            {passed ? (
              <CheckCircle2 className="h-9 w-9" />
            ) : (
              <XCircle className="h-9 w-9" />
            )}
          </div>
          <CardTitle className="mt-2 text-3xl">
            {correctCount} / {total} correctas
          </CardTitle>
          <CardDescription className="text-base text-foreground/70">
            Nivel {level.name} · Puntuación {pct}%
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Progress
            value={pct}
            indicatorClassName={passed ? "bg-success" : "bg-destructive"}
          />
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Badge variant="secondary" className="gap-1">
              {finishedByTimeout ? (
                <Timer className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {finishedByTimeout
                ? "Finalizado por tiempo"
                : `Tiempo usado ${formatTime(durationSeconds)}`}
            </Badge>
            {newlyMastered > 0 && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {newlyMastered} preguntas nuevas dominadas
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={onRetry}>
              <RotateCcw className="h-4 w-4" /> Otro test de este nivel
            </Button>
            <Button variant="outline" onClick={onHome}>
              <Home className="h-4 w-4" /> Cambiar de nivel
            </Button>
          </div>
        </CardContent>
      </Card>

      {wrong.length === 0 ? (
        <Card className="bg-pastel-green/40 border-transparent">
          <CardContent className="py-8 text-center text-lg font-medium text-foreground/80">
            🎉 ¡Perfecto! No cometiste ningún error.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            Revisión de tus errores ({wrong.length})
          </h2>
          {wrong.map((a) => {
            const correctIdx = a.question.answerIndex;
            return (
              <Card key={a.question.id} className="border-l-4 border-l-destructive">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {a.question.category === "grammar"
                        ? "Gramática"
                        : "Vocabulario"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-1 text-lg leading-relaxed">
                    {a.question.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    {a.selectedIndex === null ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <XCircle className="h-4 w-4 text-destructive" />
                        No respondiste esta pregunta.
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-destructive">
                        <XCircle className="h-4 w-4" />
                        Tu respuesta: {LETTERS[a.selectedIndex]}){" "}
                        {a.question.options[a.selectedIndex]}
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-sm font-medium text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      Respuesta correcta: {LETTERS[correctIdx]}){" "}
                      {a.question.options[correctIdx]}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/70 p-4 text-sm text-foreground/80">
                    <span className="font-semibold text-foreground">
                      ¿Por qué?{" "}
                    </span>
                    {a.question.explanation}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-center pb-6">
        <Button variant="outline" onClick={onHome}>
          <Home className="h-4 w-4" /> Volver al inicio
        </Button>
      </div>
    </div>
  );
}
