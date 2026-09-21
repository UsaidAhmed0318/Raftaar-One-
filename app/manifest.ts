import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Raftaar One',
    short_name: 'Raftaar',
    description: 'Rides, parcel delivery, loaders, trucks and buses across Pakistan.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a8288',
    lang: 'en-PK',
    icons: [{src: '/images/logo.png', sizes: '500x500', type: 'image/png', purpose: 'any'}]
  };
}
