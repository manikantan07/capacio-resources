# DeliveryHub — Complete Project, Design & Development Pack

**Working name:** DeliveryHub — Team Project & Delivery Intelligence  
**Purpose:** Internal enterprise project delivery, task tracking, planned-vs-actual monitoring, team workload, dependencies, risks, management reporting, and delivery intelligence.  
**Audience:** Head / Senior Management, Team Lead, Project Lead, Team Members, Solution / Technical Leads, BA / PM (optional), System Administrators.  
**Document date:** September 2026

---

## 1. Executive Summary

DeliveryHub is not intended to be another basic task tracker. It is a **delivery intelligence platform** that connects day-to-day team work with management-level visibility.

The product should let a Head or senior stakeholder understand the portfolio within roughly 10–20 seconds, while still giving Team Leads and Team Members enough depth to manage tasks, milestones, dependencies, dates, risks, blockers and files.

The core design principle is:

> **Overview → Exception → Detail**

Healthy work should stay visually quiet. Delays, risks, blockers, slipping milestones, overloaded resources, and decisions needed from management should surface automatically.

The signature capabilities are:

1. Planned vs Actual dates and progress.
2. Baseline vs Forecast delivery comparison.
3. Explainable Project Health.
4. Management Attention Required.
5. Risks & Blockers register.
6. Dependency visibility across teams/workstreams.
7. Weekly Delivery Summary.
8. Role-specific experiences.
9. Team workload and availability planning.
10. Full delivery/audit history.
11. Azure Blob Storage for project/task files and reports.
12. Enterprise SSO and role-based authorization.

---

## 2. Recommended Technology Stack

### 2.1 Recommended stack for this internal enterprise application

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | React 19.2 + Vite 8.x + TypeScript | Fast SPA development; ideal for an authenticated internal dashboard; avoids unnecessary SSR complexity. |
| UI System | Material UI (MUI) 9 | Strong enterprise components, accessibility, forms, dialogs, drawers, date controls and theming. |
| Server State | TanStack Query v5 | API caching, refetching, invalidation, loading/error states. |
| Forms | React Hook Form + Zod | Performant forms and reusable validation. |
| Data Grid | AG Grid 36.x | Advanced sorting/filtering/editing, large data sets and enterprise table UX. Start with Community edition where possible. |
| Charts | Apache ECharts or Recharts | Delivery progress, variance and workload charts. |
| Calendar | FullCalendar | Month/week/agenda delivery calendar. |
| Gantt / Timeline | Abstracted Gantt adapter | Avoid tight coupling to a paid library; keep business logic independent of the timeline renderer. |
| Backend | ASP.NET Core 10 Web API | Current .NET LTS line; strong fit for Microsoft/Azure enterprise environments. |
| Backend Language | C# | Mature enterprise ecosystem and Azure support. |
| ORM | Entity Framework Core | Typed relational data access, migrations and LINQ. |
| API Style | REST + OpenAPI | Simple ownership boundary for FE/BE; easy Solution-team review and API documentation. |
| Database | Azure SQL | Relational project/task/reporting data; strong enterprise Azure integration. |
| File Storage | Azure Blob Storage | Project documents, screenshots, task attachments, generated PDFs and exports. |
| Authentication | Microsoft Entra ID + MSAL | Company SSO and enterprise identity. |
| Secrets | Azure Key Vault | Avoid secrets in source code and configuration files. |
| Hosting | Azure App Service | Straightforward React/API hosting and enterprise operations. |
| Monitoring | Azure Application Insights | App telemetry, errors and performance monitoring. |
| CI/CD | Azure DevOps Pipelines | Good fit for Microsoft enterprise delivery processes. |
| Frontend Unit Tests | Vitest + React Testing Library | Fast component/unit tests. |
| Backend Tests | xUnit | Standard .NET testing. |
| E2E | Playwright | Critical workflow testing across the full application. |

### 2.2 Why React + Vite instead of Next.js for the first version

This product is primarily an internal authenticated application. It does not need public SEO or server-rendered marketing pages. The backend is already a dedicated ASP.NET Core API. A React SPA therefore gives a clean architecture:

```text
Browser
  ↓
React + Vite + TypeScript + MUI
  ↓ HTTPS / REST
ASP.NET Core 10 Web API
  ↓                ↓
Azure SQL      Azure Blob Storage
```

Next.js remains a valid alternative, especially if future requirements include SSR, public content or server-side frontend capabilities. For the first internal enterprise version, React + Vite keeps ownership and deployment simpler.

### 2.3 Versions verified in September 2026

- React latest documented version: **19.2**.
- Vite 8 is stable; Vite 8.1 was released in June 2026.
- Material UI latest stable major: **v9**.
- AG Grid current docs show **36.1.0**.
- .NET **10** is the current LTS line; .NET 10.0.11 / SDK 10.0.400 was published in August 2026.

Do not lock the application to patch versions in this document. Pin exact versions in the repository lockfile and upgrade through a controlled dependency process.

---

## 3. Azure Reference Architecture

```text
                           ┌─────────────────────────────┐
                           │ Microsoft Entra ID          │
                           │ SSO / Users / App Roles     │
                           └──────────────┬──────────────┘
                                          │
                                          ▼
┌──────────────────────────────┐   HTTPS   ┌──────────────────────────────┐
│ React + Vite + TypeScript    │ ────────► │ ASP.NET Core 10 Web API      │
│ MUI / AG Grid / Query        │           │ EF Core / Validation / RBAC  │
└──────────────────────────────┘           └──────────┬───────────┬───────┘
                                                    │           │
                                      ┌─────────────┘           └─────────────┐
                                      ▼                                       ▼
                         ┌────────────────────────┐              ┌────────────────────────┐
                         │ Azure SQL              │              │ Azure Blob Storage     │
                         │ Projects / Tasks / ... │              │ Files / Reports / Docs │
                         └────────────────────────┘              └────────────────────────┘
                                      │                                       │
                                      └────────────────┬──────────────────────┘
                                                       ▼
                                            ┌─────────────────────┐
                                            │ Managed Identity     │
                                            │ + Key Vault          │
                                            └─────────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │ Application Insights │
                                            │ Logs / Metrics / APM │
                                            └─────────────────────┘
```

### 3.1 Azure resources by environment

Use separate DEV / QA / UAT / PROD configuration. Production should not share the same database or storage containers with development.

Example production resource group:

```text
rg-deliveryhub-prod
├── app-deliveryhub-ui
├── app-deliveryhub-api
├── sql-deliveryhub-prod
│   └── sqldb-deliveryhub
├── stdeliveryhubprod
│   ├── project-files
│   ├── task-attachments
│   ├── reports
│   └── exports
├── kv-deliveryhub-prod
├── appi-deliveryhub
└── log-deliveryhub
```

### 3.2 Passwordless access

Prefer managed identity / Microsoft Entra authentication for Azure SQL and Blob Storage. Do not place storage account keys or database passwords in the React application. Do not commit secrets to Git.

Local development can use developer credentials/CLI identity. Azure-hosted services should use managed identities where practical.

