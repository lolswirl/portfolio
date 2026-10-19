document.querySelector(".theme-toggle").addEventListener("click", toggleTheme);

// collapsible notes
document.querySelectorAll(".note-toggle").forEach(function (button) {
    var content = button.nextElementSibling;
    button.setAttribute("aria-expanded", content.style.display !== "none");
    button.addEventListener("click", function () {
        var open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", !open);
        content.style.display = open ? "none" : "block";
    });
});

// bold text that opens a paragraph or list item is a lead-in ("**holy paladin:** ...");
// mark it so it can take the accent color. bold mid-sentence is left alone.
document.querySelectorAll(".body p, .body li").forEach(function (el) {
    var first = Array.from(el.childNodes).find(function (n) { return n.nodeType !== 3 || n.textContent.trim(); });
    if (first && first.nodeName === "STRONG") first.classList.add("lead");
});

// bold numbers ("**3,000** hours") get the accent too, wherever they sit in a sentence
document.querySelectorAll(".body strong").forEach(function (el) {
    if (/^[\d.,%+]+$/.test(el.textContent.trim())) el.classList.add("lead");
});

// paragraphs written as "**key:** value" lines become the same key/value grid as
// the page metadata. every line has to start with a bold "key:", so ordinary
// paragraphs that merely open with bold text are left alone.
document.querySelectorAll(".body p").forEach(function (p) {
    var lines = [[]];
    p.childNodes.forEach(function (node) {
        if (node.nodeName === "BR") lines.push([]);
        else lines[lines.length - 1].push(node);
    });
    var rows = lines.map(function (nodes) {
        var content = nodes.filter(function (n) { return n.nodeType !== 3 || n.textContent.trim(); });
        var key = content[0];
        if (!key || key.nodeName !== "STRONG" || !/:$/.test(key.textContent.trim())) return null;
        return { key: key, rest: nodes.slice(nodes.indexOf(key) + 1) };
    });
    if (rows.some(function (r) { return !r; })) return;

    var grid = document.createElement("div");
    grid.className = "meta facts";
    rows.forEach(function (r) {
        var k = document.createElement("span");
        k.className = "k";
        k.textContent = r.key.textContent.trim().replace(/:$/, "");
        var v = document.createElement("span");
        v.className = "v";
        r.rest.forEach(function (n) { v.appendChild(n); });
        v.normalize();
        if (v.firstChild && v.firstChild.nodeType === 3) v.firstChild.textContent = v.firstChild.textContent.replace(/^\s+/, "");
        grid.append(k, v);
    });
    p.replaceWith(grid);
});

// every number in article text is bolded in the accent, skipping code, links, headings, and the
// metadata grids, and leaving numbers that are part of a word ("3d", "s1") alone
var NUMBER = /(^|[^\w.#])(\d+(?:[.,]\d+)*%?)(?!\w)/g;
var SKIP = "a, code, pre, strong, b, h1, h2, h3, h4, .meta, button";
var walker = document.createTreeWalker(document.querySelector(".body") || document.createElement("div"), NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
        return /\d/.test(n.textContent) && !n.parentElement.closest(SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
});
var numberNodes = [];
while (walker.nextNode()) numberNodes.push(walker.currentNode);
numberNodes.forEach(function (node) {
    var text = node.textContent, out = document.createDocumentFragment(), last = 0, match;
    NUMBER.lastIndex = 0;
    while ((match = NUMBER.exec(text))) {
        var start = match.index + match[1].length;
        out.append(text.slice(last, start));
        var strong = document.createElement("strong");
        strong.className = "lead";
        strong.textContent = match[2];
        out.append(strong);
        last = start + match[2].length;
    }
    if (!last) return;
    out.append(text.slice(last));
    node.replaceWith(out);
});

// highlight the toc entry for the section currently on screen
var tocLinks = Array.from(document.querySelectorAll(".toc a"));
if (tocLinks.length) {
    var headings = tocLinks
        .map(function (a) { return document.getElementById(decodeURIComponent(a.hash.slice(1))); })
        .filter(Boolean);

    // a heading becomes current once it passes a trigger line. the line slides from
    // near the top of the screen (page top) to near the bottom (page bottom), so even
    // short pages and short final sections pass through every heading in order.
    // a clicked toc entry wins until the reader scrolls on their own.
    var clicked = null;

    var markCurrent = function () {
        var current = headings[0];
        if (clicked) {
            current = clicked;
        } else {
            var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            var progress = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
            var line = 120 + progress * (window.innerHeight - 160);
            headings.forEach(function (h) {
                if (h.getBoundingClientRect().top < line) current = h;
            });
        }
        tocLinks.forEach(function (a) {
            a.classList.toggle("selected", decodeURIComponent(a.hash.slice(1)) === current.id);
        });
    };

    tocLinks.forEach(function (a) {
        a.addEventListener("click", function () {
            clicked = document.getElementById(decodeURIComponent(a.hash.slice(1)));
            setTimeout(markCurrent, 50);
        });
    });
    var forgetClick = function () { clicked = null; };
    document.addEventListener("wheel", forgetClick, { passive: true });
    document.addEventListener("touchmove", forgetClick, { passive: true });
    document.addEventListener("keydown", forgetClick);
    document.addEventListener("mousedown", forgetClick);
    document.addEventListener("scroll", markCurrent, { passive: true });
    markCurrent();
}

// homepage title types in like a terminal, ending on a blinking cursor
if (document.documentElement.classList.contains("typing")) {
    var title = document.querySelector(".home .page-header");
    var text = title.textContent + ".";
    var cursor = document.createElement("span");
    cursor.className = "cursor";
    var chars = Array.from(text).map(function (ch, i) {
        var span = document.createElement("span");
        span.textContent = ch;
        span.className = i === text.length - 1 ? "pending dot" : "pending";
        span.setAttribute("aria-hidden", "true");
        return span;
    });

    title.textContent = "";
    title.setAttribute("aria-label", text);
    title.classList.add("typed");
    title.append(cursor);
    chars.forEach(function (span) { title.append(span); });
    document.documentElement.classList.remove("typing");

    var typedCount = 0;
    setTimeout(function () {
        var timer = setInterval(function () {
            chars[typedCount].classList.remove("pending");
            chars[typedCount].after(cursor);
            if (++typedCount === chars.length) {
                clearInterval(timer);
                cursor.classList.add("done");
            }
        }, 40);
    }, 300);
}

var shots = document.querySelectorAll(".screenshot img");
if (shots.length) {
    var viewer = document.createElement("dialog");
    viewer.className = "viewer";
    viewer.innerHTML = "<img alt=\"\"><p></p>";
    document.body.append(viewer);
    viewer.addEventListener("click", function () { viewer.close(); });

    shots.forEach(function (img) {
        var open = function () {
            viewer.querySelector("img").src = img.src;
            viewer.querySelector("img").alt = img.alt;
            viewer.querySelector("p").textContent = img.alt;
            viewer.showModal();
        };
        img.tabIndex = 0;
        img.addEventListener("click", open);
        img.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
    });
}
