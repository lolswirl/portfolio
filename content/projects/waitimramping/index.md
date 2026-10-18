+++
title = "wait, i'm ramping!"
description = "a site full of tools to help world of warcraft healers plan, visualize, and fine-tune their healing. it includes various components such as a ramp timer calculator, a spell timeline visualizer, many tools that compare spells and cooldowns"
weight = 1
date = 2025-02-28

[taxonomies]
tags = ["typescript", "wow", "theorycrafting"]

[extra]
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

most healers get comfortable somewhere in the "i know my spells, and mostly how to use them" sphere, but the distance between a good healer and a great one lives in distinct knowledge of how interactions can be used to your benefit and _efficiently_. knowing this is one thing, but actually applying it is the goal. you're deciding what to press multiple seconds before you'd know whether it was right.

there was no good way to plan that. so i built one.

## background

the healing questions came first. i'd been carrying them around for years without ever sitting down to answer them properly, and the only tool i had was a spreadsheet.

spreadsheets are fine for a static answer. they're bad at everything i actually needed: reordering a cast sequence and seeing what changed, watching a ramp shift when a cooldown moves two seconds, looking at a timeline instead of reading a row of numbers. the answers i wanted were dynamic and visual, and a grid of cells is neither.

so it became a website, which turned out to be the second reason to build it. my day job is backend, so everything past the api was territory i'd read about and never actually shipped: structuring an app from nothing, registering a domain, getting it hosted and keeping it up. what was a personal, locally hosted website for screenshot usage ended up turning into a public facing repo of tools.

## what's on it

<div class="tool-grid">
{% <tool url="https://waitimramping.com/timeline" image="https://www.waitimramping.com/previews/timeline.png" title="spell timeline" description="create customized timelines for spell casts and cooldowns"> %}{% </tool> %}
{% <tool url="https://waitimramping.com/analysis/spell-reference" image="https://www.waitimramping.com/previews/spell-reference.png" title="spell reference" description="view spellpower data for all relevant spells and talents"> %}{% </tool> %}
{% <tool url="https://waitimramping.com/analysis" image="https://www.waitimramping.com/previews/heart-of-the-jade-serpent.png" title="graph & analysis tools" description="compare healing mechanics with data-driven insights"> %}{% </tool> %}
{% <tool url="https://waitimramping.com/bugs" image="https://www.waitimramping.com/previews/bugs.png" title="bugs & issues" description="track known issues and bugs affecting specializations"> %}{% </tool> %}
</div>

### and more

