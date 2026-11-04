+++
title = "wowhead"
description = "my mistweaver monk guide for wowhead, kept as markup files that are updated for every patch of midnight."
weight = 11
date = 2026-05-26

[taxonomies]
tags = ["wow", "theorycrafting", "guides"]

[extra]
blurb = "mistweaver monk guide pages for wowhead, written in its guide markup"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "wowhead/screenshot.png"
tags = ["wow", "theorycrafting", "guides"]
github = "https://github.com/lolswirl/wowhead"
+++

## intro

wowhead's guides are written in a bbcode-style markup, with its own tags for spells, items, talent builds and gear lists. this repo is where i keep my mistweaver monk guide pages in that format, so every patch's version is in git instead of only in a browser text box.

## what's in it

the pages are grouped in a folder per patch of midnight (12.0, 12.0.5, 12.0.7, 12.1.0 and 12.1.5), and each page is one section of the guide:

- **overview, talents and rotation:** how the spec plays and what to take
- **gear, stats and cheat sheet:** raid and mythic+ builds with best-in-slot items, consumables and stat priorities
- **raid and mythic+:** what the spec does in each kind of content
- **season changes:** the weekly tuning changes to the spec, newest first
- **editorial:** a longer essay on what mistweaver's melee identity means when melee stops mattering

## how it works

### builds

the cheat sheet is built from `[build]` blocks, one per kind of content. each one holds a talent build, a stat priority, key talents for each part of the tree and lists of items:

```
[build class="Monk" spec="Mistweaver" hero="Conduit of the Celestials" title="Mistweaver Monk Raid Build" tab="Raid"
talents=blizzard/[=talent-build-4687]
stat-guide=5559
stats=int>>haste>crit>vers>>mastery]
[key-talents="Hero" spells=443028,443110,443294,1262672,443589]
```

### reused pieces

the sections that repeat on every page, like the header icons, the enchant and consumable tables and the callout box, follow the same pattern each time. they're written down as claude code skills in the repo, so a new page picks them up the same way. for example, the callout box is a shared snippet with three variables:

```
[guide-content=34689]
	[replace="$bg_color" with="202020"]
	[replace="$title" with="Versatility?!"]
	[replace="$text" with="Body text here."]
[/guide-content]
```

the repo also has a lookup table of mistweaver spell names and their wowhead spell ids, which follows [waitimramping](/projects/waitimramping/)'s ids where sources disagree.

## stack

**written in:** wowhead guide markup (bbcode)  
**tooling:** git, claude code skills for the repeated pieces
