import { useCallback, useRef } from "react";

// WebKit shows a disruptive message with pointer lock, so we skip it
const isWebKit =
	typeof navigator !== "undefined" &&
	/^((?!chrome|android).)*safari/i.test(navigator.userAgent);

interface UseScrubOptions {
	onScrub: (cumulativeDelta: number) => void;
	onScrubStart?: () => void;
	onScrubEnd?: () => void;
}

export function useScrub({
	onScrub,
	onScrubStart,
	onScrubEnd,
}: UseScrubOptions): (e: React.PointerEvent) => void {
	const isScrubbingRef = useRef(false);
	const cumulativeDeltaRef = useRef(0);

	// Store callbacks in refs to avoid stale closures
	const onScrubRef = useRef(onScrub);
	const onScrubStartRef = useRef(onScrubStart);
	const onScrubEndRef = useRef(onScrubEnd);
	onScrubRef.current = onScrub;
	onScrubStartRef.current = onScrubStart;
	onScrubEndRef.current = onScrubEnd;

	const handlePointerMove = useCallback((event: PointerEvent) => {
		if (!isScrubbingRef.current) return;

		// Prevent text selection
		event.preventDefault();

		cumulativeDeltaRef.current += event.movementY;
		onScrubRef.current(cumulativeDeltaRef.current);
	}, []);

	const handlePointerUp = useCallback(() => {
		if (!isScrubbingRef.current) return;

		isScrubbingRef.current = false;

		// Exit pointer lock if active
		if (document.pointerLockElement) {
			document.exitPointerLock();
		}

		onScrubEndRef.current?.();

		// Clean up global listeners
		window.removeEventListener("pointermove", handlePointerMove, true);
		window.removeEventListener("pointerup", handlePointerUp, true);
	}, [handlePointerMove]);

	const handlePointerDown = useCallback(
		async (event: React.PointerEvent) => {
			const isMainButton = event.button === 0;
			if (!isMainButton || event.defaultPrevented) return;

			event.preventDefault();

			// Reset cumulative delta
			cumulativeDeltaRef.current = 0;
			isScrubbingRef.current = true;

			onScrubStartRef.current?.();

			// Add global listeners for move/up
			window.addEventListener("pointermove", handlePointerMove, true);
			window.addEventListener("pointerup", handlePointerUp, true);

			// Request pointer lock for infinite movement (skip on WebKit)
			if (!isWebKit) {
				try {
					await document.body.requestPointerLock();
				} catch {
					// Pointer lock denied, continue without it
				}
			}
		},
		[handlePointerMove, handlePointerUp],
	);

	return handlePointerDown;
}
