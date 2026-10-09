/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdSlot } from './AdSlot';
import { AffiliateCta } from './AffiliateCta';
import { AFFILIATE } from '../config/affiliates';
import { BANNER } from '../config/ads';
import { readFileSync } from 'node:fs';

describe('AdSlot', () => {
  it('renders a live slot wired to the Adsterra placement (the shipped default)', () => {
    const html = renderToStaticMarkup(<AdSlot id="in-content" />);
    expect(html).toContain('data-placement="top"');
    expect(html).toContain('<div class="ad-box"></div>');
    expect(html).toContain('aria-label="Advertisement"');
    expect(renderToStaticMarkup(<AdSlot id="below-faq" />)).toContain('data-placement="bottom"');
  });
  it('renders nothing when off; placeholder mode never loads ad code', () => {
    expect(renderToStaticMarkup(<AdSlot id="in-content" mode="off" />)).toBe('');
    expect(renderToStaticMarkup(<AdSlot id="in-content" mode="placeholder" />)).not.toContain('data-placement');
  });
  it('reserved box matches the banner sizes and the loader breakpoint (CLS-safe)', () => {
    // read from disk: Vitest does not process CSS imports
    const css = readFileSync(new URL('./monetization.css', import.meta.url), 'utf8');
    expect(css).toMatch(new RegExp(`\\.ad-reserve \\.ad-box \\{[^}]*height: ${BANNER.mobileHeight}px`));
    expect(css).toContain(`@media (min-width: ${BANNER.desktopMinWidth}px) { .ad-reserve .ad-box { height: ${BANNER.desktopHeight}px; } }`);
  });
});

describe('AffiliateCta', () => {
  it('renders nothing with the placeholder config', () => {
    expect(renderToStaticMarkup(<AffiliateCta placement="t" />)).toBe('');
  });
  it('renders nothing when enabled without a real https URL', () => {
    expect(renderToStaticMarkup(<AffiliateCta placement="t" cfg={{ ...AFFILIATE, enabled: true, url: '' }} />)).toBe('');
  });
  it('marks the link sponsored and shows the disclosure when configured', () => {
    const html = renderToStaticMarkup(
      <AffiliateCta placement="t" cfg={{ ...AFFILIATE, enabled: true, url: 'https://partner.example/?ref=x' }} />,
    );
    expect(html).toContain('rel="sponsored nofollow noopener"');
    expect(html).toContain(AFFILIATE.disclosure);
  });
});
