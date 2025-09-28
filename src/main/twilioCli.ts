import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

import type { CliResult } from "../shared";

const CLI_COMMAND = process.platform === "win32" ? "twilio.cmd" : "twilio";

const collectOutput = (stream: NodeJS.ReadableStream) => {
  let buffer = "";
  stream.setEncoding("utf-8");
  stream.on("data", (data: string) => {
    buffer += data;
  });
  return () => buffer;
};

export const executeTwilioCLI = (args: string[], input?: string): Promise<CliResult> => {
  return new Promise((resolve) => {
    const child = spawn(CLI_COMMAND, args, {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });

    const getStdout = collectOutput(child.stdout);
    const getStderr = collectOutput(child.stderr);

    child.on("close", (code: number | null) => {
      resolve({
        success: code === 0,
        stdout: getStdout(),
        stderr: getStderr(),
        exitCode: code
      });
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
};

export const withTempFlowFile = async (content: string) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "twilio-flow-"));
  const filePath = path.join(tmpDir, `${randomUUID()}.json`);
  await fs.writeFile(filePath, content, "utf-8");
  return {
    path: filePath,
    cleanup: async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  };
};
