import type { Instrument, Project } from "@daw/contract";
import { ulid } from "ulid";

export interface ApplyResult {
	doc: Project.ProjectDoc;
	patches: Project.PatchBatch;
	audioDeltas: Project.AudioDeltaBatch;
}

export const emptyDoc: Project.ProjectDoc = {
	instruments: [],
};

export function applyOp(
	doc: Project.ProjectDoc,
	version: Project.ProjectVersion,
	op: Project.Op,
): ApplyResult {
	switch (op.t) {
		case "instrument.create": {
			// TODO: Fix id generation
			const instrumentId =
				op.instrumentId ?? (ulid() as Instrument.InstrumentId);
			const createdAt =
				typeof op.createdAt === "number" ? new Date(op.createdAt) : new Date();
			const instrument: Instrument.Instrument = {
				id: instrumentId,
				type: op.type,
				name: op.name,
				params: {},
				createdAt,
			};

			const nextDoc: Project.ProjectDoc = {
				...doc,
				instruments: [...doc.instruments, instrument],
			};

			return {
				doc: nextDoc,
				patches: {
					version,
					patches: [
						{
							t: "instrument.add",
							instrument,
						},
					],
				},
				audioDeltas: {
					version,
					deltas: [],
				},
			};
		}
	}
}
