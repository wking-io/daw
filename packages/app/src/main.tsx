import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "./app/AppProviders";
import { AppRoot } from "./app/AppRoot";

async function bootstrap() {
	const root = document.getElementById("root");
	if (!root) throw new Error("Missing #root element");

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<AppProviders>
				<AppRoot />
			</AppProviders>
		</React.StrictMode>,
	);
}

bootstrap().catch(console.error);
