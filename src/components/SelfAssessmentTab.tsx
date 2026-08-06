import React, { useState } from "react";
import { Student, SelfAssessmentResponse } from "../types/sna";
import { calculateQuestionStats, scoreAnswer, SELF_ASSESSMENT_SCALE } from "../utils/selfAssessmentEngine";
import { getAnonymizedName } from "../utils/anonymizer";
import { Smile, ClipboardList, User } from "lucide-react";

interface Props {
  selfAssessments: SelfAssessmentResponse[];
  students?: Student[];
  isAnonymous?: boolean;
}

const SCALE_LABELS = Object.keys(SELF_ASSESSMENT_SCALE); // ["정말 그렇다", "그렇다", "보통이다", "잘 모르겠다", "전혀 아니다"]

export const SelfAssessmentTab: React.FC<Props> = ({
  selfAssessments,
  students = [],
  isAnonymous = false,
}) => {
  const displayName = (name: string) =>
    getAnonymizedName(name, students.length > 0 ? students : selfAssessments, isAnonymous);

  const [selectedCode, setSelectedCode] = useState<string>(selfAssessments[0]?.studentCode || "");

  if (selfAssessments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <ClipboardList className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">자기평가 데이터가 없습니다</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          업로드한 설문 응답 파일에 자기평가(정서/적응) 5문항 그리드가 포함되어 있지 않습니다.
          1번 메뉴에서 생성한 최신 설문 양식으로 응답을 받으면 이 화면에서 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const stats = calculateQuestionStats(selfAssessments);
  const questions = stats.map((s) => s.question);
  const avgByQuestion: Record<string, number> = {};
  stats.forEach((s) => {
    avgByQuestion[s.question] = s.avgScore;
  });

  const selectedResponse =
    selfAssessments.find((r) => r.studentCode === selectedCode) || selfAssessments[0];

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <Smile className="w-4 h-4" /> Self Assessment
        </div>
        <h2 className="text-xl font-extrabold mt-1">학생 자기평가 (정서·적응) 결과</h2>
        <p className="text-xs text-slate-300 mt-1">
          설문 응답에 포함된 자기평가 {questions.length}문항의 학급 전체 통계와 학생별 원본 응답입니다.
        </p>
      </div>

      {/* Per-question stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.question} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800 leading-snug">{s.question.trim()}</h3>
              <span className="text-sm font-extrabold text-indigo-600 flex-shrink-0">
                {s.avgScore.toFixed(1)} / 5.0
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${(s.avgScore / 5) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              {SCALE_LABELS.map((label) => (
                <span key={label}>
                  {label} {s.distribution[label] || 0}명
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Per-student raw responses */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" /> 학생별 자기평가 원본 응답
          </h3>

          <select
            value={selectedResponse?.studentCode || ""}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {selfAssessments.map((r) => (
              <option key={r.studentCode} value={r.studentCode}>
                {displayName(r.studentName)}
              </option>
            ))}
          </select>
        </div>

        {selectedResponse && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {questions.map((q) => {
              const rawAnswer = selectedResponse.answers[q];
              const score = rawAnswer ? scoreAnswer(rawAnswer) : null;
              const avg = avgByQuestion[q];

              let colorClass = "bg-slate-50 border-slate-200 text-slate-700";
              if (score !== null && avg !== undefined) {
                if (score > avg) colorClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
                else if (score < avg) colorClass = "bg-rose-50 border-rose-200 text-rose-800";
              }

              return (
                <div key={q} className={`p-3.5 rounded-xl border ${colorClass}`}>
                  <div className="text-[11px] font-semibold opacity-80 leading-snug">{q.trim()}</div>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-sm font-extrabold">{rawAnswer || "-"}</span>
                    <span className="text-[11px] opacity-70">학급 평균 {avg?.toFixed(1) ?? "-"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
