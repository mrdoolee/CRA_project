import React from "react";
import { X, LayoutGrid, Users2, ExternalLink, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddonAppsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Add-on 자리배치 앱 안내</h3>
              <p className="text-xs text-slate-300">CRA 분석 결과를 이어서 활용하는 자매 웹앱</p>
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
          {/* 1. CSA */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white flex-shrink-0">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-indigo-950 text-sm">학급 자리배치 도우미 (CSA)</h4>
            </div>
            <p className="text-indigo-900/90 leading-relaxed">
              기본 자리배치는 물론, 학급 교우관계 분석 도우미(CRA)의 분석 결과를 활용하여 학급 자리배치를 구성합니다.
            </p>
            <a
              href="https://csa-trdoolee.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> 학급 자리배치 도우미 바로가기
            </a>
          </div>

          {/* 2. SFH */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 rounded-lg text-white flex-shrink-0">
                <Users2 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-emerald-950 text-sm">학습모둠 구성 도우미 (SFH)</h4>
            </div>
            <p className="text-emerald-900/90 leading-relaxed">
              성적 균형과 학급 교우관계 분석 도우미(CRA)의 분석 결과를 활용하여 3/4/6인 학습모둠을 구성합니다.
            </p>
            <a
              href="https://sfh-trdoolee.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> 학습모둠 구성 도우미 바로가기
            </a>
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
