// Tiny in-memory limiter and cache for public proxy routes (per server instance).
const hits = new Map<string, {count:number;reset:number}>();
export function limited(req: Request, max = 40, windowMs = 60_000) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    if (hits.size > 2000) hits.clear();
    hits.set(ip, {count:1, reset:now + windowMs});
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
export class TtlCache<T> {
  private store = new Map<string, {value:T;ts:number}>();
  constructor(private ttlMs: number, private max = 500) {}
  get(key: string) {
    const hit = this.store.get(key);
    if (hit && Date.now() - hit.ts < this.ttlMs) return hit.value;
    return undefined;
  }
  set(key: string, value: T) {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, {value, ts:Date.now()});
  }
}
