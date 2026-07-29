import { DomainAnalysisResult } from "../types/sna";

/**
 * Downloads Gephi Edge List CSV file
 */
export function generateGephiEdgesCSV(domainResult: DomainAnalysisResult): string {
  const rows: string[] = ["Source,Target,Type,Relation,Weight"];

  domainResult.edges.forEach((e) => {
    const source = escapeCSV(e.source);
    const target = escapeCSV(e.target);
    const relation = escapeCSV(domainResult.domainKey);
    const weight = e.weight;

    rows.push(`${source},${target},Directed,${relation},${weight}`);
  });

  return rows.join("\n");
}

/**
 * Downloads Gephi Node List CSV file
 */
export function generateGephiNodesCSV(domainResult: DomainAnalysisResult): string {
  const rows: string[] = [
    "Id,Label,StudentCode,InDegree,WeightedScore,BetweennessCentrality,Subgroup,IsIsolated,IsPopular,IsBridge",
  ];

  domainResult.nodes.forEach((node) => {
    const m = node.metrics;
    const id = escapeCSV(node.id);
    const label = escapeCSV(node.label);
    const code = escapeCSV(m.studentCode || "");
    const inDeg = m.inDegree;
    const wScore = m.weightedInScore;
    const betw = m.betweennessScore;
    const comm = escapeCSV(m.community);
    const iso = m.isIsolated ? "YES" : "NO";
    const pop = m.isPopular ? "YES" : "NO";
    const brg = m.isBridge ? "YES" : "NO";

    rows.push(`${id},${label},${code},${inDeg},${wScore},${betw},${comm},${iso},${pop},${brg}`);
  });

  return rows.join("\n");
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function downloadFile(content: string, fileName: string, mimeType: string = "text/csv;charset=utf-8;") {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads all Gephi CSV files for each domain
 */
export function downloadGephiFilesZip(
  domainResults: Record<string, DomainAnalysisResult>,
  prefix: string = "CRA"
) {
  Object.entries(domainResults).forEach(([key, result]) => {
    const nodesCsv = generateGephiNodesCSV(result);
    downloadFile(nodesCsv, `${prefix}_Gephi_Nodes_${key}.csv`);

    const edgesCsv = generateGephiEdgesCSV(result);
    downloadFile(edgesCsv, `${prefix}_Gephi_Edges_${key}.csv`);
  });
}
