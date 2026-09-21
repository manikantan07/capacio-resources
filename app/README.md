# Capcio — Resource Allocation

*(Product name: Capcio, shown in the UI. The codebase/namespaces are still
`DeliveryHub` internally — a full rename is a mechanical follow-up if you want it later,
not done here to avoid touching every file for a display-name change.)*

Originally the Resource Allocation module from `design_handoff_delivery_hub/`, now
redesigned per `design_handoff_capcio/` (unzipped from `MD File Analysis-design-2.zip`):
a 2-view core — **Briefing** (auto-generated ranked feed of resourcing problems with
one-click fixes) and **Allocation** (a capacity column chart + persistent detail panel,
replacing the old expandable list) — plus **Draft mode** (stage several changes, see
the net effect, Publish or Discard as a batch). Projects/Completed/Team/Activity kept
their layout and were restyled to match, rather than dropped from the nav. Built on the
technology stack and engineering conventions from `DeliveryHub_Complete_Project_Pack.md`
(React + Vite + TS/MUI frontend, ASP.NET Core + EF Core + Azure SQL backend). See
`../../.claude/plans/peaceful-singing-hamster.md` in this machine's Claude history for
the full build plan and rationale (both the original build and this redesign).

## Draft mode

A purely client-side staging layer (`client/src/features/draftMode.tsx`) in front of
the existing mutation endpoints — no backend changes. Toggling **Live → Draft** forks
the current assignments into local state; every edit while drafting (stepper, Move,
Assign work, Unassign) mutates that local copy only, firing zero API calls. **Publish**
diffs the staged copy against the fork and replays the minimal set of real mutations
(so every change still lands in the real `ActivityLogs` table, logged exactly as it
would outside Draft mode); **Discard** just throws the staged copy away. Verified
end-to-end: Discard after edits leaves the audit log untouched, Publish after edits
adds exactly the expected number of new entries.

## Briefing

Call generation (`client/src/lib/callGenerator.ts`) is a pure, client-side port of the
design's four rules (over capacity, unstaffed, unused capacity, ending soon) — computed
on read from data the API already returns, never persisted. Action buttons go through
the same draft-aware mutation path as Allocation, so they respect Draft mode
automatically. "Settled today" is a real view over `GET /api/activity?from=<today>`
with its Undo wired to the existing `POST /api/activity/undo` — not a separate
throwaway session log.

## Prerequisites

- .NET SDK 10.0.400 — this session installed it to `~/.dotnet` (not on PATH by default,
  since the Homebrew cask needs sudo this environment doesn't have). Add it to your
  shell profile or run `export PATH="$HOME/.dotnet:$PATH"` per session.
- Docker Desktop (for local SQL Server)
- Node.js 20+

## First-time setup

```bash
# 1. Start local SQL Server (same EF Core provider as Azure SQL in prod)
docker compose up -d mssql

# 2. Apply migrations (also seeds the 7 people / 12 projects / 15 assignments
#    from design_handoff_delivery_hub/data/seed-data.json on first run)
export PATH="$HOME/.dotnet:$PATH"
cd server
dotnet dotnet-ef database update --project DeliveryHub.Infrastructure --startup-project DeliveryHub.Api

# 3. Install frontend deps
cd ../client
npm install
```

## Running

```bash
# Terminal 1 — API (http://localhost:5080, seeds DB automatically in Development)
export PATH="$HOME/.dotnet:$PATH"
cd server/DeliveryHub.Api
ASPNETCORE_URLS="http://localhost:5080" ASPNETCORE_ENVIRONMENT="Development" dotnet run

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm run dev
```

Sign in with one of the two seeded accounts — see **Auth** below for how to get their
temporary passwords.

## Testing

```bash
export PATH="$HOME/.dotnet:$PATH"
cd server
dotnet test DeliveryHub.Tests/DeliveryHub.Tests.csproj   # 17 tests covering the 9 business rules

cd ../client
npx tsc -b                                                # type-check
```

## Auth

Real login: email + password checked against accounts in the `AppUsers` table
(`Microsoft.AspNetCore.Identity.PasswordHasher` for hashing), issuing a signed JWT
(`DeliveryHub.Api/Controllers/AuthController.cs`). Every API endpoint requires a valid
token; mutating endpoints additionally require the `Owner` role
(`[Authorize(Roles = "Owner")]`) — a `Viewer` gets a real 403, not just a hidden button.

Two accounts are seeded automatically on first `Development` startup, with
cryptographically random temporary passwords logged once to the API's console
(`AppUserSeeder.cs`):

| Email | Role | Can |
|---|---|---|
| `manikantan@applab.qa` | Owner | View + edit everything |
| `visitor@applab.qa` | Viewer | View only — every mutating control is hidden client-side and rejected server-side |

Grab the temporary passwords from the API's startup log (`grep "temporary password"`
in its console output) and change them via the account menu → **Change password**
(`POST /api/auth/change-password`).

This is independent of the Microsoft Entra ID SSO the architecture doc calls for, which
still needs a tenant ID/app registration you'll provide later — `@azure/msal-browser`
is installed but unwired. When that's ready, only how the JWT is *issued* changes
(swap `AuthController.Login` for the MSAL redirect); the `[Authorize]` policies, role
gating, and `ActorProvider` all stay the same since they just consume the token's claims.

## Blob Storage

Deferred — no page in this module needs file attachments yet. When you're ready, the
`.md`'s Attachment entity / upload flow (§4) is the reference design; Azurite is the
local emulator that mirrors the real Azure Blob Storage SDK calls.

## Activity History & Undo

Every mutation (people, projects, assignments) is logged to an append-only
`ActivityLogs` table with a before/after JSON snapshot per affected entity — see
`DeliveryHub.Domain/ActivityLog.cs` and `DeliveryHub.Application/Services/ActivityService.cs`.
The `/activity` page lists it all with a date-range filter and a per-entry field diff.

Undo is **selective** (like `git revert` of specific commits), not a snapshot rollback:
selecting one or more activities and undoing them reverses exactly those changes,
leaving everything else in history untouched. Multi-select undoes are processed
latest-first so overlapping edits to the same entity resolve predictably. Undoing is
itself logged as a new `Undo` activity, so the log is always a complete, honest record —
nothing is ever edited or deleted from it.

`IActorProvider` (`DeliveryHub.Api/ActorProvider.cs`) reads who made a change from an
`X-Actor-Email` header the frontend sends — a placeholder until real Entra ID auth
lands, at which point it reads the validated token's identity instead.

## Architecture

```
server/
  DeliveryHub.Domain          Person, Project, Assignment entities
  DeliveryHub.Application     Business rules (Rules/AllocationRules.cs — all 9 rules
                               from the design README, unit-tested), DTOs, services
  DeliveryHub.Infrastructure  EF Core DbContext (SQL Server provider), migrations, seeder
  DeliveryHub.Api             Controllers, Program.cs, appsettings
  DeliveryHub.Tests           xUnit tests for the business rules
client/
  src/pages/                  SignIn, Allocation, Projects, Completed, Team
  src/components/             Shell (sidebar/topbar), modals, drawer, shared primitives
  src/features/queries.ts     TanStack Query hooks (server state)
  src/theme/tokens.ts         Design tokens ported from the design handoff README
  src/auth/                   Dev-mode auth + where real MSAL wiring goes
```

Business rules (load bands, skill match, mark-complete truncation, effort calc, etc.)
live once, server-side, in `DeliveryHub.Application/Rules/AllocationRules.cs` — the API
always recomputes and returns them; the frontend never re-derives them itself.
