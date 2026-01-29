#!/usr/bin/env bun

// Standalone migration runner
// Usage: bun run scripts/migrate.ts
// Or with custom DB: DB_PATH=./test.db bun run scripts/migrate.ts
// Add --clean to delete existing database before migrating

import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { getDefaultDBLocation } from "../src/db/get-default-db-location";

const migrationsPath = resolve(import.meta.dirname, "../migrations");
const dbPath = Bun.env.DB_PATH
	? resolve(Bun.env.DB_PATH)
	: getDefaultDBLocation();

const shouldClean = Bun.argv.includes("--clean");

const program = Effect.gen(function* () {
	console.log(`Database: ${dbPath}`);
	console.log("Running database migrations...");

	const migrations = yield* SqliteMigrator.run({
		loader: SqliteMigrator.fromFileSystem(migrationsPath),
		schemaDirectory: "migrations",
	});

	if (migrations.length === 0) {
		console.log("No new migrations to apply");
	} else {
		for (const [id, name] of migrations) {
			console.log(`Applied: ${id}_${name}`);
		}
		console.log(`Applied ${migrations.length} migration(s)`);
	}
});

// Clean existing database if --clean flag is provided
if (shouldClean) {
	const filesToDelete = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
	for (const file of filesToDelete) {
		if (existsSync(file)) {
			console.log(`Deleting: ${file}`);
			await rm(file);
		}
	}
}

// Ensure DB directory exists, then run migrations
await mkdir(dirname(dbPath), { recursive: true });

BunRuntime.runMain(
	program.pipe(
		Effect.provide(
			Layer.merge(BunContext.layer, SqliteClient.layer({ filename: dbPath })),
		),
	),
);
