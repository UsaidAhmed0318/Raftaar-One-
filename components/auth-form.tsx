'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {browserDB} from '@/lib/supabase';
import {Field,Notice,messageOf} from './form-fields';
type Mode='login'|'register'|'forgot'|'reset';
function friendly(err:unknown){
 const raw=err instanceof Error?err.message:'';const code=String((err as {code?:string})?.code||'');
 if(/email not confirmed/i.test(raw)||code==='email_not_confirmed')return 'Your email is not confirmed yet. Open the confirmation email (check Spam too) or resend it below.';
 if(/invalid login credentials/i.test(raw))return 'Wrong email or password. New here? Create an account first, then confirm your email.';
 if(/rate limit/i.test(raw)||code==='over_email_send_rate_limit')return 'Too many emails have been sent right now. Please wait a while and try again.';
 if(/already registered|already been registered/i.test(raw))return 'This email already has an account. Try signing in, or reset your password.';
 if(/password/i.test(raw)&&/(short|least|weak|characters)/i.test(raw))return 'Use a stronger password with at least 12 characters.';
 return messageOf(err);
}
function nextPath(){try{const n=new URLSearchParams(window.location.search).get('next')||'';return /^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(n)?n:'/account';}catch{return '/account';}}
export default function AuthForm({initialMode='login'}:{initialMode?:Mode}){
 const [mode,setMode]=useState<Mode>(initialMode),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false),[pendingEmail,setPendingEmail]=useState(''),[resumeRide,setResumeRide]=useState(false);
 useEffect(()=>{setResumeRide(nextPath()==='/ride');},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage('');setError(false);setPendingEmail('');const form=new FormData(e.currentTarget);const email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
 try{const db=browserDB();
 if(mode==='register'){const {data,error:err}=await db.auth.signUp({email,password,options:{data:{full_name:String(form.get('name'))},emailRedirectTo:window.location.origin+'/account'}});if(err)throw err;
  if(data.session){window.location.assign(nextPath());return;}
  if(data.user&&data.user.identities&&data.user.identities.length===0)throw new Error('This email already has an account. Try signing in, or reset your password.');
  setMessage('Account created. We sent a confirmation link to '+email+'. Open it (check Spam too), then sign in.');setPendingEmail(email);}
 else if(mode==='forgot'){const {error:err}=await db.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'});if(err)throw err;setMessage('If an account exists for this email, a reset link has been sent. Check your inbox and Spam.');}
 else if(mode==='reset'){const {error:err}=await db.auth.updateUser({password});if(err)throw err;setMessage('Password updated. You can now open My account.');}
 else{const {error:err}=await db.auth.signInWithPassword({email,password});if(err){if(/not confirmed/i.test(err.message))setPendingEmail(email);throw err;}window.location.assign(nextPath());}
 }catch(err){setMessage(friendly(err));setError(true);}finally{setBusy(false);}}
 async function resend(){setBusy(true);setError(false);try{const {error:err}=await browserDB().auth.resend({type:'signup',email:pendingEmail,options:{emailRedirectTo:window.location.origin+'/account'}});if(err)throw err;setMessage('Confirmation email sent again to '+pendingEmail+'. Check Inbox and Spam.');}catch(err){setError(true);setMessage(friendly(err));}finally{setBusy(false);}}
 return <div className="panel"><h2 style={{fontSize:30}}>{mode==='register'?'A fresh start.':mode==='forgot'?'Forgot your password?':mode==='reset'?'Set a new password.':'Good to see you.'}</h2>{resumeRide&&mode!=='reset'&&<div className="notice">Sign in or create an account to continue your ride. Your trip is saved on this device.</div>}{mode!=='reset'&&<div className="tabs">{(['login','register','forgot'] as Mode[]).map(m=><button type="button" key={m} className={'tab '+(mode===m?'active':'')} onClick={()=>{setMode(m);setMessage('');setPendingEmail('');}}>{m==='login'?'Sign in':m==='register'?'Create account':'Reset password'}</button>)}</div>}
 <form onSubmit={submit} className="form-stack">{mode==='register'&&<Field label="Full name"><input name="name" autoComplete="name" minLength={2} maxLength={100} required/></Field>}{mode!=='reset'&&<Field label="Email address"><input name="email" type="email" autoComplete="email" maxLength={254} required/></Field>}{mode!=='forgot'&&<Field label={mode==='login'?'Password':'Password · at least 12 characters'}><input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:12} maxLength={128} required/></Field>}{mode==='register'&&<label className="form-note"><input type="checkbox" required/> I accept the <a className="text-link" href="/terms">terms</a> and have read the <a className="text-link" href="/privacy">privacy notice</a>.</label>}<button className="button" disabled={busy}>{busy?'Please wait…':mode==='forgot'?'Request reset email':mode==='reset'?'Update password':mode==='register'?'Create account':'Sign in'}</button></form><Notice message={message} error={error}/>{pendingEmail&&<button type="button" className="button secondary small" onClick={()=>void resend()} disabled={busy}>Resend confirmation email</button>}</div>;
}
