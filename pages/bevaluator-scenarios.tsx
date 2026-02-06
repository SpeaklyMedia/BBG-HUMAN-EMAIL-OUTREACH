import FlowgraphView from "../src/arch1Flowgraph/FlowgraphView";
import { edges, nodes } from "../src/bevaluatorScenarios/schema";
import { layout } from "../src/bevaluatorScenarios/layout";
import ModelSwitcher from "../src/components/ModelSwitcher";

export default function BEValuatorScenariosPage() {
  return (
    <div className="page-shell">
      <div className="container-main stack">
        <div className="card">
          <div className="card-body stack">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="stack">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">BEValuator</p>
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">BEValuator Scenarios</h1>
                <p className="text-sm text-slate-600">Three paths: Exit, Growth, Enter New Market</p>
              </div>
              <ModelSwitcher />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <strong className="block text-sm">How to update data</strong>
              <p className="mt-2">Edit these files and reload:</p>
              <ul className="mt-2 list-disc pl-5">
                <li><code>src/bevaluatorScenarios/schema.ts</code> (nodes + edges)</li>
                <li><code>src/bevaluatorScenarios/layout.ts</code> (node coordinates)</li>
              </ul>
            </div>
          </div>
        </div>

        <FlowgraphView nodes={nodes} edges={edges} layout={layout} height={1240} />
      </div>
    </div>
  );
}
