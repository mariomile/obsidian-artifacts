import { PluginSettingTab, Setting } from 'obsidian';
import type { App } from 'obsidian';
import type ArtifactsPlugin from './main.ts';

export class ArtifactsSettingTab extends PluginSettingTab {
  private plugin: ArtifactsPlugin;

  constructor(app: App, plugin: ArtifactsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Open links in a new tab')
      .setDesc('When you click a link to another vault file inside an artifact, open it in a new tab instead of replacing the current one.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openLinksInNewTab).onChange(async (value) => {
          this.plugin.settings.openLinksInNewTab = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Zoom')
      .setDesc('Zoom level for rendered HTML (desktop webview only).')
      .addDropdown((dropdown) => {
        for (const percent of [50, 75, 90, 100, 110, 125, 150, 175, 200]) {
          dropdown.addOption(String(percent / 100), `${percent}%`);
        }
        dropdown.setValue(String(this.plugin.settings.zoomFactor));
        dropdown.onChange(async (value) => {
          this.plugin.settings.zoomFactor = Number(value);
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Allow forms and popups')
      .setDesc('Widens the mobile sandbox and desktop webview permissions so artifacts with forms or popup links work. Turn off for stricter isolation.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.allowFormsAndPopups).onChange(async (value) => {
          this.plugin.settings.allowFormsAndPopups = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}
