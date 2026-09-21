# Handoff: CAPCIO — Resource Allocation

## Overview

CAPCIO is an internal resourcing tool for a frontend delivery team (7 people, ~12 concurrent client projects). It answers two questions: *what is wrong with this week's allocation*, and *who do I move to fix it*.

Two views in one shell:

- **Briefing** — a ranked feed of resourcing problems, each with one-click fixes and the arithmetic behind them.
- **Allocation** — a capacity column chart plus a per-person assignment editor.

Both views read and write the same assignment store. A shared **Draft mode** lets a user stage a multi-person reshuffle, see the net effect per person, then publish or discard.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy. `CAPCIO.dc.html` is a self-contained prototype with mock data and working interactions; it uses a small custom runtime (`support.js`) that has no place in a production app.

The task is to **recreate these designs in the target codebase's existing environment** — React, Vue, Svelte, whatever is already in use — following its established component patterns, state library and styling approach. If no codebase exists yet, pick the framework appropriate to the project and implement there.

Do not port the `.dc.html` structure. Read it for layout, values and behaviour; write idiomatic components.

## Fidelity

**High-fidelity.** Colours, typography, spacing, motion and interaction states are final. Recreate the UI to match, using the codebase's existing primitives where they exist (buttons, popovers, toasts) and matching the values documented below.

The one deliberate approximation is the **skill-fit** calculation (see State Management) — it is a placeholder algorithm, not a final product decision.

---

## Screens / Views

### Shell (both views)

**Purpose**: persistent chrome. View switching, date context, draft toggle.

**Layout**: full viewport height, `overflow: hidden`, horizontal flex.

- **Left rail** — `74px` fixed, right border `1px #DFD9CB`, vertical flex, centre-aligned, padding `16px 0 14px`.
  - Logo mark: `36×36`, radius `10px`, background `#E8442A`, white `C`, Archivo 19px/700, `font-variation-settings: 'wdth' 125`.
  - Nav buttons: two, `38×38`, radius `11px`, gap `6px`, `margin-top: 22px`. Icons `17×17` stroke-only, `stroke-width` 1.7–1.8.
    - Active: background `#FFFFFF`, border `1px #DCD5C6`, icon `#E8442A`.
    - Inactive: transparent background and border, icon `#7B7667`.
    - Briefing icon: speech bubble with two lines. Allocation icon: ascending bar chart.
  - Allocation nav carries a **badge** when any person is over capacity: absolute `top:-3px right:-3px`, min-width `16px`, height `16px`, radius `8px`, background `#E8442A`, white JetBrains Mono 9px/700, content = over-capacity headcount.
  - Spacer, then vertical wordmark `CAPCIO` (`writing-mode: vertical-rl`, `rotate(180deg)`, 11px/600, `wdth 125`, letter-spacing `0.32em`, `#A8A190`, `margin-bottom: 20px`).
  - Avatar: `32×32` circle, border `1px #D3CCBB`, initial in `#6E6959` 12px/600.

- **Header bar** — `52px` fixed, bottom border `1px #DFD9CB`, padding `0 26px`, horizontal flex, gap `14px`.
  - Breadcrumb: `Capcio` (11px/500, letter-spacing `0.14em`, uppercase, `#7B7667`) · `3px` dot `#C0B8A6` · current view name (same type, `#16150F`).
  - Spacer.
  - **Draft toggle** — height `30px`, padding `0 11px`, radius `8px`, pencil icon `12×12`, label 10px/700 uppercase letter-spacing `0.12em`.
    - Live state: label `Live`, transparent background, border `1px #DCD5C6`, text `#6E6959`.
    - Draft state: label `Draft`, background and border `#E8442A`, text `#FFFFFF`.
  - **Date chip** — height `30px`, border `1px #DCD5C6`, radius `8px`, calendar icon, `01 SEP 2026` in JetBrains Mono 11px `#16150F`. Static in the prototype; bind to today.
  - **New project** button — height `30px`, padding `0 14px`, radius `8px`, background `#E8442A`, white Archivo 11px/700 uppercase `wdth 112`, letter-spacing `0.06em`. Hover `#C4341F`. Not wired in the prototype.

