import {
  Student,
  SurveyResponse,
  WeightScheme,
  DomainAnalysisResult,
  StudentMetrics,
  GraphNode,
  GraphEdge,
  CommunityInfo,
  LongitudinalStudentDelta,
  LongitudinalComparison,
} from "../types/sna";

export const DEFAULT_WEIGHT_SCHEME: WeightScheme = [2.0, 1.5, 1.0];

/**
 * Extracts the nomination rank (1/2/3) from a survey question column title.
 * This app's generated Google Form splits each rank into its own column, so
 * the rank lives in the column title text ("... 1", "... (1순위)"), not in
 * the response cell — a single response cell only ever holds one name.
 */
function extractRankFromColumnTitle(title: string): number | null {
  const match = title.match(/([1-3])\s*(?:순위)?\)?\s*$/);
  return match ? parseInt(match[1], 10) : null;
}

export const SUBGROUP_COLORS = [
  "#4F46E5", // Indigo
  "#059669", // Emerald
  "#D97706", // Amber
  "#DC2626", // Red
  "#9333EA", // Purple
  "#0891B2", // Cyan
  "#DB2777", // Pink
  "#65A30D", // Lime
  "#EA580C", // Orange
  "#2563EB", // Blue
];

/**
 * Calculates SNA analysis across all 5 domains (0_전체_통합 + 4 specific domains)
 */
export function analyzeSNA(
  students: Student[],
  responses: SurveyResponse[],
  weights: WeightScheme = DEFAULT_WEIGHT_SCHEME,
  domainQuestionMap?: Record<string, string[]>
): Record<string, DomainAnalysisResult> {
  const studentNames = students.map((s) => s.name.trim()).filter(Boolean);
  const studentMap = new Map<string, Student>();
  students.forEach((s) => studentMap.set(s.name.trim(), s));

  // Determine question mapping
  const questionMap = domainQuestionMap || autoDetectDomainQuestions(responses);

  // Prepare result dict
  const results: Record<string, DomainAnalysisResult> = {};

  // Analyze each domain
  const domainKeys = [
    "0_전체_통합",
    "1_정서적_친밀감",
    "2_기능적_협력",
    "3_사회적_영향력",
    "4_교우관계_확장",
  ];

  for (const domainKey of domainKeys) {
    const questionCols = questionMap[domainKey] || [];
    results[domainKey] = calculateSingleDomainSNA(
      domainKey,
      getDomainLabel(domainKey),
      studentNames,
      studentMap,
      responses,
      questionCols,
      weights
    );
  }

  return results;
}

/**
 * Helper to auto-detect domain columns from survey response keys
 */
export function autoDetectDomainQuestions(responses: SurveyResponse[]): Record<string, string[]> {
  if (!responses || responses.length === 0) {
    return {
      "0_전체_통합": [],
      "1_정서적_친밀감": [],
      "2_기능적_협력": [],
      "3_사회적_영향력": [],
      "4_교우관계_확장": [],
    };
  }

  // Get all question keys from choices
  const allQuestionKeys = new Set<string>();
  responses.forEach((r) => {
    Object.keys(r.choices || {}).forEach((k) => allQuestionKeys.add(k));
  });

  const questionList = Array.from(allQuestionKeys);

  const intimacyCols = questionList.filter(
    (col) => col.includes("점심시간") || col.includes("학교를 마치고") || col.includes("친밀") || col.includes("친한")
  );
  const coopCols = questionList.filter(
    (col) => col.includes("숙제") || col.includes("모둠") || col.includes("과제") || col.includes("협력")
  );
  const influenceCols = questionList.filter(
    (col) => col.includes("분위기") || col.includes("리더십") || col.includes("이끄는") || col.includes("영향")
  );
  const expansionCols = questionList.filter(
    (col) => col.includes("더 친해지고") || col.includes("확장") || col.includes("다가가고")
  );

  const allCols = questionList.length > 0 ? questionList : [...intimacyCols, ...coopCols, ...influenceCols, ...expansionCols];

  return {
    "0_전체_통합": allCols,
    "1_정서적_친밀감": intimacyCols,
    "2_기능적_협력": coopCols,
    "3_사회적_영향력": influenceCols,
    "4_교우관계_확장": expansionCols,
  };
}

