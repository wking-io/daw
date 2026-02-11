import type { TimelineTheme } from '../renderers/core'

function getCssVar(style: CSSStyleDeclaration, name: string): string {
	return style.getPropertyValue(name).trim()
}

export function readTimelineTheme(
	el: Element = document.documentElement,
): TimelineTheme {
	const style = getComputedStyle(el)
	return {
		background: getCssVar(style, '--color-oatmeal-11'),
		gridLine: getCssVar(style, '--color-oatmeal-9'),
		clipFallbackFill: getCssVar(style, '--color-oatmeal-12'),
		clipFallbackFillSelected: getCssVar(style, '--color-oatmeal-9'),
		clipFallbackBorder: getCssVar(style, '--color-oatmeal-8'),
		clipBorderSelected: getCssVar(style, '--color-oatmeal-1'),
	}
}
