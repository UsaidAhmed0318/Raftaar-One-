import DriverDashboard from '@/components/driver-dashboard';
export const metadata = {title:'Driver dashboard', robots:{index:false, follow:false}};
export default function Page() {
  return <div className="container ride-page"><div className="page-head slim intro"><p className="eyebrow">FOR REGISTERED DRIVERS</p><h1>Go online.<br/>Get rides.</h1></div><div className="intro" style={{'--d':'0.06s'} as React.CSSProperties}><DriverDashboard/></div></div>;
}
