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
