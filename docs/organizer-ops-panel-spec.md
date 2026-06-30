# Organizer Ops Panel Spec

## Goal

Build a dedicated organizer operations panel for tournaments that are already published, open for registration, locked, upcoming, or in progress.

Primary route:

- `/organizer/tournaments/[id]/ops`

Purpose:

- give organizers one place to operate the tournament after configuration is mostly done
- reduce context switching between `manage`, public tournament pages, and live match pages
- make pair/team incidents, approvals, live match control, and technical decisions explicit

## Final Placement Decision

### Frontend Route Placement

The panel should live here:

- `src/app/organizer/tournaments/[id]/ops/page.tsx`

Reason:

- it belongs to the authenticated organizer namespace already enforced by `src/app/organizer/layout.tsx`
- it is a sibling of `manage`, which keeps configuration and operations separated
- it matches the existing route structure in frontend architecture docs:
  - `organizer/tournaments` for organizer-owned tournament work
  - `live/[matchId]` for public live score display and local control

Do not place it in:

- `src/app/(public)/live`
  - wrong ownership boundary, because incidents and participant decisions are organizer-only
- `src/app/organizer/scores`
  - too narrow, because the ops panel is broader than score entry
- `src/app/organizer/tournaments/[id]/manage`
  - the current manage screen is already configuration-heavy and operational concerns would make it harder to maintain

### Frontend Feature Placement

The route should stay thin and delegate logic to an organizer feature workspace:

```text
src/app/organizer/tournaments/[id]/ops/page.tsx
src/app/organizer/tournaments/[id]/ops/components/
src/features/organizer/ops/
```

Recommended feature structure:

```text
src/features/organizer/ops/
├── api/
├── hooks/
├── components/
├── types/
└── utils/
```

Reason:

- this matches the FSD guidance in frontend architecture docs
- `ops` is organizer-specific business logic, not generic tournament detail UI
- the panel will need custom hooks, action modals, and orchestration state that should not stay inside `app/`

### Backend Placement

The first version should remain inside existing modules, not a brand-new standalone module.

Placement principle:

- participant and division operational actions stay in `tournaments`
- match execution actions stay in `matches`
- pair ranking consequences stay in `rankings`
- notifications remain in `notifications`

This means:

- tournament-level ops endpoints should be added under `tournaments.controller.ts`
- match-level ops endpoints should be added under `matches.controller.ts`
- ranking side effects continue to be called from services after decisions are applied

Do not create a separate `ops` backend module in MVP.

Reason:

- current backend architecture is a modular monolith organized by domain
- an `ops` module would become an orchestration shell, but the business ownership still belongs to tournaments and matches
- splitting too early would increase cross-module coupling before the status and incident model is stable

## Current Baseline

Current organizer surface already exists at:

- `src/app/organizer/tournaments/[id]/manage/page.tsx`

Current tabs already cover:

- basic info
- schedule
- registration
- bracket
- finance
- permissions

Current live match control exists separately at:

- `src/app/(public)/live/[matchId]/page.tsx`

This means the project already has a configuration panel and a live-score control page, but does not yet have a centralized tournament operations panel.

## Panel Boundaries

`manage` should remain configuration-first:

- tournament content
- division setup
- fee setup
- publish flow
- structural bracket config

`ops` should become execution-first:

- participant and pair decisions
- court and match queue decisions
- incidents and discipline decisions
- live progress monitoring
- quick finance decisions related to incidents

## Target Workspace Structure

### 1. Overview

Purpose:

- show the operating picture in one screen

Widgets:

- tournament status
- selected division status
- total approved pairs
- pending approvals
- matches waiting to start
- matches ongoing
- incidents requiring action
- unpaid participants
- quick links to live matches and participant details

### 2. Participants

Purpose:

- manage all teams/pairs/players in the selected division

Core table columns:

- team name
- division
- pair type
- team status
- payment status
- members
- source (`normal`, `wildcard`, `mock`)
- check-in status
- actions

Filters:

- division
- status
- payment
- mock vs real
- singles vs doubles vs mixed doubles

Per-row actions:

- approve registration
- reject registration
- withdraw
- kick
- mark no-show
- assign wildcard
- replace player in pair
- view audit timeline

