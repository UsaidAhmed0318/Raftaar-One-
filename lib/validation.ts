import {z} from 'zod';
import {cities,services} from './config';
export const phone = z.string().regex(/^\+923\d{9}$/, 'Use +923XXXXXXXXX');
export const orderSchema=z.object({requestId:z.uuid(),expectedTotal:z.number().int().min(1).max(600000150),items:z.array(z.object({id:z.uuid(),quantity:z.number().int().min(1).max(20)})).min(1).max(30),address:z.string().trim().min(10).max(400),phone,city:z.enum(cities)});
export const bookingSchema=z.object({requestId:z.uuid(),service:z.enum(services),city:z.enum(cities),pickup:z.string().trim().min(5).max(300),destination:z.string().trim().min(5).max(300),phone,offer:z.number().int().min(100).max(1000000).nullable(),notes:z.string().max(500)});
export const applicationSchema=z.object({kind:z.enum(['Driver','Courier','Merchant','Fleet operator']),city:z.enum(cities),phone,details:z.string().trim().min(10).max(1000)});
export const statusSchema=z.object({entity:z.enum(['orders','bookings','applications']),id:z.uuid(),status:z.enum(['confirmed','cancelled','dispatched','delivered','reviewing','completed','approved','rejected'])});
export const productSchema=z.object({id:z.uuid().nullable(),name:z.string().trim().min(2).max(100),category:z.enum(['Food','Grocery','Accessories']),description:z.string().max(1000),price:z.number().int().min(1).max(1000000),stock:z.number().int().min(0).max(100000),active:z.boolean()});
