import { getAtom, getAtomSet } from "@daw/atom-remix";
import { Commands, Ids, Versions } from "@daw/core";
import type { Handle } from "@remix-run/component";
import { ApiClient } from "../api/client";
import { tabsAtom } from "../state/tabs";

export function CreateProjectDialog(
	handle: Handle,
	setupProps: { onClose: () => void },
) {
	const create = getAtomSet(handle, ApiClient.mutation("project", "create"));
	const [, setTabs] = getAtom(handle, tabsAtom);
	let isSubmitting = false;
	let error: string | null = null;

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (isSubmitting) return;

		const form = e.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		const name = (formData.get("name") as string)?.trim();

		if (!name) {
			error = "Project name is required";
			handle.update();
			return;
		}

		isSubmitting = true;
		error = null;
		handle.update();

		const projectId = Ids.generate("ProjectId");

		create({
			payload: Commands.ProjectCreateCommand.make({
				id: Ids.generate("CommandId"),
				expectedVersion: Versions.ProjectVersion.make(0),
				actor: "ui",
				payload: Commands.ProjectCreate.make({
					t: "project.create",
					name,
					projectId,
				}),
			}),
			reactivityKeys: ["projects"],
		});

		setTabs((current) => ({
			openTabs: [
				...current.openTabs,
				{ id: projectId, name, hasUnsavedChanges: false },
			],
			activeTabId: projectId,
		}));

		setupProps.onClose();
	};

	return (renderProps: { onClose: () => void }) => (
		<div
			css={{
				position: "fixed",
				inset: 0,
				backgroundColor: "rgba(0, 0, 0, 0.7)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
			}}
			on={{
				click: (e) => {
					if (e.target === e.currentTarget) {
						renderProps.onClose();
					}
				},
			}}
		>
			<div
				css={{
					backgroundColor: "#1a1a1a",
					borderRadius: "8px",
					padding: "24px",
					width: "400px",
					maxWidth: "90vw",
					border: "1px solid #333",
				}}
			>
				<h2
					css={{
						margin: "0 0 16px 0",
						fontSize: "18px",
						color: "#fff",
					}}
				>
					Create New Project
				</h2>

				<form on={{ submit: handleSubmit }}>
					<div css={{ marginBottom: "16px" }}>
						<label
							for="project-name"
							css={{
								display: "block",
								marginBottom: "6px",
								fontSize: "13px",
								color: "#999",
							}}
						>
							Project Name
						</label>
						<input
							id="project-name"
							type="text"
							name="name"
							placeholder="My Project"
							css={{
								width: "100%",
								padding: "10px 12px",
								backgroundColor: "#2d2d2d",
								border: "1px solid #444",
								borderRadius: "4px",
								color: "#fff",
								fontSize: "14px",
								outline: "none",
								boxSizing: "border-box",
								"&:focus": {
									borderColor: "#3b82f6",
								},
							}}
							connect={(input: HTMLInputElement) => {
								input.focus();
							}}
						/>
					</div>

					{error && (
						<div
							css={{
								marginBottom: "16px",
								padding: "8px 12px",
								backgroundColor: "rgba(239, 68, 68, 0.1)",
								border: "1px solid #ef4444",
								borderRadius: "4px",
								color: "#ef4444",
								fontSize: "13px",
							}}
						>
							{error}
						</div>
					)}

					<div
						css={{
							display: "flex",
							justifyContent: "flex-end",
							gap: "8px",
						}}
					>
						<button
							type="button"
							css={{
								padding: "8px 16px",
								backgroundColor: "transparent",
								border: "1px solid #444",
								borderRadius: "4px",
								color: "#999",
								fontSize: "13px",
								cursor: "pointer",
								"&:hover": {
									backgroundColor: "#2d2d2d",
									color: "#fff",
								},
							}}
							on={{ click: renderProps.onClose }}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							css={{
								padding: "8px 16px",
								backgroundColor: "#3b82f6",
								border: "none",
								borderRadius: "4px",
								color: "#fff",
								fontSize: "13px",
								cursor: isSubmitting ? "not-allowed" : "pointer",
								opacity: isSubmitting ? 0.6 : 1,
								"&:hover": {
									backgroundColor: isSubmitting ? "#3b82f6" : "#2563eb",
								},
							}}
						>
							{isSubmitting ? "Creating..." : "Create Project"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
