import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveClickedLink } from './link-resolve.ts';

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
