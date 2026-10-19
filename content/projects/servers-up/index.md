+++
title = "servers up"
description = "a discord bot that watches world of warcraft realm status and posts when realms go down or come back up. runs on a raspberry pi and updates itself from github."
weight = 5
date = 2026-10-12

[taxonomies]
tags = ["javascript", "node", "discord", "raspberry-pi", "wow"]

[extra]
blurb = "discord bot for wow realm status, running on a raspberry pi"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "servers-up/screenshot.png"
tags = ["javascript", "node", "discord"]
github = "https://github.com/lolswirl/serversup"
+++

## intro

every tuesday the realms go down for maintenance, and every so often they go down when they aren't supposed to. either way, the question in discord is the same: are servers up yet?

**server's up**, the discord bot, answers that. it checks realm status through blizzard's api every minute and posts when something changes.

## what it posts

- **region-wide changes:** when at least half the realms in a region flip at once, it posts one message instead of hundreds, and names any realms you're watching
- **all realms up:** when the last realm that was down comes back
- **watched realms:** a realm on your watch list going down or coming back, with a note if there's a login queue
- **maintenance warnings:** an hour and 15 minutes before the weekly maintenance window
- **status unavailable:** when blizzard's api fails three polls in a row. it posts once, then stays quiet until a poll succeeds

the bot's own discord status shows the count, like "Watching 83/83 US realms up". `/status` gives a region summary, or details for one realm: population, queue, and which realms it's connected to.

## how it works

### polling

blizzard groups realms into connected realms that share a status. the api has a search endpoint that returns every connected realm in a region, up to a thousand per page, so a full poll is one or two requests.

each poll is compared to the last one. realms that changed status are sorted into went down and came up, and the share of the region that changed decides whether it's one region-wide alert or individual ones for watched realms:

```js
// Region-wide events (maintenance / big outage): one message instead of hundreds
const massDown = wentDown.length / total >= cfg.massThreshold;
const massUp = cameUp.length / total >= cfg.massThreshold;

if (massDown) await post(alerts.massDown(wentDown, s), true);
if (massUp) await post(alerts.massUp(cameUp, s), true);

// Region fully recovered after a mass event that trickled back in
if (!massUp && cameUp.length && s.down === 0) await post(alerts.allUp(s), true);
```

api failures aren't alerts on their own. a single failed request is common and means nothing, so it takes three in a row before it posts anything.

### maintenance

blizzard has no api for maintenance, so the warnings follow the usual schedule: tuesday at 7am pacific for us realms. the bot reads the clock in the maintenance time zone, so daylight saving time is handled without extra code, and each warning is tracked by week so it only posts once.

the time until maintenance is counted in minutes since the start of the week, wrapped around so it's never negative:

```js
const nowMin = WEEKDAYS[parts.weekday] * 1440 + Number(parts.hour) * 60 + Number(parts.minute);
const target = cfg.maintDay * 1440 + cfg.maintHour * 60;
return (target - nowMin + 10080) % 10080; // minutes in a week
```

## running on a raspberry pi

the bot runs on my raspberry pi. it's one node process with two dependencies, so the pi has plenty of room for it.

an install script sets it up as a systemd service. it checks the node version, makes sure the config exists, installs dependencies, and writes the service file. the service starts on boot and restarts itself if it crashes.

a second script handles updates. it installs a systemd timer that checks github every minute, and when `main` has new commits, it resets the checkout to match, reinstalls dependencies, and restarts the bot. a push reaches the pi within about a minute, without me logging into it.

two details keep the updater reliable:

- the update script lives outside the repo, so an update can't rewrite the script while it's running
- it records the last commit that finished deploying, not just the last one it fetched, so a failed install gets retried on the next run

the core of the update script:

```bash
as_user git fetch --quiet origin main
target="$(as_user git rev-parse origin/main)"
# Compare against the last commit that finished deploying, so a failed install is retried
deployed="$(cat .git/servers-up-deployed 2>/dev/null || true)"
[[ "$target" == "$deployed" ]] && exit 0

# Mirror GitHub exactly: local edits to tracked files are discarded, .env is untouched
as_user git reset --hard --quiet "$target"
as_user npm ci --omit=dev
systemctl restart servers-up
echo "$target" > .git/servers-up-deployed
```

## stack

**built with:** node, discord.js  
**data:** blizzard's game data api  
**hosting:** raspberry pi, systemd
