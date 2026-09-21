'use client';
import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {FiCrosshair,FiMapPin,FiClock,FiSearch} from 'react-icons/fi';
import type {LatLng,Place} from '@/lib/geo';
import {currentPosition,reverseGeocode} from '@/lib/rides';

type Suggestion = {id:string; label:string; lat:number; lng:number; city:string; recent?:boolean};
type Props = {
  label: string;
  kind: 'pickup' | 'dest';
  value: Place | null;
  onChange: (p: Place | null) => void;
  bias?: LatLng | null;
  onPinMode?: () => void;
  pinActive?: boolean;
  disabled?: boolean;
  onError?: (message: string) => void;
};
const RECENT_KEY = 'raftaar-recent-places';
const loadRecent = (): Suggestion[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
function saveRecent(p: Place) {
  try {
    const next = [{id:'r' + p.lat + p.lng, label:p.label, lat:p.lat, lng:p.lng, city:p.city, recent:true}, ...loadRecent().filter(r => r.label !== p.label)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
}
const head = (label: string) => label.split(', ')[0];
const tail = (label: string) => label.split(', ').slice(1).join(', ');

export default function PlacePicker({label,kind,value,onChange,bias,onPinMode,pinActive,disabled,onError}: Props) {
  const listId = useId();
  const [text, setText] = useState(value?.label || '');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const typed = useRef(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { typed.current = false; setText(value?.label || ''); }, [value]);
  useEffect(() => {
    const outside = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);
  useEffect(() => {
    if (!typed.current) return;
    const q = text.trim();
    if (q.length < 2) { setItems([]); return; }
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setLoading(true);
      try {
        const url = '/api/places?q=' + encodeURIComponent(q) + (bias ? '&lat=' + bias.lat + '&lon=' + bias.lng : '');
        const res = await fetch(url, {signal:controller.signal});
        const data = await res.json();
        setItems(data.results || []);
        setOpen(true);
        setActive(-1);
      } catch { /* ignore aborted or failed lookups */ } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [text, bias]);

  function choose(s: Suggestion) {
    const place: Place = {label:s.label, lat:s.lat, lng:s.lng, city:s.city};
    saveRecent(place);
    typed.current = false;
    setText(s.label);
    setOpen(false);
    onChange(place);
  }
  function edit(next: string) {
    typed.current = true;
    setText(next);
    if (value) onChange(null);
  }
  async function useMyLocation() {
    setLocating(true);
    try {
      const p = await currentPosition();
      const info = await reverseGeocode(p);
      const place: Place = {label:info.label, lat:p.lat, lng:p.lng, city:info.city};
      onChange(place);
    } catch (err) { onError?.(err instanceof Error ? err.message : 'Could not get your location.'); }
    finally { setLocating(false); }
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + items.length) % items.length); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }
  function showRecent() {
    if (!text.trim()) { const recent = loadRecent(); if (recent.length) { setItems(recent); setOpen(true); } }
    else if (items.length) setOpen(true);
  }

  return <div className="place-picker" ref={box}>
    <label className="place-label"><span className={'place-dot ' + kind} aria-hidden="true">{kind === 'pickup' ? 'A' : 'B'}</span>{label}</label>
    <div className="place-input">
      <FiSearch aria-hidden="true"/>
      <input aria-label={label + ' location'} value={text} onChange={e => edit(e.target.value)} onFocus={showRecent} onKeyDown={onKey} disabled={disabled} placeholder={kind === 'pickup' ? 'Search area, street or house number' : 'Where to? Search anywhere in Pakistan'} autoComplete="off" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-invalid={!value && text.length > 2}/>
      {loading && <span className="address-spinner" aria-hidden="true"/>}
      {open && items.length > 0 && <ul id={listId} className="place-list" role="listbox">
        {items.map((s, i) => <li key={s.id + i} role="option" aria-selected={i === active} className={i === active ? 'active' : ''} onMouseDown={e => { e.preventDefault(); choose(s); }}>
          <span className="place-ico" aria-hidden="true">{s.recent ? <FiClock/> : <FiMapPin/>}</span>
          <span><strong>{head(s.label)}</strong><small>{tail(s.label) || s.city}</small></span>
        </li>)}
      </ul>}
    </div>
    {!value && text.trim().length > 2 && !loading && items.length === 0 && <p className="place-hint">No matches yet. Try a nearby landmark or area, or pin the exact spot on the map.</p>}
    {!value && text.trim().length > 2 && items.length > 0 && !open && <p className="place-hint">Choose one of the suggestions so we know the exact spot.</p>}
    <div className="place-actions">
      {kind === 'pickup' && <button type="button" onClick={() => void useMyLocation()} disabled={disabled || locating}><FiCrosshair/> {locating ? 'Locating…' : 'Use my location'}</button>}
      {onPinMode && <button type="button" onClick={onPinMode} disabled={disabled} className={pinActive ? 'on' : ''}><FiMapPin/> {pinActive ? 'Tap the map…' : 'Pin on map'}</button>}
    </div>
  </div>;
}
