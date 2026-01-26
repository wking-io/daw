import { App, configureApiClient } from "@daw/app-remix";
import { createRoot } from "@remix-run/component";

const statePort = Bun.env.DAW_STATE_PORT;
const stateToken = Bun.env.DAW_STATE_TOKEN;

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

createRoot(root).render(<App />);
