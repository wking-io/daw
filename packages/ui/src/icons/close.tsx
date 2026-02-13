import { BaseIcon, type IconProps } from "./base";

export function CloseIcon() {
  return (props: IconProps) => {
    return (
      <BaseIcon {...props}>
        <path d="M3.05025 12.9497L12.9497 3.05025" />
        <path d="M12.9497 12.9497L3.05025 3.05025" />
      </BaseIcon>
    );
  };
}
