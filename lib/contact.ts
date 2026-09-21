import {brand} from './config';

export const waNumber = brand.phone.replace(/\D/g, '');
export const whatsappLink = (text: string) => 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(text);
export const telLink = 'tel:' + brand.phone;
export const mailLink = (subject: string) => 'mailto:' + brand.email + '?subject=' + encodeURIComponent(subject);
