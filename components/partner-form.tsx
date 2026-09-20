'use client';
import {useState,type FormEvent} from 'react';
import {api} from '@/lib/supabase';
import {Field,CityField,PhoneField,Notice,messageOf} from './form-fields';
export default function PartnerForm(){
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(false),[message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError(false);const f=new FormData(e.currentTarget);try{await api('applications',{kind:f.get('kind'),city:f.get('city'),phone:f.get('phone'),details:f.get('details')});setDone(true);setMessage('Application received. View the review status in My account. One application per account.');}catch(err){setError(true);setMessage(messageOf(err));}finally{setBusy(false);}}
 return <div className="panel"><form className="form-stack" onSubmit={submit}><Field label="I would like to join as"><select name="kind">{['Driver','Courier','Merchant','Fleet operator'].map(kind=><option key={kind}>{kind}</option>)}</select></Field><CityField/><PhoneField/><Field label="Tell us about your vehicle, shop or service"><textarea name="details" minLength={10} maxLength={1000} required placeholder="No CNIC numbers, bank details or private documents here."/></Field><label className="form-note"><input type="checkbox" required/> I agree to be contacted about this application and understand approval does not guarantee work.</label><button className="button" disabled={busy||done}>{done?'Application submitted':busy?'Submitting…':'Send application'}</button></form><Notice message={message} error={error}/></div>;
}
