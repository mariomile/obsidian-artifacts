import { FileView, Notice, Platform, TFile, debounce } from 'obsidian';
import type { TAbstractFile, WorkspaceLeaf } from 'obsidian';
import { HtmlRenderer } from './renderer/html-renderer.ts';
import { hasExternalScripts } from './renderer/html-transform.ts';
import type { ResolvedLink } from './renderer/link-resolve.ts';
import { createMobileToolbar } from './ui/mobile-toolbar.ts';
import { createMobilePoster } from './ui/mobile-poster.ts';
import type ArtifactsPlugin from './main.ts';

export const ARTIFACT_VIEW_TYPE = 'artifacts-html-view';

export class ArtifactView extends FileView {
  private renderer: HtmlRenderer;
  private disposeToolbar: (() => void) | null = null;
  private disposePoster: (() => void) | null = null;
  // Mobile only: whether the user has tapped through the tap-to-load poster for the current file.
  private activated = false;
  private reload = debounce(() => void this.renderCurrentFile(), 300, true);

  constructor(leaf: WorkspaceLeaf, private plugin: ArtifactsPlugin) {
    super(leaf);
    this.renderer = new HtmlRenderer(this.app, this.plugin.settings, {
      onNavigate: (link) => this.handleNavigate(link),
    });
    // Match the file before debouncing: a debounce keeps only the last call's argument, so a
    // save of any other note inside the window would swallow this artifact's reload.
    this.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => {
        if (this.file && file instanceof TFile && file.path === this.file.path) this.reload();
      }),
    );
    this.register(() => this.reload.cancel());
  }

  getViewType(): string {
    return ARTIFACT_VIEW_TYPE;
  }

  getIcon(): string {
    return 'code-2';
  }

  getDisplayText(): string {
    return this.file?.basename ?? 'Artifact';
  }

  async onLoadFile(): Promise<void> {
    this.activated = false;
    await this.renderCurrentFile();
  }

  async onUnloadFile(): Promise<void> {
    this.disposeToolbar?.();
    this.disposeToolbar = null;
    this.disposePoster?.();
    this.disposePoster = null;
    this.renderer.clear(this.contentEl);
  }

  currentFrame(): HTMLElement | null {
    return this.renderer.getFrame();
  }

  private async renderCurrentFile(): Promise<void> {
    const file = this.file;
    if (!file) return;
    this.contentEl.addClass('artifacts-container');

    // On mobile the iframe fallback shares Obsidian's main thread, so an artifact that loads
    // external scripts can freeze the whole app if it auto-runs. Gate it behind an explicit tap.
    if (Platform.isMobile && !this.activated) {
      let raw = '';
      try {
        raw = await this.app.vault.cachedRead(file);
      } catch {
        /* fall through to render */
      }
      // The view closed or switched file during the read: onUnloadFile already cleared, so
      // rendering now would leave a frame (and its message listener) behind on a dead view.
      if (this.file !== file) return;
      if (hasExternalScripts(raw)) {
        this.showPoster(file);
        return;
      }
    }

    this.disposePoster?.();
    this.disposePoster = null;
    await this.renderer.render(this.contentEl, file);
    this.mountToolbar();
  }

  private showPoster(file: TFile): void {
    this.disposeToolbar?.();
    this.disposeToolbar = null;
    this.disposePoster?.();
    this.renderer.clear(this.contentEl);
    this.disposePoster = createMobilePoster(this.contentEl, {
      title: file.basename,
      warn: 'Loads external scripts — on mobile this can slow down or freeze the app.',
      onOpen: () => {
        this.activated = true;
        void this.renderCurrentFile();
      },
      onExternal: () => this.openExternally(),
    });
  }

  // The renderer empties contentEl on every render, so the toolbar is (re)mounted afterwards.
  private mountToolbar(): void {
    this.disposeToolbar?.();
    this.disposeToolbar = null;
    if (!Platform.isMobile || !this.file) return;
    this.disposeToolbar = createMobileToolbar(this.contentEl, [
      { icon: 'rotate-cw', label: 'Reload artifact', onClick: () => void this.renderCurrentFile() },
      { icon: 'external-link', label: 'Open externally', onClick: () => this.openExternally() },
    ]);
  }

  private openExternally(): void {
    if (!this.file) return;
    window.open(this.app.vault.getResourcePath(this.file), '_blank');
  }

  private handleNavigate(link: ResolvedLink): void {
    if (link.kind === 'vault') {
      const target = this.app.vault.getAbstractFileByPath(link.path);
      if (target instanceof TFile) {
        const leaf = this.plugin.settings.openLinksInNewTab
          ? this.app.workspace.getLeaf('tab')
          : this.leaf;
        void leaf.openFile(target);
        return;
      }
      new Notice(`Artifacts: file not found in vault — ${link.path}`);
      return;
    }
    window.open(link.url, '_blank');
  }
}
