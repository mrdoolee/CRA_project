import React from "react";
import { Student, SelfAssessmentResponse } from "../types/sna";
import { calculateQuestionStats, SELF_ASSESSMENT_SCALE } from "../utils/selfAssessmentEngine";
import { getAnonymizedName } from "../utils/anonymizer";
import { Smile, ClipboardList } from "lucide-react";

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
        <h3 className="text-base font-bold text-slate-800">📋 학생별 자기평가 원본 응답</h3>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold divide-y divide-slate-200">
              <tr>
                <th className="p-3">이름</th>
                {questions.map((q) => (
                  <th key={q} className="p-3">
                    {q.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {selfAssessments.map((r) => (
                <tr key={r.studentCode} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{displayName(r.studentName)}</td>
                  {questions.map((q) => (
                    <td key={q} className="p-3">
                      {r.answers[q] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
