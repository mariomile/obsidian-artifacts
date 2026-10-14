import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import { createOffscreenTimer } from './offscreen-timer.ts';

beforeEach(() => {
  // The module uses window.* timers (popout-safe); Node has no window.
  (globalThis as { window?: unknown }).window = globalThis;
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  mock.timers.reset();
  delete (globalThis as { window?: unknown }).window;
});

test('expires once hidden for the full delay', () => {
  let calls = 0;
  const t = createOffscreenTimer(30_000, () => calls++);
  t.update(false);
  mock.timers.tick(29_999);
  assert.equal(calls, 0);
  mock.timers.tick(1);
  assert.equal(calls, 1);
});

test('coming back into view cancels the pending expiry', () => {
  let calls = 0;
  const t = createOffscreenTimer(30_000, () => calls++);
  t.update(false);
  mock.timers.tick(20_000);
  t.update(true);
  mock.timers.tick(60_000);
  assert.equal(calls, 0);
});

test('repeated hidden updates do not restart the delay', () => {
  let calls = 0;
  const t = createOffscreenTimer(30_000, () => calls++);
  t.update(false);
  mock.timers.tick(20_000);
  t.update(false);
  mock.timers.tick(10_000);
  assert.equal(calls, 1);
});

test('visible updates alone never expire', () => {
  let calls = 0;
  const t = createOffscreenTimer(30_000, () => calls++);
  t.update(true);
  mock.timers.tick(60_000);
  assert.equal(calls, 0);
});

test('expires again after a later hide, once per hide', () => {
  let calls = 0;
  const t = createOffscreenTimer(30_000, () => calls++);
  t.update(false);
  mock.timers.tick(30_000);
  mock.timers.tick(60_000);
  assert.equal(calls, 1, 'one expiry per hidden period');
  t.update(true);
  t.update(false);
  mock.timers.tick(30_000);
  assert.equal(calls, 2);
});

test('cancel stops a pending expiry', () => {
  const t = createOffscreenTimer(30_000, () => {
    throw new Error('should not fire after cancel');
  });
  t.update(false);
  t.cancel();
  mock.timers.tick(60_000);
});
