/**
 * Calls `onExpire` once something has stayed out of view for `delayMs`.
 *
 * Feed it each visibility change (from an IntersectionObserver). Coming back
 * into view before the delay cancels the pending expiry; repeated "hidden"
 * updates do not restart it. `window.setTimeout` keeps it popout-safe.
 */
export function createOffscreenTimer(
  delayMs: number,
  onExpire: () => void,
): { update(visible: boolean): void; cancel(): void } {
  let timer: number | null = null;

  const cancel = (): void => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  return {
    update(visible: boolean): void {
      if (visible) {
        cancel();
        return;
      }
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        onExpire();
      }, delayMs);
    },
    cancel,
  };
}
