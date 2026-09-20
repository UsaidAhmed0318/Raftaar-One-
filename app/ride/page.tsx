import RideRider from '@/components/ride-rider';
import {Reveal} from '@/components/motion';
export const metadata = {title:'Book a ride', description:'Set your own fare, get offers from registered drivers and track your ride live on the map anywhere in Pakistan.'};
export default function Page() {
  return <div className="container ride-page"><Reveal className="page-head slim"><p className="eyebrow">RIDES ACROSS PAKISTAN</p><h1>Name your fare.<br/>Track your ride.</h1></Reveal><Reveal delay={0.06}><RideRider/></Reveal></div>;
}
