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