function getDomainLabel(domainKey: string): string {
  switch (domainKey) {
    case "0_전체_통합":
      return "전체 통합 네트워크";
    case "1_정서적_친밀감":
      return "정서적 친밀감 (식사/하교)";
    case "2_기능적_협력":
      return "기능적 협력 (과제/모둠)";
    case "3_사회적_영향력":
      return "사회적 영향력 (리더십)";
    case "4_교우관계_확장":
      return "교우관계 확장 (친해지고 싶은)";
    default:
      return domainKey;
  }
}

/**
 * Calculates metrics for a single domain
 */
function calculateSingleDomainSNA(
  domainKey: string,
  domainTitle: string,
  allStudentNames: string[],
  studentMap: Map<string, Student>,
  responses: SurveyResponse[],
  questionCols: string[],
  weights: WeightScheme
): DomainAnalysisResult {
  // Edge weights map: `${source}->${target}` => weight
  const edgeWeightMap = new Map<string, { weight: number; rank: number }>();
  // Outgoing choice map: source => list of targets
  const outgoingMap = new Map<string, Set<string>>();
  // Incoming choice map: target => list of sources
  const incomingMap = new Map<string, Set<string>>();

  allStudentNames.forEach((name) => {
    outgoingMap.set(name, new Set());
    incomingMap.set(name, new Set());
  });

  // Accumulate edges
  responses.forEach((resp) => {
    const source = resp.studentName ? resp.studentName.trim() : "";
    if (!source || !allStudentNames.includes(source)) return;

    questionCols.forEach((colKey) => {
      const targets = resp.choices[colKey];
      if (!Array.isArray(targets)) return;

      // Prefer the rank encoded in the column title (this app's own survey
      // format: one column per rank). Fall back to in-cell position for
      // columns that instead pack multiple ranked choices into one cell.
      const columnRank = extractRankFromColumnTitle(colKey);

      targets.forEach((targetRaw, idx) => {
        const target = (targetRaw || "").toString().trim();
        // Self-loop check & validity check
        if (!target || target === source || !allStudentNames.includes(target)) return;
        if (["없음", "nan", "None", "null"].includes(target.toLowerCase())) return;

        // Rank weight logic (1st=w[0], 2nd=w[1], 3rd=w[2])
        const rankNumber = columnRank !== null ? columnRank : idx + 1;
        const rankIndex = Math.min(rankNumber, weights.length) - 1;
        const weight = weights[rankIndex] !== undefined ? weights[rankIndex] : 1.0;

        const key = `${source}->${target}`;
        const existing = edgeWeightMap.get(key);
        if (existing) {
          existing.weight += weight;
        } else {
          edgeWeightMap.set(key, { weight, rank: rankIndex + 1 });
        }

        outgoingMap.get(source)?.add(target);
        incomingMap.get(target)?.add(source);
      });
    });
  });

  // Calculate In-Degree and Weighted In-Degree
  const inDegreeMap = new Map<string, number>();
  const weightedInMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();
  const weightedOutMap = new Map<string, number>();

  allStudentNames.forEach((s) => {
    inDegreeMap.set(s, 0);
    weightedInMap.set(s, 0);
    outDegreeMap.set(s, 0);
    weightedOutMap.set(s, 0);
  });

  edgeWeightMap.forEach(({ weight }, key) => {
    const [source, target] = key.split("->");
    inDegreeMap.set(target, (inDegreeMap.get(target) || 0) + 1);
    weightedInMap.set(target, (weightedInMap.get(target) || 0) + weight);

    outDegreeMap.set(source, (outDegreeMap.get(source) || 0) + 1);
    weightedOutMap.set(source, (weightedOutMap.get(source) || 0) + weight);
  });

  // Calculate Mutual Choices (맞지목)
  const mutualPartnersMap = new Map<string, string[]>();
  allStudentNames.forEach((s) => {
    const outSet = outgoingMap.get(s) || new Set();
    const mutuals: string[] = [];
    outSet.forEach((target) => {
      const targetOutSet = outgoingMap.get(target);
      if (targetOutSet && targetOutSet.has(s)) {
        mutuals.push(target);
      }
    });
    mutualPartnersMap.set(s, mutuals);
  });

  // Calculate Betweenness Centrality (Brandes algorithm adaptation)
  const betweennessMap = calculateBetweennessCentrality(allStudentNames, edgeWeightMap);

  // Subgroup / Community detection (Louvain modularity clustering)
  const { communityMap, communityList } = detectCommunities(allStudentNames, edgeWeightMap);

  // Stats calculation
  const totalStudents = allStudentNames.length;
  const weightedScores = Array.from(weightedInMap.values());
  const avgWeightedScore = weightedScores.length > 0 ? weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length : 0;
  const inDegrees = Array.from(inDegreeMap.values());
  const avgInDegree = inDegrees.length > 0 ? inDegrees.reduce((a, b) => a + b, 0) / inDegrees.length : 0;

  // Rank sorting for percentile identification
  const sortedByScore = [...allStudentNames].sort((a, b) => (weightedInMap.get(b) || 0) - (weightedInMap.get(a) || 0));

  const metrics: Record<string, StudentMetrics> = {};

  allStudentNames.forEach((name) => {
    const studentInfo = studentMap.get(name);
    const inDeg = inDegreeMap.get(name) || 0;
    const wScore = Math.round((weightedInMap.get(name) || 0) * 10) / 10;
    const outDeg = outDegreeMap.get(name) || 0;
    const wOut = Math.round((weightedOutMap.get(name) || 0) * 10) / 10;
    const betw = Math.round((betweennessMap.get(name) || 0) * 1000) / 1000;
    const comm = communityMap.get(name) || "모둠_1";
    const commId = parseInt(comm.split("_")[1] || "1", 10);
    const mutuals = mutualPartnersMap.get(name) || [];

    const outSet = outgoingMap.get(name) || new Set();
    const inSet = incomingMap.get(name) || new Set();

    const unreciprocatedOut = Array.from(outSet).filter((t) => !inSet.has(t));
    const unreciprocatedIn = Array.from(inSet).filter((s) => !outSet.has(s));

    const rank = sortedByScore.indexOf(name) + 1;

    // Categorization rules
    const isPopular = rank <= Math.max(3, Math.ceil(totalStudents * 0.2)) && wScore >= avgWeightedScore * 1.3;
    const isBridge = betw >= 0.08 && !isPopular;
    const isIsolated = inDeg <= 1 || wScore <= 1.0;
    const isPeripheral = inDeg < avgInDegree / 2 && !isIsolated;

    metrics[name] = {
      studentName: name,
      studentCode: studentInfo?.code || "",
      inDegree: inDeg,
      weightedInScore: wScore,
      outDegree: outDeg,
      weightedOutScore: wOut,
      betweennessScore: betw,
      community: comm,
      communityId: commId,
      mutualCount: mutuals.length,
      mutualPartners: mutuals,
      unreciprocatedOut,
      unreciprocatedIn,
      isIsolated,
      isPeripheral,
      isBridge,
      isPopular,
      rank,
    };
  });

  // Build Graph Nodes & Edges
  const nodes: GraphNode[] = allStudentNames.map((name) => {
    const m = metrics[name];
    const sizeMultiplier = domainKey === "0_전체_통합" ? 0.6 : 1.2;
    const size = Math.max(12, Math.min(48, 12 + m.weightedInScore * sizeMultiplier));
    const color = SUBGROUP_COLORS[(m.communityId - 1) % SUBGROUP_COLORS.length];

    return {
      id: name,
      label: name,
      size,
      color,
      group: m.community,
      metrics: m,
    };
  });

  const edges: GraphEdge[] = [];
  edgeWeightMap.forEach(({ weight, rank }, key) => {
    const [source, target] = key.split("->");
    const isMutual = (outgoingMap.get(target)?.has(source)) || false;

    edges.push({
      id: key,
      source,
      target,
      domain: domainKey,
      weight,
      rank,
      isMutual,
    });
  });

  // Calculate total possible edges (excluding self)
  const maxPossibleEdges = totalStudents * (totalStudents - 1);
  const density = maxPossibleEdges > 0 ? Math.round((edges.length / maxPossibleEdges) * 1000) / 1000 : 0;

  // Reciprocity Rate = (Number of mutual pairs * 2) / total directed edges
  let totalMutualPairs = 0;
  for (let i = 0; i < allStudentNames.length; i++) {
    for (let j = i + 1; j < allStudentNames.length; j++) {
      const u = allStudentNames[i];
      const v = allStudentNames[j];
      if (outgoingMap.get(u)?.has(v) && outgoingMap.get(v)?.has(u)) {
        totalMutualPairs++;
      }
    }
  }

  const reciprocityRate = edges.length > 0 ? Math.round(((totalMutualPairs * 2) / edges.length) * 100 * 10) / 10 : 0;

  return {
    domainKey,
    domainTitle,
    nodes,
    edges,
    metrics,
    communities: communityList,
    totalEdges: edges.length,
    density,
    reciprocityRate,
    avgInDegree: Math.round(avgInDegree * 10) / 10,
    avgWeightedScore: Math.round(avgWeightedScore * 10) / 10,
  };
}