---

## 4. Blob Storage Design

### 4.1 What belongs in Blob Storage

Blob Storage is for file/object content, not for core structured application data.

**Azure SQL:**
- Projects
- Tasks
- Users / user references
- Milestones
- Risks
- Blockers
- Dependencies
- Comments
- Workstreams
- Weekly reports metadata
- Attachment metadata
- Audit history

**Azure Blob Storage:**
- PDFs
- Word documents
- Excel files
- Screenshots
- Images
- Project requirements documents
- Task attachments
- Generated management reports
- Export files

### 4.2 Suggested containers

```text
deliveryhub-storage
├── project-files
├── task-attachments
├── reports
├── exports
└── temp
```

Do not depend on virtual folder names as the source of truth. Store file relationships in SQL.

### 4.3 Attachment entity

```text
Attachment
- id
- projectId (nullable)
- taskId (nullable)
- commentId (nullable)
- uploadedBy
- originalFileName
- storedBlobName
- blobContainer
- contentType
- fileSize
- checksum (optional)
- uploadedAt
- deletedAt (nullable)
```

### 4.4 Upload flow

```text
User selects file
   ↓
React validates basic client rules
   ↓
POST /api/tasks/{id}/attachments
   ↓
ASP.NET Core verifies:
- authentication
- authorization
- project/task access
- allowed extension/MIME
- file size
- malware scanning strategy if required
   ↓
API generates non-guessable blob name
   ↓
Upload to Azure Blob Storage
   ↓
Save attachment metadata in Azure SQL
   ↓
Return safe file metadata to React
```

For large files, a future version can use short-lived SAS URLs after the API authorizes the operation. Do not expose permanent public blob URLs.

---

## 5. Product Roles & Permissions

### 5.1 Head / Senior Management

Default to a simplified read-heavy experience.

Can see:
- Executive Dashboard
- Portfolio Health
- Project summary
- Delivery progress
- Forecast vs baseline
- Key milestones
- Risks and blockers
- Dependencies
- Management Attention Required
- Weekly Status
- Reports

Optional permissions:
- Comment
- Acknowledge management action
- Request clarification
- Approve/reject selected decisions

Should not be forced into task administration.

### 5.2 Team Lead / Delivery Lead

Can:
- Create/edit projects
- Assign project leads and members
- Set allocations
- Create/edit tasks
- Manage baselines
- Manage milestones
- Record/update risks and blockers
- Manage dependencies
- Publish weekly status
- Forecast completion
- Escalate management attention
- Review workload
- Generate/export reports

### 5.3 Project Lead

Same operational capabilities, scoped to assigned projects unless extra rights are granted.

### 5.4 Team Member

Primary workspace: **My Work**.

Can typically:
- View assigned projects/tasks
- Update task status
- Update progress
- Add actual start/end dates
- Update forecast date
- Add comments
- Add blocker
- Add attachments
- Update effort

Should not normally edit approved project baselines.

### 5.5 Solution / Technical Lead

Focus on:
- Technical dependencies
- API dependencies
- Infrastructure/environment readiness
- Technical milestones
- Integration blockers
- Architecture decisions
- Technical risks
- Solution-owned actions

### 5.6 Admin

Can manage:
- Users
- Roles
- Permissions
- Teams
- Departments
- Clients
- Status dictionaries
- Priority dictionaries
- Holiday calendars
- Notification configuration
- Integrations
- Audit/system settings

---

## 6. Information Architecture & Navigation

### Desktop sidebar

1. Dashboard
2. Projects
3. Tasks
4. My Work
5. Timeline
6. Team
7. Calendar
8. Milestones
9. Risks & Blockers
10. Dependencies
11. Weekly Updates
12. Management View
13. Reports
14. Activity
15. Notifications
16. Settings

At the bottom:
- Profile
- Help
- Logout

Add Command/Ctrl + K global search.

---

# 7. Page-by-Page UX & Functional Specification

## Page 1 — Login / SSO

### Purpose
Provide secure enterprise authentication with minimum friction.

### Components
- Application logo
- Product name: DeliveryHub
- Subtitle: “Project delivery intelligence for modern teams.”
- “Sign in with Microsoft” action
- Security/help footer

### Behaviour
- Use Microsoft Entra ID / MSAL.
- Redirect based on role after sign-in.
- Do not create local username/password inputs unless a formal non-SSO requirement exists.

---

## Page 2 — Executive Dashboard

### Purpose
Answer the management question: **“What is happening right now, and where do I need to pay attention?”**

### Header
- Title: Delivery Overview
- Subtitle: Project health, delivery progress and team workload at a glance.
- Date range
- Department
- Team
- Project
- Project Lead
- Health
- Status
- Priority
- Saved View
- Refresh
- Export
- Share
- Last refreshed time

### KPI strip
Show compact cards:
- Active Projects
- Overall Actual Progress
- Planned Progress
- Progress Variance
- On Track
- Attention Needed
- At Risk
- Delayed
- Overdue Tasks
- Upcoming Milestones
- Blocked Tasks
- Management Attention

### Portfolio Health
Provide a compact distribution by:
- On Track
- Attention Needed
- At Risk
- Delayed
- Completed

Also show an overall health label and reason.

### Planned vs Actual
Show:
- Planned progress
- Actual progress
- Variance
- Current period forecast

### Project Status table
Columns:
- Project
- Lead
- Health
- Actual Progress
- Planned Progress
- Variance
- Baseline End
- Forecast End
- Days Ahead/Behind
- Next Milestone
- Blocked Tasks
- Management Attention
- Last Updated

Default sort order:
1. At Risk
2. Delayed
3. Attention Needed
4. On Track
5. Completed

### Management Attention Required
This is a signature section.

Fields:
- Project
- Issue
- Impact
- Owner
- Required From
- Required Action
- Required By
- Risk Level
- Status
- Decision Required

Actions based on permission:
- Acknowledge
- Comment
- Escalate
- Mark Resolved

### Key Deliveries This Week
- Project
- Milestone
- Owner
- Due Date
- Status
- Confidence

### Dashboard success criteria
A Head should not need to open task screens to understand overall health.

---

## Page 3 — Projects

### Views
- Table (default)
- Cards

### Filters
- Search
- Status
- Health
- Priority
- Lead
- Team Member
- Client
- Department
- Date range
- At Risk only
- Delayed only
- Blocked only
- Archived

### Table columns
- Project Code
- Project Name
- Client
- Department
- Project Lead
- Team
- Status
- Health
- Priority
- Planned Start
- Planned End
- Actual Start
- Actual End
- Forecast End
- Planned Progress
- Actual Progress
- Variance
- Days Ahead/Behind
- Total Tasks
- Blocked Tasks
- Milestones
- Risk Level
- Last Updated
- Actions

### Project card
Show:
- Project name/code
- Health
- Actual progress
- Planned progress
- Planned dates
- Actual start
- Forecast end
- Delay/ahead indicator
- Task completion
- Team avatars
- Next milestone
- Main dependency/risk
- View Project

---

## Page 4 — Create / Edit Project

