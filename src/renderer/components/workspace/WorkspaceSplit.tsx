import { useEffect, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as MonacoEditor from "monaco-editor";
import type { EditorMode, FlowFile } from "@shared/index";
import type { FlowSearchMatch } from "@shared/types";
import { useAppStore } from "@renderer/modules/state/appStore";

export type WorkspaceSplitProps = {
  mode: EditorMode;
  flow?: FlowFile;
  flowId?: string;
  selectedMatch?: FlowSearchMatch;
};

export const WorkspaceSplit = ({ mode, flow, flowId, selectedMatch }: WorkspaceSplitProps) => {
  const updateDocumentJson = useAppStore((s) => s.updateDocumentJson);
  const docJson = useAppStore((s) => (flowId ? s.documents[flowId]?.json : undefined));
  const [jsonDecorations, setJsonDecorations] = useState<string[]>([]);
  const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const setActiveWidget = useAppStore((s) => s.setActiveWidget);
  const [hoverMenu, setHoverMenu] = useState<{
    x: number;
    y: number;
    target: string;
    incoming: string[];
  } | null>(null);

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
        const target = nameMatch[1];
        setActiveWidget(target);
        // Build incoming connections map to show floating menu
        try {
          const currentFlow = flow?.flow;
          const states = currentFlow?.definition?.states || [];
          const incoming = states
            .filter((s) => (s.transitions || []).some((t) => t.next === target))
            .map((s) => s.name)
            .slice(0, 10);
          const { x, y } = e.event.browserEvent as MouseEvent;
          setHoverMenu({ x, y, target, incoming });
          // auto-hide on scroll or after a short delay if desired
        } catch {
          // ignore
        }
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
      {hoverMenu ? (
        <div
          className="pointer-events-auto fixed z-50 rounded-md border border-slate-800 bg-slate-900/95 p-2 text-xs shadow-lg"
          style={{ left: hoverMenu.x + 8, top: hoverMenu.y + 8 }}
          onMouseLeave={() => setHoverMenu(null)}
        >
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
            Conexões para
            <span className="ml-1 rounded bg-slate-800 px-1 py-0.5 text-slate-200">{hoverMenu.target}</span>
          </div>
          {hoverMenu.incoming.length === 0 ? (
            <div className="px-1 py-0.5 text-slate-500">Nenhum widget aponta para este.</div>
          ) : (
            <ul className="max-h-64 w-56 space-y-1 overflow-auto">
              {hoverMenu.incoming.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left text-slate-200 hover:bg-slate-800"
                    onClick={() => {
                      // navigate to the clicked incoming widget definition
                      const editor = editorRef.current;
                      const model = editor?.getModel();
                      if (!editor || !model) return;
                      const pattern = `"name"\\s*:\\s*"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
                      const m = monacoRef.current;
                      if (!m) return;
                      const matches = model.findMatches(pattern + '"', false, true, true, null, true, 1);
                      if (matches.length > 0) {
                        const range = matches[0].range;
                        editor.revealLineInCenter(range.startLineNumber);
                        editor.setPosition({ lineNumber: range.startLineNumber, column: range.startColumn });
                        setActiveWidget(name);
                      }
                      setHoverMenu(null);
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );

  return <div className="relative flex-1 overflow-hidden p-4">{editorPane}</div>;
};

export default WorkspaceSplit;
