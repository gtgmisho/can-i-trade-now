import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// With no Adsterra codes configured, SEO pages must not show empty ad boxes.
vi.mock('../ads.config', () => ({
  ADS: { top: { desktop: '', mobile: '' }, bottom: { desktop: '', mobile: '' }, socialBar: '' },
  DESKTOP_MIN_WIDTH: 760,
}));

describe('AdSlot without ad codes', () => {
  it('renders nothing', async () => {
    const { AdSlot } = await import('./AdSlot');
    expect(renderToStaticMarkup(<AdSlot id="in-content" />)).toBe('');
  });
});
