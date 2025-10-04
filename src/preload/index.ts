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
  searchFlows: (term: string, fileIds?: string[]) => Promise<FlowSearchMatch[]>;
  resolveFlowPath: (fileName: string) => Promise<string>;
  downloadAllFlows: () => Promise<{ success: boolean; message: string; flows: FlowSummary[] }>;
  listRemoteFlows: () => Promise<TwilioFlowDefinition[]>;
  fetchRemoteFlow: (sid: string) => Promise<TwilioFlowDefinition | undefined>;
  chooseDirectory: () => Promise<{ path: string | null }>;
  writeFlowToDirectory: (dir: string, flow: TwilioFlowDefinition) => Promise<{ path: string }>;
  validateFlow: (flow: TwilioFlowDefinition) => Promise<CliResult>;
  publishFlow: (flow: TwilioFlowDefinition) => Promise<CliResult>;
  saveFlowLocally: (flow: TwilioFlowDefinition) => Promise<FlowFile>;
  setActiveWidget: (widgetName?: string) => Promise<boolean>;
  getWorkspaceRoot: () => Promise<{ path: string | null }>;
  chooseWorkspaceRoot: () => Promise<{ path: string | null }>;
  isGitRepo: () => Promise<boolean>;
  getHeadFileContent: (absPath: string) => Promise<{ existsInHead: boolean; content: string }>;
  listEnvFiles: () => Promise<Array<{ name: string; path: string }>>;
  setActiveEnv: (envFileName: string) => Promise<{ success: true }>;
  ensureMigrationTemplate: () => Promise<{ path: string }>;
  getMapping: () => Promise<Record<string, Record<string, string>>>;
  getMappingFlat: () => Promise<Record<string, string>>;
  upsertMapping: (entries: Record<string, string>) => Promise<{ path: string; added: number; updated: number }>;
  fetchSidFriendly: (accountSid?: string, authToken?: string) => Promise<Record<string, string>>;
  readSidFriendly: () => Promise<Record<string, string>>;
  writeSidFriendly: (map: Record<string, string>) => Promise<{ path: string }>;
  generateMappingFromFriendly: (envName: string, sidFriendly: Record<string, string>, baseEnvName?: string) => Promise<{ path: string }>;
};
const api: TwilioStudioAPI = {
  getAppVersion: () => ipcRenderer.sendSync("app/version"),
  listFlows: () => ipcRenderer.invoke("flows:list"),
  openFlow: (filePath) => ipcRenderer.invoke("flows:open", { filePath }),
  saveFlow: (filePath, flow) => ipcRenderer.invoke("flows:save", { filePath, flow }),
  deleteFlow: (filePath) => ipcRenderer.invoke("flows:delete", { filePath }),
  searchFlows: (term, fileIds) => ipcRenderer.invoke("flows:search", { term, fileIds }),
  resolveFlowPath: (fileName) => ipcRenderer.invoke("flows:resolve-path", { fileName }),
  downloadAllFlows: () => ipcRenderer.invoke("twilio:download-all"),
  listRemoteFlows: () => ipcRenderer.invoke("twilio:list-remote-flows"),
  fetchRemoteFlow: (sid) => ipcRenderer.invoke("twilio:fetch-remote-flow", { sid }),
  chooseDirectory: () => ipcRenderer.invoke("workspace:choose-directory"),
  writeFlowToDirectory: (dir, flow) => ipcRenderer.invoke("workspace:write-flow-to-dir", { dir, flow }),
  validateFlow: (flow) => ipcRenderer.invoke("twilio:validate-flow", { flow }),
  publishFlow: (flow) => ipcRenderer.invoke("twilio:publish-flow", { flow }),
  saveFlowLocally: (flow) => ipcRenderer.invoke("twilio:save-flow", { flow }),
  setActiveWidget: (widgetName) => ipcRenderer.invoke("app:set-active-widget", { widgetName }),
  getWorkspaceRoot: () => ipcRenderer.invoke("workspace:get-root"),
  chooseWorkspaceRoot: () => ipcRenderer.invoke("workspace:choose"),
  isGitRepo: () => ipcRenderer.invoke("git:isRepo"),
  getHeadFileContent: (absPath) => ipcRenderer.invoke("git:getHeadFileContent", { absPath }),
  listEnvFiles: () => ipcRenderer.invoke("workspace:list-env-files"),
  setActiveEnv: (envFileName) => ipcRenderer.invoke("workspace:set-active-env", { envFileName }),
  ensureMigrationTemplate: () => ipcRenderer.invoke("workspace:ensure-migration-template"),
  getMapping: () => ipcRenderer.invoke("twilio:get-mapping"),
  getMappingFlat: () => ipcRenderer.invoke("twilio:get-mapping-flat"),
  upsertMapping: (entries) => ipcRenderer.invoke("twilio:upsert-mapping", { entries }),
  fetchSidFriendly: (accountSid?: string, authToken?: string) => ipcRenderer.invoke("twilio:fetch-sid-friendly", { accountSid, authToken }),
  readSidFriendly: () => ipcRenderer.invoke("twilio:read-sid-friendly"),
  writeSidFriendly: (map) => ipcRenderer.invoke("twilio:write-sid-friendly", { map }),
  generateMappingFromFriendly: (envName, sidFriendly, baseEnvName) => ipcRenderer.invoke("twilio:generate-mapping-from-friendly", { envName, sidFriendly, baseEnvName })
};

contextBridge.exposeInMainWorld("twilioStudio", api);

declare global {
  interface Window {
    twilioStudio: TwilioStudioAPI;
  }
}
