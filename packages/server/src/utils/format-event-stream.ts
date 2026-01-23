export const formatEventStream = (event: unknown): string =>
	`data: ${JSON.stringify(event)}\n\n`;
