import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { ProjectCreateCommand, ProjectDeleteCommand } from "@daw/core/commands/command";
import type { EditorCommand } from "@daw/core/commands/editor-ops";
import * as Ids from "@daw/core/ids";
import * as Versions from "@daw/core/versions";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const serverRoot = new URL("..", import.meta.url).pathname;

const setupDatabase = (dbPath: string) => {
  const db = new Database(dbPath);
  db.run(`
		CREATE TABLE IF NOT EXISTS snapshots (
			id TEXT NOT NULL,
			name TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		)
	`);
  db.run(`
		CREATE TABLE IF NOT EXISTS events (
			id TEXT NOT NULL,
			version INTEGER NOT NULL,
			data TEXT NOT NULL,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id, version)
		)
	`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_id_version ON snapshots(id, version)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_id_version ON events(id, version)`);
  db.close();
};

interface ProjectResponse {
  id: string;
  name: string;
  version: number;
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  tracks: unknown[];
  clips: unknown[];
  midiPatterns: unknown[];
  automationLanes: unknown[];
  audioFiles: unknown[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSummaryResponse {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const readStreamText = async (stream: ReadableStream | number | undefined | null) => {
  if (!stream || typeof stream === "number") return "";
  try {
    return await new Response(stream).text();
  } catch {
    return "";
  }
};

const waitForServer = async (
  baseUrl: string,
  timeoutMs = 5000,
  child?: ReturnType<typeof Bun.spawn> | null,
) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child && child.exitCode !== null) {
      const stderr = await readStreamText(child.stderr);
      throw new Error(`Server exited early: ${child.exitCode}\n${stderr}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // ignore until ready
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for server to start");
};

describe("HTTP e2e", () => {
  let child: ReturnType<typeof Bun.spawn> | null = null;
  let baseUrl = "";
  let dbDir = "";
  let authToken = "";
  let testProjectId: Ids.ProjectId;

  beforeAll(async () => {
    dbDir = await mkdtemp(join(tmpdir(), "daw-server-"));
    const port = 43125 + Math.floor(Math.random() * 1000);
    baseUrl = `http://127.0.0.1:${port}`;
    authToken = "e2e-test-token";
    testProjectId = Ids.generate("ProjectId");

    const dbPath = join(dbDir, "state.db");
    setupDatabase(dbPath);

    child = Bun.spawn(["bun", "run", "src/index.ts"], {
      cwd: serverRoot,
      env: {
        ...process.env,
        DAW_STATE_PORT: String(port),
        DAW_STATE_DB: join(dbDir, "state.db"),
        DAW_STATE_TOKEN: authToken,
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    await waitForServer(baseUrl, 20000, child);
  });

  afterAll(async () => {
    if (child) {
      child.kill();
      child = null;
    }
    if (dbDir) {
      await rm(dbDir, { recursive: true, force: true });
    }
  });

  it("GET /api/health returns healthy status", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.ok).toBe(true);
    const json = (await res.json()) as { healthy: boolean; version: string };
    expect(json.healthy).toBe(true);
    expect(typeof json.version).toBe("string");
  }, 20000);

  it("GET /api/projects returns empty list for new database", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok).toBe(true);
    const projects = (await res.json()) as ProjectSummaryResponse[];
    expect(projects).toHaveLength(0);
  }, 20000);

  it("POST /api/projects creates a new project", async () => {
    const command: ProjectCreateCommand = {
      id: Ids.generate("CommandId"),
      expectedVersion: Versions.ProjectVersion.make(0),
      actor: "ui",
      payload: {
        t: "project.create",
        projectId: testProjectId,
        name: "E2E Test Project",
      },
    };

    const res = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      console.error("Create response not ok:", res.status, await res.text());
    }
    expect(res.ok).toBe(true);
    const project = (await res.json()) as ProjectResponse;
    expect(project.id).toBe(testProjectId);
    expect(project.name).toBe("E2E Test Project");
    expect(project.version).toBe(0);
  }, 20000);

  it("GET /api/projects/:projectId returns the project", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!res.ok) {
      console.error("Get response not ok:", res.status, await res.text());
    }
    expect(res.ok).toBe(true);
    const project = (await res.json()) as ProjectResponse;
    expect(project.id).toBe(testProjectId);
    expect(project.name).toBe("E2E Test Project");
  }, 20000);

  it("POST /api/projects/:projectId/edit executes an edit command", async () => {
    const getRes = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const currentProject = (await getRes.json()) as ProjectResponse;

    const command: EditorCommand = {
      id: Ids.generate("CommandId"),
      expectedVersion: currentProject.version as Versions.ProjectVersion,
      actor: "ui",
      payload: {
        t: "project.rename",
        name: "E2E Renamed Project",
      },
    };

    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/edit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(command),
    });

    expect(res.ok).toBe(true);
    const project = (await res.json()) as ProjectResponse;
    expect(project.name).toBe("E2E Renamed Project");
    expect(project.version).toBe(1);
  }, 20000);

  it("GET /api/events/subscribe returns event stream", async () => {
    const res = await fetch(
      `${baseUrl}/api/events/subscribe?fromVersion=0&projectId=${testProjectId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();
    if (!reader) throw new Error("Reader is null");

    // Read first chunk (should be server.subscribed event)
    const { value, done } = await reader.read();
    expect(done).toBe(false);

    const text = new TextDecoder().decode(value);
    expect(text).toContain("data:");
    expect(text).toContain("server.subscribed");

    await reader.cancel();
  }, 20000);

  it("subscribe streams events when project is edited", async () => {
    const streamProjectId = Ids.generate("ProjectId");

    const createCommand: ProjectCreateCommand = {
      id: Ids.generate("CommandId"),
      expectedVersion: Versions.ProjectVersion.make(0),
      actor: "ui",
      payload: {
        t: "project.create",
        projectId: streamProjectId,
        name: "Stream Test Project",
      },
    };

    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(createCommand),
    });
    expect(createRes.ok).toBe(true);

    const subscribeRes = await fetch(
      `${baseUrl}/api/events/subscribe?fromVersion=0&projectId=${streamProjectId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    expect(subscribeRes.ok).toBe(true);

    const reader = subscribeRes.body?.getReader();
    if (!reader) throw new Error("Reader is null");

    const firstChunk = await reader.read();
    const firstText = new TextDecoder().decode(firstChunk.value);
    expect(firstText).toContain("server.subscribed");

    const editCommand: EditorCommand = {
      id: Ids.generate("CommandId"),
      expectedVersion: Versions.ProjectVersion.make(0),
      actor: "ui",
      payload: {
        t: "project.rename",
        name: "Renamed Stream Project",
      },
    };

    const editPromise = fetch(`${baseUrl}/api/projects/${streamProjectId}/edit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(editCommand),
    });

    const readPromise = reader.read();

    const [editRes, secondChunk] = await Promise.all([editPromise, readPromise]);
    expect(editRes.ok).toBe(true);

    const secondText = new TextDecoder().decode(secondChunk.value);
    expect(secondText).toContain("events");
    expect(secondText).toContain("project.renamed");

    await reader.cancel();
  }, 20000);

  it("GET /api/projects lists the created project", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok).toBe(true);
    const projects = (await res.json()) as ProjectSummaryResponse[];
    expect(projects.length).toBeGreaterThanOrEqual(1);
    const testProject = projects.find((p) => p.id === testProjectId);
    expect(testProject).toBeDefined();
    expect(testProject?.name).toBe("E2E Test Project");
  }, 20000);

  it("DELETE /api/projects/:projectId deletes the project", async () => {
    const getRes = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const currentProject = (await getRes.json()) as ProjectResponse;

    const command: ProjectDeleteCommand = {
      id: Ids.generate("CommandId"),
      expectedVersion: currentProject.version as Versions.ProjectVersion,
      actor: "ui",
      payload: { t: "project.delete" },
    };

    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(command),
    });

    expect(res.ok).toBe(true);
    const result = (await res.json()) as ProjectResponse;
    expect(result.deletedAt).not.toBeNull();
  }, 20000);

  it("GET /api/projects/:projectId returns 410 Gone for deleted project", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(410);
  }, 20000);

  it("DELETE /api/projects/:projectId returns 404 for already deleted project", async () => {
    const command: ProjectDeleteCommand = {
      id: Ids.generate("CommandId"),
      expectedVersion: Versions.ProjectVersion.make(1),
      actor: "ui",
      payload: { t: "project.delete" },
    };

    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(command),
    });
    expect(res.status).toBe(404);
  }, 20000);
});
