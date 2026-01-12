import { AppProviders, AppRoot } from "@daw/app";
import React from "react";
import ReactDOM from "react-dom/client";
import { TauriPlatform } from "./platform";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<AppProviders platform={TauriPlatform}>
			<AppRoot />
		</AppProviders>
	</React.StrictMode>,
);
