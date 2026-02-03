import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin, transformWithEsbuild } from "vite";

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

export default defineConfig({
  plugins: [vitePluginRemix(), vitePluginBaseUIRemix(), tailwindcss()],
  resolve: {
    alias: {
      "remix/component": "@remix-run/component",
    },
  },
  optimizeDeps: {
    // Don't pre-bundle @base-ui/remix so our JSX transform is applied
    exclude: ["@base-ui/remix"],
  },
  build: {
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["@remix-run/component", "@remix-run/interaction", "effect", "@effect/platform"],
    },
  },
});
