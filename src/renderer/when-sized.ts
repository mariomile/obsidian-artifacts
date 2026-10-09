/**
 * Run `onSized` once `el` has a *stable* non-zero client height, then stop.
 *
 * Electron `<webview>` guests snapshot their viewport from the host element's
 * size at attach time and never recover if that height was wrong — they stick
 * at the 150px UA default (percentage height against an indefinite parent) and
 * clip the content. So a webview must be appended only when the container has
 * settled at its final height.
 *
 * A container reaching its final height passes through transient values first
 * (observed: 0 → 44 → 845 during a layout pass), so firing on the first
 * non-zero height is not enough — it can catch a transient. We debounce on
 * ResizeObserver: after the height stops changing for `debounceMs`, it is
 * settled. `setTimeout` is used rather than `requestAnimationFrame` on purpose —
 * rAF starves when the Obsidian window is not focused, which is exactly the
 * background-tab case this needs to survive.
 *
 * Returns a disposer that stops the observer and any pending timer.
 */
export function whenSized(
  el: HTMLElement,
  onSized: () => void,
  debounceMs = 80,
): () => void {
  let done = false;
  let timer: number | null = null;

  const settle = (): void => {
    if (done || el.clientHeight <= 0) return;
    done = true;
    observer.disconnect();
    onSized();
  };

  const schedule = (): void => {
    if (done || el.clientHeight <= 0) return;
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(settle, debounceMs);
  };

  const observer = new ResizeObserver(schedule);
  observer.observe(el);
  schedule(); // fast path: already-visible view, no resize event coming

  return (): void => {
    done = true;
    observer.disconnect();
    if (timer !== null) window.clearTimeout(timer);
  };
}
