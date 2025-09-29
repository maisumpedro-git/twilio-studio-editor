import path from "path";
import { app } from "electron";
import { FLOW_STORAGE_DIR_NAME } from "../shared";
import fs from "fs";

// Simple persistent settings for workspace root
const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");
type Settings = { workspaceRoot?: string };
let settingsCache: Settings | undefined;

const readSettings = (): Settings => {
  if (settingsCache) return settingsCache;
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    settingsCache = JSON.parse(raw);
  } catch {
    settingsCache = {};
  }
  return settingsCache!;
};

const writeSettings = (s: Settings) => {
  settingsCache = s;
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
  } catch (err) {
    console.error("Failed to write settings", err);
  }
};

export const getWorkspaceRoot = () => {
  const s = readSettings();
  return s.workspaceRoot || path.join(app.getPath("userData"), FLOW_STORAGE_DIR_NAME);
};

export const setWorkspaceRoot = (root: string) => {
  const s = readSettings();
  s.workspaceRoot = root;
  writeSettings(s);
};

export const getFlowsDirectory = () => getWorkspaceRoot();

export const FLOW_FILE_EXTENSION = ".json";
