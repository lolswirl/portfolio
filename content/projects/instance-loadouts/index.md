+++
title = "instance loadouts"
description = "a world of warcraft addon that reminds you to switch your spec, talents, gear, and addons when you enter a dungeon, raid, or other instance. co-maintained since 2025."
weight = 3
date = 2025-09-24

[taxonomies]
tags = ["lua", "wow"]

[extra]
blurb = "reminder to switch loadouts per instance"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "instance-loadouts/screenshot.png"
tags = ["lua", "wow"]
github = "https://github.com/Bisse123/InstanceLoadouts"
card_links = [
  { url = "https://www.curseforge.com/wow/addons/instance-loadouts", text = "curseforge", icon = "globe" },
]
+++

## intro

if you play more than one kind of content, your setup changes with it. a raid boss wants different talents than a dungeon, a delve wants a different spec, and some addons only matter in some places. forgetting to switch is easy, and you usually notice after the pull.

instance loadouts lets you save a loadout for each place you play: a spec, a talent build, an equipment set, and an addon set. when you enter, it shows what doesn't match and switches it in one click.

it was created by [bisse](https://www.curseforge.com/members/bisse/projects) in 2025. i started contributing that september and now maintain the project as he has since stopped playing the video game.

## how it works

### finding where you are

on every loading screen, the addon reads the instance type and id from the game and sorts it into a category: dungeon, raid, delve, arena, battleground, or open world.

each category has a default loadout, and individual instances can override it. a raid can override the new "all raids" default, a dungeon can override the dungeon default, and talents can be overridden without changing the spec.

### the reminder

the reminder only shows the parts that are wrong. if your gear set matches but your talents don't, you see one row for talents. if everything already matches, nothing appears.

applying a change waits for the game to confirm it. the button disables while the change goes through, the row updates when the game reports success, and if the game reports a failure, like trying to swap spec mid-cast, the button comes back so you can try again.

### other addons

blizzard has no built-in addon sets, so that part relies on addon managers. it supports addon control panel, better addon list, and simple addon manager. for talents it works with blizzard's own loadouts or talent loadout manager.

loadouts can be shared as text. the data is serialized, compressed, and encoded into a string you can paste anywhere.

## what i've worked on

- **midnight support:** patch updates, the new delves, and handling the addon restrictions that came with the expansion
- **boss detection:** midnight hides most information about raid bosses from addons, so the addon can't tell which boss you're targeting anymore. it now asks you which encounter to load when you target a boss, with a timeout so it doesn't ask again on every target change
- **custom instances:** adding any instance from the encounter journal, and per-zone loadouts for the open world
- **raid defaults:** an "all raids" default, with a migration so raids that already had a loadout keep it
- **new ui:** moved the whole interface to [swirl framework](/projects/swirl-framework/), replacing a framework that users had to install separately
- **fixes:** addon managers that loaded after instance loadouts and were missed, and talent builds not changing along with the spec

## numbers

**commits:** 53 of 74  
**downloads:** 6,713 on curseforge  
**active:** sep 2025 to now
