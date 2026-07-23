import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS, parseSettings } from './settings.ts';

test('returns defaults when data is undefined', () => {
  assert.deepEqual(parseSettings(undefined), DEFAULT_SETTINGS);
});

test('merges saved data over defaults', () => {
  const result = parseSettings({ openLinksInNewTab: true });
  assert.equal(result.openLinksInNewTab, true);
  assert.equal(result.zoomFactor, DEFAULT_SETTINGS.zoomFactor);
});

test('clamps zoomFactor to the 0.5-2 range', () => {
  assert.equal(parseSettings({ zoomFactor: 10 }).zoomFactor, 2);
  assert.equal(parseSettings({ zoomFactor: 0.01 }).zoomFactor, 0.5);
});

test('falls back to default zoomFactor when not a finite number', () => {
  assert.equal(parseSettings({ zoomFactor: 'huge' }).zoomFactor, DEFAULT_SETTINGS.zoomFactor);
  assert.equal(parseSettings({ zoomFactor: Number.NaN }).zoomFactor, DEFAULT_SETTINGS.zoomFactor);
});

test('coerces non-boolean flags to booleans', () => {
  assert.equal(parseSettings({ openLinksInNewTab: 'yes' }).openLinksInNewTab, true);
  assert.equal(parseSettings({ allowFormsAndPopups: 0 }).allowFormsAndPopups, false);
});
