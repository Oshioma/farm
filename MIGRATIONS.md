# Database migrations

Every schema change lives in `supabase/migrations/` as `<timestamp>_<name>.sql`
and is applied automatically by `.github/workflows/migrations.yml` the moment it
merges to `main`. Nothing needs to be pasted into the Supabase SQL editor.

## Adding a migration

```bash
npx supabase migration new add_something_to_table   # creates the timestamped file
# write the SQL, keeping it idempotent:
#   ALTER TABLE t ADD COLUMN IF NOT EXISTS c ...;
#   CREATE INDEX IF NOT EXISTS ...;
#   DROP POLICY IF EXISTS ...; CREATE POLICY ...;
```

Commit it, open a PR, merge. The workflow runs `supabase db push` against the
hosted project. There is no rollback — undo a bad migration with a new one.

## Checking the remote without changing it

Actions tab → **Database migrations** → *Run workflow* → mode **check**. It links
the project and prints `supabase migration list`, so you can see which local
migrations the remote has recorded as applied and which a push would run.
Nothing is written. Choose mode **apply** to push from there instead.

## One-time setup

**1. Repository credentials** — GitHub → Settings → Secrets and variables → Actions:

| Name | Value |
| --- | --- |
| `SUPABASE_PROJECT_ID` | the project ref from your Supabase dashboard URL (secret or variable, either works) |
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens (secret) |
| `SUPABASE_DB_PASSWORD` | the project's database password (secret) |

If any are missing the run finishes with a warning naming them and applies
nothing, so an unconfigured repo never fails a build — but it also never
pretends to have migrated.

**2. Mark the already-applied migrations as applied.** Every migration below the
harvest ETA one was run by hand in the SQL editor before this setup existed, so
the remote database needs to be told about them once — otherwise the first push
replays them. From a checkout on your machine:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase migration repair --status applied \
  20260417211645 \
  20260417211646 \
  20260417211647 \
  20260417211648 \
  20260417211649 \
  20260417211650 \
  20260417215921 \
  20260418141641 \
  20260419161845 \
  20260609113528 \
  20260609124855 \
  20260708064140 \
  20260708080732 \
  20260708090649 \
  20260708100326 \
  20260719145929 \
  20260720164406 \
  20260720165301 \
  20260720215124 \
  20260728143226 \
  20260728145203
npx supabase migration list    # local and remote should now line up
```

`20260821153055_add_crop_id_to_harvest_eta.sql` is deliberately left out of that
list: it has not been applied yet, so leaving it pending lets `supabase db push`
(or the workflow) apply it for you.
