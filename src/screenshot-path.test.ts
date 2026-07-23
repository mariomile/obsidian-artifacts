import assert from 'node:assert/strict';
import test from 'node:test';
import { screenshotOutputPath } from './screenshot-path.ts';

test('builds a sibling -screenshots folder path', () => {
  assert.equal(
    screenshotOutputPath('Resources/_artifacts/foo.html', '2026-07-22-2210'),
    'Resources/_artifacts/foo-screenshots/2026-07-22-2210.png',
  );
});

test('handles a root-level file with no directory', () => {
  assert.equal(screenshotOutputPath('foo.html', '2026-07-22-2210'), 'foo-screenshots/2026-07-22-2210.png');
});

test('handles a .htm extension', () => {
  assert.equal(
    screenshotOutputPath('Resources/foo.htm', '2026-07-22-2210'),
    'Resources/foo-screenshots/2026-07-22-2210.png',
  );
});
