'use client';
import {useState,type FormEvent} from 'react';
import {FiMessageCircle,FiArrowUpRight} from 'react-icons/fi';
import {api} from '@/lib/supabase';
import {Field,Notice,messageOf} from './form-fields';
export default function HelpChat(){
 const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[mode,setMode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const data=await api('assistant',{question});setAnswer(data.answer);setMode(data.mode);}catch(err){setMessage(messageOf(err));}finally{setBusy(false);}}
 return <section className="panel"><FiMessageCircle size={32}/><h2 style={{fontSize:30,marginBlock:15}}>A little help, right here.</h2><p className="form-note" style={{marginBottom:20}}>Sign in to ask about this app. If an AI provider is configured, your question is sent to it; otherwise this returns clearly labelled static help. Never include passwords, OTPs, card data or private addresses. Answers may be wrong; this assistant cannot book or cancel services.</p><form onSubmit={submit} className="form-stack"><Field label="Your question · English or Roman Urdu"><textarea value={question} onChange={e=>setQuestion(e.target.value)} minLength={2} maxLength={800} placeholder="Ride request kaise submit karun?" required/></Field><button className="button" disabled={busy}>{busy?'Finding an answer…':<>Ask Raftaar Help <FiArrowUpRight/></>}</button></form><Notice message={message} error/>{answer&&<div className="chat-answer" aria-live="polite"><strong>{mode==='ai'?'AI-assisted answer':'Static help · AI is not configured'}</strong><p style={{marginTop:12}}>{answer}</p></div>}</section>;
}
