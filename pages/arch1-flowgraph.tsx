import FlowgraphView from "../src/arch1Flowgraph/FlowgraphView";
import { edges, nodes } from "../src/arch1Flowgraph/schema";
import { layout } from "../src/arch1Flowgraph/layout";
import ModelSwitcher from "../src/components/ModelSwitcher";

const isLayoutEmpty = layout && Object.keys(layout).length === 0;

export default function Arch1FlowgraphPage() {
  return (
    <div className="page-shell">
      <div className="container-main stack">
        <div className="card">
          <div className="card-body stack">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="stack">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ARCH-1</p>
                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Email Automation Map</h1>
                <p className="text-sm text-slate-600">This view renders from <code>src/arch1Flowgraph/schema.ts</code> and <code>src/arch1Flowgraph/layout.ts</code>.</p>
              </div>
              <ModelSwitcher />
            </div>
            {isLayoutEmpty ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                AUTO-LAYOUT (deterministic grid)
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <strong className="block text-sm">How to update data</strong>
              <p className="mt-2">Edit these files and reload:</p>
              <ul className="mt-2 list-disc pl-5">
                <li><code>src/arch1Flowgraph/schema.ts</code> (nodes + edges)</li>
                <li><code>src/arch1Flowgraph/layout.ts</code> (optional node coordinates)</li>
              </ul>
            </div>
          </div>
        </div>

        <FlowgraphView nodes={nodes} edges={edges} layout={layout} />
      </div>
    </div>
  );
}
