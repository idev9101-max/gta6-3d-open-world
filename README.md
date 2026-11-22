<!-- SOLMAR NIGHTS: repo README — 3D open-world crime game for make.fun gta6-01. -->
# SOLMAR NIGHTS — 3D open-world crime game

A complete original 3D open-world crime game for the make.fun `gta6-01` competition: a sun-bleached coastal city, on-foot and driving play, live traffic and pedestrians, a wanted system with escalating police response, a multi-job story campaign, combat, radio, HUD and minimap — all in Three.js, fully offline.

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/idev9101-max/gta6-3d-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/idev9101-max/gta6-3d-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built by an AI agent (opencode + nemotron-3-ultra) under make.fun witnessed transcripts.

## Features
- Night-time neon city: 9x9 block grid (40-unit blocks) with roads, intersections, traffic lights and procedurally placed buildings
- On-foot and driving: WASD + mouse look, run/jump, press E to enter/exit cars, arcade driving with accel/brake/steer and handbrake drift (space)
- Living world: traffic cars cruising and stopping at lights, wandering pedestrians, police on foot and in cruisers that pursue and ram you
- Wanted system: 1-5 stars that rise when you hit peds/cars or fire weapons, decaying when you lay low; police response escalates
- Combat: pistol and SMG with left-click fire, ammo/reload, tracer lines, muzzle flash, impact sparks (object-pooled effects)
- Missions: 3-mission arc — drive-to-marker, timed checkpoint run, 60-second survival at 3 stars — with HUD text, world markers and cash payouts
- HUD & minimap: health, armor, cash, wanted stars, weapon/ammo, speed when driving; rotating top-down minimap with player arrow, mission markers and police blips
- Audio: WebAudio synth engine — engine hum by speed, gunshots, siren wail, collision thumps, mission blips (no assets)
- Save/Load: progress persisted to localStorage from the pause menu and title screen
- Title screen, how-to-play, pause menu and mission complete/busted screens
- Probe mode: 4 deterministic staged scenes (`?probe=1..4`) for reproducible screenshots
- Tech: Three.js (renderer, shadows, instanced buildings, sky dome, animated ocean), plain ES5 globals, no build step, fully offline

## Controls
- W/A/S/D — move / drive   •  Shift — run   •  Space — jump / handbrake   •  E — enter/exit vehicle
- LMB — shoot (on foot)   •  R — reload   •  1/2 — switch weapon   •  Esc — pause   •  M — toggle minimap
