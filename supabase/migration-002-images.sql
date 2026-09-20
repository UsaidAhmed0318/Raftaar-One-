-- Migration 002: profile photos, partner photos and product images (Supabase Storage).
-- Run once in the SQL Editor AFTER schema.sql. Safe to re-run.
begin;

alter table public.profiles add column if not exists avatar_path text;
alter table public.products add column if not exists image_path text;
alter table public.applications add column if not exists photo_path text;

-- Public-read image buckets; uploads are limited by size, type and per-user folder policies below.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']),
 ('partners','partners',true,3145728,array['image/jpeg','image/png','image/webp']),
 ('products','products',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Users manage only files inside their own folder (<user id>/...).
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists partners_insert on storage.objects;
drop policy if exists partners_update on storage.objects;
drop policy if exists partners_delete on storage.objects;
create policy partners_insert on storage.objects for insert to authenticated with check (bucket_id='partners' and (storage.foldername(name))[1]=auth.uid()::text);
create policy partners_update on storage.objects for update to authenticated using (bucket_id='partners' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='partners' and (storage.foldername(name))[1]=auth.uid()::text);
create policy partners_delete on storage.objects for delete to authenticated using (bucket_id='partners' and (storage.foldername(name))[1]=auth.uid()::text);

-- Only admins manage product images.
drop policy if exists products_img_insert on storage.objects;
drop policy if exists products_img_update on storage.objects;
drop policy if exists products_img_delete on storage.objects;
create policy products_img_insert on storage.objects for insert to authenticated with check (bucket_id='products' and public.is_admin());
create policy products_img_update on storage.objects for update to authenticated using (bucket_id='products' and public.is_admin()) with check (bucket_id='products' and public.is_admin());
create policy products_img_delete on storage.objects for delete to authenticated using (bucket_id='products' and public.is_admin());

-- Profile photo: the database only accepts a path inside the caller's own folder.
create or replace function public.set_avatar(p_path text) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_path is not null and p_path !~ ('^'||auth.uid()::text||'/[A-Za-z0-9._-]{1,100}$') then raise exception 'Invalid image'; end if;
 update profiles set avatar_path=p_path where id=auth.uid();
end; $$;

-- Partner application with an optional photo (driver, vehicle or shop).
drop function if exists public.apply_partner(text,text,text,text);
create or replace function public.apply_partner(p_kind text,p_city text,p_phone text,p_details text,p_photo text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not consume_limit('applications') then raise exception 'Too many requests'; end if;
 if p_kind not in ('Driver','Courier','Merchant','Fleet operator') or p_city not in ('Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad') or p_phone !~ '^\+923[0-9]{9}$' or length(p_details) not between 10 and 1000 then raise exception 'Invalid application'; end if;
 if p_photo is not null and p_photo !~ ('^'||auth.uid()::text||'/[A-Za-z0-9._-]{1,100}$') then raise exception 'Invalid image'; end if;
 insert into applications(user_id,kind,city,phone,details,photo_path) values(auth.uid(),p_kind,p_city,p_phone,p_details,p_photo) returning id into result;
 return result;
end; $$;

-- Product save with image: null keeps the current image, empty string removes it.
drop function if exists public.save_product(uuid,text,text,text,integer,integer,boolean);
create or replace function public.save_product(p_id uuid,p_name text,p_category text,p_description text,p_price integer,p_stock integer,p_active boolean,p_image text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not is_admin() then raise exception 'Admin only'; end if;
 if not consume_limit('admin') then raise exception 'Too many requests'; end if;
 if p_image is not null and p_image<>'' and p_image !~ '^[A-Za-z0-9._-]{1,100}$' then raise exception 'Invalid image'; end if;
 insert into products(id,name,category,description,price,stock,active,image_path) values(coalesce(p_id,gen_random_uuid()),p_name,p_category,left(p_description,1000),p_price,p_stock,p_active,nullif(p_image,''))
 on conflict(id) do update set name=excluded.name,category=excluded.category,description=excluded.description,price=excluded.price,stock=excluded.stock,active=excluded.active,
  image_path=case when p_image is null then products.image_path else nullif(p_image,'') end
 returning id into result;
 insert into audit_log(actor,entity,entity_id,new_status) values(auth.uid(),'products',result,'saved'); return result;
end; $$;

revoke execute on function public.set_avatar(text) from public,anon;
revoke execute on function public.apply_partner(text,text,text,text,text) from public,anon;
revoke execute on function public.save_product(uuid,text,text,text,integer,integer,boolean,text) from public,anon;
grant execute on function public.set_avatar(text) to authenticated;
grant execute on function public.apply_partner(text,text,text,text,text) to authenticated;
grant execute on function public.save_product(uuid,text,text,text,integer,integer,boolean,text) to authenticated;
commit;
