import type { Handle, Props, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";

export type SurfaceColor =
  | "default"
  | "layer"
  | "plum"
  | "oatmeal"
  | "strawberry"
  | "ruby"
  | "tangerine"
  | "ochre"
  | "honey"
  | "lemon"
  | "pear"
  | "pistachio"
  | "jade"
  | "emerald"
  | "aqua"
  | "ocean"
  | "sky"
  | "cobalt"
  | "denim"
  | "iris"
  | "grape"
  | "lilac"
  | "fuchsia"
  | "blush"
  | "primary";

export type SurfaceVariant = "default" | "full";

export interface SurfaceSetup {
  color?: SurfaceColor;
  variant?: SurfaceVariant;
}

export interface SurfaceProps extends Props<"div"> {
  children?: RemixNode;
  class?: string;
  position?: string;
  forceHover?: boolean;
  forceActive?: boolean;
  forceFocus?: boolean;
  render?: (props: Props<"div">) => RemixNode;
}

interface ColorClassConfig {
  highlight: string;
  base: string;
  from: string;
  bg: string;
  hover: string;
  hoverForce: string;
  active: string;
  activeForce: string;
}

const colorClasses: Record<SurfaceColor, ColorClassConfig> = {
  default: {
    highlight: "shadow-foreground/20 after:shadow-layer-4/40 dark:after:shadow-foreground/5",
    base: "border-oatmeal-12/20 via-layer-2/0 via-40% to-layer-3/80 dark:to-foreground/5",
    from: "from-layer-3/50 dark:from-foreground/2",
    bg: "bg-layer-2/50 dark:bg-layer-2",
    hover: "hover:from-layer-3/90 hover:not-active:dark:from-foreground/4",
    hoverForce: "from-layer-3/90 dark:from-foreground/4",
    active:
      "active:from-layer-3/20 active:bg-layer-1/50 active:dark:from-foreground/1 active:dark:bg-layer-1/50",
    activeForce: "!from-layer-3/20 bg-layer-1/50 dark:from-foreground/1 dark:bg-layer-1/50",
  },
  layer: {
    highlight: "shadow-foreground/20 after:shadow-layer-4/90 dark:after:shadow-foreground/5",
    base: "border-oatmeal-12/20 via-layer-3/0 via-40% to-layer-4/80 dark:to-foreground/5",
    from: "from-layer-4/50 dark:from-foreground/2",
    bg: "bg-layer-3/50 dark:bg-layer-3",
    hover: "hover:from-layer-4/90 hover:not-active:dark:from-foreground/4",
    hoverForce: "from-layer-4/90 dark:from-foreground/4",
    active:
      "active:from-layer-4/20 active:bg-layer-2/50 active:dark:from-foreground/1 active:dark:bg-layer-2/50",
    activeForce: "!from-layer-4/20 bg-layer-2/50 dark:from-foreground/1 dark:bg-layer-2/50",
  },
  plum: {
    highlight: "shadow-plum-8/40 after:shadow-plum-0/30 after:dark:shadow-plum-0/20",
    base: "border-plum-8/40 via-plum-5/0 dark:via-plum-6/0 via-40% to-plum-2/25 text-shadow-plum-12/15 text-plum-0",
    from: "from-plum-2/15",
    bg: "bg-plum-5 dark:bg-plum-6",
    hover: "hover:not-active:from-plum-2/35",
    hoverForce: "from-plum-2/35",
    active: "active:from-plum-2/5 active:bg-plum-6 active:dark:bg-plum-7",
    activeForce: "!from-plum-2/5 bg-plum-6 dark:bg-plum-7",
  },
  oatmeal: {
    highlight: "shadow-oatmeal-8/40 after:shadow-oatmeal-0/30 after:dark:shadow-oatmeal-0/20",
    base: "border-oatmeal-8/40 via-oatmeal-5/0 dark:via-oatmeal-6/0 via-40% to-oatmeal-2/25 text-shadow-oatmeal-12/15 text-oatmeal-0",
    from: "from-oatmeal-2/15",
    bg: "bg-oatmeal-5 dark:bg-oatmeal-6",
    hover: "hover:not-active:from-oatmeal-2/35",
    hoverForce: "from-oatmeal-2/35",
    active: "active:from-oatmeal-2/5 active:bg-oatmeal-6 active:dark:bg-oatmeal-7",
    activeForce: "!from-oatmeal-2/5 bg-oatmeal-6 dark:bg-oatmeal-7",
  },
  strawberry: {
    highlight:
      "shadow-strawberry-8/40 after:shadow-strawberry-0/30 after:dark:shadow-strawberry-0/20",
    base: "border-strawberry-8/40 via-strawberry-5/0 dark:via-strawberry-6/0 via-40% to-strawberry-2/25 text-shadow-strawberry-12/15 text-strawberry-0",
    from: "from-strawberry-2/15",
    bg: "bg-strawberry-5 dark:bg-strawberry-6",
    hover: "hover:not-active:from-strawberry-2/35",
    hoverForce: "from-strawberry-2/50",
    active: "active:from-strawberry-2/5 active:bg-strawberry-6 active:dark:bg-strawberry-7",
    activeForce: "!from-strawberry-2/5 bg-strawberry-6 dark:bg-strawberry-7",
  },
  ruby: {
    highlight: "shadow-ruby-8/40 after:shadow-ruby-0/30 after:dark:shadow-ruby-0/20",
    base: "border-ruby-8/40 via-ruby-5/0 dark:via-ruby-6/0 via-40% to-ruby-2/25 text-shadow-ruby-12/15 text-ruby-0",
    from: "from-ruby-2/15",
    bg: "bg-ruby-5 dark:bg-ruby-6",
    hover: "hover:not-active:from-ruby-2/35",
    hoverForce: "from-ruby-2/35",
    active: "active:from-ruby-2/5 active:bg-ruby-6 active:dark:bg-ruby-7",
    activeForce: "!from-ruby-2/5 bg-ruby-6 dark:bg-ruby-7",
  },
  tangerine: {
    highlight: "shadow-tangerine-8/40 after:shadow-tangerine-0/30 after:dark:shadow-tangerine-0/20",
    base: "border-tangerine-8/40 via-tangerine-5/0 dark:via-tangerine-6/0 via-40% to-tangerine-2/25 text-shadow-tangerine-12/15 text-tangerine-0",
    from: "from-tangerine-2/15",
    bg: "bg-tangerine-5 dark:bg-tangerine-6",
    hover: "hover:not-active:from-tangerine-2/35",
    hoverForce: "from-tangerine-2/35",
    active: "active:from-tangerine-2/5 active:bg-tangerine-6 active:dark:bg-tangerine-7",
    activeForce: "!from-tangerine-2/5 bg-tangerine-6 dark:bg-tangerine-7",
  },
  ochre: {
    highlight: "shadow-ochre-8/40 after:shadow-ochre-0/30 after:dark:shadow-ochre-0/20",
    base: "border-ochre-8/40 via-ochre-5/0 dark:via-ochre-6/0 via-40% to-ochre-2/25 text-shadow-ochre-12/15 text-ochre-0",
    from: "from-ochre-2/15",
    bg: "bg-ochre-5 dark:bg-ochre-6",
    hover: "hover:not-active:from-ochre-2/35",
    hoverForce: "from-ochre-2/35",
    active: "active:from-ochre-2/5 active:bg-ochre-6 active:dark:bg-ochre-7",
    activeForce: "!from-ochre-2/5 bg-ochre-6 dark:bg-ochre-7",
  },
  honey: {
    highlight: "shadow-honey-8/40 after:shadow-honey-0/30 after:dark:shadow-honey-0/20",
    base: "border-honey-8/40 via-honey-5/0 dark:via-honey-6/0 via-40% to-honey-2/25 text-shadow-honey-12/15 text-honey-0",
    from: "from-honey-2/15",
    bg: "bg-honey-5 dark:bg-honey-6",
    hover: "hover:not-active:from-honey-2/35",
    hoverForce: "from-honey-2/35",
    active: "active:from-honey-2/5 active:bg-honey-6 active:dark:bg-honey-7",
    activeForce: "!from-honey-2/5 bg-honey-6 dark:bg-honey-7",
  },
  lemon: {
    highlight: "shadow-lemon-8/40 after:shadow-lemon-0/30 after:dark:shadow-lemon-0/20",
    base: "border-lemon-8/40 via-lemon-5/0 dark:via-lemon-6/0 via-40% to-lemon-2/25 text-shadow-lemon-12/15 text-lemon-0",
    from: "from-lemon-2/15",
    bg: "bg-lemon-5 dark:bg-lemon-6",
    hover: "hover:not-active:from-lemon-2/35",
    hoverForce: "from-lemon-2/35",
    active: "active:from-lemon-2/5 active:bg-lemon-6 active:dark:bg-lemon-7",
    activeForce: "!from-lemon-2/5 bg-lemon-6 dark:bg-lemon-7",
  },
  pear: {
    highlight: "shadow-pear-8/40 after:shadow-pear-0/30 after:dark:shadow-pear-0/20",
    base: "border-pear-8/40 via-pear-5/0 dark:via-pear-6/0 via-40% to-pear-2/25 text-shadow-pear-12/15 text-pear-0",
    from: "from-pear-2/15",
    bg: "bg-pear-5 dark:bg-pear-6",
    hover: "hover:not-active:from-pear-2/35",
    hoverForce: "from-pear-2/35",
    active: "active:from-pear-2/5 active:bg-pear-6 active:dark:bg-pear-7",
    activeForce: "!from-pear-2/5 bg-pear-6 dark:bg-pear-7",
  },
  pistachio: {
    highlight: "shadow-pistachio-8/40 after:shadow-pistachio-0/30 after:dark:shadow-pistachio-0/20",
    base: "border-pistachio-8/40 via-pistachio-5/0 dark:via-pistachio-6/0 via-40% to-pistachio-2/25 text-shadow-pistachio-12/15 text-pistachio-0",
    from: "from-pistachio-2/15",
    bg: "bg-pistachio-5 dark:bg-pistachio-6",
    hover: "hover:not-active:from-pistachio-2/35",
    hoverForce: "from-pistachio-2/35",
    active: "active:from-pistachio-2/5 active:bg-pistachio-6 active:dark:bg-pistachio-7",
    activeForce: "!from-pistachio-2/5 bg-pistachio-6 dark:bg-pistachio-7",
  },
  jade: {
    highlight: "shadow-jade-8/40 after:shadow-jade-0/30 after:dark:shadow-jade-0/20",
    base: "border-jade-8/40 via-jade-5/0 dark:via-jade-6/0 via-40% to-jade-2/25 text-shadow-jade-12/15 text-jade-0",
    from: "from-jade-2/15",
    bg: "bg-jade-5 dark:bg-jade-6",
    hover: "hover:not-active:from-jade-2/35",
    hoverForce: "from-jade-2/35",
    active: "active:from-jade-2/5 active:bg-jade-6 active:dark:bg-jade-7",
    activeForce: "!from-jade-2/5 bg-jade-6 dark:bg-jade-7",
  },
  emerald: {
    highlight: "shadow-emerald-8/40 after:shadow-emerald-0/30 after:dark:shadow-emerald-0/20",
    base: "border-emerald-8/40 via-emerald-5/0 dark:via-emerald-6/0 via-40% to-emerald-2/25 text-shadow-emerald-12/15 text-emerald-0",
    from: "from-emerald-2/15",
    bg: "bg-emerald-5 dark:bg-emerald-6",
    hover: "hover:not-active:from-emerald-2/35",
    hoverForce: "from-emerald-2/35",
    active: "active:from-emerald-2/5 active:bg-emerald-6 active:dark:bg-emerald-7",
    activeForce: "!from-emerald-2/5 bg-emerald-6 dark:bg-emerald-7",
  },
  aqua: {
    highlight: "shadow-aqua-8/40 after:shadow-aqua-0/30 after:dark:shadow-aqua-0/20",
    base: "border-aqua-8/40 via-aqua-5/0 dark:via-aqua-6/0 via-40% to-aqua-2/25 text-shadow-aqua-12/15 text-aqua-0",
    from: "from-aqua-2/15",
    bg: "bg-aqua-5 dark:bg-aqua-6",
    hover: "hover:not-active:from-aqua-2/35",
    hoverForce: "from-aqua-2/35",
    active: "active:from-aqua-2/5 active:bg-aqua-6 active:dark:bg-aqua-7",
    activeForce: "!from-aqua-2/5 bg-aqua-6 dark:bg-aqua-7",
  },
  ocean: {
    highlight: "shadow-ocean-8/40 after:shadow-ocean-0/30 after:dark:shadow-ocean-0/20",
    base: "border-ocean-8/40 via-ocean-5/0 dark:via-ocean-6/0 via-40% to-ocean-2/25 text-shadow-ocean-12/15 text-ocean-0",
    from: "from-ocean-2/15",
    bg: "bg-ocean-5 dark:bg-ocean-6",
    hover: "hover:not-active:from-ocean-2/35",
    hoverForce: "from-ocean-2/35",
    active: "active:from-ocean-2/5 active:bg-ocean-6 active:dark:bg-ocean-7",
    activeForce: "!from-ocean-2/5 bg-ocean-6 dark:bg-ocean-7",
  },
  sky: {
    highlight: "shadow-sky-8/40 after:shadow-sky-0/30 after:dark:shadow-sky-0/20",
    base: "border-sky-8/40 via-sky-5/0 dark:via-sky-6/0 via-40% to-sky-2/25 text-shadow-sky-12/15 text-sky-0",
    from: "from-sky-2/15",
    bg: "bg-sky-5 dark:bg-sky-6",
    hover: "hover:not-active:from-sky-2/35",
    hoverForce: "from-sky-2/35",
    active: "active:from-sky-2/5 active:bg-sky-6 active:dark:bg-sky-7",
    activeForce: "!from-sky-2/5 bg-sky-6 dark:bg-sky-7",
  },
  cobalt: {
    highlight: "shadow-cobalt-8/40 after:shadow-cobalt-0/30 after:dark:shadow-cobalt-0/20",
    base: "border-cobalt-8/40 via-cobalt-5/0 dark:via-cobalt-6/0 via-40% to-cobalt-2/25 text-shadow-cobalt-12/15 text-cobalt-0",
    from: "from-cobalt-2/15",
    bg: "bg-cobalt-5 dark:bg-cobalt-6",
    hover: "hover:not-active:from-cobalt-2/35",
    hoverForce: "from-cobalt-2/35",
    active: "active:from-cobalt-2/5 active:bg-cobalt-6 active:dark:bg-cobalt-7",
    activeForce: "!from-cobalt-2/5 bg-cobalt-6 dark:bg-cobalt-7",
  },
  denim: {
    highlight: "shadow-denim-8/40 after:shadow-denim-0/30 after:dark:shadow-denim-0/20",
    base: "border-denim-8/40 via-denim-5/0 dark:via-denim-6/0 via-40% to-denim-2/25 text-shadow-denim-12/15 text-denim-0",
    from: "from-denim-2/15",
    bg: "bg-denim-5 dark:bg-denim-6",
    hover: "hover:not-active:from-denim-2/35",
    hoverForce: "from-denim-2/35",
    active: "active:from-denim-2/5 active:bg-denim-6 active:dark:bg-denim-7",
    activeForce: "!from-denim-2/5 bg-denim-6 dark:bg-denim-7",
  },
  iris: {
    highlight: "shadow-iris-8/40 after:shadow-iris-0/30 after:dark:shadow-iris-0/20",
    base: "border-iris-8/40 via-iris-5/0 dark:via-iris-6/0 via-40% to-iris-2/25 text-shadow-iris-12/15 text-iris-0",
    from: "from-iris-2/15",
    bg: "bg-iris-5 dark:bg-iris-6",
    hover: "hover:not-active:from-iris-2/35",
    hoverForce: "from-iris-2/35",
    active: "active:from-iris-2/5 active:bg-iris-6 active:dark:bg-iris-7",
    activeForce: "!from-iris-2/5 bg-iris-6 dark:bg-iris-7",
  },
  grape: {
    highlight: "shadow-grape-8/40 after:shadow-grape-0/30 after:dark:shadow-grape-0/20",
    base: "border-grape-8/40 via-grape-5/0 dark:via-grape-6/0 via-40% to-grape-2/25 text-shadow-grape-12/15 text-grape-0",
    from: "from-grape-2/15",
    bg: "bg-grape-5 dark:bg-grape-6",
    hover: "hover:not-active:from-grape-2/35",
    hoverForce: "from-grape-2/35",
    active: "active:from-grape-2/5 active:bg-grape-6 active:dark:bg-grape-7",
    activeForce: "!from-grape-2/5 bg-grape-6 dark:bg-grape-7",
  },
  lilac: {
    highlight: "shadow-lilac-8/40 after:shadow-lilac-0/30 after:dark:shadow-lilac-0/20",
    base: "border-lilac-8/40 via-lilac-5/0 dark:via-lilac-6/0 via-40% to-lilac-2/25 text-shadow-lilac-12/15 text-lilac-0",
    from: "from-lilac-2/15",
    bg: "bg-lilac-5 dark:bg-lilac-6",
    hover: "hover:not-active:from-lilac-2/35",
    hoverForce: "from-lilac-2/35",
    active: "active:from-lilac-2/5 active:bg-lilac-6 active:dark:bg-lilac-7",
    activeForce: "!from-lilac-2/5 bg-lilac-6 dark:bg-lilac-7",
  },
  fuchsia: {
    highlight: "shadow-fuchsia-8/40 after:shadow-fuchsia-0/30 after:dark:shadow-fuchsia-0/20",
    base: "border-fuchsia-8/40 via-fuchsia-5/0 dark:via-fuchsia-6/0 via-40% to-fuchsia-2/25 text-shadow-fuchsia-12/15 text-fuchsia-0",
    from: "from-fuchsia-2/15",
    bg: "bg-fuchsia-5 dark:bg-fuchsia-6",
    hover: "hover:not-active:from-fuchsia-2/35",
    hoverForce: "from-fuchsia-2/35",
    active: "active:from-fuchsia-2/5 active:bg-fuchsia-6 active:dark:bg-fuchsia-7",
    activeForce: "!from-fuchsia-2/5 bg-fuchsia-6 dark:bg-fuchsia-7",
  },
  blush: {
    highlight: "shadow-blush-8/40 after:shadow-blush-0/30 after:dark:shadow-blush-0/20",
    base: "border-blush-8/40 via-blush-5/0 dark:via-blush-6/0 via-40% to-blush-2/25 text-shadow-blush-12/15 text-blush-0",
    from: "from-blush-2/15",
    bg: "bg-blush-5 dark:bg-blush-6",
    hover: "hover:not-active:from-blush-2/35",
    hoverForce: "from-blush-2/35",
    active: "active:from-blush-2/5 active:bg-blush-6 active:dark:bg-blush-7",
    activeForce: "!from-blush-2/5 bg-blush-6 dark:bg-blush-7",
  },
  primary: {
    highlight: "shadow-primary-8/40 after:shadow-primary-0/30 after:dark:shadow-primary-0/20",
    base: "border-primary-8/40 via-primary-5/0 dark:via-primary-6/0 via-40% to-primary-2/25 text-shadow-primary-12/15 text-primary-0",
    from: "from-primary-2/15",
    bg: "bg-primary-5 dark:bg-primary-6",
    hover: "hover:not-active:from-primary-2/35",
    hoverForce: "from-primary-2/35",
    active: "active:from-primary-2/5 active:bg-primary-6 active:dark:bg-primary-7",
    activeForce: "!from-primary-2/5 bg-primary-6 dark:bg-primary-7",
  },
};

interface VariantClassConfig {
  root: string;
  rootAfter: string;
  inner: string;
  innerBefore: string;
}

const variantClasses: Record<SurfaceVariant, VariantClassConfig> = {
  default: {
    root: "rounded-sm",
    rootAfter: "after:rounded-[3.5px]",
    inner: "rounded-sm border-[0.5px]",
    innerBefore: "before:rounded-sm",
  },
  full: {
    root: "rounded-none",
    rootAfter: "after:rounded-none",
    inner: "rounded-none border-y-[0.5px] border-x-0",
    innerBefore: "before:rounded-none",
  },
};

export interface SurfaceRootProps extends Props<"div"> {}

export interface SurfaceInnerProps extends Props<"div"> {
  forceHover?: boolean;
  forceActive?: boolean;
  forceFocus?: boolean;
  render?: (props: Props<"div">) => RemixNode;
}

export function SurfaceRoot(_handle: Handle, setup: SurfaceSetup = {}) {
  const color = setup.color ?? "default";
  const config = colorClasses[color];
  const v = variantClasses[setup.variant ?? "default"];

  return (props: SurfaceRootProps) => {
    const { class: classes = "relative", ...rest } = props;

    return (
      <div
        class={cn(
          v.root,
          "shadow-recess dark:shadow-background/40",
          v.rootAfter,
          "after:pointer-events-none after:absolute after:inset-[0.5px] after:shadow-highlight after:transition",
          config.highlight,
          classes,
        )}
        {...rest}
      />
    );
  };
}

export function SurfaceInner(_handle: Handle, setup: SurfaceSetup = {}) {
  const color = setup.color ?? "default";
  const config = colorClasses[color];
  const v = variantClasses[setup.variant ?? "default"];

  return (props: SurfaceInnerProps) => {
    const {
      children,
      class: classes,
      forceHover,
      forceActive,
      forceFocus,
      render,
      ...rest
    } = props;

    const innerProps = {
      children,
      class: cn(
        "flex items-center justify-center text-xs h-7 block transition cursor-pointer bg-linear-to-b text-shadow-xxs dark:text-shadow-xs dark:border-background/40 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 outline-none bg-clip-padding",
        v.inner,
        v.innerBefore,
        "before:pointer-events-none before:absolute before:inset-0 before:border before:border-sky-5 before:ring-2 before:ring-sky-5/20 before:transition",
        "focus-visible:before:opacity-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        config.base,
        forceHover ? config.hoverForce : config.from,
        config.hover,
        forceActive ? config.activeForce : config.bg,
        config.active,
        forceFocus ? "before:opacity-100" : "before:opacity-0",
        classes,
      ),
      ...rest,
    };

    if (render) {
      return render(innerProps);
    }

    return <div {...innerProps} />;
  };
}

export function SurfaceElement(_handle: Handle, setup: SurfaceSetup = {}) {
  const color = setup.color ?? "default";
  const config = colorClasses[color];
  const v = variantClasses[setup.variant ?? "default"];

  return (props: SurfaceProps) => {
    const {
      children,
      class: classes,
      forceHover,
      forceActive,
      forceFocus,
      render,
      ...rest
    } = props;

    const innerProps = {
      children,
      class: cn(
        "flex items-center justify-center text-xs h-7 block transition cursor-pointer bg-linear-to-b text-shadow-xxs dark:text-shadow-xs dark:border-background/40 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 outline-none bg-clip-padding",
        v.inner,
        v.innerBefore,
        "before:pointer-events-none before:absolute before:inset-0 before:border before:border-sky-5 before:ring-2 before:ring-sky-5/20 before:transition",
        "focus-visible:before:opacity-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        config.base,
        forceHover ? config.hoverForce : config.from,
        config.hover,
        forceActive ? config.activeForce : config.bg,
        config.active,
        forceFocus ? "before:opacity-100" : "before:opacity-0",
        classes,
      ),
      ...rest,
    };

    return (
      <div
        class={cn(
          v.root,
          "relative shadow-recess dark:shadow-background/40",
          v.rootAfter,
          "after:pointer-events-none after:absolute after:inset-[0.5px] after:shadow-highlight after:transition",
          config.highlight,
        )}
      >
        {render ? render(innerProps) : <div {...innerProps} />}
      </div>
    );
  };
}

export const Surface = {
  Root: SurfaceRoot,
  Inner: SurfaceInner,
  Element: SurfaceElement,
};
