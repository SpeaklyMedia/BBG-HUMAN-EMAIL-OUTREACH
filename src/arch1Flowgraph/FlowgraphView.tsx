import { useMemo, useState } from "react";
import type { FlowEdge, FlowNode } from "./schema";
import type { FlowLayout } from "./layout";

type FlowgraphViewProps = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  layout: FlowLayout;
  height?: number;
};

type ComputedNode = FlowNode & { x: number; y: number };

type ValidationResult = {
  duplicateNodeIds: string[];
  invalidEdges: FlowEdge[];
  validEdges: FlowEdge[];
};

const GRID_COLS = 4;
const GRID_X_STEP = 260;
const GRID_Y_STEP = 140;
const GRID_X_OFFSET = 40;
const GRID_Y_OFFSET = 40;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const validateGraph = (nodes: FlowNode[], edges: FlowEdge[]): ValidationResult => {
  const ids = nodes.map((node) => node.id);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  ids.forEach((id) => {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });

  const nodeSet = new Set(ids);
  const invalidEdges = edges.filter((edge) => !nodeSet.has(edge.from) || !nodeSet.has(edge.to));
  const validEdges = edges.filter((edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to));

  return {
    duplicateNodeIds: Array.from(duplicates),
    invalidEdges,
    validEdges
  };
};

const computeLayout = (nodes: FlowNode[], layout: FlowLayout): ComputedNode[] => {
  return nodes.map((node, index) => {
    const position = layout[node.id];
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      return { ...node, x: position.x, y: position.y };
    }
    const x = (index % GRID_COLS) * GRID_X_STEP + GRID_X_OFFSET;
    const y = Math.floor(index / GRID_COLS) * GRID_Y_STEP + GRID_Y_OFFSET;
    return { ...node, x, y };
  });
};

export default function FlowgraphView({ nodes, edges, layout, height = 520 }: FlowgraphViewProps) {
  const [scale, setScale] = useState(1);
  const [showIds, setShowIds] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const { duplicateNodeIds, invalidEdges, validEdges } = useMemo(
    () => validateGraph(nodes, edges),
    [nodes, edges]
  );

  const computedNodes = useMemo(() => computeLayout(nodes, layout), [nodes, layout]);
  const layoutExport = useMemo(() => {
    return computedNodes.reduce<FlowLayout>((acc, node) => {
      acc[node.id] = { x: node.x, y: node.y };
      return acc;
    }, {});
  }, [computedNodes]);

  const zoomIn = () => setScale((prev) => clamp(Number((prev + 0.1).toFixed(2)), 0.4, 2.5));
  const zoomOut = () => setScale((prev) => clamp(Number((prev - 0.1).toFixed(2)), 0.4, 2.5));
  const resetView = () => setScale(1);

  const handleExport = async () => {
    const payload = {
      nodes,
      edges,
      layout: layoutExport
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus("Copied JSON to clipboard.");
    } catch (error) {
      setCopyStatus("Clipboard copy failed. Use your browser permissions or copy manually.");
    }
    window.setTimeout(() => setCopyStatus(""), 2400);
  };

  if (duplicateNodeIds.length > 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <strong className="block text-base">Duplicate node IDs detected (render halted).</strong>
        <p className="mt-2">Resolve these IDs before rendering:</p>
        <ul className="mt-2 list-disc pl-5">
          {duplicateNodeIds.map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={zoomIn}>Zoom In</button>
          <button className="btn" onClick={zoomOut}>Zoom Out</button>
          <button className="btn" onClick={resetView}>Reset View</button>
          <button className="btn" onClick={() => setShowIds((prev) => !prev)}>
            {showIds ? "Hide IDs" : "Show IDs"}
          </button>
          <button className="btn btn-primary" onClick={handleExport}>Export JSON</button>
        </div>
        {copyStatus ? <span className="text-xs text-slate-600">{copyStatus}</span> : null}
      </div>

      {invalidEdges.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong className="block text-base">Invalid edges detected (rendering valid edges only).</strong>
          <ul className="mt-2 list-disc pl-5">
            {invalidEdges.map((edge) => (
              <li key={edge.id}>
                {edge.id}: {edge.from} → {edge.to}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="w-full bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2f7_45%,_#e2e8f0_100%)]"
          style={{ height }}
        >
          <svg width="100%" height="100%" role="img" aria-label="ARCH-1 Flowgraph">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f2937" />
              </marker>
            </defs>
            <g transform={`scale(${scale})`}>
              {validEdges.map((edge) => {
                const fromNode = computedNodes.find((node) => node.id === edge.from);
                const toNode = computedNodes.find((node) => node.id === edge.to);
                if (!fromNode || !toNode) return null;
                const x1 = fromNode.x + NODE_WIDTH / 2;
                const y1 = fromNode.y + NODE_HEIGHT / 2;
                const x2 = toNode.x + NODE_WIDTH / 2;
                const y2 = toNode.y + NODE_HEIGHT / 2;
                return (
                  <line
                    key={edge.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#1f2937"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              {computedNodes.map((node) => (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    rx={16}
                    ry={16}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    fill="#ffffff"
                    stroke="#cbd5f5"
                    strokeWidth="2"
                  />
                  <foreignObject
                    x={node.x}
                    y={node.y}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    pointerEvents="none"
                  >
                    <div
                      style={{
                        height: "100%",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "8px 10px",
                        fontFamily:
                          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        color: "#0f172a",
                        fontSize: "13px",
                        lineHeight: "1.2",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        wordBreak: "break-word"
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{node.label}</div>
                      {showIds ? (
                        <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>{node.id}</div>
                      ) : null}
                    </div>
                  </foreignObject>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
