import { describe, expect, it } from "bun:test";
import { ScrollSync } from "./scroll-sync";

function makeEl(scrollLeft = 0) {
  return { scrollLeft };
}

describe("ScrollSync", () => {
  it("suppresses the first scroll event after a programmatic write", () => {
    const sync = new ScrollSync();
    const el = makeEl(0);

    sync.writeTo(el, 100);

    expect(sync.isSuppressed()).toBe(true);
  });

  it("does not suppress a second consecutive scroll event", () => {
    const sync = new ScrollSync();
    const el = makeEl(0);

    sync.writeTo(el, 100);

    // First event: suppressed
    sync.isSuppressed();

    // Second event: user-initiated
    expect(sync.isSuppressed()).toBe(false);
  });

  it("does not suppress when no programmatic write occurred", () => {
    const sync = new ScrollSync();

    expect(sync.isSuppressed()).toBe(false);
  });

  it("skips write when position is within 0.5px threshold", () => {
    const sync = new ScrollSync();
    const el = makeEl(100);

    const wrote = sync.writeTo(el, 100.4);

    expect(wrote).toBe(false);
    expect(el.scrollLeft).toBe(100);
    expect(sync.isSuppressed()).toBe(false);
  });

  it("writes when position exceeds 0.5px threshold", () => {
    const sync = new ScrollSync();
    const el = makeEl(100);

    const wrote = sync.writeTo(el, 101);

    expect(wrote).toBe(true);
    expect(el.scrollLeft).toBe(101);
    expect(sync.isSuppressed()).toBe(true);
  });

  it("handles multiple writes before any scroll event", () => {
    const sync = new ScrollSync();
    const el = makeEl(0);

    sync.writeTo(el, 50);
    sync.writeTo(el, 100);

    // Only one suppress regardless of how many writes
    expect(sync.isSuppressed()).toBe(true);
    expect(sync.isSuppressed()).toBe(false);
  });

  it("suppresses again after a new write following a consumed event", () => {
    const sync = new ScrollSync();
    const el = makeEl(0);

    // First write + consume
    sync.writeTo(el, 100);
    expect(sync.isSuppressed()).toBe(true);

    // Second write + consume
    sync.writeTo(el, 200);
    expect(sync.isSuppressed()).toBe(true);
    expect(sync.isSuppressed()).toBe(false);
  });
});
