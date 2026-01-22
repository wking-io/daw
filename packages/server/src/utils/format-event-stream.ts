import type { Events } from "@daw/core";

export const formatEventStream = (events: Events.Events): string =>
	`data: ${JSON.stringify(events)}\n\n`;
