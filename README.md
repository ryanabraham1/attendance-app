# Pitboard

Pitboard is the lead-operated attendance app for WarriorBorgs Team 3256. Leads create practices and mark the full roster; members do not need accounts.

## What it tracks

- Present, late, excused, and absent states per practice
- Notes for attendance exceptions
- Team and member attendance percentages
- Missed-practice history and a follow-up watchlist
- Active and archived roster members

## Local setup

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/` using the Supabase SQL Editor (or link the Supabase CLI and run `supabase db push`).
3. Copy `.env.example` to `.env.local` and fill in the four values.
4. Run `npm run db:seed` to sync the WarriorBorgs roster. The command is safe to rerun: it adds missing people, refreshes matching roster records, and leaves unrelated members unchanged.
5. Run `npm run dev`.

## Production

The app is designed for Vercel and the official Supabase JavaScript client. `SUPABASE_SECRET_KEY`, `LEAD_ACCESS_CODE`, and `SESSION_SECRET` must remain server-only environment variables and must never use the `NEXT_PUBLIC_` prefix.