the four above are the front page. behind them sit the rest of the [analysis pages](https://waitimramping.com/analysis), each one built to answer a single question that kept coming up: what's the math behind this?!

whether it be a direct one-to-one comparison between spells, the total package of a healing distribution, or just a mapped out visual view of an independent scalar - all of this collated into the analysis that's drawn on the page.

## the interesting part

### where the numbers come from

every spell in world of warcraft has a coefficient that is a scalar against your main stat, which for healers is intellect, and it's what turns "this spell exists" into "this spell heals for x".

a baseline spell description reads in this manner:
```txt
Renewing Mist
1.8% of base mana	40 yd range
Instant	9 sec recharge
2 Charges
Requires Monk
Surrounds the target with healing mists, restoring (196.65% of Spell Power) health over 20 sec.

If Renewing Mist heals a target past maximum health, it will travel to another injured ally within 20 yds.
```

which can be translated to the following datapoint:
```ts
RENEWING_MIST: {
    name: 'Renewing Mist',
    id: 119611,
    icon: 'ability_monk_renewingmists',
    castTime: 0,
    cooldown: 9,
    charges: 2,
    school: SCHOOLS.NATURE,
    coeff: 1.9665,
    custom: {
        duration: 20
    },
    category: CATEGORY.HEALING,
    periodic: true,
},
```

where the `coeff` field is our coefficient slot: sitting at `(spellpower% / 100)`.

the base is almost never what you actually get, though. each specialization layers core passive auras on top, then talents modify it further, and lastly the secondary stats depict what the output will be. a spell's real output is the base coefficient run through a chain of multipliers.

that chain is the whole model:

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

{% <note clickable={true} hidden={true} header="simplifying stats"> %}flattening critical strike is a deliberate design choice. crit is a discrete event on any single cast, but across a raid's worth of casts it converges on your crit percentage, so treating it as a flat multiplier is correct in aggregate and wrong for exactly one cast.

the site isn't a simulation. raidbots answers that question properly, by collating thousands of simulated runs. this is meant to formulate answers that are as close as possible in total rather than per cast, which makes the average the honest number to use.

in a lot of the analysis, excluding stats beyond intellect (and the ones that scale directly through talents) is what makes a spell's individual contribution visible at all.{% </note> %}

`getSpellAura` is where the spec's identity gets applied. it flattens every core passive into the effects that touch this spell and folds them into a single multiplier:

```ts
export const getSpellAura = (spell: Spell, corePassives: CorePassive | CorePassive[], calcType: 'damage' | 'healing' = 'damage'): number => {
    const passives = Array.isArray(corePassives) ? corePassives : [corePassives];
    return passives.flatMap(p => matchingEffects(spell, p, calcType))
        .reduce((aura, { effect }) => aura * (1 + (effect.value as number) / 100), 1);
};
```

some spells simply don't have a core passive aura modifier, and that's ok! the reduce starting at `1` comes back as an identity multiplier rather than a zero, so these spells don't suddenly vanish on their throughput.

there's a parallel `getSpellAuraSources` that returns the same effects unfolded, labelled by which passive and which effect index contributed. that's what lets the ui show its work: instead of one number, you see every multiplier that produced it. that turned out to be one of the most useful debugging tool in the project, because when a number looks wrong you can see immediately which link in the chain is wrong.

core passives are only half the modifier story. talents are the other half, and they're expressed as rules evaluated against the player rather than baked into the spell:

```ts
export const calculateSpellHealingMultiplier = (spell: spell, player: Player, rules: TalentRule[]): number => {
    let multiplier = 1;

    for (const rule of rules) {
        if (!isTalentEnabled(player.talents, rule.talent)) continue;
        if (rule.appliesTo(spell)) {
            multiplier *= (1 + rule.getValue(player.stats));
        }
    }

    return multiplier;
};
```

a `TalentRule` carries three things: the talent it depends on, a predicate for which spells it touches, and a function that produces its value.

for example:

```ts
{
    talent: TALENTS.YULONS_KNOWLEDGE,
    getValue: () => TALENTS.YULONS_KNOWLEDGE.custom.rskDamageIncrease,
    appliesTo: (spell) =>
        spell.id === SPELLS.RISING_SUN_KICK.id ||
        spell.id === TALENTS.RUSHING_WIND_KICK.id
},
```

thankfully, most of these talents are multipliers - two 10% increasing talents give 21% rather than 20%. this is pretty standard, and we don't see much deviation from it.

the two halves compose at the end:

```ts
export const calculateSpellHealing = (spell: spell, player: Player, rules: TalentRule[]): number => {
    const base = calcSpellValue(spell, player, 'healing');
    return base * calculateSpellHealingMultiplier(spell, player, rules);
};
```

that split is deliberate. `calcSpellValue` answers "what does this spell do for this spec", which barely changes. the rules layer answers "what does this spell do for this build", which changes every time someone moves a talent point. keeping them apart means a talent change re-evaluates a handful of predicates instead of rebuilding the spell from its coefficient up.

i acknowledge this framework can be tidied up with a bit more emphasis on read-once, set-once style of architecture. performance is still incredibly fast here, considering the small amount of datapoints, but it can get increasingly better.

### knowing when it's wrong

validation when you don't have access to the base data is not pretty. cast the spell in game, then stare very hard at the logs. if the number the site predicts and the number the log shows don't line up, something is wrong and the interesting question is **what.**

sometimes it's me. sometimes it isn't. chasing those mismatches has turned up a run of small but real bugs in the specs themselves, the kind that never show up in a tooltip and only surface when you have a predicted value to compare against. that's the part i enjoy most: the model is a hypothesis, and every disagreement with a log is an experiment that says one of us is wrong.

if only unit tests with concrete data from the game could be written here - oh, the joys i'd have!

### keeping the data honest

the hard part isn't the math, it's staying current. blizzard tunes numbers all the time, and a tool that's confidently out of date is worse than no tool.

[simulationcraft](https://github.com/simulationcraft/simc/) solves this with an automated datamining pipeline that pushes spell data into their repo on every build. i read from that, so when a new build gets datamined the correct values are already sitting in a public repo waiting to be pulled across.

right now that swap is manual. the goal is to automate it the way simc does - datamining, resolving the output data, comparing against current, and pushing in the same format so that upkeep is small but verifiable.

### it hasn't stopped changing

this has been an ongoing project since february 2025 and the early code is barely recognizable now. that's mostly a function of learning: i started it not knowing how to structure a frontend app, so the first version reflects that, and each rewrite since has been me applying something i didn't know the last time.

## stack

**built with:** typescript, material ui, node, cloudflare  
**data:** [simulationcraft's spell data](https://github.com/simulationcraft/simc/)

## stats

**launched:** _feb 28, 2025_  
**analysis pages:** _14_ distinct, _4_ defunct  
**daily visits:** _~300_  
**monthly visits:** _~8k_, more at the start of a season  
**peak day:** _30.8k_  
**devices:** _87.3%_ desktop, _12.6%_ mobile, _0.1%_ tablet  
**top countries:** _36.6%_ united states, _9.0%_ germany, _7.4%_ france  
**most viewed:** [bugs](https://waitimramping.com/bugs), then [when do i ramp?](https://waitimramping.com/when-do-i-ramp)  
**codebase:** _~20k_ lines of typescript across _174_ files  
**commits:** _840_ as of _july 28, 2026_
