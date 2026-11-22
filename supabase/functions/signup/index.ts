// Launch list sign-ups from sleepmoore.app (src/components/GetApp.astro). Stores the email through
// public.launch_signup, which only the service role may call. Deploy with verify_jwt off: the site
// sends no token. Only the site's own origin is accepted, and a hidden field catches simple bots.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const ORIGIN = /^https:\/\/(www\.)?sleepmoore\.app$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors = {
    'access-control-allow-origin': ORIGIN.test(origin) ? origin : 'https://sleepmoore.app',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
  const reply = (status: number, result: string) => new Response(JSON.stringify({ result }), { status, headers: { ...cors, 'content-type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST' || !ORIGIN.test(origin)) return reply(403, 'forbidden');
  const text = await req.text();
  if (text.length > 2000) return reply(413, 'too large');
  let body: { email?: string; platform?: string; source?: string; website?: string };
  try { body = JSON.parse(text); } catch { return reply(400, 'invalid'); }
  // The hidden "website" field is empty for people; bots fill it in. Pretend it worked.
  if (body.website) return reply(200, 'ok');
  const { data, error } = await db.rpc('launch_signup', { p_email: body.email ?? '', p_platform: body.platform ?? 'iphone', p_source: body.source ?? '' });
  if (error) return reply(500, 'error');
  return reply(data === 'ok' ? 200 : 400, String(data));
});
