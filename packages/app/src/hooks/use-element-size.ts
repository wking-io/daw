import { useIsomorphicLayoutEffect } from "@app/hooks/use-isomorphic-layout-effect";
import { useRef, useState } from "react";

export type SizeBounds = {
	min?: number;
	max?: number;
};

export type Size = {
	width: number;
	height: number;
	x: number;
	y: number;
	left: number;
	right: number;
	top: number;
	bottom: number;
};

export function useElementSize<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);
	const [size, setSize] = useState<Size>({
		width: 0,
		height: 0,
		x: 0,
		y: 0,
		bottom: 0,
		left: 0,
		right: 0,
		top: 0,
	});

	useIsomorphicLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;

		const ro = new ResizeObserver((entries) => {
			const cr = entries[0]?.contentRect;
			if (!cr) return;
			setSize({
				width: cr.width,
				height: cr.height,
				x: cr.x,
				y: cr.y,
				left: cr.left,
				right: cr.right,
				top: cr.top,
				bottom: cr.bottom,
			});
		});

		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);

	return { ref, size };
}
