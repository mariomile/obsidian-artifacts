/** Absolute filesystem path → a `file://` URL Electron's <webview> can load. */
export function toFileUrl(absolutePath: string): string {
  let normalized = absolutePath.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  return 'file://' + encodeURI(normalized).replace(/#/g, '%23').replace(/\?/g, '%3F');
}

/** Directory portion of an Obsidian resource path (strips the filename, keeps the trailing slash). */
export function resourceDirFromPath(resourcePath: string): string {
  return resourcePath.slice(0, resourcePath.lastIndexOf('/') + 1);
}

/** Injects `<base href="baseHref">` into `html`'s `<head>` (or synthesizes one) so relative
 *  asset/link URLs resolve against `baseHref` instead of the sandboxed iframe's blank origin.
 *  No-ops if the document already declares a `<base>` tag. */
export function injectBaseTag(html: string, baseHref: string): string {
  if (/<base\b[^>]*>/i.test(html)) return html;
  const baseTag = `<base href="${baseHref}">`;

  const headMatch = html.match(/<head\b[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + baseTag + html.slice(insertAt);
  }

  const htmlMatch = html.match(/<html\b[^>]*>/i);
  if (htmlMatch?.index !== undefined) {
    const insertAt = htmlMatch.index + htmlMatch[0].length;
    return html.slice(0, insertAt) + `<head>${baseTag}</head>` + html.slice(insertAt);
  }

  return baseTag + html;
}

const VIEWPORT_META =
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

/** Injects a mobile `<meta name="viewport">` into `html`'s `<head>` (or synthesizes one) so a
 *  desktop-width artifact scales to the phone viewport instead of rendering at ~980px and
 *  shrinking to fit. No-ops if the document already declares a viewport meta. */
export function injectViewportMeta(html: string): string {
  if (/<meta\b[^>]*\bname\s*=\s*["']?viewport["']?/i.test(html)) return html;

  const headMatch = html.match(/<head\b[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + VIEWPORT_META + html.slice(insertAt);
  }

  const htmlMatch = html.match(/<html\b[^>]*>/i);
  if (htmlMatch?.index !== undefined) {
    const insertAt = htmlMatch.index + htmlMatch[0].length;
    return html.slice(0, insertAt) + `<head>${VIEWPORT_META}</head>` + html.slice(insertAt);
  }

  return VIEWPORT_META + html;
}

/** True if the HTML pulls in a remote `<script src="http(s)://…">` (or protocol-relative `//…`).
 *  A strong signal the artifact runs heavy third-party JS — which on mobile has no `<webview>`
 *  process to isolate it and instead shares Obsidian's main thread, so it can freeze the app.
 *  The mobile path uses this to gate such artifacts behind an explicit tap. */
export function hasExternalScripts(html: string): boolean {
  return /<script\b[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\//i.test(html);
}
