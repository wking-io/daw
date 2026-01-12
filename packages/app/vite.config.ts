import { defineConfig } from "vite";
import dawAppPlugin from "./src/vite.plugin";

export default defineConfig({
	plugins: dawAppPlugin(),
	server: {
		port: 5173,
		strictPort: true,
	},
});
