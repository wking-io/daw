/**
 * Data attributes applied to Field components.
 */
export enum FieldRootDataAttributes {
  /**
   * Present when the field is disabled.
   */
  disabled = "data-disabled",
  /**
   * Present when the field has been touched (blurred at least once).
   */
  touched = "data-touched",
  /**
   * Present when the field value differs from initial value.
   */
  dirty = "data-dirty",
  /**
   * Present when the field is valid.
   */
  valid = "data-valid",
  /**
   * Present when the field is invalid.
   */
  invalid = "data-invalid",
  /**
   * Present when the field has a value.
   */
  filled = "data-filled",
  /**
   * Present when the field control is focused.
   */
  focused = "data-focused",
}
