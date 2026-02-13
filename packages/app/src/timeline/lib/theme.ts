import type { TimelineTheme } from "../renderers/core";

function getCssVar(style: CSSStyleDeclaration, name: string): string {
  return style.getPropertyValue(name).trim();
}

export function readTimelineTheme(el: Element = document.body): TimelineTheme {
  const style = getComputedStyle(el);
  return {
    gridLine: getCssVar(style, "--color-gridline"),
    gridLabel: getCssVar(style, "--color-gridlabel"),
    resolveColor: (name: string) => getCssVar(style, `--color-${name}-primary`),
  };
}
