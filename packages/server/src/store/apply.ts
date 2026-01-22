import type { Commands, Domain, Events, ProjectId } from "@daw/core";

/**
 * In-memory state for a single project.
 * This replaces the old ProjectDoc approach.
 */
export interface ProjectState {
	project: Domain.Project;
	tracks: Map<string, Domain.Track>;
	clips: Map<string, Domain.Clip>;
	midiPatterns: Map<string, Domain.MidiPattern>;
	automationLanes: Map<string, Domain.AutomationLane>;
	audioFiles: Map<string, Domain.AudioFile>;
}

export interface ApplyResult {
	state: ProjectState;
	events: Events.EventBatch;
}

export const emptyProject = (
	projectId: ProjectId,
	name: string,
): Domain.Project => ({
	id: projectId,
	name,
	createdAt: new Date(),
	updatedAt: new Date(),
	bpm: 120,
	timeSignature: { numerator: 4, denominator: 4 },
});

export const emptyState = (
	projectId: ProjectId,
	name = "Untitled",
): ProjectState => ({
	project: emptyProject(projectId, name),
	tracks: new Map(),
	clips: new Map(),
	midiPatterns: new Map(),
	automationLanes: new Map(),
	audioFiles: new Map(),
});

export const stateToSnapshot = (
	state: ProjectState,
	version: number,
): Events.Snapshot => ({
	version,
	project: state.project,
	tracks: Array.from(state.tracks.values()),
	clips: Array.from(state.clips.values()),
	midiPatterns: Array.from(state.midiPatterns.values()),
	automationLanes: Array.from(state.automationLanes.values()),
	audioFiles: Array.from(state.audioFiles.values()),
});

/**
 * Apply a command payload to project state.
 * Returns updated state and events to broadcast.
 *
 * This is a minimal stub - only implements project operations for now.
 */
export function applyCommand(
	state: ProjectState,
	version: number,
	payload: Commands.CommandPayload,
): ApplyResult {
	const events: Events.Event[] = [];
	let nextState = state;

	switch (payload.t) {
		case "project.create": {
			// project.create is handled at the store level, not here
			// This case should not normally be reached
			break;
		}
		case "project.delete": {
			events.push({ t: "project.deleted", projectId: state.project.id });
			break;
		}
		case "project.rename": {
			const updatedProject = {
				...state.project,
				name: payload.name,
				updatedAt: new Date(),
			};
			nextState = { ...state, project: updatedProject };
			events.push({ t: "project.renamed", name: payload.name });
			break;
		}
		case "project.setTempo": {
			const updatedProject = {
				...state.project,
				bpm: payload.bpm,
				updatedAt: new Date(),
			};
			nextState = { ...state, project: updatedProject };
			events.push({ t: "project.tempoChanged", bpm: payload.bpm });
			break;
		}
		case "project.setTimeSignature": {
			const updatedProject = {
				...state.project,
				timeSignature: payload.timeSignature,
				updatedAt: new Date(),
			};
			nextState = { ...state, project: updatedProject };
			events.push({
				t: "project.timeSignatureChanged",
				timeSignature: payload.timeSignature,
			});
			break;
		}
		case "project.reorderTracks": {
			// Update sortOrder on tracks based on new order
			const newTracks = new Map(state.tracks);
			payload.trackIds.forEach((trackId, index) => {
				const track = newTracks.get(trackId);
				if (track) {
					newTracks.set(trackId, { ...track, sortOrder: index });
				}
			});
			nextState = { ...state, tracks: newTracks };
			events.push({
				t: "project.tracksReordered",
				trackIds: payload.trackIds,
			});
			break;
		}
		// Track operations - stubbed
		case "track.create":
		case "track.delete":
		case "track.rename":
		case "track.setColor":
		case "track.setVolume":
		case "track.setPan":
		case "track.setMute":
		case "track.setSolo":
		case "track.reorderClips":
			// TODO: implement track operations
			break;
		// Clip operations - stubbed
		case "clip.createMidi":
		case "clip.createAudio":
		case "clip.delete":
		case "clip.move":
		case "clip.resize":
		case "clip.setLoop":
			// TODO: implement clip operations
			break;
		// MIDI operations - stubbed
		case "midi.renamePattern":
		case "midi.addNote":
		case "midi.deleteNote":
		case "midi.moveNote":
		case "midi.setNoteVelocity":
		case "midi.setNotePitch":
			// TODO: implement MIDI operations
			break;
		// Automation operations - stubbed
		case "automation.createLane":
		case "automation.deleteLane":
		case "automation.addPoint":
		case "automation.deletePoint":
		case "automation.movePoint":
		case "automation.setPointCurve":
			// TODO: implement automation operations
			break;
		// Audio file operations - stubbed
		case "audioFile.register":
		case "audioFile.unregister":
		case "audioFile.rename":
			// TODO: implement audio file operations
			break;
	}

	return {
		state: nextState,
		events: { version, events },
	};
}

/** @deprecated Use applyCommand instead */
export const applyOp = applyCommand;
