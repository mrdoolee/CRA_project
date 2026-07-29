import React, { useState } from "react";
import { X, Laptop, ShieldCheck, Download, Terminal, CheckCircle2, Copy, AlertCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalExeGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"privacy" | "bat" | "electron">("privacy");
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const electronPackageJsonSnippet = `{
  "name": "classroom-relationship-analysis",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "electron:build": "vite build && electron-builder"
  }
}`;

  const electronMainJsSnippet = `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Classroom Relationship Analysis (오프라인 실행 모드)",
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Laptop className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">개인 PC 오프라인 실행 파일 (.exe) 패키징 가이드</h3>
              <p className="text-xs text-slate-300">학생 개인정보 유출 방지를 위한 로컬 실행 가이드</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="p-6 space-y-6">
          <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab("privacy")}
              className={`pb-2 transition-all ${
                activeTab === "privacy" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              1. 개인정보보호 동작 원리
            </button>
            <button
              onClick={() => setActiveTab("bat")}
              className={`pb-2 transition-all ${
                activeTab === "bat" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              2. 간편 실행 스크립트 (run_app.bat)
            </button>
            <button
              onClick={() => setActiveTab("electron")}
              className={`pb-2 transition-all ${
                activeTab === "electron" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              3. Electron 빌드 (.exe 패키징)
            </button>
          </div>

          {/* 1. Privacy Principles */}
          {activeTab === "privacy" && (
            <div className="space-y-4 text-xs">
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
          )}

          {/* 2. Simple Batch Script Execution */}
          {activeTab === "bat" && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-indigo-950 leading-relaxed space-y-1">
                <div className="font-bold text-indigo-900 text-xs">💡 간편 실행 스크립트(run_app.bat)란?</div>
                <p>
                  어려운 개발 프로그램이나 별도의 프로그램 설치 없이, 다운로드받은 프로그램 폴더에서 <strong>마우스 더블클릭 한 번으로 내 PC에서 오프라인 실행</strong>되게 만드는 가장 쉬운 실행 방법입니다.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-bold text-slate-800 text-xs">📌 누구나 쉽게 따라 하는 3단계 실행 방법</div>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed pl-1">
                  <li>
                    소스를 다운로드받은 프로그램 폴더 안에 메모장(새 텍스트 문서)을 열고 파일 이름을 <strong>run_app.bat</strong> 로 변경합니다.
                  </li>
                  <li>
                    아래 상자의 명령어를 <strong>[스크립트 복사]</strong> 버튼을 눌러 복사한 후 메모장에 붙여넣고 저장합니다.
                  </li>
                  <li>
                    이제 만들어진 <strong>run_app.bat</strong> 파일만 더블클릭하시면, 선생님 PC의 웹 브라우저가 열리며 인터넷 서버 연결 없는 안전한 오프라인 분석 도구가 실행됩니다!
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] relative">
                <pre>{`@echo off
title 학급 교우관계 분석 도구 - 오프라인 개인 PC 모드
echo =========================================================
echo 학급 교우관계 분석 시스템 (Classroom Relationship Analysis)
echo 개인정보보호를 위해 로컬 단말기 메모리에서만 동작합니다.
echo =========================================================
npm run start
pause`}</pre>
                <button
                  onClick={() => copyToClipboard(`@echo off
title 학급 교우관계 분석 도구 - 오프라인 개인 PC 모드
echo =========================================================
echo 학급 교우관계 분석 시스템 (Classroom Relationship Analysis)
echo 개인정보보호를 위해 로컬 단말기 메모리에서만 동작합니다.
echo =========================================================
npm run start
pause`)}
                  className="absolute right-3 top-3 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-sans font-bold flex items-center gap-1 transition-all shadow-sm"
                >
                  {copiedScript ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? "복사완료!" : "스크립트 복사"}
                </button>
              </div>
            </div>
          )}

          {/* 3. Electron Executable Packaging */}
          {activeTab === "electron" && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 leading-relaxed">
                <strong>💡 Electron 패키징이란?</strong><br />
                본 React 소스 코드를 Windows 데스크톱 프로그램 (<code>Classroom_SNA_Installer.exe</code>) 형태로 패키징하여 인터넷 연결 없이 개인 PC에서 독립 실행할 수 있게 만드는 방법입니다.
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">단계 1: Electron 패키지 설치</h4>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] relative">
                  npm install --save-dev electron electron-builder
                  <button
                    onClick={() => copyToClipboard("npm install --save-dev electron electron-builder")}
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">단계 2: electron/main.js 생성</h4>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] relative overflow-x-auto">
                  <pre>{electronMainJsSnippet}</pre>
                  <button
                    onClick={() => copyToClipboard(electronMainJsSnippet)}
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">단계 3: .exe 파일 빌드 실행</h4>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] relative">
                  npm run electron:build
                </div>
                <p className="text-[11px] text-slate-500">
                  빌드가 완료되면 <code>dist/Classroom Relationship Analysis-Setup-1.0.0.exe</code> 파일이 생성되어 즉시 실행할 수 있습니다.
                </p>
              </div>
            </div>
          )}
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