- **Draft ribbon** — see Interactions.

---

### View 1 — Briefing

**Purpose**: open the tool, read what is wrong, resolve it without navigating anywhere.

**Layout**: scrollable region containing a horizontal flex of a main column and a fixed right rail.

- Main column: `flex: 1`, `max-width: 860px`, padding `40px 44px 60px 46px`.
- Right rail: `308px` fixed, left border `1px #DFD9CB`, background `#F1EDE3`, padding `40px 26px`, `align-self: stretch`.

#### Main column, top to bottom

1. **Date line** — baseline flex, gap `12px`. `TUE 01 SEP 2026` in JetBrains Mono 11px/700, letter-spacing `0.14em`, `#E8442A`. Then `Morning briefing` in Archivo 11px/600 uppercase, letter-spacing `0.16em`, `#8B8677`.

2. **Headline** — Archivo `44px`, line-height `1.06`, weight 700, `wdth 118`, letter-spacing `-0.035em`, `max-width: 14ch`, `text-wrap: pretty`. Margin `16px 0 0`. Generated copy — see Content below.

3. **Summary paragraph** — 16px, line-height `1.62`, `#46423A`, `max-width: 60ch`, margin `18px 0 0`.

4. **Section divider** — margin `34px 0 16px`. Label 10px/700 uppercase, letter-spacing `0.2em`, `#8B8677`, reading `N calls to make` or `Nothing outstanding`, followed by a `1px #DFD9CB` rule filling the row.

5. **Call cards** — vertical flex, gap `14px`.

   Card: background `#FFFFFF`, border `1px #E3DDD0`, **left border `3px` in the call's tone colour**, radius `12px`, padding `20px 22px 18px`, entry animation `capFade .4s ease` (opacity 0→1, `translateY(8px)`→none).

   - **Meta row** (`margin-bottom: 11px`, gap `9px`): kind label 9.5px/700 uppercase letter-spacing `0.16em` in the tone colour · `3px` dot `#C9C1AF` · evidence string 10.5px `#8B8677` · spacer · dismiss button.
     - Dismiss: `24×24`, transparent border, `#B7AF9C` × icon (`12×12`, stroke 2.2). Hover: colour `#46423A`, border `#DCD5C6`.
   - **Title** — 21px, line-height `1.28`, weight 700, `wdth 108`, letter-spacing `-0.018em`, `max-width: 44ch`.
   - **Body** — 13.5px, line-height `1.6`, `#5F5B4E`, `max-width: 62ch`, margin `8px 0 0`.
   - **Action row** — wrapping flex, gap `8px`, `margin-top: 16px`.
     - Action button: padding `9px 13px`, radius `9px`, left-aligned text, two stacked lines. Line 1: label 12.5px/700. Line 2: detail in JetBrains Mono 10.5px, `margin-top: 2px`. Hover: `border-color: #16150F`.
       - Primary (first action only): background/border `#16150F`, label `#FFFFFF`, detail `rgba(255,255,255,.62)`.
       - Secondary: background `#FFFFFF`, border `#DCD5C6`, label `#16150F`, detail `#8B8677`.
     - **Open-in-Allocation** button (shown on person-scoped calls): `inline-flex`, padding `9px 12px`, radius `9px`, **dashed** border `1px #C9C1AF`, transparent background, label 11px/700 uppercase letter-spacing `0.08em` `#7B7667`, arrow icon `12×12`. Hover: border and text `#E8442A`. Copy: `Open <Name>'s week`.

6. **Empty state** (no calls) — background `#FFFFFF`, dashed border `1px #C9C1AF`, radius `12px`, padding `30px 22px`, centred. Title 15px/700 `wdth 108`: `Nothing needs a decision`. Sub 12.5px `#8B8677`: `Everyone is inside capacity and every live project has someone on it.`

7. **Settled today** (only when the log is non-empty) — `margin-top: 34px`. Same divider treatment, label `Settled today`. Rows: background `#EFEBE1`, radius `9px`, padding `11px 14px`, gap `12px`, green check icon (`13×13`, `#0E9A63`, stroke 2.6), text 12.5px `#46423A`, then an **Undo** button — height `24px`, padding `0 9px`, border `1px #D3CCBB`, background `#FFFFFF`, radius `6px`, 9.5px/700 uppercase `#6E6959`; hover border and text `#E8442A`.

