'use client';
import Link from 'next/link';
import {useEffect,useState,type CSSProperties} from 'react';
import {FiArrowRight,FiChevronRight,FiClock,FiCoffee,FiUsers} from 'react-icons/fi';
import {inPakistan,type Place} from '@/lib/geo';
import {saveDraft} from '@/lib/draft';
import {FaCarSide,FaBoxOpen,FaTruckPickup,FaTruck,FaBus,FaMotorcycle} from 'react-icons/fa';
import {MdElectricRickshaw} from 'react-icons/md';
import {MotionLink} from './motion';
const tiles=[
 {label:'Rides',sub:'Rickshaw, bike, cars & VIP',href:'/ride?service=Bike',Icon:FaCarSide,c:'#12b3b8',cls:'tall'},
 {label:'Food & shop',sub:'Groceries, essentials',href:'/marketplace',Icon:FiCoffee,c:'#ff4d3d',cls:''},
 {label:'Delivery',sub:'Parcels & documents',href:'/book?service=Parcel',Icon:FaBoxOpen,c:'#f0a020',cls:''},
 {label:'Loaders',sub:'Pickups & mini trucks',href:'/book?service=Suzuki%20pickup',Icon:FaTruckPickup,c:'#f0a020',cls:''},
 {label:'Freight',sub:'Heavy trucks',href:'/book?service=Truck',Icon:FaTruck,c:'#0a8288',cls:''},
 {label:'Buses & coaches',sub:'Coach, Hiace, Coaster, mini bus',href:'/book?service=Luxury%20coach',Icon:FaBus,c:'#6b5bd6',cls:'wide'}];
const rows=[
 {label:'Book a ride',sub:'Rickshaw, bike, car',href:'/ride?service=Rickshaw',Icon:MdElectricRickshaw},
 {label:'Ride by bike',sub:'Quick & solo',href:'/ride?service=Bike',Icon:FaMotorcycle},
 {label:'Send a parcel',sub:'Across your city',href:'/book?service=Parcel',Icon:FaBoxOpen},
 {label:'Book a loader',sub:'All loader types',href:'/book?service=Shehzore%20pickup',Icon:FaTruckPickup},
 {label:'Earn with us',sub:'Drivers, couriers, shops',href:'/partner',Icon:FiUsers}];
function useRecentPlaces():Place[]{
 const [recent,setRecent]=useState<Place[]>([]);
 useEffect(()=>{try{const list=JSON.parse(localStorage.getItem('raftaar-recent-places')||'[]') as Place[];setRecent(list.filter(p=>p&&typeof p.label==='string'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&inPakistan(p)).slice(0,3));}catch{/* no saved places */}},[]);
 return recent;
}
export default function AppHome(){
 const recent=useRecentPlaces();
 return <section className="app-home" aria-label="Services">
  <h2 className="app-title intro">Rides, delivery, loaders, buses and more</h2>
  <p className="app-note">*Service availability varies by city</p>
  <div className="app-card intro" style={{'--d':'.06s'} as CSSProperties}>
   <span className="logo-app" role="img" aria-label="Raftaar logo"/>
   <div className="app-tiles">
    {tiles.map(({label,sub,href,Icon,c,cls},i)=><div key={label} className={'app-tile-wrap intro '+cls} style={{'--d':(0.12+i*0.06)+'s'} as CSSProperties}><MotionLink whileTap={{scale:.96}} href={href} className={'app-tile '+cls} style={{'--c':c} as CSSProperties}><span className="app-tile-icon"><Icon aria-hidden="true"/></span><strong>{label}</strong><small>{sub}</small></MotionLink></div>)}
   </div>
  </div>
  <div className="app-sheet">
   <MotionLink whileTap={{scale:.98}} href="/ride" className="app-where"><FaCarSide aria-hidden="true"/><span>Where to?</span><i aria-hidden="true"><FiArrowRight/></i></MotionLink>
   {recent.length>0&&<ul className="app-rows" aria-label="Recent places">{recent.map(p=><li key={p.label}><Link href="/ride" onClick={()=>saveDraft({service:'Bike',pickup:null,dest:{label:p.label,lat:p.lat,lng:p.lng,city:p.city||''},pickupNote:'',destNote:'',fare:'',notes:''})}><span className="app-row-icon"><FiClock aria-hidden="true"/></span><span className="app-row-text"><strong>{p.label.split(', ')[0]}</strong><small>{p.label.split(', ').slice(1,3).join(', ')||p.city}</small></span><FiChevronRight aria-hidden="true"/></Link></li>)}</ul>}
   <ul className="app-rows">{rows.map(({label,sub,href,Icon})=><li key={label}><Link href={href}><span className="app-row-icon"><Icon aria-hidden="true"/></span><span className="app-row-text"><strong>{label}</strong><small>{sub}</small></span><FiChevronRight aria-hidden="true"/></Link></li>)}</ul>
  </div>
 </section>;
}
