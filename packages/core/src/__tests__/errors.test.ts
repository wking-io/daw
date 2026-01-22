import { describe, expect, it } from "vitest";
import {
	BadRequest,
	Conflict,
	Forbidden,
	InternalServerError,
	NotFound,
	Unauthorized,
	UnprocessableEntity,
} from "../api/errors";

describe("errors", () => {
	describe("BadRequest", () => {
		it("creates with default values", () => {
			const error = new BadRequest({});
			expect(error._tag).toBe("BadRequest");
			expect(error.status).toBe(400);
			expect(error.title).toBe("Bad Request");
			expect(error.type).toBe(
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
			);
		});

		it("allows custom detail and instance", () => {
			const error = new BadRequest({
				detail: "Missing required field",
				instance: "/api/projects/123",
			});
			expect(error.detail).toBe("Missing required field");
			expect(error.instance).toBe("/api/projects/123");
		});

		it("allows overriding default values", () => {
			const error = new BadRequest({
				title: "Invalid Input",
				type: "https://example.com/errors/invalid-input",
			});
			expect(error.title).toBe("Invalid Input");
			expect(error.type).toBe("https://example.com/errors/invalid-input");
		});
	});

	describe("Unauthorized", () => {
		it("creates with default values", () => {
			const error = new Unauthorized({});
			expect(error._tag).toBe("Unauthorized");
			expect(error.status).toBe(401);
			expect(error.title).toBe("Unauthorized");
			expect(error.type).toBe(
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401",
			);
		});

		it("allows custom detail", () => {
			const error = new Unauthorized({
				detail: "Token expired",
			});
			expect(error.detail).toBe("Token expired");
		});
	});

	describe("Forbidden", () => {
		it("creates with default values", () => {
			const error = new Forbidden({});
			expect(error._tag).toBe("Forbidden");
			expect(error.status).toBe(403);
			expect(error.title).toBe("Forbidden");
			expect(error.type).toBe(
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403",
			);
		});

		it("allows custom detail", () => {
			const error = new Forbidden({
				detail: "Insufficient permissions",
			});
			expect(error.detail).toBe("Insufficient permissions");
		});
	});

	describe("NotFound", () => {
		it("creates with default values", () => {
			const error = new NotFound({});
			expect(error._tag).toBe("NotFound");
			expect(error.status).toBe(404);
			expect(error.title).toBe("Not Found");
			expect(error.type).toBe(
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404",
			);
		});

		it("allows custom detail and instance", () => {
			const error = new NotFound({
				detail: "Project not found",
				instance: "/api/projects/xyz",
			});
			expect(error.detail).toBe("Project not found");
			expect(error.instance).toBe("/api/projects/xyz");
		});
	});

	describe("Conflict", () => {
		it("creates with default values", () => {
			const error = new Conflict({});
			expect(error._tag).toBe("Conflict");
			expect(error.status).toBe(409);
			expect(error.title).toBe("Conflict");
			expect(error.type).toBe(
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409",
			);
		});

		it("allows custom detail", () => {
			const error = new Conflict({
				detail: "Version conflict",
			});
			expect(error.detail).toBe("Version conflict");
		});
	});

	describe("UnprocessableEntity", () => {
		it("creates with default values", () => {
			const error = new UnprocessableEntity({});
			expect(error._tag).toBe("UnprocessableEntity");
			expect(error.status).toBe(422);
			expect(error.title).toBe("Unprocessable Entity");
			expect(error.type).toBe(
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422",
			);
		});

		it("allows validation errors array", () => {
			const error = new UnprocessableEntity({
				detail: "Validation failed",
				errors: [
					{ field: "name", message: "Name is required" },
					{ field: "bpm", message: "BPM must be between 20 and 999" },
				],
			});
			expect(error.detail).toBe("Validation failed");
			expect(error.errors).toHaveLength(2);
			expect(error.errors?.[0]).toEqual({
				field: "name",
				message: "Name is required",
			});
			expect(error.errors?.[1]).toEqual({
				field: "bpm",
				message: "BPM must be between 20 and 999",
			});
		});

		it("allows errors without field", () => {
			const error = new UnprocessableEntity({
				errors: [{ message: "General validation error" }],
			});
			expect(error.errors?.[0]).toEqual({
				message: "General validation error",
			});
		});
	});

	describe("InternalServerError", () => {
		it("creates with default values", () => {
			const error = new InternalServerError({});
			expect(error._tag).toBe("InternalServerError");
			expect(error.status).toBe(500);
			expect(error.title).toBe("Internal Server Error");
			expect(error.type).toBe(
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500",
			);
		});

		it("allows custom detail", () => {
			const error = new InternalServerError({
				detail: "Database connection failed",
			});
			expect(error.detail).toBe("Database connection failed");
		});
	});

	describe("error inheritance", () => {
		it("all errors are instances of Error", () => {
			expect(new BadRequest({})).toBeInstanceOf(Error);
			expect(new Unauthorized({})).toBeInstanceOf(Error);
			expect(new Forbidden({})).toBeInstanceOf(Error);
			expect(new NotFound({})).toBeInstanceOf(Error);
			expect(new Conflict({})).toBeInstanceOf(Error);
			expect(new UnprocessableEntity({})).toBeInstanceOf(Error);
			expect(new InternalServerError({})).toBeInstanceOf(Error);
		});

		it("errors can be thrown and caught", () => {
			expect(() => {
				throw new NotFound({ detail: "Resource missing" });
			}).toThrow();

			try {
				throw new NotFound({ detail: "Resource missing" });
			} catch (e) {
				expect(e).toBeInstanceOf(NotFound);
				expect((e as NotFound).detail).toBe("Resource missing");
			}
		});
	});
});