#### Right rail

- **Team pulse** — heading 10px/700 uppercase letter-spacing `0.2em` `#8B8677`. Rows in a vertical flex, gap `15px`, each clickable (jumps to Allocation with that person selected).
  - Row head: name 12.5px/600 `#16150F` · spacer · load in JetBrains Mono 12px/500 in the band colour · band word 9px/700 uppercase letter-spacing `0.1em` in the band colour (`Over` / `Full` / `Room` / `Free`).
  - Bar: height `8px`, radius `3px`, track `#E2DCCE`, fill in band colour, width `min(load, 100)%`.
  - Caption: 10.5px `#8B8677`, comma-joined project names or `nothing booked`, single line with ellipsis.
- **Coming back** — `margin-top: 32px`, top border `1px #DFD9CB`, `padding-top: 22px`. Rows gap `11px`: date in JetBrains Mono 11px/700 `#E8442A` (fixed `46px` column, uppercase `DD MON`), then 11.5px `#46423A` text `<Name> frees N% as <Project> ends`. Empty: `Nothing ends this quarter.`

---

### View 2 — Allocation

**Purpose**: see the whole team's week at once and rearrange it directly.

**Layout**: vertical flex — readout strip (auto), chart (scrollable, `flex: 1`), detail panel (auto).

#### Readout strip

Bottom border `1px #DFD9CB`, padding `0 26px`, horizontal flex. Four cells, each padding `17px 30px 17px 0`, `margin-right: 30px`, right border `1px #DFD9CB`, `min-width: 132px`.

- Value: Archivo `38px`/700, `wdth 125`, letter-spacing `-0.035em`, line-height `.9`.
- Suffix: 14px/600 `#8B8677`, baseline-aligned, gap `5px`.
- Key: `margin-top: 8px`, 9.5px/600 uppercase letter-spacing `0.18em` `#6E6959`.

| Key | Value | Suffix | Colour |
|---|---|---|---|
| Team load | average load, rounded | `%` | `#16150F` |
| Over capacity | count | `person` / `people` | `#E8442A` if > 0 else `#8B8677` |
| Fully free | count | `person` / `people` | `#2A62D6` if > 0 else `#8B8677` |
| Live projects | count | — | `#16150F` |

Right side: **Sort** — label 9.5px/600 uppercase letter-spacing `0.18em` `#8B8677`, then two pills (`Load`, `Name`), height `26px`, padding `0 11px`, radius `7px`, 10px/600 uppercase letter-spacing `0.1em`. Selected: background/border `#E8442A`, text `#FFFFFF`. Unselected: transparent, border `#DCD5C6`, text `#6E6959`.

#### Capacity chart

Scroll container padding `30px 26px 20px`; inner wrapper `min-width: 820px` so columns never crush.

**Vertical scale**: `unit = 2.8px` per percent at Comfortable density, `2.0px` at Compact. Board height = `142 × unit`. Y position of any value = `value × unit` measured from the bottom.

**Gridlines** — absolutely positioned overlay, `pointer-events: none`, `z-index: 2`, inset from `left: 46px`:

| Value | Style | Colour | Label colour |
|---|---|---|---|
| 0 | solid | `#DFD9CB` | `#A8A190` |
| 50 | dotted | `#DFD9CB` | `#A8A190` |
| 100 | dashed | `#E8442A` | `#E8442A` |

Labels sit in a `40px` right-aligned column at `left: 0`, `transform: translateY(50%)`, JetBrains Mono 10px/500.

**Columns** — horizontal flex, gap `10px`, `padding-left: 46px`, `align-items: flex-end`. Each column `flex: 1`, `min-width: 0`, clickable to select, entry animation `capFade .4s ease`.

