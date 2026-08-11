export type Category = "grammar" | "vocabulary";

export interface Question {
  id: string;
  level: string;
  category: Category;
  question: string;
  options: string[];
  answerIndex: number;
  /** Spanish explanation of why the correct option is correct. */
  explanation: string;
}

export interface LevelMeta {
  id: string;
  name: string;
  description: string;
  color: string;
  count: number;
}

/** A question paired with the user's chosen option (null = unanswered). */
export interface AnsweredQuestion {
  question: Question;
  selectedIndex: number | null;
  correct: boolean;
}

export interface TestResult {
  level: string;
  total: number;
  correctCount: number;
  answers: AnsweredQuestion[];
  finishedByTimeout: boolean;
  durationSeconds: number;
}
