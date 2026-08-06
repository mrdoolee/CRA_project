export interface Student {
  id: string;
  code: string;
  name: string;
  number?: number;
  notes?: string;
  attributes?: Record<string, string>;
}

export interface SurveyResponse {
  id: string;
  timestamp?: string;
  studentCode: string;
  studentName: string;
  // questionColumnName -> array of student names chosen (e.g. 1st, 2nd, 3rd choice)
  choices: Record<string, string[]>;
}

export interface SelfAssessmentResponse {
  studentCode: string;
  studentName: string;
  answers: Record<string, string>; // 문항 원문 -> 응답 텍스트 원본 (예: "그렇다.")
}

export type WeightScheme = [number, number, number]; // [1순위점수, 2순위점수, 3순위점수]

export interface DomainMapping {
  "0_전체_통합": string[];
  "1_정서적_친밀감": string[];
  "2_기능적_협력": string[];
  "3_사회적_영향력": string[];
  "4_교우관계_확장": string[];
}

export interface StudentMetrics {
  studentName: string;
  studentCode: string;
  inDegree: number;           // 지목받은 횟수
  weightedInScore: number;    // 가중 인기 점수
  outDegree: number;          // 내가 지목한 횟수
  weightedOutScore: number;   // 내가 준 가중 점수
  betweennessScore: number;   // 중재자/가교역할 점수 (0~1)
  community: string;          // 소집단/모둠 (예: "모둠_1")
  communityId: number;        // 모둠 번호 (1, 2, 3...)
  mutualCount: number;        // 맞지목(상호 지목) 수
  mutualPartners: string[];   // 맞지목된 친구 이름 목록
  unreciprocatedOut: string[]; // 내가 지목했지만 나를 안지목한 친구들
  unreciprocatedIn: string[];  // 나를 지목했지만 내가 안지목한 친구들
  isIsolated: boolean;        // 고립 위험 학생 (지목받은 횟수가 매우 적음)
  isPeripheral: boolean;      // 주변부 학생
  isBridge: boolean;          // 가교/중재자 역할 학생
  isPopular: boolean;         // 핵심 인기 학생
  rank: number;               // 가중점수 순위
}

export interface CommunityInfo {
  id: string;
  name: string;
  color: string;
  members: string[];
  leaderName?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  group: string;
  metrics: StudentMetrics;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  domain: string;
  weight: number;
  rank?: number;
  isMutual?: boolean;
}

export interface DomainAnalysisResult {
  domainKey: string;
  domainTitle: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: Record<string, StudentMetrics>; // studentName -> StudentMetrics
  communities: CommunityInfo[];
  totalEdges: number;
  density: number;             // 연결 밀도 (실제 edge수 / 가능한 총 edge수)
  reciprocityRate: number;     // 상호지목 비율 (%)
  avgInDegree: number;         // 평균 지목 횟수
  avgWeightedScore: number;    // 평균 가중 점수
}

export interface WaveData {
  id: string;
  title: string;               // 예: "2026학년도 1학기 초 (3월)"
  date: string;
  students: Student[];
  surveyResponses: SurveyResponse[];
  weights: WeightScheme;
  analysisResults: Record<string, DomainAnalysisResult>; // domainKey -> DomainAnalysisResult
  aiReport?: string;
}

export interface LongitudinalStudentDelta {
  studentName: string;
  studentCode: string;
  wave1Score: number;
  wave2Score: number;
  scoreDelta: number;          // wave2Score - wave1Score
  wave1InDegree: number;
  wave2InDegree: number;
  inDegreeDelta: number;
  wave1Community: string;
  wave2Community: string;
  wave1Isolated: boolean;
  wave2Isolated: boolean;
  statusChange: 'improving' | 'declining' | 'isolated_new' | 'isolated_freed' | 'stable';
  newFriends: string[];        // 2차 조사에서 새로 연결된 친구
  lostFriends: string[];       // 1차 조사에 있었으나 2차 조사에서 끊어진 친구
  mutualNew: string[];         // 새로 생긴 맞지목 관계
}

export interface LongitudinalComparison {
  wave1Id: string;
  wave2Id: string;
  wave1Title: string;
  wave2Title: string;
  studentDeltas: LongitudinalStudentDelta[];
  avgScoreChange: number;
  newIsolatedCount: number;
  freedIsolatedCount: number;
  cohesionTrend: 'increased' | 'decreased' | 'stable';
  aiLongitudinalReport?: string;
}
