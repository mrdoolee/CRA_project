# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CRA (Classroom Relationship Analysis by 두리쌤) — a Korean-language classroom
social-network-analysis (SNA) web app. A teacher uploads Google Form survey
responses (Excel/CSV) recording student peer nominations; the app computes
SNA metrics (popularity, betweenness, isolation risk, community detection),
renders sociograms, and can generate Gemini-powered counseling advice.
Initially built in Google AI Studio, now hosted at `github.com/mrdoolee/CRA_project`
(**public repo**) and deployed to Vercel (`cra-project-two.vercel.app`).

## Commands

```bash
npm install
npm run dev      # tsx runs server.ts in Vite middleware mode, localhost:3000
npm run build    # vite build + esbuild bundles server.ts -> dist/server.cjs
npm run start    # run the built server (dist/server.cjs)
npm run lint      # tsc --noEmit (this is the only lint/typecheck step)
```

There is no test runner or test suite in this repo — `npm run lint` (a plain
`tsc --noEmit`) is the sole automated check. Verify behavioral changes by
running `npm run dev` and exercising the app in a browser, or with a throwaway
`tsx` script for a specific utility function.

The package manager is nominally Bun (`bun.lock` is present), but npm works
fine for install/build/typecheck.

AI features are fully BYOK (bring your own key) — the server reads no
`GEMINI_API_KEY` env var at all. To test AI endpoints locally, enter a
personal Gemini API key through the app's own UI (API Key button); no
`.env.local` setup is needed or used for this.

## Architecture

### Data flow

Upload -> `src/utils/fileParser.ts` (`parseSurveyFile`) produces a
`ParsedSurveyData` (`students`, `surveyResponses`, `questionHeaders`,
`selfAssessments`) -> stored as `App.tsx` state -> `analyzeSNA()` in
`src/utils/snaEngine.ts` computes SNA metrics for 5 domains at once
(`0_전체_통합` plus 4 sub-domains) -> `Record<domainKey, DomainAnalysisResult>`
is passed as props into each tab component.

Column classification in `fileParser.ts` matters and is non-obvious:
- Self-assessment grid columns are identified purely by their title starting
  with `[` (after trim) — these are split out into `SelfAssessmentResponse[]`
  and never mixed into the nomination/SNA pipeline.
- Nomination rank (1st/2nd/3rd choice) is NOT recoverable from cell position,
  because the generated Google Form puts each rank in its own column (one
  answer per cell). Rank is parsed from the *column title* instead
  (`extractRankFromColumnTitle` in `snaEngine.ts`), handling both
  `"...1"` and `"...(1순위)"` title formats.
- `autoDetectDomainQuestions` buckets the remaining nomination columns into
  the 5 domains by Korean keyword matching against the column title.

### AI requests (BYOK, no server-side key)

`server.ts` never reads or caches a Gemini API key. Every `/api/ai/*` request
must carry the caller's own key via the `x-gemini-api-key` header (or
`userApiKey` in the body); a fresh `GoogleGenAI` client is constructed per
request from that key. `/api/ai/*` is also CORS-restricted to the deployed
origin and `localhost:3000` only.

### Tab navigation

`App.tsx`'s `activeTab` union (`script | import | selfAssessment | dashboard
| counseling | history | gephi`) maps 1:1 to the sidebar's numbered menu
items (1–7). The numbers are baked into label strings in multiple places
(sidebar buttons, the header badge switch, a `title=` attribute) — reordering
or inserting a tab means updating all of them, not just the `activeTab`
union. Tabs are gated behind `hasData` (`responses.length > 0`).

### Anonymization

`src/utils/anonymizer.ts`'s `getAnonymizedName(name, studentsOrMetricsArray,
isAnonymous)` is the one place real-name <-> anonymized-code display is
decided; every tab component calls it the same way rather than rolling its
own logic.

### Export pipeline

The same `DomainAnalysisResult` is fed to three independent exporters —
`excelExporter.ts` (multi-sheet .xlsx), `gephiExporter.ts` (Gephi-compatible
Node/Edge CSV), `htmlExporter.ts` (a standalone HTML+D3 sociogram report).
`htmlExporter.ts`'s output is a big template-literal string of plain
JS/D3 code that runs outside React in the exported file — it carries its own
inline `esc()` HTML-escaping helper (duplicated from `escapeHtml.ts`)
because that code has no access to the React app's modules.

## Critical rules

- **Never commit `sample-data/`.** It holds real/test student names and
  survey responses and is gitignored; this repo is public, so anything
  committed there is permanently exposed. New local test fixtures go outside
  this folder.
- `xlsx` in `package.json` is installed from the SheetJS CDN
  (`https://cdn.sheetjs.com/xlsx-<version>/xlsx-<version>.tgz`), not the npm
  registry — the npm-published `xlsx` package has unpatched Prototype
  Pollution/ReDoS advisories. Upgrade via the CDN tarball URL, not `npm
  update`.

## Known limitations

- Community detection (`snaEngine.ts`) implements only Louvain's first phase
  (local node moves); it never contracts communities and recurses, so despite
  the "Weighted Louvain" comment it's closer to single-level greedy
  modularity optimization. Results are not guaranteed to match
  python-louvain/igraph exactly.
- The isolated/popular/bridge/peripheral classification thresholds (e.g.
  `betweenness >= 0.08`, `1.3x average`) are this app's own heuristics, not
  an established sociometric standard (e.g. Coie & Dodge).
- `downloadGephiFilesZip()` in `gephiExporter.ts` doesn't actually zip
  anything — it triggers individual sequential file downloads.
- The production JS bundle is a single ~1MB chunk (no code splitting).
