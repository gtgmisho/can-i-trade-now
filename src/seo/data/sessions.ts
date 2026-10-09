import { WINDOW_DEFS, type WindowDef } from '../../lib/windows';

export interface SessionInfo {
  slug: string;
  /** id in WINDOW_DEFS — the single source of truth for times */
  defId: string;
  name: string;
  /** short label for links, e.g. "London Open" */
  label: string;
  /** Rotating descriptions (picked per city) so the 46 city pages of one session don't share one paragraph */
  about: string[];
  /** Which major forex sessions are typically trading during the window (alternate phrasings) */
  marketContext: string[];
  faqWhat: string;
}

export const SESSIONS: SessionInfo[] = [
  {
    slug: 'asian',
    defId: 'kz-asia',
    name: 'Asian Killzone',
    label: 'Asian',
    about: [
      'ICT traders treat the Asian killzone mainly as a range-building period: price often consolidates, and the high and low it leaves behind become liquidity that London may target later.',
      'In the ICT framework the Asian session is usually quieter. Many traders simply mark its high and low and wait to see which side gets swept once London opens.',
      'The Asian killzone tends to produce a tighter range than the London or New York windows. Its extremes are commonly used as reference levels for the rest of the day.',
    ],
    marketContext: [
      'The Tokyo and Sydney sessions are active during this window, while European and US desks are mostly closed.',
      'Liquidity comes mainly from Tokyo, Sydney and other Asia-Pacific centres at this time; Europe and the US are offline.',
    ],
    faqWhat:
      'The Asian killzone is the 8:00 PM to midnight New York time window in ICT (Inner Circle Trader) methodology. Traders mostly use it to mark the Asian range, whose high and low often become liquidity targets for the London session.',
  },
  {
    slug: 'london-open',
    defId: 'kz-london',
    name: 'London Open Killzone',
    label: 'London Open',
    about: [
      'The London Open killzone is where ICT traders look for the "Judas swing": an early move that sweeps the Asian high or low before price reverses in the day\'s real direction.',
      'Many ICT traders consider London Open the most important window of the day for forex, because the high or low of the day is frequently set during it.',
      'European banks bring heavy volume into this window. ICT methodology watches for a raid on Asian-session liquidity followed by a displacement move.',
    ],
    marketContext: [
      'London opens during this window, and the Tokyo session is winding down.',
      'Frankfurt and London desks come online here as Asian trading fades.',
    ],
    faqWhat:
      'The London Open killzone is the 2:00 to 5:00 AM New York time window in ICT methodology. It covers the London open, when volume rises sharply and price often sweeps the Asian range.',
  },
  {
    slug: 'new-york-am',
    defId: 'kz-nyam',
    name: 'New York AM Killzone',
    label: 'New York AM',
    about: [
      'The New York AM killzone contains the 8:30 AM US data releases and the 9:30 AM equity open, so it is often the most volatile window of the day for USD pairs, gold and US indices.',
      'Because London and New York overlap here, the NY AM killzone usually has the deepest liquidity. ICT traders look for continuation or reversal of the London move.',
      'ICT traders use the New York AM window for setups such as the 10:00 AM Silver Bullet. High-impact US news often lands inside it, so many combine it with a news filter.',
    ],
    marketContext: [
      'London and New York are both open during this window, the busiest overlap of the trading day.',
      'This is the London–New York overlap, when the two largest forex centres trade at the same time.',
    ],
    faqWhat:
      'The New York AM killzone is the 7:00 to 10:00 AM New York time window in ICT methodology. It includes 8:30 AM US economic data and the 9:30 AM stock market open.',
  },
  {
    slug: 'london-close',
    defId: 'kz-lclose',
    name: 'London Close Killzone',
    label: 'London Close',
    about: [
      'During the London Close killzone European traders square positions, so ICT traders watch for profit-taking and retracements toward the middle of the day\'s range.',
      'The London Close window often brings a reversal or pullback after the morning trend, and some ICT traders use it to manage or close trades rather than open new ones.',
      'ICT describes London Close as a time when the day\'s move can retrace as London desks wind down. Volume generally fades through the end of the window.',
    ],
    marketContext: [
      'London is in its final hours and New York is fully open during this window.',
      'European desks are winding down while New York trading is in full swing.',
    ],
    faqWhat:
      'The London Close killzone is the 10:00 AM to 12:00 PM New York time window in ICT methodology, when London traders close positions and price often retraces.',
  },
  {
    slug: 'new-york-pm',
    defId: 'kz-nypm',
    name: 'New York PM Session',
    label: 'New York PM',
    about: [
      'The New York PM session matters most for index traders: NQ and ES often make a final directional move into the 4:00 PM US equity close.',
      'Forex liquidity thins out in the New York afternoon, so ICT traders using the PM session tend to focus on indices and the 2:00 PM Silver Bullet window.',
      'The PM session includes the afternoon Silver Bullet hour and, on FOMC days, the 2:00 PM rate decision, so it can turn volatile late in the day.',
    ],
    marketContext: [
      'Only New York is open during this window; European markets have closed.',
      'By this point Europe has gone home, and US desks and index futures drive the price action.',
    ],
    faqWhat:
      'The New York PM session is the 1:30 to 4:00 PM New York time window used by ICT traders, mostly for US index futures heading into the 4:00 PM equity close.',
  },
];

export const sessionBySlug = (slug: string) => SESSIONS.find((s) => s.slug === slug);
export const defOf = (s: SessionInfo): WindowDef => WINDOW_DEFS.find((d) => d.id === s.defId)!;
