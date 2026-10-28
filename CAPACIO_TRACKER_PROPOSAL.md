# Capacio + Tracker Integration Proposal

Date: 28 October 2026  
Status: Proposal for discussion; implementation has not been approved.

## Context for Claude

This document captures a proposed integration discussed with Codex. Please review it with me, inspect the current projects, and help refine the approach before implementing changes. Recommendations below are proposed defaults, not final decisions.

Project locations:

- Capacio: `/Users/manikantannairs/Documents/R_and_D/capacio-resources`
- Tracker: `/Users/manikantannairs/Documents/R_and_D/tracker`

## What I want

Connect Capacio resource planning with Tracker so that:

- Team members can log in and access their own work records without needing administrator privileges or approval for each visit.
- Each member has a Today page that updates automatically with their work status.
- Members can view their own history but cannot see another member's status or records.
- Only I, as the owner/admin, and people I explicitly authorize can view everyone's status.
- We review and agree on the design before proceeding with implementation.

The interpretation of “without admin restriction” is normal member access without repeated approval. Whether this also requires installation without operating-system administrator rights should be confirmed.

## Existing foundations

These observations come from a preliminary source review on 27 October 2026. Verify them against the current code before implementation.

### Capacio

- React/TypeScript frontend and ASP.NET Core/EF Core backend using SQL Server.
- Existing login issues JWTs and supports `Owner` and `Viewer` roles.
- Existing team members, projects, assignments, and activity history.
- Login accounts (`AppUser`) and team members (`Person`) are separate entities without an explicit account-to-person relationship in the reviewed model.
- Current Viewer access allows broad reading. It does not provide the proposed private, member-only access.

### Tracker

- Python-based local work logger with a generated HTML page.
- Combines Claude activity, Git commits, and optional Jira information.
- Currently stores work-log information locally on each computer.
- Automatic collection captures supported activity; it does not cover every kind of work or establish verified working hours.

## Recommended product model

Capacio represents planned work and resource allocation. Tracker supplies reported work activity and status.

Add a **My Work** area inside Capacio, using the existing login. Keep Tracker as the collector on each member's computer.

### Suggested permissions

| Capability | Team member | Assigned reviewer | Owner/admin |
|---|---|---|---|
| View own status and history | Yes | Yes | Yes |
| Correct own summary and add blockers | Yes | Yes | Yes |
| View everyone's status and history | No | Yes | Yes |
| Manage allocations and projects | No | Only if separately granted | Yes |
| Grant or remove access | No | No | Yes |

Reviewer access should be an explicit permission granted and revoked by the owner. It should not automatically grant account administration or allocation editing.

## Proposed pages

### My Work — Today

Each member sees:

- Their assigned projects and tasks.
- Today's work summary.
- Task status: In progress, Blocked, or Completed.
- A short field for blockers or requests for help.
- Last synced time and sync state.
- Status source: Jira, Tracker inference, or manual update.
- A way to correct an automatic summary or add work that was not captured.

### My Work — History

- Only the signed-in member's previous records.
- Filters by date, project, ticket, and status.
- An indication of automatic versus manually corrected information.

### Team Today

Available only to the owner and explicitly assigned reviewers:

- One row per member showing projects, today's summary, blockers, and latest update.
- Filters for project, member, and status.
- Access to each member's work history.
- Clear distinctions between current information, stale information, and no update received.

## Proposed automatic update flow

1. A member signs in to Capacio and securely connects their local Tracker to their account.
2. Tracker collects supported work activity and creates a work summary.
3. Tracker sends selected work information to the shared Capacio API using credentials scoped to that member.
4. The server derives record ownership from the authenticated identity and its explicit team-member mapping. It must not trust a submitted email or person ID as proof of ownership.
5. Capacio saves the records and automatically refreshes the member's Today page and authorized Team Today views.
6. Offline updates remain queued locally and synchronize when connectivity returns. Retries must not create duplicate records.

A shared, hosted API and database reachable by team members are required. Local HTML files alone cannot provide the shared dashboard.

## Recommended behavior and boundaries

### Automatic publication

Recommended starting point: summaries become visible to authorized viewers automatically, with an option for the member to correct them.

Alternative for discussion: generate a draft that the member confirms before publication. This changes how immediate the shared status can be.

### Planned work versus reported work

- Tracker activity must not automatically change Capacio allocations.
- A merged branch or a commit should not automatically complete a Capacio project.
- Automatically inferred task status should remain identifiable and correctable.
- Define how manual corrections interact with later Jira or Tracker updates so corrections are not silently overwritten.

### Incomplete activity coverage

- Support manual entries for meetings, reviews, research, support, and other work outside the collector's coverage.
- “No update received” must not imply absence or lack of work.
- Do not treat captured activity duration as verified working hours.

### Shared information

Recommended shared fields:

- Work date and relevant timestamps.
- Task summary.
- Mapped Capacio project and optional Jira ticket reference.
- Status, status source, and blocker notes.
- Last sync information.

Keep raw prompts, transcripts, credentials, and local file paths on the device. Any additional information shared with Capacio should be an explicit product decision.

### Record access

- Enforce ownership and reviewer permissions in the API and database queries.
- Apply the same restrictions to details, history, search, exports, and any automatic update channel.
- Members must not obtain another person's records by changing a URL or request ID.
- Review existing broad-read endpoints before granting members access to the application.
- Revoking reviewer access must remove the ability to retrieve team-wide records.

These principles follow [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), including least privilege and checking permissions on every request.

### Dates and synchronization

- Agree on the timezone that defines “Today”; Asia/Qatar is a suggested team default.
- Show when a record last synchronized rather than implying continuous live coverage.
- Define a stable source record identifier so retries and updates can be matched without duplication.
- Establish project mapping between Tracker repository names, Jira projects, and Capacio projects, with a visible fallback for unmapped work.

## Suggested first version

1. Explicit mapping between login accounts and team members.
2. Member access limited to their own work records.
3. An owner-controlled permission for reading everyone's records.
4. Secure Tracker connection and automatic summary synchronization.
5. My Work: Today and History.
6. Team Today for the owner and authorized reviewers.
7. Manual summaries, corrections, and blockers.
8. Visible sync freshness, offline retry, and duplicate prevention.

Validate access boundaries before releasing member access: one member must not be able to read or change another member's records, including through exports or direct API requests. Confirm reviewer visibility and revocation, correct account mapping, and reliable synchronization.

## Decisions to review before implementation

- Publish automatic summaries immediately, or require member confirmation? Recommended: immediate publication with corrections.
- How should members join: owner invitation, approved work-email registration, or organization sign-in?
- Does “without admin restriction” also include installation without operating-system administrator rights?
- Can reviewers see everyone, or should some reviewers be limited to assigned teams/projects?
- Should existing Viewer users retain their current access, and how should it relate to the new reviewer permission?
- Which work fields may be shared, and how long should records be retained?
- What timezone defines Today?
- How should manual corrections take precedence over later automatic updates?
- Where will the shared Capacio API and database be hosted?

## Requested next step for Claude

Review this proposal and both codebases with me. Identify any missing requirements, recommend a concrete first-version design, and explain the necessary changes. Keep this as a planning discussion until I approve implementation.
