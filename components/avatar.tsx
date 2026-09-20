'use client';
import {FiUser} from 'react-icons/fi';
import {imageUrl} from '@/lib/images';
export function Avatar({path,name,size=40}:{path?:string|null;name?:string;size?:number}){
 const src=imageUrl('avatars',path);
 const initial=(name||'').trim().charAt(0).toUpperCase();
 return <span className="avatar" style={{width:size,height:size,fontSize:size*0.42}} aria-hidden="true">{src?<img src={src} alt="" width={size} height={size}/>:initial?<b>{initial}</b>:<FiUser/>}</span>;
}
