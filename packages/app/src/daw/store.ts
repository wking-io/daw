import type { Instrument } from "@daw/contract";

export interface DawState {
	instruments: ReadonlyArray<Instrument.Instrument>;
}

type Listener = (state: DawState) => void;

export interface DawStore {
	getState: () => DawState;
	addInstrument: (instrument: Instrument.Instrument) => void;
	subscribe: (listener: Listener) => () => void;
}

export function makeDawStore(): DawStore {
	let state: DawState = { instruments: [] };
	const listeners = new Set<Listener>();

	const notify = () => {
		for (const listener of listeners) listener(state);
	};

	return {
		getState: () => state,
		addInstrument: (instrument) => {
			state = { ...state, instruments: [...state.instruments, instrument] };
			notify();
		},
		subscribe: (listener) => {
			listeners.add(listener);
			listener(state);
			return () => listeners.delete(listener);
		},
	};
}
