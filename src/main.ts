import { Plugin } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, parseSettings } from './settings.ts';
import type { ArtifactsSettings } from './settings.ts';
import { ArtifactsSettingTab } from './settings-tab.ts';
import { ARTIFACT_VIEW_TYPE, ArtifactView } from './view.ts';
import { registerArtifactEmbed, unregisterArtifactEmbed } from './embed.ts';
import { registerScreenshotCommand } from './screenshot.ts';

const HTML_EXTENSIONS = ['html', 'htm'];

export default class ArtifactsPlugin extends Plugin {
  settings: ArtifactsSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());

    this.registerView(ARTIFACT_VIEW_TYPE, (leaf: WorkspaceLeaf) => new ArtifactView(leaf, this));
    try {
      this.registerExtensions(HTML_EXTENSIONS, ARTIFACT_VIEW_TYPE);
    } catch (error) {
      console.warn('Artifacts: could not register .html/.htm extensions.', error);
    }

    if (!registerArtifactEmbed(this)) {
      console.warn(
        'Artifacts: embedRegistry unavailable on this Obsidian version — inline embeds disabled.',
      );
    }

    registerScreenshotCommand(this);
    this.addSettingTab(new ArtifactsSettingTab(this.app, this));
  }

  onunload(): void {
    unregisterArtifactEmbed(this.app);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
