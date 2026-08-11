import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultsView } from "@/components/ResultsView";
import type { LevelMeta, TestResult } from "@/types";

const level: LevelMeta = {
  id: "B1",
  name: "B1 — Intermedio",
  description: "test",
  color: "mint",
  count: 2,
};

const result: TestResult = {
  level: "B1",
  total: 2,
  correctCount: 1,
  finishedByTimeout: false,
  durationSeconds: 120,
  answers: [
    {
      question: {
        id: "q1",
        level: "B1",
        category: "grammar",
        question: "She ___ to school.",
        options: ["go", "goes", "going", "gone", "went"],
        answerIndex: 1,
        explanation: "En tercera persona se añade -s: goes.",
      },
      selectedIndex: 0,
      correct: false,
    },
    {
      question: {
        id: "q2",
        level: "B1",
        category: "vocabulary",
        question: "Synonym of big.",
        options: ["small", "large", "tiny", "thin", "short"],
        answerIndex: 1,
        explanation: "Grande.",
      },
      selectedIndex: 1,
      correct: true,
    },
  ],
};

describe("ResultsView", () => {
  it("shows the overall score", () => {
    render(
      <ResultsView
        level={level}
        result={result}
        newlyMastered={1}
        onRetry={() => {}}
        onHome={() => {}}
      />
    );
    expect(screen.getByText("1 / 2 correctas")).toBeInTheDocument();
  });

  it("lists wrong answers with the correct option and Spanish explanation", () => {
    render(
      <ResultsView
        level={level}
        result={result}
        newlyMastered={1}
        onRetry={() => {}}
        onHome={() => {}}
      />
    );
    // The wrong question appears in the review section.
    expect(screen.getByText("Revisión de tus errores (1)")).toBeInTheDocument();
    expect(
      screen.getByText(/Respuesta correcta: B\) goes/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/En tercera persona se añade -s: goes\./)
    ).toBeInTheDocument();
    // The correct question is NOT in the review section.
    expect(screen.queryByText("Synonym of big.")).not.toBeInTheDocument();
  });

  it("triggers retry and home callbacks", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onHome = vi.fn();
    render(
      <ResultsView
        level={level}
        result={result}
        newlyMastered={0}
        onRetry={onRetry}
        onHome={onHome}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /Otro test de este nivel/i })
    );
    expect(onRetry).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Volver al inicio/i }));
    expect(onHome).toHaveBeenCalled();
  });

  it("celebrates a perfect score", () => {
    const perfect: TestResult = {
      ...result,
      correctCount: 2,
      answers: result.answers.map((a) => ({ ...a, correct: true })),
    };
    render(
      <ResultsView
        level={level}
        result={perfect}
        newlyMastered={2}
        onRetry={() => {}}
        onHome={() => {}}
      />
    );
    expect(screen.getByText(/¡Perfecto!/)).toBeInTheDocument();
  });
});
