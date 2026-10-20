+++
title = "karen"
description = "a dashboard and auto-updater for my raspberry pi: system stats, services, and every project's deployed commit and logs, plus deploying new github commits on its own."
weight = 10
date = 2026-10-20

[taxonomies]
tags = ["javascript", "node", "raspberry-pi"]

[extra]
blurb = "dashboard and auto-updater for a raspberry pi"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
local_image = "karen/screenshot.png"
tags = ["javascript", "node", "raspberry-pi"]
github = "https://github.com/lolswirl/karen"
+++

## intro

once [hearthbeat](/projects/servers-up/) was running on my raspberry pi, i wanted to see what the pi was doing without ssh-ing into it: is the bot up, which commit is it on, did the last update go through. karen is that page, and it also took over the job of deploying updates from github.

## what it does

karen runs on the pi and serves a page to my home network. it shows:

- **system:** uptime, load, memory, disk and cpu temperature
- **projects:** each project's service state, deployed commit, and whether github has a newer one, with a restart button. selecting a project shows its log beside the list
- **auto-updater:** when it last ran, its log, and a button to check github right now
- **services:** every systemd service that is running or has failed

{{<screenshot src="screenshot.png" alt="karen showing system stats, the project list beside hearthbeat's log, and running services" />}}

the page refreshes every 10 seconds, and karen has no npm dependencies.

## how it works

### projects

the projects karen manages are listed in a `projects.json`: a folder with the git checkout, and the systemd service that runs it. karen lists itself too, so it updates itself like everything else.

```json
[
  { "dir": "~/hearthbeat", "service": "hearthbeat" },
  { "dir": ".", "service": "karen" }
]
```

### updating

a systemd timer runs `update.js` every minute. for each project it fetches `main`, and when there's a new commit it resets the checkout to match github, runs `npm ci` if there's a lockfile, and restarts the service. the last commit that finished deploying is recorded, so a failed install is retried on the next run:

```js
await git('reset', '--hard', '--quiet', target);
const hasLock = await access(path.join(p.dir, 'package-lock.json')).then(() => true, () => false);
if (hasLock) await exec('npm', ['ci', '--omit=dev'], { cwd: p.dir, timeout: 600_000 });
await exec('sudo', ['-n', SYSTEMCTL, 'restart', p.service]);
await writeFile(marker, target);
```

### permissions

an install script sets karen up as a service and writes a sudoers rule that allows exactly `systemctl restart` for each listed project, and starting the updater, nothing else. there's no login, so the page is only meant for my home network. its buttons require a custom request header, which other websites open in my browser can't send, so they can't trigger a restart.

## stack

**built with:** node, no dependencies  
**hosting:** raspberry pi, systemd