- **Stack** — absolute at the column bottom, `flex-direction: column-reverse` so the largest assignment renders at the bottom. Animation `capRise .5s cubic-bezier(.2,.8,.3,1)` (`scaleY(.72)`/opacity `.35` → `scaleY(1)`/1, `transform-origin: bottom`).
  - Segment: height `alloc × unit`, background project colour at **15% alpha**, border `1px` project colour at **52% alpha**, radius `4px`, `box-shadow: inset 0 -2px 0 #F4F1EA` (fakes a 2px gap without affecting height math), padding `6px 8px`, `box-sizing: border-box`, `overflow: hidden`, `transition: opacity .16s, background .16s`.
    - Project short name shown only when segment height `≥ 30px`: 9.5px/700 uppercase letter-spacing `0.08em` in the **full-strength** project colour, single line with ellipsis.
    - Percent shown only when height `≥ 52px`: JetBrains Mono 11px/500, project colour at `opacity: .72`, `margin-top: 2px`.
    - `title` tooltip: `<Project> · <work> · <alloc>% · <start> → <end>` with dates as `DD Mon YY`.
    - **Hover dimming**: hovering any segment sets a hovered-project key; every segment of a *different* project drops to background 5% alpha, border 16% alpha, `opacity: .5`. Applies across all columns, so one project's whole footprint lights up at once.
  - **Free capacity block** (when load < 100 and the toggle is on): height `(100 − load) × unit − 2`, dashed border `1px #C9C1AF`, radius `4px`, `margin-bottom: 2px`, label bottom-left in JetBrains Mono 10px `#7B7667` reading `N% free`.

- **Overflow band** (load > 100): absolute, `left/right: -1px`, `bottom: 100 × unit`, height `(load − 100) × unit`, border `1px #E8442A`, radius `4px`, `z-index: 3`, `pointer-events: none`, fill `repeating-linear-gradient(135deg, rgba(232,68,42,.26) 0 5px, rgba(232,68,42,.07) 5px 10px)`.
- **Overflow flag**: absolute `left: 0`, `bottom: load × unit + 6`, `z-index: 4`, background `#E8442A`, white JetBrains Mono 10px/700, padding `2px 6px`, radius `4px`, content `+N%`.
- **Draft ghost line** (draft mode, load changed): absolute `left/right: -2px`, `bottom: was × unit`, `border-top: 1px dotted #8B8677`, `z-index: 5`. Caption above its right end: JetBrains Mono 9px/700 `#8B8677`, `was N%`.

- **Column footer** — `margin-top: 12px`, `padding-top: 12px`, top border `1px` (`#E8442A` when selected, else `#DCD5C6`).
  - Head row gap `8px`: initials chip `24×24`, radius `7px` (selected: `#E8442A` bg / `#FFFFFF` text; else `#E7E2D7` / `#6E6959`), 10.5px/700; then name 12.5px/600 `wdth 112`, letter-spacing `0.01em`, colour `#000000` when selected else `#46423A`, ellipsised.
  - Value row `margin-top: 9px`, `justify-content: space-between`, baseline-aligned: load in JetBrains Mono 17px/500 letter-spacing `-0.02em` in band colour · draft delta in JetBrains Mono 11px/700 (`+N` in `#E8442A`, `−N` in `#0E9A63`) · band key 9px/700 uppercase letter-spacing `0.12em` in band colour (`OVER` / `FULL` / `OPEN` / `FREE`).

#### Detail panel

Top border `1px #DFD9CB`, background `#EDE9DF`, padding `16px 26px 18px`, animation `capFade .3s ease`.

