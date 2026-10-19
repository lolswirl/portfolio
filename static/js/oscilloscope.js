// homepage oscilloscope: drifting sine waves or a damped vibrating string
(function () {
    var canvas = document.querySelector(".oscilloscope");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    var BPM = 124;
    var BEAT_PERIOD = 120 / BPM; // seconds between beats
    var PULL_RADIUS = 60; // how far along the line the cursor's pull reaches
    var W = 0, H = 0, frame = null, prevTime = 0;
    var pointer = { x: 0, y: 0, over: false, pull: 0, lastX: 0, lastTime: 0, lastPluck: 0 };

    function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
    function noise(x) { var i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return hash(i) + (hash(i + 1) - hash(i)) * s; }
    function playing() { return root.classList.contains("music-playing"); }
    function mode() {
        var m = root.dataset.oscilloscopeMode;
        return m === "string" || m === "off" ? m : "wave";
    }

    // ---- layered sine waves with wandering speed and height ------------------------------------
    var wave = (function () {
        var AMP = 18; // wave height in px
        var BEAT_SPEED = 500; // px per second a beat ripples outward
        var PLUCK_ROUND = 20; // px over which a pluck's peak is rounded off
        var plucks = [];

        // wave number (rad/px), base speed (rad/s), and weight
        var layers = [
            { k: 0.03, speed: 3.3, weight: 0.6, phase: 0 },
            { k: 0.075, speed: -5.9, weight: 0.3, phase: 0 },
            { k: 0.17, speed: 11, weight: 0.1, phase: 0 },
        ];

        // 0..1 for the strongest beat ripple at x
        function beatAt(x, t) {
            var k = Math.floor(t / BEAT_PERIOD), strongest = 0;
            for (var n = k - Math.ceil(W / BEAT_SPEED / BEAT_PERIOD) - 1; n <= k; n++) {
                var since = t - n * BEAT_PERIOD - Math.abs(x - hash(n + 0.5) * W) / BEAT_SPEED;
                if (since < -BEAT_PERIOD / 4 || since > BEAT_PERIOD / 4) continue;
                strongest = Math.max(strongest, Math.pow(Math.cos(since * 2 * Math.PI / BEAT_PERIOD), 6));
            }
            return strongest;
        }

        return {
            reset: function () { plucks = []; },
            pluck: function (x, strength) {
                plucks.push({ x: x, born: performance.now() / 1000, strength: strength });
                if (plucks.length > 8) plucks.shift();
            },
            step: function (t, dt) {
                layers.forEach(function (layer, i) {
                    layer.phase += layer.speed * (0.65 + 0.7 * noise(t * 0.12 + i * 17)) * dt;
                });
                plucks = plucks.filter(function (p) { return t - p.born < 2.5; });
            },
            // displacement from the center line at x, in px
            at: function (x, t) {
                var w = 0;
                for (var i = 0; i < layers.length; i++) w += Math.sin(x * layers[i].k + layers[i].phase) * layers[i].weight;
                // slow noise varies the height along the line
                var height = 0.25 + 1.15 * noise(x * 0.0045 + t * 0.18) * (0.6 + 0.4 * noise(x * 0.011 - t * 0.27 + 40));
                var amp = playing() ? 0.5 + 0.5 * beatAt(x, t) : 0.7;
                var y = Math.sin(Math.PI * x / W) * amp * AMP * height * w;

                var dx = x - pointer.x;
                y += (pointer.y - H / 2) * 0.6 * pointer.pull * Math.exp(-dx * dx / (2 * PULL_RADIUS * PULL_RADIUS));

                plucks.forEach(function (p) {
                    // √(d^2 + w^2) − w rounds off the sharp corner |x − x₀| would leave under the click
                    var dx = x - p.x, d = Math.sqrt(dx * dx + PLUCK_ROUND * PLUCK_ROUND) - PLUCK_ROUND, age = t - p.born;
                    y += p.strength * Math.exp(-age * 1.8) * Math.exp(-d / 260) * Math.sin(d * 0.06 - age * 14);
                });
                return y;
            },
        };
    })();

    // ---- a string, from the damped and driven wave equation ------------------------------------
    //
    //   ∂^2y/∂t^2 = c^2 ∂^2y/∂x^2 − γ ∂y/∂t + f(x, t)
    //
    // y is displacement (px), c the wave speed (px/s), γ the damping rate (1/s), and f the applied
    // force per unit mass (px/s^2). it's solved with central differences in space and time (leapfrog),
    // which is stable while the courant number c·Δt/Δx stays ≤ 1. the ends are fixed (y = 0), so
    // pulses reflect inverted, and everything superposes linearly.
    var string = (function () {
        var DX = 4; // node spacing, px
        var C = 520; // wave speed, px/s
        var GAMMA = 0.7; // damping rate, 1/s (amplitude decays as e^(−γt/2))
        // substep, s. for the 1d wave equation leapfrog is exact at courant number 1 and disperses
        // short wavelengths (jagged trails) as it drops, so run just under the limit, at 0.95
        var DT = 0.95 * DX / C;
        var STIFFNESS = 900; // cursor spring constant per unit mass, 1/s^2
        var SIGMA = 28; // width of a pluck, px
        var MODES = [6, 5, 4, 3, 2]; // target amplitudes (px) of normal modes 1..5 for the idle sway
        var n = 0, y, yPrev, yNext, force, carry = 0, lastBeat = -1, simTime = 0;
        var shapes = [], omegas = [], drive = new Float32Array(MODES.length);

        // idle motion comes from driving the string's normal modes at resonance. mode m has shape
        // sin(mπx/L), and on this grid its angular frequency follows the discrete dispersion relation
        //   ω_m = (2/Δt)·asin(courant · sin(mπΔx / 2L))
        // a damped oscillator driven at resonance by F·cos(ωt) settles at amplitude F/(γω), so the
        // drive needed for amplitude Y is F = Y·γ·ω. targets drift slowly, so the shape keeps morphing
        function setupModes() {
            var length = (n - 1) * DX, courant = C * DT / DX;
            shapes = [];
            omegas = [];
            for (var m = 1; m <= MODES.length; m++) {
                var shape = new Float32Array(n);
                for (var i = 0; i < n; i++) shape[i] = Math.sin(m * Math.PI * i * DX / length);
                shapes.push(shape);
                omegas.push((2 / DT) * Math.asin(courant * Math.sin(m * Math.PI * DX / (2 * length))));
            }
        }

        // F_m·cos(ω_m t + φ_m) for each mode at the current time
        function updateDrive() {
            for (var m = 0; m < MODES.length; m++) {
                var target = MODES[m] * (0.35 + 0.65 * noise(simTime * 0.04 + m * 13));
                drive[m] = target * GAMMA * omegas[m] * Math.cos(omegas[m] * simTime + m * 1.7);
            }
        }

        // a pluck pulls the string aside and lets go: displacement Δy(x) = A·exp(−(x − x₀)^2 / 2σ^2) with
        // zero velocity, added to both time levels so (y − y_prev)/Δt stays unchanged. by d'alembert,
        // y(x, t) = (1/2)[y₀(x − ct) + y₀(x + ct)], it splits into two bumps of height A/2 moving apart
        function pluckAt(x0, amplitude) {
            for (var i = 1; i < n - 1; i++) {
                var d = i * DX - x0, dy = amplitude * Math.exp(-d * d / (2 * SIGMA * SIGMA));
                y[i] += dy;
                yPrev[i] += dy;
            }
        }

        function substep() {
            var courant2 = Math.pow(C * DT / DX, 2);
            // the cursor acts as a spring toward its height, spread over nearby nodes:
            // f = k·(y_cursor − y)·exp(−(x − x_cursor)^2 / 2r^2)
            var target = (pointer.y - H / 2) * 0.6;
            updateDrive();
            for (var i = 1; i < n - 1; i++) {
                var d = i * DX - pointer.x;
                force[i] = STIFFNESS * pointer.pull * (target - y[i]) * Math.exp(-d * d / (2 * PULL_RADIUS * PULL_RADIUS));
                for (var m = 0; m < MODES.length; m++) force[i] += drive[m] * shapes[m][i];
            }
            // y_next = 2y − y_prev + C^2(y[i+1] − 2y[i] + y[i−1]) − γΔt(y − y_prev) + Δt^2·f
            for (i = 1; i < n - 1; i++) {
                var laplacian = y[i + 1] - 2 * y[i] + y[i - 1];
                yNext[i] = 2 * y[i] - yPrev[i] + courant2 * laplacian - GAMMA * DT * (y[i] - yPrev[i]) + DT * DT * force[i];
            }
            // rotate the three time levels instead of allocating
            var oldest = yPrev;
            yPrev = y;
            y = yNext;
            yNext = oldest;
            simTime += DT;
        }

        return {
            reset: function () {
                n = Math.max(3, Math.floor(W / DX) + 1);
                y = new Float32Array(n);
                yPrev = new Float32Array(n);
                yNext = new Float32Array(n);
                force = new Float32Array(n);
                carry = 0;
                setupModes();
            },
            // strength is the pull in px
            pluck: function (x, strength) { pluckAt(x, strength * (Math.random() < 0.5 ? -1 : 1)); },
            step: function (t, dt) {
                // while music plays, each beat plucks a random spot
                var beat = Math.floor(t / BEAT_PERIOD);
                if (playing() && beat !== lastBeat) this.pluck(Math.random() * W, 10);
                lastBeat = beat;
                // fixed substeps keep the courant number constant whatever the frame rate
                carry += dt;
                while (carry >= DT) { substep(); carry -= DT; }
            },
            // catmull-rom spline through the nodes, so the drawn line is smooth between them
            at: function (x) {
                var f = x / DX, i = Math.min(n - 2, Math.floor(f)), u = f - i;
                var p0 = y[Math.max(0, i - 1)], p1 = y[i], p2 = y[i + 1], p3 = y[Math.min(n - 1, i + 2)];
                return p1 + 0.5 * u * (p2 - p0 + u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0)));
            },
        };
    })();

    var engines = { wave: wave, string: string };

    function resize() {
        var dpr = window.devicePixelRatio || 1;
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        wave.reset();
        string.reset();
    }

    function draw(now) {
        var t = now / 1000, dt = Math.min(0.05, t - (prevTime || t));
        prevTime = t;
        var engine = engines[mode()] || wave;
        pointer.pull += ((pointer.over ? 1 : 0) - pointer.pull) * 0.15;
        // occasional random twitch
        if (engine === wave && Math.random() < dt * 0.25) wave.pluck(Math.random() * W, 3 + Math.random() * 3);
        engine.step(t, dt);

        var color = getComputedStyle(root).getPropertyValue("--primary-color").trim();
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // tanh eases big swings toward the edge instead of flattening them against it
        var limit = H / 2 - 4;
        for (var x = 0; x <= W; x += 2) {
            var y = H / 2 + limit * Math.tanh(engine.at(x, t) / limit);
            if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
        frame = reduceMotion.matches ? null : requestAnimationFrame(draw);
    }

    function local(e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    canvas.addEventListener("pointermove", function (e) {
        var p = local(e), now = performance.now();
        pointer.over = true;
        // a fast sweep plucks lightly
        var speed = Math.abs(p.x - pointer.lastX) / Math.max(1, now - pointer.lastTime) * 1000;
        if (speed > 1400 && now - pointer.lastPluck > 120) { engines[mode()].pluck(p.x, 6); pointer.lastPluck = now; }
        pointer.x = p.x; pointer.y = p.y; pointer.lastX = p.x; pointer.lastTime = now;
    });
    canvas.addEventListener("pointerleave", function () { pointer.over = false; });
    canvas.addEventListener("pointerdown", function (e) {
        if (!reduceMotion.matches) engines[mode()].pluck(local(e).x, 14);
    });

    function start() {
        if (mode() === "off") return;
        resize();
        if (!frame) draw(performance.now());
    }

    function stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = null;
    }

    window.addEventListener("resize", start);

    // nav button cycles wave -> string -> off
    var toggle = document.querySelector(".oscilloscope-toggle");
    if (toggle) {
        toggle.addEventListener("click", function () {
            var next = { wave: "string", string: "off", off: "wave" }[mode()] || "wave";
            root.dataset.oscilloscopeMode = next;
            try { localStorage.setItem("oscilloscope", next); } catch (e) {}
            if (next === "off") stop(); else start();
        });
    }

    start();
})();
