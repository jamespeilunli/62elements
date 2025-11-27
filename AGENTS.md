# Repository Guidelines

## Project Structure & Module Organization

- Next.js App Router lives in `app/` (routes like `app/library`, `app/study`, `app/create-set`); shared layout and global styles sit in `app/layout.tsx` and `app/globals.css`.
- Reusable UI is in `components/` (Shadcn primitives under `components/ui/`) with supporting logic in `contexts/` (auth), `hooks/`, and `lib/` (Supabase client, study utilities, sample data).
- Config lives at the root (`next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.mjs`); static assets/fonts are under `app/fonts`.

## Coding Style & Naming Conventions

- Language: TypeScript with React function components; hooks for client logic. Use the `@/` alias for absolute imports.
- Formatting: 2-space indentation; favor descriptive names (`StudySessionCard`, `useAuth`). Keep JSX lean and extract shared pieces into `components/`.
- Styling: Tailwind-first; compose classes with `clsx`/`class-variance-authority` when needed. Prefer semantic elements and accessible Radix primitives. Use shadcn components instead of custom components when available.
- Linting: Align with `next lint`; avoid disabling rules unless justified in-line.
- General: favor simplicity, conciseness, and readability while following best practices.

## Testing Guidelines

- No automated test suite is present yet.
- It is not the agent's responsibility to test code, and it should not attempt to run commands like `npm run dev`. Ask the programmer to test if necessary.

## Configuration & Security Tips

- Required env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`; never commit secrets.
- When adding Supabase or other API usage, guard against missing env vars and handle unauthenticated states gracefully (see `lib/supabaseClient.ts` and `contexts/AuthContext` patterns).
