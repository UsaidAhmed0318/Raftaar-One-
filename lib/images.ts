import {browserDB} from './supabase';
import {supabaseUrl} from './public-config';
export type Bucket='avatars'|'partners'|'products';
export const imageUrl=(bucket:Bucket,path?:string|null)=>path?supabaseUrl+'/storage/v1/object/public/'+bucket+'/'+path:null;
const allowed=['image/jpeg','image/png','image/webp'];
export function checkImage(file:File){
 if(!allowed.includes(file.type))throw new Error('Please choose a JPG, PNG or WebP image.');
 if(file.size>10*1024*1024)throw new Error('This image is too large. Please choose one under 10 MB.');
}
export async function resizeImage(file:File,max:number):Promise<Blob>{
 checkImage(file);
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('This image could not be read. Try another one.'));i.src=url;});
  const scale=Math.min(1,max/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser cannot process images.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86));
  if(!blob)throw new Error('This image could not be prepared.');
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
export async function uploadImage(bucket:Bucket,file:File,options:{max?:number}={}):Promise<string>{
 const db=browserDB();
 const {data:{user}}=await db.auth.getUser();
 if(!user)throw new Error('Please sign in first.');
 const blob=await resizeImage(file,options.max??900);
 const name=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)+'.jpg';
 const path=bucket==='products'?name:user.id+'/'+name;
 const {error}=await db.storage.from(bucket).upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});
 if(error)throw new Error(error.message==='new row violates row-level security policy'?'You are not allowed to upload here.':'Upload failed. Please try again.');
 return path;
}
export async function removeImage(bucket:Bucket,path?:string|null){
 if(!path)return;
 try{await browserDB().storage.from(bucket).remove([path]);}catch{}
}
