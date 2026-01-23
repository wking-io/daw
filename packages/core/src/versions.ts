import { Schema } from "effect";

export type ValidVersion = "ProjectVersion";

export const Version = <B extends ValidVersion>(brand: B) =>
	Schema.Number.pipe(Schema.brand(brand));
export type VersionOf<B extends ValidVersion> = Schema.Schema.Type<
	ReturnType<typeof Version<B>>
>;

export const ProjectVersion = Version("ProjectVersion");
export type ProjectVersion = Schema.Schema.Type<typeof ProjectVersion>;

const make = <B extends ValidVersion>(brand: B) =>
	Schema.decodeUnknownSync(Version(brand));

export const add = <B extends ValidVersion>(
	brand: B,
	version: VersionOf<B>,
	amount: number,
) => make(brand)(version + amount);
