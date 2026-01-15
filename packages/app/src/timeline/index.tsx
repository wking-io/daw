import Settings, { Controls } from "@app/components/controls";
import Slider from "@app/components/slider";
import { useCallback, useState } from "react";
import * as Timeline from "./components";
import { InsetPanel } from "./components/inset-panel";
import { demoDawData } from "./demo/daw-data";
import * as Px from "./lib/px";
import * as Span from "./lib/span";
import type * as T from "./lib/timeline";
import { DawSkeletonSceneRenderer } from "./renderers/daw-skeleton/scene";
import type { DawAction, DawUiState } from "./renderers/daw-skeleton/types";
import { RandomSquaresSceneRenderer } from "./renderers/random-squares/scene";

type RendererKind = "random-squares" | "daw-skeleton";

function makeInitialTimeline(): T.Timeline<Px.Px> {
	return {
		size: Px.Px(20000),
		min: Px.Px(200),
		view: Span.make(Px.Numeric, 2000, 4000),
	};
}

export function TimelineSection() {
	const [timeline, setTimeline] = useState<T.Timeline<Px.Px>>(() =>
		makeInitialTimeline(),
	);
	const { view } = timeline;
	const [mode, setMode] = useState<RendererKind>("daw-skeleton");
	const [zoomRate, setZoomRate] = useState(350);
	const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

	const dawUiState: DawUiState = { selectedClipId };

	const handleDawAction = useCallback((action: DawAction) => {
		switch (action.type) {
			case "select-clip":
				setSelectedClipId(action.clipId);
				break;
		}
	}, []);

	return (
		<div className="h-screen bg-neutral-700 p-1 text-neutral-50">
			<div className="mb-1 flex gap-2 text-xs">
				<button
					type="button"
					onClick={() => setMode("random-squares")}
					className={[
						"rounded-sm border px-2 py-1",
						mode === "random-squares"
							? "border-neutral-200 bg-neutral-200/20"
							: "border-neutral-500/40 hover:border-neutral-200/60",
					].join(" ")}
				>
					RandomSquares
				</button>
				<button
					type="button"
					onClick={() => setMode("daw-skeleton")}
					className={[
						"rounded-sm border px-2 py-1",
						mode === "daw-skeleton"
							? "border-neutral-200 bg-neutral-200/20"
							: "border-neutral-500/40 hover:border-neutral-200/60",
					].join(" ")}
				>
					DAWSkeleton
				</button>
			</div>

			<Timeline.Root timeline={timeline} setTimeline={setTimeline}>
				{/* Navigator (minimap) */}
				<div className="relative mb-1">
					<InsetPanel className="user-select-none">
						<Timeline.Navigator
							height={26}
							className="relative h-full w-full overflow-hidden rounded-[3px] bg-neutral-800"
						>
							<Timeline.NavigatorTrack zoomRate={zoomRate}>
								{mode === "random-squares" ? (
									<Timeline.NavigatorCanvas
										renderer={RandomSquaresSceneRenderer}
									/>
								) : (
									<>
										<Timeline.NavigatorCanvas
											renderer={DawSkeletonSceneRenderer}
											data={demoDawData}
											ui={dawUiState}
										/>
										<Timeline.NavigatorDom
											renderer={DawSkeletonSceneRenderer}
											data={demoDawData}
											ui={dawUiState}
											dispatch={handleDawAction}
										/>
									</>
								)}
								<Timeline.ZoomWindow zoomRate={zoomRate} />
							</Timeline.NavigatorTrack>
						</Timeline.Navigator>
					</InsetPanel>
					<Controls className="fixed">
						<Settings.Root>
							<Settings.Trigger />
							<Settings.Panel>
								<Settings.Field>
									<Settings.Header>
										<Settings.Label>Zoom Rate: {zoomRate}</Settings.Label>
									</Settings.Header>
									<Slider
										value={zoomRate}
										onChange={setZoomRate}
										min={40}
										max={400}
										step={10}
									/>
								</Settings.Field>
							</Settings.Panel>
						</Settings.Root>
					</Controls>
				</div>

				{/* Projection (main view) */}
				<InsetPanel className="user-select-none">
					<Timeline.Projection
						height={240}
						className="rounded-[3px] bg-neutral-800"
					>
						{mode === "random-squares" ? (
							<Timeline.ProjectionCanvas
								renderer={RandomSquaresSceneRenderer}
							/>
						) : (
							<>
								<Timeline.ProjectionCanvas
									renderer={DawSkeletonSceneRenderer}
									data={demoDawData}
									ui={dawUiState}
								/>
								<Timeline.ProjectionDom
									renderer={DawSkeletonSceneRenderer}
									data={demoDawData}
									ui={dawUiState}
									dispatch={handleDawAction}
								/>
							</>
						)}
					</Timeline.Projection>
				</InsetPanel>
			</Timeline.Root>

			<div className="mt-2 text-xs">
				<div>
					<strong>full</strong>: [{0} → {timeline.size.toFixed(0)}]
				</div>
				<div>
					<strong>view</strong>: [{view.start.toFixed(0)} →{" "}
					{Span.end(Px.Numeric, view).toFixed(0)}]
				</div>
			</div>
		</div>
	);
}
