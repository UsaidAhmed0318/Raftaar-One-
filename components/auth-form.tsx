'use client';
import {useState,type FormEvent} from 'react';
import {browserDB} from '@/lib/supabase';
import {Field,Notice,messageOf} from './form-fields';
type Mode='login'|'register'|'forgot'|'reset';
export default function AuthForm({initialMode='login'}:{initialMode?:Mode}){
 const [mode,setMode]=useState<Mode>(initialMode),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage('');setError(false);const form=new FormData(e.currentTarget);const email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
 try{const db=browserDB();let result;
 if(mode==='register')result=await db.auth.signUp({email,password,options:{data:{full_name:String(form.get('name'))},emailRedirectTo:window.location.origin+'/account'}});
 else if(mode==='forgot')result=await db.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'});
 else if(mode==='reset')result=await db.auth.updateUser({password});
 else result=await db.auth.signInWithPassword({email,password});
 if(result.error)throw result.error;
 if(mode==='register')setMessage('Check your inbox to confirm your email. Then sign in.');
 else if(mode==='forgot')setMessage('If an eligible account exists, a reset link has been requested. Check your inbox.');
 else if(mode==='reset'){setMessage('Password updated. Return to My account.');}
 else window.location.assign('/account');
 }catch(err){setMessage(messageOf(err));setError(true);}finally{setBusy(false);}}
 return <div className="panel"><h2 style={{fontSize:30}}>{mode==='register'?'A fresh start.':mode==='forgot'?'Forgot your password?':mode==='reset'?'Set a new password.':'Good to see you.'}</h2>{mode!=='reset'&&<div className="tabs">{(['login','register','forgot'] as Mode[]).map(m=><button key={m} className={'tab '+(mode===m?'active':'')} onClick={()=>{setMode(m);setMessage('');}}>{m==='login'?'Sign in':m==='register'?'Create account':'Reset password'}</button>)}</div>}
 <form onSubmit={submit} className="form-stack">{mode==='register'&&<Field label="Full name"><input name="name" autoComplete="name" minLength={2} maxLength={100} required/></Field>}{mode!=='reset'&&<Field label="Email address"><input name="email" type="email" autoComplete="email" maxLength={254} required/></Field>}{mode!=='forgot'&&<Field label="Password · at least 12 characters"><input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} maxLength={128} required/></Field>}{mode==='register'&&<label className="form-note"><input type="checkbox" required/> I accept the <a className="text-link" href="/terms">terms</a> and have read the <a className="text-link" href="/privacy">privacy notice</a>.</label>}<button className="button" disabled={busy}>{busy?'Please wait…':mode==='forgot'?'Request reset email':mode==='reset'?'Update password':mode==='register'?'Create account':'Sign in'}</button></form><Notice message={message} error={error}/></div>;
}
