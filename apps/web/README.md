# Aleo — Chess Royale (web)

Visual UI pass for the Aleo Chess Royale Next.js 14 app. Duolingo-inspired
cartoon-casual aesthetic with the Aleo blue brand.

## Stack

- **Next.js 14** App Router · **TypeScript strict** · **TailwindCSS** · **Framer Motion**
- **next-intl** for localization (English shipped, RU/KK to follow)
- **Howler.js** sound hooks (assets ship in a later pass)
- **Lucide** icons
- Cartoon SVG mascot ("Aleo") and cartoon SVG chessboard pieces — no third-party
  chessboard or chess engine package added.

## Stockfish

The Stockfish source lives at the repository root (`engine/Stockfish/`, from
official-stockfish/Stockfish). The compiled WASM artifacts are expected at
`apps/web/public/engine/`. **All engine calls in this UI pass are stubbed**
with `// TODO: wire to root-level Stockfish WASM` markers — see
`apps/web/lib/engine.ts`.

This pass intentionally does **not**:

- Add any new chess engine npm package
- Fetch, generate, or replace any WASM
- Implement business logic, networking, or payment flows

## Getting started

```sh
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

| Route                  | Screen                                          |
| ---------------------- | ----------------------------------------------- |
| `/`                    | Splash / Login                                  |
| `/onboarding/city`     | Onboarding step 1 — city autocomplete           |
| `/onboarding/avatar`   | Onboarding step 2 — pick avatar                 |
| `/onboarding/skill`    | Onboarding step 3 — skill level                 |
| `/play`                | Home / Play tab (hero, time controls, etc.)    |
| `/puzzles`             | Puzzles tab                                     |
| `/learn`               | Learn tab (free + Pro courses)                  |
| `/social`              | Social tab (Friends · Cities · Clans)           |
| `/profile`             | Profile tab                                     |
| `/store`               | Store (Skins · Battle Pass · Pro · Coins)       |
| `/matchmaking`         | Matchmaking spinner                             |
| `/game`                | Game screen                                     |
| `/review`              | Post-game review banner                         |
| `/coach`               | AI Coach detail view                            |

## Component library

All exported from `apps/web/components/`:

- `ChunkyButton` — chunky 3D primitive
- `AleoMascot` — minimalistic blue cartoon horse with `mood` prop
- `ChessboardWrapper` — pure-visual board with FEN, keyboard nav, no engine
- `RankBadge` — Bronze → Grandmaster cartoon shields
- `StreakFlame` / `StreakBadge`
- `CoinBalance` (with springy +/- animation)
- `WagerIndicator`
- `LeaderboardRow` (city / clan / friend / global variants)
- `CityCard`
- `LootCapsule` (idle wobble → burst-open + confetti)
- `ProUpsellModal` (sparkle gradient · feature comparison)
- `BattlePassTrack` (free + premium tiers)
- `BottomNav` / `DesktopRail`
- `Header` / `MascotFAB`
- `DailyPuzzleCard` / `DailyQuestList` / `DailyQuestRow`
- `PlayerStrip` (game screen)

## Design tokens

See `tailwind.config.ts` and `app/globals.css`. Brand:
`#2AB2FF` Sky · `#0047BB` Cobalt · `#E1F5FF` Pale · `#002157` Navy ·
`#FFC800` Coin · `#58CC02` Win · `#FF4B4B` Loss · `#FFD700` Pro Gold.
