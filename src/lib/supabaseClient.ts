import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildDemoStore, DEMO_CREDENTIALS } from '../data/demoData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

const hasEnv = Boolean(supabaseUrl && supabaseAnonKey);

/** True cuando no hay credenciales Supabase: la app usa datos demo en memoria. */
export function isUsingDemoData(): boolean {
  return !hasEnv;
}

/**
 * En modo demo devolvemos true para que las páginas carguen datos
 * (los sirve el cliente falso en memoria) en lugar del EmptyState.
 */
export function isSupabaseConfigured(): boolean {
  return true;
}

/** URL configurada (vacía en modo demo). Útil para mensajes de diagnóstico. */
export function getSupabaseUrl(): string {
  return supabaseUrl ?? '';
}

// ---------------------------------------------------------------------------
// Detección de fallos de red (DNS, offline, proyecto pausado/eliminado)
// ---------------------------------------------------------------------------

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (
    typeof navigator !== 'undefined' &&
    'onLine' in navigator &&
    navigator.onLine === false
  ) {
    return true;
  }
  const raw =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
  const msg = raw.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('network request failed') ||
    msg.includes('name_not_resolved') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_internet') ||
    msg.includes('err_connection') ||
    msg.includes('enotfound') ||
    msg.includes('eai_again') ||
    msg.includes('offline') ||
    msg.includes('dns') ||
    // supabase-js / postgrest-js envuelven el TypeError de fetch en `error`
    // con mensajes cortos como "TypeError: fetch failed".
    (msg.includes('typeerror') && msg.includes('fetch')) ||
    (msg.includes('typeerror') && msg.includes('load'))
  );
}

let fallbackActive = false;
const fallbackListeners = new Set<() => void>();

function activateFallback(reason?: unknown): void {
  if (!hasEnv || fallbackActive) return;
  fallbackActive = true;
  console.warn(
    `[Supabase] No se pudo alcanzar ${supabaseUrl}. ` +
      `La app continúa con datos demo en memoria. ` +
      `Verifica la URL en .env (VITE_SUPABASE_URL), que el proyecto no esté pausado/eliminado y tu conexión a internet.`,
    reason ?? '',
  );
  for (const cb of fallbackListeners) {
    try {
      cb();
    } catch {
      /* noop */
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('mtb:supabase-fallback'));
    } catch {
      /* noop */
    }
  }
}

/** True cuando el proyecto Supabase no responde y estamos sirviendo demo. */
export function isSupabaseFallbackActive(): boolean {
  return fallbackActive;
}

export function onSupabaseFallback(cb: () => void): () => void {
  fallbackListeners.add(cb);
  return () => {
    fallbackListeners.delete(cb);
  };
}

// ---------------------------------------------------------------------------
// Cliente falso en memoria (modo demo local, sin Supabase ni XAMPP)
// ---------------------------------------------------------------------------

type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'neq'; col: string; val: unknown }
  | { kind: 'gte'; col: string; val: unknown }
  | { kind: 'lte'; col: string; val: unknown }
  | { kind: 'gt'; col: string; val: unknown }
  | { kind: 'lt'; col: string; val: unknown }
  | { kind: 'in'; col: string; vals: unknown[] };

function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) < String(b) ? -1 : 1;
}

