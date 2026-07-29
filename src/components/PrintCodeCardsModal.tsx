import React from "react";
import { Printer, X, Download, Scissors, Shield, Key } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classNameTitle: string;
  studentList: { name: string; code: string }[];
}

export const PrintCodeCardsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  classNameTitle,
  studentList,
}) => {
  if (!isOpen) return null;

  // Group students into chunks of 10 (5 rows x 2 columns = 10 cards per A4 page)
  const pageSize = 10;
  const pages: { name: string; code: string }[][] = [];
  for (let i = 0; i < studentList.length; i += pageSize) {
    pages.push(studentList.slice(i, i + pageSize));
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Printable CSS Injection */}
      <style>{`
        @media print {
          /* Hide all UI elements except printable area */
          body * {
            visibility: hidden !important;
          }
          #printable-cards-container, #printable-cards-container * {
            visibility: visible !important;
          }
          #printable-cards-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }

          .a4-page {
            width: 194mm !important;
            height: 275mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(5, 1fr) !important;
            gap: 4mm !important;
          }

          .print-card {
            border: 1.5px dashed #64748b !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: white !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/80 rounded-xl shadow-inner text-white">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                A4 개인 코드 카드 인쇄 / PDF 출력 (5×2 레이아웃)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                A4 한 장에 10명씩(2열 5행) 자동으로 배치됩니다. 잘라내서 학생들에게 나누어 주실 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ 인쇄 / PDF 저장 (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls Banner */}
        <div className="p-3 bg-amber-50 border-b border-amber-200 px-6 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Scissors className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              총 <strong>{studentList.length}명</strong>의 카드가 <strong>총 {pages.length}페이지</strong>(A4)로 구성되었습니다. 점선을 따라 잘라 배부하세요.
            </span>
          </div>

          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
            인쇄창에서 'PDF로 저장' 선택 가능
          </span>
        </div>

        {/* Scrollable Live Preview Area */}
        <div className="p-6 overflow-y-auto bg-slate-200/60 flex-1 space-y-8">
          <div id="printable-cards-container" className="space-y-8">
            {pages.map((pageStudents, pageIdx) => (
              <div
                key={pageIdx}
                className="a4-page bg-white p-5 mx-auto rounded-xl shadow-md border border-slate-300 grid grid-cols-2 grid-rows-5 gap-3"
                style={{
                  width: "210mm",
                  minHeight: "285mm",
                  maxHeight: "285mm",
                  boxSizing: "border-box",
                }}
              >
                {pageStudents.map((st, cardIdx) => (
                  <div
                    key={st.name + cardIdx}
                    className="print-card border-2 border-dashed border-slate-400 rounded-xl p-3.5 bg-white flex flex-col justify-between relative hover:border-indigo-500 transition-colors"
                    style={{ minHeight: "51mm" }}
                  >
                    {/* Top Scissor Guide Icon */}
                    <div className="absolute top-1.5 right-2 text-slate-300 flex items-center gap-0.5 text-[9px] font-mono">
                      <Scissors className="w-3 h-3" /> 절단선
                    </div>

                    {/* Card Header */}
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 uppercase tracking-tight">
                        <Shield className="w-3 h-3 text-indigo-600" />
                        <span>{classNameTitle} 교우관계 설문 개인 보안 카드</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between border-b border-slate-200 pb-1">
                        <span className="text-xs text-slate-500 font-medium">학생 이름:</span>
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          {st.name}
                        </span>
                      </div>
                    </div>

                    {/* Personal Code Section */}
                    <div className="my-1.5 p-2 bg-indigo-50/80 border border-indigo-200 rounded-lg text-center">
                      <div className="text-[10px] font-bold text-indigo-600 flex items-center justify-center gap-1">
                        <Key className="w-3 h-3" /> 설문 접속 4자리 개인 코드
                      </div>
                      <div className="text-xl font-black font-mono tracking-[0.25em] text-indigo-950 mt-0.5">
                        {st.code}
                      </div>
                    </div>

                    {/* Footer Notice */}
                    <div className="text-[9px] text-slate-500 leading-tight">
                      ※ 이 코드는 설문 응답 본인 인증용입니다. 타인에게 절대 보여주지 마세요.
                    </div>
                  </div>
                ))}

                {/* Fill empty slots if page has less than 10 students */}
                {Array.from({ length: pageSize - pageStudents.length }).map((_, emptyIdx) => (
                  <div
                    key={`empty-${emptyIdx}`}
                    className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 flex items-center justify-center text-[10px] text-slate-300 font-mono"
                    style={{ minHeight: "51mm" }}
                  >
                    빈 카드
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            💡 Chrome/Whale/Edge 브라우저 인쇄 설정에서 <strong>[PDF로 저장]</strong>을 선택하시면 PDF 파일로 보관하실 수 있습니다.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              닫기
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ 인쇄 / PDF 출력</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
