import React from "react";
import { X, ShieldCheck } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalExeGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">개인정보보호 동작 원리</h3>
              <p className="text-xs text-slate-300">학생 개인정보가 외부로 유출되지 않는 이유</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>개인정보 외부 유출 ZERO (안전한 로컬 전용 처리)</span>
            </h4>
            <ul className="space-y-2 text-emerald-900 list-disc list-inside leading-relaxed">
              <li>
                <strong>Local In-Memory Processing:</strong> 선생님께서 업로드하신 구글 설문지 CSV/XLSX 파일, 학생 이름 명단, 교우관계 지목 데이터는 오직 선생님 교사 PC의 브라우저 메모리(RAM) 내부에서만 분석됩니다.
              </li>
              <li>
                <strong>No External Database:</strong> Firestore, Cloud SQL 등 외부 서버나 외부 데이터베이스로 학생 개인정보 및 설문 응답을 전송하지 않습니다.
              </li>
              <li>
                <strong>100% Client-Side Output:</strong> 네트워크 그래프 분석, Gephi 파일 추출, Excel 보고서 및 HTML 리포트 생성까지 모든 기능이 외부 서버를 거치지 않고 교사 PC 내부에서 100% 즉시 처리됩니다.
              </li>
            </ul>
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
