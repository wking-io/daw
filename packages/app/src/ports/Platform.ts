export interface DawCommandRequest {
	requestId: string;
	name: string;
	payload: unknown;
}

export interface Platform {
	/**
	 * Host->UI command channel (desktop IPC, etc.)
	 * Returns an unsubscribe function.
	 */
	onCommand: (handler: (req: DawCommandRequest) => void) => () => void;

	/**
	 * UI->Host response channel.
	 */
	respond: (requestId: string, resultJson: string) => Promise<void>;
}

export const NoopPlatform: Platform = {
	onCommand: () => () => {},
	respond: async () => {},
};
