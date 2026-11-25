[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/huahhhas/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/huahhhas/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

# Sizzle & Serve

A fast kitchen-shift cooking game, built for the [best-cooking-game-20261125-0137](https://make.fun/bounty/best-cooking-game-20261125-0137) bounty on make.fun. It plays offline in a desktop browser from its own files — no build step, no network requests.

## How to play

Orders hang on the board at the top of the kitchen. Each dish is a set of ingredients: run the chef along the counter, grab ingredients from the bins, stack them on the plate, and serve before the order's patience runs out.

- **Move:** ← → or A / D (or click a bin to walk there)
- **Grab an ingredient:** Space (or click a bin)
- **Serve the plate:** Enter (or click SERVE) — only when the plate matches the current order
- **Clear the plate:** T (or click TRASH)
- **Pause:** P

Serve a dish right and you score 100 points plus a bonus for the patience still left, with a combo bonus for consecutive correct serves. Serve the wrong dish, or let an order walk out, and you lose a life. Three strikes — or the end of the 120-second shift — ends the day. Higher levels bring busier four-ingredient orders and shorter patience.

## The menu

- **Sunny Burger** — bun, patty, lettuce
- **Garden Salad** — lettuce, tomato, cheese
- **Cheesy Noodles** — noodle, tomato, cheese
- **Stacked Sandwich** — bun, cheese, lettuce, tomato
- **Patty Melt** — bun, patty, cheese
- **Noodle Bowl** — noodle, lettuce, tomato

## Run it locally

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged deterministically: `?shot=start|play|end&seed=1` (see `shots.json`). The entry program is `main.ts` (Node 22, standard library only): it copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library in `vendor/makefun-game.ts`.

## License

MIT — see [LICENSE](LICENSE).
