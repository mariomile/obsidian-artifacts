import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasExternalScripts,
  injectBaseTag,
  injectViewportMeta,
  resourceDirFromPath,
  toFileUrl,
} from './html-transform.ts';

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

const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

test('injectViewportMeta inserts the viewport right after an existing <head>', () => {
  const html = '<html><head><title>t</title></head><body></body></html>';
  assert.equal(
    injectViewportMeta(html),
    `<html><head>${VIEWPORT}<title>t</title></head><body></body></html>`,
  );
});

test('injectViewportMeta synthesizes a <head> when only <html> exists', () => {
  assert.equal(
    injectViewportMeta('<html><body>hi</body></html>'),
    `<html><head>${VIEWPORT}</head><body>hi</body></html>`,
  );
});

test('injectViewportMeta prepends when neither <head> nor <html> exist', () => {
  assert.equal(injectViewportMeta('<p>hi</p>'), `${VIEWPORT}<p>hi</p>`);
});

test('injectViewportMeta is a no-op when a viewport meta already exists', () => {
  const html = '<html><head><meta name="viewport" content="width=500"></head><body></body></html>';
  assert.equal(injectViewportMeta(html), html);
});

test('injectViewportMeta ignores other meta tags (e.g. charset)', () => {
  const html = '<html><head><meta charset="utf-8"></head><body></body></html>';
  assert.equal(
    injectViewportMeta(html),
    `<html><head>${VIEWPORT}<meta charset="utf-8"></head><body></body></html>`,
  );
});

test('hasExternalScripts detects an https CDN script (Leaflet)', () => {
  assert.equal(hasExternalScripts('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'), true);
});

test('hasExternalScripts detects a protocol-relative script src', () => {
  assert.equal(hasExternalScripts('<script src="//cdn.example.com/x.js"></script>'), true);
});

test('hasExternalScripts is false for inline-only scripts', () => {
  assert.equal(hasExternalScripts('<script>console.log(1)</script>'), false);
});

test('hasExternalScripts is false for a relative/local script src', () => {
  assert.equal(hasExternalScripts('<script src="./app.js"></script>'), false);
});
