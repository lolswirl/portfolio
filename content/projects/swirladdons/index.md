+++
title = "swirl addons"
description = "small world of warcraft addons, each written to fix one specific thing: dispel and movement cooldowns, keystone info, lust alerts, lifebloom tracking, and a ui pack."
weight = 2
date = 2022-12-06

[taxonomies]
tags = ["lua", "wow"]

[extra]
blurb = "small, single-purpose wow addons"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "swirladdons/screenshot.png"
tags = ["lua", "wow"]
github = "https://github.com/swirladdons"
+++

## intro

a collection of small world of warcraft addons. most started because something in my own ui bothered me and nothing existing fixed it cleanly. the bigger one, [instance loadouts](/projects/instance-loadouts/), has its own page.

## published

these are on [curseforge](https://www.curseforge.com/members/lolswirl/projects) and [wago](https://addons.wago.io/user/Swirl), with source on [github](https://github.com/swirladdons).

<ul class="rows">
{%<addon name="dispel on cursor" curseforge="dispel-on-cursor" wago="dispel-on-cursor" github="https://github.com/swirladdons/dispeloncursor">%}shows your dispel's cooldown next to your mouse cursor. it finds whichever dispel your spec knows, so it works for every class that has one without any setup{%</addon>%}
{%<addon name="flat tire" curseforge="no-movement-left" wago="flattire" github="https://github.com/swirladdons/flattire">%}shows a countdown in the middle of the screen when your movement ability is on cooldown, like "NO ROLL (4.2)". each class has its own list of abilities and short names{%</addon>%}
{%<addon name="keystone info" curseforge="keystone-info" wago="keystone-info" github="https://github.com/swirladdons/keystoneinfo">%}cleans up the mythic+ panel. each dungeon icon gets a short name (like SEAT or SKY), and the key level and score are resized and repositioned so they're readable{%</addon>%}
{%<addon name="swirlui core" curseforge="swirlui-core" wago="swirlui" github="https://github.com/swirladdons/swirlui">%}the settings addon for my ui pack, [swirl ui](https://uipacks.wago.io/pack/swirl-ui). it handles ui scale, fonts, buff and debuff skinning, error text placement, and reskins for a few other addons. its settings window is built on [swirl framework](/projects/swirl-framework/){%</addon>%}
{%<addon name="swirlui media" curseforge="swirl-media" wago="swirl-media" github="https://github.com/swirladdons/swirlmedia">%}fonts, textures, and sounds for the pack, including voice callouts for cooldowns. a script registers any new file dropped into its folders{%</addon>%}
{%<addon name="dump truck" github="https://github.com/swirladdons/dumptruck">%}right-click bag items at the auction house to queue them. each one is priced at the current lowest listing, then you post them one click at a time, or bind a key to spam through the list. its window is built on [swirl framework](/projects/swirl-framework/){%</addon>%}
{%<addon name="brain freeze" github="https://github.com/swirladdons/brainfreeze">%}bonus roll history for every character: what you won, on which spec, from which boss, and at what difficulty. it reads the rolls the simulationcraft addon records, or you can paste a /simc export{%</addon>%}
</ul>

dispel on cursor and flat tire both have the same readme: no config, plug and play.

that works because each one figures out what to track on its own. dispel on cursor has a list of every class's dispels and picks the first one in your spellbook, and checks again whenever your talents change:

```lua
local function DetectDispelSpell()
    for _, spellID in ipairs(DISPEL_SPELL_IDS) do
        if C_SpellBook.IsSpellInSpellBook(spellID) then
            TRACKED_SPELL_ID = spellID
            UpdateCooldown()
            return
        end
    end

    TRACKED_SPELL_ID = nil
    UpdateCooldown()
end
```

keystone info builds its short names from the dungeon's full name. it drops "the", uses the first three letters for one-word names, and initials for longer ones, with a couple of special cases where that comes out badly:

```lua
local specialCases = {
    ["Seat of the Triumvirate"] = "SEAT",
    ["Skyreach"] = "SKY",
}

-- ...

if #words == 1 then
    return string.sub(words[1], 1, 3):upper()
end

local abbreviated = ""
for _, word in ipairs(words) do
    abbreviated = abbreviated .. string.sub(word, 1, 1)
end

return abbreviated:upper()
```

## personal

these i wrote for myself and haven't published.

<ul class="rows">
{%<addon name="dude, where's my lust?">%}a big shaking "LUST?!?!?!" when a boss pull starts and nobody has used bloodlust. it only shows for classes that can cast it, and it checks for the debuff that means lust was already used{%</addon>%}
{%<addon name="lifebloom tracker">%}for restoration druids. it finds who has your lifebloom, and shows its stacks, time left, and a warning with a sound once it's close enough to expiring that refreshing it won't waste any duration{%</addon>%}
{%<addon name="receipt" github="https://github.com/swirladdons/receipt">%}a list of what you just looted: items, gold, currency, reputation, and honor. it can show auction prices from auctionator or tsm, show how many you already own, and play a sound for expensive drops{%</addon>%}
{%<addon name="character stats">%}a replacement for the character panel's stats, with its own tabs for stats, equipment, and titles{%</addon>%}
</ul>

## stack

**built with:** lua, world of warcraft addon api  
**published on:** [curseforge](https://www.curseforge.com/members/lolswirl/projects), [wago](https://addons.wago.io/user/Swirl)  
**source:** [github](https://github.com/swirladdons)
