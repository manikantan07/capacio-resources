# Handoff: Resource Allocation (DeliveryHub)

## Overview

An internal web tool for a 7-person frontend team in Doha, Qatar that manages ~12 concurrent
client projects. It answers four questions:

1. Who is working on what, at what percentage of their capacity?
2. Who is over-allocated, and who has capacity left?
3. Which projects are unstaffed or under-staffed right now?
4. Once a project is done, who worked on it and how much resource did it consume?

Four views: **Allocation** (per-person capacity), **Projects** (project × person matrix),
**Completed** (post-delivery record), **Team** (roster). Plus a sign-in screen and an
editable member profile drawer.

## About the Design Files

`design/Resource Allocation.dc.html` is a **design reference created in HTML** — a working
prototype showing the intended look, layout, and behavior. It is **not production code to
copy**. It uses a bespoke in-house templating runtime (`design/support.js`) that you should
ignore entirely; it is only there so the file opens in a browser.

The task is to **recreate these designs in the target codebase's existing environment**
(React, Vue, Angular, whatever is in use) using its established component library, routing,
state management, and data layer. If no codebase exists yet, pick the most appropriate stack
and implement from this document.

Read the prototype for pixel-level reference (every style is inline, so the values are easy
to read off any element). Read this README for the model, rules, and behavior.

**How to open the prototype:** open `design/Resource Allocation.dc.html` directly in a
browser. It needs no build step and no server. Everything is client-side, seeded from
hardcoded arrays; there is no backend.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, states, and copy. Recreate the UI
closely, substituting the codebase's own primitives (Button, Input, Modal, Drawer, Table)
where they exist. Where the codebase has a design system, its tokens win over the hex values
listed below — map them by role (primary/success/warning/danger/neutral), not by hue.

---

## Data model

Three collections. All IDs are strings.

### Person
| Field | Type | Notes |
|---|---|---|
| `id` | string | `p0`…`p6` in the seed |
| `name` | string | required, unique (case-insensitive) |
| `initials` | string | derived: first letter of first two words, uppercased, max 2 chars |
| `color` | hex | assigned from the palette by index; used for the avatar |
| `role` | string | job title, e.g. `Frontend Engineer` |
| `type` | string | engagement: `Full-time`, `Part-time`, `Contract`, `Intern` |
| `email` | string | seeded as `firstname@applab.qa` |
| `phone` | string | optional |
| `location` | string | e.g. `Doha, Qatar` |
| `status` | enum | `Active` \| `On leave` \| `Sick leave` \| `Notice period` |
| `hours` | string | weekly contracted hours, e.g. `40` |
| `joined` | date | ISO `YYYY-MM-DD`, optional |
| `skills` | string | comma-separated list; parsed on read |
| `notes` | string | freeform |

`skills` is stored as a single comma-separated string in the prototype for convenience.
**In production make it `string[]`.**

### Project
| Field | Type | Notes |
|---|---|---|
| `name` | string | acts as the primary key in the prototype — **use a real `id` in production** |
| `owner` | string | client contact or internal owner; `—` when none |
| `desc` | string | short description |
| `tech` | string | comma/slash-separated skills the project needs; drives skill matching |
| `state` | enum | `Active` \| `Backlog` \| `Completed` |
| `color` | hex | from the palette, by index |
| `completedOn` | date | ISO date, set when marked complete; empty otherwise |

### Assignment
| Field | Type | Notes |
|---|---|---|
| `id` | string | `a0`… |
| `person` | string | Person id |
| `project` | string | Project name (→ project id) |
| `work` | string | what they are doing, e.g. `API integration` |
| `alloc` | number | percent of that person's capacity, 5–100, step 25 in the UI |
| `start` | date | ISO |
| `end` | date | ISO |

A person can hold multiple assignments on the same project (multiple "stints").

### Seed data

The prototype seeds 7 people, 12 projects, and 15 assignments. See the `SEED_PEOPLE`,
`PROJECTS`, and `SEED` arrays near the top of the logic block in the prototype, and
`data/seed-data.json` in this bundle for the same data as JSON. Use it for fixtures.

