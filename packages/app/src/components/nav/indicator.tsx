import type { Handle } from "@remix-run/component";
import { spring } from "@remix-run/component";
import { Tabs } from "@daw/ui";
import { Surface } from "../surface";

export function Indicator(_handle: Handle) {
  return () => (
    <Tabs.Indicator
      render={(props) => (
        <Surface.Root
          {...props}
          class="absolute left-(--active-tab-left) top-0 block h-(--active-tab-height) w-(--active-tab-width)"
          animate={{
            layout: spring("snappy"),
          }}
        >
          <Surface.Inner />
        </Surface.Root>
      )}
    />
  );
}
