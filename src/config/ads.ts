/**
 * Ad slot configuration. No ad network code is loaded yet.
 *
 * mode:
 *  - 'off':         slots render nothing (current default, clean UI until you sign up with a network)
 *  - 'placeholder': slots render as labelled empty boxes with their final size reserved (for layout review)
 *  - 'live':        slots render reserved, empty containers for your ad script to fill
 *
 * Every slot reserves its height up-front so filling it later never causes layout shift (CLS).
 */
export type AdMode = 'off' | 'placeholder' | 'live';

export interface AdSlotDef {
  /** reserved height in px on mobile / desktop (>= 728px viewport) */
  minHeight: { mobile: number; desktop: number };
  /** network-specific id (e.g. AdSense data-ad-slot). TODO: fill in when you have one. */
  networkSlotId: string;
}

export const ADS: { mode: AdMode; slots: Record<string, AdSlotDef> } = {
  mode: 'off',
  slots: {
    'below-agenda': { minHeight: { mobile: 280, desktop: 250 }, networkSlotId: '' },
    'in-content': { minHeight: { mobile: 280, desktop: 250 }, networkSlotId: '' },
    'below-faq': { minHeight: { mobile: 280, desktop: 90 }, networkSlotId: '' },
  },
};

export type AdSlotId = keyof typeof ADS.slots;
