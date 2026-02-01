import { app } from "electron";
import { loadConfig } from "./config";
import { killAll, startAll } from "./sidecar-manager";
import { createWindow } from "./window-manager";

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Focus the main window if a second instance is launched
    const { getMainWindow } = require("./window-manager");
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const config = loadConfig();

    // Start sidecars before creating window
    await startAll(config);

    // Create the main window
    createWindow();

    app.on("activate", () => {
      // On macOS, re-create window when dock icon is clicked
      const { getMainWindow } = require("./window-manager");
      if (!getMainWindow()) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    // On macOS, apps typically stay active until Cmd+Q
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", async (event) => {
    event.preventDefault();
    console.log("[daw] Application exiting, cleaning up...");
    await killAll();
    app.exit(0);
  });
}
