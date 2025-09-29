import type { FlowSearchMatch, TwilioFlowDefinition, TwilioWidget } from "../shared";
import { listFlowSummaries, readFlowFile } from "./fsService";

const CONTEXT_RADIUS = 48;

const buildRegex = (term: string) => {
  try {
    return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  } catch {
    return new RegExp(term, "gi");
  }
};

const locateWidgetForMatch = (flow: TwilioFlowDefinition, matchText: string): TwilioWidget | undefined => {
  const lowerMatch = matchText.toLowerCase();
  return flow.definition.states.find((state) => {
    return JSON.stringify(state).toLowerCase().includes(lowerMatch);
  });
};

const indexToLocation = (source: string, index: number) => {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index; i += 1) {
    if (source[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
};

export const searchInFlows = async (term: string): Promise<FlowSearchMatch[]> => {
  const trimmed = term.trim();
  if (!trimmed) {
    return [];
  }

  const regex = buildRegex(trimmed);
  const summaries = await listFlowSummaries();
  const matches: FlowSearchMatch[] = [];

  for (const summary of summaries) {
    try {
      const file = await readFlowFile(summary.filePath);
      const source = JSON.stringify(file.flow, null, 2);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(source)) !== null) {
        if (!match[0]) {
          continue;
        }
        const index = match.index;
        const previewStart = Math.max(0, index - CONTEXT_RADIUS);
        const previewEnd = Math.min(source.length, index + match[0].length + CONTEXT_RADIUS);
  const preview = source.slice(previewStart, previewEnd).replace(/\s+/g, " ").trim();
        const { line, column } = indexToLocation(source, index);
  const widget = locateWidgetForMatch(file.flow, match[0]);

        matches.push({
          fileId: summary.id,
          fileName: summary.fileName,
          matchedText: match[0],
          path: `${summary.fileName}:${line}:${column}`,
          line,
          column,
          preview,
          widgetName: widget?.name,
          widgetType: widget?.type
        });
      }
    } catch (error) {
      console.error(`Failed to search flow ${summary.fileName}`, error);
    }
  }

  matches.sort((a, b) => a.fileName.localeCompare(b.fileName) || a.line - b.line);
  return matches;
};
