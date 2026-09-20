import Marketplace from '@/components/marketplace';
import {Reveal} from '@/components/motion';
export const metadata={title:'Food, groceries & accessories'};
export default function Page(){return <div className="container" style={{paddingBottom:80}}><Reveal className="page-head"><p className="eyebrow">THE EVERYDAY EDIT</p><h1>Good finds.<br/>Closer to home.</h1><p>Explore food, essentials and accessories. Only database inventory appears here; sample listings are labelled in their descriptions.</p></Reveal><Reveal delay={0.08}><Marketplace/></Reveal></div>;}