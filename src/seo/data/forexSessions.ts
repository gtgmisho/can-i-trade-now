/**
 * The four major forex sessions as commonly quoted (approximate local business hours of each centre).
 * Conventions vary between sources; these are labelled as approximate on the site.
 */
export interface ForexSession {
  id: string;
  name: string;
  tz: string;
  /** local wall-clock hours of the centre */
  open: number;
  close: number;
}

export const FOREX_SESSIONS: ForexSession[] = [
  { id: 'sydney', name: 'Sydney', tz: 'Australia/Sydney', open: 7, close: 16 },
  { id: 'tokyo', name: 'Tokyo', tz: 'Asia/Tokyo', open: 9, close: 18 },
  { id: 'london', name: 'London', tz: 'Europe/London', open: 8, close: 17 },
  { id: 'new-york', name: 'New York', tz: 'America/New_York', open: 8, close: 17 },
];
