+++
title = "termagotchi"
description = "a virtual pet that lives in your terminal, keeps living while the app is closed, and can be played over ssh."
weight = 11
date = 2026-10-22

[taxonomies]
tags = ["go", "terminal"]

[extra]
blurb = "a tamagotchi-style pet for the terminal"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "termagotchi/screenshot.png"
tags = ["go", "terminal"]
github = "https://github.com/lolswirl/termagotchi"
+++

## intro

a tamagotchi that lives in the terminal. you feed it, play with it, clean up after it and put it to bed, and it keeps living while the app is closed: open it again and it catches up on everything it went through while you were away.

## what it does

- **stats:** food, fun, energy, clean and health, each from 0 to 100. any stat at 0, or being sick, drains health, and when health hits 0 the pet dies
- **growing up:** egg, baby, child, teen and adult. it only hatches or grows while you're watching and it's awake
- **sleep:** it falls asleep on its own from 22:00 to 07:00, and sleeping is the only way to get energy back
- **scenes:** the big moments play full-screen scenes from greek myth. hatching is the orphic egg, growing into a teen is the oracle at delphi, and dying is charon ferrying it across the styx
- **over ssh:** `termagotchi serve` hosts the pet as an ssh app, and everyone who connects shares the same pet

it can be played with keys or by clicking, and there is a `-dev` mode with controls for skipping time, changing stats and jumping between stages.

## how it works

### catching up

the pet is saved to a json file with the time it was last updated. when the game opens, it runs the pet forward minute by minute to the present, so a day away really is a day of getting hungry and sleepy.

### growing up

a pet's stage is decided by its age, but growing is separate from being due. the pet stays at its old stage until `GrowUp` runs, which only happens while someone is watching and the pet is awake, so nobody misses a hatching:

```go
func (p *Pet) GrowUp(now time.Time) bool {
	due := p.DueStage(now)
	if p.Asleep || p.Dead || due <= p.Stage {
		return false
	}
	p.Stage = due
	return true
}
```

### ssh

the server is built with wish. each connection gets its own interface on top of the same saved pet, and a ticker advances the pet every minute even when nobody is connected:

```go
go func() {
	for now := range time.Tick(time.Minute) {
		if err := st.Advance(now); err != nil {
			log.Error("saving pet", "err", err)
		}
	}
}()
```

by default only keys in `~/.ssh/authorized_keys` can connect. a systemd unit in the repo runs it as a service.

## stack

**built with:** go, [bubble tea](https://github.com/charmbracelet/bubbletea), lip gloss, wish, bubblezone  
**tests:** screen snapshots for every screen, plus unit tests for the pet
