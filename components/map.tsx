'use client';
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {PAKISTAN_CENTER,TILE_ATTRIBUTION,TILE_URL,type LatLng} from '@/lib/geo';

export type MapMarker = {id:string;lat:number;lng:number;kind:'pickup'|'dest'|'driver'|'car'|'me'|'request';label?:string;onClick?:()=>void};
type Props = {
  markers: MapMarker[];
  route?: [number,number][] | null;
  routeColor?: string;
  center?: LatLng | null;
  fitKey?: string;
  onMapClick?: (p: LatLng) => void;
  crosshair?: boolean;
  className?: string;
};

const CAR_PATH = 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z';
const carSvg = (size: number) => '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor" aria-hidden="true"><path d="' + CAR_PATH + '"/></svg>';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));

function iconFor(m: MapMarker) {
  switch (m.kind) {
    case 'pickup': return L.divIcon({className:'mk', html:'<div class="pin pin-a"><span>A</span></div>', iconSize:[34,44], iconAnchor:[17,42]});
    case 'dest': return L.divIcon({className:'mk', html:'<div class="pin pin-b"><span>B</span></div>', iconSize:[34,44], iconAnchor:[17,42]});
    case 'driver': return L.divIcon({className:'mk drv-marker', html:'<div class="car-badge car-main">' + carSvg(22) + (m.label ? '<em>' + esc(m.label) + '</em>' : '') + '</div>', iconSize:[44,44], iconAnchor:[22,22]});
    case 'car': return L.divIcon({className:'mk drv-marker', html:'<div class="car-badge car-small">' + carSvg(15) + '</div>', iconSize:[28,28], iconAnchor:[14,14]});
    case 'me': return L.divIcon({className:'mk drv-marker', html:'<div class="me-dot"><i></i></div>', iconSize:[22,22], iconAnchor:[11,11]});
    default: return L.divIcon({className:'mk', html:'<div class="req-pin">' + esc(m.label || 'PKR') + '</div>', iconSize:[64,30], iconAnchor:[32,30]});
  }
}

export default function LiveMap({markers,route,routeColor='#0a8288',center,fitKey,onMapClick,crosshair,className}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const live = useRef(new Map<string, {marker:L.Marker;sig:string}>());
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;
  const latest = useRef({markers, route});
  latest.current = {markers, route};

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, {center:[PAKISTAN_CENTER.lat, PAKISTAN_CENTER.lng], zoom:5, zoomControl:true, worldCopyJump:false, maxBounds:[[15, 55], [42, 85]], minZoom:4});
    L.tileLayer(TILE_URL, {maxZoom:19, attribution:TILE_ATTRIBUTION}).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    routeLayer.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => clickRef.current?.({lat:e.latlng.lat, lng:e.latlng.lng}));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    const liveMarkers = live.current;
    return () => { ro.disconnect(); m.remove(); map.current = null; liveMarkers.clear(); };
  }, []);

  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    const seen = new Set<string>();
    for (const spec of markers) {
      seen.add(spec.id);
      const sig = spec.kind + '|' + (spec.label || '');
      const existing = live.current.get(spec.id);
      if (existing) {
        existing.marker.setLatLng([spec.lat, spec.lng]);
        if (existing.sig !== sig) { existing.marker.setIcon(iconFor(spec)); existing.sig = sig; }
        existing.marker.off('click'); if (spec.onClick) existing.marker.on('click', spec.onClick);
      } else {
        const marker = L.marker([spec.lat, spec.lng], {icon:iconFor(spec), keyboard:false, zIndexOffset:spec.kind === 'driver' ? 900 : spec.kind === 'pickup' || spec.kind === 'dest' ? 700 : 0});
        if (spec.onClick) marker.on('click', spec.onClick);
        marker.addTo(group);
        live.current.set(spec.id, {marker, sig});
      }
    }
    for (const [id, entry] of live.current) if (!seen.has(id)) { group.removeLayer(entry.marker); live.current.delete(id); }
  }, [markers]);

  useEffect(() => {
    const group = routeLayer.current;
    if (!group) return;
    group.clearLayers();
    if (route && route.length > 1) {
      L.polyline(route, {color:'#ffffff', weight:10, opacity:.95, lineCap:'round', lineJoin:'round'}).addTo(group);
      L.polyline(route, {color:routeColor, weight:5, opacity:1, lineCap:'round', lineJoin:'round'}).addTo(group);
    }
  }, [route, routeColor]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const {markers: ms, route: r} = latest.current;
    const points: [number, number][] = [...(r || []), ...ms.map(x => [x.lat, x.lng] as [number, number])];
    if (!points.length) return;
    if (points.length === 1) { m.setView(points[0], 15); return; }
    m.fitBounds(L.latLngBounds(points), {padding:[48, 48], maxZoom:16, animate:true});
  }, [fitKey]);

  useEffect(() => {
    if (center && map.current) map.current.flyTo([center.lat, center.lng], Math.max(map.current.getZoom(), 15), {duration:.8});
  }, [center]);

  return <div ref={box} className={'live-map' + (crosshair ? ' crosshair' : '') + (className ? ' ' + className : '')} role="application" aria-label="Map"/>;
}