/**
 * Brandes Betweenness Centrality algorithm implementation for directed graphs
 */
function calculateBetweennessCentrality(
  nodes: string[],
  edgeWeightMap: Map<string, { weight: number }>
): Map<string, number> {
  const cb = new Map<string, number>();
  nodes.forEach((n) => cb.set(n, 0));

  // Build adjacency list (directed edges without duplicate target pushes)
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n, []));
  edgeWeightMap.forEach((_, key) => {
    const [u, v] = key.split("->");
    if (!adj.get(u)?.includes(v)) {
      adj.get(u)?.push(v);
    }
  });

  // Brandes algorithm
  nodes.forEach((s) => {
    const S: string[] = [];
    const P = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const d = new Map<string, number>();

    nodes.forEach((w) => {
      P.set(w, []);
      sigma.set(w, 0);
      d.set(w, -1);
    });

    sigma.set(s, 1);
    d.set(s, 0);

    const Q: string[] = [s];

    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);

      const neighbors = adj.get(v) || [];
      neighbors.forEach((w) => {
        // Path discovery vs Path counting
        if (d.get(w)! < 0) {
          Q.push(w);
          d.set(w, d.get(v)! + 1);
          sigma.set(w, sigma.get(v)!);
          P.get(w)!.push(v);
        } else if (d.get(w)! === d.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      });
    }

    const delta = new Map<string, number>();
    nodes.forEach((w) => delta.set(w, 0));

    while (S.length > 0) {
      const w = S.pop()!;
      const predecessors = P.get(w) || [];
      predecessors.forEach((v) => {
        const coeff = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + coeff);
      });
      if (w !== s) {
        cb.set(w, cb.get(w)! + delta.get(w)!);
      }
    }
  });

  // Normalize by (N-1)(N-2) for directed graph
  const N = nodes.length;
  const normFactor = N > 2 ? (N - 1) * (N - 2) : 1;
  const normalizedCb = new Map<string, number>();
  cb.forEach((val, name) => {
    const normVal = val / normFactor;
    normalizedCb.set(name, Math.round(normVal * 1000) / 1000);
  });

  return normalizedCb;
}