Use a step-based flow:

1. Basic Details
2. Ownership
3. Dates & Baseline
4. Team
5. Workstreams
6. Milestones
7. Dependencies
8. Review & Create

### Basic Details
- Project Name
- Project Code
- Description
- Client
- Department
- Category
- Technology
- Priority
- Status
- Health

### Ownership
- Project Lead
- Solution Lead
- PM/BA (optional)
- Sponsor (optional)

### Dates
- Planned Start
- Planned End
- Actual Start
- Actual End
- Forecast End
- Baseline Start
- Baseline End

### Team allocation
Each member:
- Person
- Role
- Allocation %
- Start Date
- End Date
- Responsibility

### Baseline rule
After formal approval, baseline changes must preserve history and require a reason.

---

## Page 5 — Project Detail

### Header
- Breadcrumb
- Project Code
- Project Name
- Client
- Status
- Health
- Priority
- Favourite
- Last Updated

Actions:
- Add Task
- Add Milestone
- Add Risk
- Add Dependency
- Add Update
- Edit Project
- Export
- Share

### Hero summary
- Actual Progress
- Planned Progress
- Progress Variance
- Baseline End
- Forecast End
- Schedule Difference
- Health + explanation

### Tabs
1. Overview
2. Tasks
3. Timeline
4. Milestones
5. Risks
6. Dependencies
7. Team
8. Updates
9. Files
10. Activity
11. Settings

### Overview sections
- Delivery Summary
- Planned vs Actual
- Workstream progress
- Upcoming milestones
- Risks
- Blockers
- Dependencies
- Team workload
- Management attention
- Recent update

### Workstreams
Examples:
- UX/UI
- Frontend
- Backend
- API
- CMS
- QA
- UAT
- Infrastructure
- Deployment

Each workstream shows:
- Owner
- Health
- Progress
- Planned Start
- Planned End
- Forecast End
- Task Count
- Blocked Count

---

## Page 6 — Tasks

### Views
- List (default)
- Board
- My Tasks
- Grouped

### Columns
- Task ID
- Task Name
- Project
- Workstream
- Description preview
- Assignee
- Reviewer
- Priority
- Status
- Health
- Progress
- Planned Start
- Planned End
- Actual Start
- Actual End
- Forecast End
- Planned Duration
- Actual Duration
- Planned Hours
- Actual Hours
- Delay/Variance
- Dependency Count
- Blocked
- Milestone
- Last Update
- Actions

### Statuses
- Backlog
- Not Started
- Ready
- In Progress
- In Review
- Blocked
- On Hold
- Completed
- Cancelled

### Priorities
- Critical
- High
- Medium
- Low

### Interactions
- Inline edit
- Bulk assign
- Bulk status update
- Bulk priority update
- Bulk reschedule
- Multi-select
- Column reorder/resize
- Hide/show columns
- Export
- Saved filters/views
- Server-side filtering/sorting/pagination

---

## Page 7 — Task Detail Drawer

Open from the task table without losing context.

Recommended width: approximately 480–600 px on desktop.

Show:
- Task ID
- Name
- Description
- Project
- Workstream
- Milestone
- Assignee
- Reviewer
- Priority
- Status
- Health
- Progress
- Planned Start/End
- Actual Start/End
- Forecast End
- Planned Hours
- Actual Hours
- Dependencies
- Blockers
- Risks
- Subtasks
- Files
- Links
- Comments
- Activity
- Created/Updated metadata

Quick actions:
- Change status
- Update progress
- Add comment
- Mark blocked
- Reassign
- Add dependency
- Add risk

Optional rule: when moving to In Progress, prompt to set Actual Start if empty. When completing, prompt to set Actual End if empty. Never silently modify historical dates.

---

## Page 8 — My Work

Primary page for team members.

Sections:
- Today
- Overdue
- Due This Week
- Upcoming
- Blocked
- Waiting for Review
- Recently Completed

Allow quick updates for:
- Status
- Progress
- Forecast date
- Blocker
- Comment

Keep portfolio information secondary here.

---

## Page 9 — Timeline / Gantt

### Purpose
Make baseline, planned, actual and forecast differences visually obvious.

Rows may represent:
- Projects
- Workstreams
- Milestones
- Tasks

### Display
- Baseline/planned bar
- Actual completed bar
- Forecast extension
- Dependencies
- Today line
- Milestone diamonds
- Weekends
- Optional public holidays

### Controls
- Today
- Previous / Next
- Fit
- Week / Month / Quarter / Year
- Project filter
- Team filter
- Status
- Health
- Milestone
- Dependencies

### Visual rule
Do not paint entire rows red. Use neutral planned bars and semantic exception indicators.

---

## Page 10 — Team Overview

Columns/cards:
- Team Member
- Role
- Active Projects
- Assigned Tasks
- In Progress
- Overdue
- Blocked
- Completed This Month
- Allocation
- Availability
- Upcoming Deadline
- Workload Status

Workload status:
- Available
- Balanced
- High
- Overloaded

Do not calculate workload only by task count. Consider allocation %, estimated effort, dates and project assignments.

---

## Page 11 — Team Member Detail

Header:
- Avatar
- Name
- Role
- Department
- Current Allocation
- Availability

Tabs:
- Overview
- Projects
- Tasks
- Calendar
- Activity

Overview:
- Current Projects
- Current Tasks
- Tasks Due This Week
- Overdue
- Blocked
- Completed This Month
- Current Allocation
- Upcoming Availability

---

## Page 12 — Milestones

### Register columns
- Milestone
- Project
- Owner
- Planned Date
- Forecast Date
- Actual Date
- Status
- Health
- Progress
- Critical flag
- Dependency
- Risk
- Days Ahead/Behind

Statuses:
- Upcoming
- In Progress
- At Risk
- Delayed
- Completed
- Cancelled

Also provide milestone timeline view.

---

## Page 13 — Risks & Blockers

Use two tabs.

### Risk fields
- Risk ID
- Project
- Task (optional)
- Title
- Description
- Category
- Probability
- Impact
- Risk Score
- Severity
- Owner
- Raised By
- Raised Date
- Mitigation
- Contingency
- Target Resolution
- Status
- Resolved Date

Categories:
- Schedule
- Resource
- Technical
- Dependency
- Client
- Scope
- Infrastructure
- Security
- Quality
- External

### Blocker fields
- Blocker ID
- Project
- Task
- Workstream
- Title
- Description
- Owner
- Blocked Since
- Expected Resolution
- Dependency Team
- Business Impact
- Delivery Impact
- Severity
- Status
- Escalation Required
- Resolved Date
- Resolution Notes

Automatically calculate “Blocked for X days”.

---

## Page 14 — Dependencies

Dependencies can exist between:
- Task → Task
- Project → Project
- Team → Team
- Project → External Team
- Milestone → Milestone

Fields:
- Dependency Name
- Source type/id
- Target type/id
- Dependency Type
- Owner
- External Owner
- Required By
- Expected Delivery
- Actual Delivery
- Status
- Impact
- Notes

