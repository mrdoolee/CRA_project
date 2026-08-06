import React, { useState, useMemo } from "react";
import { Student, SurveyResponse, SelfAssessmentResponse, WeightScheme, DomainAnalysisResult } from "./types/sna";
import { SAMPLE_STUDENTS, SAMPLE_RESPONSES_WAVE1 } from "./data/sampleData";
import { analyzeSNA } from "./utils/snaEngine";
import { GoogleScriptGeneratorTab } from "./components/GoogleScriptGeneratorTab";
import { SnaDashboardTab } from "./components/SnaDashboardTab";
import { DataManagementTab } from "./components/DataManagementTab";
import { SelfAssessmentTab } from "./components/SelfAssessmentTab";
import { AiCounselingTab } from "./components/AiCounselingTab";
import { LongitudinalTab } from "./components/LongitudinalTab";
import { GephiExportTab } from "./components/GephiExportTab";
import { LocalExeGuideModal } from "./components/LocalExeGuideModal";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { SystemInfoModal } from "./components/SystemInfoModal";
import { Footer } from "./components/Footer";
import { exportExcelReport } from "./utils/excelExporter";
import { exportHTMLReport, exportSnaToHtmlReport } from "./utils/htmlExporter";
import { downloadAnonymizationMappingCsv } from "./utils/anonymizer";

import {
  Network,
  Upload,
  FileCode,
  GitCompare,
  Sparkles,
  FileSpreadsheet,
  Download,
  Users,
  Laptop,
  ShieldCheck,
  Key,
  EyeOff,
  Eye,
  Settings,
  Info,
  Smile,
} from "lucide-react";

