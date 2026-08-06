# 학생 자기평가 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 설문 응답 원본 파일에 이미 들어있는 자기평가 5문항을 파싱해 교사가 문항별 통계와 학생별 원본 응답을 볼 수 있는 새 탭을 추가한다.

**Architecture:** `fileParser.ts`가 자기평가 컬럼(제목이 `[`로 시작)을 지목 문항과 분리해 `SelfAssessmentResponse[]`로 추출하고, 순수 함수 `selfAssessmentEngine.ts`가 5점 척도 점수화·문항별 통계를 계산하고, `SelfAssessmentTab.tsx`가 이를 표시한다. `App.tsx`는 이 데이터를 state로 들고 있다가 신규 탭에 전달하고, 사이드바에 "3. 학생 자기평가"를 끼워 넣으며 이후 탭 번호를 4~7로 민다.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS (기존 컴포넌트 스타일 재사용), xlsx(SheetJS) — 이미 프로젝트에 설치됨. 새 의존성 추가 없음.

## Global Constraints

- 이 저장소에는 테스트 러너가 없다(`package.json`에 jest/vitest 없음, `npm run lint`는 `tsc --noEmit`만 함). 이 계획의 "테스트" 단계는 `npx tsx <스크립트>`로 실행하는 1회성 검증 스크립트다 — 실행 후 반드시 삭제한다(레포에 남기지 않음).
- `sample-data/`는 절대 git에 커밋하지 않는다(레포 public, 학생 개인정보 포함). 실제 응답 파일(`C:\Users\mrdoo\Desktop\CRA_TEST\...xlsx`)을 검증에 쓸 때도 그 경로 밖으로 복사하지 않는다.
- 커밋마다 `npm run lint`(tsc --noEmit)가 에러 없이 통과해야 한다.
- 스펙 문서: `docs/superpowers/specs/2026-08-06-student-self-assessment-tab-design.md` — 이 계획의 모든 태스크는 그 문서의 결정을 그대로 따른다(재해석 금지).

---

### Task 1: 데이터 타입 추가

**Files:**
- Modify: `src/types/sna.ts` (SurveyResponse 인터페이스 바로 뒤, 19번째 줄 `WeightScheme` 위)

**Interfaces:**
- Produces: `SelfAssessmentResponse` 타입 — 이후 모든 태스크가 이 타입을 씀.

- [ ] **Step 1: 타입 추가**

`src/types/sna.ts`에서 아래 블록 찾기:

```ts
export interface SurveyResponse {
  id: string;
  timestamp?: string;
  studentCode: string;
  studentName: string;
  // questionColumnName -> array of student names chosen (e.g. 1st, 2nd, 3rd choice)
  choices: Record<string, string[]>;
}

export type WeightScheme = [number, number, number]; // [1순위점수, 2순위점수, 3순위점수]
```

`SurveyResponse`와 `WeightScheme` 사이에 삽입:

```ts
export interface SurveyResponse {
  id: string;
  timestamp?: string;
  studentCode: string;
  studentName: string;
  // questionColumnName -> array of student names chosen (e.g. 1st, 2nd, 3rd choice)
  choices: Record<string, string[]>;
}

export interface SelfAssessmentResponse {
  studentCode: string;
  studentName: string;
  answers: Record<string, string>; // 문항 원문 -> 응답 텍스트 원본 (예: "그렇다.")
}

export type WeightScheme = [number, number, number]; // [1순위점수, 2순위점수, 3순위점수]
```

- [ ] **Step 2: 타입체크**

Run: `npm run lint`
Expected: 에러 없음 (신규 타입은 아직 아무 데서도 안 쓰이므로 실패할 이유 없음)

- [ ] **Step 3: Commit**

```bash
git add src/types/sna.ts
git commit -m "feat: add SelfAssessmentResponse type"
```

---

### Task 2: 자기평가 컬럼 파싱