Statuses:
- Pending
- On Track
- At Risk
- Delayed
- Delivered
- Cancelled

Optional flow visualization:

```text
UX/UI
  ↓
Frontend
  ↓
API Integration
  ↓
QA
  ↓
UAT
  ↓
Production
```

Highlight blocked paths.

---

## Page 15 — Calendar

Views:
- Month
- Week
- Agenda
- Timeline

Events:
- Task due dates
- Milestones
- Project starts/ends
- Releases
- UAT
- Deployments
- Holidays

Filters:
- Project
- Member
- Event Type
- Priority
- Status

---

## Page 16 — Weekly Delivery Status

This is a signature management/reporting page.

Header:
- Weekly Delivery Summary
- Week range
- Previous/Next Week
- Generate
- Refresh
- Edit Summary
- Export PDF
- Copy
- Share

KPIs:
- Active Projects
- Planned Tasks
- Completed Tasks
- Completion Rate
- Delayed Tasks
- Blocked Tasks
- Milestones Completed
- New Risks
- Resolved Risks

Sections:
1. Executive Summary
2. Completed This Week
3. In Progress
4. Planned Next Week
5. Key Milestones
6. Delays
7. Risks
8. Blockers
9. Dependencies
10. Resource Concerns
11. Management Attention Required
12. Decisions Required

AI may generate a draft summary, but always label it and require human review before sharing.

---

## Page 17 — Management View

Create a distraction-free executive screen.

Show:
- Portfolio Health
- Overall Progress
- Planned vs Actual
- On Track Projects
- Attention Needed
- At Risk
- Delayed
- Key Deliveries
- Upcoming Milestones
- Major Risks
- Major Blockers
- Critical Dependencies
- Resource Concerns
- Management Attention Required
- Decisions Required
- Weekly Trend

Project rows should show only:
- Project
- Lead
- Health
- Actual Progress
- Planned Progress
- Variance
- Forecast Completion
- Main Risk
- Required Action

---

## Page 18 — Reports Center

Reports:
- Executive Portfolio Report
- Project Status Report
- Weekly Delivery Report
- Planned vs Actual Report
- Schedule Variance Report
- Task Completion Report
- Overdue Tasks Report
- Milestone Report
- Risk Report
- Blocker Report
- Dependency Report
- Team Workload Report
- Project Forecast Report

Filters:
- Date Range
- Project
- Department
- Client
- Team
- Member
- Health
- Status
- Priority

Export:
- PDF
- Excel
- CSV
- Print

Report data must come from server-side queries, not only from currently visible browser rows.

---

## Page 19 — Activity / Audit-Friendly Feed

Examples:
- Forecast changed from 30 Sep to 03 Oct.
- Task FE-102 changed to In Progress.
- New blocker added.
- Milestone UAT marked Completed.
- Project health changed from On Track to Attention Needed.
- Baseline end date changed.

Each significant activity stores:
- Who
- What
- Previous Value
- New Value
- Date/Time
- Source
- Related Entity

---

## Page 20 — Notifications

Notification types:
- Task assigned
- Task due soon
- Task overdue
- Blocker assigned
- Risk escalated
- Milestone approaching
- Dependency delayed
- Management action assigned
- Project health changed
- Weekly report ready for review

Channels:
- In-app (MVP)
- Email (Phase 2)
- Microsoft Teams (Phase 2)

---

## Page 21 — Global Search

Command/Ctrl + K search across:
- Projects
- Tasks
- People
- Milestones
- Risks
- Blockers
- Dependencies
- Weekly Updates
- Comments

Group results by type and support keyboard navigation.

---

## Page 22 — Settings

Sections:
- Profile
- Preferences
- Teams
- Users
- Roles
- Permissions
- Clients
- Departments
- Project Types
- Statuses
- Priorities
- Holiday Calendar
- Notifications
- Integrations
- Audit
- System

---

# 8. Design System

## 8.1 Visual direction

Aim for a premium modern enterprise SaaS feel influenced by the clarity of Linear, Notion, Atlassian, Vercel and modern Microsoft products, without copying any one product.

Principles:
- Minimal but not empty
- Dense enough for work, not cluttered
- Neutral base colours
- Semantic colours only for meaning
- Strong typography hierarchy
- Consistent spacing
- Subtle borders
- Limited shadows
- Clear focus states
- Excellent table usability

Avoid:
- Generic Bootstrap admin appearance
- Huge dashboard cards
- Decorative gradients
- Too many donut charts
- Colour everywhere
- Unnecessary animations

## 8.2 Semantic colours

- Green: On Track / Healthy / Completed
- Blue: Active / In Progress
- Amber: Attention / Risk
- Red: Critical / Delayed / Blocked
- Purple: Milestone
- Gray: Neutral / Not Started / Archived

Always pair state colour with text/icon.

## 8.3 Typography

Use a modern sans-serif such as Inter or an approved company font.

Hierarchy:
- Page Title
- Section Title
- Card Heading
- Metric
- Body
- Secondary
- Caption

Avoid oversized marketing headlines inside the app.

## 8.4 Cards

- Radius around 10–14 px
- 1 px subtle border
- Minimal shadow
- Compact information hierarchy

## 8.5 Tables

Tables are core product surfaces. Support:
- Sticky headers
- Row hover
- Selected state
- Expandable rows
- Column visibility/reorder/resize
- Server pagination
- Keyboard navigation
- Loading/empty/error states
- Important columns pinned when appropriate

## 8.6 Responsive

Desktop first: 1366, 1440, 1920.

Tablet:
- Collapsible navigation
- Hide secondary table columns

Mobile:
- Cards instead of large tables
- Focus on quick status/progress/comment actions
- Full Gantt editing not required

## 8.7 Accessibility

Target WCAG 2.2 AA:
- Keyboard navigation
- Visible focus
- Accessible form labels
- Sufficient contrast
- Screen reader-friendly status text
- ARIA where necessary
- No hover-only essential interactions
- Respect reduced-motion preferences

---

# 9. Core Data Model

Main entities:
- User
- Role
- Permission
- Team
- Department
- Client
- Project
- ProjectMember
- Workstream
- Task
- Subtask
- Milestone
- Risk
- Blocker
- Dependency
- ProjectUpdate
- WeeklyReport
- WeeklyReportSection
- ManagementAttention
- Comment
- Attachment
- ActivityLog
- Notification
- SavedView
- Holiday
- ProjectBaseline
- AuditLog

## 9.1 Project

```text
Project
- id: Guid
- code: string
- name: string
- description: string?
- clientId: Guid?
- departmentId: Guid?
- projectLeadId: Guid
- solutionLeadId: Guid?
- priority: enum
- status: enum
- health: enum
- healthReason: string?
- plannedStart: date
- plannedEnd: date
- actualStart: date?
- actualEnd: date?
- forecastEnd: date?
- plannedProgress: decimal
- actualProgress: decimal
- managementSummary: string?
- createdAt
- updatedAt
- createdBy
- updatedBy
- archivedAt?
```

## 9.2 ProjectMember

```text
ProjectMember
- id
- projectId
- userId
- projectRole
- allocationPercent
- startDate
- endDate?
- responsibility?
```

