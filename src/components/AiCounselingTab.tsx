import React, { useState } from "react";
import { DomainAnalysisResult, StudentMetrics } from "../types/sna";
import { Sparkles, Bot, UserCheck, ShieldAlert, Award, FileText, Printer, Loader2, Key, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { getAnonymizedName } from "../utils/anonymizer";

interface Props {
  overallResult: DomainAnalysisResult;
  selectedStudentName: string | null;
  onSelectStudent: (studentName: string) => void;
  apiKey: string;
  onOpenApiKeyModal: () => void;
  isAnonymous?: boolean;
  classNameTitle?: string;
}

export const AiCounselingTab: React.FC<Props> = ({
  overallResult,
  selectedStudentName,
  onSelectStudent,
  apiKey,
  onOpenApiKeyModal,
  isAnonymous = false,
  classNameTitle = "우리반",
}) => {
  const [classAiReport, setClassAiReport] = useState<string | null>(null);
  const [classAiLoading, setClassAiLoading] = useState(false);

  const [studentAiReport, setStudentAiReport] = useState<string | null>(null);
  const [studentAiLoading, setStudentAiLoading] = useState(false);

  const studentList = overallResult?.nodes.map((n) => n.id) || [];
  const currentStudentName = selectedStudentName || studentList[0] || "";
  const currentStudentMetrics = currentStudentName ? overallResult.metrics[currentStudentName] : null;

  const displayName = (name: string) => getAnonymizedName(name, studentList, isAnonymous);

  // PDF Report Save / Print Handler
  const handleDownloadPdf = (reportTitle: string, reportContent: string, subName?: string) => {
    if (!reportContent) {
      alert("다운로드할 분석 결과가 없습니다. 먼저 AI 분석을 실행해 주세요.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("팝업이 차단되었습니다. 브라우저의 팝업 허용 설정을 확인해 주세요.");
      return;
    }

    const dateStr = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const fullTitle = `${reportTitle}${subName ? ` - ${subName}` : ""}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>CRA_${classNameTitle}_${reportTitle}${subName ? `_${subName}` : ""}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: 'Apple SD Gothic Neo', 'Pretendard', 'Malgun Gothic', sans-serif;
            color: #0f172a;
            line-height: 1.7;
            padding: 24px;
            background: #ffffff;
          }
          .header-box {
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .main-title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .sub-brand {
            font-size: 12px;
            font-weight: 700;
            color: #4f46e5;
            margin-top: 4px;
          }
          .meta-info {
            font-size: 11px;
            color: #64748b;
            text-align: right;
            line-height: 1.4;
          }
          .report-body {
            font-size: 13px;
            white-space: pre-wrap;
            word-break: break-word;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .footer {
            margin-top: 40px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
          @media print {
            body { padding: 0; background: none; }
            .report-body { background: #ffffff; border: 1px solid #cbd5e1; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="main-title">${fullTitle}</h1>
            <div class="sub-brand">CRA (Classroom Relationship Analysis by 두리쌤)</div>
          </div>
          <div class="meta-info">
            <div>발행일: ${dateStr}</div>
          </div>
        </div>
        <div class="report-body">${reportContent}</div>
        <div class="footer">
          본 보고서는 CRA 교우관계 분석 시스템(by 두리쌤)에서 생성된 AI 맞춤 리포트입니다. (개인정보보호 준수)
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Generate Class-wide AI Report
  const handleGenerateClassReport = async () => {
    try {
      setClassAiLoading(true);

      const metricsList = Object.values(overallResult.metrics) as StudentMetrics[];

      const isolatedStudents = metricsList
        .filter((m) => m.isIsolated)
        .map((m) => ({ name: displayName(m.studentName), score: m.weightedInScore }));

      const popularStudents = metricsList
        .filter((m) => m.isPopular)
        .map((m) => ({ name: displayName(m.studentName), score: m.weightedInScore }));

      const bridgeStudents = metricsList
        .filter((m) => m.isBridge)
        .map((m) => ({ name: displayName(m.studentName), score: m.betweennessScore }));

      const response = await fetch("/api/ai/classroom-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey,
        },
        body: JSON.stringify({
          userApiKey: apiKey,
          summary: {
            density: overallResult.density,
            reciprocalRate: overallResult.reciprocityRate,
            avgInDegree: overallResult.avgInDegree,
          },
          isolatedStudents,
          popularStudents,
          bridgeStudents,
          communities: overallResult.communities,
          classSize: overallResult.nodes.length,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setClassAiReport(data.report);
    } catch (err: any) {
      alert(`AI 학급 진단 생성 중 오류: ${err.message}`);
    } finally {
      setClassAiLoading(false);
    }
  };

  // Generate Individual Student AI Report
  const handleGenerateStudentAdvice = async () => {
    if (!currentStudentName || !currentStudentMetrics) return;

    try {
      setStudentAiLoading(true);

      // Find who this student chose and who chose this student
      const chosenByEdges = overallResult.edges.filter((e) => e.target === currentStudentName);
      const outgoingEdges = overallResult.edges.filter((e) => e.source === currentStudentName);

      const response = await fetch("/api/ai/student-advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey,
        },
        body: JSON.stringify({
          userApiKey: apiKey,
          studentName: displayName(currentStudentName),
          metrics: currentStudentMetrics,
          choices: outgoingEdges.map((e) => displayName(e.target as string)),
          chosenBy: chosenByEdges.map((e) => displayName(e.source as string)),
          classContext: {
            avgScore: overallResult.avgWeightedScore,
            totalStudents: overallResult.nodes.length,
          },
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setStudentAiReport(data.advice);
    } catch (err: any) {
      alert(`학생 맞춤 AI 조언 생성 중 오류: ${err.message}`);
    } finally {
      setStudentAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Gemini AI Powered Relationship Counseling
          </div>
          <h2 className="text-xl font-extrabold mt-1">SNA 기반 AI 교우관계 진단 및 맞춤 지도 조언</h2>
          <p className="text-xs text-slate-300 mt-1">
            사회연결망 데이터와 인공지능 분석을 결합하여 사각지대 고립 학생 케어 및 학급 경영 솔루션을 제안합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenApiKeyModal}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              apiKey
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md animate-pulse"
            }`}
          >
            <Key className="w-4 h-4" />
            {apiKey ? "🔑 Gemini API Key 설정됨" : "🔑 Gemini API Key 필요"}
          </button>
        </div>
      </div>

      {!apiKey && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <strong>AI 심층 분석을 이용하려면 Gemini API Key 등록이 필요합니다.</strong>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                선생님 개인의 구글 계정으로 무료 발급(1분 소요)받으신 키를 등록하여 쓰시게 됩니다. (서버 저장 없이 브라우저에만 저장)
              </p>
            </div>
          </div>
          <button
            onClick={onOpenApiKeyModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Key className="w-4 h-4" /> Gemini API Key 무료 등록하기
          </button>
        </div>
      )}

      {/* Grid: 1. Class-wide Report & 2. Individual Student Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Class-Wide AI Diagnosis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                학급 전체 관계망 AI 종합 진단
              </h3>

              <div className="flex items-center gap-2">
                {classAiReport && (
                  <button
                    onClick={() => handleDownloadPdf("학급 전체 관계망 AI 종합 진단 보고서", classAiReport)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                    title="종합 진단 보고서를 PDF로 저장"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF 저장
                  </button>
                )}

                <button
                  onClick={handleGenerateClassReport}
                  disabled={classAiLoading}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {classAiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> AI 학급 분석 실행
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              학급 응집력, 소집단(모둠) 분열 정도, 고립 위험 학생 동향을 종합 진단합니다.
            </p>

            {classAiReport ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 space-y-3 whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                {classAiReport}
              </div>
            ) : (
              <div className="p-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                상단의 <strong className="text-indigo-600">'AI 학급 분석 실행'</strong> 버튼을 클릭하면
                학급 전체의 교우관계 및 갈등 예방 리포트가 자동 생성되며, 완성된 리포트는 PDF로 다운로드할 수 있습니다.
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Individual Student AI Counseling */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                개별 학생 맞춤 교우관계 조언
              </h3>

              <div className="flex items-center gap-2">
                {studentAiReport && (
                  <button
                    onClick={() => handleDownloadPdf("개별 학생 맞춤 교우관계 조언", studentAiReport, displayName(currentStudentName))}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                    title="학생 상담 조언을 PDF로 저장"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF 저장
                  </button>
                )}

                {/* Student Dropdown */}
                <select
                  value={currentStudentName}
                  onChange={(e) => onSelectStudent(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {studentList.map((name) => (
                    <option key={name} value={name}>
                      {displayName(name)} {overallResult.metrics[name]?.isIsolated ? "(⚠️고립위험)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Student Metrics Summary Card */}
            {currentStudentMetrics && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">지목받은 횟수</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{currentStudentMetrics.inDegree}회</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">가중 인기점수</span>
                  <div className="text-sm font-bold text-indigo-600 mt-0.5">{currentStudentMetrics.weightedInScore}점</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">맞지목 친구</span>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">{currentStudentMetrics.mutualCount}명</div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateStudentAdvice}
              disabled={studentAiLoading || !currentStudentName}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {studentAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {displayName(currentStudentName)} 학생 AI 심층 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> {displayName(currentStudentName)} 학생 맞춤 상담 조언 생성
                </>
              )}
            </button>

            {studentAiReport ? (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs leading-relaxed text-slate-800 space-y-3 whitespace-pre-wrap max-h-[380px] overflow-y-auto">
                {studentAiReport}
              </div>
            ) : (
              <div className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                학생을 선택하고 <strong className="text-emerald-600">'맞춤 상담 조언 생성'</strong> 버튼을 누르면
                해당 학생을 위한 자리 배치, 모둠 조원 추천, 상담 대화 팁이 생성되며, 완성된 조언은 PDF로 저장할 수 있습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

