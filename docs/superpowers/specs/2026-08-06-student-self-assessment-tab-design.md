# 학생 자기평가 탭 — 설계

## 배경

구글 설문 응답 원본 파일에는 교우관계 지목 문항 외에 자기평가(정서/적응) 5문항이
그리드 형태로 함께 수집된다. 실제 응답 파일(`2026. 1학기. 나와 친구 이야기
(응답).xlsx`)로 확인한 컬럼 구조:

```
타임스탬프 | 개인 코드를 입력하세요. |
 [나는 나만의 좋은 점이 있다고 생각한다.] |
 [나는 학교생활과 우리반에 만족하며, 즐겁게 지내고 있다.] |
 [나는 어려운 일이 생겼을 때 주변에 도움을 요청할 수 있다.] |
 [나는 우리반 친구들과 잘 어울리고, 함께 시간을 보내는 것이 즐겁다.] |
 [나는 나의 감정을 잘 이해하고 표현하는 편이다.] |
 (이하 지목 문항 18개 컬럼)
```

자기평가 5문항 컬럼은 제목이 `[`로 시작하고(앞에 공백 1칸 포함), 응답값은
5점 척도 텍스트: `정말 그렇다.` / `그렇다.` / `보통이다.` / `잘 모르겠다.` /
`전혀 아니다.` (`GoogleScriptGeneratorTab.tsx`의 gridItem 컬럼 순서와 일치).

현재 `fileParser.ts`의 `parseSurveyFile`은 이 컬럼들을 지목 문항과
구분하지 않고 그대로 `questionHeaders`에 섞어 `SnaEngine`으로 흘려보낸다 —
자기평가 응답은 어디에도 표시되지 않고 버려지는 셈이다. 이 기능은 이미 원본
파일에 들어있는 자기평가 데이터를 파싱해서 교사가 확인할 수 있는 화면을
새로 만든다.

## 범위

- 자기평가 컬럼 파싱 및 데이터 모델 추가
- 문항별 평균 점수 + 응답 분포 차트
- 학생별 원본 응답 표 (익명화 토글 적용)
- 사이드바 신규 탭, "3. 관계망 분석" 앞에 배치, 번호 재배열

**범위 밖 (YAGNI)**: 별도 파일 업로드 경로, 엑셀/PDF 내보내기, AI 상담
프롬프트 연동, 시계열(누적) 비교. 필요해지면 이후 별도 스펙으로 추가한다.

## 데이터 모델

`src/types/sna.ts`에 추가:

```ts
export interface SelfAssessmentResponse {
  studentCode: string;
  studentName: string;
  answers: Record<string, string>; // 문항 원문 -> 응답 텍스트 원본
}
```

`SurveyResponse`는 건드리지 않는다 — 자기평가는 지목 관계망과 무관한 별도
데이터라 `choices`에 섞지 않고 나란히 둔다.

## 파싱

`src/utils/fileParser.ts`의 `parseSurveyFile`을 수정:

- 컬럼 분류 시 제목이(trim 후) `[`로 시작하는 컬럼을 `selfAssessmentCols`로
  별도 수집, 기존 `questionHeaders`(지목 문항)에서는 제외한다.
- 각 응답 행마다 `selfAssessmentCols`를 순회해 `SelfAssessmentResponse`를
  하나 만들어 배열에 push.
- `ParsedSurveyData`에 `selfAssessments: SelfAssessmentResponse[]` 필드
  추가.
- 자기평가 컬럼이 없는(구버전) 파일이면 빈 배열 — 에러 아님.

## 점수화 유틸

신규 파일 `src/utils/selfAssessmentEngine.ts`:

```ts
export const SELF_ASSESSMENT_SCALE: Record<string, number> = {
  "정말 그렇다": 5,
  "그렇다": 4,
  "보통이다": 3,
  "잘 모르겠다": 2,
  "전혀 아니다": 1,
};

export function scoreAnswer(raw: string): number | null; // 끝 마침표 제거 후 매핑, 미매칭시 null
export function calculateQuestionStats(
  responses: SelfAssessmentResponse[]
): { question: string; avgScore: number; distribution: Record<string, number> }[];
```

`distribution`은 각 척도 라벨 -> 응답 수(집계용, 차트에 그대로 사용).

## UI — `SelfAssessmentTab.tsx` (신규)

기존 탭들의 카드/톤 재사용(`AiCounselingTab.tsx` 등과 동일한 배너 + 카드
레이아웃).

- **상단**: 문항별 평균 점수 카드 5개(가로 막대 또는 bar chart, 5점 만점
  기준) + 응답 분포 스택형 막대.
- **하단**: 학생별 원본 응답 표 — 행 = 학생, 열 = 5문항, 값 = 응답 텍스트
  그대로(척도 변환 안 함, 교사가 원문 그대로 확인). 이름 컬럼은 다른
  탭과 동일하게 `getAnonymizedName`으로 익명화 토글 반영.
- 자기평가 데이터가 빈 배열이면 "이 설문 파일에는 자기평가 문항이 없습니다"
  안내 카드만 표시(다른 탭의 `!hasData` 빈 상태 패턴과 동일한 톤).

## 배선

`App.tsx`:

- `selfAssessments: SelfAssessmentResponse[]` state 추가, `students`/
  `responses`와 함께 `DataManagementTab`의 `onUpdateData`에서 세팅.
- `activeTab` 유니온에 `"selfAssessment"` 추가.
- 사이드바 네비게이션 순서: 1. Google 설문지 생성 → 2. 설문/명렬표 데이터
  관리 → **3. 학생 자기평가(신규)** → 4. 관계망 분석 → 5. AI 맞춤 상담
  조언 → 6. 누적 관계 변화 → 7. Gephi/보고서/백업. 기존 3~6번 버튼은
  라벨의 번호만 4~7로 밀리고 동작 로직은 그대로.
- `hasData`(현재 `responses.length > 0`) 게이팅을 그대로 재사용 — 명렬표/
  응답이 로드되어야 탭 진입 가능한 건 기존 탭들과 동일한 전제.

## 테스트

- 실제 응답 파일로 파싱: 5개 자기평가 컬럼이 `questionHeaders`(지목 문항)
  에 섞이지 않고 `selfAssessments`로만 분리되는지 확인.
- 자기평가 컬럼 없는 샘플 데이터(`sampleData.ts`)로도 에러 없이 빈 배열
  반환하는지 확인.
- 브라우저에서 새 탭 진입, 문항별 평균/분포와 학생별 표가 실제 값과
  일치하는지, 익명화 토글이 이름 컬럼에 반영되는지 확인.