function demoImageUrl(bucket: string, path: string): string {
  const label = encodeURIComponent(`${bucket}/${path}`.slice(0, 40));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='#0c4a6e'/><text x='50%' y='50%' fill='white' font-size='28' text-anchor='middle' font-family='sans-serif'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

let demoStore: Record<string, Array<Record<string, unknown>>> | null = null;
function store(): Record<string, Array<Record<string, unknown>>> {
  if (!demoStore) demoStore = buildDemoStore();
  return demoStore;
}

function applyFilters(
  rows: Array<Record<string, unknown>>,
  filters: Filter[],
): Array<Record<string, unknown>> {
  return rows.filter((r) =>
    filters.every((f) => {
      const v = r[f.col];
      switch (f.kind) {
        case 'eq':
          return v === f.val;
        case 'neq':
          return v !== f.val;
        case 'gte':
          return cmp(v, f.val) >= 0;
        case 'lte':
          return cmp(v, f.val) <= 0;
        case 'gt':
          return cmp(v, f.val) > 0;
        case 'lt':
          return cmp(v, f.val) < 0;
        case 'in':
          return f.vals.includes(v);
      }
    }),
  );
}

const SESSION_KEY = 'mtb-demo-session';

interface DemoSession {
  user: { id: string; email: string };
}

function readSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

class FakeQuery {
  private table: string;
  private filters: Filter[] = [];
  private orders: Array<{ col: string; asc: boolean }> = [];
  private limitN: number | null = null;
  private singleRow = false;
  private op:
    | { type: 'select' }
    | { type: 'insert'; payload: unknown }
    | { type: 'upsert'; payload: unknown; onConflict?: string }
    | { type: 'update'; payload: Record<string, unknown> }
    | { type: 'delete' } = { type: 'select' };

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string, _opts?: unknown): this {
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filters.push({ kind: 'eq', col, val });
    return this;
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ kind: 'neq', col, val });
    return this;
  }
  gte(col: string, val: unknown): this {
    this.filters.push({ kind: 'gte', col, val });
    return this;
  }
  lte(col: string, val: unknown): this {
    this.filters.push({ kind: 'lte', col, val });
    return this;
  }
  gt(col: string, val: unknown): this {
    this.filters.push({ kind: 'gt', col, val });
    return this;
  }
  lt(col: string, val: unknown): this {
    this.filters.push({ kind: 'lt', col, val });
    return this;
  }
  in(col: string, vals: unknown[]): this {
    this.filters.push({ kind: 'in', col, vals });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  insert(payload: unknown): this {
    this.op = { type: 'insert', payload };
    return this;
  }
  upsert(payload: unknown, opts?: { onConflict?: string }): this {
    this.op = { type: 'upsert', payload, onConflict: opts?.onConflict };
    return this;
  }
  update(payload: Record<string, unknown>): this {
    this.op = { type: 'update', payload };
    return this;
  }
  delete(): this {
    this.op = { type: 'delete' };
    return this;
  }

  single(): Promise<{ data: unknown; error: unknown }> {
    this.singleRow = true;
    return this.execute();
  }

  maybeSingle(): Promise<{ data: unknown; error: unknown }> {
    this.singleRow = true;
    return this.execute().then((res) => {
      const msg =
        res.error && typeof res.error === 'object' && 'message' in res.error
          ? String((res.error as { message: unknown }).message)
          : '';
      if (res.data === null && msg === 'Sin filas') {
        return { data: null, error: null };
      }
      return res;
    });
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: unknown; error: unknown }> {
    const s = store();
    if (!s[this.table]) s[this.table] = [];
    const table = s[this.table];

    if (this.op.type === 'insert') {
      const items = Array.isArray(this.op.payload) ? this.op.payload : [this.op.payload];
      const created = (items as Array<Record<string, unknown>>).map((it) => ({
        id: (it.id as string) ?? `demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        created_at: new Date().toISOString(),
        ...it,
      }));
      table.push(...created);
      if (this.singleRow) return { data: created[0] ?? null, error: null };
      return { data: created, error: null };
    }

    if (this.op.type === 'upsert') {
      const items = Array.isArray(this.op.payload) ? this.op.payload : [this.op.payload];
      const key = this.op.onConflict ?? 'id';
      const affected: Array<Record<string, unknown>> = [];
      for (const it of items as Array<Record<string, unknown>>) {
        const idx = table.findIndex((r) => r[key] === it[key]);
        if (idx >= 0) {
          table[idx] = { ...table[idx], ...it };
          affected.push(table[idx]);
        } else {
          const created = {
            id: (it.id as string) ?? `demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            created_at: new Date().toISOString(),
            ...it,
          };
          table.push(created);
          affected.push(created);
        }
      }
      return { data: affected, error: null };
    }

    if (this.op.type === 'update') {
      const targets = applyFilters(table, this.filters);
      for (const t of targets) Object.assign(t, this.op.payload);
      if (this.singleRow) return { data: targets[0] ?? null, error: null };
      return { data: targets, error: null };
    }

    if (this.op.type === 'delete') {
      const targets = new Set(applyFilters(table, this.filters));
      s[this.table] = table.filter((r) => !targets.has(r));
      return { data: [], error: null };
    }

    let rows = applyFilters(table, this.filters);
    for (const o of this.orders) {
      rows = [...rows].sort((a, b) => (o.asc ? cmp(a[o.col], b[o.col]) : -cmp(a[o.col], b[o.col])));
    }
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);
    if (this.singleRow) {
      if (rows.length === 0) return { data: null, error: { message: 'Sin filas' } };
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }
}

