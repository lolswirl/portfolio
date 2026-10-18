+++
title = "wait, i'm ramping!"
description = "a site full of tools to help world of warcraft healers plan, visualize, and fine-tune their healing. it includes various components such as a ramp timer calculator, a spell timeline visualizer, many tools that compare spells and cooldowns"
weight = 1
date = 2025-02-28

[taxonomies]
tags = ["typescript", "wow", "theorycrafting"]

[extra]
blurb = "theorycrafting and optimization tools for wow healers"
read_time = true
local_image = "waitimramping/screenshot.png"
github = "https://github.com/lolswirl/wait-im-ramping"
card_links = [
  { url = "https://www.waitimramping.com", text = "live site", icon = "globe" },
]
tags = ["typescript", "wow", "theorycrafting"]
+++

## intro

healing in world of warcraft is... weird, to say the least.

most healers get comfortable at "i know my spells and mostly how to use them." what separates a good healer from a great one is knowing how those spells interact and using that efficiently. the catch is timing: you decide what to press seconds before you find out whether it was right.

i wanted a way to plan that ahead of time, and nothing really did it. so i built one.

## why i built it

the questions came first. i'd had them for years without sitting down to answer them properly, and the only tool i had was a spreadsheet.

a spreadsheet works for a single static answer. it doesn't work for what i wanted to do: reorder a cast sequence and see what changes, move a cooldown two seconds and watch the ramp shift, or look at a timeline instead of a row of numbers.

so it became a website, which was also a reason in itself. my day job is backend, so everything past the api was new to me: structuring an app from scratch, registering a domain, hosting it, and keeping it running. it started as a local page i used for screenshots and grew into a public site.

## tools

<div class="tool-grid">
{% <tool url="https://waitimramping.com/when-do-i-ramp" image="https://waitimramping.com/previews/when-do-i-ramp.png" title="When Do I Ramp?" description="Calculate when to start your ramp before a mechanic"> %}{% </tool> %}
{% <tool url="https://waitimramping.com/timeline" image="https://waitimramping.com/previews/timeline.png" title="Spell Timeline" description="Build timelines for spell casts and cooldowns"> %}{% </tool> %}
{% <tool url="https://waitimramping.com/analysis/spell-reference" image="https://waitimramping.com/previews/spell-reference.png" title="Reference" description="View spellpower data for every spell and talent"> %}{% </tool> %}
{% <tool url="https://waitimramping.com/analysis" image="https://waitimramping.com/previews/heart-of-the-jade-serpent.png" title="Analysis" description="Compare healing mechanics with the math"> %}{% </tool> %}
{% <tool url="https://waitimramping.com/bugs" image="https://waitimramping.com/previews/bugs.png" title="Bugs" description="Track known bugs and issues by specialization"> %}{% </tool> %}
</div>

### analysis pages

