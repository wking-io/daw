import type { Handle } from '@remix-run/component'

import * as Timeline from '../components'
import { demoDawData } from './daw-data'
import * as Px from '../lib/px'
import * as Span from '../lib/span'
import type * as T from '../lib/timeline'
import { DawSkeletonSceneRenderer } from '../renderers/daw-skeleton/scene'
import type { DawAction, DawUiState } from '../renderers/daw-skeleton/types'
import { RandomSquaresSceneRenderer } from '../renderers/random-squares/scene'

type RendererKind = 'random-squares' | 'daw-skeleton'

function makeInitialTimeline(): T.Timeline<Px.Px> {
	return {
		size: Px.Px(20000),
		min: Px.Px(200),
		view: Span.make(Px.Numeric, 2000, 4000),
	}
}

export function TimelineSection(handle: Handle) {
	let timeline = makeInitialTimeline()
	let mode: RendererKind = 'daw-skeleton'
	let zoomRate = 350
	let selectedClipId: string | null = null

	function setTimeline(next: T.Timeline<Px.Px>) {
		timeline = next
		handle.update()
	}

	function handleDawAction(action: unknown) {
		const a = action as DawAction
		switch (a.type) {
			case 'select-clip':
				selectedClipId = a.clipId
				handle.update()
				break
		}
	}

	return () => {
		const dawUiState: DawUiState = { selectedClipId }
		const { view } = timeline

		return (
			<div class="h-screen bg-neutral-700 p-1 text-neutral-50">
				<div class="mb-1 flex gap-2 text-xs">
					<button
						type="button"
						on={{
							click() {
								mode = 'random-squares'
								handle.update()
							},
						}}
						class={[
							'rounded-sm border px-2 py-1',
							mode === 'random-squares'
								? 'border-neutral-200 bg-neutral-200/20'
								: 'border-neutral-500/40 hover:border-neutral-200/60',
						].join(' ')}
					>
						RandomSquares
					</button>
					<button
						type="button"
						on={{
							click() {
								mode = 'daw-skeleton'
								handle.update()
							},
						}}
						class={[
							'rounded-sm border px-2 py-1',
							mode === 'daw-skeleton'
								? 'border-neutral-200 bg-neutral-200/20'
								: 'border-neutral-500/40 hover:border-neutral-200/60',
						].join(' ')}
					>
						DAWSkeleton
					</button>
				</div>

				<Timeline.Root timeline={timeline} setTimeline={setTimeline}>
					{/* Navigator (minimap) */}
					<div class="relative mb-1">
						<Timeline.InsetPanel class="user-select-none">
							<Timeline.Navigator
								height={26}
								class="relative h-full w-full overflow-hidden rounded-[3px] bg-neutral-800"
							>
								<Timeline.NavigatorTrack zoomRate={zoomRate}>
									{mode === 'random-squares' ? (
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
						</Timeline.InsetPanel>
					</div>

					{/* Projection (main view) */}
					<Timeline.InsetPanel class="user-select-none">
						<Timeline.Projection
							height={240}
							class="rounded-[3px] bg-neutral-800"
						>
							{mode === 'random-squares' ? (
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
					</Timeline.InsetPanel>
				</Timeline.Root>

				<div class="mt-2 text-xs">
					<div>
						<strong>full</strong>: [{0} → {timeline.size.toFixed(0)}]
					</div>
					<div>
						<strong>view</strong>: [{view.start.toFixed(0)} →{' '}
						{Span.end(Px.Numeric, view).toFixed(0)}]
					</div>
				</div>
			</div>
		)
	}
}