function createDemoClient(): unknown {
  return {
    from: (table: string) => new FakeQuery(table),
    storage: {
      from: (_bucket: string) => ({
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: demoImageUrl(_bucket, path) } }),
      }),
    },
    auth: {
      getSession: async () => {
        const sess = readSession();
        return {
          data: {
            session: sess ? { user: sess.user } : null,
          },
        };
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const found = DEMO_CREDENTIALS.find(
          (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password,
        );
        if (!found) return { data: {}, error: { message: 'Credenciales inválidas' } };
        const sess = { user: { id: found.id, email: found.email } };
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        } catch {
          /* sin almacenamiento */
        }
        return { data: { user: sess.user }, error: null };
      },
      signOut: async () => {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {
          /* sin almacenamiento */
        }
        return { error: null };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  };
}

// ---------------------------------------------------------------------------
// Cliente resiliente: intenta Supabase real, cae a demo ante fallo de red
// ---------------------------------------------------------------------------

interface RecordedStep {
  method: string;
  args: unknown[];
}

// oxlint-disable-next-line no-explicit-any
type AnyClient = any;

async function runAgainst(
  client: AnyClient,
  table: string,
  steps: RecordedStep[],
  single: 'none' | 'single' | 'maybe',
): Promise<{ data: unknown; error: unknown }> {
  // oxlint-disable-next-line no-explicit-any
  let q: any = client.from(table);
  for (const s of steps) {
    q = q[s.method](...s.args);
  }
  if (single === 'single') return await q.single();
  if (single === 'maybe') {
    if (typeof q.maybeSingle === 'function') return await q.maybeSingle();
    const res = await q.single();
    const msg =
      res?.error && typeof res.error === 'object' && 'message' in res.error
        ? String((res.error as { message: unknown }).message)
        : '';
    if ((res?.data === null || res?.data === undefined) && (msg === 'Sin filas' || msg.includes('0 rows'))) {
      return { data: null, error: null };
    }
    return res;
  }
  return await q;
}

class ResilientQuery {
  private steps: RecordedStep[] = [];
  private table: string;
  private realClient: AnyClient;
  private demoClient: AnyClient;

  constructor(table: string, realClient: AnyClient, demoClient: AnyClient) {
    this.table = table;
    this.realClient = realClient;
    this.demoClient = demoClient;
  }

  private push(method: string, args: unknown[]): this {
    this.steps.push({ method, args });
    return this;
  }

  select(...args: unknown[]): this {
    return this.push('select', args);
  }
  eq(...args: unknown[]): this {
    return this.push('eq', args);
  }
  neq(...args: unknown[]): this {
    return this.push('neq', args);
  }
  gte(...args: unknown[]): this {
    return this.push('gte', args);
  }
  lte(...args: unknown[]): this {
    return this.push('lte', args);
  }
  gt(...args: unknown[]): this {
    return this.push('gt', args);
  }
  lt(...args: unknown[]): this {
    return this.push('lt', args);
  }
  in(...args: unknown[]): this {
    return this.push('in', args);
  }
  order(...args: unknown[]): this {
    return this.push('order', args);
  }
  limit(...args: unknown[]): this {
    return this.push('limit', args);
  }
  insert(...args: unknown[]): this {
    return this.push('insert', args);
  }
  upsert(...args: unknown[]): this {
    return this.push('upsert', args);
  }
  update(...args: unknown[]): this {
    return this.push('update', args);
  }
  delete(...args: unknown[]): this {
    return this.push('delete', args);
  }

  single(): Promise<{ data: unknown; error: unknown }> {
    return this.execute('single');
  }

