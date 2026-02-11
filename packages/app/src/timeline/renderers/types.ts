import type { Projection1D } from '../foundation/projection1d'
import type { Px } from '@daw/core/lib/px'
import type { Scene } from '../scene'
import type { TimelineHostEnv } from './core'

// =============================================================================
// Scene Graph Renderer Interface (new)
// =============================================================================

/**
 * Arguments passed to buildScene.
 */
export type BuildSceneArgs<Data, UiState> = Readonly<{
	data: Data
	projection: Projection1D<Px>
	ui: UiState
	env: TimelineHostEnv
}>

/**
 * A scene graph based timeline renderer.
 *
 * Renderers produce a Scene (declarative description) instead of
 * imperative draw calls. The scene is then rendered by adapters
 * (Canvas adapter, DOM adapter).
 *
 * @template Data - The data type this renderer visualizes
 * @template UiState - UI state (selections, hover states, etc.)
 * @template Action - Actions that can be dispatched from interactions
 */
export type SceneRenderer<Data, UiState, Action> = Readonly<{
	/** Unique identifier for this renderer */
	kind: string

	/**
	 * Build a scene graph from the input data.
	 * This is a pure function that describes what to render.
	 */
	buildScene: (args: BuildSceneArgs<Data, UiState>) => Scene<Action>
}>
