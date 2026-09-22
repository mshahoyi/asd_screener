# Exported data format

**Export** (per participant or all data) writes a zip archive,
`participant_<anonymousId>_export.zip` or `all_data_export.zip`, containing four JSON
files. Each file is an array with one object per database row, and the fields are the
columns of `db/schema.ts`.

> **Timestamps.** The row-level `timestamp`, `startedAt`, `endedAt` and `createdAt` fields
> are stored in **whole seconds**. Millisecond timing exists only in
> `properties.timestamp` of `touch_*` and app-lifecycle events (see below). Use those for
> any latency or kinematic measure.

## participants.json

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Internal participant key |
| `anonymousId` | text | Anonymous code entered by the researcher (default `P_xxxxxx`) |
| `age` | integer | Age as entered (the study entered months) |
| `gender` | text | As entered |
| `condition` | text | Group as entered (e.g. `ASD`, `TD`) |
| `note` | text | Free-text note. **Do not enter identifying information** |
| `createdAt` | timestamp (s) | Record creation time |

## games.json

One row per session.

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Session (game) key |
| `participantId` | integer | → `participants.id` |
| `startedAt`, `endedAt` | timestamp (s) | Session start; end (empty if the app was closed mid-session) |

## itemClicks.json

One row per tap on an object. The cue and difficulty levels are those in force **when the tap
was made**.

| Field | Type | Meaning |
|---|---|---|
| `id`, `participantId`, `gameId` | integer | Keys |
| `item` | text | Object shown (e.g. `ball`, `book`) |
| `position` | text | Position tapped: `left`/`right` (DL-I) or a corner (DL-II) |
| `correctPosition` | text | Target position; a tap is correct if `position == correctPosition` |
| `cueLevel` | integer 1–4 | Cue level at the time of the tap |
| `difficultyLevel` | integer 1–2 | 1 = two shelves, 2 = four shelves |
| `timestamp` | timestamp (s) | Time of the tap |

## gameEvents.json

A timeline of everything that happened in a session. `properties` is a JSON object whose
content depends on `name`.

| `name` | When | `properties` |
|---|---|---|
| `touch_start`, `touch_move`, `touch_end` | Every native touch event anywhere on the game screen | `identifier`, `target`, `locationX/Y` (relative to the touched view), `pageX/Y` (screen), `force`, `timestamp` (**ms**). Coordinates are in device-independent points |
| `selection` | An object tap handled by the task | Task state **after** the tap (`difficultyLevel`, `cueLevel`, `trialCount`, `lastCorrectCueLevel`, `correctItem`, `selectedPosition`, …). Use `lastCorrectCueLevel`, or `itemClicks.cueLevel`, for the cue level at which the tap was made |
| `pan_handler_begin`, `pan_handler_update`, `pan_handler_end` | Drag gesture on the target during the drag screen | Gesture-handler event: `x`, `y`, `absoluteX`, `absoluteY`, `translationX/Y`, `velocityX/Y` (points/s), `handlerTag`, `state`, … |
| `drag_successful`, `drag_unsuccessful` | End of the drag screen | Task state |
| `game_screen_mount`, `game_screen_unmount`, `app_state_initial`, `app_foreground`, `app_background`, `app_inactive` | Session and app lifecycle | `timestamp` (ms) and state |
| `natural_game_end` | Session ended at the time limit | — |
| `manual_game_end` | Researcher ended the session with the X button | — |

Trial and cue-level onsets are not logged as separate events. Reconstruct them from
`selection` and the drag events together with the timing settings used.
