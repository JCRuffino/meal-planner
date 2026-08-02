/* Recipe fetcher for the Meal Planner.
 *
 * Two jobs, both things a browser can't do on its own:
 *
 *   GET  /?url=https://example.com/a-recipe
 *        Fetches the page and pulls out its schema.org/Recipe JSON-LD.
 *        Same-origin policy stops the browser reading another site directly.
 *        -> { name, ingredients: [], method: [], servings, cookTime }
 *
 *   POST /ocr   (body: the image bytes)
 *        Reads a screenshot — an Instagram caption, say — through a vision
 *        model and returns the same shape. Needs an AI binding; see README.
 *        -> { name, ingredients: [], method: [] }
 *
 * Errors come back as { error: "..." } with a 4xx/5xx.
 *
 * Deploy to Cloudflare Workers (see README), then put the URL into config.js
 * as `recipeFetcher`. Until that's set the app hides both buttons and
 * everything still works by pasting.
 */

/* Only these origins may call the worker. Without this it's a free open proxy
   — and a free AI endpoint — for anyone who finds the URL. */
const ALLOWED_ORIGINS = [
  'https://jcruffino.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const OCR_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

const OCR_PROMPT = `This image is a screenshot of a recipe posted on social media.

Reply with ONLY a JSON object and nothing else. No explanation, no markdown code fences. Use exactly these keys:

{"name": "", "ingredients": [], "method": []}

- "name": the dish name if the post gives one, otherwise "".
- "ingredients": every ingredient as its own string. Where the post runs them together on one line separated by commas, split them into separate entries. Keep quantities exactly as written. Do not invent quantities that are not there.
- "method": the cooking steps, one per entry. If the post has no method, use [].

Transcribe only what the image actually says. Do not add ingredients or steps of your own.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed) return json({ error: 'Not an allowed origin.' }, 403, cors);

    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    if (path === '/ocr') return readScreenshot(request, env, cors);
    return readLink(request, cors);
  },
};

/* --- GET /?url= : read a recipe page ------------------------------------ */

async function readLink(request, cors) {
  if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405, cors);

  const target = new URL(request.url).searchParams.get('url');
  if (!target) return json({ error: 'Pass ?url=' }, 400, cors);

  let u;
  try { u = new URL(target); } catch { return json({ error: "That doesn't look like a URL." }, 400, cors); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:')
    return json({ error: 'Only http and https links.' }, 400, cors);
  /* Belt and braces: Workers can't reach private networks anyway, but no
     reason to let this be pointed at loopback or link-local addresses. */
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i.test(u.hostname))
    return json({ error: 'Not a public address.' }, 400, cors);

  let html;
  try {
    const res = await fetch(u.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MealPlanner/1.0; +https://jcruffino.github.io/meal-planner/)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) return json({ error: `That site returned ${res.status}.` }, 502, cors);
    html = await res.text();
  } catch {
    return json({ error: "Couldn't reach that page." }, 502, cors);
  }

  const recipe = findRecipe(html);
  if (!recipe) return json({ error: "That page doesn't publish recipe data." }, 404, cors);
  return json(shape(recipe), 200, cors);
}

/* --- POST /ocr : read a screenshot --------------------------------------- */

async function readScreenshot(request, env, cors) {
  if (request.method !== 'POST') return json({ error: 'POST an image to /ocr.' }, 405, cors);
  if (!env || !env.AI)
    return json({ error: 'This worker has no AI binding yet — add one in Settings, Bindings.' }, 500, cors);

  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'No image arrived.' }, 400, cors);
  if (buf.byteLength > 4_000_000)
    return json({ error: 'That image is too big. Under 4MB, please.' }, 413, cors);

  let out;
  try {
    out = await env.AI.run(OCR_MODEL, {
      image: [...new Uint8Array(buf)],
      prompt: OCR_PROMPT,
      max_tokens: 1500,
    });
  } catch (e) {
    return json({ error: 'The reader failed: ' + (e.message || 'AI error') }, 502, cors);
  }

  const raw = (out && (out.response ?? out.description ?? out.text)) || '';
  const parsed = looseJson(raw);
  if (!parsed)
    return json({ error: "Couldn't make sense of that screenshot.", raw: String(raw).slice(0, 300) }, 422, cors);

  return json({
    name: typeof parsed.name === 'string' ? clean(parsed.name) : '',
    ingredients: list(parsed.ingredients),
    method: list(parsed.method),
  }, 200, cors);
}

/* Models like to wrap JSON in prose or code fences however firmly you ask. */
function looseJson(s) {
  const t = String(s).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* give up */ } }
  return null;
}

/* --- shared -------------------------------------------------------------- */

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

function findRecipe(html) {
  /* Built fresh each call: a module-level /g regex keeps lastIndex between
     requests and would start half way through the next page. */
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const hit = walk(data);
    if (hit) return hit;
  }
  return null;
}

function walk(node) {
  if (Array.isArray(node)) {
    for (const n of node) { const hit = walk(n); if (hit) return hit; }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const t = node['@type'];
  if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return node;
  if (node['@graph']) return walk(node['@graph']);
  return null;
}

function shape(r) {
  return {
    name: one(r.name),
    ingredients: list(r.recipeIngredient || r.ingredients),
    method: steps(r.recipeInstructions),
    servings: count(r.recipeYield),
    cookTime: minutes(r.totalTime) || minutes(r.cookTime) || null,
  };
}

/* Recipe sites routinely put HTML inside JSON-LD strings. */
function clean(s) {
  return String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function one(v) {
  if (v == null) return '';
  return clean(Array.isArray(v) ? v[0] : v);
}

function list(v) {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v])
    .map(x => (x && typeof x === 'object') ? clean(x.text || x.name || '') : clean(x))
    .filter(Boolean);
}

/* recipeInstructions comes in at least four shapes: a single string (sometimes
   one blob, sometimes newline separated), an array of strings, an array of
   HowToStep, or HowToSections each wrapping their own steps. */
function steps(v) {
  const out = [];
  const push = n => {
    if (!n) return;
    if (typeof n === 'string') {
      n.split(/\r?\n/).map(clean).filter(Boolean).forEach(s => out.push(s));
      return;
    }
    if (Array.isArray(n)) { n.forEach(push); return; }
    if (typeof n === 'object') {
      if (n.itemListElement) { push(n.itemListElement); return; }
      const s = clean(n.text || n.name || '');
      if (s) out.push(s);
    }
  };
  push(v);
  return out;
}

/* "4", 4, "Serves 4", ["4 servings"] */
function count(v) {
  if (v == null) return null;
  const m = (Array.isArray(v) ? v.map(String).join(' ') : String(v)).match(/\d+/);
  return m ? Number(m[0]) : null;
}

/* ISO 8601 duration -> minutes. "PT35M", "PT1H30M", "P0DT45M" */
function minutes(v) {
  if (!v) return null;
  const m = String(v).match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const total = Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  return total > 0 ? total : null;
}
