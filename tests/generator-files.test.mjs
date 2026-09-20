import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('expected source files exist',()=>{for(const p of ['app/page.tsx','app/api/[action]/route.ts','supabase/schema.sql','components/checkout.tsx','components/admin-panel.tsx','public/images/README.md'])assert.ok(fs.existsSync(p),p);});
test('sensitive credentials are not embedded in public config',()=>{const env=fs.readFileSync('.env.example','utf8');assert.match(env,/OPENAI_API_KEY=\n/);assert.doesNotMatch(env,/SERVICE_ROLE_KEY=/);});
test('schema includes critical protections (structural test, not database integration)',()=>{const sql=fs.readFileSync('supabase/schema.sql','utf8');for(const snippet of ['enable row level security','for update','unique(user_id,request_id)','if not is_admin()','revoke all on profiles'])assert.ok(sql.includes(snippet),snippet);});
