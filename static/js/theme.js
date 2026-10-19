// cycles light -> dark -> auto, where "auto" follows the os setting
var THEME_KEY = "theme-storage";

function savedTheme() {
    try {
        return localStorage.getItem(THEME_KEY) || "auto";
    } catch (e) {
        return "auto";
    }
}

function prefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme() {
    var mode = savedTheme();
    var dark = mode === "dark" || (mode === "auto" && prefersDark());
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    root.dataset.themeMode = mode;

    var light = document.getElementById("syntax-light");
    var darkSheet = document.getElementById("syntax-dark");
    if (light && darkSheet) {
        light.disabled = dark;
        darkSheet.disabled = !dark;
    }
}

function toggleTheme() {
    var next = { light: "dark", dark: "auto", auto: "light" }[savedTheme()];
    try {
        localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
    applyTheme();
}

applyTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

// apply the saved oscilloscope mode (wave, string, or off) before first paint (oscilloscope.js)
document.documentElement.dataset.oscilloscopeMode = "wave";
try {
    var savedMode = localStorage.getItem("oscilloscope");
    if (savedMode === "string" || savedMode === "off") document.documentElement.dataset.oscilloscopeMode = savedMode;
} catch (e) {}
