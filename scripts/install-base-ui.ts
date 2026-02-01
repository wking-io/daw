#!/usr/bin/env bun

import { $ } from "bun";

const FORK_URL = "https://github.com/wking-io/base-ui.git";
const UPSTREAM_URL = "https://github.com/mui/base-ui.git";
const TARGET_DIR = `${import.meta.dirname}/../packages/base-ui`;

async function main() {
  if (await Bun.file(`${TARGET_DIR}/.git/HEAD`).exists()) {
    console.log("packages/base-ui already exists, skipping clone");
    return;
  }

  console.log("Cloning base-ui fork...");
  await $`git clone ${FORK_URL} ${TARGET_DIR}`;

  console.log("Adding upstream remote...");
  await $`git -C ${TARGET_DIR} remote add upstream ${UPSTREAM_URL}`;

  console.log("Done! Remotes configured:");
  await $`git -C ${TARGET_DIR} remote -v`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
