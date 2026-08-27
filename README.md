# KLIQ Business Tracker

Minimal Next.js tracker for KLIQ sales and business expenses.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Vercel-ready deployment

## Data Storage

Transactions are stored in Supabase, not in the browser and not in OpenAI Sites.
When you add or delete a transaction, the app writes directly to the Supabase
`transactions` table.

## Login

The app has a simple password gate configured with environment variables:

```bash
KLIQ_ADMIN_USERNAME=admin
KLIQ_ADMIN_PASSWORD=your-admin-password
```

This protects the tracker page with an HTTP-only session cookie. For stronger
multi-user security later, replace this with Supabase Auth.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL in `supabase/schema.sql`.
4. Copy your project URL and anon key from Supabase project settings.
5. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
KLIQ_ADMIN_USERNAME=admin
KLIQ_ADMIN_PASSWORD=your-admin-password
```

The current SQL uses anon access for read, insert, and delete. That is simple
for a first version, but for a public production app you should add login or a
server-side API before sharing the site widely.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment

1. Push this project to a GitHub repository you own.
2. Import the repository in Vercel.
3. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `KLIQ_ADMIN_USERNAME`
   - `KLIQ_ADMIN_PASSWORD`
4. Deploy.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
```
