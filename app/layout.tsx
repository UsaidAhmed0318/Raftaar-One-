import type {Metadata,Viewport} from 'next';
import './globals.css';
import {siteUrl} from '@/lib/site';
import {CartProvider} from '@/components/cart-provider';
import BootLoader from '@/components/boot-loader';
import {Header,Footer} from '@/components/shell';
import ContactFab from '@/components/contact-fab';
import JsonLd from '@/components/json-ld';
import {brand,launchReady} from '@/lib/config';
const ADSENSE_ID='ca-pub-3057973684835998';
const TITLE='Raftaar One | Rides, delivery, loaders & buses across Pakistan';
const DESCRIPTION='Book rickshaw, bike and car rides, parcel delivery, loaders, trucks and buses across Pakistan. Set your own fare and track your ride live.';
export const metadata:Metadata={
 metadataBase:new URL(siteUrl()),
 title:{default:TITLE,template:'%s | Raftaar One'},
 description:DESCRIPTION,
 applicationName:'Raftaar One',
 keywords:['ride hailing Pakistan','rickshaw booking','bike taxi Pakistan','car booking Karachi Lahore Islamabad','parcel delivery Pakistan','loader booking','Suzuki pickup booking','Shehzore pickup','truck freight Pakistan','bus and coach booking','Raftaar One'],
 authors:[{name:brand.owner}],
 creator:brand.owner,
 publisher:'Raftaar One',
 category:'transportation',
 formatDetection:{telephone:true,email:true,address:false},
 alternates:{canonical:'./'},
 manifest:'/manifest.webmanifest',
 icons:{icon:'/images/logo.png',apple:'/images/logo.png'},
 robots:{index:launchReady,follow:launchReady},
 other:{'google-adsense-account':ADSENSE_ID},
 openGraph:{title:TITLE,description:DESCRIPTION,type:'website',locale:'en_PK',siteName:'Raftaar One',url:'/',images:[{url:'/opengraph-image',width:1200,height:630,alt:'Raftaar One: rides, delivery, loaders and buses across Pakistan'}]},
 twitter:{card:'summary_large_image',title:TITLE,description:DESCRIPTION,images:['/opengraph-image']}
};
export const viewport:Viewport={themeColor:'#0a8288',width:'device-width',initialScale:1};
export default function Layout({children}:{children:React.ReactNode}){
 const site=siteUrl();
 return <html lang="en-PK" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{if(sessionStorage.getItem('raftaar-booted')==='1')document.documentElement.setAttribute('data-booted','1')}catch(e){}"}}/><script async src={'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+ADSENSE_ID} crossOrigin="anonymous"/></head><body><noscript><style>{`.boot{display:none!important}`}</style></noscript>
 <JsonLd data={{'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':site+'/#org',name:'Raftaar One',url:site,logo:site+'/images/logo.png',description:DESCRIPTION,areaServed:{'@type':'Country',name:'Pakistan'},founder:{'@type':'Person',name:brand.owner},contactPoint:[{'@type':'ContactPoint',contactType:'customer support',telephone:brand.phone,email:brand.email,areaServed:'PK',availableLanguage:['English','Urdu']}]},
  {'@type':'WebSite','@id':site+'/#website',url:site,name:'Raftaar One',inLanguage:'en-PK',publisher:{'@id':site+'/#org'}}
 ]}}/>
 <BootLoader/><CartProvider><a className="skip-link" href="#main">Skip to content</a><Header/>{!launchReady&&<div className="preview-bar">Prelaunch preview · Rides need registered drivers online near you · Sample products</div>}<main id="main">{children}</main><Footer/><ContactFab/></CartProvider></body></html>;
}
