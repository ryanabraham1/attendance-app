# Pitboard

Pitboard is the lead-operated attendance app for WarriorBorgs Team 3256. Leads create practices and mark the full roster; members do not need accounts.

## What it tracks

- Present, late, excused, and absent states per practice
- Notes for attendance exceptions
- Team and member attendance percentages
- Missed-practice history and a follow-up watchlist
- Active and archived roster members

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the three values.
2. Run `npm run db:migrate`.
3. Optionally run `npm run db:seed` for four fictional members.
4. Run `npm run dev`.

## Production

The app is designed for Vercel with a serverless Postgres `DATABASE_URL`. `LEAD_ACCESS_CODE` and `SESSION_SECRET` must remain server-only environment variables.
