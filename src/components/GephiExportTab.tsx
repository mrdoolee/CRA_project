import React, { useState } from "react";
import { Student, SurveyResponse, DomainAnalysisResult } from "../types/sna";
import { generateGephiNodesCSV, generateGephiEdgesCSV, downloadGephiFilesZip, downloadFile } from "../utils/gephiExporter";
import { exportExcelReport } from "../utils/excelExporter";
import { exportHTMLReport, exportSnaToHtmlReport } from "../utils/htmlExporter";
import { Download, FileSpreadsheet, Globe, Layers, Laptop, ShieldCheck, FileCode, CheckCircle2, Lock, EyeOff } from "lucide-react";

import { downloadAnonymizationMappingCsv } from "../utils/anonymizer";

interface Props {
  domainResults?: Record<string, DomainAnalysisResult>;
  students?: Student[];
  responses?: SurveyResponse[];
  analysisResults?: Record<string, DomainAnalysisResult>;
  classNameTitle?: string;
  onOpenLocalExeModal?: () => void;
  isAnonymous?: boolean;
  onDownloadLocalBackup?: () => void;
}

export const GephiExportTab: React.FC<Props> = ({
  domainResults,
  students = [],
  responses = [],
  analysisResults,
  classNameTitle = "3학년 2반",
  onOpenLocalExeModal,
  isAnonymous = false,
  onDownloadLocalBackup,
}) => {
  const activeResults = domainResults || analysisResults || {};
  const [selectedDomain, setSelectedDomain] = useState<string>("0_전체_통합");

  const currentResult = activeResults[selectedDomain] || activeResults["0_전체_통합"];

  const handleDownloadNodesCsv = () => {
    if (!currentResult) return;
    const csvContent = generateGephiNodesCSV(currentResult);
    downloadFile(csvContent, `CRA_Gephi_Nodes_${selectedDomain}.csv`);
  };

  const handleDownloadEdgesCsv = () => {
    if (!currentResult) return;
    const csvContent = generateGephiEdgesCSV(currentResult);
    downloadFile(csvContent, `CRA_Gephi_Edges_${selectedDomain}.csv`);
  };

  const handleDownloadAllZip = () => {
    downloadGephiFilesZip(activeResults, "CRA");
  };

  const handleDownloadExcel = () => {
    exportExcelReport(activeResults, "CRA_Sociogram_통합보고서.xlsx");
  };

  const handleDownloadHtml = () => {
    if (activeResults && Object.keys(activeResults).length > 0) {
      exportHTMLReport(activeResults, "학급 교우관계 분석", "CRA_5개영역통합_시각화보고서.html");
    } else if (currentResult) {
      exportSnaToHtmlReport(students, activeResults, "학급 교우관계 분석");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Layers className="w-4 h-4" /> Multi-Format Export Engine & Offline Desktop Packaging
        </div>
        <h2 className="text-xl font-extrabold mt-1">분석 데이터 내보내기 & Gephi 파일 생성 / EXE 실행 모드</h2>
        <p className="text-xs text-slate-300 mt-1">
          분석 결과를 Gephi(Node/Edge CSV), 다중 시트 Excel(.xlsx), 5개 영역 통합 인터랙티브 HTML 보고서로 저장하거나 오프라인 실행 파일(.exe)로 구성할 수 있습니다.
        </p>
      </div>

      {isAnonymous && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>현재 🔒 익명화 모드가 활성화되어 있습니다. 내보내기 및 HTML 보고서에도 학생 이름 대신 '학생 01', '학생 02'가 적용됩니다.</span>
          </div>

          <button
            onClick={() => downloadAnonymizationMappingCsv(students, classNameTitle)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            익명화 매핑명단(.csv) 다운로드
          </button>
        </div>
      )}

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Gephi Exporter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-3">
              <FileCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Gephi Network Export</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              전문 사회연결망 분석 및 3D 그래프 랜더링 소프트웨어 Gephi에서 즉시 불러올 수 있는 Node Table, Edge Table CSV 파일입니다.
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">영역 선택:</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
              >
                {Object.keys(activeResults).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleDownloadNodesCsv}
              className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Nodes CSV 다운로드 (노드 속성)
            </button>
            <button
              onClick={handleDownloadEdgesCsv}
              className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Edges CSV 다운로드 (연결선/가중치)
            </button>
            <button
              onClick={handleDownloadAllZip}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" /> 전체 5개 영역 CSV 일괄 다운로드
            </button>
          </div>
        </div>

        {/* Card 2: Multi-Sheet Excel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">다중 시트 Excel 보고서 (.xlsx)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              학생 명단, 설문 원본, 5개 영역별 SNA 정밀 지표(In-degree, Out-degree, 가중 점수, 고립여부, 모둠)가 시트별로 깔끔하게 정리된 엑셀 파일입니다.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleDownloadExcel}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> 5개 영역 통합 Excel (.xlsx) 다운로드
            </button>
          </div>
        </div>

        {/* Card 3: Interactive 5-in-1 HTML */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit mb-3">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">5개 영역 통합 HTML 보고서</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              5개 영역 시각화와 인터랙티브 D3.js 그래픽, 영역 전환 탭, 익명화 스위치가 탑재된 단일 HTML 파일입니다. 브라우저에서 바로 독립 실행됩니다.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleDownloadHtml}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Globe className="w-4 h-4" /> 5개 영역 통합 HTML 시각화 보고서 다운로드
            </button>
          </div>
        </div>

        {/* Card 4: Local Backup JSON */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl w-fit mb-3">
              <Download className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">로컬 백업 데이터 저장 (.json)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              현재 입력된 학생 명렬표, 설문 응답 원본 및 설문 가중치 데이터를 단일 백업 파일(.json)로 안전하게 저장합니다. 나중에 복원하거나 보관할 때 사용합니다.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                if (onDownloadLocalBackup) {
                  onDownloadLocalBackup();
                } else {
                  const backupObj = { students, responses };
                  downloadFile(
                    JSON.stringify(backupObj, null, 2),
                    `CRA_분석결과_로컬저장_${new Date().toISOString().slice(0, 10)}.json`,
                    "application/json;charset=utf-8;"
                  );
                }
              }}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4 text-indigo-300" /> 로컬 백업 (.json) 파일 저장
            </button>
          </div>
        </div>
      </div>

      {/* Offline Desktop Privacy Section */}
      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">개인정보보호 완벽 보장 (개인 Local Device 전용 동작)</h4>
            <p className="text-xs text-slate-600 mt-1">
              본 웹앱은 모든 설문 분석 및 네트워크 그래프 계산이 <strong>선생님의 웹 브라우저 메모리(Client-side)</strong>에서만 수행되며,
              학생의 개인정보나 이름은 외부 서버에 저장되지 않습니다.
            </p>
          </div>
        </div>

        {onOpenLocalExeModal && (
          <button
            onClick={onOpenLocalExeModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex-shrink-0 flex items-center gap-1.5"
          >
            <Laptop className="w-4 h-4 text-indigo-400" /> .EXE 패키징 가이드 보기
          </button>
        )}
      </div>
    </div>
  );
};
