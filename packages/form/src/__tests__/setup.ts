import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });

Object.assign(globalThis, {
  window,
  document: window.document,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  HTMLButtonElement: window.HTMLButtonElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLFormElement: window.HTMLFormElement,
  HTMLDivElement: window.HTMLDivElement,
  HTMLSpanElement: window.HTMLSpanElement,
  Node: window.Node,
  Text: window.Text,
  Event: window.Event,
  MouseEvent: window.MouseEvent,
  KeyboardEvent: window.KeyboardEvent,
  CustomEvent: window.CustomEvent,
  MutationObserver: window.MutationObserver,
  CSSStyleSheet: window.CSSStyleSheet,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
});
