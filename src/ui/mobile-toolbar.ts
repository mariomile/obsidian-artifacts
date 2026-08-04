import { setIcon } from 'obsidian';

export interface ToolbarAction {
  /** Lucide icon id (e.g. 'rotate-cw'). */
  icon: string;
  /** Accessible label — used for `aria-label` and the tooltip. */
  label: string;
  onClick: () => void;
}

/** Mounts a floating pill of icon buttons over an artifact frame (mobile only).
 *  Styling leans entirely on Obsidian CSS variables so a theme (Cosmos) skins it for free.
 *  Returns a disposer that removes the pill. */
export function createMobileToolbar(
  container: HTMLElement,
  actions: ToolbarAction[],
): () => void {
  const bar = container.createDiv({ cls: 'artifacts-toolbar' });
  for (const action of actions) {
    const btn = bar.createEl('button', {
      cls: 'artifacts-toolbar-btn',
      attr: { 'aria-label': action.label, title: action.label },
    });
    setIcon(btn, action.icon);
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      action.onClick();
    });
  }
  return () => bar.remove();
}
