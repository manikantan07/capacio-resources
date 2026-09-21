# CAPCIO — Implementation Spec

Resource allocation tool for the AppLab frontend team. One screen, two views, shared state.

Design source: `CAPCIO.dc.html` (open in the project to interact with it).
Reference date throughout: **Tue 01 Sep 2026**.

---

## 1. Scope

**In v1**
- Briefing view — ranked list of resourcing problems with one-click fixes
- Allocation view — capacity column chart + per-person assignment editor
- Draft mode — stage a set of changes, review the net effect, publish or discard
- Undo log for anything committed today

**Deferred** (designs exist, not in v1): Timeline/runway view, Projects staffing view, Weekly Sheet export.

---

## 2. Data model

Three entities. Everything on screen is derived from these.

### Person
| field | type | notes |
|---|---|---|
| `id` | string | `p0`…`p6` in the mock |
| `name` | string | |
| `initials` | string | display chip |
| `skills` | string | comma/slash separated, free text |
| `capacity` | int | assumed **100** for everyone in v1 |

### Project
| field | type | notes |
|---|---|---|
| `id` | string | |
| `name` | string | full label |
| `short` | string | uppercase label for chart segments |
| `tech` | string | comma/slash separated requirement list |
| `color` | hex | fixed per project, used in chart + row dots |
| `state` | enum | `Active` \| `Completed` \| `Backlog` |

### Assignment
| field | type | notes |
|---|---|---|
| `id` | string | |
| `person_id` | fk | |
| `project_id` | fk | |
| `work` | string | what they're doing, e.g. "React bug fixes" |
| `alloc` | int | percent of a working week, 5–100, steps of 25 in the UI |
| `start` | date | |
| `end` | date | |

### Derived values

```
live(assignment)   = project.state != 'Completed'
                     AND start <= today AND end >= today

load(person)       = Σ alloc of live assignments for that person

band(load)         = load > 100  -> OVER   (#E8442A)
                     load == 100 -> FULL   (#8F7210)
                     load > 0    -> OPEN   (#0E9A63)
                     load == 0   -> FREE   (#2A62D6)

fit(person, project) = |project.tech tokens matched by person.skills tokens|
                       / |project.tech tokens|
                       (case-insensitive substring match either direction)

staffed(project)   = count of live assignments on it
```

`fit` is deliberately crude — substring matching on free-text skills. If you later
add a proper skill taxonomy, this is the one function to replace.

---

## 3. Briefing view

A ranked feed of "calls to make". Each call is generated, not stored. Regenerate
on every state change.

### Call generators, in priority order

| rank | kind | trigger | suggested actions |
|---|---|---|---|
| 1 | **Over capacity** | `load(person) > 100` | Move smallest-viable assignment to best-fit person with room · Cut that assignment to `alloc − excess` · Drop it entirely |
| 2 | **Unstaffed** | `project.state == Active` and `staffed == 0` | Assign top 2 candidates by `fit` then lowest load, at `min(50, 100 − load)` |
| 3 | **Unused capacity** | `load(person) == 0` | Assign to the 2 thinnest-staffed live projects at 50% |
| 4 | **Ending soon** | live assignment with `0 ≤ end − today ≤ 7 days` | Extend two weeks · Let it end |

**Candidate selection for "move"**: pick the person's smallest assignment that
is `≥ excess`; if none, the smallest. Target = highest `fit` among people where
`load + alloc ≤ 100`, tie-broken by lowest load.

### Call anatomy

- `kind` label + tone colour (left border, 3px)
- `evidence` line — the raw numbers the call was derived from. Non-negotiable:
  the user must be able to check the tool's reasoning.
- `title` — one sentence, states the problem with the number in it
- `body` — why this suggestion, including the fit assessment in words
- action buttons — first is primary (dark), rest secondary. Each shows
  **before → after loads for both people affected** in the sub-label.
- "Open <name>'s week" — jumps to Allocation with that person selected
- dismiss (×) — hides this call for the session, keyed by `kind:entity_id`

### Headline + summary

Generated from the same counts. Priority: over-capacity people → unstaffed
projects → idle people → "The week is balanced." Summary is a concatenation of
the applicable clauses plus team average load and live project count.

### Right rail

- **Team pulse** — every person, load %, band word, bar, current projects.
  Clicking a row jumps to Allocation with them selected.
