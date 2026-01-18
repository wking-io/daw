import type { Events } from "@daw/contract";

export const formatSSE = (event: Events.Event): string =>
	`data: ${JSON.stringify(event)}\n\n`;