## 9.3 Workstream

```text
Workstream
- id
- projectId
- name
- ownerId
- weight?
- plannedStart
- plannedEnd
- forecastEnd?
- progress
- health
```

## 9.4 Task

```text
Task
- id
- taskCode
- projectId
- workstreamId?
- milestoneId?
- parentTaskId?
- name
- description?
- assigneeId?
- reviewerId?
- priority
- status
- health
- plannedStart
- plannedEnd
- actualStart?
- actualEnd?
- forecastEnd?
- plannedHours?
- actualHours?
- progress
- blockerFlag
- createdAt
- updatedAt
- completedAt?
```

## 9.5 Milestone

```text
Milestone
- id
- projectId
- name
- description?
- ownerId
- plannedDate
- forecastDate?
- actualDate?
- status
- health
- progress
- critical
```

## 9.6 Risk

```text
Risk
- id
- projectId
- taskId?
- title
- description
- category
- probability
- impact
- riskScore
- severity
- ownerId
- mitigation?
- contingency?
- status
- targetResolution?
- raisedAt
- resolvedAt?
```

## 9.7 Blocker

```text
Blocker
- id
- projectId
- taskId?
- workstreamId?
- title
- description
- ownerId
- dependencyTeam?
- severity
- deliveryImpact?
- businessImpact?
- blockedSince
- expectedResolution?
- status
- escalationRequired
- resolvedAt?
- resolutionNotes?
```

## 9.8 Dependency

```text
Dependency
- id
- projectId
- sourceType
- sourceId
- targetType
- targetId
- dependencyType
- ownerId?
- externalOwner?
- requiredBy?
- expectedDate?
- actualDate?
- status
- impact?
- notes?
```

## 9.9 ManagementAttention

```text
ManagementAttention
- id
- projectId
- relatedEntityType?
- relatedEntityId?
- title
- issue
- impact
- ownerId
- requiredFrom
- requiredAction
- requiredBy?
- riskLevel
- decisionRequired?
- status
- createdAt
- resolvedAt?
```

## 9.10 ProjectBaseline

```text
ProjectBaseline
- id
- projectId
- version
- baselineStart
- baselineEnd
- snapshotJson / normalized child snapshots
- reason
- createdBy
- createdAt
- approvedBy?
- approvedAt?
```

---

# 10. Baseline, Planned, Actual & Forecast Rules

These terms must remain distinct:

**Baseline:** formally agreed delivery plan at a point in time. Preserve versions.

**Current Plan:** the current working plan, which may be adjusted.

**Actual:** what actually happened.

**Forecast:** best current expected future outcome.

Do not overwrite old baseline values when the plan changes.

A baseline change should capture:
- Previous values
- New values
- Reason
- User
- Timestamp
- Approval if required

---

# 11. Core Calculations

## Schedule variance
Forecast End − Baseline End

- positive = behind
- negative = ahead

## Progress variance
Actual Progress − Planned Progress

## Task completion rate
Completed applicable tasks / total applicable tasks × 100

## On-time completion
Tasks completed on/before planned end / completed tasks × 100

## Blocked duration
Current date − blocked start date

## Milestone variance
Forecast milestone date − planned milestone date

### Planned progress strategy
Support:
1. Simple time-based progress.
2. Weighted task/workstream progress.

Preferred when task estimates exist: weighted progress.

Do not blindly use linear time progress for every project.

---

# 12. Project Health Logic

Health must be explainable.

### On Track
- Schedule variance within threshold
- No critical blocker
- Progress variance acceptable
- No critical overdue milestone

### Attention Needed
- Minor schedule variance
- Upcoming dependency risk
- Moderate progress variance

### At Risk
- Critical blocker
- Major dependency delay
- Significant progress variance
- Critical milestone risk

### Delayed
- Forecast end exceeds baseline beyond configured threshold

Allow authorized leads to override health, but require a reason and audit trail.

Example:

> **At Risk** — User Profile API is four working days behind its expected date and may affect UAT.

---

# 13. API Design

Use REST and OpenAPI/Swagger.

### Dashboard / management
```http
GET /api/dashboard
GET /api/management/overview
GET /api/management/attention
```

### Projects
```http
GET    /api/projects
POST   /api/projects
GET    /api/projects/{id}
PUT    /api/projects/{id}
DELETE /api/projects/{id}            # Prefer archive semantics
POST   /api/projects/{id}/baseline
GET    /api/projects/{id}/baselines
GET    /api/projects/{id}/summary
```

### Tasks
```http
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/{id}
PUT    /api/tasks/{id}
PATCH  /api/tasks/{id}/status
PATCH  /api/tasks/{id}/progress
GET    /api/projects/{id}/tasks
```

### Milestones
```http
GET  /api/milestones
POST /api/milestones
GET  /api/milestones/{id}
PUT  /api/milestones/{id}
```

### Risks / blockers
```http
GET  /api/risks
POST /api/risks
PUT  /api/risks/{id}

GET  /api/blockers
POST /api/blockers
PUT  /api/blockers/{id}
```

### Dependencies
```http
GET  /api/dependencies
POST /api/dependencies
PUT  /api/dependencies/{id}
```

### Attachments
```http
POST   /api/projects/{id}/attachments
POST   /api/tasks/{id}/attachments
GET    /api/projects/{id}/attachments
GET    /api/tasks/{id}/attachments
GET    /api/attachments/{id}/download
DELETE /api/attachments/{id}
```

### Reports
```http
GET  /api/reports/weekly
POST /api/reports/weekly/generate
GET  /api/reports/management
GET  /api/reports/planned-vs-actual
POST /api/reports/export
```

### Team
```http
GET /api/team
GET /api/team/{userId}
GET /api/team/workload
```

### Activity / notifications
```http
GET  /api/activity
GET  /api/notifications
PATCH /api/notifications/{id}/read
```

### API standards
- Pagination
- Filtering
- Sorting
- Search
- DTO validation
- Consistent ProblemDetails errors
- Correlation IDs
- Authorization at API level
- Audit logging
- Optimistic concurrency for sensitive edits
- Async I/O
- OpenAPI documentation

---

# 14. Backend Architecture

Recommended solution structure:

```text
backend/
├── DeliveryHub.Api/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Authorization/
│   ├── Extensions/
│   └── Program.cs
├── DeliveryHub.Application/
│   ├── Projects/
│   ├── Tasks/
│   ├── Milestones/
│   ├── Risks/
│   ├── Dependencies/
│   ├── Reports/
│   ├── Files/
│   └── Interfaces/
├── DeliveryHub.Domain/
│   ├── Entities/
│   ├── Enums/
│   ├── ValueObjects/
│   └── Rules/
├── DeliveryHub.Infrastructure/
│   ├── Database/
│   ├── Storage/
│   ├── Identity/
│   ├── Reporting/
│   └── Services/
└── DeliveryHub.Tests/
```

Keep Clean Architecture pragmatic. Avoid creating dozens of empty abstraction layers.

---

# 15. Frontend Architecture

