import dawAppPlugin from "@daw/app/vite.plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: dawAppPlugin(),
	server: {
		port: 1420,
		strictPort: true,
	},
});
