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

export default defineConfig({
  plugins: [vitePluginRemix(), tailwindcss()],
  resolve: {
    alias: {
      "@app/*": "./src/*",
      "@ui/*": "@daw/ui/src/*",
      "@utils/*": "@daw/utils/src/*",
      "@core/*": "@daw/core/src/*",
    },
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
