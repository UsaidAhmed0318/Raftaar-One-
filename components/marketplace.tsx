'use client';
import {useEffect,useState} from 'react';
import {FiCoffee,FiShoppingBag,FiHeadphones,FiPlus,FiSearch} from 'react-icons/fi';
import {browserDB} from '@/lib/supabase';
import {imageUrl} from '@/lib/images';
import type {Product} from '@/lib/types';
import {money} from '@/lib/config';
import {useCart} from './cart-provider';
import {Notice,messageOf} from './form-fields';
export default function Marketplace(){
 const [products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[query,setQuery]=useState(''),[category,setCategory]=useState('All'),[added,setAdded]=useState('');const {addItem}=useCart();
 useEffect(()=>{const filter=new URLSearchParams(window.location.search).get('category');if(['Food','Grocery','Accessories'].includes(filter||''))setCategory(filter!);async function load(){try{const {data,error}=await browserDB().from('products').select('*').eq('active',true).order('name').limit(200);if(error)throw error;setProducts(data||[]);}catch(err){setMessage(messageOf(err));}finally{setLoading(false);}}void load();},[]);
 const filtered=products.filter(p=>(category==='All'||p.category===category)&&p.name.toLowerCase().includes(query.toLowerCase()));
 return <><div className="search-bar"><FiSearch aria-hidden/><input className="search-input" aria-label="Search products" placeholder="Find your next favourite…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="tabs">{['All','Food','Grocery','Accessories'].map(c=><button className={'tab '+(category===c?'active':'')} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div><Notice message={message} error/><Notice message={added}/>{loading?<div className="grid three">{[1,2,3].map(i=><div className="skeleton tall" key={i}/>)}</div>:!filtered.length?<div className="panel empty"><FiShoppingBag/><h2>No products to show.</h2><p>{message?'Connect your database to load inventory.':'Try another search, or return when a merchant adds inventory.'}</p></div>:<div className="grid three">{filtered.map(p=>{const Icon=p.category==='Food'?FiCoffee:p.category==='Grocery'?FiShoppingBag:FiHeadphones;return <article className="product-card" key={p.id}><div className={'product-art '+(p.category==='Food'?'peach':p.category==='Grocery'?'mint':'lavender')}>{p.image_path?<img className="product-photo" src={imageUrl('products',p.image_path)||''} alt={p.name} loading="lazy"/>:<Icon aria-hidden/>}</div><div className="product-body"><small>{p.category.toUpperCase()}</small><h3>{p.name}</h3><p>{p.description}</p><div className="product-bottom"><strong>{money(p.price)}</strong><button className="button small" disabled={p.stock<1} onClick={()=>{addItem(p.id);setAdded(p.name+' added. Review quantities in your cart.');}}>{p.stock<1?'Sold out':<>Add <FiPlus/></>}</button></div></div></article>;})}</div>}</>;
}
