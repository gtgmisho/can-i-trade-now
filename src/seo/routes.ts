import { CITIES, type City } from './data/cities';
import type { SessionInfo } from './data/sessions';

export const KZ_INDEX = '/killzone';
export const MH_INDEX = '/market-hours';
export const OPEN_NOW = '/is-forex-market-open-now';
export const sessionUrl = (s: SessionInfo) => `${KZ_INDEX}/${s.slug}`;
export const kzUrl = (s: SessionInfo, c: City) => `${KZ_INDEX}/${s.slug}/${c.slug}`;
export const mhUrl = (c: City) => `${MH_INDEX}/${c.slug}`;

/** Up to n related cities: same region first, then nearest by standard UTC offset. */
export function relatedCities(city: City, n = 8, offsetOf: (c: City) => number): City[] {
  const others = CITIES.filter((c) => c.slug !== city.slug);
  const base = offsetOf(city);
  return others
    .map((c) => ({ c, score: (c.region === city.region ? 0 : 1000) + Math.abs(offsetOf(c) - base) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.c);
}
