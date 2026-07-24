import { FileSystemAdapter, Platform } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { injectBaseTag, resourceDirFromPath, toFileUrl } from './html-transform.ts';
import { resolveClickedLink } from './link-resolve.ts';
import type { ResolvedLink } from './link-resolve.ts';
import { createWebviewElement } from './webview-types.ts';
import { whenSized } from './when-sized.ts';
import type {
  WebviewConsoleMessageEvent,
  WebviewFailLoadEvent,
  WebviewNavigateEvent,
} from './webview-types.ts';
import type { ArtifactsSettings } from '../settings.ts';

const NAV_CHANNEL = 'ARTIFACTS_NAV::';
const SANDBOX_MINIMAL = 'allow-same-origin allow-scripts';
const SANDBOX_FULL =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox';

const LINK_INTERCEPT_SCRIPT = `(function(){
  if (window.__artifactsNav) return;
  window.__artifactsNav = true;
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;
    if (/^(javascript|mailto|tel):/i.test(href)) return;
    e.preventDefault();
    console.log(${JSON.stringify(NAV_CHANNEL)} + a.href);
  }, true);
})();`;

export interface HtmlRendererCallbacks {
  onNavigate: (link: ResolvedLink) => void;
}

export class HtmlRenderer {
  private frame: HTMLElement | null = null;
  private disposeAttach: (() => void) | null = null;

  constructor(
    private app: App,
    private settings: ArtifactsSettings,
    private callbacks: HtmlRendererCallbacks,
  ) {}

  async render(container: HTMLElement, file: TFile): Promise<void> {
    this.clear(container);
    const useWebview =
      Platform.isDesktopApp && this.app.vault.adapter instanceof FileSystemAdapter;
    if (useWebview) {
      this.renderWebview(container, file);
    } else {
      await this.renderIframe(container, file);
    }
  }

  clear(container: HTMLElement): void {
    this.disposeAttach?.();
    this.disposeAttach = null;
    this.frame?.remove();
    this.frame = null;
    container.empty();
  }

  getFrame(): HTMLElement | null {
    return this.frame;
  }

  private renderWebview(container: HTMLElement, file: TFile): void {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) return;

    const url = toFileUrl(adapter.getFullPath(file.path));
    const webview = createWebviewElement();
    webview.addClass('artifacts-frame', 'artifacts-webview');
    webview.setAttribute('src', url);
    webview.setAttribute('allowpopups', '');

    webview.addEventListener('did-fail-load', (event) => {
      const failEvent = event as WebviewFailLoadEvent;
      if (failEvent.errorCode !== -3) {
        console.error('Artifacts: webview failed to load.', failEvent.errorCode);
      }
    });
    webview.addEventListener('dom-ready', () => {
      void webview.executeJavaScript(LINK_INTERCEPT_SCRIPT).catch(() => {});
      webview.setZoomFactor(this.settings.zoomFactor);
    });
    webview.addEventListener('console-message', (event) => {
      const message = (event as WebviewConsoleMessageEvent).message ?? '';
      if (message.startsWith(NAV_CHANNEL)) {
        this.handleNavigation(message.slice(NAV_CHANNEL.length));
      }
    });
    const interceptNavigation = (event: Event): void => {
      const navEvent = event as WebviewNavigateEvent;
      if (!navEvent.url) return;
      event.preventDefault();
      this.handleNavigation(navEvent.url);
    };
    webview.addEventListener('will-navigate', interceptNavigation);
    webview.addEventListener('new-window', interceptNavigation);

    this.frame = webview;
    // Attach only once the container has a real height. An Electron <webview>
    // guest snapshots its viewport from the host element at attach time and
    // never recovers if that height was 0/indefinite (deferred or background
    // tab) — it sticks at the 150px UA default and clips the artifact.
    this.disposeAttach = whenSized(container, () => {
      this.disposeAttach = null;
      if (this.frame === webview && !webview.isConnected) {
        container.appendChild(webview);
        // Force the guest to re-sync to the settled host box. A <webview>
        // attached via a CSS class alone keeps the 150px default; an explicit
        // inline display assignment triggers the reflow that resizes the guest.
        webview.style.display = 'flex';
      }
    });
  }

  private async renderIframe(container: HTMLElement, file: TFile): Promise<void> {
    const iframe = container.createEl('iframe', { cls: 'artifacts-frame' });
    iframe.setAttribute(
      'sandbox',
      this.settings.allowFormsAndPopups ? SANDBOX_FULL : SANDBOX_MINIMAL,
    );
    this.frame = iframe;

    const resourcePath = this.app.vault.getResourcePath(file);
    const baseHref = resourceDirFromPath(resourcePath);
    try {
      const raw = await this.app.vault.cachedRead(file);
      iframe.srcdoc = injectBaseTag(raw, baseHref);
    } catch (error) {
      console.error('Artifacts: failed to read file, falling back to src.', error);
      iframe.setAttribute('src', resourcePath);
    }
  }

  private handleNavigation(rawUrl: string): void {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      this.callbacks.onNavigate(resolveClickedLink(rawUrl, adapter.getBasePath()));
      return;
    }
    this.callbacks.onNavigate({ kind: 'external', url: rawUrl });
  }
}