### 3. Matches

Purpose:

- operate the day of play

Core views:

- match queue by court
- match queue by round
- match queue by status

Per-match actions:

- assign court
- assign referee
- start match
- open live control
- walkover team 1
- walkover team 2
- mark injury retirement
- disqualify team
- void match

### 4. Incidents

Purpose:

- give organizers a structured place to record and resolve disputes and abnormal events

Incident types:

- injury before match
- injury during match
- no-show
- walkover
- disqualification
- cheating or rules violation
- abusive behavior
- roster violation
- replacement request
- payment dispute

Required fields:

- incident type
- related participant or match
- reason
- evidence URL or note
- decision
- decided by
- decided at

### 5. Finance

Purpose:

- handle money-related decisions caused by operational events

Examples:

- refund due to withdrawal
- no refund due to disqualification
- payment pending after pair completion
- kick with refund review
- payout hold because unresolved complaint

## Core Business Objects

### Participant/Pair Status

Recommended canonical statuses:

- `PENDING`
- `COMPLETE`
- `REJECTED`
- `WITHDRAWN`
- `KICKED`
- `NO_SHOW`
- `DISQUALIFIED`
- `REPLACED`

Notes:

- `COMPLETE` is the current approved state in code and can stay as the technical value
- `REJECTED` should be separated from `WITHDRAWN`
- `WITHDRAWN` must mean voluntary withdrawal
- `KICKED` must mean organizer/admin forced removal
- `DISQUALIFIED` should represent a rules decision tied to a match or tournament

### Match Status

Recommended canonical statuses:

- `SCHEDULED`
- `ONGOING`
- `COMPLETED`
- `WALKOVER`
- `VOID`

Notes:

- `WALKOVER` and `VOID` may be represented initially through incident metadata if schema changes are deferred

## Doubles and Mixed Doubles Rules

The panel must explicitly support pair-level operations.

Important cases:

### Case A: Replace one player before registration lock

Questions to support:

- is replacement allowed only before registration closes
- does replacement preserve the pair slot
- does replacement re-run gender validation
- does replacement re-run ELO cap validation

Recommended initial rule:

- allowed only before registration is locked
- replacement must revalidate division eligibility
- if mixed doubles, replacement must preserve one male and one female

### Case B: Replace one player after bracket generation but before first match

Recommended initial rule:

- do not allow in MVP unless explicitly approved by organizer with bracket impact review
- if allowed later, system must flag bracket reseeding risk

### Case C: Injury during doubles match

Recommended initial rule:

- team retires as a pair
- opponent wins the match
- result is recorded as `injury retirement`

### Case D: Cheating or roster fraud

Recommended initial rule:

- organizer records incident
- team can be marked `DISQUALIFIED`
- bracket and payout consequences are shown before confirmation

## MVP Decisions

### Must Have

- participants table with clear pair management
- match queue with start/open-live actions
- organizer actions for `approve`, `reject`, `withdraw`, `kick`
- organizer actions for `walkover`, `injury retirement`, `disqualify`
- incident log with notes
- audit timeline in drawer or modal

### Should Wait

- automatic complex reseeding after replacement
- full referee workflow redesign
- multi-incident rules engine
- bulk ops

## UX Requirements

- panel must be optimized for fast operations, not long forms
- dangerous actions must require reason input
- every dangerous action must show impact preview:
  - participant status change
  - match/bracket consequence
  - refund consequence
  - notification consequence
- pair member names must always be visible without opening another page
- mixed doubles must show gender composition clearly

## Recommended UI Pattern

- main page with left navigation by workspace
- sticky top summary bar
- table + right-side drawer for details
- incident actions opened in modal with reason textarea
- match live control linked from queue, not buried inside bracket view

## Routes

- `/organizer/tournaments/[id]/ops`
- optional sub-routes later:
  - `/organizer/tournaments/[id]/ops/participants`
  - `/organizer/tournaments/[id]/ops/matches`
  - `/organizer/tournaments/[id]/ops/incidents`

## Success Criteria

- organizer can manage the whole tournament day from one route
- organizer can see all pairs and all matches without switching to public pages
- organizer can apply technical decisions with auditability
- pair-specific operations are first-class, especially for doubles and mixed doubles
