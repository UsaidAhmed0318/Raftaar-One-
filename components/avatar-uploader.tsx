'use client';
import {useRef,useState,type ChangeEvent} from 'react';
import {FiCamera,FiTrash2} from 'react-icons/fi';
import {api} from '@/lib/supabase';
import {uploadImage,removeImage} from '@/lib/images';
import {Avatar} from './avatar';
import {Notice,messageOf} from './form-fields';
export default function AvatarUploader({path,name,onChange,compact=false}:{path:string|null;name:string;onChange:(path:string|null)=>void;compact?:boolean}){
 const input=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 async function pick(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  setBusy(true);setMessage('');setError(false);
  try{const next=await uploadImage('avatars',file,{max:512});await api('avatar',{path:next});await removeImage('avatars',path);onChange(next);window.dispatchEvent(new Event('raftaar-profile'));setMessage('Photo updated.');}
  catch(err){setError(true);setMessage(messageOf(err));}finally{setBusy(false);}
 }
 async function remove(){
  setBusy(true);setMessage('');setError(false);
  try{await api('avatar',{path:null});await removeImage('avatars',path);onChange(null);window.dispatchEvent(new Event('raftaar-profile'));setMessage('Photo removed.');}
  catch(err){setError(true);setMessage(messageOf(err));}finally{setBusy(false);}
 }
 const file=<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick}/>;
 const preview=<div className="uploader-preview"><Avatar path={path} name={name} size={compact?112:104}/><button type="button" className="uploader-camera" aria-label="Change profile photo" onClick={()=>input.current?.click()} disabled={busy}><FiCamera/></button></div>;
 if(compact)return <div className="uploader compact">{preview}{file}<div className="uploader-links"><button type="button" className="link-btn" onClick={()=>input.current?.click()} disabled={busy}>{busy?'Uploading…':path?'Change photo':'Add photo'}</button>{path&&<button type="button" className="link-btn muted" onClick={()=>void remove()} disabled={busy}>Remove</button>}</div><Notice message={message} error={error}/></div>;
 return <div className="uploader">
  {preview}
  <div className="uploader-actions">
   {file}
   <button type="button" className="button small" onClick={()=>input.current?.click()} disabled={busy}><FiCamera/> {busy?'Uploading…':path?'Change photo':'Add photo'}</button>
   {path&&<button type="button" className="button small secondary" onClick={()=>void remove()} disabled={busy}><FiTrash2/> Remove</button>}
   <p className="form-note">JPG, PNG or WebP. Your photo is resized automatically.</p>
   <Notice message={message} error={error}/>
  </div>
 </div>;
}
