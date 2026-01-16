import { useEffect, useLayoutEffect } from "react";

/**
 * Like `useLayoutEffect`, but avoids SSR warnings by falling back to `useEffect`
 * when rendering on the server.
 */
export const useIsomorphicLayoutEffect =
	typeof window === "undefined" ? useEffect : useLayoutEffect;
