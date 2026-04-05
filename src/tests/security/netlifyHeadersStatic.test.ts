import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('netlify security headers', () => {
  it('keeps CSP compatible with Google Auth (fonts bundled locally)', () => {
    const content = readFileSync('netlify.toml', 'utf-8');

    expect(content).toContain('Content-Security-Policy');
    expect(content).toContain('https://apis.google.com');
    expect(content).toContain('https://accounts.google.com');
    expect(content).toContain('https://www.gstatic.com');
    expect(content).toContain('https://*.cloudfunctions.net');
    expect(content).not.toContain('https://fonts.googleapis.com');
    expect(content).not.toContain('https://fonts.gstatic.com');
  });

  it('keeps COOP mode compatible with popup login flow', () => {
    const content = readFileSync('netlify.toml', 'utf-8');
    expect(content).toContain('Cross-Origin-Opener-Policy = "unsafe-none"');
  });

  it('keeps the SPA rewrite so refresh works on clean module routes', () => {
    const content = readFileSync('netlify.toml', 'utf-8');
    expect(content).toContain('[[redirects]]');
    expect(content).toContain('from = "/*"');
    expect(content).toContain('to = "/index.html"');
    expect(content).toContain('status = 200');
  });
});
