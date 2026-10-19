// spotify now playing and most played, using SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN

const CACHE_SECONDS = 15;

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

// short is 4 weeks, medium 6 months, and long 1 year
async function getTop(headers, type, range) {
    const top = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${range}_term&limit=5`, { headers });
    if (!top.ok) return [];
    const items = (await top.json()).items ?? [];
    return type === "artists" ? items.map((a) => ({ name: a.name, url: a.external_urls.spotify })) : items.map(toTrack);
}

const RANGES = ["short", "medium", "long"];

async function lookup(env) {
    const token = await getAccessToken(env);
    const headers = { Authorization: `Bearer ${token}` };
    const [now, artists, tracks] = await Promise.all([
        getNow(headers),
        Promise.all(RANGES.map((range) => getTop(headers, "artists", range))),
        Promise.all(RANGES.map((range) => getTop(headers, "tracks", range))),
    ]);
    const byRange = (lists) => Object.fromEntries(RANGES.map((range, i) => [range, lists[i]]));
    // "on repeat" is the most played track of the short range
    return { now, onRepeat: tracks[0][0] ?? null, topArtists: byRange(artists), topTracks: byRange(tracks) };
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
    // every visitor polls, so share one spotify lookup across them for a few seconds
    const cache = caches.default;
    const key = new Request(new URL("/api/now-playing", request.url));
    const cached = await cache.match(key);
    if (cached) return allowLocalhost(request, cached);

    let body;
    try {
        body = await lookup(env);
    } catch {
        return allowLocalhost(request, Response.json(null, { status: 502 }));
    }

    const res = Response.json(body, { headers: { "Cache-Control": `public, max-age=${CACHE_SECONDS}` } });
    waitUntil(cache.put(key, res.clone()));
    return allowLocalhost(request, res);
}
