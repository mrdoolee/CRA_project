import * as XLSX from "xlsx";
import { Student, SurveyResponse, SelfAssessmentResponse } from "../types/sna";

export interface ParsedSurveyData {
  students: Student[];
  surveyResponses: SurveyResponse[];
  questionHeaders: string[];
  selfAssessments: SelfAssessmentResponse[];
}

/**
 * Parses uploaded roster file (명렬표)
 */
export async function parseRosterFile(file: File): Promise<Student[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("명렬표 파일에 데이터가 없습니다.");
  }

  // Clean all row keys (remove BOM \uFEFF and trim leading/trailing spaces)
  const cleanRows = rawRows.map((row) => {
    const cleanRow: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.replace(/^\uFEFF/, "").trim();
      cleanRow[cleanKey] = val;
    }
    return cleanRow;
  });

  const firstRow = cleanRows[0];
  const keys = Object.keys(firstRow);

  // Find name col and code col distinctly
  let nameCol = keys.find((k) => k.includes("이름") || k.includes("성명"));
  let codeCol = keys.find(
    (k) => (k.includes("코드") || k.includes("번호") || k.includes("학번")) && k !== nameCol
  );

  if (!nameCol) nameCol = keys[0];
  if (!codeCol) codeCol = keys.find((k) => k !== nameCol) || keys[0];

  const students: Student[] = [];

  cleanRows.forEach((row, idx) => {
    let code = String(row[codeCol] || "").trim().replace(/\.0$/, "");
    let name = String(row[nameCol] || "").trim();

    if (name) {
      students.push({
        id: `uploaded_s_${idx}`,
        code: code || String(idx + 1),
        name,
        number: parseInt(code, 10) || idx + 1,
      });
    }
  });

  return students;
}

/**
 * Parses Google Form survey responses (설문 응답 파일)
 */
export async function parseSurveyFile(file: File, roster?: Student[]): Promise<ParsedSurveyData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("설문지 파일에 데이터가 없습니다.");
  }

  // Clean all row keys (remove BOM \uFEFF and trim leading/trailing spaces)
  const cleanRows = rawRows.map((row) => {
    const cleanRow: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.replace(/^\uFEFF/, "").trim();
      cleanRow[cleanKey] = val;
    }
    return cleanRow;
  });

  // Build code to name map from roster if provided
  const codeToNameMap = new Map<string, string>();
  if (roster) {
    roster.forEach((s) => codeToNameMap.set(s.code, s.name));
  }

  // Detect code column
  const sampleRow = cleanRows[0];
  const allHeaders = Object.keys(sampleRow);

  const targetCodeCol =
    allHeaders.find((h) => h.includes("개인 코드") || h.includes("코드") || h.includes("학번") || h.includes("이름")) ||
    allHeaders[1] ||
    allHeaders[0];

  // Self-assessment grid columns are titled "[문항 원문]" (a leading space is
  // common since Google Forms grid items don't prefix the item title).
  // These are a separate dataset from the nomination questions below.
  const selfAssessmentCols = allHeaders.filter((h) => h.trim().startsWith("["));

  // Detect choice columns (columns that ask for student choices)
  const questionHeaders = allHeaders.filter(
    (h) =>
      h !== targetCodeCol &&
      !h.toLowerCase().includes("타임스탐프") &&
      !h.toLowerCase().includes("timestamp") &&
      !selfAssessmentCols.includes(h)
  );

  const parsedResponses: SurveyResponse[] = [];
  const selfAssessments: SelfAssessmentResponse[] = [];
  const extractedStudentsMap = new Map<string, Student>();

  cleanRows.forEach((row, idx) => {
    let rawCode = String(row[targetCodeCol] || "").trim().replace(/\.0$/, "");
    let studentName = codeToNameMap.get(rawCode) || rawCode;

    if (!studentName) return;

    if (!extractedStudentsMap.has(studentName)) {
      extractedStudentsMap.set(studentName, {
        id: `extracted_s_${idx}`,
        code: rawCode,
        name: studentName,
        number: parseInt(rawCode, 10) || idx + 1,
      });
    }

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
  });

  const finalStudents = roster && roster.length > 0 ? roster : Array.from(extractedStudentsMap.values());

  return {
    students: finalStudents,
    surveyResponses: parsedResponses,
    questionHeaders,
    selfAssessments,
  };
}
