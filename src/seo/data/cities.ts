export type Region = 'americas' | 'europe' | 'africa' | 'middle-east' | 'asia' | 'oceania';

export interface City {
  slug: string;
  name: string;
  country: string;
  /** IANA timezone; all DST behaviour is derived from tz data, never hard-coded */
  tz: string;
  region: Region;
}

export const REGION_LABEL: Record<Region, string> = {
  americas: 'Americas',
  europe: 'Europe',
  africa: 'Africa',
  'middle-east': 'Middle East',
  asia: 'Asia',
  oceania: 'Oceania',
};

const c = (slug: string, name: string, country: string, tz: string, region: Region): City => ({ slug, name, country, tz, region });

export const CITIES: City[] = [
  c('new-york', 'New York', 'United States', 'America/New_York', 'americas'),
  c('chicago', 'Chicago', 'United States', 'America/Chicago', 'americas'),
  c('los-angeles', 'Los Angeles', 'United States', 'America/Los_Angeles', 'americas'),
  c('toronto', 'Toronto', 'Canada', 'America/Toronto', 'americas'),
  c('mexico-city', 'Mexico City', 'Mexico', 'America/Mexico_City', 'americas'),
  c('bogota', 'Bogotá', 'Colombia', 'America/Bogota', 'americas'),
  c('lima', 'Lima', 'Peru', 'America/Lima', 'americas'),
  c('santiago', 'Santiago', 'Chile', 'America/Santiago', 'americas'),
  c('sao-paulo', 'São Paulo', 'Brazil', 'America/Sao_Paulo', 'americas'),
  c('buenos-aires', 'Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires', 'americas'),
  c('london', 'London', 'United Kingdom', 'Europe/London', 'europe'),
  c('frankfurt', 'Frankfurt', 'Germany', 'Europe/Berlin', 'europe'),
  c('paris', 'Paris', 'France', 'Europe/Paris', 'europe'),
  c('zurich', 'Zurich', 'Switzerland', 'Europe/Zurich', 'europe'),
  c('amsterdam', 'Amsterdam', 'Netherlands', 'Europe/Amsterdam', 'europe'),
  c('madrid', 'Madrid', 'Spain', 'Europe/Madrid', 'europe'),
  c('milan', 'Milan', 'Italy', 'Europe/Rome', 'europe'),
  c('warsaw', 'Warsaw', 'Poland', 'Europe/Warsaw', 'europe'),
  c('athens', 'Athens', 'Greece', 'Europe/Athens', 'europe'),
  c('sofia', 'Sofia', 'Bulgaria', 'Europe/Sofia', 'europe'),
  c('bucharest', 'Bucharest', 'Romania', 'Europe/Bucharest', 'europe'),
  c('istanbul', 'Istanbul', 'Turkey', 'Europe/Istanbul', 'europe'),
  c('moscow', 'Moscow', 'Russia', 'Europe/Moscow', 'europe'),
  c('johannesburg', 'Johannesburg', 'South Africa', 'Africa/Johannesburg', 'africa'),
  c('lagos', 'Lagos', 'Nigeria', 'Africa/Lagos', 'africa'),
  c('nairobi', 'Nairobi', 'Kenya', 'Africa/Nairobi', 'africa'),
  c('cairo', 'Cairo', 'Egypt', 'Africa/Cairo', 'africa'),
  c('casablanca', 'Casablanca', 'Morocco', 'Africa/Casablanca', 'africa'),
  c('dubai', 'Dubai', 'United Arab Emirates', 'Asia/Dubai', 'middle-east'),
  c('riyadh', 'Riyadh', 'Saudi Arabia', 'Asia/Riyadh', 'middle-east'),
  c('tel-aviv', 'Tel Aviv', 'Israel', 'Asia/Jerusalem', 'middle-east'),
  c('karachi', 'Karachi', 'Pakistan', 'Asia/Karachi', 'asia'),
  c('mumbai', 'Mumbai', 'India', 'Asia/Kolkata', 'asia'),
  c('dhaka', 'Dhaka', 'Bangladesh', 'Asia/Dhaka', 'asia'),
  c('bangkok', 'Bangkok', 'Thailand', 'Asia/Bangkok', 'asia'),
  c('ho-chi-minh-city', 'Ho Chi Minh City', 'Vietnam', 'Asia/Ho_Chi_Minh', 'asia'),
  c('jakarta', 'Jakarta', 'Indonesia', 'Asia/Jakarta', 'asia'),
  c('kuala-lumpur', 'Kuala Lumpur', 'Malaysia', 'Asia/Kuala_Lumpur', 'asia'),
  c('singapore', 'Singapore', 'Singapore', 'Asia/Singapore', 'asia'),
  c('manila', 'Manila', 'Philippines', 'Asia/Manila', 'asia'),
  c('hong-kong', 'Hong Kong', 'Hong Kong', 'Asia/Hong_Kong', 'asia'),
  c('shanghai', 'Shanghai', 'China', 'Asia/Shanghai', 'asia'),
  c('seoul', 'Seoul', 'South Korea', 'Asia/Seoul', 'asia'),
  c('tokyo', 'Tokyo', 'Japan', 'Asia/Tokyo', 'asia'),
  c('sydney', 'Sydney', 'Australia', 'Australia/Sydney', 'oceania'),
  c('auckland', 'Auckland', 'New Zealand', 'Pacific/Auckland', 'oceania'),
];

export const cityBySlug = (slug: string) => CITIES.find((x) => x.slug === slug);
