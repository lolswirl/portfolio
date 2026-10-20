+++
title = "chi harmony in cell"
description = "a code snippet and setup guide that shows mistweaver monks' chi harmony buff, with its real duration, inside the cell raid frames addon."
weight = 11
date = 2025-02-28

[taxonomies]
tags = ["lua", "wow"]

[extra]
blurb = "chi harmony tracking for the cell raid frames addon"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "chi-harmony-in-cell/screenshot.png"
tags = ["lua", "wow"]
github = "https://github.com/lolswirl/chi-harmony-in-cell"
+++

## intro

in the war within, chi harmony became a baseline effect of renewing mist for mistweaver monks. the standalone buff went away, which made it hard to track on raid frames. a weakaura can do it, but it has limits when it comes to tracking the duration accurately.

this is a snippet for [cell](https://www.curseforge.com/wow/addons/cell), a raid frames addon, that shows chi harmony natively with its duration, plus a step-by-step guide for setting it up.

## what it does

the guide walks through creating one or two cell indicators and pasting the snippet into cell's code snippets tab. you can have a color indicator, a duration indicator (text, block, icon and so on), or both. the readme explains how to find your indicators' index numbers, and the snippet has a setting for non-english clients, where chi harmony has a different name.

## how it works

cell lets a snippet replace the function that updates custom indicators for each aura on a unit. the snippet's version does the normal work, with one addition: when the aura is renewing mist (spell id 119611) and it's being shown on the duration indicator, it also reports a chi harmony entry with its own icon. its duration is renewing mist's remaining duration, capped at 8 seconds:

```lua
if indicatorName == durationIndicatorIndex and auraInfo.spellId == 119611 then
    local chiHarmonyDuration = duration <= 8 and duration or 8
    Update(unitButton.indicators[indicatorName], indicatorTable, unit, chiHarmonyName, start, chiHarmonyDuration, debuffType, chiHarmonyIcon, count, auraInfo.refreshing)
end
```

since it replaces part of cell's code, it can break when cell changes, so the readme notes that it will be kept up to date.

## stack

**built with:** lua, world of warcraft addon api, cell code snippets
