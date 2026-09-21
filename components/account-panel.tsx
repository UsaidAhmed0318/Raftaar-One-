'use client';
import {useEffect,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {browserDB} from '@/lib/supabase';
import {Notice,messageOf} from './form-fields';
import AuthForm from './auth-form';
import Profile,{type RecordItem,type RideRow} from './profile';
import {rpc} from '@/lib/rides';
export default function AccountPanel(){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[admin,setAdmin]=useState(false),[avatar,setAvatar]=useState<string|null>(null),[fullName,setFullName]=useState(''),[rides,setRides]=useState<RideRow[]>([]),[message,setMessage]=useState('');
 const [records,setRecords]=useState<Record<string,RecordItem[]>>({orders:[],bookings:[],applications:[]});
 async function load(){try{const db=browserDB();const {data:{user},error}=await db.auth.getUser();if(error&&!user){setUser(null);return;}setUser(user);if(!user)return;
 const {data:profile}=await db.from('profiles').select('role,avatar_path,full_name').eq('id',user.id).maybeSingle();setAdmin(profile?.role==='admin');setAvatar(profile?.avatar_path||null);setFullName(String(user.user_metadata?.full_name||profile?.full_name||''));
 const result:Record<string,RecordItem[]>={};for(const table of ['orders','bookings','applications']){const {data,error}=await db.from(table).select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);if(error)throw error;result[table]=data||[];}setRecords(result);try{setRides(await rpc<RideRow[]>('my_rides'));}catch{setRides([]);}
 }catch(err){setMessage(messageOf(err));}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function signOut(){try{const {error}=await browserDB().auth.signOut();if(error)throw error;setUser(null);}catch(err){setMessage(messageOf(err));}}
 if(loading)return <div className="skeleton tall" aria-label="Loading account"/>;
 if(!user)return <><Notice message={message} error/><div className="account-grid"><AuthForm/><div className="panel"><p className="eyebrow">ONE ACCOUNT. MORE POSSIBILITIES.</p><h2 style={{fontSize:36}}>Your everyday,<br/>in one place.</h2><p style={{marginTop:20}}>Track order and request status. Apply as a partner. Shop with a cart that stays on this device.</p><p className="form-note" style={{marginTop:20}}>Email verification is required. Never share your password or reset link with support.</p></div></div></>;
 return <Profile user={user} fullName={fullName} avatar={avatar} admin={admin} records={records} rides={rides} message={message} onAvatar={setAvatar} onName={setFullName} onRefresh={()=>void load()} onSignOut={()=>void signOut()}/>;
}
