import React from "react";
import { X, Upload, Network, Sparkles, Download, GraduationCap } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UsageGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-100">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-bold">
            <GraduationCap className="w-3.5 h-3.5" /> 교사용 활용 가이드
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-3">학급 교우관계 분석 도우미(CRA) 사용법</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            설문 생성부터 관계망 분석, AI 상담 조언, 결과 내보내기까지 4단계로 이용합니다.
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* 1 */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1.5">
            <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
              <Upload className="w-4.5 h-4.5 text-indigo-600" /> 1. 시작 방법 &amp; 데이터 준비 (메뉴 1~2)
            </h4>
            <p className="text-indigo-900/90 leading-relaxed">
              처음 접속 시 학생 데이터가 없이 시작됩니다. <strong>[25명 샘플 데이터로 시작하기]</strong> 버튼을 눌러 바로 체험하거나, <strong>메뉴 1</strong>에서 구글 설문지를 자동 생성해 배포한 뒤 <strong>메뉴 2</strong>에서 응답 결과(엑셀/CSV) 및 학생 명렬표를 업로드해 시작할 수 있습니다.
            </p>
          </div>

          {/* 2 */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5">
            <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
              <Network className="w-4.5 h-4.5 text-emerald-600" /> 2. 자기평가 &amp; 관계망 분석 (메뉴 3~4)
            </h4>
            <p className="text-emerald-900/90 leading-relaxed">
              <strong>메뉴 3</strong>에서 학생별 정서·적응 자기평가 결과를 학급 평균과 비교해 확인합니다. <strong>메뉴 4</strong>에서는 5개 영역(전체 통합·정서적 친밀감·기능적 협력·사회적 영향력·교우관계 확장)별 소시오그램과 고립·인기·가교 학생을 한눈에 살펴볼 수 있습니다.
            </p>
          </div>

          {/* 3 */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
            <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-600" /> 3. AI 맞춤 상담 &amp; 시기별 변화 추적 (메뉴 5~6)
            </h4>
            <p className="text-amber-900/90 leading-relaxed">
              선생님의 무료 Gemini API Key를 등록하면 <strong>메뉴 5</strong>에서 학급 전체 진단 및 개별 학생 맞춤 상담 조언을 AI로 생성할 수 있습니다. <strong>메뉴 6</strong>에서는 이전에 저장한 백업(.json) 파일을 불러와 1학기·2학기 등 시기별 관계 변화(고립 탈출/신규 고립, 인기점수 변화)를 비교합니다.
            </p>
          </div>

          {/* 4 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Download className="w-4.5 h-4.5 text-slate-700" /> 4. 결과 내보내기 &amp; 연계 활용 (메뉴 7)
            </h4>
            <p className="text-slate-700 leading-relaxed">
              <strong>메뉴 7</strong>에서 Gephi Node/Edge CSV, 다중 시트 Excel, 인터랙티브 HTML 보고서, 로컬 백업(.json)을 내려받습니다. 저장한 CRA 분석 결과는 사이드바의 <strong>[Add-on 자리배치 앱 안내]</strong>로 이동해 자리배치·학습모둠 구성 웹앱에서 이어서 활용할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