`TODAY` is pinned to `2026-09-01` in the prototype so the seeded date ranges stay meaningful.
**Production must use the real current date.**

---

## Core business rules

These are the logic the UI depends on. Implement them as pure functions and unit-test them.

**1. An assignment is "active"** when
`project.state !== 'Completed' && assignment.start <= today && assignment.end >= today`.
Completing a project therefore releases its people immediately, everywhere.

**2. A person's current load** = sum of `alloc` over their active assignments. It can exceed
100%.

**3. Load bands** (drives every capacity color in the app):

| Load | Label | Color role |
|---|---|---|
| `> 100` | Over-allocated | danger (red) |
| `= 100` | Fully allocated | warning (amber) |
| `> 0 and < 100` | Partially available | success (green) |
| `= 0` | Available | primary (blue) |

Short forms used in tight columns: Over, Full, Partial, Free, Notice.

**4. Skill match** — comparing a person's `skills` against a project's `tech`. Both are
split on commas and slashes, trimmed, and compared case-insensitively as substrings in
either direction (`react` matches `React / WP`). Result: `{hit, need, missing}`.
Badge: full match (all needed skills hit) → green; partial (some) → amber; none → red.
Shown at assignment time so a capability gap is visible before the assignment is made.

**5. Mark project complete** — sets `state: 'Completed'` and `completedOn: today`, and
truncates every assignment on that project whose `end` is in the future to `end = today`.
Toast reports how many people were freed. Assignment history is preserved, never deleted.

**6. Reopen project** — sets `state: 'Active'`, clears `completedOn`. Does **not** restore
truncated assignment end dates; the user re-staffs from Allocation. The toast says so.

**7. Removing a person** is blocked while they hold any active assignment; the toast tells
the user to move those first.

**8. Completed projects are excluded** from the Projects matrix, from live capacity totals,
and from the project count in the sidebar. They appear only on the Completed page.

**9. Effort in person-days** = `span_days × alloc / 100`, where
`span_days = round((end - start) / 1 day) + 1`, minimum 1. Summed per contributor, then per
project. Displayed to one decimal.

---

## Layout shell (all views)

```
┌──────────┬────────────────────────────────────────────────┐
│ sidebar  │ topbar: title + subtitle | date chip | action  │
│ 230px    ├────────────────────────────────────────────────┤
│ fixed    │ scrolling content, 22px padding                │
│          │                                                │
│ ─────────│                                                │
│ profile  │                                                │
└──────────┴────────────────────────────────────────────────┘
```

- Page root: `display:flex; height:100vh; overflow:hidden; background:#F6F7F9`.
- Sidebar: `width:230px; flex:0 0 230px; background:#fff; border-right:1px solid #E6E8EB;
  display:flex; flex-direction:column`.
- Content column: `flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden`.
- Content area scrolls on its own (`overflow-y:auto`); the topbar and sidebar do not.
- Design width: **1440 × 900**. Desktop-only; no mobile breakpoints were designed.

### Sidebar

1. **Brand** — top, ~18px padding: product mark + name.
2. **Nav** — 4 items. Each: `height:34px; padding:0 10px; border-radius:8px;
   font-size:12.5px; font-weight:500; display:flex; align-items:center; gap:9px`, with a
   16px stroke icon (`stroke-width:1.7`), a flexible label, and a right-aligned count in
   Geist Mono `10.5px/600`, `#A6ACB4`.
   - Idle: transparent background, text `#5A6069`, icon stroke `#8A9099`.
   - Active: background `#EAF2FD`, text `#1A5FAE`, icon stroke `#2478D8`, weight 600.
   - Hover (idle only): background `#F5F6F8`.
   - Items and counts: Allocation (people count), Projects (live projects), Completed
     (completed projects), Team (people count).
