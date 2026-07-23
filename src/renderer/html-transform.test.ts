import assert from 'node:assert/strict';
import test from 'node:test';
import { injectBaseTag, resourceDirFromPath, toFileUrl } from './html-transform.ts';

test('toFileUrl converts a POSIX absolute path', () => {
  assert.equal(toFileUrl('/Users/mario/Vaults/marioverse.ai/foo.html'), 'file:///Users/mario/Vaults/marioverse.ai/foo.html');
});

test('toFileUrl adds a leading slash and encodes special characters', () => {
  assert.equal(toFileUrl('Users/mario/a b#c?.html'), 'file:///Users/mario/a%20b%23c%3F.html');
});

test('resourceDirFromPath strips the filename, keeps trailing slash', () => {
  assert.equal(resourceDirFromPath('app://xyz/Resources/_artifacts/foo.html'), 'app://xyz/Resources/_artifacts/');
});

test('resourceDirFromPath on a root-level file', () => {
  assert.equal(resourceDirFromPath('app://xyz/foo.html'), 'app://xyz/');
});

test('injectBaseTag inserts base right after an existing <head>', () => {
  const html = '<html><head><title>t</title></head><body></body></html>';
  assert.equal(
    injectBaseTag(html, 'app://xyz/dir/'),
    '<html><head><base href="app://xyz/dir/"><title>t</title></head><body></body></html>',
  );
});

test('injectBaseTag synthesizes a <head> when only <html> exists', () => {
  const html = '<html><body>hi</body></html>';
  assert.equal(
    injectBaseTag(html, 'app://xyz/dir/'),
    '<html><head><base href="app://xyz/dir/"></head><body>hi</body></html>',
  );
});

test('injectBaseTag prepends when neither <head> nor <html> exist', () => {
  assert.equal(injectBaseTag('<p>hi</p>', 'app://xyz/dir/'), '<base href="app://xyz/dir/"><p>hi</p>');
});

test('injectBaseTag is a no-op when a <base> tag already exists', () => {
  const html = '<html><head><base href="other/"></head><body></body></html>';
  assert.equal(injectBaseTag(html, 'app://xyz/dir/'), html);
});
