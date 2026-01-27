declare module "bun" {
	interface Env {
		readonly DAW_STATE_PORT?: string;
		readonly DAW_STATE_TOKEN?: string;
		readonly DAW_MCP_PORT?: string;
	}
}
