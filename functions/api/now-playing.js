// spotify now playing and most played

const CACHE_SECONDS = 15;
const TOP_SECONDS = 6 * 60 * 60;
const LAST_GOOD_SECONDS = 7 * 24 * 60 * 60;

async function getAccessToken(env) {
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: "Basic " + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
    });
    if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
    return (await res.json()).access_token;
}

function toTrack(item) {
    return {
        title: item.name,
        artist: item.artists.map((a) => a.name).join(", "),
        url: item.external_urls.spotify,
        image: item.album.images.at(-1)?.url ?? null,
        imageLarge: item.album.images.at(-2)?.url ?? null,
    };
}

async function getNow(headers) {
    // spotify answers 204 when nothing is playing, and podcasts and ads come without a track item
    const current = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers });
    if (current.status === 200) {
        const data = await current.json();
        if (data.item && data.currently_playing_type === "track") {
            return { ...toTrack(data.item), isPlaying: data.is_playing };
        }
    }

    const recent = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers });
    if (!recent.ok) return null;
    const last = (await recent.json()).items?.[0];
    return last ? { ...toTrack(last.track), isPlaying: false } : null;
}

// short is 4 weeks, medium 6 months, long 1 year. 20 per list feeds the genres and averages
async function getTop(headers, type, range) {
    const top = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${range}_term&limit=20`, { headers });
    if (!top.ok) throw new Error(`top ${type} failed: ${top.status}`);
    return (await top.json()).items ?? [];
}

// genres that come up most across the top artists
function topGenres(artists) {
    const counts = {};
    artists.forEach((a) => (a.genres ?? []).forEach((g) => (counts[g] = (counts[g] ?? 0) + 1)));
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 4);
}

// average popularity (0-100) and release year span
function trackStats(tracks) {
    const popularity = tracks.map((t) => t.popularity).filter((p) => typeof p === "number");
    const years = tracks.map((t) => parseInt(t.album?.release_date, 10)).filter((y) => y > 0);
    return {
        popularity: popularity.length ? Math.round(popularity.reduce((a, b) => a + b, 0) / popularity.length) : null,
        years: years.length ? [Math.min(...years), Math.max(...years)] : null,
    };
}

const RANGES = ["short", "medium", "long"];

async function getTopLists(headers) {
    const [artists, tracks] = await Promise.all([
        Promise.all(RANGES.map((range) => getTop(headers, "artists", range))),
        Promise.all(RANGES.map((range) => getTop(headers, "tracks", range))),
    ]);
    const byRange = (fn) => Object.fromEntries(RANGES.map((range, i) => [range, fn(i)]));
    return {
        // "on repeat" is the most played track of the short range
        onRepeat: tracks[0][0] ? toTrack(tracks[0][0]) : null,
        topArtists: byRange((i) => artists[i].slice(0, 5).map((a) => ({ name: a.name, url: a.external_urls.spotify, image: a.images?.at(-1)?.url ?? null, imageLarge: a.images?.at(-2)?.url ?? null }))),
        topTracks: byRange((i) => tracks[i].slice(0, 5).map(toTrack)),
        topGenres: byRange((i) => topGenres(artists[i])),
        topStats: byRange((i) => trackStats(tracks[i])),
        savedSongs: await getSavedCount(headers),
    };
}

// total liked songs (needs the user-library-read scope)
async function getSavedCount(headers) {
    const saved = await fetch("https://api.spotify.com/v1/me/tracks?limit=1", { headers });
    return saved.ok ? (await saved.json()).total ?? null : null;
}

// top lists are cached for hours, falling back to the last good copy when spotify refuses
async function cachedTopLists(request, getHeaders, waitUntil) {
    const cache = caches.default;
    const fresh = new Request(new URL("/api/now-playing/top", request.url));
    const lastGood = new Request(new URL("/api/now-playing/top-last", request.url));
    const hit = await cache.match(fresh);
    if (hit) return hit.json();

    try {
        const lists = await getTopLists(await getHeaders());
        waitUntil(cache.put(fresh, Response.json(lists, { headers: { "Cache-Control": `public, max-age=${TOP_SECONDS}` } })));
        waitUntil(cache.put(lastGood, Response.json(lists, { headers: { "Cache-Control": `public, max-age=${LAST_GOOD_SECONDS}` } })));
        return lists;
    } catch {
        const stale = await cache.match(lastGood);
        return stale ? stale.json() : {};
    }
}

async function lookup(request, env, waitUntil) {
    // the token is only fetched if something actually needs spotify
    let headers = null;
    const getHeaders = async () => headers ??= { Authorization: `Bearer ${await getAccessToken(env)}` };
    const [now, top] = await Promise.all([getHeaders().then(getNow), cachedTopLists(request, getHeaders, waitUntil)]);
    return { now, ...top };
}

// lets `zola serve` on localhost read this from `wrangler pages dev` on another port
function allowLocalhost(request, res) {
    const origin = request.headers.get("Origin");
    if (!origin || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return res;
    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", origin);
    return new Response(res.body, { status: res.status, headers });
}

export async function onRequestGet({ request, env, waitUntil }) {
    // one spotify lookup shared across visitors for a few seconds
    const cache = caches.default;
    const key = new Request(new URL("/api/now-playing", request.url));
    const cached = await cache.match(key);
    if (cached) return allowLocalhost(request, cached);

    let body;
    try {
        body = await lookup(request, env, waitUntil);
    } catch {
        return allowLocalhost(request, Response.json(null, { status: 502 }));
    }

    const res = Response.json(body, { headers: { "Cache-Control": `public, max-age=${CACHE_SECONDS}` } });
    waitUntil(cache.put(key, res.clone()));
    return allowLocalhost(request, res);
}
