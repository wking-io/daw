import { BaseIcon, type IconProps } from "./base";

export function AddIcon() {
  return (props: IconProps) => {
    return (
      <BaseIcon {...props}>
        <path d="M1 8L15 8" />
        <path d="M8 15L8 1" />
      </BaseIcon>
    );
  };
}
