import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('expected source files exist',()=>{for(const p of ['app/page.tsx','app/api/[action]/route.ts','supabase/schema.sql','components/checkout.tsx','components/admin-panel.tsx','public/images/logo.png'])assert.ok(fs.existsSync(p),p);});
test('sensitive credentials are not embedded in public config',()=>{const env=fs.readFileSync('.env.example','utf8');assert.match(env,/NEXT_PUBLIC_SUPABASE_URL=/);assert.doesNotMatch(env,/SERVICE_ROLE_KEY=/);});
test('schema includes critical protections (structural test, not database integration)',()=>{const sql=fs.readFileSync('supabase/schema.sql','utf8');for(const snippet of ['enable row level security','for update','unique(user_id,request_id)','if not is_admin()','revoke all on profiles'])assert.ok(sql.includes(snippet),snippet);});
test('ride migration keeps drivers registered-only and tables closed to browsers',()=>{const sql=fs.readFileSync('supabase/migration-003-rides.sql','utf8');for(const snippet of ['create table if not exists public.drivers','revoke all on public.drivers,public.rides,public.ride_offers from anon,authenticated','if not is_active_driver()','one_active_ride_per_driver','in_pakistan(','set_driver_status'])assert.ok(sql.includes(snippet),snippet);assert.ok(fs.existsSync('supabase/migration-002-images.sql'));});
test('ride pages and components exist',()=>{for(const p of ['app/ride/page.tsx','app/driver/page.tsx','components/ride-rider.tsx','components/driver-dashboard.tsx','components/map.tsx','components/boot-loader.tsx','public/images/logo-transparent.png','app/api/route/route.ts','app/api/places/route.ts','app/api/reverse/route.ts'])assert.ok(fs.existsSync(p),p);});

test('help answers common questions in English and Roman Urdu',async()=>{
  const {answerQuestion}=await import('../lib/help.ts');
  const cases=[['Ride request kaise submit karun?','book-ride'],['driver kab aayega','track'],['how do I become a driver','become-driver'],['online payment kaise karun','payment'],['mera login nahi ho raha','login'],['kiraya kitna hoga','fare'],['parcel bhejna hai','cargo']];
  const {helpTopics}=await import('../lib/help.ts');
  for(const [q,id] of cases){const r=answerQuestion(q);assert.equal(r.matched,true,q);assert.equal(r.answer,helpTopics.find(t=>t.id===id).answer,q);}
  assert.equal(answerQuestion('zzzz qqqq').matched,false);
});
