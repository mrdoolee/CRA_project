import { Student } from "../types/sna";

/**
 * Returns a display name for a student depending on anonymization mode.
 * Uses the student's assigned personal code (e.g. "code" or "코드_code") if available.
 */
export function getAnonymizedName(
  realName: string,
  allStudents: Student[] | string[] | any,
  isAnonymous: boolean
): string {
  if (!isAnonymous || !realName) return realName;

  // If realName is already an anonymized code like "코드 1701", "코드 1234", "학생 01"
  if (
    typeof realName === "string" &&
    (realName.startsWith("코드") || realName.startsWith("학생"))
  ) {
    return realName;
  }

  // 1. If allStudents is a Record/Map object like { "강민준": StudentMetrics, ... }
  if (
    allStudents &&
    typeof allStudents === "object" &&
    !Array.isArray(allStudents)
  ) {
    const studentObj = allStudents[realName];
    if (studentObj) {
      const codeVal =
        studentObj.studentCode ||
        studentObj.code ||
        (studentObj.metrics && studentObj.metrics.studentCode);
      if (codeVal) {
        return codeVal.toString().startsWith("코드")
          ? codeVal.toString()
          : `코드 ${codeVal}`;
      }
    }
  }

  // 2. If allStudents is an Array of objects (Student[], StudentMetrics[], GraphNode[], etc.)
  if (Array.isArray(allStudents) && allStudents.length > 0) {
    const match = allStudents.find((s: any) => {
      if (!s) return false;
      if (typeof s === "string") return s === realName;
      return (
        s.name === realName ||
        s.studentName === realName ||
        s.id === realName ||
        (s.metrics && s.metrics.studentName === realName)
      );
    });

    if (match && typeof match !== "string") {
      const codeVal =
        match.code ||
        match.studentCode ||
        (match.metrics && match.metrics.studentCode);
      if (codeVal) {
        return codeVal.toString().startsWith("코드")
          ? codeVal.toString()
          : `코드 ${codeVal}`;
      }
    }
  }

  // 3. Fallback: if allStudents is an array of string names or no code found
  const names = Array.isArray(allStudents)
    ? allStudents.map((s) =>
        typeof s === "string" ? s : s.name || s.studentName || s.id
      )
    : [];
  const uniqueNames = Array.from(new Set(names)).sort();
  const index = uniqueNames.indexOf(realName);

  if (index >= 0) {
    const num = String(index + 1).padStart(2, "0");
    return `코드 ${num}`;
  }

  return realName;
}

/**
 * Creates a complete mapping dictionary from real name -> display name
 */
export function createNameMapping(
  allStudents: Student[] | string[],
  isAnonymous: boolean
): Record<string, string> {
  const map: Record<string, string> = {};

  if (!isAnonymous) {
    allStudents.forEach((s) => {
      const name = typeof s === "string" ? s : s.name;
      map[name] = name;
    });
    return map;
  }

  // Anonymized mode
  if (
    Array.isArray(allStudents) &&
    allStudents.length > 0 &&
    typeof allStudents[0] !== "string"
  ) {
    (allStudents as Student[]).forEach((s) => {
      const codeLabel = s.code ? `코드 ${s.code}` : `학생_${s.id}`;
      map[s.name] = codeLabel;
      map[s.id] = codeLabel;
    });
    return map;
  }

  const names = allStudents.map((s) => (typeof s === "string" ? s : s.name));
  const uniqueNames = Array.from(new Set(names)).sort();

  uniqueNames.forEach((realName, idx) => {
    const num = String(idx + 1).padStart(2, "0");
    map[realName] = `학생 ${num}`;
  });

  return map;
}

/**
 * Downloads a CSV mapping file containing real student names and assigned personal codes
 */
export function downloadAnonymizationMappingCsv(
  allStudents: Student[] | string[],
  classNameTitle: string = "학급"
) {
  const isStudentObjArray =
    Array.isArray(allStudents) &&
    allStudents.length > 0 &&
    typeof allStudents[0] !== "string";

  const csvHeader = "실제 학생 이름,발급 개인코드(익명 식별자)\n";

  let csvBody = "";
  if (isStudentObjArray) {
    csvBody = (allStudents as Student[])
      .map((s) => {
        const codeVal = s.code ? `코드 ${s.code}` : `코드 ${s.id}`;
        return `"${s.name}","${codeVal}"`;
      })
      .join("\n");
  } else {
    const names = (allStudents as string[]).map((s) => s);
    const uniqueNames = Array.from(new Set(names)).sort();
    csvBody = uniqueNames
      .map((realName, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        return `"${realName}","학생 ${num}"`;
      })
      .join("\n");
  }

  const blob = new Blob(["\uFEFF" + csvHeader + csvBody], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "CRA_익명화_매핑명단.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


