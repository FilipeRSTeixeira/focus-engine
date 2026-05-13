# Focus Engine — Spec & Implementation Roadmap

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Prisma** with SQLite (everything local, zero external dependencies)
- **shadcn/ui** + **Lucide React** (icons) + **Recharts** (charts)
- **Pomodoro** via Web Audio API (no dependencies)

## Data Model

```
Project
  id, name, color, icon, createdAt

Task
  id, projectId (FK)
  title, description
  priority: high | medium | low
  expected_energy: low | medium | high
  estimated_time_minutes
  status: pending | active | completed
  createdAt, completedAt
  points_earned (null until completed)

Reward
  id, title, point_cost
  type: points | time
  reward_duration: 5min | 15min | 30min | 1h
  status: available | active | expired
  expiresAt (date, optional)
  createdAt, activatedAt

FocusSession
  id, taskId (FK, optional)
  duration_minutes
  type: work | break
  completed
  note: string (1-2 sentences)
  focus_lost (boolean)
  createdAt

DailySummary
  id, date (unique per day)
  tasks_completed, points_earned, points_spent
  focus_sessions
  reflection_note: string (optional)
  streak (consecutive days)
```

## Business Rules

1. Only 1 focus session can be in progress at a time
2. A reward can only be activated if you have enough points
3. Maximum 2 active rewards per day
4. Active rewards expire after 7 days if not used
5. Points never go negative
6. Completed tasks cannot be "uncompleted" (to not break streaks)
7. Streak resets if a day passes without completing any task

## Points Calculation

```
points = priority_base + (days_pending × 1)

priority_base: high=10, medium=5, low=3
Example: high-priority, pending 3 days → 10+3 = 13 pts
```

## Visual Design

- Dark theme by default. Priority colors: high=soft red, medium=yellow, low=green. Each project has an associated color. Subtle animations (point counters, checkmarks, timer countdown). Mobile-first responsive.

## File Structure Target

```
prisma/schema.prisma
src/
  app/          layout.tsx, page.tsx, projects/, tasks/, rewards/, focus/, history/, daily-review/
  components/   sidebar.tsx, points-badge.tsx, task-card.tsx, task-list.tsx, pomodoro-timer.tsx, reward-card.tsx, focus-mode.tsx, daily-summary.tsx, streak-badge.tsx
  lib/          prisma.ts, tasks.ts, points.ts, rewards.ts, focus.ts
  styles/globals.css
```

---

## Implementation Roadmap

### Phase 1: Core Foundation

#### Step 1.0 — Project Bootstrap

**Goal:** Initialize the Next.js project with the correct stack and folder structure. Everything runs but displays nothing.

**Acceptance Criteria:**
- `npm run dev` starts successfully, `/` renders a blank page
- Tailwind CSS configured and `globals.css` exists (dark mode base)
- Folder structure matches target (prisma/, src/app/, src/components/, src/lib/)
- TypeScript strict mode enabled
- shadcn/ui initialized with minimal config

**References:** Stack (Sec 1), File Structure (Sec 6)

---

#### Step 1.1 — Database & Schema

**Goal:** Set up Prisma + SQLite with all data models. Zero application logic yet — just the schema and connection layer.

**Acceptance Criteria:**
- `schema.prisma` contains all 5 models: Project, Task, Reward, FocusSession, DailySummary (Sec 2)
- All fields, types, enums, and relations match spec exactly
- `npx prisma migrate dev` runs without errors
- SQLite DB file is created and queryable via `prisma studio`
- `src/lib/prisma.ts` exports a singleton PrismaClient instance

**References:** Data Model (Sec 2), Stack (Sec 1)

---

#### Step 1.2 — Project CRUD

**Goal:** Full create/list/delete cycle for projects. Backend logic in `src/lib/projects.ts`, UI in `/projects/page.tsx`.

**Acceptance Criteria:**
- `/projects` shows empty list initially, then populated projects
- Create form: name (required), color picker, icon selector → persisted to DB
- Projects displayed as cards with color indicator and icon
- Delete removes project from DB (no cascade needed yet — no tasks exist)
- No navigation UI yet — page works standalone

**References:** Data Model (Sec 2), File Structure (Sec 6)

---

#### Step 1.3 — Task CRUD

