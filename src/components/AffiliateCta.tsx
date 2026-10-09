import { AFFILIATE, affiliateActive, type AffiliateConfig } from '../config/affiliates';

/** Broker / prop-firm CTA. Renders nothing until src/config/affiliates.ts is filled in and enabled. */
export function AffiliateCta({ placement, cfg = AFFILIATE }: { placement: string; cfg?: AffiliateConfig }) {
  if (!affiliateActive(cfg)) return null;
  return (
    <aside className="aff" data-placement={placement}>
      <span className="aff-tag">Sponsored · {cfg.partnerName}</span>
      <p className="aff-h">{cfg.headline}</p>
      <p className="aff-b">{cfg.body}</p>
      <a className="btn primary" href={cfg.url} target="_blank" rel="sponsored nofollow noopener" data-aff={placement}>
        {cfg.cta}
      </a>
      <p className="aff-d">{cfg.disclosure} {cfg.riskWarning}</p>
    </aside>
  );
}
