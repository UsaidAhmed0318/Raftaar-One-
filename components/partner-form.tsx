'use client';
import {useEffect,useState,type ChangeEvent,type FormEvent} from 'react';
import {FiImage} from 'react-icons/fi';
import {api} from '@/lib/supabase';
import {checkImage,uploadImage} from '@/lib/images';
import {Field,CityField,PhoneField,Notice,messageOf} from './form-fields';
const photoLabels:Record<string,string>={Driver:'Your photo or vehicle photo',Courier:'Your photo or vehicle photo','Fleet operator':'Photo of your fleet or office',Merchant:'Photo of your shop or products'};
export default function PartnerForm(){
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(false),[message,setMessage]=useState(''),[kind,setKind]=useState('Driver'),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState('');
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 function choose(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0]||null;setError(false);setMessage('');if(!f){setFile(null);return;}try{checkImage(f);setFile(f);}catch(err){setFile(null);e.target.value='';setError(true);setMessage(messageOf(err));}}
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError(false);setMessage('');const f=new FormData(e.currentTarget);
  try{const photoPath=file?await uploadImage('partners',file,{max:1000}):null;await api('applications',{kind:f.get('kind'),city:f.get('city'),phone:f.get('phone'),details:f.get('details'),photoPath});setDone(true);setMessage('Application received. View the review status in My account. One application per account.');}
  catch(err){setError(true);setMessage(messageOf(err));}finally{setBusy(false);}}
 return <div className="panel"><form className="form-stack" onSubmit={submit}><Field label="I would like to join as"><select name="kind" value={kind} onChange={e=>setKind(e.target.value)}>{['Driver','Courier','Merchant','Fleet operator'].map(k=><option key={k}>{k}</option>)}</select></Field><CityField/><PhoneField/><Field label="Tell us about your vehicle, shop or service"><textarea name="details" minLength={10} maxLength={1000} required placeholder="No CNIC numbers, bank details or private documents here."/></Field>
 <div className="field"><span>{photoLabels[kind]} · optional</span><label className="photo-drop">{preview?<img src={preview} alt="Selected photo preview"/>:<span className="photo-empty"><FiImage/> Tap to add a photo</span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} hidden/></label>{file&&<button type="button" className="text-link" onClick={()=>setFile(null)}>Remove photo</button>}</div>
 <label className="form-note"><input type="checkbox" required/> I agree to be contacted about this application and understand approval does not guarantee work.</label><button className="button" disabled={busy||done}>{done?'Application submitted':busy?'Submitting…':'Send application'}</button></form><Notice message={message} error={error}/></div>;
}
