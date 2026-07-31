import React from "react";
import { X, Flag, ShieldCheck, Sparkles, Instagram, Key, Lock } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemInfoModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Flag className="w-5 h-5 text-red-400 fill-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                CRA (Classroom Relationship Analysis) 안내
              </h3>
              <p className="text-xs text-slate-300">버전 v1.0 (2026.07)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* 1. Data Security & Local Device (Placed First) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
            <div className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              <span>데이터 보안 및 개인정보보호</span>
            </div>
            <p className="text-emerald-900 leading-relaxed">
              • 학생 이름, 학번, 설문 응답, 교우관계 지목 데이터는 선생님의 브라우저 및 로컬 단말기에만 저장됩니다.<br />
              • 제작자는 이 데이터에 일절 접근하지 않으며, 어떠한 외부 서버로도 유출되거나 전송되지 않습니다.
            </p>
          </div>

          {/* 2. Gemini API Key Guide */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>AI 맞춤 상담 및 Gemini API Key 작동 방식</span>
            </div>
            <div className="space-y-1.5 text-slate-600 leading-relaxed">
              <p>
                • <strong>개인별 무료 키 사용:</strong> Google AI Studio에서 제공하는 무료 Gemini API Key를 각자 등록하여 사용하는 방식입니다.
              </p>
              <p>
                • <strong>무료 할당량:</strong> Gemini API는 개인당 분당 15회, 하루 1,500회까지 무료로 제공되므로 학급 관리용으로 충분합니다.
              </p>
              <p>
                • <strong>안전한 로컬 저장:</strong> 입력하신 API Key는 외부 서버로 전송되어 저장되지 않고, 오직 선생님 PC의 브라우저(LocalStorage)에만 암호화 저장됩니다.
              </p>
            </div>
          </div>

          {/* 3. Creator & Terms */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-3">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>제작: 두리쌤</span>
            </div>
            <div className="space-y-1.5">
              <div className="font-bold text-slate-800 text-xs">📌 이용 조건</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed pl-1">
                <li>교육 목적으로 자유롭게 사용하실 수 있습니다.</li>
                <li>재배포 시 출처(제작자 표기)를 유지해주세요.</li>
                <li>코드를 임의로 수정한 버전을 다시 배포하지 말아주세요.</li>
                <li>수정이 필요하시면 아래 연락처로 요청해주세요.</li>
              </ul>
            </div>
          </div>

          {/* 4. Contact */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Instagram className="w-4 h-4 text-pink-600" />
              <span>문의</span>
            </div>
            <div className="space-y-1 text-slate-600">
              <div>
                • Instagram:{" "}
                <a
                  href="https://instagram.com/trdoolee"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-indigo-600 underline font-bold"
                >
                  trdoolee
                </a>
              </div>
              <div className="text-[11px] text-slate-400">
                • 간단한 질문 위주로 답변드리며, 답변이 늦어질 수 있습니다.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