- **Header row** (wrapping flex, gap `14px`, `margin-bottom: 12px`): name 17px/700 `wdth 118` letter-spacing `-0.01em` · load JetBrains Mono 15px/500 in band colour · band pill (9.5px/700 uppercase letter-spacing `0.14em`, padding `4px 9px`, radius `5px`, band colour on band colour at 13% alpha; copy `Over capacity` / `Fully booked` / `Has room` / `Available`) · hint 11.5px `#6E6959` · spacer · **Assign work** button.
  - Hint copy: `N% beyond capacity — move something out` / `N% of the week unbooked` / `No spare capacity this week`.
  - Assign work button: height `30px`, padding `0 13px`, border `1px #D3CCBB`, background `#FFFFFF`, radius `8px`, plus icon `12×12`, label 10.5px/600 uppercase letter-spacing `0.1em`. Hover: border and text `#E8442A`.
  - Its popover: absolute `right: 0; bottom: 38px`, width `290px`, `max-height: 270px`, scrollable, background `#FFFFFF`, border `1px #D3CCBB`, radius `11px`, padding `6px`, `z-index: 40`, shadow `0 18px 44px rgba(72,62,42,.18)`. Heading `Live projects · skill fit` 9.5px/700 uppercase letter-spacing `0.14em` `#7B7667`, padding `8px 9px 7px`. Rows: `8px` colour square (radius `2px`), project name 12px ellipsised, fit tag 9px/700 uppercase padding `3px 6px` radius `4px`. Row hover `#F1EDE3`.
    - Fit tag: `Full fit` (green `#0E9A63` on 13% alpha) / `N/M` (amber `#8F7210`) / `No fit` (red `#E8442A`) / `—` (`#6E6959` on `#E7E2D7`).

- **Assignment rows** — vertical flex, gap `6px`. Each row: background `#FFFFFF`, border `1px #E7E2D7`, radius `10px`, padding `10px 12px`, `position: relative`, hover `border-color: #B7AF9C`.

  Grid: `12px  minmax(120px,1.1fr)  minmax(120px,1.4fr)  168px  108px  96px  28px`, gap `12px`, centre-aligned.

  1. Project colour square `10×10`, radius `2px`.
  2. Project name 12.5px/600 `#16150F`, ellipsised.
  3. Work description 12px `#5F5B4E`, ellipsised.
  4. Date range JetBrains Mono 11px `#6E6959`, `DD Mon YY → DD Mon YY`.
  5. Stepper: `−` / value / `+`. Buttons `24×24`, border `1px #D3CCBB`, radius `6px`, `#6E6959`, 14px glyph; hover border and text `#E8442A`. Value `50px` wide, centred, JetBrains Mono 12.5px/500. Step ±25, clamped 5–100.
  6. **Move** button: height `26px`, border `1px #D3CCBB`, radius `7px`, 10px/600 uppercase letter-spacing `0.1em` `#6E6959`; hover `#E8442A`.
  7. **Unassign** ×: `24×24`, transparent border, `#8B8677`; hover colour `#E8442A`, border `#F3D8D1`.

  **Move popover**: absolute `right: 0; bottom: 40px`, width `290px`, same surface treatment as above, `z-index: 50`. Heading `Move to · resulting load`. Rows: initials chip `22×22` radius `6px` `#E7E2D7`/`#6E6959` 9.5px/700 · name 12px · **resulting load after the move** in JetBrains Mono 11.5px/500, coloured by the band that load would fall into. Row hover `#F1EDE3`.

- **Empty state**: padding `18px 12px`, dashed border `1px #DCD5C6`, radius `10px`, 12px `#7B7667`, copy `<Name> has nothing booked. Assign work to fill the week.`

---

## Interactions & Behavior

### View switching
Rail buttons swap the view. State (selected person, assignments, draft, log) persists across the switch. No route in the prototype; `/briefing` and `/allocation` are the obvious mapping.

### Briefing → Allocation jump
Two entry points: the dashed **Open <Name>'s week** button on a call, and clicking a Team pulse row. Both set the view to Allocation *and* select that person, so their column is highlighted and the detail panel is already showing their assignments. Also closes any open popover.

### Call actions
Each button applies its mutation immediately, appends to the Settled-today log, and fires a toast. The call list regenerates, so a resolved call disappears on the same tick.

Dismiss (×) hides a call for the session only, keyed `<kind>:<entity id>`. It is not persisted — if the condition still holds tomorrow, the call returns.

### Draft mode
Toggling **Live → Draft** snapshots the current assignments as `base`. All mutations then apply to the working copy only. While drafting:

