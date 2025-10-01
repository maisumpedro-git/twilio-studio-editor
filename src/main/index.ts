import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import type { HandlerDetails, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import path from "path";
import fs from "fs";

import {
  listFlowSummaries,
  readFlowFile,
  writeFlowFile,
  deleteFlowFile,
  resolveFlowPath
} from "./fsService";
import { getFlowsDirectory, setWorkspaceRoot, getWorkspaceRoot } from "./constants";
import { searchInFlows } from "./searchService";
import { downloadAllFlows, publishFlow, saveFlowLocally, validateFlow } from "./cliService";
import { getHeadFileContent, isGitRepo } from "./gitService";
import { listEnvFiles, setActiveEnv, ensureMigrationTemplate } from "./workspaceService";
import { readCurrentMapping, flattenMapping, upsertMapping } from "./mappingService";
import { fetchSidFriendlyMap, writeSidFriendlyMap, readSidFriendlyMap } from "./accountDataService";
import type { FlowSummary, FlowFile, TwilioFlowDefinition } from "../shared";

const isDev = process.env.NODE_ENV === "development";
const preloadCandidates = [
  path.join(__dirname, "../preload/index.js"),
  path.join(__dirname, "../../preload/preload/index.js")
];

const preloadPath = preloadCandidates.find((candidate) => fs.existsSync(candidate)) ??
  preloadCandidates[1];

const createMainWindow = async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    backgroundColor: "#0b1120",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
      nodeIntegration: false,
      spellcheck: false,
      zoomFactor: 1
    }
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    await window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(__dirname, "../renderer/index.html");
    await window.loadFile(indexHtml);
  }

  window.webContents.setWindowOpenHandler((details: HandlerDetails) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
};

const ensureRuntimeDirectories = () => {
  const directory = getFlowsDirectory();
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const registerHandler = <Payload, Response>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, payload: Payload) => Promise<Response> | Response
) => {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: Payload) => {
    try {
      return await handler(event, payload);
    } catch (error) {
      console.error(`IPC handler failed for ${channel}`, error);
      throw error;
    }
  });
};

const registerIpcHandlers = () => {
  ipcMain.on("app/version", (event: IpcMainEvent) => {
    event.returnValue = app.getVersion();
  });

  registerHandler("flows:list", async () => listFlowSummaries());

  registerHandler<{ filePath: string }, FlowFile>("flows:open", async (_event, payload) => {
    return readFlowFile(payload.filePath);
  });

  registerHandler<{ filePath: string; flow: TwilioFlowDefinition }, FlowFile>(
    "flows:save",
    async (_event, payload) => {
      return writeFlowFile(payload.filePath, payload.flow);
    }
  );

  registerHandler<{ filePath: string }, boolean>("flows:delete", async (_event, payload) => {
    await deleteFlowFile(payload.filePath);
    return true;
  });

  registerHandler<{ term: string; fileIds?: string[] }, Awaited<ReturnType<typeof searchInFlows>>>(
    "flows:search",
    async (_event, payload) => {
      return searchInFlows(payload.term, payload.fileIds);
    }
  );
  registerHandler<unknown, { path: string | null }>("workspace:get-root", async () => {
    return { path: getWorkspaceRoot() };
  });

  registerHandler<unknown, { path: string | null }>("workspace:choose", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    if (result.canceled || result.filePaths.length === 0) {
      return { path: null };
    }
    const root = result.filePaths[0];
    setWorkspaceRoot(root);
    return { path: root };
  });

  // No-op placeholder for future main-process support if needed
  registerHandler<{ widgetName?: string }, boolean>("app:set-active-widget", async () => true);

  registerHandler<{ fileName: string }, string>("flows:resolve-path", async (_event, payload) => {
    return resolveFlowPath(payload.fileName);
  });

  registerHandler<unknown, Awaited<ReturnType<typeof downloadAllFlows>>>(
    "twilio:download-all",
    async () => downloadAllFlows()
  );

  registerHandler<{ flow: TwilioFlowDefinition }, Awaited<ReturnType<typeof validateFlow>>>(
    "twilio:validate-flow",
    async (_event, payload) => validateFlow(payload.flow)
  );

  registerHandler<{ flow: TwilioFlowDefinition }, Awaited<ReturnType<typeof publishFlow>>>(
    "twilio:publish-flow",
    async (_event, payload) => publishFlow(payload.flow)
  );

  registerHandler<{ flow: TwilioFlowDefinition }, Awaited<ReturnType<typeof saveFlowLocally>>>(
    "twilio:save-flow",
    async (_event, payload) => saveFlowLocally(payload.flow)
  );

  // Workspace settings helpers
  registerHandler<unknown, Awaited<ReturnType<typeof listEnvFiles>>>(
    "workspace:list-env-files",
    async () => listEnvFiles()
  );
  registerHandler<{ envFileName: string }, { success: true }>(
    "workspace:set-active-env",
    async (_event, payload) => setActiveEnv(payload.envFileName)
  );
  registerHandler<unknown, Awaited<ReturnType<typeof ensureMigrationTemplate>>>(
    "workspace:ensure-migration-template",
    async () => ensureMigrationTemplate()
  );
  // Read mapping for current env
  registerHandler<unknown, Awaited<ReturnType<typeof readCurrentMapping>>>(
    "twilio:get-mapping",
    async () => readCurrentMapping()
  );
  registerHandler<unknown, Awaited<ReturnType<typeof flattenMapping>>>(
    "twilio:get-mapping-flat",
    async () => flattenMapping(readCurrentMapping())
  );
  registerHandler<{ entries: Record<string, string> }, Awaited<ReturnType<typeof upsertMapping>>>(
    "twilio:upsert-mapping",
    async (_e, payload) => upsertMapping(payload.entries)
  );

  // SID→friendly map helpers
  registerHandler<unknown, Record<string, string>>("twilio:fetch-sid-friendly", async () => fetchSidFriendlyMap());
  registerHandler<{ map: Record<string, string> }, { path: string }>("twilio:write-sid-friendly", async (_e, p) => ({ path: await writeSidFriendlyMap(p.map) }));
  registerHandler<unknown, Record<string, string>>("twilio:read-sid-friendly", async () => readSidFriendlyMap());

  // Git integration
  registerHandler<unknown, boolean>("git:isRepo", async () => {
    try {
      return isGitRepo();
    } catch {
      return false;
    }
  });
  registerHandler<{ absPath: string }, Awaited<ReturnType<typeof getHeadFileContent>>>(
    "git:getHeadFileContent",
    async (_event, payload) => getHeadFileContent(payload.absPath)
  );
};

app.whenReady().then(async () => {
  ensureRuntimeDirectories();
  registerIpcHandlers();
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