3. **Spacer** (`flex:1`).
4. **Signed-in user** — bottom, above a `1px #EEF0F2` top border: 28px avatar circle, name
   `12.5px/500`, email `11px #9BA1A9`, chevron. Clicking opens the account panel
   (role, team, timezone, access level, Sign out).

### Topbar

`height:56px; flex:0 0 56px; background:#fff; border-bottom:1px solid #E6E8EB;
padding:0 22px; display:flex; align-items:center; gap:14px`.

- Left: page title `15px/600, letter-spacing:-0.016em, #15171A`; subtitle
  `11.5px #8A9099` underneath.
- Right: a static **date chip** — `height:32px; padding:0 11px; border:1px solid #E1E4E8;
  background:#fff; border-radius:7px; font-size:12px`, calendar icon + `As of 01 Sep 2026`
  (the date in Geist Mono). In production this shows today's date.
- Right: **primary action** — `height:32px; padding:0 13px; background:#2478D8;
  border:1px solid #2478D8; border-radius:7px; font-size:12.5px; font-weight:500; color:#fff`.
  Label is per page: `New project` on Allocation/Projects, `Add member` on Team.
  Hover: darken to `#1E68BE`.

### Stat cards (top of Projects, Completed)

`display:grid; grid-template-columns:repeat(auto-fit, minmax(152px,1fr)); gap:12px`.
Each card: `background:#fff; border:1px solid #E6E8EB; border-radius:11px; padding:13px 14px`.
Inside: a 5px colored dot + uppercase label (`10.5px/600, letter-spacing:0.05em, #8A9099`),
then a big value (`26px/600, letter-spacing:-0.03em, #15171A`) with a unit beside it
(`12px/500 #9BA1A9`), then a sub-line (`11.5px`, colored by state).

---

## Screens

### 1. Sign in

Centered card on the `#F6F7F9` field. Work email + password, both `height:38px;
border:1px solid #E1E4E8; border-radius:8px`. Validation: email must match
`/^[^@\s]+@[^@\s]+\.[^@\s]+$/`, password must be non-empty; otherwise an inline error in
danger red. On success the email is remembered and the app opens on Allocation.

The prototype starts already signed in (`authed: true`) so reviewers land on the dashboard.
Production wires this to real auth.

### 2. Allocation — `page: 'people'`

**Purpose:** see each person's load, adjust percentages, reassign work, spot who is free.

One expandable row per person, in a white card list (`background:#fff;
border:1px solid #E6E8EB; border-radius:12px`), rows separated by `1px #F2F3F5`.

**Collapsed row** (`padding:13px 16px; display:flex; align-items:center; gap:12px`):
- Disclosure chevron, rotates 90° when open (`transition:transform .18s`).
- 34px avatar circle, person's color, white initials `12px/600`.
- Name `13.5px/500, letter-spacing:-0.01em`; below it, project chips — each a 6px color
  square + project name `11.5px`, muted.
- Band pill: `font-size:11px; font-weight:600; padding:3px 8px; border-radius:5px`, using
  the band's soft background and text color.
- Right: total load `15px/600 Geist Mono` in the band color, and contracted hours below in
  `11px #9BA1A9`.
- Hover: `background:#FAFBFC`.

**Expanded body:** a table of that person's assignments — project (color square + name),
what they do, date range (Geist Mono `11.5px`; the range turns muted grey when the
assignment has ended), a **percent stepper** (−/+ 22px square buttons around a Geist Mono
value, step 25, clamped 5–100), a **Move** button, and an unassign ✕.

**Move** opens an inline popover listing the other people, each showing what their load
*would become* if the work moved to them — colored by the resulting band, so an overload is
visible before committing. Picking one reassigns the assignment.

**Add assignment** row at the bottom of the expanded body opens a project picker. Each
project option shows its skill-match badge against that person (rule 4).

### 3. Projects — `page: 'projects'`

**Purpose:** see all live projects against the whole team at once.

Stat cards, then a matrix in a white card. Grid columns:
`250px repeat(<peopleCount>, minmax(80px,1fr)) 132px`.

