'use client';
import {useEffect,useState,type ChangeEvent,type FormEvent} from 'react';
import {FiImage} from 'react-icons/fi';
import {api} from '@/lib/supabase';
import {checkImage,uploadImage} from '@/lib/images';
import {rideServices} from '@/lib/config';
import {vehicleIcons} from './vehicle-icons';
import {Field,CityField,PhoneField,Notice,messageOf} from './form-fields';
const photoLabels:Record<string,string>={Driver:'Your photo or vehicle photo',Courier:'Your photo or vehicle photo','Fleet operator':'Photo of your fleet or office',Merchant:'Photo of your shop or products'};
export default function PartnerForm(){
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(false),[message,setMessage]=useState(''),[kind,setKind]=useState('Driver'),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState('');
 const [vehicles,setVehicles]=useState<string[]>([]);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 function choose(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0]||null;setError(false);setMessage('');if(!f){setFile(null);return;}try{checkImage(f);setFile(f);}catch(err){setFile(null);e.target.value='';setError(true);setMessage(messageOf(err));}}
 const toggle=(name:string)=>setVehicles(v=>v.includes(name)?v.filter(x=>x!==name):[...v,name]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError(false);setMessage('');const f=new FormData(e.currentTarget);
  if(kind==='Driver'&&!vehicles.length){setError(true);setMessage('Choose at least one vehicle type you drive.');return;}
  setBusy(true);
  try{const photoPath=file?await uploadImage('partners',file,{max:1000}):null;
   await api('applications',{kind:f.get('kind'),city:f.get('city'),phone:f.get('phone'),details:f.get('details'),photoPath,...(kind==='Driver'?{vehicles,vehicleModel:f.get('vehicleModel'),vehiclePlate:f.get('vehiclePlate')}:{})});
   setDone(true);setMessage(kind==='Driver'?'Application received. Once an admin approves it you can go online from the Driver dashboard. Track the status in My account.':'Application received. View the review status in My account. One application per account.');}
  catch(err){setError(true);setMessage(messageOf(err));}finally{setBusy(false);}}
 return <div className="panel"><form className="form-stack" onSubmit={submit}><Field label="I would like to join as"><select name="kind" value={kind} onChange={e=>setKind(e.target.value)}>{['Driver','Courier','Merchant','Fleet operator'].map(k=><option key={k}>{k}</option>)}</select></Field><CityField/><PhoneField/>
 {kind==='Driver'&&<fieldset className="driver-fields"><legend>Ride-hailing driver details</legend>
  <p className="form-note">Only admin-approved drivers can go online and accept rides. Choose every vehicle type you can drive.</p>
  <div className="chip-grid" role="group" aria-label="Vehicle types you drive">{rideServices.map(s=>{const Icon=vehicleIcons[s];return <button type="button" key={s} className={'chip'+(vehicles.includes(s)?' on':'')} aria-pressed={vehicles.includes(s)} onClick={()=>toggle(s)}><Icon aria-hidden="true"/>{s}</button>;})}</div>
  <div className="grid two"><Field label="Vehicle make and model"><input name="vehicleModel" minLength={2} maxLength={60} required placeholder="Suzuki Alto 2019 / Honda 125"/></Field><Field label="Number plate"><input name="vehiclePlate" minLength={4} maxLength={15} required placeholder="LEA-1234" style={{textTransform:'uppercase'}}/></Field></div>
 </fieldset>}
 <Field label="Tell us about your vehicle, shop or service"><textarea name="details" minLength={10} maxLength={1000} required placeholder="No CNIC numbers, bank details or private documents here."/></Field>
 <div className="field"><span>{photoLabels[kind]} · optional</span><label className="photo-drop">{preview?<img src={preview} alt="Selected photo preview"/>:<span className="photo-empty"><FiImage/> Tap to add a photo</span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} hidden/></label>{file&&<button type="button" className="text-link" onClick={()=>setFile(null)}>Remove photo</button>}</div>
 <label className="form-note"><input type="checkbox" required/> I agree to be contacted about this application and understand approval does not guarantee work.</label><button className="button" disabled={busy||done}>{done?'Application submitted':busy?'Submitting…':'Send application'}</button></form><Notice message={message} error={error}/></div>;
}
