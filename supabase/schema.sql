create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  description text not null,
  transaction_type text not null check (transaction_type in ('Income', 'Expense')),
  category text not null,
  qty numeric not null default 1,
  amount numeric not null default 0,
  payment_method text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_transaction_date_idx
  on public.transactions (transaction_date desc);

alter table public.transactions enable row level security;

drop policy if exists "Allow public read transactions" on public.transactions;
drop policy if exists "Allow public insert transactions" on public.transactions;
drop policy if exists "Allow public delete transactions" on public.transactions;

create policy "Allow public read transactions"
  on public.transactions
  for select
  to anon
  using (true);

create policy "Allow public insert transactions"
  on public.transactions
  for insert
  to anon
  with check (true);

create policy "Allow public delete transactions"
  on public.transactions
  for delete
  to anon
  using (true);
