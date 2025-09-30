import { APP_NAME } from "./constants";
import type { FlowSearchMatch } from "./types";

export const APPLICATION_TECH_STACK = [
  "Electron 38.1.2",
  "React 18",
  "TypeScript 5",
  "Monaco Editor",
  "Tailwind CSS",
  "Zustand",
  "Twilio REST API"
] as const;

export const APPLICATION_DESIGN_GUIDELINES = [
  "Visual inspirado em IDEs modernas (VS Code)",
  "Layout escuro com alto contraste e tipografia limpa",
  "Componentes com espaçamento consistente e hierarquia clara",
  "Interações rápidas mesmo em fluxos complexos",
  "Extensibilidade para futuras automações e integrações"
] as const;

export type EditorMode = "json";
export type SidebarMode = "explorer" | "global-search";

export const APPLICATION_STATE_BLUEPRINT = {
  sidebarMode: "explorer" as SidebarMode,
  editorMode: "json" as EditorMode,
  flows: [] as unknown[],
  activeFlowId: undefined as string | undefined,
  activeWidgetName: undefined as string | undefined,
  globalSearchTerm: "",
  globalSearchResults: [] as unknown[],
  isSearching: false,
  isFetching: false,
  selectedSearchMatch: undefined as FlowSearchMatch | undefined,
  toast: undefined as undefined | {
    intent: "success" | "error" | "info";
    message: string;
  }
};

export const APP_MANIFEST = {
  name: APP_NAME,
  description:
    "Editor especializado para fluxos do Twilio Studio com sincronização JSON e busca avançada.",
  technologies: APPLICATION_TECH_STACK,
  designGuidelines: APPLICATION_DESIGN_GUIDELINES,
  defaultState: APPLICATION_STATE_BLUEPRINT
};

export type AppManifest = typeof APP_MANIFEST;
