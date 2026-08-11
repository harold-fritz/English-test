import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizView } from "@/components/QuizView";
import type { AnsweredQuestion, LevelMeta, Question } from "@/types";

const level: LevelMeta = {
  id: "B1",
  name: "B1 — Intermedio",
  description: "test",
  color: "mint",
  count: 2,
};

function makeQuestions(): Question[] {
  return [
    {
      id: "q1",
      level: "B1",
      category: "grammar",
      question: "She ___ to school.",
      options: ["go", "goes", "going", "gone", "went"],
      answerIndex: 1,
      explanation: "Tercera persona.",
    },
    {
      id: "q2",
      level: "B1",
      category: "vocabulary",
      question: "Synonym of big.",
      options: ["small", "large", "tiny", "thin", "short"],
      answerIndex: 1,
      explanation: "Grande.",
    },
  ];
}

afterEach(() => vi.useRealTimers());

describe("QuizView", () => {
  it("renders the first question and progress", () => {
    render(
      <QuizView level={level} questions={makeQuestions()} onFinish={() => {}} />
    );
    expect(screen.getByText("She ___ to school.")).toBeInTheDocument();
    expect(screen.getByText("Pregunta 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("00:00", { exact: false })).toBeInTheDocument();
  });

  it("records answers and reports the score on finish", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <QuizView level={level} questions={makeQuestions()} onFinish={onFinish} />
    );

    // Answer Q1 correctly (option index 1 = "goes").
    await user.click(screen.getAllByRole("radio")[1]);
    // Next question.
    await user.click(screen.getByRole("button", { name: /Siguiente/i }));
    // Answer Q2 incorrectly (option index 0).
    await user.click(screen.getAllByRole("radio")[0]);
    // Finish.
    await user.click(screen.getByRole("button", { name: /^Finalizar$/i }));

    expect(onFinish).toHaveBeenCalledTimes(1);
    const [answers, byTimeout] = onFinish.mock.calls[0] as [
      AnsweredQuestion[],
      boolean,
      number,
    ];
    expect(byTimeout).toBe(false);
    expect(answers).toHaveLength(2);
    expect(answers[0].correct).toBe(true);
    expect(answers[0].selectedIndex).toBe(1);
    expect(answers[1].correct).toBe(false);
  });

  it("auto-finishes when the timer expires", () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    render(
      <QuizView level={level} questions={makeQuestions()} onFinish={onFinish} />
    );
    // Advance the full hour.
    act(() => {
      vi.advanceTimersByTime(3600 * 1000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][1]).toBe(true); // finishedByTimeout
  });

  it("marks unanswered questions as incorrect with null selection", () => {
    const onFinish = vi.fn();
    render(
      <QuizView level={level} questions={makeQuestions()} onFinish={onFinish} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Finalizar test ahora/i }));
    const answers = onFinish.mock.calls[0][0] as AnsweredQuestion[];
    for (const a of answers) {
      expect(a.selectedIndex).toBeNull();
      expect(a.correct).toBe(false);
    }
  });

  it("navigates between questions", async () => {
    const user = userEvent.setup();
    render(
      <QuizView level={level} questions={makeQuestions()} onFinish={() => {}} />
    );
    await user.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByText("Synonym of big.")).toBeInTheDocument();
    expect(screen.getByText("Pregunta 2 de 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Anterior/i }));
    expect(screen.getByText("She ___ to school.")).toBeInTheDocument();
  });
});
