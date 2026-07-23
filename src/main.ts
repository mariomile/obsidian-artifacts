import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, parseSettings } from './settings.ts';
import type { ArtifactsSettings } from './settings.ts';
import { ArtifactsSettingTab } from './settings-tab.ts';

export default class ArtifactsPlugin extends Plugin {
  settings: ArtifactsSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
    this.addSettingTab(new ArtifactsSettingTab(this.app, this));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
