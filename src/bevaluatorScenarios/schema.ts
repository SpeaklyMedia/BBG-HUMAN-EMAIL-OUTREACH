export type FlowNode = {
  id: string;
  label: string;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
};

export const nodes: FlowNode[] = [
  { id: "n0", label: "Start: What’s the goal this year?" },
  { id: "v1", label: "BEValuator: model valuation drivers" },
  { id: "v2", label: "BEValuator: track KPI impact over time" },
  { id: "v3", label: "BEValuator: package story for stakeholders" },
  { id: "e1", label: "Exit: prepare for sale" },
  { id: "e2", label: "Timeline: 0–12 / 12–24 / 24+ months" },
  { id: "e3", label: "Clean financials + KPI narrative" },
  { id: "e4", label: "De-risk operations + compliance" },
  { id: "e5", label: "Buyer story + valuation drivers" },
  { id: "e6", label: "Outcome: stronger multiple + cleaner deal" },
  { id: "g1", label: "Growth: scale current market" },
  { id: "g2", label: "Choose lever: distribution / velocity / margin" },
  { id: "g3", label: "Repeatable marketing + demand engine" },
  { id: "g4", label: "Ops capacity + unit economics" },
  { id: "g5", label: "Measure: CAC, LTV, contribution margin" },
  { id: "g6", label: "Outcome: scale with controlled risk" },
  { id: "m1", label: "Enter new market: geo / channel / segment" },
  { id: "m2", label: "Market fit test: who / where / why now" },
  { id: "m3", label: "Pilot plan: budget + criteria" },
  { id: "m4", label: "GTM assets + partner/distributor plan" },
  { id: "m5", label: "Feedback loop: iterate or stop" },
  { id: "m6", label: "Outcome: validated expansion path" }
];

export const edges: FlowEdge[] = [
  { id: "edge-n0-v1", from: "n0", to: "v1" },
  { id: "edge-v1-v2", from: "v1", to: "v2" },
  { id: "edge-v2-v3", from: "v2", to: "v3" },

  { id: "edge-n0-e1", from: "n0", to: "e1" },
  { id: "edge-e1-e2", from: "e1", to: "e2" },
  { id: "edge-e2-e3", from: "e2", to: "e3" },
  { id: "edge-e3-e4", from: "e3", to: "e4" },
  { id: "edge-e4-e5", from: "e4", to: "e5" },
  { id: "edge-e5-e6", from: "e5", to: "e6" },

  { id: "edge-n0-g1", from: "n0", to: "g1" },
  { id: "edge-g1-g2", from: "g1", to: "g2" },
  { id: "edge-g2-g3", from: "g2", to: "g3" },
  { id: "edge-g3-g4", from: "g3", to: "g4" },
  { id: "edge-g4-g5", from: "g4", to: "g5" },
  { id: "edge-g5-g6", from: "g5", to: "g6" },

  { id: "edge-n0-m1", from: "n0", to: "m1" },
  { id: "edge-m1-m2", from: "m1", to: "m2" },
  { id: "edge-m2-m3", from: "m2", to: "m3" },
  { id: "edge-m3-m4", from: "m3", to: "m4" },
  { id: "edge-m4-m5", from: "m4", to: "m5" },
  { id: "edge-m5-m6", from: "m5", to: "m6" },

  { id: "edge-v1-e2", from: "v1", to: "e2" },
  { id: "edge-v2-e3", from: "v2", to: "e3" },
  { id: "edge-v3-e5", from: "v3", to: "e5" },

  { id: "edge-v1-g2", from: "v1", to: "g2" },
  { id: "edge-v2-g3", from: "v2", to: "g3" },
  { id: "edge-v3-g5", from: "v3", to: "g5" },

  { id: "edge-v1-m2", from: "v1", to: "m2" },
  { id: "edge-v2-m3", from: "v2", to: "m3" },
  { id: "edge-v3-m5", from: "v3", to: "m5" }
];
