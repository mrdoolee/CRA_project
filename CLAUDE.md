# CLAUDE.md

CRA (Classroom Relationship Analysis by 두리쌤) — 교실 교우관계 사회연결망분석(SNA) 웹앱.
Google AI Studio에서 초기 개발 후 GitHub(`mrdoolee/CRA_project`, **public**)에 올라가
있고 Vercel로 배포됨(`cra-project-two.vercel.app`). 2026-08-03에 Claude Code로 첫
코드 감사 진행, 2026-08-04에 감사에서 발견된 이슈(API 키 아키텍처, CORS, XSS, xlsx
취약점) 수정 진행.

## 개요

교사가 구글 설문 응답(엑셀/CSV)을 업로드하면 학급 내 지목 관계를 분석해 SNA 지표
(인기도·중재자·고립 위험 등)를 계산하고, Gemini AI로 학급/개별 학생 상담 조언을 생성한다.

## 절대 규칙

**`sample-data/`는 절대 git에 커밋하지 않는다.** 실제 학생 이름·응답이 담긴 로컬
테스트 데이터를 `.gitignore`에 명시적으로 제외해뒀다(2026-08-03 추가). 레포가
public이라 여기 커밋되면 학생 개인정보가 그대로 인터넷에 공개된다. 새로운 테스트용
데이터 파일을 추가할 때도 이 폴더 밖에 두지 말 것.

## 기술 스택

- **프론트**: React 19 + Vite 6 + TypeScript, Tailwind CSS v4, D3(네트워크 그래프),
  xlsx(엑셀 파싱, SheetJS 공식 CDN 패치 버전 0.20.3 — npm 레지스트리 아님, 2026-08-04
  교체), lucide-react, motion
- **백엔드**: Express (`server.ts`) — 개발 시 Vite 미들웨어 모드, 프로덕션은 `dist/`
  정적 서빙 + Express가 `/api/*`를 처리. `/api/ai/*`는 배포 도메인+localhost로 CORS
  제한(2026-08-04 추가)
- **AI**: `@google/genai`(Gemini), 모델명 `gemini-3.6-flash`. **완전 BYOK** — 서버는
  어떤 Gemini API Key도 보관/폴백하지 않고, 매 요청마다 클라이언트가 보내는
  `x-gemini-api-key` 헤더(또는 `userApiKey` 바디)의 사용자 개인 키만 사용함
  (2026-08-04 수정, 이전엔 서버 env 키만 쓰던 버그가 있었음)
- **패키지 매니저**: 원래 Bun 기준(`bun.lock` 존재)이지만 이 환경엔 bun 미설치 —
  npm으로도 설치·빌드·타입체크 정상 동작 확인함(2026-08-03)
- **배포**: Vercel. `vercel.json`/`/api` 서버리스 함수 없음 — `server.ts`를 esbuild로
  번들링한 `dist/server.cjs`를 그대로 실행하는 구조로 추정(Vercel이 Node 서버를
  어떻게 실행하는지는 Vercel 프로젝트 설정을 직접 확인 필요)

## 명령어

```bash
npm install
npm run dev      # tsx로 server.ts 실행 (Vite 미들웨어 모드), localhost:3000
npm run build    # vite build + esbuild로 server.ts → dist/server.cjs
npm run start    # 빌드된 서버 실행
npm run lint      # tsc --noEmit
```

AI 기능은 서버 env 변수를 전혀 쓰지 않는 완전 BYOK 방식(위 AI 항목 참고) — 로컬에서
테스트하려면 `.env.local` 설정과 무관하게, 앱 UI(우측 상단 API Key 버튼)에서 본인의
Gemini API Key를 입력해야 함.

## 구조

