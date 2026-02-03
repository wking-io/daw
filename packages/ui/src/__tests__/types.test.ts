/**
 * Type definition tests to verify API stability.
 * These tests will fail at compile time if the component APIs change.
 *
 * This file tests that:
 * 1. All expected types are exported
 * 2. Types have the expected shape
 * 3. Namespace exports work correctly
 */

import { describe, expect, it } from "bun:test";
import type { RemixNode } from "@remix-run/component";

// Button types
import type { ButtonSize, ButtonSetup, ButtonProps, ButtonState } from "../button";
import { Button } from "../button";

// Field types
import type {
  FieldValidationMode,
  FieldValidityState,
  FieldRootSetup,
  FieldRootState,
} from "../field";

// Popover types
import type {
  PopoverRootSetup,
  PopoverPositionerSide,
  PopoverPositionerAlign,
  Popover,
} from "../popover";

// Tabs types
import type {
  TabsValue,
  TabsOrientation,
  TabsActivationDirection,
  TabsRootSetup,
  TabsTabSetup,
  TabsPanelSetup,
  TabsIndicatorSetup,
  TabsIndicatorPosition,
  TabsIndicatorSize,
} from "../tabs";

// Namespace imports
import { Tabs } from "../index";

describe("Type Definition Tests", () => {
  describe("Button types", () => {
    it("ButtonSize has expected values", () => {
      const sizes: ButtonSize[] = ["xs", "sm", "default"];
      expect(sizes).toHaveLength(3);
    });

    it("ButtonSetup has expected shape", () => {
      const setup: ButtonSetup = {
        size: "sm",
        disabled: true,
      };
      expect(setup.size).toBe("sm");
      expect(setup.disabled).toBe(true);
    });

    it("ButtonProps extends button props", () => {
      const props: ButtonProps = {
        children: "Click me" as unknown as RemixNode,
        class: "custom-class",
        type: "submit",
        disabled: true,
      };
      expect(props.type).toBe("submit");
    });

    it("ButtonState has expected properties", () => {
      const state: ButtonState = {
        disabled: false,
        size: "default",
      };
      expect(state.disabled).toBe(false);
      expect(state.size).toBe("default");
    });

    it("Button namespace exports work", () => {
      const setup: Button.Setup = { size: "xs" };
      const size: Button.Size = "sm";

      expect(setup.size).toBe("xs");
      expect(size).toBe("sm");
    });
  });

  describe("Field types", () => {
    it("FieldValidationMode has expected values", () => {
      const modes: FieldValidationMode[] = ["onSubmit", "onBlur", "onChange"];
      expect(modes).toHaveLength(3);
    });

    it("FieldValidityState has expected properties", () => {
      const state: FieldValidityState = {
        badInput: false,
        customError: false,
        patternMismatch: false,
        rangeOverflow: false,
        rangeUnderflow: false,
        stepMismatch: false,
        tooLong: false,
        tooShort: false,
        typeMismatch: false,
        valueMissing: false,
        valid: null,
      };
      expect(state.valid).toBeNull();
    });

    it("FieldRootSetup has expected shape", () => {
      const setup: FieldRootSetup = {
        name: "email",
        disabled: false,
        invalid: false,
        validationMode: "onBlur",
        validationDebounceTime: 300,
        validate: async () => null,
      };
      expect(setup.name).toBe("email");
    });

    it("FieldRoot namespace exports work", () => {
      const setup: FieldRootSetup = { name: "test" };
      const state: FieldRootState = {
        disabled: false,
        touched: false,
        dirty: false,
        valid: null,
        filled: false,
        focused: false,
      };

      expect(setup.name).toBe("test");
      expect(state.touched).toBe(false);
    });
  });

  describe("Popover types", () => {
    it("PopoverRootSetup has expected shape", () => {
      const setup: PopoverRootSetup = {
        defaultOpen: false,
        onOpenChange: () => {},
      };
      expect(setup.defaultOpen).toBe(false);
    });

    it("PopoverPositionerSide has expected values", () => {
      const sides: PopoverPositionerSide[] = ["top", "bottom", "left", "right"];
      expect(sides).toHaveLength(4);
    });

    it("PopoverPositionerAlign has expected values", () => {
      const aligns: PopoverPositionerAlign[] = ["start", "center", "end"];
      expect(aligns).toHaveLength(3);
    });

    it("PopoverSide and PopoverAlign are re-exported", () => {
      const side: Popover.Positioner.Side = "top";
      const align: Popover.Positioner.Align = "start";

      expect(side).toBe("top");
      expect(align).toBe("start");
    });

    it("PopoverRoot namespace exports work", () => {
      const setup: Popover.Root.Setup = { defaultOpen: true };
      const state: Popover.Root.State = { open: true };

      expect(setup.defaultOpen).toBe(true);
      expect(state.open).toBe(true);
    });

    it("PopoverPositioner namespace exports work", () => {
      const side: Popover.Positioner.Side = "bottom";
      const align: Popover.Positioner.Align = "center";

      expect(side).toBe("bottom");
      expect(align).toBe("center");
    });
  });

  describe("Tabs types", () => {
    it("TabsValue accepts strings and numbers", () => {
      const stringValue: TabsValue = "tab1";
      const numberValue: TabsValue = 0;

      expect(stringValue).toBe("tab1");
      expect(numberValue).toBe(0);
    });

    it("TabsOrientation has expected values", () => {
      const orientations: TabsOrientation[] = ["horizontal", "vertical"];
      expect(orientations).toHaveLength(2);
    });

    it("TabsActivationDirection has expected values", () => {
      const directions: TabsActivationDirection[] = ["left", "right", "up", "down", "none"];
      expect(directions).toHaveLength(5);
    });

    it("TabsRootSetup has expected shape", () => {
      const setup: TabsRootSetup = {
        defaultValue: "tab1",
        orientation: "horizontal",
      };
      expect(setup.defaultValue).toBe("tab1");
    });

    it("TabsTabSetup requires value", () => {
      const setup: TabsTabSetup = {
        value: "tab1",
        disabled: false,
      };
      expect(setup.value).toBe("tab1");
    });

    it("TabsPanelSetup requires value", () => {
      const setup: TabsPanelSetup = {
        value: "tab1",
        keepMounted: true,
      };
      expect(setup.keepMounted).toBe(true);
    });

    it("TabsIndicatorSetup has timing properties", () => {
      const setup: TabsIndicatorSetup = {
        speed: 800,
        minDuration: 100,
        maxDuration: 300,
      };
      expect(setup.speed).toBe(800);
    });

    it("TabsIndicatorPosition has position properties", () => {
      const position: TabsIndicatorPosition = {
        left: 0,
        right: 100,
        top: 0,
        bottom: 40,
      };
      expect(position.left).toBe(0);
    });

    it("TabsIndicatorSize has size properties", () => {
      const size: TabsIndicatorSize = {
        width: 100,
        height: 40,
      };
      expect(size.width).toBe(100);
    });

    it("TabsRoot namespace exports work", () => {
      const value: Tabs.Root.Value = "test";
      const orientation: Tabs.Root.Orientation = "vertical";
      const direction: Tabs.Root.ActivationDirection = "left";

      expect(value).toBe("test");
      expect(orientation).toBe("vertical");
      expect(direction).toBe("left");
    });
  });
});
