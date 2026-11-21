// Reads TestFlight data from the App Store Connect API and stores it for the admin dashboard
// (public.appstore_save). Runs every three hours from pg_cron, and on demand when an admin presses
// "Sync now". Deploy with verify_jwt off: this function checks callers itself (the cron secret from
// Vault, or a signed-in admin).
//
// Edge secrets (supabase secrets set ...):
//   ASC_KEY_ID       the API key's ID (App Store Connect > Users and Access > Integrations)
//   ASC_ISSUER_ID    the issuer ID shown on the same page
//   ASC_PRIVATE_KEY  the contents of the downloaded AuthKey_<id>.p8 file
//   ASC_APP_ID       optional; Sleep Moore's Apple ID, 6837736590 by default
//
// Testers are counted, never stored by name or email. Feedback screenshots are copied into the private
// `appstore-feedback` bucket because Apple's image links expire.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const API = 'https://api.appstoreconnect.apple.com';
const APP_ID = Deno.env.get('ASC_APP_ID') || '6837736590';
const ORIGIN = /^https:\/\/(www\.)?sleepmoore\.app$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const BUCKET = 'appstore-feedback';

type Json = Record<string, any>;
type Point = { kind: 'link' | 'build' | 'app'; entity: string; day: string; v: Json };

// ---------- HTTP plumbing ----------
function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGIN.test(origin) ? origin : 'https://sleepmoore.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
const reply = (req: Request, status: number, body: Json) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

// ---------- App Store Connect auth: an ES256 JWT, valid for 20 minutes ----------
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));
let cached: { token: string; exp: number } | null = null;

