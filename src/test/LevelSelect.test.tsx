import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelSelect } from "@/components/LevelSelect";
import type { LevelMeta } from "@/types";

const levels: LevelMeta[] = [
  { id: "B1", name: "B1 — Intermedio", description: "d1", color: "mint", count: 617 },
  { id: "B2", name: "B2 — Intermedio alto", description: "d2", color: "sky", count: 697 },
];

describe("LevelSelect", () => {
  it("renders every level with its question count", () => {
    render(
      <LevelSelect
        levels={levels}
        knownByLevel={{ B1: 0, B2: 0 }}
        onSelect={() => {}}
        onReset={() => {}}
      />
    );
    expect(screen.getByText("B1 — Intermedio")).toBeInTheDocument();
    expect(screen.getByText("617 preguntas")).toBeInTheDocument();
    expect(screen.getByText("B2 — Intermedio alto")).toBeInTheDocument();
  });

  it("calls onSelect when a level's start button is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <LevelSelect
        levels={levels}
        knownByLevel={{ B1: 0, B2: 0 }}
        onSelect={onSelect}
        onReset={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button", { name: /Comenzar test/i });
    await user.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith("B1");
  });

  it("shows mastered progress and a reset control", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <LevelSelect
        levels={levels}
        knownByLevel={{ B1: 100, B2: 0 }}
        onSelect={() => {}}
        onReset={onReset}
      />
    );
    expect(screen.getByText(/Ya dominas 100 preguntas/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso de B1/i })
    );
    expect(onReset).toHaveBeenCalledWith("B1");
  });
});