- Each changed column shows the dotted `was N%` line and a `+N` / `−N` footer delta.
- The **ribbon** appears above the detail panel: `display: flex`, background `#FBE9E4`, top border `1px #F0C9BF`, padding `11px 26px`, gap `14px`, wrapping.
  - `Draft` label with `7px` dot, 10px/700 uppercase letter-spacing `0.16em` `#E8442A`.
  - Change count 12.5px/600 `#16150F`: `N changes staged`, or `No changes yet — edit anything and it stays in the draft`.
  - Per-person net deltas in JetBrains Mono 11.5px `#8B5A4C`, joined by `  ·  `, e.g. `Mani −25%  ·  Nihal +25%`.
  - **Discard** — height `29px`, padding `0 13px`, border `1px #E3BEB3`, transparent, radius `8px`, 10px/700 uppercase `#8B5A4C`; hover border and text `#E8442A`. Restores `base`.
  - **Publish** — height `29px`, padding `0 15px`, no border, radius `8px`, `#E8442A` bg, white 10px/700 uppercase; hover `#C4341F`. Persists and clears `base`.

The ribbon is shared by both views — a draft started in Briefing is visible and publishable from Allocation.

### Toast
Fixed, `left: 50%`, `bottom: 26px`, `translateX(-50%)`, `z-index: 90`, background `#E8442A`, white 12px/600, padding `10px 16px`, radius `9px`, shadow `0 14px 34px rgba(232,68,42,.24)`. Auto-dismisses after **2600ms**; a new toast resets the timer.

### Popovers
Only one open at a time — opening the Assign-work popover closes any Move popover and vice versa. `Escape` closes both. (Click-outside-to-close is *not* implemented in the prototype; add it.)

### Undo
Every mutation stores a full snapshot of the prior assignment array. Undo restores that snapshot wholesale and removes the log entry. Session-scoped, newest-first.

### Animation summary

| Name | Where | Definition |
|---|---|---|
| `capFade` | call cards, chart columns, detail panel | `opacity 0→1`, `translateY(8px)→none`, `.4s ease` (`.3s` on the detail panel) |
| `capRise` | assignment stacks | `scaleY(.72)`/`opacity .35` → `scaleY(1)`/`1`, `.5s cubic-bezier(.2,.8,.3,1)`, `transform-origin: bottom` |
| segment dim | chart hover | `opacity .16s, background .16s` |

### Responsive
The prototype targets **1440×900** and does not adapt. The chart wrapper holds a `min-width: 820px` floor and scrolls horizontally below that. Below roughly 1100px the Briefing right rail and the detail panel's date column are the first things to drop.

---

## State Management

### Store

```
assignments : Assignment[]      // the working copy; single source of truth
base        : Assignment[]|null // draft snapshot; non-null means draft mode is on
tab         : 'brief'|'alloc'
selected    : person_id         // drives the Allocation detail panel
sort        : 'Load'|'Name'
hovered     : project_id|null   // chart cross-highlight
movingRow   : assignment_id|null
addingOpen  : boolean
dismissed   : string[]          // 'kind:entity_id'
log         : { text, prev: Assignment[] }[]
toast       : string
```

`base`, `dismissed`, `log` and `toast` are all session state. Only `assignments` needs persistence.

### Entities

**Person**: `id`, `name`, `initials`, `skills` (free text, comma/slash separated), `capacity` (assumed 100 for all in v1).

**Project**: `id`, `name`, `short` (uppercase chart label), `tech` (comma/slash separated requirements), `color` (fixed hex), `state` = `Active` | `Completed` | `Backlog`.

**Assignment**: `id`, `person_id`, `project_id`, `work` (free text), `alloc` (int 5–100), `start`, `end`.

### Derived — compute on read, never store

```
live(a)            = project(a).state != 'Completed'
                     AND a.start <= today AND a.end >= today

load(person)       = Σ a.alloc where a.person_id == person.id AND live(a)

band(load)         = load > 100  -> OVER   #E8442A
                     load == 100 -> FULL   #8F7210
                     load > 0    -> OPEN   #0E9A63
                     load == 0   -> FREE   #2A62D6

fit(person,project) = matched(project.tech tokens, person.skills tokens)
                      / |project.tech tokens|

staffed(project)   = count of live assignments on it
```

`fit` uses case-insensitive substring matching in either direction (`"React"` matches `"React, Next.js"`). **This is a placeholder.** If a real skill taxonomy is added later, this is the only function to replace.

