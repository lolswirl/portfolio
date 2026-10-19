+++
title = "swirl framework"
description = "a ui component library for world of warcraft addons: windows, tabs, and controls with a shared theme, embedded into each addon that uses it."
weight = 4
date = 2026-06-10

[taxonomies]
tags = ["lua", "wow"]

[extra]
blurb = "ui component library for wow addons"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "swirl-framework/screenshot.png"
tags = ["lua", "wow"]
github = "https://github.com/lolswirl/swirl-framework"
+++

## intro

wow's addon api gives you frames, textures, and font strings, and not much else. there's no layout system and no standard set of controls, so every addon builds its own buttons, dropdowns, and settings windows.

swirl framework is my set of those pieces, written once and shared by my addons. it's open source under the mit license.

{{<screenshot src="components.png" alt="every component in one window" />}}

## why i built it

[instance loadouts](/projects/instance-loadouts/) used to build its ui on abstractframework, another addon's framework. wago doesn't allow packaging another addon inside yours, so users had to install it separately, and the readme needed a note explaining that.

i wrote this to replace it, and moved instance loadouts over the same day. [swirlui core](/projects/swirladdons/) uses it too.

## what's in it

- **window:** a movable window with a header, icon, title, page title, close button, and an optional settings gear. it can size itself to its content
- **layout:** vertical tabs, cards with titles and dividers, and a scrollbar that can attach to any scroll frame
- **controls:** buttons, icon buttons, toggles, sliders, dropdowns, text boxes, color pickers, and an x/y position control
- **notifications:** toasts, and confirm dialogs that can dim and attach to a window

{{<screenshot src="confirm.png" alt="a confirm dialog attached to its window, dimming it" />}}

{{<screenshot src="toast.png" alt="a toast" />}}

## how it works

### embedding

the framework isn't installed as its own addon. each addon that uses it lists it as an external in its packaging config, and the packager copies it into the addon's `UI` folder:

```yaml
externals:
    UI:
        url: https://github.com/lolswirl/SwirlFramework
        branch: main
```

every file starts with `local _, SF = ...`, which gives it the host addon's private namespace instead of a global. so each addon carries its own copy, and two addons on different versions of the framework can't conflict.

### theme

colors, fonts, padding, and sizes all come from one theme table. components read from it instead of hard-coding values, so a change there applies everywhere.

the accent color [follows your class](https://warcraft.wiki.gg/wiki/Class_colors). at load time the theme replaces its default accent with your class color, plus a dimmed and a faded version of it:

```lua
function SF.InitTheme()
    local _, class = UnitClass("player")
    local cc = RAID_CLASS_COLORS[class]
    T.accent = CreateColor(cc.r, cc.g, cc.b, 1)
    T.accentDim = CreateColor(cc.r * 0.6, cc.g * 0.6, cc.b * 0.6, 1)
    T.accentFade = CreateColor(cc.r, cc.g, cc.b, 0.20)
end
```

a <span class="shaman">shaman</span> sees blue, a <span class="monk">monk</span> green, a <span class="demon-hunter">demon hunter</span> purple, and a <span class="death-knight">death knight</span> red, in every addon built on it.

<div class="screenshot-row">
{{<screenshot src="shaman.png" alt="shaman" />}}
{{<screenshot src="monk.png" alt="monk" />}}
{{<screenshot src="demon-hunter.png" alt="demon hunter" />}}
{{<screenshot src="death-knight.png" alt="death knight" />}}
</div>

## stack

**built with:** lua, world of warcraft addon api  
**used by:** [instance loadouts](/projects/instance-loadouts/), [swirlui core](/projects/swirladdons/)  
**size:** _~2.2k_ lines across _21_ files