**Goal:** Create and manage tasks. Full task creation flow + filterable task list at `/tasks/page.tsx`.

**Acceptance Criteria:**
- Create task form: project dropdown, title (required), description (optional), priority selector, expected energy selector, estimated time input
- Tasks persist in DB with all fields populated per schema
- `/tasks` page shows task cards with all metadata visible
- Filters work independently and in combination (status, priority, energy)
- At least 5 test tasks created manually via Prisma Studio for later use

**References:** Data Model (Sec 2), File Structure (Sec 6)

---

#### Step 1.4 — Prioritization Engine

**Goal:** Pure logic function that orders pending tasks per the prioritization rules. No UI yet — pure function, fully testable.

**Acceptance Criteria:**
- `src/lib/tasks.ts` exports `getPriorityTasks(projectId?, limit?)`
- Ordering: priority desc (high > medium > low), then age asc (oldest first within same priority)
- Default returns top 3; configurable limit
- Task status "active" is excluded from results (only pending)
- Unit tests verify ordering with varied data (Sec 7)

**References:** Prioritization Logic (Sec 7)

---

### Phase 2: Gamification

#### Step 2.0 — Points Calculation Engine

**Goal:** Pure functions for point calculation. No DB interaction, no UI — only math. Fully unit-testable.

**Acceptance Criteria:**
- `src/lib/points.ts` exports `calculatePoints(priority, daysPending)` and `getPriorityBase(priority)`
- Output matches formula: `priority_base + (days_pending × 1)` (Sec 4)
- Returns correct values for all combinations: high/medium/low × [0..14] days
- Unit tests cover edge cases: 0 days, negative days (input validation), max realistic values

**References:** Points Calculation (Sec 4)

---

#### Step 2.1 — Complete Task → Earn Points

**Goal:** Wire task completion to the points system. When a task is marked complete, calculate and store points, display animated counter increment.

**Acceptance Criteria:**
- Completing a task calculates points via `src/lib/points.ts`
- `points_earned` field on Task is populated
- User's total points are stored (either in DailySummary or an implicit aggregate)
- Points increase animation: number counts up from previous to new total over ~800ms
- If no tasks exist, dashboard shows motivational message + "Create task" button

**References:** Points Calculation (Sec 4), Data Model (Sec 2)

---

#### Step 2.2 — Streak Calculation

**Goal:** Compute and persist the user's current consecutive-day streak. Pure logic in `src/lib/streak.ts`.

**Acceptance Criteria:**
- Streak = count of consecutive calendar days (ending today or yesterday) with ≥1 completed task
- If today has no completions yet, checks if yesterday had at least one — if not, streak = 0
- Stored and updated in DailySummary per day
- `streak-badge.tsx` component displays current streak number with fire emoji
- Unit tests verify: multi-day streak, broken streak (gap day), single-day streak

**References:** Data Model (Sec 2), Business Rules (Sec 3)

---

#### Step 2.3 — Rewards CRUD + Activation

