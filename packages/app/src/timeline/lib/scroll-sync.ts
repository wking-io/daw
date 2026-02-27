/**
 * Manages programmatic scroll suppression.
 *
 * When we sync state → DOM by writing `scrollLeft`, the browser fires a
 * `scroll` event indistinguishable from a user-initiated scroll. ScrollSync
 * tracks programmatic writes so the scroll handler can ignore them.
 */
export class ScrollSync {
  #suppress = false;

  /**
   * Programmatically set `scrollLeft` on `el`, marking the next scroll event
   * as programmatic. Skips the write (and does not set the suppress flag) when
   * the current position is already within 0.5px of `target`.
   *
   * Returns `true` if a write occurred.
   */
  writeTo(el: { scrollLeft: number }, target: number): boolean {
    if (Math.abs(el.scrollLeft - target) < 0.5) return false;
    this.#suppress = true;
    el.scrollLeft = target;
    return true;
  }

  /**
   * Call at the top of a `scroll` event handler. Returns `true` when the event
   * was caused by a programmatic `writeTo` and should be ignored. Automatically
   * resets the flag so subsequent user-initiated events pass through.
   */
  isSuppressed(): boolean {
    if (this.#suppress) {
      this.#suppress = false;
      return true;
    }
    return false;
  }
}
