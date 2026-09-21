'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {FiShoppingBag,FiMenu,FiX,FiMail,FiPhone} from 'react-icons/fi';
import UserMenu from './user-menu';
import {FaGithub,FaWhatsapp} from 'react-icons/fa';
import {whatsappLink} from '@/lib/contact';
import {useState} from 'react';
import {motion} from 'framer-motion';
import {useCart} from './cart-provider';
import {cities,serviceGroups,brand,hrefFor} from '@/lib/config';
const links=[['/ride','Book a ride'],['/book','Cargo & buses'],['/marketplace','Marketplace'],['/partner','Earn with us'],['/contact','Contact']];
export function Header(){
 const pathname=usePathname(),[open,setOpen]=useState(false);const {items}=useCart();const count=items.reduce((n,i)=>n+i.quantity,0);
 return <header className="header"><div className="container nav"><Link href="/" className="brand" aria-label="Raftaar One home"><span className="logo-mark" aria-hidden="true"/>raftaar<span className="brand-one">one.</span></Link><button className="icon-button mobile-menu" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<FiX/>:<FiMenu/>}</button><nav className={open?'nav-links open':'nav-links'} aria-label="Main navigation">{links.map(([href,label])=><Link aria-current={pathname===href?'page':undefined} key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}</nav><div className="nav-actions"><Link className="cart-link" href="/cart" aria-label={'Cart, '+count+' items'}><FiShoppingBag/><motion.span key={count} initial={{scale:1.5,opacity:0.4}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:400,damping:15}}>{count}</motion.span></Link><UserMenu/></div></div></header>;
}
const book=hrefFor;
const rides=serviceGroups.find(g=>g.id==='Rides')!.vehicles,loaders=serviceGroups.find(g=>g.id==='Loaders')!.vehicles,buses=serviceGroups.find(g=>g.id==='Buses')!.vehicles;
export function Footer(){
 return <footer className="site-footer"><div className="container">
  <div className="sf-top">
   <div className="sf-brand"><Link href="/" aria-label="Raftaar One home" className="sf-logo"><span className="logo-app" role="img" aria-label="Raftaar logo"/></Link><p>A little less hassle.<br/>A lot more Pakistan.</p>
    <div className="sf-social"><a href={whatsappLink('Hello Raftaar One, I need help with: ')} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp/></a><a href={'mailto:'+brand.email} aria-label="Email"><FiMail/></a><a href="tel:+923181014996" aria-label="Call"><FiPhone/></a><a href={'https://github.com/'+brand.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub"><FaGithub/></a></div></div>
   <nav className="sf-cols" aria-label="Footer">
    <div><strong>Cities</strong>{cities.slice(0,6).map(c=><Link key={c} href="/ride">{c}</Link>)}<Link href="/ride">All of Pakistan</Link></div>
    <div><strong>Rides</strong>{rides.map(v=><Link key={v.name} href={book(v.name)}>{v.name}</Link>)}</div>
    <div><strong>Loaders</strong>{loaders.map(v=><Link key={v.name} href={book(v.name)}>{v.name}</Link>)}</div>
    <div><strong>Freight & buses</strong><Link href={book('Truck')}>Truck</Link>{buses.map(v=><Link key={v.name} href={book(v.name)}>{v.name}</Link>)}</div>
    <div><strong>Our services</strong><Link href={book('Parcel')}>Parcel delivery</Link><Link href="/marketplace?category=Food">Food</Link><Link href="/marketplace?category=Grocery">Groceries</Link><Link href="/marketplace?category=Accessories">Accessories</Link></div>
    <div><strong>Earn with us</strong><Link href="/partner">Become a driver</Link><Link href="/driver">Driver dashboard</Link><Link href="/partner">Become a courier</Link><Link href="/partner">Become a merchant</Link><Link href="/partner">Fleet operators</Link></div>
    <div><strong>For riders</strong><Link href="/ride">Book a ride</Link><Link href="/account">My account</Link><Link href="/cart">Cart</Link><Link href="/help">FAQ & help</Link></div>
    <div><strong>Company</strong><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & cancellations</Link><Link href="/help">Support</Link><Link href="/contact">Contact us</Link></div>
   </nav>
  </div>
  <div className="sf-bottom"><p className="sf-copy">© {new Date().getFullYear()} {brand.owner}. Raftaar One · Pakistan · PKR</p><p className="sf-legal">Raftaar One is a prelaunch platform and an informational service, not a transport or delivery operator. Rides, deliveries, loaders, freight and bus or coach services are provided by independent operators after confirmation. A request is not a confirmed booking or a ticket. Prices and availability are confirmed by an operator. Raftaar One has no affiliation with any coach operator, including Daewoo, or with competitor platforms.</p></div>
 </div></footer>;
}
