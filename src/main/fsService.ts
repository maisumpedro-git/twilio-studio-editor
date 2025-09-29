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
  // Requirement: filename must be exactly the SID when available
  if (sid && sid.trim().length > 0) {
    return `${sid}${FLOW_FILE_EXTENSION}`;
  }
  // Fallback: sanitized friendly name, else a generic name
  const base = sanitizeName(friendlyName || "flow");
  return `${base}${FLOW_FILE_EXTENSION}`;
};

export const resolveFlowPath = (fileName: string) => {
  const directory = getFlowsDirectory();
  const sanitized = fileName.endsWith(FLOW_FILE_EXTENSION)
    ? fileName
    : `${fileName}${FLOW_FILE_EXTENSION}`;
  return path.join(directory, sanitized);
};

export const listFlowSummaries = async (): Promise<FlowSummary[]> => {
  const root = getFlowsDirectory();
  await fs.mkdir(root, { recursive: true });
  const summaries: FlowSummary[] = [];

  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(FLOW_FILE_EXTENSION)) continue;
      try {
        const stat = await fs.stat(fullPath);
        const fileContents = await fs.readFile(fullPath, "utf-8");
        const parsed: TwilioFlowDefinition = JSON.parse(fileContents);
        summaries.push({
          id: generateFileId(fullPath),
          fileName: path.relative(root, fullPath),
          filePath: fullPath,
          updatedAt: stat.mtimeMs,
          friendlyName: parsed?.friendlyName ?? path.basename(fullPath).replace(FLOW_FILE_EXTENSION, ""),
          hasSid: Boolean(parsed?.sid),
          sid: parsed?.sid
        });
      } catch (error) {
        console.error(`Failed to parse flow file ${fullPath}`, error);
      }
    }
  };

  await walk(root);

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
