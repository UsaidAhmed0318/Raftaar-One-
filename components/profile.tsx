'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {motion} from 'framer-motion';
import type {User} from '@supabase/supabase-js';
import {FiActivity,FiCheckCircle,FiChevronRight,FiClock,FiCreditCard,FiFileText,FiHeadphones,FiInfo,FiLock,FiLogOut,FiMapPin,FiSettings,FiShield,FiTrash2} from 'react-icons/fi';
import {FaCarSide} from 'react-icons/fa';
import {browserDB} from '@/lib/supabase';
import {money} from '@/lib/config';
import {inPakistan,type Place} from '@/lib/geo';
import {saveDraft} from '@/lib/draft';
import {fadeUp,stagger} from './motion';
import AvatarUploader from './avatar-uploader';
import {Notice,messageOf} from './form-fields';

export type RideRow = {id:string;service:string;status:string;pickup_text:string;dest_text:string;offer:number;agreed_fare:number|null;created_at:string;role:string};
export type RecordItem = {id:string;created_at:string;status:string;total?:number;service?:string;kind?:string;city:string};
type Props = {
  user: User; fullName: string; avatar: string | null; admin: boolean;
  records: Record<string, RecordItem[]>; rides: RideRow[]; message: string;
  onAvatar: (path: string | null) => void; onName: (name: string) => void; onRefresh: () => void; onSignOut: () => void;
};

const PLACES_KEY = 'raftaar-recent-places';
const validPlace = (p: Place) => !!p && typeof p.label === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && inPakistan(p);
function useSavedPlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  useEffect(() => { try { setPlaces((JSON.parse(localStorage.getItem(PLACES_KEY) || '[]') as Place[]).filter(validPlace)); } catch { /* none saved */ } }, []);
  const save = (next: Place[]) => { setPlaces(next); try { localStorage.setItem(PLACES_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ } };
  return [places, save] as const;
}

function Row({href, icon, title, sub, end, onClick}: {href?: string; icon: React.ReactNode; title: string; sub?: string; end?: React.ReactNode; onClick?: () => void}) {
  const body = <><span className="me-row-icon" aria-hidden="true">{icon}</span><span className="me-row-text"><strong>{title}</strong>{sub && <small>{sub}</small>}</span>{end ?? (href || onClick ? <FiChevronRight aria-hidden="true"/> : null)}</>;
  if (href) return <Link className="me-row" href={href}>{body}</Link>;
  if (onClick) return <button type="button" className="me-row" onClick={onClick}>{body}</button>;
  return <div className="me-row">{body}</div>;
}

