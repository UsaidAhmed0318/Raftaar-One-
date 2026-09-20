import AccountPanel from '@/components/account-panel';
import {Reveal} from '@/components/motion';
export const metadata={title:'My account',robots:{index:false,follow:false}};
export default function Page(){return <div className="container"><Reveal className="page-head"><p className="eyebrow">YOUR PERSONAL SPACE</p><h1>Your day, at a glance.</h1></Reveal><Reveal delay={0.08}><AccountPanel/></Reveal></div>;}