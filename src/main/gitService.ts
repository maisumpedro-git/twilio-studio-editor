// filepath: c:\coding\twilio-studio-editor\src\main\gitService.ts
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getWorkspaceRoot } from "./constants";

const runGit = (args: string[], cwd: string): Promise<{ success: boolean; stdout: string; stderr: string }> => {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      windowsHide: true
    });
    let out = "";
    let err = "";
    child.stdout?.on("data", (d) => (out += d.toString()));
    child.stderr?.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => resolve({ success: code === 0, stdout: out, stderr: err }));
    child.on("error", (e) => resolve({ success: false, stdout: out, stderr: String(e) }));
  });
};

export const findGitRoot = (startDir?: string): string | null => {
  let dir = path.resolve(startDir || getWorkspaceRoot());
  try {
    while (true) {
      const gitPath = path.join(dir, ".git");
      if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  } catch {
    return null;
  }
};

export const isGitRepo = (dir?: string): boolean => Boolean(findGitRoot(dir));

export const getHeadFileContent = async (absPath: string) => {
  const repoRoot = findGitRoot();
  if (!repoRoot) return { existsInHead: false, content: "" } as const;
  const rel = path.relative(repoRoot, absPath).replace(/\\/g, "/");
  const res = await runGit(["show", `HEAD:${rel}`], repoRoot);
  if (!res.success) {
    return { existsInHead: false, content: "" } as const;
  }
  return { existsInHead: true, content: res.stdout } as const;
};
