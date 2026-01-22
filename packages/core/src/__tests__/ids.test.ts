import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
	AudioFileId,
	AutomationLaneId,
	AutomationPointId,
	ClipId,
	DeviceId,
	NoteId,
	PatternId,
	ProjectId,
	QN,
	QNNumeric,
	TrackId,
} from "../ids";

describe("ids", () => {
	describe("branded ID schemas", () => {
		it("ProjectId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(ProjectId)("proj-123");
			expect(decoded).toBe("proj-123");

			const encoded = Schema.encodeSync(ProjectId)(decoded);
			expect(encoded).toBe("proj-123");
		});

		it("TrackId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(TrackId)("track-abc");
			expect(decoded).toBe("track-abc");
		});

		it("ClipId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(ClipId)("clip-xyz");
			expect(decoded).toBe("clip-xyz");
		});

		it("PatternId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(PatternId)("pattern-1");
			expect(decoded).toBe("pattern-1");
		});

		it("NoteId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(NoteId)("note-42");
			expect(decoded).toBe("note-42");
		});

		it("AutomationLaneId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(AutomationLaneId)("auto-lane-1");
			expect(decoded).toBe("auto-lane-1");
		});

		it("AutomationPointId encodes and decodes strings", () => {
			const decoded =
				Schema.decodeUnknownSync(AutomationPointId)("auto-point-1");
			expect(decoded).toBe("auto-point-1");
		});

		it("AudioFileId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(AudioFileId)("audio-file-1");
			expect(decoded).toBe("audio-file-1");
		});

		it("DeviceId encodes and decodes strings", () => {
			const decoded = Schema.decodeUnknownSync(DeviceId)("device-1");
			expect(decoded).toBe("device-1");
		});

		it("rejects non-string values", () => {
			expect(() => Schema.decodeUnknownSync(ProjectId)(123)).toThrow();
			expect(() => Schema.decodeUnknownSync(ProjectId)(null)).toThrow();
			expect(() => Schema.decodeUnknownSync(ProjectId)(undefined)).toThrow();
		});
	});

	describe("QN (quarter-note position)", () => {
		it("encodes and decodes numbers", () => {
			const decoded = Schema.decodeUnknownSync(QN)(4.5);
			expect(decoded).toBe(4.5);

			const encoded = Schema.encodeSync(QN)(decoded);
			expect(encoded).toBe(4.5);
		});

		it("rejects non-number values", () => {
			expect(() => Schema.decodeUnknownSync(QN)("4.5")).toThrow();
			expect(() => Schema.decodeUnknownSync(QN)(null)).toThrow();
		});
	});

	describe("QNNumeric", () => {
		it("make creates QN from number", () => {
			const qn = QNNumeric.make(4);
			expect(qn).toBe(4);
		});

		it("zero is 0", () => {
			expect(QNNumeric.zero).toBe(0);
		});

		it("add adds two QN values", () => {
			const a = QNNumeric.make(2);
			const b = QNNumeric.make(3);
			expect(QNNumeric.add(a, b)).toBe(5);
		});

		it("subtract subtracts two QN values", () => {
			const a = QNNumeric.make(10);
			const b = QNNumeric.make(3);
			expect(QNNumeric.subtract(a, b)).toBe(7);
		});

		it("multiply multiplies two QN values", () => {
			const a = QNNumeric.make(4);
			const b = QNNumeric.make(3);
			expect(QNNumeric.multiply(a, b)).toBe(12);
		});

		it("divide divides two QN values", () => {
			const a = QNNumeric.make(12);
			const b = QNNumeric.make(4);
			expect(QNNumeric.divide(a, b)).toBe(3);
		});

		it("min returns minimum of two QN values", () => {
			const a = QNNumeric.make(5);
			const b = QNNumeric.make(3);
			expect(QNNumeric.min(a, b)).toBe(3);
		});

		it("max returns maximum of two QN values", () => {
			const a = QNNumeric.make(5);
			const b = QNNumeric.make(3);
			expect(QNNumeric.max(a, b)).toBe(5);
		});

		it("clamp constrains value to range", () => {
			const low = QNNumeric.make(0);
			const high = QNNumeric.make(10);

			expect(QNNumeric.clamp(QNNumeric.make(5), low, high)).toBe(5);
			expect(QNNumeric.clamp(QNNumeric.make(-5), low, high)).toBe(0);
			expect(QNNumeric.clamp(QNNumeric.make(15), low, high)).toBe(10);
		});

		it("eq returns true for equal values", () => {
			expect(QNNumeric.eq(QNNumeric.make(5), QNNumeric.make(5))).toBe(true);
			expect(QNNumeric.eq(QNNumeric.make(5), QNNumeric.make(6))).toBe(false);
		});

		it("comparison operators work correctly", () => {
			const a = QNNumeric.make(5);
			const b = QNNumeric.make(10);

			expect(QNNumeric.lt(a, b)).toBe(true);
			expect(QNNumeric.lt(b, a)).toBe(false);

			expect(QNNumeric.lte(a, b)).toBe(true);
			expect(QNNumeric.lte(a, a)).toBe(true);

			expect(QNNumeric.gt(b, a)).toBe(true);
			expect(QNNumeric.gt(a, b)).toBe(false);

			expect(QNNumeric.gte(b, a)).toBe(true);
			expect(QNNumeric.gte(b, b)).toBe(true);
		});
	});
});
