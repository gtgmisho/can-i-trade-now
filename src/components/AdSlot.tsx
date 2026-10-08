import { ADS, type AdMode, type AdSlotId } from '../config/ads';

/** Reserved, CLS-safe ad container. Height is fixed before any ad code runs. */
export function AdSlot({ id, mode = ADS.mode }: { id: AdSlotId; mode?: AdMode }) {
  if (mode === 'off') return null;
  const def = ADS.slots[id];
  return (
    <aside
      className={`ad-slot ad-${mode}`}
      data-slot={id}
      data-network-slot={def.networkSlotId || undefined}
      aria-label="Advertisement"
      style={{ '--ad-h-m': `${def.minHeight.mobile}px`, '--ad-h-d': `${def.minHeight.desktop}px` } as React.CSSProperties}
    >
      {mode === 'placeholder' ? <span>Advertisement · {id}</span> : null}
    </aside>
  );
}
