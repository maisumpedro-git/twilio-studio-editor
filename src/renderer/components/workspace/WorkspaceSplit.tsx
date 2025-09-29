import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as MonacoEditor from "monaco-editor";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";

import type { EditorMode, FlowFile, TwilioWidget } from "@shared/index";
import type { FlowSearchMatch } from "@shared/types";
import { useAppStore } from "@renderer/modules/state/appStore";

export type WorkspaceSplitProps = {
  mode: EditorMode;
  flow?: FlowFile;
  flowId?: string;
  selectedMatch?: FlowSearchMatch;
};

const buildGraph = (flow?: FlowFile) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  if (!flow) return { nodes, edges };

  const states: TwilioWidget[] = flow.flow.definition?.states || [];
  // Simple grid layout
  const cols = Math.ceil(Math.sqrt(states.length || 1));
  states.forEach((state, idx) => {
    const x = (idx % cols) * 220;
    const y = Math.floor(idx / cols) * 140;
    nodes.push({ id: state.name, position: { x, y }, data: { label: state.name }, type: "default" });
    (state.transitions || []).forEach((t) => {
      if (t.next) {
        edges.push({ id: `${state.name}->${t.next}-${idx}`, source: state.name, target: t.next });
      }
    });
  });
  return { nodes, edges };
};

export const WorkspaceSplit = ({ mode, flow, flowId, selectedMatch }: WorkspaceSplitProps) => {
  const updateDocumentJson = useAppStore((s) => s.updateDocumentJson);
  const docJson = useAppStore((s) => (flowId ? s.documents[flowId]?.json : undefined));
  const [jsonDecorations, setJsonDecorations] = useState<string[]>([]);
  const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const activeWidgetName = useAppStore((s) => s.activeWidgetName);
  const setActiveWidget = useAppStore((s) => s.setActiveWidget);

  // Prepare React Flow graph
  const graph = useMemo(() => buildGraph(flow), [flow]);
  const highlightedWidget = activeWidgetName || selectedMatch?.widgetName;
  const nodes = useMemo(() => {
    if (!highlightedWidget) return graph.nodes;
    return graph.nodes.map((n) =>
      n.id === highlightedWidget
        ? { ...n, style: { border: "2px solid #38bdf8", background: "#0b1220" } }
        : n
    );
  }, [graph.nodes, highlightedWidget]);

  // Monaco: decorate selection from search match
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    // clear old decorations
    setJsonDecorations((prev) => editor.deltaDecorations(prev, []));
    if (!selectedMatch) return;

    const startLine = Math.max(1, selectedMatch.line);
    const startColumn = Math.max(1, selectedMatch.column);
    const endColumn = startColumn + (selectedMatch.matchedText?.length || 1);
    const m = monacoRef.current;
    if (!m) return;
    const newDecos = editor.deltaDecorations([], [
      {
        range: new m.Range(startLine, startColumn, startLine, endColumn),
        options: {
          className: "tw-search-highlight",
          isWholeLine: false,
          stickiness: 1
        }
      }
    ]);
    setJsonDecorations(newDecos);
    editor.revealLineInCenter(startLine);
  }, [selectedMatch]);

  // JSON editor: click on "next": "WidgetX" navigates to widget definition
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const findWidgetLocation = (name: string) => {
      const m = monacoRef.current;
      if (!m) return undefined;
      const pattern = `"name"\\s*:\\s*"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`;
      const matches = model.findMatches(pattern, false, true, true, null, true, 1);
      if (matches.length > 0) {
        return matches[0].range;
      }
      return undefined;
    };

      const handler = (e: MonacoEditor.editor.IEditorMouseEvent) => {
        // Only navigate on Ctrl+Click
        if (!e.event.ctrlKey) return;
      const pos = e.target.position;
      if (!pos) return;
      const lineText = model.getLineContent(pos.lineNumber);
        // Case 1: clicking "next": "WidgetX"
        const nextMatch = lineText.match(/"next"\s*:\s*"([^"]+)"/);
        if (nextMatch) {
          const widget = nextMatch[1];
          const loc = findWidgetLocation(widget);
          if (loc) {
            editor.revealLineInCenter(loc.startLineNumber);
            editor.setPosition({ lineNumber: loc.startLineNumber, column: loc.startColumn });
            setActiveWidget(widget);
          }
          return;
        }
        // Case 2: clicking on a widget name line: "name": "WidgetX"
        const nameMatch = lineText.match(/"name"\s*:\s*"([^"]+)"/);
        if (nameMatch) {
          setActiveWidget(nameMatch[1]);
        }
    };

    const disposable = editor.onMouseDown(handler);
    return () => disposable.dispose();
  }, [docJson, setActiveWidget]);

  const onJsonChange = (value?: string) => {
    if (!flowId || typeof value !== "string") return;
    updateDocumentJson(flowId, value);
  };

  const editorPane = (
    <div className="h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
      <Editor
        height="100%"
        defaultLanguage="json"
        theme="vs-dark"
        value={typeof docJson === "string" ? docJson : flow ? JSON.stringify(flow.flow, null, 2) : ""}
        onChange={onJsonChange}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
        }}
        options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
      />
    </div>
  );

  const graphPane = (
    <div className="h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
      <ReactFlow
        nodes={nodes}
        edges={graph.edges}
        fitView
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
      >
        <Background gap={16} color="#1f2937" />
        <MiniMap zoomable pannable />
        <Controls />
      </ReactFlow>
    </div>
  );

  // Center graph on highlighted widget
  useEffect(() => {
    if (!highlightedWidget || !reactFlowRef.current) return;
    const rf = reactFlowRef.current;
    const currentNodes = rf.getNodes();
    const node = currentNodes.find((n) => n.id === highlightedWidget);
    if (node) {
      const x = node.position.x + (node.width ? node.width / 2 : 100);
      const y = node.position.y + (node.height ? node.height / 2 : 30);
      rf.setCenter(x, y, { zoom: 1.2, duration: 400 });
    }
  }, [highlightedWidget]);

  const content = (() => {
    if (mode === "json") {
      // Focused editor should consume the entire right area
      return <div className="relative z-10 h-full">{editorPane}</div>;
    }
    if (mode === "graph") {
      return <div className="relative z-10 h-full">{graphPane}</div>;
    }
    // split
    return (
      <div className="relative z-10 grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
        {editorPane}
        {graphPane}
      </div>
    );
  })();

  return <div className="relative flex-1 overflow-hidden p-4">{content}</div>;
};

export default WorkspaceSplit;