/**
 * Community / Subgroup Detection using Weighted Louvain / Greedy Modularity Optimization
 * (Removes artificial size splitting and detects natural subgroup boundaries based on link density)
 */
function detectCommunities(
  nodes: string[],
  edgeWeightMap: Map<string, { weight: number }>
): { communityMap: Map<string, string>; communityList: CommunityInfo[] } {
  // Build undirected weighted adjacency matrix
  const weights = new Map<string, number>();
  const nodeDegrees = new Map<string, number>();
  nodes.forEach((n) => nodeDegrees.set(n, 0));

  let totalM = 0;
  edgeWeightMap.forEach(({ weight }, key) => {
    const [u, v] = key.split("->");
    if (u === v) return;
    const undirKey = u < v ? `${u}<->${v}` : `${v}<->${u}`;
    const curr = weights.get(undirKey) || 0;
    weights.set(undirKey, curr + weight);
  });

  weights.forEach((w, key) => {
    const [u, v] = key.split("<->");
    nodeDegrees.set(u, (nodeDegrees.get(u) || 0) + w);
    nodeDegrees.set(v, (nodeDegrees.get(v) || 0) + w);
    totalM += w;
  });

  // Adjacency map for quick neighbor weight lookup
  const adj = new Map<string, Map<string, number>>();
  nodes.forEach((n) => adj.set(n, new Map()));
  weights.forEach((w, key) => {
    const [u, v] = key.split("<->");
    adj.get(u)?.set(v, w);
    adj.get(v)?.set(u, w);
  });

  // Initial assignment: each node in its own community
  const communityAssignment = new Map<string, number>();
  nodes.forEach((n, idx) => communityAssignment.set(n, idx));

  if (totalM > 0) {
    let improvement = true;
    let pass = 0;

    while (improvement && pass < 50) {
      improvement = false;
      pass++;

      const sortedNodes = [...nodes].sort();

      for (const node of sortedNodes) {
        const currentComm = communityAssignment.get(node)!;
        const ki = nodeDegrees.get(node) || 0;
        if (ki === 0) continue;

        const neighborComms = new Set<number>();
        const nodeNeighbors = adj.get(node) || new Map();
        nodeNeighbors.forEach((_, nbr) => {
          neighborComms.add(communityAssignment.get(nbr)!);
        });
        neighborComms.add(currentComm);

        let bestComm = currentComm;
        let maxDeltaQ = 0;

        neighborComms.forEach((candidateComm) => {
          let kiIn = 0;
          let sigmaTot = 0;

          nodes.forEach((otherNode) => {
            if (communityAssignment.get(otherNode) === candidateComm) {
              sigmaTot += nodeDegrees.get(otherNode) || 0;
              if (otherNode !== node && nodeNeighbors.has(otherNode)) {
                kiIn += nodeNeighbors.get(otherNode)!;
              }
            }
          });

          if (candidateComm === currentComm) {
            sigmaTot -= ki;
          }

          const deltaQ = kiIn / totalM - (sigmaTot * ki) / (2 * totalM * totalM);

          if (deltaQ > maxDeltaQ + 1e-8) {
            maxDeltaQ = deltaQ;
            bestComm = candidateComm;
          }
        });

        if (bestComm !== currentComm) {
          communityAssignment.set(node, bestComm);
          improvement = true;
        }
      }
    }
  }

  // Group nodes by assigned community
  const commGroups = new Map<number, string[]>();
  nodes.forEach((node) => {
    const cId = communityAssignment.get(node)!;
    if (!commGroups.has(cId)) commGroups.set(cId, []);
    commGroups.get(cId)!.push(node);
  });

  const finalClusters = Array.from(commGroups.values());
  // Sort clusters by size descending, then by first member name
  finalClusters.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

  const communityMap = new Map<string, string>();
  const communityList: CommunityInfo[] = [];

  finalClusters.forEach((clusterMembers, idx) => {
    const id = `모둠_${idx + 1}`;
    const name = `모둠 ${idx + 1}`;
    const color = SUBGROUP_COLORS[idx % SUBGROUP_COLORS.length];

    clusterMembers.forEach((m) => communityMap.set(m, id));

    communityList.push({
      id,
      name,
      color,
      members: clusterMembers,
    });
  });

  return { communityMap, communityList };
}