**Files:**
- Modify: `src/utils/fileParser.ts:1-2` (import), `src/utils/fileParser.ts:4-8` (ParsedSurveyData), `src/utils/fileParser.ts:68-157` (parseSurveyFile 전체)

**Interfaces:**
- Consumes: `SelfAssessmentResponse` (Task 1)
- Produces: `ParsedSurveyData.selfAssessments: SelfAssessmentResponse[]` — Task 5(App.tsx)가 이 필드를 state에 저장.

- [ ] **Step 1: import 추가**

`src/utils/fileParser.ts` 최상단:

```ts
// before
import * as XLSX from "xlsx";
import { Student, SurveyResponse } from "../types/sna";

// after
import * as XLSX from "xlsx";
import { Student, SurveyResponse, SelfAssessmentResponse } from "../types/sna";
```

- [ ] **Step 2: ParsedSurveyData에 필드 추가**

```ts
// before
export interface ParsedSurveyData {
  students: Student[];
  surveyResponses: SurveyResponse[];
  questionHeaders: string[];
}

// after
export interface ParsedSurveyData {
  students: Student[];
  surveyResponses: SurveyResponse[];
  questionHeaders: string[];
  selfAssessments: SelfAssessmentResponse[];
}
```

- [ ] **Step 3: parseSurveyFile에서 자기평가 컬럼 분리**

`questionHeaders` 계산 직후에 자기평가 컬럼을 따로 뽑아낸다. 아래 블록:

```ts
  // Detect choice columns (columns that ask for student choices)
  const questionHeaders = allHeaders.filter(
    (h) => h !== targetCodeCol && !h.toLowerCase().includes("타임스탬프") && !h.toLowerCase().includes("timestamp")
  );
```

를 다음으로 교체:

```ts
  // Self-assessment grid columns are titled "[문항 원문]" (a leading space is
  // common since Google Forms grid items don't prefix the item title).
  // These are a separate dataset from the nomination questions below.
  const selfAssessmentCols = allHeaders.filter((h) => h.trim().startsWith("["));

  // Detect choice columns (columns that ask for student choices)
  const questionHeaders = allHeaders.filter(
    (h) =>
      h !== targetCodeCol &&
      !h.toLowerCase().includes("타임스탬프") &&
      !h.toLowerCase().includes("timestamp") &&
      !selfAssessmentCols.includes(h)
  );
```

- [ ] **Step 4: 행마다 SelfAssessmentResponse 생성**

`cleanRows.forEach((row, idx) => { ... })` 루프 안, `parsedResponses.push({...})` 바로 앞에 추가:

```ts
    const choices: Record<string, string[]> = {};

    questionHeaders.forEach((qHeader) => {
      const rawVal = String(row[qHeader] || "").trim();
      if (!rawVal) return;

      // Handle comma-separated choices or single name
      const targets = rawVal
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean);

      choices[qHeader] = targets;
    });

    if (selfAssessmentCols.length > 0) {
      const answers: Record<string, string> = {};
      selfAssessmentCols.forEach((qHeader) => {
        const rawVal = String(row[qHeader] || "").trim();
        if (rawVal) answers[qHeader] = rawVal;
      });
      if (Object.keys(answers).length > 0) {
        selfAssessments.push({ studentCode: rawCode, studentName, answers });
      }
    }

    parsedResponses.push({
      id: `resp_${idx}`,
      studentCode: rawCode,
      studentName,
      choices,
    });
```

`selfAssessments` 배열은 루프 밖에서 선언해야 한다. `const parsedResponses: SurveyResponse[] = [];` 바로 아래 줄에 추가:

```ts
  const parsedResponses: SurveyResponse[] = [];
  const selfAssessments: SelfAssessmentResponse[] = [];
  const extractedStudentsMap = new Map<string, Student>();
```

- [ ] **Step 5: 리턴 값에 selfAssessments 추가**

```ts
// before
  return {
    students: finalStudents,
    surveyResponses: parsedResponses,
    questionHeaders,
  };

// after
  return {
    students: finalStudents,
    surveyResponses: parsedResponses,
    questionHeaders,
    selfAssessments,
  };
```

