-- Run once in a new Supabase project. Do not run against an existing production schema.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', role text not null default 'customer' check (role in ('customer','admin')),
 created_at timestamptz not null default now()
);
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100)); return new; end; $$;
create trigger on_user_created after insert on auth.users for each row execute function public.new_profile();
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role='admin'); $$;
create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 category text not null check(category in ('Food','Grocery','Accessories')),
 description text not null default '', price integer not null check(price between 1 and 1000000),
 stock integer not null default 0 check(stock>=0), active boolean not null default true
);
create table public.orders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 request_id uuid not null,items jsonb not null,total integer not null,delivery_fee integer not null default 150,
 address text not null,phone text not null,city text not null,
 status text not null default 'placed' check(status in ('placed','confirmed','dispatched','delivered','cancelled')),
 payment_method text not null default 'COD' check(payment_method='COD'),
 created_at timestamptz not null default now(),unique(user_id,request_id)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 request_id uuid not null,service text not null check(service in ('Rickshaw','Bike','Economy car','Comfort car','Premium car','Protocol car','Parcel','Rickshaw loader','Suzuki pickup','Shehzore pickup','Mazda loader','Mini truck','Truck','Luxury coach','Hiace van','Coaster','Mini bus')),
 city text not null,pickup text not null,destination text not null,phone text not null,
 offer integer check(offer between 100 and 1000000), notes text not null default '',
 status text not null default 'requested' check(status in ('requested','reviewing','confirmed','completed','cancelled')),
 created_at timestamptz not null default now(), unique(user_id,request_id)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id),
 kind text not null check(kind in ('Driver','Courier','Merchant','Fleet operator')),city text not null,
 phone text not null,details text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create table public.audit_log(id bigint generated always as identity primary key,actor uuid not null,entity text not null,entity_id uuid not null,new_status text not null,created_at timestamptz not null default now());
create table public.rate_limits(user_id uuid not null,scope text not null,bucket timestamptz not null,count integer not null,primary key(user_id,scope,bucket));
create index orders_user_created on orders(user_id,created_at desc);
create index bookings_user_created on bookings(user_id,created_at desc);
create function public.consume_limit(p_scope text) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if auth.uid() is null or p_scope not in ('orders','bookings','applications','assistant','admin') then return false; end if;
 insert into rate_limits values(auth.uid(),p_scope,date_trunc('minute',now()),1)
 on conflict(user_id,scope,bucket) do update set count=rate_limits.count+1 returning count into n;
 return n<=case when p_scope='assistant' then 10 else 20 end;
end; $$;
alter table profiles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table bookings enable row level security;
alter table applications enable row level security;
alter table audit_log enable row level security;
alter table rate_limits enable row level security;
create policy profile_read on profiles for select to authenticated using(id=auth.uid() or is_admin());
create policy product_read on products for select using(active or is_admin());
create policy order_read on orders for select to authenticated using(user_id=auth.uid() or is_admin());
create policy booking_read on bookings for select to authenticated using(user_id=auth.uid() or is_admin());
create policy application_read on applications for select to authenticated using(user_id=auth.uid() or is_admin());
create policy audit_read on audit_log for select to authenticated using(is_admin());
-- Writes go exclusively through checked functions. Users cannot change roles or prices.
revoke all on profiles,products,orders,bookings,applications,audit_log,rate_limits from anon,authenticated;
grant select on products to anon,authenticated;
grant select on profiles,orders,bookings,applications,audit_log to authenticated;

create function public.create_order(p_request_id uuid,p_items jsonb,p_address text,p_phone text,p_city text,p_expected_total integer) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; item jsonb; product products%rowtype; qty integer; amount integer:=150; snapshot jsonb:='[]'; seen uuid[]:='{}';
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select id into result from orders where user_id=auth.uid() and request_id=p_request_id;
 if result is not null then return result; end if;
 if not consume_limit('orders') then raise exception 'Too many requests'; end if;
 if length(p_address) not between 10 and 400 or p_phone !~ '^\+923[0-9]{9}$' or p_city not in ('Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad') then raise exception 'Invalid delivery details'; end if;
 if p_items is null or jsonb_typeof(p_items)!='array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid cart'; end if;
 -- Deterministic product locking avoids competing cart lock-order deadlocks.
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
create function public.create_booking(p_request_id uuid,p_service text,p_city text,p_pickup text,p_destination text,p_phone text,p_offer integer,p_notes text) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select id into result from bookings where user_id=auth.uid() and request_id=p_request_id;
 if result is not null then return result; end if;
 if not consume_limit('bookings') then raise exception 'Too many requests'; end if;
 if p_service not in ('Rickshaw','Bike','Economy car','Comfort car','Premium car','Protocol car','Parcel','Rickshaw loader','Suzuki pickup','Shehzore pickup','Mazda loader','Mini truck','Truck','Luxury coach','Hiace van','Coaster','Mini bus') or p_city not in ('Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad') or length(p_pickup) not between 5 and 300 or length(p_destination) not between 5 and 300 or p_phone !~ '^\+923[0-9]{9}$' or length(p_notes)>500 then raise exception 'Invalid booking details'; end if;
 insert into bookings(user_id,request_id,service,city,pickup,destination,phone,offer,notes) values(auth.uid(),p_request_id,p_service,p_city,p_pickup,p_destination,p_phone,p_offer,p_notes) returning id into result;
 return result;
end; $$;
create function public.apply_partner(p_kind text,p_city text,p_phone text,p_details text) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not consume_limit('applications') then raise exception 'Too many requests'; end if;
 if p_kind not in ('Driver','Courier','Merchant','Fleet operator') or p_city not in ('Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad') or p_phone !~ '^\+923[0-9]{9}$' or length(p_details) not between 10 and 1000 then raise exception 'Invalid application'; end if;
 insert into applications(user_id,kind,city,phone,details) values(auth.uid(),p_kind,p_city,p_phone,p_details) returning id into result;
 return result;
end; $$;

create function public.change_status(p_entity text,p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
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
 else raise exception 'Invalid entity'; end if;
 if old_status is null then raise exception 'Record not found'; end if;
 insert into audit_log(actor,entity,entity_id,new_status) values(auth.uid(),p_entity,p_id,p_status);
end; $$;
create function public.save_product(p_id uuid,p_name text,p_category text,p_description text,p_price integer,p_stock integer,p_active boolean) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not is_admin() then raise exception 'Admin only'; end if;
 if not consume_limit('admin') then raise exception 'Too many requests'; end if;
 insert into products(id,name,category,description,price,stock,active) values(coalesce(p_id,gen_random_uuid()),p_name,p_category,left(p_description,1000),p_price,p_stock,p_active)
 on conflict(id) do update set name=excluded.name,category=excluded.category,description=excluded.description,price=excluded.price,stock=excluded.stock,active=excluded.active returning id into result;
 insert into audit_log(actor,entity,entity_id,new_status) values(auth.uid(),'products',result,'saved'); return result;
end; $$;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.consume_limit(text) to authenticated;
grant execute on function public.create_order(uuid,jsonb,text,text,text,integer) to authenticated;
grant execute on function public.create_booking(uuid,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.apply_partner(text,text,text,text) to authenticated;
grant execute on function public.change_status(text,uuid,text) to authenticated;
grant execute on function public.save_product(uuid,text,text,text,integer,integer,boolean) to authenticated;
commit;
-- Seed data is OPTIONAL and intentionally separate.

-- Anonymous catalog policies need a safe boolean role check too.
grant execute on function public.is_admin() to anon;