export default function App() {
  // Navigation active tab: "script" (1번 메뉴: Google 설문지 생성) is placed FIRST as requested
  const [activeTab, setActiveTab] = useState<
    "script" | "import" | "selfAssessment" | "dashboard" | "counseling" | "history" | "gephi"
  >("script");

  // Gemini API Key state from localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || "";
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // Anonymous Mode toggle state (Student names on/off)
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);

  // Default weights: 1st place 2.0, 2nd 1.5, 3rd 1.0
  const [weights, setWeights] = useState<WeightScheme>([2.0, 1.5, 1.0]);

  // Current Class & Wave Title & Teacher Name
  const [classNameTitle, setClassNameTitle] = useState<string>("우리반");
  const [teacherName, setTeacherName] = useState<string>("담임교사");
  const [waveTitle, setWaveTitle] = useState<string>("1차 조사 (1학기 초 3월)");

  // State for students and responses (처음 접속 시 빈 데이터 상태)
  const [students, setStudents] = useState<Student[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selfAssessments, setSelfAssessments] = useState<SelfAssessmentResponse[]>([]);

  // Check if survey response data is loaded
  const hasData = responses.length > 0;

  // Selected student for direct jump to AI Counseling
  const [selectedStudentForAi, setSelectedStudentForAi] = useState<string | null>(null);

  // Modal for local EXE guide & teacher profile
  const [isExeModalOpen, setIsExeModalOpen] = useState<boolean>(false);
  const [isTeacherProfileEdit, setIsTeacherProfileEdit] = useState<boolean>(false);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem("gemini_api_key", newKey);
  };

  // Compute SNA analysis across all domains
  const analysisResults: Record<string, DomainAnalysisResult> = useMemo(() => {
    return analyzeSNA(students, responses, weights);
  }, [students, responses, weights]);

  const overallDomain = analysisResults["0_전체_통합"];

  const handleSelectStudentForAi = (studentName: string) => {
    setSelectedStudentForAi(studentName);
    setActiveTab("counseling");
  };

  const handleLoadSampleData = () => {
    setStudents(SAMPLE_STUDENTS);
    setResponses(SAMPLE_RESPONSES_WAVE1);
    setSelfAssessments([]);
    setClassNameTitle("3학년 2반");
    setWaveTitle("1차 조사 (1학기 초 3월)");
    setActiveTab("dashboard");
  };

  // Local Backup Download Handler (.json)
  const handleDownloadLocalBackup = () => {
    const backupData = {
      version: "1.0",
      classNameTitle,
      teacherName,
      waveTitle,
      weights,
      students,
      responses,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const todayStr = new Date().toISOString().slice(0, 10);
    link.download = `CRA_분석결과_로컬저장_${todayStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Local Backup Upload/Restore Handler (.json)
  const handleUploadLocalBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.students && Array.isArray(data.students)) {
          setStudents(data.students);
        }
        if (data.responses && Array.isArray(data.responses)) {
          setResponses(data.responses);
        }
        if (data.weights && Array.isArray(data.weights)) {
          setWeights(data.weights);
        }
        if (data.waveTitle) {
          setWaveTitle(data.waveTitle);
        }
        if (data.classNameTitle) {
          setClassNameTitle(data.classNameTitle);
        }
        if (data.teacherName) {
          setTeacherName(data.teacherName);
        }
        setActiveTab("dashboard");
        alert("✅ 백업 데이터 복원 완료! [4. 관계망 분석] 화면으로 이동했습니다.");
      } catch (err: any) {
        alert("올바르지 않은 백업(.json) 파일입니다: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-800">
      {/* Sleek Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 flex-shrink-0">
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-xs tracking-tight leading-snug">
                학급 교우관계 분석 도우미
              </h1>
              <p className="text-[12px] text-indigo-400 font-bold mt-1 leading-tight tracking-wide">
                Classroom<br />
                Relationship<br />
                Analysis
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* 1. Google 설문지 생성 */}
          <button
            onClick={() => setActiveTab("script")}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "script"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <div className="flex items-center min-w-0">
              <FileCode className="w-4 h-4 mr-2.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate">1. Google 설문지 생성</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex-shrink-0 ml-1">
              START
            </span>
          </button>

          {/* 2. 설문/명렬표 데이터 관리 */}
          <button
            onClick={() => setActiveTab("import")}
            className={`w-full flex items-center px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "import"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-200"
            }`}
          >
            <Upload className="w-4 h-4 mr-2.5 text-indigo-400 flex-shrink-0" />
            <span className="truncate">2. 설문/명렬표 데이터 관리</span>
          </button>

          {/* 3. 학생 자기평가 */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("selfAssessment");
            }}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "selfAssessment"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : hasData
                ? "text-slate-300 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-800/40 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center min-w-0">
              <Smile className="w-4 h-4 mr-2.5 flex-shrink-0 text-amber-400" />
              <span className="truncate">3. 학생 자기평가</span>
            </div>
            {!hasData && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-medium flex-shrink-0 ml-1">
                데이터 필요
              </span>
            )}
          </button>

          {/* 4. 관계망 분석 (Network Dashboard) */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("dashboard");
            }}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : hasData
                ? "text-slate-300 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-800/40 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center min-w-0">
              <Network className="w-4 h-4 mr-2.5 flex-shrink-0 text-indigo-400" />
              <span className="truncate">4. 관계망 분석 (Sociogram)</span>
            </div>
            {!hasData && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-medium flex-shrink-0 ml-1">
                데이터 필요
              </span>
            )}
          </button>

          {/* 5. AI 맞춤 상담 조언 */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("counseling");
            }}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "counseling"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : hasData
                ? "text-slate-300 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-800/40 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center min-w-0">
              <Sparkles className="w-4 h-4 mr-2.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">5. AI 맞춤 상담 조언</span>
            </div>
            {hasData ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex-shrink-0 ml-1">
                AI
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-medium flex-shrink-0 ml-1">
                데이터 필요
              </span>
            )}
          </button>

          {/* 6. 누적 관계 변화 (History) */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("history");
            }}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : hasData
                ? "text-slate-300 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-800/40 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center min-w-0">
              <GitCompare className="w-4 h-4 mr-2.5 text-indigo-400 flex-shrink-0" />
              <span className="truncate">6. 누적 관계 변화 (History)</span>
            </div>
            {!hasData && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-medium flex-shrink-0 ml-1">
                데이터 필요
              </span>
            )}
          </button>

          {/* 7. Gephi / 보고서 / 백업 데이터 */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("gephi");
            }}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "gephi"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : hasData
                ? "text-slate-300 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-800/40 cursor-not-allowed"
            }`}
            title="7. Gephi / 보고서 / 백업 데이터 저장"
          >
            <div className="flex items-center min-w-0">
              <FileCode className="w-4 h-4 mr-2.5 flex-shrink-0" />
              <span className="truncate">7. Gephi / 보고서 / 백업</span>
            </div>
            {!hasData && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-medium flex-shrink-0 ml-1">
                데이터 필요
              </span>
            )}
          </button>
        </nav>

        {/* Sidebar Footer User Info & Local EXE Mode Button */}
        <div className="p-3.5 border-t border-slate-800 space-y-2.5">
          {/* 1. Gemini API Key Config Quick Button */}
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border ${
              apiKey
                ? "bg-indigo-950 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900"
                : "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 font-extrabold shadow-sm"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {apiKey ? "Gemini API Key 설정됨" : "🔑 Gemini API Key 설정"}
          </button>

          {/* 2. Privacy Protection Card & Offline EXE Guide */}
          <div className="p-2.5 bg-slate-800/80 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 leading-tight">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>개인정보보호 완벽 보장<br /><span className="text-[9px] text-slate-300 font-normal">(개인 Local Device 전용 동작)</span></span>
            </div>
            <button
              onClick={() => setIsExeModalOpen(true)}
              className="w-full py-1.5 px-2 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Laptop className="w-3.5 h-3.5 text-white" />
              <span>오프라인 .EXE 실행 가이드</span>
            </button>
          </div>

          {/* 3. CRA System Info & Usage Guide Button */}
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700/60"
          >
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>CRA 시스템 이용 안내 / 문의</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header & Action Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-6">
            <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 flex items-center gap-2">
              {activeTab === "script" && "1. Google 설문지 생성"}
              {activeTab === "import" && "2. 설문/명렬표 데이터 관리"}
              {activeTab === "selfAssessment" && "3. 학생 자기평가"}
              {activeTab === "dashboard" && "4. 관계망 분석 (Sociogram)"}
              {activeTab === "counseling" && "5. AI 맞춤 상담 조언"}
              {activeTab === "history" && "6. 누적 관계 변화 (History)"}
              {activeTab === "gephi" && "7. Gephi / 보고서 / 백업 데이터"}
            </span>
          </div>

          {/* Action buttons visible on Menu 3~7 */}
          {["selfAssessment", "dashboard", "counseling", "history", "gephi"].includes(activeTab) && (
            <div className="flex items-center space-x-3">
              {/* Student Name Anonymization Toggle */}
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                  isAnonymous
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
                title="상담/화면 공유 시 학생 이름을 익명(코드 1701, 코드 1702)으로 전환합니다."
              >
                {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {isAnonymous ? "🔒 익명화 ON" : "🔓 실명 표시"}
              </button>

              {/* Anonymization Mapping CSV Download Button */}
              <button
                onClick={() => downloadAnonymizationMappingCsv(students, classNameTitle)}
                className="px-3.5 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                title="실제 학생 이름과 부여된 개인코드 간의 대조 매핑표를 CSV로 다운로드합니다."
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                익명화명단
              </button>
            </div>
          )}
        </header>

        {/* Tab Body View */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === "script" && (
            <GoogleScriptGeneratorTab
              classNameTitle={classNameTitle}
              onLoadSampleData={handleLoadSampleData}
            />
          )}

          {activeTab === "import" && (
            <DataManagementTab
              students={students}
              surveyResponses={responses}
              weights={weights}
              waveTitle={waveTitle}
              onUpdateData={(newStudents, newResponses, newSelfAssessments) => {
                setStudents(newStudents);
                setResponses(newResponses);
                if (newSelfAssessments !== undefined) setSelfAssessments(newSelfAssessments);
              }}
              onUpdateWeights={setWeights}
              onUpdateWaveTitle={setWaveTitle}
              onLoadSampleData={handleLoadSampleData}
              onUploadBackupFile={handleUploadLocalBackupFile}
            />
          )}

          {hasData && activeTab === "selfAssessment" && (
            <SelfAssessmentTab
              selfAssessments={selfAssessments}
              students={students}
              isAnonymous={isAnonymous}
            />
          )}

          {!hasData && activeTab !== "script" && activeTab !== "import" && (
            <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-6">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
                <Network className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  분석할 설문 응답 데이터가 없습니다
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  선생님, 사회연결망(Sociogram) 시각화 및 AI 맞춤 조언을 확인하려면 먼저 설문 응답 데이터를 등록하셔야 합니다.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2 text-left">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  어떻게 시작하면 되나요?
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li><strong>샘플 데이터로 체험하기:</strong> 아래 버튼을 누르시면 25명 규모의 실제 학급 샘플 데이터로 모든 기능(관계망, AI 조언, 변화 분석)을 즉시 체험할 수 있습니다.</li>
                  <li><strong>실제 학급 데이터 분석하기:</strong> 2번 메뉴에서 구글 설문 응답 결과(.csv / .xlsx)를 업로드해 주세요.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleLoadSampleData}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 font-extrabold text-slate-950 text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>샘플 데이터로 바로 시작하기 (25명)</span>
                </button>

                <button
                  onClick={() => setActiveTab("import")}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-200" />
                  <span>2. 설문 데이터 업로드 메뉴로 이동</span>
                </button>
              </div>
            </div>
          )}

          {hasData && activeTab === "dashboard" && (
            <SnaDashboardTab
              analysisResults={analysisResults}
              onSelectStudentForAi={handleSelectStudentForAi}
              isAnonymous={isAnonymous}
              students={students}
              classNameTitle={classNameTitle}
              onDownloadLocalBackup={handleDownloadLocalBackup}
            />
          )}

          {hasData && activeTab === "counseling" && (
            <AiCounselingTab
              overallResult={overallDomain}
              selectedStudentName={selectedStudentForAi}
              onSelectStudent={setSelectedStudentForAi}
              apiKey={apiKey}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
              isAnonymous={isAnonymous}
              classNameTitle={classNameTitle}
              students={students}
            />
          )}

          {hasData && activeTab === "history" && (
            <LongitudinalTab
              currentWaveTitle={waveTitle}
              currentAnalysisResults={analysisResults}
              apiKey={apiKey}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
              isAnonymous={isAnonymous}
              classNameTitle={classNameTitle}
              onDownloadLocalBackup={handleDownloadLocalBackup}
              students={students}
            />
          )}

          {hasData && activeTab === "gephi" && (
            <GephiExportTab
              students={students}
              responses={responses}
              analysisResults={analysisResults}
              classNameTitle={classNameTitle}
              onOpenLocalExeModal={() => setIsExeModalOpen(true)}
              isAnonymous={isAnonymous}
              onDownloadLocalBackup={handleDownloadLocalBackup}
            />
          )}

          {/* Copyright & Footer */}
          <Footer />
        </div>
      </main>

      {/* Gemini API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      {/* Local EXE Guide Modal */}
      <LocalExeGuideModal
        isOpen={isExeModalOpen}
        onClose={() => setIsExeModalOpen(false)}
      />

      {/* CRA System Info & Usage Guide Modal */}
      <SystemInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}
