+++
title = "riff"
description = "spotify now playing and a remote for the even realities g2 smart glasses, drawn over bluetooth from a web app."
weight = 11
date = 2026-10-30

[taxonomies]
tags = ["typescript", "spotify", "smart-glasses"]

[extra]
blurb = "spotify now playing and remote for smart glasses"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
local_image = "riff/screenshot.png"
tags = ["typescript", "spotify", "smart-glasses"]
github = "https://github.com/lolswirl/riff"
+++

## intro

riff is spotify for the even realities g2 glasses. it's an even hub plugin: a web app that runs inside the even realities phone app and draws to the glasses over bluetooth. the glasses only light pixels, so the album cover is dithered into dots, like the covers on this site.

## what it does

there are two displays. the full display shows the cover, centred, first as plain greyscale and then dissolving into dots, with the title, artist, album and year under it, and a play or pause button, elapsed time and a progress line at the bottom. after an idle time the player shrinks into a corner with a small cover, title, artist and progress bar, and it can hide entirely until the song changes or you make a gesture.

{{<screenshot src="screenshot.png" alt="riff's full display on the glasses: the dithered cover, title, artist, album and a progress line" />}}

the temple or the r1 ring control it:

- **tap:** play or pause
- **swipe down and up:** next and previous track
- **long press:** scrub mode
- **double tap:** exit

in scrub mode a swipe moves a preview position by 5 seconds, and quick repeats move by 10 and then 30. nothing is sent to spotify until you tap, and it cancels after 6 seconds idle.

## how it works

### scrubbing

scrub mode is a small class that holds a preview position. swipes that land within 450ms of each other step up through longer jumps, and the position stops a second short of the end so a seek can't skip the song:

```ts
nudge(direction: 1 | -1, now: number): number {
    this.level = now - this.lastNudge <= REPEAT_WINDOW_MS ? Math.min(this.level + 1, STEPS_MS.length - 1) : 0;
    this.lastNudge = now;
    this.stepMs = STEPS_MS[this.level];
    const limit = Math.max(0, this.duration - END_MARGIN_MS);
    this.position = Math.min(limit, Math.max(0, this.position + direction * this.stepMs));
    return this.position;
}
```

### the cover

the dither is the one from this site's static/js/dither.js: a 4x4 bayer matrix, with the contrast stretched between the 2nd and 98th percentile so a bit of bright text can't flatten the rest. the dissolve from plain to dots reuses the same matrix, showing the plain picture where a dot's slot is below the current step:

```ts
out[i] = BAYER[(gy % 4) * 4 + (gx % 4)] < step ? plain[i] : ink[gy * grid + gx] ? 255 : 0;
```

images are the slow part of the bluetooth link, so frames are 16-level greyscale pngs to keep them small, and the dissolve follows a clock and skips steps when the link is slow.

### signing in

it talks to the spotify web api with the pkce flow, so there's no client secret on the phone. the settings page walks through making a spotify app, signing in, and pasting the code from a small callback page served by github pages. playback controls need spotify premium.

## stack

**built with:** typescript, vite, even hub sdk  
**tests:** node's built-in test runner  
**runs on:** even realities g2 glasses, through the even realities phone app
