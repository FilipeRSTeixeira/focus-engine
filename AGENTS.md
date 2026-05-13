# Focus Engine — Next.js 16

## Tecnologias
- Next.js 16.2 (App Router) + React 19
- TypeScript strict mode
- Prisma + SQLite
- Tailwind v4 + shadcn/ui (base-nova)
- Vitest para testes

## Comandos
- `npm run dev` — dev server (porta 3210)
- `npm run build` — produção
- `npm run lint` — ESLint
- `npx vitest` — executar testes
- `npx prisma migrate dev` — criar migration
- `npx prisma studio` — abrir DB GUI

## Arquitetura
- `src/app/` — páginas (App Router)
- `src/app/api/` — API routes (organizado por feature)
- `src/components/` — componentes UI
- `src/lib/` — lógica de negócio (tasks, focus, streak, rewards, etc.)
- `prisma/` — schema, migrations, dev.db

## Convenções
- **shadcn/ui**: Usar `npx shadcn@latest add` para novos componentes
- **Prisma**: Sempre criar migration ao alterar schema.prisma
- **Testes**: Seguir padrão existente — ficheiros `.test.ts` junto ao source
- **Dark mode**: Padrão do projeto, manter `<html className="dark">`
- **API routes**: Organizar por feature (tasks, focus, rewards, etc.)
- **Componentes**: Separar UI (components/ui/) de componentes de negócio (components/)
- **Prisma client**: Usar singleton em `src/lib/prisma.ts`
