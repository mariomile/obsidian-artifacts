import { Component, TFile, debounce } from 'obsidian';
import type { App, TAbstractFile } from 'obsidian';
import { HtmlRenderer } from './renderer/html-renderer.ts';
import { registerHtmlEmbed, unregisterHtmlEmbed } from './obsidian-internals.ts';
import type { EmbedContext } from './obsidian-internals.ts';
import type ArtifactsPlugin from './main.ts';

const HTML_EXTENSIONS = ['html', 'htm'];

class ArtifactEmbed extends Component {
  private renderer: HtmlRenderer;
  private observer: IntersectionObserver | null = null;
  private loaded = false;
  private reloadOnModify = debounce((file: TAbstractFile) => {
    if (this.loaded && file instanceof TFile && file.path === this.file.path) {
      void this.renderer.render(this.ctx.containerEl, this.file);
    }
  }, 300, true);

  constructor(private ctx: EmbedContext, private file: TFile, plugin: ArtifactsPlugin) {
    super();
    this.renderer = new HtmlRenderer(ctx.app, plugin.settings, {
      onNavigate: (link) => {
        if (link.kind === 'external') window.open(link.url, '_blank');
      },
    });
  }

  onload(): void {
    this.ctx.containerEl.addClass('artifacts-embed-container');
    this.observer = new IntersectionObserver((entries) => {
      if (!this.loaded && entries.some((entry) => entry.isIntersecting)) {
        this.loaded = true;
        void this.renderer.render(this.ctx.containerEl, this.file);
        this.observer?.disconnect();
      }
    });
    this.observer.observe(this.ctx.containerEl);
    this.registerEvent(this.ctx.app.vault.on('modify', this.reloadOnModify));
  }

  onunload(): void {
    this.observer?.disconnect();
    this.renderer.clear(this.ctx.containerEl);
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
