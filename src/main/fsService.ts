import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { getFlowsDirectory, FLOW_FILE_EXTENSION } from "./constants";
import type { FlowFile, FlowSummary, TwilioFlowDefinition } from "../shared";

const generateFileId = (filePath: string) => crypto.createHash("sha1").update(filePath).digest("hex");

const sanitizeName = (name: string) =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "flow";

export const buildFlowFileName = (friendlyName: string, sid?: string) => {
  const base = sanitizeName(friendlyName || "flow");
  const suffix = sid ? `-${sid}` : "";
  return `${base}${suffix}${FLOW_FILE_EXTENSION}`;
};

export const resolveFlowPath = (fileName: string) => {
  const directory = getFlowsDirectory();
  const sanitized = fileName.endsWith(FLOW_FILE_EXTENSION)
    ? fileName
    : `${fileName}${FLOW_FILE_EXTENSION}`;
  return path.join(directory, sanitized);
};

export const listFlowSummaries = async (): Promise<FlowSummary[]> => {
  const directory = getFlowsDirectory();
  await fs.mkdir(directory, { recursive: true });
  const entries = await fs.readdir(directory, { withFileTypes: true });

  const summaries: FlowSummary[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(FLOW_FILE_EXTENSION)) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    try {
      const stat = await fs.stat(fullPath);
      const fileContents = await fs.readFile(fullPath, "utf-8");
      const parsed: TwilioFlowDefinition = JSON.parse(fileContents);

      summaries.push({
        id: generateFileId(fullPath),
        fileName: entry.name,
        filePath: fullPath,
        updatedAt: stat.mtimeMs,
        friendlyName: parsed?.friendly_name ?? entry.name.replace(FLOW_FILE_EXTENSION, ""),
        hasSid: Boolean(parsed?.sid)
      });
    } catch (error) {
      console.error(`Failed to parse flow file ${fullPath}`, error);
    }
  }

  summaries.sort((a, b) => b.updatedAt - a.updatedAt);
  return summaries;
};

export const readFlowFile = async (filePath: string): Promise<FlowFile> => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : resolveFlowPath(filePath);
  const fileContents = await fs.readFile(absolutePath, "utf-8");
  const stat = await fs.stat(absolutePath);
  const flow: TwilioFlowDefinition = JSON.parse(fileContents);

  return {
    id: generateFileId(absolutePath),
    fileName: path.basename(absolutePath),
    filePath: absolutePath,
    updatedAt: stat.mtimeMs,
    flow
  };
};

export const writeFlowFile = async (filePath: string, flow: TwilioFlowDefinition) => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : resolveFlowPath(filePath);
  const directory = path.dirname(absolutePath);
  await fs.mkdir(directory, { recursive: true });
  const content = `${JSON.stringify(flow, null, 2)}\n`;
  await fs.writeFile(absolutePath, content, "utf-8");

  return readFlowFile(absolutePath);
};

export const deleteFlowFile = async (filePath: string) => {
  const absolutePath = path.isAbsolute(filePath) ? filePath : resolveFlowPath(filePath);
  await fs.rm(absolutePath, { force: true });
};
