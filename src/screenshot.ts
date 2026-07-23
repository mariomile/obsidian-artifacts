import { Notice, Platform } from 'obsidian';
import { screenshotOutputPath } from './screenshot-path.ts';
import { ArtifactView } from './view.ts';
import type { WebviewElement } from './renderer/webview-types.ts';
import type ArtifactsPlugin from './main.ts';

function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function isWebviewElement(el: HTMLElement | null): el is WebviewElement {
  return !!el && typeof (el as unknown as WebviewElement).capturePage === 'function';
}

export function registerScreenshotCommand(plugin: ArtifactsPlugin): void {
  if (!Platform.isDesktopApp) return;

  plugin.addCommand({
    id: 'screenshot-artifact',
    name: 'Screenshot artifact to PNG',
    checkCallback: (checking) => {
      const view = plugin.app.workspace.getActiveViewOfType(ArtifactView);
      if (!view?.file) return false;
      if (checking) return true;
      void captureAndSave(plugin, view);
      return true;
    },
  });
}

async function captureAndSave(plugin: ArtifactsPlugin, view: ArtifactView): Promise<void> {
  const file = view.file;
  if (!file) return;

  const frame = view.currentFrame();
  if (!isWebviewElement(frame)) {
    new Notice('Artifacts: screenshot only works in the desktop view (not the mobile fallback).');
    return;
  }

  try {
    const image = await frame.capturePage();
    const png = image.toPNG();
    const outputPath = screenshotOutputPath(file.path, formatTimestamp(new Date()));
    const dir = outputPath.slice(0, outputPath.lastIndexOf('/'));
    if (dir && !(await plugin.app.vault.adapter.exists(dir))) {
      await plugin.app.vault.adapter.mkdir(dir);
    }
    const buffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
    await plugin.app.vault.createBinary(outputPath, buffer);
    new Notice(`Artifacts: screenshot saved to ${outputPath}`);
  } catch (error) {
    console.error('Artifacts: screenshot failed.', error);
    new Notice('Artifacts: screenshot failed — see console.');
  }
}
