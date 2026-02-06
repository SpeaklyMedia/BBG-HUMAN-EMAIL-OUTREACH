export type FlowNode = {
  id: string;
  label: string;
  kind?: string;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

const PROVIDED_NODES: FlowNode[] = [];
const PROVIDED_EDGES: FlowEdge[] = [];

const EXAMPLE_NODES: FlowNode[] = [
  { id: "start", label: "Start", kind: "trigger" },
  { id: "segment", label: "Select Segment", kind: "filter" },
  { id: "compose", label: "Compose Draft", kind: "action" },
  { id: "review", label: "Human Review", kind: "gate" },
  { id: "send", label: "Send Emails", kind: "action" }
];

const EXAMPLE_EDGES: FlowEdge[] = [
  { id: "e1", from: "start", to: "segment" },
  { id: "e2", from: "segment", to: "compose" },
  { id: "e3", from: "compose", to: "review" },
  { id: "e4", from: "review", to: "send" }
];

export const nodes = PROVIDED_NODES.length > 0 ? PROVIDED_NODES : EXAMPLE_NODES;
export const edges = PROVIDED_EDGES.length > 0 ? PROVIDED_EDGES : EXAMPLE_EDGES;
