import { cn } from "@daw/utils";
import type { Props } from "@remix-run/component";

const sizes = {
  xs: "size-2",
  sm: "size-3",
  DEFAULT: "size-4",
  custom: "",
};

export const statusEasingOptions = ["linear", "ease-in", "ease-out", "ease-in-out"] as const;

export type StatusEasing = (typeof statusEasingOptions)[number];

const easingValues: Record<StatusEasing, string> = {
  linear: "linear",
  "ease-in": "cubic-bezier(0.42, 0, 1, 1)",
  "ease-out": "cubic-bezier(0, 0, 0.58, 1)",
  "ease-in-out": "cubic-bezier(0.42, 0, 0.58, 1)",
};

export interface StatusIconConfig {
  outerRadius: number;
  middleRadius: number;
  innerRadius: number;
  /** Total animation duration in milliseconds */
  totalDuration: number;
  /** Ratio of time spent in orbital segments (0-1) */
  orbitDuration: number;
  /** Ratio of time spent in linear segments (0-1) */
  linearDuration: number;
  orbitEasing: StatusEasing;
  /** Position of the inner circle: orbit (animated), center (static at center), notification (static at top-right) */
  innerPosition: "orbit" | "center" | "notification";
}

export const defaultStatusIconConfig: StatusIconConfig = {
  outerRadius: 12,
  middleRadius: 8,
  innerRadius: 4,
  totalDuration: 4000,
  orbitDuration: 0.6,
  linearDuration: 0.4,
  orbitEasing: "ease-in-out",
  innerPosition: "orbit",
};

export interface StatusIconProps extends Props<"svg"> {
  size?: keyof typeof sizes;
  config?: Partial<StatusIconConfig>;
}

/** Number of full loops per orbital segment */
const orbitLoops = 2;

function calculateTimingValues(config: StatusIconConfig): {
  keyTimes: [number, number, number, number, number, number, number];
  keyPoints: [number, number, number, number, number, number, number];
} {
  const { outerRadius, orbitDuration, linearDuration } = config;

  // orbitDuration + linearDuration should equal 1
  // 4 linear segments, 2 orbit segments
  const ratioTotal = Math.max(linearDuration + orbitDuration, 0.0001);
  const linearRatio = linearDuration / ratioTotal;
  const orbitRatio = orbitDuration / ratioTotal;
  const singleLinear = linearRatio / 4;
  const singleOrbit = orbitRatio / 2;

  // keyTimes as proportions (0-1)
  const t1 = singleLinear;
  const t2 = singleLinear + singleOrbit;
  const t3 = singleLinear * 2 + singleOrbit;
  const t4 = singleLinear * 3 + singleOrbit;
  const t5 = singleLinear * 3 + singleOrbit * 2;

  // keyPoints based on path geometry
  const lineLength = outerRadius;
  const circleLength = 2 * Math.PI * outerRadius;
  const totalPathLength = lineLength * 4 + circleLength * 2 * orbitLoops;

  const p1 = lineLength / totalPathLength;
  const p2 = (lineLength + circleLength * orbitLoops) / totalPathLength;
  const p3 = (lineLength * 2 + circleLength * orbitLoops) / totalPathLength;
  const p4 = (lineLength * 3 + circleLength * orbitLoops) / totalPathLength;
  const p5 = (lineLength * 3 + circleLength * 2 * orbitLoops) / totalPathLength;

  return {
    keyTimes: [0, t1, t2, t3, t4, t5, 1],
    keyPoints: [0, p1, p2, p3, p4, p5, 1],
  };
}

function generateOrbitPath(outerRadius: number): string {
  const r = outerRadius;
  return `M0,0 L${r},0 A${r},${r} 0 0,0 0,-${r} A${r},${r} 0 0,0 -${r},0 A${r},${r} 0 0,0 0,${r} A${r},${r} 0 0,0 ${r},0 A${r},${r} 0 0,0 0,-${r} A${r},${r} 0 0,0 -${r},0 A${r},${r} 0 0,0 0,${r} A${r},${r} 0 0,0 ${r},0 L0,0 L-${r},0 A${r},${r} 0 0,1 0,-${r} A${r},${r} 0 0,1 ${r},0 A${r},${r} 0 0,1 0,${r} A${r},${r} 0 0,1 -${r},0 A${r},${r} 0 0,1 0,-${r} A${r},${r} 0 0,1 ${r},0 A${r},${r} 0 0,1 0,${r} A${r},${r} 0 0,1 -${r},0 L0,0`;
}

function getStaticTransform(
  innerPosition: StatusIconConfig["innerPosition"],
  outerRadius: number,
): string | undefined {
  if (innerPosition === "notification") {
    const notificationOffset = outerRadius / Math.SQRT2;
    return `translate(${notificationOffset}, ${-notificationOffset})`;
  }
  return undefined;
}

// Counter for stable unique IDs
let idCounter = 0;

