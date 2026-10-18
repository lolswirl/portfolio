+++
title = "wowanalyzer"
description = "maintainer of the mistweaver monk module in wowanalyzer, the open-source combat log analysis tool, with contributions to holy paladin and core. 149 commits and 40 merged prs."
weight = 1
date = 2025-05-11

[taxonomies]
tags = ["typescript", "react", "wow", "open-source"]

[extra]
blurb = "maintainer of the mistweaver monk analysis"
read_time = true
local_image = "wowanalyzer/screenshot.png"
tags = ["typescript", "react", "wow"]
github = "https://github.com/WoWAnalyzer/WoWAnalyzer"
card_links = [
  { url = "https://wowanalyzer.com", text = "live site", icon = "globe" },
  { url = "https://github.com/WoWAnalyzer/WoWAnalyzer/pulls?q=author%3Alolswirl", text = "my prs", icon = "github" },
]
+++

## intro

[wowanalyzer](https://wowanalyzer.com) reads world of warcraft combat logs and gives you feedback on how you played: what you cast, what you missed, and where you lost throughput. it's open source and has been running since 2017.

i maintain its mistweaver monk module, and i've also worked on holy paladin and on shared code used by every spec.

## mistweaver

the module works in two stages. first, normalizers go through the log and add links between related events: this heal came from that talent proc, or this damage event caused those healing events. then analyzers listen for the events they care about, like heals from one spell or a buff being applied, and use those links to attribute healing to the right source. their results feed the statistics and the guide that grades each cooldown.

writing one means describing a spec's rules precisely enough that the analyzer is right on every log, not just the ones you tested. combat logs make that tricky: buffs get extended mid-duration, related events arrive out of order, and a single cast can show up as several separate events.

some of what i've shipped:

- **healing cooldowns revamp:** each major cooldown (the two celestials, revival, and celestial conduit) now gets a breakdown with a timeline of what was cast and which buffs were up, a table of the healing it did, and a checklist that grades the setup
- **heart of the jade serpent:** while its buff is up, some cooldowns recover faster. the analysis measures how much faster each spell came back, converts that into extra casts, and shows how much of the bonus was wasted while a spell sat ready
- **talent modules:** spiritfont, peaceful mending, morning breeze, and others. spiritfont is a good example: it splits the talent's healing by what triggered it, and works out how much of each boosted heal the talent itself is responsible for
- **upkeep:** hero talent statistics, the tier set modules, and patch updates for 12.0.5 and 12.1
- **bug fixes:** an ancient teachings normalizer that linked the same heals twice when it reran, doubling the attributed healing, and lifecycles buffs that expired unused not being counted as wasted

## beyond mistweaver

- **holy paladin:** a modernization of the spec's analysis for the war within, initial support for midnight, and modules for new talents like beacon of the savior
- **core:** fixed the shared ability tracker, which added up critical healing but never counted critical hits. added support for new trinkets. extended shared ui components during the cooldowns revamp, and fixed a bug that drew buff bars across a whole window when the buff wasn't active

## challenges

**debugging from someone else's log.** bugs get reported as "this number looks wrong on my log." there's nothing to reproduce locally, so the fix starts in the raw events: first working out what the game actually did, then what the analyzer assumed.

**working in a large codebase.** wowanalyzer has its own abstractions for events, normalizers, and analyzers, and every change goes through review. a good change fits the existing patterns rather than working around them.

**keeping up with the game.** every patch can change how a spell works. a module that was correct last month can be quietly wrong this month, so a lot of the work is noticing that and updating it.

## numbers

**commits:** 149  
**pull requests:** 40 merged  
**contributor rank:** #35 all time  
**active:** may 2025 to now