- **Header row:** `background:#FBFBFC`, sticky-feeling; uppercase micro-labels
  (`10px/600, letter-spacing:0.05em, #8A9099`) for the project column and the trailing
  total column, and each person as a small avatar + first name, centered.
- **Project rows:** left cell is a 9px color square + project name `13px/500` + owner and
  tech beneath in `11px #9BA1A9`. Unstaffed rows get a faint warm tint (`#FFFCFB`).
- **Cells:** the person's allocation on that project, Geist Mono `11.5px`, in a rounded
  44px-wide plate. Three states:
  - **Active** — soft blue plate, weight 600, blue text.
  - **Ended** — flat grey plate (`#F5F6F8`), normal weight, muted text.
  - **Unassigned** — em dash, `#D4D8DD`, no plate. Cells carry a `title` tooltip with the
    work description and dates.
- **Trailing cell:** total staffed percent (Geist Mono `12.5px/600`, colored by band) and
  headcount (`10.5px`, `"3 people"` / `"unstaffed"`), plus a **26px check button**
  — `title="Mark complete"`, border `#E1E4E8`, hover turns green
  (`border #00A86C`, text `#037A50`, background `#E4F6EE`). Fires rule 5.
- **Footer row:** per-person column totals, Geist Mono `12px/600`, band-colored.
- **Legend** under the card: Active / Ended / Mark complete swatches, `11px #8A9099`.

Horizontal scroll wrapper with `min-width` set so columns never crush.

### 4. Completed — `page: 'done'`

**Purpose:** the post-delivery record. What shipped, who worked on it, what it cost in
resource.

Four stat cards: **Completed** (count), **Effort spent** (person-days across all delivered
work), **People involved** (distinct contributors), **Still live** (live project count, with
unstaffed count as the sub-line, colored red when non-zero).

Then one card per completed project (`background:#fff; border:1px solid #E6E8EB;
border-radius:12px; overflow:hidden`), newest concerns first, stacked with `gap:14px`.
Each card has three bands:

**a. Header** (`padding:14px 18px; border-bottom:1px solid #EEF0F2`) — 9px color square,
project name `14.5px/600`, a green "Completed 14 Aug 26" pill with a check glyph
(`#037A50` on `#E4F6EE`), owner · tech beneath in `11.5px #8A9099`, and a **Reopen** button
on the right (28px, ghost, hover goes blue) firing rule 6.

**b. Facts strip** (`background:#FBFBFC`, `grid-template-columns:repeat(auto-fit,
minmax(130px,1fr))`, cells divided by `1px #F2F3F5`) — four figures, each an uppercase
micro-label over a Geist Mono `17px/600` value plus unit:
- **Resources** — distinct people who worked on it
- **Effort** — person-days (rule 9)
- **Ran for** — days from the earliest assignment start to `completedOn`
- **Assignments** — number of assignment records

**c. Contributor table** — columns
`186px minmax(150px,1fr) 152px 66px 74px`, `gap:10px`, `padding:11px 18px`, rows divided by
`1px #F5F6F8`, hover `#FAFBFC`. Wrapped in a horizontal scroller with `min-width:704px`.

| Column | Content |
|---|---|
| Who worked on it | 30px avatar, name `13px/500`, role `11px #9BA1A9` |
| What they did | joined work descriptions; second line shows `2 stints` when they had more than one |
| Period | first start → last end (Geist Mono `11.5px`), and `Nd on the project` beneath |
| Peak | highest allocation percent they ever held, right-aligned Geist Mono |
| Effort | person-days to one decimal + a small ` d`, right-aligned |

Sorted by effort, descending — the biggest contributor is first.

**People who have left the team** still appear, resolved as `Former member` with an em-dash
avatar and the role line "No longer on the team". Never drop a contributor because the
person record is gone.

**Empty states:** with no completed projects, a dashed-border card reads "No completed
projects yet / Mark a project complete from the Projects view and it lands here with its
full staffing record." A completed project that never had anyone staffed shows
"No one was ever staffed on this project."

