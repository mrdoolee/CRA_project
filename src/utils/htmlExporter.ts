import { DomainAnalysisResult, Student } from "../types/sna";
import { downloadFile } from "./gephiExporter";

/**
 * Generates an interactive standalone HTML visualizer report containing ALL 5 domains.
 * Allows switching between domains and toggling anonymized names right inside the HTML report.
 */
export function generateIntegratedHTML(
  domainResults: Record<string, DomainAnalysisResult>,
  className: string = "학급 교우관계 분석"
): string {
  const domainsJson = JSON.stringify(domainResults);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRA(Classroom Relationship Analysis by 두리쌤) - 5개 영역 통합 네트워크 시각화 보고서</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
    
    header { background: #0f172a; color: #ffffff; padding: 12px 20px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .header-row-top { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    h1 { font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .subtitle { font-size: 11.5px; color: #94a3b8; font-weight: 400; }
    
    .header-row-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; flex-wrap: wrap; }
    .domain-tabs { display: flex; gap: 6px; background: #1e293b; padding: 4px; border-radius: 8px; overflow-x: auto; }
    .domain-btn { padding: 6px 12px; background: transparent; color: #94a3b8; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .domain-btn.active { background: #4f46e5; color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .domain-btn:hover:not(.active) { color: #f1f5f9; background: #334155; }
    
    .controls { display: flex; gap: 10px; align-items: center; flex-wrap: nowrap; flex-shrink: 0; }
    input[type="text"] { padding: 6px 12px; border: 1px solid #334155; background: #1e293b; color: #ffffff; border-radius: 6px; font-size: 12px; outline: none; }
    input[type="text"]:focus { border-color: #818cf8; }
    
    .anon-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #cbd5e1; cursor: pointer; user-select: none; background: #1e293b; padding: 5px 10px; border-radius: 6px; white-space: nowrap; }
    .anon-toggle input { cursor: pointer; }
    
    .action-btn { padding: 6px 12px; background: #334155; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s; white-space: nowrap; }
    .action-btn:hover { background: #475569; }
    .tip-btn { background: #4f46e5 !important; font-weight: 700 !important; }
    .tip-btn:hover { background: #4338ca !important; }

    /* Modal Styling */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); z-index: 999; align-items: center; justify-content: center; padding: 20px; }
    .modal-box { background: #ffffff; width: 100%; max-width: 580px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #e2e8f0; animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .modal-header { padding: 16px 20px; background: #0f172a; color: #ffffff; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { font-size: 15px; font-weight: 800; }
    .modal-close { background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; line-height: 1; }
    .modal-close:hover { color: #ffffff; }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; max-height: 80vh; overflow-y: auto; }

    .container { flex: 1; position: relative; display: flex; overflow: hidden; }
    #graph-svg { width: 100%; height: 100%; background: #ffffff; cursor: grab; }
    #graph-svg:active { cursor: grabbing; }

    .sidebar { width: 340px; background: #ffffff; border-left: 1px solid #e2e8f0; padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; flex-shrink: 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .card h3 { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
    
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .stat-item { background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .stat-label { color: #64748b; font-size: 11px; }
    .stat-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; }

    .tooltip { position: absolute; pointer-events: none; background: rgba(15, 23, 42, 0.92); color: #ffffff; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-family: sans-serif; display: none; z-index: 100; box-shadow: 0 10px 20px rgba(0,0,0,0.3); backdrop-filter: blur(4px); }
    .node-label { font-size: 11px; font-weight: 700; fill: #1e293b; pointer-events: none; text-anchor: middle; dominant-baseline: central; }
    .edge { stroke: #cbd5e1; stroke-opacity: 0.5; stroke-linecap: round; }
    .edge.mutual { stroke: #4f46e5; stroke-opacity: 0.85; stroke-width: 2.2px; }
    .edge.highlighted { stroke: #d97706; stroke-opacity: 1; stroke-width: 3px; }
    .node { stroke: #ffffff; stroke-width: 2px; cursor: pointer; transition: transform 0.2s; }
    .node:hover { stroke: #1e1b4b; stroke-width: 3px; }
  </style>
</head>
<body>
  <header>
    <div class="header-row-top">
      <h1>CRA(Classroom Relationship Analysis by 두리쌤) <span class="subtitle">| 5개 영역 통합 SNA 시각화</span> <span class="subtitle" id="domain-meta">| 로딩 중...</span></h1>
    </div>

    <div class="header-row-bottom">
      <!-- Domain Tabs -->
      <div class="domain-tabs" id="domain-tabs-container"></div>

      <div class="controls">
        <button class="action-btn tip-btn" onclick="openTipModal()">💡 Sociogram 해석 Tip</button>
        <button class="action-btn" onclick="clearSelection()" style="background: #e11d48; font-weight: 700;" title="선택을 해제하고 전체 그래프로 돌아갑니다">🔄 선택 초기화</button>
        <label class="anon-toggle">
          <input type="checkbox" id="anon-checkbox" onchange="toggleAnon()">
          🔒 익명화
        </label>
        <input type="text" id="search-input" placeholder="학생 검색..." onkeyup="filterNode()">
        <button class="action-btn" onclick="resetZoom()">화면 맞춤</button>
      </div>
    </div>
  </header>

  <!-- Tip Modal Overlay -->
  <div class="modal-overlay" id="tip-modal">
    <div class="modal-box">
      <div class="modal-header">
        <h3>💡 Sociogram(소시오그램) 해석 가이드</h3>
        <button class="modal-close" onclick="closeTipModal()">&times;</button>
      </div>
      <div class="modal-body">
        <!-- Node Size Card -->
        <div class="card" style="margin: 0;">
          <h3>🔴🔵 학생 노드(원 크기) 의미 안내</h3>
          <div style="font-size: 12px; color: #334155; line-height: 1.6; display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #4f46e5; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; flex-shrink: 0; margin-top: 2px;">대</div>
              <div>
                <strong style="color: #312e81; font-size: 13px;">원이 클수록 (중심성 높음):</strong><br>
                <span style="color: #475569;">많은 친구들에게 지목받은 학생으로, 해당 영역에서 <strong>학급 내 영향력·인지도·선호도</strong>가 높음을 의미합니다.</span>
              </div>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="width: 16px; height: 16px; border-radius: 50%; background: #94a3b8; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 9px; flex-shrink: 0; margin-top: 3px;">소</div>
              <div>
                <strong style="color: #475569; font-size: 13px;">원이 작을수록 (피지목 적음):</strong><br>
                <span style="color: #64748b;">선택받은 횟수가 적은 학생으로, 소외되거나 <strong>고립 위험</strong>이 있는지 세심한 관심과 지속적 케어가 필요합니다.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Edge Legend Card -->
        <div class="card" style="margin: 0;">
          <h3>🔗 관계 선(Edge) 연결 범례 안내</h3>
          <div style="font-size: 12px; color: #334155; line-height: 1.6; display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 28px; height: 4px; background-color: #4f46e5; border-radius: 2px; flex-shrink: 0;"></div>
              <div><strong style="color: #312e81; font-size: 13px;">진한 파란 선 (두꺼운 선):</strong> <strong>상호지목 관계</strong><br><span style="color: #64748b; font-size: 11px;">두 학생이 서로를 동시에 선택한 양방향 친밀 관계</span></div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 28px; height: 1.5px; background-color: #cbd5e1; flex-shrink: 0;"></div>
              <div><strong style="color: #475569; font-size: 13px;">연한 회색 선 (가느다란 선):</strong> <strong>단방향 지목 관계</strong><br><span style="color: #64748b; font-size: 11px;">한쪽 학생만 상대를 선택한 화살표 지목 연결</span></div>
            </div>
          </div>
        </div>
      </div>
      <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
        <button class="action-btn" onclick="closeTipModal()" style="padding: 8px 16px;">닫기</button>
      </div>
    </div>
  </div>

  <div class="container">
    <svg id="graph-svg"></svg>
    <div class="tooltip" id="tooltip"></div>

    <div class="sidebar">
      <div class="card">
        <h3>📊 선택 영역 요약 지표</h3>
        <div class="stat-grid">
          <div class="stat-item"><div class="stat-label">네트워크 밀도</div><div class="stat-val" id="stat-density">-</div></div>
          <div class="stat-item"><div class="stat-label">상호지목 비율</div><div class="stat-val" id="stat-reciprocity">-</div></div>
          <div class="stat-item"><div class="stat-label">평균 지목 횟수</div><div class="stat-val" id="stat-indegree">-</div></div>
          <div class="stat-item"><div class="stat-label">평균 인기 점수</div><div class="stat-val" id="stat-weighted">-</div></div>
        </div>
      </div>

      <div class="card" id="student-detail">
        <h3>👤 학생 상세 분석</h3>
        <p style="font-size: 12px; color: #64748b; leading-height: 1.5;">그래프에서 노드(학생)를 클릭하면 해당 학생의 지목/상호지목 상태가 표시됩니다.</p>
      </div>

      <div class="card">
        <h3>🎨 모둠(소집단) 범례</h3>
        <div id="community-legend" style="display: flex; flex-direction: column; gap: 6px; font-size: 12px; margin-top: 4px;"></div>
      </div>
    </div>
  </div>

  <script>
    const allDomains = ${domainsJson};
    let currentDomainKey = "0_전체_통합";
    let isAnonymous = false;
    let simulation = null;

    function openTipModal() {
      document.getElementById("tip-modal").style.display = "flex";
    }
    function closeTipModal() {
      document.getElementById("tip-modal").style.display = "none";
    }

    // Helper for display name using code if present
    function getDisplayName(nodeObj, idx) {
      if (typeof nodeObj === "string") {
        if (!isAnonymous) return nodeObj;
        const numStr = String(idx + 1).padStart(2, '0');
        return "학생 " + numStr;
      }
      if (!isAnonymous) return nodeObj.id;
      if (nodeObj.metrics && nodeObj.metrics.studentCode) {
        return "코드 " + nodeObj.metrics.studentCode;
      }
      if (nodeObj.code) {
        return "코드 " + nodeObj.code;
      }
      const numStr = String(idx + 1).padStart(2, '0');
      return "학생 " + numStr;
    }

    // Build Domain Tab Buttons
    const tabsContainer = document.getElementById("domain-tabs-container");
    Object.keys(allDomains).forEach(key => {
      const btn = document.createElement("button");
      btn.className = "domain-btn" + (key === currentDomainKey ? " active" : "");
      btn.innerText = key;
      btn.onclick = () => switchDomain(key);
      tabsContainer.appendChild(btn);
    });

    function switchDomain(key) {
      currentDomainKey = key;
      document.querySelectorAll(".domain-btn").forEach(b => {
        b.classList.toggle("active", b.innerText === key);
      });
      renderGraph();
    }

    function toggleAnon() {
      isAnonymous = document.getElementById("anon-checkbox").checked;
      renderGraph();
    }

    const width = document.querySelector('.container').clientWidth - 340;
    const height = document.querySelector('.container').clientHeight;

    const svg = d3.select("#graph-svg")
      .attr("viewBox", [0, 0, width, height]);

    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.15, 6])
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

    function resetZoom() {
      svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
    }

    function renderGraph() {
      const data = allDomains[currentDomainKey] || Object.values(allDomains)[0];
      if (!data) return;

      // Update Header Stats
      document.getElementById("domain-meta").innerText = 
        "영역: " + data.domainTitle + " | 학생: " + data.nodes.length + "명 | 연결: " + data.edges.length + "개 | 상호지목: " + data.reciprocityRate + "%";

      document.getElementById("stat-density").innerText = data.density;
      document.getElementById("stat-reciprocity").innerText = data.reciprocityRate + "%";
      document.getElementById("stat-indegree").innerText = data.avgInDegree + "회";
      document.getElementById("stat-weighted").innerText = data.avgWeightedScore + "점";

      // Map nodes with display names
      const nameMap = {};
      data.nodes.forEach((n, idx) => {
        nameMap[n.id] = getDisplayName(n, idx);
      });

      const nodes = data.nodes.map((n, idx) => ({
        ...n,
        displayName: getDisplayName(n, idx)
      }));

      const edges = data.edges.map(e => ({ ...e }));

      // Clear previous drawing
      g.selectAll("*").remove();

      if (simulation) simulation.stop();

      simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(edges).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-360))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => d.size + 16));

      const link = g.append("g")
        .selectAll("line")
        .data(edges)
        .join("line")
        .attr("class", d => d.isMutual ? "edge mutual" : "edge")
        .attr("stroke-width", d => Math.max(1.2, d.weight * 0.9))
        .attr("marker-end", "url(#arrow)");

      const node = g.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

      node.append("circle")
        .attr("r", d => d.size)
        .attr("fill", d => d.color)
        .attr("class", "node")
        .on("click", (event, d) => selectStudent(event, d, nameMap, link))
        .on("mouseover", (event, d) => showTooltip(event, d, nameMap))
        .on("mouseout", hideTooltip);

      node.append("text")
        .text(d => d.displayName)
        .attr("class", "node-label")
        .attr("dy", d => d.size + 14);

      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
      });

      // Update Legend
      const legend = document.getElementById('community-legend');
      legend.innerHTML = "";
      const comms = {};
      nodes.forEach(n => {
        if (!comms[n.group]) comms[n.group] = n.color;
      });
      Object.entries(comms).forEach(([name, color]) => {
        legend.innerHTML += '<div style="display:flex; align-items:center; gap:8px;"><span style="width:12px; height:12px; border-radius:50%; background:' + color + ';"></span>' + name + '</div>';
      });
    }

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }

    const tooltip = d3.select("#tooltip");
    function showTooltip(event, d, nameMap) {
      const m = d.metrics;
      const mutualNames = (m.mutualPartners || []).map(p => nameMap[p] || p).join(', ') || '없음';
      tooltip.style("display", "block")
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 15) + "px")
        .html("<b>" + d.displayName + "</b> (" + m.community + ")<br>" +
          "• 지목받은 횟수: " + m.inDegree + "회<br>" +
          "• 가중 인기점수: " + m.weightedInScore + "점<br>" +
          "• 맞지목 친구: " + m.mutualCount + "명 (" + mutualNames + ")");
    }
    function hideTooltip() { tooltip.style("display", "none"); }

    function selectStudent(event, d, nameMap, link) {
      if (event) event.stopPropagation();
      const m = d.metrics;
      const mutualNames = (m.mutualPartners || []).map(p => nameMap[p] || p).join(', ') || '없음';
      const detail = document.getElementById('student-detail');
      
      detail.innerHTML = 
        "<h3>👤 " + d.displayName + "</h3>" +
        "<p style='font-size:12px; color:#4f46e5; font-weight:700; margin-bottom:8px;'>소속: " + m.community + " | 가중순위: " + m.rank + "위</p>" +
        "<div class='stat-grid' style='margin-bottom:12px;'>" +
          "<div class='stat-item'><div class='stat-label'>지목받은 횟수</div><div class='stat-val'>" + m.inDegree + "회</div></div>" +
          "<div class='stat-item'><div class='stat-label'>가중 인기점수</div><div class='stat-val'>" + m.weightedInScore + "점</div></div>" +
          "<div class='stat-item'><div class='stat-label'>중재자 점수</div><div class='stat-val'>" + m.betweennessScore + "</div></div>" +
          "<div class='stat-item'><div class='stat-label'>맞지목 친구</div><div class='stat-val'>" + m.mutualCount + "명</div></div>" +
        "</div>" +
        "<p style='font-size:12px; font-weight:700; color:#334155;'>🤝 맞지목 친구들:</p>" +
        "<p style='font-size:12px; color:#64748b; margin-bottom:8px;'>" + mutualNames + "</p>" +
        "<p style='font-size:12px; color:#334155; font-weight:700;'>⚠️ 상태 진단:</p>" +
        "<p style='font-size:12px; color:" + (m.isIsolated ? '#dc2626' : '#059669') + "; font-weight:700;'>" + (m.isIsolated ? '고립/소외 주의 대상' : m.isPopular ? '핵심 인기 리더' : m.isBridge ? '가교/중재자 역할' : '중간 그룹') + "</p>" +
        "<button onclick='clearSelection()' style='margin-top:12px; width:100%; padding:8px; background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; border-radius:6px; font-weight:700; cursor:pointer;'>🔄 선택 해제 (전체 보기)</button>";

      link.classed("highlighted", e => e.source.id === d.id || e.target.id === d.id);
      link.style("stroke-opacity", e => (e.source.id === d.id || e.target.id === d.id) ? 1.0 : 0.08);
      link.style("stroke-width", e => (e.source.id === d.id || e.target.id === d.id) ? "3.5px" : "1px");
    }

    function clearSelection() {
      const detail = document.getElementById('student-detail');
      detail.innerHTML = "<p style='color:#64748b;'>노드를 클릭하여 학생 정보를 확인하세요.</p>";
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = "";
      
      d3.selectAll("line")
        .classed("highlighted", false)
        .style("stroke-opacity", null)
        .style("stroke-width", null);
      
      d3.selectAll("g").style("opacity", 1);
    }

    svg.on("click", function(event) {
      if (event.target === this || event.target.tagName === "svg") {
        clearSelection();
      }
    });

    function filterNode() {
      const q = document.getElementById('search-input').value.toLowerCase().trim();
      d3.selectAll(".node-label").each(function(d) {
        const match = d.displayName.toLowerCase().includes(q);
        d3.select(this.parentNode).style("opacity", match ? 1 : 0.15);
      });
    }

    // Initial Render
    renderGraph();
  </script>
</body>
</html>`;
}

export function exportHTMLReport(
  domainResults: Record<string, DomainAnalysisResult>,
  classNameTitle: string = "학급교우관계",
  fileName: string = "CRA_5개영역통합_시각화보고서.html"
) {
  const htmlContent = generateIntegratedHTML(domainResults, classNameTitle);
  downloadFile(htmlContent, fileName, "text/html;charset=utf-8;");
}

export function exportSnaToHtmlReport(
  _students: Student[],
  analysisResults: Record<string, DomainAnalysisResult>,
  classNameTitle: string = "학급교우관계"
) {
  exportHTMLReport(analysisResults, classNameTitle, "CRA_5개영역통합_시각화보고서.html");
}