- [ ] **Step 6: 실제 파일로 검증하는 스크립트 작성 및 실행**

Write `_verify_parse.ts` at repo root (Node's File API differs from browser's — build a minimal
File-like shim with `arrayBuffer()` from `fs.readFileSync`):

```ts
import { readFileSync } from "fs";
import { parseSurveyFile } from "./src/utils/fileParser";

const buf = readFileSync(
  "C:\\Users\\mrdoo\\Desktop\\CRA_TEST\\2026. 1학기. 나와 친구 이야기 (응답).xlsx"
);
const fakeFile = {
  arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
} as unknown as File;

parseSurveyFile(fakeFile).then((result) => {
  console.log("questionHeaders count (지목 문항, should be 18):", result.questionHeaders.length);
  console.log("selfAssessments count (should be 28, one per response row):", result.selfAssessments.length);
  console.log("first self-assessment entry:", JSON.stringify(result.selfAssessments[0], null, 2));
  const answerCounts = new Set(result.selfAssessments.map((r) => Object.keys(r.answers).length));
  console.log("distinct answer-count-per-student values (should be just {5}):", Array.from(answerCounts));
});
```

Run: `npx tsx _verify_parse.ts`

Expected output: `questionHeaders count: 18`, `selfAssessments count: 28`, each response has exactly 5 keys in `answers`, and none of those 5 keys appear in `questionHeaders`.

- [ ] **Step 7: 스크립트 삭제**

```bash
rm _verify_parse.ts
```

- [ ] **Step 8: 타입체크 후 커밋**

Run: `npm run lint` — expect no errors.

```bash
git add src/utils/fileParser.ts
git commit -m "feat: parse self-assessment grid columns separately from nomination questions"
```

---

### Task 3: 점수화 유틸

**Files:**
- Create: `src/utils/selfAssessmentEngine.ts`

**Interfaces:**
- Consumes: `SelfAssessmentResponse` (Task 1)
- Produces: `SELF_ASSESSMENT_SCALE: Record<string, number>`, `scoreAnswer(raw: string): number | null`, `QuestionStat` interface, `calculateQuestionStats(responses: SelfAssessmentResponse[]): QuestionStat[]` — Task 4(SelfAssessmentTab)가 이 세 개를 씀.

- [ ] **Step 1: 파일 작성**

```ts
import { SelfAssessmentResponse } from "../types/sna";

export const SELF_ASSESSMENT_SCALE: Record<string, number> = {
  "정말 그렇다": 5,
  "그렇다": 4,
  "보통이다": 3,
  "잘 모르겠다": 2,
  "전혀 아니다": 1,
};

/**
 * Maps a raw answer cell (e.g. "그렇다.") to its 1-5 scale score.
 * Returns null for anything that doesn't match one of the 5 known labels.
 */
export function scoreAnswer(raw: string): number | null {
  const cleaned = raw.trim().replace(/\.+$/, "");
  return SELF_ASSESSMENT_SCALE[cleaned] ?? null;
}

export interface QuestionStat {
  question: string;
  avgScore: number;
  responseCount: number;
  distribution: Record<string, number>; // scale label -> count
}

export function calculateQuestionStats(responses: SelfAssessmentResponse[]): QuestionStat[] {
  if (responses.length === 0) return [];

  const questionSet = new Set<string>();
  responses.forEach((r) => Object.keys(r.answers).forEach((q) => questionSet.add(q)));

  return Array.from(questionSet).map((question) => {
    const distribution: Record<string, number> = {};
    Object.keys(SELF_ASSESSMENT_SCALE).forEach((label) => {
      distribution[label] = 0;
    });

    let total = 0;
    let count = 0;

    responses.forEach((r) => {
      const raw = r.answers[question];
      if (!raw) return;
      const cleaned = raw.trim().replace(/\.+$/, "");
      const score = SELF_ASSESSMENT_SCALE[cleaned];
      if (score === undefined) return;
      distribution[cleaned] += 1;
      total += score;
      count += 1;
    });

    return {
      question,
      avgScore: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
      responseCount: count,
      distribution,
    };
  });
}
```

