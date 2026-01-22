/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://datatracker.ietf.org/doc/html/rfc7807
 *
 * All API errors follow the application/problem+json format.
 */
import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

/**
 * Symbol for identifying Problem Details encoding
 */
const ProblemJsonEncoding = {
	kind: "Json" as const,
	contentType: "application/problem+json",
};

/**
 * Helper to create Problem Details annotations with proper encoding
 */
const problemAnnotations = <A>(options: {
	readonly status: number;
	readonly description?: string;
}): Schema.Annotations.Schema<A> => ({
	...HttpApiSchema.annotations<A>({
		status: options.status,
		description: options.description,
	}),
	[HttpApiSchema.AnnotationEncoding]: ProblemJsonEncoding,
});

/**
 * Bad Request (400) - The request was malformed or invalid
 */
export class BadRequest extends Schema.TaggedError<BadRequest>()(
	"BadRequest",
	{
		/** A URI reference that identifies the problem type */
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
		}),
		/** A short, human-readable summary of the problem type */
		title: Schema.optionalWith(Schema.String, {
			default: () => "Bad Request",
		}),
		/** The HTTP status code */
		status: Schema.optionalWith(Schema.Literal(400), {
			default: () => 400 as const,
		}),
		/** A human-readable explanation specific to this occurrence */
		detail: Schema.optional(Schema.String),
		/** A URI reference that identifies the specific occurrence */
		instance: Schema.optional(Schema.String),
	},
	problemAnnotations({
		status: 400,
		description: "The request was malformed or invalid",
	}),
) {}

/**
 * Unauthorized (401) - Authentication is required
 */
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
	"Unauthorized",
	{
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401",
		}),
		title: Schema.optionalWith(Schema.String, {
			default: () => "Unauthorized",
		}),
		status: Schema.optionalWith(Schema.Literal(401), {
			default: () => 401 as const,
		}),
		detail: Schema.optional(Schema.String),
		instance: Schema.optional(Schema.String),
	},
	problemAnnotations({
		status: 401,
		description: "Authentication is required",
	}),
) {}

/**
 * Forbidden (403) - The request is not allowed
 */
export class Forbidden extends Schema.TaggedError<Forbidden>()(
	"Forbidden",
	{
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403",
		}),
		title: Schema.optionalWith(Schema.String, {
			default: () => "Forbidden",
		}),
		status: Schema.optionalWith(Schema.Literal(403), {
			default: () => 403 as const,
		}),
		detail: Schema.optional(Schema.String),
		instance: Schema.optional(Schema.String),
	},
	problemAnnotations({
		status: 403,
		description: "The request is not allowed",
	}),
) {}

/**
 * Not Found (404) - The requested resource was not found
 */
export class NotFound extends Schema.TaggedError<NotFound>()(
	"NotFound",
	{
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404",
		}),
		title: Schema.optionalWith(Schema.String, {
			default: () => "Not Found",
		}),
		status: Schema.optionalWith(Schema.Literal(404), {
			default: () => 404 as const,
		}),
		detail: Schema.optional(Schema.String),
		instance: Schema.optional(Schema.String),
	},
	problemAnnotations({
		status: 404,
		description: "The requested resource was not found",
	}),
) {}

/**
 * Not Acceptable (406) - The requested resource is not acceptable
 */
export class NotAcceptable extends Schema.TaggedError<NotAcceptable>()(
	"NotAcceptable",
	{
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/406",
		}),
		title: Schema.optionalWith(Schema.String, {
			default: () => "Not Acceptable",
		}),
		status: Schema.optionalWith(Schema.Literal(406), {
			default: () => 406 as const,
		}),
		detail: Schema.optional(Schema.String),
		instance: Schema.optional(Schema.String),
	},
	problemAnnotations({
		status: 406,
		description:
			"The response is not acceptable according to the acceptable values.",
	}),
) {}

/**
 * Conflict (409) - The request conflicts with the current state
 */
export class Conflict extends Schema.TaggedError<Conflict>()(
	"Conflict",
	{
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409",
		}),
		title: Schema.optionalWith(Schema.String, {
			default: () => "Conflict",
		}),
		status: Schema.optionalWith(Schema.Literal(409), {
			default: () => 409 as const,
		}),
		detail: Schema.optional(Schema.String),
		instance: Schema.optional(Schema.String),
	},
	problemAnnotations({
		status: 409,
		description: "The request conflicts with the current state",
	}),
) {}

/**
 * Unprocessable Entity (422) - The request was well-formed but could not be processed
 */
export class UnprocessableEntity extends Schema.TaggedError<UnprocessableEntity>()(
	"UnprocessableEntity",
	{
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422",
		}),
		title: Schema.optionalWith(Schema.String, {
			default: () => "Unprocessable Entity",
		}),
		status: Schema.optionalWith(Schema.Literal(422), {
			default: () => 422 as const,
		}),
		detail: Schema.optional(Schema.String),
		instance: Schema.optional(Schema.String),
		/** Validation errors */
		errors: Schema.optional(
			Schema.Array(
				Schema.Struct({
					field: Schema.optional(Schema.String),
					message: Schema.String,
				}),
			),
		),
	},
	problemAnnotations({
		status: 422,
		description: "The request was well-formed but could not be processed",
	}),
) {}

/**
 * Internal Server Error (500) - An unexpected error occurred
 */
export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
	"InternalServerError",
	{
		type: Schema.optionalWith(Schema.String, {
			default: () =>
				"https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500",
		}),
		title: Schema.optionalWith(Schema.String, {
			default: () => "Internal Server Error",
		}),
		status: Schema.optionalWith(Schema.Literal(500), {
			default: () => 500 as const,
		}),
		detail: Schema.optional(Schema.String),
		instance: Schema.optional(Schema.String),
	},
	problemAnnotations({
		status: 500,
		description: "An unexpected error occurred",
	}),
) {}

export const ApiError = Schema.Union(
	BadRequest,
	Unauthorized,
	Forbidden,
	NotFound,
	NotAcceptable,
	Conflict,
	UnprocessableEntity,
	InternalServerError,
);
export type ApiError = typeof ApiError.Type;
