import { SelfAssessmentResponse } from "../types/sna";

export const SELF_ASSESSMENT_SCALE: Record<string, number> = {
  "정말 그렇다": 5,
  "그렇다": 4,
  "보통이다": 3,
  "잘 모르겠다": 2,
  "전혀 아니다": 1,
};

/**
 * Maps a raw answer cell (e.g. "그렇다.") to its 1-5 scale score.
 * Returns null for anything that doesn't match one of the 5 known labels.
 */
export function scoreAnswer(raw: string): number | null {
  const cleaned = raw.trim().replace(/\.+$/, "");
  return SELF_ASSESSMENT_SCALE[cleaned] ?? null;
}

export interface QuestionStat {
  question: string;
  avgScore: number;
  responseCount: number;
  distribution: Record<string, number>; // scale label -> count
}

export function calculateQuestionStats(responses: SelfAssessmentResponse[]): QuestionStat[] {
  if (responses.length === 0) return [];

  const questionSet = new Set<string>();
  responses.forEach((r) => Object.keys(r.answers).forEach((q) => questionSet.add(q)));

  return Array.from(questionSet).map((question) => {
    const distribution: Record<string, number> = {};
    Object.keys(SELF_ASSESSMENT_SCALE).forEach((label) => {
      distribution[label] = 0;
    });

    let total = 0;
    let count = 0;

    responses.forEach((r) => {
      const raw = r.answers[question];
      if (!raw) return;
      const cleaned = raw.trim().replace(/\.+$/, "");
      const score = SELF_ASSESSMENT_SCALE[cleaned];
      if (score === undefined) return;
      distribution[cleaned] += 1;
      total += score;
      count += 1;
    });

    return {
      question,
      avgScore: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
      responseCount: count,
      distribution,
    };
  });
}