- [ ] **Step 2: 검증 스크립트 작성 및 실행**

Write `_verify_stats.ts` at repo root:

```ts
import { calculateQuestionStats, scoreAnswer } from "./src/utils/selfAssessmentEngine";

// scoreAnswer sanity
console.log("scoreAnswer('그렇다.') should be 4:", scoreAnswer("그렇다."));
console.log("scoreAnswer('전혀 아니다.') should be 1:", scoreAnswer("전혀 아니다."));
console.log("scoreAnswer('알수없음') should be null:", scoreAnswer("알수없음"));

// calculateQuestionStats sanity with a hand-built 3-response fixture
const fixture = [
  { studentCode: "1", studentName: "학생A", answers: { Q1: "정말 그렇다.", Q2: "그렇다." } },
  { studentCode: "2", studentName: "학생B", answers: { Q1: "그렇다.", Q2: "보통이다." } },
  { studentCode: "3", studentName: "학생C", answers: { Q1: "보통이다.", Q2: "그렇다." } },
];
const stats = calculateQuestionStats(fixture);
console.log(JSON.stringify(stats, null, 2));
// Expected Q1: avgScore = (5+4+3)/3 = 4.0, responseCount 3
// Expected Q2: avgScore = (4+3+4)/3 = 3.7, responseCount 3
```

Run: `npx tsx _verify_stats.ts`

Expected: the three `scoreAnswer` lines print `4`, `1`, `null`. Q1 `avgScore` is `4`, Q2 `avgScore` is `3.7`, both `responseCount: 3`, and `distribution` counts sum to 3 for each question.

- [ ] **Step 3: 스크립트 삭제**

```bash
rm _verify_stats.ts
```

- [ ] **Step 4: 타입체크 후 커밋**

Run: `npm run lint` — expect no errors.

```bash
git add src/utils/selfAssessmentEngine.ts
git commit -m "feat: add self-assessment scoring and per-question stats utility"
```

---

### Task 4: SelfAssessmentTab 컴포넌트

**Files:**
- Create: `src/components/SelfAssessmentTab.tsx`

**Interfaces:**
- Consumes: `SelfAssessmentResponse` (Task 1), `calculateQuestionStats`/`QuestionStat` (Task 3), `getAnonymizedName` (기존 `src/utils/anonymizer.ts`)
- Produces: `SelfAssessmentTab` React 컴포넌트 — Task 5(App.tsx)가 렌더링.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import React from "react";
import { Student, SelfAssessmentResponse } from "../types/sna";
import { calculateQuestionStats, SELF_ASSESSMENT_SCALE } from "../utils/selfAssessmentEngine";
import { getAnonymizedName } from "../utils/anonymizer";
import { Smile, ClipboardList } from "lucide-react";

interface Props {
  selfAssessments: SelfAssessmentResponse[];
  students?: Student[];
  isAnonymous?: boolean;
}

const SCALE_LABELS = Object.keys(SELF_ASSESSMENT_SCALE); // ["정말 그렇다", "그렇다", "보통이다", "잘 모르겠다", "전혀 아니다"]

