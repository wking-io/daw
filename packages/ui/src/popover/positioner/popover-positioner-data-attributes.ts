/**
 * Data attributes applied to the PopoverPositioner component.
 */
export enum PopoverPositionerDataAttributes {
  /**
   * Indicates which side the positioner is on.
   * @type {'top' | 'bottom' | 'left' | 'right'}
   */
  side = "data-side",
  /**
   * Indicates the alignment of the positioner.
   * @type {'start' | 'center' | 'end'}
   */
  align = "data-align",
  /**
   * Present when positioning is complete.
   */
  positioned = "data-positioned",
  /**
   * Present when the anchor element is hidden.
   */
  anchorHidden = "data-anchor-hidden",
}
