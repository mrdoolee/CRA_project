import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { DomainAnalysisResult, GraphNode, GraphEdge } from "../types/sna";
import { ZoomIn, ZoomOut, RefreshCw, Download, Search, Filter, ShieldAlert, Award, GitCommit, EyeOff } from "lucide-react";
import { getAnonymizedName } from "../utils/anonymizer";

interface Props {
  data: DomainAnalysisResult;
  onSelectStudent?: (studentName: string) => void;
  selectedStudentName?: string | null;
  isAnonymous?: boolean;
}

export const NetworkGraph: React.FC<Props> = ({
  data,
  onSelectStudent,
  selectedStudentName,
  isAnonymous = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [onlyMutual, setOnlyMutual] = useState(false);
  const [showEdgeWeights, setShowEdgeWeights] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);

  const allNames = data.nodes.map((n) => n.id);

  const getNodeDisplayName = (node: GraphNode | string) => {
    const id = typeof node === "string" ? node : node.id;
    const nodeObj = typeof node === "object" ? node : data.nodes.find((n) => n.id === id);
    if (isAnonymous) {
      if (nodeObj?.code) {
        return `코드 ${nodeObj.code}`;
      }
      if (nodeObj?.metrics?.studentCode) {
        return `코드 ${nodeObj.metrics.studentCode}`;
      }
    }
    return getAnonymizedName(id, data.metrics || data.nodes, isAnonymous);
  };

  useEffect(() => {
    if (selectedStudentName) {
      const found = data.nodes.find((n) => n.id === selectedStudentName);
      if (found) setActiveNode(found);
    }
  }, [selectedStudentName, data]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Filter nodes and edges
    let filteredNodes = [...data.nodes];
    let filteredEdges = data.edges.filter((e) => {
      if (onlyMutual) return e.isMutual;
      return true;
    });

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchedNames = new Set(
        filteredNodes.filter((n) => n.label.toLowerCase().includes(term)).map((n) => n.id)
      );
      filteredEdges = filteredEdges.filter(
        (e) => matchedNames.has(e.source as string) || matchedNames.has(e.target as string)
      );
    }

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("viewBox", [0, 0, width, height]);

    // Add marker defs for directed arrow heads
    const defs = svg.append("defs");

    defs
      .append("marker")
      .attr("id", "arrow-default")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    defs
      .append("marker")
      .attr("id", "arrow-mutual")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#4F46E5");

    defs
      .append("marker")
      .attr("id", "arrow-active")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 24)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#D97706");

    // Clear active selection on SVG background click
    svg.on("click", (event: any) => {
      if (event.target === svgRef.current || event.target.tagName === "svg") {
        setActiveNode(null);
        setSearchTerm("");
        if (onSelectStudent) {
          onSelectStudent("");
        }
      }
    });

    // Container group for zooming
    const g = svg.append("g");

    // Zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior as any);

    // Clone data for simulation
    const simulationNodes = filteredNodes.map((n) => ({ ...n }));
    const simulationEdges = filteredEdges.map((e) => ({ ...e }));

    // Force simulation setup
    const simulation = d3
      .forceSimulation(simulationNodes as any)
      .force(
        "link",
        d3
          .forceLink(simulationEdges)
          .id((d: any) => d.id)
          .distance(110)
      )
      .force("charge", d3.forceManyBody().strength(-380))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => d.size + 16)
      );

    // Determine active focus student ID (either clicked activeNode or searched student)
    let focusStudentId: string | null = activeNode ? activeNode.id : null;
    if (!focusStudentId && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matched = data.nodes.find(
        (n) => n.id.toLowerCase().includes(term) || n.label.toLowerCase().includes(term)
      );
      if (matched) focusStudentId = matched.id;
    }

    const isEdgeConnectedToFocus = (l: any, targetId: string) => {
      const sId = typeof l.source === "object" ? l.source.id : l.source;
      const tId = typeof l.target === "object" ? l.target.id : l.target;
      return sId === targetId || tId === targetId;
    };

    // Draw Edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(simulationEdges)
      .join("line")
      .attr("stroke", (d: any) => {
        if (focusStudentId) {
          return isEdgeConnectedToFocus(d, focusStudentId) ? "#D97706" : "#e2e8f0";
        }
        return d.isMutual ? "#4F46E5" : "#cbd5e1";
      })
      .attr("stroke-opacity", (d: any) => {
        if (focusStudentId) {
          return isEdgeConnectedToFocus(d, focusStudentId) ? 1.0 : 0.08;
        }
        return d.isMutual ? 0.85 : 0.45;
      })
      .attr("stroke-width", (d: any) => {
        if (focusStudentId) {
          return isEdgeConnectedToFocus(d, focusStudentId) ? 3.5 : 1;
        }
        return Math.max(1.2, (d.weight || 1) * 0.9);
      })
      .attr("marker-end", (d: any) => {
        if (focusStudentId) {
          return isEdgeConnectedToFocus(d, focusStudentId) ? "url(#arrow-active)" : "url(#arrow-default)";
        }
        return d.isMutual ? "url(#arrow-mutual)" : "url(#arrow-default)";
      });

    // Draw Edge Weight Labels if enabled
    let edgeLabels: any = null;
    if (showEdgeWeights) {
      edgeLabels = g
        .append("g")
        .selectAll("text")
        .data(simulationEdges)
        .join("text")
        .text((d: any) => `${d.weight}점`)
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .attr("text-anchor", "middle");
    }

    // Draw Nodes Group
    const node = g
      .append("g")
      .selectAll("g")
      .data(simulationNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<any, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node Circles
    const circles = node
      .append("circle")
      .attr("r", (d: any) => d.size)
      .attr("fill", (d: any) => d.color)
      .attr("stroke", (d: any) => {
        if (activeNode && d.id === activeNode.id) return "#D97706";
        if (d.metrics?.isIsolated) return "#EF4444";
        return "#ffffff";
      })
      .attr("stroke-width", (d: any) => {
        if (activeNode && d.id === activeNode.id) return 4;
        if (d.metrics?.isIsolated) return 3;
        return 2;
      });

    // Node Labels
    node
      .append("text")
      .text((d: any) => getNodeDisplayName(d.id))
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", "#1e293b")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.size + 14);

    // Hover & Click event handlers
    node
      .on("mouseover", (_event, d: any) => {
        setHoveredNode(d);
      })
      .on("mouseout", () => {
        setHoveredNode(null);
      })
      .on("click", (_event, d: any) => {
        _event.stopPropagation();
        setActiveNode(d);
        if (onSelectStudent) {
          onSelectStudent(d.id);
        }
      });

    // Tick update
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      if (edgeLabels) {
        edgeLabels
          .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
          .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
      }

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Reset Zoom handler helper
    (svgRef.current as any).resetZoom = () => {
      svg.transition().duration(600).call(zoomBehavior.transform as any, d3.zoomIdentity);
    };
  }, [data, onlyMutual, showEdgeWeights, isAnonymous]);

  // Reactive Effect to handle Node/Link selection highlights and reset
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    let focusStudentId: string | null = activeNode ? activeNode.id : null;
    if (!focusStudentId && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matched = data.nodes.find(
        (n) => n.id.toLowerCase().includes(term) || n.label.toLowerCase().includes(term)
      );
      if (matched) focusStudentId = matched.id;
    }

    const isEdgeConnectedToFocus = (l: any, targetId: string) => {
      const sId = typeof l.source === "object" ? l.source.id : l.source;
      const tId = typeof l.target === "object" ? l.target.id : l.target;
      return sId === targetId || tId === targetId;
    };

    if (focusStudentId) {
      const fid = focusStudentId;
      svg.selectAll("line")
        .attr("stroke", (d: any) => (d && isEdgeConnectedToFocus(d, fid) ? "#D97706" : "#e2e8f0"))
        .attr("stroke-opacity", (d: any) => (d && isEdgeConnectedToFocus(d, fid) ? 1.0 : 0.08))
        .attr("stroke-width", (d: any) => (d && isEdgeConnectedToFocus(d, fid) ? 3.5 : 1))
        .attr("marker-end", (d: any) => (d && isEdgeConnectedToFocus(d, fid) ? "url(#arrow-active)" : "url(#arrow-default)"));

      svg.selectAll("circle")
        .attr("stroke", (d: any) => {
          if (d && d.id === fid) return "#D97706";
          if (d && d.metrics?.isIsolated) return "#EF4444";
          return "#ffffff";
        })
        .attr("stroke-width", (d: any) => {
          if (d && d.id === fid) return 4;
          if (d && d.metrics?.isIsolated) return 3;
          return 2;
        });
    } else {
      // Clear selection - reset all lines and circles to default
      svg.selectAll("line")
        .attr("stroke", (d: any) => (d && d.isMutual ? "#4F46E5" : "#cbd5e1"))
        .attr("stroke-opacity", (d: any) => (d && d.isMutual ? 0.85 : 0.45))
        .attr("stroke-width", (d: any) => (d ? Math.max(1.2, (d.weight || 1) * 0.9) : 1))
        .attr("marker-end", (d: any) => (d && d.isMutual ? "url(#arrow-mutual)" : "url(#arrow-default)"));

      svg.selectAll("circle")
        .attr("stroke", (d: any) => (d && d.metrics?.isIsolated ? "#EF4444" : "#ffffff"))
        .attr("stroke-width", (d: any) => (d && d.metrics?.isIsolated ? 3 : 2));
    }
  }, [activeNode, searchTerm, data]);

  const handleClearSelection = () => {
    setActiveNode(null);
    setSearchTerm("");
    if (onSelectStudent) {
      onSelectStudent("");
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && (svgRef.current as any).resetZoom) {
      (svgRef.current as any).resetZoom();
    }
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = svgElement.clientWidth || 1000;
      canvas.height = svgElement.clientHeight || 700;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `CRA_${data.domainTitle}_관계망_그래프.png`;
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="relative w-full h-[620px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col" ref={containerRef}>
      {/* Top Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="학생 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
            />
          </div>

          <button
            onClick={() => setOnlyMutual(!onlyMutual)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              onlyMutual ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            맞지목(상호)만 보기
          </button>

          <button
            onClick={() => setShowEdgeWeights(!showEdgeWeights)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showEdgeWeights ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            가중치 표시
          </button>

          {(activeNode || searchTerm.trim()) && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="노드 선택 및 검색을 초기화하고 전체 관계망으로 돌아갑니다."
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
              🔄 전체 보기 (선택 해제)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetZoom}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-xs flex items-center gap-1"
            title="화면 맞춤"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportPNG}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-medium flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            PNG 이미지
          </button>
        </div>
      </div>

      {/* Main SVG Graph */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Subgroup Legend Footer */}
      <div className="absolute bottom-3 left-4 z-10 bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200 shadow-sm max-w-lg flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-slate-700">모둠 구분:</span>
        {data.communities.map((comm) => (
          <div key={comm.id} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: comm.color }} />
            <span className="text-slate-600">{comm.name} ({comm.members.length}명)</span>
          </div>
        ))}
      </div>

      {/* Student Hover Card */}
      {hoveredNode && (
        <div className="absolute top-16 right-4 z-20 bg-slate-900/90 text-white p-3 rounded-lg shadow-xl text-xs w-60 border border-slate-700 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center justify-between font-bold text-sm mb-1">
            <span>{getNodeDisplayName(hoveredNode.id)}</span>
            <span className="text-xs font-normal text-indigo-300">{hoveredNode.metrics.community}</span>
          </div>
          <div className="space-y-1 text-slate-300">
            <div>• 지목받은 횟수: <strong className="text-white">{hoveredNode.metrics.inDegree}회</strong></div>
            <div>• 가중 인기점수: <strong className="text-amber-300">{hoveredNode.metrics.weightedInScore}점</strong></div>
            <div>• 맞지목 친구: <strong className="text-emerald-300">{hoveredNode.metrics.mutualCount}명</strong></div>
            {hoveredNode.metrics.isIsolated && (
              <div className="text-red-400 font-semibold flex items-center gap-1 mt-1">
                <ShieldAlert className="w-3.5 h-3.5" /> 고립/소외 위험 학생
              </div>
            )}
            {hoveredNode.metrics.isPopular && (
              <div className="text-amber-400 font-semibold flex items-center gap-1 mt-1">
                <Award className="w-3.5 h-3.5" /> 핵심 인기 리더
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
