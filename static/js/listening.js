// spotify lines from functions/api/now-playing.js, hidden until there's data
(function () {
    function fill(row, track) {
        if (!track) return;
        var title = row.querySelector(".listening-title");
        title.textContent = track.title;
        title.href = track.url;
        row.querySelector(".listening-artist").textContent = track.artist;
        var cover = row.querySelector(".listening-cover");
        if (cover) {
            cover.hidden = !track.image;
            if (track.image) cover.src = track.image;
        }
        row.hidden = false;
    }

    // each keyed by range (short, medium, or long)
    var top = { artists: null, songs: null };

    function link(text, url) {
        var a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = text;
        return a;
    }

    // one picker drives every list in its group
    function renderGroup(group) {
        var picked = group.querySelector(".range-picker [aria-pressed='true']");
        var range = picked ? picked.dataset.range : "short";
        var shown = false;
        group.querySelectorAll(".top-list").forEach(function (row) { shown = renderTop(row, range) || shown; });
        if (shown) group.hidden = false;
    }

    function renderTop(row, range) {
        var lists = top[row.dataset.kind];
        var items = lists && lists[range];
        if (!items || !items.length) return false;
        var out = row.querySelector(".top-list-items");
        out.replaceChildren();
        items.forEach(function (item, i) {
            if (row.dataset.kind === "artists") {
                out.append(i ? ", " : "", link(item.name, item.url));
            } else {
                var line = document.createElement("span");
                line.className = "top-song";
                var artist = document.createElement("span");
                artist.className = "listening-artist";
                artist.textContent = item.artist;
                line.append(link(item.title, item.url), " ", artist);
                out.append(line);
            }
        });
        return true;
    }

    document.querySelectorAll(".top-lists .range-picker button").forEach(function (button) {
        button.addEventListener("click", function () {
            var group = button.closest(".top-lists");
            group.querySelectorAll(".range-picker button").forEach(function (b) {
                b.setAttribute("aria-pressed", b === button);
            });
            renderGroup(group);
        });
    });

    // `zola serve` can't run pages functions, so locally fall back to `wrangler pages dev` on 8788
    var LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
    var endpoint = "/api/now-playing";

    function request() {
        return fetch(endpoint).then(function (res) {
            if (res.status === 404 && LOCAL && endpoint.charAt(0) === "/") {
                endpoint = "http://127.0.0.1:8788/api/now-playing";
                return fetch(endpoint);
            }
            return res;
        });
    }

    function update() {
        if (document.hidden) return;
        request()
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (!data) return;
                var now = data.now;
                document.querySelectorAll(".listening").forEach(function (row) {
                    if (!now) return;
                    row.querySelector(".now-label").textContent = now.isPlaying ? "listening" : "last played";
                    fill(row, now);
                });
                // oscilloscope.js reacts to the beat while this is set
                document.documentElement.classList.toggle("music-playing", !!(now && now.isPlaying));
                document.querySelectorAll(".on-repeat").forEach(function (row) { fill(row, data.onRepeat); });
                top.artists = data.topArtists || null;
                top.songs = data.topTracks || null;
                document.querySelectorAll(".top-lists").forEach(renderGroup);
            })
            .catch(function () {});
    }

    update();
    setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
})();
