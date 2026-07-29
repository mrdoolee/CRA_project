import { Student } from "../types/sna";

/**
 * Returns a display name for a student depending on anonymization mode.
 * Uses the student's assigned personal code (e.g. "code" or "코드_code") if available.
 */
export function getAnonymizedName(
  realName: string,
  allStudents: Student[] | string[],
  isAnonymous: boolean
): string {
  if (!isAnonymous || !realName) return realName;

  if (Array.isArray(allStudents) && allStudents.length > 0) {
    if (typeof allStudents[0] !== "string") {
      const studentObj = (allStudents as Student[]).find(
        (s) => s.name === realName || s.id === realName
      );
      if (studentObj && studentObj.code) {
        return `코드 ${studentObj.code}`;
      }
    }
  }

  // Extract list of names as fallback
  const names = allStudents.map((s) => (typeof s === "string" ? s : s.name));
  const uniqueNames = Array.from(new Set(names)).sort();
  const index = uniqueNames.indexOf(realName);

  if (index >= 0) {
    const num = String(index + 1).padStart(2, "0");
    return `학생 ${num}`;
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
  const todayStr = new Date().toISOString().slice(0, 10);
  link.download = `CRA_${classNameTitle}_익명화_매핑명단_${todayStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


