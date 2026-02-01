import { afterEach, describe, expect, it } from "bun:test";
import { $ } from "bun";
import { copyBinaryToSidecarFolder, getCurrentSidecar } from "../utils";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("desktop sidecar utilities", () => {
  it("maps rust targets to binary names", () => {
    expect(getCurrentSidecar("daw-mcp", "aarch64-apple-darwin").binaryName).toBe(
      "daw-mcp-darwin-arm64",
    );
    expect(getCurrentSidecar("daw-mcp", "x86_64-unknown-linux-gnu").binaryName).toBe(
      "daw-mcp-linux-x64",
    );
  });

  it("copies a binary into src-tauri/sidecars with target suffix", async () => {
    if (process.platform === "win32") {
      // `copyBinaryToSidecarFolder` uses unix utilities (`cp`, `chmod`) today.
      // When we make that cross-platform, we can enable this test on Windows.
      return;
    }

    const tmp = (await $`mktemp -d -t daw-desktop-test-XXXXXXXX`.text()).trim();
    process.chdir(tmp);

    await $`mkdir -p src-tauri/sidecars`;

    const source = `${tmp}/bin/daw-mcp`;
    await $`mkdir -p ${tmp}/bin`;
    await $`printf %s "binary-bytes-placeholder" > ${source}`;

    await copyBinaryToSidecarFolder(source, "x86_64-unknown-linux-gnu");

    const expected = `${tmp}/src-tauri/sidecars/daw-mcp-x86_64-unknown-linux-gnu`;

    await $`test -f ${expected}`;

    // macOS `stat` differs from GNU `stat`.
    const sizeText =
      process.platform === "darwin"
        ? await $`stat -f%z ${expected}`.text()
        : await $`stat -c%s ${expected}`.text();
    expect(Number.parseInt(sizeText.trim(), 10)).toBeGreaterThan(0);
  });
});
