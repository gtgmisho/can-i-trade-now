import { ADS as ADSTERRA, DESKTOP_MIN_WIDTH } from '../ads.config';

/**
 * Ad slots on the static SEO pages. They reuse the Adsterra codes in src/ads.config.ts
 * (the same ones the home page uses), so there is one place to paste ad codes.
 *
 * mode:
 *  - 'live':        render the slot and let the page island load the Adsterra banner into it (default)
 *  - 'placeholder': render labelled empty boxes of the final size (for layout review, no ad code runs)
 *  - 'off':         render nothing
 *
 * Each slot reserves the banner's height (50px mobile / 90px desktop) in the static HTML,
 * so the banner arriving later never shifts the page (CLS). A slot whose Adsterra code is
 * empty renders nothing, so the site never shows an empty box.
 */
export type AdMode = 'off' | 'placeholder' | 'live';
export type AdPlacement = keyof Pick<typeof ADSTERRA, 'top' | 'bottom'>;

export const ADS: { mode: AdMode; slots: Record<'in-content' | 'below-faq', AdPlacement> } = {
  mode: 'live',
  slots: {
    'in-content': 'top',
    'below-faq': 'bottom',
  },
};

export type AdSlotId = keyof typeof ADS.slots;

/** Banner sizes the reserved boxes must match; the breakpoint is the one the loader uses to pick a code. */
export const BANNER = { mobileHeight: 50, desktopHeight: 90, desktopMinWidth: DESKTOP_MIN_WIDTH };

export const placementCodes = (p: AdPlacement) => ADSTERRA[p];
export const hasCode = (p: AdPlacement) => Boolean(ADSTERRA[p].desktop || ADSTERRA[p].mobile);
