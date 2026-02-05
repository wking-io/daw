import { cn } from "@daw/utils";
import type { Props } from "@remix-run/component";

const sizes = {
  xs: "size-2",
  sm: "size-3",
  DEFAULT: "size-4",
  custom: "",
};

export const orbitEasingOptions = ["linear", "ease-in", "ease-out", "ease-in-out"] as const;

export type OrbitEasing = (typeof orbitEasingOptions)[number];

const easingValues: Record<OrbitEasing, string> = {
  linear: "0 0 1 1",
  "ease-in": "0.42 0 1 1",
  "ease-out": "0 0 0.58 1",
  "ease-in-out": "0.42 0 0.58 1",
};

export interface OrbitRingsConfig {
  outerRadius: number;
  middleRadius: number;
  innerRadius: number;
  totalDuration: number;
  orbitDuration: number;
  linearDuration: number;
  orbitEasing: OrbitEasing;
}

export const defaultOrbitRingsConfig: OrbitRingsConfig = {
  outerRadius: 12,
  middleRadius: 8,
  innerRadius: 4,
  totalDuration: 4000,
  orbitDuration: 0.6,
  linearDuration: 0.4,
  orbitEasing: "ease-in-out",
};

export interface OrbitRingsIconProps extends Props<"svg"> {
  size?: keyof typeof sizes;
  config?: Partial<OrbitRingsConfig>;
}

// Counter for stable unique IDs
let idCounter = 0;

export function OrbitRingsIcon() {
  // Generate stable ID once per component instance (in setup phase)
  const id = `orbit-${++idCounter}`;
  let insideMotion: SVGAnimationElement | null = null;
  let outsideMotion: SVGAnimationElement | null = null;
  let lastAppliedInside = "";
  let lastAppliedOutside = "";

  return ({
    size = "DEFAULT",
    class: externalClasses,
    config = {},
    ...props
  }: OrbitRingsIconProps) => {
    const {
      outerRadius,
      middleRadius,
      innerRadius,
      totalDuration,
      orbitDuration,
      linearDuration,
      orbitEasing,
    } = {
      ...defaultOrbitRingsConfig,
      ...config,
    };

    const formatList = (values: number[]) => values.map((value) => value.toFixed(4)).join(";");

    // Calculate timing from ratios
    // orbitDuration + linearDuration should equal 1
    // 4 linear segments, 2 orbit segments
    const ratioTotal = Math.max(linearDuration + orbitDuration, 0.0001);
    const linearRatio = linearDuration / ratioTotal;
    const orbitRatio = orbitDuration / ratioTotal;
    const singleLinear = linearRatio / 4;
    const singleOrbit = orbitRatio / 2;

    // keyTimes as proportions
    const t1 = singleLinear;
    const t2 = singleLinear + singleOrbit;
    const t3 = singleLinear * 2 + singleOrbit;
    const t4 = singleLinear * 3 + singleOrbit;
    const t5 = singleLinear * 3 + singleOrbit * 2;

    // keyPoints based on path geometry
    const lineLength = outerRadius;
    const circleLength = 2 * Math.PI * outerRadius;
    const orbitLoops = 2;
    const totalPathLength = lineLength * 4 + circleLength * 2 * orbitLoops;

    const p1 = lineLength / totalPathLength;
    const p2 = (lineLength + circleLength * orbitLoops) / totalPathLength;
    const p3 = (lineLength * 2 + circleLength * orbitLoops) / totalPathLength;
    const p4 = (lineLength * 3 + circleLength * orbitLoops) / totalPathLength;
    const p5 = (lineLength * 3 + circleLength * 2 * orbitLoops) / totalPathLength;

    const keyTimes = formatList([0, t1, t2, t3, t4, t5, 1]);
    const keyPoints = formatList([0, p1, p2, p3, p4, p5, 1]);

    // Easing: linear for linear segments, configured easing for orbits
    const linearEasing = "0 0 1 1";
    const orbitEasingValue = easingValues[orbitEasing];
    const keySplines = `${linearEasing}; ${orbitEasingValue}; ${linearEasing}; ${linearEasing}; ${orbitEasingValue}; ${linearEasing}`;

    const smilValues = {
      repeatCount: "indefinite",
      keyTimes,
      keyPoints,
      keySplines,
      calcMode: "spline",
    };
    const smilKey = JSON.stringify(smilValues);

    const applySmilAttributes = (
      target: SVGAnimationElement | null,
      label: "inside" | "outside",
    ) => {
      if (!target) return;
      const lastApplied = label === "inside" ? lastAppliedInside : lastAppliedOutside;
      if (lastApplied === smilKey) return;

      target.setAttribute("repeatCount", smilValues.repeatCount);
      if (smilValues.keyTimes) target.setAttribute("keyTimes", smilValues.keyTimes);
      if (smilValues.keyPoints) target.setAttribute("keyPoints", smilValues.keyPoints);
      if (smilValues.keySplines) target.setAttribute("keySplines", smilValues.keySplines);
      target.setAttribute("calcMode", smilValues.calcMode);

      if (label === "inside") {
        lastAppliedInside = smilKey;
      } else {
        lastAppliedOutside = smilKey;
      }
    };

    applySmilAttributes(insideMotion, "inside");
    applySmilAttributes(outsideMotion, "outside");

    const r = outerRadius;
    const orbitPath = `
      M0,0
      L${r},0
      A${r},${r} 0 0,0 0,-${r}
      A${r},${r} 0 0,0 -${r},0
      A${r},${r} 0 0,0 0,${r}
      A${r},${r} 0 0,0 ${r},0
      A${r},${r} 0 0,0 0,-${r}
      A${r},${r} 0 0,0 -${r},0
      A${r},${r} 0 0,0 0,${r}
      A${r},${r} 0 0,0 ${r},0
      L0,0
      L-${r},0
      A${r},${r} 0 0,1 0,-${r}
      A${r},${r} 0 0,1 ${r},0
      A${r},${r} 0 0,1 0,${r}
      A${r},${r} 0 0,1 -${r},0
      A${r},${r} 0 0,1 0,-${r}
      A${r},${r} 0 0,1 ${r},0
      A${r},${r} 0 0,1 0,${r}
      A${r},${r} 0 0,1 -${r},0
      L0,0
    `;

    return (
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        class={cn(sizes[size], externalClasses)}
        {...props}
      >
        <defs>
          <path id={`orbitPath-${id}`} d={orbitPath} fill="none" />

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
              <g>
                <circle r={middleRadius} fill="black" />
                <circle r={innerRadius} fill="white" />
                <animateMotion
                  begin="0s"
                  dur={`${totalDuration}ms`}
                  connect={(node) => {
                    insideMotion = node as SVGAnimationElement;
                    applySmilAttributes(insideMotion, "inside");
                  }}
                >
                  <mpath href={`#orbitPath-${id}`} />
                </animateMotion>
              </g>
            </g>
          </mask>

          <mask id={`outsideMask-${id}`}>
            <g transform="translate(50,50)">
              <g>
                <circle r={middleRadius} fill="white" />
                <circle r={innerRadius} fill="black" />
                <animateMotion
                  begin="0s"
                  dur={`${totalDuration}ms`}
                  connect={(node) => {
                    outsideMotion = node as SVGAnimationElement;
                    applySmilAttributes(outsideMotion, "outside");
                  }}
                >
                  <mpath href={`#orbitPath-${id}`} />
                </animateMotion>
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
