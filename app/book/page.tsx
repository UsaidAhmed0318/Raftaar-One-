import BookingForm from '@/components/booking-form';
import {Reveal} from '@/components/motion';
export const metadata={title:'Parcel, loader, truck & bus requests'};
export default function Page(){return <div className="container"><Reveal className="page-head"><p className="eyebrow">FROM HERE TO WHAT’S NEXT</p><h1>Let’s make a move.</h1><p>Parcels, loaders, trucks, buses and coaches. Pick your vehicle and send one simple request. For rides, use the live map booking.</p></Reveal><Reveal delay={0.08}><BookingForm/></Reveal></div>;}