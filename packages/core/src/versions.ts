import { Schema } from "effect";

export type ValidVersion = "ProjectVersion";

export const Version = <B extends ValidVersion>(brand: B) =>
	Schema.Number.pipe(Schema.brand(brand));
export type VersionOf<B extends ValidVersion> = Schema.Schema.Type<
	typeof Version<B>
>;

export const ProjectVersion = Version("ProjectVersion");
export type ProjectVersion = typeof ProjectVersion.Type;
