import BookingForm from '@/components/booking-form';
import {Reveal} from '@/components/motion';
export const metadata={title:'Ride, parcel & cargo requests'};
export default function Page(){return <div className="container"><Reveal className="page-head"><p className="eyebrow">FROM HERE TO WHAT’S NEXT</p><h1>Let’s make a move.</h1><p>Rickshaw, bike, cars, parcels, loaders, trucks, buses and coaches. Pick your vehicle and send one simple request.</p></Reveal><Reveal delay={0.08}><BookingForm/></Reveal></div>;}