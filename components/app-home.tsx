'use client';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {useEffect,useState,type CSSProperties} from 'react';
import {FiArrowRight,FiChevronRight,FiClock,FiCoffee,FiUsers} from 'react-icons/fi';
import {inPakistan,type Place} from '@/lib/geo';
import {saveDraft} from '@/lib/draft';
import {FaCarSide,FaBoxOpen,FaTruckPickup,FaTruck,FaBus,FaMotorcycle} from 'react-icons/fa';
import {MdElectricRickshaw} from 'react-icons/md';
import {MotionLink,stagger,fadeUp} from './motion';
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
  <motion.h2 className="app-title" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.6}}>Rides, delivery, loaders, buses and more</motion.h2>
  <p className="app-note">*Service availability varies by city</p>
  <motion.div className="app-card" initial={{opacity:0,y:30,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.7,ease:[0.16,1,0.3,1]}}>
   <span className="logo-app" role="img" aria-label="Raftaar logo"/>
   <motion.div className="app-tiles" variants={stagger} initial="hidden" animate="show">
    {tiles.map(({label,sub,href,Icon,c,cls})=><motion.div key={label} variants={fadeUp} className={'app-tile-wrap '+cls}><MotionLink whileTap={{scale:.96}} href={href} className={'app-tile '+cls} style={{'--c':c} as CSSProperties}><span className="app-tile-icon"><Icon aria-hidden="true"/></span><strong>{label}</strong><small>{sub}</small></MotionLink></motion.div>)}
   </motion.div>
  </motion.div>
  <div className="app-sheet">
   <MotionLink whileTap={{scale:.98}} href="/ride" className="app-where"><FaCarSide aria-hidden="true"/><span>Where to?</span><i aria-hidden="true"><FiArrowRight/></i></MotionLink>
   {recent.length>0&&<ul className="app-rows" aria-label="Recent places">{recent.map(p=><li key={p.label}><Link href="/ride" onClick={()=>saveDraft({service:'Bike',pickup:null,dest:{label:p.label,lat:p.lat,lng:p.lng,city:p.city||''},pickupNote:'',destNote:'',fare:'',notes:''})}><span className="app-row-icon"><FiClock aria-hidden="true"/></span><span className="app-row-text"><strong>{p.label.split(', ')[0]}</strong><small>{p.label.split(', ').slice(1,3).join(', ')||p.city}</small></span><FiChevronRight aria-hidden="true"/></Link></li>)}</ul>}
   <ul className="app-rows">{rows.map(({label,sub,href,Icon})=><li key={label}><Link href={href}><span className="app-row-icon"><Icon aria-hidden="true"/></span><span className="app-row-text"><strong>{label}</strong><small>{sub}</small></span><FiChevronRight aria-hidden="true"/></Link></li>)}</ul>
  </div>
 </section>;
}