```text
frontend/
├── src/
│   ├── app/
│   ├── api/
│   ├── components/
│   ├── design-system/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── timeline/
│   │   ├── team/
│   │   ├── milestones/
│   │   ├── risks/
│   │   ├── blockers/
│   │   ├── dependencies/
│   │   ├── weekly-status/
│   │   ├── management/
│   │   └── reports/
│   ├── hooks/
│   ├── lib/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   └── config/
└── tests/
```

### State management
- Server data: TanStack Query
- Forms: React Hook Form
- Validation: Zod
- Local UI state: React state
- Shared transient UI state: Zustand only if genuinely necessary

Do not introduce Redux by default.

---

# 16. Recommended Monorepo

```text
deliveryhub/
├── frontend/
├── backend/
├── database/
│   ├── scripts/
│   └── seed/
├── infra/
│   ├── bicep/
│   └── pipelines/
├── docs/
├── tests/
├── .editorconfig
├── README.md
└── DeliveryHub.sln
```

Optional tooling:
- pnpm for frontend package management
- Bicep for Azure infrastructure as code
- Azure DevOps YAML pipelines

---

# 17. Security Requirements

Implement:
- Microsoft Entra ID SSO
- Backend authorization
- Role and permission checks
- HTTPS only
- Secure headers
- Input validation
- Output encoding
- EF Core/parameterized SQL
- Key Vault for secrets
- Managed identities
- Secure file validation
- File size limits
- MIME/extension allowlists
- Malware scanning strategy for enterprise uploads if required
- Audit trails
- Least privilege
- No sensitive configuration in frontend bundles
- No permanent public Blob containers

Security must be reviewed by the Solution/Security team before production.

---

# 18. Audit Requirements

Audit at minimum:
- Baseline changes
- Planned dates
- Forecast dates
- Actual dates
- Project status/health
- Priority
- Task assignment/status/completion
- Risk changes
- Blocker changes
- Dependency changes
- Management attention
- Role/permission changes
- File delete actions

Audit record fields:
- Actor
- Action
- Entity Type
- Entity ID
- Previous Value
- New Value
- Timestamp
- Correlation ID
- Source/IP where policy permits

Normal users should not edit audit history.

---

# 19. Reporting Strategy

Reports must be generated from server-side data.

PDF layout should include:
- Branding
- Report title
- Date range
- Generated date
- Generated by
- Active filters
- Executive summary
- KPI summary
- Tables
- Charts where useful
- Page numbers
- Footer

Do not simply browser-print the dashboard.

Store generated reports in Blob Storage if a retained report history is required.

---

# 20. Notifications & Integrations

## MVP
- In-app notifications

## Phase 2
- Email notifications
- Microsoft Teams notifications
- Azure DevOps link/sync
- Jira integration
- SharePoint links
- Power BI optional reporting

Design integrations behind interfaces so the core domain is not coupled to one external system.

---

# 21. AI-Assisted Features (Optional, Human-in-the-Loop)

Possible later capabilities:
- Draft weekly status summary
- Explain health changes
- Summarize blockers
- Identify unusual schedule slippage
- Suggest items for Management Attention
- Summarize changes since previous week
- Produce management-ready project status draft

Rules:
- AI suggestions are drafts.
- Never silently update official dates/statuses.
- Never automatically send an AI-generated report without review.
- Clearly label AI-generated content.

---

# 22. Performance Requirements

- Fast initial dashboard
- Server-side pagination/filtering for large grids
- Virtualized table rows when needed
- Lazy-load heavy charts/Gantt
- Code-split feature pages
- Cache reference data
- Avoid expensive client-side aggregation across the full portfolio
- Database indexes for project/task/status/date/assignee/dependencies
- Use async API/database/storage calls

---

# 23. Loading, Empty & Error States

### Loading
Use skeletons matching the layout. Avoid full-screen spinners for routine data refresh.

### Empty examples
“No active risks have been recorded for this project.” → Add Risk

“No tasks yet. Create the first task to begin tracking delivery.” → Add Task

### Errors
Show:
- Clear message
- Retry
- Correlation/reference ID when helpful
- Never expose backend stack traces

### Toasts
Examples:
- Task updated.
- Project created.
- Baseline saved.
- Risk added.
- Report generated.

Avoid a toast for every tiny inline edit.

---

# 24. Sample Data

## Project: QFZ SharePoint Portal
- Status: In Progress
- Health: Attention Needed
- Actual Progress: 72%
- Planned Progress: 78%
- Baseline End: 30 Sep 2026
- Forecast End: 03 Oct 2026
- Variance: 3 days behind
- Main Dependency: User Profile API
- Next Milestone: Homepage Integration

## Project: Qatar Music Academy Revamp
- Status: In Progress
- Health: On Track
- Progress: 91%
- Next Milestone: UAT Sign-off

## Project: HR Module Integration
- Status: In Progress
- Health: At Risk
- Progress: 54%
- Main Risk: Integration dependency

## Project: Milaha Portal
- Status: Completed
- Health: Completed
- Progress: 100%

## Example task
- Task ID: FE-102
- Task: Homepage API Integration
- Project: QFZ SharePoint Portal
- Workstream: Frontend
- Description: Integrate homepage React components with Profile and News APIs.
- Assignee: Sagar
- Priority: High
- Status: In Progress
- Planned Start: 01 Sep 2026
- Planned End: 05 Sep 2026
- Actual Start: 02 Sep 2026
- Forecast End: 06 Sep 2026
- Progress: 65%
- Dependency: Profile API
- Blocker: Awaiting completed API contract

---

# 25. MVP Scope

Build in this order:

### Foundation
1. Repository / coding standards
2. React shell + design tokens
3. ASP.NET Core solution
4. Azure SQL model/migrations
5. Entra authentication
6. RBAC
7. API/OpenAPI foundation
8. CI checks

### Product MVP
9. Dashboard
10. Projects
11. Project Detail
12. Tasks
13. Task Drawer
14. My Work
15. Planned vs Actual
16. Timeline
17. Team
18. Milestones
19. Risks & Blockers
20. Dependencies
21. Management View
22. Weekly Status
23. Blob Storage attachments
24. Reports
25. Audit Trail

Do not delay MVP for AI.

---

# 26. Phase 2

- Teams notifications
- Email notifications
- Azure DevOps integration
- Jira integration
- Auto task synchronization
- AI weekly summary
- Delivery-risk suggestions
- Custom dashboards
- Advanced resource forecasting
- Power BI integration
- Approval workflows
- Direct large-file upload via authorized short-lived SAS

---

# 27. Phase 3

- Cross-project dependency intelligence
- Predictive delivery forecasting
- Capacity planning
- Portfolio scenario simulation
- Historical delivery analytics
- Natural-language portfolio assistant

Possible questions:
- Which projects are most likely to miss their dates?
- What needs management attention this week?
- Which dependencies are delaying frontend work?
- Summarize delivery changes since last Monday.

---

# 28. Testing Strategy

## Frontend
- Unit tests
- Component tests
- Hook/service tests
- Accessibility checks for key components

