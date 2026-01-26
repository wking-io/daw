import fs from "node:fs";
import path from "node:path";

const BUNDLING_CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function resolvePackageExport(
	specifier: string,
	rootDir: string,
): string | null {
	const parts = specifier.split("/");
	let packageName: string;
	let subpath: string;

	if (specifier.startsWith("@")) {
		packageName = `${parts[0]}/${parts[1]}`;
		subpath = parts.slice(2).join("/") || ".";
	} else {
		packageName = parts[0] ?? "";
		subpath = parts.slice(1).join("/") || ".";
	}

	const packageJsonPath = path.join(
		rootDir,
		"node_modules",
		packageName,
		"package.json",
	);

	if (!fs.existsSync(packageJsonPath)) {
		return null;
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const exports = packageJson.exports;

	if (exports) {
		const exportEntry = exports[`./${subpath}`] || exports[subpath];
		if (exportEntry) {
			const resolved =
				typeof exportEntry === "string"
					? exportEntry
					: exportEntry.default || exportEntry.import;
			if (resolved) {
				return path.join(
					rootDir,
					"node_modules",
					packageName,
					resolved.replace(/^\.\//, ""),
				);
			}
		}
		if (subpath === "." && exports["."]) {
			const resolved =
				typeof exports["."] === "string"
					? exports["."]
					: exports["."].default || exports["."].import;
			if (resolved) {
				return path.join(
					rootDir,
					"node_modules",
					packageName,
					resolved.replace(/^\.\//, ""),
				);
			}
		}
	}

	const mainField = packageJson.module || packageJson.main;
	if (mainField && subpath === ".") {
		return path.join(
			rootDir,
			"node_modules",
			packageName,
			mainField.replace(/^\.\//, ""),
		);
	}

	return null;
}

export function createBundlingRoutes(rootDir: string) {
	return {
		"/src/*": async (request: Request) => {
			const url = new URL(request.url);
			const filepath = path.join(rootDir, url.pathname);

			if (!fs.existsSync(filepath)) {
				return new Response("Not found", { status: 404 });
			}

			const result = await Bun.build({
				entrypoints: [filepath],
				target: "browser",
				minify: Bun.env.NODE_ENV === "production",
				format: "esm",
				define: {
					"Bun.env.DAW_STATE_PORT": JSON.stringify(
						Bun.env.DAW_STATE_PORT ?? "",
					),
					"Bun.env.DAW_STATE_TOKEN": JSON.stringify(
						Bun.env.DAW_STATE_TOKEN ?? "",
					),
					"Bun.env.DAW_MCP_PORT": JSON.stringify(Bun.env.DAW_MCP_PORT ?? ""),
				},
			});

			if (!result.success) {
				console.error("Bundle error:", result.logs);
				return new Response(`Build failed:\n${result.logs.join("\n")}`, {
					status: 500,
					headers: { "Content-Type": "text/plain" },
				});
			}

			const output = result.outputs[0];
			if (!output) {
				return new Response("No output", { status: 500 });
			}

			return new Response(output, {
				headers: {
					"Content-Type": "application/javascript",
					...BUNDLING_CORS_HEADERS,
				},
			});
		},

		"/node_modules/*": async (request: Request) => {
			const url = new URL(request.url);
			const specifier = url.pathname.replace("/node_modules/", "");
			const resolved = resolvePackageExport(specifier, rootDir);

			if (!resolved || !fs.existsSync(resolved)) {
				return new Response(`Package not found: ${specifier}`, { status: 404 });
			}

			const result = await Bun.build({
				entrypoints: [resolved],
				target: "browser",
				minify: Bun.env.NODE_ENV === "production",
				format: "esm",
			});

			if (!result.success) {
				console.error("Bundle error:", result.logs);
				return new Response(`Build failed:\n${result.logs.join("\n")}`, {
					status: 500,
					headers: { "Content-Type": "text/plain" },
				});
			}

			const output = result.outputs[0];
			if (!output) {
				return new Response("No output", { status: 500 });
			}

			return new Response(output, {
				headers: {
					"Content-Type": "application/javascript",
					...BUNDLING_CORS_HEADERS,
				},
			});
		},
	};
}
