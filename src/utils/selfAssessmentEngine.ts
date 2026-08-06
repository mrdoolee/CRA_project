import { SelfAssessmentResponse } from "../types/sna";

export const SELF_ASSESSMENT_SCALE: Record<string, number> = {
  "정말 그렇다": 5,
  "그렇다": 4,
  "보통이다": 3,
  "잘 모르겠다": 2,
  "전혀 아니다": 1,
};

/**
 * Normalizes a raw answer cell to one of the 5 known scale labels.
 * Tries an exact match first (after trimming trailing periods), then falls
 * back to keyword matching for near-variants some survey exports produce
 * (e.g. "모르겠다." instead of "잘 모르겠다."). Order matters: more specific
 * keywords ("정말", "전혀", "보통", "모르겠다") are checked before the bare
 * "그렇다" fallback, since "그렇다" is a substring of "정말 그렇다".
 * Returns null when nothing matches.
 */
export function normalizeAnswerLabel(raw: string): string | null {
  const cleaned = raw.trim().replace(/\.+$/, "");
  if (SELF_ASSESSMENT_SCALE[cleaned] !== undefined) return cleaned;

  if (cleaned.includes("모르겠다")) return "잘 모르겠다";
  if (cleaned.includes("정말") && cleaned.includes("그렇다")) return "정말 그렇다";
  if (cleaned.includes("전혀") && cleaned.includes("아니다")) return "전혀 아니다";
  if (cleaned.includes("보통")) return "보통이다";
  if (cleaned.includes("그렇다")) return "그렇다";

  return null;
}

/**
 * Maps a raw answer cell (e.g. "그렇다.") to its 1-5 scale score.
 * Returns null for anything that doesn't match one of the 5 known labels.
 */
export function scoreAnswer(raw: string): number | null {
  const label = normalizeAnswerLabel(raw);
  return label !== null ? SELF_ASSESSMENT_SCALE[label] : null;
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
      const label = normalizeAnswerLabel(raw);
      if (label === null) return;
      distribution[label] += 1;
      total += SELF_ASSESSMENT_SCALE[label];
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
