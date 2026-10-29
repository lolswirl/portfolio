+++
title = "mend"
description = "a real-time terminal game where you are the healer of a five-person party fighting a boss."
weight = 12
date = 2026-10-24

[taxonomies]
tags = ["go", "terminal"]

[extra]
blurb = "a healer game for the terminal"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "mend/screenshot.png"
tags = ["go", "terminal"]
github = "https://github.com/lolswirl/mend"
+++

## intro

a real-time game where you play the healer. the party is five members, one tank, you, and three damage dealers, fighting a boss. you never attack: you keep everyone alive by casting spells, and the boss telegraphs its big hits ahead of time so you can get ready for them. the names, spells and bosses are original, the roles are borrowed from the games i play.

## what it does

- **encounters:** each fight is picked from a menu, and an encounter unlocks only after the one before it is beaten. so far there is one, a 60 second fight against the hollow warden
- **casting:** a cast bar, a global cooldown, per-spell cooldowns, mana, and a flash when a cast is refused. you target a party member with the keyboard or the mouse
- **forfeit:** you can give up an encounter on purpose, which counts as a loss
- **results and progress:** a results screen after each fight, and your fastest win per encounter is saved

## how it works

### a simulation apart from the ui

the game logic is a package with no terminal code in it. it advances in fixed 50ms steps, and casts, cooldowns and boss timers are all counted in sim time instead of wall-clock timers. the interface only turns keys into commands, steps the sim and draws what it sees. the repo has an adr explaining the choice: runs replay exactly from a seed, the sim is tested without a terminal, and a slow or resized terminal can't change how a fight ends.

```go
func (s *Sim) Step() {
	s.gcd = max(s.gcd-Tick, 0)
	for i := range s.cooldowns {
		s.cooldowns[i] = max(s.cooldowns[i]-Tick, 0)
	}
	if s.outcome != Playing {
		return
	}
	s.elapsed += Tick
	// ...
}
```

### encounters as data

a boss is a go struct: its health, a steady melee attack on the tank, and a timeline of events, each with a damage amount and how many seconds of warning it gives.

```go
Events: []sim.EventConfig{
	{At: 20 * time.Second, Kind: sim.Pulse, Damage: 35, Telegraph: 3 * time.Second},
	{At: 35 * time.Second, Kind: sim.Hit, Damage: 70, Telegraph: 2 * time.Second},
	{At: 45 * time.Second, Kind: sim.Pulse, Damage: 35, Telegraph: 3 * time.Second},
},
```

### saving

progress is a small json file with the fastest win for each encounter. a file that can't be read is moved aside to a `.bak` and the game starts fresh, with a notice saying so. a `-seed` flag plays every attempt with the same seed.

## stack

**built with:** go, [bubble tea](https://github.com/charmbracelet/bubbletea), lip gloss  
**tests:** table-driven sim tests, and ui tests  
**ci:** github actions running gofmt, vet and the tests
