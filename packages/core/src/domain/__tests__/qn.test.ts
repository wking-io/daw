import { describe, expect, it } from "bun:test";
import { type QN, QNNumeric } from "../qn";

describe("QNNumeric", () => {
	it("add adds two QN values", () => {
		const a = QNNumeric.make(2);
		const b = QNNumeric.make(3);
		expect(QNNumeric.add(a, b)).toBe(5 as QN);
	});

	it("subtract subtracts two QN values", () => {
		const a = QNNumeric.make(10);
		const b = QNNumeric.make(3);
		expect(QNNumeric.subtract(a, b)).toBe(7 as QN);
	});

	it("multiply multiplies two QN values", () => {
		const a = QNNumeric.make(4);
		const b = QNNumeric.make(3);
		expect(QNNumeric.multiply(a, b)).toBe(12 as QN);
	});

	it("divide divides two QN values", () => {
		const a = QNNumeric.make(12);
		const b = QNNumeric.make(4);
		expect(QNNumeric.divide(a, b)).toBe(3 as QN);
	});

	it("min returns minimum of two QN values", () => {
		const a = QNNumeric.make(5);
		const b = QNNumeric.make(3);
		expect(QNNumeric.min(a, b)).toBe(3 as QN);
	});

	it("max returns maximum of two QN values", () => {
		const a = QNNumeric.make(5);
		const b = QNNumeric.make(3);
		expect(QNNumeric.max(a, b)).toBe(5 as QN);
	});

	it("clamp constrains value to range", () => {
		const low = QNNumeric.make(0);
		const high = QNNumeric.make(10);

		expect(QNNumeric.clamp(QNNumeric.make(5), low, high)).toBe(5 as QN);
		expect(QNNumeric.clamp(QNNumeric.make(-5), low, high)).toBe(0 as QN);
		expect(QNNumeric.clamp(QNNumeric.make(15), low, high)).toBe(10 as QN);
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
