import { contextBridge } from "electron";

// Expose minimal platform info to renderer
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  arch: process.arch,
});
