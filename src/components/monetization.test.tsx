import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdSlot } from './AdSlot';
import { AffiliateCta } from './AffiliateCta';
import { AFFILIATE } from '../config/affiliates';

describe('AdSlot', () => {
  it('renders nothing while ads are off (the shipped default)', () => {
    expect(renderToStaticMarkup(<AdSlot id="in-content" />)).toBe('');
  });
  it('reserves its height up-front when enabled (CLS-safe)', () => {
    const html = renderToStaticMarkup(<AdSlot id="in-content" mode="live" />);
    expect(html).toContain('--ad-h-m:280px');
    expect(html).toContain('--ad-h-d:250px');
    expect(html).toContain('aria-label="Advertisement"');
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
