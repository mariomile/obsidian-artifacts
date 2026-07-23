/** Typed accessor for `app.embedRegistry` — real and used by several popular
 *  community plugins (custom video/PDF/HTML embeds) but absent from
 *  `obsidian.d.ts`. Access funnelled through here via `as unknown as`
 *  narrowing — never `any` — and defensively guarded. */
import type { App, Component, TFile } from 'obsidian';

export interface EmbedContext {
  app: App;
  containerEl: HTMLElement;
  linktext: string;
  sourcePath: string;
  depth?: number;
}

export type EmbedCreator = (ctx: EmbedContext, file: TFile) => Component;

interface EmbedRegistryApi {
  registerExtensions(extensions: string[], embedCreator: EmbedCreator): void;
  unregisterExtensions(extensions: string[]): void;
}

interface AppWithEmbedRegistry {
  embedRegistry?: EmbedRegistryApi;
}

/** Registers a custom embed creator for the given extensions. Returns false
 *  (never throws) if `embedRegistry` isn't present on this Obsidian version. */
export function registerHtmlEmbed(app: App, extensions: string[], creator: EmbedCreator): boolean {
  const registry = (app as unknown as AppWithEmbedRegistry).embedRegistry;
  if (!registry) return false;
  registry.registerExtensions(extensions, creator);
  return true;
}

export function unregisterHtmlEmbed(app: App, extensions: string[]): void {
  const registry = (app as unknown as AppWithEmbedRegistry).embedRegistry;
  registry?.unregisterExtensions(extensions);
}
