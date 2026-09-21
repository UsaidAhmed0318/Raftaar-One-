import {isRide,type RideService} from './config';
import {inPakistan,type Place} from './geo';

export type RideDraft = {service: RideService; pickup: Place | null; dest: Place | null; pickupNote: string; destNote: string; fare: string; notes: string};

const KEY = 'raftaar-ride-draft';
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const isPlace = (p: unknown): p is Place => {
  const v = p as Place | null;
  return !!v && typeof v.label === 'string' && typeof v.city === 'string' && Number.isFinite(v.lat) && Number.isFinite(v.lng) && inPakistan(v);
};
const text = (v: unknown, max: number) => typeof v === 'string' ? v.slice(0, max) : '';

export function saveDraft(draft: RideDraft) {
  try {
    if (!draft.dest) { localStorage.removeItem(KEY); return; }
    localStorage.setItem(KEY, JSON.stringify({...draft, at: Date.now()}));
  } catch { /* storage unavailable */ }
}

export function clearDraft() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export function loadDraft(): RideDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (typeof d.at !== 'number' || Date.now() - d.at > MAX_AGE_MS) { localStorage.removeItem(KEY); return null; }
    return {
      service: typeof d.service === 'string' && isRide(d.service) ? d.service : 'Bike',
      pickup: isPlace(d.pickup) ? d.pickup : null,
      dest: isPlace(d.dest) ? d.dest : null,
      pickupNote: text(d.pickupNote, 80), destNote: text(d.destNote, 80),
      fare: text(d.fare, 6).replace(/\D/g, ''), notes: text(d.notes, 300)
    };
  } catch { return null; }
}