those five are on the front page. the rest are [analysis pages](https://waitimramping.com/analysis), each answering one specific question about the math behind a spell or mechanic.

some compare two spells directly, some break down how healing is distributed across a cooldown, and some plot a single value so you can see how it scales. they all use the same underlying model.

## how it works

### spell coefficients

every spell has a coefficient that scales with your main stat, which for healers is intellect. multiply the two and you get the spell's base healing.

the game's tooltip for a spell looks like this:

```txt
Renewing Mist
1.8% of base mana	40 yd range
Instant	9 sec recharge
2 Charges
Requires Monk
Surrounds the target with healing mists, restoring (196.65% of Spell Power) health over 20 sec.

If Renewing Mist heals a target past maximum health, it will travel to another injured ally within 20 yds.
```

and this is how the site stores it:

```ts
RENEWING_MIST: {
    name: 'Renewing Mist',
    id: 119611,
    icon: 'ability_monk_renewingmists',
    castTime: 0,
    cooldown: 9,
    school: SCHOOLS.NATURE,
    coeff: 1.9665,
    duration: 20,
    category: CATEGORY.HEALING,
    periodic: true,
},
```

`coeff` is the spell power percentage divided by 100. general properties sit at the top level, and values specific to one spell or talent go in a nested `effects` object.

the base value is rarely what you actually heal for. each spec has core passive auras that modify it, talents modify it further, and secondary stats scale the result. so a spell's real output is its coefficient multiplied through a series of modifiers:

```ts
export const calcSpellValue = (spell: spell, player: Player, type: 'damage' | 'healing' = 'healing'): number => {
    const coeff = resolveCoeff(spell.coeff, type);
    if (coeff === undefined) return 0;

    // using the law of large numbers to assume that, out of a large number of casts,
    // you will critically strike as often as your crit percentage
    const critMultiplier = 1 + (player.stats.crit / 100);
    const versMultiplier = 1 + (player.stats.versatility / 100);

    return player.stats.intellect * coeff * getSpellAura(spell, player.corePassives, type) * critMultiplier * versMultiplier;
};
```

{% <note clickable={true} hidden={true} header="simplifying stats"> %}crit is treated as a flat multiplier on purpose. any single cast either crits or doesn't, but over many casts you crit about as often as your crit percentage, so averaging it is accurate across a fight even though it's never exactly right for one cast.

the site isn't a simulation. raidbots does that properly, by running thousands of simulated fights. this site is after the expected total, and for that the average is the right number.

for most analysis pages, leaving out stats other than intellect (and the ones talents scale directly) is what makes it possible to see what a single spell contributes.{% </note> %}

### modifiers

`getSpellAura` applies the spec's core passives. it finds every passive effect that affects the spell and multiplies them into one value:

```ts
export const getSpellAura = (spell: Spell, corePassives: CorePassive | CorePassive[], calcType: 'damage' | 'healing' = 'damage'): number => {
    const passives = Array.isArray(corePassives) ? corePassives : [corePassives];
    return passives.flatMap(p => matchingEffects(spell, p, calcType))
        .reduce((aura, { effect }) => aura * (1 + (effect.value as number) / 100), 1);
};
```

the reduce starts at `1`, so a spell with no passive modifiers gets a multiplier of 1 instead of 0. matching also follows how the game applies modifiers: heals over time only pick up periodic healing modifiers, and direct heals only pick up direct ones.

talents are handled separately, as rules evaluated against the player's build:

```ts
export interface TalentRule {
    talent: spell;
    getValue: (stats: Stats, rank: number) => number;
    appliesTo: (spell: spell) => boolean;
}
```

each rule has the talent it depends on, a check for which spells it affects, and a function that returns its value. that function receives the talent's rank, so multi-rank talents scale with the points spent:

```ts
{
    talent: SHARED.FEROCITY_OF_XUEN,
    getValue: (_stats, rank) => rank * SHARED.FEROCITY_OF_XUEN.effects.damageIncrease,
    appliesTo: (spell) => spell.category === CATEGORY.DAMAGE
},
```

tier set bonuses use the same rule format.

when several rules apply to a spell, their values multiply rather than add, so two 10% talents give 21%. that matches how the game stacks nearly all of them:

```ts
export const calculateSpellHealingMultiplier = (spell: spell, player: Player, rules: TalentRule[]): number => {
    let multiplier = 1;

    for (const rule of rules) {
        if (!isTalentEnabled(player.talents, rule.talent)) continue;
        if (rule.appliesTo(spell)) {
            multiplier *= (1 + rule.getValue(player.stats, getTalentRank(player.talents, rule.talent)));
        }
    }

    return multiplier;
};
```

the final healing is the base value times the talent multiplier:

```ts
export const calculateSpellHealing = (spell: spell, player: Player, rules: TalentRule[]): number => {
    const base = calcSpellValue(spell, player, 'healing');
    return base * calculateSpellHealingMultiplier(spell, player, rules);
};
```

keeping these apart separates two things that change at different rates. `calcSpellValue` covers what a spell does for a spec, which rarely changes. the rules cover what it does for a specific build, which changes whenever a talent does. each spec registers its own set of rules, so adding a spec means writing its rules without touching the shared code.

`getSpellModifiers` returns the same chain as a list instead of a single number: each passive effect, crit, versatility, and each talent, with a label. the site uses it to show how a number was calculated, and it's the most useful debugging tool in the project, since a wrong number points straight at the modifier causing it.

it's not optimized. everything is recalculated on every call, with no caching. with this little data it's still instant, but it could be structured better.

### validation

there's no access to the game's internal formulas, so validating means casting the spell in game and then staring very hard at the combat logs. if the site's number and the log's number don't match, something is wrong, and the question is **what.**

sometimes it's my model. sometimes it's the game. tracking down those mismatches has found several small bugs in the specs themselves, the kind that never show up in a tooltip and only become visible when you have a predicted number to compare against.

if only i could write unit tests against real data from the game. oh, the joys i'd have!

### data updates

blizzard changes spell values often, sometimes weekly through hotfixes, so the site's data needs regular updates.

the source is [simulationcraft](https://github.com/simulationcraft/simc/), which datamines spell data from each game build into a public repo. updating the site meant finding what changed there and applying it by hand.

that's now a scheduled claude code routine that runs every evening, and hourly on tuesdays when weekly hotfixes usually land. each run:

- checks simulationcraft for spell data changes from the last day
- matches each change to the site's data by spell id, by alternate ids noted in the code, or by spell name, since the game sometimes stores a spell's real coefficient under a second id
- applies a change only when the mapping is unambiguous, and lists anything else for review
- updates the site's patch number when a new live patch is out, and adds a changelog entry
- opens or updates one pull request for me to review, and does the same for ptr data on a separate branch

nothing gets merged without me reviewing it first.

### history

before the site, there were python scripts. in january 2025 i wrote a cast timeline in python: each ability had a cast time, cooldown, and haste scaling, a player object applied mistweaver's rules as it went (like chi-ji stacks making enveloping mist cast faster), and matplotlib drew each ramp as a row so two could be compared. the spell timeline is the same idea, rebuilt for the browser.

one of those scripts is, surprisingly, still in use. wow lets you replace its icons with your own `.tga` files, and i use the upscaled set from acidweb's [clean icons: mechagnome edition](https://github.com/AcidWeb/Clean-Icons-Mechagnome-Edition), which look sharper than the originals. the script scans the site's spell data for the icons it needs, converts those files to png, and saves them to the site's icon folder, so the site shows the same icons i see in game.

the site itself started in february 2025, and the early code looks very different from what's there now. i started without knowing how to structure a frontend app, and each rewrite since has applied something i learned after the last one.

## stack

**built with:** typescript, next.js, react, material ui, cloudflare  
**charts:** chart.js, recharts, d3  
**data:** [simulationcraft's spell data](https://github.com/simulationcraft/simc/), kept in sync by a scheduled claude code routine

## stats

**launched:** _feb 28, 2025_  
**analysis pages:** _14_ distinct, _4_ defunct  
**daily visits:** _~300_  
**monthly visits:** _~8k_, more at the start of a season  
**peak day:** _30.8k_  
**devices:** _87.3%_ desktop, _12.6%_ mobile, _0.1%_ tablet  
**top countries:** _36.6%_ united states, _9.0%_ germany, _7.4%_ france  
**most viewed:** [bugs](https://waitimramping.com/bugs), then [when do i ramp?](https://waitimramping.com/when-do-i-ramp)  
**codebase:** _~20k_ lines of typescript across _175_ files  
**commits:** _933_ as of _oct 13, 2026_
