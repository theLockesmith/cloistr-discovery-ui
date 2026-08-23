/**
 * Source-level CSS token tests.
 *
 * These are NOT behavioural: they read the CSS source files and assert that
 * the token definitions are present and the hardcoded values are gone.
 * They exist because the browser never runs CSS in jsdom, so a misplaced
 * `#000` or missing `100dvh` cannot be caught by a rendered-component test.
 *
 * A passing build does NOT imply correct tokens — these tests would revert-fail
 * if the changes were undone.
 */

import { describe, it, expect } from 'vitest';

// Use globalThis.process.cwd() — available in both jsdom and node vitest environments.
const cwd = process.cwd();

// readFileSync is available because vitest runs in Node even with jsdom DOM shim.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appCss = readFileSync(join(cwd, 'src/App.css'), 'utf-8');
const indexCss = readFileSync(join(cwd, 'src/index.css'), 'utf-8');

describe('CSS token compliance (source-level, not behavioural)', () => {
  it('App.css defines the --color-shadow-base token', () => {
    expect(appCss).toContain('--color-shadow-base:');
  });

  it('App.css compare-bar shadow uses --color-shadow-base, not a hardcoded #000', () => {
    // Find the .compare-bar rule block and assert its box-shadow is token-driven.
    const compareShadowMatch = appCss.match(/\.compare-bar\s*\{[^}]*box-shadow:[^;]+;/s);
    expect(compareShadowMatch, 'expected .compare-bar { box-shadow: ... } in App.css').not.toBeNull();
    expect(compareShadowMatch![0]).not.toContain('#000');
    expect(compareShadowMatch![0]).toContain('--color-shadow-base');
  });

  it('App.css uses 100dvh instead of 100vh for .app min-height', () => {
    const appRule = appCss.match(/\.app\s*\{[^}]+\}/s);
    expect(appRule, 'expected .app { ... } block in App.css').not.toBeNull();
    expect(appRule![0]).toContain('100dvh');
    expect(appRule![0]).not.toContain('100vh');
  });

  it('index.css uses 100dvh instead of 100vh for body and #root', () => {
    expect(indexCss).not.toContain('100vh');
    expect(indexCss).toContain('100dvh');
  });
});
