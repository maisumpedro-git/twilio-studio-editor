import path from "path";
import { app } from "electron";
import { FLOW_STORAGE_DIR_NAME } from "../shared";

export const getFlowsDirectory = () => {
  return path.join(app.getPath("userData"), FLOW_STORAGE_DIR_NAME);
};

export const FLOW_FILE_EXTENSION = ".json";