Any denormalised `load` column will drift. Don't add one.

### Call generation

Calls are derived, never stored. Regenerate on every store change; sort by rank; slice to the `maxCalls` limit (default 5).

| Rank | Kind | Trigger | Actions |
|---|---|---|---|
| 1 | Over capacity | `load > 100` | Move smallest-viable assignment to best-fit person with room · Cut it to `alloc − excess` (floor 5) · Drop it |
| 2 | Unstaffed | `state == Active` and `staffed == 0` | Assign top 2 candidates at `min(50, 100 − load)` |
| 3 | Unused capacity | `load == 0` | Assign to the 2 thinnest-staffed live projects at 50% |
| 4 | Ending soon | live assignment with `0 ≤ end − today ≤ 7 days` | Extend two weeks · Let it end (dismiss) |

**Move-candidate selection**: from the over-capacity person's live assignments, take the smallest whose `alloc ≥ excess`; if none qualifies, the smallest overall. **Target selection**: among people where `load + alloc ≤ 100`, highest `fit` wins, tie-broken by lowest current load.

**Candidate ranking for unstaffed / idle**: `fit` descending, then load ascending.

New assignments created from a call default to `start = today`, `end = today + 30 days`, `work = project.tech`. From the Assign-work popover they default to **25%**.

### diff(base, now)
Compare by assignment id. Missing from `now` → removed. `alloc` or `person_id` changed → changed. New id → added. The count feeds the ribbon; per-person load deltas are computed independently as `load(p, now) − load(p, base)`.

### Generated copy

**Headline** — first applicable: over-capacity people (`X and Y are past capacity.`) → unstaffed projects (`X has nobody on it.`) → idle people (`X is free this week.`) → `The week is balanced.`

**Summary** — concatenation of applicable clauses, always ending with `The team is running at N% overall across M live projects.`

Name lists use an Oxford-less join: `A`, `A and B`, `A, B and C`.

---

## Design Tokens

### Type

Two families, strictly divided: **Archivo** (variable, `wdth` 62–125, weights 400–700) for all prose and labels; **JetBrains Mono** (400/500/700) for every number, date, percentage and delta. Numbers never appear in Archivo.

```
@import Archivo:wdth,wght@62..125,400..700
@import JetBrains+Mono:wght@400;500;700
```

| Role | Size / weight | Extras |
|---|---|---|
| Display headline | 44 / 700 | `wdth 118`, ls `-0.035em`, lh 1.06 |
| Readout figure | 38 / 700 | `wdth 125`, ls `-0.035em`, lh .9 |
| Card title | 21 / 700 | `wdth 108`, ls `-0.018em`, lh 1.28 |
| Panel name | 17 / 700 | `wdth 118`, ls `-0.01em` |
| Body | 16 / 400 | lh 1.62 |
| Card body | 13.5 / 400 | lh 1.6 |
| Row label | 12.5 / 600 | |
| Row meta | 11.5–12 / 400 | |
| Section label | 10 / 700 | uppercase, ls `0.2em` |
| Control label | 10–10.5 / 600–700 | uppercase, ls `0.1em`–`0.12em` |
| Micro label | 9–9.5 / 700 | uppercase, ls `0.1em`–`0.18em` |
| Mono figure | 17 / 500 | ls `-0.02em` |
| Mono value | 11–12.5 / 500 | |
| Mono micro | 9–10.5 / 700 | |

### Colour

| Token | Hex |
|---|---|
| Page background | `#F4F1EA` |
| Rail / panel surface | `#F1EDE3` |
| Detail panel surface | `#EDE9DF` |
| Log row surface | `#EFEBE1` |
| Card surface | `#FFFFFF` |
| Chart track | `#E2DCCE` |
| Chip surface | `#E7E2D7` |
| Ink | `#16150F` |
| Ink strong (selected) | `#000000` |
| Ink secondary | `#46423A` |
| Ink tertiary | `#5F5B4E` |
| Ink muted | `#6E6959`, `#7B7667` |
| Ink faint | `#8B8677`, `#A8A190`, `#B7AF9C` |
| Hairline | `#DFD9CB` |
| Border | `#DCD5C6`, `#D3CCBB`, `#E3DDD0`, `#E7E2D7` |
| Border dashed | `#C9C1AF` |
| Dot / divider | `#C0B8A6` |
| Accent | `#E8442A` |
| Accent hover | `#C4341F` |
| Band — Full | `#8F7210` |
| Band — Room / positive | `#0E9A63` |
| Band — Free / info | `#2A62D6` |
| Draft bg / border / ink | `#FBE9E4` / `#F0C9BF` / `#8B5A4C` |
| Danger border tint | `#F3D8D1`, `#E3BEB3` |