### 5. Team — `page: 'team'`

**Purpose:** the roster.

A white card, four columns, no horizontal scroll: **Member** / **Projects** / **Status** /
**Actions**.
- Member: avatar, name, role, engagement type.
- Projects: chips of current projects, each with a color square, the allocation percent in
  Geist Mono, and an unassign ✕ (17px, ghost, red on hover).
- Status: a select styled with the status colors from the table below.
- Actions: icon-only buttons with `title` tooltips — open profile, remove member (rule 7).

**Status colors:**

| Status | bg | text | border |
|---|---|---|---|
| Active | `#fff` | `#3B4048` | `#E1E4E8` |
| On leave | `#FEF4E0` | `#946200` | `#F2DCA8` |
| Sick leave | `#FDECEA` | `#B81C12` | `#F5C6C0` |
| Notice period | `#F1F2F4` | `#5A6069` | `#DFE2E6` |

### 6. Profile drawer

Opens from the Team view. **Editable:** name, title, engagement type, email, phone, skills
(tag input — type, Enter to add, ✕ to remove; duplicates are rejected case-insensitively),
status, weekly hours, joined date, location, notes. Inputs are `height:36px;
border:1px solid #E1E4E8; border-radius:8px; font-size:13px`; date inputs use Geist Mono.

Below the form, **read-only current work**: every assignment with project, work, allocation,
and dates, with the person's total load in the section header, band-colored. Save validates
a non-empty unique name and flashes `"<name>'s profile updated"`.

### 7. New project / Add member modals

Centered modals over a scrim. New project: name (required), owner, description/tech, start
date, target end date, state. Add member: name (required), skills. Submit is disabled until
the required field is filled. Duplicate names are rejected with a toast.

---

## Interactions & behavior

- **Navigation** — sidebar switches views in place; no page reload. In production these are
  four routes: `/allocation`, `/projects`, `/completed`, `/team`.
- **Toasts** — every mutation flashes a bottom toast for **2600ms**, replacing any current
  one. Messages are specific and state the consequence, e.g.
  `"EC marked complete — 1 person freed up"`, `"Nihal still has 2 active assignments — move
  those first"`. Keep this voice: say what happened and what it means for capacity.
- **Escape** closes every modal, drawer, and picker.
- **Popovers** (Move, project picker, account panel) close on selection and on Escape. Only
  one is open at a time — opening one clears the others.
- **Row expansion** in Allocation is multi-open; state is an array of open person ids.
- **Transitions** — page content fades in over `.26s ease` on view change; chevrons rotate
  over `.18s`; hover state changes are instant.
- **Loading / error states were not designed.** Add them per the codebase's conventions:
  skeleton rows matching the row heights above, and an inline retry for a failed fetch.

## State (prototype → production)

The prototype holds everything in one component's state. Map it as follows:

| Prototype state | Production |
|---|---|
| `people`, `projects`, `assigns` | server data — fetch, cache, mutate (React Query / RTK Query / equivalent) |
| `page` | router |
| `authed`, `login` | auth provider / session |
| `open` (expanded rows) | local UI state |
| `picking`, `assigning` (open popovers) | local UI state |
| `modal`, `personModal`, `form`, `pForm` | local form state |
| `editing`, `draft`, `skillInput` | drawer-local draft, committed on save |
| `toast` | global toast/notification service |

Mutations the API needs: create/update/delete person; create/update/delete project;
complete project (server-side truncation of future assignment ends — do this in one
transaction, it is rule 5); reopen project; create/update/delete assignment;
set assignment allocation; reassign assignment to another person.

## Design tokens

