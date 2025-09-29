import { contextBridge, ipcRenderer } from "electron";
import type {
  FlowFile,
  FlowSummary,
  FlowSearchMatch,
  TwilioFlowDefinition,
  CliResult
} from "../shared";

export type TwilioStudioAPI = {
  getAppVersion: () => string;
  listFlows: () => Promise<FlowSummary[]>;
  openFlow: (filePath: string) => Promise<FlowFile>;
  saveFlow: (filePath: string, flow: TwilioFlowDefinition) => Promise<FlowFile>;
  deleteFlow: (filePath: string) => Promise<boolean>;
  searchFlows: (term: string) => Promise<FlowSearchMatch[]>;
  resolveFlowPath: (fileName: string) => Promise<string>;
  downloadAllFlows: () => Promise<{ success: boolean; message: string; flows: FlowSummary[] }>;
  validateFlow: (flow: TwilioFlowDefinition) => Promise<CliResult>;
  publishFlow: (flow: TwilioFlowDefinition) => Promise<CliResult>;
  saveFlowLocally: (flow: TwilioFlowDefinition) => Promise<FlowFile>;
  setActiveWidget: (widgetName?: string) => Promise<boolean>;
};

const api: TwilioStudioAPI = {
  getAppVersion: () => ipcRenderer.sendSync("app/version"),
  listFlows: () => ipcRenderer.invoke("flows:list"),
  openFlow: (filePath) => ipcRenderer.invoke("flows:open", { filePath }),
  saveFlow: (filePath, flow) => ipcRenderer.invoke("flows:save", { filePath, flow }),
  deleteFlow: (filePath) => ipcRenderer.invoke("flows:delete", { filePath }),
  searchFlows: (term) => ipcRenderer.invoke("flows:search", { term }),
  resolveFlowPath: (fileName) => ipcRenderer.invoke("flows:resolve-path", { fileName }),
  downloadAllFlows: () => ipcRenderer.invoke("twilio:download-all"),
  validateFlow: (flow) => ipcRenderer.invoke("twilio:validate-flow", { flow }),
  publishFlow: (flow) => ipcRenderer.invoke("twilio:publish-flow", { flow }),
  saveFlowLocally: (flow) => ipcRenderer.invoke("twilio:save-flow", { flow }),
  setActiveWidget: (widgetName) => ipcRenderer.invoke("app:set-active-widget", { widgetName })
};

contextBridge.exposeInMainWorld("twilioStudio", api);

declare global {
  interface Window {
    twilioStudio: TwilioStudioAPI;
  }
}
