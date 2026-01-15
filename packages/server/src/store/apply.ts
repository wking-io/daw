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
			const instrument: Instrument.Instrument = {
				id: ulid() as Instrument.InstrumentId,
				type: op.type,
				name: op.name,
				params: {},
				createdAt: new Date(),
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
