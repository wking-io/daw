import type { Domain, ProjectId } from "@daw/contract";
import * as Registry from "@effect-atom/atom/Registry";
import { Effect } from "effect";
import { ulid } from "ulid";
import { snapshotAtom } from "../instruments/atoms";

export interface DawToolCallOptions {
	readonly host?: string;
	readonly port?: number;
}

/**
 * Stubbed - previously executed instrument creation.
 * Now this is a placeholder until we implement proper project commands.
 */
export const executeCreateProject = (
	name: string,
): Effect.Effect<Domain.Project, never, Registry.AtomRegistry> =>
	Effect.gen(function* () {
		const registry = yield* Registry.AtomRegistry;
		const project: Domain.Project = {
			id: ulid() as ProjectId,
			name,
			createdAt: new Date(),
			updatedAt: new Date(),
			bpm: 120,
			timeSignature: { numerator: 4, denominator: 4 },
		};
		// TODO: Proper snapshot update
		return project;
	});