## Backend
- Unit tests
- API integration tests
- Database integration tests
- Authorization tests
- Storage service tests

## E2E critical flows
1. Sign in
2. Create project
3. Create baseline
4. Add team member
5. Create task
6. Assign task
7. Start/update/complete task
8. Add milestone
9. Add risk/blocker
10. Add dependency
11. Upload attachment
12. Generate weekly status
13. Open management view
14. Export report
15. Verify permission restrictions

---

# 29. Definition of Done / Acceptance Criteria

A feature is not complete just because the screen renders.

It should include:
- Authorization
- Validation
- Loading state
- Empty state
- Error state
- Responsive behaviour
- Accessibility basics
- Audit where required
- Tests for critical logic
- API documentation
- No hard-coded production secrets
- Realistic data behaviour

### Product-level acceptance
- Management can understand portfolio health quickly.
- Planned vs Actual is visible at project/task levels.
- Baselines remain historically preserved.
- Team members can update their work without broad admin rights.
- Solution users can own technical dependencies/blockers.
- Attachments are securely stored in Blob Storage.
- Reports are server-generated and management-ready.
- Security rules are enforced by the backend.

---

# 30. Solution Team Review Checklist

Take these decisions to the Solution/Architecture team:

### Identity
- Entra tenant/app registration model
- App roles vs database permissions
- Guest/external user policy

### Azure
- Subscription/resource group
- Region
- DEV/QA/UAT/PROD separation
- App Service plan
- Azure SQL tier
- Blob redundancy/storage tier
- Key Vault policy
- Managed identities
- Private endpoints/VNet requirements

### Security
- File upload policy
- Malware scanning
- Retention policy
- Audit retention
- Data classification
- Logging policy
- Backup/restore
- Disaster recovery

### Integration
- Azure DevOps/Jira source of truth
- Teams/email notification policy
- Power BI requirements

### Licensing
- AG Grid Community vs Enterprise
- Gantt library licensing
- PDF/reporting library licensing

---

# 31. Development Plan for a Frontend Developer Moving Full-Stack

Recommended learning/build order:

1. React/TypeScript shell and design system.
2. C# basics required for Web API.
3. ASP.NET Core endpoints, DI and middleware.
4. EF Core entities/migrations/LINQ.
5. Azure SQL.
6. DTOs + validation + ProblemDetails.
7. Entra authentication/authorization.
8. Blob Storage with Azure.Storage.Blobs.
9. Managed identity.
10. Azure deployment.
11. CI/CD.
12. Monitoring/logging.
13. Reporting.
14. Advanced performance/security.

You do not need to become an expert in every backend topic before starting. Build vertically: one real feature from UI → API → SQL → auth → audit, then repeat.

---

# 32. Suggested First Vertical Slice

Build one complete “Project + Task” flow before building 20 pages.

### Slice 1
- Login
- Projects list
- Create project
- Project detail
- Create task
- Task list
- Update status/progress
- Planned/Actual dates
- SQL persistence
- Permission checks
- Audit event

### Slice 2
- Attachments with Blob Storage

### Slice 3
- Milestones + dependencies

### Slice 4
- Management dashboard + weekly status

This proves the full architecture early.

---

# 33. Master AI Design & Development Prompt

Copy the prompt below into a capable AI design/coding tool. Keep this project pack as the source of truth.

