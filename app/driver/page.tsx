import DriverDashboard from '@/components/driver-dashboard';
import {Reveal} from '@/components/motion';
export const metadata = {title:'Driver dashboard', robots:{index:false, follow:false}};
export default function Page() {
  return <div className="container ride-page"><Reveal className="page-head slim"><p className="eyebrow">FOR REGISTERED DRIVERS</p><h1>Go online.<br/>Get rides.</h1></Reveal><Reveal delay={0.06}><DriverDashboard/></Reveal></div>;
}