  maybeSingle(): Promise<{ data: unknown; error: unknown }> {
    return this.execute('maybe');
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute('none').then(onfulfilled, onrejected);
  }

  private async execute(
    single: 'none' | 'single' | 'maybe',
  ): Promise<{ data: unknown; error: unknown }> {
    if (fallbackActive) {
      return runAgainst(this.demoClient, this.table, this.steps, single);
    }
    try {
      const res = await runAgainst(this.realClient, this.table, this.steps, single);
      if (res?.error && isNetworkError(res.error)) {
        activateFallback(res.error);
        return runAgainst(this.demoClient, this.table, this.steps, single);
      }
      return res;
    } catch (e) {
      if (isNetworkError(e)) {
        activateFallback(e);
        return runAgainst(this.demoClient, this.table, this.steps, single);
      }
      throw e;
    }
  }
}

function withFallback<TArgs extends unknown[], TResult>(
  realFn: (...args: TArgs) => Promise<TResult>,
  demoFn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    if (fallbackActive) return demoFn(...args);
    try {
      const res = await realFn(...args);
      const maybeError =
        res && typeof res === 'object' && 'error' in res
          ? (res as { error: unknown }).error
          : null;
      if (maybeError && isNetworkError(maybeError)) {
        activateFallback(maybeError);
        return demoFn(...args);
      }
      return res;
    } catch (e) {
      if (isNetworkError(e)) {
        activateFallback(e);
        return demoFn(...args);
      }
      throw e;
    }
  };
}

function createResilientClient(real: AnyClient, demo: AnyClient): unknown {
  return {
    from: (table: string) => new ResilientQuery(table, real, demo),
    storage: {
      from: (bucket: string) => {
        const r = real.storage.from(bucket);
        const d = demo.storage.from(bucket);
        return {
          upload: withFallback(
            (...a: unknown[]) => (r.upload as (...a: unknown[]) => Promise<{ error: unknown }>)(...a),
            (...a: unknown[]) => (d.upload as (...a: unknown[]) => Promise<{ error: unknown }>)(...a),
          ),
          remove: withFallback(
            (...a: unknown[]) => (r.remove as (...a: unknown[]) => Promise<{ error: unknown }>)(...a),
            (...a: unknown[]) => (d.remove as (...a: unknown[]) => Promise<{ error: unknown }>)(...a),
          ),
          getPublicUrl: (path: string, ...rest: unknown[]) => {
            if (fallbackActive) return d.getPublicUrl(path, ...rest);
            try {
              return r.getPublicUrl(path, ...rest);
            } catch {
              return d.getPublicUrl(path, ...rest);
            }
          },
        };
      },
    },
    auth: {
      getSession: withFallback(
        () => real.auth.getSession(),
        () => demo.auth.getSession(),
      ),
      signInWithPassword: withFallback(
        (creds: { email: string; password: string }) =>
          real.auth.signInWithPassword(creds),
        (creds: { email: string; password: string }) =>
          demo.auth.signInWithPassword(creds),
      ),
      signOut: withFallback(
        () => real.auth.signOut(),
        () => demo.auth.signOut(),
      ),
      onAuthStateChange: (...args: unknown[]) => {
        if (fallbackActive) {
          return (demo.auth.onAuthStateChange as (...a: unknown[]) => unknown)(...args);
        }
        try {
          return (real.auth.onAuthStateChange as (...a: unknown[]) => unknown)(...args);
        } catch {
          return (demo.auth.onAuthStateChange as (...a: unknown[]) => unknown)(...args);
        }
      },
    },
  };
}

const demoClient: AnyClient = createDemoClient();

function resolveUrl(url: string | undefined): string {
  if (url && url.length > 0) return url;
  return 'https://placeholder.supabase.co';
}

function resolveKey(key: string | undefined): string {
  if (key && key.length > 0) return key;
  return 'public-anon-key';
}

function buildSupabase(): SupabaseClient {
  if (!hasEnv) return demoClient as unknown as SupabaseClient;
  const real = createClient(resolveUrl(supabaseUrl), resolveKey(supabaseAnonKey));
  return createResilientClient(real, demoClient) as unknown as SupabaseClient;
}

export const supabase = buildSupabase();
