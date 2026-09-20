import {browserDB} from './supabase';
import type {LatLng} from './geo';

export type RideStatus = 'searching'|'assigned'|'arrived'|'in_progress'|'completed'|'cancelled';
export type Ride = {
  id: string; service: string; status: RideStatus; city: string; role: 'rider'|'driver';
  pickup_text: string; pickup_lat: number; pickup_lng: number; dest_text: string; dest_lat: number; dest_lng: number;
  distance_m: number; duration_s: number; offer: number; agreed_fare: number | null; notes: string;
  created_at: string; updated_at: string; cancel_reason: string | null;
  driver?: {name:string; avatar_path:string|null; model:string; plate:string; lat:number|null; lng:number|null; heading:number|null; located_at:string|null; phone:string|null};
  rider?: {name:string; avatar_path:string|null; phone:string|null};
};
export type DriverOffer = {offer_id:string; driver_id:string; driver_name:string; avatar_path:string|null; vehicle_model:string; vehicle_plate:string; fare:number; eta_min:number; driver_km:number|null; driver_lat:number|null; driver_lng:number|null};
export type FeedItem = {id:string; service:string; pickup_text:string; pickup_lat:number; pickup_lng:number; dest_text:string; dest_lat:number; dest_lng:number; distance_m:number; duration_s:number; offer:number; notes:string; created_at:string; pickup_km:number; my_offer:number|null; my_offer_status:string|null};
export type DriverInfo = {status:'active'|'suspended'; online:boolean; services:string[]; vehicle_model:string; vehicle_plate:string; city:string};
export type RouteInfo = {distance_m:number; duration_s:number; coords:[number,number][]; estimated?:boolean};

export function friendlyRpcError(error: {message?:string; code?:string}) {
  const message = error.message || '';
  if (error.code === 'PGRST202' || /could not find the function/i.test(message)) return 'Ride booking is being set up. Please try again in a little while.';
  if (/permission denied/i.test(message)) return 'You do not have access to do this.';
  if (/jwt|not authenticated|sign in required/i.test(message)) return 'Please sign in first.';
  if (/fetch|network/i.test(message)) return 'Connection problem. Please check your internet and try again.';
  return message || 'Something went wrong. Please try again.';
}

export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const {data, error} = await browserDB().rpc(name, args);
  if (error) throw new Error(friendlyRpcError(error));
  return data as T;
}

export async function fetchRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<RouteInfo> {
  const res = await fetch('/api/route?from=' + from.lat + ',' + from.lng + '&to=' + to.lat + ',' + to.lng, {signal});
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not find a route.');
  return data as RouteInfo;
}

export async function reverseGeocode(p: LatLng): Promise<{label:string; city:string}> {
  const res = await fetch('/api/reverse?lat=' + p.lat + '&lon=' + p.lng);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not read this location.');
  return data;
}

export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Your device does not support location.')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({lat:p.coords.latitude, lng:p.coords.longitude}),
      e => reject(new Error(e.code === 1 ? 'Location permission is blocked. Allow it in your browser settings, or pick on the map.' : 'Could not get your location. Try again or pick on the map.')),
      {enableHighAccuracy:true, timeout:12000, maximumAge:15000}
    );
  });
}
