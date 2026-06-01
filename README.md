# IRL

Phase 1 foundation: Next.js 15, Supabase auth, app shell, and routed page skeletons.

## Stack

- Next.js 15 App Router
- TypeScript (strict)
- Tailwind CSS + shadcn-style UI
- Supabase (Auth, Postgres, Storage, Realtime-ready)
- Zustand (session UI state only)
- Vercel-ready

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` (already configured if using the provided project):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

(Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works.)

### 3. Supabase database

Run the migration in the Supabase SQL Editor (or via CLI):

`supabase/migrations/20260531000000_profiles.sql`

### 4. Supabase Auth settings

In **Authentication → Providers → Email**:

- **Enable Email** (required)
- **Disable “Confirm email”** (required — users sign up with username + password only, no inbox)

Anonymous sign-in is **not** used.

In **Authentication → URL configuration**, add your site URL and redirect URLs if using email links:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`

In **Project Settings → API**, use the **publishable** key (`sb_publishable_…`) or legacy **anon** key (`eyJ…`) for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on Vercel. **Redeploy after changing env vars.**

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  (auth)/          login, signup
  (dashboard)/     dashboard, challenges, leaderboard, settings
  (social)/        friends
  (groups)/        groups, groups/[id]
  (events)/        events, events/[id]
  (admin)/         admin placeholder
components/
  ui/              shadcn primitives
  layout/          shell, nav
  shared/          page shell, states
  features/        auth forms
lib/
  supabase/        browser + server clients, auth helpers
  db/              centralized Supabase queries
  auth/            redirect helpers
  actions/         server actions
```

## Database migrations (Supabase SQL Editor, in order)

1. `supabase/migrations/20260531100000_social_graph.sql` — profiles + friends + groups
2. `supabase/migrations/20260531200000_events_game_engine.sql` — events, challenges, XP
3. `supabase/migrations/20260531210000_storage_proofs.sql` — photo uploads
4. `supabase/migrations/20260531220000_game_loop_rpc_hardening.sql` — server-only XP RPCs + RLS hardening
5. `supabase/migrations/20260531230000_game_loop_consistency_fixes.sql` — single activation path + RPC lockdown
6. `supabase/migrations/20260531300000_engagement_layer.sql` — group chat, notifications, realtime
7. `supabase/migrations/20260531310000_engagement_hardening.sql` — chat bucket, notification/trigger clarity
8. `supabase/migrations/20260531320000_stability_hardening.sql` — XP/notification idempotency, revoke submit_challenge
9. `supabase/migrations/20260531400000_username_check_rpc.sql` — public username availability check for signup (required for `/signup`)
10. `supabase/migrations/20260531500000_create_group_rpc.sql` — `create_group` RPC + RLS fix for creating groups (required for **Create Group**)

**Game loop rules:** only `activate_event` generates challenges; sync calls `activate_event` only. Client RPCs: `award_challenge_completion`, `submit_event_attendance`, `review_event_attendance` (+ admin `activate_event` / `end_event`).

## Phase 1 scope

Built: auth, layout, routing, profiles integration.

## Phase 2 scope

Built: friends, friend requests, groups, membership, invite codes, group detail page.

## Phase 3 scope

Built: events lifecycle, challenge auto-generation, instant submissions, attendance approval, XP/points/levels, leaderboard with realtime.

## Phase 4 scope

Built: group chat (realtime), trigger-only notifications, dashboard activity feed (deduped by source_type + source_id).

**Phase 4 rules:** notifications inserted only by DB triggers via internal `create_notification()`; chat images use `chat/{groupId}/{userId}/` bucket (not `proofs`).

Not built yet: achievements, summer wrapped, typing indicators.
