import { useMemo, useState } from "react";
import type { TwilioFlowDefinition, TwilioWidget } from "@shared/types";
import { useAppStore, selectActiveFlow } from "@renderer/modules/state/appStore";

type PathEntry = {
  key: string; // canonical representation
  pretty: string; // display string like A(keypress)>B(timeout)>C
  count: number;
  steps: Array<{ from: string; event?: string; to: string }>;
};

// Build a map from widget name to widget for quick lookup
function indexStates(states: TwilioWidget[]): Record<string, TwilioWidget> {
  const map: Record<string, TwilioWidget> = {};
  for (const s of states) map[s.name] = s;
  return map;
}

type Edge = { from: string; event?: string; to?: string };

function collectEdges(states: TwilioWidget[]): Edge[] {
  const edges: Edge[] = [];
  for (const st of states) {
    const trans = st.transitions || [];
    if (trans.length === 0) edges.push({ from: st.name });
    for (const tr of trans) {
      edges.push({ from: st.name, event: tr.event, to: tr.next });
    }
  }
  return edges;
}

// Depth-first search to enumerate paths, with cycle guard and reasonable cap
function enumeratePaths(flow: TwilioFlowDefinition, cap = 5000): string[][] {
  // Defensive guards for arbitrary JSON
  const def: any = (flow as any)?.definition;
  const states: TwilioWidget[] = Array.isArray(def?.states) ? def.states : [];
  const start: string | undefined = typeof def?.initial_state === "string" ? def.initial_state : undefined;
  const byName = indexStates(states);
  const paths: string[][] = [];
  const visitedStack = new Set<string>(); // node@depth to avoid trivial cycles

  const edgesByFrom: Record<string, Edge[]> = {};
  for (const e of collectEdges(states)) {
    const list = edgesByFrom[e.from] || (edgesByFrom[e.from] = []);
    list.push(e);
  }

  const walk = (node: string, acc: string[]) => {
    if (paths.length >= cap) return;
    const nodeKey = `${node}@${acc.length}`;
    if (visitedStack.has(nodeKey)) return; // avoid endless cycles
    visitedStack.add(nodeKey);

    const outgoing = edgesByFrom[node] || [];
    if (outgoing.length === 0) {
      paths.push(acc.slice());
      visitedStack.delete(nodeKey);
      return;
    }

    let advanced = false;
    for (const e of outgoing) {
      if (!e.to) {
        // Dead-end edge, finalize path
        paths.push(acc.slice());
        continue;
      }
      advanced = true;
      const label = e.event ? `${node}(${e.event})` : node;
      const nextAcc = acc.length === 0 ? [node, e.event ? `${node}(${e.event})` : node] : [...acc, `${label}>${e.to}`];
      // A simpler representation: push formatted step separately
      const step = e.event ? `${node}(${e.event})>${e.to}` : `${node}>${e.to}`;
      walk(e.to, [...acc, step]);
    }
    if (!advanced) {
      // No next but had outgoing without 'to'
      paths.push(acc.slice());
    }
    visitedStack.delete(nodeKey);
  };

  if (start && byName[start]) {
    walk(start, []);
  } else if (states.length > 0) {
    // fallback: try each as potential start if initial_state missing
    for (const s of states) {
      if (paths.length >= cap) break;
      walk(s.name, []);
    }
  }

  // Normalize empty paths to just the start
  return paths.filter((p) => p.length > 0);
}

function formatSingleLine(seq: string[]): string {
  // seq is array of steps like "from(event)>to"
  let out = "";
  let lastTo: string | undefined;
  for (const step of seq) {
    const m = /^([^>(]+)(?:\(([^)]+)\))?>(.+)$/.exec(step);
    if (!m) {
      // fallback join
      out = out ? `${out} > ${step}` : step;
      continue;
    }
    const [, from, ev, to] = m;
    if (!out) {
      out = ev ? `${from}(${ev})>${to}` : `${from}>${to}`;
    } else {
      // Append without repeating the 'from' (which should equal lastTo)
      out = ev ? `${out}(${ev})>${to}` : `${out}>${to}`;
    }
    lastTo = to;
  }
  return out;
}

