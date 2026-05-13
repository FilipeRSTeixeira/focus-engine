# Focus Engine — Next.js 16

## Technologies
- Next.js 16.2 (App Router) + React 19
- TypeScript strict mode
- Prisma + SQLite
- Tailwind v4 + shadcn/ui (base-nova)
- Vitest for tests

## Commands
- `npm run dev` — dev server (port 3210)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx vitest` — run tests
- `npx prisma migrate dev` — create migration
- `npx prisma studio` — open DB GUI

## Architecture
- `src/app/` — pages (App Router)
- `src/app/api/` — API routes (organised by feature)
- `src/components/` — UI components
- `src/lib/` — business logic (tasks, focus, streak, rewards, etc.)
- `prisma/` — schema, migrations, dev.db

## Conventions
- **shadcn/ui**: Use `npx shadcn@latest add` for new components
- **Prisma**: Always create a migration when changing schema.prisma
- **Tests**: Follow the existing pattern — `.test.ts` files alongside source
- **Dark mode**: Project default, keep `<html className="dark">`
- **API routes**: Organise by feature (tasks, focus, rewards, etc.)
- **Components**: Separate UI (components/ui/) from business components (components/)
- **Prisma client**: Use singleton in `src/lib/prisma.ts`
