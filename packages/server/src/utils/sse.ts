import type { SSE } from "@daw/contract";

export const formatSSE = (event: SSE.SSEEvent): string =>
	`data: ${JSON.stringify(event)}\n\n`;
