import { Switch as BaseSwitch } from "@base-ui-components/react/switch";

export default function Switch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <BaseSwitch.Root
      checked={value}
      onCheckedChange={onChange}
      className="relative flex h-6 w-10 rounded-full bg-gradient-to-r from-foreground/80 from-35% to-foreground/20 to-65% bg-[length:6.5rem_100%] bg-[100%_0%] bg-no-repeat p-px shadow-[inset_0_1.5px_2px] shadow-stone-800/80 outline outline-1 -outline-offset-1 outline-foreground/80 transition-[background-position,box-shadow] duration-[125ms] ease-[cubic-bezier(0.26,0.75,0.38,0.45)] before:absolute before:rounded-full before:outline-offset-2 before:outline-orange focus-visible:before:inset-0 focus-visible:before:outline focus-visible:before:outline-2 active:bg-layer-2 data-[checked]:bg-[0%_0%] data-[checked]:active:bg-layer-2"
    >
      <BaseSwitch.Thumb className="aspect-square h-full rounded-full bg-layer shadow-[0_0_1px_1px,0_1px_1px,1px_2px_4px_-1px] shadow-stone-800/80 transition-transform duration-150 data-[checked]:translate-x-4" />
    </BaseSwitch.Root>
  );
}
