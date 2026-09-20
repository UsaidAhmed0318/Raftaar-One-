-- Safe to run more than once. Adds demo products only if the catalog is empty,
-- and makes the account with this email an admin (works after that account signs up).
insert into public.products(name,category,description,price,stock)
select v.* from (values
('House biryani bowl','Food','Demo menu: fragrant rice, spices and a comforting lunch.',480,25),
('Smash burger box','Food','Demo menu: a burger and fries. Confirm allergens with your seller.',690,20),
('Family pizza','Food','Demo menu: a sharing-size pizza with classic toppings.',1490,15),
('Weekly essentials','Grocery','Demo grocery bundle. Replace with actual merchant stock.',1850,20),
('Everyday headphones','Accessories','Demo accessory listing, not a real brand endorsement.',2490,10),
('City carry backpack','Accessories','Demo commuter bag. Replace with licensed product photography.',3290,10)
) as v(name,category,description,price,stock)
where not exists (select 1 from public.products);
update public.profiles set role='admin'
where id in (select id from auth.users where lower(email)='usaidahmeddon@gmail.com');
