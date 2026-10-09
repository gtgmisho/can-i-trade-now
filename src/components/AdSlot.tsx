import { ADS, hasCode, type AdMode, type AdSlotId } from '../config/ads';

/**
 * Reserved, CLS-safe ad container for the static pages. The box height matches the banner
 * (see .ad-reserve in monetization.css); src/islands/seo.ts loads the Adsterra code into it.
 */
export function AdSlot({ id, mode = ADS.mode }: { id: AdSlotId; mode?: AdMode }) {
  const placement = ADS.slots[id];
  if (mode === 'off' || !hasCode(placement)) return null;
  return (
    <aside className={`ad-reserve ad-reserve-${mode}`} data-slot={id} data-placement={mode === 'live' ? placement : undefined} aria-label="Advertisement">
      <div className="ad-label">Ad</div>
      <div className="ad-box">{mode === 'placeholder' ? `Advertisement · ${id}` : null}</div>
    </aside>
  );
}