Band fills are the band colour at **13% alpha**. Chart segment fills are the project colour at **15% alpha**, borders at **52% alpha**.

### Project colours — fixed, do not reassign

People learn these. They are identity, not decoration.

| Project | Hex |
|---|---|
| Multiversity | `#2A62D6` |
| COM — Council of Ministers | `#0E9A63` |
| QU | `#C05A15` |
| HBKU — GISR | `#6C42C7` |
| HBKU | `#0E8A91` |
| QF-360 | `#BF2C60` |
| QF-TNS | `#8F7210` |
| Mediacity | `#4451C9` |
| Thakira / QNL | `#12907C` |
| NPC AI Chatbot | `#8E3FC4` |
| EC | `#87613F` |
| QFFD | `#5B6E7A` |

Fallback for unknown projects: `#5B6E7A`.

### Geometry

- Radii: `2px` swatch · `4px` chart segment · `5px` pill · `6–8px` control · `9–11px` popover / action · `10–12px` card
- Rail `74px` · header `52px` · Briefing rail `308px` · popover `290px` · chart floor `820px`
- Gutter `26px` (chrome), `44–46px` (Briefing reading column)
- Vertical rhythm: `6px` row gap · `14px` card gap · `15px` pulse gap · `34px` section break
- Shadows: popover `0 18px 44px rgba(72,62,42,.18)` · toast `0 14px 34px rgba(232,68,42,.24)`. Nothing else casts a shadow.

### Interaction states

- Accent-hover convention: most bordered controls hover to `border-color: #E8442A; color: #E8442A`.
- Action buttons on call cards hover to `border-color: #16150F` (they are already high-contrast).
- Popover rows hover to `background: #F1EDE3`.
- Assignment rows hover to `border-color: #B7AF9C`.
- Destructive × hovers to `color: #E8442A; border-color: #F3D8D1`.
- `::selection` is `#E8442A` on `#FFFFFF`.

---

## Assets

None. Every icon is an inline stroke SVG on a `24×24` viewBox, rendered at `12–17px`, `stroke-width` 1.7–2.6, `currentColor`, round caps and joins. Replace with the codebase's icon set — the shapes used are: speech bubble, bar chart, calendar, pencil, plus, ×, check, right arrow.

Fonts load from Google Fonts in the prototype. Self-host in production.

No raster images, no illustrations, no logos.

---

## Files

| File | What it is |
|---|---|
| `CAPCIO.dc.html` | The interactive prototype. Open in a browser to click through both views, draft mode and undo. Mock data is inline at the top of its script block. |
| `support.js` | Runtime the prototype needs to render. Not production code — do not port. |
| `CAPCIO-implementation-spec.md` | Shorter behavioural spec: data model, call generators, derived formulas, product rules. Read this first, then this README for visual detail. |

### Mock data

7 people, 12 projects, 15 assignments, reference date **01 Sep 2026**. Use it as the seed fixture — it is constructed so that all four call types fire: one person over capacity, at least one unstaffed live project, at least one idle person, and one assignment ending inside the week.

### Behaviour rules worth preserving

1. **Every suggestion shows its arithmetic.** No action button ships without before → after loads for both people affected. This is what makes the tool trustworthy rather than magical.
2. **Nothing is irreversible.** Every mutation logs a full prior snapshot.
3. **Over capacity is a state, not an error.** It renders, it is flagged, it never blocks.
4. **One store, two views.** A change in Briefing is immediately visible in Allocation and vice versa.
5. **Dismissals expire.** A dismissed call returns tomorrow if the condition still holds.
