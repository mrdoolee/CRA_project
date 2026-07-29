import React, { useState, useEffect } from "react";
import { X, Key, ExternalLink, CheckCircle2, ShieldCheck, HelpCircle, Eye, EyeOff, Sparkles, Lock } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [savedMsg, setSavedMsg] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = inputKey.trim();
    onSaveApiKey(trimmed);
    setSavedMsg(true);
    setTimeout(() => {
      setSavedMsg(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                Google Gemini API Key 설정
              </h3>
              <p className="text-[11px] text-slate-300">AI 학급 종합 진단 & 맞춤 교우관계 조언용</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Main Informational Banner */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-950 leading-relaxed space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>개인별 Gemini API Key 사용 안내</span>
            </div>
            <p className="text-[11px] text-indigo-900/90 leading-normal">
              본 서비스는 모든 선생님들께서 서버 비용 부담이나 속도 제한 없이 <strong>무료로 마음껏 AI 분석을 사용</strong>하실 수 있도록, 각자 구글 개인 계정의 무료 API Key를 입력하여 사용하는 방식으로 운영됩니다.
            </p>
          </div>

          {/* Key Input Field */}
          <div className="space-y-1.5">
            <label className="block text-slate-800 font-bold text-xs flex items-center justify-between">
              <span>Gemini API Key</span>
              {apiKey && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 키 등록됨
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showKey ? "숨기기" : "보기"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal pt-0.5">
              💡 입력된 API Key는 외부 서버에 보관되지 않으며 오직 <strong>선생님 본인의 브라우저(LocalStorage)</strong>에만 안전하게 보관됩니다.
            </p>
          </div>

          {/* Step-by-step guide toggle button */}
          <div className="border-t border-b border-slate-100 py-3">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-indigo-600 hover:text-indigo-800 font-bold text-xs py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> API Key 무료 발급 방법 (1분 소요)
              </span>
              <span className="text-[11px] bg-indigo-50 px-2 py-0.5 rounded-full">
                {showGuide ? "가이드 접기 ▲" : "가이드 펼치기 ▼"}
              </span>
            </button>

            {showGuide && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-slate-700 leading-relaxed text-[11px]">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  무료 Gemini API Key 발급 순서
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-600">
                  <li>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline font-bold hover:text-indigo-800"
                    >
                      Google AI Studio (aistudio.google.com)
                    </a>
                    에 구글 계정으로 로그인합니다.
                  </li>
                  <li>
                    화면 상단 또는 좌측의 <strong className="text-slate-800">'Get API key'</strong> 또는 <strong className="text-slate-800">'Create API key'</strong> 버튼을 클릭합니다.
                  </li>
                  <li>
                    새 프로젝트 선택 후 생성된 <strong className="text-slate-800">'API key (AIzaSy...)'</strong>를 복사합니다.
                  </li>
                  <li>
                    위 입력창에 복사한 키를 붙여넣고 <strong className="text-slate-800">'API Key 저장'</strong> 버튼을 누르면 즉시 모든 AI 기능이 활성화됩니다.
                  </li>
                </ol>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  <strong>참고:</strong> Google AI Studio API 키는 개인당 <strong>무료(분당 15회, 하루 1,500회)</strong>로 제공되어 교실 사용에 충분한 할당량을 가집니다.
                </div>
              </div>
            )}
          </div>

          {/* Direct link button */}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200"
          >
            <ExternalLink className="w-4 h-4 text-indigo-600" />
            Google AI Studio에서 무료 API Key 발급받기
          </a>

          {savedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Gemini API Key가 성공적으로 저장되었습니다!
            </div>
          )}

          {/* Security guarantee badge */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl flex items-center gap-2 text-emerald-900 text-[11px]">
            <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>보안 안심:</strong> API Key는 개인 브라우저에만 저장되며, 원격 서버나 DB로 수집·유출되지 않습니다.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" /> API Key 저장
          </button>
        </div>
      </div>
    </div>
  );
};

