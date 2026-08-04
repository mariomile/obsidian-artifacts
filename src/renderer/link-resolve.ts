export type ResolvedLink = { kind: 'vault'; path: string } | { kind: 'external'; url: string };

/** Given a clicked `href` (as seen inside the rendered HTML) and the vault's absolute
 *  base path, decides whether it points at a file inside the vault (→ vault-relative
 *  path) or elsewhere (→ open externally). */
export function resolveClickedLink(href: string, vaultBasePath: string): ResolvedLink {
  if (!href.startsWith('file://')) return { kind: 'external', url: href };

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(new URL(href).pathname);
  } catch {
    return { kind: 'external', url: href };
  }
  if (/^\/[A-Za-z]:/.test(decodedPath)) decodedPath = decodedPath.slice(1);

  const normalizedBase = vaultBasePath.replace(/\\/g, '/').replace(/\/+$/, '') + '/';
  const normalizedPath = decodedPath.replace(/\\/g, '/');

  if (normalizedPath.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
    return { kind: 'vault', path: normalizedPath.slice(normalizedBase.length) };
  }
  return { kind: 'external', url: href };
}

/** Collapses `.` and `..` segments in a slash path, dropping empty segments. */
function normalizeVaultPath(path: string): string {
  const out: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join('/');
}

/** Resolves a link clicked inside the *mobile* iframe (no `FileSystemAdapter`, so we can't use
 *  `resolveClickedLink`). A raw href with a scheme (`http:`, `mailto:`, `//host`) opens externally;
 *  a relative href resolves against the artifact's folder (`fileDir`) to a vault-relative path.
 *
 *  @param rawHref     the `href` attribute exactly as authored in the HTML
 *  @param resolvedHref the browser-resolved absolute URL (`a.href`), used for external links
 *  @param fileDir     the artifact's parent folder as a vault path ('' for vault root) */
export function resolveRelativeLink(
  rawHref: string,
  resolvedHref: string,
  fileDir: string,
): ResolvedLink {
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(rawHref)) {
    return { kind: 'external', url: resolvedHref || rawHref };
  }
  const clean = (rawHref.split('#')[0] ?? '').split('?')[0] ?? '';
  if (!clean) return { kind: 'external', url: resolvedHref || rawHref };
  return { kind: 'vault', path: normalizeVaultPath(fileDir ? `${fileDir}/${clean}` : clean) };
}