- **Coming back** — next 5 assignments ending within 120 days, as freed capacity.

### Settled today

Every committed mutation appends `{ text, prev_assignments }`. Rendered
newest-first with an Undo that restores the whole prior snapshot. Session-scoped.

---

## 4. Allocation view

### Readout strip
Team load (avg %), over-capacity count, fully-free count, live project count.
Over/free numbers turn colour only when non-zero.

### Capacity chart
- One column per person, sorted by load (default) or name
- Y axis 0–142% at `2.8px` per percent (Comfortable) or `2.0px` (Compact)
- Gridlines at 0 (solid), 50 (dotted), 100 (dashed, red)
- Stacked segments = live assignments, largest at the bottom, project colour at
  15% fill / 52% border
- Segment shows project short name at `≥30px` tall, percent at `≥52px`
- Hovering a segment dims every segment of other projects across all columns
- Free capacity shown as a dashed box labelled `N% free` (toggleable)
- Overflow above 100% drawn as a hatched red band with a `+N%` flag
- Footer: initials chip, name, load, band word. Selected column gets red chip + red top border.

### Detail panel (bottom, always visible)
Selected person's live assignments, one row each:

`colour dot · project · work · date range · [− pct +] · Move · ×`

- `−`/`+` step alloc by 25, clamped 5–100
- **Move** opens a popover listing every other person with their **resulting
  load after the move**, coloured by resulting band
- **×** unassigns
- **Assign work** opens a popover of live projects the person isn't on, each
  tagged with skill fit (`Full fit` / `2/3` / `No fit`), added at 25%
- Escape closes both popovers

---

## 5. Draft mode

Shared by both views. One toggle in the header.

- **Live → Draft**: snapshot current assignments as `base`
- While drafting: all mutations apply normally to the working copy; nothing is
  written to the server
- Chart shows a dotted "was N%" line per changed column, plus a `+N` / `−N` delta
  in the footer
- Ribbon at the bottom: count of changed assignments + per-person net load deltas
- **Publish** — persist the working copy, clear `base`
- **Discard** — restore `base`

`diff(base, now)` compares by assignment id: missing → removed, `alloc` or
`person_id` changed → changed, new id → added.

---

## 6. Design tokens

**Type** — Archivo (variable, `wdth` 62–125) for everything; JetBrains Mono for
all numbers, dates and deltas. Numbers are never in Archivo.

| use | value |
|---|---|
| Page background | `#F4F1EA` |
| Panel / rail background | `#F1EDE3`, `#EDE9DF` |
| Card surface | `#FFFFFF` |
| Ink | `#16150F` |
| Ink secondary | `#46423A`, `#5F5B4E` |
| Ink muted | `#7B7667`, `#8B8677` |
| Hairline | `#DFD9CB`, `#DCD5C6` |
| Accent / over-capacity | `#E8442A` (hover `#C4341F`) |
| Full | `#8F7210` |
| Room | `#0E9A63` |
| Free | `#2A62D6` |
| Draft ribbon | bg `#FBE9E4`, border `#F0C9BF`, ink `#8B5A4C` |

Radii: 4px chart segments, 6–8px controls, 10–12px cards. Rail 74px. Header 52px.
Project colours are fixed per project and must not be reassigned — people learn them.

---

## 7. Behaviour rules

1. **Every suggestion shows its arithmetic.** No action button without before→after
   numbers for both sides.
2. **Nothing is irreversible.** Every mutation logs a full prior snapshot.
3. **Over-capacity is a state, not an error.** It renders, it's flagged, it doesn't block.
4. **The two views share one store.** A change in Briefing is immediately visible in
   Allocation, and vice versa. The rail badge on Allocation shows the over-capacity count.
5. **Dismissals are session-scoped.** A dismissed call comes back tomorrow if the
   condition still holds.

---

## 8. Build notes

- The design is a single component with a `tab` field; no routing needed, but
  `/briefing` and `/allocation` routes are trivial to add.
- Load is calculated on read, never stored. Any denormalised load field will drift.
- `alloc` steps of 25 are a UI convention, not a data constraint — the field
  accepts 5–100.
- Chart heights are `percent × unit` in px. Keep the unit as a single constant.
- Mock data in the design file: 7 people, 12 projects, 15 assignments. Use it as
  the seed fixture — it contains one over-capacity person, one unstaffed project
  and one assignment ending within the week, so all four call types fire.
