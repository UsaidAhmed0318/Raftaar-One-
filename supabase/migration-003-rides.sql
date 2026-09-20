-- Migration 003: registered drivers, live ride requests with fare offers, tracking, nationwide cities.
-- Run once in the SQL Editor AFTER schema.sql and migration-002. Safe to re-run.
begin;

-- Driver details captured at application time.
alter table public.applications add column if not exists vehicles text[] not null default '{}';
alter table public.applications add column if not exists vehicle_model text not null default '';
alter table public.applications add column if not exists vehicle_plate text not null default '';

-- Registered drivers exist only after an admin approves a Driver application.
create table if not exists public.drivers(
 user_id uuid primary key references auth.users(id) on delete cascade,
 application_id uuid references public.applications(id),
 services text[] not null,
 vehicle_model text not null default '',
 vehicle_plate text not null default '',
 city text not null default '',
 status text not null default 'active' check(status in ('active','suspended')),
 online boolean not null default false,
 lat double precision, lng double precision, heading double precision,
 located_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists drivers_online_idx on public.drivers(online,status);

create table if not exists public.rides(
 id uuid primary key default gen_random_uuid(),
 rider_id uuid not null references auth.users(id),
 request_id uuid not null,
 service text not null check(service in ('Rickshaw','Bike','Economy car','Comfort car','Premium car','Protocol car')),
 city text not null default '',
 phone text not null,
 pickup_text text not null, pickup_lat double precision not null, pickup_lng double precision not null,
 dest_text text not null, dest_lat double precision not null, dest_lng double precision not null,
 distance_m integer not null check(distance_m between 0 and 2500000),
 duration_s integer not null check(duration_s between 0 and 259200),
 offer integer not null check(offer between 50 and 500000),
 agreed_fare integer,
 notes text not null default '',
 status text not null default 'searching' check(status in ('searching','assigned','arrived','in_progress','completed','cancelled')),
 driver_id uuid references public.drivers(user_id),
 cancel_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(rider_id,request_id)
);
create index if not exists rides_status_idx on public.rides(status,created_at desc);
create index if not exists rides_rider_idx on public.rides(rider_id,created_at desc);
create index if not exists rides_driver_idx on public.rides(driver_id,created_at desc);
create unique index if not exists one_active_ride_per_rider on public.rides(rider_id) where status in ('searching','assigned','arrived','in_progress');
create unique index if not exists one_active_ride_per_driver on public.rides(driver_id) where status in ('assigned','arrived','in_progress');

create table if not exists public.ride_offers(
 id uuid primary key default gen_random_uuid(),
 ride_id uuid not null references public.rides(id) on delete cascade,
 driver_id uuid not null references public.drivers(user_id),
 fare integer not null check(fare between 50 and 500000),
 eta_min integer not null check(eta_min between 1 and 240),
 status text not null default 'pending' check(status in ('pending','accepted','rejected','withdrawn')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(ride_id,driver_id)
);

-- No direct table access for browsers. Everything goes through the checked functions below.
alter table public.drivers enable row level security;
alter table public.rides enable row level security;
alter table public.ride_offers enable row level security;
revoke all on public.drivers,public.rides,public.ride_offers from anon,authenticated;

-- Helpers -----------------------------------------------------------------
create or replace function public.haversine_km(a_lat double precision,a_lng double precision,b_lat double precision,b_lng double precision) returns double precision language sql immutable as $$
 select 6371*2*asin(sqrt(least(1,power(sin(radians(b_lat-a_lat)/2),2)+cos(radians(a_lat))*cos(radians(b_lat))*power(sin(radians(b_lng-a_lng)/2),2)))) $$;
create or replace function public.in_pakistan(p_lat double precision,p_lng double precision) returns boolean language sql immutable as $$
 select p_lat between 23.6 and 37.2 and p_lng between 60.8 and 77.9 $$;
create or replace function public.is_active_driver() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from drivers where user_id=auth.uid() and status='active') $$;

create or replace function public.consume_limit(p_scope text) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if auth.uid() is null or p_scope not in ('orders','bookings','applications','assistant','admin','rides','offers') then return false; end if;
 insert into rate_limits values(auth.uid(),p_scope,date_trunc('minute',now()),1)
 on conflict(user_id,scope,bucket) do update set count=rate_limits.count+1 returning count into n;
 return n<=case when p_scope='assistant' then 10 else 20 end;
end; $$;

-- Whole-country cities: orders and bookings accept any Pakistani city name (validated in the app).
create or replace function public.create_order(p_request_id uuid,p_items jsonb,p_address text,p_phone text,p_city text,p_expected_total integer) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; item jsonb; product products%rowtype; qty integer; amount integer:=150; snapshot jsonb:='[]'; seen uuid[]:='{}';
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select id into result from orders where user_id=auth.uid() and request_id=p_request_id;
 if result is not null then return result; end if;
 if not consume_limit('orders') then raise exception 'Too many requests'; end if;
 if length(p_address) not between 10 and 400 or p_phone !~ '^\+923[0-9]{9}$' or length(p_city) not between 2 and 60 then raise exception 'Invalid delivery details'; end if;
 if p_items is null or jsonb_typeof(p_items)!='array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid cart'; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'id' loop
  qty:=(item->>'quantity')::integer;
  if qty is null or qty not between 1 and 20 or (item->>'id')::uuid=any(seen) then raise exception 'Invalid quantity or duplicate item'; end if;
  select * into product from products where id=(item->>'id')::uuid and active for update;
  if not found or product.stock<qty then raise exception 'Item unavailable or insufficient stock'; end if;
  seen:=array_append(seen,product.id);
  amount:=amount+product.price*qty;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',product.id,'name',product.name,'price',product.price,'quantity',qty));
  update products set stock=stock-qty where id=product.id;
 end loop;
 if p_expected_total is null or amount!=p_expected_total then raise exception 'Prices changed. Refresh your cart and confirm the new total.'; end if;
 insert into orders(user_id,request_id,items,total,address,phone,city) values(auth.uid(),p_request_id,snapshot,amount,p_address,p_phone,p_city) returning id into result;
 return result;
end; $$;

create or replace function public.create_booking(p_request_id uuid,p_service text,p_city text,p_pickup text,p_destination text,p_phone text,p_offer integer,p_notes text) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select id into result from bookings where user_id=auth.uid() and request_id=p_request_id;
 if result is not null then return result; end if;
 if not consume_limit('bookings') then raise exception 'Too many requests'; end if;
 if p_service not in ('Rickshaw','Bike','Economy car','Comfort car','Premium car','Protocol car','Parcel','Rickshaw loader','Suzuki pickup','Shehzore pickup','Mazda loader','Mini truck','Truck','Luxury coach','Hiace van','Coaster','Mini bus') or length(p_city) not between 2 and 60 or length(p_pickup) not between 5 and 300 or length(p_destination) not between 5 and 300 or p_phone !~ '^\+923[0-9]{9}$' or length(p_notes)>500 then raise exception 'Invalid booking details'; end if;
 insert into bookings(user_id,request_id,service,city,pickup,destination,phone,offer,notes) values(auth.uid(),p_request_id,p_service,p_city,p_pickup,p_destination,p_phone,p_offer,p_notes) returning id into result;
 return result;
end; $$;

-- Partner applications: drivers must state their vehicle types, model and plate.
drop function if exists public.apply_partner(text,text,text,text,text);
drop function if exists public.apply_partner(text,text,text,text);
create or replace function public.apply_partner(p_kind text,p_city text,p_phone text,p_details text,p_photo text default null,p_vehicles text[] default '{}',p_model text default '',p_plate text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not consume_limit('applications') then raise exception 'Too many requests'; end if;
 if p_kind not in ('Driver','Courier','Merchant','Fleet operator') or length(p_city) not between 2 and 60 or p_phone !~ '^\+923[0-9]{9}$' or length(p_details) not between 10 and 1000 then raise exception 'Invalid application'; end if;
 if p_photo is not null and p_photo !~ ('^'||auth.uid()::text||'/[A-Za-z0-9._-]{1,100}$') then raise exception 'Invalid image'; end if;
 if p_kind='Driver' then
  if p_vehicles is null or cardinality(p_vehicles) not between 1 and 6 or not (p_vehicles <@ array['Rickshaw','Bike','Economy car','Comfort car','Premium car','Protocol car']) then raise exception 'Choose the vehicle types you drive'; end if;
  if length(trim(p_model)) not between 2 and 60 or length(trim(p_plate)) not between 4 and 15 then raise exception 'Vehicle model and plate number are required'; end if;
 end if;
 insert into applications(user_id,kind,city,phone,details,photo_path,vehicles,vehicle_model,vehicle_plate) values(auth.uid(),p_kind,p_city,p_phone,p_details,p_photo,coalesce(p_vehicles,'{}'),trim(coalesce(p_model,'')),upper(trim(coalesce(p_plate,'')))) returning id into result;
 return result;
end; $$;

-- Approving a Driver application registers the driver; nobody else can take rides.
create or replace function public.change_status(p_entity text,p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare old_status text; item jsonb;
begin
 if not is_admin() then raise exception 'Admin only'; end if;
 if not consume_limit('admin') then raise exception 'Too many requests'; end if;
 if p_entity='orders' then
  select status into old_status from orders where id=p_id for update;
  if old_status=p_status then return; end if;
  if not ((old_status='placed' and p_status in ('confirmed','cancelled')) or (old_status='confirmed' and p_status in ('dispatched','cancelled')) or (old_status='dispatched' and p_status='delivered')) then raise exception 'Invalid transition'; end if;
  if p_status='cancelled' then
   for item in select value from orders o,jsonb_array_elements(o.items) where o.id=p_id order by value->>'id' loop
    update products set stock=stock+(item->>'quantity')::integer where id=(item->>'id')::uuid;
   end loop;
  end if;
  update orders set status=p_status where id=p_id;
 elsif p_entity='bookings' then
  select status into old_status from bookings where id=p_id for update;
  if old_status=p_status then return; end if;
  if not ((old_status='requested' and p_status in ('reviewing','cancelled')) or (old_status='reviewing' and p_status in ('confirmed','cancelled')) or (old_status='confirmed' and p_status in ('completed','cancelled'))) then raise exception 'Invalid transition'; end if;
  update bookings set status=p_status where id=p_id;
 elsif p_entity='applications' then
  select status into old_status from applications where id=p_id for update;
  if old_status!='pending' or p_status not in ('approved','rejected') then raise exception 'Invalid transition'; end if;
  update applications set status=p_status where id=p_id;
  if p_status='approved' then
   insert into drivers(user_id,application_id,services,vehicle_model,vehicle_plate,city)
   select a.user_id,a.id,a.vehicles,a.vehicle_model,a.vehicle_plate,a.city from applications a where a.id=p_id and a.kind='Driver' and cardinality(a.vehicles)>0
   on conflict(user_id) do update set application_id=excluded.application_id,services=excluded.services,vehicle_model=excluded.vehicle_model,vehicle_plate=excluded.vehicle_plate,city=excluded.city,status='active';
  end if;
 else raise exception 'Invalid entity'; end if;
 if old_status is null then raise exception 'Record not found'; end if;
 insert into audit_log(actor,entity,entity_id,new_status) values(auth.uid(),p_entity,p_id,p_status);
end; $$;

-- Rider / driver views ------------------------------------------------------
create or replace function public.ride_json(r public.rides,viewer uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare d drivers%rowtype; dp profiles%rowtype; rp profiles%rowtype; reveal boolean; res jsonb;
begin
 reveal:=r.status in ('assigned','arrived','in_progress');
 res:=jsonb_build_object('id',r.id,'service',r.service,'status',r.status,'city',r.city,'pickup_text',r.pickup_text,'pickup_lat',r.pickup_lat,'pickup_lng',r.pickup_lng,'dest_text',r.dest_text,'dest_lat',r.dest_lat,'dest_lng',r.dest_lng,'distance_m',r.distance_m,'duration_s',r.duration_s,'offer',r.offer,'agreed_fare',r.agreed_fare,'notes',r.notes,'created_at',r.created_at,'updated_at',r.updated_at,'cancel_reason',r.cancel_reason,'role',case when r.rider_id=viewer then 'rider' else 'driver' end);
 if r.driver_id is not null then
  select * into d from drivers where user_id=r.driver_id;
  select * into dp from profiles where id=r.driver_id;
  res:=res||jsonb_build_object('driver',jsonb_build_object('name',dp.full_name,'avatar_path',dp.avatar_path,'model',d.vehicle_model,'plate',d.vehicle_plate,'lat',d.lat,'lng',d.lng,'heading',d.heading,'located_at',d.located_at,'phone',case when reveal then (select a.phone from applications a where a.user_id=r.driver_id) else null end));
 end if;
 if r.driver_id=viewer then
  select * into rp from profiles where id=r.rider_id;
  res:=res||jsonb_build_object('rider',jsonb_build_object('name',rp.full_name,'avatar_path',rp.avatar_path,'phone',case when reveal then r.phone else null end));
 end if;
 return res;
end; $$;

create or replace function public.my_driver() returns jsonb language sql stable security definer set search_path=public as $$
 select case when d.user_id is null then null else jsonb_build_object('status',d.status,'online',d.online,'services',d.services,'vehicle_model',d.vehicle_model,'vehicle_plate',d.vehicle_plate,'city',d.city) end
 from (select 1) x left join drivers d on d.user_id=auth.uid() $$;

create or replace function public.my_active_ride() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r rides%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into r from rides where (rider_id=auth.uid() or driver_id=auth.uid()) and status in ('searching','assigned','arrived','in_progress') order by created_at desc limit 1;
 if not found then return null; end if;
 return ride_json(r,auth.uid());
end; $$;

create or replace function public.get_ride(p_ride uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r rides%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into r from rides where id=p_ride and (rider_id=auth.uid() or driver_id=auth.uid());
 if not found then return null; end if;
 return ride_json(r,auth.uid());
end; $$;

create or replace function public.my_rides() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 return coalesce((select jsonb_agg(s.j order by s.c desc) from (select ride_json(x,auth.uid()) as j,x.created_at as c from rides x where x.rider_id=auth.uid() or x.driver_id=auth.uid() order by x.created_at desc limit 30) s),'[]'::jsonb);
end; $$;

-- Rider actions -------------------------------------------------------------
create or replace function public.create_ride(p_request_id uuid,p_service text,p_city text,p_phone text,p_pickup_text text,p_pickup_lat double precision,p_pickup_lng double precision,p_dest_text text,p_dest_lat double precision,p_dest_lng double precision,p_distance_m integer,p_duration_s integer,p_offer integer,p_notes text) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; straight double precision;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select id into result from rides where rider_id=auth.uid() and request_id=p_request_id;
 if result is not null then return result; end if;
 if exists(select 1 from rides where rider_id=auth.uid() and status in ('searching','assigned','arrived','in_progress')) then raise exception 'You already have an active ride'; end if;
 if not consume_limit('rides') then raise exception 'Too many requests'; end if;
 if p_service not in ('Rickshaw','Bike','Economy car','Comfort car','Premium car','Protocol car') or p_phone !~ '^\+923[0-9]{9}$' or length(coalesce(p_city,''))>60 or length(p_pickup_text) not between 3 and 300 or length(p_dest_text) not between 3 and 300 or length(coalesce(p_notes,''))>300 then raise exception 'Invalid ride details'; end if;
 if not in_pakistan(p_pickup_lat,p_pickup_lng) or not in_pakistan(p_dest_lat,p_dest_lng) then raise exception 'Pickup and destination must be inside Pakistan'; end if;
 straight:=haversine_km(p_pickup_lat,p_pickup_lng,p_dest_lat,p_dest_lng);
 if straight<0.05 then raise exception 'Pickup and destination are the same place'; end if;
 if p_distance_m is null or p_duration_s is null or p_distance_m<straight*900 or p_distance_m>straight*8000+3000 then raise exception 'Invalid route'; end if;
 if p_offer is null or p_offer not between 50 and 500000 then raise exception 'Invalid fare offer'; end if;
 insert into rides(rider_id,request_id,service,city,phone,pickup_text,pickup_lat,pickup_lng,dest_text,dest_lat,dest_lng,distance_m,duration_s,offer,notes)
 values(auth.uid(),p_request_id,p_service,coalesce(p_city,''),p_phone,p_pickup_text,p_pickup_lat,p_pickup_lng,p_dest_text,p_dest_lat,p_dest_lng,p_distance_m,p_duration_s,p_offer,coalesce(p_notes,'')) returning id into result;
 return result;
end; $$;

-- Online drivers around a point (positions rounded to ~110 m for privacy).
create or replace function public.nearby_drivers(p_lat double precision,p_lng double precision,p_service text) returns table(lat double precision,lng double precision,heading double precision) language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not in_pakistan(p_lat,p_lng) then return; end if;
 return query select round(d.lat::numeric,3)::double precision,round(d.lng::numeric,3)::double precision,d.heading
 from drivers d where d.status='active' and d.online and d.located_at>now()-interval '2 minutes' and d.lat is not null and p_service=any(d.services)
  and haversine_km(p_lat,p_lng,d.lat,d.lng)<=8 order by haversine_km(p_lat,p_lng,d.lat,d.lng) limit 25;
end; $$;

create or replace function public.rider_offers(p_ride uuid) returns table(offer_id uuid,driver_id uuid,driver_name text,avatar_path text,vehicle_model text,vehicle_plate text,fare integer,eta_min integer,driver_km double precision,driver_lat double precision,driver_lng double precision) language plpgsql stable security definer set search_path=public as $$
declare r rides%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into r from rides where id=p_ride and rider_id=auth.uid();
 if not found then raise exception 'Ride not found'; end if;
 if r.status<>'searching' then return; end if;
 return query select o.id,o.driver_id,p.full_name,p.avatar_path,d.vehicle_model,d.vehicle_plate,o.fare,o.eta_min,
   case when d.lat is null then null else haversine_km(r.pickup_lat,r.pickup_lng,d.lat,d.lng) end,d.lat,d.lng
  from ride_offers o join drivers d on d.user_id=o.driver_id join profiles p on p.id=o.driver_id
  where o.ride_id=r.id and o.status='pending' and d.status='active' order by o.fare,o.eta_min;
end; $$;

create or replace function public.accept_offer(p_offer uuid) returns void language plpgsql security definer set search_path=public as $$
declare o ride_offers%rowtype; r rides%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into o from ride_offers where id=p_offer for update;
 if not found then raise exception 'Offer not found'; end if;
 select * into r from rides where id=o.ride_id for update;
 if r.rider_id<>auth.uid() then raise exception 'Ride not found'; end if;
 if r.status<>'searching' then raise exception 'This ride is no longer open'; end if;
 if o.status<>'pending' then raise exception 'This offer is no longer available'; end if;
 if not exists(select 1 from drivers where user_id=o.driver_id and status='active') then raise exception 'This driver is not available'; end if;
 if exists(select 1 from rides where driver_id=o.driver_id and status in ('assigned','arrived','in_progress')) then raise exception 'This driver just took another ride'; end if;
 update rides set status='assigned',driver_id=o.driver_id,agreed_fare=o.fare,updated_at=now() where id=r.id;
 update ride_offers set status=case when id=o.id then 'accepted' else 'rejected' end,updated_at=now() where ride_id=r.id and status='pending';
end; $$;

create or replace function public.decline_offer(p_offer uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 update ride_offers o set status='rejected',updated_at=now() from rides r where o.id=p_offer and r.id=o.ride_id and r.rider_id=auth.uid() and r.status='searching' and o.status='pending';
end; $$;

create or replace function public.rider_cancel_ride(p_ride uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare r rides%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into r from rides where id=p_ride and rider_id=auth.uid() for update;
 if not found then raise exception 'Ride not found'; end if;
 if r.status not in ('searching','assigned','arrived') then raise exception 'Invalid transition'; end if;
 update rides set status='cancelled',cancel_reason=left(coalesce(p_reason,'Cancelled by rider'),200),updated_at=now() where id=r.id;
 update ride_offers set status='rejected',updated_at=now() where ride_id=r.id and status='pending';
end; $$;

-- Driver actions --------------------------------------------------------------
create or replace function public.driver_ping(p_lat double precision,p_lng double precision,p_heading double precision,p_online boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_active_driver() then raise exception 'Driver registration required'; end if;
 if not in_pakistan(p_lat,p_lng) then raise exception 'Location must be inside Pakistan'; end if;
 update drivers set lat=p_lat,lng=p_lng,heading=case when p_heading between 0 and 360 then p_heading else null end,online=coalesce(p_online,false),located_at=now() where user_id=auth.uid();
end; $$;

create or replace function public.driver_go_offline() returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_active_driver() then raise exception 'Driver registration required'; end if;
 update drivers set online=false where user_id=auth.uid();
end; $$;

create or replace function public.driver_feed() returns table(id uuid,service text,pickup_text text,pickup_lat double precision,pickup_lng double precision,dest_text text,dest_lat double precision,dest_lng double precision,distance_m integer,duration_s integer,offer integer,notes text,created_at timestamptz,pickup_km double precision,my_offer integer,my_offer_status text) language plpgsql stable security definer set search_path=public as $$
declare d drivers%rowtype;
begin
 select * into d from drivers dr where dr.user_id=auth.uid() and dr.status='active';
 if not found then raise exception 'Driver registration required'; end if;
 if d.lat is null or not d.online then return; end if;
 return query select r.id,r.service,r.pickup_text,r.pickup_lat,r.pickup_lng,r.dest_text,r.dest_lat,r.dest_lng,r.distance_m,r.duration_s,r.offer,r.notes,r.created_at,
   haversine_km(d.lat,d.lng,r.pickup_lat,r.pickup_lng),o.fare,o.status
  from rides r left join ride_offers o on o.ride_id=r.id and o.driver_id=d.user_id
  where r.status='searching' and r.service=any(d.services) and r.created_at>now()-interval '30 minutes' and haversine_km(d.lat,d.lng,r.pickup_lat,r.pickup_lng)<=15
  order by haversine_km(d.lat,d.lng,r.pickup_lat,r.pickup_lng) limit 30;
end; $$;

create or replace function public.make_offer(p_ride uuid,p_fare integer,p_eta integer) returns uuid language plpgsql security definer set search_path=public as $$
declare d drivers%rowtype; r rides%rowtype; result uuid;
begin
 select * into d from drivers dr where dr.user_id=auth.uid() and dr.status='active';
 if not found then raise exception 'Driver registration required'; end if;
 if not d.online or d.lat is null or d.located_at<now()-interval '2 minutes' then raise exception 'Go online first'; end if;
 if not consume_limit('offers') then raise exception 'Too many requests'; end if;
 if p_fare is null or p_fare not between 50 and 500000 or p_eta is null or p_eta not between 1 and 240 then raise exception 'Invalid offer'; end if;
 select * into r from rides where id=p_ride;
 if not found or r.status<>'searching' then raise exception 'This ride is no longer available'; end if;
 if not (r.service=any(d.services)) then raise exception 'Your registered vehicles do not match this ride'; end if;
 if haversine_km(d.lat,d.lng,r.pickup_lat,r.pickup_lng)>15 then raise exception 'This pickup is too far from you'; end if;
 if exists(select 1 from rides x where x.driver_id=auth.uid() and x.status in ('assigned','arrived','in_progress')) then raise exception 'Finish your current ride first'; end if;
 insert into ride_offers(ride_id,driver_id,fare,eta_min) values(p_ride,auth.uid(),p_fare,p_eta)
 on conflict(ride_id,driver_id) do update set fare=excluded.fare,eta_min=excluded.eta_min,status='pending',updated_at=now() returning id into result;
 return result;
end; $$;

create or replace function public.driver_ride_status(p_ride uuid,p_status text,p_reason text default null) returns void language plpgsql security definer set search_path=public as $$
declare r rides%rowtype;
begin
 if not is_active_driver() then raise exception 'Driver registration required'; end if;
 select * into r from rides where id=p_ride and driver_id=auth.uid() for update;
 if not found then raise exception 'Ride not found'; end if;
 if not ((r.status='assigned' and p_status in ('arrived','cancelled')) or (r.status='arrived' and p_status in ('in_progress','cancelled')) or (r.status='in_progress' and p_status='completed')) then raise exception 'Invalid transition'; end if;
 update rides set status=p_status,cancel_reason=case when p_status='cancelled' then left(coalesce(p_reason,'Cancelled by driver'),200) else cancel_reason end,updated_at=now() where id=r.id;
end; $$;

create or replace function public.driver_summary() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not is_active_driver() then raise exception 'Driver registration required'; end if;
 return (select jsonb_build_object('completed_30d',count(*),'earned_30d',coalesce(sum(agreed_fare),0),'completed_today',count(*) filter (where updated_at>=date_trunc('day',now())),'earned_today',coalesce(sum(agreed_fare) filter (where updated_at>=date_trunc('day',now())),0))
  from rides where driver_id=auth.uid() and status='completed' and updated_at>now()-interval '30 days');
end; $$;

-- Admin ------------------------------------------------------------------------
create or replace function public.admin_drivers() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'Admin only'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',d.user_id,'name',p.full_name,'avatar_path',p.avatar_path,'services',d.services,'vehicle_model',d.vehicle_model,'vehicle_plate',d.vehicle_plate,'city',d.city,'status',d.status,'online',d.online and d.located_at>now()-interval '2 minutes','located_at',d.located_at,'created_at',d.created_at) order by d.created_at desc)
  from drivers d join profiles p on p.id=d.user_id),'[]'::jsonb);
end; $$;

create or replace function public.set_driver_status(p_user uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'Admin only'; end if;
 if p_status not in ('active','suspended') then raise exception 'Invalid transition'; end if;
 update drivers set status=p_status,online=case when p_status='suspended' then false else online end where user_id=p_user;
 if not found then raise exception 'Record not found'; end if;
 insert into audit_log(actor,entity,entity_id,new_status) values(auth.uid(),'drivers',p_user,p_status);
end; $$;

create or replace function public.admin_rides() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'Admin only'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'service',x.service,'status',x.status,'pickup_text',x.pickup_text,'dest_text',x.dest_text,'offer',x.offer,'agreed_fare',x.agreed_fare,'distance_m',x.distance_m,'created_at',x.created_at,'driver_id',x.driver_id,'rider_id',x.rider_id) order by x.created_at desc) from (select * from rides order by created_at desc limit 50) x),'[]'::jsonb);
end; $$;

-- Permissions: nothing is callable by anonymous visitors; internal helpers are private.
do $$
declare f record;
begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('haversine_km','in_pakistan','ride_json') loop
  execute format('revoke execute on function %s from public,anon,authenticated',f.sig);
 end loop;
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_active_driver','consume_limit','create_order','create_booking','apply_partner','change_status','my_driver','my_active_ride','get_ride','my_rides','create_ride','nearby_drivers','rider_offers','accept_offer','decline_offer','rider_cancel_ride','driver_ping','driver_go_offline','driver_feed','make_offer','driver_ride_status','driver_summary','admin_drivers','set_driver_status','admin_rides') loop
  execute format('revoke execute on function %s from public,anon',f.sig);
  execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
commit;
