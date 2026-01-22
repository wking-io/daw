import { AppProviders, AppRoot } from "@daw/app";
import React from "react";
import ReactDOM from "react-dom/client";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<AppProviders>
			<AppRoot />
		</AppProviders>
	</React.StrictMode>,
);
