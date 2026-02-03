import { join } from "node:path";
import { BrowserWindow, Menu } from "electron";
import { setupMenu } from "./menu";

let mainWindow: BrowserWindow | null = null;

export function createWindow(): BrowserWindow {
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set up menu with zoom controls
  setupMenu(mainWindow);

  // Set up right-click context menu with Inspect Element (dev only)
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.webContents.on("context-menu", (_event, params) => {
      Menu.buildFromTemplate([
        {
          label: "Inspect Element",
          click: () => {
            mainWindow?.webContents.inspectElement(params.x, params.y);
          },
        },
      ]).popup();
    });
  }

  // Maximize and show when ready
  mainWindow.on("ready-to-show", () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  // Load the app
  if (process.env.ELECTRON_RENDERER_URL) {
    // Development: load from Vite dev server
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // Production: load bundled HTML
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
