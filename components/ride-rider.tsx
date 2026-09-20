'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {FiPhone,FiMinus,FiPlus,FiX,FiCheckCircle,FiClock,FiNavigation,FiUser,FiAlertTriangle} from 'react-icons/fi';
import {browserDB} from '@/lib/supabase';
import {rideServices,isRide,type RideService,money} from '@/lib/config';
import {formatDuration,formatKm,phoneToE164,suggestFare,type LatLng,type Place} from '@/lib/geo';
import {fetchRoute,reverseGeocode,rpc,type DriverOffer,type Ride,type RouteInfo} from '@/lib/rides';
import {usePolling} from '@/lib/hooks';
import {vehicleIcons} from './vehicle-icons';
import {Avatar} from './avatar';
import {Notice,messageOf} from './form-fields';
import PlacePicker from './place-picker';
import type {MapMarker} from './map';

const LiveMap = dynamic(() => import('./map'), {ssr:false, loading:() => <div className="live-map map-loading" aria-busy="true"/>});
const noteFor: Record<RideService,string> = {
  'Rickshaw':'Budget short trips', 'Bike':'Fast solo rides', 'Economy car':'Everyday car', 'Comfort car':'More comfort', 'Premium car':'Higher-class car', 'Protocol car':'Executive / VIP'
};
const cancelReasons = ['Changed my plans','Driver is taking too long','Booked by mistake','Found another ride'];

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!active) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [active]);
  return now;
}
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