> Build a production-grade enterprise web application called **DeliveryHub — Team Project & Delivery Intelligence**. This is not a generic task tracker. It connects detailed team execution with management-level project delivery intelligence. The primary users are Head/Senior Management, Team Lead, Project Lead, Team Member, Solution/Technical Lead and Admin. Use the principle **Overview → Exception → Detail**. Senior management must understand the portfolio in approximately 10–20 seconds without opening task-level screens.
>
> Use a modern premium enterprise SaaS visual language with strong information hierarchy, neutral surfaces, restrained semantic colour, accessible typography, subtle borders, compact cards, excellent tables, smooth but minimal interactions, responsive behaviour, light/dark themes and WCAG 2.2 AA considerations. Avoid generic admin templates, excessive gradients, giant KPI cards, too many charts and visual clutter.
>
> **Recommended frontend:** React 19.2, Vite 8.x, TypeScript strict mode, MUI 9, TanStack Query v5, React Hook Form, Zod, AG Grid 36.x, ECharts/Recharts, FullCalendar and a replaceable Gantt/timeline adapter. **Recommended backend:** ASP.NET Core 10 Web API, C#, EF Core, REST/OpenAPI and Azure SQL. **Identity:** Microsoft Entra ID + MSAL. **Files:** Azure Blob Storage. **Secrets/security:** Managed Identity + Key Vault. **Hosting:** Azure App Service. **Monitoring:** Application Insights. **CI/CD:** Azure DevOps. Do not expose Azure keys or database passwords to frontend code.
>
> Implement role-based and permission-based experiences. Management gets a simplified executive view. Team Leads can manage projects/tasks/milestones/risks/dependencies/baselines/workload/reports. Project Leads are scoped to assigned projects. Team Members primarily update their assigned work. Solution Leads focus on technical dependencies, architecture/integration blockers and technical risks. Admin manages users, roles, reference data and settings. Enforce authorization on the API, not only by hiding frontend controls.
>
> Build pages individually with real reusable components, realistic sample data, loading/empty/error states, responsive behaviour and permission behaviour. Pages: Login/SSO; Executive Dashboard; Projects; Create/Edit Project; Project Detail; Tasks; Task Detail Drawer; My Work; Planned-vs-Actual Timeline/Gantt; Team Overview; Team Member Detail; Milestones; Risks & Blockers; Dependencies; Calendar; Weekly Delivery Status; Management View; Reports Center; Activity/Audit; Notifications; Global Search; Settings.
>
> The **Executive Dashboard** must show Active Projects, Actual Progress, Planned Progress, Progress Variance, On Track, Attention Needed, At Risk, Delayed, Overdue Tasks, Blocked Tasks, Upcoming Milestones and Management Attention. Include Portfolio Health, Planned vs Actual, Project Status table, Management Attention Required and Key Deliveries This Week. Default project ordering should prioritize At Risk/Delayed/Attention items.
>
> Make **Management Attention Required** a signature feature. Each item contains Project, Issue, Impact, Owner, Required From, Required Action, Required By, Risk Level, Status and Decision Required. It should surface only items requiring management awareness, decision, approval, intervention or escalation.
>
> Make **Planned vs Actual / Baseline vs Forecast** another signature feature. Preserve Baseline, Current Plan, Actual and Forecast as separate concepts. Never overwrite historical baseline versions. Project and task records support planned start/end, actual start/end, forecast end, planned/actual progress, schedule variance, progress variance and days ahead/behind. Authorized baseline changes require reason, user, timestamp and optional approval.
>
> Project Health values: On Track, Attention Needed, At Risk, Delayed, On Hold, Completed. Health must be explainable using schedule variance, progress variance, blockers, missed milestones, dependency delays and workload pressure. Show a human-readable reason, e.g. “At Risk — Profile API is four working days behind and may affect UAT.” Authorized overrides require reason and audit.
>
> Project Detail tabs: Overview, Tasks, Timeline, Milestones, Risks, Dependencies, Team, Updates, Files, Activity, Settings. Project workstreams may include UX/UI, Frontend, Backend, API, CMS, QA, UAT, Infrastructure and Deployment. Each workstream shows owner, health, progress, planned dates, forecast and blocked count.
>
> Task management must support server-side sorting/filtering/pagination, saved views, inline editing, bulk updates and configurable columns. Task fields include Task ID, name, project, workstream, assignee, reviewer, priority, status, health, progress, planned dates, actual dates, forecast, planned/actual hours, variance, dependencies, blocker, milestone and last update. Statuses include Backlog, Not Started, Ready, In Progress, In Review, Blocked, On Hold, Completed and Cancelled. Priorities: Critical, High, Medium, Low.
>
> Provide a right-side Task Detail Drawer so users do not lose table context. Include description, dates, progress, assignment, milestone, dependencies, blockers, risks, files, comments, activity and subtasks. When moving a task to In Progress or Completed, prompt to set missing Actual Start/Actual End rather than silently changing history.
>
> Team workload is a planning feature, not employee surveillance. Use allocation %, estimated effort, date overlap and project assignments rather than only task count. Statuses: Available, Balanced, High, Overloaded.
>
> Risks and Blockers must have dedicated registers. Dependencies support Task→Task, Project→Project, Team→Team, Project→External Team and Milestone→Milestone relationships. Show expected/actual delivery, owner, required-by date, status and impact. Provide an optional dependency flow visualization.
>
> Weekly Delivery Status must include Executive Summary, Completed This Week, In Progress, Planned Next Week, Key Milestones, Delays, Risks, Blockers, Dependencies, Resource Concerns, Management Attention and Decisions Required. AI may draft the executive summary, but it must be reviewed before sharing.
>
> Management View must intentionally hide task-administration noise. Show portfolio health, planned vs actual, on-track/attention/at-risk/delayed projects, key deliveries, milestones, risks, blockers, dependencies, resource concerns, management attention, decisions and weekly trend.
>
> Use Azure SQL for structured relational data. Use Blob Storage for project documents, task attachments, screenshots, generated reports and exports. Store blob metadata/relationships in SQL. Keep Blob containers private. Prefer passwordless Azure access with managed identity/Entra credentials. Implement file validation, size limits and an enterprise malware-scanning strategy if required.
>
> Core entities: User, Role, Permission, Team, Department, Client, Project, ProjectMember, Workstream, Task, Subtask, Milestone, Risk, Blocker, Dependency, ProjectUpdate, WeeklyReport, ManagementAttention, Comment, Attachment, ActivityLog, Notification, SavedView, Holiday, ProjectBaseline and AuditLog.
>
> Use REST APIs grouped by domain: /api/dashboard, /api/management, /api/projects, /api/tasks, /api/milestones, /api/risks, /api/blockers, /api/dependencies, /api/team, /api/reports, /api/activity, /api/notifications and attachment endpoints. APIs must support validation, authorization, filtering, sorting, pagination, search, consistent ProblemDetails errors, correlation IDs, audit events, async I/O, OpenAPI and optimistic concurrency where needed.
>
> Frontend architecture should be domain-oriented under features/dashboard, projects, tasks, timeline, team, milestones, risks, blockers, dependencies, weekly-status, management and reports. Use TanStack Query for server state, React Hook Form + Zod for forms, and introduce global client state only where needed. Do not place all API calls in one service and do not use `any` in TypeScript without a justified boundary.
>
> Backend should use a pragmatic layered architecture with Api, Application, Domain and Infrastructure projects. Use DTOs and application services; do not expose EF entities directly. Keep Blob Storage behind an interface/service. Keep health/baseline calculations reusable and unit tested.
>
> Build DEV/QA/UAT/PROD configuration. Use Azure DevOps pipelines, managed identities, Key Vault, Application Insights and secure environment settings. Add structured logging, correlation IDs and health checks. Never commit secrets.
>
> Implement audit for baseline/date/forecast/status/health/assignment/task completion/risk/blocker/dependency/management-attention/permission/file-delete changes. Normal users cannot edit audit history.
>
> Generate management-ready reports from server-side data rather than browser-visible rows. PDF reports should have branding, report name, filters, generated date/by, summary, tables/charts, footer and page numbers. Store generated report files in Blob Storage when retention is required.
>
> Use realistic sample projects such as QFZ SharePoint Portal, Qatar Music Academy Revamp, HR Module Integration and Milaha Portal; do not use Lorem Ipsum. Example task FE-102: Homepage API Integration, QFZ SharePoint Portal, Frontend, High priority, In Progress, planned 01–05 Sep 2026, actual start 02 Sep, forecast 06 Sep, progress 65%, dependency Profile API.
>
> Build this project page-by-page and feature-by-feature, not as one giant static mockup. First establish design tokens, application shell, navigation, roles, data model, typed API architecture, backend solution and authentication. Then implement one end-to-end vertical slice Project → Task → SQL → authorization → audit. Next add Blob attachments. Then add milestones/dependencies. Then build dashboard, management view and reporting. Every page must include loading, empty, error, responsive and permission states. The final result must be credible for direct review by senior management and a Solution Architecture team.

---

# 34. References / Current Technology Verification

Official references used when preparing this pack:

- React Versions: https://react.dev/versions
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8
- Vite 8.1 announcement: https://vite.dev/blog/announcing-vite8-1
- Material UI versions: https://mui.com/material-ui/getting-started/versions/
- AG Grid React installation/current docs: https://www.ag-grid.com/react-data-grid/installation/
- .NET 10 download/LTS: https://dotnet.microsoft.com/en-us/download/dotnet/10.0
- Azure Blob Storage .NET quickstart: https://learn.microsoft.com/azure/storage/blobs/storage-quickstart-blobs-dotnet
- Azure Blob Storage + .NET: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-dotnet-get-started
- App Service + Azure SQL: https://learn.microsoft.com/en-us/azure/app-service/tutorial-dotnetcore-sqldb-app
- Managed Identity + Azure SQL: https://learn.microsoft.com/en-us/azure/app-service/tutorial-connect-msi-sql-database

---

# 35. Recommended Decision Summary

If starting today, use:

**Frontend:** React + Vite + TypeScript + MUI + TanStack Query + React Hook Form/Zod + AG Grid.  
**Backend:** ASP.NET Core 10 Web API + EF Core.  
**Database:** Azure SQL.  
**Files:** Azure Blob Storage.  
**Authentication:** Microsoft Entra ID.  
**Security:** Managed Identity + Key Vault.  
**Hosting:** Azure App Service.  
**CI/CD:** Azure DevOps.  
**Monitoring:** Application Insights.  
**Architecture:** REST-first, monorepo, role/permission-based, server-side reporting, auditable baseline/forecast model.

This combination is intentionally practical: it is strong enough for an enterprise production system while remaining realistic for a frontend developer to expand into full-stack ownership feature by feature.
