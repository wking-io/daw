import { configureApiClient, Root } from "@daw/app";
import { createRoot } from "@remix-run/component";

declare const __DAW_STATE_PORT__: string;
declare const __DAW_STATE_TOKEN__: string;

const statePort = __DAW_STATE_PORT__;
const stateToken = __DAW_STATE_TOKEN__;

if (!statePort || !stateToken) {
	throw new Error(
		"Missing environment variables: DAW_STATE_PORT or DAW_STATE_TOKEN",
	);
}

configureApiClient({
	baseUrl: `http://127.0.0.1:${statePort}`,
	token: stateToken,
});

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(<Root />);