function parseStep(step: string): { from: string; event?: string; to: string } | null {
  const m = /^([^>(]+)(?:\(([^)]+)\))?>(.+)$/.exec(step);
  if (!m) return null;
  const [, from, event, to] = m;
  return { from, event, to };
}

function groupPaths(raw: string[][]): PathEntry[] {
  const counts = new Map<string, number>();
  const repr = new Map<string, string[]>();
  for (const seq of raw) {
    const key = formatSingleLine(seq);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!repr.has(key)) repr.set(key, seq);
  }
  const entries: PathEntry[] = [];
  for (const [key, count] of counts) {
    const seq = repr.get(key) || [];
    const steps = seq.map(parseStep).filter(Boolean) as Array<{ from: string; event?: string; to: string }>;
    entries.push({ key, pretty: key, count, steps });
  }
  entries.sort((a, b) => (b.count - a.count) || (a.key.length - b.key.length));
  return entries;
}

export const FlowPathsTab = () => {
  const file = useAppStore(selectActiveFlow);
  const [showEvents, setShowEvents] = useState(true);
  const [eventFilter, setEventFilter] = useState("");
  const [nodeFilter, setNodeFilter] = useState("");
  const [excludeEvents, setExcludeEvents] = useState("");
  const [excludeTypes, setExcludeTypes] = useState("");
  const [showTypesPanel, setShowTypesPanel] = useState(false);

  const parseList = (s: string) => s
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  // Streaming enumeration with caps to avoid OOM
  const result = useMemo(() => {
    if (!file?.flow) return { list: [] as PathEntry[], total: 0, truncated: false };

    const def: any = (file.flow as any)?.definition;
    const states: TwilioWidget[] = Array.isArray(def?.states) ? def.states : [];
    const start: string | undefined = typeof def?.initial_state === "string" ? def.initial_state : undefined;

    const byName = indexStates(states);
    const edgesByFrom: Record<string, Edge[]> = {};
    for (const st of states) {
      const trans = st.transitions || [];
      if (trans.length === 0) {
        (edgesByFrom[st.name] ||= []).push({ from: st.name });
      }
      for (const tr of trans) {
        (edgesByFrom[st.name] ||= []).push({ from: st.name, event: tr.event, to: tr.next });
      }
    }

    const ev = eventFilter.trim().toLowerCase();
    const nf = nodeFilter.trim().toLowerCase();

    const MAX_PATHS_GROUPED = 3000; // how many matched paths to aggregate
    const MAX_TOTAL_COUNT = 50000; // stop counting after this many total paths to avoid heavy CPU
    const MAX_VISITS = 250000; // guard against explosive branching
    const MAX_DEPTH = 80; // prevent extreme path lengths

    let total = 0;
    let visits = 0;
    let truncated = false;

    const counts = new Map<string, number>();
    const repr = new Map<string, string[]>();

    const visitedStack = new Set<string>();

    const exEventsArr = parseList(excludeEvents);
    const exTypesArr = parseList(excludeTypes);

    const walk = (node: string, acc: string[], depth: number) => {
      if (visits++ > MAX_VISITS) { truncated = true; return; }
      if (depth > MAX_DEPTH) { truncated = true; return; }
      const nodeKey = `${node}@${acc.length}`;
      if (visitedStack.has(nodeKey)) return;
      visitedStack.add(nodeKey);

      const outgoing = edgesByFrom[node] || [];
      if (outgoing.length === 0) {
        // end of path
        total++;
        if (total > MAX_TOTAL_COUNT) { truncated = true; visitedStack.delete(nodeKey); return; }
        // Apply filters at leaf
        const passesNode = !nf || acc.some((s) => {
          const m = parseStep(s);
          if (!m) return false;
          return m.from.toLowerCase().includes(nf) || m.to.toLowerCase().includes(nf);
        });
        const passesEv = !ev || acc.some((s) => {
          const m = parseStep(s);
          if (!m) return false;
          return (m.event || "").toLowerCase().includes(ev);
        });
        if (passesNode && passesEv) {
          const seq = showEvents ? acc : acc.map((s) => s.replace(/\([^)]*\)/g, ""));
          const key = formatSingleLine(seq);
          if (counts.size < MAX_PATHS_GROUPED || counts.has(key)) {
            counts.set(key, (counts.get(key) || 0) + 1);
            if (!repr.has(key)) repr.set(key, seq);
          } else {
            truncated = true;
          }
        }
        visitedStack.delete(nodeKey);
        return;
      }

      for (const e of outgoing) {
        if (!e.to) {
          total++;
          if (total > MAX_TOTAL_COUNT) { truncated = true; continue; }
          // dead-end edge, treat acc as a completed path (apply filters)
          const passesNode = !nf || acc.some((s) => {
            const m = parseStep(s);
            if (!m) return false;
            return m.from.toLowerCase().includes(nf) || m.to.toLowerCase().includes(nf);
          });
          const passesEv = !ev || acc.some((s) => {
            const m = parseStep(s);
            if (!m) return false;
            return (m.event || "").toLowerCase().includes(ev);
          });
          if (passesNode && passesEv) {
            const seq = showEvents ? acc : acc.map((s) => s.replace(/\([^)]*\)/g, ""));
            const key = formatSingleLine(seq);
            if (counts.size < MAX_PATHS_GROUPED || counts.has(key)) {
              counts.set(key, (counts.get(key) || 0) + 1);
              if (!repr.has(key)) repr.set(key, seq);
            } else {
              truncated = true;
            }
          }
          continue;
        }
        // Exclusion pruning for event and widget types
        const eventName = (e.event || "").toLowerCase();
        const curType = (byName[node]?.type || "").toLowerCase();
        const nextType = (byName[e.to]?.type || "").toLowerCase();
        const excludedEvent = exEventsArr.length > 0 && exEventsArr.some((tok) => eventName.includes(tok));
        const excludedType = exTypesArr.length > 0 && (exTypesArr.some((tok) => curType.includes(tok)) || exTypesArr.some((tok) => nextType.includes(tok)));
        if (excludedEvent || excludedType) {
          continue;
        }

        const step = e.event ? `${node}(${e.event})>${e.to}` : `${node}>${e.to}`;
        walk(e.to, [...acc, step], depth + 1);
        if (truncated) break;
      }

      visitedStack.delete(nodeKey);
    };

    if (start && byName[start]) {
      walk(start, [], 0);
    } else if (states.length > 0) {
      for (const s of states) {
        walk(s.name, [], 0);
        if (truncated) break;
      }
    }

    // Build entries
    const entries: PathEntry[] = [];
    for (const [key, count] of counts) {
      const seq = repr.get(key) || [];
      const steps = seq.map(parseStep).filter(Boolean) as Array<{ from: string; event?: string; to: string }>;
      entries.push({ key, pretty: key, count, steps });
    }
    // Sort and trim rendered list to a safe size for UI
    entries.sort((a, b) => (b.count - a.count) || (a.key.length - b.key.length));
    const MAX_RENDER = 1000;
    const list = entries.slice(0, MAX_RENDER);
    if (entries.length > MAX_RENDER) truncated = true;

    return { list, total, truncated };
  }, [file?.id, file?.updatedAt, file?.flow?.definition, showEvents, eventFilter, nodeFilter, excludeEvents, excludeTypes]);

  const detectedTypes = useMemo(() => {
    const def: any = (file?.flow as any)?.definition;
    const states: TwilioWidget[] = Array.isArray(def?.states) ? def.states : [];
    const set = new Set<string>();
    for (const st of states) {
      if (typeof st.type === "string" && st.type.trim()) set.add(st.type);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [file?.id, file?.updatedAt, file?.flow?.definition]);

  if (!file?.flow) {
    return (
      <div className="p-3 text-xs text-slate-500">Abra um fluxo para analisar os caminhos.</div>
    );
  }

  // Safeguard against non-flow JSON
  const def: any = (file.flow as any)?.definition;
  const statesOk = Array.isArray(def?.states);
  if (!statesOk) {
    return (
      <div className="p-3 text-xs text-yellow-400">
        O JSON atual não parece um fluxo válido (definition.states ausente). Ajuste o JSON ou volte para um fluxo.
      </div>
    );
  }

  const handleOpenPath = (pretty: string) => {
    // Focus last target widget of the path
    // Parse by tokens '>' keeping last token as target (strip event annotations)
    const parts = pretty.split('>').map((p) => p.trim());
    const last = parts[parts.length - 1] || "";
    const target = last.replace(/\([^)]*\)/g, "");
    if (target) {
      useAppStore.getState().setActiveWidget(target);
    }
  };

  const handleClickStep = (step: { from: string; event?: string; to: string }) => {
    if (step?.to) {
      useAppStore.getState().setActiveWidget(step.to);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-900 px-3 py-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Flow Paths</div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-surface-500" />
            Mostrar eventos
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-slate-900 px-3 py-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filtrar por estado/subflow (ex.: split_1)"
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-surface-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filtrar por evento (ex.: timeout, keypress)"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-surface-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="border-b border-slate-900 px-3 py-2">
        <button
          type="button"
          onClick={() => setShowTypesPanel((v) => !v)}
          className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900"
        >
          {showTypesPanel ? "Ocultar" : "Tipos de widget (auto-sugestão)"}
        </button>
        {showTypesPanel ? (
          <div className="mt-2 max-h-36 space-y-1 overflow-auto rounded border border-slate-800 bg-slate-950/30 p-2">
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
              <span>Excluir tipos</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={() => setExcludeTypes(detectedTypes.join(", "))}
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={() => setExcludeTypes("")}
                >
                  Limpar
                </button>
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-1 pr-1">
              {detectedTypes.length === 0 ? (
                <li className="text-xs text-slate-500">Nenhum tipo detectado.</li>
              ) : (
                detectedTypes.map((t) => {
                  const tokens = new Set(parseList(excludeTypes));
                  const checked = tokens.has(t.toLowerCase());
                  return (
                    <li key={t} className="flex items-center gap-2">
                      <input
                        id={`ex-t-${t}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) tokens.delete(t.toLowerCase());
                          else tokens.add(t.toLowerCase());
                          setExcludeTypes(Array.from(tokens).join(", "));
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-surface-500"
                      />
                      <label htmlFor={`ex-t-${t}`} className="cursor-pointer text-xs text-slate-300">
                        {t}
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-b border-slate-900 px-3 py-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Excluir eventos (ex.: timeout, keypress)"
            value={excludeEvents}
            onChange={(e) => setExcludeEvents(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-surface-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Excluir tipos de widget (ex.: split, gather)"
            value={excludeTypes}
            onChange={(e) => setExcludeTypes(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-surface-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {result.list.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-500">
            Nenhum caminho encontrado.
          </div>
        ) : (
          <ul className="space-y-2 pr-1">
            {result.list.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => handleOpenPath(p.pretty)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950/40 p-2 text-left transition hover:border-slate-700 hover:bg-slate-900/70"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                    <span>Repetições</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">×{p.count}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {p.steps.map((s, idx) => {
                      const label = showEvents && s.event ? `${s.from}(${s.event})>${s.to}` : `${s.from}>${s.to}`;
                      return (
                        <button
                          key={idx}
                          type="button"
                          title="Clique para focar o destino deste passo"
                          onClick={(e) => { e.stopPropagation(); handleClickStep(s); }}
                          className="rounded bg-slate-800/70 px-1.5 py-0.5 text-slate-200 hover:bg-slate-700/80"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-slate-900 px-3 py-1 text-[11px] text-slate-500">
        Total de caminhos (estimado): {result.total}
        {result.truncated ? " · Resultado truncado, refine os filtros." : ""}
      </div>
    </div>
  );
};

export default FlowPathsTab;
