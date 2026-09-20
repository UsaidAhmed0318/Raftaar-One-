'use client';
import {useState,type FormEvent} from 'react';
import {FiMessageCircle,FiArrowUpRight} from 'react-icons/fi';
import {api} from '@/lib/supabase';
import {helpTopics} from '@/lib/help';
import {Field,Notice,messageOf} from './form-fields';
type Related={id:string;title:string};
export default function HelpChat(){
 const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[related,setRelated]=useState<Related[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function ask(text:string){setBusy(true);setMessage('');try{const data=await api('assistant',{question:text});setAnswer(data.answer);setRelated(data.related||[]);}catch(err){setMessage(messageOf(err));}finally{setBusy(false);}}
 function submit(e:FormEvent){e.preventDefault();void ask(question);}
 function pick(title:string){setQuestion(title);void ask(title);}
 return <section className="panel"><FiMessageCircle size={32}/><h2 style={{fontSize:30,marginBlock:15}}>A little help, right here.</h2><p className="form-note" style={{marginBottom:20}}>Sign in and ask about rides, drivers, orders or your account, in English or Roman Urdu. Never include passwords, OTPs, card data or private addresses. This help cannot book or cancel anything for you.</p><form onSubmit={submit} className="form-stack"><Field label="Your question · English or Roman Urdu"><textarea value={question} onChange={e=>setQuestion(e.target.value)} minLength={2} maxLength={800} placeholder="Ride request kaise submit karun?" required/></Field><button className="button" disabled={busy}>{busy?'Finding an answer…':<>Ask Raftaar Help <FiArrowUpRight/></>}</button></form><Notice message={message} error/>{answer&&<div className="chat-answer" aria-live="polite"><strong>Answer</strong><p style={{marginTop:12}}>{answer}</p></div>}
 <div className="chip-grid" style={{marginTop:18}} aria-label="Common questions">{(related.length?related:helpTopics.slice(0,6).map(t=>({id:t.id,title:t.title}))).map(r=><button key={r.id} type="button" className="chip" disabled={busy} onClick={()=>pick(r.title)}>{r.title}</button>)}</div></section>;
}
