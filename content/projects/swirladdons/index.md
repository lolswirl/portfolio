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

- **[dispel on cursor](https://www.curseforge.com/wow/addons/dispel-on-cursor):** shows your dispel's cooldown next to your mouse cursor. it finds whichever dispel your spec knows, so it works for every class that has one without any setup
- **[no movement left](https://www.curseforge.com/wow/addons/no-movement-left):** shows a countdown in the middle of the screen when your movement ability is on cooldown, like "NO ROLL (4.2)". each class has its own list of abilities and short names
- **[keystone info](https://www.curseforge.com/wow/addons/keystone-info):** cleans up the mythic+ panel. each dungeon icon gets a short name (like SEAT or SKY), and the key level and score are resized and repositioned so they're readable
- **[swirlui core](https://www.curseforge.com/wow/addons/swirlui-core):** the settings addon for my ui pack, [swirl ui](https://uipacks.wago.io/pack/swirl-ui). it handles ui scale, fonts, buff and debuff skinning, error text placement, and reskins for a few other addons. its settings window is built on [swirl framework](/projects/swirl-framework/)
- **[swirlui media](https://www.curseforge.com/wow/addons/swirl-media):** fonts, textures, and sounds for the pack, including voice callouts for cooldowns. a script registers any new file dropped into its folders

dispel on cursor and no movement left both have the same readme: no config, plug and play.

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

- **dude, where's my lust?:** a big shaking "LUST?!?!?!" when a boss pull starts and nobody has used bloodlust. it only shows for classes that can cast it, and it checks for the debuff that means lust was already used
- **lifebloom tracker:** for restoration druids. it finds who has your lifebloom, and shows its stacks, time left, and a warning with a sound once it's close enough to expiring that refreshing it won't waste any duration
- **loot frame:** a list of what you just looted: items, gold, currency, reputation, and honor. it can show auction prices from auctionator or tsm, show how many you already own, and play a sound for expensive drops
- **character stats:** a replacement for the character panel's stats, with its own tabs for stats, equipment, and titles

## stack

**built with:** lua, world of warcraft addon api  
**published on:** [curseforge](https://www.curseforge.com/members/lolswirl/projects), [wago](https://addons.wago.io/user/Swirl)  
**source:** [github](https://github.com/swirladdons)