**Goal:** Create and manage rewards. Implement activation rules from business rules Sec 3 (#1-#5).

**Acceptance Criteria:**
- `/rewards` page with create form: title, point cost OR duration type selector, optional expiration date (default 7 days)
- Two sections displayed: Unlocked (have enough points → "Activate" button), Locked (progress bar showing "X more points needed")
- Activation checks: sufficient points? (Sec 3.2, 3.5), max 2 active per day? (Sec 3.3)
- On activate: points deducted from total, Reward.status = "active", activatedAt recorded
- Points never go negative (Sec 3.5) — activation blocked if insufficient

**References:** Data Model (Sec 2), Business Rules (Sec 3)

---

#### Step 2.4 — Reward Expiration Logic

**Goal:** Implement reward expiration: active rewards expire after 7 days if unused → status becomes "expired", spent points NOT returned.

**Acceptance Criteria:**
- Rewards with `expiresAt < now` and status = "active" transition to "expired"
- Expired rewards show as "Expired" (not "Locked" or "Unlocked") on `/rewards`
- Spent points are permanently gone — no refund mechanism
- Expiration check runs during page load or can be triggered manually via API route

**References:** Business Rules (Sec 3), Data Model (Sec 2)

---

### Phase 3: Focus Mode

#### Step 3.0 — Pomodoro Timer Component

**Goal:** Standalone circular countdown timer with Web Audio API alarm. No task or DB linkage yet.

**Acceptance Criteria:**
- `src/components/pomodoro-timer.tsx` renders a large SVG/canvas circular timer
- Work session = 25min, break session = 5min (configurable via props)
- Timer counts down in real-time with smooth circular progress animation
- Alternates work→break→work automatically when sessions complete
- Web Audio API plays a distinct sound at end of each session
- Start / Pause / Reset controls visible and functional

**References:** Stack (Sec 1)

---

#### Step 3.1 — Link Timer to Task + Session Logging

**Goal:** Wire timer to specific tasks via `/focus?taskId=X`. Log completed sessions to FocusSession model.

**Acceptance Criteria:**
- Opening `/focus?taskId=5` displays the task title prominently and loads task metadata
- Starting a session updates Task.status = "active" (Sec 7: only one active at a time)
- On session complete, a modal asks for a note (1-2 sentences, optional)
- `FocusSession` record created with duration, type (work/break), note, focus_lost flag
- Finishing session sets Task.status back to "pending" or allows transition to completion

**References:** Data Model (Sec 2), Business Rules (Sec 3), File Structure (Sec 6)

---

#### Step 3.2 — "I Lost Focus" Flow

**Goal:** Implement the focus-loss recovery mechanism with rotating tips.

**Acceptance Criteria:**
- "I lost focus" button visible during active timer sessions
- Clicking toggles `focus_lost = true` on current session and shows a tip popup
- Tips rotate from pool: "Focus on one thing. Close the other tabs.", "You only need 2 minutes to start.", "What's most urgent among what you have to do?", "Completing this task is already progress."
- Tip overlay dims surrounding context, dismissible by clicking outside

**References:** Focus Mode Flow (Sec 5)

---

#### Step 3.3 — Full Focus Mode (Distraction-Free)

**Goal:** Full-screen overlay hiding all navigation and chrome. Only timer + task title visible. ESC to exit.

**Acceptance Criteria:**
- `src/components/focus-mode.tsx` wraps the timer in a full-screen container
- "Enter focus mode" button triggers browser fullscreen API
- No sidebar, no header, no links visible — only the large timer and current task title at top
- ESC key or Escape button exits full-screen mode and returns to normal view
- If another session is already active, starting a new one shows a blocking message

**References:** Business Rules (Sec 3), Focus Mode Flow (Sec 5)

---

#### Step 3.4 — Concurrency Enforcement

**Goal:** Prevent multiple simultaneous focus sessions. Update task statuses correctly through the session lifecycle.

**Acceptance Criteria:**
- If a focus session is in progress (not completed, not expired), new session start is blocked with message: "You already have an active session"
- Task.status = "active" only while a FocusSession exists and is not complete
- Completing a session resets task status appropriately
- The `/focus` page checks for existing active sessions on mount

**References:** Business Rules (Sec 3, Sec 7), Data Model (Sec 2)

---

### Phase 4: Reflection & History

#### Step 4.0 — Daily Summary Generation

**Goal:** Aggregate per-day statistics and persist them. No UI yet — pure logic + DB write.

**Acceptance Criteria:**
- `src/lib/daily.ts` exports `generateDailySummary(date)` that queries and aggregates: tasks_completed count, points_earned sum, points_spent sum, focus_sessions count
- Results stored in DailySummary with unique date key (Sec 2)
- Can be called manually or triggered via API route `/api/summary/[date]`
- Handles missing data gracefully (zero instead of null for numeric fields)

**References:** Data Model (Sec 2)

---

#### Step 4.1 — Dashboard Wiring

**Goal:** Assemble the main dashboard (`/page.tsx`) with all sections: header, yesterday, now, unlocked rewards, history link. Shows real data from DB.

**Acceptance Criteria:**
- Top bar: "Focus Engine" title + total points badge (from Step 2.1) + streak badge (from Step 2.2)
- Yesterday section: "You completed X tasks yesterday" → list of task titles completed yesterday
- Now section: up to 3 priority tasks from `getPriorityTasks()` — each with a "Focus" button linking to `/focus?taskId=X`
- If no pending tasks exist → motivational message + "Create task" button (Sec 5, final rule)
- Unlocked rewards section (max 3 visible) with quick links to `/rewards`
- Link to full history at bottom

**References:** Main Flows (Sec 5), Data Model (Sec 2)

---

#### Step 4.2 — Sidebar & Points Badge

**Goal:** Shared navigation sidebar and reusable points badge component. Integrated into root `layout.tsx`.

**Acceptance Criteria:**
- `src/components/sidebar.tsx` with links: Dashboard, Projects, Tasks, Rewards, Focus, History, Daily Review
- Active page highlighted in sidebar
- `src/components/points-badge.tsx` shows current total points — updates reactively when points change
- Root layout wraps all pages in a flex container: sidebar (left) + main content (right)
- Sidebar collapses to icon-only on mobile

**References:** File Structure (Sec 6), Stack (Sec 1)

---

#### Step 4.3 — Daily Review

**Goal:** `/daily-review` page with reflection form. Shows only when ≥1 task completed today. Saves to DailySummary.

**Acceptance Criteria:**
- Form fields: "What went well today?" (textarea), distraction checkboxes (phone, curiosity, other people, environment, fatigue, other), energy level slider (low→high)
- Submits to API route → updates or creates DailySummary.record with reflection data (Sec 2)
- Page hidden if no tasks completed today; shows message: "Complete a task first to unlock your daily review"
- Previous reviews displayed below the form when viewing on subsequent days

**References:** Main Flows (Sec 5), Data Model (Sec 2)

---

#### Step 4.4 — History Charts

**Goal:** `/history` page with all charts: weekly bar chart, streak display, personal best, points pie chart, productivity calendar.

**Acceptance Criteria:**
- Weekly chart: Recharts BarChart of tasks completed per day (last 4 weeks)
- Streak card: current streak number + fire emoji + "consecutive days" label
- Personal best: "Most tasks in a day: X" from historical DailySummary data
- Points pie chart: earned vs spent ratio (Recharts PieChart)
- Most completed projects ranking list
- Productivity calendar: GitHub contributions-style grid showing which days had completions
- All charts use mock data when DB is empty, real data when available

**References:** History Flow (Sec 5), Data Model (Sec 2)

---

### Phase 5: Polish & Visual Design

#### Step 5.0 — Theme & Colors

**Goal:** Apply the complete visual design system consistently across all pages and components.

**Acceptance Criteria:**
- Dark theme default with proper contrast on all text/elements
- Priority colors applied to task cards: high=soft red (#ef4444 style), medium=yellow (#eab308 style), low=green (#22c55e style)
- Project-specific colors appear as colored borders/indicators on task and project cards
- All pages use consistent spacing, typography scale, and border radius
- Color tokens defined in Tailwind config or CSS variables

**References:** Visual Design (Sec 6)

---

#### Step 5.1 — Animations

**Goal:** Add subtle animations throughout the app for feedback and delight.

**Acceptance Criteria:**
- Points counter animates with counting-up effect on completion/activation (~800ms)
- Task completion shows a checkmark animation (scale or fade-in)
- Timer circular progress smooths at 60fps (not ticking in 1-second increments visually)
- Reward activation triggers a brief pulse/highlight on the reward card
- No animation > 1 second duration

**References:** Visual Design (Sec 6)

---

#### Step 5.2 — Mobile Responsiveness

**Goal:** Ensure all pages work well on mobile viewports (320px–768px).

**Acceptance Criteria:**
- All pages render correctly at 375px width
- Sidebar collapses to hamburger menu or bottom nav on mobile
- Task cards stack vertically on small screens
- Timer remains large enough to read comfortably on phone
- Touch targets (buttons) ≥ 44×44px per WCAG guidelines

**References:** Visual Design (Sec 6)

---

## Execution Notes

- **Each step is a complete unit**: inputs → logic → outputs + DB state. You can stop at any point and have a working subset.
- **Pure functions first, UI last**: `points.ts`, `tasks.ts`, `rewards.ts`, `focus.ts` are all testable without browser interaction. Implement these before their corresponding pages.
- **Test data strategy**: After Step 1.3, seed the DB with sample projects/tasks via Prisma Studio so every subsequent step has data to work with.
