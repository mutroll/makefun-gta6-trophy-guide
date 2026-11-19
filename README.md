[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mutroll/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mutroll/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Ledger — an offline GTA VI trophy guide & tracker

The best offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5: official names, descriptions and grades, a checklist saved in your browser with export and import, filters by kind, a spoiler setting that hides story trophies until earned, a roadmap to the platinum, the one potentially missable trophy flagged, and a guide to every trophy in our own words, each with its sources named.

## Try it

Serve `app/` with any static server and open `index.html` — it works with the network off:

```sh
node serve.ts   # serves app/ on http://localhost:8080
```

## What is inside

- `app/index.html`, `app/style.css`, `app/js/` — the guide: tracker, roadmap and missables views, no build step, no network requests at runtime.
- `app/data/trophies.json` — the official 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze) with a guide and cited sources for each.
- `screenshots/` — real renders of the guide in a browser.
- `main.ts` — the entry program (Node 22, stdlib only): copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.

## Sources

Guides are written in our own words from PowerPyx's GTA 6 Trophy Guide & Roadmap, the official list as carried by Exophase and PSNProfiles, and KeenGamer's trophy guide — each guide names its sources, and the five methods still unconfirmed at launch are marked as such rather than guessed. Names and descriptions are the official ones as PlayStation publishes them. No Rockstar Games logo, artwork or game screenshots are used. An unofficial fan guide, not affiliated with Rockstar Games or PlayStation.

## License

MIT — see `LICENSE`.
