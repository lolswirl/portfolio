document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

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