export default function Profile({user, fullName, avatar, admin, records, rides, message, onAvatar, onName, onRefresh, onSignOut}: Props) {
  const [phone, setPhone] = useState('');
  const [places, savePlaces] = useSavedPlaces();
  const [name, setName] = useState(fullName);
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { setPhone(localStorage.getItem('raftaar-phone') || ''); } catch { /* ignore */ } }, []);
  useEffect(() => setName(fullName), [fullName]);

  const display = fullName || 'Welcome back';
  const verified = !!user.email_confirmed_at;
  const isDriver = (records.applications || []).some(a => a.kind === 'Driver' && a.status === 'approved');
  const asRider = rides.filter(r => r.role === 'rider');
  const done = asRider.filter(r => r.status === 'completed').length;
  const cancelled = asRider.filter(r => r.status === 'cancelled').length;

  function say(text: string, error = false) { setNotice(text); setFailed(error); }
  async function saveName(e: FormEvent) {
    e.preventDefault();
    const next = name.trim().slice(0, 100);
    if (next.length < 2) { say('Please enter your name (at least 2 letters).', true); return; }
    setBusy(true); say('');
    try { const {error} = await browserDB().auth.updateUser({data: {full_name: next}}); if (error) throw error; onName(next); say('Name updated.'); }
    catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }
  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) { say('Use a password with at least 12 characters.', true); return; }
    setBusy(true); say('');
    try { const {error} = await browserDB().auth.updateUser({password}); if (error) throw error; setPassword(''); say('Password updated.'); }
    catch (err) { say(messageOf(err), true); } finally { setBusy(false); }
  }
  const rideTo = (p: Place) => saveDraft({service: 'Bike', pickup: null, dest: {label: p.label, lat: p.lat, lng: p.lng, city: p.city || ''}, pickupNote: '', destNote: '', fare: '', notes: ''});

  return <motion.div className="me" variants={stagger} initial="hidden" animate="show">
    <motion.header className="me-head" variants={fadeUp}>
      <AvatarUploader path={avatar} name={fullName || user.email || ''} onChange={onAvatar} compact/>
      <h2 className="me-name">{display}{verified && <FiCheckCircle className="me-verified" aria-label="Email verified"/>}</h2>
      <p className="me-sub">{phone || user.email}</p>
      {phone && <p className="me-sub small">{user.email}</p>}
    </motion.header>

    <motion.nav className="me-quick" aria-label="Profile shortcuts" variants={fadeUp}>
      <a href="#activity"><i><FiClock/></i>Orders</a>
      <Link href="/help"><i><FiHeadphones/></i>Support</Link>
      <a href="#places"><i><FiMapPin/></i>Addresses</a>
      <a href="#settings"><i><FiSettings/></i>Settings</a>
    </motion.nav>

    <Notice message={message} error/>

    <motion.div className="me-card" variants={fadeUp}>
      <Row icon={<FiCreditCard/>} title="Payment methods" sub="Pay your driver or courier in cash" end={<span className="me-cash">Cash</span>}/>
      {asRider.length > 0 && <Row icon={<FiActivity/>} title={done + ' completed · ' + cancelled + ' cancelled'} sub="Your rides as a rider"/>}
    </motion.div>

    <motion.div variants={fadeUp}>
      <Link className="me-dark" href={isDriver ? '/driver' : '/partner'}><span className="me-dark-icon" aria-hidden="true"><FaCarSide/></span><span><strong>{isDriver ? 'Driver dashboard' : 'Earn as a driver'}</strong><small>{isDriver ? 'Go online and see nearby rides' : 'Apply to drive, deliver or sell'}</small></span><FiChevronRight aria-hidden="true"/></Link>
      {admin && <Link className="me-dark admin" href="/admin"><span className="me-dark-icon" aria-hidden="true"><FiShield/></span><span><strong>Admin console</strong><small>Orders, requests, drivers</small></span><FiChevronRight aria-hidden="true"/></Link>}
    </motion.div>

    <motion.div className="me-card" variants={fadeUp}>
      <Row href="/help" icon={<FiShield/>} title="Safety" sub="Ride safety tips and help"/>
      <Row href="/terms" icon={<FiFileText/>} title="Terms & cancellations"/>
      <Row href="/privacy" icon={<FiInfo/>} title="Privacy"/>
    </motion.div>

    <motion.section id="places" className="me-section" variants={fadeUp}>
      <h3>Saved places</h3>
      <p className="form-note">Places you searched for on this device. They are never uploaded.</p>
      {places.length === 0 ? <p className="me-empty">No places yet. Search for a destination on the ride screen.</p> : <div className="me-card">
        {places.map(p => <div className="me-row" key={p.label}>
          <span className="me-row-icon" aria-hidden="true"><FiMapPin/></span>
          <Link className="me-row-text" href="/ride" onClick={() => rideTo(p)}><strong>{p.label.split(', ')[0]}</strong><small>{p.label.split(', ').slice(1, 3).join(', ') || p.city}</small></Link>
          <button type="button" className="me-icon-btn" aria-label={'Remove ' + p.label.split(', ')[0]} onClick={() => savePlaces(places.filter(x => x.label !== p.label))}><FiTrash2/></button>
        </div>)}
      </div>}
    </motion.section>

    <motion.section id="settings" className="me-section" variants={fadeUp}>
      <h3>Settings</h3>
      <form className="me-card me-form" onSubmit={saveName}>
        <label className="field"><span>Display name</span><input value={name} onChange={e => setName(e.target.value)} maxLength={100} autoComplete="name" required/></label>
        <button className="button small" disabled={busy || name.trim() === fullName}>Save name</button>
      </form>
      <form className="me-card me-form" onSubmit={savePassword}>
        <label className="field"><span>New password · at least 12 characters</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required/></label>
        <button className="button small" disabled={busy || password.length < 12}><FiLock/> Change password</button>
      </form>
      <Notice message={notice} error={failed}/>
      <button type="button" className="me-signout" onClick={onSignOut}><FiLogOut/> Sign out</button>
    </motion.section>

    <motion.section id="activity" className="me-section" variants={fadeUp}>
      <div className="me-section-head"><h3>Your activity</h3><button type="button" className="link-btn" onClick={onRefresh}>Refresh</button></div>
      {(['orders', 'bookings', 'applications'] as const).map(group => <div className="me-card" key={group}>
        <h4>{group === 'applications' ? 'Partner applications' : group === 'bookings' ? 'Delivery & cargo requests' : 'Shop orders'}</h4>
        {!(records[group] || []).length && <p className="me-empty">Nothing here yet.</p>}
        {(records[group] || []).map(item => <article className="record" key={item.id}><strong>{item.service || item.kind || (item.total ? money(item.total) : 'Order')}</strong><span className="badge">{item.status}</span><p>{item.city} · {new Date(item.created_at).toLocaleString('en-PK')}</p><small>Reference: {item.id}</small></article>)}
      </div>)}
      {rides.length > 0 && <div className="me-card"><h4>Rides</h4>{rides.map(r => <article className="record" key={r.id}><strong>{r.service} · {money(r.agreed_fare || r.offer)}</strong><span className="badge">{r.status}</span><span className="badge">{r.role}</span><p>{r.pickup_text} → {r.dest_text}</p><small>{new Date(r.created_at).toLocaleString('en-PK')}</small></article>)}</div>}
    </motion.section>
  </motion.div>;
}
