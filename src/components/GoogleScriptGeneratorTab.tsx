import React, { useState, useMemo } from "react";
import {
  FileCode,
  Copy,
  CheckCircle2,
  Download,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Users,
  Key,
  ChevronRight,
  ArrowLeft,
  Settings2,
  ListOrdered,
  RefreshCw,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { downloadFile } from "../utils/gephiExporter";
import { PrintCodeCardsModal } from "./PrintCodeCardsModal";
import { SAMPLE_STUDENTS } from "../data/sampleData";

interface Props {
  classNameTitle?: string;
  onLoadSampleData?: () => void;
}

export const GoogleScriptGeneratorTab: React.FC<Props> = ({
  classNameTitle = "우리반",
  onLoadSampleData,
}) => {
  // Current Step state: 1 -> 2 -> 3 -> 4
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Raw student names input (샘플 학생 25명 기본값: 1701~1725)
  const [inputText, setInputText] = useState<string>(
    SAMPLE_STUDENTS.map((s) => s.name).join("\n")
  );

  // Step 3: Form Pre-Settings (Title & Section 1 Description)
  const [formTitle, setFormTitle] = useState<string>(
    `나와 친구 이야기(우리반)`
  );

  const [section1Desc, setSection1Desc] = useState<string>(
    `응답은 익명 코드로 저장돼요.
누가 어떻게 답했는지 친구에게 절대 알려지지 않아요.
결과는 선생님만 볼 수 있고, 반 전체의 관계를 이해하는 데 활용돼요.
응답 데이터는 학급 분석 목적으로만 사용되며, 외부에 공유되지 않아요.`
  );

  const [copiedCode, setCopiedCode] = useState(false);
  const [codeSeed, setCodeSeed] = useState(0); // Trigger code re-generation if needed
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Parse student names and match assigned 4-digit codes
  const studentListWithCodes = useMemo(() => {
    const lines = inputText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== "없음");

    const uniqueNames = Array.from(new Set(lines));

    if (codeSeed === 0) {
      return uniqueNames.map((name, idx) => {
        const sampleMatch = SAMPLE_STUDENTS.find((s) => s.name === name);
        if (sampleMatch) {
          return { name, code: sampleMatch.code };
        }
        const code = String(1701 + idx);
        return { name, code };
      });
    }

    // When codeSeed > 0 (user clicks '코드 재할당'), generate new unique 4-digit random codes
    const usedCodes = new Set<string>();
    const pseudoRandom = (seed: number, index: number) => {
      const x = Math.sin(seed * 9999 + index * 1234) * 10000;
      return x - Math.floor(x);
    };

    return uniqueNames.map((name, idx) => {
      let code = "";
      let attempt = 0;
      do {
        const rand = pseudoRandom(codeSeed + attempt, idx);
        code = String(Math.floor(rand * 8999) + 1000);
        attempt++;
      } while (usedCodes.has(code));
      usedCodes.add(code);
      return { name, code };
    });
  }, [inputText, codeSeed]);

  // Generate Google Apps Script code string
  const generatedScript = useMemo(() => {
    // Escape backslash/double-quote so a student name can't break out of the
    // generated Apps Script string literal (this script runs with the
    // teacher's own Google account permissions when they paste & execute it).
    const escapeJsStringLiteral = (s: string) =>
      s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    // Comments can't be escaped, so neutralize any "*/" that would close the
    // surrounding /** ... */ block comment early.
    const escapeBlockComment = (s: string) => s.replace(/\*\//g, "* /");

    const studentRows = studentListWithCodes
      .map((s) => `      ["${escapeJsStringLiteral(s.name)}", "${escapeJsStringLiteral(s.code)}"]`)
      .join(",\n");

    // Format section1Desc for JS string literal inside Apps Script
    const formattedDescLines = section1Desc
      .split("\n")
      .map((line) => `    "${line.replace(/"/g, '\\"')}"`)
      .join(" +\n    \"\\n\" +\n");

    return `/**
 * =================================================================
 * Google 설문지 자동 생성 Apps Script (${escapeBlockComment(formTitle)} - SNA 설문)
 * =================================================================
 * [사용 방법]
 * 1. 구글 스프레드시트(sheets.new) 생성 후
 * 2. 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 3. 기존 코드를 모두 지우고 본 코드를 전체 붙여넣기(Ctrl+V) 하세요.
 * 4. 상단 [실행] 버튼을 누르면 '학생명단' 시트 생성 및 설문지가 자동 생성됩니다!
 */

function createFormWithCustomizedDescriptions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "학생명단";
  var sheet = ss.getSheetByName(sheetName);
 
  // -------------------------------------------------------------
  // 1. "학생명단" 시트 확인 및 초기 데이터 입력
  // -------------------------------------------------------------
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange("A1:B1").setValues([["학생 이름", "개인 코드 (자동발급)"]]);
    sheet.getRange("A1:B1").setFontWeight("bold").setBackground("#D9E1F2");
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(2, 180);
   
    // 미리 부여된 학생 명단 및 개인 코드 자동 기입
    var initialData = [
${studentRows}
    ];
    if (initialData.length > 0) {
      sheet.getRange(2, 1, initialData.length, 2).setValues(initialData);
    }
    Logger.log('✅ [' + sheetName + '] 시트에 ' + initialData.length + '명의 명단과 개인 코드가 자동으로 기입되었습니다.');
  }
 
  // -------------------------------------------------------------
  // 2. 명단 읽기 및 중복 제거 & 개인 코드 발급
  // -------------------------------------------------------------
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('⚠️ [' + sheetName + '] 시트에 입력된 학생 이름이 없습니다. A열(A2부터)에 이름을 입력해주세요.');
    return;
  }
 
  var dataRange = sheet.getRange(2, 1, lastRow - 1, 2);
  var data = dataRange.getValues();
 
  var studentNamesOnly = [];
  var validCodes = [];
  var existingCodes = {};
  var seenNames = {}; // 중복 이름 및 '없음' 입력 방지용 필터
 
  for (var i = 0; i < data.length; i++) {
    if (data[i][1] !== "" && data[i][1] != null) {
      existingCodes[String(data[i][1]).trim()] = true;
    }
  }
 
  var isUpdated = false;
  for (var i = 0; i < data.length; i++) {
    var name = String(data[i][0]).trim();
   
    // 빈칸이거나, 명단에 '없음'이 있거나 중복 이름이면 자동 제외
    if (name === "" || name === "없음" || seenNames[name]) continue;
   
    seenNames[name] = true;
    studentNamesOnly.push(name);
    var code = String(data[i][1]).trim();
   
    if (code === "" || code === "undefined") {
      do {
        code = String(Math.floor(Math.random() * 9000) + 1000);
      } while (existingCodes[code]);
     
      existingCodes[code] = true;
      data[i][1] = code;
      isUpdated = true;
    }
    validCodes.push(code);
  }
 
  if (studentNamesOnly.length === 0) {
    Logger.log('⚠️ 유효한 학생 이름이 없습니다. 명단을 다시 확인해주세요.');
    return;
  }
 
  if (isUpdated) {
    dataRange.setValues(data);
    Logger.log('✅ 새 개인 코드가 스프레드시트에 고정(기록)되었습니다.');
  }
 
  var studentNamesWithNone = studentNamesOnly.slice();
  studentNamesWithNone.push("없음"); // '없음' 옵션 추가


  // -------------------------------------------------------------
  // 3. Google 설문지 생성 및 기본 설정
  // -------------------------------------------------------------
  var form = FormApp.create('${formTitle.replace(/'/g, "\\'")}');
 
  var section1Desc =
${formattedDescLines};
  form.setDescription(section1Desc);
 
  // 개인 코드 입력 문항
  var codeItem = form.addTextItem();
  codeItem.setTitle('개인 코드를 입력하세요.')
          .setHelpText('선생님께 부여받은 본인의 4자리 개인 코드를 입력하세요.')
          .setRequired(true);
 
  var regexPattern = "^(" + validCodes.join("|") + ")$";
  var textValidation = FormApp.createTextValidation()
    .requireTextMatchesPattern(regexPattern)
    .setHelpText('⚠️ 유효하지 않은 개인 코드입니다. 부여받은 4자리 숫자를 정확히 입력해 주세요.')
    .build();
  codeItem.setValidation(textValidation);


  // =============================================================
  // [섹션 2] 자기 평가 (정서 및 학급 적응도)
  // =============================================================
  var section2 = form.addPageBreakItem();
  section2.setTitle('나는 어떤 사람일까요?')
          .setHelpText('정답은 없어요. 지금 느끼는 대로 솔직하게 답해주세요.');

  var gridItem = form.addGridItem();
  gridItem.setTitle('나의 생각과 느낌')
          .setRows([
            '[나는 나만의 좋은 점이 있다고 생각한다.]',
            '[나는 학교생활과 우리반에 만족하며, 즐겁게 지내고 있다.]',
            '[나는 어려운 일이 생겼을 때 주변에 도움을 요청할 수 있다.]',
            '[나는 우리반 친구들과 잘 어울리고, 함께 시간을 보내는 것이 즐겁다.]',
            '[나는 나의 감정을 잘 이해하고 표현하는 편이다.]'
          ])
          .setColumns(['정말 그렇다', '그렇다', '보통이다', '잘 모르겠다', '전혀 아니다'])
          .setRequired(true);


  // =============================================================
  // [섹션 3 ~ 8] 6개 영역 교우 관계 문항 생성
  // =============================================================
  var descWithNone =
    "최대 3명까지 선택해주세요.\\n" +
    "가장 먼저 떠오르는 친구부터 차례대로 응답해주세요.\\n";
 
  var descMustThree =
    "반드시 3명을 선택해주세요.\\n" +
    "가장 먼저 떠오르는 친구부터 차례대로 응답해주세요.";

  var categories = [
    {
      title: '점심시간에 함께 밥을 먹고 싶은 친구 3명은 누구인가요?',
      desc: descWithNone + '함께 밥을 먹고 싶은 친구가 더 없다면, "없음"을 선택하세요.',
      allowNone: true,
      label: '점심시간에 함께 밥을 먹고 싶은 친구'
    },
    {
      title: '학교를 마치고, 같이 놀고 싶은 친구 3명은 누구인가요?',
      desc: descWithNone + '학교를 마치고 같이 놀고 싶은 친구가 더 없다면, "없음"을 선택하세요.',
      allowNone: true,
      label: '학교를 마치고, 같이 놀고 싶은 친구'
    },
    {
      title: '어려운 숙제가 있을 때, 나를 도와줄 수 있을 것 같은 친구 3명은 누구인가요?',
      desc: descMustThree,
      allowNone: false,
      label: '어려운 숙제가 있을 때, 나를 도와줄 수 있을 것 같은 친구'
    },
    {
      title: '모둠 활동이나 프로젝트에서 함께 하고 싶은 친구 3명은 누구인가요?',
      desc: descMustThree,
      allowNone: false,
      label: '모둠 활동이나 프로젝트에서 함께 하고 싶은 친구'
    },
    {
      title: '우리 반에서 우리 반 분위기를 이끄는 친구 3명은 누구인가요?',
      desc: descMustThree,
      allowNone: false,
      label: '우리 반에서 우리 반 분위기를 이끄는 친구'
    },
    {
      title: '앞으로 더 친해지고 싶은 친구 3명은 누구인가요?',
      desc: descMustThree,
      allowNone: false,
      label: '앞으로 더 친해지고 싶은 친구'
    }
  ];

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var section = form.addPageBreakItem();
    section.setTitle(cat.title)
           .setHelpText(cat.desc);
   
    var currentChoices = cat.allowNone ? studentNamesWithNone : studentNamesOnly;
    for (var rank = 1; rank <= 3; rank++) {
      var listItem = form.addListItem();
      listItem.setTitle(cat.label + ' ' + rank)
              .setChoiceValues(currentChoices)
              .setRequired(true);
    }
  }

  // -------------------------------------------------------------
  // 4. 설문지 구성 완료 후 '응답 받기 OFF' 안전 처리
  // -------------------------------------------------------------
  Utilities.sleep(500);
  form.setAcceptingResponses(false);

  // -------------------------------------------------------------
  // 5. 완료 로그 출력 및 실행 결과 확인
  // -------------------------------------------------------------
  Logger.log('=====================================================');
  Logger.log('✅ 오류 없이 완벽한 설문지 생성이 완료되었습니다!');
  Logger.log('🔗 [선생님 편집용 링크]: ' + form.getEditUrl());
  Logger.log('🔗 [학생 응답용 제출 링크]: ' + form.getPublishedUrl());
  Logger.log('=====================================================');
}`;
  }, [studentListWithCodes, formTitle, section1Desc]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCsvFile = () => {
    const csvHeader = "학생 이름,개인 코드 (자동발급)\n";
    const csvBody = studentListWithCodes.map((s) => `${s.name},${s.code}`).join("\n");
    downloadFile(
      "\uFEFF" + csvHeader + csvBody,
      `CRA_${classNameTitle}_학생명단_개인코드.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> 1단계: Google 설문지 생성 스크립트 도우미
          </div>
          <h2 className="text-xl font-extrabold mt-1">단계별 Google 설문지 & 개인코드 자동 생성</h2>
          <p className="text-xs text-slate-300 mt-1">
            각 단계별로 [확인] 버튼을 누르면 <strong>학생 코드 매칭</strong>, <strong>설문 문구 세팅</strong>, <strong>Apps Script 코드</strong>가 완성됩니다.
          </p>
        </div>

        {onLoadSampleData && (
          <button
            onClick={onLoadSampleData}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 font-extrabold text-slate-950 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2 text-xs flex-shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>샘플 데이터로 바로 시작하기 (25명)</span>
          </button>
        )}
      </div>

      {/* Interactive Step Progress Bar Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Step 1 Indicator */}
        <div
          onClick={() => setCurrentStep(1)}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
            currentStep === 1
              ? "bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-300"
              : currentStep > 1
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-white text-slate-500 border-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center flex-shrink-0 ${
              currentStep === 1
                ? "bg-white text-indigo-700"
                : currentStep > 1
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {currentStep > 1 ? "✓" : "1"}
          </div>
          <div>
            <div className="text-xs font-bold">1. 학생 명단 입력</div>
            <div className="text-[11px] opacity-80">이름 줄바꿈 입력</div>
          </div>
        </div>

        {/* Step 2 Indicator */}
        <div
          onClick={() => {
            if (studentListWithCodes.length > 0) setCurrentStep(2);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
            currentStep === 2
              ? "bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-300"
              : currentStep > 2
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-white text-slate-500 border-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center flex-shrink-0 ${
              currentStep === 2
                ? "bg-white text-indigo-700"
                : currentStep > 2
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {currentStep > 2 ? "✓" : "2"}
          </div>
          <div>
            <div className="text-xs font-bold">2. 개인 코드 발급</div>
            <div className="text-[11px] opacity-80">익명 4자리 코드</div>
          </div>
        </div>

        {/* Step 3 Indicator */}
        <div
          onClick={() => {
            if (studentListWithCodes.length > 0) setCurrentStep(3);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
            currentStep === 3
              ? "bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-300"
              : currentStep > 3
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-white text-slate-500 border-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center flex-shrink-0 ${
              currentStep === 3
                ? "bg-white text-indigo-700"
                : currentStep > 3
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {currentStep > 3 ? "✓" : "3"}
          </div>
          <div>
            <div className="text-xs font-bold">3. 설문 사전 세팅</div>
            <div className="text-[11px] opacity-80">제목 및 안내문구</div>
          </div>
        </div>

        {/* Step 4 Indicator */}
        <div
          onClick={() => {
            if (studentListWithCodes.length > 0) setCurrentStep(4);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
            currentStep === 4
              ? "bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-300"
              : "bg-white text-slate-500 border-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center flex-shrink-0 ${
              currentStep === 4 ? "bg-white text-indigo-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            4
          </div>
          <div>
            <div className="text-xs font-bold">4. 스크립트 생성</div>
            <div className="text-[11px] opacity-80">Apps Script 완성</div>
          </div>
        </div>
      </div>

      {/* STEP 1: 학생 명단 입력 */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                STEP 1 / 4
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Users className="w-5 h-5 text-indigo-600" />
                학생 명단 입력
              </h3>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
              총 {studentListWithCodes.length}명 감지됨
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            우리 반 학생 이름을 아래 입력창에 한 줄에 한 명씩 작성해 주세요. (기본 명단이 입력되어 있습니다)
          </p>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            placeholder="학생01&#10;학생02&#10;학생03..."
            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all leading-relaxed shadow-inner"
          />

          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                if (studentListWithCodes.length === 0) {
                  alert("최소 1명 이상의 학생 이름을 입력해주세요.");
                  return;
                }
                setCurrentStep(2);
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>확인 (다음 단계: 개인 코드 발급)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: 개인 코드 발급 확인 */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                STEP 2 / 4
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5 leading-snug">
                <Key className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span>학생별 고유 4자리 개인 코드 발급 확인</span>
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCodeSeed((prev) => prev + 1)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                title="설문지 배부 전 초기화시에만 사용"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 코드 재할당
              </button>

              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> 코드 카드 인쇄 (A4 5×2)
              </button>

              <button
                onClick={handleDownloadCsvFile}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> 명단 CSV 다운로드
              </button>
            </div>
          </div>

          {/* Mandatory Guidance Banner for Menu 2 */}
          <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-950">
            <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>⚠️ 중요 필독: [2. 설문/명렬표 데이터 관리] 연동 및 파일 보관 안내</span>
            </div>
            <p className="leading-relaxed text-slate-800">
              구글 설문 응답을 받아 <strong>메뉴 2번 [설문/명렬표 데이터 관리]</strong>에 업로드하려면, 이곳에서 발급된 <strong>[명단 CSV 다운로드]</strong> 파일이 반드시 필요합니다!
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium pl-1">
              <li>
                학생들이 설문 응답 시 입력한 개인 코드와 본 명단의 코드가 <strong>일치해야 학생 정보가 자동 매칭</strong>됩니다.
              </li>
              <li>
                설문지를 배부한 이후에는 <strong>절대로 [코드 재할당]을 누르지 마시고</strong>, 설문에 사용된 코드 그대로 <strong>[명단 CSV 다운로드]</strong>를 클릭하여 소장해 주세요.
              </li>
            </ul>
          </div>

          {/* Student Code Table */}
          <div className="max-h-[320px] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="p-3">번호</th>
                  <th className="p-3">학생 이름</th>
                  <th className="p-3 text-center">발급된 개인 코드 (4자리)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentListWithCodes.map((s, idx) => (
                  <tr key={s.name} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-400 font-mono">#{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{s.name}</td>
                    <td className="p-2.5 text-center font-mono font-extrabold text-indigo-600 text-sm">
                      {s.code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> 이전 단계 (명단 수정)
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>확인 (다음 단계: 설문 사전 세팅)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: 설문지 작성 전 사전 세팅 */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                STEP 3 / 4
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                설문지 작성 전 사전 세팅 (제목 및 안내문구 작성)
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            구글 설문지 상단에 표시될 <strong>설문지 제목</strong>과 <strong>안내 문구(설명)</strong>를 자유롭게 작성해주세요. 기본 문구가 세팅되어 있으며 필요한 대로 수정할 수 있습니다.
          </p>

          <div className="space-y-4">
            {/* Origin Notice Box */}
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-950 leading-relaxed">
              해당 설문 문항은{" "}
              <a
                href="https://app-omega-six-30.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline text-indigo-700 hover:text-indigo-900"
              >
                "우리반 관계지도"
              </a>
              의 설문 문항에 기반하여 재설계 되었습니다.
            </div>

            {/* Form Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                1) Google 설문지 제목
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Section 1 Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                2) 설문지 안내 문구 (Section 1 Description)
              </label>
              <textarea
                value={section1Desc}
                onChange={(e) => setSection1Desc(e.target.value)}
                rows={6}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-sans text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
              />
              <span className="text-[11px] text-slate-400">
                💡 줄바꿈대로 설문지 첫 화면 설명란에 표기됩니다.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> 이전 단계 (코드 확인)
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>확인 (설문지 생성 스크립트 완성)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: 완성된 Google Apps Script 제공 */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Main Step 4 Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              STEP 4 / 4 - 구글 스프레드시트 연결 & 스크립트 실행
            </span>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-600" />
              구글 스프레드시트에 Apps Script 적용하기
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              아래 <strong>STEP 4-1</strong>에서 구글 스프레드시트를 열고, <strong>STEP 4-2</strong>에서 코드를 복사하여 실행하시면 설문지가 즉시 생성됩니다.
            </p>
          </div>

          {/* Sub-step 4-1: 시트 열기 */}
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[11px] rounded-lg">
                STEP 4-1
              </span>
              <h3 className="text-base font-bold text-slate-900">
                구글 스프레드시트 새 창 열기
              </h3>
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed">
              아래 버튼을 누르면 구글 스프레드시트(sheets.new)가 새 브라우저 창으로 연결됩니다.
            </p>
            <div>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>STEP 4-1. 구글 스프레드시트 열기 (sheets.new)</span>
              </a>
            </div>
          </div>

          {/* Sub-step 4-2: 스크립트 생성 및 복사 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="px-2.5 py-1 bg-indigo-600 text-white font-extrabold text-[11px] rounded-lg">
                  STEP 4-2
                </span>
                <h3 className="text-base font-bold text-slate-900 inline-block ml-2">
                  자동 생성된 Apps Script (`Code.gs`) 복사 & 실행
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> 문구/제목 수정
                </button>

                <button
                  onClick={handleCopyScript}
                  className={`min-w-[280px] justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                    copiedCode
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {copiedCode ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? "복사 완료!" : "📋 STEP 4-2. Apps Script 코드 전체 복사"}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              위 코드를 복사하여 Google Sheets의 <strong>[확장 프로그램] &gt; [Apps Script]</strong>에 붙여넣고 <strong>[실행]</strong>을 누르시면, 입력한 안내문구와 학생 개인 코드가 적용된 Google 설문지가 3초 만에 만들어집니다.
            </p>

            <div className="relative bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto border border-slate-800 shadow-inner">
              <pre>{generatedScript}</pre>
            </div>
          </div>

          {/* Step-by-Step Execution Guide */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              Google 설문지 3분 만에 자동 생성하는 실행 방법
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-extrabold text-indigo-600 flex items-center gap-1">
                  STEP 1
                </div>
                <h4 className="font-bold text-slate-900">구글 스프레드시트 접속</h4>
                <p className="text-slate-600 leading-relaxed">
                  새 브라우저 창에서 <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">sheets.new</a> 로 이동하여 새 스프레드시트를 만듭니다.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-extrabold text-indigo-600 flex items-center gap-1">
                  STEP 2
                </div>
                <h4 className="font-bold text-slate-900">Apps Script 편집기 열기</h4>
                <p className="text-slate-600 leading-relaxed">
                  스프레드시트 상단 메뉴의 <strong>[확장 프로그램] &gt; [Apps Script]</strong>를 클릭합니다.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-extrabold text-indigo-600 flex items-center gap-1">
                  STEP 3
                </div>
                <h4 className="font-bold text-slate-900">코드 붙여넣기</h4>
                <p className="text-slate-600 leading-relaxed">
                  상단의 <strong className="text-indigo-600">'Apps Script 코드 전체 복사'</strong> 버튼을 누른 후, 기존 코드를 지우고 전체 붙여넣습니다.
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="font-extrabold text-emerald-700 flex items-center gap-1">
                  STEP 4
                </div>
                <h4 className="font-bold text-slate-900">실행 & 설문지 완성</h4>
                <p className="text-emerald-900 leading-relaxed">
                  상단 <strong>[▶ 실행]</strong> 버튼을 누르면 권한 승인 후 '학생명단' 시트 기록 및 Google 설문지 링크가 로그(실행 동향)에 출력됩니다!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 5x2 Printable Code Cards PDF Modal */}
      <PrintCodeCardsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        classNameTitle={classNameTitle}
        studentList={studentListWithCodes}
      />
    </div>
  );
};
