# Gamified joint-attention task (GS)

An iPad app that measures preschool children's **response to joint attention (RJA)**
automatically. A child-like virtual character ("Adam") asks the child to find an object
on a shelf and shows which one he wants with increasingly explicit cues:

| Cue level | Adam's cue | Score |
|---|---|---|
| CL-I | eye gaze | 100 |
| CL-II | + head turn | 70 |
| CL-III | + pointing | 40 |
| CL-IV | + the target sparkles | 10 |

A wrong tap, or no tap before the cue level times out, moves to the next cue level. After
each trial, a drag screen asks the child to bring the object to Adam. Trials start with two
shelves (DL-I) and move to four shelves (DL-II) after a correct tap at CL-I or CL-II. Every
touch, selection and drag is logged on the device and can be exported as JSON.

The task adapts the hierarchical-prompt protocol of Jyoti & Lahiri (2019, 2020) to a
consumer tablet. It is described and evaluated in:

> Hasan, H. H., Ford, R. M., & Abu Baker, M. (in preparation). *An open-source gamified tablet
> system for automated assessment of response to joint attention: A pilot study with autistic and
> typically developing preschoolers.*

## Requirements

* iPad running iPadOS (the study used an iPad 9th generation, 10.2-inch), portrait orientation
* To build: Node.js, [pnpm](https://pnpm.io), and an [Expo](https://expo.dev) account with EAS CLI
  (`npm i -g eas-cli`), or Xcode for a local build

## Build and install

```bash
pnpm install
eas build --profile development --platform ios   # installable development build
# or, with Xcode installed and an iPad connected:
npx expo run:ios --device
```

`eas.json` also defines `preview` and `production` profiles. The app needs no network
connection during testing.

## Running a session

1. **Settings** (gear icon): set the session length and the timeout for each cue level and the
   drag screen, in seconds. The published study used 15 s per cue level, 15 s for the drag
   screen and a 180-s session.
2. **Add a participant** (+ button): anonymous code, age, gender and group. Do not enter names
   or other identifying information.
3. **Start Game** on the participant's card. The session runs by itself and ends when the time
   limit is reached. The X button ends it early.
4. **Export** a participant (card button) or all data (toolbar icon). A zip of JSON files is
   handed to the iPad share sheet. See [docs/DATA.md](docs/DATA.md) for the format.

Settings are stored on the device but not in the export. Record the values you used.

## Code map

| Path | What it does |
|---|---|
| `scripts/gameState.ts` | Task logic: XState machine for cue escalation, difficulty levels and session end |
| `scripts/settingsController.ts` | Timing settings and their defaults |
| `app/[participant]/game/[gameId].tsx` | Game screen: layout, object taps, touch logging |
| `components/GameVideo.tsx` | Which video clip plays in each state |
| `hooks/useDragHandler.native.ts` | Drag gesture and its logging |
| `db/schema.ts`, `scripts/exportController.ts` | On-device database and JSON export |
| `assets/` | Character videos (with speech), objects, backgrounds |

Tests: `pnpm test`.

## Stimuli

* Adam and the objects: generated with ChatGPT (OpenAI) image generation
* Adam's speech: synthesised with text-to-speech
* Adam's head, eye and face movements: animated with LivePortrait (Guo et al., 2024)
* Rooms: drawn in Procreate

Details and licence: [assets/README.md](assets/README.md).

## Licence

Code: MIT (see [LICENSE](LICENSE)). Stimuli: see [assets/README.md](assets/README.md).
If you use the task, please cite the paper above and this repository (see
[CITATION.cff](CITATION.cff)).
