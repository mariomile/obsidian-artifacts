import { Component, Platform, TFile, debounce } from 'obsidian';
import type { App, TAbstractFile } from 'obsidian';
import { HtmlRenderer } from './renderer/html-renderer.ts';
import { hasExternalScripts } from './renderer/html-transform.ts';
import { registerHtmlEmbed, unregisterHtmlEmbed } from './obsidian-internals.ts';
import type { EmbedContext } from './obsidian-internals.ts';
import { createMobileToolbar } from './ui/mobile-toolbar.ts';
import { createMobilePoster } from './ui/mobile-poster.ts';
import { createOffscreenTimer } from './offscreen-timer.ts';
import type ArtifactsPlugin from './main.ts';

const HTML_EXTENSIONS = ['html', 'htm'];
// Desktop: each <webview> is its own renderer process, so an embed out of view this long is torn
// down and rendered again when it scrolls back. Mobile keeps its tap-to-load poster instead.
const OFFSCREEN_UNLOAD_MS = 30_000;

class ArtifactEmbed extends Component {
  private renderer: HtmlRenderer;
  private observer: IntersectionObserver | null = null;
  private loaded = false;
  private activated = false;
  // Desktop: the frame was torn down after staying out of view; re-rendered when visible again.
  private suspended = false;
  private offscreen = createOffscreenTimer(OFFSCREEN_UNLOAD_MS, () => this.suspend());
  private disposeToolbar: (() => void) | null = null;
  private disposePoster: (() => void) | null = null;
  private reload = debounce(() => void this.renderArtifact(), 300, true);

  constructor(private ctx: EmbedContext, private file: TFile, plugin: ArtifactsPlugin) {
    super();
    this.renderer = new HtmlRenderer(ctx.app, plugin.settings, {
      onNavigate: (link) => {
        if (link.kind === 'external') {
          window.open(link.url, '_blank');
          return;
        }
        const target = ctx.app.vault.getAbstractFileByPath(link.path);
        if (target instanceof TFile) void ctx.app.workspace.getLeaf('tab').openFile(target);
      },
    });
  }

  onload(): void {
    this.ctx.containerEl.addClass('artifacts-embed-container');
    this.observer = new IntersectionObserver((entries) => {
      // Several entries can queue up for the one target: the last is the current state.
      const visible = entries[entries.length - 1]?.isIntersecting ?? false;
      if (!this.loaded) {
        if (!visible) return;
        this.loaded = true;
        void this.presentOrRender();
        if (Platform.isMobile) this.observer?.disconnect();
        return;
      }
      if (visible && this.suspended) void this.renderArtifact();
      this.offscreen.update(visible);
    });
    this.observer.observe(this.ctx.containerEl);
    // Match the file before debouncing: a debounce keeps only the last call's argument, so a
    // save of any other note inside the window would swallow this artifact's reload.
    this.registerEvent(
      this.ctx.app.vault.on('modify', (file: TAbstractFile) => {
        if (this.activated && !this.suspended && file instanceof TFile && file.path === this.file.path) this.reload();
      }),
    );
    this.register(() => this.reload.cancel());
  }

  // Obsidian calls loadFile() on every embed component it creates, once the embed
  // is due to show; without it the host note fails to open ("l.loadFile is not a
  // function"). It is also the render trigger: the IntersectionObserver alone never
  // fires for the zero-height container in Live Preview.
  async loadFile(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    // Desktop keeps observing to unload the frame while it is out of view.
    if (Platform.isMobile) this.observer?.disconnect();
    await this.presentOrRender();
  }

  onunload(): void {
    this.observer?.disconnect();
    this.offscreen.cancel();
    this.disposeToolbar?.();
    this.disposeToolbar = null;
    this.disposePoster?.();
    this.disposePoster = null;
    this.renderer.clear(this.ctx.containerEl);
  }

  // On mobile, gate an external-script artifact behind a tap so it can't auto-run and freeze
  // the app (the iframe fallback shares Obsidian's main thread). Light artifacts render inline.
  private async presentOrRender(): Promise<void> {
    if (Platform.isMobile && !this.activated) {
      let raw = '';
      try {
        raw = await this.ctx.app.vault.cachedRead(this.file);
      } catch {
        /* fall through to render */
      }
      if (hasExternalScripts(raw)) {
        this.showPoster();
        return;
      }
    }
    await this.renderArtifact();
  }

  private showPoster(): void {
    this.disposeToolbar?.();
    this.disposeToolbar = null;
    this.disposePoster?.();
    this.renderer.clear(this.ctx.containerEl);
    this.disposePoster = createMobilePoster(this.ctx.containerEl, {
      title: this.file.basename,
      warn: 'Loads external scripts — on mobile this can slow down or freeze the app.',
      onOpen: () => {
        this.activated = true;
        void this.renderArtifact();
      },
      onExternal: () =>
        window.open(this.ctx.app.vault.getResourcePath(this.file), '_blank'),
    });
  }

  private suspend(): void {
    this.suspended = true;
    this.reload.cancel();
    this.renderer.clear(this.ctx.containerEl);
  }

  private async renderArtifact(): Promise<void> {
    this.activated = true;
    this.suspended = false;
    this.disposePoster?.();
    this.disposePoster = null;
    await this.renderer.render(this.ctx.containerEl, this.file);
    this.mountToolbar();
  }

  // Rendered inside the note flow: expand hands the artifact to a full standalone tab.
  private mountToolbar(): void {
    this.disposeToolbar?.();
    this.disposeToolbar = null;
    if (!Platform.isMobile) return;
    this.disposeToolbar = createMobileToolbar(this.ctx.containerEl, [
      {
        icon: 'maximize-2',
        label: 'Open full screen',
        onClick: () => void this.ctx.app.workspace.getLeaf('tab').openFile(this.file),
      },
      { icon: 'rotate-cw', label: 'Reload artifact', onClick: () => void this.renderArtifact() },
      {
        icon: 'external-link',
        label: 'Open externally',
        onClick: () => window.open(this.ctx.app.vault.getResourcePath(this.file), '_blank'),
      },
    ]);
  }
}

export function registerArtifactEmbed(plugin: ArtifactsPlugin): boolean {
  return registerHtmlEmbed(
    plugin.app,
    HTML_EXTENSIONS,
    (ctx, file) => new ArtifactEmbed(ctx, file, plugin),
  );
}

export function unregisterArtifactEmbed(app: App): void {
  unregisterHtmlEmbed(app, HTML_EXTENSIONS);
}
