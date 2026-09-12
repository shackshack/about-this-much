# About This Much — v1 (Water, Sugar, Fiber, Protein, Movement, Home Cooked vs Eaten Out)

This is a real, working Next.js + Supabase app. It's not a mockup — once deployed, people can
sign in with their email and actually log their day.

## How the code is organized (so you know where to make future changes)

- `data/trackers.json` — every item, category, and gram value for every tracker. **To add or
  edit items later, edit this file only.** No other code needs to change — the app reads from
  this file to build every screen.
- `supabase/schema.sql` — the database structure. Run this once, in Supabase.
- `app/` — the actual screens (sign-in, onboarding, dashboard).
- `components/LogModal.js` — the shared logging popup used by every tracker.

## Deployment steps (no coding required, just following along)

### 1. Get the code onto GitHub
1. Go to github.com, open (or create) an empty repository.
2. Click "Add file" → "Upload files."
3. Drag in every file and folder from this project, keeping the folder structure intact.
4. Commit the upload.

### 2. Set up Supabase (you already have an account)
1. Open your Supabase project → left sidebar → **SQL Editor** → "New query."
2. Open `supabase/schema.sql` from this project, copy its full contents, paste into the editor, click **Run**.
   This creates all the tables the app needs.
3. Left sidebar → **Authentication** → **Providers** → confirm **Email** is enabled (it is by default).
4. Left sidebar → **Authentication** → **URL Configuration** — you'll come back here after step 3
   below to add your live Vercel URL, so magic-link sign-in emails point to the right place.
5. Left sidebar → **Project Settings** → **API** — you'll need the **Project URL** and the
   **anon public key** from this page for the next step. Keep this tab open.

### 3. Deploy on Vercel (you already have an account)
1. Go to vercel.com → "Add New" → "Project" → import the GitHub repo from step 1.
2. Before deploying, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` → paste the Project URL from Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → paste the anon public key from Supabase
3. Click **Deploy**. Vercel will give you a live URL (something like `about-this-much.vercel.app`).
4. Go back to Supabase → **Authentication** → **URL Configuration** → set **Site URL** to that
   Vercel URL, and add it under **Redirect URLs** too. This step matters — without it, sign-in
   emails won't work correctly.

### 4. Test it
Open your live Vercel URL, enter your own email, check your inbox for the sign-in link, click it,
complete onboarding, and try logging something in each tracker.

## Keeping Supabase from pausing
The free tier pauses a project after 7 days with no activity. As long as you or testers are
opening the app at least that often during this testing phase, it'll stay active. If it pauses,
you can resume it from the Supabase dashboard with one click.

## Updating the app after this point

Whenever the code changes (like this batch of design fixes), the workflow is:

1. Download the updated project files.
2. Go to your GitHub repo → **Add file** → **Upload files** (same screen as your original upload).
3. Drag in the changed files, keeping the same folder structure/paths as before. GitHub will
   recognize files at the same path as updates, not duplicates.
4. Commit the upload.
5. That's it — Vercel is watching this repo and will automatically rebuild and redeploy within
   a minute or two. No action needed on Vercel's side.

**If a schema migration file is included** (like `supabase/migration_002_protein_strength.sql`
in this batch), run that in Supabase's SQL Editor as a new snippet too — the app's code and the
database structure need to match, and only running the code update isn't enough on its own.

## What changed in this batch
- Protein and Movement now use the same ring treatment as Water/Sugar/Fiber, for visual consistency.
- Movement's ring fill is based on intensity tier (light = 1/3, moderate = full, vigorous = full + 2x credit badge), not raw minutes.
- Added a separate Strength tracker (2x/week target, dumbbell icons) — distinct from cardio Movement.
- Dashboard reordered: Row 1 = Fiber, Protein, Water (building up). Row 2 = Sugar, Movement, Strength (behavior/limits).
- Ring numbers now shift color and size as they approach target — green for "goal" metrics (water/fiber/protein/movement), red for the one "limit" metric (sugar), which stays neutral until nearing/passing 100%.
- Added `protein_target_g` to profiles (default 46g women / 56g men, set at onboarding).
- Run `supabase/migration_002_protein_strength.sql` once if updating an already-live database.

## Batch 2 — bug fixes and missing functionality
- Fixed: Movement and Home Cooked vs Eaten Out were inserting a new row on every tap instead of
  replacing today's answer — this caused the movement ring to appear frozen and the weekly
  home-cooked percentage to drift. Both now update today's single entry in place, and tapping
  the same value again clears it (acts as undo).
- Added: a "Today's entries" list at the bottom of the dashboard, expandable, with a Remove
  button on every single logged item — covers accidental taps and testing.
- Fixed: the ring number's font-size was growing as it approached target, which pushed the
  surrounding card taller and shifted layout. Removed the size growth, kept only the color
  shift, and gave each ring row a fixed minimum height so nothing moves around anymore.
- Fixed: strength icon wasn't rendering (relied on an external icon font) — switched to an
  emoji, consistent with how every other tracker icon works, no font-loading dependency.
- Added: tapping outside any bottom-sheet popup now closes it, not just the Close button.
- Added: a settings (gear) icon on the dashboard — lets a signed-in user change their
  guideline group, meal times, reset all logged data, or sign out. For guests, it shows a note
  that settings save to this device only until they save their progress.
- No new schema migration needed for this batch, only application code changed.

## Batch 3 — rolling 7-day timeline
- Added a 7-dot timeline under the header: today anchored at the right edge, six prior days
  trailing left. Filled dot = something was logged that day, hollow = nothing was.
- Tapping a past dot opens a read-only snapshot of that day (all six trackers) — consistent
  with the existing 24-hour lock rule, this is a look-back, not an edit screen.
- Replaced calendar-week math (Sunday-to-Saturday) with a genuine rolling 7-day window
  everywhere — movement days, strength count, and home-cooked % all now reflect "the last 7
  days" ending today, not a fixed calendar week. This was a deliberate choice to avoid the
  "I'll catch up on Sunday" mental loophole a fixed week can create.
- New files: `components/Timeline.js`, `components/DaySnapshot.js`.
- No schema migration needed — this batch only changes how existing data is queried and displayed.

## What's intentionally not built yet (by design, from our planning)
- Gamification / avatar / rewards layer — deferred, but every log is already timestamped and
  raw in the `logs` table, so streaks and lifetime stats can be built later without losing history.
- Payments — launching free first per the plan; add Stripe once the core loop is validated.
- Home screen widgets, lock screen quick actions, Siri shortcuts — these require native iOS/Android
  development and can't live in this web app; a future step if this proves out.
- Skin-on/peeled toggle UI for fiber items — data already supports it (see `skinToggle` and
  `peeledG` in trackers.json), just needs the toggle control added to the item screen.
