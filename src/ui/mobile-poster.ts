import { setIcon } from 'obsidian';

export interface PosterOptions {
  title: string;
  /** Optional caution line shown above the actions (e.g. loads external scripts). */
  warn?: string;
  /** Run the artifact in-app (build the iframe). */
  onOpen: () => void;
  /** Hand off to the system browser, where it runs in its own process. */
  onExternal?: () => void;
}

/** Renders a tap-to-load placeholder over an artifact frame (mobile only). Mobile has no
 *  `<webview>` to isolate an artifact's JS, so a heavy/looping one shares Obsidian's main thread
 *  and can freeze the app. The poster keeps such artifacts from auto-running on open — the user
 *  decides to run it in-app or open it externally. Returns a disposer that removes the poster. */
export function createMobilePoster(container: HTMLElement, opts: PosterOptions): () => void {
  const poster = container.createDiv({ cls: 'artifacts-poster' });

  const icon = poster.createDiv({ cls: 'artifacts-poster-icon' });
  setIcon(icon, 'code-2');

  poster.createDiv({ cls: 'artifacts-poster-title', text: opts.title });
  poster.createDiv({ cls: 'artifacts-poster-sub', text: 'Interactive HTML artifact' });

  if (opts.warn) {
    const warn = poster.createDiv({ cls: 'artifacts-poster-warn' });
    setIcon(warn.createSpan({ cls: 'artifacts-poster-warn-icon' }), 'alert-triangle');
    warn.createSpan({ text: opts.warn });
  }

  const actions = poster.createDiv({ cls: 'artifacts-poster-actions' });

  const openBtn = actions.createEl('button', {
    cls: 'artifacts-poster-btn is-cta',
    text: 'Open artifact',
  });
  openBtn.addEventListener('click', (event) => {
    event.preventDefault();
    opts.onOpen();
  });

  if (opts.onExternal) {
    const extBtn = actions.createEl('button', {
      cls: 'artifacts-poster-btn',
      text: 'Open in browser',
    });
    extBtn.addEventListener('click', (event) => {
      event.preventDefault();
      opts.onExternal?.();
    });
  }

  return () => poster.remove();
}
