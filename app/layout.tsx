import type {Metadata} from 'next';
import './globals.css';
import {siteUrl} from '@/lib/site';
import {CartProvider} from '@/components/cart-provider';
import {Header,Footer} from '@/components/shell';
import {launchReady} from '@/lib/config';
export const metadata:Metadata={metadataBase:new URL(siteUrl()),title:{default:'Raftaar One | Your city. One connection.',template:'%s | Raftaar One'},description:'A Pakistan-focused platform for ride requests, food, everyday shopping and cargo. Discover Raftaar One by Usaid Ahmed.',icons:{icon:'/images/logo.png',apple:'/images/logo.png'},robots:{index:launchReady,follow:launchReady},openGraph:{title:'Raftaar One',description:'Your city. One connection.',type:'website',locale:'en_PK',images:[{url:'/opengraph-image',width:1200,height:630}]}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en-PK"><body><CartProvider><a className="skip-link" href="#main">Skip to content</a><Header/>{!launchReady&&<div className="preview-bar">Prelaunch preview · Sample inventory and pilot cities · Requests require operator confirmation</div>}<main id="main">{children}</main><Footer/></CartProvider></body></html>;}
