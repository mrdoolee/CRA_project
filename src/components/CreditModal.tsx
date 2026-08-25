import React, { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-modal-title"
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <h3 id="credit-modal-title" className="font-bold text-slate-900 text-sm">
              ✨ 제작: 두리쌤
            </h3>
            <h4 className="font-bold text-slate-900 text-sm">📌 이용 조건</h4>
            <ul className="list-disc list-inside text-slate-700 leading-relaxed space-y-1">
              <li>교육 목적으로 자유롭게 사용하실 수 있습니다.</li>
              <li>재배포 시 출처(제작자 표기)를 유지해주세요.</li>
              <li>코드를 임의로 수정한 버전을 다시 배포하지 말아주세요.</li>
              <li>수정이 필요하시면 아래 연락처로 요청해주세요.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <h4 className="font-bold text-slate-900 text-sm">📷 문의</h4>
            <ul className="list-disc list-inside text-slate-700 leading-relaxed space-y-1">
              <li>
                Instagram:{" "}
                <a
                  href="https://www.instagram.com/trdoolee"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  trdoolee
                </a>
              </li>
              <li>
                Blog:{" "}
                <a
                  href="https://blog.naver.com/trdoolee"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  blog.naver.com/trdoolee
                </a>
              </li>
            </ul>
            <p className="text-slate-400 italic">간단한 질문 위주로 답변드리며, 답변이 늦어질 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
