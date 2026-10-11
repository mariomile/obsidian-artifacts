import { Component, Platform, TFile, debounce } from 'obsidian';
import type { App, TAbstractFile } from 'obsidian';
import { HtmlRenderer } from './renderer/html-renderer.ts';
import { hasExternalScripts } from './renderer/html-transform.ts';
import { registerHtmlEmbed, unregisterHtmlEmbed } from './obsidian-internals.ts';
import type { EmbedContext } from './obsidian-internals.ts';
import { createMobileToolbar } from './ui/mobile-toolbar.ts';
import { createMobilePoster } from './ui/mobile-poster.ts';
import type ArtifactsPlugin from './main.ts';

const HTML_EXTENSIONS = ['html', 'htm'];

class ArtifactEmbed extends Component {
  private renderer: HtmlRenderer;
  private observer: IntersectionObserver | null = null;
  private loaded = false;
  private activated = false;
  private disposeToolbar: (() => void) | null = null;
  private disposePoster: (() => void) | null = null;
  private reloadOnModify = debounce((file: TAbstractFile) => {
    if (this.activated && file instanceof TFile && file.path === this.file.path) {
      void this.renderArtifact();
    }
  }, 300, true);

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
      if (!this.loaded && entries.some((entry) => entry.isIntersecting)) {
        this.loaded = true;
        void this.presentOrRender();
        this.observer?.disconnect();
      }
    });
    this.observer.observe(this.ctx.containerEl);
    this.registerEvent(this.ctx.app.vault.on('modify', this.reloadOnModify));
  }

  // Obsidian calls loadFile() on every embed component it creates, once the embed
  // is due to show; without it the host note fails to open ("l.loadFile is not a
  // function"). It is also the render trigger: the IntersectionObserver alone never
  // fires for the zero-height container in Live Preview.
  async loadFile(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    this.observer?.disconnect();
    await this.presentOrRender();
  }

  onunload(): void {
    this.observer?.disconnect();
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

  private async renderArtifact(): Promise<void> {
    this.activated = true;
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
