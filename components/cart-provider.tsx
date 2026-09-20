'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {CartItem} from '@/lib/types';
type CartContext={items:CartItem[];addItem:(id:string)=>void;setQuantity:(id:string,n:number)=>void;clear:()=>void;ready:boolean};
const Context=createContext<CartContext|null>(null);
export function CartProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<CartItem[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('raftaar-cart')||'[]');if(Array.isArray(saved))setItems(saved.filter(x=>typeof x.id==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=20).slice(0,30));}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem('raftaar-cart',JSON.stringify(items));}catch{}},[items,ready]);
 function setQuantity(id:string,n:number){setItems(list=>list.map(i=>i.id===id?{...i,quantity:Math.max(0,Math.min(20,n))}:i).filter(i=>i.quantity>0));}
 function addItem(id:string){setItems(list=>{const existing=list.find(i=>i.id===id);return existing?list.map(i=>i.id===id?{...i,quantity:Math.min(20,i.quantity+1)}:i):list.length<30?[...list,{id,quantity:1}]:list;});}
 return <Context.Provider value={{items,addItem,setQuantity,clear:()=>setItems([]),ready}}>{children}</Context.Provider>;
}
export function useCart(){const value=useContext(Context);if(!value)throw new Error('CartProvider missing');return value;}
