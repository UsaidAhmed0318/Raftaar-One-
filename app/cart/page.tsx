import Checkout from '@/components/checkout';
import {Reveal} from '@/components/motion';
export const metadata={title:'Cart & checkout',robots:{index:false,follow:false}};
export default function Page(){return <div className="container"><Reveal className="page-head"><p className="eyebrow">ONE LAST LOOK</p><h1>Your good finds.</h1></Reveal><Reveal delay={0.08}><Checkout/></Reveal></div>;}