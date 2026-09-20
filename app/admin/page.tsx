import AdminPanel from '@/components/admin-panel';
import {Reveal} from '@/components/motion';
export const metadata={title:'Admin console',robots:{index:false,follow:false}};
export default function Page(){return <div className="container section"><Reveal><p className="eyebrow">OPERATIONS / RESTRICTED</p><h1 style={{fontSize:48,marginBottom:25}}>Control, with clarity.</h1></Reveal><Reveal delay={0.08}><AdminPanel/></Reveal></div>;}