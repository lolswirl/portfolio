+++
title = "questionably epic live"
description = "contributor to qe live, the healer gear and stat optimization tool. i rebuilt its mistweaver monk model and added wowhead tier list exports for trinkets."
weight = 9
date = 2025-03-03

[taxonomies]
tags = ["js", "typescript", "react", "wow", "theorycrafting"]

[extra]
blurb = "contributor to the healer gear & stat optimizer"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "questionably-epic/screenshot.png"
tags = ["js", "typescript", "react", "wow"]
github = "https://github.com/Voulk/QuestionablyEpic"
card_links = [
  { url = "https://questionablyepic.com/live/", text = "live site", icon = "globe" },
  { url = "https://github.com/Voulk/QuestionablyEpic/pulls?q=author%3Alolswirl", text = "my prs", icon = "github" },
]
+++

## intro

[qe live](https://questionablyepic.com/live/) helps healers pick gear. you give it your character, and it tells you which items, trinkets, and stats are worth the most healing for your spec.

it's voulk's project, and it's [open source](https://github.com/Voulk/QuestionablyEpic). most of the code is theirs. i contribute the mistweaver monk side.

to do that, each spec has a model: an estimate of what a healer casts in a minute and how much each cast heals. gear changes your stats, stats change the model's output, and the difference is the item's value. if the model is wrong, every recommendation built on it is wrong too.

my main contribution was rebuilding that model for mistweaver.

## the mistweaver model

### cast profiles

the model is a cast profile: a list of spells, each with how many times per minute it's cast. the model runs each spell through the spell database, applies talents and stats, and adds up the healing.

the old profile had mostly fixed numbers. the new one works more of them out from the build. talents that reduce cooldowns raise the cast rate of the spells they affect, talents that add procs add healing to the spells that trigger them, and the time left over goes to filler.

cooldown reduction is a good example. heart of the jade serpent speeds up several cooldowns while it's active, but a spell only benefits if you actually press it sooner. renewing mist often waits for a target, and the kicks compete for global cooldowns, so each spell gets an effectiveness value for how much of the reduction turns into real casts:

```ts
const HOTJS_EFFECTIVENESS: Record<string, number> = {
    "Renewing Mist": 0.58,
    "Thunder Focus Tea": 0.77,
    "Life Cocoon": 0.77,
};

const getHotjsCdrMult = (talents: any, uptimes: { uptimeStandard: number, uptimeConduit: number }, effectiveness: number): number => {
    const standardCdr = HOTJS_CDR_PERC / 100;
    const unityWithinMult = hasTalent(talents, "Unity Within") ? talents["Unity Within"].values[0] / 100 : 1;

    return 1 + (standardCdr * uptimes.uptimeStandard + standardCdr * unityWithinMult * uptimes.uptimeConduit) * effectiveness;
}
```

there are now separate models for the two raid builds, one around yu'lon and one around chi-ji, plus a dungeon default. each has its own talent string, cast model, and stat weights:

```ts
"Chi-Ji": {
    heroTree: MONK_HERO_TREES.CONDUIT,
    modelType: MODEL_TYPES.CAST_MODEL,
    talents: monkTalentStrings["Chi-Ji"],
    runCastModel: scoreMonkChijiSet,
    spellData: chijiSpellData,
    specialQueries: chijiSpecialQueries,
    statWeights: chijiStatWeights,
    onUseTrinket: modelChijiOnUseTrinket,
},
```

### mana

the hardest part was mana. mistweaver spends mana on its heals and gets it back by channeling mana tea, which uses stacks the monk builds up over time. channeling takes time that could be spent healing, and how many stacks you build depends partly on how much mana you spend.

so the number of stacks to drink and the number of filler casts depend on each other. the model solves for both by iterating: guess a number of stacks, work out how many filler casts that leaves time and mana for, work out how many stacks those casts would build, and move halfway toward that answer. after a few rounds it settles:

```ts
// this should find the intersection of supply and demand, but they're all
// kinda functions of each other so iterating to solve
const RELAXATION = 0.5; // half steps, to oscillate around instead of overshoot
let stacks = 0;
for (let _ = 0; _ < 30; _++) {
    const fillerCPM = getFillerCPM(stacks);
    const target = Math.min(Math.max(getStacksNeeded(fillerCPM), 0), getStacksBuilt(stacks, fillerCPM));

    stacks += (target - stacks) * RELAXATION;
}
```

the target is capped at what the build can actually generate, so a build can't drink stacks it never made. once the loop settles, the leftover time and mana go to filler.

the result also shows whether a build generates more stacks than it can use, which means crit is worth less than it looks.

### cooldowns

the celestials, yu'lon and chi-ji, each get a window modeled on its own. yu'lon makes enveloping mist cheaper and faster, and the model works out how many extra renewing mists those casts spread, which makes vivify heal more people during the window. chi-ji turns kicks into gust of mist heals and makes enveloping mist faster, so the model sequences kicks and enveloping mists through the window and accounts for overhealing on the gusts.

for chi-ji, the window is counted in global cooldowns. each kick's share of the window matches its share of everything cast on the global cooldown, and each kick sends out six gusts:

```ts
const gustSources = ["Blackout Kick", "Rising Sun Kick", "Spinning Crane Kick"];
const windowGCDs = celestial.duration / getGCD(state.statPercentages.haste);
const totalGcdCpm = castProfile.reduce((sum, entry) => sum + (spellDB[entry.spell] && !spellDB[entry.spell][0].offGCD ? (entry.cpm ?? 0) : 0), 0);
const gustCastsInWindow = totalGcdCpm > 0
    ? gustSources.reduce((sum, spellName) => sum + windowGCDs * (getCPM(castProfile, spellName) / totalGcdCpm), 0)
    : 0;
reportingData.chijiGusts = gustCastsInWindow * CHIJI_GUSTS_PER_CAST * celestial.cpm;
```

thunder focus tea empowers a spell, and which one you pick changes the result. a test runs every pair of empowers through both models, with and without the tier set, and ranks them by total healing.

### tier sets

since the model merged, i've kept the tier set modeling current: adding the midnight season 1 bonuses and retuning them when blizzard changed their values.

## trinket exports

before the model, my first change was to the trinket chart. it can now export a wowhead tier list and a cheat sheet directly.

the tier list ranks each trinket against the best one at max item level and assigns tiers from that. tooltips are added only for the top tiers, or for trinkets with a warning, so the person writing the guide adjusts a short list instead of starting from nothing. the cheat sheet takes the top four: two best in slot and two alternatives.

## numbers

**pull requests:** 4 merged  
**commits:** 54  
**lines:** _+2.7k_, _-1.2k_  
**active:** may 2026 to now
