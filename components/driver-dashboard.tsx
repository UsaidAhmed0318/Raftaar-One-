'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {FiPhone,FiNavigation,FiCheckCircle,FiPower,FiMapPin,FiAlertTriangle,FiClock} from 'react-icons/fi';
import {browserDB} from '@/lib/supabase';
import {money} from '@/lib/config';
import {formatDuration,formatKm,type LatLng} from '@/lib/geo';
import {fetchRoute,rpc,type DriverInfo,type FeedItem,type Ride,type RouteInfo} from '@/lib/rides';
import {usePolling} from '@/lib/hooks';
import {Avatar} from './avatar';
import {Notice,messageOf} from './form-fields';
import type {MapMarker} from './map';

const LiveMap = dynamic(() => import('./map'), {ssr:false, loading:() => <div className="live-map map-loading" aria-busy="true"/>});
type Summary = {completed_30d:number; earned_30d:number; completed_today:number; earned_today:number};
type AppRow = {status:string; kind:string} | null;
const etaFor = (km: number) => Math.max(2, Math.round(km * 1.4 / 25 * 60));

export default function DriverDashboard() {
  const [phase, setPhase] = useState<'loading'|'signedout'|'ready'>('loading');
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [application, setApplication] = useState<AppRow>(null);
  const [online, setOnline] = useState(false);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [manual, setManual] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [counter, setCounter] = useState<Record<string, string>>({});
  const [ride, setRide] = useState<Ride | null>(null);
  const [finished, setFinished] = useState<Ride | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const watch = useRef<number | null>(null);
  const lastRoute = useRef({key:'', at:0});
  const say = useCallback((text: string, error = false) => { setMessage(text); setIsError(error); }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = browserDB();
        const {data:{session}} = await db.auth.getSession();
        if (!session) { setPhase('signedout'); return; }
        const info = await rpc<DriverInfo | null>('my_driver');
        setDriver(info);
        if (info) { setOnline(info.online); setRide(await rpc<Ride | null>('my_active_ride')); }
        else { const {data} = await db.from('applications').select('status,kind').eq('user_id', session.user.id).maybeSingle(); setApplication(data as AppRow); }
        setPhase('ready');
      } catch (err) { setPhase('ready'); say(messageOf(err), true); }
    })();
  }, [say]);

  const isDriver = driver?.status === 'active';
  const tracking = isDriver && (online || !!ride);

  // ---- location ---------------------------------------------------------------
  useEffect(() => {
    if (!tracking || manual) return;
    if (!('geolocation' in navigator)) { setGpsError('This device does not support location.'); return; }
    watch.current = navigator.geolocation.watchPosition(
      p => { setGpsError(''); setPos({lat:p.coords.latitude, lng:p.coords.longitude}); setHeading(p.coords.heading != null && !isNaN(p.coords.heading) ? p.coords.heading : null); },
      e => setGpsError(e.code === 1 ? 'Location permission is blocked. Allow location for this site in your browser settings.' : 'Waiting for a GPS signal…'),
      {enableHighAccuracy:true, maximumAge:4000, timeout:20000}
    );
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = null; };
  }, [tracking, manual]);

  usePolling(async () => {
    if (!pos) return;
    await rpc('driver_ping', {p_lat:pos.lat, p_lng:pos.lng, p_heading:heading, p_online:true});
  }, 5000, tracking && !!pos);

  async function toggleOnline() {
    if (!isDriver) return;
    setBusy(true); say('');
    try {
      if (online) { await rpc('driver_go_offline'); setOnline(false); setFeed([]); setSelected(null); }
      else { setOnline(true); setGpsError(''); }
    } catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }

  // ---- feed, active ride, summary ----------------------------------------------
  usePolling(async () => {
    const assigned = await rpc<Ride | null>('my_active_ride');
    if (assigned) { setRide(assigned); setFeed([]); return; }
    setFeed(await rpc<FeedItem[]>('driver_feed'));
  }, 3000, isDriver && online && !ride && !!pos);
  const refreshRide = useCallback(async () => {
    const next = await rpc<Ride | null>('my_active_ride');
    if (next) { setRide(next); return; }
    if (ride) { const last = await rpc<Ride | null>('get_ride', {p_ride:ride.id}); if (last) setFinished(last); setRide(null); setRoute(null); void loadSummary(); }
  }, [ride]);
  usePolling(refreshRide, 3000, isDriver && !!ride);
  const loadSummary = useCallback(async () => { setSummary(await rpc<Summary>('driver_summary')); }, []);
  usePolling(loadSummary, 30000, isDriver);

  // ---- routes -------------------------------------------------------------------
  const sel = feed.find(f => f.id === selected) || null;
  useEffect(() => {
    let from: LatLng | null = null, to: LatLng | null = null;
    if (ride) {
      const pickup = {lat:ride.pickup_lat, lng:ride.pickup_lng}, dest = {lat:ride.dest_lat, lng:ride.dest_lng};
      if (ride.status === 'in_progress') { from = pos || pickup; to = dest; } else { from = pos; to = pickup; }
    } else if (sel) { from = {lat:sel.pickup_lat, lng:sel.pickup_lng}; to = {lat:sel.dest_lat, lng:sel.dest_lng}; }
    if (!from || !to) { setRoute(null); return; }
    const key = (ride?.id || sel?.id) + (ride?.status || '');
    const stale = Date.now() - lastRoute.current.at > 15000;
    if (lastRoute.current.key === key && !stale) return;
    lastRoute.current = {key, at:Date.now()};
    fetchRoute(from, to).then(setRoute).catch(() => undefined);
  }, [ride, sel, pos]);

  // ---- actions --------------------------------------------------------------------
  async function offer(item: FeedItem, fare: number) {
    setBusy(true); say('');
    try { await rpc('make_offer', {p_ride:item.id, p_fare:fare, p_eta:etaFor(item.pickup_km)}); say('Offer sent: ' + money(fare) + '. Waiting for the rider to choose.'); setFeed(await rpc<FeedItem[]>('driver_feed')); }
    catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }
  async function step(status: 'arrived'|'in_progress'|'completed'|'cancelled') {
    if (!ride) return;
    let reason: string | null = null;
    if (status === 'cancelled') { reason = window.prompt('Reason for cancelling this ride?'); if (reason === null) return; }
    if (status === 'completed' && !window.confirm('Confirm you collected ' + money(ride.agreed_fare || ride.offer) + ' in cash and the trip is complete.')) return;
    setBusy(true); say('');
    try { await rpc('driver_ride_status', {p_ride:ride.id, p_status:status, p_reason:reason}); await refreshRide(); }
    catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (pos) list.push({id:'me', kind:'me', lat:pos.lat, lng:pos.lng});
    if (ride) {
      list.push({id:'p', kind:'pickup', lat:ride.pickup_lat, lng:ride.pickup_lng}, {id:'d', kind:'dest', lat:ride.dest_lat, lng:ride.dest_lng});
    } else {
      feed.forEach(f => list.push({id:'r' + f.id, kind:'request', lat:f.pickup_lat, lng:f.pickup_lng, label:money(f.my_offer || f.offer).replace('PKR', '').trim(), onClick:() => setSelected(f.id)}));
      if (sel) list.push({id:'sd', kind:'dest', lat:sel.dest_lat, lng:sel.dest_lng});
    }
    return list;
  }, [pos, ride, feed, sel]);
  const fitKey = ride ? ride.id + ride.status + (pos ? 'p' : '') : (selected || '') + (pos ? 'p' : '') + feed.length;

  // ---- render --------------------------------------------------------------------
  if (phase === 'loading') return <div className="skeleton tall"/>;
  if (phase === 'signedout') return <section className="panel ride-panel" style={{maxWidth:640}}><p className="eyebrow">DRIVER DASHBOARD</p><h2>Sign in to drive</h2><p style={{marginBlock:'14px 22px'}}>Sign in with the account you used to apply as a driver.</p><Link className="button" href="/account">Sign in</Link></section>;
  if (!driver) return <section className="panel ride-panel" style={{maxWidth:680}}>
    <p className="eyebrow">DRIVER DASHBOARD</p>
    <h2>Only registered drivers can take rides</h2>
    {!application && <><p style={{marginBlock:'14px 22px'}}>To protect riders, every driver is reviewed before going online. Apply with your vehicle details and we will review your application.</p><Link className="button" href="/partner">Apply as a driver</Link></>}
    {application?.status === 'pending' && <p className="notice" style={{marginTop:18}}>Your {application.kind.toLowerCase()} application is under review. You will be able to go online here once it is approved.</p>}
    {application?.status === 'rejected' && <p className="notice error" style={{marginTop:18}}>Your application was not approved. Contact support if you think this is a mistake.</p>}
    {application?.status === 'approved' && application.kind !== 'Driver' && <p className="notice" style={{marginTop:18}}>Your {application.kind.toLowerCase()} application is approved. Ride requests are only for drivers.</p>}
    {application?.status === 'approved' && application.kind === 'Driver' && <p className="notice" style={{marginTop:18}}>Your application is approved. Reload this page to open your driver dashboard.</p>}
    <Notice message={message} error={isError}/>
  </section>;
  if (driver.status !== 'active') return <section className="panel ride-panel" style={{maxWidth:640}}><p className="eyebrow">DRIVER DASHBOARD</p><h2>Your driver account is suspended</h2><p style={{marginTop:14}}>You cannot take rides right now. Please contact support to resolve this.</p></section>;

  return <div className="ride-layout driver">
    <section className="panel ride-panel">
      <div className="driver-top">
        <div><p className="eyebrow">DRIVER DASHBOARD</p><h2 style={{fontSize:28}}>{online ? 'You are online' : 'You are offline'}</h2><small className="form-note">{driver.vehicle_model} · {driver.vehicle_plate} · {driver.services.join(', ')}</small></div>
        <button className={'power ' + (online ? 'on' : '')} onClick={() => void toggleOnline()} disabled={busy || (!!ride && online)} aria-pressed={online} aria-label={online ? 'Go offline' : 'Go online'}><FiPower/></button>
      </div>
      {summary && <div className="ride-facts"><div><small>Today</small><strong>{money(Number(summary.earned_today))}</strong></div><div><small>Trips today</small><strong>{summary.completed_today}</strong></div><div><small>Last 30 days</small><strong>{money(Number(summary.earned_30d))}</strong></div></div>}
      {tracking && gpsError && !manual && <div className="notice error"><FiAlertTriangle/> {gpsError}<div style={{marginTop:8}}><button className="button small secondary" onClick={() => setManual(true)}>Set my location on the map instead</button></div></div>}
      {manual && <div className="notice"><FiMapPin/> Manual mode: tap the map to place yourself. <button className="text-link" onClick={() => { setManual(false); setPos(null); }}>Use GPS</button></div>}
      {tracking && !pos && !gpsError && <p className="form-note"><FiClock/> Getting your location…</p>}

      {finished && !ride && <div className="ride-done compact"><span className={'ride-done-icon ' + finished.status}><FiCheckCircle/></span><h3>{finished.status === 'completed' ? 'Trip completed' : 'Ride cancelled'}</h3>{finished.status === 'completed' && <p className="ride-price">{money(finished.agreed_fare || finished.offer)}</p>}<button className="button small" onClick={() => setFinished(null)}>Back to requests</button></div>}

      {ride ? <>
        <div className={'ride-banner ' + ride.status}><FiNavigation aria-hidden="true"/><div><strong>{ride.status === 'assigned' ? 'Head to the pickup' : ride.status === 'arrived' ? 'Waiting for the rider' : 'Trip in progress'}</strong><small>{route ? formatKm(route.distance_m) + ' · ' + formatDuration(route.duration_s) + (ride.status === 'in_progress' ? ' to destination' : ' to pickup') : 'Calculating route…'}</small></div></div>
        <div className="ride-route-mini"><span><b>A</b>{ride.pickup_text}</span><span><b>B</b>{ride.dest_text}</span></div>
        <div className="ride-facts"><div><small>Fare (cash)</small><strong>{money(ride.agreed_fare || ride.offer)}</strong></div><div><small>Trip</small><strong>{formatKm(ride.distance_m)}</strong></div><div><small>Vehicle</small><strong>{ride.service}</strong></div></div>
        {ride.rider && <div className="driver-card"><Avatar path={ride.rider.avatar_path} name={ride.rider.name} size={52}/><div><strong>{ride.rider.name || 'Rider'}</strong><small>Rider</small></div>{ride.rider.phone && <a className="button small" href={'tel:' + ride.rider.phone}><FiPhone/> Call</a>}</div>}
        {ride.notes && <p className="form-note">Rider note: {ride.notes}</p>}
        <div className="step-actions">
          {ride.status === 'assigned' && <button className="button ride-cta" disabled={busy} onClick={() => void step('arrived')}>I have arrived</button>}
          {ride.status === 'arrived' && <button className="button ride-cta" disabled={busy} onClick={() => void step('in_progress')}>Start trip</button>}
          {ride.status === 'in_progress' && <button className="button ride-cta" disabled={busy} onClick={() => void step('completed')}>Complete trip · collect {money(ride.agreed_fare || ride.offer)}</button>}
          {(ride.status === 'assigned' || ride.status === 'arrived') && <button className="button secondary danger-text" disabled={busy} onClick={() => void step('cancelled')}>Cancel ride</button>}
        </div>
      </> : online ? <>
        <h3 className="ride-h3">Ride requests near you {feed.length > 0 && <span className="badge">{feed.length}</span>}</h3>
        {!pos ? <p className="form-note">Requests appear once your location is available.</p> : feed.length === 0 ? <p className="form-note">No open requests within 15 km for your vehicle types. Stay online. New requests show up here automatically.</p> : <ul className="offer-list">
          {feed.map(f => <li key={f.id} className={'req-card' + (f.id === selected ? ' selected' : '')} onClick={() => setSelected(f.id)}>
            <div className="req-top"><span className="svc-tag" style={{'--c':'#12b3b8'} as React.CSSProperties}>{f.service}</span><strong>{money(f.offer)}</strong></div>
            <div className="ride-route-mini"><span><b>A</b>{f.pickup_text}</span><span><b>B</b>{f.dest_text}</span></div>
            <p className="req-meta">{f.pickup_km.toFixed(1)} km to pickup · {formatKm(f.distance_m)} trip · {formatDuration(f.duration_s)}</p>
            {f.notes && <p className="req-meta">Note: {f.notes}</p>}
            {f.my_offer_status === 'pending' ? <p className="req-sent"><FiCheckCircle/> You offered {money(f.my_offer || 0)}. Waiting for the rider.</p> : f.my_offer_status === 'rejected' ? <p className="req-meta">Your last offer was declined.</p> : null}
            <div className="req-actions" onClick={e => e.stopPropagation()}>
              <button className="button small" disabled={busy} onClick={() => void offer(f, f.offer)}>Accept {money(f.offer)}</button>
              <input inputMode="numeric" aria-label="Counter offer in PKR" placeholder="Your price" value={counter[f.id] || ''} onChange={e => setCounter(c => ({...c, [f.id]:e.target.value.replace(/\D/g, '').slice(0, 6)}))}/>
              <button className="button small secondary" disabled={busy || !(Number(counter[f.id]) >= 50)} onClick={() => void offer(f, Number(counter[f.id]))}>Counter</button>
            </div>
          </li>)}
        </ul>}
      </> : <p className="form-note" style={{marginTop:6}}>Go online to see ride requests near you. Only registered drivers can accept rides. Keep this page open while you are online so riders can see your location.</p>}
      <Notice message={message} error={isError}/>
    </section>
    <div className="ride-map-wrap"><LiveMap markers={markers} route={route?.coords} routeColor={ride ? '#0a8288' : '#ff4d3d'} fitKey={fitKey} onMapClick={manual ? p => { setPos(p); } : undefined} crosshair={manual}/></div>
  </div>;
}
