import { Slider as BaseSlider } from "@base-ui-components/react/slider";

export default function Slider({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <BaseSlider.Root
      value={value}
      onValueChange={onChange}
      min={min}
      max={max}
      step={step}
    >
      <BaseSlider.Control className="flex w-48 touch-none items-center px-5 py-3 select-none">
        <BaseSlider.Track className="relative flex h-1 w-full bg-layer shadow-[inset_0_0_0_1px] shadow-foreground/10 select-none">
          <p className="absolute top-1/2 right-full -mt-px mr-2 -translate-y-1/2 text-xs text-foreground-muted">
            [-]
          </p>
          <BaseSlider.Indicator className="bg-background/20 select-none" />
          <BaseSlider.Thumb className="size-3 bg-layer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange/50 border border-foreground" />
          <p className="absolute top-1/2 left-full -mt-px ml-2 -translate-y-1/2 text-xs text-foreground-muted">
            [+]
          </p>
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
