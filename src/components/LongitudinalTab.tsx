import React, { useState } from "react";
import { DomainAnalysisResult, LongitudinalComparison, Student, SurveyResponse } from "../types/sna";
import { calculateLongitudinalShift, analyzeSNA } from "../utils/snaEngine";
import { SAMPLE_RESPONSES_WAVE1, SAMPLE_STUDENTS } from "../data/sampleData";
import { TrendingUp, TrendingDown, GitCompare, ShieldAlert, Sparkles, ArrowRight, CheckCircle2, UserPlus, Bot, Loader2, Key, Download, Upload, ShieldCheck, Lock, AlertTriangle, HelpCircle, Info, X } from "lucide-react";
import { getAnonymizedName } from "../utils/anonymizer";
import { downloadFile } from "../utils/gephiExporter";

interface Props {
  currentWaveTitle: string;
  currentAnalysisResults: Record<string, DomainAnalysisResult>;
  apiKey: string;
  onOpenApiKeyModal: () => void;
  isAnonymous?: boolean;
  classNameTitle?: string;
  onDownloadLocalBackup?: () => void;
  students?: Student[];
}

export const LongitudinalTab: React.FC<Props> = ({
  currentWaveTitle,
  currentAnalysisResults,
  apiKey,
  onOpenApiKeyModal,
  isAnonymous = false,
  classNameTitle = "학급",
  onDownloadLocalBackup,
  students = [],
}) => {
  const [wave1Title, setWave1Title] = useState("이전 조사");
  const [wave2Title, setWave2Title] = useState(currentWaveTitle || "이번 조사");

  // State for Roster Guide Modal
  const [isRosterGuideModalOpen, setIsRosterGuideModalOpen] = useState(false);

  // State for AI longitudinal summary
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Compute Wave 1 mock sample data or custom uploaded wave 1
  const [wave1Data, setWave1Data] = useState<{ students: Student[]; responses: SurveyResponse[] }>({
    students: students.length > 0 ? students : SAMPLE_STUDENTS,
    responses: SAMPLE_RESPONSES_WAVE1,
  });

  const wave1Analysis = analyzeSNA(wave1Data.students, wave1Data.responses);
  const wave1Overall = wave1Analysis["0_전체_통합"];
  const wave2Overall = currentAnalysisResults["0_전체_통합"] || wave1Overall;

  const displayName = (name: string) =>
    getAnonymizedName(name, students.length > 0 ? students : wave2Overall?.metrics || wave1Data.students, isAnonymous);

  // Calculate longitudinal comparison
  const comparison: LongitudinalComparison = calculateLongitudinalShift(
    wave1Overall,
    wave2Overall,
    wave1Title,
    wave2Title
  );

  const handleGenerateLongitudinalAi = async () => {
    if (!apiKey) {
      alert("AI 분석 기능을 이용하려면 Gemini API Key 설정이 필요합니다.");
      onOpenApiKeyModal();
      return;
    }
    try {
      setLoadingAi(true);

      const response = await fetch("/api/ai/longitudinal-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey,
        },
        body: JSON.stringify({
          userApiKey: apiKey,
          wave1Title,
          wave2Title,
          studentDeltas: comparison.studentDeltas.slice(0, 10).map((d) => ({
            ...d,
            studentName: displayName(d.studentName),
            newFriends: d.newFriends.map((f) => displayName(f)),
            lostFriends: d.lostFriends.map((f) => displayName(f)),
          })),
          riskChange: {
            newIsolatedCount: comparison.newIsolatedCount,
            freedIsolatedCount: comparison.freedIsolatedCount,
          },
          overallTrend: {
            cohesionTrend: comparison.cohesionTrend,
            avgScoreChange: comparison.avgScoreChange,
            wave1Density: wave1Overall.density,
            wave2Density: wave2Overall.density,
          },
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAiReport(data.report);
    } catch (err: any) {
      alert(`시기별 변화 AI 분석 중 오류: ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  // Local JSON File Backup Export
  const handleExportWave1Json = () => {
    if (onDownloadLocalBackup) {
      onDownloadLocalBackup();
    } else {
      const backupData = {
        waveTitle: wave1Title,
        classNameTitle,
        savedAt: new Date().toISOString(),
        students: wave1Data.students,
        responses: wave1Data.responses,
      };
      downloadFile(
        JSON.stringify(backupData, null, 2),
        `${classNameTitle}_로컬백업_${new Date().toISOString().slice(0, 10)}.json`,
        "application/json;charset=utf-8;"
      );
    }
  };

  // Local JSON File Import
  const handleImportWave1Json = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.students && parsed.responses) {
          setWave1Data({ students: parsed.students, responses: parsed.responses });
          if (parsed.waveTitle) setWave1Title(parsed.waveTitle);
          alert(`✅ 이전 분석결과 로컬 백업 데이터를 성공적으로 불러왔습니다! (${parsed.students.length}명)`);
        } else {
          throw new Error("올바른 백업 파일 구조가 아닙니다.");
        }
      } catch (err: any) {
        alert(`파일 읽기 오류: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Download AI Longitudinal Report PDF
  const handleDownloadPdf = () => {
    if (!aiReport) {
      alert("다운로드할 AI 관계 변화 리포트가 없습니다. 먼저 리포트를 생성해 주세요.");
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

    const fullTitle = `시기별 교우관계 변화 AI 심층 진단 리포트 (${wave1Title} vs ${wave2Title})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>CRA_시기별_관계변화_리포트</title>
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
            font-size: 18px;
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
        <div class="report-body">${aiReport}</div>
        <div class="footer">
          본 보고서는 CRA 교우관계 분석 시스템(by 두리쌤)에서 생성된 시기별 관계 변화 리포트입니다.
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

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <GitCompare className="w-4 h-4" /> Longitudinal Relationship Shift System
          </div>
          <h2 className="text-xl font-extrabold mt-1">시기별 교우관계 변화 추이 (Longitudinal SNA)</h2>
          <p className="text-xs text-slate-300 mt-1">
            이전 조사와 이번 조사의 설문 응답을 비교하여 학생별 인기점수 변화, 고립 위험 해소/발생 여부를 정밀 분석합니다.
          </p>
        </div>
      </div>

      {/* Roster Matching Notice Banner */}
      <div className="bg-amber-50 border border-amber-200/90 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              💡 의미 있는 시기별 관계망 변화 분석을 진행하려면 동일한 학생 명단으로 구성된 이전(1차) 데이터가 필요합니다.
            </h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              1차(이전 조사)와 2차(이번 조사)의 명단이 다르면 학생 개별 추적 및 고립 위험 분석에 오류가 발생할 수 있습니다.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsRosterGuideModalOpen(true)}
          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          안내 & 데이터 미일치 문제점 보기
        </button>
      </div>

      {/* Wave Comparison Titles Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: 이전 조사 시기 (비교 기준) */}
        <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              비교 기준 (이전 조사 시기)
            </label>
            <input
              type="text"
              value={wave1Title}
              onChange={(e) => setWave1Title(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="예: 1학기 조사"
            />
          </div>
          <div>
            <label className="w-full py-2.5 px-3 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-900 rounded-xl font-bold flex items-center justify-center gap-2 text-xs cursor-pointer transition-all shadow-sm">
              <Upload className="w-4 h-4 text-indigo-600" /> 이전 결과 업로드
              <input type="file" accept=".json" onChange={handleImportWave1Json} className="hidden" />
            </label>
            <p className="text-[11px] text-indigo-900/80 mt-1 text-center">
              이전에 저장해 둔 백업 파일(.json)을 불러옵니다.
            </p>
          </div>
        </div>

        {/* Right Column: 이번 조사 시기 (비교 대상) */}
        <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              비교 대상 (이번 조사 시기)
            </label>
            <input
              type="text"
              value={wave2Title}
              onChange={(e) => setWave2Title(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="예: 2학기 조사"
            />
          </div>
          <div>
            <button
              onClick={handleExportWave1Json}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> 이번 결과 백업
            </button>
            <p className="text-[11px] text-emerald-900/80 mt-1 text-center">
              현재 학급 분석 데이터를 .json 파일로 PC에 저장합니다.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">평균 가중점수 변화</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-1">
            {comparison.avgScoreChange >= 0 ? (
              <span className="text-emerald-600 flex items-center"><TrendingUp className="w-5 h-5 mr-1" /> +{comparison.avgScoreChange}점</span>
            ) : (
              <span className="text-red-600 flex items-center"><TrendingDown className="w-5 h-5 mr-1" /> {comparison.avgScoreChange}점</span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">학급 전체 선택 밀도 변화</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">고립 탈출 학생</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1 flex items-center gap-1">
            <UserPlus className="w-5 h-5" /> {comparison.freedIsolatedCount}명
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">이전 고립 → 이번 정상 적응</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">신규 고립 위험 발생</span>
          <div className="text-xl font-extrabold text-red-600 mt-1 flex items-center gap-1">
            <ShieldAlert className="w-5 h-5" /> {comparison.newIsolatedCount}명
          </div>
          <span className="text-[11px] text-red-500 font-semibold mt-1 block">집중 모니터링 필요</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">학급 응집력 방향</span>
          <div className="text-xl font-extrabold text-indigo-600 mt-1">
            {comparison.cohesionTrend === "increased" ? "🟢 상승 (친밀도 증가)" : comparison.cohesionTrend === "decreased" ? "🔴 하락 (소외 증가)" : "⚪ 유지"}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">상호지목 및 연결밀도 종합</span>
        </div>
      </div>

      {/* Student Shift Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-800">
          📈 학생별 시기별 인기점수 & 관계망 변화 상세
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold divide-y divide-slate-200">
              <tr>
                <th className="p-3">이름</th>
                <th className="p-3 text-center">이전 점수 ({wave1Title})</th>
                <th className="p-3 text-center">이번 점수 ({wave2Title})</th>
                <th className="p-3 text-center">점수 변화량</th>
                <th className="p-3 text-center">모둠 소속 변화</th>
                <th className="p-3">새로 생긴 맞지목 친구</th>
                <th className="p-3">끊어진 친구 관계</th>
                <th className="p-3 text-center">상태 진단</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {comparison.studentDeltas.map((d) => (
                <tr key={d.studentName} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">{displayName(d.studentName)}</td>
                  <td className="p-3 text-center font-mono">{d.wave1Score}점</td>
                  <td className="p-3 text-center font-mono font-bold text-indigo-600">{d.wave2Score}점</td>
                  <td className="p-3 text-center font-bold">
                    {d.scoreDelta > 0 ? (
                      <span className="text-emerald-600">+{d.scoreDelta}</span>
                    ) : d.scoreDelta < 0 ? (
                      <span className="text-red-600">{d.scoreDelta}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-500">
                    {d.wave1Community} <ArrowRight className="w-3 h-3 inline mx-1" /> {d.wave2Community}
                  </td>
                  <td className="p-3 text-emerald-600 font-medium">
                    {d.newFriends.length > 0 ? d.newFriends.map((f) => displayName(f)).join(", ") : "없음"}
                  </td>
                  <td className="p-3 text-red-500">
                    {d.lostFriends.length > 0 ? d.lostFriends.map((f) => displayName(f)).join(", ") : "없음"}
                  </td>
                  <td className="p-3 text-center font-semibold">
                    {d.statusChange === "isolated_freed" ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        🎉 고립 탈출
                      </span>
                    ) : d.statusChange === "isolated_new" ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold">
                        ⚠️ 신규 고립 발생
                      </span>
                    ) : d.statusChange === "improving" ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px]">
                        📈 친밀도 상승
                      </span>
                    ) : d.statusChange === "declining" ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">
                        📉 선택 감소
                      </span>
                    ) : (
                      <span className="text-slate-400">유지</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roster Guide Modal */}
      {isRosterGuideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 bg-amber-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-800/80 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-amber-50">💡 시기별 관계망 분석 안내 & 데이터 매칭 가이드</h3>
                  <p className="text-xs text-amber-200/80 mt-0.5">동일 명단 기반 종단 분석의 중요성 및 미일치 시 유의사항</p>
                </div>
              </div>
              <button
                onClick={() => setIsRosterGuideModalOpen(false)}
                className="p-1 text-amber-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs leading-relaxed text-slate-700">
              {/* Section 1 */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs text-amber-950">
                  📌 1. 동일한 학생 명단의 이전(1차) 데이터가 필요한 이유
                </h4>
                <p className="text-slate-700">
                  시기별 교우관계 변화 분석(Longitudinal SNA)은 <strong>동일한 학생 그룹</strong>을 대상으로 1차(이전 조사)와 2차(이번 조사) 사이의 지목 관계, 개인별 인기점수 변화(Delta), 고립 탈출 및 신규 고립 위험 발생을 <strong>1:1 추적 계산</strong>하는 알고리즘입니다.
                </p>
                <p className="text-slate-700">
                  따라서 1차와 2차의 <strong>학생 이름 및 학번 코드</strong>가 일치해야 학생 개개인의 관계망 성장과 학급 전체 응집력 방향을 정확히 파악할 수 있습니다.
                </p>
              </div>

              {/* Section 2 */}
              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-rose-950 flex items-center gap-1.5 text-xs">
                  ⚠️ 2. 이전 데이터 없이(또는 서로 다른 명단으로) 분석할 경우 발생하는 문제점
                </h4>
                <ul className="space-y-2 text-rose-900 list-disc list-inside pl-1">
                  <li>
                    <strong className="text-rose-950 font-bold">인물 1:1 매칭 실패:</strong> 1차 조사에 없는 학생은 '신규 전입'으로, 2차 조사에 없는 학생은 '전출'로 자동 간주되거나 아예 별개 인물로 처리되어 교우관계 변화 추적이 불가능해집니다.
                  </li>
                  <li>
                    <strong className="text-rose-950 font-bold">고립 위험 지표 왜곡:</strong> 1차에서 고립되었던 학생이 2차에서 친구를 사귀어 '고립 탈출'을 했는지, 또는 새로 '고립 위험'에 처했는지 판별할 수 없어 잘못된 생활지도 판단을 내릴 위험이 있습니다.
                  </li>
                  <li>
                    <strong className="text-rose-950 font-bold">학급 종합 통계 착오:</strong> 학급 전체 친밀도 밀도(Density), 평균 관계점수 변화, 응집력 지수 등이 실제 학급 현황과 다르게 심각하게 왜곡될 수 있습니다.
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-indigo-950 flex items-center gap-1.5 text-xs">
                  ✅ 3. 권장 사용 가이드 (데이터 업로드 방법)
                </h4>
                <div className="space-y-2 text-indigo-900">
                  <p>
                    <strong>① 1차 조사 백업 파일 사용:</strong> 지난 학기/지난달 조사 완료 후 3번 분석 탭 또는 오른쪽 상단 <span className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-bold">[이번 결과 백업]</span> 버튼으로 저장해 두었던 <code>.json</code> 백업 파일을 상단 <span className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-bold">[이전 결과 업로드]</span>를 통해 불러오시면 즉시 완벽한 종단 분석이 실행됩니다.
                  </p>
                  <p>
                    <strong>② 명단 CSV 구조 통일:</strong> 1번 메뉴 [구글 설문지 자동 생성]에서 다운로드한 동일한 [명단 CSV] 기반으로 설문을 실시하여 데이터를 적재하시면 학생 코드가 완벽하게 매칭됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsRosterGuideModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                확인 / 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
