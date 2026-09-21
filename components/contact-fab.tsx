'use client';
import {usePathname} from 'next/navigation';
import {FaWhatsapp} from 'react-icons/fa';
import {FiPhone} from 'react-icons/fi';
import {telLink,whatsappLink} from '@/lib/contact';

const hidden = ['/ride', '/driver', '/admin', '/cart'];

export default function ContactFab() {
  const path = usePathname();
  if (hidden.some(p => path === p || path.startsWith(p + '/'))) return null;
  return <div className="contact-fab">
    <a className="fab-call" href={telLink} aria-label="Call Raftaar One"><FiPhone aria-hidden="true"/></a>
    <a className="fab-wa" href={whatsappLink('Hello Raftaar One, I need help with: ')} target="_blank" rel="noopener noreferrer" aria-label="Chat with Raftaar One on WhatsApp"><FaWhatsapp aria-hidden="true"/><span>Chat with us</span></a>
  </div>;
}
