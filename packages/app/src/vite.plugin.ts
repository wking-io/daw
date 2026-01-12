import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";

export default function dawAppPlugin(): PluginOption[] {
	const plugin = react();
	return Array.isArray(plugin) ? plugin : [plugin];
}
