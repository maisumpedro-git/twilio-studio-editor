import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

import type { CliResult } from "../shared";

const CLI_COMMAND = "twilio";

const isWindows = process.platform === "win32";

// Resolve the executable to use on Windows and allow override via env
const resolveCliExecutable = (): string => {
  // Allow explicit path override for environments where PATH is not set
  const override = process.env.TWILIO_CLI_PATH;
  if (override && override.trim().length > 0) {
    return override;
  }

  if (isWindows) {
    // On Windows, Twilio CLI is commonly available as twilio.cmd or twilio.exe
    // child_process.spawn without shell cannot resolve .cmd via PATHEXT reliably
    // We'll prefer plain command name but switch to shell mode below
    return "twilio";
  }
  return CLI_COMMAND;
};

const collectOutput = (stream: NodeJS.ReadableStream | null | undefined) => {
  let buffer = "";
  if (stream) {
    stream.setEncoding("utf-8");
    stream.on("data", (data: string) => {
      buffer += data;
    });
  }
  return () => buffer;
};

export const executeTwilioCLI = (args: string[], input?: string): Promise<CliResult> => {
  return new Promise((resolve) => {
    const command = resolveCliExecutable();
    const useShell = isWindows; // enable shell on Windows to resolve .cmd properly

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        shell: useShell
      });
    } catch (error) {
      return resolve({
        success: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: null
      });
    }

    const getStdout = collectOutput(child.stdout);
    const getStderr = collectOutput(child.stderr);

    child.on("error", (err) => {
      resolve({ success: false, stdout: getStdout(), stderr: String(err), exitCode: null });
    });

    child.on("close", (code: number | null) => {
      resolve({
        success: code === 0,
        stdout: getStdout(),
        stderr: getStderr(),
        exitCode: code
      });
    });

    // Optional: guard against hung processes (e.g., login prompts)
    const timeoutMs = Number(process.env.TWILIO_CLI_TIMEOUT_MS ?? 0);
    let timeout: NodeJS.Timeout | undefined;
    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        try {
          child.kill();
        } catch {}
        resolve({ success: false, stdout: getStdout(), stderr: "Twilio CLI timed out", exitCode: null });
      }, timeoutMs);
      child.on("close", () => timeout && clearTimeout(timeout));
      child.on("error", () => timeout && clearTimeout(timeout));
    }

    if (input && child.stdin) {
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
