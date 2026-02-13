import type { Handle, Props } from "@remix-run/component";
import { cn } from "@daw/utils";

import type { DawAction, DawClip, TrackColor } from "../renderers/daw-skeleton/types";

interface ClipColorConfig {
  highlight: string;
  base: string;
  from: string;
  bg: string;
  hover: string;
  selected: string;
}

const clipColorClasses: Record<TrackColor, ClipColorConfig> = {
  plum: {
    highlight: "shadow-plum-8/40 after:shadow-plum-0/30 after:dark:shadow-plum-0/20",
    base: "border-plum-8/40 via-plum-5/0 dark:via-plum-6/0 via-40% to-plum-2/25 text-shadow-plum-12/15 text-plum-0",
    from: "from-plum-2/15",
    bg: "bg-plum-5 dark:bg-plum-6",
    hover: "hover:not-active:from-plum-2/35",
    selected: "from-plum-2/40 ring-1 ring-plum-0/60",
  },
  oatmeal: {
    highlight: "shadow-oatmeal-8/40 after:shadow-oatmeal-0/30 after:dark:shadow-oatmeal-0/20",
    base: "border-oatmeal-8/40 via-oatmeal-5/0 dark:via-oatmeal-6/0 via-40% to-oatmeal-2/25 text-shadow-oatmeal-12/15 text-oatmeal-0",
    from: "from-oatmeal-2/15",
    bg: "bg-oatmeal-5 dark:bg-oatmeal-6",
    hover: "hover:not-active:from-oatmeal-2/35",
    selected: "from-oatmeal-2/40 ring-1 ring-oatmeal-0/60",
  },
  strawberry: {
    highlight: "shadow-strawberry-8/40 after:shadow-strawberry-0/30 after:dark:shadow-strawberry-0/20",
    base: "border-strawberry-8/40 via-strawberry-5/0 dark:via-strawberry-6/0 via-40% to-strawberry-2/25 text-shadow-strawberry-12/15 text-strawberry-0",
    from: "from-strawberry-2/15",
    bg: "bg-strawberry-5 dark:bg-strawberry-6",
    hover: "hover:not-active:from-strawberry-2/35",
    selected: "from-strawberry-2/40 ring-1 ring-strawberry-0/60",
  },
  ruby: {
    highlight: "shadow-ruby-8/40 after:shadow-ruby-0/30 after:dark:shadow-ruby-0/20",
    base: "border-ruby-8/40 via-ruby-5/0 dark:via-ruby-6/0 via-40% to-ruby-2/25 text-shadow-ruby-12/15 text-ruby-0",
    from: "from-ruby-2/15",
    bg: "bg-ruby-5 dark:bg-ruby-6",
    hover: "hover:not-active:from-ruby-2/35",
    selected: "from-ruby-2/40 ring-1 ring-ruby-0/60",
  },
  tangerine: {
    highlight: "shadow-tangerine-8/40 after:shadow-tangerine-0/30 after:dark:shadow-tangerine-0/20",
    base: "border-tangerine-8/40 via-tangerine-5/0 dark:via-tangerine-6/0 via-40% to-tangerine-2/25 text-shadow-tangerine-12/15 text-tangerine-0",
    from: "from-tangerine-2/15",
    bg: "bg-tangerine-5 dark:bg-tangerine-6",
    hover: "hover:not-active:from-tangerine-2/35",
    selected: "from-tangerine-2/40 ring-1 ring-tangerine-0/60",
  },
  ochre: {
    highlight: "shadow-ochre-8/40 after:shadow-ochre-0/30 after:dark:shadow-ochre-0/20",
    base: "border-ochre-8/40 via-ochre-5/0 dark:via-ochre-6/0 via-40% to-ochre-2/25 text-shadow-ochre-12/15 text-ochre-0",
    from: "from-ochre-2/15",
    bg: "bg-ochre-5 dark:bg-ochre-6",
    hover: "hover:not-active:from-ochre-2/35",
    selected: "from-ochre-2/40 ring-1 ring-ochre-0/60",
  },
  honey: {
    highlight: "shadow-honey-8/40 after:shadow-honey-0/30 after:dark:shadow-honey-0/20",
    base: "border-honey-8/40 via-honey-5/0 dark:via-honey-6/0 via-40% to-honey-2/25 text-shadow-honey-12/15 text-honey-0",
    from: "from-honey-2/15",
    bg: "bg-honey-5 dark:bg-honey-6",
    hover: "hover:not-active:from-honey-2/35",
    selected: "from-honey-2/40 ring-1 ring-honey-0/60",
  },
  lemon: {
    highlight: "shadow-lemon-8/40 after:shadow-lemon-0/30 after:dark:shadow-lemon-0/20",
    base: "border-lemon-8/40 via-lemon-5/0 dark:via-lemon-6/0 via-40% to-lemon-2/25 text-shadow-lemon-12/15 text-lemon-0",
    from: "from-lemon-2/15",
    bg: "bg-lemon-5 dark:bg-lemon-6",
    hover: "hover:not-active:from-lemon-2/35",
    selected: "from-lemon-2/40 ring-1 ring-lemon-0/60",
  },
  pear: {
    highlight: "shadow-pear-8/40 after:shadow-pear-0/30 after:dark:shadow-pear-0/20",
    base: "border-pear-8/40 via-pear-5/0 dark:via-pear-6/0 via-40% to-pear-2/25 text-shadow-pear-12/15 text-pear-0",
    from: "from-pear-2/15",
    bg: "bg-pear-5 dark:bg-pear-6",
    hover: "hover:not-active:from-pear-2/35",
    selected: "from-pear-2/40 ring-1 ring-pear-0/60",
  },
  pistachio: {
    highlight: "shadow-pistachio-8/40 after:shadow-pistachio-0/30 after:dark:shadow-pistachio-0/20",
    base: "border-pistachio-8/40 via-pistachio-5/0 dark:via-pistachio-6/0 via-40% to-pistachio-2/25 text-shadow-pistachio-12/15 text-pistachio-0",
    from: "from-pistachio-2/15",
    bg: "bg-pistachio-5 dark:bg-pistachio-6",
    hover: "hover:not-active:from-pistachio-2/35",
    selected: "from-pistachio-2/40 ring-1 ring-pistachio-0/60",
  },
  jade: {
    highlight: "shadow-jade-8/40 after:shadow-jade-0/30 after:dark:shadow-jade-0/20",
    base: "border-jade-8/40 via-jade-5/0 dark:via-jade-6/0 via-40% to-jade-2/25 text-shadow-jade-12/15 text-jade-0",
    from: "from-jade-2/15",
    bg: "bg-jade-5 dark:bg-jade-6",
    hover: "hover:not-active:from-jade-2/35",
    selected: "from-jade-2/40 ring-1 ring-jade-0/60",
  },
  emerald: {
    highlight: "shadow-emerald-8/40 after:shadow-emerald-0/30 after:dark:shadow-emerald-0/20",
    base: "border-emerald-8/40 via-emerald-5/0 dark:via-emerald-6/0 via-40% to-emerald-2/25 text-shadow-emerald-12/15 text-emerald-0",
    from: "from-emerald-2/15",
    bg: "bg-emerald-5 dark:bg-emerald-6",
    hover: "hover:not-active:from-emerald-2/35",
    selected: "from-emerald-2/40 ring-1 ring-emerald-0/60",
  },
  aqua: {
    highlight: "shadow-aqua-8/40 after:shadow-aqua-0/30 after:dark:shadow-aqua-0/20",
    base: "border-aqua-8/40 via-aqua-5/0 dark:via-aqua-6/0 via-40% to-aqua-2/25 text-shadow-aqua-12/15 text-aqua-0",
    from: "from-aqua-2/15",
    bg: "bg-aqua-5 dark:bg-aqua-6",
    hover: "hover:not-active:from-aqua-2/35",
    selected: "from-aqua-2/40 ring-1 ring-aqua-0/60",
  },
  ocean: {
    highlight: "shadow-ocean-8/40 after:shadow-ocean-0/30 after:dark:shadow-ocean-0/20",
    base: "border-ocean-8/40 via-ocean-5/0 dark:via-ocean-6/0 via-40% to-ocean-2/25 text-shadow-ocean-12/15 text-ocean-0",
    from: "from-ocean-2/15",
    bg: "bg-ocean-5 dark:bg-ocean-6",
    hover: "hover:not-active:from-ocean-2/35",
    selected: "from-ocean-2/40 ring-1 ring-ocean-0/60",
  },
  sky: {
    highlight: "shadow-sky-8/40 after:shadow-sky-0/30 after:dark:shadow-sky-0/20",
    base: "border-sky-8/40 via-sky-5/0 dark:via-sky-6/0 via-40% to-sky-2/25 text-shadow-sky-12/15 text-sky-0",
    from: "from-sky-2/15",
    bg: "bg-sky-5 dark:bg-sky-6",
    hover: "hover:not-active:from-sky-2/35",
    selected: "from-sky-2/40 ring-1 ring-sky-0/60",
  },
  cobalt: {
    highlight: "shadow-cobalt-8/40 after:shadow-cobalt-0/30 after:dark:shadow-cobalt-0/20",
    base: "border-cobalt-8/40 via-cobalt-5/0 dark:via-cobalt-6/0 via-40% to-cobalt-2/25 text-shadow-cobalt-12/15 text-cobalt-0",
    from: "from-cobalt-2/15",
    bg: "bg-cobalt-5 dark:bg-cobalt-6",
    hover: "hover:not-active:from-cobalt-2/35",
    selected: "from-cobalt-2/40 ring-1 ring-cobalt-0/60",
  },
  denim: {
    highlight: "shadow-denim-8/40 after:shadow-denim-0/30 after:dark:shadow-denim-0/20",
    base: "border-denim-8/40 via-denim-5/0 dark:via-denim-6/0 via-40% to-denim-2/25 text-shadow-denim-12/15 text-denim-0",
    from: "from-denim-2/15",
    bg: "bg-denim-5 dark:bg-denim-6",
    hover: "hover:not-active:from-denim-2/35",
    selected: "from-denim-2/40 ring-1 ring-denim-0/60",
  },
  iris: {
    highlight: "shadow-iris-8/40 after:shadow-iris-0/30 after:dark:shadow-iris-0/20",
    base: "border-iris-8/40 via-iris-5/0 dark:via-iris-6/0 via-40% to-iris-2/25 text-shadow-iris-12/15 text-iris-0",
    from: "from-iris-2/15",
    bg: "bg-iris-5 dark:bg-iris-6",
    hover: "hover:not-active:from-iris-2/35",
    selected: "from-iris-2/40 ring-1 ring-iris-0/60",
  },
  grape: {
    highlight: "shadow-grape-8/40 after:shadow-grape-0/30 after:dark:shadow-grape-0/20",
    base: "border-grape-8/40 via-grape-5/0 dark:via-grape-6/0 via-40% to-grape-2/25 text-shadow-grape-12/15 text-grape-0",
    from: "from-grape-2/15",
    bg: "bg-grape-5 dark:bg-grape-6",
    hover: "hover:not-active:from-grape-2/35",
    selected: "from-grape-2/40 ring-1 ring-grape-0/60",
  },
  lilac: {
    highlight: "shadow-lilac-8/40 after:shadow-lilac-0/30 after:dark:shadow-lilac-0/20",
    base: "border-lilac-8/40 via-lilac-5/0 dark:via-lilac-6/0 via-40% to-lilac-2/25 text-shadow-lilac-12/15 text-lilac-0",
    from: "from-lilac-2/15",
    bg: "bg-lilac-5 dark:bg-lilac-6",
    hover: "hover:not-active:from-lilac-2/35",
    selected: "from-lilac-2/40 ring-1 ring-lilac-0/60",
  },
  fuchsia: {
    highlight: "shadow-fuchsia-8/40 after:shadow-fuchsia-0/30 after:dark:shadow-fuchsia-0/20",
    base: "border-fuchsia-8/40 via-fuchsia-5/0 dark:via-fuchsia-6/0 via-40% to-fuchsia-2/25 text-shadow-fuchsia-12/15 text-fuchsia-0",
    from: "from-fuchsia-2/15",
    bg: "bg-fuchsia-5 dark:bg-fuchsia-6",
    hover: "hover:not-active:from-fuchsia-2/35",
    selected: "from-fuchsia-2/40 ring-1 ring-fuchsia-0/60",
  },
  blush: {
    highlight: "shadow-blush-8/40 after:shadow-blush-0/30 after:dark:shadow-blush-0/20",
    base: "border-blush-8/40 via-blush-5/0 dark:via-blush-6/0 via-40% to-blush-2/25 text-shadow-blush-12/15 text-blush-0",
    from: "from-blush-2/15",
    bg: "bg-blush-5 dark:bg-blush-6",
    hover: "hover:not-active:from-blush-2/35",
    selected: "from-blush-2/40 ring-1 ring-blush-0/60",
  },
  primary: {
    highlight: "shadow-primary-8/40 after:shadow-primary-0/30 after:dark:shadow-primary-0/20",
    base: "border-primary-8/40 via-primary-5/0 dark:via-primary-6/0 via-40% to-primary-2/25 text-shadow-primary-12/15 text-primary-0",
    from: "from-primary-2/15",
    bg: "bg-primary-5 dark:bg-primary-6",
    hover: "hover:not-active:from-primary-2/35",
    selected: "from-primary-2/40 ring-1 ring-primary-0/60",
  },
};

