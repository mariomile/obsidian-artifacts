/** Electron's <webview> tag isn't in lib.dom's HTMLElementTagNameMap, so Obsidian
 *  plugins that use it (like borrax-html) need their own minimal typing. Only the
 *  members Artifacts actually calls are declared — narrowed via `as unknown as`,
 *  never `any`, per the suite's convention (see obsidian-internals.ts). */

export interface WebviewNativeImage {
  toPNG(): Uint8Array;
}

export interface WebviewFailLoadEvent extends Event {
  errorCode: number;
}

export interface WebviewConsoleMessageEvent extends Event {
  message: string;
}

export interface WebviewNavigateEvent extends Event {
  url: string;
}

export interface WebviewElement extends HTMLElement {
  executeJavaScript(code: string): Promise<unknown>;
  setZoomFactor(factor: number): void;
  capturePage(): Promise<WebviewNativeImage>;
}

/** Creates a detached <webview> element on the active document (popout-window safe). */
export function createWebviewElement(): WebviewElement {
  return activeDocument.createElement('webview') as unknown as WebviewElement;
}