export function StatusIcon() {
  // Generate stable ID once per component instance (in setup phase)
  const id = `status-${++idCounter}`;
  let lastStyleKey = "";
  let currentStyleEl: HTMLStyleElement | null = null;

  return ({
    size = "DEFAULT",
    class: externalClasses,
    config = {},
    ...props
  }: StatusIconProps) => {
    const mergedConfig = {
      ...defaultStatusIconConfig,
      ...config,
    };

    const {
      outerRadius,
      middleRadius,
      innerRadius,
      totalDuration,
      orbitEasing,
      innerPosition,
    } = mergedConfig;

    const { keyTimes, keyPoints } = calculateTimingValues(mergedConfig);

    // Convert to percentages for CSS
    const t1 = keyTimes[1] * 100;
    const t2 = keyTimes[2] * 100;
    const t3 = keyTimes[3] * 100;
    const t4 = keyTimes[4] * 100;
    const t5 = keyTimes[5] * 100;

    const p1 = keyPoints[1] * 100;
    const p2 = keyPoints[2] * 100;
    const p3 = keyPoints[3] * 100;
    const p4 = keyPoints[4] * 100;
    const p5 = keyPoints[5] * 100;

    const linearEasing = "linear";
    const orbitEasingValue = easingValues[orbitEasing];

    const orbitPathD = generateOrbitPath(outerRadius);

    // Generate CSS keyframes
    const keyframesCSS = `
      @keyframes ${id}-motion {
        0% {
          offset-distance: 0%;
          animation-timing-function: ${linearEasing};
        }
        ${t1.toFixed(4)}% {
          offset-distance: ${p1.toFixed(4)}%;
          animation-timing-function: ${orbitEasingValue};
        }
        ${t2.toFixed(4)}% {
          offset-distance: ${p2.toFixed(4)}%;
          animation-timing-function: ${linearEasing};
        }
        ${t3.toFixed(4)}% {
          offset-distance: ${p3.toFixed(4)}%;
          animation-timing-function: ${linearEasing};
        }
        ${t4.toFixed(4)}% {
          offset-distance: ${p4.toFixed(4)}%;
          animation-timing-function: ${orbitEasingValue};
        }
        ${t5.toFixed(4)}% {
          offset-distance: ${p5.toFixed(4)}%;
          animation-timing-function: ${linearEasing};
        }
        100% {
          offset-distance: 100%;
        }
      }
    `;

    const styleKey = `${id}-${JSON.stringify({ outerRadius, totalDuration, orbitEasing, innerPosition })}`;

    // Inject/update style element
    const updateStyle = (styleEl: HTMLStyleElement | null) => {
      if (!styleEl) return;
      // Reset lastStyleKey when a new element is connected (e.g., after switching back to orbit mode)
      if (styleEl !== currentStyleEl) {
        currentStyleEl = styleEl;
        lastStyleKey = "";
      }
      if (lastStyleKey === styleKey) return;
      styleEl.textContent = keyframesCSS;
      lastStyleKey = styleKey;
    };

    const staticTransform = getStaticTransform(innerPosition, outerRadius);

    const animatedGroupStyle =
      innerPosition === "orbit"
        ? {
            offsetPath: `path('${orbitPathD}')`,
            animation: `${id}-motion ${totalDuration}ms infinite`,
          }
        : undefined;

    return (
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        class={cn(sizes[size], externalClasses)}
        {...props}
      >
        {innerPosition === "orbit" ? <style connect={updateStyle} /> : null}

        <defs>
          <clipPath id={`insideClip-${id}`}>
            <circle cx="50" cy="50" r={outerRadius} />
          </clipPath>

          <clipPath id={`outsideClip-${id}`}>
            <path
              d={`M0,0 H100 V100 H0 Z M50,${50 - outerRadius} A${outerRadius},${outerRadius} 0 1,1 49.99,${50 - outerRadius} Z`}
              clip-rule="evenodd"
            />
          </clipPath>

          <mask id={`insideMask-${id}`}>
            <rect width="100" height="100" fill="white" />
            <g transform="translate(50,50)">
              <g style={animatedGroupStyle} transform={staticTransform}>
                <circle r={middleRadius} fill="black" />
                <circle r={innerRadius} fill="white" />
              </g>
            </g>
          </mask>

          <mask id={`outsideMask-${id}`}>
            <g transform="translate(50,50)">
              <g style={animatedGroupStyle} transform={staticTransform}>
                <circle r={middleRadius} fill="white" />
                <circle r={innerRadius} fill="black" />
              </g>
            </g>
          </mask>
        </defs>

        <g clip-path={`url(#insideClip-${id})`}>
          <circle
            cx="50"
            cy="50"
            r={outerRadius}
            fill="currentColor"
            mask={`url(#insideMask-${id})`}
          />
        </g>

        <g clip-path={`url(#outsideClip-${id})`}>
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="currentColor"
            mask={`url(#outsideMask-${id})`}
          />
        </g>
      </svg>
    );
  };
}
