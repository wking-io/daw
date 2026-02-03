import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { loadEnv, type Plugin, transformWithEsbuild } from "vite";

function vitePluginRemix(): Plugin {
  return {
    name: "vite-plugin-remix",
    enforce: "pre",
    transform(code, id) {
      if (id.endsWith(".tsx")) {
        return transformWithEsbuild(code, id, {
          loader: "tsx",
          jsx: "automatic",
          jsxImportSource: "remix/component",
        });
      }
      return null;
    },
  };
}

function vitePluginBaseUIRemix(): Plugin {
  return {
    name: "vite-plugin-base-ui-remix",
    enforce: "pre",
    transform(code, id) {
      // Transform @base-ui/remix source files with Remix JSX
      if (id.includes("base-ui/packages/remix") && id.endsWith(".tsx")) {
        return transformWithEsbuild(code, id, {
          loader: "tsx",
          jsx: "automatic",
          jsxImportSource: "remix/component",
        });
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "DAW_");

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      build: {
        outDir: "dist/main",
        rollupOptions: {
          input: {
            index: "src/main/index.ts",
          },
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        outDir: "dist/preload",
        rollupOptions: {
          input: {
            index: "src/preload/index.ts",
          },
          output: {
            format: "cjs",
            entryFileNames: "[name].cjs",
          },
        },
      },
    },
    renderer: {
      root: ".",
      plugins: [vitePluginRemix(), vitePluginBaseUIRemix(), tailwindcss()],
      server: {
        fs: {
          // Allow serving files from the base-ui package
          allow: ["../.."],
        },
      },
      define: {
        __DAW_STATE_PORT__: JSON.stringify(env.DAW_STATE_PORT ?? ""),
        __DAW_STATE_TOKEN__: JSON.stringify(env.DAW_STATE_TOKEN ?? ""),
        __DAW_MCP_PORT__: JSON.stringify(env.DAW_MCP_PORT ?? ""),
      },
      optimizeDeps: {
        exclude: ["@base-ui/remix"],
        force: true, // Force re-bundling deps
      },
      build: {
        outDir: "dist/renderer",
        rollupOptions: {
          input: {
            index: "index.html",
          },
        },
      },
      resolve: {
        alias: {
          "remix/component": "@remix-run/component",
          // Resolve directly to source to avoid bun symlink issues
          "@base-ui/remix": path.resolve(__dirname, "../base-ui/packages/remix/src"),
        },
      },
    },
  };
});
