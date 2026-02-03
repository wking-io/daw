import { contextBridge, ipcRenderer } from "electron";

// Expose minimal platform info to renderer
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  arch: process.arch,
  /**
   * Register a callback to be invoked when Cmd/Ctrl+W is pressed.
   * Returns an unsubscribe function.
   */
  onCloseActiveTab: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on("close-active-tab", handler);
    return () => {
      ipcRenderer.removeListener("close-active-tab", handler);
    };
  },
});
