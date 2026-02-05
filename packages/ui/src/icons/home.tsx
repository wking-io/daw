import { BaseIcon, type IconProps } from "./base";

export function HomeIcon() {
  return (props: IconProps) => {
    return (
      <BaseIcon {...props}>
        <path d="M2 6.07692L8 1L14 6.07692V15.0769H2V6.07692Z" />
      </BaseIcon>
    );
  };
}