/**
 * Calculates longitudinal shift between Wave 1 and Wave 2
 */
export function calculateLongitudinalShift(
  wave1Result: DomainAnalysisResult,
  wave2Result: DomainAnalysisResult,
  wave1Title: string = "1차 조사",
  wave2Title: string = "2차 조사"
): LongitudinalComparison {
  const w1Metrics = wave1Result.metrics;
  const w2Metrics = wave2Result.metrics;

  const allNames = Array.from(new Set([...Object.keys(w1Metrics), ...Object.keys(w2Metrics)]));

  const studentDeltas: LongitudinalStudentDelta[] = [];
  let newIsolatedCount = 0;
  let freedIsolatedCount = 0;
  let totalScoreChange = 0;

  allNames.forEach((name) => {
    const m1 = w1Metrics[name];
    const m2 = w2Metrics[name];

    const w1Score = m1 ? m1.weightedInScore : 0;
    const w2Score = m2 ? m2.weightedInScore : 0;
    const scoreDelta = Math.round((w2Score - w1Score) * 10) / 10;
    totalScoreChange += scoreDelta;

    const w1In = m1 ? m1.inDegree : 0;
    const w2In = m2 ? m2.inDegree : 0;
    const inDegreeDelta = w2In - w1In;

    const w1Iso = m1 ? m1.isIsolated : false;
    const w2Iso = m2 ? m2.isIsolated : false;

    let statusChange: LongitudinalStudentDelta["statusChange"] = "stable";
    if (!w1Iso && w2Iso) {
      statusChange = "isolated_new";
      newIsolatedCount++;
    } else if (w1Iso && !w2Iso) {
      statusChange = "isolated_freed";
      freedIsolatedCount++;
    } else if (scoreDelta >= 2.0) {
      statusChange = "improving";
    } else if (scoreDelta <= -2.0) {
      statusChange = "declining";
    }

    // Edge changes
    const w1Partners = m1 ? m1.mutualPartners : [];
    const w2Partners = m2 ? m2.mutualPartners : [];

    const newFriends = w2Partners.filter((p) => !w1Partners.includes(p));
    const lostFriends = w1Partners.filter((p) => !w2Partners.includes(p));

    studentDeltas.push({
      studentName: name,
      studentCode: m2?.studentCode || m1?.studentCode || "",
      wave1Score: w1Score,
      wave2Score: w2Score,
      scoreDelta,
      wave1InDegree: w1In,
      wave2InDegree: w2In,
      inDegreeDelta,
      wave1Community: m1?.community || "-",
      wave2Community: m2?.community || "-",
      wave1Isolated: w1Iso,
      wave2Isolated: w2Iso,
      statusChange,
      newFriends,
      lostFriends,
      mutualNew: newFriends,
    });
  });

  // Sort by scoreDelta descending
  studentDeltas.sort((a, b) => b.scoreDelta - a.scoreDelta);

  const avgScoreChange = allNames.length > 0 ? Math.round((totalScoreChange / allNames.length) * 10) / 10 : 0;
  let cohesionTrend: "increased" | "decreased" | "stable" = "stable";
  if (freedIsolatedCount > newIsolatedCount || wave2Result.density > wave1Result.density) {
    cohesionTrend = "increased";
  } else if (newIsolatedCount > freedIsolatedCount || wave2Result.density < wave1Result.density) {
    cohesionTrend = "decreased";
  }

  return {
    wave1Id: "w1",
    wave2Id: "w2",
    wave1Title,
    wave2Title,
    studentDeltas,
    avgScoreChange,
    newIsolatedCount,
    freedIsolatedCount,
    cohesionTrend,
  };
}