**Typography** — [Geist](https://fonts.google.com/specimen/Geist) 400/500/600/700 for UI,
**Geist Mono** 400/500/600 for every number, percentage, and date. This is a consistent rule:
if it is a figure, it is monospace. `-webkit-font-smoothing:antialiased` on the root.

Scale actually used: 26 (stat value), 17 (fact value), 15 (page title, person total),
14.5 (card title), 13.5 (person name), 13 (member name, inputs), 12.5 (nav, buttons, sums),
12 (topbar chip, column totals), 11.5 (chips, dates, sub-lines), 11 (roles, muted meta),
10.5–10 (uppercase micro-labels, counts). Letter-spacing tightens as size grows
(`-0.03em` at 26px, `-0.016em` at 15px, `0` below 13px); uppercase micro-labels use
`+0.05em`.

**Colors**

| Role | Base | Soft bg | Text |
|---|---|---|---|
| Primary / blue | `#2478D8` | `#EAF2FD` | `#1A5FAE` |
| Success / green | `#00A86C` | `#E4F6EE` | `#037A50` |
| Warning / amber | `#E4A11B`* | `#FEF4E0` | `#946200` |
| Danger / red | `#E5372A`* | `#FDECEA` | `#B81C12` |
| Neutral / slate | `#8A9099` | `#F1F2F4` | `#5A6069` |

\* see the `C` object at the top of the prototype's logic block for the exact base values.

Neutrals: page `#F6F7F9`, surface `#fff`, subtle surface `#FBFBFC`, hover `#FAFBFC`,
border `#E6E8EB`, control border `#E1E4E8`, divider `#EEF0F2`, hairline `#F2F3F5` / `#F5F6F8`.
Text: `#15171A` primary, `#1D2025` body, `#3B4048` secondary, `#5A6069` muted,
`#61666E` label, `#8A9099` tertiary, `#9BA1A9` meta, `#A6ACB4` counts,
`#B4B9BF` faint, `#C2C7CD` / `#D4D8DD` disabled.

**Avatar / project palette** (assigned by index, cycling):
`#2478D8 #00A86C #E4661C #6B3FC4 #0E7C86 #C2185B #B8860B #3F51B5 #00897B #8E24AA #5D4037
#455A64`

**Spacing** — 22px page padding, 18px card padding, 16px row padding, 14px card gap,
12px grid gap, 10px control gap, 6–8px inline gap.

**Radii** — 12px cards, 11px stat cards, 8px inputs / nav items, 7px buttons,
5px small pills and stepper buttons, 4px badges, 2px project squares, 50% avatars.

**Borders** — everything is a 1px hairline. No shadows anywhere except modal/drawer
elevation. Resist adding shadows; the design reads on borders and background steps.

**Icons** — inline SVG, 24×24 viewBox, `fill:none`, `stroke:currentColor`,
`stroke-width:1.7–2.6` (thinner as the icon gets bigger), round caps and joins. Rendered at
9–16px. Substitute the codebase's icon set (Lucide matches this style closely).

## Assets

None. No images, no icon files, no logos — every icon is inline SVG, every avatar is
initials on a colored circle. Fonts come from Google Fonts (Geist + Geist Mono); self-host
them if the codebase self-hosts fonts.

## Files in this bundle

```
README.md                              this document
design/Resource Allocation.dc.html     the prototype — open in a browser
design/support.js                      prototype runtime only; do not port
data/seed-data.json                    people, projects, assignments as JSON — use as fixtures
```

## Notes for implementation

- **Project name is used as a foreign key** throughout the prototype. Introduce real project
  IDs before building; renaming a project would otherwise orphan its assignments.
- **Assignment history is never destroyed.** Completing a project truncates future end dates
  but keeps every record — the Completed page depends on it, and so does any future
  utilization reporting.
- **`skills` and `tech` should be `string[]`** in production, not comma-separated strings.
  Consider a shared, normalized skill vocabulary so matching stops relying on substring
  comparison.
- **Allocation percent is the unit of the whole app.** Keep it an integer 5–100. The UI steps
  by 25 but the model should not assume that granularity.
- **Timezone care:** all dates are date-only (`YYYY-MM-DD`). Compare them as dates, not
  timestamps, or a person in Doha will see assignments shift by a day.
- Desktop-only as designed. If mobile matters, the Projects matrix is the hard case — it
  needs a different presentation (per-project cards), not a squeezed grid.
