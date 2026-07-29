import * as XLSX from "xlsx";
import { DomainAnalysisResult, Student, SurveyResponse } from "../types/sna";

/**
 * Generates and downloads multi-sheet Excel file matching Python script output
 */
export function exportExcelReport(
  domainResults: Record<string, DomainAnalysisResult>,
  fileName: string = "CRA_Sociogram_통합보고서.xlsx"
) {
  const wb = XLSX.utils.book_new();

  const overallResult = domainResults["0_전체_통합"];
  if (!overallResult) return;

  const studentNames = overallResult.nodes.map((n) => n.id);

  // 1. Comprehensive Summary Sheet (종합_SNA_데이터)
  const summaryRows = studentNames.map((name) => {
    const row: Record<string, any> = { 이름: name };

    Object.entries(domainResults).forEach(([key, result]) => {
      const m = result.metrics[name];
      if (m) {
        row[`[${key}]_지목횟수`] = m.inDegree;
        row[`[${key}]_가중점수`] = m.weightedInScore;
        row[`[${key}]_중재자점수`] = m.betweennessScore;
        row[`[${key}]_소집단`] = m.community;
      }
    });

    return row;
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "종합_SNA_데이터");

  // 2. Individual Domain Sheets (sorted by weighted popularity score descending)
  Object.entries(domainResults).forEach(([domainKey, result]) => {
    const domainRows = studentNames.map((name) => {
      const m = result.metrics[name];
      return {
        이름: name,
        개인코드: m?.studentCode || "",
        지목받은횟수: m?.inDegree || 0,
        가중인기점수: m?.weightedInScore || 0,
        "중재자점수(가교역할)": m?.betweennessScore || 0,
        "소집단(모둠)분류": m?.community || "-",
        맞지목인원수: m?.mutualCount || 0,
        "맞지목친구들": m?.mutualPartners?.join(", ") || "없음",
        "고립위험여부": m?.isIsolated ? "⚠️ 위험" : "정상",
      };
    });

    domainRows.sort((a, b) => b.가중인기점수 - a.가중인기점수 || b.지목받은횟수 - a.지목받은횟수);

    const sheetName = domainKey.slice(0, 31);
    const wsDomain = XLSX.utils.json_to_sheet(domainRows);
    XLSX.utils.book_append_sheet(wb, wsDomain, sheetName);
  });

  // 3. Isolated & Conflict Risk Analysis Sheet
  const riskRows = overallResult.nodes
    .filter((node) => node.metrics.isIsolated || node.metrics.isPeripheral || node.metrics.mutualCount === 0)
    .map((node) => {
      const m = node.metrics;
      let riskType = "보통";
      if (m.isIsolated) riskType = "⚠️ 고립/소외 초고위험 (지목 0~1회)";
      else if (m.mutualCount === 0) riskType = "⚡ 맞지목 관계 부재 (단방향 지목)";
      else if (m.isPeripheral) riskType = "🔹 주변부 학생 (학급 중심부 외곽)";

      return {
        이름: m.studentName,
        학생코드: m.studentCode,
        진단구분: riskType,
        지목받은횟수: m.inDegree,
        가중인기점수: m.weightedInScore,
        내가목한인원: m.outDegree,
        "내가_지목했으나_나를_안지목한_친구": m.unreciprocatedOut.join(", ") || "없음",
        "나를_지목했으나_내가_안지목한_친구": m.unreciprocatedIn.join(", ") || "없음",
        "권장_지도방향": m.isIsolated
          ? "모둠 과제 시 따뜻한 성향의 학생과 배치 및 1:1 라포 형성"
          : "단방향 관심 학생과의 자연스러운 공동 활동 연결",
      };
    });

  const wsRisk = XLSX.utils.json_to_sheet(riskRows);
  XLSX.utils.book_append_sheet(wb, wsRisk, "고립_갈등위험_학생분석");

  XLSX.writeFile(wb, fileName);
}

export function exportSnaToExcel(
  _students: Student[],
  _responses: SurveyResponse[],
  domainResults: Record<string, DomainAnalysisResult>,
  classNameTitle: string = "학급교우관계"
) {
  exportExcelReport(domainResults, `${classNameTitle}_SNA_통합보고서.xlsx`);
}
