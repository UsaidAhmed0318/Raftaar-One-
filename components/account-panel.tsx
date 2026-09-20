'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {User} from '@supabase/supabase-js';
import {browserDB} from '@/lib/supabase';
import {money} from '@/lib/config';
import {Notice,messageOf} from './form-fields';
import AuthForm from './auth-form';
type RecordItem={id:string;created_at:string;status:string;total?:number;service?:string;kind?:string;city:string};
export default function AccountPanel(){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[admin,setAdmin]=useState(false),[message,setMessage]=useState('');
 const [records,setRecords]=useState<Record<string,RecordItem[]>>({orders:[],bookings:[],applications:[]});
 async function load(){try{const db=browserDB();const {data:{user},error}=await db.auth.getUser();if(error&&!user){setUser(null);return;}setUser(user);if(!user)return;
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();setAdmin(profile?.role==='admin');
 const result:Record<string,RecordItem[]>={};for(const table of ['orders','bookings','applications']){const {data,error}=await db.from(table).select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);if(error)throw error;result[table]=data||[];}setRecords(result);
 }catch(err){setMessage(messageOf(err));}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 if(loading)return <div className="skeleton tall" aria-label="Loading account"/>;
 if(!user)return <><Notice message={message} error/><div className="account-grid"><AuthForm/><div className="panel"><p className="eyebrow">ONE ACCOUNT. MORE POSSIBILITIES.</p><h2 style={{fontSize:36}}>Your everyday,<br/>in one place.</h2><p style={{marginTop:20}}>Track order and request status. Apply as a partner. Shop with a cart that stays on this device.</p><p className="form-note" style={{marginTop:20}}>Email verification is required. Never share your password or reset link with support.</p></div></div></>;
 return <><div className="button-row"><p>Signed in as {user.email}</p><button className="button secondary small" onClick={async()=>{try{const {error}=await browserDB().auth.signOut();if(error)throw error;setUser(null);}catch(err){setMessage(messageOf(err));}}}>Sign out</button><button className="button small" onClick={()=>void load()}>Refresh status</button>{admin&&<Link className="button small" href="/admin">Admin console</Link>}</div><Notice message={message} error/><div className="grid three section">{Object.entries(records).map(([group,items])=><section className="panel" key={group}><h2 style={{fontSize:25,textTransform:'capitalize'}}>{group}</h2><small>Latest 50 records</small>{!items.length&&<p className="empty">Nothing here yet.</p>}{items.map(item=><article className="record" key={item.id}><strong>{item.service||item.kind||(item.total?money(item.total):'Order')}</strong><span className="badge">{item.status}</span><p>{item.city} · {new Date(item.created_at).toLocaleString('en-PK')}</p><small>Reference: {item.id}</small></article>)}</section>)}</div></>;
}
