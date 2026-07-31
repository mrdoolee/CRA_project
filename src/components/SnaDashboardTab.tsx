import React, { useState } from "react";
import { Student, DomainAnalysisResult, StudentMetrics } from "../types/sna";
import { NetworkGraph } from "./NetworkGraph";
import {
  Users,
  GitCommit,
  ShieldAlert,
  Award,
  Search,
  Sparkles,
  Network,
  ArrowUpDown,
  ChevronRight,
  X,
  ExternalLink,
  HelpCircle,
  Info,
  Download,
  FileSpreadsheet,
  FolderDown,
} from "lucide-react";
import { getAnonymizedName } from "../utils/anonymizer";
import { exportExcelReport } from "../utils/excelExporter";
import { exportSnaToHtmlReport } from "../utils/htmlExporter";

interface Props {
  analysisResults: Record<string, DomainAnalysisResult>;
  onSelectStudentForAi: (studentName: string) => void;
  isAnonymous?: boolean;
  students?: Student[];
  classNameTitle?: string;
  onDownloadLocalBackup?: () => void;
}

type ModalCategory = "total" | "mutual" | "isolated" | "popular" | "bridge" | null;

export const SnaDashboardTab: React.FC<Props> = ({
  analysisResults,
  onSelectStudentForAi,
  isAnonymous = false,
  students = [],
  classNameTitle = "학급",
  onDownloadLocalBackup,
}) => {
  const [activeDomainKey, setActiveDomainKey] = useState<string>("0_전체_통합");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [sortField, setSortField] = useState<keyof StudentMetrics>("weightedInScore");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Modal state when clicking KPI metric cards
  const [modalCategory, setModalCategory] = useState<ModalCategory>(null);

  // Modal state for Sociogram Tip
  const [isTipModalOpen, setIsTipModalOpen] = useState<boolean>(false);

  const currentResult = analysisResults[activeDomainKey] || Object.values(analysisResults)[0];

  if (!currentResult) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        데이터가 없습니다. 데이터 입력 탭에서 설문 파일을 업로드해주세요.
      </div>
    );
  }

  const allNames = currentResult.nodes.map((n) => n.id);
  const displayName = (name: string) => {
    if (!name) return "";
    if (isAnonymous) {
      const metric = currentResult.metrics[name];
      if (metric && metric.studentCode) {
        return `코드 ${metric.studentCode}`;
      }
      const nodeObj = currentResult.nodes.find((n) => n.id === name);
      if (nodeObj && (nodeObj as any).code) {
        return `코드 ${(nodeObj as any).code}`;
      }
    }
    return getAnonymizedName(name, Object.values(currentResult.metrics), isAnonymous);
  };

  // Filter student table
  let studentMetricsList = Object.values(currentResult.metrics) as StudentMetrics[];

  if (roleFilter === "popular") {
    studentMetricsList = studentMetricsList.filter((m) => m.isPopular);
  } else if (roleFilter === "bridge") {
    studentMetricsList = studentMetricsList.filter((m) => m.isBridge);
  } else if (roleFilter === "isolated") {
    studentMetricsList = studentMetricsList.filter((m) => m.isIsolated);
  } else if (roleFilter === "mutual") {
    studentMetricsList = studentMetricsList.filter((m) => m.mutualCount > 0);
  }

  if (tableSearch.trim()) {
    const q = tableSearch.toLowerCase().trim();
    studentMetricsList = studentMetricsList.filter(
      (m) => m.studentName.toLowerCase().includes(q) || m.studentCode.includes(q)
    );
  }

  // Sort
  studentMetricsList.sort((a, b) => {
    const valA = a[sortField] as any;
    const valB = b[sortField] as any;
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof StudentMetrics) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const domainPills = [
    { key: "0_전체_통합", label: "0_전체 통합 네트워크" },
    { key: "1_정서적_친밀감", label: "1_정서적 친밀감 (식사/하교)" },
    { key: "2_기능적_협력", label: "2_기능적 협력 (과제/모둠)" },
    { key: "3_사회적_영향력", label: "3_사회적 영향력 (리더십)" },
    { key: "4_교우관계_확장", label: "4_교우관계 확장 (친해지고 싶은)" },
  ];

  const allMetrics = Object.values(currentResult.metrics) as StudentMetrics[];
  const isolatedList = allMetrics.filter((m) => m.isIsolated);
  const popularList = allMetrics.filter((m) => m.isPopular);
  const bridgeList = allMetrics.filter((m) => m.isBridge);
  const mutualList = allMetrics.filter((m) => m.mutualCount > 0);

  // Modal Student Target List based on active KPI card click
  const getModalStudents = (): { title: string; subtitle: string; icon: any; list: StudentMetrics[]; color: string } => {
    switch (modalCategory) {
      case "isolated":
        return {
          title: "고립/소외 위험 학생 명단",
          subtitle: "받은 지목 횟수가 0~1회 이하로, 학급 내 관계 개선 및 밀착 상담이 필요한 학생들입니다.",
          icon: ShieldAlert,
          list: isolatedList,
          color: "text-red-600 bg-red-50 border-red-200",
        };
      case "popular":
        return {
          title: "핵심 인기 학생 명단",
          subtitle: "가중 지목 점수가 상위권인 학생들로, 학급의 분위기나 긍정적 문화를 형성하는 리더십 그룹입니다.",
          icon: Award,
          list: popularList,
          color: "text-amber-600 bg-amber-50 border-amber-200",
        };
      case "bridge":
        return {
          title: "가교/중재자 학생 명단",
          subtitle: "서로 다른 소집단(모둠) 사이를 연결하며 매개 역할을 수행하는 핵심 중재자 학생들입니다.",
          icon: Network,
          list: bridgeList,
          color: "text-purple-600 bg-purple-50 border-purple-200",
        };
      case "mutual":
        return {
          title: "상호지목(맞지목) 연결 형성 학생 명단",
          subtitle: "서로를 1순위~3순위로 주고받아 안정적인 친밀 관계를 형성하고 있는 학생 그룹입니다.",
          icon: GitCommit,
          list: mutualList,
          color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        };
      case "total":
      default:
        return {
          title: "전체 학생 명단",
          subtitle: "현재 분석에 포함된 전체 학급 인원 목록입니다.",
          icon: Users,
          list: allMetrics,
          color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        };
    }
  };

  const activeModalData = modalCategory ? getModalStudents() : null;

  return (
    <div className="space-y-6">
      {/* Top Action Bar for Menu 3 (Report & Backup Downloads) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>관계망 분석(Sociogram) 보고서 및 백업 저장</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDownloadLocalBackup && (
            <button
              onClick={onDownloadLocalBackup}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
              title="현재 설문 및 학생 데이터를 .json 파일로 저장합니다."
            >
              <FolderDown className="w-3.5 h-3.5 text-indigo-300" />
              JSON 백업 저장
            </button>
          )}

          <button
            onClick={() => exportExcelReport(analysisResults, "CRA_Sociogram_통합보고서.xlsx")}
            className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 hover:bg-emerald-100 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
            title="5개 영역 전체 분석 결과를 XLSX 엑셀 보고서로 저장합니다."
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            XLSX 보고서 저장
          </button>

          <button
            onClick={() => exportSnaToHtmlReport(students, analysisResults, classNameTitle)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
            title="웹 브라우저에서 독립 실행 가능한 인터랙티브 HTML 보고서를 저장합니다."
          >
            <Download className="w-3.5 h-3.5" />
            HTML 보고서 저장
          </button>
        </div>
      </div>

      {/* Domain Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        {domainPills.map((pill) => (
          <button
            key={pill.key}
            onClick={() => setActiveDomainKey(pill.key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeDomainKey === pill.key
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            {pill.label}
          </button>
        ))}
      </div>

      {/* Classroom Summary KPI Cards - CLICKABLE TO OPEN MODALS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Students Card */}
        <div
          onClick={() => setModalCategory("total")}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold group-hover:text-indigo-600 transition-colors">총 학생 수</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{currentResult.nodes.length}명</div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1 flex items-center gap-1">
            <span>클릭하여 명단 확인</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Reciprocity Rate Card */}
        <div
          onClick={() => setModalCategory("mutual")}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold group-hover:text-emerald-600 transition-colors">상호지목(맞지목) 비율</span>
            <GitCommit className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-2">{currentResult.reciprocityRate}%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span>{mutualList.length}명 맞지목 연결 보기</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Isolated Risk Card */}
        <div
          onClick={() => setModalCategory("isolated")}
          className="bg-red-50/50 p-4 rounded-xl border border-red-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-red-700 text-xs font-bold">
            <span>고립/소외 위험 학생</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-black text-red-600 mt-2">{isolatedList.length}명</div>
          <div className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
            <span>⚠️ 클릭하여 위험 학생 확인</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Core Popular Card */}
        <div
          onClick={() => setModalCategory("popular")}
          className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
            <span>핵심 인기 학생</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 mt-2">{popularList.length}명</div>
          <div className="text-[11px] text-amber-700 font-bold mt-1 flex items-center gap-1">
            <span>⭐ 클릭하여 리더 학생 확인</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Bridge Role Card */}
        <div
          onClick={() => setModalCategory("bridge")}
          className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-purple-800 text-xs font-bold">
            <span>가교/중재자 학생</span>
            <Network className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 mt-2">{bridgeList.length}명</div>
          <div className="text-[11px] text-purple-700 font-bold mt-1 flex items-center gap-1">
            <span>🌉 클릭하여 중재자 확인</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Network Visual Graph Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              🌐 {currentResult.domainTitle} 시각화 그래프
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              노드를 드래그하거나 클릭하여 학생의 연결 관계(발신/수신)를 자세히 확인하세요.
            </p>
          </div>

          {/* Sociogram Interpretation Tip Button */}
          <button
            onClick={() => setIsTipModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            💡 Sociogram 해석 Tip
          </button>
        </div>

        <NetworkGraph data={currentResult} isAnonymous={isAnonymous} />
      </div>

      {/* Student SNA Metrics Table Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            📊 학생별 사회연결망(SNA) 상세 지표 및 역할 분류
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="학생 검색..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setRoleFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  roleFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setRoleFilter("isolated")}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  roleFilter === "isolated" ? "bg-red-600 text-white" : "text-slate-600 hover:text-red-600"
                }`}
              >
                고립위험 ({isolatedList.length})
              </button>
              <button
                onClick={() => setRoleFilter("popular")}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  roleFilter === "popular" ? "bg-amber-600 text-white" : "text-slate-600 hover:text-amber-600"
                }`}
              >
                핵심인기 ({popularList.length})
              </button>
              <button
                onClick={() => setRoleFilter("bridge")}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  roleFilter === "bridge" ? "bg-purple-600 text-white" : "text-slate-600 hover:text-purple-600"
                }`}
              >
                가교중재자 ({bridgeList.length})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold divide-y divide-slate-200">
              <tr>
                <th className="p-3 cursor-pointer" onClick={() => handleSort("rank")}>
                  <div className="flex items-center gap-1">순위 <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">이름 <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3">소집단(모둠)</th>
                <th className="p-3 cursor-pointer text-center" onClick={() => handleSort("inDegree")}>
                  <div className="flex items-center justify-center gap-1">지목받은 횟수 <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 cursor-pointer text-center" onClick={() => handleSort("weightedInScore")}>
                  <div className="flex items-center justify-center gap-1">가중 인기점수 <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 cursor-pointer text-center" onClick={() => handleSort("betweennessScore")}>
                  <div className="flex items-center justify-center gap-1">중재자 점수 <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 text-center">맞지목 수</th>
                <th className="p-3">맞지목 친구들</th>
                <th className="p-3 text-center">역할 진단</th>
                <th className="p-3 text-right">AI 조언</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {studentMetricsList.map((m) => (
                <tr key={m.studentName} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-500">#{m.rank}</td>
                  <td className="p-3 font-semibold text-slate-900">{displayName(m.studentName)}</td>
                  <td className="p-3 font-mono text-slate-600">{m.community}</td>
                  <td className="p-3 text-center font-bold text-slate-800">{m.inDegree}회</td>
                  <td className="p-3 text-center font-extrabold text-indigo-600">{m.weightedInScore}점</td>
                  <td className="p-3 text-center font-mono text-slate-600">{m.betweennessScore}</td>
                  <td className="p-3 text-center font-bold text-emerald-600">{m.mutualCount}명</td>
                  <td className="p-3 max-w-[180px] truncate text-slate-500">
                    {m.mutualPartners.length > 0
                      ? m.mutualPartners.map((p) => displayName(p)).join(", ")
                      : "없음"}
                  </td>
                  <td className="p-3 text-center">
                    {m.isIsolated ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                        ⚠️ 고립 위험
                      </span>
                    ) : m.isPopular ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                        ⭐ 핵심 인기
                      </span>
                    ) : m.isBridge ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]">
                        🌉 가교 역할
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                        일반
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onSelectStudentForAi(m.studentName)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold flex items-center gap-1 text-[11px] ml-auto"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      AI 상담 <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI Card Student Detail Modal Popup */}
      {modalCategory && activeModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-start justify-between ${activeModalData.color}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/80 rounded-xl shadow-sm">
                  <activeModalData.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    {activeModalData.title} ({activeModalData.list.length}명)
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                    {activeModalData.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors bg-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Student List Table */}
            <div className="p-6 overflow-y-auto space-y-4">
              {activeModalData.list.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  해당 카테고리에 속한 학생이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeModalData.list.map((st) => (
                    <div
                      key={st.studentName}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {displayName(st.studentName)}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">
                            코드 {st.studentCode}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 space-x-2">
                          <span>지목받은 횟수: <strong className="text-slate-800">{st.inDegree}회</strong></span>
                          <span>|</span>
                          <span>가중점수: <strong className="text-indigo-600">{st.weightedInScore}점</strong></span>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          맞지목: {st.mutualPartners.length > 0 ? st.mutualPartners.map(p => displayName(p)).join(", ") : "없음"}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setModalCategory(null);
                          onSelectStudentForAi(st.studentName);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm flex-shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        AI 상담
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalCategory(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sociogram Tip Modal Popup */}
      {isTipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-800 rounded-xl">
                  <Info className="w-5 h-5 text-indigo-300" />
                </div>
                <h3 className="text-base font-extrabold">💡 Sociogram(소시오그램) 해석 가이드</h3>
              </div>
              <button
                onClick={() => setIsTipModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Node Size Explanation Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  🔴🔵 학생 노드(원 크기) 의미 안내
                </h4>
                <div className="text-xs text-slate-700 leading-relaxed space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-[10px] flex-shrink-0 mt-0.5">
                      대
                    </div>
                    <div>
                      <strong className="text-indigo-950 font-bold">원이 클수록 (중심성 높음):</strong>
                      <p className="text-slate-600 mt-0.5">
                        많은 친구들에게 지목받은 학생으로, 해당 영역에서 <strong>학급 내 영향력·인지도·선호도</strong>가 높음을 의미합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0 mt-1">
                      소
                    </div>
                    <div>
                      <strong className="text-slate-800 font-bold">원이 작을수록 (피지목 적음):</strong>
                      <p className="text-slate-600 mt-0.5">
                        선택받은 횟수가 적은 학생으로, 소외되거나 <strong>고립 위험</strong>이 있는지 세심한 관심과 지속적 케어가 필요합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edge Legend Explanation Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  🔗 관계 선(Edge) 연결 범례 안내
                </h4>
                <div className="text-xs text-slate-700 leading-relaxed space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-1 bg-indigo-600 rounded flex-shrink-0"></div>
                    <div>
                      <strong className="text-indigo-950 font-bold">진한 파란 선 (두꺼운 선): 상호지목 관계</strong>
                      <p className="text-slate-600 mt-0.5">두 학생이 서로를 동시에 선택한 양방향 친밀 관계</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-0.5 bg-slate-300 flex-shrink-0"></div>
                    <div>
                      <strong className="text-slate-800 font-bold">연한 회색 선 (가느다란 선): 단방향 지목 관계</strong>
                      <p className="text-slate-600 mt-0.5">한쪽 학생만 상대를 선택한 화살표 지목 연결</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsTipModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
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
