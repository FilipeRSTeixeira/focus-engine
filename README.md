# Focus Engine

A personal, gamified productivity app. Runs locally on your PC — your data never leaves your computer.

Focus Engine helps you stay focused on what matters by turning everyday work into a points/rewards game. Complete tasks, build streaks, log habits, and unlock self-chosen rewards (a coffee, 15 minutes of YouTube, a treat meal at the end of the week, etc.).

## Features

- **Tasks & projects** — organize work into your own projects with priority levels and due dates.
- **Pomodoro focus sessions** — built-in timer with customizable work/break presets.
- **Points & rewards** — earn points per task; spend them on rewards you define yourself.
- **Habits** — track recurring behaviors with daily or weekly cadence and quantitative targets (e.g. "20 min reading/day", "150 min exercise/week"). Each habit's weekly progress bar fills towards 100%.
- **Streaks, levels & achievements** — long-term motivation without nagging.
- **Daily review** — end-of-day reflection prompt with stats.
- **Google Calendar sync** (optional) — push tasks to your own calendar.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Prisma ORM · SQLite · Tailwind CSS v4 · Vitest

## Installation

See [INSTALL.md](./INSTALL.md). Three methods are documented:

1. **Via AI agent** — copy a prompt and paste it into Claude Code, Cursor, Cowork, or any other coding assistant with shell access.
2. **Via PowerShell script** — run `.\setup.ps1` and follow the prompts.
3. **Manual** — `npm install`, `prisma migrate deploy`, `npm run dev`.

The app runs on [http://localhost:3210](http://localhost:3210).

## Privacy

All data — tasks, points, habits, daily logs — is stored in a local SQLite database at `prisma/dev.db` and never leaves your machine. The Google Calendar integration is opt-in and uses your own Google Cloud credentials; if you don't configure it, no network calls are made.

## License

MIT
