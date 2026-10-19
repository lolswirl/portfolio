// spotify data from functions/api/now-playing.js
(function () {
    function fill(row, track) {
        if (!track) return;
        var title = row.querySelector(".listening-title");
        title.textContent = track.title;
        title.href = track.url;
        row.querySelector(".listening-artist").textContent = track.artist;
        // only rebuilt when the song changes
        var cover = row.querySelector(".listening-cover");
        if (track.image && cover.dataset.src !== track.image) {
            var fresh = ditherCover(track.image, track.imageLarge);
            fresh.classList.add("listening-cover");
            fresh.dataset.src = track.image;
            cover.replaceWith(fresh);
        }
        row.hidden = false;
    }

    // each keyed by range (short, medium, or long)
    var top = { artists: null, songs: null, genres: null, stats: null };

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

    // reused across polls and range switches
    var artistCovers = {};

    function artistCover(artist) {
        if (!artist.image) {
            var empty = document.createElement("span");
            empty.className = "dither-cover";
            return empty;
        }
        artistCovers[artist.image] = artistCovers[artist.image] || ditherCover(artist.image, artist.imageLarge);
        return artistCovers[artist.image];
    }

    // one renderer per kind of row
    var renderers = {
        artists: function (out, range) {
            var items = top.artists && top.artists[range];
            if (!items || !items.length) return false;
            items.forEach(function (artist) {
                var card = document.createElement("span");
                card.className = "top-artist";
                card.append(artistCover(artist), link(artist.name, artist.url));
                out.append(card);
            });
            return true;
        },
        songs: function (out, range) {
            var items = top.songs && top.songs[range];
            if (!items || !items.length) return false;
            items.forEach(function (song) {
                var line = document.createElement("span");
                line.className = "top-song";
                var artist = document.createElement("span");
                artist.className = "listening-artist";
                artist.textContent = song.artist;
                line.append(link(song.title, song.url), " ", artist);
                out.append(line);
            });
            return true;
        },
        // genres as #tags
        genres: function (out, range) {
            var genres = top.genres && top.genres[range];
            if (!genres || !genres.length) return false;
            genres.forEach(function (genre) {
                var tag = document.createElement("span");
                tag.className = "tag genre";
                tag.textContent = genre.replace(/ /g, "-");
                out.append(tag);
            });
            return true;
        },
        popularity: function (out, range) {
            var stats = top.stats && top.stats[range];
            if (!stats || stats.popularity === null) return false;
            var bar = document.createElement("span");
            bar.className = "popularity-bar";
            var fill = document.createElement("span");
            fill.style.width = stats.popularity + "%";
            bar.append(fill);
            out.append(bar, stats.popularity + " / 100 on average");
            return true;
        },
        years: function (out, range) {
            var stats = top.stats && top.stats[range];
            if (!stats || !stats.years) return false;
            out.textContent = stats.years[0] === stats.years[1] ? String(stats.years[0]) : stats.years[0] + " to " + stats.years[1];
            return true;
        },
    };

    function renderTop(row, range) {
        var out = row.querySelector(".top-list-items");
        out.replaceChildren();
        var shown = renderers[row.dataset.kind](out, range);
        row.hidden = !shown;
        return shown;
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
                top.genres = data.topGenres || null;
                top.stats = data.topStats || null;
                document.querySelectorAll(".top-lists").forEach(renderGroup);
                document.querySelectorAll(".saved-songs").forEach(function (row) {
                    if (typeof data.savedSongs !== "number") return;
                    row.querySelector(".saved-count").textContent = data.savedSongs.toLocaleString();
                    row.hidden = false;
                });
            })
            .catch(function () {});
    }

    update();
    setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
})();
