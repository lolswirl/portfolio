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