export interface ClipSetup {
  color: TrackColor;
}

export interface ClipProps extends Props<"div"> {
  clip: DawClip;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  dispatch: (action: DawAction) => void;
}

export function Clip(_handle: Handle, setup: ClipSetup) {
  const config = clipColorClasses[setup.color];

  return (props: ClipProps) => {
    const { clip, x, y, width, height, isSelected, dispatch, ...rest } = props;

    const onPointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      dispatch({ type: "select-clip", clipId: clip.id });
    };

    return (
      <div
        class={cn(
          "absolute rounded-sm",
          "shadow-recess dark:shadow-background/40",
          "after:pointer-events-none after:absolute after:inset-[0.5px] after:rounded-[3.5px] after:shadow-highlight after:transition",
          config.highlight,
        )}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        {...rest}
      >
        <div
          class={cn(
            "size-full rounded-sm border-[0.5px] transition cursor-pointer bg-linear-to-b text-shadow-xxs dark:text-shadow-xs dark:border-background/40 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 bg-clip-padding",
            "flex items-center px-2 text-xs overflow-hidden",
            config.base,
            isSelected ? config.selected : config.from,
            config.hover,
            config.bg,
          )}
          on={{ pointerdown: onPointerDown }}
        >
          <span class="truncate">{clip.title}</span>
        </div>
      </div>
    );
  };
}
