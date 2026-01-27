import { getAtomValue, Result } from "@daw/atom-remix";
import type { Ids } from "@daw/core";
import type { Handle, RemixNode } from "@remix-run/component";
import { Cause } from "effect";
import { ApiClient } from "../api/client";

type ProjectId = Ids.ProjectId;

export function ProjectView(
	handle: Handle,
	setupProps: { projectId: ProjectId },
) {
	const getResult = getAtomValue(
		handle,
		ApiClient.query("project", "get", {
			path: { projectId: setupProps.projectId },
		}),
	);

	return (_renderProps: { projectId: ProjectId }) => {
		const result = getResult();

		return Result.builder(result)
			.onInitial(() => (
				<div
					css={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						height: "100%",
						color: "#666",
					}}
				>
					Loading project...
				</div>
			))
			.onSuccess((project) => (
				<div css={{ padding: "24px", height: "100%", overflow: "auto" }}>
					<div
						css={{
							marginBottom: "24px",
							paddingBottom: "16px",
							borderBottom: "1px solid #333",
						}}
					>
						<h2
							css={{
								margin: "0 0 8px 0",
								fontSize: "24px",
								color: "#fff",
								fontWeight: 600,
							}}
						>
							{project.name}
						</h2>
						<div
							css={{
								display: "flex",
								gap: "16px",
								fontSize: "13px",
								color: "#666",
							}}
						>
							<span>BPM: {project.bpm}</span>
							<span>
								Time Signature: {project.timeSignature.numerator}/
								{project.timeSignature.denominator}
							</span>
							<span>Tracks: {project.tracks.length}</span>
						</div>
					</div>

					<div
						css={{
							display: "flex",
							flexDirection: "column",
							gap: "8px",
						}}
					>
						{project.tracks.length === 0 ? (
							<div
								css={{
									padding: "48px",
									textAlign: "center",
									color: "#666",
									backgroundColor: "#1a1a1a",
									borderRadius: "8px",
									border: "1px dashed #333",
								}}
							>
								No tracks yet. Add a track to get started.
							</div>
						) : (
							project.tracks.map((track) => (
								<div
									key={track.id}
									css={{
										display: "flex",
										alignItems: "center",
										gap: "12px",
										padding: "12px 16px",
										backgroundColor: "#1a1a1a",
										borderRadius: "6px",
										border: "1px solid #333",
									}}
								>
									<div
										css={{
											width: "4px",
											height: "32px",
											backgroundColor: "#3b82f6",
											borderRadius: "2px",
										}}
									/>
									<div>
										<div
											css={{
												fontSize: "14px",
												color: "#fff",
												fontWeight: 500,
											}}
										>
											{track.name}
										</div>
										<div
											css={{
												fontSize: "12px",
												color: "#666",
											}}
										>
											{track.type}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			))
			.onFailure((error) => (
				<div
					css={{
						padding: "24px",
						color: "#ef4444",
					}}
				>
					Error loading project: {Cause.pretty(error)}
				</div>
			))
			.render() as RemixNode;
	};
}