async function appleToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const keyId = Deno.env.get('ASC_KEY_ID')!, issuer = Deno.env.get('ASC_ISSUER_ID')!;
  const pem = (Deno.env.get('ASC_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const exp = now + 19 * 60;
  const unsigned = `${b64urlText(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))}.${b64urlText(JSON.stringify({ iss: issuer, iat: now, exp, aud: 'appstore-connect-v1' }))}`;
  // WebCrypto returns the raw r||s signature, which is exactly what JWS ES256 expects.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned)));
  cached = { token: `${unsigned}.${b64url(sig)}`, exp };
  return cached.token;
}

let calls = 0;
class AppleError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** GET from Apple with a timeout, retrying rate limits and server errors with backoff. */
async function apple(pathOrUrl: string): Promise<Json> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : API + pathOrUrl;
  for (let attempt = 0; ; attempt++) {
    calls++;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await appleToken()}` }, signal: AbortSignal.timeout(20000) });
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 2) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 1500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, Math.min(wait, 8000)));
      continue;
    }
    let detail = res.statusText;
    try { detail = (await res.json()).errors?.[0]?.detail ?? detail; } catch { /* not JSON */ }
    throw new AppleError(res.status, `${res.status} ${detail}`.slice(0, 300));
  }
}

/** Follows `links.next` up to a page cap. */
async function all(path: string, maxPages = 10) {
  const data: Json[] = [], included: Json[] = [];
  let next: string | undefined = path;
  for (let i = 0; next && i < maxPages; i++) {
    const page = await apple(next);
    data.push(...(page.data ?? []));
    included.push(...(page.included ?? []));
    next = page.links?.next;
  }
  return { data, included };
}

const day = (iso: string) => iso.slice(0, 10);
const metricPoints = (kind: Point['kind'], entity: string, res: Json): Point[] =>
  (res.data ?? []).flatMap((group: Json) => (group.dataPoints ?? []).map((p: Json) => ({ kind, entity, day: day(p.start), v: p.values ?? {} })));

// ---------- One sync ----------
async function sync(known: Set<string>) {
  const errors: { step: string; message: string }[] = [];
  const step = async <T>(name: string, fn: () => Promise<T>): Promise<T | null> => {
    try { return await fn(); } catch (e) {
      errors.push({ step: name, message: e instanceof Error ? e.message : String(e) });
      // A bad key fails every step the same way: stop early instead of repeating it.
      if (e instanceof AppleError && (e.status === 401 || e.status === 403) && name === 'app') throw e;
      return null;
    }
  };
  const points: Point[] = [];

  const app = await step('app', async () => {
    const a = (await apple(`/v1/apps/${APP_ID}?fields[apps]=name,bundleId,sku,primaryLocale`)).data;
    return { id: a.id, name: a.attributes.name, bundle_id: a.attributes.bundleId, sku: a.attributes.sku };
  });

  const groups = (await step('groups', async () => {
    const { data } = await all(`/v1/apps/${APP_ID}/betaGroups?limit=50&fields[betaGroups]=name,isInternalGroup,publicLinkEnabled,publicLink,publicLinkLimit,publicLinkLimitEnabled,feedbackEnabled,createdDate`);
    return Promise.all(data.map(async (g) => {
      const a = g.attributes;
      // Counts only: how many testers are in each state, and how they joined.
      const testers = await step(`testers ${a.name}`, async () => {
        const { data: ts } = await all(`/v1/betaGroups/${g.id}/betaTesters?limit=200&fields[betaTesters]=inviteType,state`, 50);
        const by = (k: string) => ts.reduce((m: Json, t) => ((m[t.attributes[k] ?? 'UNKNOWN'] = (m[t.attributes[k] ?? 'UNKNOWN'] ?? 0) + 1), m), {});
        return { total: ts.length, state: by('state'), invite: by('inviteType') };
      });
      if (a.publicLinkEnabled || !a.isInternalGroup) {
        await step(`link usage ${a.name}`, async () => {
          points.push(...metricPoints('link', g.id, await apple(`/v1/betaGroups/${g.id}/metrics/publicLinkUsages?limit=200`)));
        });
      }
      return {
        id: g.id, name: a.name, internal: a.isInternalGroup, created: a.createdDate, feedback_enabled: a.feedbackEnabled,
        link_enabled: !!a.publicLinkEnabled, link: a.publicLink ?? '', link_limit: a.publicLinkLimitEnabled ? a.publicLinkLimit : null,
        testers,
      };
    }));
  })) ?? undefined;

  const builds = (await step('builds', async () => {
    const res = await apple(`/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=15&include=buildBetaDetail,preReleaseVersion`
      + '&fields[builds]=version,uploadedDate,expirationDate,expired,processingState,minOsVersion,buildBetaDetail,preReleaseVersion'
      + '&fields[buildBetaDetails]=internalBuildState,externalBuildState&fields[preReleaseVersions]=version,platform');
    const inc = new Map<string, Json>((res.included ?? []).map((x: Json) => [`${x.type}:${x.id}`, x]));
    const list = (res.data ?? []).map((b: Json) => {
      const detail = inc.get(`buildBetaDetails:${b.relationships?.buildBetaDetail?.data?.id}`)?.attributes ?? {};
      const pre = inc.get(`preReleaseVersions:${b.relationships?.preReleaseVersion?.data?.id}`)?.attributes ?? {};
      return {
        id: b.id, number: b.attributes.version, version: pre.version ?? '', platform: pre.platform ?? 'IOS',
        uploaded: b.attributes.uploadedDate, expires: b.attributes.expirationDate, expired: !!b.attributes.expired,
        processing: b.attributes.processingState, min_os: b.attributes.minOsVersion ?? '',
        internal_state: detail.internalBuildState ?? '', external_state: detail.externalBuildState ?? '',
      };
    });
    // Usage for builds testers can still open, plus the newest few.
    await Promise.all(list.filter((b: Json, i: number) => !b.expired || i < 3).map((b: Json) =>
      step(`build usage ${b.number}`, async () => {
        points.push(...metricPoints('build', b.id, await apple(`/v1/builds/${b.id}/metrics/betaBuildUsages?limit=200`)));
      })));
    return list;
  })) ?? undefined;

  await step('tester usage', async () => {
    points.push(...metricPoints('app', APP_ID, await apple(`/v1/apps/${APP_ID}/metrics/betaTesterUsages?period=P30D&limit=200`)));
  });

  const feedback: Json[] = [];
  const buildName = (id?: string) => {
    const b = builds?.find((x: Json) => x.id === id);
    return b ? `${b.version} (${b.number})` : '';
  };
  const common = (s: Json, kind: 'screenshot' | 'crash') => {
    const a = s.attributes;
    const buildId = s.relationships?.build?.data?.id ?? '';
    return {
      id: s.id, kind, created_at: a.createdDate, build_id: buildId, build: buildName(buildId), comment: a.comment ?? '', email: a.email ?? '',
      device: a.deviceModel ?? '', os: a.osVersion ?? '', locale: a.locale ?? '', connection: a.connectionType ?? '',
      battery: a.batteryPercentage ?? null, uptime_ms: a.appUptimeInMilliseconds ?? null, images: [] as Json[],
    };
  };
  await step('screenshot feedback', async () => {
    const { data } = await all(`/v1/apps/${APP_ID}/betaFeedbackScreenshotSubmissions?sort=-createdDate&limit=50`, 2);
    for (const s of data) {
      const row = common(s, 'screenshot');
      if (!known.has(s.id)) {
        // Copy the images now: Apple's links expire.
        for (const [i, img] of (s.attributes.screenshots ?? []).slice(0, 6).entries()) {
          const ok = await step(`screenshot ${s.id}`, async () => {
            const res = await fetch(img.url, { signal: AbortSignal.timeout(20000) });
            if (!res.ok) throw new Error(`image ${res.status}`);
            const type = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
            const path = `${s.id}/${i}.${type === 'image/png' ? 'png' : 'jpg'}`;
            const { error } = await db.storage.from(BUCKET).upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
            if (error) throw error;
            return { path, w: img.width ?? null, h: img.height ?? null };
          });
          if (ok) row.images.push(ok);
        }
      }
      feedback.push(row);
    }
  });
  await step('crash feedback', async () => {
    const { data } = await all(`/v1/apps/${APP_ID}/betaFeedbackCrashSubmissions?sort=-createdDate&limit=50`, 2);
    feedback.push(...data.map((s) => common(s, 'crash')));
  });

  // Leave out what could not be read (undefined drops from the JSON), so the last good copy is kept.
  return { ok: errors.length === 0, app: app ?? undefined, groups, builds, points, feedback, errors };
}

// ---------- Entry ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'POST only' });

  // Who is asking: the scheduler (secret from Vault) or a signed-in admin.
  let trigger: 'schedule' | 'manual';
  const secret = req.headers.get('x-sync-secret');
  if (secret) {
    const { data } = await db.rpc('appstore_check_secret', { p_secret: secret });
    if (data !== true) return reply(req, 401, { error: 'bad secret' });
    trigger = 'schedule';
  } else {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return reply(req, 401, { error: 'sign in first' });
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data } = await asUser.rpc('appstore_is_admin');
    if (data !== true) return reply(req, 403, { error: 'not allowed' });
    trigger = 'manual';
  }

  const configured = ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY'].every((k) => Deno.env.get(k));
  const { data: begin, error: beginError } = await db.rpc('appstore_begin', { p_trigger: trigger });
  if (beginError) return reply(req, 500, { error: beginError.message });
  if (!begin?.run) return reply(req, 429, { error: 'A sync ran less than a minute ago. Try again shortly.' });

  if (!configured) {
    const errors = [{ step: 'config', message: 'The App Store Connect API key is not set up yet.' }];
    await db.rpc('appstore_save', { p_run: begin.run, p: { ok: false, calls: 0, error: errors[0].message, errors } });
    return reply(req, 200, { ok: false, configured: false, errors });
  }

  calls = 0;
  try {
    const r = await sync(new Set<string>(begin.known ?? []));
    const error = r.errors.map((e) => `${e.step}: ${e.message}`).join('; ');
    const { error: saveError } = await db.rpc('appstore_save', { p_run: begin.run, p: { ...r, calls, error } });
    if (saveError) throw saveError;
    return reply(req, 200, { ok: r.ok, configured: true, calls, points: r.points.length, feedback: r.feedback.length, errors: r.errors });
  } catch (e) {
    const message = e instanceof AppleError && (e.status === 401 || e.status === 403)
      ? 'Apple refused the API key. Check the key ID, issuer ID and the .p8 file, and that the key has not been revoked.'
      : (e instanceof Error ? e.message : String(e));
    await db.rpc('appstore_save', { p_run: begin.run, p: { ok: false, calls, error: message, errors: [{ step: 'sync', message }] } });
    return reply(req, 200, { ok: false, configured: true, errors: [{ step: 'sync', message }] });
  }
});
