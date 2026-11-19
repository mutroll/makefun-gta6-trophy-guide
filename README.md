[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mutroll/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mutroll/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Ledger — an offline GTA VI trophy guide, tracker & planner

The best offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5: official names, descriptions and grades, a checklist saved in your browser with export and import, filters by kind, grade, chapter and state, a spoiler setting that hides story trophies until earned, a roadmap to the platinum with per-stage progress, the one potentially missable trophy flagged — and a guide to every trophy in our own words, each with its sources named.

## The Next-up Planner

The part no plain checklist has: a personal planner that reads the trophies you have ticked off, the hours you have played and the run you want — follow the story, quick wins first, chase the 100% checklist, or long grinds first — and builds your ordered queue to the platinum:

- **Prerequisites first.** Every trophy in `app/data/trophies.json` carries the trophies that must come before it, and the queue never asks for something whose gates are still closed.
- **The missable window is protected.** The one potentially missable trophy is held at the front while its Chapter 1 window is open.
- **Every entry explains itself** — its chapter, its typical focused time, what it unlocks, and why it sits where it sits — and the queue is grouped by chapter so a session plans itself.
- **Time to platinum, two ways**: the roadmap model (stage budgets weighted by what is left) and a projection from your own pace, both on the Planner and Roadmap pages.
- **Per-trophy notes**: your own counts, spots and half-done grinds, saved per trophy, searchable, and carried by Export / Import along with your ticks and planner settings.

The roadmap page tracks each of the three stages with its own progress bar, percent complete and hours-left figure, all updating from the same ticks.

## Try it

Serve `app/` with any static server and open `index.html` — it works with the network off:

```sh
node serve.ts   # serves app/ on http://localhost:8080
```

Add `?seed=demo` to the URL to see it mid-run, with thirteen trophies ticked, two notes written and the planner working from 26 hours played.

## What is inside

- `app/index.html`, `app/style.css`, `app/js/` — the guide: tracker, Next-up planner, roadmap and missables views, no build step, no network requests at runtime. `app/js/planner.js` is the planner's ordering logic on its own, so it can be read (and tested) without the DOM.
- `app/data/trophies.json` — the official 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze) with a guide and cited sources for each, plus each trophy's chapter window, typical-time estimate and prerequisites for the planner.
- `screenshots/` — real renders of the guide in a browser.
- `main.ts` — the entry program (Node 22, stdlib only): validates the trophy data (55 trophies, every guide and planner field present, every prerequisite resolvable), copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.

## Sources

Guides are written in our own words from PowerPyx's GTA 6 Trophy Guide & Roadmap, the official list as carried by Exophase and PSNProfiles, and KeenGamer's trophy guide — each guide names its sources, and the five methods still unconfirmed at launch are marked as such rather than guessed. Names and descriptions are the official ones as PlayStation publishes them. No Rockstar Games logo, artwork or game screenshots are used. An unofficial fan guide, not affiliated with Rockstar Games or PlayStation.

## License

MIT — see `LICENSE`.
