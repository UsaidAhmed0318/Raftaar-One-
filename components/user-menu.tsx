'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {FiArrowRight,FiUser,FiShield,FiLogOut,FiNavigation} from 'react-icons/fi';
import {AnimatePresence,motion} from 'framer-motion';
import {browserDB} from '@/lib/supabase';
import {Avatar} from './avatar';
type Me={name:string;email:string;avatar:string|null;admin:boolean;driver:boolean};
export default function UserMenu(){
 const [me,setMe]=useState<Me|null>(null),[ready,setReady]=useState(false),[open,setOpen]=useState(false);const box=useRef<HTMLDivElement>(null);
 const load=useCallback(async()=>{
  try{
   const db=browserDB();const {data:{session}}=await db.auth.getSession();
   if(!session){setMe(null);return;}
   const {data:profile}=await db.from('profiles').select('full_name,avatar_path,role').eq('id',session.user.id).maybeSingle();
   let driver=false;try{const info=await db.rpc('my_driver');driver=!!info.data&&info.data.status==='active';}catch{/* not a driver */}
   setMe({name:profile?.full_name||String(session.user.user_metadata?.full_name||''),email:session.user.email||'',avatar:profile?.avatar_path||null,admin:profile?.role==='admin',driver});
  }catch{setMe(null);}finally{setReady(true);}
 },[]);
 useEffect(()=>{
  void load();
  let unsubscribe=()=>{};
  try{const {data}=browserDB().auth.onAuthStateChange(()=>{void load();});unsubscribe=()=>data.subscription.unsubscribe();}catch{}
  const refresh=()=>{void load();};window.addEventListener('raftaar-profile',refresh);
  const outside=(e:MouseEvent)=>{if(box.current&&!box.current.contains(e.target as Node))setOpen(false);};document.addEventListener('mousedown',outside);
  return()=>{unsubscribe();window.removeEventListener('raftaar-profile',refresh);document.removeEventListener('mousedown',outside);};
 },[load]);
 if(!ready)return <span className="user-skeleton" aria-hidden="true"/>;
 if(!me)return <Link className="button small" href="/account">Sign in <FiArrowRight/></Link>;
 async function signOut(){try{await browserDB().auth.signOut();}catch{}setOpen(false);window.location.assign('/');}
 return <div className="user-menu" ref={box}>
  <button className="avatar-button" aria-label="Open account menu" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(!open)}><Avatar path={me.avatar} name={me.name||me.email} size={42}/></button>
  <AnimatePresence>{open&&<motion.div role="menu" className="user-dropdown" initial={{opacity:0,y:-6,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:.97}} transition={{duration:.16}}>
   <div className="user-head"><Avatar path={me.avatar} name={me.name||me.email} size={46}/><div><strong>{me.name||'Your account'}</strong><small>{me.email}</small></div></div>
   <Link role="menuitem" href="/account" onClick={()=>setOpen(false)}><FiUser/> My account & photo</Link>
   {me.driver&&<Link role="menuitem" href="/driver" onClick={()=>setOpen(false)}><FiNavigation/> Driver dashboard</Link>}{me.admin&&<Link role="menuitem" href="/admin" onClick={()=>setOpen(false)}><FiShield/> Admin console</Link>}
   <button role="menuitem" onClick={()=>void signOut()}><FiLogOut/> Sign out</button>
  </motion.div>}</AnimatePresence>
 </div>;
}
