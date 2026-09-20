import {useEffect,useRef,useState,type ReactNode,type KeyboardEvent} from 'react';
import {cities} from '@/lib/config';
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>;}
export function CityField(){return <Field label="Pilot city"><select name="city" required>{cities.map(city=><option key={city}>{city}</option>)}</select></Field>;}
export function PhoneField(){return <Field label="Pakistani mobile number"><input name="phone" type="tel" autoComplete="tel" placeholder="+923181014996" pattern="\+923[0-9]{9}" maxLength={13} required/></Field>;}
export function Notice({message,error=false}:{message:string;error?:boolean}){return message?<div className={'notice'+(error?' error':'')} role={error?'alert':'status'}>{message}</div>:null;}
export function messageOf(error:unknown){return error instanceof Error?error.message:'Something went wrong. Please try again.';}
type PlaceSuggestion={id:number;label:string;city:string};
export function AddressField({label,name,placeholder,minLength=5,maxLength=300,required=true,hint}:{label:string;name:string;placeholder?:string;minLength?:number;maxLength?:number;required?:boolean;hint?:string}){
 const [value,setValue]=useState(''),[suggestions,setSuggestions]=useState<PlaceSuggestion[]>([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[activeIndex,setActiveIndex]=useState(-1);
 const boxRef=useRef<HTMLDivElement>(null),controllerRef=useRef<AbortController|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null),skipNextFetch=useRef(false);
 useEffect(()=>{function onOutside(e:MouseEvent){if(boxRef.current&&!boxRef.current.contains(e.target as Node))setOpen(false);}document.addEventListener('mousedown',onOutside);return()=>document.removeEventListener('mousedown',onOutside);},[]);
 useEffect(()=>{
  if(skipNextFetch.current){skipNextFetch.current=false;return;}
  if(timerRef.current)clearTimeout(timerRef.current);
  const q=value.trim();
  if(q.length<3){setSuggestions([]);setOpen(false);return;}
  timerRef.current=setTimeout(async()=>{
   controllerRef.current?.abort();
   const controller=new AbortController();controllerRef.current=controller;setLoading(true);
   try{const res=await fetch('/api/places?q='+encodeURIComponent(q),{signal:controller.signal});const data=await res.json();setSuggestions(data.results||[]);setOpen(true);setActiveIndex(-1);}catch{/* keep typing freely if lookup fails */}finally{setLoading(false);}
  },350);
  return()=>{if(timerRef.current)clearTimeout(timerRef.current);};
 },[value]);
 function choose(s:PlaceSuggestion){skipNextFetch.current=true;setValue(s.label);setOpen(false);setSuggestions([]);}
 function onKeyDown(e:KeyboardEvent<HTMLInputElement>){
  if(!open||!suggestions.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();setActiveIndex(i=>(i+1)%suggestions.length);}
  else if(e.key==='ArrowUp'){e.preventDefault();setActiveIndex(i=>(i-1+suggestions.length)%suggestions.length);}
  else if(e.key==='Enter'){if(activeIndex>=0){e.preventDefault();choose(suggestions[activeIndex]);}}
  else if(e.key==='Escape'){setOpen(false);}
 }
 return <label className="field address-field"><span>{label}</span><div className="address-input-wrap" ref={boxRef}>
  <input name={name} value={value} onChange={e=>setValue(e.target.value)} onFocus={()=>{if(suggestions.length)setOpen(true);}} onKeyDown={onKeyDown} placeholder={placeholder} minLength={minLength} maxLength={maxLength} required={required} autoComplete="off" role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={name+'-listbox'}/>
  {loading&&<span className="address-spinner" aria-hidden="true"/>}
  {open&&suggestions.length>0&&<ul className="address-suggestions" id={name+'-listbox'} role="listbox">{suggestions.map((s,i)=><li key={s.id} role="option" aria-selected={i===activeIndex} className={i===activeIndex?'active':''} onMouseDown={e=>{e.preventDefault();choose(s);}}>{s.label}</li>)}</ul>}
 </div>{hint&&<small className="address-hint">{hint}</small>}</label>;
}