```
server.ts              Express 서버, /api/health, /api/ai/{student-advice,classroom-report,longitudinal-report}
sample-data/            로컬 테스트용 실제/가상 응답 데이터 (gitignore 처리, 커밋 금지)
src/
  App.tsx               최상위 상태(apiKey는 localStorage "gemini_api_key")
  components/           탭별 화면 (SnaDashboardTab, AiCounselingTab, LongitudinalTab,
                         DataManagementTab, GephiExportTab, GoogleScriptGeneratorTab 등)
  utils/
    fileParser.ts        업로드 엑셀(명렬표·설문응답) 파싱 — xlsx 사용
    snaEngine.ts          SNA 지표 계산
    anonymizer.ts          실명 ↔ 개인코드 매핑/익명화
    excelExporter.ts, gephiExporter.ts, htmlExporter.ts  결과 내보내기
  types/sna.ts           도메인 타입
```

## 해결된 이슈 (2026-08-03 첫 감사에서 발견, 2026-08-04 수정)

1. **서버가 클라이언트의 개인별 Gemini API 키를 완전히 무시하던 문제** — [server.ts](server.ts)
   `getGeminiClient()`를 요청마다 `extractApiKey()`로 얻은 사용자 키(헤더
   `x-gemini-api-key` 우선, 바디 `userApiKey` 폴백)로만 클라이언트를 생성하도록 변경.
   서버는 어떤 키도 캐싱/보관하지 않음(완전 BYOK). 키가 없으면 400 응답.
2. **`/api/ai/*` 엔드포인트에 CORS 제한이 없던 문제** — `server.ts`에 배포 도메인
   (`https://cra-project-two.vercel.app`)과 로컬 개발(`http://localhost:3000`)만
   허용하는 CORS 미들웨어 추가. 다른 origin에는 `Access-Control-Allow-Origin`을
   내려주지 않음.
3. **Gemini 응답/학생명을 이스케이프 없이 HTML에 삽입하던 XSS 위험** —
   [src/utils/escapeHtml.ts](src/utils/escapeHtml.ts) 유틸 추가 후
   `AiCounselingTab.tsx`/`LongitudinalTab.tsx`의 `handleDownloadPdf`(document.write
   경로)에 적용. `htmlExporter.ts`에서 내보내는 독립 HTML 리포트의 `<script>`
   내부에도 동일 로직의 `esc()` 헬퍼를 추가해 `innerHTML`/`.html()` 삽입부(툴팁,
   학생 상세 패널, 모둠 범례)에 전부 적용.
4. **`xlsx@0.18.5`의 고위험 취약점(Prototype Pollution, ReDoS)** — npm 레지스트리에
   패치가 없어 SheetJS 공식 CDN의 패치된 `xlsx@0.20.3`
   (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`)로 교체. `npm audit` 0건
   확인.

## 남은 낮은 우선순위 이슈

5. **번들 사이즈 경고** — `npm run build` 시 단일 JS 청크 약 1MB(gzip 301KB). 코드
   스플리팅(동적 import) 고려. 보안/기능 이슈 아니라 배포를 막을 필요는 없음.

## 검증 이력

- 2026-08-03: `npm install` / `npm run lint`(tsc, 에러 없음) / `npm run build`(성공,
  번들 사이즈 경고만) 로컬 확인. `.env.local` 미설정 상태라 AI 엔드포인트 실동작은
  미검증.
- 2026-08-04: 위 1~4번 수정 후 `npm run lint`(에러 없음) / `npm run build`(성공) /
  `npm audit`(0건) 재확인. `npm run dev`로 로컬 서버 기동 후 curl로 직접 검증:
  API Key 없이 `/api/ai/student-advice` 호출 시 400 응답, 허용 origin
  (`cra-project-two.vercel.app`)에서 OPTIONS 프리플라이트 시 CORS 헤더 정상 반환,
  비허용 origin(`evil.example.com`)에는 `Access-Control-Allow-Origin` 헤더 없음을
  확인. Gemini 키를 발급받아 실제 AI 응답까지 받는 end-to-end 테스트는 미실시(로컬에
  API 키 미보유).
