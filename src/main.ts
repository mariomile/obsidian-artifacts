import { Plugin } from 'obsidian';

export default class ArtifactsPlugin extends Plugin {
  async onload(): Promise<void> {
    console.warn('Artifacts: loaded (scaffold — no features yet).');
  }
}
