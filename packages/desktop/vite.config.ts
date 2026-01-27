import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin, transformWithEsbuild } from "vite";

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

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "DAW_");

	return {
		plugins: [vitePluginRemix(), tailwindcss()],
		define: {
			__DAW_STATE_PORT__: JSON.stringify(env.DAW_STATE_PORT ?? ""),
			__DAW_STATE_TOKEN__: JSON.stringify(env.DAW_STATE_TOKEN ?? ""),
			__DAW_MCP_PORT__: JSON.stringify(env.DAW_MCP_PORT ?? ""),
		},
		server: {
			port: 1420,
			strictPort: true,
		},
		build: {
			outDir: "dist",
			emptyOutDir: true,
		},
		resolve: {
			alias: {
				"remix/component": "@remix-run/component",
			},
		},
	};
});
