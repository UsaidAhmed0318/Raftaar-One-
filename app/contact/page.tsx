import Link from 'next/link';
import {FaWhatsapp} from 'react-icons/fa';
import {FiMail,FiPhone} from 'react-icons/fi';
import {brand} from '@/lib/config';
import {mailLink,telLink,whatsappLink} from '@/lib/contact';
import {Reveal,RevealGroup,RevealItem} from '@/components/motion';

export const metadata = {
  title: 'Contact us · WhatsApp, call or email',
  description: 'Talk to Raftaar One on WhatsApp, phone or email. Book a delivery, loader or truck, join as a driver or courier, or list your shop. Riders, customers and partners across Pakistan.',
  alternates: {canonical: '/contact'}
};

const topics: [string, string, string][] = [
  ['Book a delivery, loader or truck', 'Hello Raftaar One, I want to book: ', 'Parcel, loader, truck or bus'],
  ['Join as a driver or courier', 'Hello Raftaar One, I want to join as a driver/courier. My city is: ', 'Vehicle, city and phone'],
  ['List my shop or products', 'Hello Raftaar One, I want to list my shop. My city is: ', 'Merchants and restaurants'],
  ['Question about my order or ride', 'Hello Raftaar One, my reference number is: ', 'Send your reference number']
];

export default function Page() {
  return <div className="container contact-page">
    <Reveal className="page-head"><p className="eyebrow">WE REPLY FAST</p><h1>Talk to a real person.</h1><p>Riders, customers, drivers, couriers and shop owners: message us on WhatsApp, call, or email. Never send passwords, OTPs, card details or CNIC numbers.</p></Reveal>
    <RevealGroup className="contact-actions">
      <RevealItem><a className="contact-card wa" href={whatsappLink('Hello Raftaar One, I need help with: ')} target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden="true"/><strong>WhatsApp</strong><small>Fastest way to reach us. Send text or a voice note.</small></a></RevealItem>
      <RevealItem><a className="contact-card" href={telLink}><FiPhone aria-hidden="true"/><strong>Call {brand.phone.replace('+92', '0')}</strong><small>Tap to call from your phone.</small></a></RevealItem>
      <RevealItem><a className="contact-card" href={mailLink('Raftaar One enquiry')}><FiMail aria-hidden="true"/><strong>Email</strong><small>{brand.email}</small></a></RevealItem>
    </RevealGroup>

    <Reveal className="contact-block"><h2>What do you need?</h2><p>Tap a topic and WhatsApp opens with the message ready. Just add your details and send.</p>
      <ul className="topic-list">{topics.map(([label, text, hint]) => <li key={label}><a href={whatsappLink(text)} target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden="true"/><span><strong>{label}</strong><small>{hint}</small></span></a></li>)}</ul>
    </Reveal>

    <RevealGroup className="how-grid">
      <RevealItem><article className="panel how-card"><p className="eyebrow">FOR RIDERS & CUSTOMERS</p><h3>How a request works</h3>
        <ol><li><b>Rides:</b> open <Link className="text-link" href="/ride">Book a ride</Link>, choose pickup and destination, name your fare. Registered drivers who are online near you reply with offers. You pick one and follow them on the map.</li>
          <li><b>Parcels, loaders, trucks, buses:</b> send the request on the <Link className="text-link" href="/book">request form</Link>. An operator checks availability and confirms the price with you by phone or WhatsApp before anything is final.</li>
          <li><b>Payment:</b> cash to the driver or on delivery. Nothing is charged online.</li></ol></article></RevealItem>
      <RevealItem><article className="panel how-card"><p className="eyebrow">FOR DRIVERS, COURIERS & SHOPS</p><h3>How to get work</h3>
        <ol><li>Create a free account and fill the <Link className="text-link" href="/partner">partner application</Link> (vehicle, city, phone, optional photo).</li>
          <li>We review it. Vehicle and identity checks are done separately before any work starts. Approval does not guarantee work or earnings.</li>
          <li>Approved drivers go online from the Driver dashboard and see nearby ride requests. Shop owners: we contact you to list your products.</li></ol></article></RevealItem>
    </RevealGroup>
    <p className="form-note contact-note">No fixed response time is promised. We answer as soon as we can, usually during the day. Raftaar One is a prelaunch platform: rides and deliveries are provided by independent operators.</p>
  </div>;
}
