import React, { useState } from "react";
import { Student, SurveyResponse, WeightScheme } from "../types/sna";
import { parseRosterFile, parseSurveyFile } from "../utils/fileParser";
import { Upload, Users, FileSpreadsheet, Settings2, Plus, Sparkles, CheckCircle2, FolderOpen } from "lucide-react";

interface Props {
  students: Student[];
  surveyResponses: SurveyResponse[];
  weights: WeightScheme;
  waveTitle: string;
  onUpdateData: (newStudents: Student[], newResponses: SurveyResponse[]) => void;
  onUpdateWeights: (newWeights: WeightScheme) => void;
  onUpdateWaveTitle: (newTitle: string) => void;
  onLoadSampleData: () => void;
  onUploadBackupFile: (file: File) => void;
}

export const DataManagementTab: React.FC<Props> = ({
  students,
  surveyResponses,
  weights,
  waveTitle,
  onUpdateData,
  onUpdateWeights,
  onUpdateWaveTitle,
  onLoadSampleData,
  onUploadBackupFile,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [w1, setW1] = useState(weights[0]);
  const [w2, setW2] = useState(weights[1]);
  const [w3, setW3] = useState(weights[2]);

  const handleRosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setStatusMsg("명렬표 파일 파싱 중...");
      const parsedStudents = await parseRosterFile(file);
      onUpdateData(parsedStudents, surveyResponses);
      setStatusMsg(`✅ 명렬표 등록 완료: 총 ${parsedStudents.length}명의 학생 정보를 불러왔습니다.`);
    } catch (err: any) {
      alert(`명렬표 읽기 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setStatusMsg("구글 설문 응답 파싱 중...");
      const result = await parseSurveyFile(file, students);
      onUpdateData(result.students, result.surveyResponses);
      setStatusMsg(
        `✅ 설문 응답 불러오기 완료: 총 ${result.surveyResponses.length}건의 응답 데이터 파싱 성공!`
      );
    } catch (err: any) {
      alert(`설문 응답 읽기 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeights = () => {
    onUpdateWeights([Number(w1), Number(w2), Number(w3)]);
    setStatusMsg(`✅ 가중치 수정 완료 -> 1순위: ${w1}점, 2순위: ${w2}점, 3순위: ${w3}점`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Sample Loader */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-300" />
            설문 데이터 및 학급 명렬표 등록
          </h2>
          <p className="text-sm text-indigo-200 mt-1">
            구글 설문지 응답 엑셀/CSV 파일과 학급 명렬표를 업로드하면 자동으로 사회연결망 분석이 수행됩니다.
          </p>
        </div>

        <button
          onClick={onLoadSampleData}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 font-semibold text-slate-900 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm"
        >
          <Sparkles className="w-4 h-4" />
          샘플 데이터로 바로 시작하기 (25명)
        </button>
      </div>

      {/* JSON Backup Restoration Box */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-indigo-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>이전에 저장한 백업 파일(.json)이 있으신가요?</span>
          </div>
          <p className="text-xs text-slate-300">
            다운로드해 둔 .json 백업 파일을 선택하시면 1, 2번 재설정 과정 없이 즉시 [3. 관계망 분석]으로 이동합니다.
          </p>
        </div>
        <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all flex items-center gap-2 flex-shrink-0">
          <Upload className="w-4 h-4 text-indigo-200" />
          <span>백업(.json) 파일 불러오기</span>
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadBackupFile(file);
                e.target.value = "";
              }
            }}
            className="hidden"
          />
        </label>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {statusMsg}
        </div>
      )}

      {/* Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Roster Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base">
            <Users className="w-5 h-5 text-indigo-600" />
            1. 학생 명렬표 파일 업로드
          </div>
          <p className="text-xs text-slate-500">
            '코드/번호' 열과 '이름' 열이 포함된 엑셀(.xlsx) 또는 CSV 파일을 선택하세요.
          </p>

          <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
            <Upload className="w-8 h-8 text-indigo-500 mb-2" />
            <span className="text-xs font-semibold text-indigo-700">명렬표 파일 선택 (.xlsx, .csv)</span>
            <span className="text-[11px] text-slate-400 mt-1">현재 등록 학생: {students.length}명</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleRosterUpload} className="hidden" />
          </label>

          {/* Tip Box moved below upload area */}
          <div className="p-2.5 bg-indigo-50/80 border border-indigo-200/80 rounded-lg text-[11px] text-indigo-950 leading-relaxed font-medium">
            💡 <strong>Tip</strong>: 1번 메뉴 [구글 설문지 자동 생성]의 STEP 2에서 다운로드한 <strong>[명단 CSV]</strong> 파일을 이곳에 올리시면, 설문지 배부 코드와 학생 명단이 자동으로 완벽 매칭됩니다!
          </div>
        </div>

        {/* Card 2: Survey Responses Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            2. 구글 설문지 응답 원본 업로드
          </div>
          <p className="text-xs text-slate-500">
            구글 설문지 응답 결과 엑셀(.xlsx) 또는 CSV 파일을 업로드하세요.
          </p>

          <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
            <Upload className="w-8 h-8 text-emerald-500 mb-2" />
            <span className="text-xs font-semibold text-emerald-700">설문 응답 파일 선택 (.xlsx, .csv)</span>
            <span className="text-[11px] text-slate-400 mt-1">현재 분석 응답 건수: {surveyResponses.length}건</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleSurveyUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* 1. Box Top: Survey Wave Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" />
          분석 제목(설문 조사 회차 / 시기)
        </label>
        <input
          type="text"
          value={waveTitle}
          onChange={(e) => onUpdateWaveTitle(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="예: 2026학년도 1학기 초 (3월)"
        />
        <p className="text-xs text-slate-400">
          회차별 제목을 설정하면 시기별 교우관계 변화 분석 시 쉽게 비교할 수 있습니다.
        </p>
      </div>

      {/* 2. Box Bottom: Custom Weight Scheme */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-600" />
          지목 순위별 가중치 체계 설정
        </label>

        {/* Friendly Weight Explanation Callout */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-2">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            💡 <span className="underline decoration-amber-300 decoration-2">지목 순위별 가중치란 무엇인가요?</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            학생들이 설문에서 친구를 지목할 때, <strong>가장 먼저 지목한 1순위 친구에게 더 높은 점수(가중치)를 부여</strong>하여 학생 간 친밀도 및 선호 강도를 정밀하게 반영하는 계산 방식입니다.
          </p>
          <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/60 text-[11px] text-slate-700 space-y-1 font-mono">
            <div>• <strong>1순위 (기본 2.0점)</strong>: 가장 먼저 떠올린 최우선 선택 친구</div>
            <div>• <strong>2순위 (기본 1.5점)</strong>: 두 번째로 지목한 친구</div>
            <div>• <strong>3순위 (기본 1.0점)</strong>: 세 번째로 지목한 친구</div>
            <div className="text-amber-900 font-sans font-medium text-[11px] pt-1.5 border-t border-amber-200/50 mt-1.5">
              📌 <strong>예시 계산</strong>: 학생 A가 1순위 지목 2회 + 3순위 지목 1회를 받은 경우<br />
              → (2회 × 2.0점) + (1회 × 1.0점) = <strong>총 5.0점 (가중 인기 점수)</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <span className="text-xs text-slate-500 font-medium">1순위 점수</span>
            <input
              type="number"
              step="0.5"
              value={w1}
              onChange={(e) => setW1(Number(e.target.value))}
              className="w-full mt-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">2순위 점수</span>
            <input
              type="number"
              step="0.5"
              value={w2}
              onChange={(e) => setW2(Number(e.target.value))}
              className="w-full mt-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">3순위 점수</span>
            <input
              type="number"
              step="0.5"
              value={w3}
              onChange={(e) => setW3(Number(e.target.value))}
              className="w-full mt-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={handleSaveWeights}
          className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          가중치 변경 적용하기
        </button>
      </div>

      {/* Roster & Survey Overview Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            📋 현재 등록된 학생 명렬표 ({students.length}명)
          </h3>
        </div>

        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
              <tr>
                <th className="p-2.5">번호/코드</th>
                <th className="p-2.5">이름</th>
                <th className="p-2.5">설문 응답 제출 여부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {students.map((st) => {
                const isResponded = surveyResponses.some((r) => r.studentName === st.name);
                return (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono">{st.code}</td>
                    <td className="p-2.5 font-medium text-slate-900">{st.name}</td>
                    <td className="p-2.5">
                      {isResponded ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 제출 완료
                        </span>
                      ) : (
                        <span className="text-slate-400">미제출</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
