import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "electron-vite";
import { loadEnv, type Plugin, transformWithEsbuild } from "vite";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function vitePluginRemix(): Plugin {
  return {
    name: "vite-plugin-remix",
    enforce: "pre",
    transform(code, id) {
      if (id.endsWith(".tsx")) {
        return transformWithEsbuild(code, id, {
          loader: "tsx",
          jsx: "automatic",
          jsxImportSource: "@remix-run/component",
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
      build: {
        externalizeDeps: true,
        outDir: "dist/main",
        rollupOptions: {
          input: {
            index: "src/main/index.ts",
          },
        },
      },
    },
    preload: {
      build: {
        externalizeDeps: true,
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
      plugins: [vitePluginRemix(), tailwindcss()],
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
          "@app": resolve(repoRoot, "packages/app/src"),
          "@ui": resolve(repoRoot, "packages/ui/src"),
          "@utils": resolve(repoRoot, "packages/utils/src"),
          "@core": resolve(repoRoot, "packages/core/src"),
        },
      },
    },
  };
});
