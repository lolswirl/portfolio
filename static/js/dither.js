// dithered spotify covers
(function () {
    // 4x4 bayer order, for the dither and the dissolve
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    // dots across the 56px cover
    var GRID = 37;
    var STEP_MS = 20;
    var covers = [];
    var lastAccent = null;

    function accent() {
        return getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim();
    }

    function render(c) {
        var ctx = c.canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(c.img, 0, 0, GRID, GRID);
        c.colors = ctx.getImageData(0, 0, GRID, GRID).data;

        var light = new Float32Array(GRID * GRID);
        for (var p = 0; p < light.length; p++) {
            var i = p * 4;
            light[p] = (0.299 * c.colors[i] + 0.587 * c.colors[i + 1] + 0.114 * c.colors[i + 2]) / 255;
        }

        // stretch contrast between percentiles, so small bright text can't flatten the rest
        var sorted = light.slice().sort();
        var min = sorted[Math.floor(sorted.length * 0.02)];
        var max = sorted[Math.floor(sorted.length * 0.98)];

        // dots stand for light on a dark page and for dark on a light one
        var darkPage = document.documentElement.classList.contains("dark");

        var hex = accent().slice(1);
        var ink = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
        c.ink = new Uint8ClampedArray(c.colors.length);
        for (var y = 0; y < GRID; y++) {
            for (var x = 0; x < GRID; x++) {
                var q = y * GRID + x;
                var level = (light[q] - min) / (max - min || 1);
                if (darkPage) level = 1 - level;
                if (level <(BAYER[(y % 4) * 4 + x % 4] + 0.5) / 16) c.ink.set(ink, q * 4);
            }
        }
        paint(c);
    }

    // bayer slots below the step show the real color, while the remaining dots fade out, so the
    // change shows even where a dot and the color under it are equally bright
    function paint(c) {
        var frame = new ImageData(GRID, GRID);
        var fade = 1 - c.step / 16;
        for (var y = 0; y < GRID; y++) {
            for (var x = 0; x < GRID; x++) {
                var i = (y * GRID + x) * 4;
                if (BAYER[(y % 4) * 4 + x % 4] < c.step) {
                    frame.data.set(c.colors.subarray(i, i + 4), i);
                } else {
                    frame.data.set(c.ink.subarray(i, i + 3), i);
                    frame.data[i + 3] = c.ink[i + 3] * fade;
                }
            }
        }
        c.canvas.getContext("2d").putImageData(frame, 0, 0);
        c.el.classList.toggle("sharp", c.step === 16);
    }

    function animate(c, target) {
        clearInterval(c.timer);
        if (!c.colors || c.step === target) return;
        c.timer = setInterval(function () {
            c.step += c.step < target ? 1 : -1;
            paint(c);
            if (c.step === target) clearInterval(c.timer);
        }, STEP_MS);
    }

    window.ditherCover = function (src, large) {
        var el = document.createElement("span");
        el.className = "dither-cover";
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = GRID;
        var art = document.createElement("img");
        art.alt = "";
        art.crossOrigin = "anonymous";
        el.append(canvas, art);

        var c = { el: el, canvas: canvas, step: 0, timer: null };
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
            c.img = img;
            art.src = img.src;
            render(c);
            covers.push(c);
        };
        img.src = large || src;

        el.addEventListener("mouseenter", function () { animate(c, 16); });
        el.addEventListener("mouseleave", function () { animate(c, 0); });
        return el;
    };

    // redraw in the new accent on theme change
    new MutationObserver(function () {
        if (accent() === lastAccent) return;
        lastAccent = accent();
        covers.forEach(render);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    lastAccent = accent();
})();
