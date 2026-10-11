import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import { whenSized } from './when-sized.ts';

// Minimal ResizeObserver stub: records instances so a test can trigger the
// callback and assert observe/disconnect behaviour. Node has no DOM.
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: unknown[] = [];
  disconnected = false;
  callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }
  observe(target: unknown): void {
    this.observed.push(target);
  }
  disconnect(): void {
    this.disconnected = true;
  }
  fire(): void {
    this.callback();
  }
}

const makeEl = (clientHeight: number) =>
  ({ clientHeight }) as unknown as HTMLElement;

const setHeight = (el: HTMLElement, h: number) => {
  (el as { clientHeight: number }).clientHeight = h;
};

beforeEach(() => {
  FakeResizeObserver.instances = [];
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
  // The module uses window.* timers (popout-safe); Node has no window.
  (globalThis as { window?: unknown }).window = globalThis;
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  mock.timers.reset();
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  delete (globalThis as { window?: unknown }).window;
});

test('fires after the debounce once an already-sized element is stable', () => {
  let calls = 0;
  whenSized(makeEl(801), () => calls++, 80);
  assert.equal(calls, 0, 'debounced, not synchronous');
  mock.timers.tick(80);
  assert.equal(calls, 1);
});

test('does not fire while the element has zero height', () => {
  let calls = 0;
  whenSized(makeEl(0), () => calls++, 80);
  mock.timers.tick(1000);
  assert.equal(calls, 0);
});

test('waits out a transient height and fires with the settled value', () => {
  let calls = 0;
  const el = makeEl(0);
  whenSized(el, () => calls++, 80);
  const observer = FakeResizeObserver.instances[0];
  assert.ok(observer);
  assert.equal(observer.observed[0], el, 'observes the element');

  // 0 -> 44 (transient): timer scheduled but not yet elapsed
  setHeight(el, 44);
  observer.fire();
  mock.timers.tick(50);
  assert.equal(calls, 0, 'transient did not settle yet');

  // 44 -> 845 (final): the pending timer is reset, then elapses at the final value
  setHeight(el, 845);
  observer.fire();
  mock.timers.tick(50);
  assert.equal(calls, 0, 'debounce restarted on the new value');
  mock.timers.tick(30);
  assert.equal(calls, 1, 'fires after quiet period at the settled height');
  assert.equal(observer.disconnected, true, 'stops observing after firing');
});

test('fires the callback at most once', () => {
  let calls = 0;
  const el = makeEl(801);
  whenSized(el, () => calls++, 80);
  mock.timers.tick(80);
  const observer = FakeResizeObserver.instances[0];
  assert.ok(observer);
  observer.fire();
  mock.timers.tick(80);
  assert.equal(calls, 1);
});

test('the disposer stops a pending observer and timer', () => {
  const el = makeEl(801);
  const dispose = whenSized(el, () => {
    throw new Error('should not fire after dispose');
  }, 80);
  const observer = FakeResizeObserver.instances[0];
  assert.ok(observer);
  dispose();
  assert.equal(observer.disconnected, true);
  mock.timers.tick(1000); // timer must not fire
});
