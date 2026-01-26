#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import { createBundlingRoutes } from "./bundling";

const rootDir = path.resolve(import.meta.dirname, "..");
const port = Number.parseInt(Bun.env.DEV_PORT ?? "1420", 10);

const bundlingRoutes = createBundlingRoutes(rootDir);

function serveStatic(filepath: string): Response | null {
	if (!fs.existsSync(filepath)) {
		return null;
	}

	const ext = path.extname(filepath).toLowerCase();
	const contentTypes: Record<string, string> = {
		".html": "text/html",
		".css": "text/css",
		".js": "application/javascript",
		".json": "application/json",
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".svg": "image/svg+xml",
		".ico": "image/x-icon",
		".woff": "font/woff",
		".woff2": "font/woff2",
		".ttf": "font/ttf",
	};

	const content = fs.readFileSync(filepath);
	return new Response(content, {
		headers: {
			"Content-Type": contentTypes[ext] ?? "application/octet-stream",
		},
	});
}

const server = Bun.serve({
	port,
	async fetch(request) {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// Handle bundling routes first
		if (pathname.startsWith("/src/")) {
			const handler = bundlingRoutes["/src/*"];
			if (handler) {
				return handler(request);
			}
		}

		if (pathname.startsWith("/node_modules/")) {
			const handler = bundlingRoutes["/node_modules/*"];
			if (handler) {
				return handler(request);
			}
		}

		// Serve static files from public directory
		const publicPath = path.join(rootDir, "public", pathname);
		const publicResponse = serveStatic(publicPath);
		if (publicResponse) {
			return publicResponse;
		}

		// Serve index.html for root and SPA fallback
		const indexPath = path.join(rootDir, "index.html");
		if (fs.existsSync(indexPath)) {
			const content = fs.readFileSync(indexPath, "utf8");
			return new Response(content, {
				headers: { "Content-Type": "text/html" },
			});
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Dev server running at http://localhost:${server.port}`);
