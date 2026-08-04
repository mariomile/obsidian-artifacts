import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveClickedLink, resolveRelativeLink } from './link-resolve.ts';

const VAULT_BASE = '/Users/mario/Vaults/marioverse.ai';

test('resolves a file:// URL inside the vault to a relative path', () => {
  const href = 'file:///Users/mario/Vaults/marioverse.ai/Resources/_artifacts/other.html';
  assert.deepEqual(resolveClickedLink(href, VAULT_BASE), {
    kind: 'vault',
    path: 'Resources/_artifacts/other.html',
  });
});

test('is case-insensitive when matching the vault base path', () => {
  const href = 'file:///users/mario/vaults/marioverse.ai/Resources/_artifacts/other.html';
  assert.equal(resolveClickedLink(href, VAULT_BASE).kind, 'vault');
});

test('treats a file:// URL outside the vault as external', () => {
  const href = 'file:///Users/mario/Downloads/other.html';
  assert.deepEqual(resolveClickedLink(href, VAULT_BASE), { kind: 'external', url: href });
});

test('treats a non-file:// URL as external without touching it', () => {
  assert.deepEqual(resolveClickedLink('https://example.com', VAULT_BASE), {
    kind: 'external',
    url: 'https://example.com',
  });
});

test('strips a leading slash before a Windows drive letter', () => {
  const href = 'file:///C:/vault/Resources/_artifacts/other.html';
  assert.deepEqual(resolveClickedLink(href, 'C:/vault'), {
    kind: 'vault',
    path: 'Resources/_artifacts/other.html',
  });
});

test('falls back to external on a malformed URL', () => {
  const href = 'file://%';
  assert.deepEqual(resolveClickedLink(href, VAULT_BASE), { kind: 'external', url: href });
});

// resolveRelativeLink — mobile iframe path

test('resolveRelativeLink resolves a sibling href against the artifact folder', () => {
  assert.deepEqual(resolveRelativeLink('other.html', 'app://x/other.html', 'Resources/_artifacts'), {
    kind: 'vault',
    path: 'Resources/_artifacts/other.html',
  });
});

test('resolveRelativeLink resolves ./ and ../ segments', () => {
  assert.deepEqual(resolveRelativeLink('../sub/z.html', 'app://x', 'Resources/_artifacts'), {
    kind: 'vault',
    path: 'Resources/sub/z.html',
  });
  assert.deepEqual(resolveRelativeLink('./deep/y.html', 'app://x', 'Resources'), {
    kind: 'vault',
    path: 'Resources/deep/y.html',
  });
});

test('resolveRelativeLink resolves against vault root when fileDir is empty', () => {
  assert.deepEqual(resolveRelativeLink('root.html', 'app://x/root.html', ''), {
    kind: 'vault',
    path: 'root.html',
  });
});

test('resolveRelativeLink strips a query string and hash from the raw href', () => {
  assert.deepEqual(resolveRelativeLink('page.html?v=2#top', 'app://x', 'A'), {
    kind: 'vault',
    path: 'A/page.html',
  });
});

test('resolveRelativeLink treats an absolute http(s) href as external', () => {
  assert.deepEqual(resolveRelativeLink('https://example.com/x', 'https://example.com/x', 'A'), {
    kind: 'external',
    url: 'https://example.com/x',
  });
});

test('resolveRelativeLink treats a protocol-relative href as external', () => {
  assert.deepEqual(resolveRelativeLink('//cdn.example.com/x', 'https://cdn.example.com/x', 'A'), {
    kind: 'external',
    url: 'https://cdn.example.com/x',
  });
});
