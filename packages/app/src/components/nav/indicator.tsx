import type { Handle } from "@remix-run/component";
import { Tabs } from "../ui/tabs";

export function Indicator(_handle: Handle) {
	return () => (
		<Tabs.Indicator
			class="
    absolute
    left-0
    top-0
    block
    h-(--active-tab-height)
    w-(--active-tab-width)

    transform-gpu
    translate-x-(--active-tab-left)
    transition-[transform,width,translate]

    after:pointer-events-none
    after:absolute
    after:inset-px
    after:rounded-sm
    after:shadow-highlight
after:shadow-layer-3/40
    dark:after:shadow-foreground/5
    after:transition
    origin-left
  "
		>
			<span
				class="
				transition
      absolute
      inset-0                       /* fills the transformed parent */
      text-sm
      cursor-pointer
      bg-layer-2
      bg-linear-to-b
      from-layer-3/30
      dark:from-foreground/2
      via-layer-2
      via-40%
      to-layer-3/50
      dark:to-foreground/5
      text-foreground
      rounded-sm
      border
      border-oatmeal-12/15
      shadow-input
      shadow-oatmeal-12/5
      dark:shadow-oatmeal-12/10
      outline-none
      bg-clip-padding
    "
			/>
		</Tabs.Indicator>
	);
}
