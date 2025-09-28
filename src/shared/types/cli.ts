export type CliResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};
