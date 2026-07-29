import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Endpoint 1: Individual Student Relationship Advice
app.post("/api/ai/student-advice", async (req, res) => {
  try {
    const { studentName, metrics, choices, chosenBy, domainMetrics, classContext } = req.body;

    if (!studentName || !metrics) {
      return res.status(400).json({ error: "Missing student parameters" });
    }

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." });
    }

    const prompt = `
당신은 베테랑 중·고등학교 교우관계 상담 전문 교사입니다.
사회연결망 분석(SNA) 데이터에 기반하여 다음 학생에 대한 학급 내 교우관계 실태와 맞춤형 생활지도 조언을 작성해주세요.

[학생 정보]
- 학생 이름: ${studentName}
- 지목받은 횟수 (In-degree): ${metrics.inDegree}회
- 가중 인기 점수 (Weighted Score): ${metrics.weightedInScore}점 (학급 평균: ${classContext?.avgScore || '보통'})
- 내가 지목한 학생 수 (Out-degree): ${metrics.outDegree}명
- 중재자/가교역할 점수 (Betweenness Centrality): ${metrics.betweennessScore}
- 상호지목(맞지목) 관계 학생: ${metrics.mutualPartners?.length > 0 ? metrics.mutualPartners.join(', ') : '없음 (0명)'}
- 소집단(모둠) 분류: ${metrics.community}
- 고립/소외 위험 여부: ${metrics.isIsolated ? '⚠️ 고립 위험 (지목받은 횟수가 매우 적음)' : '정상 연결'}
- 네트워크 특성: ${metrics.isPopular ? '핵심 인기 학생, ' : ''}${metrics.isBridge ? '가교/중재자 학생, ' : ''}${metrics.isPeripheral ? '주변부 학생' : '중간 연결층'}

[영역별 지표]
${JSON.stringify(domainMetrics || {}, null, 2)}

[학생이 작성한 설문 지목 대상]
${JSON.stringify(choices || {}, null, 2)}

[이 학생을 지목한 친구들]
${JSON.stringify(chosenBy || [], null, 2)}

[요청 사항]
다음 항목을 구체적이고 따뜻하며 실행 가능한 전문 교사의 언어로 한국어로 작성해주세요.
1. **교우관계 종합 진단**: 지목 양상과 상호지목 상태를 분석한 핵심 특징 (2~3문장)
2. **강점 및 기회요인**: 학급 내에서의 긍정적 영향력이나 연결 가능성
3. **위험 요인 및 주의점**: 고립/외톨이 위험, 일방적 호감(짝사랑), 무리 간 격리 등 주의사항
4. **담임교사를 위한 맞춤형 지도 조언**:
   - 자리 배치 제안 (누구 옆자리가 도움될지)
   - 모둠 활동 및 수행평가 그룹 구성 제안
   - 교사 상담 시 자연스럽게 나눌 수 있는 대화 팁
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "당신은 따뜻하고 유능한 학급 생활지도 전문가 및 교우관계 분석가입니다. 분석에 기반한 명확하고 구체적인 조언을 제공합니다.",
        temperature: 0.7,
      },
    });

    res.json({ advice: response.text });
  } catch (error: any) {
    console.error("Error generating student advice:", error);
    res.status(500).json({ error: error.message || "Gemini API호출 중 오류가 발생했습니다." });
  }
});

// AI Endpoint 2: Classroom Network Diagnostics & Guidance Report
app.post("/api/ai/classroom-report", async (req, res) => {
  try {
    const { summary, isolatedStudents, popularStudents, bridgeStudents, communities, classSize } = req.body;

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." });
    }

    const prompt = `
당신은 학교 폭력 예방 및 학급 경영 전문 수석교사입니다.
우리 학급의 사회연결망 분석(SNA) 결과 데이터를 바탕으로 종합 학급 교우관계 분석 보고서 및 지도 전략을 작성해주세요.

[학급 전체 개요]
- 총 학생 수: ${classSize}명
- 연결 밀도 (Choice Density): ${summary?.density || '보통'}
- 상호지목 비율 (Reciprocity Rate): ${summary?.reciprocalRate || '보통'}%
- 소집단(모둠/파벌) 수: ${communities?.length || 0}개

[주요 학생 그룹]
- 고립/소외 위험 학생 (${isolatedStudents?.length || 0}명): ${isolatedStudents?.map((s: any) => s.name).join(', ') || '없음'}
- 핵심 인기 학생 (${popularStudents?.length || 0}명): ${popularStudents?.map((s: any) => s.name).join(', ') || '없음'}
- 가교/중재자 학생 (${bridgeStudents?.length || 0}명): ${bridgeStudents?.map((s: any) => s.name).join(', ') || '없음'}

[소집단 현황]
${JSON.stringify(communities || [], null, 2)}

[요청 사항]
1. **학급 교우관계 전체 종합 총평**: 전체적 응집력, 관계 건전성, 응집 분위기 진단
2. **갈등 예방 및 사각지대 분석**: 고립 학생 케어 방안, 파벌/소집단 간 폐쇄성 진단
3. **학급 운영 및 좌석/모둠 구성 전략**:
   - 중재자(Bridge) 학생을 활용한 학급 분위기 개선 전략
   - 소집단 간 교류 촉진을 위한 모둠 구성 권장안
4. **월별/분기별 맞춤형 실천 프로그램 아이디어**: 학급 응집력을 높이기 위한 학급 특색 활동 제안
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "당신은 한국의 중고등학교 학급 경영 및 교우관계 분석 수석교사입니다.",
        temperature: 0.7,
      },
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Error generating classroom report:", error);
    res.status(500).json({ error: error.message || "Gemini API호출 중 오류가 발생했습니다." });
  }
});

// AI Endpoint 3: Longitudinal Shift Analysis (1학기 vs 2학기 / 시기별 관계 변화 분석)
app.post("/api/ai/longitudinal-report", async (req, res) => {
  try {
    const { wave1Title, wave2Title, studentDeltas, riskChange, overallTrend } = req.body;

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." });
    }

    const prompt = `
당신은 교우관계 Longitudinal(누적 변화) 분석 전문가입니다.
동일 학급에서 실시된 2회의 관계망 설문 조사(${wave1Title} -> ${wave2Title}) 결과 변화를 분석하고 지도 방안을 제안해주세요.

[변화 요약]
- 이전 시기: ${wave1Title}
- 현재 시기: ${wave2Title}
- 고립 위험 학생 변화: ${JSON.stringify(riskChange || {})}
- 전체 학급 응집도 및 연결 변화: ${JSON.stringify(overallTrend || {})}

[주요 학생별 관계망 변화 주요 사례]
${JSON.stringify(studentDeltas || [], null, 2)}

[요청 사항]
1. **학급 교우관계 변화 종합 평가**: 관계망이 긍정적으로 발전했는지, 분열되었는지에 대한 거시적 분석
2. **관계 호전 및 악화 학생 집중 분석**:
   - 친해진 계기를 극대화할 수 있는 학생그룹
   - 지목 감소/관계 소원해짐으로 집중 관찰이 필요한 학생
3. **향후 학급 운영 가이드**: 다음 시기까지 담임교사가 주력해야 할 생활지도 핵심 과제
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "당신은 시기별 학급 교우관계 변화 및 Longitudinal 분석 전문 교육 전문가입니다.",
        temperature: 0.7,
      },
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Error generating longitudinal report:", error);
    res.status(500).json({ error: error.message || "Gemini API호출 중 오류가 발생했습니다." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
