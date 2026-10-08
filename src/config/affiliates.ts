/**
 * Single broker / prop-firm affiliate call-to-action.
 *
 * The CTA renders ONLY when `enabled` is true AND `url` is set. Fill in real data you are
 * contractually allowed to use; do not add performance or payout claims you cannot substantiate.
 * Links are rendered with rel="sponsored nofollow noopener" and the disclosure text below.
 */
export interface AffiliateConfig {
  enabled: boolean;
  /** partner display name, e.g. the broker or prop firm */
  partnerName: string;
  /** your tracked affiliate URL */
  url: string;
  /** short headline, e.g. "Practice killzone setups on a demo account" */
  headline: string;
  /** one-sentence body copy. Keep factual. */
  body: string;
  /** button label */
  cta: string;
  /** shown under the CTA; required by most affiliate programs and regulators */
  disclosure: string;
  /** risk warning required by many brokers/regulators. TODO: replace with the partner's required wording */
  riskWarning: string;
}

export const AFFILIATE: AffiliateConfig = {
  enabled: false,
  partnerName: 'TODO_PARTNER_NAME',
  url: '',
  headline: 'TODO: headline',
  body: 'TODO: one factual sentence about the partner.',
  cta: 'TODO: button label',
  disclosure: 'Sponsored link. We may earn a commission if you sign up, at no extra cost to you.',
  riskWarning: 'Trading forex and CFDs carries a high risk of losing money. TODO: replace with partner-required risk warning.',
};

export const affiliateActive = (a: AffiliateConfig = AFFILIATE) => a.enabled && a.url.startsWith('https://');
