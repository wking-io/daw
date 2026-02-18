import type { TimelineTheme } from "../renderers/core";
import type { TrackColor } from "../renderers/timeline/types";

function getCssVar(style: CSSStyleDeclaration, name: string): string {
  return style.getPropertyValue(name).trim();
}

export function readTimelineTheme(el: Element = document.body): TimelineTheme {
  const style = getComputedStyle(el);
  return {
    tick: getCssVar(style, "--color-tick"),
    gridLinePrimary: getCssVar(style, "--color-gridline-primary"),
    gridLineSecondary: getCssVar(style, "--color-gridline-secondary"),
    gridLabel: getCssVar(style, "--color-gridlabel"),
    barBackground: getCssVar(style, "--color-layer-1"),
    resolveColor: (color: TrackColor, name: string) => getCssVar(style, `--color-${color}-${name}`),
    resolveClipColor: (name: string) => getCssVar(style, `--color-clip-${name}`),
  };
}
