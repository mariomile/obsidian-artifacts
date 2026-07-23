import { FileView, Notice, TFile, debounce } from 'obsidian';
import type { TAbstractFile, WorkspaceLeaf } from 'obsidian';
import { HtmlRenderer } from './renderer/html-renderer.ts';
import type { ResolvedLink } from './renderer/link-resolve.ts';
import type ArtifactsPlugin from './main.ts';

export const ARTIFACT_VIEW_TYPE = 'artifacts-html-view';

export class ArtifactView extends FileView {
  private renderer: HtmlRenderer;
  private reloadOnModify = debounce((file: TAbstractFile) => {
    if (this.file && file instanceof TFile && file.path === this.file.path) {
      void this.renderCurrentFile();
    }
  }, 300, true);

  constructor(leaf: WorkspaceLeaf, private plugin: ArtifactsPlugin) {
    super(leaf);
    this.renderer = new HtmlRenderer(this.app, this.plugin.settings, {
      onNavigate: (link) => this.handleNavigate(link),
    });
    this.registerEvent(this.app.vault.on('modify', this.reloadOnModify));
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
    await this.renderCurrentFile();
  }

  async onUnloadFile(): Promise<void> {
    this.renderer.clear(this.contentEl);
  }

  currentFrame(): HTMLElement | null {
    return this.renderer.getFrame();
  }

  private async renderCurrentFile(): Promise<void> {
    if (!this.file) return;
    this.contentEl.addClass('artifacts-container');
    await this.renderer.render(this.contentEl, this.file);
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
