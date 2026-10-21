+++
title = "wcl scripts"
description = "a python script that pulls a warcraft logs report and checks whether a buff's removals line up with other buffs falling off the same target at the same moment."
weight = 11
date = 2026-08-05

[taxonomies]
tags = ["python", "wow", "theorycrafting"]

[extra]
blurb = "warcraft logs scripts for checking spell behavior"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "wcl-scripts/screenshot.png"
tags = ["python", "wow", "theorycrafting"]
github = "https://github.com/lolswirl/wcl-scripts"
+++

## intro

some questions about how a spell behaves can't be answered by reading its tooltip, but the answer is sitting in a combat log. [warcraft logs](https://www.warcraftlogs.com) has an api for getting at those logs, so this is where i keep small scripts that ask one question of a report.

right now there's one. it checks whether spiritfont is actually removing other buffs, or whether the buffs falling off at the same moment are a coincidence.

## what it does

`spiritfont_removal.py` takes a report code, and optionally a fight id. it looks at every buff removal on friendly players and finds the ones where spiritfont is removed at the exact same timestamp as a different buff on the same target.

- **one fight:** lists each match with the time into the pull, the target, the abilities involved, and a link to that moment in the report's event view
- **whole report:** does that for every fight, and starts with a count of which abilities collided with spiritfont most often

it prints the result and also writes it to an `out` folder next to the script. the fights are fetched in parallel, and a spinner shows while it works.

## how it works

### getting the data

it signs in with warcraft logs' client credentials, then asks the graphql api for the report's fights, its actors and abilities, and the buff events for each fight, following the next-page timestamp until it has them all.

```python
def get_token():
    resp = requests.post(
        "https://www.warcraftlogs.com/oauth/token",
        data={"grant_type": "client_credentials"},
        auth=(CLIENT_ID, CLIENT_SECRET),
    )
    resp.raise_for_status()
    return resp.json()["access_token"]
```

### filtering out coincidences

lots of buffs end together for unrelated reasons, so a match is thrown out if it looks like one of those. a removal of four or more buffs on one target at once is treated as a mass removal. a few known abilities are excluded outright. and if one of the other buffs was also removed from a different player within half a second, it looks like a global effect rather than something spiritfont did:

```python
other_abilities = ability_ids - {SPIRITFONT_ID}
# global removals are like roar from druid removing off everyone at the same or similar timestamps
looks_global = False
for aid in other_abilities:
    for other_e in by_ability.get(aid, []):
        if other_e.get("targetID") == target_id:
            continue
        if abs(other_e["timestamp"] - ts) <= NEARBY_WINDOW_MS:
            looks_global = True
            break
    if looks_global:
        break
```

## stack

**built with:** python, requests, the warcraft logs graphql api
