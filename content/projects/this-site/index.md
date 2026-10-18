+++
title = "this site"
description = "a static site built with zola, hand-written templates, and a single stylesheet, deployed on cloudflare pages."
weight = 7
date = 2025-06-24

[taxonomies]
tags = ["zola", "css"]

[extra]
blurb = "zola, hand-written templates, cloudflare pages"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "this-site/screenshot.png"
tags = ["zola", "css"]
github = "https://github.com/lolswirl/rshevchenko"
+++

## intro

the site you're reading.

it's built with [zola](https://www.getzola.org/), a static site generator that ships as a single binary. every page is a markdown file, the templates turn them into html at build time, and what gets deployed is a folder of plain files.

## why it's built this way

**static.** there's no server, no database, and no frontend framework. a personal site is a document, and documents can just be files.

**one binary for the build.** there's no `node_modules` and no lockfile. nothing breaks because a dependency of a dependency published a bad version.

**small.** the whole site is eleven templates, one stylesheet, and three short scripts. if something looks wrong, there's only one place it can be.

## history

it started on the [apollo](https://github.com/not-matthias/apollo) theme, pinned as a git submodule, with a few template overrides on top. that worked until zola 0.23 changed its templating and config enough that the theme stopped building.

instead of patching the theme, i replaced it with my own templates and styles.

## how it works

### content as data

the homepage is mostly data. work history, education, and the misc links live in the front matter of `content/_index.md`, and a template turns each entry into a row:

```toml
exp = [
  { role = "senior software developer", company = "smt", logo = "logos/smt.png", dates = "apr 2019 - nov 2021", earlier = [
    { role = "software developer", dates = "apr 2019 - jan 2021" },
  ] },
]
```

roles under `earlier` show up as smaller rows under the company, which is how promotions are shown. projects are folders under `content/projects`, sorted by weight, and each one's blurb and link come from its own front matter.

### style switches

a few visual choices are settings in `config.toml` instead of code: the heading style, the label on earlier roles, and the marker in front of each project row. the base template copies them onto the `<html>` tag as data attributes, and the stylesheet has a variant for each value:

```html
<html data-delim="b" data-earlier="f" data-marker="i">
```

switching from `## exp` style headings to `:: exp` is a one-letter config change, and it applies across every page.

### markdown conventions

a short script runs after the page loads and picks up two patterns in the markdown:

- **lead-ins:** bold text at the start of a paragraph or list item gets the accent color, like the labels in this list
- **facts:** a paragraph where every line starts with a bold `key:` becomes a key/value grid, styled like the date and tags at the top of each page

the lead-in check is a few lines. it finds the first child that isn't empty text, and marks it if it's bold:

```js
document.querySelectorAll(".body p, .body li").forEach(function (el) {
    var first = Array.from(el.childNodes).find(function (n) { return n.nodeType !== 3 || n.textContent.trim(); });
    if (first && first.nodeName === "STRONG") first.classList.add("lead");
});
```

that keeps the markdown readable on its own, without custom shortcodes for things that come up on most pages.

### code blocks

syntax highlighting happens at build time, with styles written as css classes instead of inline colors. the colors come from the theme i use in vs code, banner from rainglow, plus my own token customizations. a small script converts the vs code theme into the format zola reads.

the light theme uses the same colors, darkened until each one reaches a 4.5:1 contrast ratio against the light background.

### theme toggle

the toggle cycles between light, dark, and following the system setting. the choice is saved in local storage, and switching it also swaps which syntax stylesheet is active, so code blocks change with the page.

### table of contents

the table of contents highlights the section you're reading. a heading counts as current once it passes a line that slides from the top of the screen to the bottom as you scroll. a fixed line near the top would never reach the last few headings on a short page, since the page runs out before they get there.

## deployment

it was on vercel originally, and now builds on cloudflare pages. pages runs zola on every push, with the version pinned by an environment variable so a new zola release can't change the build until i update it.

## stack

**built with:** zola, tera templates, css, javascript  
**hosting:** cloudflare pages  
**source:** [github](https://github.com/lolswirl/rshevchenko/)
