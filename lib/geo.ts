import type {RideService} from './config';
export type LatLng = {lat:number;lng:number};
export type Place = {label:string;lat:number;lng:number;city:string};
export const PAKISTAN_BOUNDS = {minLat:23.6,maxLat:37.2,minLng:60.8,maxLng:77.9};
export const PAKISTAN_CENTER: LatLng = {lat:30.3753,lng:69.3451};
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
export const inPakistan = (p: LatLng) => p.lat >= PAKISTAN_BOUNDS.minLat && p.lat <= PAKISTAN_BOUNDS.maxLat && p.lng >= PAKISTAN_BOUNDS.minLng && p.lng <= PAKISTAN_BOUNDS.maxLng;
export function distanceKm(a: LatLng, b: LatLng) {
  const r = (n: number) => n * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export const formatKm = (meters: number) => meters < 950 ? Math.round(meters / 10) * 10 + ' m' : (meters / 1000).toFixed(meters < 10000 ? 1 : 0) + ' km';
export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return minutes + ' min';
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h + ' h' + (m ? ' ' + m + ' min' : '');
}
// Starting-point suggestions only. Riders set their own fare and drivers may counter-offer.
const rates: Record<RideService, {base:number;perKm:number;min:number}> = {
  'Rickshaw': {base:60, perKm:26, min:100},
  'Bike': {base:40, perKm:18, min:80},
  'Economy car': {base:100, perKm:36, min:180},
  'Comfort car': {base:130, perKm:46, min:250},
  'Premium car': {base:220, perKm:68, min:400},
  'Protocol car': {base:450, perKm:115, min:900}
};
export function suggestFare(service: RideService, distanceM: number) {
  const r = rates[service];
  const raw = Math.max(r.min, r.base + r.perKm * (distanceM / 1000));
  return Math.round(raw / 10) * 10;
}
export const phoneToE164 = (input: string) => {
  const digits = input.replace(/[^0-9+]/g, '');
  if (/^\+923\d{9}$/.test(digits)) return digits;
  if (/^03\d{9}$/.test(digits)) return '+92' + digits.slice(1);
  if (/^923\d{9}$/.test(digits)) return '+' + digits;
  return digits;
};