export const SelfAssessmentTab: React.FC<Props> = ({
  selfAssessments,
  students = [],
  isAnonymous = false,
}) => {
  const displayName = (name: string) =>
    getAnonymizedName(name, students.length > 0 ? students : selfAssessments, isAnonymous);

  if (selfAssessments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <ClipboardList className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">자기평가 데이터가 없습니다</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          업로드한 설문 응답 파일에 자기평가(정서/적응) 5문항 그리드가 포함되어 있지 않습니다.
          1번 메뉴에서 생성한 최신 설문 양식으로 응답을 받으면 이 화면에서 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const stats = calculateQuestionStats(selfAssessments);
  const questions = stats.map((s) => s.question);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <Smile className="w-4 h-4" /> Self Assessment
        </div>
        <h2 className="text-xl font-extrabold mt-1">학생 자기평가 (정서·적응) 결과</h2>
        <p className="text-xs text-slate-300 mt-1">
          설문 응답에 포함된 자기평가 {questions.length}문항의 학급 전체 통계와 학생별 원본 응답입니다.
        </p>
      </div>

      {/* Per-question stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.question} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800 leading-snug">{s.question.trim()}</h3>
              <span className="text-sm font-extrabold text-indigo-600 flex-shrink-0">
                {s.avgScore.toFixed(1)} / 5.0
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${(s.avgScore / 5) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              {SCALE_LABELS.map((label) => (
                <span key={label}>
                  {label} {s.distribution[label] || 0}명
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Per-student raw responses */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-800">📋 학생별 자기평가 원본 응답</h3>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold divide-y divide-slate-200">
              <tr>
                <th className="p-3">이름</th>
                {questions.map((q) => (
                  <th key={q} className="p-3">
                    {q.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {selfAssessments.map((r) => (
                <tr key={r.studentCode} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{displayName(r.studentName)}</td>
                  {questions.map((q) => (
                    <td key={q} className="p-3">
                      {r.answers[q] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 타입체크 후 커밋**

Run: `npm run lint` — expect no errors.

```bash
git add src/components/SelfAssessmentTab.tsx
git commit -m "feat: add SelfAssessmentTab component"
```

(브라우저 렌더링 검증은 Task 6에서 App.tsx 배선 후 한 번에 한다 — 이 컴포넌트는 아직 어디서도 안 쓰이므로 지금 단독으로 렌더 확인 불가.)

---

### Task 5: App.tsx 배선

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SelfAssessmentResponse` (Task 1), `SelfAssessmentTab` (Task 4), `ParsedSurveyData.selfAssessments` (Task 2, `DataManagementTab`을 거쳐 들어옴)

- [ ] **Step 1: DataManagementTab.tsx의 onUpdateData 시그니처 수정**

`parseSurveyFile`이 이제 `selfAssessments`도 돌려주므로, 이걸 `App.tsx`까지 전달해야 한다.
명렬표만 업로드하는 경로(`handleRosterUpload`)는 자기평가 데이터를 안 건드려야 하므로
세 번째 인자는 optional로 둔다.

`src/components/DataManagementTab.tsx`:

```tsx
// before
import { Student, SurveyResponse, WeightScheme } from "../types/sna";
...
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

// after
import { Student, SurveyResponse, SelfAssessmentResponse, WeightScheme } from "../types/sna";
...
interface Props {
  students: Student[];
  surveyResponses: SurveyResponse[];
  weights: WeightScheme;
  waveTitle: string;
  onUpdateData: (
    newStudents: Student[],
    newResponses: SurveyResponse[],
    newSelfAssessments?: SelfAssessmentResponse[]
  ) => void;
  onUpdateWeights: (newWeights: WeightScheme) => void;
  onUpdateWaveTitle: (newTitle: string) => void;
  onLoadSampleData: () => void;
  onUploadBackupFile: (file: File) => void;
}
```

`handleSurveyUpload`에서 세 번째 인자로 전달:

```tsx
// before
      const result = await parseSurveyFile(file, students);
      onUpdateData(result.students, result.surveyResponses);

// after
      const result = await parseSurveyFile(file, students);
      onUpdateData(result.students, result.surveyResponses, result.selfAssessments);
```

`handleRosterUpload`는 그대로 둔다(`onUpdateData(parsedStudents, surveyResponses)`) —
세 번째 인자가 optional이라 자기평가 state를 건드리지 않는다.

- [ ] **Step 2: import 추가**

```tsx
// before
import { Student, SurveyResponse, WeightScheme, DomainAnalysisResult } from "./types/sna";
...
import { DataManagementTab } from "./components/DataManagementTab";

// after
import { Student, SurveyResponse, SelfAssessmentResponse, WeightScheme, DomainAnalysisResult } from "./types/sna";
...
import { DataManagementTab } from "./components/DataManagementTab";
import { SelfAssessmentTab } from "./components/SelfAssessmentTab";
```

(두 번째 줄은 기존 `DataManagementTab` import 바로 아래에 추가)

- [ ] **Step 3: activeTab 유니온 및 state 추가**

```tsx
// before
  const [activeTab, setActiveTab] = useState<
    "script" | "import" | "dashboard" | "counseling" | "history" | "gephi"
  >("script");

// after
  const [activeTab, setActiveTab] = useState<
    "script" | "import" | "selfAssessment" | "dashboard" | "counseling" | "history" | "gephi"
  >("script");
```

`responses` state 선언 바로 아래에 추가:

```tsx
// before
  const [students, setStudents] = useState<Student[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

// after
  const [students, setStudents] = useState<Student[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selfAssessments, setSelfAssessments] = useState<SelfAssessmentResponse[]>([]);
```

- [ ] **Step 4: DataManagementTab 연결부 수정**

```tsx
// before
          {activeTab === "import" && (
            <DataManagementTab
              students={students}
              surveyResponses={responses}
              weights={weights}
              waveTitle={waveTitle}
              onUpdateData={(newStudents, newResponses) => {
                setStudents(newStudents);
                setResponses(newResponses);
              }}
              onUpdateWeights={setWeights}
              onUpdateWaveTitle={setWaveTitle}
              onLoadSampleData={handleLoadSampleData}
              onUploadBackupFile={handleUploadLocalBackupFile}
            />
          )}

// after
          {activeTab === "import" && (
            <DataManagementTab
              students={students}
              surveyResponses={responses}
              weights={weights}
              waveTitle={waveTitle}
              onUpdateData={(newStudents, newResponses, newSelfAssessments) => {
                setStudents(newStudents);
                setResponses(newResponses);
                setSelfAssessments(newSelfAssessments);
              }}
              onUpdateWeights={setWeights}
              onUpdateWaveTitle={setWaveTitle}
              onLoadSampleData={handleLoadSampleData}
              onUploadBackupFile={handleUploadLocalBackupFile}
            />
          )}
```

`handleLoadSampleData`에도 초기화 추가(샘플 데이터엔 자기평가가 없음):

```tsx
// before
  const handleLoadSampleData = () => {
    setStudents(SAMPLE_STUDENTS);
    setResponses(SAMPLE_RESPONSES_WAVE1);
    setClassNameTitle("3학년 2반");
    setWaveTitle("1차 조사 (1학기 초 3월)");
    setActiveTab("dashboard");
  };

// after
  const handleLoadSampleData = () => {
    setStudents(SAMPLE_STUDENTS);
    setResponses(SAMPLE_RESPONSES_WAVE1);
    setSelfAssessments([]);
    setClassNameTitle("3학년 2반");
    setWaveTitle("1차 조사 (1학기 초 3월)");
    setActiveTab("dashboard");
  };
```

- [ ] **Step 5: 사이드바에 신규 탭 버튼 삽입, 이후 번호 재배열**

"2. 설문/명렬표 데이터 관리" 버튼과 "3. 관계망 분석" 버튼 사이에 신규 버튼 삽입:

```tsx
// before (2번 버튼 바로 뒤, 3번 버튼 바로 앞)
          {/* 3. 관계망 분석 (Sociogram) */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("dashboard");
            }}

// after
          {/* 3. 학생 자기평가 */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("selfAssessment");
            }}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "selfAssessment"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : hasData
                ? "text-slate-300 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-800/40 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center min-w-0">
              <Smile className="w-4 h-4 mr-2.5 flex-shrink-0 text-amber-400" />
              <span className="truncate">3. 학생 자기평가</span>
            </div>
            {!hasData && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-medium flex-shrink-0 ml-1">
                데이터 필요
              </span>
            )}
          </button>

          {/* 4. 관계망 분석 (Sociogram) */}
          <button
            onClick={() => {
              if (!hasData) {
                alert("분석할 설문 응답 데이터가 없습니다.\n1번 메뉴에서 [샘플 데이터로 바로 시작하기]를 클릭하시거나,\n2번 메뉴에서 구글 설문 응답(CSV/엑셀)을 등록해 주세요.");
                return;
              }
              setActiveTab("dashboard");
            }}
```

기존 3~6번 버튼의 나머지 3곳(각 버튼의 `<span className="truncate">` 라벨 텍스트와 헤더 주석)에서 번호만 하나씩 올린다:
- `<span className="truncate">3. 관계망 분석 (Sociogram)</span>` → `4. 관계망 분석 (Sociogram)`
- `<span className="truncate">4. AI 맞춤 상담 조언</span>` → `5. AI 맞춤 상담 조언`
- `<span className="truncate">5. 누적 관계 변화 (History)</span>` → `6. 누적 관계 변화 (History)`
- `<span className="truncate">6. Gephi / 보고서 / 백업</span>` → `7. Gephi / 보고서 / 백업`
- `title="6. Gephi / 보고서 / 백업 데이터 저장"` → `title="7. Gephi / 보고서 / 백업 데이터 저장"`
(각 버튼의 `onClick`/`activeTab` 값 자체는 `"dashboard"`/`"counseling"`/`"history"`/`"gephi"`로 그대로 — 라벨 문구만 바뀐다)

`Smile` 아이콘 import 추가 (lucide-react import 목록에 이미 있는 `Info` 옆에 추가):

```tsx
// before
  Settings,
  Info,
} from "lucide-react";

// after
  Settings,
  Info,
  Smile,
} from "lucide-react";
```

- [ ] **Step 6: 헤더 상단 배지 라벨 재배열**

```tsx
// before
              {activeTab === "script" && "1. Google 설문지 생성"}
              {activeTab === "import" && "2. 설문/명렬표 데이터 관리"}
              {activeTab === "dashboard" && "3. 관계망 분석 (Sociogram)"}
              {activeTab === "counseling" && "4. AI 맞춤 상담 조언"}
              {activeTab === "history" && "5. 누적 관계 변화 (History)"}
              {activeTab === "gephi" && "6. Gephi / 보고서 / 백업 데이터"}

// after
              {activeTab === "script" && "1. Google 설문지 생성"}
              {activeTab === "import" && "2. 설문/명렬표 데이터 관리"}
              {activeTab === "selfAssessment" && "3. 학생 자기평가"}
              {activeTab === "dashboard" && "4. 관계망 분석 (Sociogram)"}
              {activeTab === "counseling" && "5. AI 맞춤 상담 조언"}
              {activeTab === "history" && "6. 누적 관계 변화 (History)"}
              {activeTab === "gephi" && "7. Gephi / 보고서 / 백업 데이터"}
```

- [ ] **Step 7: 익명화 토글 노출 조건에 selfAssessment 추가**

```tsx
// before
          {["dashboard", "counseling", "history", "gephi"].includes(activeTab) && (

// after
          {["selfAssessment", "dashboard", "counseling", "history", "gephi"].includes(activeTab) && (
```

- [ ] **Step 8: 탭 본문 렌더링 추가**

`{activeTab === "import" && (<DataManagementTab .../>)}` 블록 바로 뒤, `{!hasData && activeTab !== "script" && activeTab !== "import" && (...)}` 블록 앞에 삽입:

```tsx
          {hasData && activeTab === "selfAssessment" && (
            <SelfAssessmentTab
              selfAssessments={selfAssessments}
              students={students}
              isAnonymous={isAnonymous}
            />
          )}
```

같은 이유로 `{!hasData && activeTab !== "script" && activeTab !== "import" && (...)}` 빈 상태 블록의 조건에 `selfAssessment`도 걸리게 그대로 둔다(이미 `!== "script" && !== "import"`라 자동 포함됨 — 수정 불필요, 확인만 한다).

- [ ] **Step 9: 타입체크 후 커밋**

Run: `npm run lint` — expect no errors.

```bash
git add src/App.tsx src/components/DataManagementTab.tsx
git commit -m "feat: wire up self-assessment tab in App.tsx and renumber nav"
```

---

### Task 6: 엔드투엔드 검증

**Files:** 없음 (기존 파일만 실행/조작)

- [ ] **Step 1: dev 서버 기동, 빈 상태 확인**

`.claude/launch.json`의 `cra-dev` 프리뷰로 `npm run dev` 기동. "1. Google 설문지 생성" 화면에서 "샘플 데이터로 바로 시작하기 (25명)" 클릭 (샘플 데이터엔 자기평가 문항이 없음).

사이드바에서 "3. 학생 자기평가" 클릭 → "자기평가 데이터가 없습니다" 빈 상태 카드가 뜨는지 확인. 사이드바의 이후 항목 번호가 4~7로 보이는지, 상단 헤더 배지 문구도 일치하는지 확인.

- [ ] **Step 2: 실제 응답 파일로 자기평가 데이터 렌더링 확인**

"2. 설문/명렬표 데이터 관리" 탭에서 "설문 응답 파일 선택" 인풋에
`C:\Users\mrdoo\Desktop\CRA_TEST\2026. 1학기. 나와 친구 이야기 (응답).xlsx` 업로드.
(브라우저 자동화 도구가 로컬 파일 선택 다이얼로그를 지원하지 않으면, 이 단계는 사용자에게 직접 업로드해달라고 요청하고 결과 화면 스크린샷/텍스트로 확인한다.)

업로드 후 "3. 학생 자기평가" 탭 이동. 확인 항목:
- 문항 카드 5개, 각각 평균 점수(0~5.0)와 막대, 응답분포 텍스트가 표시됨
- 하단 표에 28명 학생 행, 5개 문항 열, 원본 텍스트("그렇다." 등) 그대로 표시됨
- "🔓 실명 표시" 토글을 눌러 "🔒 익명화 ON"으로 바꾸면 이름 컬럼이 코드로 바뀜
- "4. 관계망 분석"(구 3번) 탭으로 이동해 기존 지목 관계 분석이 평소대로(자기평가 문항 없이) 동작하는지 확인 — 자기평가 컬럼이 SNA 계산에 섞여 들어가지 않았는지 확인

- [ ] **Step 3: 콘솔 에러 확인**

`read_console_messages`(onlyErrors: true)로 에러 없는지 확인.

- [ ] **Step 4: 서버 정리, 최종 빌드 확인**

```bash
npm run build
```

Expected: 성공 (번들 사이즈 경고는 무시 가능, 기존에도 있던 경고).

---

## Self-Review

**Spec coverage:** 데이터 모델(Task 1) · 파싱(Task 2) · 점수화 유틸(Task 3) · UI(Task 4) · 배선/번호재배열(Task 5) · 검증(Task 6) — 스펙의 모든 섹션에 대응하는 태스크 있음. 내보내기·별도업로드·AI연동·시계열비교는 스펙에서 명시적으로 범위 밖이라 태스크 없음(의도된 누락).

**Placeholder scan:** 없음 — 모든 스텝에 실제 코드/명령어 포함.

**Type consistency:** `SelfAssessmentResponse`(Task1) → `ParsedSurveyData.selfAssessments`(Task2) → `SelfAssessmentTab` props `selfAssessments`(Task4) → `App.tsx` state `selfAssessments`(Task5) 전부 동일 타입/이름으로 일관됨. `DataManagementTab`의 `onUpdateData` 시그니처가 3-인자(마지막 optional)로 바뀌는 것과 `handleSurveyUpload`가 `result.selfAssessments`를 넘기는 것 둘 다 Task 5 Step 1로 반영함(초안 누락, 이 리뷰에서 발견해 보강).