export default function RideRider() {
  const [phase, setPhase] = useState<'loading'|'signedout'|'ready'>('loading');
  const [ride, setRide] = useState<Ride | null>(null);
  const [finished, setFinished] = useState<Ride | null>(null);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const [service, setService] = useState<RideService>('Bike');
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [pickupNote, setPickupNote] = useState('');
  const [destNote, setDestNote] = useState('');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [fare, setFare] = useState('');
  const fareTouched = useRef(false);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [pin, setPin] = useState<'pickup'|'dest'|null>(null);
  const [nearby, setNearby] = useState<LatLng[]>([]);
  const [trackRoute, setTrackRoute] = useState<RouteInfo | null>(null);
  const lastTrack = useRef({key:'', at:0});

  const say = useCallback((text: string, error = false) => { setMessage(text); setIsError(error); }, []);
  const now = useNow(ride?.status === 'searching');

  // ---- session + active ride ------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const db = browserDB();
        const {data:{session}} = await db.auth.getSession();
        if (!session) { setPhase('signedout'); return; }
        try { setPhone(localStorage.getItem('raftaar-phone') || ''); const s = new URLSearchParams(window.location.search).get('service'); if (s && isRide(s)) setService(s); } catch { /* ignore */ }
        setRide(await rpc<Ride | null>('my_active_ride'));
        setPhase('ready');
      } catch (err) { setPhase('ready'); say(messageOf(err), true); }
    })();
  }, [say]);

  const refreshRide = useCallback(async () => {
    const next = await rpc<Ride | null>('my_active_ride');
    if (next) { setRide(next); return; }
    if (ride) {
      const last = await rpc<Ride | null>('get_ride', {p_ride:ride.id});
      if (last) setFinished(last);
      setRide(null); setOffers([]); setTrackRoute(null);
    }
  }, [ride]);
  usePolling(refreshRide, 3000, phase === 'ready' && !!ride);

  usePolling(async () => {
    if (!ride || ride.status !== 'searching') return;
    setOffers(await rpc<DriverOffer[]>('rider_offers', {p_ride:ride.id}));
  }, 3000, phase === 'ready' && ride?.status === 'searching');

  // ---- route while planning -------------------------------------------------
  useEffect(() => {
    if (!pickup || !dest) { setRoute(null); return; }
    const controller = new AbortController();
    setRouting(true);
    fetchRoute(pickup, dest, controller.signal).then(r => { setRoute(r); setRouting(false); }).catch(err => { if (err.name !== 'AbortError') { setRoute(null); setRouting(false); say(err.message, true); } });
    return () => controller.abort();
  }, [pickup, dest, say]);

  useEffect(() => {
    if (route && !fareTouched.current) setFare(String(suggestFare(service, route.distance_m)));
  }, [route, service]);

  usePolling(async () => {
    if (!pickup) return;
    const rows = await rpc<{lat:number;lng:number}[]>('nearby_drivers', {p_lat:pickup.lat, p_lng:pickup.lng, p_service:service});
    setNearby(rows.map(r => ({lat:r.lat, lng:r.lng})));
  }, 8000, phase === 'ready' && !ride && !!pickup);
  useEffect(() => { setNearby([]); }, [pickup, service]);

  // ---- route while tracking -------------------------------------------------
  const driverPos = ride?.driver?.lat != null && ride.driver.lng != null ? {lat:ride.driver.lat, lng:ride.driver.lng} : null;
  useEffect(() => {
    if (!ride) return;
    const pickupPoint = {lat:ride.pickup_lat, lng:ride.pickup_lng}, destPoint = {lat:ride.dest_lat, lng:ride.dest_lng};
    let from: LatLng | null = null, to: LatLng | null = null;
    if (ride.status === 'searching') { from = pickupPoint; to = destPoint; }
    else if (ride.status === 'assigned' || ride.status === 'arrived') { from = driverPos; to = pickupPoint; }
    else if (ride.status === 'in_progress') { from = driverPos || pickupPoint; to = destPoint; }
    if (!from || !to) return;
    const key = ride.id + ride.status;
    const stale = Date.now() - lastTrack.current.at > 15000;
    if (lastTrack.current.key === key && !stale) return;
    lastTrack.current = {key, at:Date.now()};
    fetchRoute(from, to).then(setTrackRoute).catch(() => undefined);
  }, [ride, driverPos]);

  // ---- actions --------------------------------------------------------------
  async function pickOnMap(p: LatLng) {
    if (!pin) return;
    const target = pin;
    setPin(null);
    try {
      const info = await reverseGeocode(p);
      const place = {label:info.label, lat:p.lat, lng:p.lng, city:info.city};
      if (target === 'pickup') setPickup(place); else setDest(place);
    } catch (err) { say(messageOf(err), true); }
  }
  const fareNumber = Number(fare);
  const suggested = route ? suggestFare(service, route.distance_m) : null;
  const phoneE164 = phoneToE164(phone);
  const phoneOk = /^\+923\d{9}$/.test(phoneE164);
  const canSubmit = !!pickup && !!dest && !!route && !routing && Number.isInteger(fareNumber) && fareNumber >= 50 && fareNumber <= 500000 && phoneOk && !busy;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !pickup || !dest || !route) return;
    setBusy(true); say('');
    try {
      const join = (label: string, note: string) => (note.trim() ? label + ' — ' + note.trim() : label).slice(0, 300);
      const fingerprint = JSON.stringify([service, pickup.lat, pickup.lng, dest.lat, dest.lng, fareNumber]);
      const raw = sessionStorage.getItem('raftaar-ride'); const prev = raw ? JSON.parse(raw) : null;
      const requestId = prev?.fingerprint === fingerprint ? prev.id : crypto.randomUUID();
      sessionStorage.setItem('raftaar-ride', JSON.stringify({fingerprint, id:requestId}));
      await rpc<string>('create_ride', {
        p_request_id:requestId, p_service:service, p_city:(pickup.city || dest.city || '').slice(0, 60), p_phone:phoneE164,
        p_pickup_text:join(pickup.label, pickupNote), p_pickup_lat:pickup.lat, p_pickup_lng:pickup.lng,
        p_dest_text:join(dest.label, destNote), p_dest_lat:dest.lat, p_dest_lng:dest.lng,
        p_distance_m:route.distance_m, p_duration_s:route.duration_s, p_offer:fareNumber, p_notes:notes.slice(0, 300)
      });
      try { localStorage.setItem('raftaar-phone', phone); } catch { /* ignore */ }
      sessionStorage.removeItem('raftaar-ride');
      setFinished(null); setOffers([]); setTrackRoute(null); lastTrack.current = {key:'', at:0};
      setRide(await rpc<Ride | null>('my_active_ride'));
    } catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }
  async function accept(offer: DriverOffer) {
    setBusy(true); say('');
    try { await rpc('accept_offer', {p_offer:offer.offer_id}); await refreshRide(); } catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }
  async function decline(offer: DriverOffer) {
    try { await rpc('decline_offer', {p_offer:offer.offer_id}); setOffers(o => o.filter(x => x.offer_id !== offer.offer_id)); } catch (err) { say(messageOf(err), true); }
  }
  async function cancel() {
    if (!ride) return;
    const reason = window.prompt('Why are you cancelling? (optional)\n\n' + cancelReasons.map((r, i) => (i + 1) + '. ' + r).join('\n')) ;
    if (reason === null) return;
    setBusy(true);
    try { await rpc('rider_cancel_ride', {p_ride:ride.id, p_reason:cancelReasons[Number(reason) - 1] || reason || 'Cancelled by rider'}); await refreshRide(); } catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }
  function reset() { setFinished(null); setPickup(null); setDest(null); setRoute(null); setPickupNote(''); setDestNote(''); setNotes(''); fareTouched.current = false; setFare(''); say(''); }

  // ---- map data ---------------------------------------------------------------
  const markers = useMemo<MapMarker[]>(() => {
    if (ride) {
      const list: MapMarker[] = [{id:'p', kind:'pickup', lat:ride.pickup_lat, lng:ride.pickup_lng}, {id:'d', kind:'dest', lat:ride.dest_lat, lng:ride.dest_lng}];
      if (driverPos && ride.status !== 'searching') list.push({id:'drv', kind:'driver', lat:driverPos.lat, lng:driverPos.lng, label:ride.driver?.plate});
      return list;
    }
    const list: MapMarker[] = [];
    if (pickup) list.push({id:'p', kind:'pickup', lat:pickup.lat, lng:pickup.lng});
    if (dest) list.push({id:'d', kind:'dest', lat:dest.lat, lng:dest.lng});
    nearby.forEach((c, i) => list.push({id:'c' + i, kind:'car', lat:c.lat, lng:c.lng}));
    return list;
  }, [ride, pickup, dest, nearby, driverPos]);
  const shownRoute = ride ? trackRoute?.coords : route?.coords;
  const fitKey = ride ? ride.id + ride.status + (driverPos ? 'd' : '') : (pickup?.lat ?? '') + ',' + (dest?.lat ?? '') + ',' + (route?.distance_m ?? '');
  const center = !ride && pickup && !dest ? {lat:pickup.lat, lng:pickup.lng} : null;

  // ---- render -----------------------------------------------------------------
  if (phase === 'loading') return <div className="skeleton tall"/>;
  if (phase === 'signedout') return <div className="ride-layout"><section className="panel ride-panel"><p className="eyebrow">BOOK A RIDE</p><h2>Sign in to request a ride</h2><p style={{marginBlock:'14px 22px'}}>Create a free account or sign in. You set your own fare and choose from registered drivers who reply.</p><Link className="button" href="/account">Sign in or create account</Link></section><div className="ride-map-wrap"><LiveMap markers={[]}/></div></div>;

  const status = ride?.status;
  const eta = trackRoute ? formatDuration(trackRoute.duration_s) : null;
  const banner = status === 'assigned' ? ['Driver is on the way', eta ? 'Arriving in about ' + eta : 'Locating your driver…'] : status === 'arrived' ? ['Your driver has arrived', 'Meet at the pickup point'] : status === 'in_progress' ? ['On the way to your destination', eta ? eta + ' to go' : ''] : status === 'searching' ? ['Finding you a driver', 'Registered drivers nearby can reply with an offer'] : null;

  return <div className="ride-layout">
    <section className="panel ride-panel">
      {finished && !ride ? <div className="ride-done">
        <span className={'ride-done-icon ' + finished.status}>{finished.status === 'completed' ? <FiCheckCircle/> : <FiX/>}</span>
        <h2>{finished.status === 'completed' ? 'Trip completed' : 'Ride cancelled'}</h2>
        {finished.status === 'completed' && <p className="ride-price">{money(finished.agreed_fare || finished.offer)}</p>}
        <p>{finished.status === 'completed' ? 'Pay your driver in cash. Thank you for riding with Raftaar One.' : finished.cancel_reason || 'This ride was cancelled.'}</p>
        <div className="ride-route-mini"><span><b>A</b>{finished.pickup_text}</span><span><b>B</b>{finished.dest_text}</span></div>
        <button className="button" onClick={reset}>Book another ride</button>
      </div> : ride ? <>
        {banner && <div className={'ride-banner ' + ride.status}><FiNavigation aria-hidden="true"/><div><strong>{banner[0]}</strong><small>{banner[1]}</small></div></div>}
        {ride.status === 'searching' && <div className="radar" aria-hidden="true"><i/><i/><i/><span><VehicleGlyph service={ride.service}/></span></div>}
        <div className="ride-route-mini"><span><b>A</b>{ride.pickup_text}</span><span><b>B</b>{ride.dest_text}</span></div>
        <div className="ride-facts"><div><small>Distance</small><strong>{formatKm(ride.distance_m)}</strong></div><div><small>{ride.status === 'searching' ? 'Your offer' : 'Agreed fare'}</small><strong>{money(ride.agreed_fare || ride.offer)}</strong></div><div><small>Vehicle</small><strong>{ride.service}</strong></div></div>
        {ride.status === 'searching' && <>
          <p className="ride-timer"><FiClock/> Searching for {clock(now - new Date(ride.created_at).getTime())}</p>
          <h3 className="ride-h3">Driver offers {offers.length > 0 && <span className="badge">{offers.length}</span>}</h3>
          {offers.length === 0 ? <p className="form-note">No offers yet. Drivers who are online near your pickup will see your request and reply here. If nobody is nearby you can cancel and try a higher fare or another vehicle type.</p> : <ul className="offer-list">
            {offers.map(o => <li key={o.offer_id} className="offer-card"><Avatar path={o.avatar_path} name={o.driver_name} size={48}/><div className="offer-main"><strong>{o.driver_name || 'Driver'}</strong><small>{o.vehicle_model} · <b>{o.vehicle_plate}</b></small><small>{o.eta_min} min away{o.driver_km != null ? ' · ' + o.driver_km.toFixed(1) + ' km' : ''}</small></div><div className="offer-price"><strong>{money(o.fare)}</strong><div><button className="button small" disabled={busy} onClick={() => void accept(o)}>Accept</button><button className="icon-button" aria-label="Decline offer" onClick={() => void decline(o)}><FiX/></button></div></div></li>)}
          </ul>}
        </>}
        {ride.driver && status !== 'searching' && <div className="driver-card">
          <Avatar path={ride.driver.avatar_path} name={ride.driver.name} size={56}/>
          <div><strong>{ride.driver.name || 'Your driver'}</strong><small>{ride.driver.model}</small><span className="plate">{ride.driver.plate}</span></div>
          {ride.driver.phone && <a className="button small" href={'tel:' + ride.driver.phone}><FiPhone/> Call</a>}
        </div>}
        {ride.notes && <p className="form-note">Note: {ride.notes}</p>}
        {(status === 'searching' || status === 'assigned' || status === 'arrived') && <button className="button secondary danger-text" onClick={() => void cancel()} disabled={busy}>Cancel ride</button>}
        {status === 'in_progress' && <p className="form-note">Enjoy your trip. Pay the driver {money(ride.agreed_fare || ride.offer)} in cash at the end.</p>}
      </> : <form className="form-stack" onSubmit={submit} noValidate>
        <div><p className="eyebrow">BOOK A RIDE</p><h2 style={{fontSize:30}}>Where are you going?</h2></div>
        <div className="vehicle-strip" role="radiogroup" aria-label="Vehicle type">
          {rideServices.map(s => { const Icon = vehicleIcons[s]; return <button type="button" role="radio" aria-checked={service === s} key={s} className={service === s ? 'selected' : ''} onClick={() => { setService(s); fareTouched.current = false; }}>
            <Icon aria-hidden="true"/><strong>{s}</strong><small>{route ? '~' + money(suggestFare(s, route.distance_m)) : noteFor[s]}</small></button>; })}
        </div>
        <PlacePicker label="Pickup" kind="pickup" value={pickup} onChange={p => { setPickup(p); say(''); }} bias={pickup || dest} onPinMode={() => setPin(pin === 'pickup' ? null : 'pickup')} pinActive={pin === 'pickup'} onError={m => say(m, true)}/>
        <label className="field"><span>House / flat / landmark at pickup · optional</span><input value={pickupNote} onChange={e => setPickupNote(e.target.value)} maxLength={80} placeholder="For example: House 12, Street 5, green gate"/></label>
        <PlacePicker label="Destination" kind="dest" value={dest} onChange={p => { setDest(p); say(''); }} bias={pickup || dest} onPinMode={() => setPin(pin === 'dest' ? null : 'dest')} pinActive={pin === 'dest'} onError={m => say(m, true)}/>
        <label className="field"><span>House / flat / landmark at destination · optional</span><input value={destNote} onChange={e => setDestNote(e.target.value)} maxLength={80} placeholder="For example: near the mosque, 2nd floor"/></label>
        {(route || routing) && <div className="route-summary" aria-live="polite">{routing ? <span>Finding the best route…</span> : route && <><span><small>Distance</small><strong>{formatKm(route.distance_m)}</strong></span><span><small>Drive time</small><strong>{formatDuration(route.duration_s)}</strong></span>{route.estimated && <em>Estimated. Live routing is busy.</em>}</>}</div>}
        <div className="fare-box">
          <span className="fare-label">Your fare offer (PKR)</span>
          <div className="fare-input"><button type="button" aria-label="Decrease fare" onClick={() => { fareTouched.current = true; setFare(String(Math.max(50, (fareNumber || 100) - 10))); }}><FiMinus/></button><input inputMode="numeric" value={fare} onChange={e => { fareTouched.current = true; setFare(e.target.value.replace(/\D/g, '').slice(0, 6)); }} aria-label="Fare in PKR" placeholder="e.g. 400"/><button type="button" aria-label="Increase fare" onClick={() => { fareTouched.current = true; setFare(String((fareNumber || 90) + 10)); }}><FiPlus/></button></div>
          {suggested && <div className="fare-chips"><small>Suggested (estimate):</small>{[-10, 0, 10].map(pct => { const v = Math.round(suggested * (1 + pct / 100) / 10) * 10; return <button type="button" key={pct} onClick={() => { fareTouched.current = true; setFare(String(v)); }}>{money(v)}</button>; })}</div>}
          {suggested && fareNumber > 0 && fareNumber < suggested * 0.6 && <p className="fare-warn"><FiAlertTriangle/> This is well below the usual fare. Drivers may not respond.</p>}
          <small className="form-note">Drivers can accept your fare or reply with their own. You choose who comes. Payment is cash to the driver.</small>
        </div>
        <label className="field"><span>Your mobile number</span><input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="03XX XXXXXXX" aria-invalid={phone.length > 3 && !phoneOk}/></label>
        <label className="field"><span>Note for the driver · optional</span><input value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} placeholder="Luggage, waiting time, special request"/></label>
        {pickup && <p className="nearby-note"><span className={'live-dot' + (nearby.length ? '' : ' idle')}/>{nearby.length ? nearby.length + ' registered ' + (nearby.length === 1 ? 'driver is' : 'drivers are') + ' online near this pickup' : 'No registered drivers are online near this pickup right now. You can still post the request. Drivers who come online nearby will see it.'}</p>}
        <button className="button ride-cta" disabled={!canSubmit}>{busy ? 'Posting your request…' : 'Find a driver'}</button>
        {!canSubmit && (pickup || dest) && <p className="form-note">{!pickup ? 'Choose a pickup from the suggestions.' : !dest ? 'Choose a destination from the suggestions.' : !route ? 'Working out the route…' : !phoneOk ? 'Enter a valid Pakistani mobile number (03XX XXXXXXX).' : !(fareNumber >= 50) ? 'Enter your fare offer (at least PKR 50).' : ''}</p>}
      </form>}
      <Notice message={message} error={isError}/>
    </section>
    <div className="ride-map-wrap">
      {pin && <div className="pin-hint"><FiUser/> Tap the map to set your {pin === 'pickup' ? 'pickup' : 'destination'}<button type="button" onClick={() => setPin(null)}>Cancel</button></div>}
      <LiveMap markers={markers} route={shownRoute} center={center} fitKey={fitKey} onMapClick={pickOnMap} crosshair={!!pin}/>
    </div>
  </div>;
}

function VehicleGlyph({service}: {service: string}) {
  const Icon = isRide(service) ? vehicleIcons[service] : vehicleIcons.Bike;
  return <Icon aria-hidden="true"/>;
}
