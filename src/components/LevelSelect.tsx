import { GraduationCap, Sparkles, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LevelMeta } from "@/types";
import { cn } from "@/lib/utils";
import { TEST_SIZE } from "@/lib/quiz";

const CARD_TONES: Record<string, string> = {
  green: "bg-pastel-green/50 hover:bg-pastel-green",
  lemon: "bg-pastel-lemon/50 hover:bg-pastel-lemon",
  mint: "bg-pastel-mint/50 hover:bg-pastel-mint",
  sky: "bg-pastel-sky/50 hover:bg-pastel-sky",
  lavender: "bg-pastel-lavender/50 hover:bg-pastel-lavender",
  peach: "bg-pastel-peach/50 hover:bg-pastel-peach",
  rose: "bg-pastel-rose/50 hover:bg-pastel-rose",
};

interface Props {
  levels: LevelMeta[];
  knownByLevel: Record<string, number>;
  onSelect: (levelId: string) => void;
  onReset: (levelId: string) => void;
}

export function LevelSelect({ levels, knownByLevel, onSelect, onReset }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          English Test
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Elige tu nivel y responde un test de {TEST_SIZE} preguntas con un
          máximo de 1 hora. Al terminar verás tu resultado y una explicación en
          español de cada respuesta.
        </p>
      </header>

      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        {levels.map((level) => {
          const known = knownByLevel[level.id] ?? 0;
          const progress = Math.min(
            100,
            Math.round((known / level.count) * 100)
          );
          return (
            <Card
              key={level.id}
              className={cn(
                "group cursor-pointer border-transparent transition-colors",
                CARD_TONES[level.color] ?? "bg-card"
              )}
              onClick={() => onSelect(level.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(level.id);
                }
              }}
              aria-label={`Comenzar test de nivel ${level.name}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">{level.name}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {level.count} preguntas
                  </Badge>
                </div>
                <CardDescription className="text-foreground/70">
                  {level.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>
                    {known > 0
                      ? `Ya dominas ${known} preguntas (${progress}%)`
                      : "Aún no has dominado ninguna pregunta"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(level.id);
                    }}
                  >
                    Comenzar test
                  </Button>
                  {known > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Reiniciar progreso de ${level.name}`}
                      title="Reiniciar preguntas dominadas"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReset(level.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
