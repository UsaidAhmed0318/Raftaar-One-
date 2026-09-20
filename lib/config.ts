export const brand = { name: 'Raftaar One', owner: 'Usaid Ahmed', email: 'usaidahmeddon@gmail.com', phone: '+923181014996', github: 'UsaidAhmed0318' };
export const cities = ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad'] as const;
export const services = ['Rickshaw','Bike','Economy car','Comfort car','Premium car','Protocol car','Parcel','Rickshaw loader','Suzuki pickup','Shehzore pickup','Mazda loader','Mini truck','Truck','Luxury coach','Hiace van','Coaster','Mini bus'] as const;
export type ServiceName = typeof services[number];
export type ServiceGroup = { id: string; title: string; tag: string; color: string; text: string; vehicles: { name: ServiceName; note: string }[] };
export const serviceGroups: ServiceGroup[] = [
  { id: 'Rides', title: 'Rides', tag: 'RIDES', color: '#12b3b8', text: 'Pick the ride that fits your trip and budget.', vehicles: [
    { name: 'Rickshaw', note: 'Budget-friendly short city trips' },
    { name: 'Bike', note: 'Fast solo rides through traffic' },
    { name: 'Economy car', note: 'Affordable everyday car rides' },
    { name: 'Comfort car', note: 'A more comfortable everyday car' },
    { name: 'Premium car', note: 'Higher-class cars for business and special trips' },
    { name: 'Protocol car', note: 'Executive / VIP vehicles for guests, events and official travel' } ] },
  { id: 'Delivery', title: 'Parcel delivery', tag: 'DELIVERY', color: '#ff4d3d', text: 'Send documents, gifts and packages across your city.', vehicles: [
    { name: 'Parcel', note: 'Documents, gifts and small packages' } ] },
  { id: 'Loaders', title: 'Loaders', tag: 'LOADERS', color: '#f0a020', text: 'Every kind of loader, from small city loads to full shifting.', vehicles: [
    { name: 'Rickshaw loader', note: 'Small loads inside the city (Qingqi-type)' },
    { name: 'Suzuki pickup', note: 'Ravi / Bolan style pickups for light goods' },
    { name: 'Shehzore pickup', note: 'Medium loads and house or shop shifting' },
    { name: 'Mazda loader', note: 'Heavier medium-duty loads' },
    { name: 'Mini truck', note: 'Larger shifting and stock loads' } ] },
  { id: 'Freight', title: 'Truck freight', tag: 'FREIGHT', color: '#0a8288', text: 'Heavy freight and long-haul cargo for businesses and traders.', vehicles: [
    { name: 'Truck', note: 'Full-truck and bulk loads, city to city' } ] },
  { id: 'Buses', title: 'Buses & coaches', tag: 'BUSES', color: '#6b5bd6', text: 'Coaches, vans and buses for intercity travel, groups and events. Enquiry only, not a ticket.', vehicles: [
    { name: 'Luxury coach', note: 'Comfort intercity coach travel' },
    { name: 'Hiace van', note: 'Small groups, family trips and airport runs' },
    { name: 'Coaster', note: 'Mid-size groups, tours and events' },
    { name: 'Mini bus', note: 'Larger groups and events' } ] }
];
export const groupOf = (service: string) => serviceGroups.find(g => g.vehicles.some(v => v.name === service));
export const isEnquiry = (service: string) => groupOf(service)?.id === 'Buses';
export function money(value: number) { return new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(value); }
export const launchReady = process.env.NEXT_PUBLIC_LAUNCH_READY === 'true';
